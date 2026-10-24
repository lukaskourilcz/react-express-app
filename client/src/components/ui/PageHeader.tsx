// The one operational page header (UX audit social-account-11, questions-19):
// an optional <Kicker>, the route's one h1 in ink at display-3, and one lead
// line, on the column's left edge. /collection, /cards, /leaderboard, /play,
// the Quiz and Challenge setups and /today share it, so their titles are one
// size, one weight and one gap. A public page keeps the editorial `Page`
// header (PublicInfoPages.tsx) instead, and so does /daily, whose header the
// build also renders into the static HTML (DailyStaticArticle.tsx).
import type { ReactNode, Ref } from 'react';
import { Heading } from '@astryxdesign/core/Heading';
import { Kicker } from '../landing/LandingKit';
import './PageHeader.css';

export interface PageHeaderProps {
  /** Optional context above the title; leave it out when tabs or the title
   * already say it. */
  kicker?: string;
  title: string;
  /** One line that says what the page shows (the scope sentence). */
  lead?: ReactNode;
  /** Makes the h1 a focus target (tabIndex -1) for a screen that moves the
   * focus back to its title, as the Challenge setup does after a run. */
  titleRef?: Ref<HTMLHeadingElement>;
  /** A short status on the h1's own row, at its end (/today's count). Pass
   * it (null while there is nothing to say) for as long as the screen shows
   * the header: the row is drawn whenever the prop is given, so the h1 is
   * not remounted when the status arrives. */
  aside?: ReactNode;
  /** A status line that belongs to the header, under the lead. */
  children?: ReactNode;
}

export function PageHeader({ kicker, title, lead, titleRef, aside, children }: PageHeaderProps) {
  const heading = (
    <Heading level={1} type="display-3" ref={titleRef} tabIndex={titleRef ? -1 : undefined}>{title}</Heading>
  );
  return (
    <header className="ss-page-header">
      {kicker && <Kicker>{kicker}</Kicker>}
      {aside !== undefined ? <div className="ss-page-header__row">{heading}{aside}</div> : heading}
      {lead && <p className="ss-page-header__lead">{lead}</p>}
      {children}
    </header>
  );
}

export default PageHeader;
