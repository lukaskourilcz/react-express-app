import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import { Banner } from '@astryxdesign/core/Banner';
import { Button as AxButton } from '@astryxdesign/core/Button';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { AppToast } from './ui/AppToast';
import { RadioCard, RadioCardGroup } from './ui/RadioCards';
import { useIsMobile } from '../lib/useMediaQuery';
import type {
  RoadmapTopic,
  RoadmapLevelMeta,
  RoadmapPlayable,
  RoadmapQuestion,
  RoadmapAnswerResult,
  RoadmapStructure,
  Question,
} from '../types/quiz';
import {
  fetchRoadmapLevel,
  fetchRoadmapPartTest,
  submitRoadmapAnswer,
  completeRoadmapAttempt,
  applySkillCheckReceipt,
  recordLevelResult,
  recordPartTestResult,
  syncProgressWithServer,
  useRoadmapProgress,
  isLevelPassed,
  isPartLevelUnlocked,
  isPartTestUnlocked,
  isPartTestPassed,
  levelBestPct,
  partTestBestPct,
  passedLevelCount,
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
  type PartRange,
} from '../lib/roadmap';
import { useSubject, topicsForSubject, type SubjectId } from '../lib/subjects';
import {
  masteryState,
  isDueForReview,
  distinctPassDays,
  type MasteryState,
  type LevelMasteryEntry,
} from '../../../shared/mastery';
import { levelIntro, preloadLevelIntros } from '../lib/levelIntros';
import { useRoadmapStructure } from '../lib/queries';
import { apiFetch } from '../lib/api';
import { awardLearningOutcome, syncXpWithServer } from '../lib/xp';
import { computeLearningXp } from '../lib/leveling';
import { getCategoryHexColor, categoryLabelKey, onCategoryColorText } from '../lib/categories';
import { BRAND } from '../theme/MuiTheme';
import { useLanguage } from '../i18n/LanguageContext';
import type { TranslationKey } from '../i18n/translations';
import { useAuth } from '../lib/auth';
import { friendlyError } from '../lib/api';
import { reportQuestion } from '../lib/supabase';
import { shuffleDifferentFrom } from '../lib/shuffle';
import { readString, removeStored, writeString } from '../lib/storage';
import { renderQuestion } from './CodeBlock';
import { QuoteLoader, holdLoadingScreen } from './LoadingScreen';
import { RedFlagDialog } from './RedFlagDialog';
import { IconTile, BoltIcon, CloseIcon, FlagIcon } from './ui/icons';
import { CategoryGlyph } from './ui/techIcons';
import { SwimCta } from './landing/LandingKit';
import './Roadmap.css';
import './DeepEndScreens.css';

// The coding workbench pulls the editor and the runner in; keep it out of the
// Learn chunk until a devShark level actually reaches its coding phase.
const CodingWorkbench = lazy(() => import('../coding/CodingWorkbench').then((m) => ({ default: m.CodingWorkbench })));
const codingDraftKey = (id: string) => `devshark:coding:draft:${id}`;

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
  /** Spaced-mastery state of a level node (white / amber / green). */
  mastery?: MasteryState;
  /** Cleared-but-unmastered level whose spaced review is due. */
  due?: boolean;
  /** Distinct UTC days this level has been passed on (for the mastery tooltip). */
  masteryDays?: number;
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
// Mastered levels carry a filled star; cleared-but-due levels carry a small
// review (circular-arrow) marker. Both pair the mastery colour with a distinct
// shape so status never rides on colour alone.
const StarIcon = ({ size = 20 }: { size?: number }) => (
  <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.6l2.82 6.1 6.68.78-4.94 4.53 1.32 6.59L12 17.9l-5.9 3.31 1.32-6.59L2.5 10.09l6.68-.78L12 2.6z" />
  </svg>
);
const ReviewIcon = ({ size = 12 }: { size?: number }) => (
  <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="21 4 21 9 16 9" />
    <path d="M20.4 13.5A8.5 8.5 0 1 1 18 6.3L21 9" />
  </svg>
);
const StepArrowIcon = ({ dir, size = 15 }: { dir: 'up' | 'down' | 'hold'; size?: number }) => (
  <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    {dir === 'up' && <><polyline points="6 14 12 8 18 14" /></>}
    {dir === 'down' && <><polyline points="6 10 12 16 18 10" /></>}
    {dir === 'hold' && <><line x1="6" y1="12" x2="18" y2="12" /></>}
  </svg>
);
// Build one part's ordered path: its levels, then a single end-of-part test.
type PathNode =
  | { type: 'level'; meta: RoadmapLevelMeta; range: PartRange }
  | { type: 'test'; part: number; range: PartRange };

function buildFullPath(levels: RoadmapLevelMeta[], ranges: PartRange[]): PathNode[] {
  return ranges.flatMap((range) => {
    const partNodes: PathNode[] = levels
      .slice(range.startLevel - 1, range.endLevel)
      .map((meta) => ({ type: 'level', meta, range }));
    if (range.size > 0) partNodes.push({ type: 'test', part: range.part, range });
    return partNodes;
  });
}

