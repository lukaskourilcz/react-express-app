import React from 'react';
import ReactDOM from 'react-dom/client';
import { Auth0Provider } from '@auth0/auth0-react';
import { BrowserRouter } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import App from './App';
import { ColorModeProvider } from './theme/ColorModeContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SyncBoot } from './components/SyncBoot';

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.1,
    // Strip URLs that may carry auth tokens.
    beforeBreadcrumb(crumb) {
      if (crumb.category === 'fetch' && typeof crumb.data?.url === 'string') {
        crumb.data.url = crumb.data.url.replace(/(token|auth0_id|sub)=[^&]+/gi, '$1=[redacted]');
      }
      return crumb;
    },
  });
}

const auth0Domain = import.meta.env.VITE_AUTH0_DOMAIN;
const auth0ClientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
const auth0Audience = import.meta.env.VITE_AUTH0_AUDIENCE;

const AuthWrapper = ({ children }: { children: React.ReactNode }) => {
  if (!auth0Domain || !auth0ClientId) {
    if (import.meta.env.DEV) {
      console.warn('Auth0 credentials not configured. Authentication disabled.');
    }
    return <>{children}</>;
  }
  return (
    <Auth0Provider
      domain={auth0Domain}
      clientId={auth0ClientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        ...(auth0Audience ? { audience: auth0Audience } : {}),
      }}
      cacheLocation="localstorage"
      useRefreshTokens
    >
      {children}
    </Auth0Provider>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthWrapper>
        <BrowserRouter>
          <ColorModeProvider>
            <SyncBoot />
            <App />
          </ColorModeProvider>
        </BrowserRouter>
      </AuthWrapper>
    </ErrorBoundary>
  </React.StrictMode>,
);
