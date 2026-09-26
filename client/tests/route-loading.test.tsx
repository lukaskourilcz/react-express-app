import { Suspense, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, onlineManager, queryOptions } from '@tanstack/react-query';
import { installIntentPreloading, preloadPath, routeChunk } from '../src/lib/routePreload';
import { FIRST_DATA_WAIT_MS, lazyPart, readOnce, settled, useFirstData } from '../src/lib/routeData';
import { firstDraw, headings } from './firstDraw';

// The two halves of a navigation that draws once: the next page's code starts
// loading on intent, and a page can hold its first render for its data.

describe('route chunks', () => {
  it('imports a page once, however many links and routes ask for it', async () => {
    const load = vi.fn(async () => ({ default: () => null }));
    const loader = routeChunk((path) => path === '/chunk-once', load);
    preloadPath('/chunk-once');
    preloadPath('/chunk-once');
    const first = loader();
    await first;
    expect(loader()).toBe(first);
    expect(load).toHaveBeenCalledTimes(1);
    preloadPath('/not-a-page');
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('asks the network again after a failed fetch', async () => {
    const load = vi.fn()
      .mockRejectedValueOnce(new Error('Failed to fetch dynamically imported module'))
      .mockResolvedValueOnce({ default: () => null });
    const loader = routeChunk((path) => path === '/chunk-retry', load);
    await expect(loader()).rejects.toThrow('Failed to fetch');
    await expect(loader()).resolves.toHaveProperty('default');
    expect(load).toHaveBeenCalledTimes(2);
  });
});

describe('intent preloading', () => {
  let uninstall: (() => void) | null = null;
  afterEach(() => {
    uninstall?.();
    uninstall = null;
    document.body.innerHTML = '';
    vi.useRealTimers();
  });
  const link = (href: string, attrs: Record<string, string> = {}) => {
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.textContent = href;
    for (const [name, value] of Object.entries(attrs)) anchor.setAttribute(name, value);
    document.body.append(anchor);
    return anchor;
  };

  it('starts a page on focus and on the first press, before the click', () => {
    const load = vi.fn(async () => ({}));
    routeChunk((path) => path === '/intent-focus', load);
    uninstall = installIntentPreloading();
    link('/intent-focus').dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    expect(load).toHaveBeenCalledTimes(1);

    const pressLoad = vi.fn(async () => ({}));
    routeChunk((path) => path === '/intent-press', pressLoad);
    const pressed = link('/intent-press');
    pressed.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(pressLoad).toHaveBeenCalledTimes(1);
  });

  it('waits for a resting mouse, not a passing one', () => {
    vi.useFakeTimers();
    const load = vi.fn(async () => ({}));
    const passing = vi.fn(async () => ({}));
    routeChunk((path) => path === '/intent-rest', load);
    routeChunk((path) => path === '/intent-pass', passing);
    uninstall = installIntentPreloading();
    const over = (element: Element) => {
      const event = new Event('pointerover', { bubbles: true });
      Object.defineProperty(event, 'pointerType', { value: 'mouse' });
      element.dispatchEvent(event);
    };
    over(link('/intent-pass'));
    over(link('/intent-rest'));
    vi.advanceTimersByTime(100);
    expect(passing).not.toHaveBeenCalled();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('reads a chrome button’s data-route, and ignores new tabs, other sites and the current page', () => {
    const button = vi.fn(async () => ({}));
    const elsewhere = vi.fn(async () => ({}));
    routeChunk((path) => path === '/intent-button', button);
    routeChunk((path) => path === '/intent-elsewhere', elsewhere);
    uninstall = installIntentPreloading();
    const chrome = document.createElement('button');
    chrome.dataset.route = '/intent-button';
    chrome.innerHTML = '<svg></svg>';
    document.body.append(chrome);
    chrome.firstElementChild!.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(button).toHaveBeenCalledTimes(1);

    link('/intent-elsewhere', { target: '_blank' }).dispatchEvent(new Event('pointerdown', { bubbles: true }));
    link('https://example.com/intent-elsewhere').dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(elsewhere).not.toHaveBeenCalled();

    const here = vi.fn(async () => ({}));
    routeChunk((path) => path === window.location.pathname, here);
    link(window.location.pathname).dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(here).not.toHaveBeenCalled();
  });
});

describe('first data', () => {
  afterEach(() => vi.useRealTimers());

  function Page({ dataKey, load, label }: { dataKey: string | null; load: () => Promise<unknown>; label: string }) {
    useFirstData(dataKey, load);
    return <p>{label}</p>;
  }
  const tree = (page: ReactNode, entry = '/page') => (
    <MemoryRouter initialEntries={[entry]}>
      <Suspense fallback={<p>fallback</p>}>{page}</Suspense>
    </MemoryRouter>
  );
  // A suspending render has to happen inside an awaited act.
  const mount = async (page: ReactNode, entry = '/page') => {
    let view: ReturnType<typeof render> | null = null;
    await act(async () => { view = render(tree(page, entry)); });
    return view as unknown as ReturnType<typeof render>;
  };

  it('reads what the cache holds, stale or not, and fetches the rest once', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: 3, retryDelay: 1000 } } });
    const cachedFn = vi.fn(async () => 'fresh');
    const cached = queryOptions({ queryKey: ['cached'], queryFn: cachedFn, staleTime: 0 });
    client.setQueryData(cached.queryKey, 'stale');
    await expect(readOnce(client, cached)).resolves.toBe('stale');
    expect(cachedFn).not.toHaveBeenCalled();

    const failing = vi.fn(async () => { throw new Error('502'); });
    const started = Date.now();
    await expect(readOnce(client, queryOptions({ queryKey: ['failing'], queryFn: failing }))).rejects.toThrow('502');
    expect(failing).toHaveBeenCalledTimes(1);
    expect(Date.now() - started).toBeLessThan(500);
  });

  it('waits for every read and keeps none of the failures', async () => {
    let late: () => void = () => undefined;
    const slow = new Promise<void>((resolve) => { late = resolve; });
    let done = false;
    const all = settled([Promise.reject(new Error('offline')), null, slow]).then(() => { done = true; });
    await Promise.resolve();
    expect(done).toBe(false);
    late();
    await all;
    expect(done).toBe(true);
  });

  it('renders at once when there is nothing to wait for', async () => {
    const load = vi.fn(async () => undefined);
    await mount(<Page dataKey={null} load={load} label="page" />);
    expect(screen.getByText('page')).toBeInTheDocument();
    expect(load).not.toHaveBeenCalled();
  });

  it('renders at once offline, whether the browser or the query client says so', async () => {
    const load = vi.fn(() => new Promise(() => undefined));
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    try {
      await mount(<Page dataKey="offline-browser" load={load} label="offline page" />, '/offline-browser');
      expect(screen.getByText('offline page')).toBeInTheDocument();
    } finally {
      online.mockRestore();
    }
    // The query client pauses its reads while it believes it is offline, so a
    // read the page waited for would only run out the cap.
    onlineManager.setOnline(false);
    try {
      await mount(<Page dataKey="offline-client" load={load} label="paused page" />, '/offline-client');
      expect(screen.getByText('paused page')).toBeInTheDocument();
    } finally {
      onlineManager.setOnline(true);
    }
    expect(load).not.toHaveBeenCalled();
  });

  it('holds the first render until the data is in, then never again', async () => {
    let answer: () => void = () => undefined;
    const load = vi.fn(() => new Promise<void>((resolve) => { answer = resolve; }));
    const view = await mount(<Page dataKey="account-1" load={load} label="with data" />);
    expect(screen.getByText('fallback')).toBeInTheDocument();
    expect(screen.queryByText('with data')).toBeNull();
    await act(async () => answer());
    // React reveals a boundary that showed its fallback no sooner than 300ms
    // after it did; in the app the fallback never shows during a navigation.
    expect(await screen.findByText('with data')).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(1);

    // A later change (another account, a refetch) redraws in place.
    view.rerender(tree(<Page dataKey="account-2" load={load} label="redrawn" />));
    expect(screen.getByText('redrawn')).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('gives up waiting after the cap, and a failed load does not block the page', async () => {
    vi.useFakeTimers();
    await mount(<Page dataKey="slow" load={() => new Promise(() => undefined)} label="own loading state" />, '/slow');
    expect(screen.getByText('fallback')).toBeInTheDocument();
    await act(async () => { vi.advanceTimersByTime(FIRST_DATA_WAIT_MS - 1); });
    expect(screen.queryByText('own loading state')).toBeNull();
    // The cap, then React's reveal throttle.
    await act(async () => { vi.advanceTimersByTime(1 + 400); });
    expect(screen.getByText('own loading state')).toBeInTheDocument();

    vi.useRealTimers();
    await mount(<Page dataKey="failing" load={() => Promise.reject(new Error('offline'))} label="own error state" />, '/failing');
    expect(await screen.findByText('own error state')).toBeInTheDocument();
  });
});

describe('lazy parts', () => {
  function Section({ label }: { label: string }) {
    return <h2>{label}</h2>;
  }
  function Page({ load, part }: { load: () => Promise<unknown>; part: ReactNode }) {
    useFirstData('parts', load);
    return <main><h1>Page</h1>{part}</main>;
  }

  it('draws a part the hold loaded in the same frame as the page', async () => {
    const part = lazyPart(async () => Section);
    const drawn = firstDraw('h1', headings);
    await act(async () => {
      render(<MemoryRouter initialEntries={['/with-part']}><Page load={part.load} part={<part.Part label="Due today" />} /></MemoryRouter>);
    });
    expect(screen.getByRole('heading', { level: 2, name: 'Due today' })).toBeInTheDocument();
    expect(drawn()).toEqual(['Page', 'Due today']);
  });

  it('loads a part nobody waited for on mount, and draws nothing until it arrives', async () => {
    let arrive: (component: typeof Section) => void = () => undefined;
    const importPart = vi.fn(() => new Promise<typeof Section>((resolve) => { arrive = resolve; }));
    const part = lazyPart(importPart);
    const drawn = firstDraw('h1', headings);
    await act(async () => {
      render(<MemoryRouter><main><h1>Page</h1><part.Part label="Arrives later" /></main></MemoryRouter>);
    });
    expect(drawn()).toEqual(['Page']);
    expect(screen.queryByRole('heading', { level: 2 })).toBeNull();
    await act(async () => arrive(Section));
    expect(await screen.findByRole('heading', { level: 2, name: 'Arrives later' })).toBeInTheDocument();
    expect(importPart).toHaveBeenCalledTimes(1);
  });

  it('asks the network again after a part failed to load', async () => {
    const importPart = vi.fn()
      .mockRejectedValueOnce(new Error('Failed to fetch dynamically imported module'))
      .mockResolvedValueOnce(Section);
    const part = lazyPart<{ label: string }>(importPart);
    await expect(part.load()).rejects.toThrow('Failed to fetch');
    await expect(part.load()).resolves.toBe(Section);
    expect(part.load()).toBe(part.load());
    expect(importPart).toHaveBeenCalledTimes(2);
  });
});
