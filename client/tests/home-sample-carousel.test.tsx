import { useState } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HomeSampleCarousel } from '../src/components/landing/HomeSampleCarousel';
import { fetchCodingTask } from '../src/coding/api';
import type { CodingTaskResponse } from '../../shared/coding-api';

const viewport = vi.hoisted(() => ({ wide: true }));
vi.mock('../src/lib/useMediaQuery', () => ({ useMediaQuery: () => viewport.wide }));
vi.mock('../src/lib/auth', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('../src/coding/api', () => ({ codingKeys: { task: (id: string) => ['coding', 'task', id] }, fetchCodingTask: vi.fn() }));
vi.mock('../src/coding/loadWorkbench', () => {
  function Workbench({ initialCode, onEdit }: { initialCode: string | null; onEdit: (code: string) => void }) {
    const [code, setCode] = useState(initialCode ?? 'starter');
    return <input aria-label="Sample code" value={code} onChange={(event) => { setCode(event.target.value); onEdit(event.target.value); }} />;
  }
  return { useWorkbench: () => ({ failed: false, reloading: false, View: Workbench }) };
});

beforeEach(() => {
  viewport.wide = true;
  vi.mocked(fetchCodingTask).mockReset().mockResolvedValue({ task: { id: 'js-double-numbers' }, session: 'sealed-session', signedIn: false, locked: null } as CodingTaskResponse);
});

function sample() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = () => <QueryClientProvider client={client}><MemoryRouter><HomeSampleCarousel quiz={<p>Quiz question</p>} /></MemoryRouter></QueryClientProvider>;
  return { ...render(view()), view };
}

it('mounts only the quiz on mobile and never requests a coding session', () => {
  viewport.wide = false;
  sample();
  expect(screen.getByText('Quiz question')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Coding' })).toBeNull();
  expect(screen.queryByRole('textbox')).toBeNull();
  expect(fetchCodingTask).not.toHaveBeenCalled();
});

it('loads the real task on demand and preserves the code while switching samples', async () => {
  sample();
  expect(fetchCodingTask).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Coding' }));
  const editor = await screen.findByRole('textbox', { name: 'Sample code' });
  fireEvent.change(editor, { target: { value: 'const double = numbers => numbers.map(n => n * 2);' } });
  fireEvent.click(screen.getByRole('button', { name: 'Quiz' }));
  expect(screen.getByText('Quiz question')).toBeVisible();
  expect(screen.queryByRole('textbox')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Coding' }));
  expect(screen.getByRole('textbox')).toHaveValue('const double = numbers => numbers.map(n => n * 2);');
  expect(fetchCodingTask).toHaveBeenCalledTimes(1);
  expect(fetchCodingTask).toHaveBeenCalledWith('js-double-numbers', expect.any(AbortSignal));
});

it('offers a retry when the task request fails', async () => {
  vi.mocked(fetchCodingTask).mockRejectedValueOnce(new Error('Offline'));
  sample();
  fireEvent.click(screen.getByRole('button', { name: 'Coding' }));
  expect(await screen.findByRole('alert')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByRole('textbox')).toBeVisible();
  expect(fetchCodingTask).toHaveBeenCalledTimes(2);
});

it('unmounts the editor when the viewport becomes mobile', async () => {
  const rendered = sample();
  fireEvent.click(screen.getByRole('button', { name: 'Coding' }));
  const editor = await screen.findByRole('textbox');
  fireEvent.change(editor, { target: { value: 'retained after resizing' } });
  viewport.wide = false;
  rendered.rerender(rendered.view());
  await waitFor(() => expect(screen.queryByRole('textbox')).toBeNull());
  expect(screen.getByText('Quiz question')).toBeVisible();
  viewport.wide = true;
  rendered.rerender(rendered.view());
  expect(await screen.findByRole('textbox')).toHaveValue('retained after resizing');
});
