import React from 'react';
import ReactDOM from 'react-dom/client';
import { Auth0Provider } from '@auth0/auth0-react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ColorModeProvider } from './theme/ColorModeContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthBridge } from './lib/AuthBridge';
import { LanguageProvider } from './i18n/LanguageContext';

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
      <AuthBridge />
      {children}
    </Auth0Provider>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthWrapper>
        <BrowserRouter>
          <LanguageProvider>
            <ColorModeProvider>
              <App />
            </ColorModeProvider>
          </LanguageProvider>
        </BrowserRouter>
      </AuthWrapper>
    </ErrorBoundary>
  </React.StrictMode>,
);
