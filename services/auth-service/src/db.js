import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/otm_bangla_db';

/** @type {import('mongodb').Db | null} */
let db = null;
/** @type {MongoClient | null} */
let client = null;

export async function initializeDatabase() {
  try {
    // Hide password for safety in terminal logs
    const maskedUri = uri.replace(/:([^@]+)@/, ':****@');
    console.log(`🔌 Connecting to MongoDB at ${maskedUri}...`);

    client = await MongoClient.connect(uri);
    db = client.db();

    console.log('🔨 Ensuring unique indexes exist on "users" collection...');
    const users = db.collection('users');
    
    // Ensure unique constraints on phone and email
    await users.createIndex({ phone: 1 }, { unique: true });
    await users.createIndex({ email: 1 }, { unique: true });

    console.log('✅ MongoDB Database and unique indexes verified successfully!');
  } catch (error) {
    console.error('❌ Failed to initialize MongoDB Database:', error);
    process.exit(1);
  }
}

/**
 * Get a specific collection from the database
 * @param {string} name
 */
export function getCollection(name) {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase first.');
  }
  return db.collection(name);
}

/**
 * Close database connection
 */
export async function closeDatabase() {
  if (client) {
    await client.close();
  }
}


