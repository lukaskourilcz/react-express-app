import { useState, useEffect } from 'react';
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
} from '@mui/material';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useAuth0 } from '@auth0/auth0-react';
import type { Question, QuizResult, QuizState, DifficultyMode, CategoryType } from '../types/quiz';
import { quizStyles } from '../theme/MuiTheme';
import { updateQuizResult, createOrUpdateUserStats } from '../lib/supabase';
import './Quiz.css';

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
];

// Gradient using category colors
const CATEGORY_GRADIENT = 'linear-gradient(90deg, #e34c26, #264de4, #f7df1e, #3178c6, #61dafb, #339933, #f05032, #8b5cf6, #06b6d4, #ec4899)';

// Get category color by category value
const getCategoryHexColor = (category: string): string => {
  return CATEGORY_OPTIONS.find(c => c.value === category)?.color || '#666';
};

const ALL_CATEGORIES: CategoryType[] = ['html', 'css', 'javascript', 'typescript', 'react', 'nodejs', 'git', 'dev-world', 'custom'];

// Render question text with syntax-highlighted code blocks
const renderQuestion = (text: string) => {
  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts.map((part, index) => {
    if (part.startsWith('```')) {
      // Extract language from code fence (e.g., ```javascript)
      const langMatch = part.match(/```(\w*)\n?/);
      const language = langMatch?.[1] || 'javascript';
      const code = part.replace(/```\w*\n?/, '').replace(/```$/, '').trim();
      return (
        <SyntaxHighlighter
          key={index}
          language={language === 'js' ? 'javascript' : language === 'ts' ? 'typescript' : language || 'javascript'}
          style={oneDark}
          customStyle={{
            margin: '1rem 0',
            borderRadius: '6px',
            fontSize: '0.75rem',
            padding: '1rem',
          }}
          codeTagProps={{
            style: {
              fontFamily: '"SF Mono", "Consolas", "Monaco", monospace',
            }
          }}
        >
          {code}
        </SyntaxHighlighter>
      );
    }
    return <span key={index}>{part}</span>;
  });
};

const QUESTION_COUNT_OPTIONS = [10, 20, 30, 40, 50];

const DIFFICULTY_OPTIONS: { value: DifficultyMode; label: string; tooltip: string }[] = [
  { value: 'basics', label: 'Basics', tooltip: 'Focus on definitions and basic terms.' },
  { value: 'easy', label: 'Easy', tooltip: 'Only difficulty levels 1-2. Perfect for beginners.' },
  { value: 'zero-to-hero', label: 'Zero to Hero', tooltip: 'Progressive difficulty from 1 to 5. Great for learning!' },
  { value: 'advanced', label: 'Advanced', tooltip: 'Difficulty levels 3-5. For experienced developers.' },
  { value: 'mixed', label: 'Mixed', tooltip: 'Random mix of all difficulty levels.' },
];

function Quiz({ onActiveChange }: { onActiveChange?: (active: boolean) => void }) {
  const [state, setState] = useState<QuizState>('ready');
  const [sessionId, setSessionId] = useState<string>('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [difficultyMode, setDifficultyMode] = useState<DifficultyMode>('zero-to-hero');
  const [selectedCategories, setSelectedCategories] = useState<CategoryType[]>([]);
  const [revealedHints, setRevealedHints] = useState<Record<string, boolean>>({});
  const [revealedOptions, setRevealedOptions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    onActiveChange?.(state !== 'ready');
  }, [state, onActiveChange]);

  let isAuthenticated = false;
  let user: { sub?: string; email?: string; name?: string; picture?: string } | undefined;

  try {
    const auth0 = useAuth0();
    isAuthenticated = auth0.isAuthenticated;
    user = auth0.user;
  } catch {
    // Auth0 not configured
  }

  const fetchQuestions = async (count: number, difficulty: DifficultyMode, categories: CategoryType[]) => {
    try {
      setState('loading');
      const categoriesParam = categories.join(',');
      const response = await fetch(`/api/quiz/questions?count=${count}&difficulty=${difficulty}&categories=${categoriesParam}`);
      if (!response.ok) throw new Error('Failed to fetch questions');
      const data = await response.json();
      setSessionId(data.sessionId);
      setQuestions(data.questions);
      setState('in-progress');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setState('error');
    }
  };

  const handleStart = () => {
    if (selectedCategories.length === 0) {
      setError('Please select at least one category');
      return;
    }
    setCurrentIndex(0);
    setAnswers({});
    setResult(null);
    fetchQuestions(questionCount, difficultyMode, selectedCategories);
  };

  const handleCategoryToggle = (category: CategoryType) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleSelectAll = () => {
    if (selectedCategories.length === ALL_CATEGORIES.length) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(ALL_CATEGORIES);
    }
  };

  const isAllSelected = selectedCategories.length === ALL_CATEGORIES.length;

  const handleAnswer = (questionId: string, answerIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answerIndex }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      const response = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, answers }),
      });
      if (!response.ok) throw new Error('Failed to submit quiz');
      const data = await response.json();
      setResult(data);
      setState('submitted');

      // Update user stats if authenticated
      if (isAuthenticated && user?.sub) {
        try {
          // Ensure user profile exists first
          await createOrUpdateUserStats(user.sub, {
            email: user.email,
            name: user.name,
            picture: user.picture,
          });
          // Update quiz stats
          await updateQuizResult(user.sub, data.correctAnswers, data.totalQuestions);
        } catch (statsError) {
          console.error('Failed to update user stats:', statsError);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
    }
  };

  const handleRestart = () => {
    setState('ready');
    setQuestions([]);
    setResult(null);
    setAnswers({});
    setCurrentIndex(0);
  };

  if (state === 'loading') {
    return (
      <Card className="quiz-card">
        <CardContent className="quiz-loading-container">
          <Typography variant="h5">
            Loading questions...
          </Typography>
          <Box sx={{ width: '100%', maxWidth: 300 }}>
            <LinearProgress
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: 'rgba(0,0,0,0.1)',
                '& .MuiLinearProgress-bar': {
                  background: CATEGORY_GRADIENT,
                }
              }}
            />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (state === 'error') {
    return (
      <Card className="quiz-card">
        <CardContent sx={{ padding: '2rem' }}>
          <Alert
            severity="error"
            action={<Button onClick={() => fetchQuestions(questionCount, difficultyMode, selectedCategories)} color="inherit">Retry</Button>}
          >
            {error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (state === 'ready') {
    return (
      <Box sx={{
        maxWidth: 500,
        mx: 'auto',
        p: 3,
        backgroundColor: '#fff',
        borderRadius: 2,
        border: '1px solid #e0e0e0',
        borderTop: '4px solid #339933',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      }}>
        <Typography
          variant="h5"
          sx={{
            mb: 0.5,
            fontWeight: 600,
            color: '#1a1a1a',
            textAlign: 'center',
          }}
        >
          Web Development Quiz
        </Typography>
        <Typography
          variant="body2"
          sx={{
            mb: 4,
            color: '#666',
            fontSize: '0.85rem',
            textAlign: 'center',
          }}
        >
          500+ questions
        </Typography>

        {/* Categories Section */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography variant="body2" sx={{ color: '#888', fontWeight: 500, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Categories
            </Typography>
            <Button
              size="small"
              onClick={handleSelectAll}
              sx={{
                fontSize: '0.7rem',
                textTransform: 'none',
                color: '#666',
                minWidth: 'auto',
                p: '2px 8px',
                '&:hover': { backgroundColor: '#f5f5f5' }
              }}
            >
              {isAllSelected ? 'Deselect All' : 'Select All'}
            </Button>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
            {CATEGORY_OPTIONS.map((cat) => (
              <Chip
                key={cat.value}
                label={cat.label}
                size="small"
                onClick={() => handleCategoryToggle(cat.value)}
                sx={{
                  cursor: 'pointer',
                  backgroundColor: '#fff',
                  color: selectedCategories.includes(cat.value) ? cat.color : '#555',
                  border: selectedCategories.includes(cat.value) ? `2px solid ${cat.color}` : '1px solid #ddd',
                  borderLeft: `4px solid ${cat.color}`,
                  borderRadius: 1,
                  fontWeight: selectedCategories.includes(cat.value) ? 600 : 500,
                  fontSize: '0.8rem',
                  '&:hover': {
                    backgroundColor: '#f8f8f8',
                  },
                }}
              />
            ))}
          </Box>
          {selectedCategories.length === 0 && (
            <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
              Select at least one category
            </Typography>
          )}
        </Box>

        {/* Selected Categories Display */}
        {selectedCategories.length > 0 && (
          <Box sx={{ mb: 4, p: 1.5, backgroundColor: '#fafafa', borderRadius: 1 }}>
            <Typography variant="caption" sx={{ color: '#888', display: 'block', mb: 1 }}>
              Selected ({selectedCategories.length}/{ALL_CATEGORIES.length}):
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {selectedCategories.map(cat => {
                const category = CATEGORY_OPTIONS.find(c => c.value === cat);
                return (
                  <Chip
                    key={cat}
                    label={category?.label}
                    size="small"
                    sx={{
                      height: '22px',
                      fontSize: '0.7rem',
                      fontWeight: 500,
                      backgroundColor: category?.color,
                      color: ['javascript', 'react'].includes(cat) ? '#1a1a1a' : '#fff',
                    }}
                  />
                );
              })}
            </Box>
          </Box>
        )}

        {/* Question Count */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="body2" sx={{ color: '#888', fontWeight: 500, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 1.5 }}>
            Questions
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {QUESTION_COUNT_OPTIONS.map((count) => (
              <Button
                key={count}
                variant="outlined"
                size="small"
                onClick={() => setQuestionCount(count)}
                sx={{
                  minWidth: 44,
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  backgroundColor: '#fff',
                  color: questionCount === count ? '#339933' : '#555',
                  border: questionCount === count ? '2px solid #339933' : '1px solid #ddd',
                  '&:hover': {
                    backgroundColor: '#f8f8f8',
                    border: questionCount === count ? '2px solid #339933' : '1px solid #ccc',
                  },
                }}
              >
                {count}
              </Button>
            ))}
          </Box>
        </Box>

        {/* Difficulty */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="body2" sx={{ color: '#888', fontWeight: 500, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 1.5 }}>
            Difficulty
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {DIFFICULTY_OPTIONS.map((option) => (
              <Tooltip key={option.value} title={option.tooltip} arrow placement="top">
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setDifficultyMode(option.value)}
                  sx={{
                    fontWeight: 500,
                    fontSize: '0.8rem',
                    textTransform: 'none',
                    backgroundColor: '#fff',
                    color: difficultyMode === option.value ? '#339933' : '#555',
                    border: difficultyMode === option.value ? '2px solid #339933' : '1px solid #ddd',
                    '&:hover': {
                      backgroundColor: '#f8f8f8',
                      border: difficultyMode === option.value ? '2px solid #339933' : '1px solid #ccc',
                    },
                  }}
                >
                  {option.label}
                </Button>
              </Tooltip>
            ))}
          </Box>
        </Box>

        {/* Start Button */}
        <Button
          variant="contained"
          size="large"
          onClick={handleStart}
          disabled={selectedCategories.length === 0}
          fullWidth
          sx={{
            py: 1.5,
            fontSize: '0.95rem',
            fontWeight: 600,
            textTransform: 'none',
            borderRadius: 1,
            backgroundColor: '#339933',
            '&:hover': {
              backgroundColor: '#2d8a2d',
            },
            '&:disabled': {
              backgroundColor: '#ccc',
            },
          }}
        >
          Start Quiz
        </Button>
      </Box>
    );
  }

  if (state === 'submitted' && result) {
    return (
      <>
        <Card className="quiz-card" sx={{ borderTop: `4px solid transparent`, borderImage: `${CATEGORY_GRADIENT} 1` }}>
          <CardContent className="quiz-result-card">
            <Typography variant="h4" sx={{ mb: 2 }}>
              Quiz Complete!
            </Typography>
            <Typography
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
            <div className="quiz-button-container" style={{ marginTop: '2rem' }}>
              <Button
                variant="contained"
                size="large"
                onClick={handleRestart}
                sx={{
                  ...quizStyles.startButton,
                  background: CATEGORY_GRADIENT,
                  '&:hover': {
                    background: CATEGORY_GRADIENT,
                    filter: 'brightness(1.1)',
                  },
                }}
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>

        <Typography variant="h6" className="quiz-review-header">
          Review Your Answers
        </Typography>
        {questions.map((question, index) => {
          const questionResult = result.results.find((r) => r.questionId === question.id);
          const isCorrect = questionResult?.isCorrect;

          return (
            <Paper
              key={question.id}
              elevation={0}
              className={`quiz-result-item ${isCorrect ? 'correct' : 'incorrect'}`}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="subtitle2">
                  Question {index + 1}
                </Typography>
                <Chip
                  label={question.category}
                  size="small"
                  sx={{
                    backgroundColor: getCategoryHexColor(question.category),
                    color: ['javascript', 'react'].includes(question.category) ? '#1a1a1a' : '#fff',
                    fontWeight: 600,
                  }}
                />
              </Box>
              <Box sx={{ mb: 2, fontWeight: 500 }}>
                {renderQuestion(question.question)}
              </Box>
              <Typography variant="body2">
                Your answer: <strong>{question.options[questionResult?.selectedIndex ?? 0]}</strong>
              </Typography>
              {!isCorrect && (
                <Typography
                  variant="body2"
                  color="success.main"
                  sx={{ mt: 0.75 }}
                >
                  Correct: <strong>{question.options[questionResult?.correctAnswer ?? 0]}</strong>
                </Typography>
              )}
              {questionResult?.explanation && (
                <Typography
                  variant="body2"
                  sx={{
                    mt: 1.5,
                    p: 1.5,
                    backgroundColor: `${getCategoryHexColor(question.category)}10`,
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
      </>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const allAnswered = questions.every((q) => answers[q.id] !== undefined);

  return (
    <>
      <Card className="quiz-card">
        <CardContent className="quiz-card-content">
          {/* Progress: question count and bar on the same line */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Typography variant="caption" sx={{ color: '#888', fontWeight: 500, whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
              {currentIndex + 1}/{questions.length}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                flex: 1,
                height: 6,
                borderRadius: 3,
                backgroundColor: 'rgba(0,0,0,0.08)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 3,
                  background: CATEGORY_GRADIENT,
                }
              }}
            />
            <Typography variant="caption" sx={{ color: '#888', fontWeight: 500, whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
              {Object.keys(answers).length} answered
            </Typography>
          </Box>

          {/* Category chip on the left, tags on the right */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
            <Chip
              label={currentQuestion.category}
              size="small"
              sx={{
                backgroundColor: getCategoryHexColor(currentQuestion.category),
                color: ['javascript', 'react'].includes(currentQuestion.category) ? '#1a1a1a' : '#fff',
                fontWeight: 600,
              }}
            />
            {currentQuestion.tags && currentQuestion.tags.length > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', ml: 'auto' }}>
                {currentQuestion.tags.map((tag, idx) => (
                  <Chip
                    key={idx}
                    label={`#${tag}`}
                    size="small"
                    variant="outlined"
                    sx={{
                      fontSize: '0.7rem',
                      height: '22px',
                      borderColor: 'rgba(0,0,0,0.15)',
                      color: 'text.secondary',
                    }}
                  />
                ))}
              </Box>
            )}
          </Box>

          <div className="quiz-question-text" style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
            <div style={{ flex: 1 }}>{renderQuestion(currentQuestion.question)}</div>
            {currentQuestion.introduction && (
              <ClickAwayListener onClickAway={() => setRevealedHints(prev => ({ ...prev, [currentQuestion.id]: false }))}>
                <div>
                  <Tooltip
                    title={currentQuestion.introduction}
                    open={!!revealedHints[currentQuestion.id]}
                    disableFocusListener
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
                      arrow: {
                        sx: { color: '#333' },
                      },
                    }}
                  >
                    <IconButton
                      size="small"
                      onClick={() => setRevealedHints(prev => ({ ...prev, [currentQuestion.id]: !prev[currentQuestion.id] }))}
                      sx={{
                        mt: '1px',
                        color: revealedHints[currentQuestion.id]
                          ? getCategoryHexColor(currentQuestion.category)
                          : 'text.disabled',
                        '&:hover': {
                          color: getCategoryHexColor(currentQuestion.category),
                        },
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                      </svg>
                    </IconButton>
                  </Tooltip>
                </div>
              </ClickAwayListener>
            )}
          </div>

          <Box
            onClick={() => {
              if (!revealedOptions[currentQuestion.id]) {
                setRevealedOptions(prev => ({ ...prev, [currentQuestion.id]: true }));
              }
            }}
            sx={{
              cursor: revealedOptions[currentQuestion.id] ? 'default' : 'pointer',
              filter: revealedOptions[currentQuestion.id] ? 'none' : 'blur(5px)',
              userSelect: revealedOptions[currentQuestion.id] ? 'auto' : 'none',
              transition: 'filter 0.3s ease',
              pointerEvents: 'auto',
            }}
          >
            <RadioGroup
              value={answers[currentQuestion.id] ?? ''}
              onChange={(e) => handleAnswer(currentQuestion.id, parseInt(e.target.value))}
              sx={{ pointerEvents: revealedOptions[currentQuestion.id] ? 'auto' : 'none' }}
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
          </Box>
        </CardContent>
      </Card>

      <div className="quiz-button-container">
        <Button
          variant="outlined"
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          sx={quizStyles.previousButton}
        >
          Previous
        </Button>
        {currentIndex === questions.length - 1 ? (
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!allAnswered}
            sx={quizStyles.submitButton}
          >
            Submit Quiz
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleNext}
            sx={quizStyles.nextButton}
          >
            Next
          </Button>
        )}
      </div>
    </>
  );
}

export default Quiz;
