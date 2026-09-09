// Applies reviewer rewrites (English fields) to the seed files in place,
// using the TypeScript compiler API to replace exactly the property
// initializers that changed. Verifies the located seed's current question text
// against the inventory before touching it. Usage:
//   node apply-rewrites.mjs <inventoryDir> <reviewDir> [--dry]
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { locate } from './seed-locator';

const ROOT = '/home/user/react-express-app';
const [inventoryDir, reviewDir, ...rest] = process.argv.slice(2);
const dry = rest.includes('--dry');

function readJsonl(file: string): any[] {
  return readFileSync(file, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
}
function readReviews(): Map<string, any> {
  const out = new Map<string, any>();
  for (const f of readdirSync(reviewDir)) {
    const full = path.join(reviewDir, f);
    const rows = f.endsWith('.jsonl') ? readJsonl(full) : f.endsWith('.json') ? JSON.parse(readFileSync(full, 'utf8')) : [];
    for (const r of rows) out.set(r.id, r);
  }
  return out;
}
function readInventoryItems(): Map<string, any> {
  const out = new Map<string, any>();
  for (const f of readdirSync(inventoryDir)) {
    if (!f.startsWith('batch-')) continue;
    for (const it of JSON.parse(readFileSync(path.join(inventoryDir, f), 'utf8'))) out.set(it.id, it);
  }
  return out;
}

const lit = (s: string): string => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r/g, '\\r').replace(/\n/g, '\\n')}'`;
const arrLit = (a: string[]): string => `[${a.map(lit).join(', ')}]`;

interface Edit { start: number; end: number; text: string }

function findArray(sf: ts.SourceFile, exportName: string): ts.ArrayLiteralExpression | null {
  let found: ts.ArrayLiteralExpression | null = null;
  const visit = (node: ts.Node) => {
    if (found) return;
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === exportName && node.initializer && ts.isArrayLiteralExpression(node.initializer)) {
      found = node.initializer;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

function propOf(obj: ts.ObjectLiteralExpression, name: string): ts.PropertyAssignment | null {
  for (const p of obj.properties) {
    if (ts.isPropertyAssignment(p) && ((ts.isIdentifier(p.name) && p.name.text === name) || (ts.isStringLiteral(p.name) && p.name.text === name))) return p;
  }
  return null;
}

function literalValue(node: ts.Expression): string | null {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return null;
}

const reviews = readReviews();
const inventory = readInventoryItems();
const editsByFile = new Map<string, Edit[]>();
const report = { applied: 0, skipped: [] as string[], mismatched: [] as string[] };

for (const [id, review] of reviews) {
  if (review.decision !== 'rewrite' || !review.rewrite) continue;
  const item = inventory.get(id);
  if (!item) { report.skipped.push(`${id}: not in inventory`); continue; }
  if (item.delivery === 'retired-section') { report.skipped.push(`${id}: retired section, rewrite recorded as a redistribution candidate only`); continue; }
  const loc = locate(id);
  if (!loc || loc.shape === 'term') { report.skipped.push(`${id}: no patchable seed`); continue; }
  const file = path.join(ROOT, loc.file);
  const source = readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.ES2022, true);
  const arr = findArray(sf, loc.exportName);
  if (!arr) { report.skipped.push(`${id}: array ${loc.exportName} not found in ${loc.file}`); continue; }
  let obj: ts.ObjectLiteralExpression | null = null;
  if (loc.shape === 'seed') {
    const el = arr.elements[loc.index];
    if (el && ts.isObjectLiteralExpression(el)) obj = el;
  } else {
    for (const el of arr.elements) {
      if (ts.isObjectLiteralExpression(el)) {
        const idProp = propOf(el, 'id');
        if (idProp && literalValue(idProp.initializer) === id) { obj = el; break; }
      }
    }
  }
  if (!obj) { report.skipped.push(`${id}: element not found`); continue; }
  const keys = loc.shape === 'seed'
    ? { question: 'q', options: 'opts', correctAnswer: 'a', explanation: 'e', hint: 'intro' }
    : { question: 'question', options: 'options', correctAnswer: 'correctAnswer', explanation: 'explanation', hint: 'introduction' };
  const qProp = propOf(obj, keys.question);
  const current = qProp ? literalValue(qProp.initializer) : null;
  if (current !== item.question) { report.mismatched.push(`${id}: seed question text differs from inventory`); continue; }
  const rw = review.rewrite;
  const edits: Edit[] = editsByFile.get(file) ?? [];
  const replace = (name: string, text: string) => {
    const p = propOf(obj!, name);
    if (p) edits.push({ start: p.initializer.getStart(sf), end: p.initializer.getEnd(), text });
    else {
      // Insert after the explanation property (present in every seed).
      const anchor = propOf(obj!, keys.explanation)!;
      edits.push({ start: anchor.getEnd(), end: anchor.getEnd(), text: `, ${name}: ${text}` });
    }
  };
  if (typeof rw.question === 'string') replace(keys.question, lit(rw.question));
  if (Array.isArray(rw.options)) {
    if (rw.options.length !== 4) { report.skipped.push(`${id}: rewrite has ${rw.options.length} options`); continue; }
    replace(keys.options, arrLit(rw.options));
  }
  if (typeof rw.correctAnswer === 'number') replace(keys.correctAnswer, String(rw.correctAnswer));
  if (typeof rw.explanation === 'string') replace(keys.explanation, lit(rw.explanation));
  if (typeof rw.hint === 'string') replace(keys.hint, lit(rw.hint));
  editsByFile.set(file, edits);
  report.applied++;
}

for (const [file, edits] of editsByFile) {
  let source = readFileSync(file, 'utf8');
  // Apply from the end so earlier offsets stay valid; insertions at the same
  // offset keep their order.
  edits.sort((a, b) => b.start - a.start || b.end - a.end);
  for (const e of edits) source = source.slice(0, e.start) + e.text + source.slice(e.end);
  if (!dry) writeFileSync(file, source);
}
console.log(JSON.stringify({ applied: report.applied, files: [...editsByFile.keys()].map((f) => path.relative(ROOT, f)), skipped: report.skipped.length, mismatched: report.mismatched.length, dry }, null, 1));
if (report.skipped.length) console.log('skipped:\n  ' + report.skipped.join('\n  '));
if (report.mismatched.length) console.log('MISMATCHED:\n  ' + report.mismatched.join('\n  '));
