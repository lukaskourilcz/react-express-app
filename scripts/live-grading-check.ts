/** The live grading check behind `.github/workflows/grading-monitor.yml`
 * (run by `scripts/check-live-grading.ts`). Production grades JavaScript in a
 * QuickJS worker and React only in a Vercel Sandbox; this proves both still
 * answer, from outside, the way a learner meets them: open a free task
 * anonymously, submit its reference solution and expect `passed`, submit a
 * wrong one and expect `failed`. An anonymous submit records nothing.
 *
 * No side effects on import: the test imports this module and points it at a
 * local stub server, never at production. */

import { codingTaskById } from '../lib/coding/active';
import { solutionFor } from '../lib/coding/solutions';
import { isFreeCodingTask } from '../shared/tiers';

export interface GradingProbe {
  taskId: string;
  /** Which grader the task exercises, for the messages. */
  runner: string;
  reference: string;
  wrong: string;
}

/** One free tier-1 task per grader, both open to a signed-out visitor, and a
 * wrong answer for each that compiles and runs but gives the wrong result, so
 * the grader must answer `failed` rather than `error`. */
const PROBES: readonly { taskId: string; runner: string; wrong: string }[] = [
  {
    taskId: 'js-double-numbers',
    runner: 'JavaScript (QuickJS worker)',
    wrong: 'const double = numbers => numbers;\n',
  },
  {
    taskId: 'react-counter',
    runner: 'React (Vercel Sandbox)',
    // Shows the starting 0 and a button, but the button changes nothing.
    wrong: 'const App = () => (\n  <main>\n    <h2>Counter</h2>\n    <p>0</p>\n    <button>Increment</button>\n  </main>\n);\n',
  },
];

/** The probes with their reference solutions from the repository's own
 * solutions module. Throws when a probe task no longer fits: then the list
 * above needs another task, which is a repository change, not an outage. */
export function gradingProbes(): GradingProbe[] {
  return PROBES.map((probe) => {
    const task = codingTaskById(probe.taskId);
    const reference = solutionFor(probe.taskId)?.solution;
    if (!task) throw new Error(`Probe task ${probe.taskId} is not in the active catalogue; pick another free task in scripts/live-grading-check.ts.`);
    if (!isFreeCodingTask(probe.taskId)) throw new Error(`Probe task ${probe.taskId} is not free any more; pick another free task in scripts/live-grading-check.ts.`);
    if (task.verify !== 'tests') throw new Error(`Probe task ${probe.taskId} is not graded by tests; pick another task in scripts/live-grading-check.ts.`);
    if (!reference) throw new Error(`Probe task ${probe.taskId} has no reference solution.`);
    return { ...probe, reference };
  });
}

export interface LiveGradingOptions {
  baseUrl: string;
  probes: readonly GradingProbe[];
  /** Wait before the one retry after a network error or a 429 without Retry-After. */
  retryDelayMs?: number;
  taskTimeoutMs?: number;
  /** A React submit starts a sandbox VM; allow it the time a learner's does and more. */
  submitTimeoutMs?: number;
  log?: (line: string) => void;
}

export interface LiveGradingResult {
  ok: boolean;
  failures: string[];
}

const EXCERPT_LENGTH = 300;
const MAX_RETRY_AFTER_MS = 60_000;
const USER_AGENT = 'devShark-grading-monitor';

const excerpt = (text: string) => {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > EXCERPT_LENGTH ? `${flat.slice(0, EXCERPT_LENGTH)}…` : flat || '(empty body)';
};
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface Answer { status: number; text: string }

class NetworkFailure extends Error {}

/** One request, retried once after a network error or a 429. */
interface Outgoing { method: 'GET' | 'POST'; headers: Record<string, string>; body?: string }

