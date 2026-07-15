import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Card,
  CardContent,
  Button,
  RadioGroup,
  FormControlLabel,
  Radio,
  LinearProgress,
  Typography,
  Box,
  Alert,
  Chip,
  Paper,
  Tooltip,
  ClickAwayListener,
  IconButton,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { useAuth, getUserProfile } from '../lib/auth';
import type { Question, QuizResult, QuizState, DifficultyMode, CategoryType } from '../types/quiz';
import { quizStyles, CATEGORY_GRADIENT, visuallyHidden } from '../theme/MuiTheme';
import {
  CATEGORY_LOOKUP,
  CATEGORY_OPTIONS,
  visibleCategoryOptionsFor,
  onCategoryColorText,
  getCategoryHexColor,
  getCategoryLabel,
  categoryProgressBackground,
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

function Quiz({ onActiveChange }: { onActiveChange?: (active: boolean) => void }) {
  const { lang, t } = useLanguage();
  const config = useGameConfig();
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

  const resultHeadingRef = useRef<HTMLHeadingElement | null>(null);
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
  // The progress-bar gradient blends the colours of every category present in
  // the current quiz. `categoryProgressBackground` allocates a Set + sort +
  // gradient string; memo on the questions array keeps it from running on
  // every answer keystroke.
  const progressBackground = useMemo(
    () => categoryProgressBackground(questions.map((q) => q.category)),
    [questions],
  );

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
        const resultsById = new Map(data.results.map((r) => [r.questionId, r]));
        const byCategory: Record<string, { correct: number; total: number }> = {};
        for (const q of questions) {
          const r = resultsById.get(q.id);
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
      <Card className="quiz-card">
        <CardContent sx={{ p: 3 }}>
          <Alert
            severity="error"
            role="alert"
            sx={{ mb: 2 }}
            action={
              <Button onClick={() => fetchQuestions(questionCount, difficultyMode, selectedCategories)} color="inherit" size="small">
                {t('quiz.retry')}
              </Button>
            }
          >
            {error || t('error.somethingWrong')}
          </Alert>
          <Button onClick={handleRestart} variant="outlined" fullWidth>
            {t('quiz.backToSettings')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (state === 'ready') {
    return (
      <Box
        sx={{
          my: 'auto',
          mx: 'auto',
          width: '100%',
          p: { xs: 2, sm: 3 },
          backgroundColor: 'background.paper',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          borderTop: `4px solid var(--brand-accent)`,
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        }}
      >
        <Typography variant="h5" component="h1" sx={{ mb: 0.5, fontWeight: 600, textAlign: 'center' }}>
          {t('quiz.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.85rem', textAlign: 'center' }}>
          {t('quiz.subtitle')}
        </Typography>

        {/* Secondary modes as quiet links — the single primary CTA on this
            screen is "Start quiz" below. */}
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <Button
            onClick={startDailyChallenge}
            variant="text"
            size="small"
            sx={{ textTransform: 'none', color: 'text.secondary', fontWeight: 600, '&:hover': { color: 'var(--brand-accent)' } }}
          >
            {t('quiz.todaysChallenge')}
          </Button>
          <Box component="span" aria-hidden sx={{ color: 'text.disabled', alignSelf: 'center', fontSize: '0.7rem', display: { xs: 'none', sm: 'inline' } }}>•</Box>
          <Button
            component={Link}
            to="/challenge"
            variant="text"
            size="small"
            sx={{ textTransform: 'none', color: 'text.secondary', fontWeight: 600, '&:hover': { color: 'var(--brand-accent)' } }}
          >
            {t('challenge.cta')}
          </Button>
        </Box>

        <Box component="fieldset" sx={{ mb: 2.5, p: 0, border: 0 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography component="legend" variant="overline" color="text.secondary" sx={{ p: 0 }}>
              {t('quiz.categories')}
            </Typography>
            <Button
              size="small"
              onClick={handleSelectAll}
              sx={{ fontSize: '0.7rem', textTransform: 'none', color: 'text.secondary', minWidth: 'auto', p: '2px 8px' }}
            >
              {isAllSelected ? t('quiz.deselectAll') : t('quiz.selectAll')}
            </Button>
          </Box>
          <Box role="group" aria-label={t('quiz.categoriesAria')} sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>
            {displayedCategoryOptions.map((cat) => {
              const selected = selectedCategories.includes(cat.value);
              return (
                <Chip
                  key={cat.value}
                  label={cat.label}
                  size="small"
                  onClick={() => handleCategoryToggle(cat.value)}
                  role="checkbox"
                  aria-checked={selected}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleCategoryToggle(cat.value);
                    }
                  }}
                  sx={{
                    cursor: 'pointer',
                    backgroundColor: 'background.paper',
                    color: selected ? cat.color : 'text.secondary',
                    border: selected ? `2px solid ${cat.color}` : '1px solid',
                    borderColor: selected ? cat.color : 'divider',
                    borderLeft: `3px solid ${cat.color}`,
                    borderRadius: 1,
                    fontWeight: selected ? 600 : 500,
                    fontSize: '0.72rem',
                    // 32px tall + the row's 6px gap keeps taps comfortably
                    // above the 24px WCAG minimum without ballooning the grid.
                    height: 32,
                    '& .MuiChip-label': { px: 1.1 },
                    '&:hover': { backgroundColor: 'action.hover' },
                  }}
                />
              );
            })}
          </Box>
          {hasCollapsedSubset && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
              <Button
                size="small"
                onClick={() => setShowAllCategories((v) => !v)}
                sx={{ fontSize: '0.72rem', textTransform: 'none', color: 'text.secondary', minWidth: 'auto', px: 1 }}
              >
                {showAllCategories ? t('quiz.showFewer') : t('quiz.showAllCategories')}
              </Button>
            </Box>
          )}
          {/* Always in the DOM so the Start button's aria-describedby target
              exists whenever it is referenced. */}
          <Typography variant="caption" color="error" id="categories-error" role="alert" sx={{ mt: 1, display: 'block' }}>
            {attemptedStart && selectedCategories.length === 0 ? t('quiz.selectAtLeastOne') : ''}
          </Typography>
        </Box>

        {selectedCategories.length > 0 && (
          <Box sx={{ mb: 2.5, p: 1, backgroundColor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
              {t('quiz.selectedCount', { count: selectedCategories.length, total: visibleCategories.length })}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {selectedCategories.map((cat) => {
                const category = CATEGORY_LOOKUP.get(cat);
                return (
                  <Chip
                    key={cat}
                    label={category?.label}
                    size="small"
                    sx={{
                      height: 24,
                      fontSize: '0.7rem',
                      fontWeight: 500,
                      backgroundColor: category?.color,
                      color: onCategoryColorText(cat),
                    }}
                  />
                );
              })}
            </Box>
          </Box>
        )}

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 2.5, sm: 3 }, mb: 2.5 }}>
          <Box component="fieldset" sx={{ p: 0, m: 0, border: 0 }}>
            <Typography component="legend" variant="overline" color="text.secondary" sx={{ p: 0, mb: 1, display: 'block' }}>
              {t('quiz.questionsLegend')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {config.quiz.countOptions.map((count) => (
                <Button
                  key={count}
                  variant="outlined"
                  onClick={() => setQuestionCount(count)}
                  aria-pressed={questionCount === count}
                  aria-label={t('quiz.countQuestionsAria', { count })}
                  sx={{
                    minWidth: 42,
                    minHeight: 40,
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    color: questionCount === count ? 'var(--brand-accent)' : 'text.secondary',
                    border: questionCount === count ? `2px solid var(--brand-accent)` : '1px solid',
                    borderColor: questionCount === count ? 'var(--brand-accent)' : 'divider',
                  }}
                >
                  {count}
                </Button>
              ))}
            </Box>
          </Box>

          <Box component="fieldset" sx={{ p: 0, m: 0, border: 0, flex: 1 }}>
            <Typography component="legend" variant="overline" color="text.secondary" sx={{ p: 0, mb: 1, display: 'block' }}>
              {t('quiz.difficulty')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {DIFFICULTY_VALUES.map((value) => {
                const label = t(`difficulty.${value}` as TranslationKey);
                const tip = t(`difficulty.${value}.tip` as TranslationKey);
                return (
                  <Tooltip key={value} title={tip} arrow placement="top">
                    <Button
                      variant="outlined"
                      onClick={() => setDifficultyMode(value)}
                      aria-pressed={difficultyMode === value}
                      aria-label={t('quiz.difficultyAria', { label })}
                      sx={{
                        fontWeight: 500,
                        fontSize: '0.85rem',
                        minHeight: 40,
                        textTransform: 'none',
                        color: difficultyMode === value ? 'var(--brand-accent)' : 'text.secondary',
                        border: difficultyMode === value ? `2px solid var(--brand-accent)` : '1px solid',
                        borderColor: difficultyMode === value ? 'var(--brand-accent)' : 'divider',
                      }}
                    >
                      {label}
                    </Button>
                  </Tooltip>
                );
              })}
            </Box>
          </Box>
        </Box>

        <Button
          variant="contained"
          size="large"
          onClick={handleStart}
          disabled={selectedCategories.length === 0}
          fullWidth
          aria-describedby={selectedCategories.length === 0 ? 'categories-error' : undefined}
          sx={{
            py: 1.5,
            fontSize: '0.95rem',
            fontWeight: 600,
            textTransform: 'none',
            borderRadius: 1,
            ...quizStyles.brandButton,
          }}
        >
          {t('quiz.startQuiz')}
        </Button>

        <Snackbar
          open={!!snack}
          autoHideDuration={2500}
          onClose={() => setSnack(null)}
          message={snack ?? ''}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        />
      </Box>
    );
  }

  if (state === 'submitted' && result) {
    return (
      <>
        <Card className="quiz-card" sx={{ borderTop: `4px solid var(--brand-accent)` }}>
          <CardContent className="quiz-result-card" role="region" aria-labelledby="quiz-result-heading">
            <Typography
              id="quiz-result-heading"
              ref={resultHeadingRef}
              tabIndex={-1}
              variant="h4"
              component="h2"
              sx={{ mb: 2, outline: 'none' }}
            >
              {t('quiz.complete')}
            </Typography>
            <MotionPop>
              <Typography
                role="status"
                aria-live="polite"
                className="quiz-score-text"
                sx={{
                  background: CATEGORY_GRADIENT,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {result.percentage}%
              </Typography>
            </MotionPop>
            <Typography variant="h6" sx={{ mt: 1 }}>
              {t('quiz.scoreOutOf', { correct: result.correctAnswers, total: result.totalQuestions })}
            </Typography>

            {mode === 'daily' && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                {t('quiz.dailyComplete')}
              </Typography>
            )}
            <Box
              sx={{
                mt: 3,
                display: 'flex',
                gap: 1.5,
                justifyContent: 'center',
                flexWrap: 'wrap',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'stretch', sm: 'center' },
              }}
            >
              <Button
                variant="contained"
                onClick={handleRestart}
                sx={{ ...quizStyles.startButton, ...quizStyles.brandButton }}
              >
                {t('quiz.newQuiz')}
              </Button>
              <Button
                variant="outlined"
                startIcon={<ShareIcon />}
                onClick={handleShare}
                sx={{ textTransform: 'none' }}
              >
                {t('quiz.shareResult')}
              </Button>
              <Button
                variant="text"
                onClick={() => {
                  document.getElementById('quiz-review')?.scrollIntoView({ behavior: 'smooth' });
                }}
                sx={{ textTransform: 'none' }}
              >
                {t('quiz.reviewAnswersArrow')}
              </Button>
              <Button variant="text" component={Link} to="/" sx={{ textTransform: 'none' }}>
                {t('quiz.backHome')}
              </Button>
            </Box>
          </CardContent>
        </Card>

        <Typography variant="h6" component="h3" id="quiz-review" className="quiz-review-header">
          {t('quiz.reviewYourAnswers', { count: questions.length })}
        </Typography>
        {questions.map((question, index) => {
          const questionResult = resultsById.get(question.id);
          const isCorrect = questionResult?.isCorrect;
          const isBookmarked = !!bookmarks[question.id];

          return (
            <MotionItem key={question.id} index={index}>
            <Paper
              elevation={0}
              className={`quiz-result-item ${isCorrect ? 'correct' : 'incorrect'}`}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="subtitle2" component="h4">
                    {t('quiz.questionN', { n: index + 1 })}
                  </Typography>
                  <Typography
                    component="span"
                    variant="caption"
                    sx={{
                      px: 0.75,
                      py: 0.25,
                      borderRadius: 0.5,
                      fontWeight: 700,
                      backgroundColor: isCorrect ? 'success.dark' : 'error.dark',
                      color: '#fff',
                    }}
                  >
                    {isCorrect ? t('quiz.correct') : t('quiz.incorrect')}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Tooltip title={isBookmarked ? t('quiz.removeBookmark') : t('quiz.addBookmark')} arrow placement="top">
                    <IconButton
                      size="small"
                      aria-pressed={isBookmarked}
                      aria-label={isBookmarked ? t('quiz.removeBookmark') : t('quiz.addBookmark')}
                      onClick={() =>
                        toggleBookmark(
                          question,
                          questionResult?.correctAnswer ?? 0,
                          questionResult?.explanation ?? '',
                        )
                      }
                      sx={{ color: isBookmarked ? 'var(--brand-accent)' : 'text.secondary' }}
                    >
                      <BookmarkIcon filled={isBookmarked} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('quiz.reportAria')} arrow placement="top">
                    <IconButton
                      size="small"
                      aria-label={t('quiz.reportAria')}
                      onClick={() => setReportTarget(question.id)}
                      sx={{ color: 'text.secondary' }}
                    >
                      <ReportFlagIcon />
                    </IconButton>
                  </Tooltip>
                  <Chip
                    label={getCategoryLabel(question.category)}
                    size="small"
                    sx={{
                      backgroundColor: getCategoryHexColor(question.category),
                      color: onCategoryColorText(question.category),
                      fontWeight: 600,
                      fontSize: { xs: '0.7rem', sm: '0.8rem' },
                      height: { xs: '24px', sm: '28px' },
                    }}
                  />
                </Box>
              </Box>
              <Box sx={{ mb: 2, fontWeight: 500 }}>{renderQuestion(question.question)}</Box>
              <Typography variant="body2">
                {t('quiz.yourAnswerLabel')} <strong>{question.options[questionResult?.selectedIndex ?? 0]}</strong>
              </Typography>
              {!isCorrect && (
                <Typography variant="body2" color="success.dark" sx={{ mt: 0.75 }}>
                  {t('quiz.correctLabel')} <strong>{question.options[questionResult?.correctAnswer ?? 0]}</strong>
                </Typography>
              )}
              {questionResult?.explanation && (
                <Typography
                  variant="body2"
                  sx={{
                    mt: 1.5,
                    p: 1.5,
                    backgroundColor: `${getCategoryHexColor(question.category)}1a`,
                    borderRadius: 1,
                    borderLeft: `4px solid ${getCategoryHexColor(question.category)}`,
                  }}
                >
                  {questionResult.explanation}
                </Typography>
              )}
            </Paper>
            </MotionItem>
          );
        })}

        <Snackbar
          open={!!snack}
          autoHideDuration={2500}
          onClose={() => setSnack(null)}
          message={snack ?? ''}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
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
    // is capped (~80% tall, 560px wide) and centred so it doesn't balloon.
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', width: '100%', maxWidth: { xs: 680, sm: 560 }, mx: 'auto' }}>
      {error && (
        <Alert severity="error" role="alert" onClose={() => setError(null)} sx={{ mb: 1.5, flexShrink: 0 }}>
          {error}
        </Alert>
      )}

      <Card className="quiz-card" sx={{ flex: '1 1 auto', minHeight: 0, maxHeight: { sm: '80%' }, display: 'flex', flexDirection: 'column' }}>
        <CardContent className="quiz-card-content" sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexShrink: 0 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
              {currentIndex + 1}/{questions.length}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={progress}
              aria-label={t('quiz.progressAria')}
              sx={{
                flex: 1,
                height: 6,
                borderRadius: 3,
                backgroundColor: 'action.hover',
                '& .MuiLinearProgress-bar': { borderRadius: 3, background: progressBackground },
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
              {answered}/{questions.length}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5, gap: 1, flexWrap: 'wrap', flexShrink: 0 }}>
            <Chip
              label={getCategoryLabel(currentQuestion.category)}
              size="small"
              sx={{
                backgroundColor: getCategoryHexColor(currentQuestion.category),
                color: onCategoryColorText(currentQuestion.category),
                fontWeight: 600,
                fontSize: '0.8rem',
                height: 28,
              }}
            />
            {currentQuestion.tags && currentQuestion.tags.length > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', ml: 'auto' }}>
                {currentQuestion.tags.map((tag) => (
                  <Chip
                    key={tag}
                    label={`#${tag}`}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.7rem', height: 22, color: 'text.secondary' }}
                  />
                ))}
              </Box>
            )}
          </Box>

          <Box
            component="fieldset"
            sx={{ p: 0, border: 0, m: 0, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
            aria-describedby={`question-text-${currentQuestion.id}`}
          >
            <Typography component="legend" sx={visuallyHidden}>
              {t('quiz.questionOf', { current: currentIndex + 1, total: questions.length })}
            </Typography>

            {/* Only the question text scrolls when long — the answers below
                keep their anchored position. */}
            <Box
              id={`question-text-${currentQuestion.id}`}
              className="quiz-question-text"
              sx={{ display: 'flex', alignItems: 'flex-start', gap: '4px', flex: '1 1 auto', minHeight: 0, overflowY: 'auto' }}
            >
              <Box sx={{ flex: 1 }}>{renderQuestion(currentQuestion.question)}</Box>
              {currentQuestion.introduction && (
                <ClickAwayListener onClickAway={() => setRevealedHints((prev) => ({ ...prev, [currentQuestion.id]: false }))}>
                  <span>
                    <Tooltip
                      title={currentQuestion.introduction}
                      open={!!revealedHints[currentQuestion.id]}
                      disableHoverListener
                      disableTouchListener
                      arrow
                      placement="bottom"
                      slotProps={{
                        tooltip: {
                          sx: {
                            backgroundColor: 'grey.800',
                            fontSize: '0.82rem',
                            lineHeight: 1.6,
                            p: 1.5,
                            maxWidth: 320,
                          },
                        },
                        arrow: { sx: { color: 'grey.800' } },
                      }}
                    >
                      <IconButton
                        size="small"
                        aria-label={t('quiz.showHint')}
                        aria-pressed={!!revealedHints[currentQuestion.id]}
                        onClick={() =>
                          setRevealedHints((prev) => ({ ...prev, [currentQuestion.id]: !prev[currentQuestion.id] }))
                        }
                        sx={{
                          mt: '1px',
                          color: revealedHints[currentQuestion.id] ? getCategoryHexColor(currentQuestion.category) : 'text.secondary',
                          '&:hover': { color: getCategoryHexColor(currentQuestion.category) },
                        }}
                      >
                        <HintIcon />
                      </IconButton>
                    </Tooltip>
                  </span>
                </ClickAwayListener>
              )}
            </Box>

            <RadioGroup
              value={answers[currentQuestion.id] ?? ''}
              onChange={(e) => handleAnswer(currentQuestion.id, parseInt(e.target.value, 10))}
              aria-labelledby={`question-text-${currentQuestion.id}`}
              // Raise the anchored answers ~50px off the wave on phones so
              // they sit mid-lower screen instead of at the very bottom edge.
              sx={{ flexShrink: 0, mt: 'auto', mb: { xs: '50px', sm: 0 } }}
            >
              <div className="quiz-options-container">
                {currentQuestion.options.map((option, index) => {
                  const isSelected = answers[currentQuestion.id] === index;
                  return (
                    <FormControlLabel
                      key={index}
                      value={index}
                      control={<Radio />}
                      label={option}
                      sx={isSelected ? quizStyles.optionSelected : undefined}
                    />
                  );
                })}
              </div>
            </RadioGroup>
            <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' }, mt: 1, flexShrink: 0 }}>
              {t('quiz.keyboardTip', { max: currentQuestion.options.length })}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Small coaching strip: nudges the learner toward good habits (docs
          first, read explanations, name concepts). Rotates every 10s so the
          same tip never lingers, only render when a question is actually up. */}
      <Box
        sx={{
          mt: 1.25,
          px: 1.5,
          py: 0.75,
          borderRadius: 1,
          borderLeft: `3px solid var(--brand-accent)`,
          backgroundColor: 'action.hover',
          fontSize: '0.78rem',
          color: 'text.secondary',
          lineHeight: 1.4,
          minHeight: '2.2em',
          flexShrink: 0,
        }}
      >
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
      </Box>

      {/* Nav row shares the card's column and edges: Previous hugs the card's
          left edge, Next its right, Exit sits on the exact centreline — so the
          row always reads as centred with the card, whatever the button widths. */}
      <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, flexShrink: 0, gap: 1 }}>
        <Box sx={{ flex: '1 1 0', display: 'flex', justifyContent: 'flex-start' }}>
          <Button variant="outlined" onClick={handlePrevious} disabled={currentIndex === 0} sx={quizStyles.previousButton}>
            {t('quiz.previous')}
          </Button>
        </Box>
        <Box sx={{ flex: '0 0 auto' }}>
          <Button variant="text" onClick={handleAbandon} sx={{ color: 'text.secondary', textTransform: 'none' }}>
            {t('quiz.exitQuiz')}
          </Button>
        </Box>
        <Box sx={{ flex: '1 1 0', display: 'flex', justifyContent: 'flex-end' }}>
          {currentIndex === questions.length - 1 ? (
            <Tooltip title={!allAnswered ? t('quiz.answerMore', { count: remaining }) : ''} placement="top" arrow>
              <span>
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={!allAnswered || submitting}
                  sx={quizStyles.submitButton}
                >
                  {submitting ? t('quiz.submitting') : t('quiz.submitQuiz')}
                </Button>
              </span>
            </Tooltip>
          ) : (
            <Button variant="contained" onClick={handleNext} sx={quizStyles.nextButton}>
              {t('quiz.next')}
            </Button>
          )}
        </Box>
      </Box>

      <Snackbar
        open={!!snack}
        autoHideDuration={2500}
        onClose={() => setSnack(null)}
        message={snack ?? ''}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
      <ReportDialog
        open={!!reportTarget}
        onClose={() => setReportTarget(null)}
        onSubmit={handleReport}
      />
      <Dialog open={leaveConfirmOpen} onClose={() => setLeaveConfirmOpen(false)} aria-labelledby="leave-quiz-title">
        <DialogTitle id="leave-quiz-title">{t('quiz.leaveTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t('quiz.leaveBody')}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLeaveConfirmOpen(false)} autoFocus sx={{ textTransform: 'none' }}>
            {t('quiz.leaveCancel')}
          </Button>
          <Button onClick={confirmAbandon} color="error" sx={{ textTransform: 'none' }}>
            {t('quiz.leaveConfirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Quiz;
