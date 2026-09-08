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
import { tracksForActiveSubject, stageTitleKey, localizedTopicDetail, type Track } from '../lib/tracks';
import type { EligibilityResponse } from '../../../shared/progression';
import { categoryLabelKey, getCategoryHexColor, onCategoryColorText } from '../lib/categories';
import { useSubject } from '../lib/subjects';
import { useT } from '../i18n/LanguageContext';
import { useIsMobile } from '../lib/useMediaQuery';
import type { TranslationKey } from '../i18n/translations';
import './Roadmap.css';

type TFn = (key: TranslationKey, vars?: Record<string, string | number>) => string;

const stageLabelKey = (key: string): TranslationKey => `progression.stage.${key}` as TranslationKey;
const pathLabelKey = (id: string): TranslationKey => `progression.path.${id}` as TranslationKey;

/**
 * The map. With a personalised plan (issue #153) it draws exactly the stages
 * the learner may start — a locked stage is not a dimmed preview, it is simply
 * not there, and one line says more will appear. Without a plan it falls back
 * to the general roadmap for the chosen track.
 */
export default function RoadmapTree({ structure, track, plan }: {
  structure: RoadmapStructure | null;
  track: Track;
  plan?: EligibilityResponse | null;
}) {
  const t = useT();
  const [subject] = useSubject();
  const progress = useRoadmapProgress();
  const extraUnlocks = useExtraUnlocks();
  const extraSet = useMemo(() => new Set(extraUnlocks), [extraUnlocks]);

  const def = tracksForActiveSubject()[track];
  const levelCountOf = (family: RoadmapTopic): number =>
    structure?.structure?.[family]?.levels.length ?? 0;

  if (plan?.personalized) {
    const showPathHeadings = plan.paths.length > 1;
    return (
      <div key={`plan-${plan.profileVersion}`} className="rm-track-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: 12 }}>
        {plan.paths.map((path) => {
          // A stage with nothing to draw is not drawn. That happens when a
          // topic sits in two selected paths — `dsa` is in the Fullstack track
          // and in DSA Foundations — and the response gives it to the path
          // that owns its gate, so the other one is left empty. A stage whose
          // content is still being written says so instead.
          const open = path.stages.filter((stage) => stage.open && (stage.topics.length > 0 || stage.contentPending));
          const hidden = path.stages.filter((stage) => !stage.open).length;
          const pending = open.filter((stage) => stage.contentPending);
          // Nothing to show and nothing to promise: the path is fully covered
          // by another one the learner is already reading.
          if (open.length === 0 && hidden === 0) return null;
          return (
            <section
              key={path.id}
              // With one path the heading is redundant on screen, so it is not
              // rendered — and an aria-labelledby pointing at an id that does
              // not exist leaves the region unnamed. Name it directly instead.
              {...(showPathHeadings
                ? { 'aria-labelledby': `rm-path-${path.id}` }
                : { 'aria-label': t(pathLabelKey(path.id)) })}
              style={{ width: '100%' }}
            >
              {showPathHeadings && (
                <h3 id={`rm-path-${path.id}`} style={{ fontSize: '0.95rem', fontWeight: 800, textAlign: 'center', margin: '4px 0 12px' }}>
                  {t(pathLabelKey(path.id))}
                </h3>
              )}
              {open.map((stage, i) => (
                <div key={stage.key} style={{ width: '100%' }}>
                  <StageHeading index={i} label={t(stageLabelKey(stage.key))} />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
                    {stage.topics.map((entry) => (
                      <TopicCard
                        key={entry.topic}
                        family={entry.topic as RoadmapTopic}
                        levelCount={levelCountOf(entry.topic as RoadmapTopic)}
                        progress={progress}
                        extraSet={extraSet}
                        t={t}
                      />
                    ))}
                  </div>
                  {i < open.length - 1 && <StageConnector />}
                </div>
              ))}
              {pending.length > 0 && (
                <p className="rm-path-note" role="note" style={{ textAlign: 'center', margin: '12px 0 0', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                  {t('roadmap.pathPending')}
                </p>
              )}
              {hidden > 0 && (
                <p className="rm-path-note" style={{ textAlign: 'center', margin: '12px 0 0', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                  {t('roadmap.morePaths')}
                </p>
              )}
            </section>
          );
        })}
      </div>
    );
  }

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
          <StageHeading index={i} label={t(stageTitleKey(subject, track, i))} />

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

/** The numbered stage heading shared by the personalised and general maps. */
function StageHeading({ index, label }: { index: number; label: string }) {
  return (
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
        {index + 1}
      </div>
      <div style={{ fontSize: '0.875rem', fontWeight: 800, letterSpacing: '0.3px' }}>{label}</div>
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
  const detail = localizedTopicDetail(t, family);

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
          {t(categoryLabelKey(family))}
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
  const title = `${t(categoryLabelKey(family))} · ${label} — ${stateLabel}`;
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
