// The header's control for a signed-out visitor: "Log in", which opens the
// sign-in dialog (Google, or an email and password; lib/signInDialog.ts).
//
// It ships with the app shell instead of inside the lazy account widget
// (AuthButton). A visitor with no stored session is signed out from the first
// render (lib/auth.tsx), so the header can draw this button in its first frame
// at its final size. Drawn as the lazy widget's 56px placeholder, the header
// stood 16px taller until the chunk arrived, and <main> moved up when it did.
// The dialog's code loads on the press; a dialog that fails says so in a toast
// (SignInDialogHost).
import { Button } from '@astryxdesign/core/Button';
import { useT } from '../i18n/LanguageContext';
import { openSignIn } from '../lib/signInDialog';

export default function SignInButton() {
  const t = useT();
  return <Button variant="secondary" size="md" label={t('auth.logIn')} aria-haspopup="dialog" onClick={() => openSignIn()} />;
}
