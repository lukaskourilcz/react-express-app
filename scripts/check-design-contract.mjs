// The design contract, checked on the source (DESIGN_RULES.md §10, UX audit
// U1–U6, Epic U #572). It stops four kinds of drift the audit removed:
//
//   page-width     a numeric max-width of 560px or more in a client/src style
//                  prop or CSS rule. The route shell picks the page width
//                  (components/ui/pageWidth.ts) and task columns take
//                  var(--ss-width-task); a page never caps itself in pixels.
//   small-button   an Astryx <Button size="sm"> or <IconButton size="sm">
//                  outside the files allowlisted as compact contexts. Every
//                  control is 44px; only a component's own toolbar is 36px.
//   button-height  a CSS height or min-height under 44px on a selector that
//                  styles a button (button, …button…, …-btn). Inside an
//                  .ss-compact rule 36px is the floor.
//   sign-in-verb   a visible 'Log in' string in client/src/i18n. The verb is
//                  'Sign in'.
//
// Anything legitimate today is in scripts/design-contract-allowlist.json with a
// reason. An allowlist entry that no longer matches anything fails too, so the
// list only shrinks. The fixtures in scripts/test-design-contract.mjs prove
// each rule fails on a bad sample.
//
//   node scripts/check-design-contract.mjs      (npm run check:design)
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = 'client/src';
const ALLOWLIST = 'scripts/design-contract-allowlist.json';

/** The smallest max-width that counts as a page width. Inner parts (a form
 * field, a toast, a 68ch measure) sit below it. */
export const PAGE_WIDTH_FLOOR = 560;
export const CONTROL_HEIGHT = 44;
export const COMPACT_HEIGHT = 36;

export const HINTS = {
  'page-width': 'let the route shell pick the width (components/ui/pageWidth.ts) or use var(--ss-width-task) for an inner column',
  'small-button': 'drop size="sm": buttons are 44px; only a component toolbar inside .ss-compact may be compact (allowlist the file with a reason)',
  'button-height': 'buttons take --ss-control-height (44px); 36px only inside an .ss-compact rule, with a 44px hit area',
  'sign-in-verb': "use the verb 'Sign in', never 'Log in'",
};

const lineAt = (source, index) => source.slice(0, index).split('\n').length;

/** Lengths in a CSS value, in px. Bare numbers count as px only when `bare`. */
function lengthsPx(value, bare = false) {
  const out = [];
  const re = /(-?\d*\.?\d+)(px|rem|em)?\b/g;
  let m;
  while ((m = re.exec(value))) {
    // Skip digits that are part of a name, e.g. var(--ss-width-640) or h2.
    if (/[\w-]/.test(value[m.index - 1] ?? '')) continue;
    const n = Number(m[1]);
    if (m[2] === 'px') out.push(n);
    else if (m[2] === 'rem' || m[2] === 'em') out.push(n * 16);
    else if (bare) out.push(n);
  }
  return out;
}

function pageWidthViolation(value, bareIsPx) {
  const big = lengthsPx(value, bareIsPx).filter((px) => px >= PAGE_WIDTH_FLOOR);
  return big.length ? `max-width ${big.map((px) => `${px}px`).join(', ')} is a page width` : null;
}

// ---------------------------------------------------------------------------
// TSX / TS: style props and Astryx buttons.

/** Rules for one .tsx/.ts source file under client/src. */
export function checkScript(source, file) {
  const out = [];
  // maxWidth: 920 · maxWidth: '920px' · maxWidth={1080} · maxWidth="min(920px, 100%)" · 'max-width': '60rem'
  const width = /(?:\bmaxWidth|['"]max-width['"])\s*(?::|=)\s*\{?\s*(?:(['"`])((?:\\.|(?!\1)[^\\])*)\1|(-?\d*\.?\d+))/g;
  let m;
  while ((m = width.exec(source))) {
    const value = m[2] ?? m[3];
    const message = m[3] !== undefined ? pageWidthViolation(value, true) : pageWidthViolation(value, /^\s*\d+\s*$/.test(value));
    if (message) out.push({ rule: 'page-width', file, line: lineAt(source, m.index), text: m[0].trim(), message });
  }

  // Local names of the Astryx Button and IconButton imports.
  const names = new Set();
  const imports = /import\s*\{([^}]*)\}\s*from\s*['"]@astryxdesign\/core(?:\/(Button|IconButton))?['"]/g;
  while ((m = imports.exec(source))) {
    for (const part of m[1].split(',')) {
      const [imported, local] = part.trim().split(/\s+as\s+/);
      if (imported === 'Button' || imported === 'IconButton') names.add((local ?? imported).trim());
    }
  }
  for (const name of names) {
    const open = new RegExp(`<${name}(?=[\\s/>])`, 'g');
    while ((m = open.exec(source))) {
      const tag = jsxOpeningTag(source, m.index);
      const size = tag.match(/\bsize\s*=\s*(?:(["'])sm\1|\{[^}]*(["'`])sm\2[^}]*\})/);
      if (size) out.push({ rule: 'small-button', file, line: lineAt(source, m.index + tag.indexOf(size[0])), text: tag.replace(/\s+/g, ' ').slice(0, 200), message: `${name} size="sm" outside a compact context` });
    }
  }
  return out;
}

