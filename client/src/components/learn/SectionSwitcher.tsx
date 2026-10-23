// The Learn page's section switcher and the line under it.
//
// The switcher is the Astryx SegmentedControl. Its checked item is always the
// open section: arrow keys, Home and End move focus only (the control's own
// selection on focus is ignored), and Enter, Space or a click open the focused
// section through the item's onClick. The hint that says so is each item's
// description, which screen readers read with the item.

import { useEffect, useRef, type FocusEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { Button } from '@astryxdesign/core/Button';
import { Banner } from '@astryxdesign/core/Banner';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { learnText, type LearnKey } from '../../i18n/translations.learn';
import type { LearnSectionId } from '../../../../shared/learn-sections';

export interface SwitcherItem {
  id: LearnSectionId;
  name: string;
  percent: number | null;
}

/** Profile's plan card (LearningPathsCard), which scrolls to and focuses
 * itself when the address names it. */
export const CHOOSE_PLAN_HREF = '/profile#learning-plan';

// Focus moves without selecting; the open section changes on activation.
const browseOnly = () => {};
// The focus ring is 2px wide at a 2px offset; keep it and a little air inside
// the scroller.
const RING_SPACE = 6;

/** Scroll `scroller` the least needed to show `item` with its focus ring. */
function keepInView(scroller: HTMLElement, item: Element) {
  if (scroller.scrollWidth <= scroller.clientWidth) return;
  const box = scroller.getBoundingClientRect();
  const { left, right } = item.getBoundingClientRect();
  if (left - RING_SPACE < box.left) scroller.scrollLeft -= box.left - left + RING_SPACE;
  else if (right + RING_SPACE > box.right) scroller.scrollLeft += right + RING_SPACE - box.right;
}

export function SectionSwitcher({ value, items, onActivate }: {
  value: LearnSectionId;
  items: readonly SwitcherItem[];
  onActivate: (id: LearnSectionId) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Keep the open section in view inside a narrow scroller, centred so its
  // neighbours show at the edges. Only the scroller moves: scrollIntoView
  // could also scroll the page.
  // The open section can change after focus has already moved on (the address
  // updates first), so a focused item is kept in view after the centring.
  useEffect(() => {
    const scroller = scrollerRef.current;
    const item = scroller?.querySelector<HTMLElement>(`[role="radio"][data-value="${value}"]`);
    if (!scroller || !item || scroller.scrollWidth <= scroller.clientWidth) return;
    const left = item.getBoundingClientRect().left - scroller.getBoundingClientRect().left + scroller.scrollLeft;
    scroller.scrollLeft = left - (scroller.clientWidth - item.offsetWidth) / 2;
    const focused = document.activeElement?.closest('[role="radio"]');
    if (focused && scroller.contains(focused)) keepInView(scroller, focused);
  }, [value]);

  // Browsing with the arrow keys moves focus to an item the scroller may cut
  // off. Bring the whole item, focus ring included, into view.
  const onFocus = (event: FocusEvent<HTMLDivElement>) => {
    const item = (event.target as HTMLElement).closest('[role="radio"]');
    if (item) keepInView(event.currentTarget, item);
  };

  return (
    <div className="rm-section-switcher">
      <div className="rm-section-switcher__scroll" ref={scrollerRef} onFocus={onFocus}>
        <SegmentedControl
          value={value}
          onChange={browseOnly}
          label={learnText('learn.switcher.label')}
          size="lg"
        >
          {items.map(({ id, name, percent }) => (
            <SegmentedControlItem
              key={id}
              value={id}
              label={percent === null ? name : learnText('learn.switcher.item', { name, percent })}
              aria-describedby="learn-switcher-hint"
              onClick={() => {
                if (id !== value) onActivate(id);
              }}
            />
          ))}
        </SegmentedControl>
      </div>
      <p id="learn-switcher-hint" className="ss-sr-only">{learnText('learn.switcher.hint')}</p>
    </div>
  );
}

export type JoinState = { status: 'saving' | 'saved' | 'error'; step?: 'save' | 'enroll' };

/**
 * The section's one supporting line and, for a section the learner has not
 * joined, its single action. The switcher above is the one place the section
 * is named (UX audit learn-01), so neither the line nor the action repeats
 * it. In order: nothing for Web Developer or while the session loads (the
 * space is kept); sign in for a visitor; "Choose your plan" for an account
 * with no saved plan, since a join would save a plan from the local track and
 * hide topics open today; nothing for a member; otherwise the join. A failed
 * join replaces the button with its error and one Try again. Focus follows
 * each of those swaps (see the effect below). A visitor's device-only note is
 * the small status under the line and the action, in every section.
 */
export function SectionHeader({
  section,
  name,
  isMember,
  hasPlan,
  signedIn,
  authLoading,
  online,
  join,
  onJoin,
  onRetry,
  onSignIn,
  fde,
  premiumLabel,
  retryLabel,
  deviceNote,
}: {
  section: LearnSectionId;
  name: string;
  isMember: boolean;
  hasPlan: boolean;
  signedIn: boolean;
  authLoading: boolean;
  online: boolean;
  join: JoinState | null;
  onJoin: () => void;
  onRetry: () => void;
  onSignIn: () => void;
  fde?: { entryLoading: boolean; pathOpen: boolean; barred: boolean };
  premiumLabel: string;
  retryLabel: string;
  /** What a visitor's progress does without an account; shown signed out. */
  deviceNote?: string;
}) {
  const saving = join?.status === 'saving';
  const failed = join?.status === 'error';
  // A member whose join just landed keeps the saved line, not a button.
  const joinable = section !== 'web-developer' && !authLoading && signedIn && hasPlan && !isMember;

  // A join removes the button that started it: the saved line or the error's
  // Try again takes its place. Focus goes there, unless the learner moved it
  // elsewhere during the save.
  const headerRef = useRef<HTMLDivElement>(null);
  const retryRef = useRef<HTMLButtonElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const status = join?.status ?? null;
  const shownStatus = useRef(status);
  useEffect(() => {
    if (shownStatus.current === status) return;
    shownStatus.current = status;
    const held = document.activeElement;
    if (held && held !== document.body && !headerRef.current?.contains(held)) return;
    (status === 'saved' ? statusRef.current : status === 'error' ? retryRef.current : null)?.focus();
  }, [status]);

  let action: ReactNode = null;
  let note: ReactNode = null;
  if (!authLoading && !signedIn) note = deviceNote ?? null;
  if (section === 'web-developer') {
    action = null;
  } else if (authLoading) {
    action = <span className="rm-section-action__slot" aria-hidden="true" />;
  } else if (!signedIn) {
    action = <Button variant="secondary" label={learnText('learn.join.signIn')} onClick={onSignIn} />;
  } else if (!hasPlan) {
    action = <Button variant="secondary" as={Link} href={CHOOSE_PLAN_HREF} label={learnText('learn.join.choosePlan')} />;
    note = learnText('learn.join.noPlan');
  } else if (joinable && !failed) {
    if (section === 'forward-deployed-engineer' && fde?.entryLoading) {
      action = <Skeleton width={220} height={44} radius="rounded" />;
    } else {
      const labelKey: LearnKey = section === 'forward-deployed-engineer' && fde?.pathOpen ? 'learn.join.fdeStart' : 'learn.join.add';
      const barred = section === 'forward-deployed-engineer' && !!fde?.pathOpen && fde.barred;
      action = (
        <>
          <Button
            variant="primary"
            label={saving ? learnText('learn.join.saving') : learnText(labelKey)}
            isLoading={saving}
            isDisabled={!online}
            onClick={() => {
              if (!saving) onJoin();
            }}
          />
          {barred && <span className="ss-premium-label">{premiumLabel}</span>}
        </>
      );
      note = !online ? learnText('learn.join.offline') : barred ? null : learnText('learn.join.free');
    }
  }

  return (
    <div className="rm-section-header" ref={headerRef}>
      <p className="rm-section-line">{learnText(`learn.section.line.${section}`)}</p>
      {action && <div className="rm-section-action">{action}</div>}
      {note && <p className="rm-section-note">{note}</p>}
      {failed && joinable && (
        <div className="rm-section-error">
          <Banner
            status="error"
            title={learnText(join?.step === 'enroll' ? 'learn.join.enrollFailed' : 'learn.join.failed', { name })}
            endContent={<Button ref={retryRef} variant="secondary" label={retryLabel} isDisabled={!online} onClick={onRetry} />}
          />
        </div>
      )}
      <div role="status" aria-live="polite" className="rm-section-status" ref={statusRef} tabIndex={-1}>
        {join?.status === 'saved' ? learnText('learn.join.saved', { name }) : null}
      </div>
    </div>
  );
}
