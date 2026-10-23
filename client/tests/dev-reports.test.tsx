// /dev → Reports: dismissing reports one after another keeps each one busy
// until its own answer lands, and a double press sends one dismiss.
import { afterEach, describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import DevReports from '../src/components/dev/DevReports';
import { queryClient } from '../src/lib/queryClient';
import type { AdminReport } from '../src/lib/devApi';
import { server } from './mocks/server';

const report = (id: string): AdminReport => ({
  id, questionId: `q-${id}`, reason: 'typo', detail: null, reporterSub: null, createdAt: null, questionSummary: `Question ${id}`,
});

afterEach(() => queryClient.clear());

function dismissButton(id: string): HTMLElement {
  const row = screen.getByText(`Question ${id}`).closest('tr') as HTMLElement;
  return within(row).getByRole('button', { name: 'Dismiss' });
}

describe('/dev → Reports', () => {
  it('keeps a second report busy while its dismiss is in flight, after the first one lands', async () => {
    const sent: string[] = [];
    const answer = new Map<string, () => void>();
    server.use(
      http.get('*/api/admin/reports', () => HttpResponse.json({ reports: [report('a'), report('b')] })),
      http.post('*/api/admin/reports', async ({ request }) => {
        const { id } = (await request.json()) as { id: string };
        sent.push(id);
        await new Promise<void>((resolve) => answer.set(id, resolve));
        return HttpResponse.json({ ok: true });
      }),
    );
    render(<QueryClientProvider client={queryClient}><LanguageProvider><DevReports /></LanguageProvider></QueryClientProvider>);
    await screen.findByText('Question a');
    act(() => {
      fireEvent.click(dismissButton('a'));
      fireEvent.click(dismissButton('a'));
    });
    fireEvent.click(dismissButton('b'));
    await waitFor(() => expect(answer.size).toBe(2));
    expect(sent).toEqual(['a', 'b']);

    act(() => answer.get('a')!());
    await waitFor(() => expect(screen.queryByText('Question a')).toBeNull());
    expect(dismissButton('b')).toBeDisabled();

    act(() => answer.get('b')!());
    await waitFor(() => expect(screen.queryByText('Question b')).toBeNull());
    expect(sent).toEqual(['a', 'b']);
  });
});
