import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import logger from './utils/logger.js';

dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/otm_bangla_db';

/** @type {import('mongodb').Db | null} */
let db = null;
/** @type {MongoClient | null} */
let client = null;

export async function initializeDatabase() {
  try {
    const maskedUri = uri.replace(/:([^@]+)@/, ':****@');
    logger.info(`🔌 Connecting to MongoDB at ${maskedUri}...`);

    client = await MongoClient.connect(uri);
    db = client.db();

    logger.info('🔨 Ensuring indexes exist on "tenders" collection...');
    const tenders = db.collection('tenders');
    
    // Ensure unique constraint on tender ID, and standard indexes for query performance
    await tenders.createIndex({ id: 1 }, { unique: true });
    await tenders.createIndex({ publishedDate: -1 });
    await tenders.createIndex({ closingDate: 1 });
    await tenders.createIndex({ categoryId: 1 });
    await tenders.createIndex({ organizationId: 1 });
    await tenders.createIndex({ districtId: 1 });

    const subscriptions = db.collection('alert_subscriptions');
    await subscriptions.createIndex({ emails: 1 });

    logger.info('✅ MongoDB Database and indexes verified for collections!');
  } catch (error) {
    logger.error('❌ Failed to initialize MongoDB Database:', error);
    process.exit(1);
  }
}

/**
 * Get the tenders collection
 */
export function getTendersCollection() {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase first.');
  }
  return db.collection('tenders');
}

/**
 * Get the alert subscriptions collection
 */
export function getSubscriptionsCollection() {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase first.');
  }
  return db.collection('alert_subscriptions');
}

/**
 * Close database connection
 */
export async function closeDatabase() {
  if (client) {
    await client.close();
  }
}
