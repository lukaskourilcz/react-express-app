// Grades one free JavaScript task and one free React task on the live site,
// anonymously, with the reference solution (must pass) and a wrong one (must
// fail). `.github/workflows/grading-monitor.yml` runs it every six hours; a
// non-zero exit fails that run, and GitHub emails failed scheduled runs.
//
//   npm run check:live-grading                                   # https://devshark.app
//   LIVE_GRADING_BASE_URL=http://127.0.0.1:3000 npm run check:live-grading
//
// An anonymous submit records nothing: no progress, XP or attempt.
import { gradingProbes, runLiveGradingCheck } from './live-grading-check';

const baseUrl = process.env.LIVE_GRADING_BASE_URL || 'https://devshark.app';
const retryDelay = Number(process.env.LIVE_GRADING_RETRY_DELAY_MS);
const annotate = process.env.GITHUB_ACTIONS === 'true';

async function main() {
  if (!/^https?:\/\/[^/\s]+/.test(baseUrl)) throw new Error(`LIVE_GRADING_BASE_URL must be an http(s) origin, got "${baseUrl}"`);
  const probes = gradingProbes();
  console.log(`Grading ${probes.map((probe) => probe.taskId).join(' and ')} on ${baseUrl}`);
  const result = await runLiveGradingCheck({
    baseUrl,
    probes,
    ...(Number.isFinite(retryDelay) && retryDelay >= 0 ? { retryDelayMs: retryDelay } : {}),
    log: (line) => console.log(line),
  });
  if (result.ok) {
    console.log('Live grading answers as expected: reference solutions pass and wrong solutions fail.');
    return;
  }
  for (const failure of result.failures) console.error(annotate ? `::error title=Live grading::${failure.replace(/\r?\n/g, ' ')}` : `FAIL ${failure}`);
  console.error(`Live grading on ${baseUrl} failed ${result.failures.length} check(s).`);
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(annotate ? `::error title=Live grading::${error instanceof Error ? error.message : String(error)}` : error);
  process.exitCode = 1;
});
