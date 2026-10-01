// The cookie banner and the cookie settings dialog (CookieConsent.tsx).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import CookieConsent from '../src/components/CookieConsent';
import BrandFooter from '../src/components/BrandFooter';
import { CONSENT_STORAGE_KEY, getConsent, resetConsentForTests, saveConsent } from '../src/lib/consent';
import { server } from './mocks/server';

vi.mock('../src/lib/auth', () => ({ useAuth: () => ({ user: null, isAuthenticated: false, isLoading: false }) }));

// jsdom has no modal dialogs.
const proto = HTMLDialogElement.prototype as unknown as { showModal?: () => void; close?: () => void };
proto.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', ''); };
proto.close ??= function (this: HTMLDialogElement) { this.removeAttribute('open'); };

const BANNER = 'Cookies on devShark';
const DIALOG = 'Cookie settings';

function mount(node: ReactNode = <CookieConsent />, path = '/') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <LanguageProvider>
          {node}
          <main id="main-content" tabIndex={-1}>page</main>
        </LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const banner = () => screen.queryByRole('region', { name: BANNER });
const dialog = () => screen.getByRole('dialog', { hidden: true });
const dialogOpen = () => dialog().hasAttribute('open');
/** The dialog's code is a chunk of its own: it arrives a moment after the press. */
const openDialog = async () => {
  await waitFor(() => expect(screen.getByRole('dialog', { hidden: true })).toHaveAttribute('open'));
  return dialog();
};

