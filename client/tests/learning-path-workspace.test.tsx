// The learning-path workspace: one attempt takes one result, a check is
// retried as a new attempt, switching activities starts clean, and a draft
// autosave never argues with itself.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { ApiError } from '../src/lib/api';

const loc = (en: string) => ({ en, cs: '' });
const A = 'dsa-v1-d01-linear-accumulator';
const B = 'dsa-v1-d01-halving-counter';
const C = 'dsa-v1-d01-checks';
const ENROLLMENT = 'ENROLL0000000000aaaa';
const summary = (id: string, title: string, kind = 'code') => ({
  id, kind, purpose: 'exercise', verification: 'machine_verified', title: loc(title), summary: loc(`${title} summary`),
  competencies: [], estimatedMinutes: 5, ...(kind === 'code' ? { language: 'javascript' } : {}),
});
const manifest = {
  id: 'dsa-foundations', kind: 'skill_path', version: 1, title: loc('DSA'), summary: loc(''), outcomes: { en: [], cs: [] }, nonGoals: { en: [], cs: [] },
  entryRequirement: loc(''), competencies: [], bridges: [], rubric: { version: 1, dimensions: [] }, diagnosticActivityId: null,
  estimatedHours: { min: 1, max: 2 }, sources: [], reviewedOn: '2026-01-01', completionLabel: loc('done'),
  modules: [{
    id: 'dsa-v1-d01', title: loc('D01'), outcomes: { en: [], cs: [] }, competencies: [], dependsOn: [], lessons: [],
    activities: [summary(C, 'The check', 'check'), summary(A, 'Activity A'), summary(B, 'Activity B')],
    requires: [{ activityId: C, state: 'verified_pass' }, { activityId: A, state: 'verified_pass' }, { activityId: B, state: 'verified_pass' }],
    estimatedMinutes: 10,
  }],
};

const calls = vi.hoisted(() => ({
  start: [] as string[],
  submit: [] as Record<string, unknown>[],
  drafts: [] as { expected: number; code: unknown; activityId: string }[],
  serverRevision: 0,
  draftDelay: 0,
  inFlight: 0,
  mostInFlight: 0,
  serverDraft: null as null | { activityId: string; revision: number; content: Record<string, unknown>; updatedAt: string },
  next: null as string | null,
  submitFailures: [] as unknown[],
}));

vi.mock('../src/lib/auth', () => ({ useAuth: () => ({ user: { id: 'user-1' }, isAuthenticated: true, isLoading: false }) }));
vi.mock('../src/lib/entitlement', () => ({
  useEntitlement: () => ({ tier: 'premium', signedIn: true, loading: false, failed: false, data: null, refetch: () => {} }),
}));
vi.mock('../src/coding/Editor', () => ({
  Editor: ({ value, onChange, ariaLabel }: { value: string; onChange: (next: string) => void; ariaLabel: string }) => (
    <textarea aria-label={ariaLabel} value={value} onChange={(event) => onChange(event.target.value)} />
  ),
}));
vi.mock('../src/lib/learningPaths', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lib/learningPaths')>();
  const catalog = { isLoading: false, isError: false, data: { paths: [{ manifest, availability: 'available', inventory: {} }], versions: {} }, refetch: () => {} };
  const enrollments = { data: { enrollments: [{ enrollmentId: ENROLLMENT, pathId: 'dsa-foundations', curriculumVersion: 1, status: 'active', baseTrackAtEnrollment: null, startedAt: '', updatedAt: '' }] } };
  const progress = { data: undefined };
  return {
    ...actual,
    usePathCatalog: () => catalog,
    useEnrollments: () => enrollments,
    usePathProgress: () => progress,
    savePathDraft: vi.fn(async (input: { activityId: string; expectedRevision: number; content: Record<string, unknown> }) => {
      calls.drafts.push({ expected: input.expectedRevision, code: input.content.code, activityId: input.activityId });
      calls.inFlight += 1;
      calls.mostInFlight = Math.max(calls.mostInFlight, calls.inFlight);
      if (calls.draftDelay) await new Promise((resolve) => setTimeout(resolve, calls.draftDelay));
      calls.inFlight -= 1;
      if (input.expectedRevision !== calls.serverRevision) {
        throw new ApiError('A newer draft was saved elsewhere. Reload before saving again.', 409, 'draft_conflict');
      }
      calls.serverRevision += 1;
      return { draft: { activityId: input.activityId, revision: calls.serverRevision, content: input.content, updatedAt: '' } };
    }),
    startActivity: vi.fn(async ({ activityId }: { activityId: string }) => {
      calls.start.push(activityId);
      const base = {
        attemptId: `attempt-${calls.start.length}`,
        session: `SESSION_${activityId}_${calls.start.length}`,
        expiresAt: new Date(Date.now() + 3600e3).toISOString(),
        activity: summary(activityId, activityId, activityId === C ? 'check' : 'code'),
        purpose: 'exercise',
        draft: activityId === C ? null : calls.serverDraft,
        previous: null,
      };
      if (activityId === C) {
        return { ...base, check: { questions: [{ id: 'q1', prompt: loc('Which one?'), options: [loc('Left'), loc('Right')], competencies: [] }], passThreshold: 0.8 } };
      }
      return { ...base, code: { language: 'javascript', prompt: loc(`prompt ${activityId}`), starter: `STARTER_FOR_${activityId}`, hints: { en: [], cs: [] }, tests: [] } };
    }),
    submitActivity: vi.fn(async (input: Record<string, unknown>) => {
      calls.submit.push(input);
      const failure = calls.submitFailures.shift();
      if (failure) throw failure;
      const check = Array.isArray(input.answers);
      return {
        activityId: check ? C : A, state: 'needs_revision', verification: 'machine_verified', score: 0.5, criteria: [],
        questions: check ? [{ questionId: 'q1', correct: false, correctIndex: 1, explanation: loc('Because of the right side.') }] : null,
        code: check ? null : { outcome: 'failed', results: [], hidden: null, check: null, logs: [], codeError: null },
        feedback: [], module: null, guidedComplete: false, nextActivityId: calls.next, replayed: false, xpAwarded: 0,
      };
    }),
  };
});

