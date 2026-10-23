// /dev's access check: a signed-in account without the admin role is told so,
// not asked to sign in.
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import DevLogin from '../src/components/dev/DevLogin';
import { server } from './mocks/server';

const auth = vi.hoisted(() => ({
  value: { user: { id: 'learner-1' } as { id: string } | null, isAuthenticated: true, isLoading: false },
}));
vi.mock('../src/lib/auth', () => ({ useAuth: () => auth.value }));

describe('/dev → access check', () => {
  it('tells a signed-in account without the admin role that it has no access', async () => {
    server.use(http.get('*/api/admin/settings', () => HttpResponse.json(
      { error: { code: 'forbidden', message: 'Administrative access required' } },
      { status: 403 },
    )));
    const onSuccess = vi.fn();
    render(<LanguageProvider><DevLogin onSuccess={onSuccess} /></LanguageProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Check admin access' }));
    expect(await screen.findByText('This account does not have administrative access.')).toBeInTheDocument();
    expect(screen.queryByText('You need to sign in to do that.')).toBeNull();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
