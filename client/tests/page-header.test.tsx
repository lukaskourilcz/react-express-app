// The one operational page header (UX audit social-account-11, questions-19):
// one title treatment across /collection, /cards, /leaderboard, /play, the
// Quiz and Challenge setups and /today.
import { createRef } from 'react';
import { readFileSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageHeader } from '../src/components/ui/PageHeader';

const source = (path: string) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');

describe('PageHeader', () => {
  it('draws the h1 at display-3 with one lead line, and no kicker unless given one', () => {
    const { container } = render(<PageHeader title="Shark Cards" lead="Questions you missed and saved." />);
    const h1 = screen.getByRole('heading', { level: 1, name: 'Shark Cards' });
    expect(h1.closest('header')).toHaveClass('ss-page-header');
    expect(container.querySelector('.ss-kicker')).toBeNull();
    expect(container.querySelectorAll('.ss-page-header__lead')).toHaveLength(1);
    expect(h1.nextElementSibling).toHaveTextContent('Questions you missed and saved.');
  });

  it('puts a kicker, drawn with the shared Kicker, right above the h1', () => {
    const { container } = render(<PageHeader kicker="Play live" title="Race or teach live" lead="Lead" />);
    const kicker = container.querySelector('.ss-kicker');
    expect(kicker).toHaveTextContent('Play live');
    expect(kicker?.nextElementSibling?.tagName).toBe('H1');
  });

  it('keeps a status line inside the header, under the lead', () => {
    render(<PageHeader title="Leaderboard" lead="Ranked by correct answers."><p role="status">Window unavailable</p></PageHeader>);
    expect(screen.getByRole('status').closest('header')).toHaveClass('ss-page-header');
  });

  it('makes the h1 a focus target only when the screen passes a titleRef', () => {
    const { unmount } = render(<PageHeader title="Quiz" />);
    expect(screen.getByRole('heading', { level: 1 })).not.toHaveAttribute('tabindex');
    unmount();
    const ref = createRef<HTMLHeadingElement>();
    render(<PageHeader title="Biggest Shark Challenge" titleRef={ref} />);
    const h1 = screen.getByRole('heading', { level: 1, name: 'Biggest Shark Challenge' });
    expect(ref.current).toBe(h1);
    expect(h1).toHaveAttribute('tabindex', '-1');
    ref.current?.focus();
    expect(h1).toHaveFocus();
  });

  it('puts an aside on the h1\'s own row, at its end, and keeps the h1 when it arrives', () => {
    const { rerender } = render(<PageHeader title="Today" aside={null} />);
    const h1 = screen.getByRole('heading', { level: 1, name: 'Today' });
    expect(h1.parentElement).toHaveClass('ss-page-header__row');
    rerender(<PageHeader title="Today" aside={<span>0/3 done</span>} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Today' })).toBe(h1);
    expect(h1.nextElementSibling).toHaveTextContent('0/3 done');
  });

  it('sets the 8px rhythm and no page width of its own', () => {
    const css = source('components/ui/PageHeader.css');
    const header = css.match(/\.ss-page-header \{([^}]*)\}/)?.[1] ?? '';
    expect(header).toContain('gap: 0.5rem');
    expect(header).not.toMatch(/max-width/);
  });

  it('is the header of /collection, /cards, /leaderboard and /today, with no hand-built title left', () => {
    for (const page of ['components/Collection.tsx', 'components/Flashcards.tsx', 'components/Leaderboard.tsx', 'components/Today.tsx']) {
      const code = source(page);
      expect(code).toContain('<PageHeader');
      expect(code).not.toMatch(/<h1[\s>]|<Heading level=\{1\}/);
    }
    // The Quiz and Challenge setups and /play open on it too; their result
    // screens keep an h1 of their own.
    for (const page of ['components/Quiz.tsx', 'components/Challenge.tsx', 'components/Play.tsx']) expect(source(page)).toContain('<PageHeader');
  });

  it('is the only operational header: the question area has no second one', () => {
    expect(existsSync(new URL('../src/components/question/QuestionPageHeader.tsx', import.meta.url))).toBe(false);
    expect(source('components/question/index.ts')).not.toContain('PageHeader');
  });
});
