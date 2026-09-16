/** The `console` a learner's code can call, written once for both runtimes.
 *
 * The browser worker (`shared/coding-evaluate.ts`) and the QuickJS sandbox
 * (`lib/coding/sandbox.ts`) both build their console from `CONSOLE_SOURCE`,
 * so a learner sees the same lines in the Console tab after Run and after
 * Submit. The source is a factory expression: it takes `emit`, which the
 * runtime uses to collect one line and enforce its own line budget, and
 * `now`, the runtime's clock for `time`/`timeEnd`.
 *
 * Every native the factory needs is captured when the factory runs, which in
 * both runtimes is before any learner code, so learner code that rewrites a
 * prototype later only changes what it prints for itself. Nothing here is part
 * of a verdict except the fact that a line was emitted at all, which the
 * `quiet` stages of the debugging course check.
 *
 * Output formats, in one place so the two runtimes cannot drift:
 *   log/info/warn/error/debug   arguments joined by a space; strings raw,
 *                               everything else as JSON
 *   table(data[, columns])      a header row, a rule, then one row per entry,
 *                               as a browser console lays it out
 *   assert(condition, ...args)  "Assertion failed" plus the arguments, only
 *                               when the condition is falsy
 *   trace(...args)              "Trace" plus the arguments, then the calling
 *                               functions by name, nearest first
 *   group/groupCollapsed/groupEnd  the label, then two spaces of indent per
 *                               open group on every following line
 *   count/countReset            "label: n"
 *   dir(value)                  the value as indented JSON
 *   time/timeLog/timeEnd        "label: 12.5ms" from the runtime's clock
 */

export const CONSOLE_METHODS = [
  'log', 'info', 'warn', 'error', 'debug',
  'table', 'assert', 'trace',
  'group', 'groupCollapsed', 'groupEnd',
  'count', 'countReset', 'dir',
  'time', 'timeLog', 'timeEnd',
] as const;
export type ConsoleMethod = (typeof CONSOLE_METHODS)[number];

export type ConsoleSink = Record<ConsoleMethod, (...args: unknown[]) => void>;
export type ConsoleFactory = (emit: (line: string) => void, now: () => number) => ConsoleSink;

/** Plain ES2018, no `${`, no backticks: it is embedded in a template literal
 * on the server and evaluated with `new Function` in the worker. */
