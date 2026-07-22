import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev: proxy /api → wrangler pages dev (porta 8788).
// Avvia: `npm run pages:dev` in un altro terminale, poi `npm run dev`.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8788',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'node',
  },
});
