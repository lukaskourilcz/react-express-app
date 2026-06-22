import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { ColorModeProvider } from './theme/ColorModeContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LanguageProvider } from './i18n/LanguageContext';
import { AuthProvider } from './lib/auth';
import { queryClient } from './lib/queryClient';
import { initSentry } from './lib/sentry';

// Start error/performance reporting before anything renders (no-op without a DSN).
initSentry();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <LanguageProvider>
              <ColorModeProvider>
                <App />
              </ColorModeProvider>
            </LanguageProvider>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
