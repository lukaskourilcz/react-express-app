import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  resolve: { dedupe: ['react', 'react-dom'] },
  define: {
    'import.meta.env.VITE_PRODUCT': JSON.stringify('devshark'),
    'import.meta.env.VITE_LOCK_SUBJECT': JSON.stringify('webdev'),
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(''),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(''),
    'import.meta.env.VITE_PUBLIC_POSTHOG_KEY': JSON.stringify(''),
  },
  test: { environment: 'node', setupFiles: ['./tests/dom.ts', './tests/setup.ts'], sequence: { setupFiles: 'list' }, include: ['tests/**/*.test.{ts,tsx}'], restoreMocks: true },
});
