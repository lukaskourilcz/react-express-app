// The one keyboard hint (UX audit U2, questions-16 and questions-02): one
// wording with a verb per runner, a reserved line in every state, and a
// desktop with a fine pointer only.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { QuestionHint } from '../src/components/question';

const css = readFileSync(new URL('../src/components/question/question.css', import.meta.url), 'utf8');
const renderIn = (ui: React.ReactNode) => render(<LanguageProvider>{ui}</LanguageProvider>);

function sheet(): CSSStyleSheet {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.append(style);
  return style.sheet!;
}

describe('QuestionHint', () => {
  it('says what the keys do on this runner', () => {
    renderIn(
      <>
        <QuestionHint max={4} verb="select" next="continue" />
        <QuestionHint max={4} verb="select" next="submit" />
        <QuestionHint max={3} verb="answer" />
      </>,
    );
    expect(screen.getByText('Press 1–4 to select · Enter to continue')).toBeInTheDocument();
    expect(screen.getByText('Press 1–4 to select · Enter to submit')).toBeInTheDocument();
    expect(screen.getByText('Press 1–3 to answer')).toBeInTheDocument();
  });

  it('keeps its line when hidden, so the answers and actions do not move', () => {
    sheet();
    const { rerender } = renderIn(<QuestionHint max={4} verb="answer" next="continue" />);
    const line = document.querySelector('.ss-question-hint') as HTMLElement;
    const reserved = getComputedStyle(line).minHeight;
    expect(reserved).toMatch(/^[1-9]\d*(\.\d+)?(px|em)$/);
    expect(getComputedStyle(line).visibility).not.toBe('hidden');
    rerender(<LanguageProvider><QuestionHint max={4} verb="answer" next="continue" hidden /></LanguageProvider>);
    const same = document.querySelector('.ss-question-hint') as HTMLElement;
    expect(same).toBe(line);
    expect(getComputedStyle(same).visibility).toBe('hidden');
    expect(getComputedStyle(same).minHeight).toBe(reserved);
    expect(getComputedStyle(same).display).not.toBe('none');
    expect(same).toHaveAttribute('aria-hidden', 'true');
  });

  it('is not drawn on a touch screen or a phone-sized layout', () => {
    const rules = [...sheet().cssRules]
      .filter((rule): rule is CSSMediaRule => rule instanceof CSSMediaRule && rule.media.mediaText.includes('pointer: coarse'))
      .flatMap((rule) => [...rule.cssRules] as CSSStyleRule[]);
    const hint = rules.find((rule) => rule.selectorText === '.ss-question-hint');
    expect(hint?.style.display).toBe('none');
    expect((hint?.parentRule as CSSMediaRule).media.mediaText).toMatch(/max-width: 599px/);
  });
});
