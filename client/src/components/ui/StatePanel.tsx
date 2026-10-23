// The one panel for a page state that has nothing else to show: a sign-in
// gate, an empty shelf, a callback's progress or failure (UX audit
// social-account-16 and -21). It sits centred in the 640px task column,
// carries one heading (h1 when it is the page, h2 under a page header), one
// body line and its actions, the first of which is the one primary.
import type { ReactNode } from 'react';
import { Heading } from '@astryxdesign/core/Heading';
import { Kicker } from '../landing/LandingKit';
import { IconTile } from './icons';
import './StatePanel.css';

export function StatePanel({ level, title, body, icon, kicker, live = false, children }: {
  /** 1 when the panel is the page, 2 when it sits under a page header. */
  level: 1 | 2;
  title: string;
  body: string;
  /** Optional glyph, drawn in the accent tile. */
  icon?: ReactNode;
  /** Optional context line above the heading, drawn with <Kicker>. */
  kicker?: string;
  /** The body is a polite status region, for a state that changes in place. */
  live?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="ss-state-panel ss-raised ss-pop">
      {kicker && <Kicker center>{kicker}</Kicker>}
      {icon && <IconTile size={48}>{icon}</IconTile>}
      <Heading level={level} justify="center">{title}</Heading>
      <p className="ss-state-panel__body" role={live ? 'status' : undefined} aria-live={live ? 'polite' : undefined}>{body}</p>
      {children && <div className="ss-state-panel__actions">{children}</div>}
    </div>
  );
}

export default StatePanel;
