import { useEffect, useRef, type ReactNode } from 'react';
import { SwimCta } from '../landing/LandingKit';
import './question.css';

export interface QuestionPrimaryAction {
  label: string;
  onClick: () => void;
  /** Native disabled: busy, or nothing to act on. */
  disabled?: boolean;
  /** aria-disabled: stays focusable and pressable, and says why through describedBy. */
  unavailable?: boolean;
  describedBy?: string;
}

export interface QuestionActionsProps {
  /** The one filled primary on the screen, drawn as SwimCta md (44px) on the right. */
  primary?: QuestionPrimaryAction;
  /**
   * Secondary actions on the left (Previous, Exit, Share, Review answers):
   * Astryx `variant="secondary"` or `"ghost"` buttons at the default 44px.
   */
  secondary?: ReactNode;
  /**
   * When this turns true, focus moves to the primary: after grading, so the
   * next Tab or Enter continues (the Learn runner's Continue).
   */
  focusPrimary?: boolean;
  /** Accessible name of the row, when a screen has more than one group of actions. */
  label?: string;
  className?: string;
}

/**
 * The one action row (UX audit U2, questions-05 and questions-18). 44px
 * controls: secondaries on the left, the one primary on the right. Under
 * 560px the primary is the last row at full width, in the thumb zone, and the
 * secondaries share a two-column row above it.
 */
export function QuestionActions({ primary, secondary, focusPrimary, label, className }: QuestionActionsProps) {
  const primaryRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focusPrimary) primaryRef.current?.querySelector('button')?.focus();
  }, [focusPrimary]);
  return (
    <div
      className={className ? `ss-question-actions ${className}` : 'ss-question-actions'}
      role={label ? 'group' : undefined}
      aria-label={label}
    >
      <div className="ss-question-actions__secondary">{secondary}</div>
      {primary && (
        <div className="ss-question-actions__primary" ref={primaryRef}>
          <SwimCta
            label={primary.label}
            onClick={primary.onClick}
            disabled={primary.disabled}
            unavailable={primary.unavailable}
            describedBy={primary.describedBy}
            size="md"
            dir={1}
          />
        </div>
      )}
    </div>
  );
}
