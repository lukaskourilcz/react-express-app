import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Box, Paper, Typography, Button, Chip, IconButton, Tooltip } from '@mui/material';
import { useAuth } from '../lib/auth';
import { useT } from '../i18n/LanguageContext';
import { removeFlashcard, type Flashcard } from '../lib/flashcards';
import { friendlyError } from '../lib/api';
import { useFlashcards } from '../lib/queries';
import { queryClient } from '../lib/queryClient';
import { renderQuestion } from './CodeBlock';
import { BRAND, brandButtonSx } from '../theme/MuiTheme';
import LoadingScreen from './LoadingScreen';
import ErrorRetry from './ErrorRetry';

const FLASHCARDS_KEY = ['flashcards'] as const;

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
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const enabled = !authLoading && isAuthenticated;
  const cardsQuery = useFlashcards(enabled);
  const cards = cardsQuery.data ?? [];
  const loading = authLoading || (enabled && cardsQuery.isPending);
  const error = actionError ?? (cardsQuery.error ? friendlyError(cardsQuery.error) : null);
  const reload = () => {
    setActionError(null);
    void cardsQuery.refetch();
  };

  // Remove a card with an optimistic cache update, rolling back on failure.
  const removeMut = useMutation({
    mutationFn: removeFlashcard,
    onMutate: async (qid: string) => {
      await queryClient.cancelQueries({ queryKey: FLASHCARDS_KEY });
      const prev = queryClient.getQueryData<Flashcard[]>(FLASHCARDS_KEY);
      queryClient.setQueryData<Flashcard[]>(FLASHCARDS_KEY, (old) =>
        (old ?? []).filter((c) => c.question_id !== qid),
      );
      return { prev };
    },
    onError: (_err, _qid, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(FLASHCARDS_KEY, ctx.prev);
      setActionError(t('card.removeFailed'));
    },
  });

  // Keep the visible index in range as the deck shrinks, and reset the reveal
  // whenever the visible card changes.
  useEffect(() => {
    setIndex((i) => Math.min(i, Math.max(0, cards.length - 1)));
  }, [cards.length]);
  useEffect(() => {
    setRevealed(false);
  }, [index]);

  if (authLoading || loading) {
    return <LoadingScreen label={t('card.loading')} />;
  }

  if (!isAuthenticated) {
    return (
      <Paper elevation={0} sx={{ p: 4, maxWidth: 520, mx: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 2, textAlign: 'center' }}>
        <Typography variant="h6" sx={{ mb: 1 }}>{t('card.signInTitle')}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>{t('card.signInBody')}</Typography>
        <Button variant="contained" onClick={() => signInWithGoogle().catch(() => {})} sx={brandButtonSx}>
          {t('auth.logIn')}
        </Button>
      </Paper>
    );
  }

  if (error) {
    return <ErrorRetry message={error} onRetry={reload} sx={{ maxWidth: 520, mx: 'auto' }} />;
  }

  if (cards.length === 0) {
    return (
      <Paper elevation={0} sx={{ p: 4, maxWidth: 520, mx: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 2, textAlign: 'center' }}>
        <Typography variant="h6" sx={{ mb: 1 }}>{t('card.emptyTitle')}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>{t('card.emptyHint')}</Typography>
        <Button variant="contained" onClick={() => navigate('/quiz')} sx={brandButtonSx}>
          {t('card.goToQuiz')}
        </Button>
      </Paper>
    );
  }

  const card = cards[index];

  const handleRemove = () => {
    setActionError(null);
    removeMut.mutate(card.question_id);
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
              sx={{ py: 1.25, fontWeight: 600, ...brandButtonSx }}
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
