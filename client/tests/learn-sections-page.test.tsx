// The Learn page's sections (#488): a level stays open while the address
// moves to another section, and a section's single action joins it, asks a
// visitor to sign in, or sends an account with no plan to choose one.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import Roadmap from '../src/components/Roadmap';
import { clearAccountData } from '../src/lib/accountData';
import type { RoadmapStructure } from '../src/types/quiz';
import { server } from './mocks/server';

const auth = vi.hoisted(() => ({
  value: { user: null as null | Record<string, unknown>, isAuthenticated: false, isLoading: false, signInWithGoogle: async () => {} },
}));
vi.mock('../src/lib/auth', async (importOriginal) => ({ ...(await importOriginal<typeof import('../src/lib/auth')>()), useAuth: () => auth.value }));

const saves = vi.hoisted(() => ({ calls: [] as unknown[][], results: [] as unknown[] }));
vi.mock('../src/lib/trackPref', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/lib/trackPref')>()),
  saveLearningPreference: async (...args: unknown[]) => {
    saves.calls.push(args);
    return saves.results.shift() ?? { ok: true, preference: args[1] };
  },
}));

const signIns = vi.hoisted(() => ({ calls: [] as unknown[] }));
vi.mock('../src/lib/signInDialog', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/lib/signInDialog')>()),
  openSignIn: (detail: unknown) => { signIns.calls.push(detail); },
}));

const FRONTEND = { schemaVersion: 1, baseTrack: 'frontend', specialization: null };
const signIn = (metadata: Record<string, unknown>) => {
  auth.value = { ...auth.value, user: { id: 'user-1', user_metadata: metadata }, isAuthenticated: true };
};
beforeAll(() => { vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }); });
afterEach(() => {
  auth.value = { ...auth.value, user: null, isAuthenticated: false };
  saves.calls = [];
  saves.results = [];
  signIns.calls = [];
  localStorage.clear();
  window.history.replaceState({}, '', '/');
});

const level = (n: number) => ({ level: n, title: `Level ${n} title`, difficulty: 1 as const, questionCount: 8 });
const levels = (count: number) => Array.from({ length: count }, (_, i) => level(i + 1));
const STRUCTURE = {
  topics: ['javascript', 'html', 'git', 'dsa', 'algorithms'],
  structure: Object.fromEntries(['javascript', 'html', 'git', 'dsa', 'algorithms'].map((topic) => [topic, { levels: levels(10), checkpoints: [] }])),
} as unknown as RoadmapStructure;
const QUESTION = { id: 'q-1', tags: [], introduction: '', question: 'Which option is first?', options: ['Option A', 'Option B'], category: 'html', difficulty: 1 };
const FREE = { tier: 'free', source: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, inGrace: false, validUntil: null };

function answer(progress: Record<string, unknown> = {}) {
  server.use(
    http.get('*/api/quiz/roadmap', ({ request }) => {
      const params = new URL(request.url).searchParams;
      const resource = params.get('resource');
      if (resource === 'progress') return HttpResponse.json({ data: progress, extra: { unlocked: [] } });
      if (resource === 'learning-path-catalog') return HttpResponse.json({ versions: {}, paths: [] });
      if (resource === 'eligibility') return HttpResponse.json({ error: { code: 'not_found', message: 'Not found' } }, { status: 404 });
      const lvl = params.get('level');
      if (lvl) return HttpResponse.json({ kind: 'level', topic: params.get('topic'), ref: Number(lvl), title: `Level ${lvl} title`, passPct: 75, sessionId: `session-${lvl}`, questions: [QUESTION] });
      return HttpResponse.json(STRUCTURE as never);
    }),
    http.get('*/api/user/*', ({ request }) => new URL(request.url).searchParams.get('op') === 'entitlement'
      ? HttpResponse.json(FREE)
      : HttpResponse.json({ enrollments: [] })),
    http.all('*/api/*', () => HttpResponse.json({ error: { code: 'not_found', message: 'Not found' } }, { status: 404 })),
  );
  localStorage.setItem('devquiz:roadmap:v2', JSON.stringify(progress));
}

