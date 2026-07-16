import { useState, type FormEvent } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Banner } from '@astryxdesign/core/Banner';
import { friendlyError } from '../../lib/api';
import { verifyPassword, setDevPassword } from '../../lib/devApi';

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
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh', padding: '0 16px' }}>
      <form
        onSubmit={handleSubmit}
        style={{
          padding: 32,
          width: '100%',
          maxWidth: 380,
          border: '1px solid var(--color-border)',
          borderRadius: 16,
          background: 'var(--color-background-surface)',
        }}
      >
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 4px', color: 'var(--color-text-primary)' }}>
          Dev console
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: '0 0 24px' }}>
          Enter the password to manage questions and game settings.
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
