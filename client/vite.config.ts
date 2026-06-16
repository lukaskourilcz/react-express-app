import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// Shared, framework-agnostic code lives in ../shared and is consumed by both
// the web client and the mobile app via the `@shared` alias.
const sharedDir = fileURLToPath(new URL('../shared', import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@shared': sharedDir },
  },
  server: {
    port: 3000,
    // Allow the dev server to serve files from the repo root (for ../shared).
    fs: { allow: ['..'] },
    // For local dev, run `vercel dev` from the repo root which serves the
    // client + api/ routes together. Plain `vite` is fine if you don't need
    // the API.
  },
  build: {
    target: 'es2020',
    sourcemap: true,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react/jsx-runtime'],
          router: ['react-router', 'react-router-dom'],
          mui: ['@mui/material', '@mui/material/styles', '@emotion/react', '@emotion/styled'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
});
