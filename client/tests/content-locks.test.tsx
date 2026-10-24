// The Learn map, Career and the FDE screens lock through lib/contentLocks.ts,
// which needs no coding index (perf baseline #587 C11): it answers every
// Learn level, part test, path and path activity exactly as lib/locks.ts
// does, and neither it nor the Learn map loads shared/coding-index.ts.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { GatedContent } from '../../shared/tiers';
import { server } from './mocks/server';

const loads = vi.hoisted(() => ({ codingIndex: 0 }));
vi.mock('../../shared/coding-index', async (importOriginal) => {
  loads.codingIndex += 1;
  return importOriginal();
});
const auth = vi.hoisted(() => ({ value: { user: null as { id: string } | null, isAuthenticated: false, isLoading: false } }));
vi.mock('../src/lib/auth', async (importOriginal) => ({ ...(await importOriginal<typeof import('../src/lib/auth')>()), useAuth: () => auth.value }));
afterEach(() => { auth.value = { user: null, isAuthenticated: false, isLoading: false }; });

const FREE = { tier: 'free', source: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, inGrace: false, validUntil: null };
const plan = (tier: 'free' | 'premium') => server.use(http.get('*/api/user/*', () => HttpResponse.json({ ...FREE, tier })));
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}>{children}</QueryClientProvider>;
}

const MANIFEST = {
  id: 'fde' as const, diagnosticActivityId: 'fde-v1-diag-check',
  modules: [
    { id: 'fde-v1-diag', title: 'Diagnostic', optional: true, activities: [{ id: 'fde-v1-diag-check' }] },
    { id: 'fde-v1-m01', title: 'M01', activities: [{ id: 'fde-v1-m01-l1-read' }] },
    { id: 'fde-v1-m02', title: 'M02', activities: [{ id: 'fde-v1-m02-l1-read' }] },
  ],
} as never;
const LEVEL_COUNTS = { react: 15, javascript: 15, dsa: 15 };
const CONTENT: GatedContent[] = [
  { kind: 'learn-level', topic: 'react', level: 12 },
  { kind: 'learn-level', topic: 'react', level: 13 },
  { kind: 'learn-level', topic: 'html', level: 6 },
  { kind: 'learn-level', topic: 'dsa', level: 6 },
  { kind: 'learn-part-test', topic: 'react', part: 1 },
  { kind: 'learn-part-test', topic: 'react', part: 3 },
  { kind: 'learn-part-test', topic: 'javascript', part: 2 },
  { kind: 'learning-path', pathId: 'fde' },
  { kind: 'learning-path-activity', pathId: 'fde', activityId: 'fde-v1-diag-check' },
  { kind: 'learning-path-activity', pathId: 'fde', activityId: 'fde-v1-m01-l1-read' },
  { kind: 'learning-path-activity', pathId: 'fde', activityId: 'fde-v1-m02-l1-read' },
];

describe('content locks without the coding index', () => {
  it('loads no coding index with the Learn map, Career or the FDE screens', async () => {
    await import('../src/lib/contentLocks');
    await import('../src/components/Roadmap');
    await import('../src/components/CareerRoadmap');
    await import('../src/components/paths/LearningPathScreens');
    await import('../src/components/paths/PathShelf');
    expect(loads.codingIndex).toBe(0);
  });

  it.each(['guest', 'free', 'premium'] as const)('answers every non-coding lock as lib/locks.ts does, %s', async (who) => {
    if (who !== 'guest') {
      auth.value = { user: { id: `user-${who}` }, isAuthenticated: true, isLoading: false };
      plan(who);
    }
    const { useContentLocks } = await import('../src/lib/contentLocks');
    const { useLocks } = await import('../src/lib/locks');
    const paths = [MANIFEST];
    const { result } = renderHook(() => ({ light: useContentLocks(LEVEL_COUNTS, { paths }), full: useLocks(LEVEL_COUNTS, { paths }) }), { wrapper });
    if (who !== 'guest') await waitFor(() => expect(result.current.full.tier).toBe(who));
    const light = CONTENT.map((content) => result.current.light.lockOf(content as never));
    const full = CONTENT.map((content) => result.current.full.lockOf(content));
    expect(light).toEqual(full);
    // Not all open: the comparison covers real locks.
    if (who === 'free') expect(full).toContain('locked');
  });
});
