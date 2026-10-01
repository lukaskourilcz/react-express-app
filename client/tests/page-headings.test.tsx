// A page's first heading is its h1, in every state the page can open in.
// /cards signed out and empty, and /play signed out, used to open on an h2.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { DEFAULT_CONFIG, GAME_CONFIG_KEY } from '../src/lib/gameConfig';
import Flashcards from '../src/components/Flashcards';
import { PlayLanding } from '../src/components/Play';
import { server } from './mocks/server';

const auth = vi.hoisted(() => ({ value: { user: null as { id: string; user_metadata: object } | null, isAuthenticated: false, isLoading: false } }));
vi.mock('../src/lib/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/lib/auth')>()),
  useAuth: () => ({ ...auth.value, signInWithGoogle: async () => {} }),
}));
afterEach(() => { auth.value = { user: null, isAuthenticated: false, isLoading: false }; });

async function mount(page: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  client.setQueryData(GAME_CONFIG_KEY, { ...DEFAULT_CONFIG, features: { ...DEFAULT_CONFIG.features, multiplayer: true } });
  await act(async () => render(
    <QueryClientProvider client={client}>
      <MemoryRouter><LanguageProvider>{page}</LanguageProvider></MemoryRouter>
    </QueryClientProvider>,
  ));
}

describe('the page heading', () => {
  it('is an h1 on /cards signed out', async () => {
    await mount(<Flashcards />);
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Sign in to use Cards');
  });

  it('is an h1 on /cards with no cards yet', async () => {
    auth.value = { user: { id: 'user-1', user_metadata: {} }, isAuthenticated: true, isLoading: false };
    server.use(http.get('*/api/flashcards', () => HttpResponse.json({ cards: [] })));
    await mount(<Flashcards />);
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('No cards yet');
  });

  it('is an h1 on /play signed out', async () => {
    await mount(<PlayLanding />);
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Sign in to play live');
  });
});
