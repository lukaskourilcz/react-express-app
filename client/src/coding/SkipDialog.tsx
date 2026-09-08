// Why the learner is moving on, and what to do instead (issue #160).
//
// A skip is feedback. It never awards XP, never counts as completion and never
// unlocks anything — the panel says so out loud, because a learner should not
// have to guess whether skipping cost them something. A task a Learn level
// requires stays required, and the answer explains that it will come back.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { useSkipTask } from '../lib/practice';
import { MAX_SKIP_NOTE, SKIP_REASONS, type SkipReason } from '../../../shared/coding-skip';
import type { TranslationKey } from '../i18n/translations';
import './Coding.css';

export function SkipPanel({ taskId, sessionId, onSkipped }: {
  taskId: string;
  sessionId?: string;
  onSkipped?: (nextTaskId: string | null) => void;
}) {
  const { t } = useLanguage();
  const skip = useSkipTask();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<SkipReason | null>(null);
  const [note, setNote] = useState('');

  const result = skip.data;

  if (!open) {
    return (
      <div className="cd-actions">
        <button type="button" className="cd-btn cd-btn--quiet" onClick={() => setOpen(true)}>{t('coding.skip.open')}</button>
      </div>
    );
  }

  return (
    <section className="cd-note cd-skip" aria-label={t('coding.skip.title')}>
      <h4 style={{ margin: '0 0 4px' }}>{t('coding.skip.title')}</h4>
      <p className="cd-shortcuts" style={{ margin: '0 0 8px' }}>{t('coding.skip.awardsNothing')}</p>

      {/* Toggle buttons rather than radio semantics: a role="radiogroup" owes a
          reader a roving tab stop, and these read better as one-of-five
          pressed states than as a form control. */}
      <div className="cd-chips" role="group" aria-label={t('coding.skip.title')}>
        {SKIP_REASONS.map((one) => (
          <button
            key={one}
            type="button"
            aria-pressed={reason === one}
            className="cd-chip"
            onClick={() => setReason(reason === one ? null : one)}
          >
            {t(`coding.skip.reason.${one}` as TranslationKey)}
          </button>
        ))}
      </div>

      <label className="cd-editor-label" htmlFor={`skip-note-${taskId}`}>{t('coding.skip.noteLabel')}</label>
      <textarea
        id={`skip-note-${taskId}`}
        className="cd-input"
        rows={2}
        maxLength={MAX_SKIP_NOTE}
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />

      <div className="cd-actions">
        <button
          type="button"
          className="cd-btn cd-btn--primary"
          disabled={!reason || skip.isPending}
          onClick={() => {
            if (!reason) return;
            skip.mutate(
              { taskId, reason, ...(note.trim() ? { note: note.trim() } : {}), ...(sessionId ? { sessionId } : {}) },
              { onSuccess: (value) => onSkipped?.(value.next?.taskId ?? null) },
            );
          }}
        >
          {t('coding.skip.confirm')}
        </button>
        <button type="button" className="cd-btn" onClick={() => setOpen(false)}>{t('common.cancel')}</button>
      </div>

      {skip.isError && <p className="cd-note cd-note--error" role="alert">{t('coding.library.error')}</p>}

      {result && (
        <div role="status">
          <p className="cd-verdict__row">{t('coding.skip.recorded')}</p>
          {result.required && <p className="cd-verdict__row">{t('coding.skip.required')}</p>}
          {result.remedial && (
            <p className="cd-verdict__row">
              <Link className="cd-link" to={`/learn?topic=${encodeURIComponent(result.remedial.topic)}&level=${result.remedial.level}`}>
                {t('coding.skip.remedial')}
              </Link>
            </p>
          )}
          {result.next && (
            <p className="cd-verdict__row">
              <Link className="cd-link" to={`/coding/${result.next.track}/${result.next.taskId}`}>{t('coding.skip.next')}</Link>
            </p>
          )}
          {!result.next && <p className="cd-verdict__row">{t('coding.skip.noNext')}</p>}
        </div>
      )}
    </section>
  );
}
