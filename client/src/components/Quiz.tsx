import { useState, useEffect, useRef, useCallback, useMemo, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { SwimCta } from './landing/LandingKit';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Badge } from '@astryxdesign/core/Badge';
import { WaterlineProgress, SharkFin } from './SharkFin';
import { Banner } from '@astryxdesign/core/Banner';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import { Popover } from '@astryxdesign/core/Popover';
import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { AppToast } from './ui/AppToast';
import { useAuth, getUserProfile } from '../lib/auth';
import type { Question, QuizResult, QuizState, DifficultyMode, CategoryType } from '../types/quiz';
import { visuallyHidden } from '../theme/MuiTheme';
import {
  CATEGORY_OPTIONS,
  visibleCategoryOptionsFor,
  onCategoryColorText,
  getCategoryHexColor,
  categoryLabelKey,
} from '../lib/categories';
import { readJSON, writeJSON } from '../lib/storage';
import {
  recordQuizResult,
  getDailyChallenge,
  reportQuestion,
} from '../lib/supabase';
import { apiFetch, friendlyError } from '../lib/api';
import { renderQuestion } from './CodeBlock';
import { QuoteLoader, holdLoadingScreen } from './LoadingScreen';
import { RotatingTip } from './reactbits/RotatingTip';
import { toggleBookmark as toggleBookmarkLib, useBookmarks } from '../lib/bookmarks';
import { addFlashcard, removeFlashcard } from '../lib/flashcards';
import { useLanguage, useT } from '../i18n/LanguageContext';
import type { TranslationKey } from '../i18n/translations';
import { useSettings, playCorrect, playComplete } from '../lib/settings';
import { recordPerfectQuiz } from '../lib/achievements';
import { announceVerifiedQuestXp, awardQuestXp, syncXpWithServer } from '../lib/xp';
import { useGameConfig } from '../lib/gameConfig';
import { ReportDialog } from './ReportDialog';
import { capture } from '../lib/analytics';
import { MotionPop, MotionItem } from '../lib/motion';
import { RadioCardGroup, RadioCard } from './ui/RadioCards';
import { CategoryGlyph } from './ui/techIcons';
import { CURRENT_PRODUCT } from '../lib/products';
import { createResultShareFile, downloadShareFile } from '../lib/shareCard';
import {
  SUPPORT_PROMPT_KEY,
  disableSupportPrompt,
  dismissSupportPrompt,
  recordSupportMilestone,
  type SupportPromptPreference,
} from '../lib/supportPrompt';
import './Quiz.css';

type QuizMode = 'standard' | 'daily' | 'review';
type ReviewWeakArea = { category: CategoryType; accuracyPct: number; answered: number; focusTags: string[] };

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
  width: 40,
  height: 40,
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
const CategoryTag = ({ category }: { category: CategoryType }) => {
  const t = useT();
  return (
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
      {t(categoryLabelKey(category))}
    </span>
  );
};

