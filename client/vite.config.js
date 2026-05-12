import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [react()],
    server: {
        port: 3000,
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
                    auth0: ['@auth0/auth0-react'],
                    supabase: ['@supabase/supabase-js'],
                    // sucrase is only used by the CodeSandbox route. Splitting it
                    // into its own chunk keeps ~48KB gzip out of the initial bundle.
                    sucrase: ['sucrase'],
                },
            },
        },
    },
});
