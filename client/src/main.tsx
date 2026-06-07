import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ColorModeProvider } from './theme/ColorModeContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LanguageProvider } from './i18n/LanguageContext';
import { AuthProvider } from './lib/auth';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <LanguageProvider>
            <ColorModeProvider>
              <App />
            </ColorModeProvider>
          </LanguageProvider>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
