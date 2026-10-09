// A task opens on the copy on this device or the account draft (C5-4). The
// device copy used to win whatever its age, so after one failed save a
// browser kept showing its own older code over a newer draft saved on another
// device, and its next Run overwrote that draft without a word. The fix that
// followed weighed this device's clock against the server's and deleted the
// loser, which lost newer code after a slow save or on a slow clock (V3-1).
// Now the copy here records the account draft's time it builds on, a save
// from this tab moves that time, and a copy that does not open is kept and
// offered back. The workbench is a stand-in that shows the code it opened
// with and saves on request, as Run and Submit do.
import { useState } from 'react';
import { beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  save: vi.fn(async (_id: string, _code: string): Promise<{ ok: true; updatedAt: string | null }> => ({ ok: true, updatedAt: null })),
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
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[`/coding/javascript/${ID}`]}>
        <LanguageProvider><Routes><Route path="/coding/:track/:taskId" element={<CodingTaskScreen />} /></Routes></LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
const ACCOUNT_NEWER = 'Your account’s draft was saved from somewhere else after this device last saw it, so it is open here. The code from this device is kept until you Run or Submit.';
const DEVICE_NEWER = 'The code on this device is newer than the draft saved to your account, so it is open here. Run or Submit to save it to your account.';
const RESTORED = 'The code from this device is open. Run or Submit to save it to your account in place of the draft there.';
/** The line that says which copy opened (the restore button inside it
 * carries a status region of its own). */
const note = () => document.querySelector('p.cd-note[role="status"]');
/** The time record of the copy on this device. */
const time = () => JSON.parse(localStorage.getItem(TIME) ?? 'null') as { base: string | null } | null;
/** Run, as the learner would, with `code` in the editor. */
async function run(code: string) {
  fireEvent.change(screen.getByLabelText('Code'), { target: { value: code } });
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Run' })));
}
/** A save the test answers later. */
function deferredSave() {
  let answer!: (value: { ok: true; updatedAt: string | null }) => void;
  mocks.save.mockImplementationOnce(() => new Promise((resolve) => { answer = resolve; }));
  return (updatedAt: string) => act(async () => answer({ ok: true, updatedAt }));
}

beforeAll(() => preloadPath(`/coding/javascript/${ID}`));
beforeEach(() => {
  mocks.signedIn = true;
  mocks.save.mockClear();
  mocks.save.mockImplementation(async () => ({ ok: true, updatedAt: null }));
});

it('opens an account draft saved elsewhere since this device’s copy, keeps the copy, and opens it on request', async () => {
  // This browser's save of A3 failed; another browser saved B2 since.
  const saved = iso(NOW - minutes(1));
  onDevice('// A3', NOW - minutes(2), iso(NOW - minutes(10)));
  serve('// B2', saved);
  const view = mount();
  expect(screen.getByLabelText('Code')).toHaveValue('// B2');
  expect(note()).toHaveTextContent(ACCOUNT_NEWER);
  expect(localStorage.getItem(COPY)).toBe('// A3');

  fireEvent.click(screen.getByRole('button', { name: 'Open the code from this device' }));
  expect(screen.getByLabelText('Code')).toHaveValue('// A3');
  expect(note()).toHaveTextContent(RESTORED);
  expect(note()).toHaveFocus();
  // Taken back over the draft now open, so the next visit opens it too.
  expect(time()?.base).toBe(saved);
  view.unmount();
  serve('// B2', saved);
  mount();
  expect(screen.getByLabelText('Code')).toHaveValue('// A3');
  expect(screen.getByRole('status')).toHaveTextContent(DEVICE_NEWER);
});

it('still offers the copy from this device after the learner ran the account draft', async () => {
  onDevice('// A3', NOW - minutes(2), null);
  serve('// B2', iso(NOW - minutes(1)));
  mocks.save.mockRejectedValue(new Error('offline'));
  mount();
  await run('// B2, edited');
  expect(localStorage.getItem(COPY)).toBe('// B2, edited');
  fireEvent.click(screen.getByRole('button', { name: 'Open the code from this device' }));
  expect(screen.getByLabelText('Code')).toHaveValue('// A3');
  expect(localStorage.getItem(COPY)).toBe('// A3');
});

