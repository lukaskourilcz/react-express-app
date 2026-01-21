import { useState } from 'react';
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
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import type { Question, QuizResult, QuizState, DifficultyMode } from '../types/quiz';
import { quizStyles } from '../theme/MuiTheme';
import './Quiz.css';

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'react':
      return 'primary';
    case 'typescript':
      return 'secondary';
    case 'git':
      return 'warning';
    case 'javascript':
      return 'success';
    default:
      return 'default';
  }
};

// Render question text with code blocks
const renderQuestion = (text: string) => {
  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts.map((part, index) => {
    if (part.startsWith('```')) {
      const code = part.replace(/```\w*\n?/, '').replace(/```$/, '');
      return (
        <pre key={index} className="quiz-code-block">
          <code>{code}</code>
        </pre>
      );
    }
    return <span key={index}>{part}</span>;
  });
};

const QUESTION_COUNT_OPTIONS = [10, 20, 30, 40, 50];

const DIFFICULTY_OPTIONS: { value: DifficultyMode; label: string; description: string }[] = [
  { value: 'terminology', label: 'Terminology', description: 'Basic terms only' },
  { value: 'easy', label: 'Easy', description: 'Difficulty 1-2' },
  { value: 'advanced', label: 'Advanced', description: 'Difficulty 3-5' },
  { value: 'zero-to-hero', label: 'Zero to Hero', description: '1→5 progressive' },
];

