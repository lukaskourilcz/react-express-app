import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Box, Typography, Button, LinearProgress, Chip, Skeleton, Tooltip, useTheme } from '@mui/material';
import type {
  RoadmapTopic,
  RoadmapLevelMeta,
  RoadmapCheckpointMeta,
  RoadmapPlayable,
  RoadmapStructure,
} from '../types/quiz';
import {
  fetchRoadmapStructure,
  fetchRoadmapLevel,
  fetchRoadmapCheckpoint,
  recordLevelResult,
  recordCheckpointResult,
  pushProgressToServer,
  syncProgressWithServer,
  useRoadmapProgress,
  isLevelUnlocked,
  isLevelPassed,
  isCheckpointUnlocked,
  isCheckpointPassed,
  levelBestPct,
  checkpointBestPct,
  passedLevelCount,
  LEVELS_PER_CHECKPOINT,
} from '../lib/roadmap';
import { getCategoryHexColor, getCategoryLabel, onCategoryColorText } from '../lib/categories';
import { BRAND } from '../theme/MuiTheme';
import { useLanguage } from '../i18n/LanguageContext';
import type { TranslationKey } from '../i18n/translations';
import { useAuth } from '../lib/auth';
import { friendlyError } from '../lib/api';
import { readString, writeString } from '../lib/storage';
import { renderQuestion } from './CodeBlock';
import './Roadmap.css';

type TFn = (key: TranslationKey, vars?: Record<string, string | number>) => string;
type Active = { kind: 'level' | 'checkpoint'; ref: number };

const TOPICS: RoadmapTopic[] = ['javascript', 'typescript', 'react', 'html', 'css', 'git'];
const TOPIC_KEY = 'devquiz:roadmap:topic';
const CHECKPOINT_GOLD = '#ffb300';
// Lives for a level lesson: one heart that drains a third per wrong answer.
const MAX_HEARTS = 3;
const HEART_COLOR = '#ff4b6e';
const CHECKPOINT_GRAD: [string, string] = ['#ffd54f', '#f5a623'];

// Vibrant rainbow palette by difficulty tier (1→5): the path warms up from a
// fresh green through blue/purple to a hot orange-red as levels get harder, so
// the whole map reads as a colorful ribbon. `solid` drives borders/glows/
// connectors; `grad` is the [light, dark] fill gradient for completed nodes.
const BANDS: { solid: string; grad: [string, string] }[] = [
  { solid: '#58cc02', grad: ['#7be24a', '#46a302'] }, // green
  { solid: '#15b3f0', grad: ['#56c8ff', '#0a8fd6'] }, // blue
  { solid: '#a560f0', grad: ['#c08bff', '#8a3ff0'] }, // purple
  { solid: '#ff9600', grad: ['#ffb84d', '#e67e00'] }, // orange
  { solid: '#ff4b4b', grad: ['#ff7a7a', '#e23b3b'] }, // red
];
const bandFor = (difficulty: number) => BANDS[Math.min(BANDS.length, Math.max(1, difficulty)) - 1];

interface PlacedNode {
  i: number;
  kind: 'level' | 'checkpoint';
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
  cp?: RoadmapCheckpointMeta;
}

// Track an element's width so the path can lay itself out responsively.
function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(el.getBoundingClientRect().width);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
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

// Build the ordered path: each level, with a checkpoint node after every 5th.
type PathNode =
  | { type: 'level'; meta: RoadmapLevelMeta }
  | { type: 'checkpoint'; meta: RoadmapCheckpointMeta };

function buildPath(levels: RoadmapLevelMeta[], checkpoints: RoadmapCheckpointMeta[]): PathNode[] {
  const out: PathNode[] = [];
  for (const meta of levels) {
    out.push({ type: 'level', meta });
    if (meta.level % LEVELS_PER_CHECKPOINT === 0) {
      const cp = checkpoints.find((c) => c.afterLevel === meta.level);
      if (cp) out.push({ type: 'checkpoint', meta: cp });
    }
  }
  return out;
}

