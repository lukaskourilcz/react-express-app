import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Box, Typography, Button, LinearProgress, Chip, Skeleton, Tooltip, IconButton, Snackbar, useTheme, CircularProgress } from '@mui/material';
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
  topicUnlockHint,
  unlockExtraTopics,
  useExtraUnlocks,
  getExtraUnlocks,
  topicsFromAssessment,
  ASSESSMENT_QUESTION_COUNT,
  type PartRange,
} from '../lib/roadmap';
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
import { RedFlagDialog } from './RedFlagDialog';
import './Roadmap.css';

type TFn = (key: TranslationKey, vars?: Record<string, string | number>) => string;
// `ref` is the GLOBAL level number for a level, or the part number for a test.
type Active = { kind: 'level' | 'test'; ref: number };

const TOPICS: RoadmapTopic[] = [
  'javascript', 'typescript', 'react', 'nextjs', 'nodejs',
  'html', 'css', 'git', 'dsa', 'algorithms',
  'abbreviations', 'general', 'ai', 'rhf-zod', 'cool-stuff',
  'databases', 'system-design', 'testing', 'devops', 'security',
];
const TOPIC_KEY = 'devquiz:roadmap:topic';
const PART_KEY = 'devquiz:roadmap:part';
const CHECKPOINT_GOLD = '#ffb300';
// Lives for a level lesson: one heart that drains a third per wrong answer.
const MAX_HEARTS = 3;
const HEART_COLOR = '#ff4b6e';
const CHECKPOINT_GRAD: [string, string] = ['#ffd54f', '#f5a623'];

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
  const theme = useTheme();
  const [pathRef, pathWidth] = useElementWidth<HTMLDivElement>();

  // Roadmap structure via TanStack Query — cached + de-duped with the /roadmap
  // tree, cancellable, with built-in loading/error state and retry.
  const structureQuery = useRoadmapStructure();
  const structure: RoadmapStructure | null = structureQuery.data ?? null;
  const loadingStructure = structureQuery.isPending;
  const structureError = structureQuery.error ? friendlyError(structureQuery.error) : null;
  const [topic, setTopic] = useState<RoadmapTopic>(() => {
    // A deep link from the roadmap tree (/learn?topic=…&part=…) wins over the
    // last-opened topic so clicking a part on the tree lands on that path.
    const fromUrl = new URLSearchParams(window.location.search).get('topic');
    const saved = fromUrl && (TOPICS as string[]).includes(fromUrl) ? fromUrl : readString(TOPIC_KEY);
    const candidate =
      saved && (TOPICS as string[]).includes(saved) ? (saved as RoadmapTopic) : 'javascript';
    // If the saved topic is locked (fresh user, reset progress, etc.) fall back
    // to the always-open starter so the page lands somewhere actionable.
    if (!isTopicUnlocked(getRoadmapProgress(), candidate, new Set(getExtraUnlocks()))) {
      return 'javascript';
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
  const lockedCount = useMemo(
    () => TOPICS.filter((tpc) => !isUnlocked(tpc)).length,
    [isUnlocked],
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
    const req =
      a.kind === 'level'
        ? fetchRoadmapLevel(topic, a.ref, lang, controller.signal)
        : fetchRoadmapPartTest(topic, a.ref, lang, controller.signal);
    req
      .then((data) => {
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
      return (
        <Box sx={{ maxWidth: 640, mx: 'auto' }}>
          <Skeleton variant="text" width="40%" />
          <Skeleton variant="rectangular" height={10} sx={{ my: 2, borderRadius: 1 }} />
          <Skeleton variant="rounded" height={120} sx={{ mb: 2 }} />
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" height={52} sx={{ mb: 1.25 }} />
          ))}
        </Box>
      );
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
      />
    );
  }

  /* ──── map view ─────────────────────────────────────────────────────── */
  const partDone = range ? partPassedLevels(progress, topic, range) : 0;
  const topicComplete = ranges.length > 0 && ranges.every((r) => isPartTestPassed(progress, topic, r.part));

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h5" component="h1" sx={{ fontWeight: 800, textAlign: 'center', mb: 0.5 }}>
        {t('roadmap.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 2 }}>
        {t('roadmap.subtitle')}
      </Typography>

      {/* Skill check entry point — quick exit ramp for experienced learners. */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2.5 }}>
        <Button
          onClick={() => setSkillCheckOpen(true)}
          variant="outlined"
          size="small"
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            borderColor: BRAND.green,
            color: BRAND.green,
            borderRadius: 999,
            px: 2,
            py: 0.6,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.15,
            lineHeight: 1.15,
            '&:hover': { borderColor: BRAND.greenHover, backgroundColor: 'rgba(45,122,45,0.06)' },
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span aria-hidden>⚡️</span>
            <span>{t('roadmap.skillCheckCta')}</span>
          </span>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
            {t('roadmap.skillCheckSubtitle')}
          </Typography>
        </Button>
      </Box>

      {/* Topic selector — locked topics stay visible (dimmed + lock icon) so the
          path from starter → expert is legible without overwhelming. */}
      <Box role="tablist" aria-label={t('roadmap.topicsAria')} sx={{ display: 'flex', gap: 0.75, justifyContent: 'center', mb: 2.5, flexWrap: 'wrap' }}>
        {TOPICS.map((value) => {
          const selected = topic === value;
          const unlocked = isUnlocked(value);
          const color = getCategoryHexColor(value);
          const lockedHint = !unlocked
            ? t('roadmap.topicLockedHint', {
                prereqs: topicUnlockHint(progress, value, getCategoryLabel),
              })
            : '';
          return (
            <Tooltip key={value} title={lockedHint} arrow placement="top" disableHoverListener={unlocked}>
              <Box component="span" sx={{ display: 'inline-flex' }}>
                <Button
                  role="tab"
                  aria-selected={selected}
                  aria-disabled={!unlocked}
                  disabled={!unlocked}
                  onClick={() => selectTopic(value)}
                  startIcon={!unlocked ? <LockIcon size={12} /> : undefined}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.78rem',
                    minWidth: 'auto',
                    px: 1.4,
                    py: 0.4,
                    borderRadius: 999,
                    lineHeight: 1.3,
                    transition: 'all 0.15s ease',
                    color: !unlocked
                      ? 'text.disabled'
                      : selected
                        ? onCategoryColorText(value)
                        : 'text.secondary',
                    backgroundColor: !unlocked
                      ? 'action.hover'
                      : selected
                        ? color
                        : 'background.paper',
                    border: '2px solid',
                    borderColor: !unlocked ? 'divider' : selected ? color : 'divider',
                    opacity: unlocked ? 1 : 0.55,
                    '&:hover': unlocked
                      ? { backgroundColor: selected ? color : 'action.hover', borderColor: color }
                      : undefined,
                    '&.Mui-disabled': { color: 'text.disabled' },
                    '& .MuiButton-startIcon': { mr: 0.5 },
                  }}
                >
                  {getCategoryLabel(value)}
                </Button>
              </Box>
            </Tooltip>
          );
        })}
      </Box>

      {lockedCount > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mb: 2 }}>
          {t('roadmap.lockedCountFooter', { count: lockedCount })}
        </Typography>
      )}

      {loadingStructure ? (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 3, mt: 2 }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} variant="circular" width={64} height={64} />
          ))}
        </Box>
      ) : structureError ? (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography color="error" sx={{ mb: 2 }} role="alert">{structureError}</Typography>
          <Button variant="outlined" onClick={() => structureQuery.refetch()}>{t('roadmap.retry')}</Button>
        </Box>
      ) : (
        <>
          {/* Part selector — the topic is split into PARTS_PER_TOPIC shorter
              paths, each ending with a test; only one part shows at a time. */}
          <Box role="tablist" aria-label={t('roadmap.partsAria')} sx={{ display: 'flex', gap: 1, justifyContent: 'center', mb: 2, flexWrap: 'wrap' }}>
            {ranges.map((r) => {
              const status = pathStatus(progress, topic, ranges, r.part, extraUnlocksSet);
              const locked = status === 'locked';
              const selected = r.part === safePart;
              return (
                <Tooltip key={r.part} title={locked ? t('roadmap.partLockedHint', { n: r.part - 1 }) : ''} arrow placement="top" disableHoverListener={!locked}>
                  <Box component="span" sx={{ display: 'inline-flex' }}>
                    <Button
                      role="tab"
                      aria-selected={selected}
                      disabled={locked}
                      onClick={() => selectPart(r.part)}
                      startIcon={locked ? <LockIcon size={12} /> : status === 'complete' ? <CheckIcon size={14} /> : undefined}
                      sx={{
                        textTransform: 'none', fontWeight: 700, fontSize: '0.8rem', minWidth: 'auto',
                        px: 1.8, py: 0.5, borderRadius: 999, lineHeight: 1.3,
                        color: locked ? 'text.disabled' : selected ? onCategoryColorText(topic) : 'text.secondary',
                        backgroundColor: locked ? 'action.hover' : selected ? topicColor : 'background.paper',
                        border: '2px solid',
                        borderColor: locked ? 'divider' : selected || status === 'complete' ? topicColor : 'divider',
                        opacity: locked ? 0.55 : 1,
                        '&:hover': locked ? undefined : { backgroundColor: selected ? topicColor : 'action.hover', borderColor: topicColor },
                        '&.Mui-disabled': { color: 'text.disabled' },
                        '& .MuiButton-startIcon': { mr: 0.5 },
                      }}
                    >
                      {t('roadmap.partLabel', { n: r.part })}
                    </Button>
                  </Box>
                </Tooltip>
              );
            })}
          </Box>

          {/* Current-part progress */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                {getCategoryLabel(topic)} · {t('roadmap.partLabel', { n: safePart })}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t('roadmap.progress', { done: partDone, total: range?.size ?? 0 })}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={range && range.size ? (partDone / range.size) * 100 : 0}
              aria-label={t('roadmap.progress', { done: partDone, total: range?.size ?? 0 })}
              sx={{ height: 8, borderRadius: 4, backgroundColor: 'action.hover', '& .MuiLinearProgress-bar': { borderRadius: 4, backgroundColor: topicColor, transition: 'transform 0.5s ease' } }}
            />
          </Box>

          {/* The path — a serpentine ribbon flowing left→right and gently down,
              then wrapping back, drawn through node centres with an SVG. */}
          <Box ref={pathRef} sx={{ position: 'relative', width: '100%' }} style={layout ? { height: layout.height } : { minHeight: 220 }}>
            {layout && (
              <>
                <Box
                  component="svg"
                  aria-hidden
                  width={layout.width}
                  height={layout.height}
                  sx={{ position: 'absolute', top: 0, left: 0, overflow: 'visible', pointerEvents: 'none' }}
                >
                  {layout.segments.map((s, i) => (
                    <line
                      key={i}
                      x1={s.x1}
                      y1={s.y1}
                      x2={s.x2}
                      y2={s.y2}
                      stroke={s.color ?? theme.palette.divider}
                      strokeWidth={7}
                      strokeLinecap="round"
                      className={s.active ? 'rm-flow' : undefined}
                      strokeDasharray={s.active ? '0.1 14' : undefined}
                    />
                  ))}
                </Box>
                {layout.nodes.map((n) => (
                  <Box
                    key={n.key}
                    style={{ left: n.cx, top: n.cy - n.half }}
                    sx={{ position: 'absolute', transform: 'translateX(-50%)' }}
                  >
                    <Box className="rm-node" style={{ animationDelay: `${n.i * 0.025}s` }}>
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
                    </Box>
                  </Box>
                ))}
              </>
            )}
          </Box>

          {topicComplete && (
            <Typography sx={{ textAlign: 'center', mt: 3, fontWeight: 800, color: topicColor }}>
              {t('roadmap.allDone')}
            </Typography>
          )}
        </>
      )}

      <Snackbar
        open={!!unlockSnack}
        autoHideDuration={4500}
        onClose={() => setUnlockSnack(null)}
        message={unlockSnack ?? ''}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
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
    ? `${t('roadmap.levelLabel', { n: displayNum })}: ${meta.title}${passed ? ` — ${t('roadmap.passed')} ${best}%` : ''}`
    : `${t('roadmap.levelLabel', { n: displayNum })}: ${t('roadmap.locked')}`;
  const labelWidth = Math.max(72, Math.min(150, cellW - 10));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
      <Box className={isCurrent ? 'rm-bob' : undefined}>
        <Tooltip title={unlocked ? '' : lockedHint} arrow placement="top">
          <Box
            component="button"
            type="button"
            onClick={unlocked ? onClick : undefined}
            disabled={!unlocked}
            aria-label={label}
            sx={{
              position: 'relative', width: 64, height: 64, borderRadius: '50%', border: '3px solid',
              borderColor: passed || isCurrent ? accent : 'divider',
              background: passed ? `linear-gradient(160deg, ${grad[0]}, ${grad[1]})` : 'background.paper',
              color: passed ? '#fff' : unlocked ? accent : 'text.disabled',
              cursor: unlocked ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.25rem',
              // Duolingo-style raised "bubble": a solid darker lip beneath the node.
              boxShadow: passed
                ? `0 5px 0 ${grad[1]}, 0 9px 16px ${accent}55`
                : unlocked
                  ? `0 5px 0 ${accent}, 0 9px 16px ${accent}33`
                  : 'none',
              transition: 'transform 0.14s ease, box-shadow 0.2s ease',
              '&:hover': unlocked ? { transform: 'scale(1.1) translateY(-1px)' } : undefined,
              '&:active': unlocked ? { transform: 'translateY(3px) scale(0.98)' } : undefined,
            }}
          >
            {passed ? <CheckIcon /> : unlocked ? displayNum : <LockIcon />}
            {passed && (
              <Box sx={{ position: 'absolute', bottom: -9, display: 'flex', color: '#ffc400', filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.25))', backgroundColor: 'background.paper', borderRadius: 999, px: 0.25 }}>
                {[0, 1, 2].map((s) => <StarIcon key={s} filled={s < stars} />)}
              </Box>
            )}
          </Box>
        </Tooltip>
      </Box>
      <Typography variant="caption" sx={{ fontWeight: isCurrent ? 700 : 500, color: unlocked ? 'text.primary' : 'text.disabled', maxWidth: labelWidth, textAlign: 'center', lineHeight: 1.15 }}>
        {meta.title}
      </Typography>
      {isCurrent && (
        <Chip label={t('roadmap.start')} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800, color: '#fff', background: `linear-gradient(160deg, ${grad[0]}, ${grad[1]})` }} />
      )}
    </Box>
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
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
      <Box className={isCurrent ? 'rm-bob' : undefined}>
        <Tooltip title={unlocked ? '' : t('roadmap.checkpointLocked', { from: range.startLevel, to: range.endLevel })} arrow placement="top">
          <Box
            component="button"
            type="button"
            className={isCurrent ? 'rm-shimmer' : undefined}
            onClick={unlocked ? onClick : undefined}
            disabled={!unlocked}
            aria-label={label}
            sx={{
              position: 'relative', width: 84, height: 84, borderRadius: '24px', border: '3px solid',
              borderColor: passed || isCurrent ? accent : 'divider',
              background: passed
                ? `linear-gradient(150deg, ${grad[0]}, ${grad[1]})`
                : unlocked
                  ? `linear-gradient(150deg, ${grad[0]}38, ${grad[1]}24)`
                  : 'background.paper',
              color: passed ? '#3a2c00' : unlocked ? accent : 'text.disabled',
              cursor: unlocked ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              // Raised "bubble" lip beneath the boss node.
              boxShadow: passed
                ? `0 6px 0 ${grad[1]}, 0 10px 20px ${accent}55`
                : unlocked
                  ? `0 6px 0 ${accent}, 0 10px 20px ${accent}44`
                  : 'none',
              transition: 'transform 0.14s ease, box-shadow 0.2s ease',
              '&:hover': unlocked ? { transform: 'scale(1.06) translateY(-1px)' } : undefined,
              '&:active': unlocked ? { transform: 'translateY(3px) scale(0.98)' } : undefined,
            }}
          >
            {passed ? <CheckIcon size={30} /> : unlocked ? <TrophyIcon /> : <LockIcon size={22} />}
          </Box>
        </Tooltip>
      </Box>
      <Typography variant="caption" sx={{ fontWeight: 700, color: unlocked ? 'text.primary' : 'text.disabled', textAlign: 'center', lineHeight: 1.15, maxWidth: labelWidth }}>
        {title}
      </Typography>
    </Box>
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
    <Box
      className={hit ? 'rm-shake' : undefined}
      role="img"
      aria-label={t('roadmap.heartsLeft', { n: remaining, max })}
      sx={{ position: 'relative', width: 30, height: 30, flexShrink: 0 }}
    >
      <HeartShape color={`${HEART_COLOR}2e`} style={{ position: 'absolute', inset: 0 }} />
      <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: `${frac * 100}%`, overflow: 'hidden', transition: 'height 0.45s cubic-bezier(0.34, 1.3, 0.5, 1)' }}>
        <HeartShape color={HEART_COLOR} style={{ position: 'absolute', bottom: 0, left: 0 }} />
      </Box>
    </Box>
  );
}

