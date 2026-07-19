import { useState, type FormEvent } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Banner } from '@astryxdesign/core/Banner';
import { friendlyError } from '../../lib/api';
import { verifyPassword, setDevPassword } from '../../lib/devApi';
import './DevConsole.css';

/** Password prompt for the /dev console. On success, stores the password and continues. */
export default function DevLogin({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
        <span className="dev-eyebrow">StudyShark control room</span>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 4px', color: 'var(--color-text-primary)' }}>
          Welcome back
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: '0 0 24px' }}>
          Unlock the workspace to manage content, switch app context and tune game settings.
        </p>

        {error && (
          <div style={{ marginBottom: 16 }}>
            <Banner status="error" title={error} />
          </div>
        )}

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
          variant="primary"
          label={submitting ? 'Checking…' : 'Unlock'}
          isDisabled={!password || submitting}
          isLoading={submitting}
          style={{ width: '100%' }}
        />
      </form>
    </div>
  );
}
