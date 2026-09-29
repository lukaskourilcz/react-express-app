import { describe, expect, it } from 'vitest';
import { http, HttpResponse, delay } from 'msw';
import { apiFetch, friendlyError, ApiError } from '../src/lib/api';
import { server } from './mocks/server';

describe('real API transport with MSW', () => {
  it.each([401, 403])('preserves HTTP %s and asks the learner to sign in', async (status) => {
    server.use(http.get('*/api/test', () => HttpResponse.json({ error: { code: 'unauthorized' } }, { status })));
    const error = await apiFetch('/api/test').catch(e => e);
    expect(error).toBeInstanceOf(ApiError);
    if (!(error instanceof ApiError)) throw error;
    expect(error.status).toBe(status);
    expect(friendlyError(error)).toMatch(/sign in/i);
  });
  it('does not expose a gateway HTML error as learner-facing copy', async () => {
    server.use(http.get('*/api/test', () => new HttpResponse('<h1>gateway</h1>', { status: 502 })));
    const error = await apiFetch('/api/test').catch(e => e);
    expect(error).toBeInstanceOf(ApiError);
    if (!(error instanceof ApiError)) throw error;
    expect(error.status).toBe(502);
    expect(friendlyError(error)).not.toContain('gateway');
  });
  it('shows the generic error for an HTML 404, not the status text', async () => {
    server.use(http.get('*/api/test', () => new HttpResponse('<h1>Not Found</h1>', { status: 404, statusText: 'Not Found', headers: { 'Content-Type': 'text/html' } })));
    const error = await apiFetch('/api/test').catch(e => e);
    expect(error).toBeInstanceOf(ApiError);
    if (!(error instanceof ApiError)) throw error;
    expect(error.status).toBe(404);
    expect(friendlyError(error)).toBe('Something went wrong. Try again.');
  });
  it('keeps the server message of a JSON 4xx', async () => {
    server.use(http.get('*/api/test', () => HttpResponse.json({ error: { code: 'not_found', message: 'No match with that code.' } }, { status: 404 })));
    const error = await apiFetch('/api/test').catch(e => e);
    expect(friendlyError(error)).toBe('No match with that code.');
  });
  it('classifies network failure separately from timeout', async () => {
    server.use(http.get('*/api/test', () => HttpResponse.error()));
    await expect(apiFetch('/api/test')).rejects.toMatchObject({ code: 'network', status: 0 });
  });
  it('aborts a slow request and permits a fresh successful retry', async () => {
    server.use(http.get('*/api/test', async () => { await delay(80); return HttpResponse.json({ ok: true }); }));
    await expect(apiFetch('/api/test', { timeoutMs: 10 })).rejects.toMatchObject({ code: 'timeout' });
    server.use(http.get('*/api/test', () => HttpResponse.json({ ok: true })));
    await expect(apiFetch('/api/test')).resolves.toEqual({ ok: true });
  });
  it('does not send an already cancelled request', async () => {
    const controller = new AbortController(); controller.abort();
    await expect(apiFetch('/api/test', { signal: controller.signal })).rejects.toMatchObject({ code: 'cancelled' });
  });
});
