import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// Separate from the app's build hooks, public files, metadata and sandbox.
export default defineConfig({
  plugins: [react()], publicDir: false,
  resolve: { dedupe: ['react', 'react-dom'] },
  define: Object.fromEntries(Object.entries({ VITE_PRODUCT: 'devshark', VITE_LOCK_SUBJECT: 'webdev',
    VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '', VITE_PUBLIC_POSTHOG_KEY: '', VITE_SENTRY_DSN: '',
  }).map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)])),
});
