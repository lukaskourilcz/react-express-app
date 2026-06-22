// Exercises the real /api/quiz/roadmap handler (no Supabase env → falls back to
// the static question bank) for the newly added Next.js and Node.js topics.

import handler from '../api/quiz/roadmap';

type Res = {
  statusCode: number;
  body: any;
  headers: Record<string, string>;
};

function mockRes() {
  const res: any = {
    statusCode: 200,
    body: undefined,
    headers: {},
    setHeader(k: string, v: string) { this.headers[k.toLowerCase()] = v; },
    status(code: number) { this.statusCode = code; return this; },
    json(payload: any) { this.body = payload; return this; },
    end() { return this; },
  };
  return res as Res & typeof res;
}

async function call(query: Record<string, string>): Promise<Res> {
  const req: any = { method: 'GET', query, headers: {}, body: {} };
  const res = mockRes();
  await handler(req, res);
  return res;
}

let failures = 0;
const check = (cond: boolean, msg: string) => {
  if (cond) { console.log('  ✓ ' + msg); }
  else { failures++; console.error('  ✗ ' + msg); }
};

(async () => {
  // 1) Structure includes both new topics with the right level counts.
  console.log('\nStructure:');
  const structure = await call({});
  check(structure.statusCode === 200, 'GET /roadmap → 200');
  const topics: string[] = structure.body?.topics ?? [];
  check(topics.includes('nextjs'), 'topics include nextjs');
  check(topics.includes('nodejs'), 'topics include nodejs');
  check(structure.body?.structure?.nextjs?.levels?.length === 15, 'nextjs has 15 levels');
  check(structure.body?.structure?.nextjs?.checkpoints?.length === 3, 'nextjs has 3 checkpoints');
  check(structure.body?.structure?.nodejs?.levels?.length === 25, 'nodejs has 25 levels');
  check(structure.body?.structure?.nodejs?.checkpoints?.length === 5, 'nodejs has 5 checkpoints');
  check(topics.includes('dsa'), 'topics include dsa');
  check(structure.body?.structure?.dsa?.levels?.length === 15, 'dsa has 15 levels');
  check(structure.body?.structure?.dsa?.checkpoints?.length === 3, 'dsa has 3 checkpoints');

  // DSA level + checkpoint resolve to real questions.
  const dsaLvl = await call({ topic: 'dsa', level: '15' });
  check(dsaLvl.body?.questions?.length === 8, 'dsa level 15 returns 8 questions');
  const dsaCp = await call({ topic: 'dsa', checkpoint: '3' });
  check(dsaCp.body?.questions?.length === 40 && dsaCp.body?.passPct === 85, 'dsa checkpoint 3 → 40 questions @ 85%');

  // 2) A Next.js level returns 8 fully-formed, answerable questions.
  console.log('\nNext.js level 15:');
  const nextLvl = await call({ topic: 'nextjs', level: '15' });
  check(nextLvl.statusCode === 200, 'level 15 → 200');
  check(nextLvl.body?.kind === 'level' && nextLvl.body?.ref === 15, 'kind=level ref=15');
  check(Array.isArray(nextLvl.body?.questions) && nextLvl.body.questions.length === 8, 'returns 8 questions');
  const okNext = (nextLvl.body?.questions ?? []).every(
    (q: any) => q.category === 'nextjs' && q.options.length >= 2 &&
      q.correctAnswer >= 0 && q.correctAnswer < q.options.length && q.explanation,
  );
  check(okNext, 'every question is well-formed with a valid shuffled answer index');

  // 3) A Node.js checkpoint returns the full 40-question exam.
  console.log('\nNode.js checkpoint 5 (final):');
  const nodeCp = await call({ topic: 'nodejs', checkpoint: '5' });
  check(nodeCp.statusCode === 200, 'checkpoint 5 → 200');
  check(nodeCp.body?.kind === 'checkpoint', 'kind=checkpoint');
  check(nodeCp.body?.questions?.length === 40, 'returns 40 questions');
  check(nodeCp.body?.passPct === 85, 'pass threshold is 85%');

  // 4) A Node.js mid level works too.
  console.log('\nNode.js level 1:');
  const nodeLvl = await call({ topic: 'nodejs', level: '1' });
  check(nodeLvl.body?.questions?.length === 8, 'level 1 returns 8 questions');

  // 5) Out-of-range level for a 15-level topic is rejected.
  console.log('\nValidation:');
  const badNext = await call({ topic: 'nextjs', level: '16' });
  check(badNext.statusCode === 400, 'nextjs level 16 → 400 (only 15 levels)');
  const badNodeCp = await call({ topic: 'nodejs', checkpoint: '6' });
  check(badNodeCp.statusCode === 400, 'nodejs checkpoint 6 → 400 (only 5 checkpoints)');

  // 6) Part tests — each topic splits into 3 parts, each ending with one test
  //    sampled (≤ PART_TEST_SIZE = 20) from that part's levels, graded at 85%.
  console.log('\nPart tests:');
  for (const part of ['1', '2', '3']) {
    const r = await call({ topic: 'javascript', test: part });
    check(r.statusCode === 200, `javascript part ${part} test → 200`);
    check(r.body?.kind === 'checkpoint' && r.body?.ref === Number(part), `part ${part} → kind=checkpoint ref=${part}`);
    check(r.body?.passPct === 85, `part ${part} pass threshold 85%`);
    check(Array.isArray(r.body?.questions) && r.body.questions.length === 20, `part ${part} returns 20 sampled questions`);
  }
  // A 15-level topic also splits cleanly into 3 part tests.
  const gitTest = await call({ topic: 'git', test: '1' });
  check(gitTest.statusCode === 200 && gitTest.body?.questions?.length === 20, 'git part 1 test → 200 with 20 questions');

  // The trimmed CSS path (9 levels: foundations + Tailwind + CSS-in-JS) splits
  // into 3 parts of 3 levels each.
  console.log('\nCSS (9 levels → 3 parts):');
  check(structure.body?.structure?.css?.levels?.length === 9, 'css has 9 levels');
  for (const part of ['1', '2', '3']) {
    const r = await call({ topic: 'css', test: part });
    check(r.statusCode === 200 && r.body?.questions?.length === 20, `css part ${part} test → 200 with 20 questions`);
  }
  const cssL9 = await call({ topic: 'css', level: '9' });
  check(cssL9.statusCode === 200 && cssL9.body?.questions?.length === 8, 'css level 9 → 8 questions');
  const cssL10 = await call({ topic: 'css', level: '10' });
  check(cssL10.statusCode === 400, 'css level 10 → 400 (only 9 levels)');
  // Out-of-range parts are rejected.
  const badPartHi = await call({ topic: 'javascript', test: '4' });
  check(badPartHi.statusCode === 400, 'javascript part 4 → 400 (only 3 parts)');
  const badPartLo = await call({ topic: 'javascript', test: '0' });
  check(badPartLo.statusCode === 400, 'javascript part 0 → 400');

  if (failures > 0) {
    console.error(`\n❌ ${failures} endpoint check(s) failed`);
    process.exit(1);
  }
  console.log('\n✅ All roadmap endpoint checks passed');
})().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
