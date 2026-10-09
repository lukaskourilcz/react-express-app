// What the workbench says after Run and Submit, checked against the coding
// audit of 8 October 2026 (C3, C4, C5). Each case names its finding.
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { CodingWorkbench } from '../src/coding/CodingWorkbench';
import { revealCoding, submitCoding, useCodingApproaches } from '../src/coding/api';
import { runCodeTests, type RunOutcome } from '../src/coding/runner/run-tests';
import { skipTask } from '../src/coding/practice';
import { ApiError } from '../src/lib/api';
import { TYPE_CHECK_STOPPED_MESSAGE } from '../../shared/coding-evaluate';
import type { CodingTaskProgress, CodingVerdictResponse } from '../../shared/coding-api';
import type { PlayableCodingTask } from '../../shared/coding-catalog';

vi.mock('../src/coding/Editor', () => ({
  Editor: ({ value, onChange }: { value: string; onChange: (value: string) => void }) =>
    <textarea aria-label="Test editor" value={value} onChange={(event) => onChange(event.target.value)} />,
}));
vi.mock('../src/coding/api', () => ({ useCodingApproaches: vi.fn(() => ({ data: undefined })), submitCoding: vi.fn(), revealCoding: vi.fn() }));
vi.mock('../src/coding/practice', () => ({ skipTask: vi.fn() }));
vi.mock('../src/coding/runner/run-tests', async (importOriginal) => ({
  ...await importOriginal<typeof import('../src/coding/runner/run-tests')>(),
  runCodeTests: vi.fn(),
}));

const task: PlayableCodingTask = {
  id: 'js-test-state', track: 'javascript', level: 1, tier: 1, difficulty: 'easy',
  focus: ['map'], title: { en: 'Test task', cs: 'Testovací úloha' },
  prompt: { en: 'Double the numbers.', cs: 'Zdvojnásob čísla.' },
  starter: 'const double = (list) => list;\n', hints: { en: ['Use map.'], cs: ['Použij map.'] },
  verify: 'tests', estimatedMinutes: 5,
  tests: [{ call: 'double([1])', expected: [2] }, { call: 'double([])', expected: [] }],
};
const progress = (status: CodingTaskProgress['status']): CodingTaskProgress => ({
  status, passes: status === 'passed' ? 1 : 0, reviewStage: 0, nextReviewAt: null, revealCount: 0, bestPassedAt: null,
});
const verdict = (extra: Partial<CodingVerdictResponse>): CodingVerdictResponse => ({
  verdict: 'passed', results: [{ pass: true, actual: '[2]', error: null }, { pass: true, actual: '[]', error: null }],
  hidden: null, check: null, logs: [], codeError: null, design: null, designReference: null, failureHint: null, puzzle: null,
  progress: progress('passed'), firstPass: true, xpAwarded: 25, xpForfeited: false, applied: true, github: null, solutions: null, ...extra,
});
const outcome = (extra: Partial<RunOutcome>): RunOutcome => ({ results: [], logs: [], codeError: null, check: null, timedOut: false, ...extra });

const status = () => document.querySelector('.cd-workbench > [role="status"]')!;
const editor = () => screen.getByLabelText('Test editor');

function mount(props: { signedIn?: boolean; subject?: PlayableCodingTask } = {}) {
  return render(
    <MemoryRouter initialEntries={['/coding/javascript/js-test-state']}>
      <LanguageProvider>
        <Routes>
          <Route path="/coding/javascript/js-test-state" element={(
            <CodingWorkbench task={props.subject ?? task} session="test-session" locked={null} initialCode={null} signedIn={props.signedIn ?? true} mode="section" />
          )} />
          <Route path="/coding/:track/:taskId" element={<h1>Another task</h1>} />
        </Routes>
      </LanguageProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(submitCoding).mockReset();
  vi.mocked(revealCoding).mockReset();
  vi.mocked(runCodeTests).mockReset();
  vi.mocked(runCodeTests).mockResolvedValue(outcome({ results: [{ pass: false, actual: '[1]', error: null }, { pass: true, actual: '[]', error: null }] }));
  vi.mocked(useCodingApproaches).mockClear();
});
afterEach(() => { vi.useRealTimers(); });

