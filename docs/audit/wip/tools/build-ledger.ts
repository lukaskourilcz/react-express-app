// Builds docs/audit/devshark-content-ledger.json from the review fragments
// and the (post-rewrite) inventory. Usage:
//   node build-ledger.mjs <inventoryDirAfterApply> <inventoryDirBeforeApply> <reviewDir> <csDir|-> <categories,comma> <completeCategories,comma|-> <codingTasks:true|false>
// `categories` are the categories whose reviewed items get rows (an item of
// one of them without a review is skipped and counted); `completeCategories`
// are the ones every served item of which has a row — they enter the ledger's
// scope, where the gate withholds anything without a record.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = '/home/user/react-express-app';
const [afterDir, beforeDir, reviewDir, csDir, categoriesArg, completeArg, codingArg] = process.argv.slice(2);
const categories = categoriesArg.split(',').map((s) => s.trim()).filter(Boolean);
const complete = (completeArg && completeArg !== '-' ? completeArg.split(',') : []).map((s) => s.trim()).filter(Boolean);
for (const c of complete) if (!categories.includes(c)) throw new Error(`complete category ${c} is not among the categories being built`);

function rows(dir: string): Map<string, any> {
  const out = new Map<string, any>();
  if (!dir || dir === '-' || !existsSync(dir)) return out;
  for (const f of readdirSync(dir)) {
    const full = path.join(dir, f);
    let list: any[] = [];
    if (f.endsWith('.jsonl')) list = readFileSync(full, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
    else if (f.endsWith('.json')) { const v = JSON.parse(readFileSync(full, 'utf8')); if (Array.isArray(v)) list = v; }
    for (const r of list) if (r && r.id) out.set(r.id, r);
  }
  return out;
}
function inventory(dir: string): { items: Map<string, any>; meta: any } {
  const items = new Map<string, any>();
  for (const f of readdirSync(dir)) {
    if (!f.startsWith('batch-')) continue;
    for (const it of JSON.parse(readFileSync(path.join(dir, f), 'utf8'))) items.set(it.id, it);
  }
  const meta = JSON.parse(readFileSync(path.join(dir, 'inventory.json'), 'utf8'));
  return { items, meta };
}

const SURFACES: Record<string, string[]> = {
  active: ['quiz', 'daily', 'challenge', 'placement', 'learn-level', 'learn-part-test', 'personalised-review', 'play', 'flashcards', 'today-due'],
  'retired-section': ['history-only (category refused by every delivery request; placement pool excluded on this branch)'],
  unreferenced: [],
};

const after = inventory(afterDir);
const before = inventory(beforeDir);
const reviews = rows(reviewDir);
const cs = rows(csDir);

const existing = existsSync(path.join(ROOT, 'docs/audit/devshark-content-ledger.json'))
  ? JSON.parse(readFileSync(path.join(ROOT, 'docs/audit/devshark-content-ledger.json'), 'utf8'))
  : { items: [] };
const kept = new Map<string, any>((existing.items ?? []).map((r: any) => [r.id, r]));

const today = new Date().toISOString().slice(0, 10);
const out: any[] = [];
const problems: string[] = [];
const unreviewed: Record<string, number> = {};
for (const [id, it] of after.items) {
  // An unreferenced bank has no delivery path, so the gate never sees it and
  // completeness cannot depend on it. Those banks get a disposition in the
  // report, not a ledger row.
  if (it.delivery === 'unreferenced') { if (kept.has(id)) out.push(kept.get(id)); continue; }
  if (!categories.includes(it.category)) { if (kept.has(id)) out.push(kept.get(id)); continue; }
  const r = reviews.get(id);
  if (!r) {
    unreviewed[it.category] = (unreviewed[it.category] ?? 0) + 1;
    if (complete.includes(it.category)) problems.push(`${id}: no review, but ${it.category} is declared complete`);
    continue;
  }
  const rewritten = r.decision === 'rewrite' && r.rewrite;
  const beforeItem = before.items.get(id);
  const scores = rewritten ? r.rewrite.rescored : { quality: r.quality, qualityScore: r.qualityScore, relevance: r.relevance, relevanceScore: r.relevanceScore };
  const localization = cs.get(id);
  let csRecord: any;
  if (localization) {
    csRecord = { status: localization.status, hash: localization.status === 'dropped' ? null : it.csHash, notes: localization.notes ?? '' };
  } else if (r.cs && r.cs.status === 'verified' && !rewritten) {
    csRecord = { status: 'verified', hash: it.csHash, notes: r.cs.notes ?? '' };
  } else {
    csRecord = { status: r.cs ? r.cs.status : 'missing', hash: null, notes: (r.cs && r.cs.notes) || 'Not served until the localisation pass records a Czech version for this wording.' };
  }
  const row = {
    id,
    kind: 'question',
    locale: 'en',
    source: it.source,
    delivery: it.delivery,
    surfaces: SURFACES[it.delivery] ?? [],
    category: it.category,
    topic: it.topic,
    level: it.level,
    levelTitle: it.levelTitle,
    objective: r.objective,
    intendedLevel: r.intendedLevel,
    revision: rewritten ? 2 : 1,
    contentHash: it.contentHash,
    ...(rewritten ? { previousHash: beforeItem?.contentHash ?? null } : {}),
    quality: scores.quality,
    qualityScore: scores.qualityScore,
    relevance: scores.relevance,
    relevanceScore: scores.relevanceScore,
    ...(rewritten ? { original: { quality: r.quality, qualityScore: r.qualityScore, relevance: r.relevance, relevanceScore: r.relevanceScore } } : {}),
    gates: { quality: scores.qualityScore >= 3, relevance: scores.relevanceScore >= 4 },
    correctnessBlocker: r.correctnessBlocker ?? null,
    decision: r.decision,
    retireReason: r.retireReason ?? null,
    defects: r.defects ?? [],
    rationale: r.rationale,
    evidence: r.evidence ?? [],
    cs: csRecord,
    ...(r.verification ? { verification: r.verification } : {}),
    reviewer: { kind: 'model', passes: r.verification ? ['item-review', 'second-reading'] : ['item-review'], run: 'claude-code session, 2026-09-09' },
    reviewedAt: today,
  };
  if (row.decision === 'retain' || row.decision === 'rewrite') {
    if (!(row.gates.quality && row.gates.relevance)) problems.push(`${id}: decision ${row.decision} but gates fail (q ${row.qualityScore}, r ${row.relevanceScore})`);
  }
  // Nothing rewritten reaches a learner on one reading: a row whose content
  // this audit changed must carry the second reader's verdict.
  if (rewritten) {
    const v = (r.verification ?? null) as { verdict?: string } | null;
    if (!v) problems.push(`${id}: rewritten without a second reading`);
    else if (v.verdict !== 'accept' && v.verdict !== 'amend') problems.push(`${id}: rewritten but the second reading returned ${v.verdict}`);
  }
  out.push(row);
}
for (const [id, r] of kept) if (!after.items.has(id) && !out.some((x) => x.id === id)) out.push(r);

const ledger = {
  schema: 'devshark-content-ledger/v1',
  auditedOn: today,
  scope: { categories: [...new Set([...(existing.scope?.categories ?? []), ...complete])].sort(), codingTasks: codingArg === 'true' },
  sources: after.meta.sources,
  counts: after.meta.counts,
  items: out.sort((a, b) => a.id.localeCompare(b.id)),
};
writeFileSync(path.join(ROOT, 'docs/audit/devshark-content-ledger.json'), JSON.stringify(ledger, null, 1) + '\n');
console.log(JSON.stringify({ rows: out.length, unreviewed, scope: ledger.scope, problems: problems.length }, null, 1));
if (problems.length) console.log(problems.slice(0, 40).join('\n'));
