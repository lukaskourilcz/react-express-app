// The invite link at a moment of success (#239): after a learner's first
// passed Learn level and after a Biggest Shark Challenge run. The mechanic is
// the one Rewards already shows (ReferralInvite.tsx, #228): the same link,
// the same coins for both friends, decided by the server. This is only the
// moment to offer it, with the platform's share sheet and a copy button.
//
//   signed out, loading, error, invitations off   nothing: the result screen
//                                                 stays about the result
//   ready                                         one line, Share and Copy
//   shared / copied / copy refused                a polite status line; a
//                                                 refused copy shows the link
//                                                 selected so it can be copied
import { useId, useRef, useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { useT } from '../i18n/LanguageContext';
import { inviteLink, useReferral } from '../lib/referral';
import { CURRENT_PRODUCT } from '../lib/products';
import { canWebShare, captureShare, copyText, shareLink, type ShareSource } from '../lib/share';
import './ShareMoments.css';

type Status = 'idle' | 'shared' | 'copied' | 'failed';

export default function ReferralMoment({ signedIn, source }: { signedIn: boolean; source: Extract<ShareSource, 'learn_level' | 'challenge'> }) {
  const t = useT();
  const referral = useReferral(signedIn);
  const [status, setStatus] = useState<Status>('idle');
  const field = useRef<HTMLInputElement>(null);
  const headingId = useId();
  const statusId = useId();

  const data = referral.data;
  if (!signedIn || !data?.enabled || !data.code || !data.coins) return null;
  const link = inviteLink(data.code);

  const onShare = async () => {
    captureShare('referral', source, 'share');
    const outcome = await shareLink({ title: CURRENT_PRODUCT.brand, text: t('referral.moment.shareText', { n: data.coins ?? 0 }), url: link });
    if (outcome !== 'cancelled') setStatus(outcome === 'shared' ? 'shared' : outcome === 'copied' ? 'copied' : 'failed');
  };

  const onCopy = async () => {
    captureShare('referral', source, 'copy');
    const ok = await copyText(link);
    setStatus(ok ? 'copied' : 'failed');
    if (!ok) {
      // The field renders on the next paint; select it then.
      requestAnimationFrame(() => {
        field.current?.focus();
        field.current?.select();
      });
    }
  };

  return (
    <section className="ss-panel ss-share-moment" aria-labelledby={headingId}>
      <h2 id={headingId} className="ss-share-moment__title">{t('referral.moment.title')}</h2>
      <p className="ss-share-moment__body">{t('referral.moment.body', { n: data.coins })}</p>
      <div className="ss-share-moment__actions">
        {canWebShare() && <Button variant="primary" label={t('referral.moment.share')} onClick={() => void onShare()} />}
        <Button variant={canWebShare() ? 'secondary' : 'primary'} label={t('referral.moment.copy')} onClick={() => void onCopy()} />
      </div>
      {status === 'failed' && (
        <input
          ref={field}
          className="ss-input ss-share-moment__link"
          type="text"
          readOnly
          value={link}
          aria-label={t('rewards.invite.linkLabel')}
          aria-describedby={statusId}
          onFocus={(event) => event.currentTarget.select()}
        />
      )}
      <p id={statusId} className="ss-share-moment__status" role="status" aria-live="polite">
        {status === 'copied' ? t('rewards.invite.copied') : status === 'shared' ? t('referral.moment.shared') : status === 'failed' ? t('rewards.invite.copyFailed') : ''}
      </p>
    </section>
  );
}