/** The text of a JSX opening tag starting at `start`, up to its closing `>`. */
function jsxOpeningTag(source, start) {
  let depth = 0;
  let quote = null;
  for (let i = start + 1; i < source.length; i += 1) {
    const c = source[i];
    if (quote) {
      if (c === '\\') i += 1;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') quote = c;
    else if (c === '{') depth += 1;
    else if (c === '}') depth -= 1;
    else if (c === '>' && depth === 0) return source.slice(start, i + 1);
  }
  return source.slice(start);
}

// ---------------------------------------------------------------------------
// CSS: rules and declarations with their selector chain.

/** Every declaration in a stylesheet: { selectors: [outer…inner], prop, value, line }. */
export function cssDeclarations(source) {
  const css = source.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));
  const stack = [];
  const out = [];
  let buffer = '';
  let bufferStart = 0;
  let quote = null;
  const flush = () => {
    const text = buffer.trim();
    const top = stack[stack.length - 1];
    if (text && top && !top.startsWith('@')) {
      const colon = text.indexOf(':');
      if (colon > 0) {
        const lead = buffer.length - buffer.trimStart().length;
        out.push({
          selectors: stack.filter((s) => !s.startsWith('@')),
          prop: text.slice(0, colon).trim().toLowerCase(),
          value: text.slice(colon + 1).replace(/!important/i, '').trim(),
          line: lineAt(css, bufferStart + lead),
        });
      }
    }
    buffer = '';
  };
  for (let i = 0; i < css.length; i += 1) {
    const c = css[i];
    if (quote) {
      buffer += c;
      if (c === '\\') { buffer += css[i + 1] ?? ''; i += 1; } else if (c === quote) quote = null;
      continue;
    }
    if (!buffer) bufferStart = i;
    if (c === '"' || c === "'") { quote = c; buffer += c; continue; }
    if (c === '{') { stack.push(buffer.trim().replace(/\s+/g, ' ')); buffer = ''; continue; }
    if (c === '}') { flush(); stack.pop(); continue; }
    if (c === ';') { flush(); continue; }
    buffer += c;
  }
  return out;
}