it('opens the copy on this device when it builds on the account draft as it still is, whatever either clock says', () => {
  // The device clock runs ten minutes slow: by time alone the account looks newer.
  const seen = iso(NOW - minutes(3));
  onDevice('// after a failed save', NOW - minutes(12), seen);
  serve('// what this device loaded', seen);
  mount();
  expect(screen.getByLabelText('Code')).toHaveValue('// after a failed save');
  expect(screen.getByRole('status')).toHaveTextContent(DEVICE_NEWER);
});

it('does not let a later clock on this device win over a draft saved since', () => {
  onDevice('// mine', NOW + minutes(60), iso(NOW - minutes(30)));
  serve('// saved elsewhere', iso(NOW - minutes(5)));
  mount();
  expect(screen.getByLabelText('Code')).toHaveValue('// saved elsewhere');
  expect(note()).toHaveTextContent(ACCOUNT_NEWER);
  expect(localStorage.getItem(COPY)).toBe('// mine');
});

// V3-1, scenario A: two quick Runs, no clock skew. The first save is slow (a
// cold start) and lands after the second Run; the second is refused (429).
// The account then holds V1, saved after this device wrote V2.
it('opens the newer code after a slow first save and a refused second one', async () => {
  serve(null, null);
  const view = mount();
  const firstLands = deferredSave();
  await run('// V1');
  mocks.save.mockRejectedValueOnce(Object.assign(new Error('Too many requests'), { status: 429 }));
  await run('// V2');
  // One save at a time: the second waits for the first.
  expect(mocks.save).toHaveBeenCalledTimes(1);
  const landed = iso(Date.now() + 2_500);
  await firstLands(landed);
  await waitFor(() => expect(mocks.save).toHaveBeenNthCalledWith(2, ID, '// V2'));
  expect(localStorage.getItem(COPY)).toBe('// V2');
  expect(time()?.base).toBe(landed);

  view.unmount();
  serve('// V1', landed);
  mount();
  expect(screen.getByLabelText('Code')).toHaveValue('// V2');
  expect(screen.getByRole('status')).toHaveTextContent(DEVICE_NEWER);
});

// V3-1, scenario B: this device's clock runs three minutes slow. A save goes
// through, then twenty seconds of work are run offline.
it('opens the newer code on a device whose clock is slow', async () => {
  serve(null, null);
  const view = mount();
  const stored = iso(Date.now() + minutes(3));
  mocks.save.mockResolvedValueOnce({ ok: true, updatedAt: stored });
  await run('// V1, saved');
  expect(localStorage.getItem(COPY)).toBeNull();
  mocks.save.mockRejectedValueOnce(new Error('offline'));
  await run('// V2, offline');
  expect(time()?.base).toBe(stored);

  view.unmount();
  serve('// V1, saved', stored);
  mount();
  expect(screen.getByLabelText('Code')).toHaveValue('// V2, offline');
});

it('sends saves one at a time, in order, and drops a save a newer one replaced while it waited', async () => {
  serve(null, null);
  mount();
  const firstLands = deferredSave();
  await run('// one');
  await run('// two');
  await run('// three');
  expect(mocks.save.mock.calls.map(([, code]) => code)).toEqual(['// one']);
  await firstLands(iso(NOW));
  await waitFor(() => expect(localStorage.getItem(COPY)).toBeNull());
  expect(mocks.save.mock.calls.map(([, code]) => code)).toEqual(['// one', '// three']);
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
  await run('// ran');
  expect(mocks.save).toHaveBeenCalledWith(ID, '// ran');
  expect(localStorage.getItem(COPY)).toBeNull();

  mocks.save.mockRejectedValueOnce(new Error('offline'));
  await run('// ran offline');
  expect(localStorage.getItem(COPY)).toBe('// ran offline');
  expect(time()?.base).toBeNull();
});

// V3-3: code over 20 kB was saved nowhere, so a reload lost it.
it('keeps code the account would refuse on this device, and sends it nowhere', async () => {
  onDevice('// the last code that fit', NOW - minutes(1), null);
  serve(null, null);
  mount();
  const oversize = `// ${'x'.repeat(21 * 1024)}`;
  await run(oversize);
  expect(mocks.save).not.toHaveBeenCalled();
  expect(localStorage.getItem(COPY)).toBe(oversize);
});
