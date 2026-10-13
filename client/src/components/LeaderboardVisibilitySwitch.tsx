// The Profile and Leaderboard share this account-name/shark-nickname choice.
import { useState } from 'react';
import { RadioList, RadioListItem } from '@astryxdesign/core/RadioList';
import { Switch } from '@astryxdesign/core/Switch';
import ErrorRetry from './ErrorRetry';
import { AppToast } from './ui/AppToast';
import { useT } from '../i18n/LanguageContext';
import { useLeaderboardVisibility } from '../lib/leaderboardVisibility';
import './LeaderboardVisibilitySwitch.css';

export default function LeaderboardVisibilitySwitch() {
  const t = useT();
  const { setting, failed, retry, saving, setMode, setPhoto } = useLeaderboardVisibility();
  const [message, setMessage] = useState<string | null>(null);

  if (failed) return <ErrorRetry message={t('leaderboard.visibility.loadFailed')} onRetry={retry} />;

  return (
    <div className="lb-visibility">
      <RadioList
        label={t('leaderboard.name.label')}
        description={t('leaderboard.name.hint')}
        value={setting?.mode ?? 'nickname'}
        isDisabled={!setting || saving}
        onChange={(value) => {
          setMessage(null);
          setMode(value === 'account' ? 'account' : 'nickname', { onError: () => setMessage(t('leaderboard.visibility.saveFailed')) });
        }}
      >
        <RadioListItem value="nickname" label={t('leaderboard.name.nickname')} description={setting?.nickname ?? '…'} />
        <RadioListItem value="account" label={t('leaderboard.name.account')} description={setting?.accountName ?? t('leaderboard.name.unavailable')} isDisabled={!setting?.accountName} />
      </RadioList>
      <div className="lb-photo">
        <Switch label={t('leaderboard.name.photo')} description={t('leaderboard.name.photoHint')}
          value={setting?.showPhoto === true} isDisabled={!setting || saving}
          onChange={checked => { setMessage(null); setPhoto(checked, { onError: () => setMessage(t('leaderboard.visibility.saveFailed')) }); }} />
      </div>
      <AppToast open={!!message} message={message} onClose={() => setMessage(null)} severity="error" />
    </div>
  );
}