function LessonRunner({
  playable, topicColor, hasNext, nextLabel, onExit, onFinished, onNext, t,
}: {
  playable: RoadmapPlayable; topicColor: string; hasNext: boolean; nextLabel: string;
  onExit: () => void; onFinished: (pct: number) => void; onNext: () => void; t: TFn;
}) {
  const { user } = useAuth();
  const isCheckpoint = playable.kind === 'checkpoint';
  const accent = isCheckpoint ? CHECKPOINT_GOLD : topicColor;
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

  const choose = (index: number) => {
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
  };

  const advance = () => {
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
  };

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
    if (finished) return;
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
  });

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
      <Box sx={{ maxWidth: 520, mx: 'auto', textAlign: 'center', mt: 2, position: 'relative' }}>
        {passed && <Confetti color={accent} />}
        <Box className="rm-celebrate" sx={{ fontSize: '3.5rem', lineHeight: 1, mb: 1 }} aria-hidden>
          {emoji}
        </Box>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 800, mb: 1 }}>
          {title}
        </Typography>
        {dead ? (
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {t('roadmap.outOfHeartsBody', { max: MAX_HEARTS })}
          </Typography>
        ) : (
          <>
            <Typography className="rm-count" variant="h3" sx={{ fontWeight: 800, color: passed ? accent : 'text.secondary', mb: 0.5 }}>
              {pct}%
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 1 }}>
              {t('roadmap.scoreLine', { correct: correctCount, total })}
            </Typography>
            {!passed && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t('roadmap.passNeeded', { pct: playable.passPct })}
              </Typography>
            )}
          </>
        )}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, mt: 2 }}>
          {passed && hasNext && (
            <Button variant="contained" onClick={onNext} sx={{ textTransform: 'none', fontWeight: 700, backgroundColor: accent, '&:hover': { backgroundColor: accent, filter: 'brightness(0.92)' } }}>
              {nextLabel}
            </Button>
          )}
          <Button variant={passed ? 'outlined' : 'contained'} onClick={replay} sx={{ textTransform: 'none', fontWeight: 700, ...(passed ? {} : { backgroundColor: accent, '&:hover': { backgroundColor: accent, filter: 'brightness(0.92)' } }) }}>
            {t('roadmap.retryLevel')}
          </Button>
          <Button variant="text" onClick={onExit} sx={{ textTransform: 'none', color: 'text.secondary' }}>
            {t('roadmap.backToPath')}
          </Button>
        </Box>
      </Box>
    );
  }

  const progressPct = ((qIndex + (revealed ? 1 : 0)) / total) * 100;
  const isRight = selected === question.correctAnswer;

  return (
    <Box sx={{ maxWidth: 640, mx: 'auto' }}>
      {/* Header: exit + (hearts for a level, progress bar for a checkpoint) */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Button onClick={onExit} variant="text" size="small" sx={{ minWidth: 'auto', color: 'text.secondary', fontSize: '1.1rem', lineHeight: 1 }} aria-label={t('roadmap.exit')}>
          ✕
        </Button>
        {isCheckpoint ? (
          <>
            <LinearProgress
              variant="determinate"
              value={progressPct}
              aria-label={t('roadmap.question', { current: qIndex + 1, total })}
              sx={{ flex: 1, height: 12, borderRadius: 6, backgroundColor: 'action.hover', '& .MuiLinearProgress-bar': { borderRadius: 6, backgroundColor: accent, transition: 'transform 0.35s ease' } }}
            />
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', whiteSpace: 'nowrap' }}>
              {correctCount}/{total}
            </Typography>
          </>
        ) : (
          <>
            <HeartMeter mistakes={mistakes} max={MAX_HEARTS} hit={heartHit} t={t} />
            <Box sx={{ flex: 1 }} />
          </>
        )}
        <Tooltip title={t('flag.ariaLabel')} arrow>
          <IconButton
            onClick={() => setFlagOpen(true)}
            aria-label={t('flag.ariaLabel')}
            size="small"
            sx={{ color: 'text.secondary', fontSize: '1.05rem', lineHeight: 1 }}
          >
            🚩
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
        <Chip
          label={`${isCheckpoint ? t('roadmap.checkpoint') : t('roadmap.levelLabel', { n: playable.ref })} · ${playable.title}`}
          size="small"
          sx={{ fontWeight: 700, backgroundColor: `${accent}22`, color: 'text.primary' }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
          {t('roadmap.question', { current: qIndex + 1, total })}
        </Typography>
      </Box>

      {/* Question */}
      <Box sx={{ fontWeight: 500, mb: 2 }}>{renderQuestion(question.question)}</Box>

      {/* Options */}
      <Box role="group" sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        {question.options.map((option, index) => {
          const isCorrect = index === question.correctAnswer;
          const isPicked = index === selected;
          let borderColor = 'divider';
          let bg = 'background.paper';
          let fg = 'text.primary';
          let cls: string | undefined;
          if (revealed && isCorrect) {
            borderColor = '#2e7d32'; bg = 'rgba(46,125,50,0.12)'; fg = '#2e7d32'; cls = 'rm-correct-pop';
          } else if (revealed && isPicked && !isCorrect) {
            borderColor = '#c62828'; bg = 'rgba(198,40,40,0.12)'; fg = '#c62828'; cls = 'rm-shake';
          } else if (isPicked) {
            borderColor = accent;
          }
          return (
            <Box
              key={index}
              component="button"
              type="button"
              className={cls}
              onClick={() => choose(index)}
              disabled={revealed}
              aria-pressed={isPicked}
              sx={{
                textAlign: 'left', px: 2, py: 1.5, borderRadius: 2, border: '2px solid',
                borderColor, backgroundColor: bg, color: fg, fontSize: '0.95rem', fontWeight: 600,
                fontFamily: 'inherit', cursor: revealed ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 1.5,
                transition: 'border-color 0.12s ease, background-color 0.12s ease',
                '&:hover': revealed ? undefined : { borderColor: accent, backgroundColor: 'action.hover' },
              }}
            >
              <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 1, fontSize: '0.75rem', fontWeight: 800, backgroundColor: 'action.hover', color: 'text.secondary', flexShrink: 0 }}>
                {index + 1}
              </Box>
              <Box component="span" sx={{ flex: 1 }}>{option}</Box>
              {revealed && isCorrect && <Box component="span" sx={{ color: '#2e7d32', display: 'inline-flex' }}><CheckIcon size={18} /></Box>}
            </Box>
          );
        })}
      </Box>

      {!revealed && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
          {t('roadmap.keyboardTip', { max: question.options.length })}
        </Typography>
      )}

      {revealed && (
        <Box className="rm-feedback" sx={{ mt: 2, p: 2, borderRadius: 2, borderLeft: '4px solid', borderColor: isRight ? '#2e7d32' : '#c62828', backgroundColor: isRight ? 'rgba(46,125,50,0.08)' : 'rgba(198,40,40,0.08)' }}>
          <Typography sx={{ fontWeight: 800, color: isRight ? '#2e7d32' : '#c62828', mb: 0.5 }}>
            {isRight ? t('roadmap.correct') : t('roadmap.incorrect')}
          </Typography>
          <Typography variant="body2" color="text.secondary">{question.explanation}</Typography>
          <Button fullWidth variant="contained" onClick={advance} sx={{ mt: 2, textTransform: 'none', fontWeight: 700, backgroundColor: accent, '&:hover': { backgroundColor: accent, filter: 'brightness(0.92)' } }}>
            {outOfHearts ? t('roadmap.seeResult') : qIndex < total - 1 ? t('roadmap.continue') : t('roadmap.finish')}
          </Button>
        </Box>
      )}

      <RedFlagDialog open={flagOpen} onClose={() => setFlagOpen(false)} onSubmit={submitFlag} />
      <Snackbar
        open={flagSnack}
        autoHideDuration={3000}
        onClose={() => setFlagSnack(false)}
        message={t('flag.sent')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}