function Quiz({ onActiveChange }: { onActiveChange?: (active: boolean) => void }) {
  const { lang, t } = useLanguage();
  const navigate = useNavigate();
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
    const linkedCategory = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('category')
      : null;
    const known = new Set(CATEGORY_OPTIONS.map((c) => c.value));
    if (linkedCategory && known.has(linkedCategory as CategoryType)) {
      return [linkedCategory as CategoryType];
    }
    const saved = readJSON<SavedSetup>(SETUP_KEY, {});
    if (!Array.isArray(saved.categories)) return [];
    return saved.categories.filter((c): c is CategoryType => known.has(c as CategoryType));
  });
  const [revealedHints, setRevealedHints] = useState<Record<string, boolean>>({});
  const [attemptedStart, setAttemptedStart] = useState(false);
  const { ids: bookmarks } = useBookmarks();
  const [snack, setSnack] = useState<string | null>(null);
  const [mode, setMode] = useState<QuizMode>('standard');
  const [reviewPlan, setReviewPlan] = useState<ReviewWeakArea[]>([]);
  const [reportTarget, setReportTarget] = useState<string | null>(null);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [showSupportPrompt, setShowSupportPrompt] = useState(false);
  const [settings] = useSettings();

  const resultHeadingRef = useRef<HTMLDivElement | null>(null);
  const fetchAbortRef = useRef<AbortController | null>(null);

  const { isAuthenticated, user } = useAuth();
  const profile = getUserProfile(user);
  const visibleCategoryOptions = visibleCategoryOptionsFor(profile.email);

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
        // Guard against an empty question set (e.g. a difficulty/category combo
        // the server can't fill). Rendering 'in-progress' with no questions
        // would leave the learner staring at a blank screen.
        if (!Array.isArray(data.questions) || data.questions.length === 0) {
          setError(t('quiz.noQuestions'));
          setState('error');
          return;
        }
        setSessionId(data.sessionId);
        setQuestions(data.questions);
        setAnswers({});
        setReviewPlan([]);
        setCurrentIndex(0);
        setMode('standard');
        setState('in-progress');
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(friendlyError(err));
        setState('error');
      }
    },
    [lang, t],
  );

  const startDailyChallenge = useCallback(async () => {
    setState('loading');
    setError(null);
    capture('quiz_started', { mode: 'daily' });
    const startedAt = Date.now();
    try {
      const data = await getDailyChallenge(lang);
      await holdLoadingScreen(startedAt);
      if (!Array.isArray(data.questions) || data.questions.length === 0) {
        setError(t('quiz.noQuestions'));
        setState('error');
        return;
      }
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
  }, [lang, t]);

  const startPersonalizedReview = useCallback(async () => {
    fetchAbortRef.current?.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;
    setState('loading');
    setError(null);
    const startedAt = Date.now();
    try {
      const categories = visibleCategoryOptions.map((option) => option.value);
      const params = new URLSearchParams({
        resource: 'review',
        count: String(Math.min(10, config.quiz.maxCount)),
        difficulty: 'mixed',
        categories: categories.join(','),
        lang,
      });
      const data = await apiFetch<{
        sessionId: string;
        questions: Question[];
        reviewPlan?: ReviewWeakArea[];
      }>(`/api/quiz/questions?${params}`, { signal: controller.signal });
      await holdLoadingScreen(startedAt);
      if (controller.signal.aborted) return;
      if (!data.questions?.length) throw new Error(t('quiz.noQuestions'));
      setSessionId(data.sessionId);
      setQuestions(data.questions);
      setAnswers({});
      setReviewPlan(data.reviewPlan ?? []);
      setCurrentIndex(0);
      setMode('review');
      capture('quiz_started', { mode: 'review', question_count: data.questions.length });
      setState('in-progress');
    } catch (error) {
      if (controller.signal.aborted) return;
      setError(friendlyError(error));
      setState('error');
    }
  }, [config.quiz.maxCount, lang, t, visibleCategoryOptions]);

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
      const supportState = readJSON<SupportPromptPreference>(SUPPORT_PROMPT_KEY, {});
      const supportMilestone = recordSupportMilestone(
        supportState,
        data.percentage,
        config.support.enabled,
      );
      writeJSON(SUPPORT_PROMPT_KEY, supportMilestone.state);
      setShowSupportPrompt(supportMilestone.show);
      if (data.percentage === 100) recordPerfectQuiz();

      if (isAuthenticated && user?.id) {
        if (!data.resultReceipt) {
          setSnack(t('quiz.streakWarning'));
        } else {
          try {
            const saved = await recordQuizResult(data.resultReceipt, {
              email: profile.email,
              name: profile.name,
              picture: profile.picture,
            });
            await syncXpWithServer();
            if (saved.applied) announceVerifiedQuestXp(data.questXp);
          } catch (writeError) {
            console.error('Stat write failed:', writeError);
            setSnack(t('quiz.streakWarning'));
          }
        }
      } else if (data.questXp > 0) {
        // Anonymous progress remains local. Signing in replaces it with the
        // account's verified balance rather than uploading a client total.
        awardQuestXp(data.questXp, 'quiz');
      }
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  }, [answers, clearProgress, config.support.enabled, isAuthenticated, sessionId, submitting, user, lang, t, questions, mode]);

  const handleRestart = () => {
    clearProgress();
    setState('ready');
    setQuestions([]);
    setResult(null);
    setAnswers({});
    setCurrentIndex(0);
    setMode('standard');
    setReviewPlan([]);
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
    const text = t('quiz.shareText', {
      pct: result.percentage,
      correct: result.correctAnswers,
      total: result.totalQuestions,
    });
    const brandedText = text.split('StudyShark').join(CURRENT_PRODUCT.brand);
    const shareData = { title: CURRENT_PRODUCT.brand, text: brandedText, url: window.location.origin };
    try {
      capture('share_initiated', { kind: mode === 'daily' ? 'daily_result' : 'quiz_result' });
      const accent = getComputedStyle(document.documentElement).getPropertyValue('--brand-accent').trim();
      const file = await createResultShareFile({
        brand: CURRENT_PRODUCT.brand,
        label: mode === 'daily' ? t('home.stripDailyTitle') : t('quiz.shareCardTitle'),
        score: result.correctAnswers,
        total: result.totalQuestions,
        percentage: result.percentage,
        date: new Intl.DateTimeFormat(lang, { dateStyle: 'long' }).format(new Date()),
        accent,
      });
      if (navigator.share) {
        const withFile = file ? { ...shareData, files: [file] } : shareData;
        await navigator.share(file && navigator.canShare?.(withFile) ? withFile : shareData);
        return;
      }
      await navigator.clipboard.writeText(`${brandedText} ${window.location.origin}`);
      if (file) {
        downloadShareFile(file);
        setSnack(t('quiz.shareSaved'));
      } else {
        setSnack(t('quiz.shareCopied'));
      }
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
    const labelStyle: CSSProperties = { fontFamily: 'var(--font-family-heading)', fontWeight: 700, fontSize: '0.95rem' };
    const linkBtn: CSSProperties = { background: 'none', border: 'none', padding: 0, color: 'var(--brand-accent)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'var(--font-family-body)' };
    const pill = (on: boolean): CSSProperties => ({
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: on ? 'var(--brand-accent-soft)' : 'var(--ss-card-bg)',
      color: on ? 'var(--brand-accent)' : 'var(--color-text-primary)',
      border: `1px solid ${on ? 'var(--brand-accent)' : 'var(--ss-card-line)'}`,
      borderRadius: 999, padding: '7px 14px', fontFamily: 'var(--font-family-body)',
      fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
      transition: 'border-color 0.15s ease, background-color 0.15s ease, color 0.15s ease',
    });
    return (
      <div className="ss-pop" style={{ width: '100%', maxWidth: 680, margin: '0 auto' }}>
        {/* Editorial header: kicker + wave tick + Manrope title + subline. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
          <span className="ss-kicker">{t('quiz.kicker')}</span>
          <h1 style={{ margin: '6px 0 0', fontFamily: 'var(--font-family-heading)', fontWeight: 800, fontSize: '2rem', letterSpacing: '-0.015em' }}>
            {t('quiz.buildTitle')}
          </h1>
          <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--color-text-secondary)' }}>{t('quiz.buildSubtitle')}</p>
        </div>

        <div className="ss-panel" style={{ position: 'relative', overflow: 'hidden', padding: 24, display: 'flex', flexDirection: 'column', gap: 20, borderRadius: 'var(--radius-page)' }}>
          <div aria-hidden style={{ position: 'absolute', right: '-6%', bottom: '-38%', opacity: 0.04, transform: 'rotate(-8deg)', pointerEvents: 'none', color: 'var(--ss-ink)' }}>
            <SharkFin size={360} color="currentColor" />
          </div>

          {/* Categories as accent pills. */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span id="quiz-categories-label" style={labelStyle}>{t('quiz.categories')}</span>
              <button type="button" onClick={handleSelectAll} style={linkBtn}>
                {isAllSelected ? t('quiz.deselectAll') : t('quiz.selectAll')}
              </button>
            </div>
            <div role="group" aria-labelledby="quiz-categories-label" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {displayedCategoryOptions.map((cat) => {
                const selected = selectedCategories.includes(cat.value);
                return (
                  <button key={cat.value} type="button" aria-pressed={selected} onClick={() => handleCategoryToggle(cat.value)} style={pill(selected)}>
                    <CategoryGlyph category={cat.value} color={cat.color} size={16} />
                    {t(categoryLabelKey(cat.value))}
                  </button>
                );
              })}
            </div>
            {hasCollapsedSubset && (
              <button type="button" onClick={() => setShowAllCategories((v) => !v)} style={{ ...linkBtn, alignSelf: 'flex-start' }}>
                {showAllCategories ? t('quiz.showFewer') : t('quiz.showAllCategories')}
              </button>
            )}
            <div id="categories-error" role="alert" style={{ minHeight: '1.2em', fontSize: '0.78rem', fontWeight: 600, color: 'var(--ss-error)' }}>
              {attemptedStart && selectedCategories.length === 0 ? t('quiz.selectAtLeastOne') : ''}
            </div>
          </div>

          {/* Questions + Difficulty. */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 20, position: 'relative' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span id="quiz-count-label" style={labelStyle}>{t('quiz.questionsLegend')}</span>
              <div role="radiogroup" aria-labelledby="quiz-count-label" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {config.quiz.countOptions.map((count) => (
                  <button key={count} type="button" role="radio" aria-checked={questionCount === count} aria-label={t('quiz.countQuestionsAria', { count })} onClick={() => setQuestionCount(count)} style={{ ...pill(questionCount === count), minWidth: 48, justifyContent: 'center' }}>
                    {count}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span id="quiz-difficulty-label" style={labelStyle}>{t('quiz.difficulty')}</span>
              <div role="radiogroup" aria-labelledby="quiz-difficulty-label" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {DIFFICULTY_VALUES.map((value) => {
                  const label = t(`difficulty.${value}` as TranslationKey);
                  const tip = t(`difficulty.${value}.tip` as TranslationKey);
                  return (
                    <Tooltip key={value} content={tip} placement="above">
                      <button type="button" role="radio" aria-checked={difficultyMode === value} aria-label={t('quiz.difficultyAria', { label })} onClick={() => setDifficultyMode(value)} style={pill(difficultyMode === value)}>
                        {label}
                      </button>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Start — swim-through CTA + reassurance line. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', position: 'relative' }}>
            <SwimCta label={t('quiz.startQuiz')} onClick={handleStart} dir={1} disabled={selectedCategories.length === 0} size="lg" />
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{t('quiz.noPeeking')}</span>
          </div>
        </div>

        {/* Quick entries into the daily challenge — kept as quiet links. */}
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 16 }}>
          <button type="button" onClick={startDailyChallenge} style={linkBtn}>{t('quiz.todaysChallenge')}</button>
          {isAuthenticated && (
            <button type="button" onClick={() => void startPersonalizedReview()} style={linkBtn}>{t('quiz.reviewWeakAreas')}</button>
          )}
          <button type="button" onClick={() => navigate('/challenge')} style={linkBtn}>{t('challenge.cta')}</button>
        </div>

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
    return (
      <>
        <div className="ss-pop" style={{ width: '100%', maxWidth: 680, margin: '0 auto' }}>
          <div
            className="ss-panel"
            role="region"
            aria-labelledby="quiz-result-heading"
            style={{ position: 'relative', overflow: 'hidden', padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, borderRadius: 'var(--radius-page)' }}
          >
            <div aria-hidden style={{ position: 'absolute', right: '-6%', bottom: '-40%', opacity: 0.04, transform: 'rotate(-8deg)', pointerEvents: 'none', color: 'var(--ss-ink)' }}>
              <SharkFin size={340} color="currentColor" />
            </div>
            <span className="ss-kicker ss-kicker--center" style={{ position: 'relative' }}>{t('quiz.complete')}</span>
            <MotionPop>
              <div
                id="quiz-result-heading"
                ref={resultHeadingRef}
                tabIndex={-1}
                role="status"
                aria-live="polite"
                aria-label={t('quiz.scoreOutOf', { correct: result.correctAnswers, total: result.totalQuestions })}
                style={{ position: 'relative', fontFamily: 'var(--font-family-heading)', fontWeight: 800, fontSize: '3rem', lineHeight: 1, letterSpacing: '-0.02em', color: 'var(--brand-accent)' }}
              >
                {result.correctAnswers} / {result.totalQuestions}
              </div>
            </MotionPop>
            <span style={{ position: 'relative', fontSize: '0.95rem', color: 'var(--color-text-secondary)' }}>
              {t('quiz.scoreOutOf', { correct: result.correctAnswers, total: result.totalQuestions })} · {result.percentage}%
            </span>

            {mode === 'daily' && (
              <Text type="supporting" color="secondary" justify="center">
                {t('quiz.dailyComplete')}
              </Text>
            )}

            {mode === 'review' && reviewPlan.length > 0 && (
              <div style={{ position: 'relative', width: '100%', maxWidth: 520, textAlign: 'left' }}>
                <Text weight="bold">{t('quiz.reviewPlanTitle')}</Text>
                <Text type="supporting" size="sm" color="secondary">
                  {reviewPlan.map((area) => `${t(categoryLabelKey(area.category))} ${area.accuracyPct}%`).join(' · ')}
                </Text>
              </div>
            )}

            <HStack gap={1.5} justify="center" wrap="wrap" style={{ position: 'relative', marginTop: 4 }}>
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
          </div>
        </div>

        {config.support.enabled && showSupportPrompt && (
          <Card variant="muted" padding={3} width="100%" className="quiz-support-prompt">
            <VStack gap={1.5}>
              <Text weight="bold">{t('quiz.supportTitle')}</Text>
              <Text type="supporting" size="sm" color="secondary">{t('quiz.supportBody')}</Text>
              <HStack gap={1} wrap="wrap">
                <Button
                  variant="secondary"
                  size="sm"
                  label={t('quiz.supportCta')}
                  onClick={() => {
                    capture('support_prompt_opened', { product: CURRENT_PRODUCT.id });
                    setShowSupportPrompt(false);
                    navigate('/support');
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  label={t('quiz.supportDismiss')}
                  onClick={() => {
                    const state = readJSON<SupportPromptPreference>(SUPPORT_PROMPT_KEY, {});
                    writeJSON(SUPPORT_PROMPT_KEY, dismissSupportPrompt(state));
                    setShowSupportPrompt(false);
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  label={t('quiz.supportNever')}
                  onClick={() => {
                    const state = readJSON<SupportPromptPreference>(SUPPORT_PROMPT_KEY, {});
                    writeJSON(SUPPORT_PROMPT_KEY, disableSupportPrompt(state));
                    setShowSupportPrompt(false);
                  }}
                />
              </HStack>
            </VStack>
          </Card>
        )}

        <h3 id="quiz-review" className="quiz-review-header">
          {t('quiz.reviewYourAnswers', { count: questions.length })}
        </h3>
        <div className="quiz-review-grid">
        {questions.map((question, index) => {
          const questionResult = resultsById.get(question.id);
          const isCorrect = questionResult?.isCorrect;
          const isBookmarked = !!bookmarks[question.id];

          return (
            <MotionItem key={question.id} index={index} className={`quiz-review-item ${isCorrect ? 'is-correct' : 'is-incorrect'}`}>
              <Card variant="default" padding={3} width="100%" className="quiz-review-card">
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

                  <div className="quiz-review-question">{renderQuestion(question.question)}</div>

                  <Text type="body" size="sm">
                    {t('quiz.yourAnswerLabel')}{' '}
                    <strong>{question.options[questionResult?.selectedIndex ?? 0]}</strong>
                  </Text>
                  {!isCorrect && (
                    <span style={{ color: 'var(--ss-success-strong)' }}>
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
                        backgroundColor: 'var(--color-background-muted)',
                        borderRadius: 'var(--radius-element)',
                        border: '1px solid var(--color-border)',
                        borderLeft: `4px solid ${getCategoryHexColor(question.category)}`,
                      }}
                    >
                      <Text type="body" size="sm">
                        {questionResult.explanation}
                      </Text>
                    </div>
                  )}
                  {config.ai.explanationsEnabled && questionResult?.answerProof && (
                    <AiExplanationPanel
                      answerProof={questionResult.answerProof}
                      selectedAnswer={question.options[questionResult.selectedIndex] ?? ''}
                      lang={lang}
                      onReport={() => setReportTarget(question.id)}
                    />
                  )}
                </VStack>
              </Card>
            </MotionItem>
          );
        })}
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
            <Text type="supporting" size="xsm" weight="medium">
              {t('quiz.questionCounter', { current: currentIndex + 1, total: questions.length })}
            </Text>
            <div style={{ flex: 1 }}>
              <WaterlineProgress label={t('quiz.progressAria')} value={progress} />
            </div>
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

            {/* Answer options as radio cards (one Tab stop, arrow keys move +
                select). Raised off the wave on phones so they sit mid-lower
                screen. */}
            <RadioCardGroup
              value={answers[currentQuestion.id] ?? null}
              onChange={(v) => handleAnswer(currentQuestion.id, v as number)}
              labelledBy={`question-text-${currentQuestion.id}`}
              style={{ flexShrink: 0, marginTop: 'auto' }}
            >
              <VStack gap={1}>
                {currentQuestion.options.map((option, index) => {
                  const isSelected = answers[currentQuestion.id] === index;
                  return (
                    <RadioCard key={index} value={index} index={index} label={option} padding={2}>
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
                    </RadioCard>
                  );
                })}
              </VStack>
            </RadioCardGroup>

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
        className="ss-alert-dialog"
        isOpen={leaveConfirmOpen}
        onOpenChange={setLeaveConfirmOpen}
        title={t('quiz.leaveTitle')}
        description={t('quiz.leaveBody')}
        actionLabel={t('quiz.leaveConfirm')}
        cancelLabel={t('quiz.leaveCancel')}
        onAction={confirmAbandon}
        width="min(460px, calc(100vw - 32px))"
      />
    </div>
  );
}

interface AiExplanationContent {
  whyCorrect: string;
  whySelected: string;
  misconception: string;
  relatedConcept: string;
}

function AiExplanationPanel({
  answerProof,
  selectedAnswer,
  lang,
  onReport,
}: {
  answerProof: string;
  selectedAnswer: string;
  lang: string;
  onReport: () => void;
}) {
  const t = useT();
  const [content, setContent] = useState<AiExplanationContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  const load = async () => {
    if (loading || content) return;
    setLoading(true);
    setUnavailable(false);
    try {
      const response = await apiFetch<{
        available: boolean;
        content?: AiExplanationContent;
      }>('/api/quiz/submit?resource=explanation', {
        method: 'POST',
        body: JSON.stringify({ answerProof, selectedAnswer, lang }),
        timeoutMs: 10_000,
      });
      if (response.available && response.content) setContent(response.content);
      else setUnavailable(true);
    } catch {
      setUnavailable(true);
    } finally {
      setLoading(false);
    }
  };

  if (!content) {
    return (
      <VStack gap={1} align="start">
        <Button
          variant="secondary"
          size="sm"
          label={loading ? t('quiz.aiLoading') : t('quiz.aiExplain')}
          isLoading={loading}
          isDisabled={loading}
          onClick={() => void load()}
        />
        {unavailable && (
          <Text type="supporting" size="xsm" color="secondary">{t('quiz.aiUnavailable')}</Text>
        )}
      </VStack>
    );
  }

  return (
    <div className="quiz-ai-explanation">
      <VStack gap={1}>
        <HStack justify="between" align="center" gap={1} wrap="wrap">
          <Text weight="bold" size="sm">{t('quiz.aiTitle')}</Text>
          <Button variant="ghost" size="sm" label={t('quiz.aiReport')} onClick={onReport} />
        </HStack>
        <Text type="body" size="sm"><strong>{t('quiz.aiWhyCorrect')}</strong> {content.whyCorrect}</Text>
        {content.whySelected && <Text type="body" size="sm"><strong>{t('quiz.aiWhySelected')}</strong> {content.whySelected}</Text>}
        {content.misconception && <Text type="body" size="sm"><strong>{t('quiz.aiMisconception')}</strong> {content.misconception}</Text>}
        <Text type="body" size="sm"><strong>{t('quiz.aiRelated')}</strong> {content.relatedConcept}</Text>
      </VStack>
    </div>
  );
}

export default Quiz;
