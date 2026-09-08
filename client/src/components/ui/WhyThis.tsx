// "Why this question?" — one disclosure beside a question or coding task,
// saying what it is for and what is known about its review.
//
// Placed beside the block for the same reason the terms bar is: a control
// inside an answer option would be a nested interactive control, and pressing
// it would select the answer. It carries the same information whichever option
// is correct, so it cannot coach one of them.
//
// It is optional to open, and it opens closed. A learner who wants to answer
// the question is not made to read about how it was chosen first.

import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage, useT } from '../../i18n/LanguageContext';
import { itemClaimText, type PublicItemReview, type WhyThisItem } from '../../lib/curation';

export function WhyThis({
  item,
  review,
  onReport,
  className,
}: {
  item: WhyThisItem;
  /** The server's record for the exact version on screen. Absent means the
   * note simply carries no review line. */
  review?: PublicItemReview;
  /** Opens the existing report dialog for this item. Omitted where reporting
   * is not wired up, in which case no report action is offered. */
  onReport?: () => void;
  className?: string;
}) {
  const t = useT();
  const { lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      setOpen(false);
      buttonRef.current?.focus();
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  const claim = itemClaimText(review, lang);
  const rows: Array<[string, string]> = [];
  if (item.objective) rows.push([t('why.objective'), item.objective]);
  if (item.topic) rows.push([t('why.topic'), item.topic]);
  if (item.path) rows.push([t('why.path'), item.path]);
  if (item.competencies.length > 0) rows.push([t('why.practises'), item.competencies.join(' · ')]);

  // Nothing derived and nothing recorded: no note, rather than an empty one.
  if (rows.length === 0 && !claim && !item.outsidePlan) return null;

  return (
    <div className={`ss-why${className ? ` ${className}` : ''}`}>
      <button
        ref={buttonRef}
        type="button"
        className="ss-why__button"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((current) => !current)}
      >
        {t('why.label')}
      </button>
      {open && (
        <div ref={panelRef} id={id} role="note" className="ss-why__panel">
          {rows.length > 0 && (
            <dl className="ss-why__rows">
              {rows.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          )}
          {item.outsidePlan && <p className="ss-why__note">{t('why.outsidePlan')}</p>}
          {claim && <p className="ss-why__review">{claim}</p>}
          {review && (
            <p className="ss-why__version">
              {t('why.version', { version: review.version })}
            </p>
          )}
          <div className="ss-why__actions">
            <Link className="ss-why__link" to="/curation">
              {t('why.howWeCurate')}
            </Link>
            {onReport && (
              <button
                type="button"
                className="ss-why__link"
                onClick={() => {
                  setOpen(false);
                  onReport();
                }}
              >
                {t('why.report')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
