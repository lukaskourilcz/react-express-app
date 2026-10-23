// A change to the shop inventory used to send a progress PUT 800 ms later.
// The server answered it with the same read as the progress GET and wrote
// nothing, so each equip spent two reads of the account's row for nothing.
import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from './mocks/server';
import { equip } from '../src/lib/shop';

describe('the shop inventory', () => {
  it('sends nothing to the server when an owned ring is equipped', async () => {
    const puts: string[] = [];
    server.use(http.put('*/api/quiz/roadmap', ({ request }) => {
      puts.push(request.url);
      return HttpResponse.json({ ok: true, data: {}, extra: { unlocked: [] } });
    }));
    localStorage.setItem('devquiz:shop:inventory:v2', JSON.stringify({ webdev: { owned: ['ring-gold'], ring: null, flair: null, doubleXp: 0 } }));
    equip('ring-gold');
    expect(JSON.parse(localStorage.getItem('devquiz:shop:inventory:v2')!).webdev.ring).toBe('ring-gold');
    await new Promise((resolve) => setTimeout(resolve, 1_200));
    expect(puts).toEqual([]);
  });
});
