// The one action row (UX audit U2, questions-05 and questions-18): one
// primary, SwimCta md on the right, secondaries on the left, and on phones the
// primary at full width as the last row.
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Button } from '@astryxdesign/core/Button';
import { AnswerOptionList, QuestionActions, QuestionShell } from '../src/components/question';

const css = readFileSync(new URL('../src/components/question/question.css', import.meta.url), 'utf8');

function phoneRules(): CSSStyleRule[] {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.append(style);
  return [...style.sheet!.cssRules]
    .filter((rule): rule is CSSMediaRule => rule instanceof CSSMediaRule && rule.media.mediaText.includes('max-width: 559px'))
    .flatMap((rule) => [...rule.cssRules] as CSSStyleRule[]);
}

describe('QuestionActions', () => {
  it('draws one filled primary, the SwimCta md, after the secondaries', () => {
    const onNext = vi.fn();
    const { container } = render(
      <QuestionActions
        primary={{ label: 'Next', onClick: onNext }}
        secondary={<Button variant="secondary" label="Previous" onClick={() => {}} />}
      />,
    );
    const next = screen.getByRole('button', { name: 'Next' });
    expect(next).toHaveClass('ss-swim-cta', 'ss-swim-cta--md');
    expect(container.querySelectorAll('.ss-swim-cta')).toHaveLength(1);
    const buttons = screen.getAllByRole('button');
    expect(buttons.map((button) => button.textContent)).toEqual(['Previous', 'Next']);
    expect(next.closest('.ss-question-actions__primary')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Previous' }).closest('.ss-question-actions__secondary')).not.toBeNull();
    fireEvent.click(next);
    expect(onNext).toHaveBeenCalledOnce();
  });

  it('keeps an unavailable primary focusable and says why', () => {
    render(
      <>
        <p id="why">Answer 2 more to submit</p>
        <QuestionActions primary={{ label: 'Submit quiz', onClick: () => {}, unavailable: true, describedBy: 'why' }} />
      </>,
    );
    const submit = screen.getByRole('button', { name: 'Submit quiz' });
    expect(submit).not.toBeDisabled();
    expect(submit).toHaveAttribute('aria-disabled', 'true');
    expect(submit).toHaveAccessibleDescription('Answer 2 more to submit');
  });

  it('moves focus to the primary when asked, as after grading', () => {
    const { rerender } = render(<QuestionActions primary={{ label: 'Continue', onClick: () => {} }} />);
    expect(document.activeElement).toBe(document.body);
    rerender(<QuestionActions primary={{ label: 'Continue', onClick: () => {} }} focusPrimary />);
    expect(screen.getByRole('button', { name: 'Continue' })).toHaveFocus();
  });

  // UX audit learn-02: a plain focus() centres an off-screen button, which
  // scrolled the graded answers out of sight. Focus without scrolling, scroll
  // the least that shows the button, then bring the answer list back if that
  // took it off the top.
  it('scrolls only as far as the primary when it takes focus, and keeps the answers in sight', () => {
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    const scrolled: Array<[string, unknown]> = [];
    const scrollIntoView = vi.fn(function (this: HTMLElement, options: unknown) { scrolled.push([this.className || this.tagName, options]); });
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView });
    try {
      render(
        <QuestionShell
          questionId="q"
          question="Which?"
          actions={<QuestionActions primary={{ label: 'Continue', onClick: () => {} }} focusPrimary />}
        >
          <AnswerOptionList options={['A', 'B']} value={1} onChange={() => {}} labelledBy="q" disabled grade={{ correct: 0, picked: 1 }} />
        </QuestionShell>,
      );
      expect(screen.getByRole('button', { name: 'Continue' })).toHaveFocus();
      expect(focus).toHaveBeenCalledWith({ preventScroll: true });
      expect(scrolled.map(([target]) => target)).toEqual([expect.stringContaining('ss-swim-cta'), expect.stringContaining('ss-answer-list')]);
      expect(scrolled.every(([, options]) => (options as { block: string }).block === 'nearest')).toBe(true);
    } finally {
      focus.mockRestore();
      delete (HTMLElement.prototype as { scrollIntoView?: unknown }).scrollIntoView;
    }
  });

  it('puts the primary on its own full-width last row under 560px', () => {
    const rules = phoneRules();
    const find = (selector: string) => rules.find((rule) => rule.selectorText === selector);
    expect(find('.ss-question-actions')?.style.display).toBe('grid');
    expect(find('.ss-question-actions__secondary')?.style.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))');
    expect(find('.ss-question-actions__primary > .ss-swim-cta')?.style.width).toBe('100%');
    // On a desktop it sits on the right of the one row.
    expect(css).toMatch(/\.ss-question-actions__primary \{[^}]*margin-inline-start: auto/);
  });
});
