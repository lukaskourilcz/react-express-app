import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import { Button as AxButton } from '@astryxdesign/core/Button';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { AppToast } from './ui/AppToast';
import { useIsMobile } from '../lib/useMediaQuery';
import type {
  RoadmapTopic,
  RoadmapLevelMeta,
  RoadmapPlayable,
  RoadmapQuestion,
  RoadmapStructure,
  Question,
} from '../types/quiz';
import {
  fetchRoadmapLevel,
  fetchRoadmapPartTest,
  recordLevelResult,
  recordPartTestResult,
  pushProgressToServer,
  syncProgressWithServer,
  useRoadmapProgress,
  isLevelPassed,
  isPartLevelUnlocked,
  isPartTestUnlocked,
  isPartTestPassed,
  levelBestPct,
  partTestBestPct,
  partPassedLevels,
  partRanges,
  currentPart,
  isPathUnlocked,
  pathStatus,
  PARTS_PER_TOPIC,
  getRoadmapProgress,
  isTopicUnlocked,
  unlockExtraTopics,
  useExtraUnlocks,
  getExtraUnlocks,
  topicsFromAssessment,
  ASSESSMENT_QUESTION_COUNT,
  type PartRange,
} from '../lib/roadmap';
import { useSubject, topicsForSubject } from '../lib/subjects';
import { levelIntro, preloadLevelIntros } from '../lib/levelIntros';
import { useRoadmapStructure } from '../lib/queries';
import { fetchChallengeBatch } from '../lib/challengeApi';
import { apiFetch } from '../lib/api';
import { awardLearningOutcome, syncXpWithServer } from '../lib/xp';
import { computeLearningXp } from '../lib/leveling';
import { getCategoryHexColor, getCategoryLabel, onCategoryColorText } from '../lib/categories';
import { BRAND } from '../theme/MuiTheme';
import { useLanguage } from '../i18n/LanguageContext';
import type { TranslationKey } from '../i18n/translations';
import { useAuth } from '../lib/auth';
import { friendlyError } from '../lib/api';
import { reportQuestion } from '../lib/supabase';
import { shuffleDifferentFrom } from '../lib/shuffle';
import { readString, writeString } from '../lib/storage';
import { renderQuestion } from './CodeBlock';
import { QuoteLoader, holdLoadingScreen } from './LoadingScreen';
import { SplitText } from './reactbits/SplitText';
import { RedFlagDialog } from './RedFlagDialog';
import './Roadmap.css';

type TFn = (key: TranslationKey, vars?: Record<string, string | number>) => string;
// `ref` is the GLOBAL level number for a level, or the part number for a test.
type Active = { kind: 'level' | 'test'; ref: number };

// The roadmap topic list is scoped to the active subject (see subjects.ts);
// each subject exposes its own ordered set of Learn topics.
const TOPIC_KEY = 'devquiz:roadmap:topic';
const PART_KEY = 'devquiz:roadmap:part';
const CHECKPOINT_GOLD = BRAND.gold;
// Lives for a level lesson: one heart that drains a third per wrong answer.
const MAX_HEARTS = 3;
const HEART_COLOR = BRAND.coral;
const CHECKPOINT_GRAD: [string, string] = ['#ffd54f', BRAND.gold];

// Per-topic path colour. The path takes its base hue from the chosen category
// (JavaScript → yellow, React → cyan, …) so each topic feels distinct, and
// each difficulty tier (1→5) shades the base slightly darker so the easy→hard
// progression is still readable inside one topic. `solid` drives borders/glows/
// connectors; `grad` is the [light, dark] fill gradient for completed nodes.
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}
function mix(hex: string, target: [number, number, number], ratio: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(
    r * (1 - ratio) + target[0] * ratio,
    g * (1 - ratio) + target[1] * ratio,
    b * (1 - ratio) + target[2] * ratio,
  );
}
const lighten = (hex: string, ratio = 0.25) => mix(hex, [255, 255, 255], ratio);
const darken = (hex: string, ratio = 0.25) => mix(hex, [0, 0, 0], ratio);
function bandForCategory(topic: RoadmapTopic, difficulty: number) {
  const base = getCategoryHexColor(topic);
  // Difficulty tiers 1..5 → shade the base 0%/10%/20%/30%/40% darker.
  const tier = Math.min(5, Math.max(1, difficulty));
  const solid = tier === 1 ? base : darken(base, 0.10 * (tier - 1));
  return { solid, grad: [lighten(solid, 0.25), darken(solid, 0.20)] as [string, string] };
}

interface PlacedNode {
  i: number;
  kind: 'level' | 'test';
  key: string;
  cx: number;
  cy: number;
  half: number;
  accent: string;
  grad: [string, string];
  unlocked: boolean;
  passed: boolean;
  isCurrent: boolean;
  best: number;
  level?: RoadmapLevelMeta;
  /** Local 1-based number within the part (what the node displays). */
  displayNum?: number;
  /** For a test node: the part it ends and that part's global level range. */
  part?: number;
  range?: PartRange;
}

// Track an element's width so the path can lay itself out responsively. Uses a
// callback ref (not a mount effect) so measurement starts the moment the node
// actually attaches: the path container only mounts AFTER the structure finishes
// loading, so a one-shot mount effect would run while only the loading skeleton
// is on screen, see a null ref, and never re-measure — leaving width at 0 and
// the path empty. A callback ref re-runs whenever the element mounts/unmounts.
function useElementWidth<T extends HTMLElement>() {
  const [width, setWidth] = useState(0);
  const observerRef = useRef<ResizeObserver | null>(null);
  const ref = useCallback((el: T | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!el) return;
    const update = () => setWidth(el.getBoundingClientRect().width);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    observerRef.current = ro;
  }, []);
  return [ref, width] as const;
}

