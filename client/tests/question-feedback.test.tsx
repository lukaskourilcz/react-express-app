// The graded verdict (UX audit U2, questions-01): inline under the answers,
// never positioned over them, and it takes focus when it appears.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { AnswerOptionList, QuestionFeedback, QuestionShell } from '../src/components/question';

const css = readFileSync(new URL('../src/components/question/question.css', import.meta.url), 'utf8');

function graded(autoFocus?: boolean) {
  return (
    <LanguageProvider>
      <QuestionShell questionId="q" question="Which value does typeof null return?">
        <AnswerOptionList options={['"null"', '"object"']} value={0} onChange={() => {}} labelledBy="q" grade={{ correct: 1, picked: 0 }} disabled />
        <QuestionFeedback status="error" title="Not quite" description="typeof null is a historical bug." autoFocus={autoFocus}>
          <button type="button">Save as Shark Card</button>
        </QuestionFeedback>
      </QuestionShell>
    </LanguageProvider>
  );
}

describe('QuestionFeedback', () => {
  it('draws the verdict and explanation after the answers, in the same panel, and takes focus', () => {
    const { container } = render(graded());
    const feedback = container.querySelector('.ss-question-feedback') as HTMLElement;
    const list = screen.getByRole('radiogroup');
    expect(list.compareDocumentPosition(feedback) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(feedback.closest('.ss-question__panel')).toBe(list.closest('.ss-question__panel'));
    expect(screen.getByRole('alert')).toHaveTextContent('Not quite');
    expect(screen.getByRole('alert')).toHaveTextContent('typeof null is a historical bug.');
    expect(feedback).toContainElement(screen.getByRole('button', { name: 'Save as Shark Card' }));
    expect(feedback).toHaveFocus();
  });

  it('leaves focus alone when the runner moves it to Continue', () => {
    render(graded(false));
    expect(document.activeElement).toBe(document.body);
  });

  it('is never positioned over the answers', () => {
    const block = css.match(/\.ss-question-feedback \{[^}]*\}/)?.[0] ?? '';
    expect(block).not.toBe('');
    expect(block).not.toMatch(/position:\s*(absolute|fixed)/);
    expect(css).not.toMatch(/box-shadow:\s*0 10px 40px/);
  });
});
