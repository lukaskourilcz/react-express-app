import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Paper,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  type FlashCard,
  getDueCards,
  markCardCorrect,
  markCardWrong,
  useCards,
} from '../lib/cards';
import { renderQuestion } from './CodeBlock';
import { BRAND } from '../theme/MuiTheme';

const CATEGORY_COLORS: Record<string, string> = {
  html: '#e34c26',
  css: '#264de4',
  javascript: '#f7df1e',
  typescript: '#3178c6',
  react: '#61dafb',
  nodejs: '#339933',
  git: '#f05032',
  'dev-world': '#8b5cf6',
  custom: '#06b6d4',
  'code-snippets': '#ec4899',
};
const CATEGORY_LABELS: Record<string, string> = {
  html: 'HTML',
  css: 'CSS',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  react: 'React',
  nodejs: 'Node.js',
  git: 'Git',
  'dev-world': 'Dev World',
  custom: 'Custom',
  'code-snippets': 'Code Snippets',
};
const onCategoryColorText = (cat: string) =>
  ['javascript', 'react'].includes(cat) ? '#1a1a1a' : '#fff';

const DEFAULT_DRILL_SIZE = 10;

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function Drill() {
  const navigate = useNavigate();
  // Subscribe to keep the count in sync (some cards may graduate / be added).
  useCards();
  const [session, setSession] = useState<FlashCard[]>(() =>
    shuffle(getDueCards()).slice(0, DEFAULT_DRILL_SIZE),
  );
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  const card = session[index];
  const finished = index >= session.length;

  // If a card we already showed gets graduated by another tab, keep the
  // stable session order — we score against the locked-in session list.
  const totalDue = useMemo(() => getDueCards().length, [session]);

  const restart = () => {
    setSession(shuffle(getDueCards()).slice(0, DEFAULT_DRILL_SIZE));
    setIndex(0);
    setPicked(null);
    setSubmitted(false);
    setCorrectCount(0);
  };

  if (session.length === 0) {
    return (
      <Box sx={{ maxWidth: 560, mx: 'auto' }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 700, mb: 2 }}>
          Drill mode
        </Typography>
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: 'center',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
          }}
        >
          <Typography variant="h2" sx={{ mb: 1 }} aria-hidden>
            ✅
          </Typography>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Nothing due right now
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            All your cards are scheduled for later. Take a quiz to add new
            ones, or review the deck without grading via Cards.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center' }}>
            <Button variant="contained" onClick={() => navigate('/')}>
              Take a quiz
            </Button>
            <Button variant="outlined" onClick={() => navigate('/cards')}>
              Open Cards
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  }

  if (finished) {
    const pct = Math.round((correctCount / session.length) * 100);
    return (
      <Box sx={{ maxWidth: 560, mx: 'auto' }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 700, mb: 2 }}>
          Drill complete
        </Typography>
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: 'center',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
          }}
        >
          <Typography
            sx={{
              fontSize: 56,
              fontWeight: 700,
              color: BRAND.green,
              lineHeight: 1,
              mb: 1,
            }}
          >
            {pct}%
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {correctCount} of {session.length} correct
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3 }}>
            Cards are rescheduled based on your answers. Wrong cards come back
            in this session next time; correct ones will be due in 1 / 3 / 7 /
            14 / 30 days as you keep getting them right.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button variant="contained" onClick={restart} disabled={getDueCards().length === 0}>
              Drill again ({getDueCards().length} due)
            </Button>
            <Button variant="outlined" onClick={() => navigate('/cards')}>
              Self-review
            </Button>
            <Button variant="text" onClick={() => navigate('/')}>
              Home
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  }

  if (!card) return null;

  const submit = () => {
    if (picked === null) return;
    const isCorrect = picked === card.correctIndex;
    if (isCorrect) {
      markCardCorrect(card.id);
      setCorrectCount((n) => n + 1);
    } else {
      markCardWrong(card.id);
    }
    setSubmitted(true);
  };

  const next = () => {
    setPicked(null);
    setSubmitted(false);
    setIndex((i) => i + 1);
  };

  const color = CATEGORY_COLORS[card.category] ?? '#666';
  const progress = (index / session.length) * 100;

  return (
    <Box sx={{ maxWidth: 560, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography variant="h6" component="h1" sx={{ fontWeight: 700 }}>
          Drill mode
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {index + 1} / {session.length} · {totalDue} due
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: 4,
          borderRadius: 2,
          mb: 2,
          '& .MuiLinearProgress-bar': { backgroundColor: BRAND.green },
        }}
      />

      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Chip
              label={CATEGORY_LABELS[card.category] ?? card.category}
              size="small"
              sx={{
                backgroundColor: color,
                color: onCategoryColorText(card.category),
                fontWeight: 700,
                fontSize: '0.7rem',
              }}
            />
            <Box sx={{ flex: 1 }} />
            <Typography variant="caption" color="text.secondary">
              streak {card.rightStreak}/6
            </Typography>
          </Box>

          <Box sx={{ fontSize: '1rem', lineHeight: 1.5, mb: 2 }}>
            {renderQuestion(card.question)}
          </Box>

          {card.options.map((opt, i) => {
            const isCorrect = i === card.correctIndex;
            const isPicked = picked === i;
            const reveal = submitted;
            const showCorrect = reveal && isCorrect;
            const showWrong = reveal && isPicked && !isCorrect;

            return (
              <Box
                key={i}
                onClick={() => !submitted && setPicked(i)}
                role="button"
                tabIndex={submitted ? -1 : 0}
                onKeyDown={(e) => {
                  if (submitted) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setPicked(i);
                  }
                }}
                sx={{
                  p: 1.5,
                  mb: 1,
                  cursor: submitted ? 'default' : 'pointer',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: showCorrect
                    ? 'success.main'
                    : showWrong
                      ? 'error.main'
                      : isPicked
                        ? BRAND.green
                        : 'divider',
                  backgroundColor: showCorrect
                    ? 'rgba(22, 163, 74, 0.08)'
                    : showWrong
                      ? 'rgba(220, 38, 38, 0.08)'
                      : isPicked
                        ? `${BRAND.green}10`
                        : 'transparent',
                  fontWeight: showCorrect || isPicked ? 600 : 500,
                  fontSize: '0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Box sx={{ flex: 1 }}>{opt}</Box>
                {showCorrect && (
                  <Box aria-label="Correct answer" sx={{ color: 'success.main', fontWeight: 700 }}>
                    ✓
                  </Box>
                )}
                {showWrong && (
                  <Box aria-label="Your pick" sx={{ color: 'error.main', fontWeight: 700 }}>
                    ✗
                  </Box>
                )}
              </Box>
            );
          })}

          {submitted && card.explanation && (
            <Box
              sx={{
                mt: 1.5,
                p: 1.5,
                backgroundColor: `${color}1a`,
                borderRadius: 1,
                borderLeft: `4px solid ${color}`,
              }}
            >
              <Typography variant="body2">{card.explanation}</Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {!submitted ? (
        <Button
          fullWidth
          variant="contained"
          disabled={picked === null}
          onClick={submit}
          sx={{
            py: 1.25,
            backgroundColor: BRAND.green,
            '&:hover': { backgroundColor: BRAND.greenHover },
          }}
        >
          Lock in answer
        </Button>
      ) : (
        <Button
          fullWidth
          variant="contained"
          onClick={next}
          sx={{
            py: 1.25,
            backgroundColor: BRAND.green,
            '&:hover': { backgroundColor: BRAND.greenHover },
          }}
        >
          {index === session.length - 1 ? 'See results' : 'Next →'}
        </Button>
      )}
    </Box>
  );
}

export default Drill;
