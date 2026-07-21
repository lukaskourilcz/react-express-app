// Flashcard study view. Bookmarked questions become a flip-through deck: reveal
// the answer, step forward/back, or remove a card from the deck.
//
// Redesigned on the Astryx design system — Astryx Card/Button/Badge/typography
// and layout primitives, with the reveal ("flip") and bookmark logic preserved.

import { useRef, useState } from 'react';
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
import { useT } from '../i18n/LanguageContext';
import { CATEGORY_LOOKUP, categoryLabelKey } from '../lib/categories';
import type { CategoryType } from '../types/quiz';
import { removeFlashcard, type Flashcard } from '../lib/flashcards';
import { friendlyError } from '../lib/api';
import { useFlashcards } from '../lib/queries';
import { queryClient } from '../lib/queryClient';
import { renderQuestion } from './CodeBlock';
import LoadingScreen from './LoadingScreen';
import ErrorRetry from './ErrorRetry';
import { IconTile, BookmarkIcon, CheckCircleIcon } from './ui/icons';
import { SwimCta } from './landing/LandingKit';
import './DeepEndScreens.css';
import { useActiveSubject } from '../lib/subjects';


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
  const subject = useActiveSubject();
  const flashcardsKey = ['flashcards', subject.id] as const;
  const firstCardRef = useRef<HTMLButtonElement>(null);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(() => new Set());
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
      await queryClient.cancelQueries({ queryKey: flashcardsKey });
      const prev = queryClient.getQueryData<Flashcard[]>(flashcardsKey);
      queryClient.setQueryData<Flashcard[]>(flashcardsKey, (old) =>
        (old ?? []).filter((c) => c.question_id !== qid),
      );
      return { prev };
    },
    onError: (_err, _qid, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(flashcardsKey, ctx.prev);
      setActionError(t('card.removeFailed'));
    },
  });

  if (authLoading || loading) {
    return <LoadingScreen label={t('card.loading')} />;
  }

  if (!isAuthenticated) {
    return (
      <div className="ss-raised ss-pop" style={{ display: 'flex', width: '100%', maxWidth: 520, margin: '0 auto' }}>
      <Card variant="default" padding={6} width="100%">
        <VStack gap={2} align="center">
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
      <div className="ss-raised ss-pop" style={{ display: 'flex', width: '100%', maxWidth: 520, margin: '0 auto' }}>
      <Card variant="default" padding={6} width="100%">
        <VStack gap={2} align="center">
          <IconTile size={48}>
            <BookmarkIcon size={22} />
          </IconTile>
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

  const handleRemove = (questionId: string) => {
    setActionError(null);
    removeMut.mutate(questionId);
  };

  return (
    <div className="de-page de-cards-page">
      <VStack gap={3} width="100%">
        <HStack justify="between" align="end" gap={2} width="100%" wrap="wrap">
          <VStack gap={0.5}>
            <span className="ss-kicker">{t('card.kicker')}</span>
            <Heading level={1}>{t('card.heading')}</Heading>
            <Text type="supporting" color="secondary">{t('card.subtitle')}</Text>
          </VStack>
          <SwimCta label={t('card.practiceAll', { count: cards.length })} dir={-1} onClick={() => {
            setRevealedIds(new Set());
            requestAnimationFrame(() => firstCardRef.current?.focus());
          }} />
        </HStack>

        <div className="de-card-grid">
          {cards.map((card, cardIndex) => {
            const revealed = revealedIds.has(card.question_id);
            const category = card.category && CATEGORY_LOOKUP.has(card.category as CategoryType)
              ? t(categoryLabelKey(card.category)) : card.category;
            return (
              <article key={card.question_id} className={`de-flashcard ss-pop${revealed ? ' is-revealed' : ''}`}>
                <div className="de-flashcard__top">
                  {category ? <Badge variant="cyan" label={category} /> : <span />}
                  <Button variant="ghost" size="sm" isIconOnly icon={<TrashIcon />} label={t('card.remove')} tooltip={t('card.remove')} onClick={() => handleRemove(card.question_id)} />
                </div>
                <button ref={cardIndex === 0 ? firstCardRef : undefined} type="button" className="de-flashcard__body" aria-expanded={revealed} onClick={() => setRevealedIds((prev) => { const next = new Set(prev); if (next.has(card.question_id)) next.delete(card.question_id); else next.add(card.question_id); return next; })}>
                  <div className="de-flashcard__question">{renderQuestion(card.question)}</div>
                  <div className="de-flashcard__answer" aria-hidden={!revealed}>
                    <span aria-hidden><CheckCircleIcon size={18} /></span>
                    <strong>{card.correct_answer}</strong>
                    {card.explanation && <span>{card.explanation}</span>}
                  </div>
                  <span className="de-flashcard__hint">{revealed ? t('card.hideAnswer') : t('card.tapReveal')}</span>
                </button>
              </article>
            );
          })}
        </div>
      </VStack>
    </div>
  );
}

export default Flashcards;
