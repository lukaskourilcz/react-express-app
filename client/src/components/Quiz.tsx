import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Badge } from '@astryxdesign/core/Badge';
import { SelectableCard } from '@astryxdesign/core/SelectableCard';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { Banner } from '@astryxdesign/core/Banner';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import { Popover } from '@astryxdesign/core/Popover';
import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { AppToast } from './ui/AppToast';
import { useAuth, getUserProfile } from '../lib/auth';
import { useActiveSubject } from '../lib/subjects';
import type { Question, QuizResult, QuizState, DifficultyMode, CategoryType } from '../types/quiz';
import { CATEGORY_GRADIENT, visuallyHidden } from '../theme/MuiTheme';
import {
  CATEGORY_LOOKUP,
  CATEGORY_OPTIONS,
  visibleCategoryOptionsFor,
  onCategoryColorText,
  getCategoryHexColor,
  getCategoryLabel,
} from '../lib/categories';
import { readJSON, writeJSON } from '../lib/storage';
import {
  recordQuizResult,
  createOrUpdateUserStats,
  getDailyChallenge,
  reportQuestion,
} from '../lib/supabase';
import { recordCategoryStats } from '../lib/play';
import { apiFetch, friendlyError } from '../lib/api';
import { renderQuestion } from './CodeBlock';
import { QuoteLoader, holdLoadingScreen } from './LoadingScreen';
import { RotatingTip } from './reactbits/RotatingTip';
import { toggleBookmark as toggleBookmarkLib, useBookmarks } from '../lib/bookmarks';
import { addFlashcard, removeFlashcard } from '../lib/flashcards';
import { useLanguage } from '../i18n/LanguageContext';
import type { TranslationKey } from '../i18n/translations';
import { useSettings, playCorrect, playComplete } from '../lib/settings';
import { recordPerfectQuiz } from '../lib/achievements';
import { awardQuestXp } from '../lib/xp';
import { computeQuizXp, CHALLENGE_MIN_XP } from '../lib/leveling';
import { useGameConfig } from '../lib/gameConfig';
import { ReportDialog } from './ReportDialog';
import { capture } from '../lib/analytics';
import { MotionPop, MotionItem } from '../lib/motion';
import './Quiz.css';

type QuizMode = 'standard' | 'daily';

const DIFFICULTY_VALUES: DifficultyMode[] = ['basics', 'easy', 'zero-to-hero', 'advanced', 'mixed'];

const PROGRESS_KEY = 'devquiz:in-progress';
const SETUP_KEY = 'devquiz:quiz-setup:v1';


interface SavedSetup {
  count?: number;
  difficulty?: DifficultyMode;
  categories?: string[];
}

interface PersistedProgress {
  sessionId: string;
  questions: Question[];
  answers: Record<string, number>;
  currentIndex: number;
  mode: QuizMode;
}

const HintIcon = () => (
  <svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
  </svg>
);

const BookmarkIcon = ({ filled }: { filled: boolean }) => (
  <svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

const ShareIcon = () => (
  <svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);

const ReportFlagIcon = () => (
  <svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <line x1="4" y1="22" x2="4" y2="15" />
  </svg>
);

// Shared style for the small icon-only action buttons in the review list
// (bookmark / report / hint) — a MUI-free stand-in for IconButton size="small".
const iconBtnStyle = (color: string): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 32,
  height: 32,
  padding: 0,
  margin: 0,
  border: 'none',
  borderRadius: 8,
  background: 'transparent',
  color,
  cursor: 'pointer',
});

// A compact category tag that keeps each subject's brand/logo colour (Astryx
// Badge only exposes a fixed palette, so we render the exact hex tint here).
const CategoryTag = ({ category }: { category: CategoryType }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      height: 26,
      padding: '0 10px',
      borderRadius: 8,
      fontSize: '0.78rem',
      fontWeight: 600,
      lineHeight: 1,
      backgroundColor: getCategoryHexColor(category),
      color: onCategoryColorText(category),
    }}
  >
    {getCategoryLabel(category)}
  </span>
);

