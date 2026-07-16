// Flashcard study view. Bookmarked questions become a flip-through deck: reveal
// the answer, step forward/back, or remove a card from the deck.
//
// Redesigned on the Astryx design system — Astryx Card/Button/Badge/typography
// and layout primitives, with the reveal ("flip") and bookmark logic preserved.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import { Card } from '@astryxdesign/core/Card';
import { Button } from '@astryxdesign/core/Button';
import { useAuth } from '../lib/auth';
import { useActiveSubject } from '../lib/subjects';
import { useT } from '../i18n/LanguageContext';
import { removeFlashcard, type Flashcard } from '../lib/flashcards';
import { friendlyError } from '../lib/api';
import { useFlashcards } from '../lib/queries';
import { queryClient } from '../lib/queryClient';
import { renderQuestion } from './CodeBlock';
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
  const accent = useActiveSubject().accent;
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
      <div className="ss-lift ss-pop" style={{ display: 'flex', width: '100%', maxWidth: 520, margin: '0 auto' }}>
      <Card variant="default" padding={6} width="100%">
        <VStack gap={2} align="center">
          <div aria-hidden className="ss-float" style={{ fontSize: '2.6rem', lineHeight: 1 }}>🦈</div>
          <Heading level={2} justify="center">{t('card.signInTitle')}</Heading>
          <Text type="body" color="secondary" justify="center">{t('card.signInBody')}</Text>
          <div style={{ marginTop: '0.5rem' }}>
            <Button variant="primary" label={t('auth.logIn')} onClick={() => signInWithGoogle().catch(() => {})} />
          </div>
        </VStack>
      </Card>
      </div>
    );
  }

  if (error) {
    return <ErrorRetry message={error} onRetry={reload} sx={{ maxWidth: 520, mx: 'auto' }} />;
  }

  if (cards.length === 0) {
    return (
      <div className="ss-lift ss-pop" style={{ display: 'flex', width: '100%', maxWidth: 520, margin: '0 auto' }}>
      <Card variant="default" padding={6} width="100%">
        <VStack gap={2} align="center">
          <div aria-hidden className="ss-float" style={{ fontSize: '3rem', lineHeight: 1 }}>🔖</div>
          <Heading level={2} justify="center">{t('card.emptyTitle')}</Heading>
          <Text type="body" color="secondary" justify="center">{t('card.emptyHint')}</Text>
          <div style={{ marginTop: '0.5rem' }}>
            <Button variant="primary" label={t('card.goToQuiz')} onClick={() => navigate('/quiz')} />
          </div>
        </VStack>
      </Card>
      </div>
    );
  }

  const card = cards[index];

  const handleRemove = () => {
    setActionError(null);
    removeMut.mutate(card.question_id);
  };

  const go = (delta: number) => setIndex((i) => (i + delta + cards.length) % cards.length);

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', width: '100%' }}>
      <VStack gap={3} width="100%">
        <HStack justify="between" align="center" gap={2} width="100%">
          <HStack gap={1.5} align="center">
            <div
              aria-hidden
              className="ss-emoji-tile ss-float"
              style={{
                width: 46,
                height: 46,
                fontSize: '1.5rem',
                flexShrink: 0,
                background: `linear-gradient(135deg, ${accent}2b, ${accent}12)`,
                boxShadow: `inset 0 0 0 1.5px ${accent}44, 0 6px 16px ${accent}22`,
              }}
            >
              🃏
            </div>
            <VStack gap={0.5}>
              <Heading level={1}>{t('card.heading')}</Heading>
              <Text type="supporting" color="secondary">{t('card.subtitle')}</Text>
            </VStack>
          </HStack>
          <div
            style={{
              flexShrink: 0,
              alignSelf: 'flex-start',
              borderRadius: 999,
              padding: '4px 12px',
              fontWeight: 700,
              fontSize: '0.78rem',
              color: accent,
              background: `${accent}14`,
              whiteSpace: 'nowrap',
            }}
          >
            {t('card.counter', { current: index + 1, total: cards.length })}
          </div>
        </HStack>

        {/* The study card. A tinted top rule carries the subject accent. */}
        <div className="ss-lift ss-pop" style={{ display: 'flex', width: '100%' }}>
        <Card variant="default" padding={5} width="100%" minHeight={260}>
          <div
            aria-hidden
            style={{
              height: 4,
              borderRadius: 999,
              background: 'var(--brand-accent)',
              margin: '-4px 0 20px',
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 200 }}>
            <HStack justify="between" align="center" gap={1} width="100%">
              {card.category ? <Badge variant="cyan" label={card.category} /> : <span />}
              <Button
                variant="ghost"
                size="sm"
                isIconOnly
                icon={<TrashIcon />}
                label={t('card.remove')}
                tooltip={t('card.remove')}
                onClick={handleRemove}
              />
            </HStack>

            <div style={{ fontWeight: 500, margin: '16px 0 20px' }}>{renderQuestion(card.question)}</div>

            <div style={{ marginTop: 'auto' }}>
              {!revealed ? (
                <Button
                  variant="primary"
                  size="lg"
                  label={t('card.reveal')}
                  onClick={() => setRevealed(true)}
                />
              ) : (
                <VStack gap={1.5} width="100%">
                  <HStack gap={1} align="center">
                    <span aria-hidden style={{ fontSize: '1.1rem', lineHeight: 1 }}>💡</span>
                    <Text type="label" color="secondary">{t('card.answerLabel')}</Text>
                  </HStack>
                  <div
                    className="ss-pop"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '14px 16px',
                      borderRadius: 12,
                      background: 'color-mix(in srgb, var(--brand-accent) 12%, transparent)',
                      borderLeft: '4px solid var(--brand-accent)',
                      fontWeight: 600,
                    }}
                  >
                    <span aria-hidden style={{ fontSize: '1.15rem', lineHeight: 1, flexShrink: 0 }}>✅</span>
                    <span>{card.correct_answer}</span>
                  </div>
                  {card.explanation && (
                    <Text type="body" color="secondary">{card.explanation}</Text>
                  )}
                </VStack>
              )}
            </div>
          </div>
        </Card>
        </div>

        <HStack gap={1.5} width="100%">
          <div style={{ flex: 1 }}>
            <Button variant="secondary" label={t('card.prev')} onClick={() => go(-1)} isDisabled={cards.length < 2} />
          </div>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="secondary" label={t('card.next')} onClick={() => go(1)} isDisabled={cards.length < 2} />
          </div>
        </HStack>
      </VStack>
    </div>
  );
}

export default Flashcards;
