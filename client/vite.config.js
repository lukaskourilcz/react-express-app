var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
// `ANALYZE=true npm run build` emits a treemap of the bundle to
// dist/bundle-stats.html (open it to inspect the MUI/router/app split) plus a
// machine-readable dist/bundle-stats.json. No effect on a normal build.
var analyze = process.env.ANALYZE === 'true';
export default defineConfig({
    plugins: __spreadArray([
        react()
    ], (analyze
        ? [
            visualizer({ filename: 'dist/bundle-stats.html', template: 'treemap', gzipSize: true, brotliSize: true }),
            visualizer({ filename: 'dist/bundle-stats.json', template: 'raw-data', gzipSize: true }),
        ]
        : []), true),
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
                    // Note: `motion` and `posthog-js` are intentionally NOT pinned to a
                    // manual chunk. Motion's heavy DOM-animation features are loaded via a
                    // dynamic import (lib/motion) and posthog-js via another (lib/analytics);
                    // forcing either into a manualChunk would pull the whole package into
                    // the initial graph and defeat that lazy code-splitting.
                },
            },
        },
    },
});
