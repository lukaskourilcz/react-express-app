import { useEffect, useRef } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { SharkFin, SwimmingFin } from './SharkFin';
import { CloseIcon } from './ui/icons';
import { useT } from '../i18n/LanguageContext';
import type { HintResponse } from '../lib/sharkira';
import './Sharkira.css';

// Sharkira — the optional Socratic hint coach. This component is purely
// presentational: the quiz owns the request, the AbortController and the
// per-question reset, and hands the result down here. Sharkira only renders
// what the server returned; it never derives or reveals an answer.
//
//   idle     → a calm "Ask Sharkira" trigger
//   thinking → the panel with a gently swimming fin
//   result   → the panel showing the guiding question + nudge, the disabled
//              note, or an offline/error message with a retry

export type SharkiraStatus = 'idle' | 'thinking' | 'result';

interface SharkiraProps {
  status: SharkiraStatus;
  response: HintResponse | null;
  /** Ask for the first time (trigger). */
  onAsk: () => void;
  /** Ask again after an offline/error result. */
  onRetry: () => void;
  /** Dismiss the panel (also used by Escape). */
  onClose: () => void;
}

/** Sharkira's mark: a dorsal fin surfacing in a tinted pool. The fin base rides
 * the tile's bottom edge per the fin-baseline rule (sink by fin size × 0.25). */
function SharkiraMark({ size = 34 }: { size?: number }) {
  const fin = Math.round(size * 0.7);
  return (
    <span className="sharkira-mark" aria-hidden style={{ width: size, height: size }}>
      <span className="sharkira-mark__fin" style={{ bottom: -(fin * 0.25) }}>
        <SharkFin size={fin} color="var(--brand-accent)" />
      </span>
    </span>
  );
}

export default function Sharkira({ status, response, onAsk, onRetry, onClose }: SharkiraProps) {
  const t = useT();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const prevStatus = useRef<SharkiraStatus>('idle');
  // Only pull focus back to the trigger when the learner dismissed Sharkira —
  // not when a question change silently resets it (that would steal focus from
  // the nav buttons).
  const returnFocus = useRef(false);

  useEffect(() => {
    const was = prevStatus.current;
    if (status !== 'idle' && was === 'idle') {
      panelRef.current?.focus();
    } else if (status === 'idle' && was !== 'idle' && returnFocus.current) {
      triggerRef.current?.focus();
    }
    if (status === 'idle') returnFocus.current = false;
    prevStatus.current = status;
  }, [status]);

  const handleClose = () => {
    returnFocus.current = true;
    onClose();
  };

  if (status === 'idle') {
    return (
      <button
        ref={triggerRef}
        type="button"
        className="sharkira-trigger"
        onClick={onAsk}
        aria-label={t('sharkira.askHintAria')}
      >
        <SharkiraMark size={26} />
        <span>{t('sharkira.askHint')}</span>
      </button>
    );
  }

  return (
    <div
      ref={panelRef}
      className="sharkira-panel"
      role="group"
      aria-label={t('sharkira.name')}
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          handleClose();
        }
      }}
    >
      <div className="sharkira-panel__head">
        <SharkiraMark size={34} />
        <span className="sharkira-panel__id">
          <span className="sharkira-panel__name">{t('sharkira.name')}</span>
          <span className="sharkira-panel__tag">{t('sharkira.tagline')}</span>
        </span>
        <button
          type="button"
          className="sharkira-icon-btn"
          onClick={handleClose}
          aria-label={t('sharkira.close')}
        >
          <CloseIcon size={18} />
        </button>
      </div>

      {/* Politely announced so a hint arriving mid-read isn't missed. */}
      <div className="sharkira-panel__body" aria-live="polite">
        {status === 'thinking' ? (
          <p className="sharkira-thinking">
            <SwimmingFin size={18} />
            <span>{t('sharkira.thinking')}</span>
          </p>
        ) : response ? (
          <SharkiraResult response={response} onRetry={onRetry} />
        ) : null}
      </div>
    </div>
  );
}

function SharkiraResult({ response, onRetry }: { response: HintResponse; onRetry: () => void }) {
  const t = useT();

  // Scope forbids hints here (placement / daily / challenge). The quiz already
  // hides the affordance for those, so this is a defensive fallback.
  if (response.disabled) {
    return (
      <div className="sharkira-note">
        <p className="sharkira-note__title">{t('sharkira.hidden')}</p>
        <p className="sharkira-note__body">{t('sharkira.hiddenHint')}</p>
      </div>
    );
  }

  // A usable guiding question. Curated (AI-off) responses are the normal path,
  // not an error — they just carry a small note.
  if (response.available && response.hint) {
    return (
      <>
        <div className="sharkira-block">
          <span className="sharkira-label">{t('sharkira.hintLabel')}</span>
          <p className="sharkira-hint">{response.hint}</p>
        </div>
        {response.nudge ? (
          <div className="sharkira-block">
            <span className="sharkira-label">{t('sharkira.nudgeLabel')}</span>
            <p className="sharkira-nudge">{response.nudge}</p>
          </div>
        ) : null}
        {response.source === 'curated' ? (
          <p className="sharkira-curated">{t('sharkira.curatedNote')}</p>
        ) : null}
        <p className="sharkira-principle">{t('sharkira.principle')}</p>
      </>
    );
  }

  // Offline / transient failure / genuinely unavailable — always offer a retry.
  const message =
    response.error === 'offline'
      ? t('sharkira.offline')
      : response.error === 'unavailable'
        ? t('sharkira.error')
        : t('sharkira.unavailable');
  return (
    <div className="sharkira-note">
      <p className="sharkira-note__body">{message}</p>
      <Button variant="secondary" size="sm" label={t('sharkira.retry')} onClick={onRetry} />
    </div>
  );
}
