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
        // 'hidden' still emits .map files (for Sentry/source-map tooling) but
        // strips the //# sourceMappingURL comment so browsers don't fetch them
        // for end users.
        sourcemap: 'hidden',
        chunkSizeWarningLimit: 500,
        rollupOptions: {
            output: {
                manualChunks: {
                    // React lives in the same chunk as MUI since MUI imports React
                    // directly; the previous standalone `react` chunk hoisted to ~99
                    // bytes (a single re-export of MUI), wasting one HTTP request.
                    mui: [
                        'react', 'react-dom', 'react/jsx-runtime',
                        '@mui/material', '@mui/material/styles',
                        '@emotion/react', '@emotion/styled',
                    ],
                    router: ['react-router-dom'],
                    supabase: ['@supabase/supabase-js'],
                },
            },
        },
    },
});
