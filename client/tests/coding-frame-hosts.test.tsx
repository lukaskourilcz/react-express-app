// One code shell wherever a task opens (UX audit coding-03): a Learn level's
// coding phase and a path's code activity widen the route box while their
// editor is mounted, and the code activity sits in the workbench's frame with
// the shared editor floor.
import { expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { LanguageProvider } from '../src/i18n/LanguageContext';

vi.mock('../src/coding/Editor', () => ({
  Editor: ({ ariaLabel, fill, minHeight }: { ariaLabel: string; fill?: boolean; minHeight?: number }) =>
    <textarea aria-label={ariaLabel} data-fill={String(Boolean(fill))} data-min={minHeight ?? 'token'} />,
}));

const source = (path: string) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');

it('puts a path code activity in the workbench frame, on the wide page, with the shared editor floor', async () => {
  const { CodeActivity } = await import('../src/components/paths/ActivityViews');
  const { container } = render(
    <LanguageProvider>
      <CodeActivity code={{ language: 'javascript', prompt: 'Sum it.', starter: '', hints: ['Start at zero.'], approach: [], tests: [{ call: 'sum([1])', label: 'one value' }] } as never}
        draft={null} result={null} onSubmit={() => {}} onDraft={() => {}} draftStatus="idle" busy={false} />
    </LanguageProvider>,
  );
  const root = container.firstElementChild!;
  expect(root).toHaveClass('ss-wide-page', 'cd-workbench', 'cd-workbench--activity');
  const grid = root.querySelector(':scope > .cd-workbench__grid')!;
  const code = grid.querySelector(':scope > .cd-pane--editor')!;
  const beside = grid.querySelector(':scope > .cd-pane--output')!;
  // The code pane: the capped brief, the editor, the actions at its foot.
  expect(code.firstElementChild).toHaveClass('cd-brief');
  expect(code.lastElementChild).toHaveClass('cd-editor-actions');
  const editor = await screen.findByRole('textbox', { name: 'Your solution' });
  expect(code).toContainElement(editor);
  expect(editor).toHaveAttribute('data-fill', 'true');
  expect(editor).toHaveAttribute('data-min', 'token');
  expect(code.querySelector('.cd-editor-actions')).toContainElement(screen.getByRole('button', { name: 'Submit' }));
  // Hints and the visible tests sit beside it.
  expect(beside).toContainElement(screen.getByRole('heading', { name: 'Hints' }));
  expect(beside).toContainElement(screen.getByRole('heading', { name: 'Tests you can see' }));
});

it('widens the Learn level runner only for its coding phase', () => {
  const runner = source('components/learn/LessonRunner.tsx');
  const phase = runner.slice(runner.indexOf('if (codingPhase && codingTasks[codingIndex])'));
  expect(phase.slice(0, 1200)).toContain('className="cd-page ss-wide-page"');
  expect(runner.match(/ss-wide-page/g)?.filter(Boolean)).toHaveLength(2);
});

it('gives every editor call site the shared floor instead of a number of its own', () => {
  expect(source('coding/Editor.tsx')).toContain("const EDITOR_MIN = 'var(--cd-editor-min, 280px)';");
  expect(source('components/paths/ActivityViews.tsx')).not.toMatch(/minHeight=\{\d+\}/);
  expect(source('coding/CodingWorkbench.tsx')).not.toMatch(/narrow \? 280 : 480/);
  const css = source('coding/Coding.css');
  expect(css).toContain('--cd-editor-min: 280px;');
  expect(css).toMatch(/@media \(min-width: 1024px\) \{\s*:root \{ --cd-editor-min: 240px; \}/);
});
