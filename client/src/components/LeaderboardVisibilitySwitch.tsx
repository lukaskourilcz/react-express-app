// The switch that puts the signed-in learner's name and photo on the public
// leaderboards, or takes them off. The Profile and the Leaderboard both show
// it, over the same query (lib/leaderboardVisibility.ts), so a change in one
// is already there in the other. It is off until the learner switches it on.

import { useState } from 'react';
import { Switch } from '@astryxdesign/core/Switch';
import ErrorRetry from './ErrorRetry';
import { AppToast } from './ui/AppToast';
import { useT } from '../i18n/LanguageContext';
import { useLeaderboardVisibility } from '../lib/leaderboardVisibility';
import './LeaderboardVisibilitySwitch.css';

export default function LeaderboardVisibilitySwitch() {
  const t = useT();
  const { visible, failed, retry, saving, setVisible } = useLeaderboardVisibility();
  const [message, setMessage] = useState<string | null>(null);

  if (failed) return <ErrorRetry message={t('leaderboard.visibility.loadFailed')} onRetry={retry} />;

  return (
    <div className="lb-visibility">
      <Switch
        label={t('leaderboard.visibility.label')}
        description={t('leaderboard.visibility.hint')}
        value={visible === true}
        // Until the stored choice arrives there is nothing true to switch.
        isDisabled={visible === null}
        isLoading={saving}
        onChange={(checked) => {
          setMessage(null);
          setVisible(checked, { onError: () => setMessage(t('leaderboard.visibility.saveFailed')) });
        }}
      />
      <AppToast open={!!message} message={message} onClose={() => setMessage(null)} severity="error" />
    </div>
  );
}
