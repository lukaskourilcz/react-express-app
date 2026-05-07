import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  LinearProgress,
  Paper,
  Snackbar,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  type FlashCard,
  markCardCorrect,
  markCardWrong,
  removeCard,
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

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function Cards() {
  const navigate = useNavigate();
  const cards = useCards();

  // Frozen review session: capture the deck on mount so cards graduating
  // mid-session don't reorder under us. Re-shuffled on demand.
  const [sessionIds, setSessionIds] = useState<string[]>(() => shuffle(cards.map((c) => c.id)));
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [snack, setSnack] = useState<string | null>(null);

  // Map current ids back to live cards (some may have been removed by other
  // tabs / sessions; we filter those out).
  const session: FlashCard[] = useMemo(() => {
    const byId = new Map(cards.map((c) => [c.id, c]));
    return sessionIds.map((id) => byId.get(id)).filter((c): c is FlashCard => !!c);
  }, [cards, sessionIds]);

  const card = session[index];
  const finished = index >= session.length;
  const progress = session.length === 0 ? 0 : (index / session.length) * 100;

  // If the deck shrinks under us (graduation), keep the current index valid.
  useEffect(() => {
    if (session.length > 0 && index > session.length - 1) {
      setIndex(session.length); // 'finished'
    }
  }, [session.length, index]);

  const advance = () => {
    setRevealed(false);
    setPicked(null);
    setIndex((i) => i + 1);
  };

  const handleGotIt = () => {
    if (!card) return;
    const { graduated } = markCardCorrect(card.id);
    setSnack(graduated ? 'Graduated! 🎓' : 'Marked correct');
    advance();
  };

  const handleNeedMore = () => {
    if (!card) return;
    markCardWrong(card.id);
    setSnack('Saved for next time');
    advance();
  };

  const handleRemove = () => {
    if (!card) return;
    removeCard(card.id);
    setSnack('Removed from deck');
    setSessionIds((ids) => ids.filter((id) => id !== card.id));
  };

  const handleRestart = () => {
    const ids = shuffle(cards.map((c) => c.id));
    setSessionIds(ids);
    setIndex(0);
    setRevealed(false);
    setPicked(null);
  };

  if (cards.length === 0) {
    return (
      <Box sx={{ maxWidth: 560, mx: 'auto' }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 700, mb: 2 }}>
          Memory cards
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
            🎉
          </Typography>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Nothing to review
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Questions you answer incorrectly are added here automatically. Keep taking quizzes — each
            wrong answer becomes a card you can drill until you've got it down.
          </Typography>
          <Button variant="contained" onClick={() => navigate('/')}>
            Take a quiz
          </Button>
        </Paper>
      </Box>
    );
  }

  if (finished) {
    return (
      <Box sx={{ maxWidth: 560, mx: 'auto' }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 700, mb: 2 }}>
          Session complete
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
            👏
          </Typography>
          <Typography variant="body1" sx={{ mb: 1 }}>
            You reviewed {sessionIds.length} card{sessionIds.length === 1 ? '' : 's'}.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {cards.length} still in your deck. Cards graduate after two correct recalls in a row.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button variant="contained" onClick={handleRestart} disabled={cards.length === 0}>
              Review again
            </Button>
            <Button variant="outlined" onClick={() => navigate('/')}>
              Back home
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  }

  if (!card) return null;

  const color = CATEGORY_COLORS[card.category] ?? '#666';

  return (
    <Box sx={{ maxWidth: 560, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography variant="h6" component="h1" sx={{ fontWeight: 700 }}>
          Memory cards
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {index + 1} / {session.length} · {cards.length} in deck
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{ height: 4, borderRadius: 2, mb: 2, '& .MuiLinearProgress-bar': { backgroundColor: BRAND.green } }}
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
              ✓ streak {card.rightStreak}/2 · ✗ {card.wrongCount}
            </Typography>
            <IconButton
              size="small"
              onClick={handleRemove}
              aria-label="Remove from deck"
              sx={{ color: 'text.secondary' }}
            >
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
              </svg>
            </IconButton>
          </Box>

          <Box sx={{ fontSize: '1rem', lineHeight: 1.5, mb: 2 }}>
            {renderQuestion(card.question)}
          </Box>

          {!revealed ? (
            <Button
              fullWidth
              variant="contained"
              onClick={() => setRevealed(true)}
              sx={{
                py: 1.25,
                backgroundColor: BRAND.green,
                '&:hover': { backgroundColor: BRAND.greenHover },
              }}
            >
              Reveal answer
            </Button>
          ) : (
            <Box>
              {card.options.map((opt, i) => {
                const isCorrect = i === card.correctIndex;
                const isPicked = picked === i;
                const showWrong = isPicked && !isCorrect;
                return (
                  <Box
                    key={i}
                    onClick={() => setPicked(i)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setPicked(i);
                      }
                    }}
                    sx={{
                      p: 1.5,
                      mb: 1,
                      cursor: 'pointer',
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: isCorrect
                        ? 'success.main'
                        : showWrong
                          ? 'error.main'
                          : isPicked
                            ? BRAND.green
                            : 'divider',
                      backgroundColor: isCorrect
                        ? 'rgba(22, 163, 74, 0.08)'
                        : showWrong
                          ? 'rgba(220, 38, 38, 0.08)'
                          : 'transparent',
                      fontWeight: isCorrect ? 600 : 500,
                      fontSize: '0.95rem',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ flex: 1 }}>{opt}</Box>
                      {isCorrect && <Box aria-label="Correct answer" sx={{ color: 'success.main' }}>✓</Box>}
                      {showWrong && <Box aria-label="Your pick" sx={{ color: 'error.main' }}>✗</Box>}
                    </Box>
                  </Box>
                );
              })}
              {card.explanation && (
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
            </Box>
          )}
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', gap: 1.5 }}>
        <Button
          fullWidth
          variant="outlined"
          color="error"
          onClick={handleNeedMore}
          disabled={!revealed}
          sx={{ py: 1.25, textTransform: 'none' }}
        >
          Need more practice
        </Button>
        <Button
          fullWidth
          variant="contained"
          onClick={handleGotIt}
          disabled={!revealed}
          sx={{
            py: 1.25,
            textTransform: 'none',
            backgroundColor: BRAND.green,
            '&:hover': { backgroundColor: BRAND.greenHover },
          }}
        >
          Got it
        </Button>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
        Tip: two correct recalls in a row graduates a card.
      </Typography>

      <Snackbar
        open={!!snack}
        autoHideDuration={1800}
        onClose={() => setSnack(null)}
        message={snack ?? ''}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}

export default Cards;
