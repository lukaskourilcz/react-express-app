// /learn/big-o's page is a module of its own that does not import the Learn
// map (perf baseline #587 C17), so its route can load it without the map's
// chunk. The page itself behaves as it did (learn-lessons.test.tsx).
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { BigOIntroduction } from '../src/components/learn/BigOIntroduction';
import { server } from './mocks/server';

const loads = vi.hoisted(() => ({ map: 0 }));
vi.mock('../src/components/Roadmap', async (importOriginal) => {
  loads.map += 1;
  return importOriginal();
});

const lesson = { id: 'dsa-v1-d01-l1', title: 'Complexity Basics', sources: [], sections: [{ kind: 'prose', body: 'Count the operations as the input grows.' }] };

describe('the Big O introduction module', () => {
  it('opens a lesson reading without the Learn map’s module', async () => {
    server.use(http.get('*/api/quiz/roadmap', () => HttpResponse.json({ lesson, hash: 'fixture-hash' })));
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={['/learn/big-o']}>
          <LanguageProvider><BigOIntroduction /></LanguageProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Complexity Basics' }));
    expect(await screen.findByRole('heading', { name: 'Complexity Basics', level: 1 })).toBeInTheDocument();
    expect(loads.map).toBe(0);
  });

  it('is the component the map module still names for App.tsx', async () => {
    const map = await import('../src/components/Roadmap');
    expect(map.BigOIntroduction).toBe(BigOIntroduction);
  });
});