function Quiz() {
  const [state, setState] = useState<QuizState>('ready');
  const [sessionId, setSessionId] = useState<string>('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [difficultyMode, setDifficultyMode] = useState<DifficultyMode>('zero-to-hero');

  const fetchQuestions = async (count: number, difficulty: DifficultyMode) => {
    try {
      setState('loading');
      const response = await fetch(`/api/quiz/questions?count=${count}&difficulty=${difficulty}`);
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
    setCurrentIndex(0);
    setAnswers({});
    setResult(null);
    fetchQuestions(questionCount, difficultyMode);
  };

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
            <LinearProgress sx={{ backgroundColor: 'primary.light' }} />
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
            action={<Button onClick={() => fetchQuestions(questionCount, difficultyMode)} color="inherit">Retry</Button>}
          >
            {error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (state === 'ready') {
    return (
      <Card className="quiz-card">
        <CardContent className="quiz-start-card">
          <Typography
            variant="h4"
            sx={{
              mb: 1,
              fontWeight: 600,
              color: '#1a202c',
            }}
          >
            Ready to test your knowledge?
          </Typography>
          <Typography
            variant="body2"
            sx={{
              mb: 3,
              color: 'text.secondary',
              fontSize: '0.9rem',
            }}
          >
            300 questions across 4 categories
          </Typography>

          <Box sx={{
            display: 'flex',
            justifyContent: 'center',
            gap: 1,
            flexWrap: 'wrap',
            mb: 3.5,
          }}>
            <Chip label="React" color="primary" size="small" />
            <Chip label="TypeScript" color="secondary" size="small" />
            <Chip label="JavaScript" color="success" size="small" />
            <Chip label="Git" color="warning" size="small" />
          </Box>

          <Box sx={{
            backgroundColor: 'rgba(0,0,0,0.02)',
            borderRadius: 2,
            p: 2.5,
            mb: 3,
          }}>
            <Typography
              variant="body2"
              sx={{
                mb: 1.5,
                color: 'text.secondary',
                fontWeight: 500,
                fontSize: '0.8rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Number of questions
            </Typography>
            <ToggleButtonGroup
              value={questionCount}
              exclusive
              onChange={(_, value) => value && setQuestionCount(value)}
              sx={{
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              {QUESTION_COUNT_OPTIONS.map((count) => (
                <ToggleButton
                  key={count}
                  value={count}
                  sx={{
                    px: { xs: 2, sm: 2.5 },
                    py: 1,
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    border: '1px solid rgba(0,0,0,0.12)',
                    '&.Mui-selected': {
                      backgroundColor: 'primary.main',
                      color: 'white',
                      borderColor: 'primary.main',
                      '&:hover': {
                        backgroundColor: 'primary.dark',
                      },
                    },
                  }}
                >
                  {count}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          <Box sx={{
            backgroundColor: 'rgba(0,0,0,0.02)',
            borderRadius: 2,
            p: 2.5,
            mb: 3,
          }}>
            <Typography
              variant="body2"
              sx={{
                mb: 1.5,
                color: 'text.secondary',
                fontWeight: 500,
                fontSize: '0.8rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Difficulty Level
            </Typography>
            <ToggleButtonGroup
              value={difficultyMode}
              exclusive
              onChange={(_, value) => value && setDifficultyMode(value)}
              sx={{
                display: 'flex',
                justifyContent: 'center',
                flexWrap: 'wrap',
                gap: 0.5,
              }}
            >
              {DIFFICULTY_OPTIONS.map((option) => (
                <ToggleButton
                  key={option.value}
                  value={option.value}
                  sx={{
                    px: { xs: 1.5, sm: 2 },
                    py: 1,
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    border: '1px solid rgba(0,0,0,0.12)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.25,
                    '&.Mui-selected': {
                      backgroundColor: 'primary.main',
                      color: 'white',
                      borderColor: 'primary.main',
                      '&:hover': {
                        backgroundColor: 'primary.dark',
                      },
                    },
                  }}
                >
                  <span style={{ color: 'inherit' }}>{option.label}</span>
                  <Typography
                    component="span"
                    sx={{
                      fontSize: '0.65rem',
                      opacity: 0.85,
                      fontWeight: 400,
                      color: 'inherit',
                    }}
                  >
                    {option.description}
                  </Typography>
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          <Button
            variant="contained"
            size="large"
            onClick={handleStart}
            fullWidth
            sx={{
              ...quizStyles.startButton,
              py: 1.5,
              fontSize: '1rem',
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: 2,
            }}
          >
            Start Quiz
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (state === 'submitted' && result) {
    return (
      <>
        <Card className="quiz-card">
          <CardContent className="quiz-result-card">
            <Typography variant="h4" sx={{ mb: 2 }}>
              Quiz Complete!
            </Typography>
            <Typography className="quiz-score-text">{result.percentage}%</Typography>
            <Typography variant="h6" sx={{ mt: 1 }}>
              {result.correctAnswers} out of {result.totalQuestions} correct
            </Typography>
            <div className="quiz-button-container" style={{ marginTop: '2rem' }}>
              <Button
                variant="contained"
                size="large"
                onClick={handleRestart}
                sx={quizStyles.startButton}
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
                  color={getCategoryColor(question.category) as any}
                />
              </Box>
              <Box sx={{ mb: 2, fontWeight: 500 }}>
                {renderQuestion(question.question)}
              </Box>
              <Typography variant="body2">
                Your answer: <strong>{question.options[questionResult?.selectedIndex ?? 0]}</strong>
              </Typography>
              {!isCorrect && (
                <Typography variant="body2" color="success.main" sx={{ mt: 0.75 }}>
                  Correct: <strong>{question.options[questionResult?.correctAnswer ?? 0]}</strong>
                </Typography>
              )}
              {questionResult?.explanation && (
                <Typography
                  variant="body2"
                  sx={{
                    mt: 1.5,
                    p: 1.5,
                    backgroundColor: 'rgba(0,0,0,0.04)',
                    borderRadius: 1,
                    borderLeft: '3px solid',
                    borderLeftColor: 'primary.main',
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
      <div className="quiz-progress-container">
        <div className="quiz-progress-text">
          <span>Question {currentIndex + 1} of {questions.length}</span>
          <span>{Object.keys(answers).length} answered</span>
        </div>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 6,
            borderRadius: 3,
            backgroundColor: 'rgba(255,255,255,0.3)',
            '& .MuiLinearProgress-bar': {
              borderRadius: 3,
              backgroundColor: '#ffffff',
            }
          }}
        />
      </div>

      <Card className="quiz-card">
        <CardContent className="quiz-card-content">
          <div className="quiz-question-header">
            <span className="quiz-question-number">
              Question {currentIndex + 1}
            </span>
            <Chip
              label={currentQuestion.category}
              size="small"
              color={getCategoryColor(currentQuestion.category) as any}
            />
          </div>

          {currentQuestion.tags && currentQuestion.tags.length > 0 && (
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1.5 }}>
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

          {currentQuestion.introduction && (
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                mb: 2,
                p: 1.5,
                backgroundColor: 'rgba(90, 103, 216, 0.08)',
                borderRadius: 1,
                borderLeft: '3px solid',
                borderLeftColor: 'primary.main',
                fontSize: '0.85rem',
                lineHeight: 1.6,
              }}
            >
              {currentQuestion.introduction}
            </Typography>
          )}

          <div className="quiz-question-text">
            {renderQuestion(currentQuestion.question)}
          </div>

          <RadioGroup
            value={answers[currentQuestion.id] ?? ''}
            onChange={(e) => handleAnswer(currentQuestion.id, parseInt(e.target.value))}
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
