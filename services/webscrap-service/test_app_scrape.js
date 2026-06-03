import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);

import { initializeDatabase, closeDatabase, getAppPackagesCollection } from './src/db.js';
import { runAPPScraper } from './src/scraper.js';

async function main() {
  process.env.MOCK_DB = 'false';
  let dbInitialized = false;

  try {
    await initializeDatabase();
    dbInitialized = true;
    
    console.log('\n--- Clearing app_packages collection in MongoDB ---');
    const collection = getAppPackagesCollection();
    await collection.deleteMany({});
    console.log('Collection cleared successfully!');

    console.log('\n--- Running runAPPScraper ---');
    const result = await runAPPScraper();
    console.log('\nScraper Result:', JSON.stringify(result, null, 2));

    if (process.env.MOCK_DB !== 'true' && dbInitialized) {
      console.log('\n--- Checking stored data in MongoDB ---');
      const collection = getAppPackagesCollection();
      const storedDocs = await collection.find({}).toArray();
      console.log('Stored Documents Count:', storedDocs.length);
      if (storedDocs.length > 0) {
        console.log('First Stored Document:', JSON.stringify(storedDocs[0], null, 2));
      } else {
        console.log('Warning: No documents stored in app_packages!');
      }
    } else {
      console.log('\n--- Mock DB verification: Scraped document saved to scraped_app_package_proof.json! ---');
    }
  } catch (error) {
    console.error('Fatal error during test:', error);
  } finally {
    if (dbInitialized) {
      console.log('\n--- Closing database connection ---');
      await closeDatabase();
    }
  }
}

main();
