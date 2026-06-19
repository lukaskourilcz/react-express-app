import { useEffect, useRef, useState } from 'react';
import { Box, Typography, Button, LinearProgress, Chip, Skeleton, Tooltip } from '@mui/material';
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
  ROADMAP_LEVELS,
  CHECKPOINT_COUNT,
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

const TOPICS: RoadmapTopic[] = ['javascript', 'typescript', 'react'];
const TOPIC_KEY = 'devquiz:roadmap:topic';
const CHECKPOINT_GOLD = '#f5a623';

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

function nextAfter(a: Active): Active | null {
  if (a.kind === 'level') {
    if (a.ref % LEVELS_PER_CHECKPOINT === 0) return { kind: 'checkpoint', ref: a.ref / LEVELS_PER_CHECKPOINT };
    if (a.ref < ROADMAP_LEVELS) return { kind: 'level', ref: a.ref + 1 };
    return null;
  }
  if (a.ref < CHECKPOINT_COUNT) return { kind: 'level', ref: a.ref * LEVELS_PER_CHECKPOINT + 1 };
  return null;
}

function Roadmap() {
  const { lang, t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const progress = useRoadmapProgress();

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
    const next = nextAfter(active);
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
  const pathNodes = buildPath(levels, checkpoints);

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
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
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, mt: 2 }}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
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

          {/* The path */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {pathNodes.map((node, i) => {
              const isLast = i === pathNodes.length - 1;
              if (node.type === 'checkpoint') {
                const cp = node.meta;
                const unlocked = isCheckpointUnlocked(progress, topic, cp.checkpoint);
                const passed = isCheckpointPassed(progress, topic, cp.checkpoint);
                const best = checkpointBestPct(progress, topic, cp.checkpoint);
                return (
                  <Box key={`cp-${cp.checkpoint}`} className="rm-node" style={{ animationDelay: `${i * 0.03}s` }} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 1 }}>
                    <CheckpointNode cp={cp} unlocked={unlocked} passed={passed} best={best} onClick={() => open({ kind: 'checkpoint', ref: cp.checkpoint })} t={t} />
                    {!isLast && <Box aria-hidden sx={{ width: 4, height: 28, borderRadius: 2, backgroundColor: passed ? CHECKPOINT_GOLD : 'divider' }} />}
                  </Box>
                );
              }
              const meta = node.meta;
              const unlocked = isLevelUnlocked(progress, topic, meta.level);
              const passed = isLevelPassed(progress, topic, meta.level);
              const best = levelBestPct(progress, topic, meta.level);
              const offset = Math.round(Math.sin(i * 0.6) * 84);
              const isCurrent = unlocked && !passed;
              return (
                <Box key={`lvl-${meta.level}`} className="rm-node" style={{ animationDelay: `${i * 0.03}s` }} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', transform: `translateX(${offset}px)`, mb: 1 }}>
                  <LevelNode meta={meta} topic={topic} topicColor={topicColor} unlocked={unlocked} passed={passed} best={best} isCurrent={isCurrent} onClick={() => open({ kind: 'level', ref: meta.level })} t={t} />
                  {!isLast && <Box aria-hidden sx={{ width: 4, height: 24, borderRadius: 2, backgroundColor: passed ? topicColor : 'divider', opacity: passed ? 0.6 : 1 }} />}
                </Box>
              );
            })}
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
  meta, topic, topicColor, unlocked, passed, best, isCurrent, onClick, t,
}: {
  meta: RoadmapLevelMeta; topic: RoadmapTopic; topicColor: string;
  unlocked: boolean; passed: boolean; best: number; isCurrent: boolean;
  onClick: () => void; t: TFn;
}) {
  const stars = passed ? starsFor(best, 75) : 0;
  const onColorText = onCategoryColorText(topic);
  // Segment-start levels (6, 11, …) are gated by the preceding checkpoint, not
  // the previous level, so the locked hint differs.
  const gatedByCheckpoint = meta.level % LEVELS_PER_CHECKPOINT === 1 && meta.level > 1;
  const lockedHint = gatedByCheckpoint ? t('roadmap.lockedByCheckpoint') : t('roadmap.lockedHint');
  const label = unlocked
    ? `${t('roadmap.levelLabel', { n: meta.level })}: ${meta.title}${passed ? ` — ${t('roadmap.passed')} ${best}%` : ''}`
    : `${t('roadmap.levelLabel', { n: meta.level })}: ${t('roadmap.locked')}`;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
      <Tooltip title={unlocked ? '' : lockedHint} arrow placement="right">
        <Box
          component="button"
          type="button"
          className={isCurrent ? 'rm-pulse' : undefined}
          onClick={unlocked ? onClick : undefined}
          disabled={!unlocked}
          aria-label={label}
          sx={{
            position: 'relative', width: 64, height: 64, borderRadius: '50%', border: '3px solid',
            borderColor: passed || isCurrent ? topicColor : 'divider',
            backgroundColor: passed ? topicColor : 'background.paper',
            color: passed ? onColorText : unlocked ? topicColor : 'text.disabled',
            cursor: unlocked ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.25rem',
            boxShadow: isCurrent ? `0 4px 14px ${topicColor}66` : 'none',
            transition: 'transform 0.12s ease, box-shadow 0.2s ease',
            '&:hover': unlocked ? { transform: 'scale(1.08)' } : undefined,
          }}
        >
          {passed ? <CheckIcon /> : unlocked ? meta.level : <LockIcon />}
          {passed && (
            <Box sx={{ position: 'absolute', bottom: -8, display: 'flex', color: '#f5b301', backgroundColor: 'background.paper', borderRadius: 999, px: 0.25 }}>
              {[0, 1, 2].map((s) => <StarIcon key={s} filled={s < stars} />)}
            </Box>
          )}
        </Box>
      </Tooltip>
      <Typography variant="caption" sx={{ fontWeight: isCurrent ? 700 : 500, color: unlocked ? 'text.primary' : 'text.disabled', maxWidth: 150, textAlign: 'center', lineHeight: 1.2 }}>
        {meta.title}
      </Typography>
      {isCurrent && (
        <Chip label={t('roadmap.start')} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800, backgroundColor: topicColor, color: onColorText }} />
      )}
    </Box>
  );
}

