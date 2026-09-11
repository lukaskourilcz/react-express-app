import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const run = spawnSync(process.execPath, ['node_modules/knip/bin/knip.js', '--reporter', 'json', '--no-config-hints', '--include', 'files,dependencies,unlisted,unresolved'], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
if (/ERROR:/.test(run.stderr)) throw new Error(run.stderr);
let report;
try { report = JSON.parse(run.stdout); } catch { throw new Error(`Knip could not produce a report: ${run.stderr}`); }
if (run.status !== 0 && run.status !== 1) throw new Error(run.stderr);
mkdirSync('artifacts', { recursive: true });
writeFileSync('artifacts/unused.json', JSON.stringify(report, null, 2) + '\n');
const signatures = [
  ...(report.files || []).map(file => `file:${typeof file === 'string' ? file : file.filePath}`),
  ...(report.issues || []).flatMap(issue => Object.entries(issue).filter(([key]) => key !== 'file').flatMap(([kind, values]) =>
    Array.isArray(values) ? values.map(value => `${issue.file}:${kind}:${typeof value === 'string' ? value : value.name || value.symbol || JSON.stringify(value)}`) : [])),
].sort();
const baseline = JSON.parse(readFileSync('docs/quality/unused-baseline.json', 'utf8'));
const added = signatures.filter(issue => !baseline.includes(issue));
if (added.length) { console.error('New unused-code findings require review:\n' + added.join('\n')); process.exitCode = 1; }
else console.log(`Knip: no new findings; ${signatures.length} existing findings remain in the reviewed inventory.`);