// What to play after finishing `a`, given the active topic's level/checkpoint
// counts (topics differ: JS/TS/React have 25 levels, Git/HTML/CSS have 15).
function nextAfter(a: Active, levelCount: number, checkpointCount: number): Active | null {
  if (a.kind === 'level') {
    if (a.ref % LEVELS_PER_CHECKPOINT === 0) return { kind: 'checkpoint', ref: a.ref / LEVELS_PER_CHECKPOINT };
    if (a.ref < levelCount) return { kind: 'level', ref: a.ref + 1 };
    return null;
  }
  if (a.ref < checkpointCount) return { kind: 'level', ref: a.ref * LEVELS_PER_CHECKPOINT + 1 };
  return null;
}

function Roadmap() {
  const { lang, t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const progress = useRoadmapProgress();
  const theme = useTheme();
  const [pathRef, pathWidth] = useElementWidth<HTMLDivElement>();

  const [structure, setStructure] = useState<RoadmapStructure | null>(null);
  const [loadingStructure, setLoadingStructure] = useState(true);
  const [structureError, setStructureError] = useState<string | null>(null);
  const [topic, setTopic] = useState<RoadmapTopic>(() => {
    const saved = readString(TOPIC_KEY);
    return saved && (TOPICS as string[]).includes(saved) ? (saved as RoadmapTopic) : 'javascript';
  });

  const [active, setActive] = useState<Active | null>(null);
  const [playable, setPlayable] = useState<RoadmapPlayable | null>(null);
  const [loadingLesson, setLoadingLesson] = useState(false);
  const [lessonError, setLessonError] = useState<string | null>(null);
  const lessonAbortRef = useRef<AbortController | null>(null);

  const loadStructure = () => {
    const controller = new AbortController();
    setLoadingStructure(true);
    setStructureError(null);
    fetchRoadmapStructure(controller.signal)
      .then((data) => {
        setStructure(data);
        setLoadingStructure(false);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setStructureError(friendlyError(err));
        setLoadingStructure(false);
      });
    return () => controller.abort();
  };

  useEffect(loadStructure, []);

  // Pull account progress on sign-in and merge with this device.
  useEffect(() => {
    if (isAuthenticated) syncProgressWithServer();
  }, [isAuthenticated]);

  const selectTopic = (next: RoadmapTopic) => {
    setTopic(next);
    writeString(TOPIC_KEY, next);
  };

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
        : fetchRoadmapCheckpoint(topic, a.ref, lang, controller.signal);
    req
      .then((data) => {
        if (controller.signal.aborted) return;
        setPlayable(data);
        setLoadingLesson(false);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setLessonError(friendlyError(err));
        setLoadingLesson(false);
      });
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
    if (active.kind === 'level') recordLevelResult(topic, active.ref, pct, playable.passPct);
    else recordCheckpointResult(topic, active.ref, pct, playable.passPct);
    if (isAuthenticated) pushProgressToServer().catch(() => {});
  };

  const levels: RoadmapLevelMeta[] = structure?.structure[topic]?.levels ?? [];
  const checkpoints: RoadmapCheckpointMeta[] = structure?.structure[topic]?.checkpoints ?? [];
  const topicColor = getCategoryHexColor(topic);

  // Lay the path out as a serpentine: nodes flow left→right and gently down,
  // then wrap and flow back the other way — using the full available width.
  // Positions are computed analytically so the SVG connectors can be drawn
  // exactly through the node centres without measuring each node.
  const layout = useMemo(() => {
    if (!pathWidth || levels.length === 0) return null;
    const nodes = buildPath(levels, checkpoints);
    const cols = Math.max(2, Math.min(5, Math.floor(pathWidth / 150)));
    const cellW = pathWidth / cols;
    // ROW_H must clear the accumulated within-row slope so the lowest node of a
    // row doesn't collide with the next row's start node (same column at a turn) —
    // including a taller checkpoint node and its two-line label.
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
      if (node.type === 'checkpoint') {
        const cp = node.meta;
        const passed = isCheckpointPassed(progress, topic, cp.checkpoint);
        const unlocked = isCheckpointUnlocked(progress, topic, cp.checkpoint);
        return {
          i, kind: 'checkpoint', key: `cp-${cp.checkpoint}`, cx, cy, half: 42,
          accent: CHECKPOINT_GOLD, grad: CHECKPOINT_GRAD, cp,
          unlocked, passed, isCurrent: unlocked && !passed,
          best: checkpointBestPct(progress, topic, cp.checkpoint),
        };
      }
      const meta = node.meta;
      const band = bandFor(meta.difficulty);
      const passed = isLevelPassed(progress, topic, meta.level);
      const unlocked = isLevelUnlocked(progress, topic, meta.level);
      return {
        i, kind: 'level', key: `lvl-${meta.level}`, cx, cy, half: 32,
        accent: band.solid, grad: band.grad, level: meta,
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
  }, [pathWidth, levels, checkpoints, progress, topic]);

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
    const next = nextAfter(active, levels.length, checkpoints.length);
    return (
      <LessonRunner
        key={`${topic}-${active.kind}-${active.ref}`}
        playable={playable}
        topicColor={topicColor}
        hasNext={!!next}
        nextLabel={next?.kind === 'checkpoint' ? t('roadmap.toCheckpoint') : t('roadmap.nextLevel')}
        onExit={exitLesson}
        onFinished={handleFinished}
        onNext={() => next && open(next)}
        t={t}
      />
    );
  }

  /* ──── map view ─────────────────────────────────────────────────────── */
  const done = passedLevelCount(progress, topic);

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h5" component="h1" sx={{ fontWeight: 800, textAlign: 'center', mb: 0.5 }}>
        {t('roadmap.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 3 }}>
        {t('roadmap.subtitle')}
      </Typography>

      {/* Topic selector */}
      <Box role="tablist" aria-label={t('roadmap.topicsAria')} sx={{ display: 'flex', gap: 1, justifyContent: 'center', mb: 3, flexWrap: 'wrap' }}>
        {TOPICS.map((value) => {
          const selected = topic === value;
          const color = getCategoryHexColor(value);
          return (
            <Button
              key={value}
              role="tab"
              aria-selected={selected}
              onClick={() => selectTopic(value)}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                px: 2.5,
                py: 1,
                borderRadius: 999,
                transition: 'all 0.15s ease',
                color: selected ? onCategoryColorText(value) : 'text.secondary',
                backgroundColor: selected ? color : 'background.paper',
                border: '2px solid',
                borderColor: selected ? color : 'divider',
                '&:hover': { backgroundColor: selected ? color : 'action.hover', borderColor: color },
              }}
            >
              {getCategoryLabel(value)}
            </Button>
          );
        })}
      </Box>

      {loadingStructure ? (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 3, mt: 2 }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} variant="circular" width={64} height={64} />
          ))}
        </Box>
      ) : structureError ? (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography color="error" sx={{ mb: 2 }} role="alert">{structureError}</Typography>
          <Button variant="outlined" onClick={loadStructure}>{t('roadmap.retry')}</Button>
        </Box>
      ) : (
        <>
          {/* Topic progress */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                {getCategoryLabel(topic)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t('roadmap.progress', { done, total: levels.length })}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={levels.length ? (done / levels.length) * 100 : 0}
              aria-label={t('roadmap.progress', { done, total: levels.length })}
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
                      {n.kind === 'checkpoint' ? (
                        <CheckpointNode
                          cp={n.cp!}
                          accent={n.accent}
                          grad={n.grad}
                          unlocked={n.unlocked}
                          passed={n.passed}
                          best={n.best}
                          isCurrent={n.isCurrent}
                          cellW={layout.cellW}
                          onClick={() => open({ kind: 'checkpoint', ref: n.cp!.checkpoint })}
                          t={t}
                        />
                      ) : (
                        <LevelNode
                          meta={n.level!}
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

          {done === levels.length && levels.length > 0 && (
            <Typography sx={{ textAlign: 'center', mt: 3, fontWeight: 800, color: topicColor }}>
              {t('roadmap.allDone')}
            </Typography>
          )}
        </>
      )}
    </Box>
  );
}

