// A task opens on the newer of the copy on this device and the account draft
// (C5-4). The device copy used to win whatever its age, so after one failed
// save a browser kept showing its own older code over a newer draft saved on
// another device, and its next Run overwrote that draft without a word. Code
// the account would refuse (over 20 kB) was saved anyway. The workbench is a
// stand-in that shows the code it opened with and saves on request, as Run
// and Submit do.
import { useState } from 'react';
import { beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { preloadPath } from '../src/lib/routePreload';
import { CodingTaskScreen } from '../src/components/coding/CodingSection';
import type { CodingWorkbenchProps } from '../src/coding/CodingWorkbench';
import type { CodingTaskResponse } from '../../shared/coding-api';

const mocks = vi.hoisted(() => ({
  signedIn: true,
  response: null as unknown,
  save: vi.fn(async (_id: string, _code: string) => ({ ok: true })),
}));
vi.mock('../src/lib/auth', () => ({ useAuth: () => ({ isAuthenticated: mocks.signedIn }) }));
vi.mock('../src/coding/practice', () => ({
  useBookmarks: () => ({ data: { saved: [] } }),
  useSaveChallenge: () => ({ mutate: vi.fn() }),
  usePracticeSession: () => ({ data: { session: null } }),
  useAdvanceSession: () => ({ mutate: vi.fn() }),
}));
vi.mock('../src/coding/api', () => ({
  codingKeys: { task: (id: string) => ['task', id], progress: () => ['progress'] },
  saveCodingDraft: mocks.save,
  useCodingProgress: () => ({ data: undefined }),
  // One response object per load, as the query cache hands out.
  useCodingTask: () => ({ data: mocks.response }),
}));
vi.mock('../src/coding/CodingWorkbench', () => ({
  CodingWorkbench: ({ initialCode, task, onDraft }: CodingWorkbenchProps) => {
    const [code, setCode] = useState(initialCode ?? task.starter);
    return <>
      <textarea aria-label="Code" value={code} onChange={(event) => setCode(event.target.value)} />
      <button onClick={() => onDraft?.(code)}>Run</button>
    </>;
  },
}));

const ID = 'js-digit-sum';
const COPY = `devshark:coding:draft:${ID}`;
const TIME = `devshark:coding:draft-time:${ID}`;
const minutes = (n: number) => n * 60_000;
const NOW = Date.parse('2026-10-09T12:00:00Z');
const iso = (ms: number) => new Date(ms).toISOString();

/** The task as the API sends it: the account draft and when it was saved. */
function serve(draft: string | null, draftUpdatedAt: string | null) {
  mocks.response = {
    task: { id: ID, track: 'javascript', starter: '// starter', title: { en: 'Digit sum', cs: '' } },
    session: 'session-1', locked: null, progress: null, draft, draftUpdatedAt, signedIn: mocks.signedIn,
  } as unknown as CodingTaskResponse;
}
/** A copy on this device, written at `at` while the account draft read `base`. */
function onDevice(code: string, at: number, base: string | null) {
  localStorage.setItem(COPY, code);
  localStorage.setItem(TIME, JSON.stringify({ at, base }));
}
function mount() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[`/coding/javascript/${ID}`]}>
        <LanguageProvider><Routes><Route path="/coding/:track/:taskId" element={<CodingTaskScreen />} /></Routes></LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
const ACCOUNT_NEWER = 'A newer draft from your account is open. It replaced the older copy on this device.';
const DEVICE_NEWER = 'The code on this device is newer than the draft saved to your account, so it is open here. Run or Submit to save it to your account.';

beforeAll(() => preloadPath(`/coding/javascript/${ID}`));
beforeEach(() => {
  mocks.signedIn = true;
  mocks.save.mockClear();
  mocks.save.mockImplementation(async () => ({ ok: true }));
});

