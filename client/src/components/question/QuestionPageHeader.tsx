import type { ReactNode, Ref } from 'react';
import { SwimmingFin } from '../SharkFin';

export interface QuestionPageHeaderProps {
  /** Short context above the h1; the line is drawn even when empty, so the h1 sits at one y. */
  kicker?: string;
  title: string;
  /** One line under the h1. */
  lead?: ReactNode;
  titleRef?: Ref<HTMLHeadingElement>;
}

/**
 * The editorial header of a question area's setup or info screen (UX audit
 * U2, questions-19): Quiz setup, Challenge setup, Daily, Today, Shark Cards.
 * It is the `Page` header (`.ss-info-page__header` in app-shell.css), so these
 * screens share the h1 size and position of every other Page.
 */
export function QuestionPageHeader({ kicker, title, lead, titleRef }: QuestionPageHeaderProps) {
  return (
    <header className="ss-info-page__header">
      <SwimmingFin size={26} />
      <span className="ss-info-page__kicker" aria-hidden={kicker ? undefined : true}>{kicker}</span>
      <h1 ref={titleRef} tabIndex={titleRef ? -1 : undefined}>{title}</h1>
      {lead != null && <p>{lead}</p>}
    </header>
  );
}
