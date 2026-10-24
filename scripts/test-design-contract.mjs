// Fixtures for scripts/check-design-contract.mjs: each rule fails on a bad
// sample and lets the legitimate neighbour through. Runs before the check in
// `npm run check:design`.
import assert from 'node:assert/strict';
import { applyAllowlist, checkCopy, checkCss, checkScript, format } from './check-design-contract.mjs';

const rules = (violations) => violations.map((v) => v.rule);
let count = 0;
const test = (name, fn) => { fn(); count += 1; console.log(`  ok  ${name}`); };

// --- page-width ------------------------------------------------------------
test('page-width: a numeric page max-width in a TSX style prop fails', () => {
  for (const bad of [
    '<div style={{ maxWidth: 1060, margin: "0 auto" }} />',
    "<div style={{ maxWidth: '920px' }} />",
    '<Box maxWidth={1080} />',
    '<Box maxWidth="min(920px, 100%)" />',
    "<div style={{ maxWidth: '60rem' }} />",
  ]) {
    const found = checkScript(bad, 'client/src/Bad.tsx');
    assert.deepEqual(rules(found), ['page-width'], bad);
    assert.equal(found[0].line, 1);
  }
});
test('page-width: tokens, inner elements and text measures pass in TSX', () => {
  for (const good of [
    "<div style={{ maxWidth: 'var(--ss-width-task)' }} />",
    '<input style={{ maxWidth: 320 }} />',
    "<p style={{ maxWidth: '68ch' }} />",
    "<div style={{ maxWidth: '100%' }} />",
  ]) assert.deepEqual(checkScript(good, 'client/src/Good.tsx'), [], good);
});
test('page-width: a pixel page max-width in a CSS rule fails, also inside @media', () => {
  const css = '.page {\n  max-width: 920px;\n}\n@media (min-width: 900px) {\n  .page { max-width: 75rem; }\n}\n';
  const found = checkCss(css, 'client/src/Bad.css');
  assert.deepEqual(rules(found), ['page-width', 'page-width']);
  assert.deepEqual(found.map((v) => v.line), [2, 5]);
});
test('page-width: var(--ss-width-*), small inner widths and media queries pass in CSS', () => {
  const css = '@media (max-width: 900px) { .a { color: red; } }\n.col { max-width: var(--ss-width-task); }\n.toast { max-width: 420px; }\n.prose { max-width: 68ch; }\n.fit { max-width: min(var(--ss-width-narrow), 100%); }\n';
  assert.deepEqual(checkCss(css, 'client/src/Good.css'), []);
});

// --- small-button ----------------------------------------------------------
test('small-button: an Astryx Button or IconButton with size="sm" fails, under any local name', () => {
  const src = [
    "import { Button } from '@astryxdesign/core/Button';",
    "import { IconButton as AxIcon } from '@astryxdesign/core/IconButton';",
    'export const A = () => <Button variant="ghost"',
    '  size="sm" label="Go" onClick={() => go()} />;',
    "export const B = () => <AxIcon size={'sm'} label=\"Close\" />;",
    "export const C = ({ compact }) => <Button size={compact ? 'sm' : 'md'} label=\"Go\" />;",
  ].join('\n');
  const found = checkScript(src, 'client/src/Bad.tsx');
  assert.deepEqual(rules(found), ['small-button', 'small-button', 'small-button']);
  assert.deepEqual(found.map((v) => v.line).sort(), [4, 5, 6]);
});
test('small-button: default-size buttons and other components with size="sm" pass', () => {
  const src = [
    "import { Button } from '@astryxdesign/core/Button';",
    "import { Badge } from '@astryxdesign/core/Badge';",
    'export const A = () => <><Button variant="ghost" label="Go" onClick={() => a > b} /><Badge size="sm" /><SwimCta size="sm" /></>;',
  ].join('\n');
  assert.deepEqual(checkScript(src, 'client/src/Good.tsx'), []);
});

