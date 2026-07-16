// The /roadmap "map": a curated, top-to-bottom path through the topics that
// actually matter for the chosen track (Frontend / Backend / Fullstack). The
// track is chosen on the page (CareerRoadmap) and passed in; the map flows from
// foundations at the top down to production concerns at the bottom. Every topic
// node is coloured by its brand/logo colour (matching the quiz + learn
// surfaces), carries a one-line "what you'll learn" detail, and branches into
// its 3 parts — each part pill reflects live progress and deep-links into
// /learn.

import { useMemo, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import type { RoadmapStructure, RoadmapTopic } from '../types/quiz';
import {
  useRoadmapProgress,
  useExtraUnlocks,
  isTopicUnlocked,
  partRanges,
  pathStatus,
  PARTS_PER_TOPIC,
  type PathStatus,
  type RoadmapProgress,
} from '../lib/roadmap';
import { tracksForActiveSubject, TOPIC_DETAIL, type Track } from '../lib/tracks';
import { getCategoryLabel, getCategoryHexColor, onCategoryColorText } from '../lib/categories';
import { useT } from '../i18n/LanguageContext';
import { useIsMobile } from '../lib/useMediaQuery';
import type { TranslationKey } from '../i18n/translations';
import './Roadmap.css';

type TFn = (key: TranslationKey, vars?: Record<string, string | number>) => string;

export default function RoadmapTree({ structure, track }: { structure: RoadmapStructure | null; track: Track }) {
  const t = useT();
  const progress = useRoadmapProgress();
  const extraUnlocks = useExtraUnlocks();
  const extraSet = useMemo(() => new Set(extraUnlocks), [extraUnlocks]);

  const def = tracksForActiveSubject()[track];
  const levelCountOf = (family: RoadmapTopic): number =>
    structure?.structure?.[family]?.levels.length ?? 0;

  return (
    // The map: stages flow top → bottom. Keyed by track so switching tracks
    // remounts and gently re-animates the new path into place.
    <div
      key={track}
      className="rm-track-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
      }}
    >
      {def.stages.map((stage, i) => (
        <div key={stage.title} style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
            <div
              aria-hidden
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                backgroundColor: 'var(--brand-accent)',
                color: '#fff',
                fontSize: '0.72rem',
                fontWeight: 800,
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              {i + 1}
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: 800, letterSpacing: '0.3px' }}>
              {stage.title}
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
            {stage.topics.map((family) => (
              <TopicCard
                key={family}
                family={family}
                levelCount={levelCountOf(family)}
                progress={progress}
                extraSet={extraSet}
                t={t}
              />
            ))}
          </div>

          {i < def.stages.length - 1 && <StageConnector />}
        </div>
      ))}
    </div>
  );
}

/** A short vertical line + downward chevron linking one stage to the next. */
function StageConnector() {
  return (
    <div aria-hidden style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 8, marginBottom: 8 }}>
      <div style={{ width: 2, height: 16, backgroundColor: 'var(--color-border)' }} />
      <svg
        viewBox="0 0 12 8"
        style={{ width: 12, height: 8, color: 'var(--color-border)', display: 'block', marginTop: -2 }}
      >
        <path d="M1 1l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/** One topic node: colour-matched header, a detail line, and its 3 part pills. */
function TopicCard({
  family, levelCount, progress, extraSet, t,
}: {
  family: RoadmapTopic;
  levelCount: number;
  progress: RoadmapProgress;
  extraSet: Set<RoadmapTopic>;
  t: TFn;
}) {
  const isMobile = useIsMobile();
  const color = getCategoryHexColor(family);
  const unlocked = isTopicUnlocked(progress, family, extraSet);
  const ranges = partRanges(levelCount);
  const complete =
    ranges.length > 0 &&
    ranges.every((r) => pathStatus(progress, family, ranges, r.part, extraSet) === 'complete');
  const detail = TOPIC_DETAIL[family];

  return (
    <div
      style={{
        flex: '1 1 200px',
        maxWidth: isMobile ? '100%' : 260,
        borderRadius: 8,
        border: `1px solid ${complete ? color : unlocked ? 'var(--color-border)' : 'transparent'}`,
        borderTop: `3px solid ${color}`,
        backgroundColor: 'var(--color-background-surface)',
        opacity: unlocked ? 1 : 0.6,
        boxShadow: unlocked ? `0 1px 6px ${color}22` : 'none',
        padding: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 4.8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div aria-hidden style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: unlocked ? 'var(--color-text-primary)' : 'var(--color-text-disabled)', lineHeight: 1.2 }}>
          {getCategoryLabel(family)}
        </div>
        {complete && (
          <svg aria-hidden viewBox="0 0 24 24" style={{ width: 16, height: 16, marginLeft: 'auto', color }}>
            <path d="M20 6 9 17l-5-5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      {detail && (
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', lineHeight: 1.4, minHeight: 32 }}>
          {detail}
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, marginTop: 'auto', paddingTop: 2 }}>
        {(ranges.length > 0 ? ranges.map((r) => r.part) : Array.from({ length: PARTS_PER_TOPIC }, (_, i) => i + 1)).map((part) => {
          const status: PathStatus = ranges.length > 0 ? pathStatus(progress, family, ranges, part, extraSet) : 'locked';
          return <PartPill key={part} family={family} part={part} status={status} color={color} t={t} />;
        })}
      </div>
    </div>
  );
}

function PartPill({
  family, part, status, color, t,
}: {
  family: RoadmapTopic; part: number; status: PathStatus; color: string; t: TFn;
}) {
  const locked = status === 'locked';
  const complete = status === 'complete';
  const filled = complete;
  const stateLabel = t(
    complete ? 'roadmapTree.complete' : status === 'in-progress' ? 'roadmapTree.inProgress' : locked ? 'roadmapTree.locked' : 'roadmapTree.available',
  );
  const style: CSSProperties = {
    flex: 1,
    textAlign: 'center',
    fontSize: '0.75rem',
    fontWeight: 700,
    lineHeight: 1.4,
    padding: '6px 4px',
    borderRadius: 6,
    border: `1.5px solid ${locked ? 'var(--color-border)' : color}`,
    backgroundColor: filled ? color : status === 'in-progress' ? `${color}24` : 'transparent',
    color: filled ? onCategoryColorText(family) : locked ? 'var(--color-text-disabled)' : 'var(--color-text-primary)',
    textDecoration: 'none',
    cursor: locked ? 'default' : 'pointer',
    display: 'block',
  };
  const label = t('roadmapTree.partPill', { n: part });
  const title = `${getCategoryLabel(family)} · ${label} — ${stateLabel}`;
  if (locked) {
    // A disabled control, not an image: keyboard users can still reach it and
    // hear why it's inert.
    return (
      <Tooltip content={title} placement="above">
        <div role="button" aria-disabled="true" tabIndex={0} style={style} aria-label={title}>{part}</div>
      </Tooltip>
    );
  }
  return (
    <Tooltip content={title} placement="above">
      <Link to={`/learn?topic=${family}&part=${part}`} style={style} aria-label={title}>
        {part}
      </Link>
    </Tooltip>
  );
}
