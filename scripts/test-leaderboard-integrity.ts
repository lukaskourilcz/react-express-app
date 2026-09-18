/**
 * Test Suite: Leaderboard Integrity (Turnstile + Progression Velocity) (#202)
 * Run: npx tsx scripts/test-leaderboard-integrity.ts
 */
import { verifyTurnstileToken } from '../lib/turnstile';
import { evaluateProgressionVelocity, MIN_HUMAN_ANSWER_TIME_MS } from '../lib/progression-velocity';

async function runTests() {
  console.log('=== Running Leaderboard Integrity Tests (#202) ===');
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

  // 1. Turnstile in non-production bypasses gracefully without secret
  const nonProdRes = await verifyTurnstileToken('any-token');
  assert(nonProdRes.success === true, 'Turnstile allows test bypass in non-production without secret');

  // 2. Velocity check passes realistic human timing (e.g. 5,000ms for 5 questions)
  const legitHuman = evaluateProgressionVelocity({
    userId: 'user_123',
    totalQuestions: 5,
    durationMs: 15000,
  });
  assert(!legitHuman.flagged, 'Legitimate human timing (3,000ms/question) is not flagged');

  // 3. Velocity check flags impossible cognitive speed (e.g. 10 questions in 500ms = 50ms/question)
  const botSpeedrun = evaluateProgressionVelocity({
    userId: 'bot_999',
    totalQuestions: 10,
    durationMs: 500,
  });
  assert(botSpeedrun.flagged, 'Sub-human answer velocity (50ms/question) is flagged for review');
  assert(
    botSpeedrun.reason?.includes('impossible_cognitive_velocity') || false,
    'Reason indicates cognitive velocity violation'
  );

  // 4. Velocity check flags impossible 5+ question quiz completion in under 3s
  const ultraFastQuiz = evaluateProgressionVelocity({
    userId: 'script_888',
    totalQuestions: 6,
    durationMs: 2500,
  });
  assert(ultraFastQuiz.flagged, 'Rapid multi-question completion under 3,000ms is flagged');

  console.log(`\nTotal: ${passed}/${total} assertions passed successfully.`);
}

runTests().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