beforeEach(() => {
  calls.start.length = 0;
  calls.submit.length = 0;
  calls.drafts.length = 0;
  calls.serverRevision = 0;
  calls.draftDelay = 0;
  calls.inFlight = 0;
  calls.mostInFlight = 0;
  calls.serverDraft = null;
  calls.next = null;
  calls.submitFailures.length = 0;
  Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true });
});

async function mount(activityId: string) {
  // Imported here, after the fixtures above exist: the mocked module reads them.
  const { DsaModule } = await import('../src/components/paths/LearningPathScreens');
  await act(async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={[`/roadmap/paths/dsa-foundations/dsa-v1-d01?activity=${activityId}`]}>
          <LanguageProvider>
            <Routes><Route path="/roadmap/paths/dsa-foundations/:moduleId" element={<DsaModule />} /></Routes>
          </LanguageProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  });
}
const editor = () => screen.getByRole('textbox', { name: 'Your solution' }) as HTMLTextAreaElement;
const type = async (value: string) => {
  await act(async () => { fireEvent.change(editor(), { target: { value } }); });
};
const press = async (name: string | RegExp) => {
  await act(async () => { fireEvent.click(screen.getByRole('button', { name })); });
};
const wait = (ms: number) => act(async () => { await new Promise((resolve) => setTimeout(resolve, ms)); });
const status = () => document.querySelector('.lp-work .lp-actions__status')?.textContent;

