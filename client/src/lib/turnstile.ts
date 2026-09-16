// Cloudflare Turnstile, client side.
//
// One widget for the whole tab, rendered lazily the first time something needs
// a token and never rendered at all when the deployment has no site key — which
// is how this repository ships. `attest()` then resolves to null immediately,
// every caller omits the field, and the server (which is equally unconfigured)
// asks for nothing. Switching the feature on is two environment variables and
// no code change.
//
// ── Why `execute` rather than a widget in the page ─────────────────────────
//
// A checkbox sitting under every quiz would be a permanent tax on people who
// are not the problem. In `execution: 'execute'` + `appearance:
// 'interaction-only'` mode, Turnstile renders nothing, scores the session in
// the background when asked, and surfaces a control only for the attempts it
// cannot decide on its own. Most learners will never see it.
//
// ── What a failure costs ───────────────────────────────────────────────────
//
// Nothing that this module can help. A blocked script, an ad blocker, an
// offline tab, a slow challenge: every one of them resolves to null rather than
// throwing, and the submission goes out unattested. Whether that is accepted is
// the server's decision and the server's alone — a client that could decide it
// would be a client that could skip it.
//
// Docs: https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/

import './turnstile.css';
import { getStoredLang, translateStatic } from '../i18n/LanguageContext';

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const SCRIPT_TIMEOUT_MS = 8_000;
const EXECUTE_TIMEOUT_MS = 15_000;

/** Must match TURNSTILE_ACTIONS in lib/turnstile.ts. */
export type TurnstileAction = 'signup' | 'quiz-submit' | 'challenge-score';

interface TurnstileApi {
  render: (container: HTMLElement, options: Record<string, unknown>) => string | undefined;
  execute: (widget: string, options?: Record<string, unknown>) => void;
  reset: (widget: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const siteKey = ((import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) ?? '').trim();

/** True when this deployment has a site key. Everything else is a no-op without it. */
export function isTurnstileEnabled(): boolean {
  return siteKey.length > 0 && typeof document !== 'undefined';
}

let scriptPromise: Promise<TurnstileApi | null> | null = null;

function loadScript(): Promise<TurnstileApi | null> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<TurnstileApi | null>((resolve) => {
    if (window.turnstile) {
      resolve(window.turnstile);
      return;
    }
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.defer = true;
    const timer = window.setTimeout(() => finish(null), SCRIPT_TIMEOUT_MS);
    const finish = (api: TurnstileApi | null) => {
      window.clearTimeout(timer);
      resolve(api);
    };
    script.addEventListener('load', () => finish(window.turnstile ?? null), { once: true });
    script.addEventListener('error', () => finish(null), { once: true });
    document.head.appendChild(script);
  });
  return scriptPromise;
}

let host: HTMLElement | null = null;
let widgetId: string | null = null;
let pending: ((token: string | null) => void) | null = null;

function settle(token: string | null): void {
  const resolve = pending;
  pending = null;
  setVisible(false);
  resolve?.(token);
}

function setVisible(visible: boolean): void {
  host?.setAttribute('data-visible', visible ? 'true' : 'false');
}

function ensureHost(): HTMLElement {
  if (host) return host;
  const element = document.createElement('div');
  element.className = 'ss-attestation';
  element.setAttribute('data-visible', 'false');
  // A live region rather than a dialog: nothing here traps focus, and the
  // learner can ignore it and keep using the page. Cloudflare's own control
  // carries its labelling inside the frame; this line says why it appeared.
  element.setAttribute('role', 'status');
  const label = document.createElement('p');
  label.className = 'ss-attestation__label';
  label.textContent = translateStatic('attestation.label');
  element.appendChild(label);
  document.body.appendChild(element);
  host = element;
  return element;
}

async function ensureWidget(): Promise<string | null> {
  if (widgetId) return widgetId;
  const api = await loadScript();
  if (!api) return null;
  const container = document.createElement('div');
  ensureHost().appendChild(container);
  try {
    const id = api.render(container, {
      sitekey: siteKey,
      execution: 'execute',
      appearance: 'interaction-only',
      retry: 'never',
      language: getStoredLang() === 'cs' ? 'cs' : 'en',
      callback: (token: string) => settle(typeof token === 'string' ? token : null),
      'error-callback': () => { settle(null); return true; },
      'timeout-callback': () => settle(null),
      'expired-callback': () => settle(null),
      'before-interactive-callback': () => setVisible(true),
      'after-interactive-callback': () => setVisible(false),
    });
    widgetId = typeof id === 'string' ? id : null;
  } catch {
    widgetId = null;
  }
  return widgetId;
}

// One attestation at a time. Turnstile holds a single token per widget, so two
// overlapping executions would race for the same callback; chaining keeps each
// caller's token its own.
let queue: Promise<string | null> = Promise.resolve(null);

async function execute(action: TurnstileAction): Promise<string | null> {
  const api = await loadScript();
  const widget = await ensureWidget();
  if (!api || !widget) return null;

  return new Promise<string | null>((resolve) => {
    let timer = 0;
    const handle = (token: string | null) => {
      window.clearTimeout(timer);
      resolve(token);
    };
    // A challenge the learner never finishes must not leave the submission
    // waiting forever: the deadline resolves it unattested and lets the server
    // decide what that is worth.
    timer = window.setTimeout(() => {
      if (pending === handle) settle(null);
    }, EXECUTE_TIMEOUT_MS);
    pending = handle;
    try {
      api.reset(widget);
      api.execute(widget, { action });
    } catch {
      settle(null);
    }
  });
}

/**
 * A single-use Turnstile token for one action, or null when there is nothing to
 * attest with. Never throws.
 */
export function attest(action: TurnstileAction): Promise<string | null> {
  if (!isTurnstileEnabled()) return Promise.resolve(null);
  queue = queue.then(() => execute(action)).catch(() => null);
  return queue;
}

/**
 * Merge a token into a request body when one is available:
 *
 *   body: JSON.stringify(await withAttestation('quiz-submit', { sessionId, answers }))
 *
 * An unattested body is the same body it was before, which is what keeps every
 * unconfigured deployment on exactly the path it had.
 */
export async function withAttestation<T extends Record<string, unknown>>(
  action: TurnstileAction,
  body: T,
): Promise<T | (T & { turnstileToken: string })> {
  const token = await attest(action);
  return token ? { ...body, turnstileToken: token } : body;
}
