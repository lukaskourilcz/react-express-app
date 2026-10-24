// CodeMirror is its own chunk (perf baseline #587 C03, C12, C21). The
// workbench draws its brief and its controls without it, holds the editor's
// box while it loads, and never imports it at the top: a coding list warms the
// workbench without it, and a phone that shows the puzzle or the "bigger
// screen" note never fetches it.
import { expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { CodingWorkbench } from '../src/coding/CodingWorkbench';
import { NARROW_EDITOR_QUERY, loadedEditor } from '../src/coding/loadEditor';
import type { PlayableCodingTask } from '../../shared/coding-catalog';

const gate = vi.hoisted(() => {
  let open: () => void = () => {};
  const opened = new Promise<void>((resolve) => { open = resolve; });
  return { opened, open: () => open() };
});
vi.mock('../src/coding/Editor', async () => {
  await gate.opened;
  return { Editor: ({ value }: { value: string }) => <textarea aria-label="Test editor" value={value} readOnly /> };
});
vi.mock('../src/coding/api', () => ({ useCodingApproaches: () => ({ data: undefined }), submitCoding: vi.fn(), revealCoding: vi.fn() }));
vi.mock('../src/coding/runner/run-tests', async (importOriginal) => ({
  ...await importOriginal<typeof import('../src/coding/runner/run-tests')>(),
  warmRunner: () => () => {},
}));

const task: PlayableCodingTask = {
  id: 'js-editor-chunk', track: 'javascript', level: 1, tier: 1, difficulty: 'easy',
  focus: ['functions'], title: 'Chunk task', prompt: 'Return one.',
  starter: 'const one = () => 1;\n', hints: [], verify: 'tests', estimatedMinutes: 5, tests: [],
};

it('draws the brief and the controls while the editor loads, in the editor’s own box', async () => {
  const { container } = render(
    <MemoryRouter><LanguageProvider>
      <CodingWorkbench initialCode={null} task={task} session="s" locked={null} signedIn mode="lesson" />
    </LanguageProvider></MemoryRouter>,
  );
  expect(loadedEditor()).toBeNull();
  expect(screen.getByRole('heading', { name: 'Chunk task' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Run' })).toBeInTheDocument();
  const box = container.querySelector('.cd-editor-slot .cd-editor');
  expect(box).toHaveClass('cd-editor--fill');
  expect(box).toHaveStyle({ minHeight: 'var(--cd-editor-min, 280px)' });
  expect(screen.queryByLabelText('Test editor')).toBeNull();
  await act(async () => { gate.open(); await new Promise((resolve) => setTimeout(resolve, 0)); });
  expect(await screen.findByLabelText('Test editor')).toHaveValue(task.starter);
  expect(loadedEditor()).not.toBeNull();
});

it('imports CodeMirror only on demand, never at the top of the workbench or its loader', () => {
  const workbench = readFileSync(new URL('../src/coding/CodingWorkbench.tsx', import.meta.url), 'utf8');
  const loader = readFileSync(new URL('../src/coding/loadWorkbench.ts', import.meta.url), 'utf8');
  for (const source of [workbench, loader]) {
    expect(source).not.toMatch(/^import (?!type )[^;]*from '\.\/Editor';/m);
    expect(source).not.toMatch(/@uiw\/react-codemirror|@codemirror\//);
  }
  // The narrow test that keeps a phone from fetching it is the one the
  // workbench draws by.
  const media = readFileSync(new URL('../src/lib/useMediaQuery.ts', import.meta.url), 'utf8');
  expect(media).toContain(`useMediaQuery('${NARROW_EDITOR_QUERY}')`);
});
