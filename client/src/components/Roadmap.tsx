import { useEffect, useRef, useState } from 'react';
import { Box, Typography, Button, LinearProgress, Chip, Skeleton } from '@mui/material';
import type {
  RoadmapTopic,
  RoadmapLevelMeta,
  RoadmapLevel,
  RoadmapStructure,
} from '../types/quiz';
import {
  fetchRoadmapStructure,
  fetchRoadmapLevel,
  recordLevelResult,
  useRoadmapProgress,
  isLevelUnlocked,
  isLevelPassed,
  levelBestPct,
  passedCount,
  PASS_THRESHOLD,
} from '../lib/roadmap';
import {
  getCategoryHexColor,
  getCategoryLabel,
  onCategoryColorText,
} from '../lib/categories';
import { BRAND } from '../theme/MuiTheme';
import { useLanguage } from '../i18n/LanguageContext';
import type { TranslationKey } from '../i18n/translations';
import { friendlyError } from '../lib/api';
import { renderQuestion } from './CodeBlock';

const TOPICS: RoadmapTopic[] = ['javascript', 'typescript', 'react'];

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

const StarIcon = ({ filled, size = 14 }: { filled: boolean; size?: number }) => (
  <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

// 0–3 stars from the best score, so passed levels show how cleanly they were cleared.
function starsFor(pct: number): number {
  if (pct >= 100) return 3;
  if (pct >= PASS_THRESHOLD) return 2;
  if (pct > 0) return 1;
  return 0;
}

function Roadmap() {
  const { lang, t } = useLanguage();
  const progress = useRoadmapProgress();

  const [structure, setStructure] = useState<RoadmapStructure | null>(null);
  const [loadingStructure, setLoadingStructure] = useState(true);
  const [structureError, setStructureError] = useState<string | null>(null);
  const [topic, setTopic] = useState<RoadmapTopic>('javascript');

  const [activeLevel, setActiveLevel] = useState<number | null>(null);
  const [lesson, setLesson] = useState<RoadmapLevel | null>(null);
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

  const openLevel = (level: number) => {
    lessonAbortRef.current?.abort();
    const controller = new AbortController();
    lessonAbortRef.current = controller;
    setActiveLevel(level);
    setLesson(null);
    setLoadingLesson(true);
    setLessonError(null);
    fetchRoadmapLevel(topic, level, lang, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setLesson(data);
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
    setActiveLevel(null);
    setLesson(null);
    setLessonError(null);
    setLoadingLesson(false);
  };

  const levels: RoadmapLevelMeta[] = structure?.structure[topic] ?? [];
  const topicColor = getCategoryHexColor(topic);

  /* ──── lesson view ──────────────────────────────────────────────────── */
  if (activeLevel !== null) {
    if (loadingLesson) {
      return (
        <Box sx={{ maxWidth: 640, mx: 'auto' }}>
          <Skeleton variant="text" width="40%" />
          <Skeleton variant="rectangular" height={8} sx={{ my: 2, borderRadius: 1 }} />
          <Skeleton variant="rounded" height={120} sx={{ mb: 2 }} />
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" height={52} sx={{ mb: 1.25 }} />
          ))}
        </Box>
      );
    }
    if (lessonError || !lesson) {
      return (
        <LessonError message={lessonError ?? t('roadmap.error')} onRetry={() => openLevel(activeLevel)} onExit={exitLesson} t={t} />
      );
    }
    return (
      <LessonRunner
        key={`${topic}-${lesson.level}`}
        level={lesson}
        topicColor={topicColor}
        hasNext={lesson.level < levels.length}
        onExit={exitLesson}
        onFinished={(pct) => recordLevelResult(topic, lesson.level, pct)}
        onNext={() => openLevel(lesson.level + 1)}
      />
    );
  }

  /* ──── map view ─────────────────────────────────────────────────────── */
  const done = passedCount(progress, topic);

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <Typography variant="h5" component="h1" sx={{ fontWeight: 700, textAlign: 'center', mb: 0.5 }}>
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
              onClick={() => setTopic(value)}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                px: 2.5,
                py: 1,
                borderRadius: 999,
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
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
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
              sx={{ height: 8, borderRadius: 4, backgroundColor: 'action.hover', '& .MuiLinearProgress-bar': { borderRadius: 4, backgroundColor: topicColor } }}
            />
          </Box>

          {/* The path */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            {levels.map((meta, i) => {
              const unlocked = isLevelUnlocked(progress, topic, meta.level);
              const passed = isLevelPassed(progress, topic, meta.level);
              const best = levelBestPct(progress, topic, meta.level);
              // Gentle zig-zag so the path reads like a winding road.
              const offset = Math.round(Math.sin(i * 0.6) * 92);
              const isCurrent = unlocked && !passed;
              return (
                <Box key={meta.level} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', transform: `translateX(${offset}px)`, mb: 1 }}>
                  <LevelNode
                    meta={meta}
                    topic={topic}
                    topicColor={topicColor}
                    unlocked={unlocked}
                    passed={passed}
                    best={best}
                    isCurrent={isCurrent}
                    onClick={() => openLevel(meta.level)}
                    t={t}
                  />
                  {i < levels.length - 1 && (
                    <Box aria-hidden sx={{ width: 4, height: 26, borderRadius: 2, backgroundColor: passed ? topicColor : 'divider', opacity: passed ? 0.6 : 1 }} />
                  )}
                </Box>
              );
            })}
          </Box>

          {done === levels.length && levels.length > 0 && (
            <Typography sx={{ textAlign: 'center', mt: 3, fontWeight: 700, color: topicColor }}>
              {t('roadmap.allDone')}
            </Typography>
          )}
        </>
      )}
    </Box>
  );
}

