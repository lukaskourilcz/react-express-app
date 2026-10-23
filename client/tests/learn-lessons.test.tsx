import { beforeAll, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { BigOIntroduction } from '../src/components/Roadmap';
import { server } from './mocks/server';

beforeAll(() => import('../src/components/learn/LearnLesson'));
const lesson = { id: 'dsa-v1-d01-l1', title: 'Complexity Basics', sources: [], sections: [{ kind: 'prose', body: 'Count the operations as the input grows.' }] };
function mount(failReading = false) {
  const reads: string[] = [];
  server.use(http.get('*/api/quiz/roadmap', ({ request }) => {
    const params = new URL(request.url).searchParams;
    if (params.get('resource') === 'lesson') {
      reads.push('reading');
      return failReading ? HttpResponse.json({ error: { code: 'unavailable', message: 'Unavailable' } }, { status: 503 }) : HttpResponse.json({ lesson, hash: 'fixture-hash' });
    }
    if (params.get('level')) {
      reads.push('attempt');
      return HttpResponse.json({ kind: 'level', topic: 'dsa', ref: 1, title: 'Complexity Basics', passPct: 75, sessionId: 'fixture-attempt', questions: [{ id: 'fixture-q', category: 'dsa', difficulty: 1, question: 'Which count grows with the input?', options: ['n', '1'], introduction: '', tags: [] }] });
    }
    return HttpResponse.json({ topics: [], structure: {} });
  }));
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter initialEntries={['/learn/big-o']}><LanguageProvider><BigOIntroduction /></LanguageProvider></MemoryRouter></QueryClientProvider>);
  return reads;
}
describe('Learn lesson reading', () => {
  it('shows the shared lesson without opening an attempt until Start the questions', async () => {
    const reads = mount();
    fireEvent.click(screen.getByRole('button', { name: '1. Complexity Basics' }));
    await screen.findByRole('heading', { name: 'Complexity Basics', level: 1 });
    expect(reads).toEqual(['reading']);
    expect(screen.getByText('Count the operations as the input grows.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start the questions' }));
    await screen.findByText('Which count grows with the input?');
    expect(reads).toEqual(['reading', 'attempt']);
  });
  it('names where Back goes and ends on one row with the only primary (learn-05)', async () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: '1. Complexity Basics' }));
    await screen.findByRole('heading', { name: 'Complexity Basics', level: 1 });
    const start = screen.getByRole('button', { name: 'Start the questions' });
    expect(start).toHaveClass('ss-swim-cta');
    expect(document.querySelectorAll('.ss-swim-cta')).toHaveLength(1);
    const row = start.closest('.lp-lesson-start');
    expect(row).not.toBeNull();
    expect(row).toContainElement(screen.getByText('Reading is optional. It records no progress and earns no XP.'));
    const back = screen.getByRole('button', { name: 'Big O introduction' });
    expect(back).toHaveClass('lp-lesson-back');
    fireEvent.click(back);
    await screen.findByRole('button', { name: '1. Complexity Basics' });
    expect(screen.queryByRole('button', { name: 'Start the questions' })).toBeNull();
  });
  it('keeps questions available when public reading fails', async () => {
    const reads = mount(true);
    fireEvent.click(screen.getByRole('button', { name: '1. Complexity Basics' }));
    await screen.findByText('The lesson could not load. Try again or start the questions.');
    expect(reads).toEqual(['reading']);
    fireEvent.click(screen.getByRole('button', { name: 'Start the questions' }));
    await waitFor(() => expect(reads).toEqual(['reading', 'attempt']));
    await screen.findByText('Which count grows with the input?');
  });
});