// C4-2 / C5-8: a Submit that fails on the network or a rate limit left the
// previous verdict on screen beside the new error.
it('clears the last verdict when a new Submit fails', async () => {
  vi.mocked(submitCoding).mockResolvedValueOnce(verdict({ verdict: 'failed', progress: progress('in_progress'), firstPass: false, xpAwarded: 0, results: [{ pass: false, actual: '[1]', error: null }, { pass: true, actual: '[]', error: null }] }));
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
  expect(await screen.findByRole('heading', { level: 3, name: 'Failed' })).toBeVisible();
  vi.mocked(submitCoding).mockRejectedValueOnce(new ApiError('Too many requests. Try again shortly.', 429, 'rate_limited'));
  fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Too many requests');
  expect(screen.queryByRole('heading', { level: 3, name: 'Failed' })).toBeNull();
});

it('says a verdict is about earlier code once the code changes', async () => {
  vi.mocked(submitCoding).mockResolvedValueOnce(verdict({}));
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
  expect(await screen.findByRole('heading', { level: 3, name: /^Passed/ })).toBeVisible();
  expect(screen.queryByText(/You changed the code after this check/)).toBeNull();
  fireEvent.change(editor(), { target: { value: 'const double = (list) => list.map((n) => n * 2);' } });
  expect(screen.getByText('You changed the code after this check. Submit again to check the new version.')).toBeVisible();
});

// C3-9 / C4-3: "Passing the visible examples is not enough" appeared when
// visible examples had failed too.
it('blames the hidden checks only when every visible check passed', async () => {
  const hiddenLine = /Some hidden checks failed/;
  vi.mocked(submitCoding).mockResolvedValueOnce(verdict({
    verdict: 'failed', progress: progress('in_progress'), xpAwarded: 0, firstPass: false, hidden: { passed: 0, total: 3 },
    results: [{ pass: false, actual: '[1]', error: null }, { pass: true, actual: '[]', error: null }],
  }));
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
  expect(await screen.findByRole('heading', { level: 3, name: 'Failed' })).toBeVisible();
  expect(screen.queryByText(hiddenLine)).toBeNull();

  vi.mocked(submitCoding).mockResolvedValueOnce(verdict({ verdict: 'failed', progress: progress('in_progress'), xpAwarded: 0, firstPass: false, hidden: { passed: 1, total: 3 } }));
  fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
  expect(await screen.findByText(hiddenLine)).toBeVisible();
});

// C3-5: the live region said "0 of 0 passing" for a crash and a timeout, and
// "5 of 5 passing" for code with type errors.
for (const [name, run, says] of [
  ['an error', outcome({ codeError: 'ReferenceError: x is not defined' }), 'Your code could not run.'],
  ['a timeout', outcome({ timedOut: true, codeError: 'Timed out. Check for an infinite loop.' }), 'Timed out. Check for an infinite loop.'],
  ['type errors', outcome({ results: [{ pass: true, actual: '[2]', error: null }, { pass: true, actual: '[]', error: null }], check: { codeErrors: [{ line: 1, message: 'Type error' }], typeTests: [{ pass: false, error: 'no' }] } }), '2 of 2 passing. 2 type errors'],
] as const) {
  it(`announces ${name} as what it is`, async () => {
    vi.mocked(runCodeTests).mockResolvedValueOnce(run);
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Run' }));
    await waitFor(() => expect(status()).toHaveTextContent(says));
    expect(status()).not.toHaveTextContent(name === 'type errors' ? /^2 of 2 passing$/ : /passing/);
  });
}

// C3-7: offline, a runner that never loaded read "Your code could not run.
// The runner crashed." with the hint "Your code threw".
it('says the runner did not load instead of blaming the code, and opens no hint for it', async () => {
  vi.mocked(runCodeTests).mockResolvedValueOnce(outcome({ runnerUnavailable: true }));
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Run' }));
  const note = 'The runner did not load, so your code did not run. Check your connection and run again.';
  expect(await screen.findByText(note, { selector: 'p' })).toBeVisible();
  expect(status()).toHaveTextContent(note);
  expect(screen.queryByText(/could not run|Your code threw/)).toBeNull();
  // Nothing ran, so it is not the failed attempt that opens the hints.
  expect(screen.getByRole('button', { name: 'Hint' })).toHaveAttribute('aria-disabled', 'true');
});

