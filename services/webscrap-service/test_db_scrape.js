import { initializeDatabase, closeDatabase } from './src/db.js';
import { runScraper } from './src/scraper.js';

async function main() {
  process.env.MONGODB_URI = "mongodb+srv://akmshahinurislam:Killyourtv123_@otmbangla.kbnrl36.mongodb.net/otm_bangla_db?appName=OTMBangla";
  console.log('Connecting to database and running scraper...');
  try {
    await initializeDatabase();
    const result = await runScraper();
    console.log('Scraper result:', result);
  } catch (error) {
    console.error('Error in scraper execution:', error);
  } finally {
    await closeDatabase();
    console.log('Database connection closed.');
  }
}

main();
