// A learning-path check states the rule the server grades it by, and shows a
// graded attempt the way the server returned it: a practice check with its
// key and explanations, a failed project check with only what was wrong.
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { ArtifactActivity, CheckActivity } from '../src/components/paths/ActivityViews';
import type { CheckQuestionPayload, SubmitActivityResponse } from '../../shared/learning-path-api';

const QUESTIONS: CheckQuestionPayload[] = [
  { id: 'q1', prompt: 'Which growth class?', options: ['O(n)', 'O(n²)'], domain: 'complexity', competencies: [] },
  { id: 'q2', prompt: 'Which structure?', options: ['A stack', 'A queue'], domain: 'structures', competencies: [] },
];

const graded = (questions: SubmitActivityResponse['questions'], state: 'verified_pass' | 'needs_revision'): SubmitActivityResponse => ({
  activityId: 'check', state, verification: 'machine_verified', score: 0.5, criteria: [], questions, code: null,
  feedback: [], module: null, guidedComplete: false, nextActivityId: null, replayed: false, xpAwarded: 0,
});

const SCENARIO_FIRST = 'A support lead says the weekly export is wrong.';
const SCENARIO = `${SCENARIO_FIRST}\n\nYou can read the \`deliveries\` table. Answer in order.`;

function renderCheck(props: { domains?: string[]; domainThreshold?: number; result?: SubmitActivityResponse | null; scenario?: string }) {
  return render(
    <LanguageProvider>
      <CheckActivity
        questions={QUESTIONS}
        scenario={props.scenario}
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
  function answerAndGrade(result: SubmitActivityResponse, scenario?: string) {
    const view = renderCheck({ scenario });
    for (const name of ['O(n)', 'A stack']) fireEvent.click(screen.getByRole('radio', { name }));
    view.rerender(
      <LanguageProvider>
        <CheckActivity questions={QUESTIONS} scenario={scenario} passThreshold={0.8} domains={undefined} result={result} onSubmit={() => {}} onRetry={() => {}} busy={false} />
      </LanguageProvider>,
    );
  }
  const question = (prompt: RegExp) => screen.getByRole('group', { name: prompt });

  it('shows a practice check its correct options and explanations after a miss', () => {
    answerAndGrade(graded([
      { questionId: 'q1', correct: true, correctIndex: 0, explanation: 'One pass over the input.' },
      { questionId: 'q2', correct: false, correctIndex: 1, explanation: 'First in, first out.' },
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
      { questionId: 'q1', correct: true, correctIndex: 0, explanation: 'One pass over the input.' },
      { questionId: 'q2', correct: false, correctIndex: 1, explanation: 'First in, first out.' },
    ], 'verified_pass'));
    expect(screen.getByText('One pass over the input.')).toBeInTheDocument();
    expect(screen.getByText('First in, first out.')).toBeInTheDocument();
    expect(within(question(/Which structure\?/)).getByText(/A queue/).closest('label')).toHaveClass('lp-option--correct');
  });

  /** The scenario region, once, and before the first question in the page. */
  function expectScenarioOnceAboveQuestions() {
    expect(screen.getAllByText(SCENARIO_FIRST)).toHaveLength(1);
    const region = screen.getByRole('region', { name: 'The scenario' });
    expect(within(region).getByText(SCENARIO_FIRST)).toBeInTheDocument();
    expect(region.compareDocumentPosition(question(/Which growth class\?/)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  }

  it('keeps the scenario once above the questions in a practice review', () => {
    answerAndGrade(graded([
      { questionId: 'q1', correct: true, correctIndex: 0, explanation: 'One pass over the input.' },
      { questionId: 'q2', correct: false, correctIndex: 1, explanation: 'First in, first out.' },
    ], 'needs_revision'), SCENARIO);
    expectScenarioOnceAboveQuestions();
  });

  it('keeps the scenario once above the questions when a project review withholds the key', () => {
    answerAndGrade(graded([
      { questionId: 'q1', correct: true },
      { questionId: 'q2', correct: false },
    ], 'needs_revision'), SCENARIO);
    expectScenarioOnceAboveQuestions();
    expect(screen.getByText(/appear once you pass this check/)).toBeInTheDocument();
  });
});

describe('a check with a scenario', () => {
  it('shows the scenario once, above the first question, while answering', () => {
    renderCheck({ scenario: SCENARIO });
    expect(screen.getAllByText(SCENARIO_FIRST)).toHaveLength(1);
    const region = screen.getByRole('region', { name: 'The scenario' });
    const first = screen.getByRole('group', { name: /Which growth class\?/ });
    expect(region.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // Reading text, not a control: the first Tab stop is still the first radio.
    expect(within(region).queryAllByRole('radio')).toHaveLength(0);
  });

  it('renders paragraphs and inline code from the authored text', () => {
    renderCheck({ scenario: SCENARIO });
    const region = screen.getByRole('region', { name: 'The scenario' });
    expect(region.querySelectorAll('p')).toHaveLength(2);
    expect(region.querySelectorAll('code')).toHaveLength(1);
    expect(within(region).getByText('deliveries').tagName).toBe('CODE');
  });

  it('shows no scenario region on a check without one', () => {
    renderCheck({});
    expect(screen.queryByRole('region', { name: 'The scenario' })).toBeNull();
    expect(screen.queryByText('The scenario')).toBeNull();
  });

  it('does not wear the profile picker\'s checkbox class, whose rules dim a disabled check', () => {
    const view = renderCheck({ scenario: SCENARIO });
    const root = view.container.querySelector('.lp-check-view');
    expect(root).not.toBeNull();
    expect(view.container.querySelector('.lp-check')).toBeNull();
  });
});

describe('a written artifact', () => {
  const ARTIFACT = {
    brief: 'Write the handoff.',
    rubricDimensions: [],
    fields: [
      { id: 'risks', label: 'Risks', help: 'One per line.', kind: 'list' as const, required: true, maxLength: 12 },
      { id: 'summary', label: 'Summary', help: 'Two sentences.', kind: 'long-text' as const, required: true, maxLength: 20 },
    ],
  };
  function renderArtifact(onSubmit = vi.fn()) {
    render(
      <LanguageProvider>
        <ArtifactActivity artifact={ARTIFACT} rubric={[]} draft={null} result={null} onSubmit={onSubmit} onDraft={() => {}} draftStatus="idle" busy={false} />
      </LanguageProvider>,
    );
    return onSubmit;
  }

  it('counts a field the way the server caps it, ignoring blank lines and outer spaces', () => {
    const onSubmit = renderArtifact();
    fireEvent.change(screen.getByLabelText(/Risks/), { target: { value: '  scope \n\n\n  data  \n\n' } });
    fireEvent.change(screen.getByLabelText(/Summary/), { target: { value: '   Ship it.   ' } });
    expect(screen.getByText('10 / 12 characters')).toBeInTheDocument();
    expect(screen.getByText('8 / 20 characters')).toBeInTheDocument();
    expect(screen.getByLabelText(/Risks/)).not.toHaveAttribute('aria-invalid');
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onSubmit).toHaveBeenCalledWith({ risks: ['scope', 'data'], summary: '   Ship it.   ' });
  });

  it('does not send a field over its cap and takes the learner to it', () => {
    const onSubmit = renderArtifact();
    fireEvent.change(screen.getByLabelText(/Risks/), { target: { value: 'ok' } });
    fireEvent.change(screen.getByLabelText(/Summary/), { target: { value: 'This summary is far too long.' } });
    const summary = screen.getByLabelText(/Summary/);
    expect(summary).toHaveAttribute('aria-invalid', 'true');
    expect(summary).toHaveAccessibleDescription(/29 \/ 20 characters/);
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(summary);
  });
});
