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

// Global request logger middleware to capture any incoming packets
app.use((req, res, next) => {
  logger.info(`📥 [INCOMING REQ] ${req.method} ${req.originalUrl} from IP: ${req.ip} (Headers: ${JSON.stringify(req.headers)})`);
  next();
});

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
  const appType = req.body.app || 'userapp';

  try {
    const users = getCollection('users');
    
    // Check if phone or email already exists in the same app context
    const existingUser = await users.findOne({
      app: appType,
      $or: [{ phone }, { email }]
    });

    if (existingUser) {
      if (existingUser.phone === phone) {
        logger.warn(`👤 Signup rejected: Phone number ${phone} is already registered in ${appType}.`);
        return res.status(400).json({ error: 'Phone number is already registered' });
      }
      if (existingUser.email === email) {
        logger.warn(`👤 Signup rejected: Email address ${email} is already registered in ${appType}.`);
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
      role: 'Owner',
      app: appType,
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
        role: 'Owner',
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
  const appType = req.body.app || 'userapp';

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
    
    // Find user in database by either phone or email within the specific app context
    const user = await users.findOne({
      app: appType,
      $or: [
        { phone: credential },
        { email: credential.toLowerCase() }
      ]
    });

    // 2. If user is NOT found in the database
    if (!user) {
      // Execute failed attempt trigger to apply Timing Tarpitting (adds artificial lag)
      await handleFailedLoginAttempt(phone);
      logger.warn(`⚠️ Authentication failure: credentials not found for input "${phone}" in app context "${appType}"`);
      
      // Generic error response to prevent user enumeration
      return res.status(400).json({ error: 'Invalid credentials. Please verify your phone/email and password.' });
    }

    // 3. If user is found, verify the password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await handleFailedLoginAttempt(phone);
      logger.warn(`⚠️ Authentication failure: incorrect password for user ${user.email || user.phone} in app context "${appType}"`);
      
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

    logger.info(`🔓 User logged in successfully: ${user.email} (${userId}) from IP ${req.ip} in app context "${appType}"`);

    res.status(200).json({
      message: 'Login successful!',
      token,
      user: {
        id: userId,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role || (appType === 'userapp' ? 'Owner' : 'Project Manager'),
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
        email: user.email,
        role: user.role || 'Contractor'
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

// GET list of all users for admin
app.get('/api/auth/users', async (req, res) => {
  try {
    const users = getCollection('users');
    const allUsers = await users.find({}).toArray();
    // Return users without password field
    const sanitizedUsers = allUsers.map(user => {
      const { password, ...rest } = user;
      return {
        id: user._id.toString(),
        ...rest,
        status: user.status || 'Active',
        role: user.role || 'Contractor',
        loginCount: user.loginCount || 0,
        lastActiveIp: user.lastActiveIp || 'N/A',
        activities: user.activities || ['Registered user account.']
      };
    });
    res.status(200).json({ users: sanitizedUsers });
  } catch (error) {
    logger.error('🔥 Fetch users error:', error);
    res.status(500).json({ error: 'Server database error' });
  }
});

// PUT update user status/role for admin
app.put('/api/auth/users/:id', async (req, res) => {
  const { id } = req.params;
  const { status, role, activities } = req.body;

  try {
    const users = getCollection('users');
    let objectId;
    try {
      objectId = new ObjectId(id);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    const updateFields = {};
    if (status) updateFields.status = status;
    if (role) updateFields.role = role;
    if (activities) updateFields.activities = activities;

    const result = await users.updateOne(
      { _id: objectId },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ message: 'User updated successfully!' });
  } catch (error) {
    logger.error('🔥 Update user error:', error);
    res.status(500).json({ error: 'Server database error' });
  }
});

// Invite PM Endpoint (by Admin/Owner)
app.post('/api/auth/invite', async (req, res) => {
  const { name, email, role, phone, projectCodes, ownerEmail } = req.body;

  if (!email || !name || !role || !phone) {
    return res.status(400).json({ error: 'Missing required fields: email, name, role, phone are all required.' });
  }

  try {
    const users = getCollection('users');
    const appType = req.body.app || 'pmapp';
    
    // Check if user already exists by email or phone in the same app context
    const existingUser = await users.findOne({
      app: appType,
      $or: [
        { email: email.toLowerCase() },
        { phone }
      ]
    });
    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        return res.status(400).json({ error: 'A team member with this email address already exists.' });
      }
      if (existingUser.phone === phone) {
        return res.status(400).json({ error: 'A team member with this phone number already exists.' });
      }
    }

    // Generate secure random invite token
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 3600000); // 24 hours

    // Insert user as Pending
    await users.insertOne({
      name,
      email: email.toLowerCase(),
      phone,
      role,
      status: 'Pending',
      inviteToken: token,
      inviteExpires: expires,
      app: appType,
      createdAt: new Date(),
      failedLoginAttempts: 0,
    });

    // Link team member's email to the assigned projects in db
    if (projectCodes && Array.isArray(projectCodes)) {
      const projectsCol = getCollection('projects');
      await projectsCol.updateMany(
        { code: { $in: projectCodes } },
        { $addToSet: { teamEmails: email.toLowerCase() } }
      );
    }

    // Modern Design invitation link (Generated setup URL)
    const pmAppUrl = process.env.PM_APP_URL || 'https://otmbangla-pmapp.vercel.app';
    const appUrl = `${pmAppUrl.replace(/\/$/, '')}/set-password?token=${token}`;

    logger.info(`✉️ Invitation link created successfully for ${email}: ${appUrl}`);
    
    res.status(200).json({ 
      message: 'Team member created successfully. Send the link to the Project Manager.',
      fallbackUrl: appUrl 
    });

  } catch (error) {
    logger.error('🔥 Invite member endpoint error:', error);
    res.status(500).json({ error: 'Server database query error' });
  }
});

// Accept Invite / Set Password Endpoint
app.post('/api/auth/accept-invite', async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ error: 'Token and password are required.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  try {
    const users = getCollection('users');

    // Find the user by token
    const user = await users.findOne({
      inviteToken: token,
      inviteExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invitation link is invalid or has expired.' });
    }

    // Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user: set password, set status to Active, clear invite fields
    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          password: hashedPassword,
          status: 'Active'
        },
        $unset: {
          inviteToken: '',
          inviteExpires: ''
        }
      }
    );

    // Create session & JWT token
    const jti = await createSession(user._id.toString(), req);
    const jwtToken = jwt.sign(
      { id: user._id.toString(), name: user.name, email: user.email, phone: user.phone, jti },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    logger.info(`✨ User ${user.email} accepted invitation and set password successfully.`);

    res.status(200).json({
      message: 'Password set successfully!',
      token: jwtToken,
      user: {
        id: user._id.toString(),
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
      }
    });

  } catch (error) {
    logger.error('🔥 Accept invite error:', error);
    res.status(500).json({ error: 'Server error setting password.' });
  }
});

