import { forwardRef, useEffect, useImperativeHandle, useRef, type ReactNode } from 'react';
import { Banner } from '@astryxdesign/core/Banner';
import './question.css';

export interface QuestionFeedbackProps {
  /** success: right; error: wrong; info: neither (time ran out, practice). */
  status: 'success' | 'error' | 'info';
  /** The verdict in words: "Correct" / "Not quite". */
  title: string;
  /** The explanation, under the verdict. */
  description?: ReactNode;
  /** Below the verdict, still in the feedback: Save as Shark Card, a source link. */
  children?: ReactNode;
  /**
   * true (default): focus moves to the verdict when it appears, so a screen
   * reader reads it and the next Tab continues from it. false when the
   * runner moves focus to its Continue instead (QuestionActions focusPrimary).
   */
  autoFocus?: boolean;
}

/**
 * The graded verdict (UX audit U2, questions-01): an Astryx Banner in normal
 * flow directly under the answer list, inside the panel, never positioned over
 * the answers it explains. Content is only added below the answers, so they do
 * not move. The ref is the feedback block.
 */
export const QuestionFeedback = forwardRef<HTMLDivElement, QuestionFeedbackProps>(function QuestionFeedback(
  { status, title, description, children, autoFocus = true },
  ref,
) {
  const local = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => local.current as HTMLDivElement);
  useEffect(() => {
    if (autoFocus) local.current?.focus();
    // Once, when the verdict appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="ss-question-feedback" ref={local} tabIndex={-1}>
      <Banner status={status} title={title} description={description} />
      {children}
    </div>
  );
});