/* ──── level node ───────────────────────────────────────────────────────── */

function LevelNode({
  meta, accent, grad, unlocked, passed, best, isCurrent, onClick, t, cellW,
}: {
  meta: RoadmapLevelMeta; accent: string; grad: [string, string];
  unlocked: boolean; passed: boolean; best: number; isCurrent: boolean;
  onClick: () => void; t: TFn; cellW: number;
}) {
  const stars = passed ? starsFor(best, 75) : 0;
  // Segment-start levels (6, 11, …) are gated by the preceding checkpoint, not
  // the previous level, so the locked hint differs.
  const gatedByCheckpoint = meta.level % LEVELS_PER_CHECKPOINT === 1 && meta.level > 1;
  const lockedHint = gatedByCheckpoint ? t('roadmap.lockedByCheckpoint') : t('roadmap.lockedHint');
  const label = unlocked
    ? `${t('roadmap.levelLabel', { n: meta.level })}: ${meta.title}${passed ? ` — ${t('roadmap.passed')} ${best}%` : ''}`
    : `${t('roadmap.levelLabel', { n: meta.level })}: ${t('roadmap.locked')}`;
  const labelWidth = Math.max(72, Math.min(150, cellW - 10));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
      <Box className={isCurrent ? 'rm-bob' : undefined}>
        <Tooltip title={unlocked ? '' : lockedHint} arrow placement="top">
          <Box
            component="button"
            type="button"
            className={isCurrent ? 'rm-ring' : undefined}
            style={isCurrent ? ({ ['--rm-accent']: accent } as CSSProperties) : undefined}
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
              boxShadow: passed ? `0 6px 16px ${accent}59` : 'none',
              transition: 'transform 0.14s ease, box-shadow 0.2s ease',
              '&:hover': unlocked ? { transform: 'scale(1.12) rotate(-3deg)' } : undefined,
              '&:active': unlocked ? { transform: 'scale(0.95)' } : undefined,
            }}
          >
            {passed ? <CheckIcon /> : unlocked ? meta.level : <LockIcon />}
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

