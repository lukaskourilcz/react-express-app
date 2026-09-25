import type { CodingFormat, CodingTask, CallTest, Localized, TypeTest } from '../../../shared/coding-catalog';
import type { FailureCategory } from '../../../shared/coding-failure';
import { EVOLVING_CHALLENGES } from '../../../shared/evolving';
import { stageReferences } from './evolving-references';

const text = (en: string, cs: string): Localized => ({ en, cs });
const test = (call: string, expected: unknown): CallTest => ({ call, expected, edge: true });

interface Spec {
  starter: string;
  focus: string[];
  prompts: Localized[];
  hints: Localized[];
  /** Method steps per stage, offered on the hint ladder after the hint. */
  approaches?: Localized[][];
  /** What the learner does at every stage. Absent means `implement`. */
  format?: CodingFormat;
  /** The misconception each stage is built around, for the failure hints. */
  pitfalls?: FailureCategory[];
  tests?: CallTest[][];
  typeTests?: TypeTest[][];
  suites?: string[];
  references?: { title: Localized; url: string }[][];
}

const SPECS: Record<string, Spec> = {
  'js-evolving-calculator': {
    starter: 'function calculate(expression) {\n  // Return a number.\n}\n', focus: ['split', 'reduce'],
    prompts: [
      text('Implement calculate(expression) for sums of one or more non-negative integers, with optional whitespace: "1 + 2" → 3. A single number returns itself. Inputs in this stage are valid.', 'Napiš calculate(expression) pro součet jednoho či více nezáporných celých čísel s volitelnými mezerami: "1 + 2" → 3. Samotné číslo vrátí sebe. Vstupy této etapy jsou platné.'),
      text('Keep addition and add subtraction, multiplication and division. Respect precedence (* and / before + and -) and left associativity: "1 + 2 / 9 * 4" → 1.8888888888888888. Operands are non-negative decimals; inputs are valid and division is non-zero.', 'Zachovej sčítání a přidej odčítání, násobení a dělení. Respektuj prioritu (* a / před + a -) a vyhodnocování zleva: "1 + 2 / 9 * 4" → 1.8888888888888888. Operandy jsou nezáporná desetinná čísla; vstupy jsou platné a dělitel není nula.'),
      text('Extend the engine with nested parentheses and unary +/-. Return null for malformed input, empty input, trailing tokens or division by zero. Numbers use digits with an optional decimal point followed by digits. Do not use eval or Function. Examples: "-(2+3)*4" → -20, "1 +" → null. Keep all earlier behavior.', 'Rozšiř engine o vnořené závorky a unární +/-. Pro neplatný či prázdný vstup, přebytečné tokeny a dělení nulou vrať null. Čísla mají číslice a volitelnou desetinnou tečku následovanou číslicemi. Nepoužívej eval ani Function. Příklady: "-(2+3)*4" → -20, "1 +" → null. Zachovej předchozí chování.'),
    ],
    hints: [text('Split on + and accumulate numeric values.', 'Rozděl vstup podle + a sečti číselné hodnoty.'), text('Separate parsing a sum from parsing a product.', 'Odděl parsování součtu od parsování součinu.'), text('Use recursive descent: expression → term → unary → number or parenthesized expression. Verify every character was consumed.', 'Použij rekurzivní sestup: výraz → člen → unární operace → číslo nebo výraz v závorkách. Ověř spotřebování všech znaků.')],
    tests: [
      [test('calculate("1 + 2")', 3), test('calculate("0")', 0), test('calculate(" 12 + 30 + 5 ")', 47), test('calculate("999 + 1")', 1000),
        {...test('calculate("2+3+4")', 9), label: text('Whitespace is optional: no spaces', 'Mezery jsou volitelné: bez mezer')},
        {...test('calculate("7 +8+ 9")', 24), label: text('Whitespace is optional: mixed spacing', 'Mezery jsou volitelné: různé rozestupy')}],
      [test('calculate("1 + 2 / 9 * 4")', 1.8888888888888888), test('calculate("8 / 2 * 3")', 12), test('calculate("10 - 3 - 2")', 5), test('calculate("1.5 * 2 + 4")', 7)],
      [test('calculate("-(2+3)*4")', -20), test('calculate("2*(3+(4/2))")', 10), test('calculate("1 +")', null), test('calculate("2 / (3-3)")', null), test('calculate("2x3")', null), test('calculate("")', null), test('calculate("1 2")', null), test('calculate("--2")', 2)],
    ],
  },
  'js-evolving-query': {
    starter: 'function query(rows, options = {}) {\n  // Return a new array.\n}\n', focus: ['filter', 'sort', 'map'],
    prompts: [
      text('Implement query(rows, options). rows is an array of records. options.where is an optional object: retain rows whose values strictly equal every specified value. Return a new array without mutating rows; no where means keep all.', 'Napiš query(rows, options). rows je pole záznamů. Volitelný objekt options.where vybírá řádky, jejichž hodnoty se striktně rovnají všem zadaným hodnotám. Vrať nové pole bez změny rows; bez where zachovej vše.'),
      text('Add options.orderBy (a field name), desc (default false), offset (default 0) and limit (default all). Filter first, then stable-sort numeric/string values, then paginate. Offset and limit are non-negative integers; limit 0 returns []. Equal sort values keep input order.', 'Přidej options.orderBy (název pole), desc (výchozí false), offset (výchozí 0) a limit (výchozí vše). Nejprve filtruj, stabilně seřaď čísla/řetězce, pak stránkuj. Offset a limit jsou nezáporná celá čísla; limit 0 vrátí []. Shodné hodnoty zachovají vstupní pořadí.'),
      text('Add options.select (array of field names) and distinct (default false). After pagination, project each row to selected fields; absent fields are omitted. If distinct is true, deduplicate projected records by field values, independent of object key insertion order. Keep the first occurrence and never mutate inputs.', 'Přidej options.select (pole názvů polí) a distinct (výchozí false). Po stránkování promítni řádky na vybraná pole; chybějící pole vynech. S distinct odstraň duplicitní výsledné záznamy podle hodnot, nezávisle na pořadí klíčů objektu. Zachovej první výskyt a neměň vstupy.'),
    ],
    hints: [text('Object.entries(where).every checks a conjunction.', 'Object.entries(where).every ověří všechny podmínky.'), text('Copy before sorting; pagination is slice(offset, offset + limit).', 'Před řazením vytvoř kopii; stránkování je slice(offset, offset + limit).'), text('Create projected objects, then compare sorted key/value entries to form a stable identity. Values are JSON primitives.', 'Vytvoř promítnuté objekty a porovnávej seřazené dvojice klíč/hodnota pro stabilní identitu. Hodnoty jsou primitivy JSON.')],
    tests: [
      [test('query([{x:1},{x:2}],{where:{x:2}})', [{x:2}]), test('query([])', []), test('query([{x:1}],{where:{x:"1"}})', []), test('query([{x:1,y:2},{x:1,y:3}],{where:{x:1,y:2}})', [{x:1,y:2}])],
      [test('query([{x:3},{x:1},{x:2}],{orderBy:"x",offset:1,limit:1})', [{x:2}]), test('query([{x:1}],{limit:0})', []), test('query([{x:"a"},{x:"b"}],{orderBy:"x",desc:true})', [{x:'b'},{x:'a'}]), test('query([{x:1,id:2},{x:1,id:1}],{orderBy:"x"})', [{x:1,id:2},{x:1,id:1}])],
      [test('query([{x:1,y:2},{x:1,y:3}],{select:["x"],distinct:true})', [{x:1}]), test('query([{x:1}],{select:["missing"]})', [{}]), test('query([{x:1,y:2},{y:2,x:1}],{distinct:true})', [{x:1,y:2}]), test('query([{x:1},{x:1},{x:2}],{limit:2,distinct:true})', [{x:1}])],
    ],
  },
  'js-evolving-events': {
    starter: 'function createBus() {\n  return { on(event, listener) {}, emit(event, value) {} };\n}\n', focus: ['closures', 'map-set'],
    prompts: [
      text('Implement createBus() with on(event, listener) and emit(event, value). Deliver synchronously in registration order to listeners for that event only. Unknown events do nothing. Each bus owns independent state; repeated registrations are separate subscriptions.', 'Napiš createBus() s on(event, listener) a emit(event, value). Doručuj synchronně v pořadí registrace pouze posluchačům dané události. Neznámá událost nic nedělá. Každá sběrnice má vlastní stav; opakované registrace jsou samostatná předplatná.'),
      text('Make on return an idempotent unsubscribe function. Add once(event, listener), also returning unsubscribe. A once listener must be removed before invocation so nested emit cannot call it twice.', 'on nově vrací idempotentní odhlašovací funkci. Přidej once(event, listener), také s odhlašovací funkcí. Jednorázového posluchače odeber před voláním, aby ho vnořené emit nespustilo dvakrát.'),
      text('Harden dispatch: snapshot subscriptions at the start of each emit. New subscriptions wait until the next emit; removals during dispatch do not cancel listeners already in that snapshot. Catch each listener exception, continue dispatch, and return the thrown values in order. Successful emit returns []. Nested dispatch takes its own snapshot.', 'Zpevni doručování: na začátku emit vytvoř snímek předplatných. Nová předplatná čekají na další emit; odhlášení během doručování nezruší posluchače ve snímku. Zachyť výjimky jednotlivých posluchačů, pokračuj a vrať vyhozené hodnoty v pořadí. Úspěšné emit vrací []. Vnořené volání má vlastní snímek.'),
    ],
    hints: [text('Keep a Map from event names to ordered subscription arrays.', 'Udržuj Map z názvů událostí na seřazená pole předplatných.'), text('Remove a subscription by identity, not by callback identity.', 'Odebírej podle identity předplatného, ne identity callbacku.'), text('Iterate over a copied list and put try/catch around each callback separately.', 'Procházej kopii seznamu a každý callback obal samostatným try/catch.')],
    tests: [
      [test('(()=>{const b=createBus(),a=[];b.on("x",v=>a.push(v));b.emit("x",2);return a})()', [2]), test('(()=>{const b=createBus(),a=[];b.on("x",()=>a.push(1));b.on("x",()=>a.push(2));b.emit("x");return a})()', [1,2]), test('(()=>{const b=createBus(),a=[];b.on("x",()=>a.push(1));b.emit("y");return a})()', []), test('(()=>{const a=createBus(),b=createBus(),r=[];a.on("x",()=>r.push(1));b.emit("x");return r})()', [])],
      [test('(()=>{const b=createBus(),a=[];const off=b.on("x",()=>a.push(1));off();off();b.emit("x");return a})()', []), test('(()=>{const b=createBus();let n=0;b.once("x",()=>{n++;b.emit("x")});b.emit("x");return n})()', 1), test('(()=>{const b=createBus(),a=[];b.once("x",v=>a.push(v));b.emit("x",1);b.emit("x",2);return a})()', [1]), test('(()=>{const b=createBus();let n=0;const f=()=>n++;b.on("x",f);b.on("x",f)();b.emit("x");return n})()', 1)],
      [test('(()=>{const b=createBus();b.on("x",()=>{throw "a"});b.on("x",()=>{throw "b"});return b.emit("x")})()', ['a','b']), test('createBus().emit("none")', []), test('(()=>{const b=createBus(),a=[];b.on("x",()=>{a.push(1);b.on("x",()=>a.push(3))});b.on("x",()=>a.push(2));b.emit("x");return a})()', [1,2]), test('(()=>{const b=createBus(),a=[];let off;b.on("x",()=>off());off=b.on("x",()=>a.push(2));b.emit("x");b.emit("x");return a})()', [2])],
    ],
  },
  'js-evolving-graph': {
    starter: 'function plan(graph) {\n  // graph maps each task ID to its dependency IDs.\n}\n', focus: ['recursion', 'map-set'],
    prompts: [
      text('Implement plan(graph), returning task IDs in dependency-first order using depth-first traversal. Visit root keys in Object.keys order and dependency arrays left to right. Emit each task once. This stage has acyclic graphs and every dependency is a declared key.', 'Napiš plan(graph): vrať ID úkolů v pořadí závislosti před úkolem pomocí prohledávání do hloubky. Kořeny navštěvuj v pořadí Object.keys a závislosti zleva doprava. Každý úkol vypiš jednou. Grafy jsou acyklické a všechny závislosti jsou deklarované klíče.'),
      text('Preserve the traversal order. Return null when a cycle is present (including self-dependency) or when a dependency is not a declared key. Detect cycles in disconnected components too.', 'Zachovej pořadí průchodu. Při cyklu (i závislosti na sobě) nebo nedeklarované závislosti vrať null. Odhaluj cykly i v nespojených komponentách.'),
      text('Add plan(graph, {layers:true}): return arrays of tasks that can run in parallel. A layer contains all remaining tasks whose dependencies were completed in earlier layers, ordered by Object.keys order. Empty graph returns []. Invalid graphs still return null. Default mode still returns depth-first order.', 'Přidej plan(graph, {layers:true}): vracej pole úkolů, které mohou běžet paralelně. Vrstva obsahuje všechny zbývající úkoly se závislostmi dokončenými v dřívějších vrstvách, v pořadí Object.keys. Prázdný graf vrátí []. Neplatné grafy dál vrací null. Výchozí režim zachovává průchod do hloubky.'),
    ],
    hints: [text('Visit dependencies recursively before pushing the current node.', 'Před přidáním aktuálního uzlu rekurzivně navštiv závislosti.'), text('Distinguish currently visiting from fully visited nodes.', 'Rozlišuj právě navštěvované a dokončené uzly.'), text('Compute a whole ready layer before marking any of its members done.', 'Než označíš členy vrstvy za hotové, vypočti celou připravenou vrstvu.')],
    tests: [
      [test('plan({build:["test"],test:["install"],install:[]})', ['install','test','build']), test('plan({})', []), test('plan({a:[],b:[]})', ['a','b']), test('plan({a:["c"],b:["c"],c:[]})', ['c','a','b'])],
      [test('plan({a:["a"]})', null), test('plan({a:["b"],b:["a"]})', null), test('plan({a:["missing"]})', null), test('plan({ok:[],x:["y"],y:["x"]})', null)],
      [test('plan({build:["test"],test:["install"],install:[]},{layers:true})', [['install'],['test'],['build']]), test('plan({a:[],b:[],c:["a","b"]},{layers:true})', [['a','b'],['c']]), test('plan({},{layers:true})', []), test('plan({a:["a"]},{layers:true})', null)],
    ],
  },
};