it('opens a newer account draft over an older copy on this device, says so, and lets the copy go', () => {
  // This browser's save of A3 failed; another browser saved B2 a minute later.
  onDevice('// A3', NOW - minutes(2), iso(NOW - minutes(10)));
  serve('// B2', iso(NOW - minutes(1)));
  mount();
  expect(screen.getByLabelText('Code')).toHaveValue('// B2');
  expect(screen.getByRole('status')).toHaveTextContent(ACCOUNT_NEWER);
  expect(localStorage.getItem(COPY)).toBeNull();
  expect(localStorage.getItem(TIME)).toBeNull();
});

it('opens a newer copy on this device over an older account draft, and says it is not saved there yet', () => {
  onDevice('// mine, typed after the last save', NOW - minutes(1), iso(NOW - minutes(30)));
  serve('// older account draft', iso(NOW - minutes(5)));
  mount();
  expect(screen.getByLabelText('Code')).toHaveValue('// mine, typed after the last save');
  expect(screen.getByRole('status')).toHaveTextContent(DEVICE_NEWER);
  expect(localStorage.getItem(COPY)).toBe('// mine, typed after the last save');
});

it('keeps this device’s copy when nothing saved the account draft since, whatever this clock says', () => {
  // The device clock runs ten minutes slow: by time alone the account looks newer.
  const seen = iso(NOW - minutes(3));
  onDevice('// after a failed save', NOW - minutes(12), seen);
  serve('// what this device loaded', seen);
  mount();
  expect(screen.getByLabelText('Code')).toHaveValue('// after a failed save');
  expect(screen.getByRole('status')).toHaveTextContent(DEVICE_NEWER);
});

it('says nothing when both copies hold the same code', () => {
  onDevice('// same', NOW - minutes(2), null);
  serve('// same', iso(NOW - minutes(1)));
  mount();
  expect(screen.getByLabelText('Code')).toHaveValue('// same');
  expect(screen.queryByRole('status')).toBeNull();
});

it('keeps a copy written before its time was kept, as before', () => {
  localStorage.setItem(COPY, '// from an older build');
  serve('// account draft', iso(NOW - minutes(1)));
  mount();
  expect(screen.getByLabelText('Code')).toHaveValue('// from an older build');
  expect(screen.queryByRole('status')).toBeNull();
});

it('opens the account draft on a device with no copy', () => {
  serve('// account draft', iso(NOW - minutes(1)));
  mount();
  expect(screen.getByLabelText('Code')).toHaveValue('// account draft');
  expect(screen.queryByRole('status')).toBeNull();
});

it('opens a guest’s copy, which has no account draft to weigh', () => {
  mocks.signedIn = false;
  onDevice('// guest code', NOW - minutes(1), null);
  serve(null, null);
  mount();
  expect(screen.getByLabelText('Code')).toHaveValue('// guest code');
  expect(screen.queryByRole('status')).toBeNull();
});

it('saves a run on this device with its time, then to the account, and lets the copy go once the account has it', async () => {
  serve(null, null);
  mount();
  fireEvent.change(screen.getByLabelText('Code'), { target: { value: '// ran' } });
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Run' })));
  expect(mocks.save).toHaveBeenCalledWith(ID, '// ran');
  expect(localStorage.getItem(COPY)).toBeNull();

  mocks.save.mockRejectedValueOnce(new Error('offline'));
  const before = Date.now();
  fireEvent.change(screen.getByLabelText('Code'), { target: { value: '// ran offline' } });
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Run' })));
  expect(localStorage.getItem(COPY)).toBe('// ran offline');
  const time = JSON.parse(localStorage.getItem(TIME) ?? 'null') as { at: number; base: string | null };
  expect(time.at).toBeGreaterThanOrEqual(before);
  expect(time.base).toBeNull();
});

it('saves nothing, here or to the account, for code the account would refuse', async () => {
  onDevice('// the last code that fit', NOW - minutes(1), null);
  serve(null, null);
  mount();
  const oversize = `// ${'x'.repeat(21 * 1024)}`;
  fireEvent.change(screen.getByLabelText('Code'), { target: { value: oversize } });
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Run' })));
  expect(mocks.save).not.toHaveBeenCalled();
  expect(localStorage.getItem(COPY)).toBe('// the last code that fit');
});
