import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, Button, CircularProgress, Alert, Chip, IconButton, Tooltip } from '@mui/material';
import { useAuth } from '../lib/auth';
import { useT } from '../i18n/LanguageContext';
import { listFlashcards, removeFlashcard, type Flashcard } from '../lib/flashcards';
import { friendlyError } from '../lib/api';
import { renderQuestion } from './CodeBlock';
import { BRAND } from '../theme/MuiTheme';

const TrashIcon = () => (
  <svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

function Flashcards() {
  const t = useT();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, signInWithGoogle } = useAuth();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    listFlashcards()
      .then((c) => {
        if (cancelled) return;
        setCards(c);
        setIndex(0);
        setRevealed(false);
      })
      .catch((e) => !cancelled && setError(friendlyError(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, authLoading, reloadKey]);

  // Reset the reveal whenever the visible card changes.
  useEffect(() => {
    setRevealed(false);
  }, [index]);

  if (authLoading || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }} role="status" aria-live="polite">
        <CircularProgress sx={{ color: BRAND.green }} />
        <span style={{ position: 'absolute', left: -9999 }}>{t('card.loading')}</span>
      </Box>
    );
  }

  if (!isAuthenticated) {
    return (
      <Paper elevation={0} sx={{ p: 4, maxWidth: 520, mx: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 2, textAlign: 'center' }}>
        <Typography variant="h6" sx={{ mb: 1 }}>{t('card.signInTitle')}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>{t('card.signInBody')}</Typography>
        <Button variant="contained" onClick={() => signInWithGoogle().catch(() => {})} sx={{ backgroundColor: BRAND.green, '&:hover': { backgroundColor: BRAND.greenHover } }}>
          {t('auth.logIn')}
        </Button>
      </Paper>
    );
  }

  if (error) {
    return (
      <Alert severity="error" role="alert" sx={{ maxWidth: 520, mx: 'auto' }} action={<Button color="inherit" size="small" onClick={() => setReloadKey((k) => k + 1)}>{t('quiz.retry')}</Button>}>
        {error}
      </Alert>
    );
  }

  if (cards.length === 0) {
    return (
      <Paper elevation={0} sx={{ p: 4, maxWidth: 520, mx: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 2, textAlign: 'center' }}>
        <Typography variant="h6" sx={{ mb: 1 }}>{t('card.emptyTitle')}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>{t('card.emptyHint')}</Typography>
        <Button variant="contained" onClick={() => navigate('/')} sx={{ backgroundColor: BRAND.green, '&:hover': { backgroundColor: BRAND.greenHover } }}>
          {t('card.goToQuiz')}
        </Button>
      </Paper>
    );
  }

  const card = cards[index];

  const handleRemove = async () => {
    const qid = card.question_id;
    const prev = cards;
    const next = cards.filter((c) => c.question_id !== qid);
    setCards(next);
    setIndex((i) => Math.max(0, Math.min(i, next.length - 1)));
    try {
      await removeFlashcard(qid);
    } catch {
      setCards(prev); // rollback on failure
      setError(t('card.removeFailed'));
    }
  };

  const go = (delta: number) => setIndex((i) => (i + delta + cards.length) % cards.length);

  return (
    <Box sx={{ maxWidth: 640, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>{t('card.heading')}</Typography>
          <Typography variant="body2" color="text.secondary">{t('card.subtitle')}</Typography>
        </Box>
        <Chip label={t('card.counter', { current: index + 1, total: cards.length })} sx={{ fontWeight: 700 }} />
      </Box>

      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderTop: `4px solid ${BRAND.green}`, borderRadius: 2, minHeight: 240, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          {card.category ? (
            <Chip size="small" label={card.category} sx={{ fontWeight: 600 }} />
          ) : <span />}
          <Tooltip title={t('card.remove')} arrow placement="top">
            <IconButton size="small" aria-label={t('card.remove')} onClick={handleRemove} sx={{ color: 'text.secondary' }}>
              <TrashIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ fontWeight: 500, mb: 2 }}>{renderQuestion(card.question)}</Box>

        <Box sx={{ mt: 'auto' }}>
          {!revealed ? (
            <Button
              fullWidth
              variant="contained"
              onClick={() => setRevealed(true)}
              sx={{ py: 1.25, fontWeight: 600, backgroundColor: BRAND.green, '&:hover': { backgroundColor: BRAND.greenHover } }}
            >
              {t('card.reveal')}
            </Button>
          ) : (
            <Box>
              <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>{t('card.answerLabel')}</Typography>
              <Box sx={{ p: 1.5, borderRadius: 1, backgroundColor: 'rgba(45,122,45,0.1)', borderLeft: `4px solid ${BRAND.green}`, fontWeight: 600 }}>
                {card.correct_answer}
              </Box>
              {card.explanation && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>{card.explanation}</Typography>
              )}
            </Box>
          )}
        </Box>
      </Paper>

      <Box sx={{ display: 'flex', gap: 1.5, mt: 2 }}>
        <Button variant="outlined" onClick={() => go(-1)} disabled={cards.length < 2} sx={{ flex: 1 }}>
          {t('card.prev')}
        </Button>
        <Button variant="outlined" onClick={() => go(1)} disabled={cards.length < 2} sx={{ flex: 1 }}>
          {t('card.next')}
        </Button>
      </Box>
    </Box>
  );
}

export default Flashcards;
