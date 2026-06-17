import { useEffect, useState } from 'react';
import LoadingScreen from '../LoadingScreen';
import DevLogin from './DevLogin';
import DevConsole from './DevConsole';
import { getDevPassword, clearDevPassword, verifyPassword } from '../../lib/devApi';

type Phase = 'checking' | 'login' | 'ready';

/**
 * Entry point for the password-gated /dev admin console. Verifies any stored
 * password on mount; otherwise shows the login form.
 */
export default function DevPage() {
  const [phase, setPhase] = useState<Phase>(() => (getDevPassword() ? 'checking' : 'login'));

  useEffect(() => {
    if (phase !== 'checking') return;
    let active = true;
    verifyPassword(getDevPassword())
      .then((ok) => active && setPhase(ok ? 'ready' : 'login'))
      .catch(() => active && setPhase('login'));
    return () => {
      active = false;
    };
  }, [phase]);

  if (phase === 'checking') return <LoadingScreen label="Checking access…" />;
  if (phase === 'login') return <DevLogin onSuccess={() => setPhase('ready')} />;
  return (
    <DevConsole
      onLock={() => {
        clearDevPassword();
        setPhase('login');
      }}
    />
  );
}
