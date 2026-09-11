import { JSDOM } from 'jsdom';
import { populateGlobal } from 'vitest/runtime';
const nativeAbort = { AbortController: globalThis.AbortController, AbortSignal: globalThis.AbortSignal };
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost:3000', pretendToBeVisual: true });
populateGlobal(globalThis, dom.window, { bindFunctions: true });
Object.assign(globalThis, nativeAbort);
