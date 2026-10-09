// C5-4, through the real workbench: an oversize Submit sent its 21.7 kB code
// as a draft save, which the account refused with 400, and left that copy on
// the device, before saying the code was too large to submit. Now neither
// Submit nor Run saves code the account would refuse; code that fits saves
// as before.
import { beforeAll, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { preloadPath } from '../src/lib/routePreload';
import { CodingTaskScreen } from '../src/components/coding/CodingSection';
import { saveCodingDraft, submitCoding } from '../src/coding/api';
import type { CodingTaskResponse } from '../../shared/coding-api';

vi.mock('../src/lib/auth', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock('../src/coding/Editor', () => ({
  Editor: ({ value, onChange }: { value: string; onChange: (value: string) => void }) =>
    <textarea aria-label="Test editor" value={value} onChange={(event) => onChange(event.target.value)} />,
}));
vi.mock('../src/coding/runner/run-tests', async (importOriginal) => ({
  ...await importOriginal<typeof import('../src/coding/runner/run-tests')>(),
  runCodeTests: vi.fn(async () => ({ results: [{ pass: true, actual: '1', error: null }], logs: [], codeError: null, check: null, timedOut: false })),
}));
vi.mock('../src/coding/practice', () => ({
  useBookmarks: () => ({ data: { saved: [] } }),
  useSaveChallenge: () => ({ mutate: vi.fn() }),
  usePracticeSession: () => ({ data: { session: null } }),
  useAdvanceSession: () => ({ mutate: vi.fn() }),
  skipTask: vi.fn(),
}));
const response = {
  task: {
    id: 'js-test-limit', track: 'javascript', level: 1, tier: 1, difficulty: 'easy', focus: ['functions'],
    title: { en: 'Test task', cs: '' }, prompt: { en: 'Return one.', cs: '' }, starter: 'const one = () => 0;\n',
    hints: { en: [], cs: [] }, verify: 'tests', estimatedMinutes: 5, tests: [{ call: 'one()', expected: 1 }],
  },
  session: 'session-1', locked: null, progress: null, draft: null, draftUpdatedAt: null, signedIn: true,
} as unknown as CodingTaskResponse;
vi.mock('../src/coding/api', () => ({
  codingKeys: { task: (id: string) => ['task', id], progress: () => ['progress'], approaches: (id: string) => ['approaches', id] },
  saveCodingDraft: vi.fn(async () => ({ ok: true })),
  submitCoding: vi.fn(),
  revealCoding: vi.fn(),
  useCodingApproaches: () => ({ data: undefined }),
  useCodingProgress: () => ({ data: undefined }),
  useCodingTask: () => ({ data: response }),
}));

beforeAll(() => preloadPath('/coding/javascript/js-test-limit'));

it('saves no draft for code over 20 kB, on Submit or Run, and saves code that fits', async () => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/coding/javascript/js-test-limit']}>
        <LanguageProvider><Routes><Route path="/coding/:track/:taskId" element={<CodingTaskScreen />} /></Routes></LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  const editor = await screen.findByLabelText('Test editor');
  fireEvent.change(editor, { target: { value: `const one = () => 1;\n// ${'x'.repeat(21 * 1024)}` } });
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Submit' })));
  expect(await screen.findByRole('alert')).toHaveTextContent('Your code is over 20 kB, the most one Submit takes.');
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Run' })));
  expect(saveCodingDraft).not.toHaveBeenCalled();
  expect(submitCoding).not.toHaveBeenCalled();
  expect(localStorage.getItem('devshark:coding:draft:js-test-limit')).toBeNull();

  fireEvent.change(editor, { target: { value: 'const one = () => 1;\n' } });
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Run' })));
  expect(saveCodingDraft).toHaveBeenCalledWith('js-test-limit', 'const one = () => 1;\n');
});
