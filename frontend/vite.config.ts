import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// VITE_API_URL (see .env.example) is the single place the backend origin lives.
//
// When it is empty the app requests relative /api and /uploads paths, and this
// dev-server proxy forwards them to the backend so everything stays
// same-origin (no CORS in dev, mirroring the nginx/Caddy deployment).
//
// When it is set the app requests that origin directly, the proxy below goes
// unused, and the backend's CORS_ORIGINS has to allow the frontend.
export default defineConfig(({ mode }) => {
  // '.' rather than process.cwd(): this package has no @types/node, and the
  // frontend is built standalone (Vercel installs only frontend/).
  const env = loadEnv(mode, '.', '');
  const backend = env.VITE_API_URL || 'http://localhost:4000';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': { target: backend, changeOrigin: true },
        '/uploads': { target: backend, changeOrigin: true },
      },
    },
  };
});
