import { useState, useEffect, useRef, useCallback } from 'react';
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
  Skeleton,
  Snackbar,
} from '@mui/material';
import { useAuth0 } from '@auth0/auth0-react';
import type { Question, QuizResult, QuizState, DifficultyMode, CategoryType } from '../types/quiz';
import { quizStyles, BRAND, CATEGORY_GRADIENT } from '../theme/MuiTheme';
import {
  recordQuizResult,
  createOrUpdateUserStats,
  getDailyChallenge,
  reportQuestion,
} from '../lib/supabase';
import { recordCategoryStats } from '../lib/play';
import { apiFetch, friendlyError } from '../lib/api';
import { renderQuestion } from './CodeBlock';
import { toggleBookmark as toggleBookmarkLib, useBookmarks } from '../lib/bookmarks';
import { useSettings, playCorrect, playComplete } from '../lib/settings';
import { recordPerfectQuiz } from '../lib/achievements';
import { addFailedCard } from '../lib/cards';
import { ReportDialog } from './ReportDialog';
import './Quiz.css';

type QuizMode = 'standard' | 'daily';

const CATEGORY_OPTIONS: { value: CategoryType; label: string; color: string }[] = [
  { value: 'html', label: 'HTML', color: '#e34c26' },
  { value: 'css', label: 'CSS', color: '#264de4' },
  { value: 'javascript', label: 'JavaScript', color: '#f7df1e' },
  { value: 'typescript', label: 'TypeScript', color: '#3178c6' },
  { value: 'react', label: 'React', color: '#61dafb' },
  { value: 'nodejs', label: 'Node.js', color: '#339933' },
  { value: 'git', label: 'Git', color: '#f05032' },
  { value: 'dev-world', label: 'Dev World', color: '#8b5cf6' },
  { value: 'custom', label: 'Custom', color: '#06b6d4' },
  { value: 'code-snippets', label: 'Code Snippets', color: '#ec4899' },
];

const CATEGORY_LOOKUP = new Map(CATEGORY_OPTIONS.map((c) => [c.value, c]));
const ALL_CATEGORIES: CategoryType[] = CATEGORY_OPTIONS.map((c) => c.value);

const QUESTION_COUNT_OPTIONS = [10, 20, 30, 40, 50];

const DIFFICULTY_OPTIONS: { value: DifficultyMode; label: string; tooltip: string }[] = [
  { value: 'basics', label: 'Basics', tooltip: 'Definitions and basic terms.' },
  { value: 'easy', label: 'Easy', tooltip: 'Difficulty 1–2. Beginner-friendly.' },
  { value: 'zero-to-hero', label: 'Zero to Hero', tooltip: 'Progressive difficulty 1 → 5.' },
  { value: 'advanced', label: 'Advanced', tooltip: 'Difficulty 3–5. Experienced devs.' },
  { value: 'mixed', label: 'Mixed', tooltip: 'Random mix across difficulties.' },
];

const DARK_TEXT_CATEGORIES = new Set(['javascript', 'react']);
const onCategoryColorText = (cat: string) => (DARK_TEXT_CATEGORIES.has(cat) ? '#1a1a1a' : '#fff');
const getCategoryHexColor = (category: string) => CATEGORY_LOOKUP.get(category as CategoryType)?.color || '#666';
const getCategoryLabel = (category: string) => CATEGORY_LOOKUP.get(category as CategoryType)?.label || category;

const PROGRESS_KEY = 'devquiz:in-progress';

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

