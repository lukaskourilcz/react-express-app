// The FDE overview and module pages' first reads leave with the pages' code,
// through the route preload, not once the page has drawn (perf baseline #587
// C27): the path catalogue and, for the stored session's account, its
// enrollments, under the keys the page's own queries use. The screens that
// link to the path pages add it as they load, so the app's first download
// carries none of it.
import { describe, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from './mocks/server';

vi.mock('../src/lib/supabaseClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/lib/supabaseClient')>()),
  storedSessionUserId: () => 'user-stored',
  freshStoredAccessToken: () => 'stored-token',
}));

describe('the path pages’ route preload', () => {
  it('asks for the catalogue and the stored account’s enrollments on a path page only', async () => {
    const asked: string[] = [];
    server.use(
      http.get('*/api/quiz/roadmap', ({ request }) => {
        asked.push(new URL(request.url).searchParams.get('resource') ?? '');
        return HttpResponse.json({ versions: {}, paths: [] });
      }),
      http.get('*/api/user/*', ({ request }) => {
        asked.push(new URL(request.url).searchParams.get('op') ?? '');
        return HttpResponse.json({ enrollments: [] });
      }),
    );
    const { learningPathKeys } = await import('../src/lib/learningPaths');
    const { preloadPath } = await import('../src/lib/routePreload');
    const { queryClient } = await import('../src/lib/queryClient');
    const { isPathPage } = await import('../src/lib/learningPathWorkspace');

    // The main chunk's modules alone add nothing to the path pages' preload.
    await preloadPath('/learn/forward-deployed-engineer/path');
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(asked).toEqual([]);
    // The FDE section's path shelf, which links to the overview, adds it.
    await import('../src/components/paths/PathShelf');

    expect(isPathPage('/learn/forward-deployed-engineer/path')).toBe(true);
    expect(isPathPage('/learn/forward-deployed-engineer/path/fde-v1-m01')).toBe(true);
    expect(isPathPage('/learn/forward-deployed-engineer')).toBe(false);
    expect(isPathPage('/learn/forward-deployed-engineer/path/fde-v1-m01/extra')).toBe(false);

    await preloadPath('/learn/web-developer');
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(asked).toEqual([]);

    await preloadPath('/learn/forward-deployed-engineer/path/fde-v1-m01');
    await waitFor(() => expect(asked.sort()).toEqual(['learning-path-catalog', 'learning-path-enrollment']));
    // Under the keys the pages read, so the page finds them answered.
    await waitFor(() => expect(queryClient.getQueryData(learningPathKeys.enrollments('user-stored'))).toEqual({ enrollments: [] }));
    expect(queryClient.getQueryData(learningPathKeys.catalog())).toEqual({ versions: {}, paths: [] });
  });
});
