import { useState, type FormEvent } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Banner } from '@astryxdesign/core/Banner';
import { friendlyError } from '../../lib/api';
import { verifyPassword, setDevPassword } from '../../lib/devApi';
import { useAuth } from '../../lib/auth';
import './DevConsole.css';

/** Password prompt for the /dev console. On success, stores the password and continues. */
export default function DevLogin({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { isAuthenticated, signInWithGoogle } = useAuth();
  const showLegacy = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('legacy') === '1';

  const checkAccount = async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (!isAuthenticated) {
        await signInWithGoogle();
        return;
      }
      if (await verifyPassword('')) onSuccess();
      else setError('This account does not have administrative access.');
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const ok = await verifyPassword(password);
      if (ok) {
        setDevPassword(password);
        onSuccess();
      } else {
        setError('Incorrect password.');
      }
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="dev-login-page">
      <form
        className="dev-login-card"
        onSubmit={handleSubmit}
      >
        <span className="dev-brand-fin" aria-hidden="true" />
        <span className="dev-eyebrow">Shark platform control room</span>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 4px', color: 'var(--color-text-primary)' }}>
          Welcome back
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: '0 0 24px' }}>
          Continue with an approved admin account. A legacy password is shown only for explicitly configured deployments.
        </p>

        {error && (
          <div style={{ marginBottom: 16 }}>
            <Banner status="error" title={error} />
          </div>
        )}

        <Button
          type="button"
          variant="primary"
          label={isAuthenticated ? 'Check admin access' : 'Continue with Google'}
          onClick={checkAccount}
          isDisabled={submitting}
          isLoading={submitting}
          style={{ width: '100%', marginBottom: 18 }}
        />
        {showLegacy && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}><span style={{ height: 1, background: 'var(--color-border)', flex: 1 }} /><span>Legacy access</span><span style={{ height: 1, background: 'var(--color-border)', flex: 1 }} /></div>
            <div style={{ marginBottom: 16 }}>
              <TextInput
                hasAutoFocus
                width="100%"
                type="password"
                label="Password"
                value={password}
                onChange={(value) => setPassword(value)}
              />
            </div>
            <Button
              type="submit"
              variant="secondary"
              label={submitting ? 'Checking…' : 'Use legacy password'}
              isDisabled={!password || submitting}
              isLoading={submitting}
              style={{ width: '100%' }}
            />
          </>
        )}
      </form>
    </div>
  );
}
