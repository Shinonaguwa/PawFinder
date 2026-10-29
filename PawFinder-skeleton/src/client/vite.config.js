import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// During development, requests to /api are forwarded to the Express server
// (default port 3000, see APP_PORT in .env.example).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
