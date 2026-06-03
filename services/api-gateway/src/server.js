import app from './app.js';

const PORT = process.env.PORT || 3002;

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 API Gateway running on http://0.0.0.0:${PORT}`);
});