/* ──── level node on the path ───────────────────────────────────────────── */

function LevelNode({
  meta,
  topic,
  topicColor,
  unlocked,
  passed,
  best,
  isCurrent,
  onClick,
  t,
}: {
  meta: RoadmapLevelMeta;
  topic: RoadmapTopic;
  topicColor: string;
  unlocked: boolean;
  passed: boolean;
  best: number;
  isCurrent: boolean;
  onClick: () => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}) {
  const stars = passed ? starsFor(best) : 0;
  const onColorText = onCategoryColorText(topic);
  const label = unlocked
    ? `${t('roadmap.levelLabel', { n: meta.level })}: ${meta.title}${passed ? ` — ${t('roadmap.passed')} ${best}%` : ''}`
    : `${t('roadmap.levelLabel', { n: meta.level })}: ${t('roadmap.locked')}`;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
      <Box
        component="button"
        type="button"
        onClick={unlocked ? onClick : undefined}
        disabled={!unlocked}
        aria-label={label}
        sx={{
          position: 'relative',
          width: 64,
          height: 64,
          borderRadius: '50%',
          border: '3px solid',
          borderColor: passed ? topicColor : isCurrent ? topicColor : 'divider',
          backgroundColor: passed ? topicColor : 'background.paper',
          color: passed ? onColorText : unlocked ? topicColor : 'text.disabled',
          cursor: unlocked ? 'pointer' : 'not-allowed',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: '1.25rem',
          boxShadow: isCurrent ? `0 0 0 4px ${topicColor}33` : 'none',
          transition: 'transform 0.1s ease',
          '&:hover': unlocked ? { transform: 'scale(1.06)' } : undefined,
        }}
      >
        {passed ? <CheckIcon /> : unlocked ? meta.level : <LockIcon />}
        {passed && (
          <Box sx={{ position: 'absolute', bottom: -8, display: 'flex', color: '#f5b301', backgroundColor: 'background.paper', borderRadius: 999, px: 0.25 }}>
            {[0, 1, 2].map((s) => (
              <StarIcon key={s} filled={s < stars} />
            ))}
          </Box>
        )}
      </Box>
      <Typography variant="caption" sx={{ fontWeight: isCurrent ? 700 : 500, color: unlocked ? 'text.primary' : 'text.disabled', maxWidth: 150, textAlign: 'center', lineHeight: 1.2 }}>
        {meta.title}
      </Typography>
      {isCurrent && (
        <Chip label={t('roadmap.start')} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, backgroundColor: topicColor, color: onColorText }} />
      )}
    </Box>
  );
}

/* ──── lesson runner (Duolingo-style instant feedback) ──────────────────── */