const CheckIcon = ({ size = 22 }: { size?: number }) => (
  <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const LockIcon = ({ size = 18 }: { size?: number }) => (
  <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const TrophyIcon = ({ size = 26 }: { size?: number }) => (
  <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" />
    <path d="M5 4H3v2a3 3 0 0 0 3 3M19 4h2v2a3 3 0 0 1-3 3" />
  </svg>
);
const StarIcon = ({ filled, size = 14 }: { filled: boolean; size?: number }) => (
  <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

function starsFor(pct: number, passPct: number): number {
  if (pct >= 100) return 3;
  if (pct >= passPct) return 2;
  if (pct > 0) return 1;
  return 0;
}

// Build one part's ordered path: its levels, then a single end-of-part test.
type PathNode =
  | { type: 'level'; meta: RoadmapLevelMeta }
  | { type: 'test'; part: number; range: PartRange };

function buildPath(partLevels: RoadmapLevelMeta[], range: PartRange): PathNode[] {
  const out: PathNode[] = partLevels.map((meta) => ({ type: 'level', meta }));
  if (range.size > 0) out.push({ type: 'test', part: range.part, range });
  return out;
}

// Build the order a lesson is shown in: both the question sequence and each
// question's answer options are shuffled so nothing is memorisable by position.
// `prev` (the previous presentation, on replay) is avoided so every run differs
// from the one before — answers never stay in the same slot two plays running.
function presentQuestions(questions: RoadmapQuestion[], prev?: RoadmapQuestion[]): RoadmapQuestion[] {
  // Reorder questions, avoiding the previous sequence (or the source order on the
  // first play). The reference must be the same objects in the order to avoid.
  const byId = new Map(questions.map((q) => [q.id, q]));
  const reference = (prev ?? questions).map((q) => byId.get(q.id)).filter((q): q is RoadmapQuestion => !!q);
  const ordered = reference.length === questions.length ? shuffleDifferentFrom(questions, reference) : shuffleDifferentFrom(questions, questions);

  const prevOptionsById = new Map((prev ?? []).map((q) => [q.id, q.options]));
  return ordered.map((q) => {
    const correctText = q.options[q.correctAnswer];
    const avoid = prevOptionsById.get(q.id) ?? q.options;
    const options = shuffleDifferentFrom(q.options, avoid);
    const correctAnswer = options.indexOf(correctText);
    return { ...q, options, correctAnswer: correctAnswer >= 0 ? correctAnswer : q.correctAnswer };
  });
}

// What to play after finishing `a`, within the active topic's part ranges: the
// next level in the part, then the part test, then the first level of the next
// part (which the just-passed test unlocks).
function nextAfter(a: Active, ranges: PartRange[]): Active | null {
  if (a.kind === 'level') {
    const r = ranges.find((x) => a.ref >= x.startLevel && a.ref <= x.endLevel);
    if (!r) return null;
    if (a.ref < r.endLevel) return { kind: 'level', ref: a.ref + 1 };
    return { kind: 'test', ref: r.part };
  }
  // Finished a part test → jump into the next part if there is one.
  const next = ranges[a.ref]; // ranges is 0-indexed; part a.ref's successor sits at index a.ref
  if (next && next.size > 0) return { kind: 'level', ref: next.startLevel };
  return null;
}

function Roadmap() {
  const { lang, t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const progress = useRoadmapProgress();
  const extraUnlocks = useExtraUnlocks();
  const [pathRef, pathWidth] = useElementWidth<HTMLDivElement>();

  // Kick off the lazy Czech intro fetch as soon as the page knows the language.
  useEffect(() => preloadLevelIntros(lang), [lang]);

  // Roadmap structure via TanStack Query — cached + de-duped with the /roadmap
  // tree, cancellable, with built-in loading/error state and retry.
  const structureQuery = useRoadmapStructure();
  const structure: RoadmapStructure | null = structureQuery.data ?? null;
  const loadingStructure = structureQuery.isPending;
  const structureError = structureQuery.error ? friendlyError(structureQuery.error) : null;
  // Topics for the active subject, in path order. The first is the default/
  // fallback landing topic.
  const [subject] = useSubject();
  const TOPICS = topicsForSubject(subject);
  const [topic, setTopic] = useState<RoadmapTopic>(() => {
    // A deep link from the roadmap tree (/learn?topic=…&part=…) wins over the
    // last-opened topic so clicking a part on the tree lands on that path.
    const fromUrl = new URLSearchParams(window.location.search).get('topic');
    const saved = fromUrl && (TOPICS as string[]).includes(fromUrl) ? fromUrl : readString(TOPIC_KEY);
    const candidate =
      saved && (TOPICS as string[]).includes(saved) ? (saved as RoadmapTopic) : TOPICS[0];
    // If the saved topic is locked (fresh user, reset progress, etc.) fall back
    // to the always-open starter so the page lands somewhere actionable.
    if (!isTopicUnlocked(getRoadmapProgress(), candidate, new Set(getExtraUnlocks()))) {
      return TOPICS[0];
    }
    return candidate;
  });
  // Which of the topic's PARTS_PER_TOPIC parts is open in the path view.
  const [part, setPart] = useState<number>(() => {
    const fromUrl = parseInt(new URLSearchParams(window.location.search).get('part') ?? '', 10);
    if (Number.isInteger(fromUrl) && fromUrl >= 1 && fromUrl <= PARTS_PER_TOPIC) return fromUrl;
    const saved = parseInt(readString(PART_KEY) ?? '', 10);
    return Number.isInteger(saved) && saved >= 1 && saved <= PARTS_PER_TOPIC ? saved : 1;
  });

  // If the subject changes while this page is mounted, the current topic may no
  // longer belong to it — snap back to the subject's first topic.
  useEffect(() => {
    if (!(TOPICS as string[]).includes(topic)) {
      setTopic(TOPICS[0]);
      setPart(1);
    }
  }, [subject]); // eslint-disable-line react-hooks/exhaustive-deps

  const [active, setActive] = useState<Active | null>(null);
  const [playable, setPlayable] = useState<RoadmapPlayable | null>(null);
  const [loadingLesson, setLoadingLesson] = useState(false);
  const [lessonError, setLessonError] = useState<string | null>(null);
  const lessonAbortRef = useRef<AbortController | null>(null);

  // Skill check (assessment) state. `open` controls the modal; the runner
  // owns its own in-progress state until the result screen reports back.
  const [skillCheckOpen, setSkillCheckOpen] = useState(false);
  const [unlockSnack, setUnlockSnack] = useState<string | null>(null);

  const extraUnlocksSet = useMemo(() => new Set(extraUnlocks), [extraUnlocks]);
  const isUnlocked = useCallback(
    (tpc: RoadmapTopic) => isTopicUnlocked(progress, tpc, extraUnlocksSet),
    [progress, extraUnlocksSet],
  );
  // The topic's full (global) level list, split into PARTS_PER_TOPIC parts. Only
  // the selected part's slice is rendered as a path, so it stays short.
  const levels: RoadmapLevelMeta[] = structure?.structure[topic]?.levels ?? [];
  const ranges = useMemo(() => partRanges(levels.length), [levels.length]);
  const safePart = Math.min(Math.max(part, 1), Math.max(1, ranges.length));
  const range: PartRange | undefined = ranges[safePart - 1];
  const partLevels = useMemo(
    () => (range ? levels.slice(range.startLevel - 1, range.endLevel) : []),
    [levels, range],
  );
  const topicColor = getCategoryHexColor(topic);

  // Keep the selected part on something the learner can actually open: if it's
  // locked (reset progress, switched topic, stale deep link) snap to the first
  // unlocked, incomplete part.
  useEffect(() => {
    if (ranges.length === 0) return;
    if (!isPathUnlocked(progress, topic, part, extraUnlocksSet)) {
      setPart(currentPart(progress, topic, ranges, extraUnlocksSet));
    }
  }, [topic, ranges, progress, extraUnlocksSet, part]);

  // Pull account progress + XP on sign-in and merge with this device (progress
  // first, so the merged learning XP is reflected before the XP reconcile).
  useEffect(() => {
    if (!isAuthenticated) return;
    syncProgressWithServer().then(() => syncXpWithServer()).catch(() => {});
  }, [isAuthenticated]);

  const selectTopic = (next: RoadmapTopic) => {
    // Locked topics aren't tabbable; ignore if somehow invoked.
    if (!isUnlocked(next)) return;
    setTopic(next);
    writeString(TOPIC_KEY, next);
    // Land on the first unlocked, incomplete part of the newly chosen topic.
    const nextRanges = partRanges(structure?.structure[next]?.levels.length ?? 0);
    const p = currentPart(progress, next, nextRanges, extraUnlocksSet);
    setPart(p);
    writeString(PART_KEY, String(p));
  };

  const selectPart = (p: number) => {
    if (!isPathUnlocked(progress, topic, p, extraUnlocksSet)) return;
    setPart(p);
    writeString(PART_KEY, String(p));
  };

  const onSkillCheckFinished = useCallback(
    (correct: number) => {
      const granted = topicsFromAssessment(correct);
      const added = unlockExtraTopics(granted);
      setSkillCheckOpen(false);
      if (added.length === 0) {
        setUnlockSnack(t('roadmap.skillCheckNoneAdded'));
      } else {
        const labels = added.map(getCategoryLabel).join(', ');
        setUnlockSnack(t('roadmap.skillCheckUnlocked', { topics: labels }));
      }
      // Persist to the user's account so unlocks follow them across devices.
      if (isAuthenticated && added.length > 0) pushProgressToServer().catch(() => {});
    },
    [t, isAuthenticated],
  );

  const open = (a: Active) => {
    lessonAbortRef.current?.abort();
    const controller = new AbortController();
    lessonAbortRef.current = controller;
    setActive(a);
    setPlayable(null);
    setLoadingLesson(true);
    setLessonError(null);
    const startedAt = Date.now();
    const req =
      a.kind === 'level'
        ? fetchRoadmapLevel(topic, a.ref, lang, controller.signal)
        : fetchRoadmapPartTest(topic, a.ref, lang, controller.signal);
    req
      .then(async (data) => {
        await holdLoadingScreen(startedAt);
        if (controller.signal.aborted) return;
        // A part test comes back as a generic exam; give it a localized title.
        setPlayable(a.kind === 'test' ? { ...data, title: t('roadmap.partLabel', { n: a.ref }) } : data);
        setLoadingLesson(false);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setLessonError(friendlyError(err));
        setLoadingLesson(false);
      });
  };

  // Open the next item; when it lives in the next part, switch parts too.
  const openNext = (a: Active) => {
    if (a.kind === 'level') {
      const r = ranges.find((x) => a.ref >= x.startLevel && a.ref <= x.endLevel);
      if (r && r.part !== part) {
        setPart(r.part);
        writeString(PART_KEY, String(r.part));
      }
    }
    open(a);
  };

  const exitLesson = () => {
    lessonAbortRef.current?.abort();
    setActive(null);
    setPlayable(null);
    setLessonError(null);
    setLoadingLesson(false);
  };

  const handleFinished = (pct: number) => {
    if (!active || !playable) return;
    // Learning XP is derived from progress, so measure it across the record to
    // reward only a NEW pass; replays/fails fall back to a small practice grant.
    const before = computeLearningXp(getRoadmapProgress());
    if (active.kind === 'level') recordLevelResult(topic, active.ref, pct, playable.passPct);
    else recordPartTestResult(topic, active.ref, pct, playable.passPct);
    awardLearningOutcome(computeLearningXp(getRoadmapProgress()) - before);
    if (isAuthenticated) pushProgressToServer().catch(() => {});
  };

  // Lay the SELECTED PART out as a serpentine: nodes flow left→right and gently
  // down, then wrap and flow back the other way. Positions are computed
  // analytically so the SVG connectors hit each node centre without measuring.
  const layout = useMemo(() => {
    if (!pathWidth || !range || partLevels.length === 0) return null;
    const nodes = buildPath(partLevels, range);
    const cols = Math.max(2, Math.min(5, Math.floor(pathWidth / 150)));
    const cellW = pathWidth / cols;
    // ROW_H must clear the accumulated within-row slope so the lowest node of a
    // row doesn't collide with the next row's start node (same column at a turn) —
    // including a taller test node and its two-line label.
    const ROW_H = 178;
    const SLOPE = 12;
    const BASE = 50;
    const LABEL_H = 60;
    const placed: PlacedNode[] = nodes.map((node, i): PlacedNode => {
      const row = Math.floor(i / cols);
      const p = i % cols;
      const colVisual = row % 2 === 0 ? p : cols - 1 - p; // reverse odd rows
      const cx = colVisual * cellW + cellW / 2;
      const cy = BASE + row * ROW_H + p * SLOPE;
      if (node.type === 'test') {
        const passed = isPartTestPassed(progress, topic, node.part);
        const unlocked = isPartTestUnlocked(progress, topic, node.range);
        return {
          i, kind: 'test', key: `test-${node.part}`, cx, cy, half: 42,
          accent: CHECKPOINT_GOLD, grad: CHECKPOINT_GRAD, part: node.part, range: node.range,
          unlocked, passed, isCurrent: unlocked && !passed,
          best: partTestBestPct(progress, topic, node.part),
        };
      }
      const meta = node.meta;
      const band = bandForCategory(topic, meta.difficulty);
      const passed = isLevelPassed(progress, topic, meta.level);
      const unlocked = isPartLevelUnlocked(progress, topic, range, meta.level);
      return {
        i, kind: 'level', key: `lvl-${meta.level}`, cx, cy, half: 32,
        accent: band.solid, grad: band.grad, level: meta,
        displayNum: meta.level - range.startLevel + 1,
        unlocked, passed, isCurrent: unlocked && !passed,
        best: levelBestPct(progress, topic, meta.level),
      };
    });
    const rows = Math.ceil(nodes.length / cols);
    const height = BASE + (rows - 1) * ROW_H + (cols - 1) * SLOPE + 40 + LABEL_H;
    const segments = placed.slice(0, -1).map((a, i) => {
      const b = placed[i + 1];
      const done = a.passed && b.passed;
      const active = a.passed && b.isCurrent;
      return { x1: a.cx, y1: a.cy, x2: b.cx, y2: b.cy, color: done || active ? b.accent : null, active };
    });
    return { width: pathWidth, height, cellW, nodes: placed, segments };
  }, [pathWidth, partLevels, range, progress, topic]);

  /* ──── skill check view ─────────────────────────────────────────────── */
  if (skillCheckOpen) {
    return (
      <SkillCheckRunner
        lang={lang}
        onCancel={() => setSkillCheckOpen(false)}
        onFinished={onSkillCheckFinished}
        t={t}
      />
    );
  }

  /* ──── lesson view ──────────────────────────────────────────────────── */
  if (active !== null) {
    if (loadingLesson) {
      return <QuoteLoader quote={t('quiz.loadingQuote')} label={t('common.loading')} />;
    }
    if (lessonError || !playable) {
      return <LessonError message={lessonError ?? t('roadmap.error')} onRetry={() => open(active)} onExit={exitLesson} t={t} />;
    }
    const next = nextAfter(active, ranges);
    const nextLabel = !next
      ? ''
      : next.kind === 'test'
        ? t('roadmap.toCheckpoint')
        : active.kind === 'test'
          ? t('roadmap.nextPart')
          : t('roadmap.nextLevel');
    return (
      <LessonRunner
        key={`${topic}-${active.kind}-${active.ref}`}
        playable={playable}
        topicColor={topicColor}
        hasNext={!!next}
        nextLabel={nextLabel}
        onExit={exitLesson}
        onFinished={handleFinished}
        onNext={() => next && openNext(next)}
        t={t}
        lang={lang}
      />
    );
  }

  /* ──── map view ─────────────────────────────────────────────────────── */
  const partDone = range ? partPassedLevels(progress, topic, range) : 0;
  const topicComplete = ranges.length > 0 && ranges.every((r) => isPartTestPassed(progress, topic, r.part));

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <Heading level={1} justify="center">{t('roadmap.title')}</Heading>
        <div style={{ marginTop: 4 }}>
          <Text type="supporting" color="secondary">{t('roadmap.subtitle')}</Text>
        </div>
      </div>

      {/* Skill check entry point — quick exit ramp for experienced learners. */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
        <button
          type="button"
          className="rm-skillcheck-cta"
          onClick={() => setSkillCheckOpen(true)}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span aria-hidden>⚡️</span>
            <span>{t('roadmap.skillCheckCta')}</span>
          </span>
          <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
            {t('roadmap.skillCheckSubtitle')}
          </span>
        </button>
      </div>

      {/* Topic selector — locked topics stay visible (dimmed + lock icon) so the
          path from starter → expert is legible without overwhelming. */}
      {/* Radiogroup semantics (not tabs — there is no tabpanel wiring), so AT
          announces "N of M selected" correctly. */}
      {/* Only unlocked topics appear — locked ones are hidden entirely, so
          the strip stays focused on what the learner can actually start. */}
      <div role="radiogroup" aria-label={t('roadmap.topicsAria')} style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        {TOPICS.filter(isUnlocked).map((value) => {
          const selected = topic === value;
          const color = getCategoryHexColor(value);
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              className="rm-topic-pill"
              data-selected={selected}
              onClick={() => selectTopic(value)}
              style={{ ['--rm-accent']: color, ['--rm-on-accent']: onCategoryColorText(value) } as CSSProperties}
            >
              {getCategoryLabel(value)}
            </button>
          );
        })}
      </div>

      {loadingStructure ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 24, marginTop: 16 }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} width={64} height={64} radius="rounded" index={i} />
          ))}
        </div>
      ) : structureError ? (
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <div style={{ marginBottom: 16, color: '#dc2626' }} role="alert">{structureError}</div>
          <AxButton variant="secondary" label={t('roadmap.retry')} onClick={() => structureQuery.refetch()} />
        </div>
      ) : (
        <>
          {/* Part selector — the topic is split into PARTS_PER_TOPIC shorter
              paths, each ending with a test; only one part shows at a time. */}
          <div role="radiogroup" aria-label={t('roadmap.partsAria')} style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
            {ranges.map((r) => {
              const status = pathStatus(progress, topic, ranges, r.part, extraUnlocksSet);
              const locked = status === 'locked';
              const selected = r.part === safePart;
              return (
                <Tooltip key={r.part} content={t('roadmap.partLockedHint', { n: r.part - 1 })} placement="above" isEnabled={locked}>
                  <span style={{ display: 'inline-flex' }}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={locked}
                      className="rm-part-pill"
                      data-selected={selected}
                      data-locked={locked}
                      data-complete={status === 'complete'}
                      onClick={() => selectPart(r.part)}
                      style={{ ['--rm-accent']: topicColor, ['--rm-on-accent']: onCategoryColorText(topic) } as CSSProperties}
                    >
                      {locked ? <LockIcon size={12} /> : status === 'complete' ? <CheckIcon size={14} /> : null}
                      {t('roadmap.partLabel', { n: r.part })}
                    </button>
                  </span>
                </Tooltip>
              );
            })}
          </div>

          {/* Current-part progress */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text type="supporting" color="secondary" weight="bold">
                {getCategoryLabel(topic)} · {t('roadmap.partLabel', { n: safePart })}
              </Text>
              <Text type="supporting" color="secondary">
                {t('roadmap.progress', { done: partDone, total: range?.size ?? 0 })}
              </Text>
            </div>
            <div
              role="progressbar"
              aria-label={t('roadmap.progress', { done: partDone, total: range?.size ?? 0 })}
              aria-valuenow={Math.round(range && range.size ? (partDone / range.size) * 100 : 0)}
              aria-valuemin={0}
              aria-valuemax={100}
              style={{ height: 8, borderRadius: 4, backgroundColor: 'var(--color-background-muted)', overflow: 'hidden' }}
            >
              <div style={{ height: '100%', width: `${range && range.size ? (partDone / range.size) * 100 : 0}%`, backgroundColor: topicColor, borderRadius: 4, transition: 'width 0.5s ease' }} />
            </div>
          </div>

          {/* The path — a serpentine ribbon flowing left→right and gently down,
              then wrapping back, drawn through node centres with an SVG. */}
          <div ref={pathRef} style={{ position: 'relative', width: '100%', ...(layout ? { height: layout.height } : { minHeight: 220 }) }}>
            {layout && (
              <>
                <svg
                  aria-hidden
                  width={layout.width}
                  height={layout.height}
                  style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible', pointerEvents: 'none' }}
                >
                  {layout.segments.map((s, i) => (
                    <line
                      key={i}
                      x1={s.x1}
                      y1={s.y1}
                      x2={s.x2}
                      y2={s.y2}
                      strokeWidth={7}
                      strokeLinecap="round"
                      className={s.active ? 'rm-flow' : undefined}
                      strokeDasharray={s.active ? '0.1 14' : undefined}
                      style={{ stroke: s.color ?? 'var(--color-border)' }}
                    />
                  ))}
                </svg>
                {layout.nodes.map((n) => (
                  <div
                    key={n.key}
                    style={{ position: 'absolute', transform: 'translateX(-50%)', left: n.cx, top: n.cy - n.half }}
                  >
                    <div className="rm-node" style={{ animationDelay: `${n.i * 0.025}s` }}>
                      {n.kind === 'test' ? (
                        <PartTestNode
                          part={n.part!}
                          range={n.range!}
                          accent={n.accent}
                          grad={n.grad}
                          unlocked={n.unlocked}
                          passed={n.passed}
                          best={n.best}
                          isCurrent={n.isCurrent}
                          cellW={layout.cellW}
                          onClick={() => open({ kind: 'test', ref: n.part! })}
                          t={t}
                        />
                      ) : (
                        <LevelNode
                          meta={n.level!}
                          displayNum={n.displayNum!}
                          accent={n.accent}
                          grad={n.grad}
                          unlocked={n.unlocked}
                          passed={n.passed}
                          best={n.best}
                          isCurrent={n.isCurrent}
                          cellW={layout.cellW}
                          onClick={() => open({ kind: 'level', ref: n.level!.level })}
                          t={t}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {topicComplete && (
            <div style={{ textAlign: 'center', marginTop: 24, fontWeight: 800, color: topicColor }}>
              {t('roadmap.allDone')}
            </div>
          )}
        </>
      )}

      <AppToast
        open={!!unlockSnack}
        onClose={() => setUnlockSnack(null)}
        message={unlockSnack ?? ''}
        autoHideDuration={4500}
      />
    </div>
  );
}

/* ──── level node ───────────────────────────────────────────────────────── */

function LevelNode({
  meta, displayNum, accent, grad, unlocked, passed, best, isCurrent, onClick, t, cellW,
}: {
  meta: RoadmapLevelMeta; displayNum: number; accent: string; grad: [string, string];
  unlocked: boolean; passed: boolean; best: number; isCurrent: boolean;
  onClick: () => void; t: TFn; cellW: number;
}) {
  const stars = passed ? starsFor(best, 75) : 0;
  // Within a shown part levels gate sequentially; the first level of a part is
  // gated by the previous part's test at the part selector, never here.
  const lockedHint = t('roadmap.lockedHint');
  const label = unlocked
    ? `${t('roadmap.levelLabel', { n: displayNum })}: ${meta.title}${passed ? `, ${t('roadmap.passed')} ${best}%` : ''}`
    : `${t('roadmap.levelLabel', { n: displayNum })}: ${t('roadmap.locked')}`;
  const labelWidth = Math.max(72, Math.min(150, cellW - 10));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div className={isCurrent ? 'rm-bob' : undefined}>
        {/* span wrapper: disabled buttons swallow pointer events, so the
            locked-hint tooltip needs an enabled element to attach to. */}
        <Tooltip content={lockedHint} placement="above" isEnabled={!unlocked}>
          <span style={{ display: 'inline-block' }}>
          <button
            type="button"
            className={unlocked ? 'rm-level-btn' : undefined}
            onClick={unlocked ? onClick : undefined}
            disabled={!unlocked}
            aria-label={label}
            style={{
              position: 'relative', width: 64, height: 64, borderRadius: '50%',
              border: `3px solid ${passed || isCurrent ? accent : 'var(--color-border)'}`,
              background: passed ? `linear-gradient(160deg, ${grad[0]}, ${grad[1]})` : 'var(--color-background-surface)',
              color: passed ? '#fff' : unlocked ? accent : 'var(--color-text-disabled)',
              cursor: unlocked ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.25rem',
              // Duolingo-style raised "bubble": a solid darker lip beneath the node.
              boxShadow: passed
                ? `0 5px 0 ${grad[1]}, 0 9px 16px ${accent}55`
                : unlocked
                  ? `0 5px 0 ${accent}, 0 9px 16px ${accent}33`
                  : 'none',
              transition: 'transform 0.14s ease, box-shadow 0.2s ease',
              fontFamily: 'inherit',
            }}
          >
            {passed ? <CheckIcon /> : unlocked ? displayNum : <LockIcon />}
            {passed && (
              <span style={{ position: 'absolute', bottom: -9, display: 'flex', color: '#ffc400', filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.25))', backgroundColor: 'var(--color-background-surface)', borderRadius: 999, padding: '0 2px' }}>
                {[0, 1, 2].map((s) => <StarIcon key={s} filled={s < stars} />)}
              </span>
            )}
          </button>
          </span>
        </Tooltip>
      </div>
      <div
        style={{
          fontSize: '0.75rem',
          fontWeight: isCurrent ? 700 : 500,
          color: unlocked ? 'var(--color-text-primary)' : 'var(--color-text-disabled)',
          maxWidth: labelWidth,
          textAlign: 'center',
          lineHeight: 1.15,
          // Clamp to two lines so long titles don't overflow narrow columns.
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {meta.title}
      </div>
      {isCurrent && (
        <span style={{ height: 20, lineHeight: '20px', padding: '0 8px', fontSize: '0.65rem', fontWeight: 800, color: '#fff', borderRadius: 999, background: `linear-gradient(160deg, ${grad[0]}, ${grad[1]})` }}>{t('roadmap.start')}</span>
      )}
    </div>
  );
}

/* ──── part-test (boss) node ────────────────────────────────────────────── */

function PartTestNode({
  part, range, accent, grad, unlocked, passed, best, isCurrent, onClick, t, cellW,
}: {
  part: number; range: PartRange; accent: string; grad: [string, string];
  unlocked: boolean; passed: boolean; best: number; isCurrent: boolean;
  onClick: () => void; t: TFn; cellW: number;
}) {
  const title = t('roadmap.partTestTitle', { n: part });
  const label = unlocked
    ? `${title}${passed ? ` — ${t('roadmap.passed')} ${best}%` : ''}`
    : `${title}: ${t('roadmap.locked')}`;
  const labelWidth = Math.max(84, Math.min(160, cellW - 8));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div className={isCurrent ? 'rm-bob' : undefined}>
        <Tooltip content={t('roadmap.checkpointLocked', { from: range.startLevel, to: range.endLevel })} placement="above" isEnabled={!unlocked}>
          <span style={{ display: 'inline-block' }}>
          <button
            type="button"
            className={`${unlocked ? 'rm-test-btn' : ''}${isCurrent ? ' rm-shimmer' : ''}`.trim() || undefined}
            onClick={unlocked ? onClick : undefined}
            disabled={!unlocked}
            aria-label={label}
            style={{
              position: 'relative', width: 84, height: 84, borderRadius: '24px',
              border: `3px solid ${passed || isCurrent ? accent : 'var(--color-border)'}`,
              background: passed
                ? `linear-gradient(150deg, ${grad[0]}, ${grad[1]})`
                : unlocked
                  ? `linear-gradient(150deg, ${grad[0]}38, ${grad[1]}24)`
                  : 'var(--color-background-surface)',
              color: passed ? '#3a2c00' : unlocked ? accent : 'var(--color-text-disabled)',
              cursor: unlocked ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              // Raised "bubble" lip beneath the boss node.
              boxShadow: passed
                ? `0 6px 0 ${grad[1]}, 0 10px 20px ${accent}55`
                : unlocked
                  ? `0 6px 0 ${accent}, 0 10px 20px ${accent}44`
                  : 'none',
              transition: 'transform 0.14s ease, box-shadow 0.2s ease',
              fontFamily: 'inherit',
            }}
          >
            {passed ? <CheckIcon size={30} /> : unlocked ? <TrophyIcon /> : <LockIcon size={22} />}
          </button>
          </span>
        </Tooltip>
      </div>
      <div
        style={{
          fontSize: '0.75rem',
          fontWeight: 700,
          color: unlocked ? 'var(--color-text-primary)' : 'var(--color-text-disabled)',
          textAlign: 'center',
          lineHeight: 1.15,
          maxWidth: labelWidth,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {title}
      </div>
    </div>
  );
}

/* ──── lesson runner (instant feedback) ─────────────────────────────────── */

const HEART_PATH =
  'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';

const HeartShape = ({ color, style }: { color: string; style?: CSSProperties }) => (
  <svg width="30" height="30" viewBox="0 0 24 24" style={style} aria-hidden>
    <path fill={color} d={HEART_PATH} />
  </svg>
);

// A single heart that drains a third per mistake. The red fill is anchored to the
// bottom and clipped to the remaining fraction, so it empties from the top down.
function HeartMeter({ mistakes, max, hit, t }: { mistakes: number; max: number; hit: boolean; t: TFn }) {
  const remaining = Math.max(0, max - mistakes);
  const frac = remaining / max;
  return (
    <div
      className={hit ? 'rm-shake' : undefined}
      role="img"
      aria-label={t('roadmap.heartsLeft', { n: remaining, max })}
      style={{ position: 'relative', width: 30, height: 30, flexShrink: 0 }}
    >
      <HeartShape color={`${HEART_COLOR}2e`} style={{ position: 'absolute', inset: 0 }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: `${frac * 100}%`, overflow: 'hidden', transition: 'height 0.45s cubic-bezier(0.34, 1.3, 0.5, 1)' }}>
        <HeartShape color={HEART_COLOR} style={{ position: 'absolute', bottom: 0, left: 0 }} />
      </div>
    </div>
  );
}

function LessonRunner({
  playable, topicColor, hasNext, nextLabel, onExit, onFinished, onNext, t, lang,
}: {
  playable: RoadmapPlayable; topicColor: string; hasNext: boolean; nextLabel: string;
  onExit: () => void; onFinished: (pct: number) => void; onNext: () => void; t: TFn; lang: string;
}) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const isCheckpoint = playable.kind === 'checkpoint';
  const accent = isCheckpoint ? CHECKPOINT_GOLD : topicColor;
  // A level opens with a short info panel (what this section is about + a core
  // principle) before the first question. Checkpoints/part-tests skip it, as do
  // levels with no authored intro.
  const intro = playable.kind === 'level' ? levelIntro(playable.topic, playable.ref, lang) : null;
  const [showIntro, setShowIntro] = useState<boolean>(() => !!intro);
  // Question sequence + answer order are shuffled on every play (and re-shuffled
  // on replay, avoiding the previous layout) so positions stay unmemorisable.
  const [presented, setPresented] = useState<RoadmapQuestion[]>(() => presentQuestions(playable.questions));
  const total = presented.length;
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  // Hearts apply to levels only; checkpoints keep the percent-based pass rule.
  const [mistakes, setMistakes] = useState(0);
  const [dead, setDead] = useState(false);
  const [heartHit, setHeartHit] = useState(false);
  const [flagOpen, setFlagOpen] = useState(false);
  const [flagSnack, setFlagSnack] = useState(false);

  const question = presented[qIndex];
  // Out of hearts once this answer is revealed and it pushed mistakes to the max.
  const outOfHearts = !isCheckpoint && mistakes >= MAX_HEARTS;

  const choose = useCallback(
    (index: number) => {
      if (revealed) return;
      setSelected(index);
      setRevealed(true);
      if (index === question.correctAnswer) {
        setCorrectCount((c) => c + 1);
      } else if (!isCheckpoint) {
        setMistakes((m) => m + 1);
        setHeartHit(true);
        window.setTimeout(() => setHeartHit(false), 500);
      }
    },
    [revealed, question, isCheckpoint],
  );

  const advance = useCallback(() => {
    const pct = Math.round((correctCount / total) * 100);
    if (outOfHearts) {
      onFinished(pct);
      setDead(true);
      setFinished(true);
    } else if (qIndex < total - 1) {
      setQIndex((i) => i + 1);
      setSelected(null);
      setRevealed(false);
    } else {
      onFinished(pct);
      setFinished(true);
    }
  }, [correctCount, total, outOfHearts, qIndex, onFinished]);

  const replay = () => {
    // Re-shuffle, avoiding the layout just played, so the retry isn't identical.
    setPresented((prev) => presentQuestions(playable.questions, prev));
    setFinished(false);
    setDead(false);
    setMistakes(0);
    setQIndex(0);
    setSelected(null);
    setRevealed(false);
    setCorrectCount(0);
  };

  const submitFlag = async (detail?: string) => {
    await reportQuestion({ questionId: question.id, reason: 'needs-review', detail, reporterSub: user?.id });
    setFlagOpen(false);
    setFlagSnack(true);
  };

  useEffect(() => {
    if (finished || showIntro) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (!revealed && /^[1-9]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (idx < question.options.length) {
          e.preventDefault();
          choose(idx);
        }
      } else if (revealed && e.key === 'Enter') {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [finished, showIntro, revealed, question, choose, advance]);

  if (showIntro && intro) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <AxButton isIconOnly icon={<span aria-hidden>✕</span>} variant="ghost" size="sm" label={t('roadmap.exit')} onClick={onExit} />
          <div style={{ flex: 1 }} />
        </div>
        <div
          className="rm-feedback"
          style={{
            marginTop: 8,
            padding: isMobile ? 20 : 24,
            borderRadius: 8,
            border: '1px solid var(--color-border)',
            borderLeft: `4px solid ${accent}`,
            backgroundColor: `${accent}0d`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, backgroundColor: `${accent}22`, color: 'var(--color-text-primary)', borderRadius: 999, padding: '2px 10px', fontSize: '0.8125rem', display: 'inline-block' }}>
              {`${t('roadmap.levelLabel', { n: playable.ref })} · ${playable.title}`}
            </span>
          </div>
          <div style={{ color: 'var(--color-text-secondary)', fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', fontSize: '0.75rem' }}>
            {t('roadmap.introKicker')}
          </div>
          <div style={{ fontSize: '1.02rem', lineHeight: 1.6, marginTop: 4, marginBottom: 4 }}>
            {intro}
          </div>
        </div>
        <button
          type="button"
          className="rm-accent-btn"
          onClick={() => setShowIntro(false)}
          style={{ marginTop: 20, width: '100%', backgroundColor: accent }}
        >
          {t('roadmap.introStart')}
        </button>
      </div>
    );
  }

  if (finished) {
    const pct = Math.round((correctCount / total) * 100);
    const passed = !dead && pct >= playable.passPct;
    const emoji = dead ? '💔' : passed ? (isCheckpoint ? '🏆' : '🎉') : '💪';
    const title = dead
      ? t('roadmap.outOfHeartsTitle')
      : passed
        ? isCheckpoint ? t('roadmap.checkpointComplete') : t('roadmap.levelComplete')
        : isCheckpoint ? t('roadmap.checkpointFailed') : t('roadmap.levelFailed');
    return (
      // Center vertically in the lesson viewport (celebration deserves the
      // stage). The mount `key` on SplitText forces a re-play whenever the
      // learner replays the lesson.
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          maxWidth: 520,
          margin: '0 auto',
          position: 'relative',
          paddingLeft: 16,
          paddingRight: 16,
        }}
      >
        {passed && <Confetti color={accent} />}
        <div className="rm-celebrate" style={{ fontSize: '3.5rem', lineHeight: 1, marginBottom: 8 }} aria-hidden>
          {emoji}
        </div>
        <SplitText
          as="h2"
          text={title}
          className="rm-finish-title"
        />
        {dead ? (
          <div style={{ color: 'var(--color-text-secondary)', marginBottom: 16 }}>
            {t('roadmap.outOfHeartsBody', { max: MAX_HEARTS })}
          </div>
        ) : (
          <>
            <div className="rm-count" style={{ fontSize: '3rem', lineHeight: 1.1, fontWeight: 800, color: passed ? accent : 'var(--color-text-secondary)', marginBottom: 4 }}>
              {pct}%
            </div>
            <div style={{ color: 'var(--color-text-secondary)', marginBottom: 8 }}>
              {t('roadmap.scoreLine', { correct: correctCount, total })}
            </div>
            {!passed && (
              <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: 16 }}>
                {t('roadmap.passNeeded', { pct: playable.passPct })}
              </div>
            )}
          </>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
          {passed && hasNext && (
            <button type="button" className="rm-accent-btn" onClick={onNext} style={{ backgroundColor: accent }}>
              {nextLabel}
            </button>
          )}
          <button type="button" className={passed ? 'rm-outline-btn' : 'rm-accent-btn'} onClick={replay} style={passed ? undefined : { backgroundColor: accent }}>
            {t('roadmap.retryLevel')}
          </button>
          <button type="button" className="rm-text-btn" onClick={onExit}>
            {t('roadmap.backToPath')}
          </button>
        </div>
      </div>
    );
  }

  const progressPct = ((qIndex + (revealed ? 1 : 0)) / total) * 100;
  const isRight = selected === question.correctAnswer;

  return (
    // One-viewport lesson layout matching the Quiz card geometry: 560px
    // column, content capped at ~80% height on sm+ and centred; question
    // scrolls, answer options anchored toward the bottom in a stable position.
    <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', width: '100%', maxWidth: isMobile ? 680 : 560, margin: '0 auto' }}>
    <div style={{ flex: '1 1 auto', minHeight: 0, maxHeight: isMobile ? undefined : '80%', display: 'flex', flexDirection: 'column' }}>
      {/* Header: exit + (hearts for a level, progress bar for a checkpoint) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexShrink: 0 }}>
        <AxButton isIconOnly icon={<span aria-hidden>✕</span>} variant="ghost" size="sm" label={t('roadmap.exit')} onClick={onExit} />
        {isCheckpoint ? (
          <>
            <div
              role="progressbar"
              aria-label={t('roadmap.question', { current: qIndex + 1, total })}
              aria-valuenow={Math.round(progressPct)}
              aria-valuemin={0}
              aria-valuemax={100}
              style={{ flex: 1, height: 12, borderRadius: 6, backgroundColor: 'var(--color-background-muted)', overflow: 'hidden' }}
            >
              <div style={{ height: '100%', width: `${progressPct}%`, borderRadius: 6, backgroundColor: accent, transition: 'width 0.35s ease' }} />
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
              {correctCount}/{total}
            </span>
          </>
        ) : (
          <>
            <HeartMeter mistakes={mistakes} max={MAX_HEARTS} hit={heartHit} t={t} />
            <div style={{ flex: 1 }} />
          </>
        )}
        <IconButton
          label={t('flag.ariaLabel')}
          icon={<span aria-hidden>🚩</span>}
          variant="ghost"
          size="sm"
          tooltip={t('flag.ariaLabel')}
          onClick={() => setFlagOpen(true)}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap', flexShrink: 0 }}>
        <span style={{ fontWeight: 700, backgroundColor: `${accent}22`, color: 'var(--color-text-primary)', borderRadius: 999, padding: '2px 10px', fontSize: '0.8125rem', display: 'inline-block' }}>
          {`${isCheckpoint ? t('roadmap.checkpoint') : t('roadmap.levelLabel', { n: playable.ref })} · ${playable.title}`}
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginLeft: 'auto' }}>
          {t('roadmap.question', { current: qIndex + 1, total })}
        </span>
      </div>

      {/* Question — the only region that scrolls when long. */}
      <div id="lesson-question" style={{ fontWeight: 500, marginBottom: 16, flex: '1 1 auto', minHeight: 0, overflowY: 'auto' }}>
        {renderQuestion(question.question)}
      </div>

      {/* Options — anchored toward the bottom, labelled by the question. */}
      <div role="group" aria-labelledby="lesson-question" style={{ display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0, marginTop: 'auto', marginBottom: isMobile ? 50 : 0 }}>
        {question.options.map((option, index) => {
          const isCorrect = index === question.correctAnswer;
          const isPicked = index === selected;
          const overrides: CSSProperties = {};
          let cls: string | undefined;
          if (revealed && isCorrect) {
            overrides.borderColor = '#2e7d32'; overrides.backgroundColor = 'rgba(46,125,50,0.12)'; overrides.color = '#2e7d32'; cls = 'rm-correct-pop';
          } else if (revealed && isPicked && !isCorrect) {
            overrides.borderColor = '#c62828'; overrides.backgroundColor = 'rgba(198,40,40,0.12)'; overrides.color = '#c62828'; cls = 'rm-shake';
          } else if (isPicked) {
            overrides.borderColor = accent;
          }
          return (
            <button
              key={index}
              type="button"
              className={`rm-option${cls ? ` ${cls}` : ''}`}
              onClick={() => choose(index)}
              disabled={revealed}
              aria-pressed={isPicked}
              style={{ ['--rm-accent']: accent, ...overrides } as CSSProperties}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 4, fontSize: '0.75rem', fontWeight: 800, backgroundColor: 'var(--color-background-muted)', color: 'var(--color-text-secondary)', flexShrink: 0 }}>
                {index + 1}
              </span>
              <span style={{ flex: 1 }}>{option}</span>
              {revealed && isCorrect && <span style={{ color: '#2e7d32', display: 'inline-flex' }}><CheckIcon size={18} /></span>}
            </button>
          );
        })}
      </div>

      {!revealed && (
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: isMobile ? 'none' : 'block', marginTop: 12, flexShrink: 0 }}>
          {t('roadmap.keyboardTip', { max: question.options.length })}
        </div>
      )}

      {/* Feedback OVERLAYS the answer options — a solid card floating over
          the bottom of the lesson viewport, so the anchored options don't get
          shoved around when the grade lands. Live region keeps AT informed. */}
      {revealed && (
        <div
          aria-live="polite"
          style={{
            position: 'absolute',
            left: isMobile ? 8 : 16,
            right: isMobile ? 8 : 16,
            bottom: isMobile ? 12 : 20,
            zIndex: 5,
          }}
        >
          <div
            className="rm-feedback"
            style={{
              padding: 16,
              borderRadius: 8,
              borderLeft: `4px solid ${isRight ? '#1b5e20' : '#c62828'}`,
              backgroundColor: 'var(--color-background-surface)',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.35)',
              maxHeight: '48vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ fontWeight: 800, color: isRight ? '#1b5e20' : '#c62828', marginBottom: 4 }}>
              {isRight ? t('roadmap.correct') : t('roadmap.incorrect')}
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
              {question.explanation}
            </div>
            <button
              type="button"
              className="rm-accent-btn"
              onClick={advance}
              style={{ marginTop: 16, width: '100%', backgroundColor: accent }}
            >
              {outOfHearts ? t('roadmap.seeResult') : qIndex < total - 1 ? t('roadmap.continue') : t('roadmap.finish')}
            </button>
          </div>
        </div>
      )}

      <RedFlagDialog open={flagOpen} onClose={() => setFlagOpen(false)} onSubmit={submitFlag} />
      <AppToast
        open={flagSnack}
        onClose={() => setFlagSnack(false)}
        message={t('flag.sent')}
        autoHideDuration={3000}
      />
    </div>
    </div>
  );
}

/* ──── confetti burst ───────────────────────────────────────────────────── */

function Confetti({ color }: { color: string }) {
  const colors = [color, '#f5b301', '#2e7d32', '#3178c6', '#ec4899'];
  return (
    <div className="rm-confetti" aria-hidden>
      {Array.from({ length: 16 }).map((_, i) => (
        <i
          key={i}
          style={{
            left: `${(i / 16) * 100}%`,
            background: colors[i % colors.length],
            animationDelay: `${(i % 5) * 0.08}s`,
          }}
        />
      ))}
    </div>
  );
}

function LessonError({ message, onRetry, onExit, t }: { message: string; onRetry: () => void; onExit: () => void; t: TFn }) {
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center', marginTop: 32 }}>
      <div style={{ color: '#dc2626', marginBottom: 16 }} role="alert">{message}</div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <AxButton variant="primary" label={t('roadmap.retry')} onClick={onRetry} />
        <AxButton variant="secondary" label={t('roadmap.backToPath')} onClick={onExit} />
      </div>
    </div>
  );
}

/* ──── skill-check runner ───────────────────────────────────────────────── */

type SkillPhase = 'intro' | 'loading' | 'playing' | 'submitting' | 'result' | 'error';

function SkillCheckRunner({
  lang,
  onCancel,
  onFinished,
  t,
}: {
  lang: string;
  onCancel: () => void;
  onFinished: (correct: number) => void;
  t: TFn;
}) {
  const [phase, setPhase] = useState<SkillPhase>('intro');
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [correct, setCorrect] = useState(0);

  const start = useCallback(async () => {
    setPhase('loading');
    setError(null);
    const startedAt = Date.now();
    try {
      const batch = await fetchChallengeBatch({ lang });
      const trimmed = batch.questions.slice(0, ASSESSMENT_QUESTION_COUNT);
      if (trimmed.length === 0) throw new Error('No questions available');
      await holdLoadingScreen(startedAt);
      setSessionId(batch.sessionId);
      setQuestions(trimmed);
      setAnswers({});
      setQIndex(0);
      setPhase('playing');
    } catch (err) {
      setError(friendlyError(err));
      setPhase('error');
    }
  }, [lang]);

  const total = questions.length;
  const current = questions[qIndex];

  const handlePick = (idx: number) => {
    if (!current) return;
    setAnswers((prev) => ({ ...prev, [current.id]: idx }));
  };

  const goNext = () => {
    if (qIndex < total - 1) setQIndex((i) => i + 1);
  };

  const finish = useCallback(async () => {
    if (!sessionId) return;
    setPhase('submitting');
    setError(null);
    try {
      const res = await apiFetch<{ correctAnswers: number }>('/api/quiz/submit', {
        method: 'POST',
        body: JSON.stringify({ sessionId, answers, lang }),
      });
      setCorrect(res.correctAnswers);
      setPhase('result');
    } catch (err) {
      setError(friendlyError(err));
      setPhase('error');
    }
  }, [sessionId, answers, lang]);

  const answered = current ? answers[current.id] != null : false;
  const allAnswered = total > 0 && questions.every((q) => answers[q.id] != null);

  if (phase === 'intro') {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center', marginTop: 16 }}>
        <Heading level={2} justify="center">{t('roadmap.skillCheckTitle')}</Heading>
        <div style={{ marginTop: 8 }}>
          <Text color="secondary">{t('roadmap.skillCheckIntro')}</Text>
        </div>
        <div style={{ marginTop: 12, marginBottom: 24 }}>
          <Text type="supporting" color="secondary">{t('roadmap.skillCheckBands')}</Text>
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <AxButton variant="primary" label={t('roadmap.skillCheckStart')} onClick={() => void start()} />
          <AxButton variant="secondary" label={t('roadmap.skillCheckCancel')} onClick={onCancel} />
        </div>
      </div>
    );
  }

  if (phase === 'loading' || phase === 'submitting') {
    return <QuoteLoader quote={t('quiz.loadingQuote')} label={t('roadmap.skillCheckLoading')} />;
  }

  if (phase === 'error') {
    return (
      <LessonError
        message={error ?? t('roadmap.error')}
        onRetry={() => void start()}
        onExit={onCancel}
        t={t}
      />
    );
  }

  if (phase === 'result') {
    const tier =
      correct >= 18
        ? 'roadmap.skillCheckPerfect'
        : correct >= 14
          ? 'roadmap.skillCheckSolid'
          : correct >= 10
            ? 'roadmap.skillCheckSome'
            : 'roadmap.skillCheckLow';
    return (
      <div style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center', marginTop: 16 }}>
        <div style={{ fontSize: '3.5rem', lineHeight: 1, marginBottom: 8 }} aria-hidden>
          ⚡️
        </div>
        <Heading level={2} justify="center">{t('roadmap.skillCheckResult', { correct, total })}</Heading>
        <div style={{ marginTop: 8, marginBottom: 24 }}>
          <Text color="secondary">{t(tier as TranslationKey)}</Text>
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <AxButton variant="primary" label={t('roadmap.skillCheckBack')} onClick={() => onFinished(correct)} />
          <AxButton variant="secondary" label={t('roadmap.skillCheckRetry')} onClick={() => void start()} />
        </div>
      </div>
    );
  }

  /* ── playing ── */
  if (!current) return null;
  const progressPct = ((qIndex + (answered ? 1 : 0)) / total) * 100;
  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <AxButton
          isIconOnly
          icon={<span aria-hidden>✕</span>}
          variant="ghost"
          size="sm"
          label={t('roadmap.skillCheckCancel')}
          onClick={onCancel}
        />
        <div style={{ flex: 1 }}>
          <ProgressBar
            label={t('roadmap.skillCheckQuestion', { current: qIndex + 1, total })}
            value={progressPct}
            isLabelHidden
            variant="accent"
          />
        </div>
        <Text type="supporting" color="secondary" weight="bold">
          {qIndex + 1}/{total}
        </Text>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <span
          style={{
            backgroundColor: getCategoryHexColor(current.category),
            color: onCategoryColorText(current.category),
            fontWeight: 600,
            borderRadius: 999,
            padding: '2px 10px',
            fontSize: '0.8125rem',
            display: 'inline-block',
          }}
        >
          {getCategoryLabel(current.category)}
        </span>
        <Badge variant="neutral" label={`Lvl ${current.difficulty}`} />
        <div style={{ marginLeft: 'auto' }}>
          <Text type="supporting" color="secondary">
            {t('roadmap.skillCheckQuestion', { current: qIndex + 1, total })}
          </Text>
        </div>
      </div>

      <div id="skillcheck-question" style={{ fontWeight: 500, marginBottom: 16 }}>{renderQuestion(current.question)}</div>

      <div role="group" aria-labelledby="skillcheck-question" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {current.options.map((option, idx) => {
          const picked = answers[current.id] === idx;
          return (
            <button
              key={idx}
              type="button"
              className="rm-option"
              onClick={() => handlePick(idx)}
              aria-pressed={picked}
              style={{
                ['--rm-accent']: 'var(--brand-accent)',
                ...(picked ? { borderColor: 'var(--brand-accent)', backgroundColor: 'rgba(45,122,45,0.07)' } : {}),
              } as CSSProperties}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 24,
                  height: 24,
                  borderRadius: 4,
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  backgroundColor: 'var(--color-background-muted)',
                  color: 'var(--color-text-secondary)',
                  flexShrink: 0,
                }}
              >
                {idx + 1}
              </span>
              <span style={{ flex: 1 }}>{option}</span>
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
        <AxButton variant="ghost" label={t('roadmap.skillCheckCancel')} onClick={onCancel} />
        {qIndex < total - 1 ? (
          <AxButton variant="primary" label={t('roadmap.skillCheckNext')} onClick={goNext} isDisabled={!answered} />
        ) : (
          <AxButton variant="primary" label={t('roadmap.skillCheckFinish')} onClick={() => void finish()} isDisabled={!allAnswered} />
        )}
      </div>
    </div>
  );
}

export default Roadmap;
