// Shark Cards (owner decision 12): the questions a learner did not know, saved
// where their explanation was shown, reviewed one card at a time.
//
//   front   the question and its topic
//   back    the correct answer, the explanation the server's grading gave,
//           and a link to learn the topic (its Learn level, its Learn topic,
//           or a quiz on it for a topic Learn does not teach)
//   review  turn the card, Previous / Next (also ← and →), and Got it, which
//           takes the card out of the deck with an Undo
//
// Rendered at /cards and as the first tab of /collection (`embedded`). The
// collectible card packs this name once meant are retired; nothing here opens
// a pack.
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { useAuth } from '../lib/auth';
import { openSignIn } from '../lib/signInDialog';
import { useT } from '../i18n/LanguageContext';
import { CATEGORY_LOOKUP, categoryLabelKey } from '../lib/categories';
import type { CategoryType } from '../types/quiz';
import type { Flashcard } from '../lib/flashcards';
import { friendlyError } from '../lib/api';
import { useFlashcards } from '../lib/queries';
import { useRemoveSharkCard, useSaveSharkCard } from '../lib/sharkCards';
import { sharkCardStudyLink } from '../../../shared/shark-cards';
import { renderQuestion } from './CodeBlock';
import LoadingScreen from './LoadingScreen';
import ErrorRetry from './ErrorRetry';
import { AppToast } from './ui/AppToast';
import { IconTile, BookmarkIcon, BookIcon } from './ui/icons';
import { Kicker } from './landing/LandingKit';
import './DeepEndScreens.css';
import './SharkCards.css';

type TFn = ReturnType<typeof useT>;

const topicLabel = (category: string | null, t: TFn): string | null =>
  category && CATEGORY_LOOKUP.has(category as CategoryType) ? t(categoryLabelKey(category)) : category;

/** "Learn this topic", pointed at the most specific place that teaches it. */
function StudyLink({ card, t }: { card: Flashcard; t: TFn }) {
  const link = sharkCardStudyLink(card.question_id, card.category);
  if (!link) return null;
  const topic = topicLabel(link.topic, t) ?? link.topic;
  const label = link.kind === 'level'
    ? t('sharkCards.learnLevel', { topic, level: link.level })
    : link.kind === 'topic'
      ? t('sharkCards.learnTopic', { topic })
      : t('sharkCards.practiceTopic', { topic });
  return (
    <Link className="sc-card__study" to={link.to}>
      <BookIcon size={18} />
      <span>{label}</span>
    </Link>
  );
}

/** A centred panel for the states that have no cards to show. */
function StatePanel({ level, title, body, children }: { level: 1 | 2; title: string; body: string; children?: React.ReactNode }) {
  return (
    <div className="sc-state ss-raised ss-pop">
      <IconTile size={48}>
        <BookmarkIcon size={22} />
      </IconTile>
      <Heading level={level} justify="center">{title}</Heading>
      <Text type="body" color="secondary" justify="center">{body}</Text>
      {children && <div className="sc-state__actions">{children}</div>}
    </div>
  );
}