function variedConnector(x1: number, y1: number, x2: number, y2: number, index: number): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.max(1, Math.hypot(dx, dy));
  const amplitude = 4 + (index % 4) * 1.5;
  const direction = index % 2 === 0 ? 1 : -1;
  const mx = (x1 + x2) / 2 - (dy / length) * amplitude * direction;
  const my = (y1 + y2) / 2 + (dx / length) * amplitude * direction;
  return `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
}

// The server already shuffles answer options and seals their accepted indices.
// We may vary question order locally without changing those protected indices.
function presentQuestions(questions: RoadmapQuestion[], prev?: RoadmapQuestion[]): RoadmapQuestion[] {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const reference = (prev ?? questions).map((q) => byId.get(q.id)).filter((q): q is RoadmapQuestion => !!q);
  return reference.length === questions.length
    ? shuffleDifferentFrom(questions, reference)
    : shuffleDifferentFrom(questions, questions);
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
  const learningXpBeforeAttemptRef = useRef(0);

  // Skill check (assessment) state. `open` controls the modal; the runner
  // owns its own in-progress state until the result screen reports back.
  const [skillCheckOpen, setSkillCheckOpen] = useState(false);
  const [unlockSnack, setUnlockSnack] = useState<string | null>(null);

  const extraUnlocksSet = useMemo(() => new Set(extraUnlocks), [extraUnlocks]);
  const isUnlocked = useCallback(
    (tpc: RoadmapTopic) => isTopicUnlocked(progress, tpc, extraUnlocksSet),
    [progress, extraUnlocksSet],
  );
  // How many of the subject's paths are still closed — surfaced under the rail
  // so the dimmed pills read as content to earn, not as broken buttons.
  const lockedTopicCount = useMemo(
    () => TOPICS.filter((value) => !isUnlocked(value)).length,
    [TOPICS, isUnlocked],
  );
  // The topic's full (global) level list, split into progression checkpoints.
  const levels: RoadmapLevelMeta[] = structure?.structure[topic]?.levels ?? [];
  const ranges = useMemo(() => partRanges(levels.length), [levels.length]);
  const safePart = Math.min(Math.max(part, 1), Math.max(1, ranges.length));
  const topicColor = getCategoryHexColor(topic);
  const continueLevel = levels.find((meta) => {
    const owningRange = ranges.find((r) => meta.level >= r.startLevel && meta.level <= r.endLevel);
    return !!owningRange && isPartLevelUnlocked(progress, topic, owningRange, meta.level) && !isLevelPassed(progress, topic, meta.level);
  });

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
    (correct: number, verifiedUnlocks?: RoadmapTopic[]) => {
      const granted = verifiedUnlocks ?? topicsFromAssessment(correct);
      const added = unlockExtraTopics(granted);
      setSkillCheckOpen(false);
      if (added.length === 0) {
        setUnlockSnack(t('roadmap.skillCheckNoneAdded'));
      } else {
        const labels = added.map((c) => t(categoryLabelKey(c))).join(', ');
        setUnlockSnack(t('roadmap.skillCheckUnlocked', { topics: labels }));
      }
    },
    [t],
  );

  const open = (a: Active) => {
    learningXpBeforeAttemptRef.current = computeLearningXp(getRoadmapProgress());
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

  // Deep link from the Today plan (/learn?topic=…&level=…) opens that level's
  // lesson directly once the structure is known. Runs once per mount; when the
  // level isn't unlocked yet it just lands on the level's part instead of
  // opening it, so a stale link degrades gracefully.
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (autoOpenedRef.current || !structure) return;
    const params = new URLSearchParams(window.location.search);
    const levelRaw = params.get('level');
    if (!levelRaw) return;
    autoOpenedRef.current = true;
    // If the requested topic was locked, `topic` fell back to the starter — never
    // open a level that belongs to a different topic than the one on screen.
    const urlTopic = params.get('topic');
    if (urlTopic && urlTopic !== topic) return;
    const lvl = parseInt(levelRaw, 10);
    if (!Number.isInteger(lvl) || lvl < 1) return;
    const lvls = structure.structure[topic]?.levels ?? [];
    const range = partRanges(lvls.length).find((r) => lvl >= r.startLevel && lvl <= r.endLevel);
    if (!range) return;
    setPart(range.part);
    writeString(PART_KEY, String(range.part));
    if (isPartLevelUnlocked(progress, topic, range, lvl)) {
      open({ kind: 'level', ref: lvl });
    }
  }, [structure, topic]); // eslint-disable-line react-hooks/exhaustive-deps

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
    const before = learningXpBeforeAttemptRef.current;
    if (active.kind === 'level') recordLevelResult(topic, active.ref, pct, playable.passPct);
    else recordPartTestResult(topic, active.ref, pct, playable.passPct);
    awardLearningOutcome(computeLearningXp(getRoadmapProgress()) - before);
  };

  // Lay the whole topic out as a serpentine: nodes flow left→right and gently
  // down, then wrap and flow back the other way. Positions are computed
  // analytically so the SVG connectors hit each node centre without measuring.
  const layout = useMemo(() => {
    if (!pathWidth || levels.length === 0) return null;
    const nodes = buildFullPath(levels, ranges);
    // Five levels + their checkpoint per row on desktop, three + checkpoint
    // on narrow screens — the compact rhythm from the Deep End handoff.
    const cols = 6;
    const cellW = pathWidth / cols;
    // ROW_H must clear the accumulated within-row slope so the lowest node of a
    // row doesn't collide with the next row's start node (same column at a turn) —
    // including a taller test node and its two-line label.
    const ROW_H = 126;
    const SLOPE = 0;
    const BASE = 34;
    const LABEL_H = 42;
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
          i, kind: 'test', key: `test-${node.part}`, cx, cy, half: 25,
          accent: CHECKPOINT_GOLD, grad: CHECKPOINT_GRAD, part: node.part, range: node.range,
          unlocked, passed, isCurrent: unlocked && !passed,
          best: partTestBestPct(progress, topic, node.part),
        };
      }
      const meta = node.meta;
      const nodeRange = node.range;
      const band = bandForCategory(topic, meta.difficulty);
      const passed = isLevelPassed(progress, topic, meta.level);
      const unlocked = isPartLevelUnlocked(progress, topic, nodeRange, meta.level);
      const isCurrent = unlocked && !passed;
      // Spaced mastery reads the stored level entry (migration-024 fields are
      // additive; older/guest rows without passDays resolve to "cleared").
      const entry = progress[topic]?.levels?.[String(meta.level)] as LevelMasteryEntry | undefined;
      return {
        i, kind: 'level', key: `lvl-${meta.level}`, cx, cy, half: isCurrent ? 23 : 20,
        accent: band.solid, grad: band.grad, level: meta,
        displayNum: meta.level,
        unlocked, passed, isCurrent: unlocked && !passed,
        best: levelBestPct(progress, topic, meta.level),
        mastery: masteryState(entry),
        due: isDueForReview(entry),
        masteryDays: distinctPassDays(entry),
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
  }, [pathWidth, levels, ranges, progress, topic]);

  /* ──── skill check view ─────────────────────────────────────────────── */
  if (skillCheckOpen) {
    return (
      <SkillCheckRunner
        lang={lang}
        subject={subject}
        isAuthenticated={isAuthenticated}
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
        onReplay={() => open(active)}
        t={t}
        lang={lang}
      />
    );
  }

  /* ──── map view ─────────────────────────────────────────────────────── */
  const topicDone = passedLevelCount(progress, topic);
  const topicComplete = ranges.length > 0 && ranges.every((r) => isPartTestPassed(progress, topic, r.part));

  return (
    <div className="de-page" style={{ maxWidth: 1060 }}>
      <div className="rm-journey-heading">
        <div style={{ display: 'flex', marginBottom: 6 }}>
          <span className="ss-kicker">{t('roadmap.title')}</span>
        </div>
        <Heading level={1}>{t('roadmap.journeyTitle')}</Heading>
        <div style={{ marginTop: 4 }}>
          <Text type="supporting" color="secondary">{t('roadmap.subtitle')}</Text>
        </div>
      </div>

      {/* Topic selector — every topic in the subject is listed so the breadth of
          the map is obvious on a first visit. Locked ones stay in place, dimmed
          and marked with a lock, and the note below counts them. */}
      {/* Radiogroup semantics (not tabs — there is no tabpanel wiring), so AT
          announces "N of M selected" correctly. */}
      <RadioCardGroup value={topic} onChange={(value) => selectTopic(value as RoadmapTopic)} label={t('roadmap.topicsAria')} orientation="horizontal" className="rm-topic-rail">
        {TOPICS.map((value, index) => {
          const unlocked = isUnlocked(value);
          const color = getCategoryHexColor(value);
          const label = t(categoryLabelKey(value));
          return (
            <RadioCard
              key={value}
              value={value}
              index={index}
              disabled={!unlocked}
              label={unlocked ? label : `${label} — ${t('roadmap.locked')}`}
              className="rm-topic-pill"
              padding={2.5}
              style={{ ['--rm-accent']: color, ['--rm-on-accent']: onCategoryColorText(value) } as CSSProperties}
              data-locked={!unlocked}
            >
              {/* Constant white chip under the logo: the selected pill fills
                  with the topic's own colour, which used to swallow a
                  same-coloured glyph. */}
              <span className="rm-topic-glyph">
                <CategoryGlyph category={value} color={color} size={20} />
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0 }}>
                <span>{label}</span>
                <span style={{ fontSize: '0.66rem', fontWeight: 600, opacity: 0.72 }}>
                  {unlocked
                    ? t('roadmap.progress', { done: passedLevelCount(progress, value), total: structure?.structure[value]?.levels.length ?? 0 })
                    : t('roadmap.locked')}
                </span>
              </span>
              {!unlocked && <span className="rm-topic-lock" aria-hidden><LockIcon size={13} /></span>}
            </RadioCard>
          );
        })}
      </RadioCardGroup>

      {/* How much of the map is still closed, and how to open it. Without this
          the dimmed pills read as decoration rather than as earned content. */}
      {lockedTopicCount > 0 && (
        <p className="rm-topic-locked-note">
          <LockIcon size={13} />
          <span>{t('roadmap.topicsLockedCount', { locked: lockedTopicCount, total: TOPICS.length })}</span>
          <span>{t('roadmap.topicsLockedHowTo')}</span>
        </p>
      )}

      {loadingStructure ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 24, marginTop: 16 }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} width={64} height={64} radius="rounded" index={i} />
          ))}
        </div>
      ) : structureError ? (
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <div style={{ marginBottom: 16, color: 'var(--ss-error)' }} role="alert">{structureError}</div>
          <AxButton variant="secondary" label={t('roadmap.retry')} onClick={() => structureQuery.refetch()} />
        </div>
      ) : levels.length === 0 ? (
        <div style={{ maxWidth: 620, margin: '32px auto 0' }}>
          <Banner status="info" title={t('roadmap.noLevels')} description={t('roadmap.noLevelsBody')} />
        </div>
      ) : (
        <>
          {/* Part selector — the topic is split into PARTS_PER_TOPIC shorter
              paths, each ending with a test; only one part shows at a time. */}
          <div role="radiogroup" aria-label={t('roadmap.partsAria')} style={{ display: 'none' }}>
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
          <div className="rm-overview-card">
            <div className="rm-overview-copy">
              <span className="rm-overview-fin" aria-hidden="true" />
              <div><Heading level={2}>{t(categoryLabelKey(topic))} — {t('roadmap.wholeSwim')}</Heading>
                <Text type="supporting" color="secondary">{t('roadmap.progress', { done: topicDone, total: levels.length })}</Text></div>
            </div>
            <div className="rm-overview-actions">
              <div
              role="progressbar"
              aria-label={t('roadmap.progress', { done: topicDone, total: levels.length })}
              aria-valuenow={Math.round(levels.length ? (topicDone / levels.length) * 100 : 0)}
              aria-valuemin={0}
              aria-valuemax={100}
              className="rm-overview-progress"
            >
              <div style={{ height: '100%', width: `${levels.length ? (topicDone / levels.length) * 100 : 0}%`, backgroundColor: topicColor, borderRadius: 4, transition: 'width 0.5s ease' }} />
              </div>
            {continueLevel && (
              <SwimCta label={t('roadmap.continueLevel', { n: continueLevel.level })} dir={-1} onClick={() => open({ kind: 'level', ref: continueLevel.level })} />
            )}
            </div>
          </div>

          {/* Reads the node colours: white = not started, amber = cleared,
              green = mastered, plus the due-for-review marker. */}
          <MasteryLegend t={t} />

          {/* The path — a serpentine ribbon flowing left→right and gently down,
              then wrapping back, drawn through node centres with an SVG. */}
          <div className="rm-path-scroll">
          <div ref={pathRef} className="rm-path-canvas" style={{ position: 'relative', ...(layout ? { height: layout.height } : { minHeight: 220 }) }}>
            {layout && (
              <>
                <svg
                  aria-hidden
                  width={layout.width}
                  height={layout.height}
                  style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible', pointerEvents: 'none' }}
                >
                  {layout.segments.map((s, i) => (
                    <path
                      key={i}
                      d={variedConnector(s.x1, s.y1, s.x2, s.y2, i)}
                      fill="none"
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
                          unlocked={n.unlocked}
                          passed={n.passed}
                          best={n.best}
                          isCurrent={n.isCurrent}
                          mastery={n.mastery ?? 'notStarted'}
                          due={n.due ?? false}
                          masteryDays={n.masteryDays ?? 0}
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
          </div>

          {topicComplete && (
            <div style={{ textAlign: 'center', marginTop: 24, fontWeight: 800, color: topicColor }}>
              {t('roadmap.allDone')}
            </div>
          )}

          <div className="rm-skillcheck-row">
            <span>{t('roadmap.skillCheckSubtitle')}</span>
            <button type="button" className="rm-skillcheck-cta" onClick={() => setSkillCheckOpen(true)}>
              <BoltIcon size={15} /> {t('roadmap.skillCheckCta')}
            </button>
          </div>
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

/* ──── mastery legend ───────────────────────────────────────────────────── */

// A compact key for the three spaced-mastery node states plus the due marker.
// Each swatch pairs its colour with a glyph so the legend is legible without
// relying on colour perception.
function MasteryLegend({ t }: { t: TFn }) {
  return (
    <div className="rm-legend" role="group" aria-label={t('mastery.legendTitle')}>
      <span className="rm-legend-title">{t('mastery.legendTitle')}</span>
      <span className="rm-legend-item">
        <span className="rm-legend-swatch" aria-hidden="true" />
        {t('mastery.notStarted')}
      </span>
      <span className="rm-legend-item">
        <span className="rm-legend-swatch rm-legend-swatch--cleared" aria-hidden="true"><CheckIcon size={11} /></span>
        {t('mastery.cleared')}
      </span>
      <span className="rm-legend-item">
        <span className="rm-legend-swatch rm-legend-swatch--mastered" aria-hidden="true"><StarIcon size={11} /></span>
        {t('mastery.mastered')}
      </span>
      <span className="rm-legend-item">
        <span className="rm-legend-swatch rm-legend-swatch--due" aria-hidden="true"><ReviewIcon size={10} /></span>
        {t('mastery.dueForReview')}
      </span>
    </div>
  );
}

/* ──── level node ───────────────────────────────────────────────────────── */

function LevelNode({
  meta, displayNum, accent, unlocked, passed, best, isCurrent, mastery, due, masteryDays, onClick, t, cellW,
}: {
  meta: RoadmapLevelMeta; displayNum: number; accent: string;
  unlocked: boolean; passed: boolean; best: number; isCurrent: boolean;
  mastery: MasteryState; due: boolean; masteryDays: number;
  onClick: () => void; t: TFn; cellW: number;
}) {
  // Within a shown part levels gate sequentially; the first level of a part is
  // gated by the previous part's test at the part selector, never here.
  const lockedHint = t('roadmap.lockedHint');
  // Spaced mastery: a passed level is "cleared" (amber) until it is mastered
  // (green). Soft fill + strong border/icon mirror the quiz feedback tokens so
  // contrast holds in light and dark; the glyph (check vs star) and the aria
  // text carry the status without relying on colour.
  const mastered = passed && mastery === 'mastered';
  const passedLine = mastered ? 'var(--ss-success)' : 'var(--ss-warning)';
  const passedFill = mastered ? 'var(--ss-success-soft)' : 'var(--ss-warning-soft)';
  const masteryText = mastered ? t('mastery.mastered') : t('mastery.cleared');
  const tip = !unlocked
    ? lockedHint
    : mastered
      ? t('mastery.masteredTooltip', { days: masteryDays })
      : passed
        ? (due ? t('mastery.dueTooltip') : t('mastery.clearedTooltip'))
        : '';
  const label = unlocked
    ? `${t('roadmap.levelLabel', { n: displayNum })}: ${meta.title}${passed ? `, ${masteryText}${due ? `, ${t('mastery.dueForReview')}` : ''}, ${best}%` : ''}`
    : `${t('roadmap.levelLabel', { n: displayNum })}: ${t('roadmap.locked')}`;
  const labelWidth = Math.max(72, Math.min(150, cellW - 10));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div className={isCurrent ? 'rm-bob' : undefined}>
        {/* span wrapper: disabled buttons swallow pointer events, so the
            hint tooltip needs an enabled element to attach to. */}
        <Tooltip content={tip} placement="above" isEnabled={tip !== ''}>
          <span style={{ display: 'inline-block' }}>
          <button
            type="button"
            className={unlocked ? 'rm-level-btn' : undefined}
            onClick={unlocked ? onClick : undefined}
            disabled={!unlocked}
            aria-label={label}
            style={{
              position: 'relative', width: isCurrent ? 46 : 40, height: isCurrent ? 46 : 40, borderRadius: '50%',
              border: `2px solid ${passed ? passedLine : isCurrent ? accent : 'transparent'}`,
              background: passed ? passedFill : isCurrent ? 'var(--brand-accent-soft)' : 'var(--color-background-muted)',
              color: passed ? passedLine : unlocked ? accent : 'var(--color-text-disabled)',
              cursor: unlocked ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.86rem',
              boxShadow: isCurrent ? `0 0 0 5px ${accent}1f` : 'none',
              transition: 'transform 0.14s ease, box-shadow 0.2s ease',
              fontFamily: 'inherit',
            }}
          >
            {passed ? (mastered ? <StarIcon size={20} /> : <CheckIcon />) : unlocked ? displayNum : <LockIcon />}
            {isCurrent && <span className="rm-current-fin" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24"><path d="M3 18 Q 6 6 15 3 Q 17 11 21 18 Z" fill={accent} /></svg></span>}
            {due && <span className="rm-due-marker" aria-hidden="true"><ReviewIcon size={10} /></span>}
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
              position: 'relative', width: 50, height: 50, borderRadius: '14px',
              border: `2px solid ${passed || isCurrent ? accent : `${accent}70`}`,
              background: passed
                ? `linear-gradient(150deg, ${grad[0]}, ${grad[1]})`
                : unlocked
                  ? `linear-gradient(150deg, ${grad[0]}38, ${grad[1]}24)`
                  : 'var(--color-background-surface)',
              color: passed ? '#3a2c00' : unlocked ? accent : 'var(--color-text-disabled)',
              cursor: unlocked ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: isCurrent ? `0 0 0 5px ${accent}20` : 'none',
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
      className={`rm-heart${hit ? ' rm-shake' : ''}`}
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
  playable, topicColor, hasNext, nextLabel, onExit, onFinished, onNext, onReplay, t, lang,
}: {
  playable: RoadmapPlayable; topicColor: string; hasNext: boolean; nextLabel: string;
  onExit: () => void; onFinished: (pct: number) => void; onNext: () => void;
  onReplay: () => void; t: TFn; lang: string;
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
  const [presented] = useState<RoadmapQuestion[]>(() => presentQuestions(playable.questions));
  const total = presented.length;
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [grade, setGrade] = useState<RoadmapAnswerResult | null>(null);
  const [grading, setGrading] = useState(false);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  // Hearts apply to levels only; checkpoints keep the percent-based pass rule.
  const [mistakes, setMistakes] = useState(0);
  const [dead, setDead] = useState(false);
  const [heartHit, setHeartHit] = useState(false);
  const [flagOpen, setFlagOpen] = useState(false);
  const [flagSnack, setFlagSnack] = useState(false);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  // devShark code levels end with coding tasks. The level passes only when the
  // server has a passed verdict for every one of them (the ids are sealed in
  // the level session), so the finish screen reads the server's answer.
  const codingTasks = useMemo(() => (playable.kind === 'level' ? playable.coding ?? [] : []), [playable]);
  const [codingPhase, setCodingPhase] = useState(false);
  const [codingIndex, setCodingIndex] = useState(0);
  const [codingPassed, setCodingPassed] = useState<string[]>([]);
  const [codingPending, setCodingPending] = useState<string[]>([]);

  const question = presented[qIndex];
  // Out of hearts once this answer is revealed and it pushed mistakes to the max.
  const outOfHearts = !isCheckpoint && mistakes >= MAX_HEARTS;

  const choose = useCallback(
    async (index: number) => {
      if (revealed || grading) return;
      setGrading(true);
      setAnswerError(null);
      setSelected(index);
      try {
        const result = await submitRoadmapAnswer(playable.sessionId, question.id, index, lang);
        setSelected(result.selectedIndex);
        setGrade(result);
        setRevealed(true);
        if (result.isCorrect) {
          setCorrectCount((count) => count + 1);
        } else if (!isCheckpoint) {
          setMistakes((mistakeCount) => mistakeCount + 1);
          setHeartHit(true);
          window.setTimeout(() => setHeartHit(false), 500);
        }
      } catch (error) {
        setAnswerError(friendlyError(error));
      } finally {
        setGrading(false);
      }
    },
    [revealed, grading, playable.sessionId, question.id, lang, isCheckpoint],
  );

  const complete = useCallback(async () => {
    setCompleting(true);
    setAnswerError(null);
    try {
      const result = await completeRoadmapAttempt(playable.sessionId);
      setCorrectCount(result.correctAnswers);
      setCodingPending(result.codingPending ?? []);
      // A level that fails its coding gate is recorded as not passed even with
      // a full question score; report the percentage the server computed but
      // keep the local pass record honest.
      onFinished((result.codingPending?.length ?? 0) > 0 ? Math.min(result.percentage, playable.passPct - 1) : result.percentage);
      setCodingPhase(false);
      setFinished(true);
    } catch (error) {
      setAnswerError(friendlyError(error));
    } finally {
      setCompleting(false);
    }
  }, [onFinished, playable.passPct, playable.sessionId]);

  const advance = useCallback(async () => {
    if (outOfHearts) {
      setCompleting(true);
      setAnswerError(null);
      try {
        const result = await completeRoadmapAttempt(playable.sessionId);
        setCorrectCount(result.correctAnswers);
        onFinished(result.percentage);
        setDead(true);
        setFinished(true);
      } catch (error) {
        setAnswerError(friendlyError(error));
      } finally {
        setCompleting(false);
      }
    } else if (qIndex < total - 1) {
      setQIndex((i) => i + 1);
      setSelected(null);
      setRevealed(false);
      setGrade(null);
      setAnswerError(null);
    } else if (codingTasks.length > 0) {
      // Questions done: the coding phase decides the rest of the level.
      setRevealed(false);
      setGrade(null);
      setAnswerError(null);
      setCodingPhase(true);
    } else {
      await complete();
    }
  }, [total, outOfHearts, qIndex, onFinished, playable.sessionId, codingTasks.length, complete]);

  const submitFlag = async (detail?: string) => {
    await reportQuestion({ questionId: question.id, reason: 'needs-review', detail, reporterSub: user?.id });
    setFlagOpen(false);
    setFlagSnack(true);
  };

  useEffect(() => {
    if (finished || showIntro || codingPhase) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, button, a, [contenteditable="true"], [role="textbox"], [role="radio"], [role="checkbox"]')) return;
      if (!revealed && /^[1-9]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (idx < question.options.length) {
          e.preventDefault();
          void choose(idx);
        }
      } else if (revealed && e.key === 'Enter') {
        e.preventDefault();
        void advance();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [finished, showIntro, codingPhase, revealed, question, choose, advance]);

  useEffect(() => {
    if (finished) resultHeadingRef.current?.focus({ preventScroll: true });
  }, [finished]);

  if (showIntro && intro) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <AxButton isIconOnly icon={<CloseIcon size={18} />} variant="ghost" size="sm" label={t('roadmap.exit')} onClick={onExit} />
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
          {codingTasks.length > 0 && (
            <div style={{ marginTop: 12, fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
              <span style={{ fontWeight: 700 }}>{t('coding.lesson.kicker')}: </span>
              {codingTasks.map(({ task }) => task.title[lang === 'cs' ? 'cs' : 'en'] || task.title.en).join(' · ')}
            </div>
          )}
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

  if (codingPhase && codingTasks[codingIndex]) {
    const current = codingTasks[codingIndex];
    const title = current.task.title[lang === 'cs' ? 'cs' : 'en'] || current.task.title.en;
    return (
      <div className="cd-page" style={{ flex: 1, minHeight: 0, overflowY: 'auto', gap: 12, paddingBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <AxButton isIconOnly icon={<CloseIcon size={18} />} variant="ghost" size="sm" label={t('roadmap.exit')} onClick={onExit} />
          <span style={{ fontWeight: 700, backgroundColor: `${accent}22`, color: 'var(--color-text-primary)', borderRadius: 999, padding: '2px 10px', fontSize: '0.8125rem', display: 'inline-block' }}>
            {`${t('roadmap.levelLabel', { n: playable.ref })} · ${playable.title}`}
          </span>
          <span className="ss-kicker" style={{ marginLeft: 'auto' }}>{t('coding.lesson.kicker')} · {t('coding.lesson.counter', { n: codingIndex + 1, total: codingTasks.length })}</span>
        </div>
        <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>{t('coding.lesson.intro')} {t('coding.lesson.giveUpNote')}</p>
        {answerError && <div role="alert" className="cd-note cd-note--error">{answerError}</div>}
        <Suspense fallback={<div className="cd-note" role="status">{t('common.loading')}</div>}>
          <CodingWorkbench
            key={current.task.id}
            task={current.task}
            session={current.session}
            locked={null}
            signedIn={Boolean(user)}
            initialCode={readString(codingDraftKey(current.task.id))}
            mode="lesson"
            onDraft={(code) => writeString(codingDraftKey(current.task.id), code)}
            onVerdict={(verdict) => {
              if (verdict.verdict === 'passed') {
                removeStored(codingDraftKey(current.task.id));
                setCodingPassed((prev) => (prev.includes(current.task.id) ? prev : [...prev, current.task.id]));
              }
            }}
            onRevealed={() => void complete()}
            onContinue={() => {
              if (codingIndex < codingTasks.length - 1) setCodingIndex((i) => i + 1);
              else void complete();
            }}
          />
        </Suspense>
        <span className="cd-visually-hidden" aria-live="polite">{t('coding.lesson.pending', { n: codingTasks.length - codingPassed.length })}: {title}</span>
      </div>
    );
  }

  if (finished) {
    const pct = Math.round((correctCount / total) * 100);
    const passed = !dead && pct >= playable.passPct && codingPending.length === 0;
    const title = dead
      ? t('roadmap.outOfHeartsTitle')
      : passed
        ? isCheckpoint ? t('roadmap.checkpointComplete') : t('roadmap.levelComplete')
        : isCheckpoint ? t('roadmap.checkpointFailed') : t('roadmap.levelFailed');
    return (
      // Center vertically in the lesson viewport (celebration deserves the
      // stage) and move focus to the outcome heading when grading completes.
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
        {/* Confetti IS the celebration on a pass; the icon stays quiet. */}
        {passed && <Confetti color={accent} />}
        {passed && (
          <div className="rm-celebrate" style={{ marginBottom: 12 }} aria-hidden>
            <IconTile color={accent} size={56}>
              {isCheckpoint ? <TrophyIcon size={26} /> : <CheckIcon size={26} />}
            </IconTile>
          </div>
        )}
        <h1 ref={resultHeadingRef} tabIndex={-1} className="rm-finish-title">{title}</h1>
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
            {codingTasks.length > 0 && (
              <div style={{ fontSize: '0.9rem', color: codingPending.length === 0 ? 'var(--ss-success-strong, var(--ss-success))' : 'var(--ss-warning)', fontWeight: 600, marginBottom: 8 }}>
                {codingPending.length === 0 ? t('coding.lesson.allPassed') : t('coding.lesson.pending', { n: codingPending.length })}
              </div>
            )}
            {!passed && pct < playable.passPct && (
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
          <button type="button" className={passed ? 'rm-outline-btn' : 'rm-accent-btn'} onClick={onReplay} style={passed ? undefined : { backgroundColor: accent }}>
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
  const isRight = grade?.isCorrect === true;

  return (
    // One-viewport lesson layout matching the Quiz card geometry: 560px
    // column, content capped at ~80% height on sm+ and centred; question
    // scrolls, answer options anchored toward the bottom in a stable position.
    <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', width: '100%', maxWidth: isMobile ? 680 : 560, margin: '0 auto' }}>
    <div style={{ flex: '1 1 auto', minHeight: 0, maxHeight: isMobile ? undefined : '80%', display: 'flex', flexDirection: 'column' }}>
      {/* Header: exit + (hearts for a level, progress bar for a checkpoint) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexShrink: 0 }}>
        <AxButton isIconOnly icon={<CloseIcon size={18} />} variant="ghost" size="sm" label={t('roadmap.exit')} onClick={onExit} />
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
          icon={<FlagIcon size={16} />}
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
      <RadioCardGroup
        value={selected}
        onChange={(value) => setSelected(Number(value))}
        onActivate={(value) => void choose(Number(value))}
        labelledBy="lesson-question"
        style={{ display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0, marginTop: 'auto', marginBottom: isMobile ? 50 : 0 }}
      >
        {question.options.map((option, index) => {
          const isCorrect = index === grade?.correctAnswer;
          const isPicked = index === selected;
          const overrides: CSSProperties = {};
          let cls: string | undefined;
          if (revealed && isCorrect) {
            overrides.borderColor = 'var(--ss-success)'; overrides.backgroundColor = 'var(--ss-success-soft)'; overrides.color = 'var(--ss-success)'; cls = 'rm-correct-pop';
          } else if (revealed && isPicked && !isCorrect) {
            overrides.borderColor = 'var(--ss-error)'; overrides.backgroundColor = 'var(--ss-error-soft)'; overrides.color = 'var(--ss-error)'; cls = 'rm-shake';
          } else if (isPicked) {
            overrides.borderColor = accent;
          }
          return (
            <RadioCard
              key={index}
              value={index}
              index={index}
              className={`rm-option${cls ? ` ${cls}` : ''}`}
              disabled={revealed || grading}
              tone={revealed && isCorrect ? 'success' : 'default'}
              style={{ ['--rm-accent']: accent, ...overrides } as CSSProperties}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 4, fontSize: '0.75rem', fontWeight: 800, backgroundColor: 'var(--color-background-muted)', color: 'var(--color-text-secondary)', flexShrink: 0 }}>
                {index + 1}
              </span>
              <span style={{ flex: 1 }}>{option}</span>
              {revealed && isCorrect && <span style={{ color: 'var(--ss-success)', display: 'inline-flex' }}><CheckIcon size={18} /></span>}
            </RadioCard>
          );
        })}
      </RadioCardGroup>

      {!revealed && !answerError && (
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: isMobile ? 'none' : 'block', marginTop: 12, flexShrink: 0 }}>
          {t('roadmap.keyboardTip', { max: question.options.length })}
        </div>
      )}

      {/* Feedback OVERLAYS the answer options — a solid card floating over
          the bottom of the lesson viewport, so the anchored options don't get
          shoved around when the grade lands. Live region keeps AT informed. */}
      {(revealed || answerError) && (
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
              borderLeft: `4px solid ${isRight ? 'var(--ss-success)' : 'var(--ss-error)'}`,
              backgroundColor: 'var(--color-background-surface)',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.35)',
              maxHeight: '48vh',
              overflowY: 'auto',
            }}
          >
            {answerError ? (
              <>
                <div role="alert" style={{ fontWeight: 700, color: 'var(--ss-error)' }}>{answerError}</div>
                <button
                  type="button"
                  className="rm-accent-btn"
                  onClick={() => revealed ? void advance() : selected !== null ? void choose(selected) : undefined}
                  disabled={grading || completing || (!revealed && selected === null)}
                  style={{ marginTop: 16, width: '100%', backgroundColor: accent }}
                >
                  {t('roadmap.retry')}
                </button>
              </>
            ) : grade ? (
              <>
                <div style={{ fontWeight: 800, color: isRight ? 'var(--ss-success)' : 'var(--ss-error)', marginBottom: 4 }}>
                  {isRight ? t('roadmap.correct') : t('roadmap.incorrect')}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                  {grade.explanation}
                </div>
                <button
                  type="button"
                  className="rm-accent-btn"
                  onClick={() => void advance()}
                  disabled={completing}
                  style={{ marginTop: 16, width: '100%', backgroundColor: accent }}
                >
                  {outOfHearts ? t('roadmap.seeResult') : qIndex < total - 1 ? t('roadmap.continue') : t('roadmap.finish')}
                </button>
              </>
            ) : null}
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
      <div style={{ color: 'var(--ss-error)', marginBottom: 16 }} role="alert">{message}</div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <AxButton variant="primary" label={t('roadmap.retry')} onClick={onRetry} />
        <AxButton variant="secondary" label={t('roadmap.backToPath')} onClick={onExit} />
      </div>
    </div>
  );
}

/* ──── adaptive placement runner ────────────────────────────────────────── */

// The skill-check is an adaptive placement: the server serves short rounds and
// steps difficulty up on a strong round, down on a weak one, converging on the
// learner's level over ~4 rounds. Grading and topic unlocks stay
// server-authoritative — this component only relays answers and applies the
// verified receipt. An answer of IDK_INDEX (-1), the "I don't know yet" option,
// is sent as an explicit miss.
type PlacementPhase = 'intro' | 'loading' | 'playing' | 'submitting' | 'result' | 'error';
type StepDir = 'up' | 'down' | 'hold';

const IDK_INDEX = -1;

interface PlacementRound {
  done: false;
  round: number;
  totalRounds: number;
  difficulty: number;
  asked: number;
  total: number;
  idkCountsAsMiss: boolean;
  placementToken: string;
  questions: Question[];
  lastRoundCorrect?: number;
  lastRoundSize?: number;
}
interface PlacementDone {
  done: true;
  correct: number;
  total: number;
  difficulty: number;
  unlockedPreview: string[];
  resultReceipt?: string;
}
type PlacementResponse = PlacementRound | PlacementDone;

function SkillCheckRunner({
  lang,
  subject,
  isAuthenticated,
  onCancel,
  onFinished,
  t,
}: {
  lang: string;
  subject: SubjectId;
  isAuthenticated: boolean;
  onCancel: () => void;
  onFinished: (correct: number, verifiedUnlocks?: RoadmapTopic[]) => void;
  t: TFn;
}) {
  const [phase, setPhase] = useState<PlacementPhase>('intro');
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [round, setRound] = useState(1);
  const [totalRounds, setTotalRounds] = useState(4);
  const [total, setTotal] = useState(20);
  const [asked, setAsked] = useState(0);
  const [difficulty, setDifficulty] = useState(3);
  const [step, setStep] = useState<StepDir | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [correct, setCorrect] = useState(0);
  const [verifiedUnlocks, setVerifiedUnlocks] = useState<RoadmapTopic[] | undefined>();
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (phase === 'result') resultHeadingRef.current?.focus({ preventScroll: true });
  }, [phase]);

  // Swap in a fetched round and reset the per-round answer sheet. `dir` drives
  // the stepping-up / stepping-down banner (null on the opening round).
  const applyRound = useCallback((res: PlacementRound, dir: StepDir | null) => {
    setToken(res.placementToken);
    setRound(res.round);
    setTotalRounds(res.totalRounds);
    setTotal(res.total);
    setAsked(res.asked);
    setDifficulty(res.difficulty);
    setQuestions(res.questions);
    setQIndex(0);
    setAnswers({});
    setStep(dir);
    setPhase('playing');
  }, []);

  // Apply the server-verified result. Grading + unlocks live on the server; the
  // receipt is only applied when signed in — guests get the local unlock tier
  // from `correct` back in the parent's onSkillCheckFinished.
  const finishFrom = useCallback(async (res: PlacementDone) => {
    setCorrect(res.correct);
    let verified: RoadmapTopic[] | undefined;
    if (isAuthenticated && res.resultReceipt) {
      try {
        const applied = await applySkillCheckReceipt(res.resultReceipt);
        verified = applied.unlocked;
      } catch {
        // The receipt is the server's authority; if applying it fails we still
        // show the score and fall back to the local unlock tier in onFinished.
        verified = undefined;
      }
    }
    setVerifiedUnlocks(verified);
    setPhase('result');
  }, [isAuthenticated]);

  const start = useCallback(async () => {
    setPhase('loading');
    setError(null);
    setVerifiedUnlocks(undefined);
    const startedAt = Date.now();
    try {
      const params = new URLSearchParams({ resource: 'placement', subject, lang });
      const res = await apiFetch<PlacementResponse>(`/api/quiz/roadmap?${params}`);
      await holdLoadingScreen(startedAt);
      if (res.done) await finishFrom(res);
      else applyRound(res, null);
    } catch (err) {
      setError(friendlyError(err));
      setPhase('error');
    }
  }, [subject, lang, applyRound, finishFrom]);

  const submitRound = useCallback(async () => {
    if (!token) return;
    setPhase('submitting');
    setError(null);
    try {
      const res = await apiFetch<PlacementResponse>('/api/quiz/roadmap?resource=placement', {
        method: 'POST',
        body: JSON.stringify({ placementToken: token, answers, lang }),
      });
      if (res.done) {
        await finishFrom(res);
      } else {
        const dir: StepDir = res.difficulty > difficulty ? 'up' : res.difficulty < difficulty ? 'down' : 'hold';
        applyRound(res, dir);
      }
    } catch (err) {
      setError(friendlyError(err));
      setPhase('error');
    }
  }, [token, answers, lang, difficulty, applyRound, finishFrom]);

  const current: Question | undefined = questions[qIndex];
  const roundSize = questions.length;
  const answered = current ? answers[current.id] != null : false;
  const roundComplete = roundSize > 0 && questions.every((q) => answers[q.id] != null);
  const isLastInRound = qIndex >= roundSize - 1;

  const pick = (idx: number) => {
    if (!current) return;
    setAnswers((prev) => ({ ...prev, [current.id]: idx }));
  };
  const goNext = () => {
    if (qIndex < roundSize - 1) setQIndex((i) => i + 1);
  };

  if (phase === 'intro') {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center', marginTop: 16 }}>
        <span className="ss-kicker ss-kicker--center">{t('placement.kicker')}</span>
        <div style={{ marginTop: 10 }}>
          <Heading level={2} justify="center">{t('placement.title')}</Heading>
        </div>
        <div style={{ marginTop: 8 }}>
          <Text color="secondary">{t('placement.subtitle')}</Text>
        </div>
        <div style={{ marginTop: 12, marginBottom: 24 }}>
          <Text type="supporting" color="secondary">{t('placement.idkCounts')}</Text>
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <AxButton variant="primary" label={t('placement.start')} onClick={() => void start()} />
          <AxButton variant="secondary" label={t('placement.cancel')} onClick={onCancel} />
        </div>
      </div>
    );
  }

  if (phase === 'loading' || phase === 'submitting') {
    return <QuoteLoader quote={t('quiz.loadingQuote')} label={t('placement.loading')} />;
  }

  if (phase === 'error') {
    return (
      <LessonError
        message={error ?? t('placement.error')}
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
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <IconTile size={52}>
            <BoltIcon size={24} />
          </IconTile>
        </div>
        <h1 ref={resultHeadingRef} tabIndex={-1} className="rm-finish-title">
          {t('placement.done')}
        </h1>
        <div style={{ marginTop: 4 }}>
          <Text color="secondary" weight="bold">{t('roadmap.skillCheckResult', { correct, total })}</Text>
        </div>
        <div style={{ marginTop: 8, marginBottom: 8 }}>
          <Text color="secondary">{t(tier as TranslationKey)}</Text>
        </div>
        <div style={{ marginBottom: 24 }}>
          <Text type="supporting" color="secondary">{t('placement.doneBody')}</Text>
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <AxButton variant="primary" label={t('roadmap.skillCheckBack')} onClick={() => onFinished(correct, verifiedUnlocks)} />
          <AxButton variant="secondary" label={t('placement.retry')} onClick={() => void start()} />
        </div>
      </div>
    );
  }

  /* ── playing ── */
  if (!current) return null;
  // Overall progress across every round (asked = questions answered in prior
  // rounds), so the bar advances steadily toward the 20-question total.
  const answeredSoFar = asked + qIndex + (answered ? 1 : 0);
  const progressPct = total > 0 ? (answeredSoFar / total) * 100 : 0;
  const stepLabel = step === 'up' ? t('placement.steppingUp') : step === 'down' ? t('placement.steppingDown') : t('placement.holding');
  const stepHint = step === 'up' ? t('placement.steppingUpHint') : step === 'down' ? t('placement.steppingDownHint') : t('placement.converging');
  const primaryLabel = isLastInRound && round >= totalRounds ? t('placement.finish') : t('placement.next');
  const primaryDisabled = isLastInRound ? !roundComplete : !answered;
  const onPrimary = isLastInRound ? () => void submitRound() : goNext;
  const optionValue = answered && answers[current.id] >= 0 ? answers[current.id] : null;

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <AxButton
          isIconOnly
          icon={<CloseIcon size={18} />}
          variant="ghost"
          size="sm"
          label={t('placement.cancel')}
          onClick={onCancel}
        />
        <div style={{ flex: 1 }}>
          <ProgressBar
            label={t('placement.roundOf', { n: round, total: totalRounds })}
            value={progressPct}
            isLabelHidden
            variant="accent"
          />
        </div>
        <Badge variant="neutral" label={t('placement.roundOf', { n: round, total: totalRounds })} />
      </div>

      {/* Between-round feedback: which way the difficulty just moved. role=status
          so assistive tech announces the shift when the round loads. */}
      {step && qIndex === 0 && (
        <div className="rm-step-banner" data-dir={step} role="status">
          <span className="rm-step-banner__glyph" aria-hidden="true"><StepArrowIcon dir={step} /></span>
          <strong>{stepLabel}</strong>
          <span className="rm-step-banner__hint">{stepHint}</span>
        </div>
      )}

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
          {t(categoryLabelKey(current.category))}
        </span>
        <div style={{ marginLeft: 'auto' }}>
          <Text type="supporting" color="secondary">
            {qIndex + 1}/{roundSize}
          </Text>
        </div>
      </div>

      <div id="placement-question" style={{ fontWeight: 500, marginBottom: 16 }}>{renderQuestion(current.question)}</div>

      <RadioCardGroup
        value={optionValue}
        onChange={(value) => pick(Number(value))}
        labelledBy="placement-question"
        style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        {current.options.map((option, idx) => {
          const picked = answers[current.id] === idx;
          return (
            <RadioCard
              key={idx}
              value={idx}
              index={idx}
              className="rm-option"
              style={{
                ['--rm-accent']: 'var(--brand-accent)',
                ...(picked ? { borderColor: 'var(--brand-accent)', backgroundColor: 'var(--brand-accent-soft)' } : {}),
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
            </RadioCard>
          );
        })}
      </RadioCardGroup>

      {/* "I don't know yet" — an explicit miss (index -1), so an honest skip is
          offered instead of forcing a blind guess. Selecting it clears any
          option pick for this question. */}
      <button
        type="button"
        className="rm-idk-btn"
        data-selected={answers[current.id] === IDK_INDEX}
        aria-pressed={answers[current.id] === IDK_INDEX}
        onClick={() => pick(IDK_INDEX)}
      >
        {t('placement.idkYet')}
      </button>
      <div className="rm-idk-hint">{t('placement.idkYetHint')}</div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, gap: 12 }}>
        <AxButton variant="ghost" label={t('placement.cancel')} onClick={onCancel} />
        <AxButton variant="primary" label={primaryLabel} onClick={onPrimary} isDisabled={primaryDisabled} />
      </div>
    </div>
  );
}

export default Roadmap;
