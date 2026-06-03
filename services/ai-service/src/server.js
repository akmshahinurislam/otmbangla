import app from './app.js';
import { initializeDatabase } from './db.js';

const PORT = process.env.PORT || 3004;

async function startServer() {
  try {
    // 1. Connect to MongoDB shared cluster
    await initializeDatabase();

    // 2. Listen on port 3004
    app.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`🚀 AI Assistant Service running on http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error('❌ CRITICAL: Failed to launch AI Assistant service:', error);
    process.exit(1);
  }
}

startServer();