function LessonRunner({
  level,
  topicColor,
  hasNext,
  onExit,
  onFinished,
  onNext,
}: {
  level: RoadmapLevel;
  topicColor: string;
  hasNext: boolean;
  onExit: () => void;
  onFinished: (pct: number) => void;
  onNext: () => void;
}) {
  const { t } = useLanguage();
  const total = level.questions.length;
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const question = level.questions[qIndex];

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
      const pct = Math.round((correctCount / total) * 100);
      onFinished(pct);
      setFinished(true);
    }
  };

  // Keyboard: number keys pick an answer, Enter continues after reveal.
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

  const replay = () => {
    setFinished(false);
    setQIndex(0);
    setSelected(null);
    setRevealed(false);
    setCorrectCount(0);
  };

  if (finished) {
    const pct = Math.round((correctCount / total) * 100);
    const passed = pct >= PASS_THRESHOLD;
    return (
      <Box sx={{ maxWidth: 520, mx: 'auto', textAlign: 'center', mt: 2 }}>
        <Box sx={{ fontSize: '3.5rem', lineHeight: 1, mb: 1 }} aria-hidden>{passed ? '🎉' : '💪'}</Box>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 800, mb: 1 }}>
          {passed ? t('roadmap.levelComplete') : t('roadmap.levelFailed')}
        </Typography>
        <Typography variant="h3" sx={{ fontWeight: 800, color: passed ? topicColor : 'text.secondary', mb: 0.5 }}>
          {pct}%
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 1 }}>
          {t('roadmap.scoreLine', { correct: correctCount, total })}
        </Typography>
        {!passed && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('roadmap.passNeeded', { pct: PASS_THRESHOLD })}
          </Typography>
        )}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, mt: 2 }}>
          {passed && hasNext && (
            <Button variant="contained" onClick={onNext} sx={{ textTransform: 'none', fontWeight: 700, backgroundColor: topicColor, '&:hover': { backgroundColor: topicColor, filter: 'brightness(0.92)' } }}>
              {t('roadmap.nextLevel')}
            </Button>
          )}
          <Button variant={passed ? 'outlined' : 'contained'} onClick={replay} sx={{ textTransform: 'none', fontWeight: 700, ...(passed ? {} : { backgroundColor: topicColor, '&:hover': { backgroundColor: topicColor, filter: 'brightness(0.92)' } }) }}>
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

  return (
    <Box sx={{ maxWidth: 640, mx: 'auto' }}>
      {/* Header: exit + progress */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Button onClick={onExit} variant="text" size="small" sx={{ minWidth: 'auto', color: 'text.secondary', textTransform: 'none' }} aria-label={t('roadmap.exit')}>
          ✕
        </Button>
        <LinearProgress
          variant="determinate"
          value={progressPct}
          aria-label={t('roadmap.question', { current: qIndex + 1, total })}
          sx={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: 'action.hover', '& .MuiLinearProgress-bar': { borderRadius: 5, backgroundColor: topicColor } }}
        />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Chip label={`${t('roadmap.levelLabel', { n: level.level })} · ${level.title}`} size="small" sx={{ fontWeight: 600, backgroundColor: `${topicColor}22`, color: 'text.primary' }} />
        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
          {t('roadmap.question', { current: qIndex + 1, total })}
        </Typography>
      </Box>

      {/* Question */}
      <Box sx={{ fontWeight: 500, mb: 2 }}>{renderQuestion(question.question)}</Box>

      {/* Options */}
      <Box role="group" aria-label={question.question.replace(/```[\s\S]*?```/g, '').trim()} sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        {question.options.map((option, index) => {
          const isCorrect = index === question.correctAnswer;
          const isPicked = index === selected;
          let borderColor = 'divider';
          let bg = 'background.paper';
          let fg = 'text.primary';
          if (revealed && isCorrect) {
            borderColor = '#2e7d32'; bg = 'rgba(46,125,50,0.12)'; fg = '#2e7d32';
          } else if (revealed && isPicked && !isCorrect) {
            borderColor = '#c62828'; bg = 'rgba(198,40,40,0.12)'; fg = '#c62828';
          } else if (isPicked) {
            borderColor = topicColor;
          }
          return (
            <Box
              key={index}
              component="button"
              type="button"
              onClick={() => choose(index)}
              disabled={revealed}
              aria-pressed={isPicked}
              sx={{
                textAlign: 'left',
                px: 2,
                py: 1.5,
                borderRadius: 2,
                border: '2px solid',
                borderColor,
                backgroundColor: bg,
                color: fg,
                fontSize: '0.95rem',
                fontWeight: 600,
                fontFamily: 'inherit',
                cursor: revealed ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                transition: 'border-color 0.1s ease, background-color 0.1s ease',
                '&:hover': revealed ? undefined : { borderColor: topicColor, backgroundColor: 'action.hover' },
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

      {/* Feedback + continue */}
      {revealed && (
        <Box sx={{ mt: 2, p: 2, borderRadius: 2, borderLeft: '4px solid', borderColor: selected === question.correctAnswer ? '#2e7d32' : '#c62828', backgroundColor: selected === question.correctAnswer ? 'rgba(46,125,50,0.08)' : 'rgba(198,40,40,0.08)' }}>
          <Typography sx={{ fontWeight: 800, color: selected === question.correctAnswer ? '#2e7d32' : '#c62828', mb: 0.5 }}>
            {selected === question.correctAnswer ? t('roadmap.correct') : t('roadmap.incorrect')}
          </Typography>
          <Typography variant="body2" color="text.secondary">{question.explanation}</Typography>
          <Button
            fullWidth
            variant="contained"
            onClick={advance}
            sx={{ mt: 2, textTransform: 'none', fontWeight: 700, backgroundColor: topicColor, '&:hover': { backgroundColor: topicColor, filter: 'brightness(0.92)' } }}
          >
            {qIndex < total - 1 ? t('roadmap.continue') : t('roadmap.finish')}
          </Button>
        </Box>
      )}
    </Box>
  );
}

function LessonError({
  message,
  onRetry,
  onExit,
  t,
}: {
  message: string;
  onRetry: () => void;
  onExit: () => void;
  t: (key: TranslationKey) => string;
}) {
  return (
    <Box sx={{ maxWidth: 480, mx: 'auto', textAlign: 'center', mt: 4 }}>
      <Typography color="error" role="alert" sx={{ mb: 2 }}>{message}</Typography>
      <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center' }}>
        <Button variant="contained" onClick={onRetry} sx={{ textTransform: 'none', ...{ backgroundColor: BRAND.green, '&:hover': { backgroundColor: BRAND.greenHover } } }}>
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
