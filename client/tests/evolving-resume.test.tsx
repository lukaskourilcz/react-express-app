import { useState } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { CodingTaskScreen } from '../src/components/coding/CodingSection';
import type { CodingWorkbenchProps } from '../src/coding/CodingWorkbench';
import { EVOLVING_CHALLENGES, evolvingTaskTrack } from '../../shared/evolving';
import { FULLSTACK_REACT_SCAFFOLD } from '../../shared/coding-fullstack-support';

const mocks = vi.hoisted(() => ({ drafts: {} as Record<string, string>, save: vi.fn(async () => {}) }));
vi.mock('../src/lib/auth', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock('../src/coding/practice', () => ({
  useBookmarks: () => ({ data: { saved: [] } }),
  useSaveChallenge: () => ({ mutate: vi.fn() }),
}));
vi.mock('../src/coding/api', () => ({
  codingKeys: { task: (id: string) => ['task', id], progress: () => ['progress'] },
  saveCodingDraft: mocks.save,
  useCodingProgress: () => ({ data: undefined }),
  useCodingTask: (id: string) => ({ data: {
    task: { id, track: id.startsWith('js-') ? 'javascript' : id.startsWith('ts-') ? 'typescript' : 'react', starter: '// starter' },
    draft: mocks.drafts[id] ?? null, signedIn: true, locked: null, session: 'session',
  } }),
}));
vi.mock('../src/coding/CodingWorkbench', () => ({
  CodingWorkbench: ({ initialCode, task, onDraft, onVerdict, nextHref }: CodingWorkbenchProps) => {
    const [code, setCode] = useState(initialCode ?? task.starter);
    return <>
      <textarea aria-label="Stage code" value={code} onChange={event => setCode(event.target.value)} />
      <button onClick={() => onDraft?.(code)}>Save draft</button>
      <button onClick={() => onVerdict?.({ verdict: 'passed' } as Parameters<NonNullable<CodingWorkbenchProps['onVerdict']>>[0], code)}>Pass stage</button>
      {nextHref && <Link to={nextHref}>Next stage</Link>}
    </>;
  },
}));

const key = (id: string) => `devshark:coding:draft:${id}`;
function mount(id: string) {
  const client = new QueryClient();
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[`/coding/${evolvingTaskTrack(id)}/${id}`]}><LanguageProvider><Routes><Route path="/coding/:track/:taskId" element={<CodingTaskScreen />} /></Routes></LanguageProvider></MemoryRouter></QueryClientProvider>);
  return client;
}
beforeEach(() => { mocks.drafts = {}; mocks.save.mockClear(); });

it.each(EVOLVING_CHALLENGES.map(project => [project.id, project] as const))('finishes every stage of %s without losing the draft', (_id, project) => {
  mount(project.stages[0]);
  for (const [index, id] of project.stages.entries()) {
    const code = `// completed ${id}`;
    fireEvent.change(screen.getByLabelText('Stage code'), {target:{value:code}});
    fireEvent.click(screen.getByText('Pass stage'));
    if (index === project.stages.length - 1) break;
    fireEvent.click(screen.getByText('Next stage'));
    const crossesToReact = project.category === 'fullstack' && !id.startsWith('react-') && project.stages[index+1].startsWith('react-');
    // A standalone challenge opens every stage on its own starter; a growing
    // project carries the code that just passed.
    expect(screen.getByLabelText('Stage code')).toHaveValue(project.standalone ? '// starter' : code + (crossesToReact ? FULLSTACK_REACT_SCAFFOLD : ''));
  }
  expect(screen.queryByText('Next stage')).toBeNull();
});

it.each(['js-evolving-calculator', 'ts-evolving-result', 'react-evolving-board'])('carries the submitted code into the next %s stage', async prefix => {
  const project = EVOLVING_CHALLENGES.find(item => item.id === prefix)!;
  const [first, second] = project.stages;
  const client = mount(first);
  client.setQueryData(['task', second], { draft: '// stale starter' });
  fireEvent.change(screen.getByLabelText('Stage code'), { target: { value: '// my working implementation' } });
  fireEvent.click(screen.getByText('Save draft'));
  await waitFor(() => expect(mocks.save).toHaveBeenCalled());
  expect(localStorage.getItem(key(first))).toBe('// my working implementation');
  fireEvent.click(screen.getByText('Pass stage'));
  expect(client.getQueryData(['task', second])).toBeUndefined();
  fireEvent.click(screen.getByText('Next stage'));
  expect(screen.getByLabelText('Stage code')).toHaveValue('// my working implementation');
});

it.each(['local', 'server'])('preserves an existing next-stage %s draft', source => {
  const first = 'js-evolving-calculator-1', second = 'js-evolving-calculator-2-start';
  if (source === 'local') localStorage.setItem(key(second), '// further edits');
  else mocks.drafts[second] = '// further edits';
  mount(first);
  fireEvent.change(screen.getByLabelText('Stage code'), { target: { value: '// submitted' } });
  fireEvent.click(screen.getByText('Pass stage'));
  fireEvent.click(screen.getByText('Next stage'));
  expect(screen.getByLabelText('Stage code')).toHaveValue('// further edits');
});

it('keeps the API implementation and appends the React scaffold at the FullStack transition', () => {
  const project = EVOLVING_CHALLENGES.find(item => item.category === 'fullstack')!;
  mount(project.stages[project.stages.findIndex(id => id.startsWith('react-'))-1]);
  fireEvent.change(screen.getByLabelText('Stage code'), { target: { value: '// my API implementation' } });
  fireEvent.click(screen.getByText('Pass stage'));
  fireEvent.click(screen.getByText('Next stage'));
  expect(screen.getByLabelText('Stage code')).toHaveValue('// my API implementation' + FULLSTACK_REACT_SCAFFOLD);
});
