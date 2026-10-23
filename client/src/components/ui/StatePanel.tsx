// The one component for a state with nothing else to show (UX audit
// social-account-16 and -21, money-05). Two looks, one rule:
//
// - The panel (default) stands in for the whole screen or the whole section
//   under a page header: a sign-in gate, an empty shelf, a callback's progress
//   or failure. It sits centred in the 640px task column, carries one heading
//   (h1 when it is the page, h2 under a page header), one body line and its
//   actions, the first of which is the one primary.
// - `inline` stands in for one part of a screen that otherwise draws (the
//   /shop wallet and invite link, the checkout's payment step): one sentence
//   and its action on the surface it replaces, with no heading and no card,
//   so the layout around it does not move after sign-in.
//
// `signIn` draws the one "Sign in" action first in either look: it opens the
// sign-in dialog, coming back to this page or to `returnTo`. A second inline
// block on a screen passes `emphasis: 'secondary'`, so the screen keeps one
// filled primary.
import type { ReactNode } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { useT } from '../../i18n/LanguageContext';
import { openSignIn } from '../../lib/signInDialog';
import { Kicker } from '../landing/LandingKit';
import { IconTile } from './icons';
import './StatePanel.css';

export interface StatePanelSignIn {
  /** The button's words; "Sign in" unless the step needs its own verb
   * ("Sign in to continue"). */
  label?: string;
  /** A path on this site to land on after signing in; without it the
   * visitor comes back to this page. */
  returnTo?: string;
  emphasis?: 'primary' | 'secondary';
}

interface CommonProps {
  /** The one body line: what the state is, or what signing in shows here. */
  body: string;
  /** The body is a polite status region, for a state that changes in place. */
  live?: boolean;
  /** Draw the one "Sign in" action first in the action row. */
  signIn?: boolean | StatePanelSignIn;
  className?: string;
  /** Further actions, after the sign-in one. */
  children?: ReactNode;
}

export type StatePanelProps = CommonProps & (
  | {
    inline?: false;
    /** 1 when the panel is the page, 2 when it sits under a page header. */
    level: 1 | 2;
    title: string;
    /** Optional glyph, drawn in the accent tile. */
    icon?: ReactNode;
    /** Optional context line above the heading, drawn with <Kicker>. */
    kicker?: string;
  }
  | { inline: true; level?: never; title?: never; icon?: never; kicker?: never }
);

function SignInAction({ label, returnTo, emphasis = 'primary' }: StatePanelSignIn) {
  const t = useT();
  return (
    <Button
      variant={emphasis}
      label={label ?? t('auth.logIn')}
      aria-haspopup="dialog"
      onClick={() => openSignIn(returnTo ? { returnTo } : {})}
    />
  );
}

export function StatePanel(props: StatePanelProps) {
  const { body, live = false, signIn, className, children } = props;
  const signInProps = signIn === true ? {} : signIn || null;
  const actions = (signInProps || children) && (
    <div className="ss-state-panel__actions">
      {signInProps && <SignInAction {...signInProps} />}
      {children}
    </div>
  );
  const bodyLine = (
    <p className="ss-state-panel__body" role={live ? 'status' : undefined} aria-live={live ? 'polite' : undefined}>{body}</p>
  );
  const root = props.inline ? 'ss-state-panel ss-state-panel--inline' : 'ss-state-panel ss-raised ss-pop';
  return (
    <div className={className ? `${root} ${className}` : root}>
      {!props.inline && props.kicker && <Kicker center>{props.kicker}</Kicker>}
      {!props.inline && props.icon && <IconTile size={48}>{props.icon}</IconTile>}
      {!props.inline && <Heading level={props.level} justify="center">{props.title}</Heading>}
      {bodyLine}
      {actions}
    </div>
  );
}

export default StatePanel;