describe('one attempt takes one result', () => {
  it('a second submission of a graded code exercise opens a fresh attempt with a key of its own', async () => {
    await mount(A);
    await waitFor(() => expect(editor().value).toBe(`STARTER_FOR_${A}`));
    await type('attempt one');
    await press('Submit');
    await waitFor(() => expect(calls.submit).toHaveLength(1));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Submit' })).not.toBeDisabled());
    await type('attempt two, fixed');
    await press('Submit');
    await waitFor(() => expect(calls.submit).toHaveLength(2));
    expect(calls.start).toEqual([A, A]);
    expect(calls.submit[1].session).not.toBe(calls.submit[0].session);
    expect(calls.submit[1].idempotencyKey).not.toBe(calls.submit[0].idempotencyKey);
    expect(calls.submit[1].code).toBe('attempt two, fixed');
    expect(editor().value).toBe('attempt two, fixed');
  });

  it('a retry after a network failure reuses the attempt and its key, so the server can replay', async () => {
    calls.submitFailures.push(new ApiError('Network error', 0, 'network'));
    await mount(A);
    await waitFor(() => expect(editor().value).toBe(`STARTER_FOR_${A}`));
    await type('attempt one');
    await press('Submit');
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Network error. Check your connection and try again.'));
    await press('Submit');
    await waitFor(() => expect(calls.submit).toHaveLength(2));
    expect(calls.start).toEqual([A]);
    expect(calls.submit[1].session).toBe(calls.submit[0].session);
    expect(calls.submit[1].idempotencyKey).toBe(calls.submit[0].idempotencyKey);
  });

  it('a key the server already spent reads as plain copy, and the next submission opens a new attempt', async () => {
    calls.submitFailures.push(new ApiError('That submission key was already used with different work', 409, 'idempotency_conflict'));
    await mount(A);
    await waitFor(() => expect(editor().value).toBe(`STARTER_FOR_${A}`));
    await press('Submit');
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('This attempt already has a result. Try again to start a new one.'));
    expect(screen.queryByText(/submission key/)).toBeNull();
    await press('Submit');
    await waitFor(() => expect(calls.submit).toHaveLength(2));
    expect(calls.start).toEqual([A, A]);
    expect(calls.submit[1].idempotencyKey).not.toBe(calls.submit[0].idempotencyKey);
  });

  it('when the next thing to do is this activity again, the result offers another attempt, not a link back', async () => {
    calls.next = A;
    await mount(A);
    await waitFor(() => expect(editor().value).toBe(`STARTER_FOR_${A}`));
    await press('Submit');
    await waitFor(() => expect(screen.getByText('Result')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Next activity' })).toBeNull();
    await press('Try again');
    expect(screen.queryByText('Result')).toBeNull();
    await press('Submit');
    await waitFor(() => expect(calls.submit).toHaveLength(2));
    expect(calls.submit[1].session).not.toBe(calls.submit[0].session);
  });

  it('a graded check offers Try again, which deals the check afresh', async () => {
    await mount(C);
    await waitFor(() => expect(screen.getByText(/Which one\?/)).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByRole('radio', { name: 'Left' })); });
    await press('Submit');
    await waitFor(() => expect(screen.getByText('Because of the right side.')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Submit' })).toBeNull();
    await press('Try again');
    await waitFor(() => expect(calls.start).toEqual([C, C]));
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Left' })).not.toBeChecked());
    expect(screen.queryByText('Because of the right side.')).toBeNull();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
  });
});

describe('switching activities', () => {
  it('opens the next code exercise with its own starter, not the previous one\'s code', async () => {
    await mount(A);
    await waitFor(() => expect(editor().value).toBe(`STARTER_FOR_${A}`));
    await type('my solution for A');
    await act(async () => { fireEvent.click(screen.getByRole('link', { name: /Activity B/ })); });
    await waitFor(() => expect(screen.getByText(`prompt ${B}`)).toBeInTheDocument());
    expect(calls.start).toEqual([A, B]);
    expect(editor().value).toBe(`STARTER_FOR_${B}`);
    await wait(1100);
    expect(calls.drafts.filter((one) => one.activityId === B && one.code === 'my solution for A')).toHaveLength(0);
  });
});

describe('the draft autosave', () => {
  it('sends one save at a time with the revision the last one returned, so typing during a save is not a conflict', async () => {
    calls.draftDelay = 1500;
    await mount(A);
    await waitFor(() => expect(editor().value).toBe(`STARTER_FOR_${A}`));
    await type('a');
    await wait(1000); // the first save left at 900 ms and is still on its way
    await type('ab'); // its debounce fires while the first save is in flight
    await wait(3500);
    expect(calls.drafts.map((one) => [one.expected, one.code])).toEqual([[0, 'a'], [1, 'ab']]);
    expect(calls.mostInFlight).toBe(1);
    expect(status()).toBe('Draft saved');
  }, 15_000);

  it('keeps a draft on this device while offline and saves it when the connection is back', async () => {
    await mount(A);
    await waitFor(() => expect(editor().value).toBe(`STARTER_FOR_${A}`));
    Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true });
    await type('written offline');
    await wait(1000);
    expect(status()).toBe('Offline. Kept on this device; it will save when you reconnect.');
    expect(calls.drafts).toHaveLength(0);
    expect(localStorage.getItem(`devshark:path:draft:${ENROLLMENT}:${A}`)).toContain('written offline');
    Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true });
    await act(async () => { window.dispatchEvent(new Event('online')); });
    await waitFor(() => expect(calls.drafts.map((one) => one.code)).toEqual(['written offline']));
    await waitFor(() => expect(status()).toBe('Draft saved'));
    expect(localStorage.getItem(`devshark:path:draft:${ENROLLMENT}:${A}`)).toBeNull();
  });

  it('opens with the copy kept on this device when the server has nothing newer, and saves it', async () => {
    localStorage.setItem(`devshark:path:draft:${ENROLLMENT}:${A}`, JSON.stringify({ baseRevision: 0, content: { code: 'kept from last time' } }));
    await mount(A);
    await waitFor(() => expect(editor().value).toBe('kept from last time'));
    await waitFor(() => expect(calls.drafts.map((one) => [one.expected, one.code])).toEqual([[0, 'kept from last time']]));
  });

  it('prefers the server\'s draft when another device saved after the copy on this one', async () => {
    localStorage.setItem(`devshark:path:draft:${ENROLLMENT}:${A}`, JSON.stringify({ baseRevision: 1, content: { code: 'older, from here' } }));
    calls.serverRevision = 2;
    calls.serverDraft = { activityId: A, revision: 2, content: { code: 'newer, from the laptop' }, updatedAt: '' };
    await mount(A);
    await waitFor(() => expect(editor().value).toBe('newer, from the laptop'));
    expect(calls.drafts).toHaveLength(0);
    expect(localStorage.getItem(`devshark:path:draft:${ENROLLMENT}:${A}`)).toBeNull();
  });
});
