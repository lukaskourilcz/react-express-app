/**
 * Test Suite: Card-Level Spaced Repetition Scheduler (#197)
 * Run: npx tsx scripts/test-card-review-scheduler.ts
 */
import {
  createInitialCardState,
  updateCardReviewState,
  selectDueReviewCards,
  exportCardReviewProgress,
  importCardReviewProgress,
  CardReviewState
} from '../lib/card-review';

async function runTests() {
  console.log('=== Running Card Review Scheduler Tests (#197) ===');
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, desc: string) {
    total++;
    if (condition) {
      console.log(` ✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(` ❌ FAIL: ${desc}`);
      process.exitCode = 1;
    }
  }

  const now = 1726500000000;

  // 1. Initial Card State Creation
  const card1 = createInitialCardState('card_vocab_01', now);
  assert(card1.easeFactor === 2.5, 'Initial ease factor set to 2.5');
  assert(card1.formatTier === 'multiple_choice', 'Initial question format is multiple_choice');
  assert(card1.dueTimestamp === now, 'Initial card is due immediately');

  // 2. Progression across successful ratings ('good')
  const review1 = updateCardReviewState(card1, 'good', now);
  assert(review1.intervalDays >= 2, 'First good review sets interval >= 2 days');
  assert(review1.reps === 1, 'Repetitions count incremented to 1');

  const review2 = updateCardReviewState(review1, 'good', now + 86400000 * 2);
  assert(review2.intervalDays >= 5, 'Second good review sets interval >= 5 days');

  const review3 = updateCardReviewState(review2, 'good', now + 86400000 * 7);
  assert(review3.intervalDays >= 12, 'Third review scales interval with ease factor');
  assert(review3.formatTier === 'free_response', 'Format escalates to free_response after consecutive success');

  // 3. Format escalation on lapse ('again')
  const lapsed = updateCardReviewState(review3, 'again', now + 86400000 * 20);
  assert(lapsed.intervalDays === 1, 'Lapse resets interval to 1 day');
  assert(lapsed.reps === 0, 'Lapse resets reps count to 0');
  assert(lapsed.lapses === 1, 'Lapse count increments to 1');
  assert(lapsed.formatTier === 'multiple_choice', 'Format drops back to multiple_choice on lapse');

  // 4. Daily Review Queue Capping
  const deck: CardReviewState[] = [];
  for (let i = 0; i < 35; i++) {
    const c = createInitialCardState(`card_${i}`, now);
    deck.push(c);
  }
  const dueQueue = selectDueReviewCards(deck, { now, dailyReviewLimit: 15 });
  assert(dueQueue.length === 15, 'Due queue strictly capped at daily limit of 15');

  // 5. Cross-Session Progress Serialization
  const serialized = exportCardReviewProgress([review3, lapsed]);
  const imported = importCardReviewProgress(serialized);
  assert(imported.length === 2, 'Exported and imported review progress matches');
  assert(imported[0].cardId === review3.cardId, 'Card identity preserved across serialization');

  console.log(`\nTotal: ${passed}/${total} assertions passed successfully.`);
}

runTests().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
