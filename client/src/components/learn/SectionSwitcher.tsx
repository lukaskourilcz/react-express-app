// The Learn page's section switcher and the line under it.
//
// The switcher is the Astryx SegmentedControl, which selects as focus moves.
// The page opens a section on activation only, so the control's value here is
// the section the learner is browsing: arrow keys, Home and End move it, and
// Enter, Space or a click open it (the item's own onClick runs before the
// control's selection). Leaving with Tab drops an unopened highlight.

import { useEffect, useRef, useState, type FocusEvent, type ReactNode } from 'react';
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

export function SectionSwitcher({ value, items, onActivate }: {
  value: LearnSectionId;
  items: readonly SwitcherItem[];
  onActivate: (id: LearnSectionId) => void;
}) {
  const [browsed, setBrowsed] = useState<LearnSectionId>(value);
  useEffect(() => setBrowsed(value), [value]);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Keep the open section in view inside the narrow scroller. Only the
  // scroller moves: scrollIntoView could also scroll the page.
  useEffect(() => {
    const scroller = scrollerRef.current;
    const item = scroller?.querySelector<HTMLElement>(`[role="radio"][data-value="${value}"]`);
    if (!scroller || !item) return;
    const left = item.offsetLeft - scroller.offsetLeft;
    if (left < scroller.scrollLeft) scroller.scrollLeft = left;
    else if (left + item.offsetWidth > scroller.scrollLeft + scroller.clientWidth) {
      scroller.scrollLeft = left + item.offsetWidth - scroller.clientWidth;
    }
  }, [value]);

  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setBrowsed(value);
  };

  return (
    <div className="rm-section-switcher" role="group" aria-describedby="learn-switcher-hint" onBlur={onBlur}>
      <div className="rm-section-switcher__scroll" ref={scrollerRef}>
        <SegmentedControl
          value={browsed}
          onChange={(next) => setBrowsed(next as LearnSectionId)}
          label={learnText('learn.switcher.label')}
          size="lg"
        >
          {items.map(({ id, name, percent }) => (
            <SegmentedControlItem
              key={id}
              value={id}
              label={percent === null ? name : learnText('learn.switcher.item', { name, percent })}
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
 * The section's one-line purpose and, for a section the learner has not
 * joined, its single action. In order: nothing for Web Developer or while the
 * session loads (the space is kept); sign in for a visitor; "Choose your plan"
 * for an account with no saved plan, since a join would save a plan from the
 * local track and hide topics open today; nothing for a member; otherwise the
 * join. A failed join replaces the button with its error and one Try again.
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
  onChoosePlan,
  fde,
  premiumLabel,
  retryLabel,
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
  onChoosePlan: () => void;
  fde?: { entryLoading: boolean; pathOpen: boolean; barred: boolean };
  premiumLabel: string;
  retryLabel: string;
}) {
  const saving = join?.status === 'saving';
  const failed = join?.status === 'error';
  // A member whose join just landed keeps the saved line, not a button.
  const joinable = section !== 'web-developer' && !authLoading && signedIn && hasPlan && !isMember;

  let action: ReactNode = null;
  let note: ReactNode = null;
  if (section === 'web-developer') {
    action = null;
  } else if (authLoading) {
    action = <span className="rm-section-action__slot" aria-hidden="true" />;
  } else if (!signedIn) {
    action = <Button variant="secondary" label={learnText('learn.join.signIn', { name })} onClick={onSignIn} />;
  } else if (!hasPlan) {
    action = <Button variant="secondary" label={learnText('learn.join.choosePlan')} onClick={onChoosePlan} />;
    note = learnText('learn.join.noPlan');
  } else if (joinable && !failed) {
    if (section === 'forward-deployed-engineer' && fde?.entryLoading) {
      action = <Skeleton width={220} height={44} radius="rounded" />;
    } else {
      const labelKey: LearnKey = section === 'software-engineer'
        ? 'learn.join.softwareEngineer'
        : fde?.pathOpen ? 'learn.join.fdeStart' : 'learn.join.fdeAdd';
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
    <div className="rm-section-header">
      <p className="rm-section-line">{learnText(`learn.section.line.${section}`)}</p>
      {action && <div className="rm-section-action">{action}</div>}
      {note && <p className="rm-section-note">{note}</p>}
      {failed && joinable && (
        <div className="rm-section-error">
          <Banner
            status="error"
            title={learnText(join?.step === 'enroll' ? 'learn.join.enrollFailed' : 'learn.join.failed', { name })}
            endContent={<Button variant="secondary" label={retryLabel} isDisabled={!online} onClick={onRetry} />}
          />
        </div>
      )}
      <div role="status" aria-live="polite" className="rm-section-status">
        {join?.status === 'saved' ? learnText('learn.join.saved', { name }) : null}
      </div>
    </div>
  );
}
