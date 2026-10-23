// One Learn page header (UX audit learn-15): the Learn title style (the green
// 800-weight Kicker h1 with its wave) on the shared PageHeader frame, one
// supporting line, and an optional context link above the title. /roadmap,
// /big-o and /learn/big-o use it, and none of them sets its own width.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Link } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { LearnPageHeader } from '../src/components/learn/LearnPageHeader';
import BigOPage from '../src/components/BigOPage';

const source = (path: string) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');

describe('LearnPageHeader', () => {
  it('draws the Learn title as the one h1 on the shared header frame, with one lead', () => {
    render(<LearnPageHeader title="Career roadmap" lead="A map of the knowledge." />);
    const h1 = screen.getByRole('heading', { level: 1, name: 'Career roadmap' });
    expect(h1).toHaveClass('ss-kicker', 'ss-section-title');
    const header = h1.closest('header');
    expect(header).toHaveClass('ss-page-header', 'learn-page-header');
    expect(header).toContainElement(screen.getByText('A map of the knowledge.'));
    expect(screen.getByText('A map of the knowledge.')).toHaveClass('ss-page-header__lead');
    expect(screen.getAllByRole('heading')).toHaveLength(1);
  });

  it('puts the context link above the title', () => {
    render(<MemoryRouter><LearnPageHeader title="Big O introduction" context={<Link to="/big-o">Big O guide</Link>} /></MemoryRouter>);
    const link = screen.getByRole('link', { name: 'Big O guide' });
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(link.compareDocumentPosition(h1) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(link.closest('p')).toHaveClass('learn-page-header__context');
  });

  it('gives the context link the Learn link rule (accent, 1px underline) and a 44px press', () => {
    const css = source('components/learn/LearnPageHeader.css');
    expect(css).toMatch(/\.learn-page-header__context a,\s*\.learn-link \{[^}]*color: var\(--color-text-accent\);[^}]*text-decoration-thickness: 1px;/);
    // 16px line + 14px above and below = 44px, pulled back so the title stays put.
    expect(css).toMatch(/\.learn-page-header__context a \{[^}]*line-height: 16px;[^}]*padding-block: 14px;[^}]*margin-block: -14px;/);
  });
});

describe('the Learn area uses it', () => {
  it('/big-o opens with the Learn header', () => {
    render(<MemoryRouter><LanguageProvider><BigOPage /></LanguageProvider></MemoryRouter>);
    const h1 = screen.getByRole('heading', { level: 1, name: 'Big O, simply explained' });
    expect(h1).toHaveClass('ss-section-title');
    expect(h1.closest('header')).toHaveClass('learn-page-header');
  });

  it('/roadmap and /big-o set no width of their own: the route shell sets the 800px column', () => {
    expect(source('components/CareerRoadmap.tsx')).not.toMatch(/maxWidth: 780/);
    expect(source('components/CareerRoadmap.tsx')).toContain('<LearnPageHeader title={pageTitle} lead={headerBody} />');
    expect(source('components/BigOPage.css')).not.toMatch(/max-width/);
  });

  it('/roadmap section headings are text-colour headings with an accent arrow, not browser-blue links', () => {
    const css = source('components/CareerRoadmap.css');
    expect(css).toMatch(/\.career-section__link \{[^}]*color: var\(--color-text-primary\);[^}]*text-decoration: none;/);
    expect(css).toMatch(/\.career-section__link \{[^}]*min-height: var\(--ss-control-height\);/);
    expect(css).toMatch(/\.career-section__link::after \{[^}]*content: '\\2192' \/ '';[^}]*color: var\(--color-text-accent\);/);
  });
});
