// The one answer list (UX audit U2, questions-04 and questions-01): 48px rows
// 8px apart, a 26px chip, the brand accent for the selection, and graded
// marks in text and glyph as well as colour.
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { AnswerOptionList } from '../src/components/question';

const css = readFileSync(new URL('../src/components/question/question.css', import.meta.url), 'utf8');
const OPTIONS = ['"null"', '"object"', '"undefined"', '"number"'];

function renderList(props: Partial<Parameters<typeof AnswerOptionList>[0]> = {}) {
  const onChange = vi.fn();
  const utils = render(
    <LanguageProvider>
      <p id="q">Which value does typeof null return?</p>
      <AnswerOptionList options={OPTIONS} value={null} onChange={onChange} labelledBy="q" {...props} />
    </LanguageProvider>,
  );
  return { ...utils, onChange };
}

describe('AnswerOptionList', () => {
  it('is one radio group named by the question, with a numbered row per answer', () => {
    renderList();
    const group = screen.getByRole('radiogroup', { name: /typeof null/ });
    const radios = screen.getAllByRole('radio');
    expect(radios.map((radio) => radio.getAttribute('aria-label'))).toEqual(OPTIONS);
    expect(group).toHaveAttribute('aria-orientation', 'vertical');
    expect(radios[0]).toHaveTextContent('1');
    expect(radios[3]).toHaveTextContent('4');
    // One Tab stop: the first row until something is picked.
    expect(radios.map((radio) => radio.tabIndex)).toEqual([0, -1, -1, -1]);
  });

  it('reports a pick by index, and arrows move along the column', () => {
    const { onChange } = renderList({ value: 1 });
    fireEvent.click(screen.getAllByRole('radio')[2]);
    expect(onChange).toHaveBeenLastCalledWith(2);
    fireEvent.keyDown(screen.getAllByRole('radio')[1], { key: 'ArrowDown' });
    expect(onChange).toHaveBeenLastCalledWith(2);
    expect(screen.getAllByRole('radio')[1]).toHaveAttribute('aria-checked', 'true');
  });

  it('commits through onActivate on a press, not on arrow browsing', () => {
    const onActivate = vi.fn();
    renderList({ value: 0, onActivate });
    fireEvent.keyDown(screen.getAllByRole('radio')[0], { key: 'ArrowDown' });
    expect(onActivate).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole('radio')[3]);
    expect(onActivate).toHaveBeenCalledWith(3);
  });

  it('marks the right answer and a wrong pick in words and glyphs, not colour alone', () => {
    renderList({ value: 0, grade: { correct: 1, picked: 0 }, disabled: true });
    const radios = screen.getAllByRole('radio');
    expect(radios[1]).toHaveAttribute('aria-label', '"object", Correct answer');
    expect(radios[1]).toHaveAttribute('data-tone', 'success');
    expect(radios[1]).toHaveTextContent('✓Correct answer');
    expect(radios[0]).toHaveAttribute('aria-label', '"null", Your pick');
    expect(radios[0]).toHaveAttribute('data-tone', 'error');
    expect(radios[0]).toHaveTextContent('✕Your pick');
    expect(radios[2]).toHaveAttribute('aria-label', '"undefined"');
    expect(radios[2]).toHaveAttribute('data-tone', 'default');
    expect(radios.every((radio) => radio.hasAttribute('disabled'))).toBe(true);
  });

  it('marks only the right answer when the pick was right, or when nothing was picked', () => {
    const { unmount } = renderList({ value: 1, grade: { correct: 1, picked: 1 }, disabled: true });
    expect(screen.queryByText('Your pick')).toBeNull();
    expect(screen.getAllByText('Correct answer')).toHaveLength(1);
    unmount();
    renderList({ value: null, grade: { correct: 2, picked: null }, disabled: true });
    expect(screen.queryByText('Your pick')).toBeNull();
    expect(screen.getAllByRole('radio')[2]).toHaveAttribute('data-tone', 'success');
  });

  it('draws 48px rows 8px apart with a 26px chip and the brand accent for the selection', () => {
    expect(css).toMatch(/\.ss-answer-list \{[^}]*gap: var\(--ss-answer-gap\)/);
    expect(css).toMatch(/min-height: var\(--ss-answer-row-min\)/);
    expect(css).toMatch(/width: var\(--ss-answer-chip\);\s*height: var\(--ss-answer-chip\);/);
    expect(css).toMatch(/\[data-selected='true'\] \{\s*border-color: var\(--brand-accent\);[^}]*background: var\(--brand-accent-soft\);/);
    const theme = readFileSync(new URL('../src/styles/astryx-theme.css', import.meta.url), 'utf8');
    expect(theme).toMatch(/--ss-answer-row-min:\s*48px/);
    expect(theme).toMatch(/--ss-answer-gap:\s*8px/);
    expect(theme).toMatch(/--ss-answer-chip:\s*26px/);
  });
});
