// Shark Cards (owner decision 12): a question the learner did not know, saved
// where its explanation was shown, reviewed later as a card that explains the
// topic. Invented cards; the wire shape is the real /api/flashcards one.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import Flashcards from '../src/components/Flashcards';
import Collection from '../src/components/Collection';
import { SaveSharkCard } from '../src/components/SaveSharkCard';
import type { Flashcard } from '../src/lib/flashcards';
import { server } from './mocks/server';

const auth = vi.hoisted(() => ({ value: { user: null as { id: string } | null, isAuthenticated: false, isLoading: false } }));
vi.mock('../src/lib/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/lib/auth')>()),
  useAuth: () => ({ ...auth.value, signInWithGoogle: async () => {} }),
}));
const signIn = () => { auth.value = { user: { id: 'user-1' }, isAuthenticated: true, isLoading: false }; };
afterEach(() => { auth.value = { user: null, isAuthenticated: false, isLoading: false }; });

const LEARN_CARD: Flashcard = {
  question_id: 'rm-js-17', question: 'What does typeof null return?', category: 'javascript',
  correct_answer: '"object"', explanation: 'A quirk kept from the first JavaScript engine.', created_at: '2026-10-01T09:00:00Z',
};
const QUIZ_CARD: Flashcard = {
  question_id: '42', question: 'Which hook keeps a value between renders without re-rendering?', category: 'react',
  correct_answer: 'useRef', explanation: 'A ref changes without asking React to render again.', created_at: '2026-10-01T08:00:00Z',
};

/** The deck as the server keeps it, with the requests it was sent. */
function serveDeck(initial: Flashcard[]) {
  const deck = [...initial];
  const sent: { method: string; body?: Record<string, unknown>; questionId?: string | null }[] = [];
  server.use(
    http.get('*/api/flashcards', () => HttpResponse.json({ cards: deck })),
    http.post('*/api/flashcards', async ({ request }) => {
      const body = await request.json() as Record<string, unknown>;
      sent.push({ method: 'POST', body });
      const card = { ...(body as unknown as Flashcard), created_at: '2026-10-01T10:00:00Z' };
      deck.unshift(card);
      return HttpResponse.json({ card });
    }),
    http.delete('*/api/flashcards', ({ request }) => {
      const questionId = new URL(request.url).searchParams.get('question_id');
      sent.push({ method: 'DELETE', questionId });
      deck.splice(0, deck.length, ...deck.filter((card) => card.question_id !== questionId));
      return HttpResponse.json({ ok: true });
    }),
  );
  return { deck, sent };
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return <QueryClientProvider client={client}><MemoryRouter><LanguageProvider>{children}</LanguageProvider></MemoryRouter></QueryClientProvider>;
}
const mount = (node: ReactNode) => act(async () => { render(node, { wrapper }); });

