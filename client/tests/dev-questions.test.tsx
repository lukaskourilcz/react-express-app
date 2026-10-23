// /dev → Question bank: the question editor saves a new question once however
// fast Save is pressed, and keeps what the admin typed while the bank reloads.
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import QuestionEditor from '../src/components/dev/QuestionEditor';
import DevTriage from '../src/components/dev/DevTriage';
import type { AdminQuestion } from '../src/lib/devApi';
import { server } from './mocks/server';

// jsdom has no modal dialogs: open and close the element as a browser would.
const proto = HTMLDialogElement.prototype as unknown as { showModal?: () => void; close?: () => void };
proto.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', ''); };
proto.close ??= function (this: HTMLDialogElement) { this.removeAttribute('open'); };

function renderEditor(props: Partial<Parameters<typeof QuestionEditor>[0]> = {}) {
  const onSaved = vi.fn();
  const onClose = vi.fn();
  const view = render(
    <LanguageProvider>
      <QuestionEditor open initial={null} categories={['react', 'css']} onClose={onClose} onSaved={onSaved} {...props} />
    </LanguageProvider>,
  );
  return { ...view, onSaved, onClose };
}

function fillNewQuestion() {
  fireEvent.change(screen.getByRole('textbox', { name: 'Question' }), { target: { value: 'Which hook keeps state?' } });
  fireEvent.change(screen.getByRole('textbox', { name: 'Option 1' }), { target: { value: 'useState' } });
  fireEvent.change(screen.getByRole('textbox', { name: 'Option 2' }), { target: { value: 'useRef' } });
}

describe('/dev → the question editor', () => {
  it('creates a new question once when Save is pressed twice before it renders', async () => {
    const sent: unknown[] = [];
    server.use(http.post('*/api/admin/save', async ({ request }) => {
      sent.push(await request.json());
      await new Promise((resolve) => setTimeout(resolve, 20));
      return HttpResponse.json({ ok: true, id: `dev-${sent.length}` });
    }));
    const { onSaved, onClose } = renderEditor();
    fillNewQuestion();
    const save = screen.getByRole('button', { name: 'Save' });
    act(() => {
      fireEvent.click(save);
      fireEvent.click(save);
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(sent).toHaveLength(1);
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('keeps the text being typed when the bank re-read hands it a new category list', () => {
    const { rerender } = renderEditor();
    fillNewQuestion();
    // The same categories in a new array, as every re-read of the bank builds.
    rerender(
      <LanguageProvider>
        <QuestionEditor open initial={null} categories={['react', 'css']} onClose={() => {}} onSaved={() => {}} />
      </LanguageProvider>,
    );
    expect(screen.getByRole('textbox', { name: 'Question' })).toHaveValue('Which hook keeps state?');
    expect(screen.getByRole('textbox', { name: 'Option 1' })).toHaveValue('useState');
  });
});

const question = (id: string): AdminQuestion => ({
  id, tags: [], introduction: '', question: `Question ${id}?`, options: ['Yes', 'No'], correctAnswer: 0, category: 'react',
  explanation: '', difficulty: 2, importance: 5, source: 'base', deleted: false, review: { active: true, reason: 'reviewed' },
});
const verdict = (mean: number) => ({ cat: 'react', diff: 2, rel: 2, disc: 2, fit: 2, clar: 2, mean, gate: false, greasons: [], dup: false, dec: 'cut', reasons: [], note: '' });

function renderTriage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <LanguageProvider><DevTriage /></LanguageProvider>
    </QueryClientProvider>,
  );
}

describe('/dev → Quality triage', () => {
  it('shows again the rows a bulk delete did not reach when it stops on an error', async () => {
    const deleted: string[] = [];
    server.use(
      http.get('*/api/admin/questions', () => HttpResponse.json({ questions: ['t1', 't2', 't3'].map(question), categories: ['react'], reportCounts: {} })),
      http.get('*/triage-verdicts.json', () => HttpResponse.json({
        meta: { total: 3, keep: 0, cut: 3, generatedFrom: 'test', keepRule: 'test' },
        verdicts: { t1: verdict(1), t2: verdict(2), t3: verdict(3) },
      })),
      http.post('*/api/admin/delete', async ({ request }) => {
        const { id } = (await request.json()) as { id: string };
        if (id === 't2') return HttpResponse.json({ error: { code: 'internal_error', message: 'Internal error' } }, { status: 500 });
        deleted.push(id);
        return HttpResponse.json({ ok: true });
      }),
    );
    renderTriage();
    fireEvent.click(await screen.findByRole('button', { name: 'Delete all 3 shown' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete permanently' }));
    expect(await screen.findByText(/deleted 1 before stopping/)).toBeInTheDocument();
    expect(deleted).toEqual(['t1']);
    // t1 is gone; t2 failed and t3 was never sent, so both are still listed.
    expect(screen.queryByText('Question t1?')).toBeNull();
    expect(screen.getByText('Question t2?')).toBeInTheDocument();
    expect(screen.getByText('Question t3?')).toBeInTheDocument();
  });
});
