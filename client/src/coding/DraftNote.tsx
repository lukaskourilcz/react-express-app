// What a task screen says when the copy on this device and the account draft
// differed (coding/drafts.ts), and the way back to a copy that was set aside.
// The task screen and a Learn level's coding step share it.
import { useEffect, useRef, useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { useLanguage } from '../i18n/LanguageContext';
import { keepDeviceDraft, type OpeningDraft } from './drafts';

/** The code the editor opens with, and the learner's choice to take back the
 * copy from this device instead. A restored copy is kept here as building on
 * the account draft now open, so the next visit opens it too. The choice
 * lasts while this task is open, through a refetch of its draft, and starts
 * over on another task. The editor reads its code once, so the caller keys it
 * by `restored`. */
export function useDraftChoice(id: string | null, opening: OpeningDraft | null, accountAt: string | null | undefined) {
  const [taken, setTaken] = useState<{ id: string | null; code: string | null }>({ id, code: null });
  if (taken.id !== id) setTaken({ id, code: null });
  const restored = taken.id === id && taken.code !== null;
  const restore = () => {
    if (!id || opening?.setAside === undefined) return;
    keepDeviceDraft(id, opening.setAside, accountAt ?? null);
    setTaken({ id, code: opening.setAside });
  };
  return { code: restored ? taken.code : opening?.code ?? null, restored, restore };
}

export function DraftNote({ opening, restored, onRestore }: { opening: OpeningDraft | null; restored: boolean; onRestore: () => void }) {
  const { t } = useLanguage();
  const note = useRef<HTMLParagraphElement | null>(null);
  // The button that asked is gone once the copy is back, so focus goes to
  // the line that says so.
  useEffect(() => { if (restored) note.current?.focus(); }, [restored]);
  if (restored) return <p className="cd-note" role="status" tabIndex={-1} ref={note}>{t('coding.draft.deviceRestored')}</p>;
  if (opening?.conflict === 'device') return <p className="cd-note" role="status">{t('coding.draft.deviceNewer')}</p>;
  if (opening?.conflict !== 'account') return null;
  return (
    <p className="cd-note" role="status">
      {t('coding.draft.accountNewer')} <Button variant="secondary" onClick={onRestore} label={t('coding.draft.restore')} />
    </p>
  );
}
