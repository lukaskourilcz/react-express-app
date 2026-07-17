import { Component, type ReactNode } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { reportError } from '../lib/sentry';
import { getStoredLang } from '../i18n/LanguageContext';

// The boundary may catch a crash inside the LanguageProvider itself, so it
// keeps its own tiny bilingual dictionary instead of using useT().
const COPY = {
  en: {
    title: 'Something went wrong',
    body: 'The page hit an unexpected error. Reloading usually fixes it.',
    tryAgain: 'Try again',
    reload: 'Reload page',
  },
  cs: {
    title: 'Něco se pokazilo',
    body: 'Na stránce došlo k nečekané chybě. Obnovení stránky to obvykle spraví.',
    tryAgain: 'Zkusit znovu',
    reload: 'Obnovit stránku',
  },
} as const;

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
    reportError(error, { componentStack: info.componentStack });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    const copy = COPY[getStoredLang()];

    return (
      <div
        role="alert"
        style={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <div
          style={{
            padding: 32,
            maxWidth: 480,
            textAlign: 'center',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-container)',
            background: 'var(--color-background-surface)',
          }}
        >
          <div style={{ marginBottom: 8 }}>
            <Heading level={3} justify="center">
              {copy.title}
            </Heading>
          </div>
          <div style={{ marginBottom: 24 }}>
            <Text type="body" color="secondary">
              {copy.body}
            </Text>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Button onClick={this.handleReset} variant="secondary" label={copy.tryAgain} />
            <Button onClick={() => window.location.reload()} variant="primary" label={copy.reload} />
          </div>
        </div>
      </div>
    );
  }
}
