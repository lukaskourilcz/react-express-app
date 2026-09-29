// A learning-path check states the rule the server grades it by, and shows a
// graded attempt the way the server returned it: a practice check with its
// key and explanations, a failed project check with only what was wrong.
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { CheckActivity } from '../src/components/paths/ActivityViews';
import type { CheckQuestionPayload, SubmitActivityResponse } from '../../shared/learning-path-api';

const loc = (en: string) => ({ en, cs: '' });
const QUESTIONS: CheckQuestionPayload[] = [
  { id: 'q1', prompt: loc('Which growth class?'), options: [loc('O(n)'), loc('O(n²)')], domain: 'complexity', competencies: [] },
  { id: 'q2', prompt: loc('Which structure?'), options: [loc('A stack'), loc('A queue')], domain: 'structures', competencies: [] },
];

const graded = (questions: SubmitActivityResponse['questions'], state: 'verified_pass' | 'needs_revision'): SubmitActivityResponse => ({
  activityId: 'check', state, verification: 'machine_verified', score: 0.5, criteria: [], questions, code: null,
  feedback: [], module: null, guidedComplete: false, nextActivityId: null, replayed: false, xpAwarded: 0,
});

function renderCheck(props: { domains?: string[]; domainThreshold?: number; result?: SubmitActivityResponse | null }) {
  return render(
    <LanguageProvider>
      <CheckActivity
        questions={QUESTIONS}
        passThreshold={0.8}
        domains={props.domains}
        domainThreshold={props.domainThreshold}
        result={props.result ?? null}
        onSubmit={() => {}}
        onRetry={() => {}}
        busy={false}
      />
    </LanguageProvider>,
  );
}

describe('the rule a check states', () => {
  it('says each area of the DSA final needs half of its own questions, beside 80% overall', () => {
    renderCheck({ domains: ['complexity', 'structures'], domainThreshold: 0.5 });
    expect(screen.getByText(/You need 80% of these right to pass\./)).toBeInTheDocument();
    expect(screen.getByText(/Each area also needs at least 50% of its own questions right/)).toBeInTheDocument();
  });

  it('says nothing about areas on a check without them', () => {
    renderCheck({});
    expect(screen.queryByText(/Each area also needs/)).toBeNull();
  });
});

describe('a graded check', () => {
  /** Answer both questions (the first option each), then hand the result over. */
  function answerAndGrade(result: SubmitActivityResponse) {
    const view = renderCheck({});
    for (const name of ['O(n)', 'A stack']) fireEvent.click(screen.getByRole('radio', { name }));
    view.rerender(
      <LanguageProvider>
        <CheckActivity questions={QUESTIONS} passThreshold={0.8} domains={undefined} result={result} onSubmit={() => {}} onRetry={() => {}} busy={false} />
      </LanguageProvider>,
    );
  }
  const question = (prompt: RegExp) => screen.getByRole('group', { name: prompt });

  it('shows a practice check its correct options and explanations after a miss', () => {
    answerAndGrade(graded([
      { questionId: 'q1', correct: true, correctIndex: 0, explanation: loc('One pass over the input.') },
      { questionId: 'q2', correct: false, correctIndex: 1, explanation: loc('First in, first out.') },
    ], 'needs_revision'));
    expect(within(question(/Which structure\?/)).getByText(/A queue/).closest('label')).toHaveClass('lp-option--correct');
    expect(within(question(/Which structure\?/)).getByText(/A stack/).closest('label')).toHaveClass('lp-option--wrong');
    expect(screen.getByText('First in, first out.')).toBeInTheDocument();
    expect(screen.queryByText(/appear once you pass this check/)).toBeNull();
  });

  it('marks only what was wrong after a failed project check, and names no correct option', () => {
    answerAndGrade(graded([
      { questionId: 'q1', correct: true },
      { questionId: 'q2', correct: false },
    ], 'needs_revision'));
    const missed = question(/Which structure\?/);
    expect(within(missed).getByText(/A stack/).closest('label')).toHaveClass('lp-option--wrong');
    expect(within(missed).getByText(/A queue/).closest('label')).not.toHaveClass('lp-option--correct');
    expect(within(missed).queryByText(/— the correct answer/)).toBeNull();
    expect(within(missed).getByText('Not this one. The correct answer and its explanation appear once you pass this check.')).toBeInTheDocument();
    // The learner's own right answer is still marked right.
    const right = question(/Which growth class\?/);
    expect(within(right).getByText(/O\(n\)$/).closest('label')).toHaveClass('lp-option--correct');
    expect(within(right).queryByText(/appear once you pass/)).toBeNull();
  });

  it('shows the key and every explanation once the project check is passed', () => {
    answerAndGrade(graded([
      { questionId: 'q1', correct: true, correctIndex: 0, explanation: loc('One pass over the input.') },
      { questionId: 'q2', correct: false, correctIndex: 1, explanation: loc('First in, first out.') },
    ], 'verified_pass'));
    expect(screen.getByText('One pass over the input.')).toBeInTheDocument();
    expect(screen.getByText('First in, first out.')).toBeInTheDocument();
    expect(within(question(/Which structure\?/)).getByText(/A queue/).closest('label')).toHaveClass('lp-option--correct');
  });
});
