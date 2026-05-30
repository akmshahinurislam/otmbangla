import express from 'express';
import cors from 'cors';
import { processAiQuery } from './ai.js';

const app = express();

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'ai-service' });
});

// Chat endpoint for intelligent assistant
app.post('/api/ai/chat', async (req, res) => {
  const { message, history } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'A valid string message is required.' });
  }

  try {
    console.log(`💬 User Query received in ai-service: "${message}"`);
    const response = await processAiQuery(message, history || []);
    res.status(200).json(response);
  } catch (error) {
    console.error('❌ Failed to process chat query in Express router:', error);
    res.status(500).json({ error: 'An internal server error occurred while processing your AI request.' });
  }
});

export default app;
