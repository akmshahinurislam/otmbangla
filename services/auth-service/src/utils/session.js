import { ObjectId } from 'mongodb';
import { getCollection } from '../db.js';
import crypto from 'crypto';

/**
 * Creates a stateful session record in the database for tracking and revocation
 * @param {string} userId 
 * @param {any} req 
 * @returns {Promise<string>} The unique JTI (JWT ID) for the session
 */
export async function createSession(userId, req) {
  const sessions = getCollection('sessions');
  const jti = crypto.randomUUID();
  
  // Clean up and capture headers
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  
  await sessions.insertOne(/** @type {any} */ ({
    _id: jti,
    userId: new ObjectId(userId),
    ip,
    userAgent,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days (matching JWT expiration)
  }));

  return jti;
}

/**
 * Verifies if the JTI session is active in the database
 * @param {string} jti 
 * @returns {Promise<any|null>} Session document or null
 */
export async function verifySession(jti) {
  const sessions = getCollection('sessions');
  const session = await sessions.findOne(/** @type {any} */ ({ _id: jti }));
  if (!session) return null;

  // Check if expired
  if (session.expiresAt && session.expiresAt < new Date()) {
    await sessions.deleteOne(/** @type {any} */ ({ _id: jti }));
    return null;
  }

  return session;
}

/**
 * Revoke/delete a single session
 * @param {string} jti 
 */
export async function deleteSession(jti) {
  const sessions = getCollection('sessions');
  await sessions.deleteOne(/** @type {any} */ ({ _id: jti }));
}

/**
 * Invalidate all sessions for a user (useful for password reset / logout-all)
 * @param {string} userId 
 */
export async function deleteAllUserSessions(userId) {
  const sessions = getCollection('sessions');
  await sessions.deleteMany({ userId: new ObjectId(userId) });
}

/**
 * Fetch all active sessions for a user
 * @param {string} userId 
 * @returns {Promise<Array<any>>}
 */
export async function getUserSessions(userId) {
  const sessions = getCollection('sessions');
  return await sessions.find({ userId: new ObjectId(userId) }).toArray();
}
