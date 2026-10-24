// The skill check replaces the Learn map, so the button that opened it is
// gone while it runs. Found by the paths walk (#587): focus fell to the page
// on the check's intro, and again on the way back to the map. The intro's
// title takes focus, as each round's question and the result's heading do,
// and the way back returns it to the control that opened the check, as
// leaving a level does.
import { beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import type { RoadmapStructure } from '../src/types/quiz';
import { server } from './mocks/server';

vi.mock('../src/lib/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/lib/auth')>()),
  useAuth: () => ({ user: null, isAuthenticated: false, isLoading: false }),
}));

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
});
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, top: 0, left: 0, right: 720, bottom: 600, width: 720, height: 600, toJSON: () => ({}) } as DOMRect);
});

const level = (n: number) => ({ level: n, title: `Level ${n} title`, difficulty: 1 as const, questionCount: 8 });
const STRUCTURE = {
  topics: ['javascript'],
  structure: { javascript: { levels: Array.from({ length: 6 }, (_, i) => level(i + 1)), checkpoints: [] } },
} as unknown as RoadmapStructure;

it('focuses the skill check’s title when it opens and the opening button when it closes', async () => {
  server.use(http.get('*/api/quiz/roadmap', ({ request }) => (new URL(request.url).searchParams.get('resource') === 'learning-path-catalog'
    ? HttpResponse.json({ versions: {}, paths: [] })
    : HttpResponse.json(STRUCTURE as never))));
  const { default: Roadmap } = await import('../src/components/Roadmap');
  await act(async () => render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}>
      <MemoryRouter initialEntries={['/learn']}>
        <LanguageProvider><Roadmap /></LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  ));
  const open = await screen.findByRole('button', { name: /Skill check/ });
  open.focus();
  fireEvent.click(open);
  const title = await screen.findByRole('heading', { name: 'Find your level' });
  await waitFor(() => expect(title).toHaveFocus());

  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  const back = await screen.findByRole('button', { name: /Skill check/ });
  await waitFor(() => expect(back).toHaveFocus());
});
