import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

// `ANALYZE=true npm run build` emits a treemap of the bundle to
// dist/bundle-stats.html (open it to inspect the MUI/router/app split) plus a
// machine-readable dist/bundle-stats.json. No effect on a normal build.
const analyze = process.env.ANALYZE === 'true';

export default defineConfig({
  plugins: [
    react(),
    ...(analyze
      ? [
          visualizer({ filename: 'dist/bundle-stats.html', template: 'treemap', gzipSize: true, brotliSize: true }),
          visualizer({ filename: 'dist/bundle-stats.json', template: 'raw-data', gzipSize: true }),
        ]
      : []),
  ],
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
          // React core in its own long-lived chunk. (The app is now MUI-free —
          // the old combined `mui` chunk is gone.)
          react: ['react', 'react-dom', 'react/jsx-runtime'],
          router: ['react-router-dom'],
          tanstack: ['@tanstack/react-query', '@tanstack/query-core'],
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