function Quiz({ onActiveChange }: { onActiveChange?: (active: boolean) => void }) {
  const [state, setState] = useState<QuizState>('ready');
  const [sessionId, setSessionId] = useState<string>('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [difficultyMode, setDifficultyMode] = useState<DifficultyMode>('zero-to-hero');
  const [selectedCategories, setSelectedCategories] = useState<CategoryType[]>([]);
  const [revealedHints, setRevealedHints] = useState<Record<string, boolean>>({});
  const [attemptedStart, setAttemptedStart] = useState(false);
  const { ids: bookmarks } = useBookmarks();
  const [snack, setSnack] = useState<string | null>(null);
  const [mode, setMode] = useState<QuizMode>('standard');
  const [reportTarget, setReportTarget] = useState<string | null>(null);
  const [settings, updateSettings] = useSettings();

  const resultHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const fetchAbortRef = useRef<AbortController | null>(null);

  let isAuthenticated = false;
  let user: { sub?: string; email?: string; name?: string; picture?: string } | undefined;
  try {
    const auth0 = useAuth0();
    isAuthenticated = auth0.isAuthenticated;
    user = auth0.user;
  } catch {
    /* Auth0 not configured */
  }

  useEffect(() => {
    onActiveChange?.(state !== 'ready');
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
      try {
        const params = new URLSearchParams({
          count: String(count),
          difficulty,
          categories: categories.join(','),
        });
        const data = await apiFetch<{ sessionId: string; questions: Question[] }>(
          `/api/quiz/questions?${params}`,
          { signal: controller.signal },
        );
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
    [],
  );

  const startDailyChallenge = useCallback(async () => {
    setState('loading');
    setError(null);
    try {
      const data = await getDailyChallenge();
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
  }, []);

  const handleStart = () => {
    setAttemptedStart(true);
    if (selectedCategories.length === 0) {
      setError('Select at least one category to start.');
      return;
    }
    setError(null);
    setResult(null);
    fetchQuestions(questionCount, difficultyMode, selectedCategories);
  };

  const handleCategoryToggle = (category: CategoryType) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    );
  };

  const handleSelectAll = () => {
    setSelectedCategories((prev) => (prev.length === ALL_CATEGORIES.length ? [] : ALL_CATEGORIES));
  };

  const isAllSelected = selectedCategories.length === ALL_CATEGORIES.length;

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
        await reportQuestion({ questionId: reportTarget, reason, detail, reporterSub: user?.sub });
        setSnack('Thanks — report sent');
      } catch {
        setSnack('Could not send report');
      } finally {
        setReportTarget(null);
      }
    },
    [reportTarget, user],
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
        body: JSON.stringify({ sessionId, answers }),
      });
      setResult(data);
      setState('submitted');
      clearProgress();
      playComplete();
      if (data.percentage === 100) recordPerfectQuiz();

      // Auto-collect every wrong answer as a flashcard. Existing cards have
      // their wrongCount bumped (see lib/cards.ts) so repeated misses raise
      // priority; correct answers don't touch existing cards.
      for (const r of data.results) {
        if (r.isCorrect) continue;
        const q = questions.find((qq) => qq.id === r.questionId);
        if (!q) continue;
        addFailedCard({
          id: q.id,
          question: q.question,
          options: q.options,
          correctIndex: r.correctAnswer,
          explanation: r.explanation,
          category: q.category,
        });
      }

      // Practice mode: don't write stats. Daily challenge: write stats.
      if (settings.practiceMode) {
        setSnack('Practice mode — stats not updated');
      } else if (isAuthenticated && user?.sub) {
        try {
          await createOrUpdateUserStats(user.sub, {
            email: user.email,
            name: user.name,
            picture: user.picture,
          });
          await recordQuizResult(user.sub, data.correctAnswers, data.totalQuestions);

          // Per-category breakdown for category leaderboards.
          const byCategory: Record<string, { correct: number; total: number }> = {};
          for (const q of questions) {
            const r = data.results.find((x) => x.questionId === q.id);
            if (!r) continue;
            const bucket = byCategory[q.category] ?? { correct: 0, total: 0 };
            bucket.total += 1;
            if (r.isCorrect) bucket.correct += 1;
            byCategory[q.category] = bucket;
          }
          if (Object.keys(byCategory).length > 0) {
            try {
              await recordCategoryStats(user.sub, byCategory);
            } catch (catErr) {
              console.error('Category stats failed:', catErr);
            }
          }
        } catch (statsErr) {
          console.error('Failed to update user stats:', statsErr);
          setSnack('We saved your score but could not update your streak.');
        }
      }
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  }, [answers, clearProgress, isAuthenticated, questions, sessionId, submitting, user, settings.practiceMode]);

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

  const handleAbandon = () => {
    if (window.confirm('Leave this quiz? Your progress will be lost.')) {
      handleRestart();
    }
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
    setSnack(added ? 'Bookmarked' : 'Removed bookmark');
  };

  const handleShare = async () => {
    if (!result) return;
    const text = `I scored ${result.percentage}% on DevQuiz (${result.correctAnswers}/${result.totalQuestions}). Try it!`;
    const shareData = { title: 'DevQuiz', text, url: window.location.origin };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(`${text} ${window.location.origin}`);
      setSnack('Result copied to clipboard');
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setSnack('Could not share');
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
    return (
      <Card className="quiz-card" aria-busy="true">
        <CardContent className="quiz-card-content">
          <Skeleton variant="text" sx={{ fontSize: '0.75rem', width: '30%' }} />
          <Skeleton variant="rectangular" height={6} sx={{ mt: 1, mb: 3, borderRadius: 1 }} />
          <Skeleton variant="text" sx={{ fontSize: '1rem' }} />
          <Skeleton variant="text" sx={{ fontSize: '1rem', width: '70%', mb: 3 }} />
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" height={48} sx={{ mb: 1 }} />
          ))}
        </CardContent>
      </Card>
    );
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
                Retry
              </Button>
            }
          >
            {error || 'Something went wrong'}
          </Alert>
          <Button onClick={handleRestart} variant="outlined" fullWidth>
            Back to settings
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (state === 'ready') {
    return (
      <Box
        sx={{
          mx: 'auto',
          p: 3,
          backgroundColor: 'background.paper',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          borderTop: `4px solid ${BRAND.green}`,
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        }}
      >
        <Typography variant="h5" component="h1" sx={{ mb: 0.5, fontWeight: 600, textAlign: 'center' }}>
          Web Development Quiz
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, fontSize: '0.85rem', textAlign: 'center' }}>
          500+ questions · keyboard shortcuts supported
        </Typography>

        <Button
          fullWidth
          onClick={startDailyChallenge}
          variant="outlined"
          sx={{
            mb: 3,
            py: 1.25,
            textTransform: 'none',
            borderColor: BRAND.green,
            color: BRAND.green,
            display: 'flex',
            justifyContent: 'space-between',
            '&:hover': { borderColor: BRAND.greenHover, backgroundColor: 'rgba(45,122,45,0.06)' },
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span aria-hidden>🗓️</span>
            <span>Today’s challenge</span>
          </span>
          <span style={{ opacity: 0.7, fontSize: '0.8rem' }}>5 questions · same for everyone</span>
        </Button>

        <Box component="fieldset" sx={{ mb: 4, p: 0, border: 0 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography component="legend" variant="overline" color="text.secondary" sx={{ p: 0 }}>
              Categories
            </Typography>
            <Button
              size="small"
              onClick={handleSelectAll}
              sx={{ fontSize: '0.7rem', textTransform: 'none', color: 'text.secondary', minWidth: 'auto', p: '2px 8px' }}
            >
              {isAllSelected ? 'Deselect all' : 'Select all'}
            </Button>
          </Box>
          <Box role="group" aria-label="Quiz categories" sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: '6px', sm: '10px' }, justifyContent: 'center' }}>
            {CATEGORY_OPTIONS.map((cat) => {
              const selected = selectedCategories.includes(cat.value);
              return (
                <Chip
                  key={cat.value}
                  label={cat.label}
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
                    borderLeft: `4px solid ${cat.color}`,
                    borderRadius: 1,
                    fontWeight: selected ? 600 : 500,
                    fontSize: '0.85rem',
                    height: 36,
                    '&:hover': { backgroundColor: 'action.hover' },
                  }}
                />
              );
            })}
          </Box>
          {attemptedStart && selectedCategories.length === 0 && (
            <Typography variant="caption" color="error" id="categories-error" role="alert" sx={{ mt: 1, display: 'block' }}>
              Select at least one category
            </Typography>
          )}
        </Box>

        {selectedCategories.length > 0 && (
          <Box sx={{ mb: 4, p: 1.5, backgroundColor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Selected ({selectedCategories.length}/{ALL_CATEGORIES.length}):
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

        <Box component="fieldset" sx={{ mb: 4, p: 0, border: 0 }}>
          <Typography component="legend" variant="overline" color="text.secondary" sx={{ p: 0, mb: 1.5, display: 'block' }}>
            Questions
          </Typography>
          <Box role="radiogroup" aria-label="Number of questions" sx={{ display: 'flex', gap: 0.5 }}>
            {QUESTION_COUNT_OPTIONS.map((count) => (
              <Button
                key={count}
                variant="outlined"
                onClick={() => setQuestionCount(count)}
                role="radio"
                aria-checked={questionCount === count}
                sx={{
                  minWidth: 44,
                  minHeight: 44,
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  color: questionCount === count ? BRAND.green : 'text.secondary',
                  border: questionCount === count ? `2px solid ${BRAND.green}` : '1px solid',
                  borderColor: questionCount === count ? BRAND.green : 'divider',
                }}
              >
                {count}
              </Button>
            ))}
          </Box>
        </Box>

        <Box component="fieldset" sx={{ mb: 4, p: 0, border: 0 }}>
          <Typography component="legend" variant="overline" color="text.secondary" sx={{ p: 0, mb: 1.5, display: 'block' }}>
            Difficulty
          </Typography>
          <Box role="radiogroup" aria-label="Difficulty" sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {DIFFICULTY_OPTIONS.map((option) => (
              <Tooltip key={option.value} title={option.tooltip} arrow placement="top">
                <Button
                  variant="outlined"
                  onClick={() => setDifficultyMode(option.value)}
                  role="radio"
                  aria-checked={difficultyMode === option.value}
                  aria-describedby={`difficulty-help-${option.value}`}
                  sx={{
                    fontWeight: 500,
                    fontSize: '0.85rem',
                    minHeight: 44,
                    textTransform: 'none',
                    color: difficultyMode === option.value ? BRAND.green : 'text.secondary',
                    border: difficultyMode === option.value ? `2px solid ${BRAND.green}` : '1px solid',
                    borderColor: difficultyMode === option.value ? BRAND.green : 'divider',
                  }}
                >
                  {option.label}
                </Button>
              </Tooltip>
            ))}
          </Box>
          <Typography
            id={`difficulty-help-${difficultyMode}`}
            variant="caption"
            color="text.secondary"
            sx={{ mt: 1, display: 'block' }}
          >
            {DIFFICULTY_OPTIONS.find((o) => o.value === difficultyMode)?.tooltip}
          </Typography>
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
          Start quiz
        </Button>

        <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <ToggleRow
            label="Practice mode"
            description="Skip stats updates this session"
            checked={settings.practiceMode}
            onChange={(v) => updateSettings({ practiceMode: v })}
          />
          <ToggleRow
            label="Sound effects"
            description="Subtle ticks on answer / submit"
            checked={settings.soundEffects}
            onChange={(v) => updateSettings({ soundEffects: v })}
          />
        </Box>

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
        <Card className="quiz-card" sx={{ borderTop: `4px solid ${BRAND.green}` }}>
          <CardContent className="quiz-result-card" role="region" aria-labelledby="quiz-result-heading">
            <Typography
              id="quiz-result-heading"
              ref={resultHeadingRef}
              tabIndex={-1}
              variant="h4"
              component="h2"
              sx={{ mb: 2, outline: 'none' }}
            >
              Quiz complete!
            </Typography>
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
            <Typography variant="h6" sx={{ mt: 1 }}>
              {result.correctAnswers} out of {result.totalQuestions} correct
            </Typography>

            {mode === 'daily' && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                Today’s challenge complete — see you tomorrow.
              </Typography>
            )}
            <Box sx={{ mt: 3, display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                onClick={handleRestart}
                sx={{ ...quizStyles.startButton, ...quizStyles.brandButton }}
              >
                New quiz
              </Button>
              <Button
                variant="outlined"
                startIcon={<ShareIcon />}
                onClick={handleShare}
                sx={{ textTransform: 'none' }}
              >
                Share result
              </Button>
              <Button
                variant="text"
                onClick={() => {
                  document.getElementById('quiz-review')?.scrollIntoView({ behavior: 'smooth' });
                }}
                sx={{ textTransform: 'none' }}
              >
                Review answers ↓
              </Button>
            </Box>
          </CardContent>
        </Card>

        <Typography variant="h6" component="h3" id="quiz-review" className="quiz-review-header">
          Review your answers ({questions.length})
        </Typography>
        {questions.map((question, index) => {
          const questionResult = result.results.find((r) => r.questionId === question.id);
          const isCorrect = questionResult?.isCorrect;
          const isBookmarked = !!bookmarks[question.id];

          return (
            <Paper
              key={question.id}
              elevation={0}
              className={`quiz-result-item ${isCorrect ? 'correct' : 'incorrect'}`}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="subtitle2" component="h4">
                    Question {index + 1}
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
                    {isCorrect ? 'Correct' : 'Incorrect'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <IconButton
                    size="small"
                    aria-pressed={isBookmarked}
                    aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark this question'}
                    onClick={() =>
                      toggleBookmark(
                        question,
                        questionResult?.correctAnswer ?? 0,
                        questionResult?.explanation ?? '',
                      )
                    }
                    sx={{ color: isBookmarked ? BRAND.green : 'text.secondary' }}
                  >
                    <BookmarkIcon filled={isBookmarked} />
                  </IconButton>
                  <IconButton
                    size="small"
                    aria-label="Report this question"
                    onClick={() => setReportTarget(question.id)}
                    sx={{ color: 'text.secondary' }}
                  >
                    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                      <line x1="4" y1="22" x2="4" y2="15" />
                    </svg>
                  </IconButton>
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
                Your answer: <strong>{question.options[questionResult?.selectedIndex ?? 0]}</strong>
              </Typography>
              {!isCorrect && (
                <Typography variant="body2" color="success.dark" sx={{ mt: 0.75 }}>
                  Correct: <strong>{question.options[questionResult?.correctAnswer ?? 0]}</strong>
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
          );
        })}

        <Snackbar
          open={!!snack}
          autoHideDuration={2500}
          onClose={() => setSnack(null)}
          message={snack ?? ''}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
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
  const isBookmarked = !!bookmarks[currentQuestion.id];

  return (
    <>
      {error && (
        <Alert severity="error" role="alert" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card className="quiz-card">
        <CardContent className="quiz-card-content">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
              {currentIndex + 1}/{questions.length}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={progress}
              aria-label="Quiz progress"
              sx={{
                flex: 1,
                height: 6,
                borderRadius: 3,
                backgroundColor: 'action.hover',
                '& .MuiLinearProgress-bar': { borderRadius: 3, background: CATEGORY_GRADIENT },
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
              {answered}/{questions.length}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5, gap: 1, flexWrap: 'wrap' }}>
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
            <IconButton
              size="small"
              aria-pressed={isBookmarked}
              aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark this question'}
              onClick={() => toggleBookmark(currentQuestion, 0, '')}
              sx={{ color: isBookmarked ? BRAND.green : 'text.secondary' }}
            >
              <BookmarkIcon filled={isBookmarked} />
            </IconButton>
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
            sx={{ p: 0, border: 0, m: 0 }}
            aria-describedby={`question-text-${currentQuestion.id}`}
          >
            <Typography component="legend" sx={{ position: 'absolute', left: -9999 }}>
              Question {currentIndex + 1} of {questions.length}
            </Typography>

            <Box id={`question-text-${currentQuestion.id}`} className="quiz-question-text" sx={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
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
                            backgroundColor: '#333',
                            fontSize: '0.82rem',
                            lineHeight: 1.6,
                            p: 1.5,
                            maxWidth: 320,
                          },
                        },
                        arrow: { sx: { color: '#333' } },
                      }}
                    >
                      <IconButton
                        size="small"
                        aria-label="Show hint"
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
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Tip: press 1–{currentQuestion.options.length} to pick, ←/→ to navigate, Enter to advance.
            </Typography>
          </Box>
        </CardContent>
      </Card>

      <div className="quiz-button-container">
        <Button variant="outlined" onClick={handlePrevious} disabled={currentIndex === 0} sx={quizStyles.previousButton}>
          Previous
        </Button>
        <Button variant="text" onClick={handleAbandon} sx={{ color: 'text.secondary', textTransform: 'none' }}>
          Exit quiz
        </Button>
        {currentIndex === questions.length - 1 ? (
          <Tooltip title={!allAnswered ? `Answer ${remaining} more to submit` : ''} placement="top" arrow>
            <span>
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={!allAnswered || submitting}
                sx={quizStyles.submitButton}
              >
                {submitting ? 'Submitting…' : 'Submit quiz'}
              </Button>
            </span>
          </Tooltip>
        ) : (
          <Button variant="contained" onClick={handleNext} sx={quizStyles.nextButton}>
            Next
          </Button>
        )}
      </div>

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

const ToggleRow = ({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <Box
    component="label"
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1.5,
      p: 1.25,
      flex: '1 1 200px',
      border: '1px solid',
      borderColor: checked ? BRAND.green : 'divider',
      borderRadius: 1,
      cursor: 'pointer',
      backgroundColor: checked ? 'rgba(45,122,45,0.04)' : 'transparent',
    }}
  >
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      style={{ accentColor: BRAND.green }}
    />
    <Box>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {description}
      </Typography>
    </Box>
  </Box>
);

export default Quiz;
