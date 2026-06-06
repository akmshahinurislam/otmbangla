import cron from 'node-cron';
import app from './app.js';
import { initializeDatabase, closeDatabase } from './db.js';
import { seedBaseTenders, runScraper, runCleanup, runEContractsScraper } from './scraper.js';
import logger from './utils/logger.js';

const PORT = process.env.PORT || 3003;
/** @type {any} */
let server;

async function startServer() {
  // 1. Initialize MongoDB connection and indexes
  await initializeDatabase();

  // 2. Seed robust base tenders if they do not exist
  await seedBaseTenders();

  // 3. Proactively clean up expired tenders on startup
  runCleanup().catch(err => logger.error('🔥 Initial database cleanup on start failed:', err));

  // 4. Proactively run the initial scrape on startup to ensure fresh listings exist
  runScraper().catch(err => logger.error('🔥 Initial scrape on start failed:', err));

  // 4.5. Proactively run the initial eContracts scrape on startup to ensure fresh data exists
  runEContractsScraper({ limitPages: 2 }).catch(err => logger.error('🔥 Initial eContracts scrape on start failed:', err));

  // 5. Schedule standard daily cron job at midnight to fetch latest e-GP tenders
  cron.schedule('0 0 * * *', () => {
    logger.info('⏰ Scheduled cron: Running web scraper...');
    runScraper().catch(err => logger.error('🔥 Scheduled scraping job failed:', err));
  });

  // 6. Schedule daily cron job at 1:00 AM to clean up expired tenders (deadline passed)
  cron.schedule('0 1 * * *', () => {
    logger.info('⏰ Scheduled cron: Running automatic database cleanup...');
    runCleanup().catch(err => logger.error('🔥 Scheduled cleanup job failed:', err));
  });

  // 6.5. Schedule daily cron job at 2:00 AM to fetch latest eContracts
  cron.schedule('0 2 * * *', () => {
    logger.info('⏰ Scheduled cron: Running eContracts web scraper...');
    runEContractsScraper({ limitPages: 5 }).catch(err => logger.error('🔥 Scheduled eContracts scraping job failed:', err));
  });

  // 5. Spin up the Express server
  server = app.listen(Number(PORT), '0.0.0.0', () => {
    logger.info(`🚀 Web Scraping Service running on http://0.0.0.0:${PORT}`);
  });
}

/**
 * Handle graceful termination
 * @param {string} signal
 */
async function gracefulShutdown(signal) {
  logger.info(`Received ${signal}. Initiating graceful shutdown...`);
  
  if (server) {
    server.close(async () => {
      logger.info('🛑 HTTP server closed.');
      try {
        await closeDatabase();
        logger.info('🔌 Database connections terminated cleanly.');
        process.exit(0);
      } catch (err) {
        logger.error('🔥 Error during database disconnection:', err);
        process.exit(1);
      }
    });
    
    // Safety exit timeout
    setTimeout(() => {
      logger.error('🔥 Forceful shutdown triggered: cleanup exceeded grace window.');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}

// Intercept standard termination events
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

startServer().catch((err) => {
  logger.error('🔥 Fatal: Failed to start Web Scraping Service', err);
  process.exit(1);
});