// C5-2: a runaway type is the types' doing, not a loop's.
it('names a stopped type check as a type problem, with no loop hint', async () => {
  vi.mocked(runCodeTests).mockResolvedValueOnce(outcome({ timedOut: true, codeError: TYPE_CHECK_STOPPED_MESSAGE }));
  mount({ subject: { ...task, track: 'typescript' } });
  fireEvent.click(screen.getByRole('button', { name: 'Run' }));
  expect(await screen.findByText(/^Type checking stopped before it finished/, { selector: 'p' })).toBeVisible();
  expect(screen.queryByText(/infinite loop|did not finish|loop whose condition/)).toBeNull();
});

// C5-2: Submit waited for the browser's own type check (up to 45 s) before
// the request left. The server grades anyway, so it goes at once.
it('sends Submit without waiting for the browser run, and shows the server run', async () => {
  let finishLocal!: (run: RunOutcome) => void;
  vi.mocked(runCodeTests).mockImplementationOnce(() => new Promise((resolve) => { finishLocal = resolve; }));
  vi.mocked(submitCoding).mockResolvedValueOnce(verdict({}));
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
  await waitFor(() => expect(submitCoding).toHaveBeenCalledTimes(1));
  expect(await screen.findByRole('heading', { level: 3, name: /^Passed/ })).toBeVisible();
  // The browser run finishing late does not replace what the server saw.
  await act(async () => { finishLocal(outcome({ codeError: 'late local run' })); });
  expect(screen.queryByText('late local run')).toBeNull();
  expect(screen.getByRole('tab', { name: /Results/ })).toHaveTextContent('2/2');
});

// C3-8: the gate was checked at render time only, so a learner who edited
// and then waited a minute still saw Hint locked until the next keystroke.
it('opens the hint a minute after the first edit without another keystroke', async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  mount();
  fireEvent.change(editor(), { target: { value: 'const double = (list) => list.map((n) => n);' } });
  const hint = screen.getByRole('button', { name: 'Hint' });
  // Let the display formatter (350 ms after a pause) settle first: its render
  // would otherwise land after the jump and open the gate by accident.
  await act(async () => { await vi.advanceTimersByTimeAsync(400); });
  await vi.waitFor(() => expect(screen.getByRole('button', { name: 'Format' })).toBeEnabled());
  expect(hint).toHaveAttribute('aria-disabled', 'true');
  await act(async () => { await vi.advanceTimersByTimeAsync(61_000); });
  expect(hint).not.toHaveAttribute('aria-disabled');
  fireEvent.click(hint);
  expect(screen.getByText('Use map.')).toBeVisible();
});

// C3-6: Run went natively disabled while it ran, which drops the focus to
// the page; and the confirmations ignored Escape and left focus nowhere.
it('keeps Run focusable while it runs', async () => {
  let finish!: (run: RunOutcome) => void;
  vi.mocked(runCodeTests).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  mount();
  const run = screen.getByRole('button', { name: 'Run' });
  run.focus();
  fireEvent.click(run);
  const busy = screen.getByRole('button', { name: 'Running…' });
  expect(busy).toBe(run);
  expect(busy).not.toBeDisabled();
  expect(busy).toHaveAttribute('aria-disabled', 'true');
  expect(document.activeElement).toBe(run);
  await act(async () => { finish(outcome({ results: [{ pass: true, actual: '[2]', error: null }, { pass: true, actual: '[]', error: null }] })); });
  expect(screen.getByRole('button', { name: 'Run' })).not.toHaveAttribute('aria-disabled');
});

it('closes the Reset confirmation on Escape, keeps the code and gives focus back to Reset', () => {
  mount();
  fireEvent.change(editor(), { target: { value: 'const double = () => [];' } });
  const reset = screen.getByRole('button', { name: 'Reset' });
  fireEvent.click(reset);
  const dialog = screen.getByRole('alertdialog', { name: 'Reset' });
  // C3-15: the way out said "Try again", which is not what it does.
  expect(within(dialog).getByRole('button', { name: 'Keep my code' })).toHaveFocus();
  fireEvent.keyDown(within(dialog).getByRole('button', { name: 'Keep my code' }), { key: 'Escape' });
  expect(screen.queryByRole('alertdialog')).toBeNull();
  expect(editor()).toHaveValue('const double = () => [];');
  expect(document.activeElement).toBe(reset);
});

function climbTheLadder() {
  const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 61_000);
  fireEvent.change(editor(), { target: { value: 'const double = (list) => list.map((n) => n);' } });
  fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next hint' }));
  clock.mockRestore();
}

