import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The dev server proxies /api and /uploads to the backend so the frontend runs
// same-origin (no CORS in dev, and it mirrors an offline single-origin deploy).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
});
