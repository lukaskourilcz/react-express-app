import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { PurgeCSS } from 'purgecss';
import { PRODUCT_CATALOG, resolveCatalogProductId } from './product-catalog';
import { TOPIC_LANDINGS } from './src/lib/topicCatalog';

// `ANALYZE=true npm run build` emits a treemap of the bundle to
// dist/bundle-stats.html (open it to inspect the design-system/router/app split) plus a
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
            standard: [/^ss-/, /^rm-/, /^quiz-/, /^devshark/, /^cd-/, /^cm-/, 'html', 'body'],
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

function productMetadata(env: Record<string, string>): Plugin {
  const id = resolveCatalogProductId({ lockSubject: env.VITE_LOCK_SUBJECT, product: env.VITE_PRODUCT });
  const product = PRODUCT_CATALOG[id];
  const title = product.title.en;
  const description = product.description.en;
  const manifest = JSON.stringify({
    name: product.brand,
    short_name: product.brand,
    description,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#2d7a2d',
    icons: [
      { src: '/icon.svg', type: 'image/svg+xml', sizes: 'any', purpose: 'any' },
      { src: '/icon-192.png', type: 'image/png', sizes: '192x192', purpose: 'any maskable' },
      { src: '/icon-512.png', type: 'image/png', sizes: '512x512', purpose: 'any maskable' },
    ],
  }, null, 2);
  const renderHtml = (html: string) => html
    .split('__PRODUCT_NAME__').join(product.brand)
    .split('__PRODUCT_TITLE__').join(title)
    .split('__PRODUCT_DESCRIPTION__').join(description);

  return {
    name: 'product-metadata',
    transformIndexHtml: renderHtml,
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split('?')[0] !== '/manifest.webmanifest') return next();
        res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
        res.end(manifest);
      });
    },
    generateBundle(_options, bundle) {
      const asset = bundle['manifest.webmanifest'];
      if (asset?.type === 'asset') asset.source = manifest;
    },
    async writeBundle() {
      const outDir = path.resolve(__dirname, 'dist');
      await writeFile(path.join(outDir, 'manifest.webmanifest'), manifest);

      // Emit a metadata-specific HTML shell for each public topic. React still
      // hydrates the shared application, but crawlers receive a useful title
      // and description without exposing any scored-session question data.
      const indexHtml = await readFile(path.join(outDir, 'index.html'), 'utf8');
      const topics = TOPIC_LANDINGS.filter((topic) =>
        id === 'studyshark' ? topic.subject !== 'webdev' : topic.subject === product.subjectId,
      );
      for (const topic of topics) {
        const topicTitle = `${topic.title.en} · ${product.brand}`;
        const topicDescription = topic.description.en;
        const html = indexHtml
          .replace(/<title>[^<]*<\/title>/, `<title>${topicTitle}</title>`)
          .replace(/(<meta name="description" content=")[^"]*(" \/>)/, `$1${topicDescription}$2`)
          .replace(/(<meta property="og:title" content=")[^"]*(" \/>)/, `$1${topicTitle}$2`)
          .replace(/(<meta property="og:description" content=")[^"]*(" \/>)/, `$1${topicDescription}$2`)
          .replace(/(<meta name="twitter:title" content=")[^"]*(" \/>)/, `$1${topicTitle}$2`)
          .replace(/(<meta name="twitter:description" content=")[^"]*(" \/>)/, `$1${topicDescription}$2`);
        const topicDir = path.join(outDir, 'topics', topic.slug);
        await mkdir(topicDir, { recursive: true });
        await writeFile(path.join(topicDir, 'index.html'), html);
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
  plugins: [
    productMetadata(env),
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
  // The coding runner worker is a separate bundle. Its files live under one
  // directory so vercel.json can serve them with their own policy (`new
  // Function` is allowed there and nowhere else on the page).
  worker: {
    format: 'es',
    rollupOptions: {
      output: {
        entryFileNames: 'assets/coding-worker/[name]-[hash].js',
        chunkFileNames: 'assets/coding-worker/[name]-[hash].js',
        assetFileNames: 'assets/coding-worker/[name]-[hash][extname]',
      },
    },
  },
  build: {
    target: 'es2020',
    // 'hidden' still emits .map files (for Sentry/source-map tooling) but
    // strips the //# sourceMappingURL comment so browsers don't fetch them
    // for end users.
    sourcemap: 'hidden',
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      // The coding sandbox that hosts React tasks is a second, separate build
      // (vite.sandbox.config.ts): it needs the development React so Testing
      // Library has `React.act`, which the app itself must not ship.
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
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
  };
});
