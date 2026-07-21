import { useEffect, useState } from 'react';
import LoadingScreen from '../LoadingScreen';
import DevLogin from './DevLogin';
import DevConsole from './DevConsole';
import { getDevPassword, clearDevPassword, verifyPassword } from '../../lib/devApi';

type Phase = 'checking' | 'login' | 'ready';

/**
 * Entry point for the authenticated /dev admin console. The API checks the
 * current Supabase session first and may allow an explicitly configured legacy
 * password during migration.
 */
export default function DevPage() {
  const [phase, setPhase] = useState<Phase>('checking');

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
