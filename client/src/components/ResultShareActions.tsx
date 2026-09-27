// "Share" and "Download card" under a Biggest Shark Challenge run and a typing
// race (#239). The card is drawn in the browser (lib/shareCard.ts) from the
// numbers on screen and the date: never a name, an e-mail, a room code or a
// question (docs/growth-metrics.md). Share opens the platform's sheet with the
// card attached where it accepts files, and copies the text otherwise.
import { useId, useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { useLanguage } from '../i18n/LanguageContext';
import { CURRENT_PRODUCT } from '../lib/products';
import { createShareCardFile, downloadShareFile } from '../lib/shareCard';
import { canWebShare, captureShare, shareLink, type ShareKind, type ShareSource } from '../lib/share';
import './ShareMoments.css';

export interface ResultShareActionsProps {
  kind: Extract<ShareKind, 'challenge_result' | 'typing_result'>;
  /** What was played, as the card's label. */
  label: string;
  /** The result, as the card's headline. */
  headline: string;
  /** One line under the headline. */
  detail: string;
  /** The text a share carries beside the link. */
  text: string;
  /** Where the link in a share points: the screen that was played. */
  path: string;
  /** Centre the buttons, for a centred result card. */
  centered?: boolean;
}

type Status = 'idle' | 'working' | 'shared' | 'copied' | 'saved' | 'failed';

const SOURCE: Record<ResultShareActionsProps['kind'], ShareSource> = { challenge_result: 'challenge', typing_result: 'typing' };

export default function ResultShareActions({ kind, label, headline, detail, text, path, centered = false }: ResultShareActionsProps) {
  const { t, lang } = useLanguage();
  const [status, setStatus] = useState<Status>('idle');
  const statusId = useId();

  const card = () => {
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--brand-accent').trim();
    return createShareCardFile({
      brand: CURRENT_PRODUCT.brand,
      label,
      headline,
      detail,
      date: new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : lang, { dateStyle: 'long' }).format(new Date()),
      accent,
      fileSuffix: kind === 'challenge_result' ? 'challenge' : 'typing',
    });
  };

  const onShare = async () => {
    setStatus('working');
    captureShare(kind, SOURCE[kind], 'share');
    try {
      const outcome = await shareLink({ title: CURRENT_PRODUCT.brand, text, url: `${window.location.origin}${path}`, file: await card() });
      setStatus(outcome === 'cancelled' ? 'idle' : outcome);
    } catch {
      setStatus('failed');
    }
  };

  const onDownload = async () => {
    setStatus('working');
    captureShare(kind, SOURCE[kind], 'download');
    try {
      const file = await card();
      if (!file) throw new Error('no_canvas');
      downloadShareFile(file);
      setStatus('saved');
    } catch {
      setStatus('failed');
    }
  };

  const message = {
    idle: '',
    working: '',
    shared: t('share.result.shared'),
    copied: t('share.result.copied'),
    saved: t('share.result.saved'),
    failed: t('share.result.failed'),
  }[status];

  return (
    <div className={`ss-share-result${centered ? ' ss-share-result--center' : ''}`} role="group" aria-label={t('share.result.group')} aria-describedby={statusId}>
      <div className="ss-share-moment__actions">
        {canWebShare() && (
          <Button variant="secondary" label={t('share.result.share')} onClick={() => void onShare()} isDisabled={status === 'working'} />
        )}
        <Button
          variant="secondary"
          label={t('share.result.download')}
          onClick={() => void onDownload()}
          isDisabled={status === 'working'}
          isLoading={status === 'working'}
        />
      </div>
      <p id={statusId} className="ss-share-moment__status" role="status" aria-live="polite">{message}</p>
    </div>
  );
}
