import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { PurgeCSS } from 'purgecss';

// `ANALYZE=true npm run build` emits a treemap of the bundle to
// dist/bundle-stats.html (open it to inspect the MUI/router/app split) plus a
// machine-readable dist/bundle-stats.json. No effect on a normal build.
const analyze = process.env.ANALYZE === 'true';

// Astryx ships ONE monolithic astryx.css covering ~100 components while the
// app imports ~40, and CSS has no per-component entry to import selectively.
// This post-build pass purges the emitted stylesheet against the emitted,
// tree-shaken JS — the exact class names that actually ship — so unused
// component styles are dropped without guessing at the source level.
// StyleX class names appear as literal strings in the bundle, which is what
// makes this safe; keyframes/font-faces/CSS variables are kept wholesale.
function purgeAstryxCss(): Plugin {
  return {
    name: 'purge-astryx-css',
    apply: 'build',
    enforce: 'post',
    async closeBundle() {
      const outDir = path.resolve(__dirname, 'dist');
      const assetsDir = path.join(outDir, 'assets');
      const files = await readdir(assetsDir);
      const cssFiles = files.filter((f) => f.endsWith('.css'));
      const content = [
        path.join(outDir, 'index.html'),
        ...files.filter((f) => f.endsWith('.js')).map((f) => path.join(assetsDir, f)),
      ];
      for (const cssFile of cssFiles) {
        const cssPath = path.join(assetsDir, cssFile);
        const before = (await readFile(cssPath, 'utf8')).length;
        const [result] = await new PurgeCSS().purge({
          content,
          css: [cssPath],
          // Keep everything that isn't provably unused:
          variables: false, // custom properties pass through untouched
          keyframes: false, // all @keyframes kept (some are toggled at runtime)
          fontFace: false, // all @font-face kept
          safelist: {
            standard: [/^ss-/, /^rm-/, /^quiz-/, /^devshark/, 'html', 'body'],
            // Attribute/state selectors composed at runtime.
            greedy: [/data-theme/, /data-color-mode/, /data-selected/, /data-active/, /data-tone/, /data-locked/, /data-complete/],
          },
        });
        await writeFile(cssPath, result.css);
        const after = result.css.length;
        this.info(
          `purge-astryx-css: ${cssFile} ${(before / 1024).toFixed(1)}kB -> ${(after / 1024).toFixed(1)}kB`,
        );
      }
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    purgeAstryxCss(),
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
          // the old combined `mui` chunk is gone.) `react-dom/client` must be
          // listed explicitly: the app only imports the subpath (createRoot),
          // and the bare `react-dom` entry alone never matches it — the
          // renderer was silently landing in the main app chunk and getting
          // re-downloaded on every deploy.
          react: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime'],
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
