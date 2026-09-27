// The header's control for a signed-out visitor: "Log in", and a toast when the
// sign-in cannot start.
//
// It ships with the app shell instead of inside the lazy account widget
// (AuthButton). A visitor with no stored session is signed out from the first
// render (lib/auth.tsx), so the header can draw this button in its first frame
// at its final size. Drawn as the lazy widget's 56px placeholder, the header
// stood 16px taller until the chunk arrived, and <main> moved up when it did.
import { useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { AppToast } from './ui/AppToast';
import { useT } from '../i18n/LanguageContext';
import { useAuth } from '../lib/auth';

export default function SignInButton() {
  const { signInWithGoogle } = useAuth();
  const t = useT();
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch {
      setError(t('auth.signInFailed'));
    }
  };

  return (
    <>
      <Button variant="secondary" size="md" label={t('auth.logIn')} onClick={handleLogin} />
      <AppToast open={!!error} onClose={() => setError(null)} severity="error" message={error} autoHideDuration={8000} />
    </>
  );
}
