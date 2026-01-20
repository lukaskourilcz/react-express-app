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
} from '@mui/material';
import * as stylex from '@stylexjs/stylex';
import type { Question, QuizResult, QuizState } from '../types/quiz';
import { quizStyles } from '../theme/MuiTheme';
import './Quiz.css';

// StyleX styles - testing alongside MUI
const styles = stylex.create({
  // Animated gradient header
  gradientHeader: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '0.75rem 1.25rem',
    borderRadius: '12px',
    marginBottom: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
  },
  headerTitle: {
    color: 'white',
    fontSize: '0.9rem',
    fontWeight: 600,
    letterSpacing: '0.02em',
  },
  // Streak counter badge
  streakBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: '0.35rem 0.75rem',
    borderRadius: '20px',
    backdropFilter: 'blur(10px)',
  },
  streakIcon: {
    fontSize: '1rem',
  },
  streakText: {
    color: 'white',
    fontSize: '0.8rem',
    fontWeight: 600,
  },
  // Score display for results
  scoreCircle: {
    width: '140px',
    height: '140px',
    borderRadius: '50%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1.5rem',
    position: 'relative',
  },
  scoreCircleGood: {
    background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    boxShadow: '0 8px 32px rgba(17, 153, 142, 0.4)',
  },
  scoreCircleMedium: {
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    boxShadow: '0 8px 32px rgba(245, 87, 108, 0.4)',
  },
  scoreCircleLow: {
    background: 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)',
    boxShadow: '0 8px 32px rgba(235, 51, 73, 0.4)',
  },
  scoreValue: {
    color: 'white',
    fontSize: '2.5rem',
    fontWeight: 700,
    lineHeight: 1,
  },
  scoreLabel: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: '0.75rem',
    fontWeight: 500,
    marginTop: '0.25rem',
  },
  // Stat cards
  statsContainer: {
    display: 'flex',
    gap: '0.75rem',
    marginBottom: '1.5rem',
    justifyContent: 'center',
  },
  statCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '10px',
    padding: '0.75rem 1.25rem',
    textAlign: 'center',
    minWidth: '80px',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
  },
  statValue: {
    color: 'white',
    fontSize: '1.5rem',
    fontWeight: 700,
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '0.7rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginTop: '0.25rem',
  },
  // Question indicator dots
  dotsContainer: {
    display: 'flex',
    gap: '0.35rem',
    justifyContent: 'center',
    marginBottom: '1rem',
    flexWrap: 'wrap',
    maxWidth: '200px',
    margin: '0 auto 1rem',
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    transition: 'all 0.2s ease',
  },
  dotUnanswered: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  dotAnswered: {
    backgroundColor: '#10b981',
  },
  dotCurrent: {
    backgroundColor: '#ffffff',
    transform: 'scale(1.3)',
    boxShadow: '0 0 8px rgba(255, 255, 255, 0.6)',
  },
  // Category tag with icon
  categoryTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.3rem',
    padding: '0.3rem 0.6rem',
    borderRadius: '6px',
    fontSize: '0.7rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  },
  categoryReact: {
    backgroundColor: '#61dafb20',
    color: '#61dafb',
  },
  categoryTypescript: {
    backgroundColor: '#3178c620',
    color: '#3178c6',
  },
  categoryGit: {
    backgroundColor: '#f0503220',
    color: '#f05032',
  },
  categoryJavascript: {
    backgroundColor: '#f7df1e20',
    color: '#f7df1e',
  },
});

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

function Quiz() {
  const [state, setState] = useState<QuizState>('loading');
  const [sessionId, setSessionId] = useState<string>('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      setState('loading');
      const response = await fetch('/api/quiz/questions');
      if (!response.ok) throw new Error('Failed to fetch questions');
      const data = await response.json();
      setSessionId(data.sessionId);
      setQuestions(data.questions);
      setState('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setState('error');
    }
  };

  const handleStart = () => {
    setState('in-progress');
    setCurrentIndex(0);
    setAnswers({});
    setResult(null);
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
    fetchQuestions();
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
            action={<Button onClick={fetchQuestions} color="inherit">Retry</Button>}
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
          <Typography variant="h4" sx={{ mb: 2 }}>
            Ready to test your knowledge?
          </Typography>
          <Typography variant="body1" sx={{ mb: 4 }}>
            {questions.length} questions about React, TypeScript, JavaScript, and Git
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={handleStart}
            sx={quizStyles.startButton}
          >
            Start Quiz
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (state === 'submitted' && result) {
    // Determine score circle style based on percentage
    const getScoreStyle = () => {
      if (result.percentage >= 70) return styles.scoreCircleGood;
      if (result.percentage >= 40) return styles.scoreCircleMedium;
      return styles.scoreCircleLow;
    };

    return (
      <>
        <Card className="quiz-card">
          <CardContent className="quiz-result-card">
            <Typography variant="h4" sx={{ mb: 3 }}>
              Quiz Complete!
            </Typography>

            {/* StyleX: Animated score circle */}
            <div {...stylex.props(styles.scoreCircle, getScoreStyle())}>
              <span {...stylex.props(styles.scoreValue)}>{result.percentage}%</span>
              <span {...stylex.props(styles.scoreLabel)}>Score</span>
            </div>

            {/* StyleX: Stats cards */}
            <div {...stylex.props(styles.statsContainer)}>
              <div {...stylex.props(styles.statCard)}>
                <div {...stylex.props(styles.statValue)}>{result.correctAnswers}</div>
                <div {...stylex.props(styles.statLabel)}>Correct</div>
              </div>
              <div {...stylex.props(styles.statCard)}>
                <div {...stylex.props(styles.statValue)}>{result.totalQuestions - result.correctAnswers}</div>
                <div {...stylex.props(styles.statLabel)}>Wrong</div>
              </div>
              <div {...stylex.props(styles.statCard)}>
                <div {...stylex.props(styles.statValue)}>{result.totalQuestions}</div>
                <div {...stylex.props(styles.statLabel)}>Total</div>
              </div>
            </div>

            <div className="quiz-button-container" style={{ marginTop: '1rem' }}>
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

  // Get category style for StyleX
  const getCategoryStyle = (category: string) => {
    switch (category) {
      case 'react': return styles.categoryReact;
      case 'typescript': return styles.categoryTypescript;
      case 'git': return styles.categoryGit;
      case 'javascript': return styles.categoryJavascript;
      default: return styles.categoryReact;
    }
  };

  return (
    <>
      {/* StyleX: Gradient header with streak counter */}
      <div {...stylex.props(styles.gradientHeader)}>
        <span {...stylex.props(styles.headerTitle)}>Developer Quiz</span>
        <div {...stylex.props(styles.streakBadge)}>
          <span {...stylex.props(styles.streakIcon)}>🔥</span>
          <span {...stylex.props(styles.streakText)}>{Object.keys(answers).length}/{questions.length}</span>
        </div>
      </div>

      {/* StyleX: Question indicator dots */}
      <div {...stylex.props(styles.dotsContainer)}>
        {questions.map((q, i) => (
          <div
            key={q.id}
            {...stylex.props(
              styles.dot,
              i === currentIndex
                ? styles.dotCurrent
                : answers[q.id] !== undefined
                  ? styles.dotAnswered
                  : styles.dotUnanswered
            )}
          />
        ))}
      </div>

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
            {/* StyleX: Custom category tag */}
            <span {...stylex.props(styles.categoryTag, getCategoryStyle(currentQuestion.category))}>
              {currentQuestion.category}
            </span>
          </div>

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