async function send(url: string, init: Outgoing, timeoutMs: number, retryDelayMs: number, log: (line: string) => void): Promise<Answer> {
  for (let attempt = 1; ; attempt += 1) {
    let answer: Answer;
    try {
      const response = await fetch(url, { ...init, headers: { ...init.headers, 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(timeoutMs) });
      answer = { status: response.status, text: await response.text() };
      if (answer.status !== 429 || attempt > 1) return answer;
      const retryAfter = Number(response.headers.get('retry-after'));
      const wait = Number.isFinite(retryAfter) && retryAfter >= 0 && response.headers.has('retry-after') ? Math.min(retryAfter * 1000, MAX_RETRY_AFTER_MS) : retryDelayMs;
      log(`  ${init.method} ${url} answered 429; retrying once in ${wait} ms`);
      await sleep(wait);
    } catch (error) {
      const reason = error instanceof Error ? `${error.name}: ${error.message}${error.cause instanceof Error ? ` (${error.cause.message})` : ''}` : String(error);
      if (attempt > 1) throw new NetworkFailure(reason);
      log(`  ${init.method} ${url} failed (${reason}); retrying once in ${retryDelayMs} ms`);
      await sleep(retryDelayMs);
    }
  }
}

function parse(text: string): Record<string, unknown> | null {
  try {
    const value = JSON.parse(text) as unknown;
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** What a verdict body says beyond the verdict, for a failure message. */
function verdictDetail(body: Record<string, unknown>): string {
  const parts: string[] = [];
  if (typeof body.codeError === 'string' && body.codeError) parts.push(`codeError: ${body.codeError}`);
  if (Array.isArray(body.results)) {
    const results = body.results as { pass?: unknown }[];
    parts.push(`visible checks passed: ${results.filter((one) => one?.pass === true).length}/${results.length}`);
  }
  const hidden = body.hidden as { passed?: unknown; total?: unknown } | null | undefined;
  if (hidden && typeof hidden.total === 'number') parts.push(`hidden checks passed: ${String(hidden.passed)}/${hidden.total}`);
  return parts.join('; ');
}

export async function runLiveGradingCheck(options: LiveGradingOptions): Promise<LiveGradingResult> {
  const base = options.baseUrl.replace(/\/+$/, '');
  const log = options.log ?? (() => undefined);
  const retryDelayMs = options.retryDelayMs ?? 5_000;
  const failures: string[] = [];

  for (const probe of options.probes) {
    for (const [answer, code, expected] of [['reference solution', probe.reference, 'passed'], ['wrong solution', probe.wrong, 'failed']] as const) {
      const what = `${probe.runner}, ${probe.taskId}, ${answer}`;
      // A fresh session for every submit, as a learner reopening the task gets.
      const taskUrl = `${base}/api/quiz/roadmap?resource=coding-task&id=${encodeURIComponent(probe.taskId)}`;
      let task: Answer;
      try {
        task = await send(taskUrl, { method: 'GET', headers: { Accept: 'application/json' } }, options.taskTimeoutMs ?? 20_000, retryDelayMs, log);
      } catch (error) {
        failures.push(`${what}: GET ${taskUrl} failed twice without an answer (${(error as Error).message})`);
        continue;
      }
      const taskBody = parse(task.text);
      const session = taskBody?.session;
      if (task.status !== 200 || typeof session !== 'string' || !session) {
        const locked = taskBody && typeof taskBody.locked === 'string' ? `; locked: ${taskBody.locked}` : '';
        failures.push(`${what}: GET ${taskUrl} answered HTTP ${task.status} without a coding session${locked}: ${excerpt(task.text)}`);
        continue;
      }

      const submitUrl = `${base}/api/quiz/roadmap?resource=coding-submit`;
      let submit: Answer;
      try {
        submit = await send(submitUrl, {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ session, code }),
        }, options.submitTimeoutMs ?? 90_000, retryDelayMs, log);
      } catch (error) {
        failures.push(`${what}: POST ${submitUrl} failed twice without an answer (${(error as Error).message})`);
        continue;
      }
      const verdictBody = parse(submit.text);
      const verdict = verdictBody?.verdict;
      if (submit.status !== 200 || typeof verdict !== 'string') {
        failures.push(`${what}: POST ${submitUrl} answered HTTP ${submit.status} without a verdict: ${excerpt(submit.text)}`);
        continue;
      }
      if (verdict !== expected) {
        const detail = verdictDetail(verdictBody!);
        failures.push(`${what}: graded "${verdict}", expected "${expected}"${detail ? ` (${detail})` : ''}. HTTP ${submit.status}: ${excerpt(submit.text)}`);
        continue;
      }
      log(`  ok  ${what}: ${verdict}`);
    }
  }
  return { ok: failures.length === 0, failures };
}
