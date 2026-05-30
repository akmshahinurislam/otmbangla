import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/otm_bangla_db';

/** @type {import('mongodb').Db | null} */
let db = null;
/** @type {MongoClient | null} */
let client = null;

export async function initializeDatabase() {
  const maxRetries = 5;
  const retryDelay = 2000;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const maskedUri = uri.replace(/:([^@]+)@/, ':****@');
      console.log(`🔌 Connecting to MongoDB at ${maskedUri} (Attempt ${attempt}/${maxRetries})...`);

      client = await MongoClient.connect(uri);
      db = client.db();

      console.log('✅ MongoDB Database connection verified successfully for ai-service!');
      return;
    } catch (error) {
      lastError = error;
      console.warn(`⚠️ Connection attempt ${attempt} failed: ${/** @type {any} */ (error).message}`);
      if (attempt < maxRetries) {
        console.log(`Waiting ${retryDelay / 1000}s before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  console.error('❌ Failed to initialize MongoDB Database in ai-service after all attempts:', lastError);
  process.exit(1);
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
