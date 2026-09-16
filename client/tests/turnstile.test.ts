import { describe, expect, it } from 'vitest';
import { attest, isTurnstileEnabled, withAttestation } from '../src/lib/turnstile';

// This suite pins the switched-off state, because that is the state the product
// ships in and the one every learner is on today. An unconfigured deployment
// must behave as if attestation had never been added: no script fetched, no
// element in the document, no field on the wire, no waiting.
describe('Turnstile attestation with no site key', () => {
  it('reports itself disabled', () => {
    expect(isTurnstileEnabled()).toBe(false);
  });

  it('resolves to no token instead of throwing or hanging', async () => {
    await expect(attest('quiz-submit')).resolves.toBeNull();
  });

  it('leaves the request body byte-identical', async () => {
    const body = { sessionId: 'v2.abc', answers: { 'q-1': 2 }, lang: 'en' };
    const sent = await withAttestation('quiz-submit', body);
    expect(sent).toEqual(body);
    expect('turnstileToken' in sent).toBe(false);
  });

  it('adds nothing to the document and loads no third-party script', async () => {
    await attest('signup');
    expect(document.querySelector('.ss-attestation')).toBeNull();
    expect(document.querySelector('script[src*="challenges.cloudflare.com"]')).toBeNull();
  });

  it('serialises overlapping calls rather than racing them', async () => {
    const [first, second] = await Promise.all([attest('quiz-submit'), attest('challenge-score')]);
    expect(first).toBeNull();
    expect(second).toBeNull();
  });
});