// --- LEDGER SYNC ENDPOINTS ---

// GET Projects
app.get('/api/ledger/projects', async (req, res) => {
  try {
    const projectsCol = getCollection('projects');
    const email = /** @type {string} */ (req.query.email);
    const role = /** @type {string} */ (req.query.role);

    let filter = {};
    if (email && (role === 'Project Manager' || role === 'Site Engineer' || role === 'Supervisor' || role === 'Accountant')) {
      filter = { teamEmails: email.toLowerCase() };
    }

    const projects = await projectsCol.find(filter).toArray();
    res.status(200).json(projects);
  } catch (error) {
    logger.error('🔥 Fetch projects error:', error);
    res.status(500).json({ error: 'Server database error' });
  }
});

// POST Projects (Add new project)
app.post('/api/ledger/projects', async (req, res) => {
  const { name, code, location, budget, ownerEmail, teamEmails } = req.body;
  if (!name || !code || !budget) {
    return res.status(400).json({ error: 'Name, code and budget are required.' });
  }

  try {
    const projectsCol = getCollection('projects');
    const existing = await projectsCol.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(400).json({ error: 'Project with this code already exists.' });
    }

    const newProject = {
      id: 'p-' + Date.now(),
      name,
      code: code.toUpperCase(),
      location: location || '',
      budget: parseFloat(budget),
      ownerEmail: ownerEmail || 'admin@otmbangla.com',
      teamEmails: teamEmails || []
    };

    await projectsCol.insertOne(newProject);
    res.status(201).json(newProject);
  } catch (error) {
    logger.error('🔥 Add project error:', error);
    res.status(500).json({ error: 'Server database error' });
  }
});

// GET Team Members
app.get('/api/ledger/team', async (req, res) => {
  try {
    const usersCol = getCollection('users');
    const team = await usersCol.find({
      role: { $in: ['Project Manager', 'Site Engineer', 'Supervisor', 'Accountant'] }
    }).toArray();

    const formattedTeam = team.map(u => ({
      email: u.email,
      name: u.name,
      role: u.role,
      phone: u.phone
    }));

    res.status(200).json(formattedTeam);
  } catch (error) {
    logger.error('🔥 Fetch team error:', error);
    res.status(500).json({ error: 'Server database error' });
  }
});

// GET Allocations
app.get('/api/ledger/allocations', async (req, res) => {
  try {
    const allocationsCol = getCollection('allocations');
    const email = /** @type {string} */ (req.query.email);
    const role = /** @type {string} */ (req.query.role);

    let filter = {};
    if (email && (role === 'Project Manager' || role === 'Site Engineer' || role === 'Supervisor' || role === 'Accountant')) {
      filter = { teamEmail: email.toLowerCase() };
    }

    const allocations = await allocationsCol.find(filter).toArray();
    res.status(200).json(allocations);
  } catch (error) {
    logger.error('🔥 Fetch allocations error:', error);
    res.status(500).json({ error: 'Server database error' });
  }
});

