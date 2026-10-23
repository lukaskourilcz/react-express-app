// Offers a kept invite code once the visitor has signed in, and says so when
// the server accepted it (#228). Renders nothing but that one toast. The
// server decides whether the account is new enough to be invited; this only
// carries the code from the link to the first signed-in request.
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AppToast } from './ui/AppToast';
import { useT } from '../i18n/LanguageContext';
import { useAuth } from '../lib/auth';
import { accountEpoch } from '../lib/accountData';
import { claimStoredReferral, storedReferral } from '../lib/referral';

export function ReferralBinder() {
  const t = useT();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();
  const offeredFor = useRef<string | null>(null);
  const [accepted, setAccepted] = useState<number | null>(null);

  // Keyed on the id: auth replaces the user object on every token refresh.
  useEffect(() => {
    if (!userId || offeredFor.current === userId) return;
    offeredFor.current = userId;
    if (!storedReferral()) return;
    const epoch = accountEpoch();
    void claimStoredReferral().then((result) => {
      // An answer after a sign-out belongs to the account that left.
      if (result?.status !== 'recorded' || accountEpoch() !== epoch) return;
      setAccepted(result.coins);
      void queryClient.invalidateQueries({ queryKey: ['rewards'] });
    });
  }, [userId, queryClient]);

  return (
    <AppToast
      open={accepted !== null}
      onClose={() => setAccepted(null)}
      severity="success"
      autoHideDuration={8000}
      message={accepted !== null ? t('referral.accepted', { n: accepted }) : ''}
    />
  );
}

export default ReferralBinder;
