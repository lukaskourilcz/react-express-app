// The money screens' one signed-out state (UX audit money-05).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { SignedOutBlock } from '../src/components/SignedOutBlock';

const openSignIn = vi.hoisted(() => vi.fn());
vi.mock('../src/lib/signInDialog', async (importOriginal) => ({ ...(await importOriginal<object>()), openSignIn }));
afterEach(() => openSignIn.mockClear());

const draw = (node: React.ReactNode) => render(<LanguageProvider>{node}</LanguageProvider>);

describe('SignedOutBlock', () => {
  it('says one sentence and offers one primary Sign in that opens the dialog', () => {
    draw(<SignedOutBlock message="Your coins show here once you are signed in." />);
    expect(screen.getByText('Your coins show here once you are signed in.')).toHaveClass('ss-signed-out__text');
    const button = screen.getByRole('button', { name: 'Sign in' });
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(button).toHaveAttribute('aria-haspopup', 'dialog');
    expect(button).toHaveClass('ss-action');
    fireEvent.click(button);
    // Without a return path the visitor comes back to this page.
    expect(openSignIn).toHaveBeenCalledWith({});
  });

  it('takes a return path, its own verb and a secondary emphasis for a second block', () => {
    draw(<SignedOutBlock message="Checkout opens once you are signed in." label="Sign in to continue" returnTo="/premium/checkout?plan=annual" emphasis="secondary" />);
    const primary = draw(<SignedOutBlock message="x" />).getAllByRole('button', { name: 'Sign in' })[0];
    const secondary = screen.getByRole('button', { name: 'Sign in to continue' });
    expect(secondary.className).not.toBe(primary.className);
    fireEvent.click(secondary);
    expect(openSignIn).toHaveBeenCalledWith({ returnTo: '/premium/checkout?plan=annual' });
  });

  it('adds no card: no border, background or padding of its own', () => {
    const css = readFileSync(new URL('../src/components/SignedOutBlock.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).not.toMatch(/border|background|padding|box-shadow/);
  });
});