beforeEach(() => {
  localStorage.clear();
  document.cookie = 'devshark_consent=; Path=/; Max-Age=0';
  resetConsentForTests();
  server.use(http.get('*/api/settings', () => HttpResponse.json({})));
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('the cookie banner', () => {
  it('asks on a first visit with three actions of the same weight', () => {
    mount();
    const region = banner();
    expect(region).not.toBeNull();
    expect(within(region!).getByText(/counts how the site is used, with PostHog in the EU/)).toBeInTheDocument();
    expect(within(region!).getByRole('link', { name: 'Read the privacy policy' })).toHaveAttribute('href', '/privacy#cookies');
    const actions = within(region!).getAllByRole('button');
    expect(actions.map((button) => button.textContent)).toEqual(['Accept all', 'Reject all', 'Choose']);
    // Same variant, same size: Reject all is as easy to see and press as Accept all.
    expect(new Set(actions.map((button) => button.className)).size).toBe(1);
    expect(actions.every((button) => button.tagName === 'BUTTON' && !button.hasAttribute('disabled'))).toBe(true);
  });

  it('records Reject all, closes, and gives focus back to the page', async () => {
    mount();
    const reject = within(banner()!).getByRole('button', { name: 'Reject all' });
    reject.focus();
    fireEvent.click(reject);
    expect(banner()).toBeNull();
    expect(getConsent()).toMatchObject({ analytics: false, marketing: false });
    expect(document.activeElement).toBe(document.getElementById('main-content'));
    expect(await screen.findByRole('status')).toHaveTextContent('Your cookie choice is saved.');
  });

  it('records Accept all', () => {
    mount();
    fireEvent.click(within(banner()!).getByRole('button', { name: 'Accept all' }));
    expect(banner()).toBeNull();
    expect(getConsent()).toMatchObject({ analytics: true, marketing: true });
  });

  it('stays away once the visitor has decided, signed in or not', () => {
    saveConsent({ analytics: false, marketing: false });
    mount();
    expect(banner()).toBeNull();
  });

  it('keeps out of the reading space on the legal pages', () => {
    mount(<CookieConsent />, '/privacy');
    const region = banner()!;
    expect(within(region).queryByText(/counts how the site is used/)).toBeNull();
    expect(within(region).getAllByRole('button')).toHaveLength(3);
  });

  it('stays hidden where the shell hides its chrome', () => {
    mount(<CookieConsent showBanner={false} />);
    expect(banner()).toBeNull();
  });

  it('says so when the browser will not keep the choice, and allows nothing', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError'); });
    mount();
    fireEvent.click(within(banner()!).getByRole('button', { name: 'Accept all' }));
    expect(banner()).toBeNull();
    expect(getConsent()).toMatchObject({ analytics: false, marketing: false, stored: false });
    expect(await screen.findByRole('status')).toHaveTextContent('This browser will not keep your choice');
  });
});

describe('the cookie settings dialog', () => {
  it('opens from Choose with every optional switch off and focus on the first one', async () => {
    mount();
    const choose = within(banner()!).getByRole('button', { name: 'Choose' });
    choose.focus();
    fireEvent.click(choose);
    const box = await openDialog();
    expect(box).toHaveAccessibleName(DIALOG);
    const analytics = within(box).getByRole('switch', { name: 'Analytics' });
    const marketing = within(box).getByRole('switch', { name: 'Marketing' });
    expect(analytics).not.toBeChecked();
    expect(marketing).not.toBeChecked();
    expect(document.activeElement).toBe(analytics);
    // Necessary storage is on and cannot be switched off.
    const necessary = within(box).getByRole('switch', { hidden: true, name: /Necessary/ });
    expect(necessary).toBeChecked();
    expect(necessary).toHaveAttribute('aria-disabled', 'true');
    // Each category has its purpose and a link to the policy.
    expect(within(box).getByText(/PostHog, in the EU, counts page views/)).toBeInTheDocument();
    expect(within(box).getByRole('link', { name: 'How analytics works' })).toHaveAttribute('href', '/privacy#analytics');
    expect(within(box).getByRole('link', { name: 'About marketing tags' })).toHaveAttribute('href', '/privacy#marketing');
    expect(within(box).getByRole('link', { name: 'What necessary storage keeps' })).toHaveAttribute('href', '/privacy#cookies');
  });

  it('keeps Tab inside the dialog and returns focus to Choose on Escape', async () => {
    mount();
    const choose = within(banner()!).getByRole('button', { name: 'Choose' });
    choose.focus();
    fireEvent.click(choose);
    const box = await openDialog();
    const save = within(box).getByRole('button', { name: 'Save choices' });
    const close = within(box).getByRole('button', { name: 'Close' });
    save.focus();
    fireEvent.keyDown(save, { key: 'Tab' });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(save);
    fireEvent.keyDown(box, { key: 'Escape' });
    expect(dialogOpen()).toBe(false);
    // Nothing was decided: the banner and its Choose are still there.
    expect(banner()).not.toBeNull();
    expect(document.activeElement).toBe(choose);
  });

  it('saves the switches as chosen and closes the banner with it', async () => {
    mount();
    fireEvent.click(within(banner()!).getByRole('button', { name: 'Choose' }));
    const box = await openDialog();
    fireEvent.click(within(box).getByRole('switch', { name: 'Analytics' }));
    fireEvent.click(within(box).getByRole('button', { name: 'Save choices' }));
    expect(getConsent()).toMatchObject({ analytics: true, marketing: false });
    expect(dialogOpen()).toBe(false);
    expect(banner()).toBeNull();
    // The Choose button left with the banner: focus goes to the page.
    expect(document.activeElement).toBe(document.getElementById('main-content'));
  });

  it('offers Reject all and Accept all inside the dialog too', async () => {
    mount();
    fireEvent.click(within(banner()!).getByRole('button', { name: 'Choose' }));
    fireEvent.click(within(await openDialog()).getByRole('button', { name: 'Reject all' }));
    expect(getConsent()).toMatchObject({ analytics: false, marketing: false });
    expect(JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY)!)).toMatchObject({ analytics: false, marketing: false });
  });

  it('reopens from the footer with the stored choice, and gives focus back to the footer', async () => {
    saveConsent({ analytics: true, marketing: false });
    mount(<><CookieConsent /><BrandFooter /></>);
    expect(banner()).toBeNull();
    const link = screen.getByRole('button', { name: 'Cookie settings' });
    link.focus();
    fireEvent.click(link);
    const box = await openDialog();
    expect(within(box).getByRole('switch', { name: 'Analytics' })).toBeChecked();
    expect(within(box).getByRole('switch', { name: 'Marketing' })).not.toBeChecked();
    // Withdraw analytics.
    fireEvent.click(within(box).getByRole('switch', { name: 'Analytics' }));
    fireEvent.click(within(box).getByRole('button', { name: 'Save choices' }));
    expect(getConsent()).toMatchObject({ analytics: false, marketing: false });
    expect(dialogOpen()).toBe(false);
    expect(document.activeElement).toBe(link);
    // And again: the dialog opens as often as the visitor asks.
    act(() => { fireEvent.click(link); });
    await waitFor(() => expect(dialogOpen()).toBe(true));
    expect(within(dialog()).getByRole('switch', { name: 'Analytics' })).not.toBeChecked();
  });
});

describe('a dialog whose code cannot load', () => {
  it('closes with a toast and leaves the banner working', async () => {
    vi.resetModules();
    vi.doMock('../src/components/CookieConsentDialog', () => {
      throw new TypeError('Failed to fetch dynamically imported module: /assets/CookieConsentDialog.js');
    });
    // Fresh modules all round: the context the banner reads must be the one rendered.
    const { default: Fresh } = await import('../src/components/CookieConsent');
    const consent = await import('../src/lib/consent');
    const { LanguageProvider: FreshLanguage } = await import('../src/i18n/LanguageContext');
    render(<MemoryRouter><FreshLanguage><Fresh /></FreshLanguage></MemoryRouter>);
    fireEvent.click(within(banner()!).getByRole('button', { name: 'Choose' }));
    // Vitest wraps the import error, so the toast may take the generic line.
    expect(await screen.findByRole('alert')).toHaveTextContent(/Network error\. Check your connection and try again\.|Something went wrong\. Try again\./);
    expect(screen.queryByRole('dialog', { hidden: true })).toBeNull();
    fireEvent.click(within(banner()!).getByRole('button', { name: 'Reject all' }));
    expect(consent.getConsent()).toMatchObject({ analytics: false, marketing: false });
    vi.doUnmock('../src/components/CookieConsentDialog');
  });
});
