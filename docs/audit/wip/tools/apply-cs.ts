// Applies Czech localisation rows to the translation files in place, replacing
// the whole entry for each id in lib/roadmap-questions.cs.ts (rm-js, rm-ts,
// rm-react) or lib/roadmap-questions-extra.cs.ts (everything else), inserting
// an entry when none exists. Usage: node apply-cs.mjs <csDir> [--dry]
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = '/home/user/react-express-app';
const [csDir, ...rest] = process.argv.slice(2);
const dry = rest.includes('--dry');

const rows = new Map<string, any>();
for (const f of readdirSync(csDir)) {
  if (!f.endsWith('.jsonl')) continue;
  for (const l of readFileSync(path.join(csDir, f), 'utf8').split('\n')) if (l.trim()) { const r = JSON.parse(l); rows.set(r.id, r); }
}

const fileFor = (id: string): { file: string; exportName: string } =>
  /^rm-(js|ts|react)-\d+$/.test(id)
    ? { file: 'lib/roadmap-questions.cs.ts', exportName: 'roadmapTranslationsCs' }
    : { file: 'lib/roadmap-questions-extra.cs.ts', exportName: 'roadmapExtraTranslationsCs' };

const q = (s: string) => JSON.stringify(s);
const render = (r: any) =>
  `{\n    introduction: ${q(r.hint)},\n    question: ${q(r.question)},\n    options: [${r.options.map(q).join(',')}],\n    explanation: ${q(r.explanation)},\n  }`;

interface Edit { start: number; end: number; text: string }
const byFile = new Map<string, Edit[]>();
const report = { replaced: 0, inserted: 0, problems: [] as string[] };

for (const [id, r] of rows) {
  if (!Array.isArray(r.options) || r.options.length !== 4 || !r.question || !r.explanation || !r.hint) { report.problems.push(`${id}: incomplete row`); continue; }
  const { file, exportName } = fileFor(id);
  const full = path.join(ROOT, file);
  const source = readFileSync(full, 'utf8');
  const sf = ts.createSourceFile(full, source, ts.ScriptTarget.ES2022, true);
  let obj: ts.ObjectLiteralExpression | null = null;
  const visit = (node: ts.Node) => {
    if (obj) return;
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === exportName && node.initializer && ts.isObjectLiteralExpression(node.initializer)) { obj = node.initializer; return; }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  if (!obj) { report.problems.push(`${id}: ${exportName} not found`); continue; }
  const edits = byFile.get(full) ?? [];
  const existing = (obj as ts.ObjectLiteralExpression).properties.find((p) => ts.isPropertyAssignment(p) && ts.isStringLiteral(p.name) && p.name.text === id) as ts.PropertyAssignment | undefined;
  if (existing) {
    edits.push({ start: existing.initializer.getStart(sf), end: existing.initializer.getEnd(), text: render(r) });
    report.replaced++;
  } else {
    // Insert before the closing brace of the object literal.
    const end = (obj as ts.ObjectLiteralExpression).getEnd() - 1;
    edits.push({ start: end, end, text: `  ${q(id)}: ${render(r)},\n` });
    report.inserted++;
  }
  byFile.set(full, edits);
}
for (const [file, edits] of byFile) {
  let source = readFileSync(file, 'utf8');
  edits.sort((a, b) => b.start - a.start || b.end - a.end);
  for (const e of edits) source = source.slice(0, e.start) + e.text + source.slice(e.end);
  if (!dry) writeFileSync(file, source);
}
console.log(JSON.stringify({ ...report, problems: report.problems.length, files: [...byFile.keys()].map((f) => path.relative(ROOT, f)), dry }, null, 1));
if (report.problems.length) console.log(report.problems.join('\n'));