/* ──── checkpoint (boss) node ───────────────────────────────────────────── */

function CheckpointNode({
  cp, unlocked, passed, best, onClick, t,
}: {
  cp: RoadmapCheckpointMeta; unlocked: boolean; passed: boolean; best: number; onClick: () => void; t: TFn;
}) {
  const isCurrent = unlocked && !passed;
  const from = cp.afterLevel - LEVELS_PER_CHECKPOINT + 1;
  const label = unlocked
    ? `${t('roadmap.checkpoint')}: ${cp.title}${passed ? ` — ${t('roadmap.passed')} ${best}%` : ''}`
    : `${t('roadmap.checkpoint')}: ${t('roadmap.locked')}`;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, my: 0.5 }}>
      <Tooltip title={unlocked ? '' : t('roadmap.checkpointLocked', { from, to: cp.afterLevel })} arrow placement="right">
        <Box
          component="button"
          type="button"
          className={isCurrent ? 'rm-pulse' : undefined}
          onClick={unlocked ? onClick : undefined}
          disabled={!unlocked}
          aria-label={label}
          sx={{
            position: 'relative', width: 84, height: 84, borderRadius: '24px',
            border: '3px solid',
            borderColor: passed || isCurrent ? CHECKPOINT_GOLD : 'divider',
            background: passed
              ? `linear-gradient(135deg, ${CHECKPOINT_GOLD}, #f7c948)`
              : unlocked
                ? `linear-gradient(135deg, ${CHECKPOINT_GOLD}22, ${CHECKPOINT_GOLD}11)`
                : 'background.paper',
            color: passed ? '#1a1a1a' : unlocked ? CHECKPOINT_GOLD : 'text.disabled',
            cursor: unlocked ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: isCurrent ? `0 6px 18px ${CHECKPOINT_GOLD}66` : 'none',
            transition: 'transform 0.12s ease, box-shadow 0.2s ease',
            '&:hover': unlocked ? { transform: 'scale(1.06)' } : undefined,
          }}
        >
          {passed ? <CheckIcon size={30} /> : unlocked ? <TrophyIcon /> : <LockIcon size={22} />}
        </Box>
      </Tooltip>
      <Typography variant="caption" sx={{ fontWeight: 700, color: unlocked ? 'text.primary' : 'text.disabled', textAlign: 'center', lineHeight: 1.2 }}>
        {cp.title}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.68rem' }}>
        {t('roadmap.checkpointMeta', { count: cp.questionCount, pct: cp.passPct })}
      </Typography>
    </Box>
  );
}

/* ──── lesson runner (instant feedback) ─────────────────────────────────── */

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

  const question = playable.questions[qIndex];

  const choose = (index: number) => {
    if (revealed) return;
    setSelected(index);
    setRevealed(true);
    if (index === question.correctAnswer) setCorrectCount((c) => c + 1);
  };

  const advance = () => {
    if (qIndex < total - 1) {
      setQIndex((i) => i + 1);
      setSelected(null);
      setRevealed(false);
    } else {
      onFinished(Math.round((correctCount / total) * 100));
      setFinished(true);
    }
  };

  const replay = () => {
    setFinished(false);
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
    const passed = pct >= playable.passPct;
    return (
      <Box sx={{ maxWidth: 520, mx: 'auto', textAlign: 'center', mt: 2, position: 'relative' }}>
        {passed && <Confetti color={accent} />}
        <Box className="rm-celebrate" sx={{ fontSize: '3.5rem', lineHeight: 1, mb: 1 }} aria-hidden>
          {passed ? (isCheckpoint ? '🏆' : '🎉') : '💪'}
        </Box>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 800, mb: 1 }}>
          {passed
            ? isCheckpoint ? t('roadmap.checkpointComplete') : t('roadmap.levelComplete')
            : isCheckpoint ? t('roadmap.checkpointFailed') : t('roadmap.levelFailed')}
        </Typography>
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
      {/* Header: exit + progress + running score */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Button onClick={onExit} variant="text" size="small" sx={{ minWidth: 'auto', color: 'text.secondary', fontSize: '1.1rem', lineHeight: 1 }} aria-label={t('roadmap.exit')}>
          ✕
        </Button>
        <LinearProgress
          variant="determinate"
          value={progressPct}
          aria-label={t('roadmap.question', { current: qIndex + 1, total })}
          sx={{ flex: 1, height: 12, borderRadius: 6, backgroundColor: 'action.hover', '& .MuiLinearProgress-bar': { borderRadius: 6, backgroundColor: accent, transition: 'transform 0.35s ease' } }}
        />
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', whiteSpace: 'nowrap' }}>
          {correctCount}/{total}
        </Typography>
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
            {qIndex < total - 1 ? t('roadmap.continue') : t('roadmap.finish')}
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
