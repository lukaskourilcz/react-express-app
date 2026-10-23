// /play and /play/:code signed out, and both with live games switched off,
// are the shared StatePanel, as on /cards and /collection (UX audit
// social-account-16): one h1, one body line, one 44px primary.
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { DEFAULT_CONFIG, GAME_CONFIG_KEY } from '../src/lib/gameConfig';

vi.mock('../src/lib/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/lib/auth')>()),
  useAuth: () => ({ user: null, isAuthenticated: false, isLoading: false, signInWithGoogle: async () => {} }),
}));
const openSignIn = vi.hoisted(() => vi.fn());
vi.mock('../src/lib/signInDialog', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/lib/signInDialog')>()),
  openSignIn,
}));

const { PlayLanding, PlayMatch } = await import('../src/components/Play');

async function mount(path: string, multiplayer = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, enabled: false } } });
  client.setQueryData(GAME_CONFIG_KEY, { ...DEFAULT_CONFIG, features: { ...DEFAULT_CONFIG.features, multiplayer } });
  await act(async () => {
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[path]}>
          <LanguageProvider>
            <Routes>
              <Route path="/play" element={<PlayLanding />} />
              <Route path="/play/:code" element={<PlayMatch />} />
            </Routes>
          </LanguageProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  });
}

describe('Play gates (social-account-16)', () => {
  it.each(['/play', '/play/ABC123'])('%s signed out is the shared sign-in panel with one "Sign in" primary', async (path) => {
    await mount(path);
    const heading = screen.getByRole('heading', { level: 1, name: 'Sign in to play live' });
    const panel = heading.closest('.ss-state-panel');
    expect(panel).not.toBeNull();
    // No hand-built raised card around or inside it any more.
    expect(panel!.parentElement!.closest('.ss-raised')).toBeNull();
    expect(panel!.querySelector('.ss-raised')).toBeNull();
    const buttons = panel!.querySelectorAll('button');
    expect(buttons).toHaveLength(1);
    const signIn = screen.getByRole('button', { name: 'Sign in' });
    expect(signIn).toHaveClass('ss-action');
    expect(signIn).toHaveAttribute('aria-haspopup', 'dialog');
    expect(screen.queryByRole('button', { name: 'Log in' })).toBeNull();
    fireEvent.click(signIn);
    expect(openSignIn).toHaveBeenCalled();
  });

  it('shows live games switched off in the same panel', async () => {
    await mount('/play', false);
    const heading = screen.getByRole('heading', { level: 1, name: 'Live games are switched off' });
    expect(heading.closest('.ss-state-panel')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Back' })).toHaveClass('ss-action');
  });
});