export { SPECS, text, test };
export type { Spec };

/** Cumulative prompts and tests make regressions fail when a task evolves. */
export function buildEvolvingTasks(specs: Record<string, Spec>): CodingTask[] {
  return EVOLVING_CHALLENGES.flatMap(challenge => {
    const spec = specs[challenge.id];
    if (!spec) return [];
    return challenge.stages.filter(id => !id.endsWith('-start')).map((id, index): CodingTask => ({
      id, track: challenge.track, topic: challenge.track, level: 25, tier: 2,
      title: text(`${challenge.title.en} · ${index + 1}`, challenge.title.cs ? `${challenge.title.cs} · ${index + 1}` : ''),
      prompt: spec.prompts[index],
      previousRequirements: spec.prompts.slice(0,index),
      references: spec.references?.[index] ?? stageReferences(challenge.id,index),
      starter: spec.starter, focus: spec.focus,
      hints: { en: [spec.hints[index].en], cs: [spec.hints[index].cs] },
      ...(spec.approaches?.[index] ? { approach: { en: spec.approaches[index].map(step => step.en), cs: spec.approaches[index].map(step => step.cs) } } : {}),
      ...(spec.format ? { format: spec.format } : {}),
      ...(spec.pitfalls?.[index] ? { pitfall: spec.pitfalls[index] } : {}),
      verify: 'tests', estimatedMinutes: 15 + index * 15,
      ...(spec.tests ? { tests: spec.tests.slice(0, index + 1).flat() } : {}),
      ...(spec.typeTests ? { typeTests: spec.typeTests.slice(0, index + 1).flat().map(test => ({...test, code: `{ ${test.code} }`})) } : {}),
      ...(spec.suites ? { suite: "import React from 'react';\nimport { render, screen, fireEvent, cleanup } from '@testing-library/react';\nimport App from './App';\nafterEach(cleanup);\n" + spec.suites.slice(0, index + 1).join('\n') } : {}),
    }));
  });
}