// --- button-height ---------------------------------------------------------
test('button-height: a button selector under 44px fails', () => {
  for (const bad of [
    '.ss-fin-button { height: 32px; }',
    '.cd-run-btn:hover { min-height: 2rem; }',
    '.toolbar button { min-height: 40px; }',
    '.a, .ss-term__button { height: var(--ss-control-height-compact); }',
    '@media (pointer: fine) { .x .share-button { min-height: 28px; } }',
  ]) assert.deepEqual(rules(checkCss(bad, 'client/src/Bad.css')), ['button-height'], bad);
});
test('button-height: inside .ss-compact 36px passes and 32px fails', () => {
  assert.deepEqual(checkCss('.ss-compact .cd-btn { min-height: 36px; }', 'client/src/Ok.css'), []);
  assert.deepEqual(checkCss('@media (pointer: fine) { .ss-compact .astryx-button { min-height: var(--ss-control-height-compact); } }', 'client/src/Ok.css'), []);
  assert.deepEqual(rules(checkCss('.ss-compact .cd-btn { min-height: 32px; }', 'client/src/Bad.css')), ['button-height']);
});
test('button-height: a part of a button, a button row and 44px pass', () => {
  const css = '.x-button svg { height: 20px; }\n.x-button::after { height: 2px; }\n.cd-button-row { min-height: 0; height: 24px; }\n.cd-btn { min-height: var(--ss-control-height); }\nbutton.big { height: 48px; }\n.buttons { height: 12px; }\n';
  assert.deepEqual(checkCss(css, 'client/src/Good.css'), []);
});

// --- sign-in-verb ----------------------------------------------------------
test("sign-in-verb: a visible 'Log in' string fails", () => {
  for (const bad of ["  'auth.cta': 'Log in to save',", '  "auth.cta": "Please log in first.",', "  'auth.cta': 'Log-in',", "  'auth.cta': 'Login',", "  'auth.cta': 'LOG IN',"]) {
    assert.deepEqual(rules(checkCopy(bad, 'client/src/i18n/translations.ts')), ['sign-in-verb'], bad);
  }
});
test("sign-in-verb: 'Sign in', a key named logIn, a {login} placeholder and a GitHub login pass", () => {
  const src = "  'auth.logIn': 'Sign in',\n  'github.connectedAs': 'Connected as {login}.',\n  'x': 'with your GitHub login as the author',\n";
  assert.deepEqual(checkCopy(src, 'client/src/i18n/translations.ts'), []);
});

// --- allowlist and output --------------------------------------------------
test('the allowlist covers a matching violation, reports a stale entry and needs a reason', () => {
  const v = checkCss('.page { max-width: 920px; }', 'client/src/A.css');
  const ok = applyAllowlist(v, [{ rule: 'page-width', file: 'client/src/A.css', match: '920px', reason: 'fixture' }]);
  assert.deepEqual([ok.left.length, ok.stale.length, ok.problems.length], [0, 0, 0]);
  const stale = applyAllowlist([], [{ rule: 'page-width', file: 'client/src/A.css', match: '920px', reason: 'fixture' }]);
  assert.equal(stale.stale.length, 1);
  const noReason = applyAllowlist(v, [{ rule: 'page-width', file: 'client/src/A.css' }]);
  assert.equal(noReason.problems.length, 1);
  const otherFile = applyAllowlist(v, [{ rule: 'page-width', file: 'client/src/B.css', reason: 'fixture' }]);
  assert.equal(otherFile.left.length, 1);
});
test('a violation prints as file:line with its rule and a fix hint', () => {
  const [v] = checkCss('.page {\n  max-width: 920px;\n}', 'client/src/A.css');
  const text = format(v);
  assert.match(text, /^client\/src\/A\.css:2 {2}\[page-width\] /);
  assert.match(text, /\n {4}fix: .*--ss-width-task/);
});

console.log(`design contract fixtures: ${count} passed`);