/** Split a selector list on its top-level commas. */
function splitList(selector) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (const c of selector) {
    if (c === '(' || c === '[') depth += 1;
    if (c === ')' || c === ']') depth -= 1;
    if (c === ',' && depth === 0) { parts.push(current.trim()); current = ''; } else current += c;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

/** The last compound of a complex selector: what the rule actually styles. */
function subject(selector) {
  let depth = 0;
  let last = 0;
  for (let i = 0; i < selector.length; i += 1) {
    const c = selector[i];
    if (c === '(' || c === '[') depth += 1;
    else if (c === ')' || c === ']') depth -= 1;
    else if (depth === 0 && /[\s>+~]/.test(c)) last = i + 1;
  }
  return selector.slice(last).trim();
}

// A word ending in button/btn names a button; button-row, buttons, btn-icon
// name a container or a part of one.
const BUTTON_WORD = /(?:^|[^a-z0-9])(?:[a-z0-9-]*-)?(?:button|btn)(?![a-z0-9]|-(?:row|rows|group|bar|wrap|list|icon|label|text|glyph|hint|strip|stack|grid|area|slot|cluster))/i;

/** Does this compound style a button element or a button class? */
export function stylesButton(compound) {
  if (!compound || compound.includes('::')) return false; // a pseudo-element is a part, not the button
  const strip = compound.replace(/:(?:not|has|is|where)\((?:[^()]|\([^()]*\))*\)/g, '');
  if (/^button\b/i.test(strip)) return true;
  return BUTTON_WORD.test(strip.replace(/^[a-z]+(?=[.#[:]|$)/i, (tag) => (tag.toLowerCase() === 'button' ? 'button' : '')));
}

/** Rules for one CSS file under client/src. */
export function checkCss(source, file) {
  const out = [];
  for (const d of cssDeclarations(source)) {
    if (d.prop === 'max-width') {
      if (/var\(--ss-width-/.test(d.value) && !pageWidthViolation(d.value.replace(/var\([^)]*\)/g, ''), false)) continue;
      const message = pageWidthViolation(d.value, false);
      if (message) out.push({ rule: 'page-width', file, line: d.line, text: `${d.selectors.at(-1)} { max-width: ${d.value} }`, message });
      continue;
    }
    if (!['height', 'min-height', 'block-size', 'min-block-size'].includes(d.prop)) continue;
    // The two control-height tokens count as their values.
    const value = d.value.replace(/var\(--ss-control-height-compact\)/g, `${COMPACT_HEIGHT}px`).replace(/var\(--ss-control-height\)/g, `${CONTROL_HEIGHT}px`);
    const lengths = /^-?\d*\.?\d+(px|rem|em)$/.test(value) ? lengthsPx(value) : [];
    if (!lengths.length) continue;
    const px = lengths[0];
    const chain = d.selectors.join(' ');
    for (const selector of splitList(d.selectors.at(-1))) {
      if (!stylesButton(subject(selector))) continue;
      const compact = chain.includes('.ss-compact') || selector.includes('.ss-compact');
      const floor = compact ? COMPACT_HEIGHT : CONTROL_HEIGHT;
      if (px < floor) {
        out.push({ rule: 'button-height', file, line: d.line, text: `${selector} { ${d.prop}: ${d.value} }`, message: `${d.prop} ${px}px is under ${floor}px${compact ? ' (compact)' : ''}` });
        break;
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// i18n: visible strings.

/** Rules for one translation file under client/src/i18n. */
export function checkCopy(source, file) {
  const out = [];
  const literal = /(['"`])((?:\\.|(?!\1)[^\\\n])*)\1(\s*:)?/g;
  let m;
  while ((m = literal.exec(source))) {
    if (m[3]) continue; // a key, not a visible string
    const visible = m[2].replace(/\{[^}]*\}/g, ''); // {login} is a placeholder
    // 'Log in' in any case, and 'Login' as a label; 'your GitHub login' is a noun.
    const hit = visible.match(/\blog[\s\u00a0-]+in\b/i) ?? visible.match(/\bLog[Ii]n\b|\bLOGIN\b/);
    if (hit) {
      out.push({ rule: 'sign-in-verb', file, line: lineAt(source, m.index), text: hit[0], message: `'${hit[0]}' is the wrong sign-in verb` });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// The tree.

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === 'node_modules' || name === '__tests__') continue;
      out.push(...walk(full));
    } else out.push(full);
  }
  return out;
}

/** Every violation in the tree at `root`, before the allowlist. */
export function scan(root = ROOT) {
  const out = [];
  for (const full of walk(path.join(root, SRC))) {
    const file = path.relative(root, full).split(path.sep).join('/');
    if (/\.(test|spec|stories)\.[jt]sx?$/.test(file)) continue;
    const source = readFileSync(full, 'utf8');
    if (/\.css$/.test(file)) out.push(...checkCss(source, file));
    else if (/\.[jt]sx?$/.test(file)) {
      out.push(...checkScript(source, file));
      if (file.startsWith(`${SRC}/i18n/`)) out.push(...checkCopy(source, file));
    }
  }
  return out;
}

/**
 * Apply the allowlist. An entry is { rule, file, match?, reason }: it covers
 * every violation of `rule` in `file` whose text contains `match` (or all of
 * them when `match` is left out, as the small-button file list does).
 * Returns the violations left and the entries that matched nothing.
 */
export function applyAllowlist(violations, entries) {
  const problems = [];
  for (const [index, entry] of entries.entries()) {
    if (!entry.rule || !entry.file || !entry.reason?.trim()) problems.push(`allowlist entry ${index} needs a rule, a file and a reason`);
    if (entry.rule && !HINTS[entry.rule]) problems.push(`allowlist entry ${index}: unknown rule ${entry.rule}`);
  }
  const used = new Set();
  const left = violations.filter((v) => {
    const index = entries.findIndex((e) => e.rule === v.rule && e.file === v.file && (e.match === undefined || v.text.includes(e.match)));
    if (index >= 0) used.add(index);
    return index < 0;
  });
  const stale = entries.filter((_, index) => !used.has(index));
  return { left, stale, problems };
}

export const format = (v) => `${v.file}:${v.line}  [${v.rule}] ${v.message}: ${v.text}\n    fix: ${HINTS[v.rule]}`;

function main() {
  const entries = JSON.parse(readFileSync(path.join(ROOT, ALLOWLIST), 'utf8')).entries;
  const { left, stale, problems } = applyAllowlist(scan(), entries);
  for (const v of left) console.error(format(v));
  for (const e of stale) console.error(`${ALLOWLIST}: stale entry [${e.rule}] ${e.file}${e.match ? ` "${e.match}"` : ''} matches nothing; remove it`);
  for (const p of problems) console.error(`${ALLOWLIST}: ${p}`);
  const failures = left.length + stale.length + problems.length;
  if (failures) {
    console.error(`\ndesign contract: ${failures} problem(s). See DESIGN_RULES.md §10.`);
    process.exit(1);
  }
  console.log(`design contract: ok (${entries.length} allowlisted)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
