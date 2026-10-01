// The privacy policy (round 4, owner decision 4): it says what devShark does
// today, has a cookie table that names what the browser keeps, and reopens
// the cookie settings from its cookie section.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { PrivacyPage } from '../src/components/LegalPages';
import CookieConsent from '../src/components/CookieConsent';
import { CONSENT_COOKIE, CONSENT_STORAGE_KEY, resetConsentForTests, saveConsent } from '../src/lib/consent';
import { server } from './mocks/server';

vi.mock('../src/lib/auth', () => ({ useAuth: () => ({ user: null, isAuthenticated: false, isLoading: false }) }));

const proto = HTMLDialogElement.prototype as unknown as { showModal?: () => void; close?: () => void };
proto.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', ''); };
proto.close ??= function (this: HTMLDialogElement) { this.removeAttribute('open'); };

function renderPolicy() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/privacy']}>
        <LanguageProvider>
          <CookieConsent />
          <PrivacyPage />
        </LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  resetConsentForTests();
  server.use(http.get('*/api/settings', () => HttpResponse.json({})));
});

describe('the privacy policy', () => {
  it('covers every topic the policy promises, under its own heading', () => {
    saveConsent({ analytics: false, marketing: false });
    renderPolicy();
    for (const heading of [
      'Who is responsible', 'Your account and sign-in', 'Learning data', 'Your sharkname and friends', 'Leaderboards',
      'The Challenge Hall of Fame', 'Play rooms and classrooms', 'Invitations', 'Question reports', 'Payments', 'Vouchers',
      'Merchandise', 'Email', 'Cookies and browser storage', 'Analytics, only with your consent', 'Marketing tags (not in use)',
      'Error monitoring', 'Who else handles your data', 'No AI processing', 'GitHub garden', 'Legal bases',
      'How long devShark keeps data', 'Deleting your account', 'Your rights', 'Changes to this policy', 'Contact',
    ]) {
      expect(screen.getByRole('heading', { level: 2, name: heading })).toBeInTheDocument();
    }
    expect(screen.getByText(/Last updated on 1 October 2026/)).toBeInTheDocument();
  });

  it('says what friends, the boards and the sign-in log see and keep', () => {
    saveConsent({ analytics: false, marketing: false });
    renderPolicy();
    expect(screen.getByText(/They see your profile photo only if you switch on “Show my photo to friends”; otherwise they see your initials/)).toBeInTheDocument();
    expect(screen.getByText(/You appear on them as “Learner”, without a name or photo/)).toBeInTheDocument();
    expect(screen.getByText(/catch up with a change within about a minute/)).toBeInTheDocument();
    expect(screen.getByText(/the name you type appears publicly on the Hall of Fame/)).toBeInTheDocument();
    expect(screen.getByText(/records your email address, the sign-in method \(Google or email\) and the time/)).toBeInTheDocument();
    expect(screen.getByText(/It deletes each record after 12 months/)).toBeInTheDocument();
    expect(screen.getByText(/keeps only a salted hash of it: devShark never sees or stores your password/)).toBeInTheDocument();
    expect(screen.queryByText(/sprd\.net AG/)).toBeNull();
  });

  it('lists what the browser keeps, with the real names', () => {
    saveConsent({ analytics: false, marketing: false });
    renderPolicy();
    const table = screen.getByRole('table', { name: 'What devShark keeps in your browser' });
    const names = within(table).getAllByRole('rowheader').map((cell) => cell.querySelector('code')?.textContent);
    expect(names).toEqual(expect.arrayContaining([CONSENT_COOKIE, CONSENT_STORAGE_KEY, 'devshark:campaign', 'ph_…_posthog', 'sb-…-auth-token']));
    const posthog = within(table).getByText('ph_…_posthog').closest('tr')!;
    expect(posthog).toHaveTextContent('Analytics, with your consent');
    const choice = within(table).getByText(CONSENT_COOKIE).closest('tr')!;
    expect(choice).toHaveTextContent('Necessary');
    expect(screen.getByRole('table', { name: 'Retention periods' })).toHaveTextContent('Sign-in log (email address, method, time)12 months');
  });

  it('reopens the cookie settings from the cookie section', async () => {
    saveConsent({ analytics: true, marketing: false });
    renderPolicy();
    const section = screen.getByRole('region', { name: 'Cookies and browser storage' });
    fireEvent.click(within(section).getByRole('button', { name: 'Change cookie settings' }));
    const dialog = await screen.findByRole('dialog', { hidden: true });
    await waitFor(() => expect(dialog).toHaveAttribute('open'));
    expect(within(dialog).getByRole('switch', { name: 'Analytics' })).toBeChecked();
  });

  it('shows the banner compact on the policy, so it never hides the text', () => {
    renderPolicy();
    const banner = screen.getByRole('region', { name: 'Cookies on devShark' });
    expect(within(banner).queryByText(/counts how the site is used/)).toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: 'Privacy policy' })).toBeInTheDocument();
  });
});