/** Moves the address the way Back, Forward or a nav link would. */
function NavProbe() {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <>
      <button type="button" onClick={() => navigate('/learn/software-engineer')}>probe: software engineer</button>
      <output data-testid="probe-path">{location.pathname + location.search}</output>
    </>
  );
}

let visits = 0;
async function mountAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const url = new URL(path, 'http://localhost');
  window.history.replaceState({}, '', path);
  await act(async () => render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[{ pathname: url.pathname, search: url.search, key: `sections-${++visits}` }]}>
        <LanguageProvider>
          <NavProbe />
          <Routes><Route path="/learn/:section?" element={<Roadmap />} /></Routes>
        </LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  ));
}

const notInPlan = () => screen.queryAllByRole('radio', { name: /not in your plan/ });

describe('the section switch while a level is open', () => {
  it('keeps the level on screen and shows the new section once the learner leaves it', async () => {
    answer();
    await mountAt('/learn/web-developer?topic=html&level=1');
    const start = await screen.findByRole('button', { name: 'Start the level' }, { timeout: 5000 }).catch(() => null);
    if (start) fireEvent.click(start);
    expect(await screen.findByText('Which option is first?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'probe: software engineer' }));
    expect(screen.getByTestId('probe-path')).toHaveTextContent('/learn/software-engineer');
    expect(screen.getByText('Which option is first?')).toBeInTheDocument();
    expect(screen.queryByRole('radiogroup', { name: 'Learn sections' })).toBeNull();

    fireEvent.click(screen.getAllByRole('button', { name: 'Exit lesson' })[0]);
    expect(await screen.findByRole('radio', { name: /^Algorithms/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /^Software Engineer/ })).toHaveAttribute('aria-checked', 'true');
  });
});

describe('the section switcher', () => {
  it('resolves /learn to a section and names it in the address', async () => {
    answer();
    await mountAt('/learn?topic=dsa');
    await waitFor(() => expect(screen.getByTestId('probe-path')).toHaveTextContent('/learn/software-engineer?topic=dsa'));
    expect(await screen.findByRole('radio', { name: /^DSA Foundations/ })).toBeInTheDocument();
  });

  it('opens no level from a ?level deep link into a topic that is locked on this device', async () => {
    answer();
    const levelRequests: string[] = [];
    server.events.on('request:start', ({ request }) => {
      if (new URL(request.url).searchParams.get('level')) levelRequests.push(request.url);
    });
    await mountAt('/learn?topic=dsa&level=1');
    expect(await screen.findByText('Nothing here is open yet')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /^DSA Foundations — Locked/ })).toBeDisabled();
    expect(screen.queryByText('Which option is first?')).toBeNull();
    expect(levelRequests).toEqual([]);
    server.events.removeAllListeners('request:start');
  });
});

