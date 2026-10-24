// The Coding task screen loads its workbench beside the task. When that code
// does not load, the screen's own Try again asks for it again in place, and a
// press that meets the same chunk failure reloads the page, as the route
// boundary's Try again does: Chromium up to 155 and Safari remember a failed
// module fetch, so asking again in place fails at once there.
import { beforeEach, expect, it, vi } from 'vitest';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const state = vi.hoisted(() => ({
  /** The outcome of each load of the workbench's code; the last one repeats. */
  outcomes: ['load'] as ('fail' | 'load')[],
  loads: 0,
  /** Loads of the editor's code. */
  editorImports: 0,
  reloadOnPress: vi.fn(async () => true),
}));

// The workbench's loader, as routeChunk builds it: each call takes the next
// outcome, and a failure is the error Chromium reports for a chunk.
vi.mock('../src/lib/routePreload', () => ({
  routeChunk: (_matches: unknown, load: () => Promise<unknown>) => () => {
    state.loads += 1;
    const outcome = state.outcomes.length > 1 ? state.outcomes.shift() : state.outcomes[0];
    return outcome === 'fail'
      ? Promise.reject(new TypeError('Failed to fetch dynamically imported module: http://localhost:3000/assets/CodingWorkbench-AAAA.js'))
      : load();
  },
}));
vi.mock('../src/lib/routeRecovery', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/lib/routeRecovery')>()),
  reloadOnPress: state.reloadOnPress,
}));
vi.mock('../src/lib/auth', () => ({ useAuth: () => ({ isAuthenticated: false }) }));
vi.mock('../src/coding/practice', () => ({
  useBookmarks: () => ({ data: { saved: [] } }),
  useSaveChallenge: () => ({ mutate: vi.fn() }),
  usePracticeSession: () => ({ data: { session: null } }),
  useAdvanceSession: () => ({ mutate: vi.fn() }),
}));
vi.mock('../src/coding/api', () => ({
  codingKeys: { task: (id: string) => ['task', id], progress: () => ['progress'] },
  saveCodingDraft: vi.fn(),
  useCodingProgress: () => ({ data: undefined }),
  useCodingTask: (id: string) => ({
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    data: { task: { id, track: 'javascript', starter: '// starter' }, draft: null, signedIn: false, locked: null, session: 'session' },
  }),
}));
vi.mock('../src/coding/CodingWorkbench', () => ({ CodingWorkbench: () => <p>the workbench</p> }));
vi.mock('../src/coding/Editor', () => ({ Editor: () => null }));
vi.mock('../src/coding/loadEditor', async (importOriginal) => {
  const real = await importOriginal<typeof import('../src/coding/loadEditor')>();
  return { ...real, loadEditor: () => { state.editorImports += 1; return real.loadEditor(); } };
});

beforeEach(() => {
  // CodingSection keeps a loaded workbench for the page's lifetime: each test
  // is a fresh page.
  vi.resetModules();
  state.loads = 0;
  state.editorImports = 0;
  state.reloadOnPress.mockReset();
  state.reloadOnPress.mockResolvedValue(true);
});

async function mount() {
  const { LanguageProvider } = await import('../src/i18n/LanguageContext');
  const { CodingTaskScreen } = await import('../src/components/coding/CodingSection');
  await act(async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/coding/javascript/js-double-numbers']}>
          <LanguageProvider>
            <Routes><Route path="/coding/:track/:taskId" element={<CodingTaskScreen />} /></Routes>
          </LanguageProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  });
}
const tryAgain = async () => {
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Try again' })));
};

it('asks again in place and draws the workbench when the load works, reloading nothing', async () => {
  state.outcomes = ['fail', 'load'];
  await mount();
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load this task.');
  await tryAgain();
  expect(await screen.findByText('the workbench')).toBeInTheDocument();
  expect(state.loads).toBe(2);
  expect(state.reloadOnPress).not.toHaveBeenCalled();
});

it('reloads on the press when the same failure comes straight back, and stays busy for it', async () => {
  state.outcomes = ['fail'];
  await mount();
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load this task.');
  // The first load never reloads: nobody pressed anything.
  expect(state.reloadOnPress).not.toHaveBeenCalled();
  await tryAgain();
  await vi.waitFor(() => expect(state.reloadOnPress).toHaveBeenCalledTimes(1));
  const button = screen.getByRole('button', { name: 'Try again' });
  expect(button).toHaveAttribute('aria-busy', 'true');
  // A second press while the page reloads asks for nothing more.
  await tryAgain();
  expect(state.loads).toBe(2);
  expect(state.reloadOnPress).toHaveBeenCalledTimes(1);
});

it('gives the button back when no reload starts, offline or with the server unreachable', async () => {
  state.outcomes = ['fail'];
  state.reloadOnPress.mockResolvedValue(false);
  await mount();
  await screen.findByRole('alert');
  await tryAgain();
  await vi.waitFor(() => expect(state.reloadOnPress).toHaveBeenCalledTimes(1));
  await vi.waitFor(() => expect(screen.getByRole('button', { name: 'Try again' })).not.toHaveAttribute('aria-busy'));
  expect(screen.getByRole('alert')).toHaveTextContent('Could not load this task.');
});

// The lists warmed the workbench (with CodeMirror, about 190 kB gzipped)
// once the browser was idle, even for a visitor who asked it to save data; the
// runner already waits for their first Run instead. Since perf baseline #587
// C03 the warm-up leaves CodeMirror (about 170 kB of it) to the task.
it('warms the workbench from a list only when the browser is not saving data, and never the editor', async () => {
  vi.stubGlobal('requestIdleCallback', (run: () => void) => { run(); return 1; });
  vi.stubGlobal('cancelIdleCallback', () => {});
  vi.stubGlobal('navigator', { ...navigator, connection: { saveData: true } });
  try {
    const { useWarmWorkbench } = await import('../src/coding/loadWorkbench');
    renderHook(() => useWarmWorkbench()).unmount();
    expect(state.loads).toBe(0);
    vi.stubGlobal('navigator', { ...navigator, connection: { saveData: false } });
    renderHook(() => useWarmWorkbench()).unmount();
    expect(state.loads).toBe(1);
    expect(state.editorImports).toBe(0);
  } finally {
    vi.unstubAllGlobals();
  }
});

// C12: a task opened on a wide screen fetches the editor beside the
// workbench and draws once both are in; on a phone that shows the puzzle or
// the "bigger screen" note it does not fetch the editor at all.
it('loads the editor beside the workbench on a wide screen only', async () => {
  state.outcomes = ['load'];
  await mount();
  expect(await screen.findByText('the workbench')).toBeInTheDocument();
  expect(state.editorImports).toBe(1);
});

it('opens a task on a phone without fetching the editor', async () => {
  state.outcomes = ['load'];
  vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
    matches: query === '(max-width: 1023.95px)', media: query, onchange: null,
    addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
  }) as MediaQueryList);
  try {
    await mount();
    expect(await screen.findByText('the workbench')).toBeInTheDocument();
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
    expect(state.editorImports).toBe(0);
  } finally {
    vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
      matches: false, media: query, onchange: null,
      addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
    }) as MediaQueryList);
  }
});