function Quiz({ onActiveChange }: { onActiveChange?: (active: boolean) => void }) {
  const { lang, t } = useLanguage();
  const navigate = useNavigate();
  const config = useGameConfig();
  const subject = useActiveSubject();
  const [state, setState] = useState<QuizState>('ready');
  const [sessionId, setSessionId] = useState<string>('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Setup preferences persist across visits, so a returning learner's
  // categories/count/difficulty are one tap from "Start quiz".
  const [questionCount, setQuestionCount] = useState<number>(() => {
    const saved = readJSON<SavedSetup>(SETUP_KEY, {});
    return typeof saved.count === 'number' && saved.count >= 1 && saved.count <= 50 ? saved.count : 10;
  });
  const [difficultyMode, setDifficultyMode] = useState<DifficultyMode>(() => {
    const saved = readJSON<SavedSetup>(SETUP_KEY, {});
    return saved.difficulty && DIFFICULTY_VALUES.includes(saved.difficulty) ? saved.difficulty : 'zero-to-hero';
  });
  const [selectedCategories, setSelectedCategories] = useState<CategoryType[]>(() => {
    const saved = readJSON<SavedSetup>(SETUP_KEY, {});
    if (!Array.isArray(saved.categories)) return [];
    const known = new Set(CATEGORY_OPTIONS.map((c) => c.value));
    return saved.categories.filter((c): c is CategoryType => known.has(c as CategoryType));
  });
  const [revealedHints, setRevealedHints] = useState<Record<string, boolean>>({});
  const [attemptedStart, setAttemptedStart] = useState(false);
  const { ids: bookmarks } = useBookmarks();
  const [snack, setSnack] = useState<string | null>(null);
  const [mode, setMode] = useState<QuizMode>('standard');
  const [reportTarget, setReportTarget] = useState<string | null>(null);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [settings] = useSettings();

  const resultHeadingRef = useRef<HTMLDivElement | null>(null);
  const fetchAbortRef = useRef<AbortController | null>(null);

  const { isAuthenticated, user } = useAuth();
  const profile = getUserProfile(user);
  const visibleCategoryOptions = visibleCategoryOptionsFor(profile.email);
  const visibleCategories = visibleCategoryOptions.map((c) => c.value);

  // The /dev "default visible categories" setting picks which chips appear on
  // first sight; the rest unlock when the learner clicks "Show all". Empty
  // list (or no overlap with what this user can see) means show everything.
  const defaultCategoryIds = config.quiz.defaultCategoryIds ?? [];
  const defaultVisibleSet = useMemo(() => new Set(defaultCategoryIds), [defaultCategoryIds]);
  const collapsedOptions = useMemo(
    () =>
      defaultVisibleSet.size > 0
        ? visibleCategoryOptions.filter((c) => defaultVisibleSet.has(c.value))
        : visibleCategoryOptions,
    [defaultVisibleSet, visibleCategoryOptions],
  );
  const hasCollapsedSubset =
    collapsedOptions.length > 0 && collapsedOptions.length < visibleCategoryOptions.length;
  const [showAllCategories, setShowAllCategories] = useState(false);

  // Lookup table for the review-mode result rows. Replaces an O(n) array.find()
  // per question with an O(1) Map.get() — important when the snackbar/report
  // dialog opens and re-renders the whole list of 20–50 questions.
  const resultsById = useMemo(
    () => new Map((result?.results ?? []).map((r) => [r.questionId, r])),
    [result],
  );
  const displayedCategoryOptions = hasCollapsedSubset && !showAllCategories
    ? collapsedOptions
    : visibleCategoryOptions;

  // Hide the app chrome only while actively taking the quiz (and the brief load
  // before it). On the results/review screen ('submitted') the nav + footer come
  // back so the learner can navigate away easily.
  useEffect(() => {
    onActiveChange?.(state === 'in-progress' || state === 'loading');
  }, [state, onActiveChange]);

  // Restore in-progress quiz on mount
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(PROGRESS_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as PersistedProgress;
      if (!saved?.sessionId || !Array.isArray(saved.questions) || saved.questions.length === 0) return;
      setSessionId(saved.sessionId);
      setQuestions(saved.questions);
      setAnswers(saved.answers || {});
      setCurrentIndex(Math.min(saved.currentIndex || 0, saved.questions.length - 1));
      setMode(saved.mode || 'standard');
      setState('in-progress');
    } catch {
      // ignore corrupt state
    }
  }, []);

  // Persist in-progress state
  useEffect(() => {
    if (state !== 'in-progress' || questions.length === 0) return;
    try {
      const payload: PersistedProgress = { sessionId, questions, answers, currentIndex, mode };
      sessionStorage.setItem(PROGRESS_KEY, JSON.stringify(payload));
    } catch {
      // quota or private mode — ignore
    }
  }, [state, sessionId, questions, answers, currentIndex, mode]);

  // Persist the setup preferences so the next visit starts pre-configured.
  useEffect(() => {
    writeJSON(SETUP_KEY, {
      count: questionCount,
      difficulty: difficultyMode,
      categories: selectedCategories,
    } satisfies SavedSetup);
  }, [questionCount, difficultyMode, selectedCategories]);

  const clearProgress = useCallback(() => {
    try {
      sessionStorage.removeItem(PROGRESS_KEY);
    } catch {
      // ignore
    }
  }, []);

  const fetchQuestions = useCallback(
    async (count: number, difficulty: DifficultyMode, categories: CategoryType[]) => {
      fetchAbortRef.current?.abort();
      const controller = new AbortController();
      fetchAbortRef.current = controller;

      setState('loading');
      setError(null);
      const startedAt = Date.now();
      try {
        const params = new URLSearchParams({
          count: String(count),
          difficulty,
          categories: categories.join(','),
          lang,
        });
        const data = await apiFetch<{ sessionId: string; questions: Question[] }>(
          `/api/quiz/questions?${params}`,
          { signal: controller.signal },
        );
        await holdLoadingScreen(startedAt);
        if (controller.signal.aborted) return;
        setSessionId(data.sessionId);
        setQuestions(data.questions);
        setAnswers({});
        setCurrentIndex(0);
        setMode('standard');
        setState('in-progress');
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(friendlyError(err));
        setState('error');
      }
    },
    [lang],
  );

  const startDailyChallenge = useCallback(async () => {
    setState('loading');
    setError(null);
    capture('quiz_started', { mode: 'daily' });
    const startedAt = Date.now();
    try {
      const data = await getDailyChallenge(lang);
      await holdLoadingScreen(startedAt);
      setSessionId(data.sessionId);
      setQuestions(data.questions as Question[]);
      setAnswers({});
      setCurrentIndex(0);
      setMode('daily');
      setState('in-progress');
    } catch (err) {
      setError(friendlyError(err));
      setState('error');
    }
  }, [lang]);

  const handleStart = () => {
    setAttemptedStart(true);
    if (selectedCategories.length === 0) {
      setError(t('quiz.selectCategoryError'));
      return;
    }
    setError(null);
    setResult(null);
    // Top of the quiz funnel. No-op unless PostHog is configured.
    capture('quiz_started', {
      mode: 'standard',
      question_count: questionCount,
      difficulty: difficultyMode,
      category_count: selectedCategories.length,
    });
    fetchQuestions(questionCount, difficultyMode, selectedCategories);
  };

  const handleCategoryToggle = (category: CategoryType) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    );
  };

  const handleSelectAll = () => {
    const pool = displayedCategoryOptions.map((c) => c.value);
    setSelectedCategories((prev) =>
      pool.every((c) => prev.includes(c)) ? prev.filter((c) => !pool.includes(c)) : pool,
    );
  };

  const displayedCategoryIds = displayedCategoryOptions.map((c) => c.value);
  const isAllSelected =
    displayedCategoryIds.length > 0 &&
    displayedCategoryIds.every((c) => selectedCategories.includes(c));

  const handleAnswer = (questionId: string, answerIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answerIndex }));
    if (settings.soundEffects) {
      // soft confirmation tone on each pick — no correctness reveal until submit.
      playCorrect();
    }
  };

  const handleReport = useCallback(
    async (reason: 'incorrect-answer' | 'unclear' | 'typo' | 'outdated' | 'duplicate' | 'other', detail?: string) => {
      if (!reportTarget) return;
      try {
        await reportQuestion({ questionId: reportTarget, reason, detail, reporterSub: user?.id });
        setSnack(t('quiz.reportSent'));
      } catch {
        setSnack(t('quiz.reportFailed'));
      } finally {
        setReportTarget(null);
      }
    },
    [reportTarget, user, t],
  );

  const handleNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(i + 1, questions.length - 1));
  }, [questions.length]);

  const handlePrevious = useCallback(() => {
    setCurrentIndex((i) => Math.max(i - 1, 0));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const data = await apiFetch<QuizResult>('/api/quiz/submit', {
        method: 'POST',
        body: JSON.stringify({ sessionId, answers, lang }),
      });
      setResult(data);
      setState('submitted');
      clearProgress();
      playComplete();
      // Bottom of the quiz funnel. Pairs with 'quiz_started' for conversion and
      // score-distribution analysis. No-op unless PostHog is configured.
      capture('quiz_submitted', {
        mode,
        percentage: data.percentage,
        correct: data.correctAnswers,
        total: data.totalQuestions,
      });
      if (data.percentage === 100) recordPerfectQuiz();

      // Award quest XP for the quiz, scaled by each correct answer's difficulty.
      // Local-first: XP accrues even when signed out and syncs on sign-in.
      const diffById = new Map(questions.map((q) => [q.id, q.difficulty]));
      const gained = computeQuizXp(
        data.results.map((r) => ({ difficulty: diffById.get(r.questionId) ?? 1, correct: r.isCorrect })),
      );
      // The daily challenge always pays out at least a floor (XP + tokens) so
      // finishing it is never empty-handed; a normal quiz rewards only what was
      // earned from correct answers.
      const award = mode === 'daily' ? Math.max(gained, CHALLENGE_MIN_XP) : gained;
      if (award > 0) awardQuestXp(award, 'quiz');

      if (isAuthenticated && user?.id) {
        // Pre-build category breakdown once.
        const resultsByIdLocal = new Map(data.results.map((r) => [r.questionId, r]));
        const byCategory: Record<string, { correct: number; total: number }> = {};
        for (const q of questions) {
          const r = resultsByIdLocal.get(q.id);
          if (!r) continue;
          const bucket = byCategory[q.category] ?? { correct: 0, total: 0 };
          bucket.total += 1;
          if (r.isCorrect) bucket.correct += 1;
          byCategory[q.category] = bucket;
        }

        // All three writes are independent rows; run them concurrently.
        const writes: Promise<unknown>[] = [
          createOrUpdateUserStats(user.id, {
            email: profile.email,
            name: profile.name,
            picture: profile.picture,
          }),
          recordQuizResult(user.id, data.correctAnswers, data.totalQuestions),
        ];
        if (Object.keys(byCategory).length > 0) {
          writes.push(recordCategoryStats(user.id, byCategory));
        }
        const settled = await Promise.allSettled(writes);
        const failures = settled.filter((r) => r.status === 'rejected');
        if (failures.length > 0) {
          for (const f of failures) {
            console.error('Stat write failed:', (f as PromiseRejectedResult).reason);
          }
          setSnack(t('quiz.streakWarning'));
        }
      }
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  }, [answers, clearProgress, isAuthenticated, sessionId, submitting, user, lang, t, questions, mode]);

  const handleRestart = () => {
    clearProgress();
    setState('ready');
    setQuestions([]);
    setResult(null);
    setAnswers({});
    setCurrentIndex(0);
    setMode('standard');
    setError(null);
  };

  // In-app confirm dialog (window.confirm is blocked in many mobile WebViews
  // and bypasses i18n).
  const handleAbandon = () => setLeaveConfirmOpen(true);
  const confirmAbandon = () => {
    setLeaveConfirmOpen(false);
    handleRestart();
  };

  const toggleBookmark = (q: Question, correctIndex: number, explanation: string) => {
    const added = toggleBookmarkLib({
      id: q.id,
      question: q.question,
      category: q.category,
      options: q.options,
      correctIndex,
      explanation,
    });
    setSnack(added ? t('card.added') : t('card.removed'));
    // Sync to the user's account so it appears in the Cards (flashcards) section.
    if (isAuthenticated) {
      const op = added
        ? addFlashcard({
            question_id: q.id,
            question: q.question,
            category: q.category,
            correct_answer: q.options[correctIndex],
            explanation,
          })
        : removeFlashcard(q.id);
      op.catch(() => setSnack(t('card.syncFailed')));
    }
  };

  const handleShare = async () => {
    if (!result) return;
    const text = `I scored ${result.percentage}% on StudyShark (${result.correctAnswers}/${result.totalQuestions}). Try it!`;
    const shareData = { title: 'StudyShark', text, url: window.location.origin };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(`${text} ${window.location.origin}`);
      setSnack(t('quiz.shareCopied'));
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setSnack(t('quiz.shareFailed'));
    }
  };

  const currentQuestion = questions[currentIndex];

  // Move focus to result heading + announce
  useEffect(() => {
    if (state === 'submitted' && resultHeadingRef.current) {
      resultHeadingRef.current.focus();
    }
  }, [state]);

  // Keyboard shortcuts during in-progress quiz
  useEffect(() => {
    if (state !== 'in-progress' || !currentQuestion) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (currentIndex < questions.length - 1) handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (currentIndex > 0) handlePrevious();
      } else if (e.key === 'Enter') {
        const allAnswered = questions.every((q) => answers[q.id] !== undefined);
        if (currentIndex === questions.length - 1 && allAnswered) {
          e.preventDefault();
          handleSubmit();
        } else if (currentIndex < questions.length - 1) {
          e.preventDefault();
          handleNext();
        }
      } else if (/^[1-9]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (idx < currentQuestion.options.length) {
          e.preventDefault();
          handleAnswer(currentQuestion.id, idx);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [state, currentIndex, currentQuestion, questions, answers, handleNext, handlePrevious, handleSubmit]);

  // Confirm-on-leave during quiz
  useEffect(() => {
    if (state !== 'in-progress') return;
    const beforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [state]);

  /* ──── render branches ─────────────────────────────────────────── */

  if (state === 'loading') {
    return <QuoteLoader quote={t('quiz.loadingQuote')} label={t('common.loading')} />;
  }

  if (state === 'error') {
    return (
      <div style={{ width: '100%', maxWidth: 560, margin: '0 auto' }}>
        <Card padding={5} width="100%">
          <VStack gap={3}>
            <Banner status="error" title={error || t('error.somethingWrong')} />
            <HStack gap={1.5} wrap="wrap">
              <Button
                variant="primary"
                label={t('quiz.retry')}
                onClick={() => fetchQuestions(questionCount, difficultyMode, selectedCategories)}
              />
              <Button variant="secondary" label={t('quiz.backToSettings')} onClick={handleRestart} />
            </HStack>
          </VStack>
        </Card>
      </div>
    );
  }

  if (state === 'ready') {
    return (
      <div className="ss-pop" style={{ width: '100%', maxWidth: 640, margin: 'auto' }}>
        <Card padding={5} width="100%">
          <VStack gap={4}>
            <VStack gap={1} align="center">
              <div
                aria-hidden
                className="ss-emoji-tile ss-float"
                style={{
                  width: 64,
                  height: 64,
                  fontSize: '2.25rem',
                  background: `linear-gradient(135deg, ${subject.accent}2b, ${subject.accent}12)`,
                  boxShadow: `inset 0 0 0 1.5px ${subject.accent}44, 0 6px 16px ${subject.accent}22`,
                }}
              >
                {subject.emoji}
              </div>
              <Heading level={1} type="display-2" justify="center">
                <span className="ss-gradient-text">{t('quiz.title')}</span>
              </Heading>
              <Text type="large" color="secondary" justify="center">
                {t('quiz.subtitle')}
              </Text>
            </VStack>

            {/* Secondary modes as quiet links — the single primary CTA on this
                screen is "Start quiz" below. */}
            <HStack gap={1} justify="center" wrap="wrap">
              <Button
                variant="ghost"
                size="sm"
                label={t('quiz.todaysChallenge')}
                onClick={startDailyChallenge}
              />
              <Button
                variant="ghost"
                size="sm"
                label={t('challenge.cta')}
                onClick={() => navigate('/challenge')}
              />
            </HStack>

            {/* Categories */}
            <VStack gap={1.5} as="fieldset">
              <HStack justify="between" align="center">
                <HStack gap={1} align="center">
                  <span aria-hidden style={{ fontSize: '1.1rem' }}>🗂️</span>
                  <Text as="label" type="label" color="secondary">
                    {t('quiz.categories')}
                  </Text>
                </HStack>
                <Button
                  variant="ghost"
                  size="sm"
                  label={isAllSelected ? t('quiz.deselectAll') : t('quiz.selectAll')}
                  onClick={handleSelectAll}
                />
              </HStack>

              <div role="group" aria-label={t('quiz.categoriesAria')} style={{ width: '100%' }}>
                <Grid columns={{ minWidth: 150, max: 3 }} gap={1.5}>
                  {displayedCategoryOptions.map((cat, i) => {
                    const selected = selectedCategories.includes(cat.value);
                    return (
                      <div
                        key={cat.value}
                        className="ss-lift ss-pop"
                        style={{ display: 'flex', width: '100%', animationDelay: `${i * 40}ms` }}
                      >
                        <SelectableCard
                          label={cat.label}
                          isSelected={selected}
                          onChange={() => handleCategoryToggle(cat.value)}
                          padding={1.5}
                        >
                          <HStack gap={1.5} align="center">
                            <span
                              aria-hidden
                              className="ss-emoji-tile"
                              style={{
                                width: 26,
                                height: 26,
                                fontSize: 0,
                                flexShrink: 0,
                                background: `linear-gradient(135deg, ${cat.color}, ${cat.color}bb)`,
                                boxShadow: `inset 0 0 0 1.5px ${cat.color}44, 0 0 0 3px ${cat.color}1f`,
                              }}
                            />
                            <Text type="body" size="sm" weight={selected ? 'semibold' : 'medium'}>
                              {cat.label}
                            </Text>
                          </HStack>
                        </SelectableCard>
                      </div>
                    );
                  })}
                </Grid>
              </div>

              {hasCollapsedSubset && (
                <HStack justify="center">
                  <Button
                    variant="ghost"
                    size="sm"
                    label={showAllCategories ? t('quiz.showFewer') : t('quiz.showAllCategories')}
                    onClick={() => setShowAllCategories((v) => !v)}
                  />
                </HStack>
              )}

              {/* Always in the DOM so the Start button's aria-describedby target
                  exists whenever it is referenced. */}
              <div
                id="categories-error"
                role="alert"
                style={{ minHeight: '1.2em', fontSize: '0.78rem', fontWeight: 600, color: '#e5484d' }}
              >
                {attemptedStart && selectedCategories.length === 0 ? t('quiz.selectAtLeastOne') : ''}
              </div>
            </VStack>

            {selectedCategories.length > 0 && (
              <Card variant="muted" padding={2} width="100%">
                <VStack gap={1}>
                  <Text type="supporting" size="xsm">
                    {t('quiz.selectedCount', { count: selectedCategories.length, total: visibleCategories.length })}
                  </Text>
                  <HStack gap={0.5} wrap="wrap">
                    {selectedCategories.map((cat) => {
                      const category = CATEGORY_LOOKUP.get(cat);
                      if (!category) return null;
                      return (
                        <span
                          key={cat}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            height: 24,
                            padding: '0 9px',
                            borderRadius: 7,
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            lineHeight: 1,
                            backgroundColor: category.color,
                            color: onCategoryColorText(cat),
                          }}
                        >
                          {category.label}
                        </span>
                      );
                    })}
                  </HStack>
                </VStack>
              </Card>
            )}

            {/* Count + difficulty */}
            <Grid columns={{ minWidth: 240, max: 2 }} gap={3}>
              <VStack gap={1.5} as="fieldset">
                <HStack gap={1} align="center">
                  <span aria-hidden style={{ fontSize: '1.1rem' }}>🔢</span>
                  <Text as="label" type="label" color="secondary">
                    {t('quiz.questionsLegend')}
                  </Text>
                </HStack>
                <HStack gap={1} wrap="wrap">
                  {config.quiz.countOptions.map((count) => (
                    <SelectableCard
                      key={count}
                      label={t('quiz.countQuestionsAria', { count })}
                      isSelected={questionCount === count}
                      onChange={() => setQuestionCount(count)}
                      padding={1.5}
                      width={54}
                    >
                      <div style={{ textAlign: 'center', width: '100%' }}>
                        <Text type="body" weight="bold">
                          {count}
                        </Text>
                      </div>
                    </SelectableCard>
                  ))}
                </HStack>
              </VStack>

              <VStack gap={1.5} as="fieldset">
                <HStack gap={1} align="center">
                  <span aria-hidden style={{ fontSize: '1.1rem' }}>🌊</span>
                  <Text as="label" type="label" color="secondary">
                    {t('quiz.difficulty')}
                  </Text>
                </HStack>
                <HStack gap={1} wrap="wrap">
                  {DIFFICULTY_VALUES.map((value) => {
                    const label = t(`difficulty.${value}` as TranslationKey);
                    const tip = t(`difficulty.${value}.tip` as TranslationKey);
                    return (
                      <Tooltip key={value} content={tip} placement="above">
                        <span style={{ display: 'inline-flex' }}>
                          <SelectableCard
                            label={t('quiz.difficultyAria', { label })}
                            isSelected={difficultyMode === value}
                            onChange={() => setDifficultyMode(value)}
                            padding={1.5}
                          >
                            <Text type="body" size="sm" weight={difficultyMode === value ? 'semibold' : 'medium'}>
                              {label}
                            </Text>
                          </SelectableCard>
                        </span>
                      </Tooltip>
                    );
                  })}
                </HStack>
              </VStack>
            </Grid>

            <div style={{ display: 'grid' }}>
              <Button
                variant="primary"
                size="lg"
                label={t('quiz.startQuiz')}
                icon={<span aria-hidden style={{ fontSize: '1.15rem', lineHeight: 1 }}>🦈</span>}
                onClick={handleStart}
                isDisabled={selectedCategories.length === 0}
              />
            </div>
          </VStack>
        </Card>

        <AppToast
          open={!!snack}
          onClose={() => setSnack(null)}
          severity="info"
          message={snack ?? ''}
          autoHideDuration={2500}
        />
      </div>
    );
  }

  if (state === 'submitted' && result) {
    const resultEmoji = result.percentage === 100 ? '🏆' : result.percentage >= 60 ? '🎉' : '🦈';
    return (
      <>
        <div className="ss-pop">
        <Card padding={0} width="100%">
          <div className="quiz-result-card" role="region" aria-labelledby="quiz-result-heading">
            <VStack gap={2} align="center">
              <span aria-hidden className="ss-float" style={{ fontSize: '3.25rem', lineHeight: 1 }}>
                {resultEmoji}
              </span>
              <div id="quiz-result-heading" ref={resultHeadingRef} tabIndex={-1} style={{ outline: 'none' }}>
                <Heading level={2} justify="center">
                  {t('quiz.complete')}
                </Heading>
              </div>
              <MotionPop>
                <div
                  role="status"
                  aria-live="polite"
                  className="quiz-score-text"
                  style={{
                    background: CATEGORY_GRADIENT,
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {result.percentage}%
                </div>
              </MotionPop>
              <Heading level={4} justify="center">
                {t('quiz.scoreOutOf', { correct: result.correctAnswers, total: result.totalQuestions })}
              </Heading>

              {mode === 'daily' && (
                <Text type="supporting" color="secondary" justify="center">
                  {t('quiz.dailyComplete')}
                </Text>
              )}

              <HStack gap={1.5} justify="center" wrap="wrap">
                <Button variant="primary" label={t('quiz.newQuiz')} onClick={handleRestart} />
                <Button
                  variant="secondary"
                  label={t('quiz.shareResult')}
                  icon={<ShareIcon />}
                  onClick={handleShare}
                />
                <Button
                  variant="ghost"
                  label={t('quiz.reviewAnswersArrow')}
                  onClick={() => {
                    document.getElementById('quiz-review')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                />
                <Button variant="ghost" label={t('quiz.backHome')} onClick={() => navigate('/')} />
              </HStack>
            </VStack>
          </div>
        </Card>
        </div>

        <h3 id="quiz-review" className="quiz-review-header">
          {t('quiz.reviewYourAnswers', { count: questions.length })}
        </h3>
        {questions.map((question, index) => {
          const questionResult = resultsById.get(question.id);
          const isCorrect = questionResult?.isCorrect;
          const isBookmarked = !!bookmarks[question.id];

          return (
            <MotionItem key={question.id} index={index}>
              <Card variant={isCorrect ? 'green' : 'red'} padding={4} width="100%">
                <VStack gap={1.5}>
                  <HStack justify="between" align="center" wrap="wrap" gap={1}>
                    <HStack gap={1} align="center">
                      <Heading level={4}>{t('quiz.questionN', { n: index + 1 })}</Heading>
                      <Badge
                        variant={isCorrect ? 'success' : 'error'}
                        label={isCorrect ? t('quiz.correct') : t('quiz.incorrect')}
                      />
                    </HStack>
                    <HStack gap={0.5} align="center">
                      <button
                        type="button"
                        aria-pressed={isBookmarked}
                        aria-label={isBookmarked ? t('quiz.removeBookmark') : t('quiz.addBookmark')}
                        title={isBookmarked ? t('quiz.removeBookmark') : t('quiz.addBookmark')}
                        onClick={() =>
                          toggleBookmark(
                            question,
                            questionResult?.correctAnswer ?? 0,
                            questionResult?.explanation ?? '',
                          )
                        }
                        style={iconBtnStyle(isBookmarked ? 'var(--brand-accent)' : 'var(--color-text-secondary)')}
                      >
                        <BookmarkIcon filled={isBookmarked} />
                      </button>
                      <button
                        type="button"
                        aria-label={t('quiz.reportAria')}
                        title={t('quiz.reportAria')}
                        onClick={() => setReportTarget(question.id)}
                        style={iconBtnStyle('var(--color-text-secondary)')}
                      >
                        <ReportFlagIcon />
                      </button>
                      <CategoryTag category={question.category} />
                    </HStack>
                  </HStack>

                  <div style={{ fontWeight: 500 }}>{renderQuestion(question.question)}</div>

                  <Text type="body" size="sm">
                    {t('quiz.yourAnswerLabel')}{' '}
                    <strong>{question.options[questionResult?.selectedIndex ?? 0]}</strong>
                  </Text>
                  {!isCorrect && (
                    <span style={{ color: '#16a34a' }}>
                      <Text type="body" size="sm" color="inherit">
                        {t('quiz.correctLabel')}{' '}
                        <strong>{question.options[questionResult?.correctAnswer ?? 0]}</strong>
                      </Text>
                    </span>
                  )}
                  {questionResult?.explanation && (
                    <div
                      style={{
                        padding: '12px 14px',
                        backgroundColor: `${getCategoryHexColor(question.category)}1a`,
                        borderRadius: 8,
                        borderLeft: `4px solid ${getCategoryHexColor(question.category)}`,
                      }}
                    >
                      <Text type="body" size="sm">
                        {questionResult.explanation}
                      </Text>
                    </div>
                  )}
                </VStack>
              </Card>
            </MotionItem>
          );
        })}

        <AppToast
          open={!!snack}
          onClose={() => setSnack(null)}
          severity="info"
          message={snack ?? ''}
          autoHideDuration={2500}
        />
        <ReportDialog
          open={!!reportTarget}
          onClose={() => setReportTarget(null)}
          onSubmit={handleReport}
        />
      </>
    );
  }

  // in-progress
  if (!currentQuestion) return null;

  const progress = ((currentIndex + 1) / questions.length) * 100;
  const answered = Object.keys(answers).length;
  const allAnswered = questions.every((q) => answers[q.id] !== undefined);
  const remaining = questions.length - answered;

  return (
    // One-viewport question layout: the question text scrolls internally if
    // long, and the answers + nav stay anchored at a stable position on every
    // question. On phones the card uses the full height; on larger screens it
    // is capped and centred so it doesn't balloon.
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        width: '100%',
        maxWidth: 600,
        margin: '0 auto',
      }}
    >
      {error && (
        <div style={{ marginBottom: 12, flexShrink: 0 }}>
          <Banner status="error" title={error} isDismissable onDismiss={() => setError(null)} />
        </div>
      )}

      {/* Surface styled with Astryx tokens so it themes with the rest of the
          system, while plain flex/scroll keeps the one-viewport behaviour. */}
      <div
        style={{
          flex: '1 1 auto',
          minHeight: 0,
          maxHeight: '82%',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--color-background-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            padding: 'clamp(1.25rem, 4vw, 1.75rem)',
          }}
        >
          {/* Progress header */}
          <HStack gap={1.5} align="center" style={{ flexShrink: 0, marginBottom: 16 }}>
            <span aria-hidden style={{ fontSize: '1rem', lineHeight: 1 }}>{subject.emoji}</span>
            <Text type="supporting" size="xsm" weight="medium">
              {currentIndex + 1}/{questions.length}
            </Text>
            <div style={{ flex: 1 }}>
              <ProgressBar
                label={t('quiz.progressAria')}
                value={progress}
                isLabelHidden
                variant="accent"
              />
            </div>
            <Text type="supporting" size="xsm" weight="medium">
              {answered}/{questions.length}
            </Text>
          </HStack>

          {/* Category + tags */}
          <HStack gap={1} align="center" wrap="wrap" style={{ flexShrink: 0, marginBottom: 12 }}>
            <CategoryTag category={currentQuestion.category} />
            {currentQuestion.tags && currentQuestion.tags.length > 0 && (
              <HStack gap={0.5} align="center" wrap="wrap" style={{ marginLeft: 'auto' }}>
                {currentQuestion.tags.map((tag) => (
                  <Badge key={tag} variant="neutral" label={`#${tag}`} />
                ))}
              </HStack>
            )}
          </HStack>

          <fieldset
            style={{
              padding: 0,
              border: 0,
              margin: 0,
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
            aria-describedby={`question-text-${currentQuestion.id}`}
          >
            <legend style={visuallyHidden}>
              {t('quiz.questionOf', { current: currentIndex + 1, total: questions.length })}
            </legend>

            {/* Only the question text scrolls when long — the answers below
                keep their anchored position. */}
            <div
              id={`question-text-${currentQuestion.id}`}
              className="quiz-question-text"
              style={{ display: 'flex', alignItems: 'flex-start', gap: 4, flex: '1 1 auto', minHeight: 0, overflowY: 'auto' }}
            >
              <div style={{ flex: 1 }}>{renderQuestion(currentQuestion.question)}</div>
              {currentQuestion.introduction && (
                <Popover
                  isOpen={!!revealedHints[currentQuestion.id]}
                  onOpenChange={(o) =>
                    setRevealedHints((prev) => ({ ...prev, [currentQuestion.id]: o }))
                  }
                  placement="below"
                  width={320}
                  label={t('quiz.showHint')}
                  content={
                    <div style={{ fontSize: '0.82rem', lineHeight: 1.6 }}>
                      {currentQuestion.introduction}
                    </div>
                  }
                >
                  <button
                    type="button"
                    aria-label={t('quiz.showHint')}
                    aria-pressed={!!revealedHints[currentQuestion.id]}
                    title={t('quiz.showHint')}
                    style={{
                      ...iconBtnStyle(
                        revealedHints[currentQuestion.id]
                          ? getCategoryHexColor(currentQuestion.category)
                          : 'var(--color-text-secondary)',
                      ),
                      marginTop: 1,
                    }}
                  >
                    <HintIcon />
                  </button>
                </Popover>
              )}
            </div>

            {/* Answer options as SelectableCards. Raise the anchored answers a
                little off the wave on phones so they sit mid-lower screen. */}
            <div
              role="radiogroup"
              aria-labelledby={`question-text-${currentQuestion.id}`}
              style={{ flexShrink: 0, marginTop: 'auto' }}
            >
              <VStack gap={1}>
                {currentQuestion.options.map((option, index) => {
                  const isSelected = answers[currentQuestion.id] === index;
                  return (
                    <SelectableCard
                      key={index}
                      label={option}
                      isSelected={isSelected}
                      onChange={() => handleAnswer(currentQuestion.id, index)}
                      padding={2}
                    >
                      <HStack gap={2} align="center">
                        <span
                          aria-hidden
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 8,
                            display: 'grid',
                            placeItems: 'center',
                            flexShrink: 0,
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            background: isSelected ? 'var(--color-accent-muted)' : 'var(--color-background-muted)',
                            color: isSelected ? 'var(--color-text-accent)' : 'inherit',
                          }}
                        >
                          {index + 1}
                        </span>
                        <Text type="body" weight={isSelected ? 'semibold' : 'normal'}>
                          {option}
                        </Text>
                      </HStack>
                    </SelectableCard>
                  );
                })}
              </VStack>
            </div>

            <div style={{ marginTop: 8, flexShrink: 0 }}>
              <Text type="supporting" size="xsm" color="secondary">
                {t('quiz.keyboardTip', { max: currentQuestion.options.length })}
              </Text>
            </div>
          </fieldset>
        </div>
      </div>

      {/* Small coaching strip: nudges the learner toward good habits. Rotates
          every 10s so the same tip never lingers. */}
      <div
        style={{
          marginTop: 10,
          padding: '6px 12px',
          borderRadius: 8,
          borderLeft: '3px solid var(--brand-accent)',
          background: 'var(--color-background-muted)',
          minHeight: '2.2em',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Text type="supporting" size="xsm" color="secondary">
          <RotatingTip
            tips={[
              t('quiz.tip1'),
              t('quiz.tip2'),
              t('quiz.tip3'),
              t('quiz.tip4'),
              t('quiz.tip5'),
            ]}
            intervalMs={10000}
          />
        </Text>
      </div>

      {/* Nav row shares the card's edges: Previous hugs the left, Next the
          right, Exit sits on the centreline. */}
      <div style={{ display: 'flex', alignItems: 'center', marginTop: 16, flexShrink: 0, gap: 8 }}>
        <div style={{ flex: '1 1 0', display: 'flex', justifyContent: 'flex-start' }}>
          <Button
            variant="secondary"
            label={t('quiz.previous')}
            onClick={handlePrevious}
            isDisabled={currentIndex === 0}
          />
        </div>
        <div style={{ flex: '0 0 auto' }}>
          <Button variant="ghost" label={t('quiz.exitQuiz')} onClick={handleAbandon} />
        </div>
        <div style={{ flex: '1 1 0', display: 'flex', justifyContent: 'flex-end' }}>
          {currentIndex === questions.length - 1 ? (
            <Button
              variant="primary"
              label={submitting ? t('quiz.submitting') : t('quiz.submitQuiz')}
              onClick={handleSubmit}
              isDisabled={!allAnswered || submitting}
              isLoading={submitting}
              tooltip={!allAnswered ? t('quiz.answerMore', { count: remaining }) : undefined}
            />
          ) : (
            <Button variant="primary" label={t('quiz.next')} onClick={handleNext} />
          )}
        </div>
      </div>

      <AppToast
        open={!!snack}
        onClose={() => setSnack(null)}
        severity="info"
        message={snack ?? ''}
        autoHideDuration={2500}
      />
      <ReportDialog
        open={!!reportTarget}
        onClose={() => setReportTarget(null)}
        onSubmit={handleReport}
      />
      <AlertDialog
        isOpen={leaveConfirmOpen}
        onOpenChange={setLeaveConfirmOpen}
        title={t('quiz.leaveTitle')}
        description={t('quiz.leaveBody')}
        actionLabel={t('quiz.leaveConfirm')}
        cancelLabel={t('quiz.leaveCancel')}
        onAction={confirmAbandon}
      />
    </div>
  );
}

export default Quiz;
