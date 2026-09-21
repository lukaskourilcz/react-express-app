/** Comments removed from the junior and senior boards.
 *
 * Those two readings are shown side by side after a verified pass, and they
 * are read as code: the point is to see the shape of an explicit answer next
 * to the shape of an idiomatic one. Authoring notes explaining *why* a line is
 * written that way belong to whoever maintains the catalogue — on the board
 * they bury the eight lines the learner came to compare.
 *
 * So the note stays in the source and never reaches the browser. Stripping
 * here, where `solutionFor` assembles the catalogue, rather than at the API
 * boundary, means the content contract executes exactly the code that ships:
 * every stripped solution is still run against its visible tests, its hidden
 * tests and the production grader.
 *
 * The scanner has to know where a comment really is. `https://x/y` is not a
 * comment, `"// not a comment"` is not a comment, and `/[^/]/` is a regex, not
 * the start of one — so strings, template literals (interpolations included)
 * and regex literals are all stepped over rather than pattern-matched. */

/** After these, a `/` opens a regex rather than dividing. */
const BEFORE_REGEX = new Set('(,=:[!&|?{};+-*%~^<>\n');
const KEYWORDS_BEFORE_REGEX = new Set([
  'return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'do', 'else', 'case', 'yield', 'await',
]);
const isWordChar = (c: string): boolean => /[A-Za-z0-9_$]/.test(c);

/** Skips the string or template literal that starts at `start`; returns the
 * index just past its closing quote. */
function skipLiteral(source: string, start: number): number {
  const quote = source[start];
  let i = start + 1;
  while (i < source.length) {
    const c = source[i];
    if (c === '\\') { i += 2; continue; }
    if (c === quote) return i + 1;
    if (quote === '`' && c === '$' && source[i + 1] === '{') {
      // An interpolation is code again, and may hold literals of its own.
      let depth = 1;
      i += 2;
      while (i < source.length && depth > 0) {
        const inner = source[i];
        if (inner === '"' || inner === "'" || inner === '`') { i = skipLiteral(source, i); continue; }
        if (inner === '{') depth += 1;
        else if (inner === '}') depth -= 1;
        i += 1;
      }
      continue;
    }
    i += 1;
  }
  return i;
}

/** The spans every comment occupies, in order. A JSX comment carries its
 * wrapping braces with it, so removing it does not leave `{}` behind. */
function commentSpans(source: string): [number, number][] {
  const spans: [number, number][] = [];
  let i = 0;
  let previous = '';
  let word = '';
  while (i < source.length) {
    const c = source[i];
    if (c === '"' || c === "'" || c === '`') {
      i = skipLiteral(source, i);
      previous = c;
      word = '';
      continue;
    }
    if (c === '/' && source[i + 1] === '/') {
      const newline = source.indexOf('\n', i);
      spans.push([i, newline < 0 ? source.length : newline]);
      i = newline < 0 ? source.length : newline;
      continue;
    }
    if (c === '/' && source[i + 1] === '*') {
      const close = source.indexOf('*/', i + 2);
      let from = i;
      let to = close < 0 ? source.length : close + 2;
      // `{/* ... */}` is one JSX comment; take the braces too.
      const before = source.slice(0, from).match(/\{[ \t]*$/);
      const after = source.slice(to).match(/^[ \t]*\}/);
      if (before && after) { from -= before[0].length; to += after[0].length; }
      spans.push([from, to]);
      i = close < 0 ? source.length : close + 2;
      continue;
    }
    if (c === '/') {
      const canBeRegex = previous === '' || BEFORE_REGEX.has(previous) || KEYWORDS_BEFORE_REGEX.has(word);
      if (canBeRegex) {
        let j = i + 1;
        let closed = false;
        let inClass = false;
        while (j < source.length) {
          const r = source[j];
          if (r === '\\') { j += 2; continue; }
          if (r === '[') inClass = true;
          else if (r === ']') inClass = false;
          else if (r === '/' && !inClass) { closed = true; j += 1; break; }
          else if (r === '\n') break;
          j += 1;
        }
        if (closed) {
          while (j < source.length && /[a-z]/i.test(source[j])) j += 1;
          i = j;
          previous = '/';
          word = '';
          continue;
        }
      }
    }
    if (!/\s/.test(c)) {
      previous = c;
      word = isWordChar(c) ? word + c : '';
    }
    i += 1;
  }
  return spans;
}

/**
 * The same code with its comments gone: a line that held nothing but a comment
 * disappears, a trailing comment leaves the code before it untouched, and a
 * gap of more than one blank line closes up. Idempotent, which the content
 * contract asserts of every board it ships.
 */
export function stripComments(code: string): string {
  const spans = commentSpans(code);
  if (spans.length === 0) return code;
  // Each comment is replaced by the newlines it spanned rather than deleted
  // outright, so the result still has one line per original line and the two
  // can be compared by index. A block comment across three lines therefore
  // leaves three blank lines, which the filter below then drops.
  let out = '';
  let last = 0;
  for (const [from, to] of spans) {
    const span = code.slice(from, to);
    out += code.slice(last, from) + '\n'.repeat(span.split('\n').length - 1);
    last = to;
  }
  out += code.slice(last);
  const original = code.split('\n');
  const kept = out.split('\n').filter((line, index) => {
    // A line left empty by a comment goes; one that was already blank stays,
    // because the author put it there to separate two ideas.
    return line.trim() !== '' || (original[index] ?? '').trim() === '';
  });
  return kept.map((line) => line.replace(/[ \t]+$/, '')).join('\n').replace(/\n{3,}/g, '\n\n');
}
