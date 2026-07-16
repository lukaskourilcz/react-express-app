import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
// Astryx design-system foundation (component CSS + themed tokens). Imported
// before the app so its base layer sits under any component-level styles.
import './styles/astryx-theme.css';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { ColorModeProvider } from './theme/ColorModeContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LanguageProvider } from './i18n/LanguageContext';
import { AuthProvider } from './lib/auth';
import { queryClient } from './lib/queryClient';
import { initSentry } from './lib/sentry';
import { initAnalytics } from './lib/analytics';
import { MotionProvider } from './lib/motion';

// Start error/performance reporting before anything renders (no-op without a DSN).
initSentry();
// Load PostHog product analytics in the background (no-op without a key; the
// SDK is dynamically imported so it never lands in the initial bundle).
initAnalytics();
// Register wallet + inventory into the account-synced blob so any sign-in
// pulls the balance/owned/equipped that was earned on other devices. Runs at
// module load, before any component mounts.
import('./lib/roadmap').then(({ registerAccountExtras, installProgressSyncFlusher }) => {
  installProgressSyncFlusher();
  // XP has its own debounce; hook its beacon into the same pagehide/hidden events.
  import('./lib/xp').then(({ flushQuestXpBeacon }) => {
    const flush = () => flushQuestXpBeacon();
    window.addEventListener('pagehide', flush);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush();
    });
  });
  Promise.all([import('./lib/tokens'), import('./lib/shop')]).then(([tok, sh]) => {
    registerAccountExtras(
      () => ({
        wallets: tok.getWalletsSnapshot(),
        inventories: sh.getInventoriesSnapshot(),
      }),
      (server) => {
        // Per subject: max-merge balances; union owned; server-wins on
        // equipped (if valid), max on doubleXp charges — never revoke on sync.
        tok.mergeBalancesFromServer(server.wallets);
        sh.mergeInventoriesFromServer(server.inventories);
      },
    );
  });
});

// React Query devtools, dev-only: the dynamic import lives in a DEV-gated branch
// so it (and the dependency) is dropped from the production bundle entirely.
const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-query-devtools').then((m) => ({ default: m.ReactQueryDevtools })),
    )
  : null;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <LanguageProvider>
              <ColorModeProvider>
                <MotionProvider>
                  <App />
                </MotionProvider>
              </ColorModeProvider>
            </LanguageProvider>
          </BrowserRouter>
        </AuthProvider>
        {ReactQueryDevtools && (
          <Suspense fallback={null}>
            <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
          </Suspense>
        )}
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