describe('joining Software Engineer', () => {
  it('saves the union of sections and opens the topics before the session catches up', async () => {
    signIn({ devquiz_learning_preference_v1: FRONTEND });
    answer({ javascript: { levels: Object.fromEntries(levels(5).map(({ level: n }) => [String(n), { passed: true }])), checkpoints: {} } });
    await mountAt('/learn/software-engineer');
    expect(await screen.findByRole('radio', { name: /^Algorithms, not in your plan/ })).toBeDisabled();
    expect(screen.getByRole('radio', { name: /^Git, Premium$/ })).not.toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Add it to your plan' }));
    expect(await screen.findByText(/Software Engineer is in your plan\./)).toBeInTheDocument();
    expect(saves.calls).toEqual([['user-1', { schemaVersion: 1, baseTrack: 'frontend', specialization: null }, { sections: ['software-engineer'] }]]);
    expect(notInPlan()).toHaveLength(0);
    expect(screen.getByRole('radio', { name: /^Algorithms/ })).not.toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Add it to your plan' })).toBeNull();
    // The button is gone; focus is on the line that replaced it.
    expect(screen.getByText(/Software Engineer is in your plan\./)).toHaveFocus();

    // The saved line is said once: leaving the section and coming back drops it.
    fireEvent.click(screen.getByRole('radio', { name: /^Web Developer/ }));
    await waitFor(() => expect(screen.getByTestId('probe-path')).toHaveTextContent('/learn/web-developer'));
    fireEvent.click(screen.getByRole('radio', { name: /^Software Engineer/ }));
    expect(await screen.findByRole('radio', { name: /^Algorithms/ })).toBeInTheDocument();
    expect(screen.queryByText(/Software Engineer is in your plan\./)).toBeNull();
  });

  // The session had not read the join back (its refresh failed) when the
  // account signed out and another signed in on the same page: the pending
  // join planned the next account with a section it never joined.
  it('drops a join the session has not read back when the account changes', async () => {
    signIn({ devquiz_learning_preference_v1: FRONTEND });
    answer();
    await mountAt('/learn/software-engineer');
    fireEvent.click(await screen.findByRole('button', { name: 'Add it to your plan' }));
    expect(await screen.findByText(/Software Engineer is in your plan\./)).toBeInTheDocument();
    expect(notInPlan()).toHaveLength(0);

    auth.value = { ...auth.value, user: { id: 'user-2', user_metadata: { devquiz_learning_preference_v1: FRONTEND } }, isAuthenticated: true };
    act(() => clearAccountData());
    expect(await screen.findByRole('radio', { name: /^Algorithms, not in your plan/ })).toBeDisabled();
    expect(screen.queryByText(/Software Engineer is in your plan\./)).toBeNull();
    expect(screen.getByRole('button', { name: 'Add it to your plan' })).toBeInTheDocument();
  });

  it('drops a join whose save lands after the account changed', async () => {
    signIn({ devquiz_learning_preference_v1: FRONTEND });
    answer();
    let land!: (outcome: unknown) => void;
    saves.results.push(new Promise((resolve) => { land = resolve; }));
    await mountAt('/learn/software-engineer');
    fireEvent.click(await screen.findByRole('button', { name: 'Add it to your plan' }));
    await waitFor(() => expect(saves.calls).toHaveLength(1));

    auth.value = { ...auth.value, user: { id: 'user-2', user_metadata: { devquiz_learning_preference_v1: FRONTEND } }, isAuthenticated: true };
    act(() => clearAccountData());
    await act(async () => { land({ ok: true, preference: FRONTEND }); });
    expect(await screen.findByRole('radio', { name: /^Algorithms, not in your plan/ })).toBeDisabled();
    expect(screen.queryByText(/Software Engineer is in your plan\./)).toBeNull();
  });

  it('saves once when Add is clicked twice before it re-renders', async () => {
    signIn({ devquiz_learning_preference_v1: FRONTEND });
    answer();
    await mountAt('/learn/software-engineer');
    const add = await screen.findByRole('button', { name: 'Add it to your plan' });
    act(() => {
      add.click();
      add.click();
    });
    expect(await screen.findByText(/Software Engineer is in your plan\./)).toBeInTheDocument();
    expect(saves.calls).toHaveLength(1);
  });

  it('reports a failed save with one Try again, which saves again', async () => {
    signIn({ devquiz_learning_preference_v1: FRONTEND });
    answer();
    saves.results.push({ ok: false, reason: 'network', message: 'network' });
    await mountAt('/learn/software-engineer');
    fireEvent.click(await screen.findByRole('button', { name: 'Add it to your plan' }));
    expect(await screen.findByText('Software Engineer was not added to your plan. Try again.')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Try again' })).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Try again' })).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Add it to your plan' })).toBeNull();
    expect(notInPlan().length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText(/Software Engineer is in your plan\./)).toBeInTheDocument();
    expect(saves.calls).toHaveLength(2);
  });
});

