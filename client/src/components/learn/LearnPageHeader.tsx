// The Learn area's page header (UX audit learn-15): the Learn title style (the
// green 800-weight <Kicker as="h1"> with its wave, as on /learn) on the shared
// PageHeader's frame (.ss-page-header: column's left edge, 8px apart, one lead
// at most 68ch). /roadmap, /big-o and /learn/big-o use it, so the Learn area
// opens with one header instead of four. `context` is an optional link above
// the h1 that names where the page belongs, as the FDE module page's kicker
// does ("Big O guide" over "Big O introduction").
import type { ReactNode } from 'react';
import { Kicker } from '../landing/LandingKit';
import '../ui/PageHeader.css';
import './LearnPageHeader.css';

export function LearnPageHeader({ title, lead, context, children }: {
  title: string;
  /** The one supporting line under the title. */
  lead?: ReactNode;
  /** A short link above the title, to the page this one belongs to. */
  context?: ReactNode;
  /** A status line that belongs to the header, under the lead. */
  children?: ReactNode;
}) {
  return (
    <header className="ss-page-header learn-page-header">
      {context && <p className="learn-page-header__context">{context}</p>}
      <Kicker as="h1" className="ss-section-title">{title}</Kicker>
      {lead && <p className="ss-page-header__lead">{lead}</p>}
      {children}
    </header>
  );
}

export default LearnPageHeader;
