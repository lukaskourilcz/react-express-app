import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import RegisterPromptSnackbar from '../src/components/RegisterPromptSnackbar';

vi.mock('../src/lib/auth', () => ({ useAuth: () => ({ isAuthenticated: false, isLoading: false, signInWithGoogle: vi.fn() }) }));
vi.mock('../src/lib/gameConfig', () => ({ useGameConfig: () => ({ coins: { welcomeGrant: 200 } }) }));
afterEach(() => { cleanup(); vi.useRealTimers(); sessionStorage.clear(); });

it('lets a guest read without a timed overlay, then offers registration after interaction', () => {
  vi.useFakeTimers();
  render(<MemoryRouter><LanguageProvider><RegisterPromptSnackbar /></LanguageProvider></MemoryRouter>);
  act(() => { vi.advanceTimersByTime(10_000); });
  expect(screen.queryByRole('region')).toBeNull();
  fireEvent.keyDown(window, { key: 'Tab' });
  act(() => { vi.advanceTimersByTime(2500); });
  expect(screen.getByRole('region')).toBeInTheDocument();
});

it('promises to save what a guest earns from now on, not what they earned signed out', () => {
  // Signing in replaces this device's guest XP and Learn levels with the account's.
  vi.useFakeTimers();
  render(<MemoryRouter><LanguageProvider><RegisterPromptSnackbar /></LanguageProvider></MemoryRouter>);
  fireEvent.pointerDown(window);
  act(() => { vi.advanceTimersByTime(2500); });
  const prompt = screen.getByRole('region', { name: 'Save your progress from now on' });
  expect(prompt).toHaveTextContent('Sign in so the XP and streak you earn from now on are saved to your account. +200 coins.');
  expect(prompt).not.toHaveTextContent(/keep your XP/i);
});

it('cancels the scheduled prompt when unmounted', () => {
  vi.useFakeTimers();
  const view = render(<MemoryRouter><LanguageProvider><RegisterPromptSnackbar /></LanguageProvider></MemoryRouter>);
  fireEvent.pointerDown(window);
  view.unmount();
  act(() => { vi.advanceTimersByTime(3000); });
  expect(screen.queryByRole('region')).toBeNull();
});
