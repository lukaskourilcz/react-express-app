// Records quiz results that were graded but not yet saved to the account
// (lib/pendingQuizReceipts.ts, sent by lib/pendingQuizReplay.ts): once the learner is signed in, and again
// whenever the browser comes back online. Renders nothing but the toast that
// says a result was lost because it was too old to record.
import { useCallback, useEffect, useState } from 'react';
import { AppToast } from './ui/AppToast';
import { useT } from '../i18n/LanguageContext';
import { useAuth } from '../lib/auth';
import { pendingReceiptsFor } from '../lib/pendingQuizReceipts';
import { queryClient } from '../lib/queryClient';
import { profileStatsQueryKey } from '../lib/queries';
import { syncXpWithServer } from '../lib/xp';

export function PendingQuizResults() {
  const t = useT();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [lost, setLost] = useState(false);

  const replay = useCallback(async () => {
    if (!userId || pendingReceiptsFor(userId).length === 0) return;
    // The sender loads only when a result waits, so the first page load
    // does not carry it. Offline it may not load: the next 'online' tries again.
    const sender = await import('../lib/pendingQuizReplay').catch(() => null);
    if (!sender) return;
    const { replayPendingReceipts } = sender;
    const { recorded, refused } = await replayPendingReceipts(userId, (data) => {
      if (data) queryClient.setQueryData(profileStatsQueryKey(userId), data);
    });
    if (recorded > 0) await syncXpWithServer().catch(() => undefined);
    if (refused > 0) setLost(true);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    void replay();
    const onOnline = () => void replay();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [userId, replay]);

  return (
    <AppToast
      open={lost}
      onClose={() => setLost(false)}
      severity="error"
      autoHideDuration={8000}
      message={t('quiz.pendingResultLost')}
    />
  );
}

export default PendingQuizResults;
