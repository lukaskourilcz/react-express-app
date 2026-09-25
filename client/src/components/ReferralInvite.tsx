// "Invite a friend" on the Rewards screen (#228, handoff section 7.2).
//
// The link, a button that copies it, and how many friends have paid off so
// far. The server sends counts only, so this section cannot show who a friend
// is. The payment itself shows up in the ledger above ("Referral: a friend
// finished their first level"). With invitations off, or migration 042 not yet
// installed, the section does not render.
import { useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@astryxdesign/core/Button';
import { Kicker } from './landing/LandingKit';
import { useT } from '../i18n/LanguageContext';
import { useGameConfig } from '../lib/gameConfig';
import { inviteLink, useReferral } from '../lib/referral';
import './Rewards.css';

type CopyState = 'idle' | 'copied' | 'failed';

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export function ReferralInvite({ signedIn }: { signedIn: boolean }) {
  const t = useT();
  const config = useGameConfig();
  const referral = useReferral(signedIn);
  const [copy, setCopy] = useState<CopyState>('idle');
  const field = useRef<HTMLInputElement>(null);
  const headingId = useId();
  const fieldId = useId();
  const statusId = useId();

  const data = referral.data;
  // Signed out, the rules come from the public settings; signed in, from the
  // server's answer. Either way 0 coins means invitations are off.
  const coins = data?.coins ?? config.coins.referralGrant ?? 0;
  const cap = data?.cap ?? config.coins.referralCap ?? 0;
  if (coins <= 0 || (data && !data.enabled)) return null;

  const link = data?.code ? inviteLink(data.code) : null;
  const credited = data?.credited ?? 0;
  const pending = data?.pending ?? 0;

  const onCopy = async () => {
    if (!link) return;
    const ok = await copyText(link);
    setCopy(ok ? 'copied' : 'failed');
    // When the clipboard refuses, focus and select the link so the learner
    // can copy it with the keyboard or the context menu.
    if (!ok) {
      field.current?.focus();
      field.current?.select();
    }
  };

  return (
    <section className="rw-section rw-invite" aria-labelledby={headingId} aria-busy={(signedIn && referral.isPending) || undefined}>
      <Kicker as="h2" id={headingId}>{t('rewards.invite.title')}</Kicker>
      <p className="rw-muted">{t('rewards.invite.body', { n: coins, cap })}</p>

      {data?.invited === 'pending' && (
        <div className="rw-premium-note rw-invite__invited">
          <p>{t('rewards.invite.invited', { n: coins })}</p>
          <Link className="rw-btn" to="/learn">{t('rewards.invite.openLearn')}</Link>
        </div>
      )}

      {!signedIn && <p className="rw-muted">{t('rewards.invite.signedOut')}</p>}
      {signedIn && referral.isPending && <p className="rw-muted" role="status">{t('common.loading')}</p>}
      {signedIn && referral.isError && !data && (
        <div className="rw-inline-error" role="alert">
          <span>{t('rewards.invite.error')}</span>
          <Button variant="ghost" size="sm" label={t('quiz.retry')} onClick={() => void referral.refetch()} />
        </div>
      )}

      {link && (
        <>
          <div className="rw-invite__share">
            <label className="rw-label" htmlFor={fieldId}>{t('rewards.invite.linkLabel')}</label>
            <div className="rw-invite__field">
              <input
                ref={field}
                id={fieldId}
                className="ss-input rw-invite__input"
                type="text"
                readOnly
                value={link}
                aria-describedby={statusId}
                onFocus={(event) => event.currentTarget.select()}
              />
              <button type="button" className="rw-btn rw-btn--primary" onClick={() => void onCopy()}>
                {t('rewards.invite.copy')}
              </button>
            </div>
            <p id={statusId} className="rw-invite__status" role="status" aria-live="polite">
              {copy === 'copied' ? t('rewards.invite.copied') : copy === 'failed' ? t('rewards.invite.copyFailed') : ''}
            </p>
          </div>
          <ul className="rw-invite__counts">
            <li>
              <span>{t('rewards.invite.count')}</span>
              <strong>{t('rewards.invite.countValue', { n: Math.min(credited, cap), cap })}</strong>
            </li>
            {pending > 0 && (
              <li>
                <span>{t('rewards.invite.pending')}</span>
                <strong>{pending}</strong>
              </li>
            )}
          </ul>
          {credited >= cap && <p className="rw-muted">{t('rewards.invite.capped', { cap, n: coins })}</p>}
          <p className="rw-muted rw-invite__privacy">{t('rewards.invite.privacy')}</p>
        </>
      )}
    </section>
  );
}

export default ReferralInvite;
