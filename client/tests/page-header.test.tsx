// The operational page header (UX audit social-account-11): one title
// treatment across /collection, /cards and /leaderboard.
import { readFileSync } from 'node:fs';
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

  it('sets the 8px rhythm and no page width of its own', () => {
    const css = source('components/ui/PageHeader.css');
    const header = css.match(/\.ss-page-header \{([^}]*)\}/)?.[1] ?? '';
    expect(header).toContain('gap: 0.5rem');
    expect(header).not.toMatch(/max-width/);
  });

  it('is the header of /collection, /cards and /leaderboard, with no hand-built title left', () => {
    for (const page of ['components/Collection.tsx', 'components/Flashcards.tsx', 'components/Leaderboard.tsx']) {
      const code = source(page);
      expect(code).toContain('<PageHeader');
      expect(code).not.toMatch(/<h1[\s>]|<Heading level=\{1\}/);
    }
  });
});
