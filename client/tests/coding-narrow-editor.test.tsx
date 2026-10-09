import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { CodingWorkbench } from '../src/coding/CodingWorkbench';
import { submitCoding } from '../src/coding/api';
import { warmRunner } from '../src/coding/runner/run-tests';
import type { PlayableCodingTask } from '../../shared/coding-catalog';

vi.mock('../src/coding/Editor', () => ({
  Editor: ({ value, onChange }: { value: string; onChange: (value: string) => void }) =>
    <textarea aria-label="Test editor" value={value} onChange={event => onChange(event.target.value)} />,
}));
vi.mock('../src/coding/api', () => ({ useCodingApproaches: () => ({ data: undefined }), submitCoding: vi.fn(), revealCoding: vi.fn() }));
vi.mock('../src/coding/runner/run-tests', async (importOriginal) => ({
  ...await importOriginal<typeof import('../src/coding/runner/run-tests')>(),
  warmRunner: vi.fn(() => () => {}),
}));

// A Learn-level task with no puzzle: below 1024 CSS px it opened on "waiting
// for a bigger screen" and nothing else, so a phone could never pass it.
const task: PlayableCodingTask = {
  id: 'js-narrow-editor', track: 'javascript', level: 1, tier: 1, difficulty: 'easy',
  focus: ['functions'], title: { en: 'Narrow task', cs: 'Úzká úloha' },
  prompt: { en: 'Return one.', cs: 'Vrať jedničku.' },
  starter: 'const one = () => 1;\n', hints: { en: ['Use a function.'], cs: ['Použij funkci.'] },
  verify: 'tests', estimatedMinutes: 5, tests: [],
};

function narrowScreen() {
  vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
    matches: query === '(max-width: 1023.95px)', media: query, onchange: null,
    addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
  }) as MediaQueryList);
}

const mount = (id = task.id) => render(
  <MemoryRouter><LanguageProvider>
    <CodingWorkbench initialCode={null} task={{ ...task, id }} session="test-session" locked={null} signedIn mode="lesson" />
  </LanguageProvider></MemoryRouter>,
);

beforeEach(() => { sessionStorage.clear(); narrowScreen(); });
afterEach(() => { sessionStorage.clear(); });

it('waits for a bigger screen by default, and says truthfully when code is saved', () => {
  mount();
  expect(screen.getByText('This challenge needs an editor, so it is waiting for a bigger screen.')).toBeVisible();
  // Code is saved on Run and Submit only; there is no autosave to promise.
  expect(screen.getByText(/Your code is saved when you press Run or Submit/)).toBeVisible();
  expect(screen.queryByText(/anything you have written is saved/)).toBeNull();
  expect(screen.getByLabelText('Test editor')).not.toBeVisible();
  expect(screen.queryByRole('button', { name: 'Run' })).toBeNull();
});

it('opens the editor with Run and Submit on a narrow screen when the learner asks, and keeps that choice for the session', () => {
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Use the editor on this screen' }));
  const editor = screen.getByLabelText('Test editor');
  expect(editor).toBeVisible();
  expect(screen.queryByText('This challenge needs an editor, so it is waiting for a bigger screen.')).toBeNull();
  expect(screen.getByRole('button', { name: 'Run' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Submit' })).toBeVisible();
  // The button that was pressed is gone; focus lands on the pane that replaced it.
  expect(document.activeElement).toBe(editor.closest('.cd-pane--editor'));
  expect(screen.getByRole('heading', { level: 2, name: 'Narrow task' }).closest('.cd-pane--editor')).toBe(editor.closest('.cd-pane--editor'));

  // The next task in the same browser session opens straight in the editor.
  cleanup();
  mount('js-narrow-editor-next');
  expect(screen.getByLabelText('Test editor')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Use the editor on this screen' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Submit' })).toBeVisible();
});

// V3-4: a TypeScript task at phone width downloaded the 4 MB compiler and
// started it in a worker, on every visit, with no editor on the screen.
it('loads no runner while the screen waits for a bigger one, and loads it once the editor opens', () => {
  render(
    <MemoryRouter><LanguageProvider>
      <CodingWorkbench initialCode={null} task={{ ...task, track: 'typescript' }} session="test-session" locked={null} signedIn mode="lesson" />
    </LanguageProvider></MemoryRouter>,
  );
  expect(screen.getByText('This challenge needs an editor, so it is waiting for a bigger screen.')).toBeVisible();
  expect(warmRunner).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Use the editor on this screen' }));
  expect(warmRunner).toHaveBeenCalledWith('typescript');
});

// CODE-5: a section task with a puzzle showed only the puzzle on a narrow
// screen. Arranging lines never completes a task, so five free tasks could
// not be passed on a phone.
const puzzle = {
  taskId: 'js-narrow-puzzle', variantId: 'v1',
  lines: [{ id: 'b1', code: '}' }, { id: 'b2', code: 'const one = () => {' }, { id: 'b3', code: '  return 1;' }],
  competencies: ['sequence' as const], claim: { en: 'Arranged correctly.', cs: 'Seřazeno.' },
};
const mountPuzzle = () => render(
  <MemoryRouter><LanguageProvider>
    <CodingWorkbench initialCode={null} task={{ ...task, id: 'js-narrow-puzzle', puzzle }} session="test-session" locked={null} signedIn mode="section" />
  </LanguageProvider></MemoryRouter>,
);

it('offers the editor beside a puzzle, and an earlier choice of the editor opens it straight away', () => {
  mountPuzzle();
  expect(screen.getByRole('button', { name: /Check the order/ })).toBeVisible();
  expect(screen.getByLabelText('Test editor')).not.toBeVisible();
  // The puzzle needs no runner (V3-4).
  expect(warmRunner).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Use the editor on this screen' }));
  expect(warmRunner).toHaveBeenCalledWith('javascript');
  const editor = screen.getByLabelText('Test editor');
  expect(editor).toBeVisible();
  expect(screen.getByRole('button', { name: 'Submit' })).toBeVisible();
  expect(screen.queryByRole('button', { name: /Check the order/ })).toBeNull();
  expect(document.activeElement).toBe(editor.closest('.cd-pane--editor'));

  cleanup();
  mountPuzzle();
  expect(screen.getByLabelText('Test editor')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Submit' })).toBeVisible();
});

// CODE-11: an accepted order is never recorded, for anyone, so a signed-in
// learner was wrongly told to sign in to keep it.
it('does not tell a signed-in learner to sign in after an accepted order', async () => {
  vi.mocked(submitCoding).mockResolvedValue({
    verdict: 'passed', results: [], hidden: null, check: null, logs: [], codeError: null, design: null, designReference: null,
    failureHint: null, puzzle: { accepted: true, competencies: ['sequence'], claim: { en: 'Arranged correctly.', cs: 'Seřazeno.' } },
    progress: null, firstPass: false, xpAwarded: 0, xpForfeited: false, applied: false, github: null, solutions: null,
  });
  mountPuzzle();
  fireEvent.click(screen.getByRole('button', { name: /Check the order/ }));
  expect(await screen.findByRole('heading', { level: 3, name: 'That order works.' })).toBeVisible();
  expect(screen.getByText('Arranged correctly.')).toBeVisible();
  expect(screen.queryByText('Checked, not recorded: sign in to keep passes.')).toBeNull();
});
