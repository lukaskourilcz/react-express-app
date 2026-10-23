// The operational page header (UX audit social-account-11): an optional
// <Kicker>, the route's one h1 in ink at display-3, and one lead line, on the
// column's left edge. /collection, /cards and /leaderboard share it, so their
// titles are one size, one weight and one gap. A public page keeps the
// editorial `Page` header (PublicInfoPages.tsx) instead.
import type { ReactNode } from 'react';
import { Heading } from '@astryxdesign/core/Heading';
import { Kicker } from '../landing/LandingKit';
import './PageHeader.css';

export function PageHeader({ kicker, title, lead, children }: {
  /** Optional context above the title; leave it out when tabs or the title
   * already say it. */
  kicker?: string;
  title: string;
  /** One line that says what the page shows (the scope sentence). */
  lead?: ReactNode;
  /** A status line that belongs to the header, under the lead. */
  children?: ReactNode;
}) {
  return (
    <header className="ss-page-header">
      {kicker && <Kicker>{kicker}</Kicker>}
      <Heading level={1} type="display-3">{title}</Heading>
      {lead && <p className="ss-page-header__lead">{lead}</p>}
      {children}
    </header>
  );
}

export default PageHeader;
