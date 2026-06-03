import express from 'express';
import cors from 'cors';
import { processAiQuery, processPageQa } from './ai.js';

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

// Page QA endpoint for Chrome Extension companion
app.post('/api/ai/page-qa', async (req, res) => {
  const { pageContent, question, history } = req.body;

  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'A valid string question is required.' });
  }

  try {
    console.log(`💬 Page QA Query received in ai-service: "${question}"`);
    const answer = await processPageQa(pageContent || '', question, history || []);
    res.status(200).json({ answer });
  } catch (error) {
    console.error('❌ Failed to process page QA query in Express router:', error);
    res.status(500).json({ error: 'An internal server error occurred while processing your Page QA request.' });
  }
});

export default app;
