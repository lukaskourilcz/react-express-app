// The footer carries no changelog, and a social profile the owner sets
// later (Threads, once @devshark.app exists) shows as one more icon with no
// other change. Here the catalogue is replaced so both states are covered.
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import BrandFooter from '../src/components/BrandFooter';
import { server } from './mocks/server';

const catalog = vi.hoisted(() => ({ threads: 'https://www.threads.com/@devshark.app' as string | null }));
vi.mock('../product-catalog', async (importOriginal) => {
  const real = await importOriginal<typeof import('../product-catalog')>();
  return {
    ...real,
    get SOCIAL_PROFILES() {
      return { ...real.SOCIAL_PROFILES, threads: catalog.threads };
    },
  };
});
vi.mock('../src/lib/auth', () => ({ useAuth: () => ({ user: null, isAuthenticated: false, isLoading: false }) }));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return <QueryClientProvider client={client}><MemoryRouter><LanguageProvider>{children}</LanguageProvider></MemoryRouter></QueryClientProvider>;
}

describe('the footer', () => {
  it('links no retired informational pages beside the legal links', () => {
    server.use(http.get('*/api/settings', () => HttpResponse.json({})));
    render(<BrandFooter />, { wrapper });
    expect(screen.getByRole('link', { name: 'Terms' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Changelog' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'How we curate' })).toBeNull();
  });

  it('shows the Threads icon once its URL is recorded', () => {
    server.use(http.get('*/api/settings', () => HttpResponse.json({})));
    catalog.threads = 'https://www.threads.com/@devshark.app';
    render(<BrandFooter />, { wrapper });
    const nav = screen.getByRole('navigation', { name: 'Find devShark elsewhere' });
    const links = within(nav).getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['https://www.instagram.com/devshark.app/', 'https://www.threads.com/@devshark.app']);
    expect(within(nav).getByRole('link', { name: /Threads/ })).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('leaves no icon and no gap while the profile does not exist', () => {
    server.use(http.get('*/api/settings', () => HttpResponse.json({})));
    catalog.threads = null;
    render(<BrandFooter />, { wrapper });
    const nav = screen.getByRole('navigation', { name: 'Find devShark elsewhere' });
    expect(within(nav).getAllByRole('link')).toHaveLength(1);
    expect(within(nav).queryByRole('link', { name: /Threads/ })).toBeNull();
  });
});

// UX audit shell-public-03 and the closeout of #572: short labels so the row
// fits one line, and each label is the button's whole accessible name, so
// what a sighted user reads is what voice control and a screen reader hear
// (WCAG 2.5.3, label in name).
describe('the footer toggles', () => {
  it('say what pressing them does, and the visible words are the whole name', () => {
    server.use(http.get('*/api/settings', () => HttpResponse.json({})));
    render(<BrandFooter />, { wrapper });
    const group = screen.getByRole('group', { name: 'Preferences' });
    const [theme, sound] = within(group).getAllByRole('button');
    expect(theme).toHaveAccessibleName(/^(Dark|Light) mode$/);
    expect(sound).toHaveAccessibleName(/^Turn sound (on|off)$/);
    for (const button of [theme, sound]) {
      expect(button).not.toHaveAttribute('aria-label');
      expect(button).toHaveAccessibleName(button.textContent!);
    }
  });
});