describe('the Shark Cards deck', () => {
  it('shows the question and its topic first, and no answer', async () => {
    signIn();
    serveDeck([LEARN_CARD, QUIZ_CARD]);
    await mount(<Flashcards />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Shark Cards' })).toBeInTheDocument();
    expect(screen.getByText('Card 1 of 2')).toBeInTheDocument();
    const card = screen.getByRole('article');
    expect(within(card).getByText('What does typeof null return?')).toBeInTheDocument();
    expect(within(card).getByText('JavaScript')).toBeInTheDocument();
    expect(within(card).queryByText('"object"')).toBeNull();
    expect(within(card).queryByText(/quirk/)).toBeNull();
    expect(within(card).getByRole('button', { name: 'Show the answer' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('turns over to the correct answer, the explanation and a link to the Learn level it came from', async () => {
    signIn();
    serveDeck([LEARN_CARD, QUIZ_CARD]);
    await mount(<Flashcards />);
    const turn = await screen.findByRole('button', { name: 'Show the answer' });
    fireEvent.click(turn);
    const card = screen.getByRole('article');
    expect(within(card).getByRole('button', { name: 'Hide the answer' })).toHaveAttribute('aria-expanded', 'true');
    expect(within(card).getByText('Correct answer')).toBeInTheDocument();
    expect(within(card).getByText('"object"')).toBeInTheDocument();
    expect(within(card).getByText('A quirk kept from the first JavaScript engine.')).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: 'Learn this topic: JavaScript, level 3' })).toHaveAttribute('href', '/learn?topic=javascript&level=3');

    // A quiz question links to its Learn topic.
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Card 2 of 2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show the answer' }));
    expect(screen.getByRole('link', { name: 'Learn this topic: React' })).toHaveAttribute('href', '/learn?topic=react');
  });

  it('steps with Previous, Next and the arrow keys, and turns each new card face down', async () => {
    signIn();
    serveDeck([LEARN_CARD, QUIZ_CARD]);
    await mount(<Flashcards />);
    const previous = await screen.findByRole('button', { name: 'Previous' });
    expect(previous).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Show the answer' }));
    fireEvent.keyDown(screen.getByRole('button', { name: 'Hide the answer' }), { key: 'ArrowRight' });
    expect(screen.getByText('Card 2 of 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show the answer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    fireEvent.keyDown(screen.getByRole('button', { name: 'Show the answer' }), { key: 'ArrowLeft' });
    expect(screen.getByText('Card 1 of 2')).toBeInTheDocument();
  });

  it('takes a card out with Got it, moves to the next one, and puts it back with Undo', async () => {
    signIn();
    const { sent } = serveDeck([LEARN_CARD, QUIZ_CARD]);
    await mount(<Flashcards />);
    fireEvent.click(await screen.findByRole('button', { name: 'Got it' }));
    expect(await screen.findByText('Card 1 of 1')).toBeInTheDocument();
    expect(screen.getByText(QUIZ_CARD.question)).toBeInTheDocument();
    await waitFor(() => expect(sent).toContainEqual({ method: 'DELETE', questionId: 'rm-js-17' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Show the answer' })).toHaveFocus());
    expect(await screen.findByText('Card taken out of your Shark Cards.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(sent.filter((one) => one.method === 'POST')).toHaveLength(1));
    expect(sent.find((one) => one.method === 'POST')?.body).toMatchObject({
      question_id: 'rm-js-17', question: LEARN_CARD.question, correct_answer: '"object"', explanation: LEARN_CARD.explanation, category: 'javascript',
    });
    expect(await screen.findByText('Card 1 of 2')).toBeInTheDocument();
  });

  it('puts a card back and says so when Got it fails', async () => {
    signIn();
    serveDeck([LEARN_CARD]);
    server.use(http.delete('*/api/flashcards', () => HttpResponse.json({ error: { code: 'db_error', message: 'Could not delete card' } }, { status: 500 })));
    await mount(<Flashcards />);
    fireEvent.click(await screen.findByRole('button', { name: 'Got it' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not remove the card.');
    expect(screen.getByText(LEARN_CARD.question)).toBeInTheDocument();
  });

  it('explains how to get cards when there are none', async () => {
    signIn();
    serveDeck([]);
    await mount(<Flashcards />);
    expect(await screen.findByRole('heading', { level: 1, name: 'No Shark Cards yet' })).toBeInTheDocument();
    expect(screen.getByText(/choose Save as Shark Card under its explanation/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Take a quiz' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to Learn' })).toBeInTheDocument();
  });

  it('says the last card is gone when Got it empties the deck', async () => {
    signIn();
    serveDeck([QUIZ_CARD]);
    await mount(<Flashcards />);
    fireEvent.click(await screen.findByRole('button', { name: 'Got it' }));
    expect(await screen.findByRole('heading', { name: 'No Shark Cards yet' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Undo' })).toBeInTheDocument();
  });

  it('asks a signed-out visitor to sign in, and reads nothing', async () => {
    await mount(<Flashcards />);
    expect(screen.getByRole('heading', { level: 1, name: 'Sign in to keep Shark Cards' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument();
  });

  it('offers a retry when the cards cannot load', async () => {
    signIn();
    let fail = true;
    server.use(http.get('*/api/flashcards', () => (fail
      ? HttpResponse.json({ error: { code: 'db_error', message: 'Could not load cards' } }, { status: 500 })
      : HttpResponse.json({ cards: [QUIZ_CARD] }))));
    await mount(<Flashcards />);
    const retry = await screen.findByRole('button', { name: 'Retry' });
    fail = false;
    fireEvent.click(retry);
    expect(await screen.findByText(QUIZ_CARD.question)).toBeInTheDocument();
  });
});

describe('/collection', () => {
  it('opens on Shark Cards, named so in the heading and the tab', async () => {
    signIn();
    serveDeck([QUIZ_CARD]);
    await mount(<Collection />);
    expect(screen.getByRole('heading', { level: 1, name: 'Shark Cards' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Shark Cards' })).toHaveAttribute('aria-current', 'page');
    expect(await screen.findByText(QUIZ_CARD.question)).toBeInTheDocument();
    // The deck inside the page does not repeat the page heading.
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });
});

describe('a wrong Learn answer', () => {
  const QUESTION = { id: 'rm-html-3', tags: [], introduction: '', question: 'Which element holds the page title?', options: ['<header>', '<title>'], category: 'html', difficulty: 1 };
  const level = (n: number) => ({ level: n, title: `Level ${n} title`, difficulty: 1 as const, questionCount: 8 });
  const STRUCTURE = { topics: ['html'], structure: { html: { levels: Array.from({ length: 15 }, (_, i) => level(i + 1)), checkpoints: [] } } };

  it('offers Save as Shark Card under the explanation, and saves the graded answer', async () => {
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
    signIn();
    server.use(
      http.get('*/api/quiz/roadmap', ({ request }) => {
        const params = new URL(request.url).searchParams;
        const resource = params.get('resource');
        if (resource === 'progress') return HttpResponse.json({ data: {}, extra: { unlocked: [] } });
        if (resource === 'learning-path-catalog') return HttpResponse.json({ versions: {}, paths: [] });
        if (params.get('level')) {
          return HttpResponse.json({ kind: 'level', topic: 'html', ref: 1, title: 'Level 1 title', passPct: 75, sessionId: 'session-1', questions: [QUESTION] });
        }
        return HttpResponse.json(STRUCTURE);
      }),
      http.put('*/api/quiz/roadmap', () => HttpResponse.json({ ok: true, data: {}, extra: { unlocked: [] } })),
      http.post('*/api/quiz/roadmap', () => HttpResponse.json({ selectedIndex: 0, correctAnswer: 1, isCorrect: false, explanation: 'The title element names the page.' })),
      http.get('*/api/user/*', () => HttpResponse.json({ tier: 'premium', source: 'manual', currentPeriodEnd: null, cancelAtPeriodEnd: false, inGrace: false, validUntil: null })),
      http.all('*/api/*', () => HttpResponse.json({ error: { code: 'not_found', message: 'Not found' } }, { status: 404 })),
    );
    // Registered last, so the deck answers ahead of the catch-all above.
    const { sent } = serveDeck([]);
    window.history.replaceState({}, '', '/learn?topic=html&level=1');
    try {
      const { default: Roadmap } = await import('../src/components/Roadmap');
      await mount(<Roadmap />);
      const start = await screen.findByRole('button', { name: 'Start the level' }, { timeout: 5000 }).catch(() => null);
      if (start) fireEvent.click(start);
      fireEvent.click(await screen.findByRole('radio', { name: /<header>/ }, { timeout: 5000 }));
      expect(await screen.findByText('Incorrect')).toBeInTheDocument();
      expect(screen.getByText('The title element names the page.')).toBeInTheDocument();
      fireEvent.click(await screen.findByRole('button', { name: 'Save as Shark Card' }));
      await waitFor(() => expect(sent.filter((one) => one.method === 'POST')).toHaveLength(1));
      expect(sent[0].body).toEqual({
        question_id: 'rm-html-3', question: QUESTION.question, category: 'html',
        correct_answer: '<title>', explanation: 'The title element names the page.', subject: 'webdev',
      });
      expect(await screen.findByRole('button', { name: 'Saved as Shark Card' })).toBeInTheDocument();
    } finally {
      window.history.replaceState({}, '', '/');
      vi.unstubAllGlobals();
    }
  });
});

describe('Save as Shark Card', () => {
  const question = { id: 'rm-css-9', question: 'Which property stacks positioned boxes?', category: 'css', options: ['z-index', 'order', 'float'] };

  it('saves the graded answer and explanation, shows it saved, and takes it out when pressed again', async () => {
    signIn();
    const { sent } = serveDeck([]);
    await mount(<SaveSharkCard question={question} correctIndex={0} explanation="z-index orders positioned boxes." />);
    const save = await screen.findByRole('button', { name: 'Save as Shark Card' });
    fireEvent.click(save);
    expect(await screen.findByRole('button', { name: 'Saved as Shark Card' })).toHaveAttribute('aria-pressed', 'true');
    expect(sent[0]).toEqual({
      method: 'POST',
      body: { question_id: 'rm-css-9', question: question.question, category: 'css', correct_answer: 'z-index', explanation: 'z-index orders positioned boxes.', subject: 'webdev' },
    });
    expect(screen.getByRole('link', { name: 'Open Shark Cards' })).toHaveAttribute('href', '/collection');
    fireEvent.click(screen.getByRole('button', { name: 'Saved as Shark Card' }));
    expect(await screen.findByRole('button', { name: 'Save as Shark Card' })).toHaveAttribute('aria-pressed', 'false');
    await waitFor(() => expect(sent).toContainEqual({ method: 'DELETE', questionId: 'rm-css-9' }));
  });

  it('starts saved for a question in the deck this visit read, and reads nothing itself', async () => {
    signIn();
    let reads = 0;
    serveDeck([{ question_id: 'rm-css-9', question: question.question, category: 'css', correct_answer: 'z-index', explanation: null, created_at: '2026-10-01T09:00:00Z' }]);
    const alone = await act(async () => render(<SaveSharkCard question={question} correctIndex={0} explanation="" />, { wrapper }));
    server.events.on('request:start', ({ request }) => { if (new URL(request.url).pathname === '/api/flashcards') reads += 1; });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 30)); });
    expect(screen.getByRole('button', { name: 'Save as Shark Card' })).toBeInTheDocument();
    expect(reads).toBe(0);
    server.events.removeAllListeners();
    alone.unmount();
    // With the deck read (here by the deck itself), the button knows.
    await mount(<><Flashcards embedded /><SaveSharkCard question={question} correctIndex={0} explanation="" /></>);
    expect(await screen.findByRole('button', { name: 'Saved as Shark Card' })).toBeInTheDocument();
  });

  it('says so and stays unsaved when the save fails', async () => {
    signIn();
    serveDeck([]);
    server.use(http.post('*/api/flashcards', () => HttpResponse.json({ error: { code: 'db_error', message: 'Could not save card' } }, { status: 500 })));
    await mount(<SaveSharkCard question={question} correctIndex={0} explanation="Why" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Save as Shark Card' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save the card.');
    expect(screen.getByRole('button', { name: 'Save as Shark Card' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('renders nothing for a signed-out visitor', async () => {
    await mount(<SaveSharkCard question={question} correctIndex={0} explanation="Why" />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
