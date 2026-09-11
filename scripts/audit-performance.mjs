import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
// CI installs Chromium through Playwright; an explicit Chrome path still wins.
process.env.CHROME_PATH ||= chromium.executablePath();
const url = process.argv.find(arg => arg.startsWith('--url='))?.slice(6) || 'http://localhost:4173';
const output = process.argv.find(arg => arg.startsWith('--output='))?.slice(9) || 'artifacts/performance';
mkdirSync(output, { recursive: true });
const results = [];
for (const profile of ['mobile', 'desktop']) {
  const prefix = path.join(output, profile);
  const run = spawnSync(process.execPath, ['node_modules/lighthouse/cli/index.js', url,
    '--chrome-flags=--headless --no-sandbox --disable-dev-shm-usage', '--output=json', '--output=html', `--output-path=${prefix}`,
    '--only-categories=performance,accessibility,best-practices,seo', ...(profile === 'desktop' ? ['--preset=desktop'] : []), '--quiet'], { stdio: 'inherit', env: process.env });
  if (run.status !== 0) process.exit(run.status || 1);
  const { lhr } = { lhr: JSON.parse(readFileSync(`${prefix}.report.json`, 'utf8')) };
  if (lhr.runtimeError) throw new Error(lhr.runtimeError.message);
  results.push({ profile, requestedUrl: url, finalUrl: lhr.finalDisplayedUrl, fetchTime: lhr.fetchTime,
    lighthouseVersion: lhr.lighthouseVersion, scores: Object.fromEntries(Object.entries(lhr.categories).map(([key, value]) => [key, value.score])),
    lcpMs: lhr.audits['largest-contentful-paint'].numericValue, cls: lhr.audits['cumulative-layout-shift'].numericValue,
    tbtMs: lhr.audits['total-blocking-time'].numericValue, transferredBytes: lhr.audits['total-byte-weight'].numericValue,
    warnings: lhr.runWarnings,
  });
}
writeFileSync(path.join(output, 'summary.json'), JSON.stringify(results, null, 2) + '\n');
console.table(results.map(({ profile, scores, lcpMs, cls, tbtMs }) => ({ profile, ...scores, lcpMs, cls, tbtMs })));
console.log('Lab results, not field Core Web Vitals; compare the same URL, build settings and test machine.');
