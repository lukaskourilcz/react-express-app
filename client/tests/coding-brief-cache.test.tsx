// A task page reads its brief apart from the caller's part (#587 C23). The
// brief, the same for everyone, is a public read this tab keeps per task; the
// caller's part (the sealed session, the lock, the progress, the draft) is
// read afresh on every visit, as the combined answer was. A page whose session
// was sealed against another version of the brief reads the brief again past
// the browser's cache before it draws. The Learn link and Premium tasks still
// read the combined answer.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { server } from './mocks/server';
import { codingBriefQuery, useCodingTask } from '../src/coding/api';
import { splitsTaskRead } from '../src/coding/taskRead';
import type { CodingTaskResponse } from '../../shared/coding-api';

const FREE_ID = 'js-double-numbers';
const PREMIUM_ID = 'js-palindrome';

const taskOf = (id: string, title: string) => ({ id, track: 'javascript', title, prompt: 'Double each value.', starter: '', hints: [], review: { version: 'v1', status: 'unreviewed' } });

interface Stand {
  /** Every roadmap GET or POST, by resource, with the fetch's cache mode. */
  seen: { resource: string | null; method: string; cache: RequestCache | undefined }[];
  brief: { title: string; version: string };
  state: { session: string; briefVersion: string };
}

function stand(): Stand {
  const out: Stand = { seen: [], brief: { title: 'Double them', version: 'v1' }, state: { session: 'S1', briefVersion: 'v1' } };
  server.use(http.all('*/api/quiz/roadmap', ({ request }) => {
    const url = new URL(request.url);
    const resource = url.searchParams.get('resource');
    const id = url.searchParams.get('id') ?? '';
    if (resource === 'coding-brief') return HttpResponse.json({ task: taskOf(id, out.brief.title), version: out.brief.version });
    if (resource === 'coding-state') {
      return HttpResponse.json({ session: out.state.session, locked: null, progress: null, draft: null, draftUpdatedAt: null, signedIn: false, dealt: {}, briefVersion: out.state.briefVersion });
    }
    if (resource === 'coding-task') {
      return HttpResponse.json({ task: taskOf(id, 'Combined'), session: 'C1', locked: null, progress: null, draft: null, draftUpdatedAt: null, signedIn: false });
    }
    return HttpResponse.json({ error: { code: 'not_found', message: 'Not found' } }, { status: 404 });
  }));
  // The cache mode each request asked the browser for.
  const fetch = globalThis.fetch;
  vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = new URL(String(input instanceof Request ? input.url : input), 'http://localhost');
    if (url.pathname === '/api/quiz/roadmap') out.seen.push({ resource: url.searchParams.get('resource'), method: init?.method ?? 'GET', cache: init?.cache });
    return fetch(input, init);
  });
  return out;
}

const clientWith = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrap = (client: QueryClient) => ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
const resources = (api: Stand) => api.seen.map((one) => one.resource).sort();

afterEach(() => { vi.restoreAllMocks(); });

describe('a coding task page’s reads', () => {
  it('reads a free task’s brief and the caller’s part apart, and takes the brief from this tab on a return', async () => {
    const api = stand();
    const client = clientWith();
    const first = renderHook(() => useCodingTask(FREE_ID, undefined, splitsTaskRead(FREE_ID)), { wrapper: wrap(client) });
    await waitFor(() => expect(first.result.current.data).toBeDefined());
    expect(first.result.current.data).toMatchObject({ task: { id: FREE_ID, title: 'Double them' }, session: 'S1', signedIn: false });
    expect(resources(api)).toEqual(['coding-brief', 'coding-state']);
    first.unmount();
    // The caller's part is kept by nobody once the screen is gone.
    await waitFor(() => expect(client.getQueryCache().findAll({ queryKey: ['coding', 'task', FREE_ID] })).toHaveLength(0));

    // A return: the caller's part is read again, the brief is not.
    api.state.session = 'S2';
    const back = renderHook(() => useCodingTask(FREE_ID, undefined, splitsTaskRead(FREE_ID)), { wrapper: wrap(client) });
    await waitFor(() => expect(back.result.current.data?.session).toBe('S2'));
    expect(back.result.current.data?.task.title).toBe('Double them');
    expect(resources(api)).toEqual(['coding-brief', 'coding-state', 'coding-state']);
    back.unmount();
    expect(client.getQueryData(codingBriefQuery(FREE_ID).queryKey)?.task.title).toBe('Double them');
  });

  it('reads the brief again past the browser’s cache when the session names another version, and never draws the old one', async () => {
    const api = stand();
    const client = clientWith();
    // This tab holds the brief from before a deploy.
    client.setQueryData(codingBriefQuery(FREE_ID).queryKey, { task: taskOf(FREE_ID, 'Old brief') as never, version: 'v1' });
    api.brief = { title: 'New brief', version: 'v2' };
    api.state.briefVersion = 'v2';
    const drawn: (CodingTaskResponse | undefined)[] = [];
    const page = renderHook(() => { const read = useCodingTask(FREE_ID, undefined, splitsTaskRead(FREE_ID)); drawn.push(read.data); return read; }, { wrapper: wrap(client) });
    await waitFor(() => expect(page.result.current.data?.task.title).toBe('New brief'));
    expect(drawn.some((data) => data?.task.title === 'Old brief')).toBe(false);
    expect(api.seen.filter((one) => one.resource === 'coding-brief').map((one) => one.cache)).toEqual(['no-cache']);
  });

  it('keeps what it showed while a refresh brings a new session and brief, then shows both together', async () => {
    const api = stand();
    const client = clientWith();
    const drawn: (CodingTaskResponse | undefined)[] = [];
    const page = renderHook(() => { const read = useCodingTask(FREE_ID, undefined, splitsTaskRead(FREE_ID)); drawn.push(read.data); return read; }, { wrapper: wrap(client) });
    await waitFor(() => expect(page.result.current.data?.session).toBe('S1'));
    // The task changed on the server: a new session sealed against a new brief.
    api.brief = { title: 'Changed brief', version: 'v2' };
    api.state = { session: 'S2', briefVersion: 'v2' };
    let refreshed: { error: unknown } | undefined;
    await act(async () => { refreshed = await page.result.current.refetch(); });
    expect(refreshed?.error).toBeNull();
    await waitFor(() => expect(page.result.current.data).toMatchObject({ session: 'S2', task: { title: 'Changed brief' } }));
    // Never the new session over the old brief, nor nothing in between.
    const shown = drawn.slice(drawn.findIndex((data) => data?.session === 'S1'));
    expect(shown.every((data) => data !== undefined)).toBe(true);
    expect(shown.some((data) => data?.session === 'S2' && data.task.title !== 'Changed brief')).toBe(false);
    expect(api.seen.filter((one) => one.resource === 'coding-brief').map((one) => one.cache)).toEqual([undefined, 'no-cache']);
  });

  it('reads a Premium task and a Learn link in one answer, as before', async () => {
    const api = stand();
    const premium = renderHook(() => useCodingTask(PREMIUM_ID, undefined, splitsTaskRead(PREMIUM_ID)), { wrapper: wrap(clientWith()) });
    await waitFor(() => expect(premium.result.current.data?.session).toBe('C1'));
    const linked = renderHook(() => useCodingTask(FREE_ID, 'sealed-learn-session', splitsTaskRead(FREE_ID, 'sealed-learn-session')), { wrapper: wrap(clientWith()) });
    await waitFor(() => expect(linked.result.current.data?.session).toBe('C1'));
    expect(api.seen.map((one) => [one.resource, one.method])).toEqual([['coding-task', 'GET'], ['coding-task', 'POST']]);
  });
});
