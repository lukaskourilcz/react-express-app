// /dev → Question bank: the question editor saves a new question once however
// fast Save is pressed, and keeps what the admin typed while the bank reloads.
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import QuestionEditor from '../src/components/dev/QuestionEditor';
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
});