// C4-5 and C3-15: a signed-out reveal promised the task would "come back
// later", which nothing does; and its way out said "Try again".
it('tells a signed-out visitor what a reveal really does, and Keep trying returns focus', () => {
  mount({ signedIn: false });
  // The note beside the brief no longer says any task runs without an account.
  expect(screen.getByText(/^Sign in to keep your progress\./)).toHaveTextContent('Signed out, you can run and check the free tasks, but no pass is recorded.');
  climbTheLadder();
  const solution = screen.getByRole('button', { name: 'Solution' });
  fireEvent.click(solution);
  const dialog = screen.getByRole('alertdialog', { name: 'Solution' });
  expect(dialog).toHaveTextContent('Showing the solution ends this attempt, and Submit stays off until you open the task again. Show it?');
  expect(dialog).not.toHaveTextContent(/comes back later/);
  fireEvent.click(within(dialog).getByRole('button', { name: 'Keep trying' }));
  expect(screen.queryByRole('alertdialog')).toBeNull();
  expect(document.activeElement).toBe(solution);
});

// C3-15: the documentation rung printed the task's tag slug ("map-set").
it('names the documentation page by its title on the last rung', () => {
  mount();
  climbTheLadder();
  expect(screen.getByRole('link', { name: 'Open the page “Array.prototype.map()”' })).toHaveAttribute('href', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map');
});

// C3-16: 79 reference solutions are one long line and read as a run-on line.
it('lays out a one-line reference solution for reading, and focuses it', async () => {
  vi.mocked(revealCoding).mockResolvedValueOnce({
    solution: 'const countMultiples = (n, from, to) => { let count = 0; for (let value = from; value <= to; value += 1) { if (value % n === 0) count += 1; } return count; };',
    reference: null, progress: progress('revealed'),
  });
  mount();
  climbTheLadder();
  fireEvent.click(screen.getByRole('button', { name: 'Solution' }));
  fireEvent.click(within(screen.getByRole('alertdialog', { name: 'Solution' })).getByRole('button', { name: 'Solution' }));
  const shown = await screen.findByText(/const countMultiples/, { selector: 'pre' }, { timeout: 10_000 });
  expect(shown.textContent!.split('\n').length).toBeGreaterThan(4);
  expect(shown.textContent).toContain('    if (value % n === 0) count += 1;');
  await waitFor(() => expect(document.activeElement).toBe(shown.closest('.cd-solution')));
});

// C3-18: Next challenge after a skip was a plain link, so the whole app
// loaded again.
it('opens the challenge offered after a skip inside the app', async () => {
  vi.mocked(skipTask).mockResolvedValueOnce({ recorded: true, next: 'js-digit-sum', required: false });
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
  fireEvent.click(screen.getByRole('button', { name: 'Skip and continue' }));
  const next = await screen.findByRole('link', { name: 'Next challenge' });
  fireEvent.click(next);
  expect(await screen.findByRole('heading', { level: 1, name: 'Another task' })).toBeVisible();
});

// C3-4 / C5-9: an accepted order came back as "Passed", and then asked for
// approach comparisons, which the server refused with 403.
it('shows an accepted order as an order, not a pass, and asks for no approaches', async () => {
  vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
    matches: query === '(max-width: 1023.95px)', media: query, onchange: null,
    addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
  }) as MediaQueryList);
  const puzzle = {
    taskId: 'js-test-state', variantId: 'v1',
    lines: [{ id: 'b1', code: '}' }, { id: 'b2', code: 'const one = () => {' }, { id: 'b3', code: '  return 1;' }],
    competencies: ['sequence' as const], claim: { en: 'Arranged correctly.', cs: 'Seřazeno.' },
  };
  vi.mocked(submitCoding).mockResolvedValueOnce(verdict({
    results: [], progress: null, firstPass: false, xpAwarded: 0, applied: false,
    puzzle: { accepted: true, competencies: ['sequence'], claim: { en: 'Arranged correctly.', cs: 'Seřazeno.' } },
  }));
  mount({ subject: { ...task, puzzle } });
  fireEvent.click(screen.getByRole('button', { name: /Check the order/ }));
  expect(await screen.findByRole('heading', { level: 3, name: 'That order works.' })).toBeVisible();
  expect(screen.queryByRole('heading', { level: 3, name: /^Passed/ })).toBeNull();
  expect(status()).toHaveTextContent('That order works.');
  expect(screen.queryByRole('link', { name: 'Next task' })).toBeNull();
  expect(vi.mocked(useCodingApproaches).mock.calls.every(([, enabled]) => enabled === false)).toBe(true);
});
