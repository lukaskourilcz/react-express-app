// A path code exercise's editor (CodeMirror, about 170 KB gzip) loads beside
// the activity's start, and an editor already in is drawn with the brief.
// Found by the paths walk (#587): the editor's fetch began only once the
// start had answered, and then React held its Suspense reveal back for up to
// 300 ms more, so the editor showed about 330 ms after the brief.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from '../src/i18n/LanguageContext';

const CODE = 'fde-v1-m01-linear-accumulator';
const LESSON = 'fde-v1-m01-l1-read';
const summary = (id: string, kind: string) => ({
  id, kind, purpose: 'exercise', verification: 'machine_verified', title: id, summary: '', competencies: [], estimatedMinutes: 5,
  ...(kind === 'code' ? { language: 'javascript' } : {}),
});
const manifest = {
  id: 'fde', kind: 'role_specialization', version: 1, title: 'FDE', summary: '', outcomes: [], nonGoals: [],
  entryRequirement: '', competencies: [], bridges: [], rubric: { version: 1, dimensions: [] }, diagnosticActivityId: null,
  estimatedHours: { min: 1, max: 2 }, sources: [], reviewedOn: '2026-01-01', completionLabel: 'done',
  modules: [{
    id: 'fde-v1-m01', title: 'M01', outcomes: [], competencies: [], dependsOn: [], lessons: [],
    activities: [summary(LESSON, 'lesson'), summary(CODE, 'code')], requires: [], estimatedMinutes: 10,
  }],
};

const editorLoads = vi.hoisted(() => ({ count: 0 }));
vi.mock('../src/coding/loadEditor', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/coding/loadEditor')>();
  return { ...actual, loadEditor: () => { editorLoads.count += 1; return actual.loadEditor(); } };
});
vi.mock('../src/coding/Editor', () => ({
  Editor: ({ value, ariaLabel }: { value: string; ariaLabel: string }) => <textarea aria-label={ariaLabel} value={value} readOnly />,
}));
vi.mock('../src/lib/auth', () => ({ useAuth: () => ({ user: { id: 'user-1' }, isAuthenticated: true, isLoading: false }) }));
vi.mock('../src/lib/entitlement', () => ({
  useEntitlement: () => ({ tier: 'premium', signedIn: true, loading: false, failed: false, data: null, refetch: () => {} }),
}));
vi.mock('../src/lib/learningPaths', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lib/learningPaths')>();
  const catalog = { isLoading: false, isError: false, data: { paths: [{ manifest, availability: 'available', inventory: {} }], versions: {} }, refetch: () => {} };
  const enrollments = { data: { enrollments: [{ enrollmentId: 'ENROLL0000000000aaaa', pathId: 'fde', curriculumVersion: 1, status: 'active', baseTrackAtEnrollment: null, startedAt: '', updatedAt: '' }] } };
  return {
    ...actual,
    usePathCatalog: () => catalog,
    useEnrollments: () => enrollments,
    usePathProgress: () => ({ data: undefined }),
    // The start never answers here: whatever loads, loads beside it.
    startActivity: vi.fn(() => new Promise(() => {})),
  };
});

beforeAll(() => import('../src/components/paths/LearningPathScreens'), 60_000);

async function mount(activityId: string) {
  const { FdeModule } = await import('../src/components/paths/LearningPathScreens');
  await act(async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={[`/learn/forward-deployed-engineer/path/fde-v1-m01?activity=${activityId}`]}>
          <LanguageProvider>
            <Routes><Route path="/learn/forward-deployed-engineer/path/:moduleId" element={<FdeModule />} /></Routes>
          </LanguageProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  });
}

describe('a path code exercise’s editor', () => {
  it('is not loaded for a lesson', async () => {
    await mount(LESSON);
    expect(editorLoads.count).toBe(0);
  });

  it('starts loading while the activity’s start is still on its way', async () => {
    await mount(CODE);
    expect(editorLoads.count).toBeGreaterThan(0);
  });

  it('draws with the brief, without a loading box, once its code is in', async () => {
    const { loadEditor } = await import('../src/coding/loadEditor');
    await loadEditor();
    const { CodeActivity } = await import('../src/components/paths/ActivityViews');
    render(
      <LanguageProvider>
        <CodeActivity code={{ language: 'javascript', prompt: 'Sum it.', starter: 'const sum = 0;', hints: [], tests: [] } as never}
          draft={null} result={null} onSubmit={() => {}} onDraft={() => {}} draftStatus="idle" busy={false} />
      </LanguageProvider>,
    );
    // In the first commit, not after a Suspense fallback.
    expect(screen.getByRole('textbox', { name: 'Your solution' })).toHaveValue('const sum = 0;');
  });
});
