import { getCollection } from '../db.js';
import logger from './logger.js';

// Tarpitting helper (artificial latency)
/**
 * @param {number} ms
 */
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Check if the account is currently locked out due to brute force protection
 * @param {string} phoneOrEmail 
 */
export async function checkBruteForceLockout(phoneOrEmail) {
  const users = getCollection('users');
  const credential = phoneOrEmail.trim();
  
  const user = await users.findOne({
    $or: [
      { phone: credential },
      { email: credential.toLowerCase() }
    ]
  });

  if (!user) return { isLocked: false };

  const now = new Date();
  if (user.lockoutUntil && user.lockoutUntil > now) {
    const timeRemaining = Math.ceil((user.lockoutUntil.getTime() - now.getTime()) / 1000 / 60); // minutes
    return { isLocked: true, timeRemaining, lockoutUntil: user.lockoutUntil };
  }

  // Lockout expired, check if we should reset it
  if (user.lockoutUntil && user.lockoutUntil <= now) {
    await users.updateOne(
      { _id: user._id },
      { $set: { failedLoginAttempts: 0 }, $unset: { lockoutUntil: "" } }
    );
  }

  return { isLocked: false };
}

/**
 * Handle a failed login attempt - increments counter and triggers locks/delays
 * @param {string} phoneOrEmail 
 */
export async function handleFailedLoginAttempt(phoneOrEmail) {
  const users = getCollection('users');
  const credential = phoneOrEmail.trim();
  
  const user = await users.findOne({
    $or: [
      { phone: credential },
      { email: credential.toLowerCase() }
    ]
  });

  if (!user) {
    // Artificial delay for non-existent users to prevent timing analysis
    const randomDelay = Math.floor(Math.random() * 800) + 200; // 200-1000ms
    await sleep(randomDelay);
    return 0;
  }

  const currentAttempts = (user.failedLoginAttempts || 0) + 1;
  const updates = /** @type {any} */ ({ failedLoginAttempts: currentAttempts });
  
  let lockoutDuration = 0;
  
  // Set lockout: 5 failures -> 15 min lock
  if (currentAttempts >= 5) {
    lockoutDuration = 15 * 60 * 1000; // 15 minutes
    const lockoutUntil = new Date(Date.now() + lockoutDuration);
    updates.lockoutUntil = lockoutUntil;
    logger.warn(`🔒 Account locked: ${user.email || user.phone} until ${lockoutUntil.toISOString()} after ${currentAttempts} failed attempts.`);
  } else {
    logger.warn(`⚠️ Failed login attempt ${currentAttempts}/5 for account: ${user.email || user.phone}`);
  }

  await users.updateOne({ _id: user._id }, { $set: updates });

  // Calculate exponential delay (tarpitting)
  // e.g. 1st failure = 500ms, 2nd = 1000ms, 3rd = 2000ms, 4th = 3000ms
  const tarpitDelay = Math.min(4000, currentAttempts * 1000);
  logger.info(`⏳ Applying tarpitting delay of ${tarpitDelay}ms to slow down threat actor`);
  await sleep(tarpitDelay);

  return currentAttempts;
}

/**
 * Reset failed attempts on a successful authentication
 * @param {any} user 
 */
export async function handleSuccessfulLogin(user) {
  const users = getCollection('users');
  await users.updateOne(
    { _id: user._id },
    { 
      $set: { 
        failedLoginAttempts: 0, 
        lastLoginAt: new Date() 
      },
      $unset: { lockoutUntil: "" } 
    }
  );
}

/**
 * Express middleware to set modern HTTP security headers
 * @param {any} req
 * @param {any} res
 * @param {any} next
 */
export function securityHeadersMiddleware(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
}
