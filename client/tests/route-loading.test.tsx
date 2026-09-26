import { afterEach, describe, expect, it, vi } from 'vitest';
import { installIntentPreloading, preloadPath, routeChunk } from '../src/lib/routePreload';

// A navigation that draws once starts the next page's code on intent.

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