/* ──── checkpoint (boss) node ───────────────────────────────────────────── */

function CheckpointNode({
  cp, accent, grad, unlocked, passed, best, isCurrent, onClick, t, cellW,
}: {
  cp: RoadmapCheckpointMeta; accent: string; grad: [string, string];
  unlocked: boolean; passed: boolean; best: number; isCurrent: boolean;
  onClick: () => void; t: TFn; cellW: number;
}) {
  const from = cp.afterLevel - LEVELS_PER_CHECKPOINT + 1;
  const label = unlocked
    ? `${t('roadmap.checkpoint')}: ${cp.title}${passed ? ` — ${t('roadmap.passed')} ${best}%` : ''}`
    : `${t('roadmap.checkpoint')}: ${t('roadmap.locked')}`;
  const labelWidth = Math.max(84, Math.min(160, cellW - 8));
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
      <Box className={isCurrent ? 'rm-bob' : undefined}>
        <Tooltip title={unlocked ? '' : t('roadmap.checkpointLocked', { from, to: cp.afterLevel })} arrow placement="top">
          <Box
            component="button"
            type="button"
            className={isCurrent ? 'rm-ring rm-shimmer' : undefined}
            style={isCurrent ? ({ ['--rm-accent']: accent } as CSSProperties) : undefined}
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
              boxShadow: passed ? `0 8px 20px ${accent}66` : 'none',
              transition: 'transform 0.14s ease, box-shadow 0.2s ease',
              '&:hover': unlocked ? { transform: 'scale(1.08) rotate(2deg)' } : undefined,
              '&:active': unlocked ? { transform: 'scale(0.97)' } : undefined,
            }}
          >
            {passed ? <CheckIcon size={30} /> : unlocked ? <TrophyIcon /> : <LockIcon size={22} />}
          </Box>
        </Tooltip>
      </Box>
      <Typography variant="caption" sx={{ fontWeight: 700, color: unlocked ? 'text.primary' : 'text.disabled', textAlign: 'center', lineHeight: 1.15, maxWidth: labelWidth }}>
        {cp.title}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.66rem' }}>
        {t('roadmap.checkpointMeta', { count: cp.questionCount, pct: cp.passPct })}
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
  const isCheckpoint = playable.kind === 'checkpoint';
  const accent = isCheckpoint ? CHECKPOINT_GOLD : topicColor;
  const total = playable.questions.length;
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  // Hearts apply to levels only; checkpoints keep the percent-based pass rule.
  const [mistakes, setMistakes] = useState(0);
  const [dead, setDead] = useState(false);
  const [heartHit, setHeartHit] = useState(false);

  const question = playable.questions[qIndex];
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
    setFinished(false);
    setDead(false);
    setMistakes(0);
    setQIndex(0);
    setSelected(null);
    setRevealed(false);
    setCorrectCount(0);
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
            <Typography variant="caption" sx={{ ml: 'auto', fontWeight: 700, color: 'text.secondary', whiteSpace: 'nowrap' }}>
              {t('roadmap.question', { current: qIndex + 1, total })}
            </Typography>
          </>
        )}
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

export default Roadmap;
