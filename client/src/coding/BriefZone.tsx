// The brief at the top of a coding frame (UX audit coding-01). Its body is
// capped at about five lines, so the editor under it and the action bar at the
// pane's foot sit at the same place on every task, however long the prompt.
// A longer body scrolls inside the cap (a focusable region named by the task's
// title, with a fade at the bottom edge), and one text toggle lifts the cap.
// The coding workbench and a path's code activity both open with it, so a
// task looks the same wherever it opens.
import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { useT } from '../i18n/LanguageContext';
import './Coding.css';

export interface BriefZoneProps {
  /** The id of the task's heading, which names the scrolling body. */
  labelledBy: string;
  /** The heading block: shown in full above the capped body. */
  head?: ReactNode;
  /** The prompt and what belongs with it: the part that is capped. */
  children: ReactNode;
  /** Shown under the body and never capped (a lock note, for one). */
  after?: ReactNode;
}

export function BriefZone({ labelledBy, head, children, after }: BriefZoneProps) {
  const t = useT();
  const bodyId = useId();
  const body = useRef<HTMLDivElement | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  // Measured, not guessed: a short brief gets no toggle and no fade, and a
  // brief that grows (a glossary term opened, earlier stages unfolded) gets
  // them as soon as it no longer fits.
  useLayoutEffect(() => {
    const node = body.current;
    if (!node || expanded) return;
    const measure = () => setOverflows(node.scrollHeight > node.clientHeight + 1);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    Array.from(node.children).forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, [expanded, children]);

  const capped = !expanded;
  const scrolls = capped && overflows;
  const toggle = () => {
    if (expanded && body.current) body.current.scrollTop = 0;
    setExpanded(!expanded);
  };

  return (
    <div className="cd-brief">
      {head}
      <div
        id={bodyId}
        ref={body}
        className="cd-brief__body"
        data-capped={capped}
        data-fade={scrolls || undefined}
        // Only a body that scrolls is a stop for the keyboard: it is the one
        // way to scroll it without a pointer.
        role={scrolls ? 'region' : undefined}
        aria-labelledby={scrolls ? labelledBy : undefined}
        tabIndex={scrolls ? 0 : undefined}
      >
        {children}
      </div>
      {(scrolls || expanded) && (
        <Button
          className="cd-brief__toggle"
          variant="ghost"
          aria-expanded={expanded}
          aria-controls={bodyId}
          onClick={toggle}
          label={expanded ? t('coding.brief.showLess') : t('coding.brief.showFull')}
        />
      )}
      {after}
    </div>
  );
}
