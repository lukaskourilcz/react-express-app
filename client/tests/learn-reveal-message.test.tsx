// Inside a Learn level, Roadmap.tsx tells the learner where the solution they
// asked for is: "open under the hints" (coding.lesson.solutionShown). This
// holds the workbench to that: after a reveal in a level, the reference
// solution is in the hints group, and there is no Solution tab (C3-14).
import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { en } from '../src/i18n/translations';
import { CodingWorkbench } from '../src/coding/CodingWorkbench';
import { revealCoding } from '../src/coding/api';
import type { PlayableCodingTask } from '../../shared/coding-catalog';

vi.mock('../src/coding/Editor', () => ({
  Editor: ({ value, onChange }: { value: string; onChange: (value: string) => void }) =>
    <textarea aria-label="Test editor" value={value} onChange={(event) => onChange(event.target.value)} />,
}));
vi.mock('../src/coding/api', () => ({ useCodingApproaches: () => ({ data: undefined }), submitCoding: vi.fn(), revealCoding: vi.fn() }));

const task: PlayableCodingTask = {
  id: 'js-test-lesson-reveal', track: 'javascript', level: 1, tier: 2, difficulty: 'easy',
  focus: ['functions'], title: { en: 'Test task', cs: '' },
  prompt: { en: 'Return one.', cs: '' },
  starter: 'const one = () => 0;\n', hints: { en: ['Use a function.'], cs: [] },
  verify: 'tests', estimatedMinutes: 5, tests: [{ call: 'one()', expected: 1 }],
};

it('shows a revealed solution under the hints in a level, where the Learn message says it is', async () => {
  vi.mocked(revealCoding).mockResolvedValue({ solution: 'const one = () => 1;', reference: null, progress: null });
  render(
    <MemoryRouter>
      <LanguageProvider>
        <CodingWorkbench task={task} session="test-session" locked={null} initialCode={null} signedIn mode="lesson" progress={null} />
      </LanguageProvider>
    </MemoryRouter>,
  );
  // The two rungs the solution waits for, after a minute of editing.
  const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 61_000);
  fireEvent.change(screen.getByLabelText('Test editor'), { target: { value: 'const one = () => 2;' } });
  fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next hint' }));
  clock.mockRestore();
  fireEvent.click(screen.getByRole('button', { name: 'Solution' }));
  fireEvent.click(within(screen.getByRole('alertdialog', { name: 'Solution' })).getByRole('button', { name: 'Solution' }));

  const solution = await screen.findByText('const one = () => 1;');
  const hints = screen.getByRole('group', { name: 'Hint' });
  expect(hints).toContainElement(solution);
  expect(within(hints).getByText(en['coding.solutionTitle'])).toBeInTheDocument();
  expect(en['coding.lesson.solutionShown']).toMatch(new RegExp(`^The ${en['coding.solutionTitle'].toLowerCase()} is open under the hints\\.`));
  expect(screen.queryByRole('tab', { name: /Solution/ })).toBeNull();
});
