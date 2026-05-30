import app from './app.js';
import { initializeDatabase, closeDatabase } from './db.js';
import logger from './utils/logger.js';

const PORT = process.env.PORT || 3001;
/** @type {any} */
let server;

async function startServer() {
  await initializeDatabase();
  server = app.listen(PORT, () => {
    logger.info(`🚀 Auth Service running on http://localhost:${PORT}`);
  });
}

/**
 * @param {string} signal
 */
async function gracefulShutdown(signal) {
  logger.info(`🔔 Received ${signal}. Initiating graceful shutdown...`);
  
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
    
    // Safety timeout to force exit if cleanup hangs
    setTimeout(() => {
      logger.error('🔥 Forceful shutdown triggered: cleanup exceeded grace window.');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}

// Intercept system shutdown requests
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

startServer().catch((err) => {
  logger.error('🔥 Fatal: Failed to start Auth Service', err);
  process.exit(1);
});
