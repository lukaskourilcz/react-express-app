import { useEffect, useState } from 'react';
import LoadingScreen from '../LoadingScreen';
import DevLogin from './DevLogin';
import DevConsole from './DevConsole';
import { getDevPassword, clearDevPassword, verifyPassword } from '../../lib/devApi';
import { useAuth } from '../../lib/auth';

type Phase = 'checking' | 'login' | 'ready';

/**
 * Entry point for the authenticated /dev admin console. The API checks the
 * current Supabase session first and may allow an explicitly configured legacy
 * password during migration.
 *
 * The access check belongs to the account that passed it. When the signed-in
 * account changes (a sign-out, or another account signing in) the check runs
 * again from the start, so the console never stays open, showing questions,
 * sign-in emails and shipping addresses, for someone who is not an admin.
 */
export default function DevPage() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen label="Checking access…" />;
  return <DevAccess key={user?.id ?? 'signed-out'} />;
}

function DevAccess() {
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
