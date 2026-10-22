// A Learn section's topic rail, and what the map area says when nothing in
// the section is open yet.
//
// The rail is the radiogroup the Learn page always had. Locked topics stay
// listed with a dashed edge and a lock; a topic outside the plan because the
// learner has not joined the section is dimmed with "Not in your plan" (the
// header holds the join action). Neither is selectable, and arrow keys skip
// both. A shared topic says which other sections list it; its progress line is
// the same record wherever it appears.

import type { CSSProperties } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { RadioCard, RadioCardGroup } from '../ui/RadioCards';
import { CategoryGlyph } from '../ui/techIcons';
import { categoryLabelKey, getCategoryHexColor, onCategoryColorText } from '../../lib/categories';
import type { TranslationKey } from '../../i18n/translations';
import { learnText } from '../../i18n/translations.learn';
import { LEVELS_TO_UNLOCK_NEXT, passedLevelCount, type VerifiedProgress } from '../../../../shared/progression';
import type { RailEntry } from './sections';

type TFn = (key: TranslationKey, vars?: Record<string, string | number>) => string;

export const LockIcon = ({ size = 18 }: { size?: number }) => (
  <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export function SectionRail({
  sectionName,
  entries,
  value,
  onSelect,
  loading,
  loadingCount,
  levelCounts,
  progress,
  t,
}: {
  sectionName: string;
  entries: readonly RailEntry[];
  value: string;
  onSelect: (topic: string) => void;
  loading: boolean;
  loadingCount: number;
  levelCounts: Readonly<Record<string, number>>;
  progress: VerifiedProgress;
  t: TFn;
}) {
  if (loading) {
    return (
      <div className="rm-topic-rail" aria-busy="true">
        {Array.from({ length: loadingCount }).map((_, i) => (
          <Skeleton key={i} width="100%" height={56} radius="rounded" index={i} />
        ))}
      </div>
    );
  }

  const locked = entries.filter((entry) => entry.state === 'locked').length;
  const reachable = entries.filter((entry) => entry.state !== 'dimmed').length;

  return (
    <>
      {/* Radiogroup semantics (not tabs: there is no tabpanel wiring), so
          assistive technology announces "N of M selected". */}
      {/* Only an open topic reads as chosen: with nothing open in the
          section, no card is checked. */}
      <RadioCardGroup value={entries.some((entry) => entry.topic === value && entry.state === 'open') ? value : ''} onChange={(next) => onSelect(String(next))} label={t('roadmap.topicsAria')} orientation="horizontal" className="rm-topic-rail">
        {entries.map((entry, index) => {
          const { topic, state, premium } = entry;
          const color = getCategoryHexColor(topic);
          const label = t(categoryLabelKey(topic));
          const name = [
            state === 'open' ? label
              : state === 'locked' ? `${label} — ${t('roadmap.locked')}`
                : learnText('learn.rail.notJoinedAria', { topic: label, section: sectionName }),
            premium ? t('premium.badge') : null,
          ].filter(Boolean).join(', ');
          return (
            <RadioCard
              key={topic}
              value={topic}
              index={index}
              disabled={state !== 'open'}
              label={name}
              className={state === 'dimmed' ? 'rm-topic-pill rm-topic-pill--dimmed' : 'rm-topic-pill'}
              padding={2.5}
              style={{ ['--rm-accent']: color, ['--rm-on-accent']: onCategoryColorText(topic) } as CSSProperties}
              data-locked={state === 'locked'}
            >
              {/* Constant white chip under the logo: the selected pill fills
                  with the topic's own colour, which used to swallow a
                  same-coloured glyph. */}
              <span className="rm-topic-glyph">
                <CategoryGlyph category={topic} color={color} size={20} />
              </span>
              <span className="rm-topic-text">
                <span>{label}</span>
                <span className="rm-topic-progress">
                  {premium && <span className="ss-premium-label">{t('premium.badge')}</span>}
                  {/* Without the structure (its request failed) the level
                      count is unknown: an open topic shows no figure. */}
                  {state === 'open'
                    ? levelCounts[topic] === undefined ? null : t('roadmap.progress', { done: passedLevelCount(progress, topic), total: levelCounts[topic] })
                    : state === 'locked' ? t('roadmap.locked') : learnText('learn.rail.notJoined')}
                </span>
              </span>
              {state === 'locked' && <span className="rm-topic-lock" aria-hidden><LockIcon size={13} /></span>}
            </RadioCard>
          );
        })}
      </RadioCardGroup>

      {/* How much of the section is still closed, and how to open it. Dimmed
          topics are not counted: the join action opens them. */}
      {locked > 0 && (
        <p className="rm-topic-locked-note">
          <LockIcon size={13} />
          <span>{t('roadmap.topicsLockedCount', { locked, total: reachable })}</span>
          <span>{t('roadmap.topicsLockedHowTo')}</span>
        </p>
      )}
    </>
  );
}

/** The map area of a section with nothing open: which topic to pass to open
 * it, or, for a section the learner has not joined, that it is not in the
 * plan (the header holds the one action). */
export function SectionEmpty(props:
  | { kind: 'gate'; prereq: string; topic: string; onGo: () => void; t: TFn }
  | { kind: 'notMember'; name: string }) {
  if (props.kind === 'notMember') {
    return (
      <div className="rm-section-empty">
        <h2 className="rm-section-empty__title">{learnText('learn.notJoined.title', { name: props.name })}</h2>
        <p>{learnText('learn.notJoined.body')}</p>
      </div>
    );
  }
  const { prereq, topic, onGo, t } = props;
  const prereqLabel = t(categoryLabelKey(prereq));
  return (
    <div className="rm-section-empty">
      <h2 className="rm-section-empty__title">{learnText('learn.empty.title')}</h2>
      <p>{learnText('learn.empty.body', { count: LEVELS_TO_UNLOCK_NEXT, prereq: prereqLabel, topic: t(categoryLabelKey(topic)) })}</p>
      <Button variant="secondary" label={learnText('learn.empty.action', { prereq: prereqLabel })} onClick={onGo} />
    </div>
  );
}