export const CONSOLE_SOURCE = String.raw`(emit, now) => {
  'use strict';
  const apply = Reflect.apply;
  const stringify = JSON.stringify, keys = Object.keys, isArray = Array.isArray, string = String;
  const NativeError = Error, round = Math.round, create = Object.create;
  const slice = String.prototype.slice, split = String.prototype.split, repeat = String.prototype.repeat;
  const lastIndexOf = String.prototype.lastIndexOf, exec = RegExp.prototype.exec;
  const FRAME = /^\s*at\s+(?:async\s+)?([^\s(]+)/;
  const NAME = /^[A-Za-z_$][\w$]*$/;
  const INTERNAL = { trace: 1, eval: 1, evaluate: 1, evaluateCalls: 1, invoke: 1, apply: 1, anonymous: 1, Function: 1, Promise: 1, all: 1, async: 1 };
  const MAX_COLUMNS = 8, MAX_ROWS = 20, CELL = 24, MAX_FRAMES = 6;
  let depth = 0;
  const counts = create(null), timers = create(null);
  const text = (value) => {
    if (typeof value === 'string') return value;
    try { const json = stringify(value); return json === undefined ? string(value) : json; }
    catch (error) { return '[unprintable]'; }
  };
  const join = (args) => {
    let line = '';
    for (let i = 0; i < args.length; i++) { if (i) line += ' '; line += text(args[i]); }
    return line;
  };
  const write = (line) => { emit(depth > 0 ? apply(repeat, '  ', [depth]) + line : line); };
  const label = (value) => (value === undefined ? 'default' : text(value));
  const log = (...args) => { write(join(args)); };
  const cell = (value) => {
    const s = text(value);
    return s.length > CELL ? apply(slice, s, [0, CELL - 1]) + '…' : s;
  };
  const pad = (s, width) => { let out = s; while (out.length < width) out += ' '; return out; };
  const table = (data, only) => {
    if (data === null || typeof data !== 'object') { log(data); return; }
    const rowKeys = isArray(data) ? null : keys(data);
    const total = rowKeys ? rowKeys.length : data.length;
    const shown = total > MAX_ROWS ? MAX_ROWS : total;
    const columns = [], rows = [];
    let hasValue = false;
    for (let r = 0; r < shown; r++) {
      const key = rowKeys ? rowKeys[r] : string(r);
      const row = rowKeys ? data[key] : data[r];
      if (row !== null && typeof row === 'object') {
        const names = isArray(only) ? only : keys(row);
        for (let c = 0; c < names.length; c++) {
          let seen = false;
          for (let k = 0; k < columns.length; k++) if (columns[k] === names[c]) { seen = true; break; }
          if (!seen && columns.length < MAX_COLUMNS) columns[columns.length] = string(names[c]);
        }
      } else hasValue = true;
      rows[rows.length] = { key, row };
    }
    const header = ['(index)'];
    for (let c = 0; c < columns.length; c++) header[header.length] = columns[c];
    if (hasValue) header[header.length] = 'Value';
    const lines = [];
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r].row, cells = [rows[r].key];
      const isRecord = row !== null && typeof row === 'object';
      for (let c = 0; c < columns.length; c++) cells[cells.length] = isRecord && columns[c] in row ? cell(row[columns[c]]) : '';
      if (hasValue) cells[cells.length] = isRecord ? '' : cell(row);
      lines[lines.length] = cells;
    }
    const widths = [];
    for (let c = 0; c < header.length; c++) {
      let width = header[c].length;
      for (let r = 0; r < lines.length; r++) if (lines[r][c].length > width) width = lines[r][c].length;
      widths[c] = width;
    }
    const render = (cells) => {
      let out = '';
      for (let c = 0; c < cells.length; c++) out += (c ? ' | ' : '') + pad(cells[c], widths[c]);
      return out;
    };
    write(render(header));
    let rule = '';
    for (let c = 0; c < widths.length; c++) rule += (c ? '-+-' : '') + apply(repeat, '-', [widths[c]]);
    write(rule);
    for (let r = 0; r < lines.length; r++) write(render(lines[r]));
    if (total > shown) write('… ' + (total - shown) + ' more rows');
  };
  const assert = (condition, ...args) => {
    if (!condition) write('Assertion failed' + (args.length ? ': ' + join(args) : ''));
  };
  const trace = (...args) => {
    write('Trace' + (args.length ? ': ' + join(args) : ''));
    let stack = '';
    try { stack = string(new NativeError().stack || ''); } catch (error) { stack = ''; }
    const lines = apply(split, stack, ['\n']);
    let shown = 0, previous = '';
    for (let i = 0; i < lines.length && shown < MAX_FRAMES; i++) {
      const match = apply(exec, FRAME, [lines[i]]);
      if (!match) continue;
      let name = match[1];
      const dot = apply(lastIndexOf, name, ['.']);
      if (dot >= 0) name = apply(slice, name, [dot + 1]);
      if (!apply(exec, NAME, [name]) || INTERNAL[name] === 1 || name === previous) continue;
      write('  at ' + name);
      previous = name;
      shown++;
    }
  };
  const group = (...args) => { write(args.length ? join(args) : 'group'); depth++; };
  const groupEnd = () => { if (depth > 0) depth--; };
  const count = (value) => { const key = label(value); counts[key] = (counts[key] || 0) + 1; write(key + ': ' + counts[key]); };
  const countReset = (value) => { counts[label(value)] = 0; };
  const dir = (value) => {
    try { const json = stringify(value, null, 2); write(json === undefined ? string(value) : json); }
    catch (error) { write('[unprintable]'); }
  };
  const time = (value) => { timers[label(value)] = now(); };
  const timeLog = (value, ...args) => {
    const key = label(value), start = timers[key];
    if (start === undefined) return;
    const ms = round((now() - start) * 1000) / 1000;
    write(key + ': ' + ms + 'ms' + (args.length ? ' ' + join(args) : ''));
  };
  const timeEnd = (value) => { timeLog(value); delete timers[label(value)]; };
  return { log, info: log, warn: log, error: log, debug: log, table, assert, trace, group, groupCollapsed: group, groupEnd, count, countReset, dir, time, timeLog, timeEnd };
}`;
