/**
 * Daily Review Surface & Spaced Repetition Queue Handler (#197).
 * Exposes cards due today and processes card-level review updates with format escalation.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { jsonError, createLogger } from '../lib/http';
import {
  selectDueReviewCards,
  updateCardReviewState,
  createInitialCardState,
  CardReviewState,
  ReviewRating,
  DEFAULT_DAILY_LIMIT
} from '../lib/card-review';

const log = createLogger('api/daily-review');

// In-memory persistent card review store fallback for multi-session support
const inMemoryUserCardStore: Map<string, Map<string, CardReviewState>> = new Map();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = (req.headers['x-user-id'] as string) || (req.query.userId as string) || 'guest_user';

  if (!inMemoryUserCardStore.has(userId)) {
    inMemoryUserCardStore.set(userId, new Map());
  }
  const userCards = inMemoryUserCardStore.get(userId)!;

  // GET: Retrieve cards due today capped at configurable daily limit
  if (req.method === 'GET') {
    const dailyLimit = req.query.limit ? parseInt(req.query.limit as string, 10) : DEFAULT_DAILY_LIMIT;
    const allCards = Array.from(userCards.values());

    const dueCards = selectDueReviewCards(allCards, {
      now: Date.now(),
      dailyReviewLimit: Math.min(50, Math.max(1, dailyLimit))
    });

    return res.status(200).json({
      ok: true,
      userId,
      totalTrackedCards: allCards.length,
      dueCount: dueCards.length,
      dailyLimit,
      dueCards,
    });
  }

  // POST: Record a review rating for a card
  if (req.method === 'POST') {
    const body = req.body || {};
    const { cardId, rating } = body;

    if (!cardId || typeof cardId !== 'string') {
      return jsonError(res, 400, 'invalid_card_id', 'cardId string is required');
    }

    const validRatings: ReviewRating[] = ['again', 'hard', 'good', 'easy'];
    if (!validRatings.includes(rating as ReviewRating)) {
      return jsonError(res, 400, 'invalid_rating', 'rating must be one of: again, hard, good, easy');
    }

    const currentState = userCards.get(cardId) || createInitialCardState(cardId);
    const updatedState = updateCardReviewState(currentState, rating as ReviewRating);

    userCards.set(cardId, updatedState);

    log.info(
      { userId, cardId, rating, interval: updatedState.intervalDays, format: updatedState.formatTier },
      'Card review state updated'
    );

    return res.status(200).json({
      ok: true,
      cardState: updatedState,
    });
  }

  res.setHeader('Allow', 'GET, POST');
  return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
}
