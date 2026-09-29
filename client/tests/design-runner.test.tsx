// A system-design submission that fails says which answers were wrong and
// nothing of the key: the server sends no correct option and no explanation
// until a pass, and the runner does not invent them. A pass shows the whole
// walkthrough.
import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { DesignRunner } from '../src/coding/DesignRunner';
import { submitCoding } from '../src/coding/api';
import type { CodingVerdictResponse, DesignStepVerdict } from '../../shared/coding-api';
import type { PlayableCodingTask } from '../../shared/coding-catalog';

vi.mock('../src/coding/api', () => ({ submitCoding: vi.fn() }));

const loc = (en: string) => ({ en, cs: en });
const task: PlayableCodingTask = {
  id: 'sd-test-shortener', track: 'system-design', level: 0, tier: 2, difficulty: 'medium',
  focus: ['scoping'], title: loc('Test shortener'), prompt: loc('Design it.'), starter: '',
  hints: { en: [], cs: [] }, verify: 'guided', estimatedMinutes: 10,
  design: {
    scenario: loc('Short links for a newsletter.'), brief: loc('Keep the read path small.'), passMark: 2,
    steps: [
      { key: 'requirements', title: loc('What are we building'), prompt: loc('What matters most?'), options: [loc('Reads dominate'), loc('Custom aliases')] },
      { key: 'data', title: loc('What we store'), prompt: loc('One row holds?'), options: [loc('Code and destination'), loc('Only the code')] },
      { key: 'scale', title: loc('What breaks first'), prompt: loc('The first step?'), options: [loc('A cache'), loc('Sharding')] },
    ],
  },
};
// The body api/quiz/roadmap.ts sends for resource=coding-submit on a design task.
const verdict = (extra: Partial<CodingVerdictResponse>): CodingVerdictResponse => ({
  verdict: 'failed', results: [], hidden: null, check: null, logs: [], codeError: null,
  design: null, designReference: null, failureHint: null, puzzle: null,
  progress: { status: 'in_progress', passes: 0, reviewStage: 0, nextReviewAt: null, revealCount: 0, bestPassedAt: null },
  firstPass: false, xpAwarded: 0, xpForfeited: false, applied: true, github: null, solutions: null, ...extra,
});

function mount(onRetry = vi.fn()) {
  render(
    <MemoryRouter>
      <LanguageProvider>
        <DesignRunner task={task} session="design-session" locked={null} signedIn mode="section" onRetry={onRetry} />
      </LanguageProvider>
    </MemoryRouter>,
  );
  return onRetry;
}

