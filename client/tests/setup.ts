import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { cleanup, configure } from '@testing-library/react';
import { server } from './mocks/server';
Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn((query: string) => ({
  matches: false, media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
})) });
// Browser fetch accepts relative URLs; Node fetch needs the jsdom origin.
const nativeFetch = globalThis.fetch;
globalThis.fetch = (input, init) => nativeFetch(typeof input === 'string' ? new URL(input, window.location.origin) : input, init);
// findBy*/waitFor default to 1 s, which a loaded CI runner can miss while the
// app is still rendering the right thing.
configure({ asyncUtilTimeout: 3000 });
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => { cleanup(); server.resetHandlers(); localStorage.clear(); });
afterAll(() => server.close());