// POST Allocations
app.post('/api/ledger/allocations', async (req, res) => {
  const { projectCode, teamEmail, amount, date, method, notes } = req.body;
  if (!projectCode || !teamEmail || !amount) {
    return res.status(400).json({ error: 'projectCode, teamEmail and amount are required.' });
  }

  try {
    const allocationsCol = getCollection('allocations');
    const newAlloc = {
      id: 'a-' + Date.now(),
      projectCode,
      teamEmail: teamEmail.toLowerCase(),
      amount: parseFloat(amount),
      date: date || new Date().toISOString().split('T')[0],
      method,
      notes
    };

    await allocationsCol.insertOne(newAlloc);
    res.status(201).json(newAlloc);
  } catch (error) {
    logger.error('🔥 Add allocation error:', error);
    res.status(500).json({ error: 'Server database error' });
  }
});

// GET Expenses
app.get('/api/ledger/expenses', async (req, res) => {
  try {
    const expensesCol = getCollection('expenses');
    const email = /** @type {string} */ (req.query.email);
    const role = /** @type {string} */ (req.query.role);

    let filter = {};
    if (email && (role === 'Project Manager' || role === 'Site Engineer' || role === 'Supervisor' || role === 'Accountant')) {
      const projectsCol = getCollection('projects');
      const assignedProjects = await projectsCol.find({ teamEmails: email.toLowerCase() }).toArray();
      const codes = assignedProjects.map(p => p.code);
      filter = {
        $or: [
          { teamEmail: email.toLowerCase() },
          { projectCode: { $in: codes } }
        ]
      };
    }

    const expenses = await expensesCol.find(filter).toArray();
    res.status(200).json(expenses);
  } catch (error) {
    logger.error('🔥 Fetch expenses error:', error);
    res.status(500).json({ error: 'Server database error' });
  }
});

// POST Expenses (Add new expense)
app.post('/api/ledger/expenses', async (req, res) => {
  const { id, projectCode, teamEmail, title, amount, category, date, type, vendor, notes, receiptMockIdx } = req.body;
  if (!projectCode || !title || !amount || !type) {
    return res.status(400).json({ error: 'projectCode, title, amount and type are required.' });
  }

  try {
    const expensesCol = getCollection('expenses');
    const newExpense = {
      id: id || 'exp-' + Date.now(),
      projectCode,
      teamEmail: teamEmail.toLowerCase(),
      title,
      amount: parseFloat(amount),
      category: category || 'Others',
      date: date || new Date().toISOString().split('T')[0],
      type,
      vendor: type === 'baki' ? vendor : undefined,
      notes,
      receiptMockIdx,
      isSettled: false,
      payments: []
    };

    await expensesCol.insertOne(newExpense);
    res.status(201).json(newExpense);
  } catch (error) {
    logger.error('🔥 Add expense error:', error);
    res.status(500).json({ error: 'Server database error' });
  }
});

// POST Settle (Scenario A/B direct payment or PM payment settlement)
app.post('/api/ledger/settle', async (req, res) => {
  const { expenseId, amount, method, notes } = req.body;
  if (!expenseId || !amount || !method) {
    return res.status(400).json({ error: 'expenseId, amount and method are required.' });
  }

  try {
    const expensesCol = getCollection('expenses');
    const expense = await expensesCol.findOne({ id: expenseId });
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found.' });
    }

    const payment = {
      id: 'pay-' + Date.now(),
      amount: parseFloat(amount),
      date: new Date().toISOString().split('T')[0],
      method,
      notes
    };

    const updatedPayments = [...(expense.payments || []), payment];
    const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
    const isSettled = totalPaid >= expense.amount;

    await expensesCol.updateOne(
      { id: expenseId },
      { 
        $set: { 
          payments: updatedPayments,
          isSettled: isSettled
        } 
      }
    );

    const updatedExpense = await expensesCol.findOne({ id: expenseId });
    res.status(200).json(updatedExpense);
  } catch (error) {
    logger.error('🔥 Settle dues error:', error);
    res.status(500).json({ error: 'Server database error' });
  }
});

// POST Void Expense
app.post('/api/ledger/void-expense', async (req, res) => {
  const { expenseId } = req.body;
  if (!expenseId) {
    return res.status(400).json({ error: 'expenseId is required.' });
  }

  try {
    const expensesCol = getCollection('expenses');
    const result = await expensesCol.deleteOne({ id: expenseId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Expense not found.' });
    }

    res.status(200).json({ message: 'Expense voided successfully!' });
  } catch (error) {
    logger.error('🔥 Void expense error:', error);
    res.status(500).json({ error: 'Server database error' });
  }
});

export default app;
