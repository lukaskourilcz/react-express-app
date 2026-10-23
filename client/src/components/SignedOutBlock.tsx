// The one signed-out state of the money screens (UX audit money-05): one
// sentence in secondary text, then one "Sign in" button that opens the sign-in
// dialog. It stands in place of the content a visitor cannot see yet (the
// /shop wallet and invite link, the checkout's payment step), so it adds no
// card of its own and the layout around it does not move after sign-in.
//
// The page's first block is the primary; a second one on the same screen
// passes emphasis="secondary", so the screen keeps one filled primary.
import { Button } from '@astryxdesign/core/Button';
import { useT } from '../i18n/LanguageContext';
import { openSignIn } from '../lib/signInDialog';
import './SignedOutBlock.css';

export interface SignedOutBlockProps {
  /** What signing in shows or does here, in one sentence. */
  message: string;
  /** The button's words; "Sign in" unless the step needs its own verb. */
  label?: string;
  /** A path on this site to land on after signing in; without it the
   *  visitor comes back to this page. */
  returnTo?: string;
  emphasis?: 'primary' | 'secondary';
  className?: string;
}

export function SignedOutBlock({ message, label, returnTo, emphasis = 'primary', className }: SignedOutBlockProps) {
  const t = useT();
  return (
    <div className={className ? `ss-signed-out ${className}` : 'ss-signed-out'}>
      <p className="ss-signed-out__text">{message}</p>
      <Button
        variant={emphasis}
        className="ss-action"
        label={label ?? t('auth.logIn')}
        aria-haspopup="dialog"
        onClick={() => openSignIn(returnTo ? { returnTo } : {})}
      />
    </div>
  );
}

export default SignedOutBlock;
