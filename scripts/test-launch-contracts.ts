import assert from 'node:assert/strict';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  PRODUCT_CATALOG,
  SHARK_BRAND_ORDER,
  resolveCatalogProductId,
} from '../client/product-catalog';
import {
  SUBJECT_SCOPE_CATALOG,
  allowedDeploymentSubjects,
} from '../shared/subject-catalog';
import {
  decodeAnswerProof,
  decodeChallengeRun,
  decodeQuizResultReceipt,
  decodeSession,
  encodeAnswerProof,
  encodeQuizResultReceipt,
  encodeSession,
  createChallengeRun,
} from '../lib/quiz-data';
import { checkRateLimit } from '../lib/rate-limit';
import healthHandler from '../api/health';

function apiFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? apiFiles(path) : path.endsWith('.ts') ? [path] : [];
  });
}

function mockResponse() {
  const headers = new Map<string, string>();
  return {
    statusCode: 200,
    body: undefined as unknown,
    setHeader(name: string, value: string) { headers.set(name.toLowerCase(), String(value)); },
    status(code: number) { this.statusCode = code; return this; },
    json(value: unknown) { this.body = value; return this; },
    end() { return this; },
    headers,
  };
}

async function main() {
  assert.equal(apiFiles(join(process.cwd(), 'api')).length, 12, 'Vercel function budget must remain exactly 12');

  assert.equal(resolveCatalogProductId({ product: 'devshark' }), 'devshark');
  assert.equal(resolveCatalogProductId({ lockSubject: 'geography' }), 'geoshark');
  assert.equal(resolveCatalogProductId({}), 'studyshark');
  assert.equal(SHARK_BRAND_ORDER.length, 7);
  assert.equal(new Set(SHARK_BRAND_ORDER).size, SHARK_BRAND_ORDER.length);
  assert.ok(SHARK_BRAND_ORDER.every((id) => PRODUCT_CATALOG[id]));
  assert.deepEqual(allowedDeploymentSubjects({ VITE_PRODUCT: 'devshark' }), ['webdev']);
  assert.ok(!allowedDeploymentSubjects({ VITE_PRODUCT: 'studyshark' }).includes('webdev'));
  assert.ok(SUBJECT_SCOPE_CATALOG.geography.categories.includes('capitals'));

  const session = encodeSession([{ questionId: 'private-answer-check', correctAnswer: 3 }]);
  assert.match(session, /^v2\./);
  assert.ok(!session.includes('private-answer-check'), 'encrypted token must not expose question ids');
  assert.deepEqual(decodeSession(session), [{ questionId: 'private-answer-check', correctAnswer: 3 }]);
  const parts = session.split('.');
  const middle = Math.floor(parts[2].length / 2);
  parts[2] = `${parts[2].slice(0, middle)}${parts[2][middle] === 'A' ? 'B' : 'A'}${parts[2].slice(middle + 1)}`;
  assert.equal(decodeSession(parts.join('.')), null, 'tampered token must fail closed');

  const run = createChallengeRun();
  assert.equal(decodeChallengeRun(run.runToken)?.runId, run.runId);
  const proof = encodeAnswerProof('q-1', true);
  assert.deepEqual(decodeAnswerProof(proof), { questionId: 'q-1', isCorrect: true });
  const receipt = encodeQuizResultReceipt({
    userId: 'user-1', correct: 1, total: 2,
    breakdown: { capitals: { correct: 1, total: 2 } },
  });
  assert.deepEqual(decodeQuizResultReceipt(receipt)?.breakdown, { capitals: { correct: 1, total: 2 } });

  const rateReq = { headers: { 'x-forwarded-for': `contract-${Date.now()}` }, socket: {} } as never;
  const rateRes = mockResponse();
  const policy = { key: `contract-${Date.now()}`, capacity: 2, refillPerSecond: 0.0001 };
  assert.equal(checkRateLimit(rateReq, rateRes as never, policy), true);
  assert.equal(checkRateLimit(rateReq, rateRes as never, policy), true);
  assert.equal(checkRateLimit(rateReq, rateRes as never, policy), false);
  assert.equal(rateRes.statusCode, 429);
  assert.ok(rateRes.headers.has('retry-after'));

  const healthRes = mockResponse();
  await healthHandler({ method: 'POST', headers: {}, query: {} } as never, healthRes as never);
  assert.equal(healthRes.statusCode, 405);
  assert.equal(healthRes.headers.get('allow'), 'GET');

  console.log('Launch contracts passed: product identity, scope, token confidentiality, rate limiting, health, and 12-function budget.');
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