function Flashcards({ embedded = false }: { embedded?: boolean }) {
  const t = useT();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [index, setIndex] = useState(0);
  const [turned, setTurned] = useState(false);
  const [toast, setToast] = useState<{ kind: 'removed'; card: Flashcard } | { kind: 'error'; message: string } | null>(null);
  const flipRef = useRef<HTMLButtonElement>(null);
  // After Got it, the next card's turn button takes the focus.
  const focusNext = useRef(false);
  const backId = useId();
  const positionId = useId();

  const enabled = !authLoading && isAuthenticated;
  // Inside /collection the page's hold read the cards (Collection.tsx).
  const deck = useFlashcards(enabled, { held: embedded });
  const remove = useRemoveSharkCard();
  const restore = useSaveSharkCard();
  const cards = deck.data ?? [];
  const count = cards.length;
  const at = Math.min(index, Math.max(0, count - 1));
  const card = cards[at] ?? null;

  // A card that left the deck (Got it, or another device) never leaves the
  // position past the end.
  useEffect(() => {
    if (index > 0 && index >= count) setIndex(Math.max(0, count - 1));
  }, [count, index]);
  const shown = card?.question_id ?? null;
  useEffect(() => {
    if (!focusNext.current || !shown) return;
    focusNext.current = false;
    flipRef.current?.focus();
  }, [shown]);

  const go = useCallback((to: number) => {
    if (to < 0 || to >= count || to === at) return;
    setIndex(to);
    setTurned(false);
  }, [at, count]);

  const gotIt = () => {
    if (!card) return;
    const removed = card;
    remove.mutate(removed.question_id, {
      onSuccess: () => setToast({ kind: 'removed', card: removed }),
      onError: (error) => setToast({ kind: 'error', message: `${t('sharkCards.removeFailed')} ${friendlyError(error)}` }),
    });
    setTurned(false);
    focusNext.current = true;
  };

  const undo = (removed: Flashcard) => {
    setToast(null);
    restore.mutate(removed, {
      onError: (error) => setToast({ kind: 'error', message: `${t('sharkCards.saveFailed')} ${friendlyError(error)}` }),
    });
  };

  const onDeckKey = (event: KeyboardEvent<HTMLElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'ArrowRight') { event.preventDefault(); go(at + 1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); go(at - 1); }
  };

  const heading = embedded ? 2 : 1;

  if (authLoading || (enabled && deck.isPending)) {
    return <LoadingScreen label={t('sharkCards.loading')} />;
  }

  if (!isAuthenticated) {
    return (
      <StatePanel level={heading} title={t('sharkCards.signInTitle')} body={t('sharkCards.signInBody')}>
        <Button variant="primary" label={t('auth.logIn')} aria-haspopup="dialog" onClick={() => openSignIn()} />
      </StatePanel>
    );
  }

  if (deck.isError && !deck.data) {
    return <ErrorRetry message={friendlyError(deck.error)} onRetry={() => void deck.refetch()} sx={{ maxWidth: 520, mx: 'auto' }} />;
  }

  const toastNode = (
    <AppToast
      open={!!toast}
      onClose={() => setToast(null)}
      severity={toast?.kind === 'error' ? 'error' : 'success'}
      autoHideDuration={toast?.kind === 'removed' ? 8000 : 5000}
      message={toast?.kind === 'removed' ? (
        <span className="sc-toast">
          <span>{t('sharkCards.removed')}</span>
          <button type="button" className="sc-toast__undo" onClick={() => undo(toast.card)}>{t('sharkCards.undo')}</button>
        </span>
      ) : toast?.kind === 'error' ? toast.message : ''}
    />
  );

  if (!card) {
    return (
      <>
        <StatePanel level={heading} title={t('sharkCards.emptyTitle')} body={t('sharkCards.emptyBody')}>
          <Button variant="primary" label={t('sharkCards.emptyQuiz')} onClick={() => navigate('/quiz')} />
          <Button variant="secondary" label={t('sharkCards.emptyLearn')} onClick={() => navigate('/learn')} />
        </StatePanel>
        {toastNode}
      </>
    );
  }

  const topic = topicLabel(card.category, t);
  return (
    <div className={`sc-deck${embedded ? ' sc-deck--embedded' : ' de-page'}`}>
      {!embedded && (
        <header className="sc-deck__header">
          <Kicker>{t('sharkCards.kicker')}</Kicker>
          <Heading level={1}>{t('sharkCards.title')}</Heading>
          <Text type="supporting" color="secondary">{t('sharkCards.lead')}</Text>
        </header>
      )}

      <section className="sc-deck__body" aria-labelledby={positionId} onKeyDown={onDeckKey}>
        <p id={positionId} className="sc-deck__position" aria-live="polite">
          {t('sharkCards.position', { n: at + 1, total: count })}
        </p>

        <article key={card.question_id} className={`sc-card ss-raised${turned ? ' is-turned' : ''}`} data-side={turned ? 'back' : 'front'}>
          <div className="sc-card__meta">
            {topic ? <Badge variant="cyan" label={topic} /> : <span />}
            <span className="sc-card__side">{t(turned ? 'sharkCards.backLabel' : 'sharkCards.frontLabel')}</span>
          </div>
          <div className="sc-card__question">{renderQuestion(card.question)}</div>

          {turned && (
            <div id={backId} className="sc-card__back">
              <p className="sc-card__label">{t('sharkCards.answerLabel')}</p>
              <p className="sc-card__answer">{card.correct_answer}</p>
              {card.explanation && (
                <>
                  <p className="sc-card__label">{t('sharkCards.explanationLabel')}</p>
                  <p className="sc-card__explanation">{card.explanation}</p>
                </>
              )}
              <StudyLink card={card} t={t} />
            </div>
          )}

          <button
            ref={flipRef}
            type="button"
            className="sc-card__turn"
            aria-expanded={turned}
            aria-controls={turned ? backId : undefined}
            onClick={() => setTurned((value) => !value)}
          >
            {t(turned ? 'sharkCards.turnBack' : 'sharkCards.turn')}
          </button>
        </article>

        <div className="sc-deck__controls">
          <Button variant="secondary" label={t('sharkCards.previous')} isDisabled={at === 0} onClick={() => go(at - 1)} />
          <Button
            variant="primary"
            label={t('sharkCards.gotIt')}
            isDisabled={remove.isPending}
            aria-describedby={`${positionId}-hint`}
            onClick={gotIt}
          />
          <Button variant="secondary" label={t('sharkCards.next')} isDisabled={at >= count - 1} onClick={() => go(at + 1)} />
        </div>
        <p id={`${positionId}-hint`} className="sc-deck__hint">{t('sharkCards.gotItHint')}</p>
      </section>
      {toastNode}
    </div>
  );
}

export default Flashcards;