/** Answers the three questions: the first option, then the second, then the first. */
async function answerAndSubmit() {
  fireEvent.click(screen.getByRole('radio', { name: 'Reads dominate' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
  fireEvent.click(screen.getByRole('radio', { name: 'Only the code' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
  fireEvent.click(screen.getByRole('radio', { name: 'A cache' }));
  fireEvent.click(screen.getByRole('button', { name: 'Submit answers' }));
  // The verdict's heading; each question has one of its own until then.
  return screen.findByRole('heading', { level: 3, name: /^(Passed|Failed)/ });
}

it('after a failed submit shows which answers were wrong and the learner\'s own answers, and offers another try', async () => {
  const failed: DesignStepVerdict[] = [{ correct: true, given: 0 }, { correct: false, given: 1 }, { correct: false, given: 0 }];
  vi.mocked(submitCoding).mockResolvedValue(verdict({ design: failed }));
  const onRetry = mount();
  expect(await answerAndSubmit()).toHaveTextContent('Failed');
  expect(submitCoding).toHaveBeenCalledWith({ session: 'design-session', answers: [0, 1, 0] });
  expect(screen.getByText('1 of 3 correct · Pass mark: 2 of 3')).toBeVisible();
  expect(screen.getByText('The correct answers and explanations appear once you pass. Try again: the options come back in a new order.')).toBeVisible();
  const steps = document.querySelectorAll('.cd-review__step');
  expect(steps).toHaveLength(3);
  expect(steps[0]).toHaveTextContent('Correct');
  expect(steps[0]).toHaveTextContent('Your answer: Reads dominate');
  expect(steps[1]).toHaveTextContent('Not this one');
  expect(steps[1]).toHaveTextContent('Your answer: Only the code');
  expect(steps[2]).toHaveTextContent('Your answer: A cache');
  // Nothing names the right option for a wrong step, and no reference opens.
  expect(screen.queryByText('Code and destination')).toBeNull();
  expect(screen.queryByText('Sharding')).toBeNull();
  expect(screen.queryByText('How the whole answer sounds')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(onRetry).toHaveBeenCalledTimes(1);
});

it('after a pass shows the whole walkthrough: the right options, the explanations and the reference', async () => {
  const passed: DesignStepVerdict[] = [
    { correct: true, given: 0, correctIndex: 0, explanation: loc('Redirects outnumber creations.') },
    { correct: false, given: 1, correctIndex: 0, explanation: loc('The redirect needs the destination.') },
    { correct: true, given: 0, correctIndex: 0, explanation: loc('A cache absorbs a hotspot.') },
  ];
  vi.mocked(submitCoding).mockResolvedValue(verdict({
    verdict: 'passed', design: passed, designReference: loc('Two operations, one table.'), firstPass: true, xpAwarded: 35,
    progress: { status: 'passed', passes: 1, reviewStage: 0, nextReviewAt: null, revealCount: 0, bestPassedAt: '2026-09-29T09:00:00Z' },
  }));
  mount();
  const heading = await answerAndSubmit();
  expect(heading).toHaveTextContent('Passed');
  expect(heading).toHaveTextContent('+35 XP');
  expect(screen.queryByText(/appear once you pass/)).toBeNull();
  const steps = document.querySelectorAll('.cd-review__step');
  expect(steps[1]).toHaveTextContent('Correct: Code and destination');
  expect(steps[1]).toHaveTextContent('Only the code');
  expect(screen.getByText('The redirect needs the destination.')).toBeInTheDocument();
  expect(screen.getByText('How the whole answer sounds')).toBeInTheDocument();
  expect(screen.getByText('Two operations, one table.')).toBeInTheDocument();
});

it('after a missed estimate shows the learner\'s figure and no accepted range', async () => {
  const drill: PlayableCodingTask = {
    ...task, id: 'dd-test-estimate', verify: 'drill', design: undefined,
    drill: { format: 'estimate', scenario: loc('A launch day.'), prompt: loc('Requests per second at the peak?'), unit: loc('requests per second') },
  };
  vi.mocked(submitCoding).mockResolvedValue(verdict({ design: [{ correct: false, given: 90000 }] }));
  render(<MemoryRouter><LanguageProvider><DesignRunner task={drill} session="drill-session" locked={null} signedIn mode="section" onRetry={vi.fn()} /></LanguageProvider></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('Your estimate'), { target: { value: '90000' } });
  fireEvent.click(screen.getByRole('button', { name: 'Submit answers' }));
  expect(await screen.findByRole('heading', { level: 3, name: 'Failed' })).toBeVisible();
  expect(submitCoding).toHaveBeenCalledWith({ session: 'drill-session', answers: [90000] });
  expect(document.querySelector('.cd-review__step')).toHaveTextContent('Your answer: 90,000 requests per second');
  expect(screen.queryByText(/counts; the worked figure/)).toBeNull();
});

it('says a pass after a revealed solution earned no XP', async () => {
  vi.mocked(submitCoding).mockResolvedValue(verdict({
    verdict: 'passed', firstPass: true, xpAwarded: 0, xpForfeited: true,
    design: [0, 1, 2].map((index) => ({ correct: true, given: 0, correctIndex: 0, explanation: loc(`Because ${index}.`) })),
  }));
  mount();
  const heading = await answerAndSubmit();
  expect(heading).toHaveTextContent('Passed — no XP because the solution was revealed');
  expect(heading).not.toHaveTextContent('+');
});