describe('joining Forward Deployed Engineer', () => {
  // The join enrols, or resumes a paused enrollment, by the enrollment it
  // finds. Offered while the account's enrollments were still loading, it
  // found none and asked to enrol a learner who had paused the path.
  it('waits for the account’s enrollments before offering the path', async () => {
    signIn({ devquiz_learning_preference_v1: FRONTEND });
    answer();
    const manifest = {
      id: 'fde', kind: 'role_specialization', version: 1, title: 'Forward Deployed Engineer',
      summary: 'Customer-facing engineering from scoping to handoff.', entryRequirement: 'You ship code in one track.',
      estimatedHours: { min: 20, max: 30 },
      modules: [{ id: 'fde-v1-entry', title: 'Entry', activities: [{ id: 'fde-v1-entry-check', title: 'Where you start' }] }],
    };
    let release!: () => void;
    server.use(
      http.get('*/api/quiz/roadmap', ({ request }) => (new URL(request.url).searchParams.get('resource') === 'learning-path-catalog'
        ? HttpResponse.json({ versions: { fde: 1 }, paths: [{ manifest, availability: 'available', inventory: { modules: 1, lessons: 0, moduleChecks: 1, moduleCodeExercises: 0, finalCodeExercises: 0 } }] })
        : undefined)),
      http.get('*/api/user/*', ({ request }) => (new URL(request.url).searchParams.get('op') === 'learning-path-enrollment'
        ? new Promise<Response>((resolve) => { release = () => resolve(HttpResponse.json({ enrollments: [] })); })
        : undefined)),
    );
    await mountAt('/learn/forward-deployed-engineer');
    expect(await screen.findByRole('radio', { name: /^Forward Deployed Engineer/ })).toBeInTheDocument();
    await waitFor(() => expect(release).toBeTypeOf('function'));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)); });
    expect(screen.queryByRole('button', { name: 'Start the FDE path' })).toBeNull();
    await act(async () => { release(); });
    expect(await screen.findByRole('button', { name: 'Start the FDE path' })).toBeInTheDocument();
  });
});

describe('the Learn header (UX audit learn-01)', () => {
  // One h1 in every auth state; the switcher is the one place the section
  // is named, so the section body never repeats it.
  const bodyText = () => document.querySelector('.rm-section-body')?.textContent ?? '';

  it('is "Learn" for a visitor, with the section named only in the switcher', async () => {
    answer();
    await mountAt('/learn/software-engineer');
    await screen.findByRole('button', { name: 'Sign in to add it to your plan' });
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual(['Learn']);
    expect(screen.getByRole('radio', { name: /^Software Engineer/ })).toHaveAttribute('aria-checked', 'true');
    expect(bodyText()).not.toContain('Software Engineer');
    expect(screen.queryByText('Clear the levels in each part, then pass its test.')).toBeNull();
    // The device-only note is the small status in the section header.
    expect(screen.getByText(/this progress stays on this device only/).closest('.rm-section-header')).not.toBeNull();
  });

  it('stays "Learn" once signed in', async () => {
    signIn({ devquiz_learning_preference_v1: FRONTEND });
    answer();
    await mountAt('/learn/software-engineer');
    await screen.findByRole('button', { name: 'Add it to your plan' });
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual(['Learn']);
    expect(bodyText()).not.toContain('Software Engineer');
    expect(screen.queryByText(/this progress stays on this device only/)).toBeNull();
  });
});

describe('a section without a plan', () => {
  it('asks a visitor to sign in, and dims nothing', async () => {
    answer();
    await mountAt('/learn/software-engineer');
    const action = await screen.findByRole('button', { name: 'Sign in to add it to your plan' });
    expect(notInPlan()).toHaveLength(0);
    fireEvent.click(action);
    expect(signIns.calls).toEqual([{ returnTo: '/learn/software-engineer' }]);
    expect(screen.getByText(/this progress stays on this device only/)).toBeInTheDocument();
  });

  it('sends an account with no saved plan to choose one, and dims nothing', async () => {
    signIn({});
    answer();
    await mountAt('/learn/forward-deployed-engineer');
    const choose = await screen.findByRole('link', { name: 'Choose your plan' });
    expect(choose).toHaveAttribute('href', '/profile#learning-plan');
    fireEvent.click(choose);
    expect(notInPlan()).toHaveLength(0);
    expect(screen.queryByRole('button', { name: 'Add it to your plan' })).toBeNull();
    await waitFor(() => expect(screen.getByTestId('probe-path')).toHaveTextContent('/profile'));
  });
});
