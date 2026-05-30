import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import crypto from 'crypto';
import { getCollection } from './db.js';
import logger from './utils/logger.js';
import { sendMail } from './utils/mail.js';
import { globalLimiter, authLimiter } from './middleware/rateLimiter.js';
import { signupSchema, loginSchema, validateRequest } from './middleware/validation.js';
import {
  checkBruteForceLockout,
  handleFailedLoginAttempt,
  handleSuccessfulLogin,
  securityHeadersMiddleware,
} from './utils/security.js';
import {
  createSession,
  verifySession,
  deleteSession,
  deleteAllUserSessions,
  getUserSessions,
} from './utils/session.js';

const app = express();

// Apply Global Rate Limiting and Security Headers
app.use(globalLimiter);
app.use(securityHeadersMiddleware);

app.use(cors({
  origin: '*', // Customize to specific domain in production
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'otmbangla_jwt_secret_key_2026_xyz';

// Global error handler middleware
app.use(
  /**
   * @param {any} err
   * @param {any} req
   * @param {any} res
   * @param {any} next
   */
  (err, req, res, next) => {
    logger.error('🔥 Express Global Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'auth-service', timestamp: new Date() });
});

// Signup Endpoint
app.post('/api/auth/signup', authLimiter, validateRequest(signupSchema), async (req, res) => {
  const { name, phone, email, password } = req.body;

  try {
    const users = getCollection('users');
    
    // Check if phone or email already exists
    const existingUser = await users.findOne({
      $or: [{ phone }, { email }]
    });

    if (existingUser) {
      if (existingUser.phone === phone) {
        logger.warn(`👤 Signup rejected: Phone number ${phone} is already registered.`);
        return res.status(400).json({ error: 'Phone number is already registered' });
      }
      if (existingUser.email === email) {
        logger.warn(`👤 Signup rejected: Email address ${email} is already registered.`);
        return res.status(400).json({ error: 'Email address is already registered' });
      }
    }

    // Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save to Database
    const result = await users.insertOne({
      name,
      phone,
      email,
      password: hashedPassword,
      createdAt: new Date(),
      failedLoginAttempts: 0,
    });

    const userId = result.insertedId.toString();

    // Create secure session record in DB
    const jti = await createSession(userId, req);

    // Generate Token containing stateful JTI
    const token = jwt.sign(
      { id: userId, name, email, phone, jti },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    logger.info(`✨ User signed up successfully: ${email} (${userId}) from IP ${req.ip}`);

    res.status(201).json({
      message: 'Registration successful!',
      token,
      user: {
        id: userId,
        name,
        phone,
        email,
      }
    });
  } catch (error) {
    logger.error('🔥 Signup database error:', error);
    res.status(500).json({ error: 'Database or server error' });
  }
});

// Login Endpoint
app.post('/api/auth/login', authLimiter, validateRequest(loginSchema), async (req, res) => {
  const { phone, password } = req.body; // 'phone' handles both phone or email inputs

  try {
    // 1. Check if user is locked out due to brute force protection
    const lockout = await checkBruteForceLockout(phone);
    if (lockout.isLocked) {
      logger.warn(`🚫 Locked login attempt for: ${phone} from IP ${req.ip}. Lock ends at ${lockout.lockoutUntil.toISOString()}`);
      return res.status(423).json({
        error: `Too many failed login attempts. Your account is temporarily locked. Try again in ${lockout.timeRemaining} minutes.`
      });
    }

    const users = getCollection('users');
    
    // Normalize inputs
    const credential = phone.trim();
    
    // Find user in database by either phone or email
    const user = await users.findOne({
      $or: [
        { phone: credential },
        { email: credential.toLowerCase() }
      ]
    });

    // 2. If user is NOT found in the database
    if (!user) {
      // Execute failed attempt trigger to apply Timing Tarpitting (adds artificial lag)
      await handleFailedLoginAttempt(phone);
      logger.warn(`⚠️ Authentication failure: credentials not found for input "${phone}"`);
      
      // Generic error response to prevent user enumeration
      return res.status(400).json({ error: 'Invalid credentials. Please verify your phone/email and password.' });
    }

    // 3. If user is found, verify the password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await handleFailedLoginAttempt(phone);
      logger.warn(`⚠️ Authentication failure: incorrect password for user ${user.email || user.phone}`);
      
      // Generic error response
      return res.status(400).json({ error: 'Invalid credentials. Please verify your phone/email and password.' });
    }

    // Successful login - clear failed attempts, record login stats
    await handleSuccessfulLogin(user);

    const userId = user._id.toString();

    // Create secure database session
    const jti = await createSession(userId, req);

    // Generate Token containing stateful JTI
    const token = jwt.sign(
      { id: userId, name: user.name, email: user.email, phone: user.phone, jti },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    logger.info(`🔓 User logged in successfully: ${user.email} (${userId}) from IP ${req.ip}`);

    res.status(200).json({
      message: 'Login successful!',
      token,
      user: {
        id: userId,
        name: user.name,
        phone: user.phone,
        email: user.email,
      }
    });
  } catch (error) {
    logger.error('🔥 Login server error:', error);
    res.status(500).json({ error: 'Server database query error' });
  }
});

// Me/Verify Profile Endpoint (Stateful Session-Backed)
app.get('/api/auth/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = /** @type {any} */ (jwt.verify(token, JWT_SECRET));

    // Verify session is active in database
    if (decoded.jti) {
      const activeSession = await verifySession(decoded.jti);
      if (!activeSession) {
        logger.warn(`🚫 Token authorization rejected: Session ${decoded.jti} is expired or revoked.`);
        return res.status(401).json({ error: 'Session expired or revoked. Please log in again.' });
      }
    }

    const users = getCollection('users');
    
    let objectId;
    try {
      objectId = new ObjectId(decoded.id);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    // Verify user still exists in database
    const user = await users.findOne({ _id: objectId });
    if (!user) {
      return res.status(404).json({ error: 'User no longer exists' });
    }

    res.status(200).json({
      user: {
        id: user._id.toString(),
        name: user.name,
        phone: user.phone,
        email: user.email
      }
    });
  } catch (error) {
    logger.error('🔥 Verify token error:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// Logout current session Endpoint
app.post('/api/auth/logout', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = /** @type {any} */ (jwt.verify(token, JWT_SECRET));
    
    if (decoded.jti) {
      await deleteSession(decoded.jti);
      logger.info(`🚪 Session ${decoded.jti} logged out successfully.`);
    }

    res.status(200).json({ message: 'Logged out successfully!' });
  } catch (error) {
    logger.error('🔥 Logout error:', error);
    res.status(400).json({ error: 'Invalid token structure' });
  }
});

// Logout ALL sessions/devices Endpoint
app.post('/api/auth/logout-all', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = /** @type {any} */ (jwt.verify(token, JWT_SECRET));
    
    await deleteAllUserSessions(decoded.id);
    logger.info(`🚪 All active sessions revoked for user ${decoded.id}.`);

    res.status(200).json({ message: 'Logged out of all active devices successfully!' });
  } catch (error) {
    logger.error('🔥 Logout-all error:', error);
    res.status(400).json({ error: 'Invalid token' });
  }
});

// List all active sessions for current user Endpoint
app.get('/api/auth/sessions', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = /** @type {any} */ (jwt.verify(token, JWT_SECRET));
    
    const sessions = await getUserSessions(decoded.id);
    
    // Map sessions to beautiful formats, highlighting the current session
    const formattedSessions = sessions.map(session => ({
      id: session._id,
      ip: session.ip,
      userAgent: session.userAgent,
      createdAt: session.createdAt,
      isCurrentSession: session._id === decoded.jti
    }));

    res.status(200).json({ sessions: formattedSessions });
  } catch (error) {
    logger.error('🔥 Fetch active sessions error:', error);
    res.status(400).json({ error: 'Invalid token' });
  }
});

// Forgot Password Endpoint
app.post('/api/auth/forgot-password', authLimiter, async (req, res) => {
  const { credential } = req.body; // credential can be email or phone

  if (!credential) {
    return res.status(400).json({ error: 'Email or phone number is required' });
  }

  try {
    const users = getCollection('users');
    const user = await users.findOne({
      $or: [
        { phone: credential.trim() },
        { email: credential.trim().toLowerCase() }
      ]
    });

    // To prevent user enumeration, we always return a generic 200 success response,
    // regardless of whether the user exists or has an email registered.
    const genericResponse = {
      message: 'If your account is registered with an email, a password reset link has been sent.'
    };

    if (!user || !user.email) {
      logger.info(`🔍 Forgot Password: User not found or has no email for credential "${credential}"`);
      return res.status(200).json(genericResponse);
    }

    // Generate secure random token
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // Valid for 1 hour

    // Save token to user document
    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          resetPasswordToken: token,
          resetPasswordExpires: expires
        }
      }
    );

    // Dynamic reset link pointing to the user application
    const resetUrl = `http://localhost:5173/reset-password?token=${token}`; // standard Vite dev port or userapp port

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e5e6; border-radius: 16px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #5E6AD2; margin: 0; font-size: 22px; font-weight: bold;">OTMBangla Security</h2>
        </div>
        <p style="font-size: 14px; color: #08090a; line-height: 1.6;">Hello <strong>${user.name || 'User'}</strong>,</p>
        <p style="font-size: 14px; color: #62666d; line-height: 1.6;">We received a request to reset your password. If you didn't make this request, you can safely ignore this email.</p>
        <p style="font-size: 14px; color: #62666d; line-height: 1.6;">To reset your password, click the secure button below. This link is only valid for <strong>1 hour</strong>:</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" target="_blank" style="background-color: #5E6AD2; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px rgba(94,106,210,0.15); transition: background-color 0.2s;">
            Reset Password
          </a>
        </div>
        <hr style="border: 0; border-top: 1px solid #e5e5e6; margin: 24px 0;" />
        <p style="font-size: 11px; color: #8a8f98; line-height: 1.5; text-align: center; margin: 0;">
          Sent by OTMBangla BDTender Portal. If you have questions, please reach out to <a href="mailto:support@banglasolution.com" style="color: #5E6AD2; text-decoration: none;">support@banglasolution.com</a>.
        </p>
      </div>
    `;

    // Send the email
    const emailSent = await sendMail({
      to: user.email,
      subject: 'Reset your OTMBangla Password',
      html: htmlContent
    });

    if (emailSent) {
      logger.info(`✉️ Forgot password link sent successfully to ${user.email}`);
    } else {
      logger.error(`🔥 Forgot password failed to deliver email to ${user.email}`);
    }

    return res.status(200).json(genericResponse);
  } catch (error) {
    logger.error('🔥 Forgot password endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset Password Endpoint
app.post('/api/auth/reset-password', authLimiter, async (req, res) => {
  const { token, password } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Reset token is required' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  try {
    const users = getCollection('users');
    
    // Find active token that hasn't expired yet
    const user = await users.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      logger.warn(`⚠️ Password Reset Attempt failed: invalid or expired token.`);
      return res.status(400).json({ error: 'Password reset link is invalid or has expired.' });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user document
    await users.updateOne(
      { _id: user._id },
      {
        $set: { password: hashedPassword },
        $unset: {
          resetPasswordToken: "",
          resetPasswordExpires: ""
        }
      }
    );

    // Revoke all existing sessions for this user to force login on all devices
    await deleteAllUserSessions(user._id.toString());

    logger.info(`✨ Password successfully updated for user ${user.email || user.phone}`);

    res.status(200).json({ message: 'Password has been reset successfully! Please log in with your new password.' });
  } catch (error) {
    logger.error('🔥 Reset password endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default app;
