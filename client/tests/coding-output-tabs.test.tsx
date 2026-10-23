// The results pane's tabs (UX audit coding-04): one order on every track, so
// the shared tabs keep their place, and React opens on Results like the rest,
// with an empty preview that takes no room until a run draws into it.
import { beforeEach, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { CodingWorkbench } from '../src/coding/CodingWorkbench';
import type { HarnessRun } from '../src/coding/useReactHarness';
import type { PlayableCodingTask } from '../../shared/coding-catalog';

vi.mock('../src/coding/Editor', () => ({ Editor: () => <textarea aria-label="Test editor" /> }));
vi.mock('../src/coding/api', () => ({ useCodingApproaches: () => ({ data: undefined }), submitCoding: vi.fn(), revealCoding: vi.fn(), resetCoding: vi.fn() }));
vi.mock('../src/coding/runner/run-tests', () => ({ warmRunner: () => undefined, runCodeTests: vi.fn(), runPassed: () => false }));
const harness = vi.hoisted(() => {
  const handle: { ready: boolean; run: HarnessRun | null; start: () => Promise<HarnessRun>; reload: () => void; iframeRef: () => void; frameKey: number } = {
    ready: true, run: null, reload: () => {}, iframeRef: () => {}, frameKey: 0,
    start: async () => {
      handle.run = { token: 'local', status: 'done', compileError: null, previewError: null, cases: [{ name: 'greets', status: 'pass', error: null, durationMs: 0 }], logs: [], passed: 1, failed: 0, total: 1, ran: true };
      return handle.run;
    },
  };
  return handle;
});
vi.mock('../src/coding/useReactHarness', () => ({ HARNESS_URL: '/sandbox/index.html', useReactHarness: () => harness }));

const base = { level: 1, tier: 1, difficulty: 'easy' as const, focus: [] as string[], title: 'Task', prompt: 'Do it.', starter: 'x', hints: [] as string[], verify: 'tests' as const, estimatedMinutes: 5 };
const tasks: Record<'javascript' | 'typescript' | 'react', PlayableCodingTask> = {
  javascript: { ...base, id: 'js-tabs', track: 'javascript', tests: [{ call: 'f()', expected: 1 }] } as PlayableCodingTask,
  typescript: { ...base, id: 'ts-tabs', track: 'typescript', tests: [{ call: 'f()', expected: 1 }], typeTests: [{ code: 'f(1)', rejects: true }] } as PlayableCodingTask,
  react: { ...base, id: 'react-tabs', track: 'react', suite: 'test("greets", () => {});' } as PlayableCodingTask,
};
const mount = (track: keyof typeof tasks) => render(
  <MemoryRouter><LanguageProvider>
    <CodingWorkbench task={tasks[track]} initialCode={null} session="s" locked={null} signedIn mode="section" />
  </LanguageProvider></MemoryRouter>,
);
const tabNames = () => screen.getAllByRole('tab').map((tab) => tab.textContent?.replace(/\d+(\/\d+)?$/, '').trim());

beforeEach(() => { harness.run = null; });

it('keeps Results, Console, the track tab, then Resources on every track', () => {
  const javascript = mount('javascript');
  expect(tabNames()).toEqual(['Results', 'Console', 'Resources']);
  javascript.unmount();
  const typescript = mount('typescript');
  expect(tabNames()).toEqual(['Results', 'Console', 'Types', 'Resources']);
  typescript.unmount();
  mount('react');
  expect(tabNames()).toEqual(['Results', 'Console', 'Preview', 'Resources']);
});

it('opens React on Results, keeps the empty preview to one line, and shows the preview after the first Run that renders', async () => {
  const { container } = mount('react');
  expect(screen.getByRole('tab', { name: 'Results' })).toHaveAttribute('aria-selected', 'true');
  fireEvent.click(screen.getByRole('tab', { name: 'Preview' }));
  const panel = screen.getByRole('tabpanel', { name: 'Preview' });
  expect(within(panel).getByText('Run to see the component.')).toBeInTheDocument();
  const frame = container.querySelector('iframe')!;
  expect(frame).toHaveClass('cd-frame--idle');
  expect(frame).toHaveAttribute('aria-hidden', 'true');
  fireEvent.click(screen.getByRole('tab', { name: 'Results' }));

  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Run' })); });
  expect(screen.getByRole('tab', { name: 'Preview' })).toHaveAttribute('aria-selected', 'true');
  expect(frame).not.toHaveClass('cd-frame--idle');
  expect(screen.queryByText('Run to see the component.')).toBeNull();

  // Later runs go back to the checks the learner has to pass.
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Run' })); });
  expect(screen.getByRole('tab', { name: /Results/ })).toHaveAttribute('aria-selected', 'true');
});