/* ──── confetti burst ───────────────────────────────────────────────────── */

function Confetti({ color }: { color: string }) {
  const colors = [color, '#f5b301', '#2e7d32', '#3178c6', '#ec4899'];
  return (
    <Box className="rm-confetti" aria-hidden>
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
    </Box>
  );
}

function LessonError({ message, onRetry, onExit, t }: { message: string; onRetry: () => void; onExit: () => void; t: TFn }) {
  return (
    <Box sx={{ maxWidth: 480, mx: 'auto', textAlign: 'center', mt: 4 }}>
      <Typography color="error" role="alert" sx={{ mb: 2 }}>{message}</Typography>
      <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center' }}>
        <Button variant="contained" onClick={onRetry} sx={{ textTransform: 'none', backgroundColor: BRAND.green, '&:hover': { backgroundColor: BRAND.greenHover } }}>
          {t('roadmap.retry')}
        </Button>
        <Button variant="outlined" onClick={onExit} sx={{ textTransform: 'none' }}>
          {t('roadmap.backToPath')}
        </Button>
      </Box>
    </Box>
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
    try {
      const batch = await fetchChallengeBatch({ lang });
      const trimmed = batch.questions.slice(0, ASSESSMENT_QUESTION_COUNT);
      if (trimmed.length === 0) throw new Error('No questions available');
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
      <Box sx={{ maxWidth: 560, mx: 'auto', textAlign: 'center', mt: 2 }}>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 800, mb: 1 }}>
          {t('roadmap.skillCheckTitle')}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 1.5 }}>
          {t('roadmap.skillCheckIntro')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {t('roadmap.skillCheckBands')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center' }}>
          <Button
            variant="contained"
            onClick={() => void start()}
            sx={{ textTransform: 'none', fontWeight: 700, backgroundColor: BRAND.green, '&:hover': { backgroundColor: BRAND.greenHover } }}
          >
            {t('roadmap.skillCheckStart')}
          </Button>
          <Button variant="outlined" onClick={onCancel} sx={{ textTransform: 'none' }}>
            {t('roadmap.skillCheckCancel')}
          </Button>
        </Box>
      </Box>
    );
  }

  if (phase === 'loading' || phase === 'submitting') {
    return (
      <Box sx={{ maxWidth: 480, mx: 'auto', textAlign: 'center', mt: 6 }}>
        <CircularProgress sx={{ color: BRAND.green, mb: 2 }} />
        <Typography color="text.secondary">{t('roadmap.skillCheckLoading')}</Typography>
      </Box>
    );
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
      <Box sx={{ maxWidth: 520, mx: 'auto', textAlign: 'center', mt: 2 }}>
        <Box sx={{ fontSize: '3.5rem', lineHeight: 1, mb: 1 }} aria-hidden>
          ⚡️
        </Box>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 800, mb: 1 }}>
          {t('roadmap.skillCheckResult', { correct, total })}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          {t(tier as TranslationKey)}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            onClick={() => onFinished(correct)}
            sx={{ textTransform: 'none', fontWeight: 700, backgroundColor: BRAND.green, '&:hover': { backgroundColor: BRAND.greenHover } }}
          >
            {t('roadmap.skillCheckBack')}
          </Button>
          <Button variant="outlined" onClick={() => void start()} sx={{ textTransform: 'none' }}>
            {t('roadmap.skillCheckRetry')}
          </Button>
        </Box>
      </Box>
    );
  }

  /* ── playing ── */
  if (!current) return null;
  const progressPct = ((qIndex + (answered ? 1 : 0)) / total) * 100;
  return (
    <Box sx={{ maxWidth: 640, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Button
          onClick={onCancel}
          variant="text"
          size="small"
          sx={{ minWidth: 'auto', color: 'text.secondary', fontSize: '1.1rem', lineHeight: 1 }}
          aria-label={t('roadmap.skillCheckCancel')}
        >
          ✕
        </Button>
        <LinearProgress
          variant="determinate"
          value={progressPct}
          aria-label={t('roadmap.skillCheckQuestion', { current: qIndex + 1, total })}
          sx={{
            flex: 1,
            height: 10,
            borderRadius: 5,
            backgroundColor: 'action.hover',
            '& .MuiLinearProgress-bar': { borderRadius: 5, backgroundColor: BRAND.green, transition: 'transform 0.35s ease' },
          }}
        />
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', whiteSpace: 'nowrap' }}>
          {qIndex + 1}/{total}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
        <Chip
          size="small"
          label={getCategoryLabel(current.category)}
          sx={{
            backgroundColor: getCategoryHexColor(current.category),
            color: onCategoryColorText(current.category),
            fontWeight: 600,
          }}
        />
        <Chip size="small" variant="outlined" label={`Lvl ${current.difficulty}`} />
        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
          {t('roadmap.skillCheckQuestion', { current: qIndex + 1, total })}
        </Typography>
      </Box>

      <Box sx={{ fontWeight: 500, mb: 2 }}>{renderQuestion(current.question)}</Box>

      <Box role="group" sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        {current.options.map((option, idx) => {
          const picked = answers[current.id] === idx;
          return (
            <Box
              key={idx}
              component="button"
              type="button"
              onClick={() => handlePick(idx)}
              aria-pressed={picked}
              sx={{
                textAlign: 'left',
                px: 2,
                py: 1.5,
                borderRadius: 2,
                border: '2px solid',
                borderColor: picked ? BRAND.green : 'divider',
                backgroundColor: picked ? 'rgba(45,122,45,0.07)' : 'background.paper',
                color: 'text.primary',
                fontSize: '0.95rem',
                fontWeight: 600,
                fontFamily: 'inherit',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                transition: 'border-color 0.12s ease, background-color 0.12s ease',
                '&:hover': { borderColor: BRAND.green, backgroundColor: 'action.hover' },
              }}
            >
              <Box
                component="span"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 24,
                  height: 24,
                  borderRadius: 1,
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  backgroundColor: 'action.hover',
                  color: 'text.secondary',
                  flexShrink: 0,
                }}
              >
                {idx + 1}
              </Box>
              <Box component="span" sx={{ flex: 1 }}>{option}</Box>
            </Box>
          );
        })}
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
        <Button variant="text" onClick={onCancel} sx={{ textTransform: 'none', color: 'text.secondary' }}>
          {t('roadmap.skillCheckCancel')}
        </Button>
        {qIndex < total - 1 ? (
          <Button
            variant="contained"
            onClick={goNext}
            disabled={!answered}
            sx={{ textTransform: 'none', fontWeight: 700, backgroundColor: BRAND.green, '&:hover': { backgroundColor: BRAND.greenHover } }}
          >
            {t('roadmap.skillCheckNext')}
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={() => void finish()}
            disabled={!allAnswered}
            sx={{ textTransform: 'none', fontWeight: 700, backgroundColor: BRAND.green, '&:hover': { backgroundColor: BRAND.greenHover } }}
          >
            {t('roadmap.skillCheckFinish')}
          </Button>
        )}
      </Box>
    </Box>
  );
}

export default Roadmap;
