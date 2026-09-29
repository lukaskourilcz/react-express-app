// A learning-path check states the rule the server grades it by.
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { CheckActivity } from '../src/components/paths/ActivityViews';
import type { CheckQuestionPayload, SubmitActivityResponse } from '../../shared/learning-path-api';

const loc = (en: string) => ({ en, cs: '' });
const QUESTIONS: CheckQuestionPayload[] = [
  { id: 'q1', prompt: loc('Which growth class?'), options: [loc('O(n)'), loc('O(n²)')], domain: 'complexity', competencies: [] },
  { id: 'q2', prompt: loc('Which structure?'), options: [loc('A stack'), loc('A queue')], domain: 'structures', competencies: [] },
];

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
