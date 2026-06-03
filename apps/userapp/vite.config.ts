import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    proxy: {
      '/analyze': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
      },
      '/api/ai': {
        target: 'http://127.0.0.1:3004',
        changeOrigin: true,
      },
    },
  },
});
