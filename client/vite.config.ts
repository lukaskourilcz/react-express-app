import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
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
          auth0: ['@auth0/auth0-react'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
});
