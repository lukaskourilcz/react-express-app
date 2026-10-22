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
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><LanguageProvider><BigOIntroduction /></LanguageProvider></MemoryRouter></QueryClientProvider>);
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
