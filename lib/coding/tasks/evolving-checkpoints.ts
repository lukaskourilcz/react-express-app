import type {
  CodingTask,
  CallTest,
  Localized,
  TypeTest,
} from '../../../shared/coding-catalog';
import { EVOLVING_CHALLENGES } from '../../../shared/evolving';
import { text, test } from './evolving';
import { FULLSTACK_APPS, fullstackSeed, fullstackSpec } from './fullstack';

interface Checkpoint {
  prompt: Localized;
  tests?: CallTest[];
  suite?: string;
  typeTests?: TypeTest[];
}
const calls = (...entries: [string, unknown][]) =>
  entries.map(([call, expected]) => test(call, expected));
const step = (en: string, cs: string, tests: CallTest[]): Checkpoint => ({
  prompt: text(en, cs),
  tests,
});
const ui = (en: string, cs: string, body: string): Checkpoint => ({
  prompt: text(en, cs),
  suite: `test(${JSON.stringify(en.split('.')[0])},async()=>{${body}});\n`,
});
const CHECKPOINTS: Record<string, Checkpoint[]> = {
  'js-evolving-calculator': [
    step(
      'Implement calculate(expression) for a single non-negative integer, optionally surrounded by whitespace. Return its numeric value.',
      'Napiš calculate(expression) pro jedno nezáporné celé číslo s volitelnými krajními mezerami. Vrať číselnou hodnotu.',
      calls(
        ['calculate("0")', 0],
        ['calculate("42")', 42],
        ['calculate(" 7 ")', 7],
        ['calculate("1234")', 1234],
      ),
    ),
    step(
      'Add subtraction to calculate, evaluated left to right alongside addition. Operands can now be non-negative decimals.',
      'Do calculate přidej odčítání vyhodnocované zleva spolu se sčítáním. Operandy nyní mohou být nezáporná desetinná čísla.',
      calls(['calculate("10-3-2")', 5], ['calculate("1.5+2.5-1")', 3]),
    ),
    step(
      'Add nested parentheses to calculate, retaining operator precedence. For this step inputs are valid and division is non-zero.',
      'Do calculate přidej vnořené závorky a zachovej prioritu operátorů. V této etapě jsou vstupy platné a dělitel nenulový.',
      calls(['calculate("2*(3+4)")', 14], ['calculate("2*(3+(4/2))")', 10]),
    ),
    step(
      'Add calculateWithVariables(expression, variables). Resolve identifiers [A-Za-z_][A-Za-z0-9_]* from own finite-number properties and evaluate the expression. This step uses valid expressions and defined variables.',
      'Přidej calculateWithVariables(expression, variables). Identifikátory [A-Za-z_][A-Za-z0-9_]* nahraď vlastními konečnými číselnými hodnotami a vyhodnoť výraz. Tato etapa používá platné výrazy a definované proměnné.',
      calls(
        ['calculateWithVariables("a+2",{a:3})', 5],
        ['calculateWithVariables("a*(b+2)",{a:-3,b:4})', -18],
      ),
    ),
    step(
      'Add runProgram(lines), evaluating valid assignments NAME = expression and expressions in order. Return {variables, results}; assignments update the environment and every line adds its value to results. Start with an empty environment.',
      'Přidej runProgram(lines), které postupně vyhodnotí platná přiřazení NAME = výraz a výrazy. Vrať {variables, results}; přiřazení mění prostředí a každý řádek přidá hodnotu do results. Začni prázdným prostředím.',
      calls(
        ['runProgram(["x=2","x+3"])', { variables: { x: 2 }, results: [2, 5] }],
        ['runProgram([])', { variables: {}, results: [] }],
      ),
    ),
  ],
  'js-evolving-query': [
    step(
      'Implement query(rows, options={}) for calls without filters. Return a new array containing the original records in order. Do not mutate the input.',
      'Napiš query(rows, options={}) pro volání bez filtrů. Vrať nové pole původních záznamů ve stejném pořadí. Neměň vstup.',
      calls(
        ['query([])', []],
        ['query([{x:1}])', [{ x: 1 }]],
        ['query([{x:2},{x:1}])', [{ x: 2 }, { x: 1 }]],
        ['(()=>{const rows=[{x:1}];return query(rows)!==rows})()', true],
      ),
    ),
    step(
      'Add options.orderBy and desc (default false). After filtering, stably sort numeric or string field values. Copy before sorting; equal values retain input order.',
      'Přidej options.orderBy a desc (výchozí false). Po filtraci stabilně seřaď číselné či řetězcové hodnoty pole. Před řazením kopíruj; shody zachovají pořadí vstupu.',
      calls(
        ['query([{x:3},{x:1}],{orderBy:"x"})', [{ x: 1 }, { x: 3 }]],
        ['query([{x:1},{x:2}],{orderBy:"x",desc:true})', [{ x: 2 }, { x: 1 }]],
      ),
    ),
    step(
      'Add options.select, an array of field names. After pagination project each row onto these fields; omit absent fields. Never mutate the source records.',
      'Přidej options.select, pole názvů vlastností. Po stránkování promítni každý řádek na tato pole a chybějící vynech. Neměň původní záznamy.',
      calls(
        ['query([{x:1,y:2}],{select:["x"]})', [{ x: 1 }]],
        ['query([{x:1}],{select:["missing"]})', [{}]],
      ),
    ),
    step(
      'Add groupRows(rows, field, valueField). For finite numeric values return {key,count,sum} groups in first-seen order, matching keys by strict equality.',
      'Přidej groupRows(rows, field, valueField). Pro konečné číselné hodnoty vrať skupiny {key,count,sum} v pořadí prvního výskytu, klíče porovnávej striktně.',
      calls(
        [
          'groupRows([{k:"a",v:2},{k:"a",v:3}],"k","v")',
          [{ key: 'a', count: 2, sum: 5 }],
        ],
        ['groupRows([],"k","v")', []],
      ),
    ),
    step(
      'Add joinRows(left, right, leftKey, rightKey) as an inner join. Return {left,right} pairs for every strict-equality key match, in left order then right order. Omit unmatched rows.',
      'Přidej joinRows(left, right, leftKey, rightKey) jako vnitřní spojení. Vrať dvojice {left,right} pro striktně shodné klíče, v pořadí levých a poté pravých řádků. Neshodné vynech.',
      calls(
        [
          'joinRows([{id:1}],[{fk:1}],"id","fk")',
          [{ left: { id: 1 }, right: { fk: 1 } }],
        ],
        ['joinRows([{id:1}],[{fk:"1"}],"id","fk")', []],
      ),
    ),
  ],
  'js-evolving-events': [
    step(
      'Implement createBus() with on(event, listener) and emit(event, value). Deliver a value synchronously to the registered listener for that event. Unknown events do nothing.',
      'Napiš createBus() s on(event, listener) a emit(event, value). Hodnotu synchronně doruč registrovanému posluchači dané události. Neznámá událost nic nedělá.',
      calls(
        [
          '(()=>{const b=createBus(),a=[];b.on("x",v=>a.push(v));b.emit("x",2);return a})()',
          [2],
        ],
        [
          '(()=>{const b=createBus(),a=[];b.on("x",v=>a.push(v));b.emit("y",2);return a})()',
          [],
        ],
        [
          '(()=>{const b=createBus(),a=[];b.on("x",v=>a.push(v));b.emit("x",0);return a})()',
          [0],
        ],
        [
          '(()=>{const b=createBus(),a=[];b.on("x",v=>a.push(v));b.emit("x",1);b.emit("x",2);return a})()',
          [1, 2],
        ],
      ),
    ),
    step(
      'Make on return an idempotent unsubscribe function. Removing one subscription must not remove other registrations, even of the same callback.',
      'on nově vrací idempotentní odhlašovací funkci. Odebrání jednoho odběru nesmí odebrat ostatní registrace ani stejného callbacku.',
      calls([
        '(()=>{const b=createBus(),a=[];const off=b.on("x",()=>a.push(1));off();off();b.emit("x");return a})()',
        [],
      ]),
    ),
    step(
      'Catch listener exceptions during emit, continue delivery and return thrown values in order. Successful emit returns [].',
      'V emit zachyť výjimky posluchačů, pokračuj v doručování a vrať vyhozené hodnoty v pořadí. Úspěšné emit vrací [].',
      calls(
        [
          '(()=>{const b=createBus();b.on("x",()=>{throw "a"});b.on("x",()=>{throw "b"});return b.emit("x")})()',
          ['a', 'b'],
        ],
        ['createBus().emit("none")', []],
      ),
    ),
    step(
      'Add createBufferedBus() with on, once, emit, pause and resume. Pause queues event/value pairs; resume delivers them FIFO through createBus and returns listener errors. This step does not pause inside a listener.',
      'Přidej createBufferedBus() s on, once, emit, pause a resume. Pause řadí události a hodnoty do fronty; resume je doručí FIFO přes createBus a vrátí chyby posluchačů. V této etapě posluchač nepozastavuje doručování.',
      calls([
        '(()=>{const b=createBufferedBus(),a=[];b.on("x",v=>a.push(v));b.pause();b.emit("x",1);const before=a.slice();b.resume();return [before,a]})()',
        [[], [1]],
      ]),
    ),
    step(
      'Add createReplayBus(capacity) with emit and on(event,listener,replay=false). Keep the newest capacity values per event and replay them oldest first to a replay subscription. on returns unsubscribe.',
      'Přidej createReplayBus(capacity) s emit a on(event,listener,replay=false). Uchovej nejnovějších capacity hodnot na událost a přehraj je od nejstarší pro odběr s replay. on vrací odhlášení.',
      calls([
        '(()=>{const b=createReplayBus(2),a=[];[1,2,3].forEach(v=>b.emit("x",v));b.on("x",v=>a.push(v),true);return a})()',
        [2, 3],
      ]),
    ),
  ],
  'js-evolving-graph': [
    step(
      'Implement plan(graph) for independent tasks whose dependency arrays are empty. Return every task ID in Object.keys order, including an empty result for an empty graph.',
      'Napiš plan(graph) pro nezávislé úkoly s prázdnými poli závislostí. Vrať ID úkolů v pořadí Object.keys, pro prázdný graf prázdné pole.',
      calls(
        ['plan({})', []],
        ['plan({a:[]})', ['a']],
        ['plan({b:[],a:[]})', ['b', 'a']],
        ['plan({a:[],b:[],c:[]})', ['a', 'b', 'c']],
      ),
    ),
    step(
      'Validate dependencies before traversal. Return null if a referenced task does not exist as an own key of graph. Otherwise retain dependency-first ordering; this step uses acyclic graphs.',
      'Před průchodem ověř závislosti. Vrať null, pokud odkazovaný úkol není vlastním klíčem graph. Jinak zachovej pořadí závislostí; tato etapa používá acyklické grafy.',
      calls(['plan({a:["missing"]})', null]),
    ),
    step(
      'Add options.layers to plan(graph, options={}). When true, return arrays of tasks that can run together, ordered by graph keys. A task enters the next layer only after all dependencies are in earlier layers.',
      'Přidej options.layers do plan(graph, options={}). Při true vrať pole souběžně spustitelných úkolů v pořadí klíčů grafu. Úkol patří do další vrstvy až po všech závislostech v předchozích vrstvách.',
      calls([
        'plan({a:[],b:[],c:["a","b"]},{layers:true})',
        [['a', 'b'], ['c']],
      ]),
    ),
    step(
      'Add criticalPath(graph,durations) for a valid graph with supplied finite non-negative durations. Return {duration,path} for its longest dependency chain, counting every node on the chain.',
      'Přidej criticalPath(graph,durations) pro platný graf se zadanými konečnými nezápornými délkami. Vrať {duration,path} nejdelšího řetězce závislostí včetně délky každého uzlu.',
      calls([
        'criticalPath({a:[],b:["a"],c:[]},{a:2,b:3,c:4})',
        { duration: 5, path: ['a', 'b'] },
      ]),
    ),
    step(
      'Add impactedNodes(graph,changed) for valid graphs and known changed IDs. Return changed nodes and all transitive dependents once each in plan order; do not include unaffected dependencies.',
      'Přidej impactedNodes(graph,changed) pro platné grafy a známá změněná ID. Vrať změněné uzly a všechny přímé i nepřímé odběratele jednou v pořadí plan; neovlivněné závislosti vynech.',
      calls(['impactedNodes({a:[],b:["a"],c:["b"],d:[]},["b"])', ['b', 'c']]),
    ),
  ],
  'ts-evolving-result': [
    step(
      'Implement generic mapResult<T,U> for successful Result<T> values. Apply fn once and wrap its value as {ok:true,value}. Keep the Result union and precise return types; callbacks do not throw yet.',
      'Napiš generickou mapResult<T,U> pro úspěšné hodnoty Result<T>. Jednou zavolej fn a výsledek obal do {ok:true,value}. Zachovej unii Result a přesné návratové typy; callbacky zatím nevyhazují výjimky.',
      calls(
        ['mapResult({ok:true,value:2},n=>n*3)', { ok: true, value: 6 }],
        ['mapResult({ok:true,value:0},String)', { ok: true, value: '0' }],
        [
          'mapResult({ok:true,value:null},()=>false)',
          { ok: true, value: false },
        ],
        ['mapResult({ok:true,value:"a"},s=>s.length)', { ok: true, value: 1 }],
      ),
    ),
    step(
      'Add flatMapResult<T,U>(result,fn), where fn returns Result<U>. Forward failures unchanged and return callback results without nesting. Callbacks in this step do not throw.',
      'Přidej flatMapResult<T,U>(result,fn), kde fn vrací Result<U>. Chyby předej beze změny a výsledky callbacku neobaluj další vrstvou. V této etapě callbacky nevyhazují výjimky.',
      calls(
        [
          'flatMapResult({ok:true,value:2},n=>({ok:true,value:n+1}))',
          { ok: true, value: 3 },
        ],
        [
          'flatMapResult({ok:false,error:"bad"},()=>{throw "called"})',
          { ok: false, error: 'bad' },
        ],
      ),
    ),
    step(
      'Add collectResults<T>(results:readonly Result<T>[]):Result<T[]>. Collect successful values in order; stop at the first failure. Empty inputs succeed with [].',
      'Přidej collectResults<T>(results:readonly Result<T>[]):Result<T[]>. Sbírej úspěšné hodnoty v pořadí a skonči při první chybě. Prázdný vstup uspěje s [].',
      calls(
        [
          'collectResults([{ok:true,value:1},{ok:true,value:2}])',
          { ok: true, value: [1, 2] },
        ],
        ['collectResults([])', { ok: true, value: [] }],
      ),
    ),
    step(
      'Add partitionResults<T>(results:readonly Result<T>[]), returning {values:T[],errors:string[]}. Preserve relative order within each group. Start with all-success and empty inputs.',
      'Přidej partitionResults<T>(results:readonly Result<T>[]), vracející {values:T[],errors:string[]}. Zachovej pořadí uvnitř skupin. Začni prázdnými a pouze úspěšnými vstupy.',
      calls(
        [
          'partitionResults([{ok:true,value:1},{ok:true,value:2}])',
          { values: [1, 2], errors: [] },
        ],
        ['partitionResults([])', { values: [], errors: [] }],
      ),
    ),
    step(
      'Add recoverResult<T>(result,fn) to recover a failure using fn(error):Result<T>. A success passes through without calling fn. Convert callback throws using the earlier error convention.',
      'Přidej recoverResult<T>(result,fn), které opraví chybu pomocí fn(error):Result<T>. Úspěch předej bez volání fn. Výjimky callbacku převáděj podle dřívějšího pravidla.',
      calls([
        'recoverResult({ok:false,error:"x"},e=>({ok:true,value:e.length}))',
        { ok: true, value: 1 },
      ]),
    ),
  ],
  'ts-evolving-store': [
    step(
      'Implement generic createStore<T>(initial) with get():T and set(value:T):void. Store and replace ordinary numeric or string values in a closure.',
      'Napiš generické createStore<T>(initial) s get():T a set(value:T):void. Běžné číselné či řetězcové hodnoty ukládej a nahrazuj v uzávěru.',
      calls(
        ['createStore(1).get()', 1],
        ['createStore("a").get()', 'a'],
        ['(()=>{const s=createStore(1);s.set(2);return s.get()})()', 2],
        ['(()=>{const s=createStore("a");s.set("b");return s.get()})()', 'b'],
      ),
    ),
    step(
      'Add update(fn:(value:T)=>T):void. Apply fn to the current state and pass its result through set.',
      'Přidej update(fn:(value:T)=>T):void. Zavolej fn s aktuálním stavem a výsledek předej do set.',
      calls([
        '(()=>{const s=createStore(1);s.update(n=>n+2);return s.get()})()',
        3,
      ]),
    ),
    step(
      'Add undo():boolean. Each actual set/update records the prior value; undo restores it and notifies subscribers once. Return false without notifying when history is empty.',
      'Přidej undo():boolean. Každá skutečná změna set/update uloží původní hodnotu; undo ji obnoví a jednou informuje odběratele. Bez historie vrať false bez oznámení.',
      calls([
        '(()=>{const s=createStore(0);s.set(1);return [s.undo(),s.get(),s.undo()]})()',
        [true, 0, false],
      ]),
    ),
    step(
      'Add selectStore<T,U>(store,select:(value:T)=>U) with get():U. Subscribe to the source and keep the selected value current after source changes.',
      'Přidej selectStore<T,U>(store,select:(value:T)=>U) s get():U. Přihlas se ke zdroji a po jeho změnách udržuj vybranou hodnotu aktuální.',
      calls([
        '(()=>{const s=createStore({n:1}),d=selectStore(s,x=>x.n);s.set({n:2});return d.get()})()',
        2,
      ]),
    ),
    step(
      'Add transactStore<T>(store,steps:readonly ((value:T)=>T)[]):boolean. Compute pure steps privately and perform one set with the final value. Return true; this step uses callbacks that do not throw.',
      'Přidej transactStore<T>(store,steps:readonly ((value:T)=>T)[]):boolean. Čisté kroky vypočti soukromě a proveď jedno set s konečným výsledkem. Vrať true; callbacky této etapy nevyhazují výjimky.',
      calls([
        '(()=>{const s=createStore(1);return [transactStore(s,[x=>x+1,x=>x*3]),s.get()]})()',
        [true, 6],
      ]),
    ),
  ],
  'ts-evolving-schema': [
    step(
      'Implement validate(schema,value:unknown):string[] for the string schema. Return [] for strings and ["$: expected string"] otherwise. Keep the supplied Schema union.',
      'Napiš validate(schema,value:unknown):string[] pro schéma string. Pro řetězce vrať [] a jinak ["$: expected string"]. Zachovej dodanou unii Schema.',
      calls(
        ['validate("string","a")', []],
        ['validate("string","")', []],
        ['validate("string",2)', ['$: expected string']],
        ['validate("string",null)', ['$: expected string']],
      ),
    ),
    step(
      'Extend Schema with {object:Record<string,Schema>} and validate flat records. Check declared fields in schema order, allow extras, and use $.FIELD paths. Missing fields are undefined.',
      'Rozšiř Schema o {object:Record<string,Schema>} a validuj ploché záznamy. Deklarovaná pole kontroluj v pořadí schématu, další povol a použij cesty $.POLE. Chybějící pole je undefined.',
      calls([
        'validate({object:{name:"string"}},{name:2})',
        ['$.name: expected string'],
      ]),
    ),
    step(
      'Extend Schema with {array:Schema}. Validate each array element in order using $[INDEX] paths. A non-array returns ["$: expected array"].',
      'Rozšiř Schema o {array:Schema}. Každý prvek pole validuj v pořadí s cestou $[INDEX]. Jiný typ vrací ["$: expected array"].',
      calls(['validate({array:"number"},[1,"x"])', ['$[1]: expected number']]),
    ),
    step(
      'Add validateRecord(schema:Schema,value:unknown):string[] for plain records. Validate every own enumerable value and replace the root path with $.KEY. Preserve key order; an empty record succeeds.',
      'Přidej validateRecord(schema:Schema,value:unknown):string[] pro prosté záznamy. Validuj každou vlastní enumerable hodnotu a kořen cesty nahraď $.KLÍČ. Zachovej pořadí klíčů; prázdný záznam uspěje.',
      calls(
        ['validateRecord("number",{a:"x"})', ['$.a: expected number']],
        ['validateRecord("number",{})', []],
      ),
    ),
    step(
      'Add validateUnion(schemas:readonly Schema[],value:unknown):string[]. Succeed if any branch validates; otherwise return the shortest error list, breaking ties by schema order. Empty schemas returns ["$: no alternatives"].',
      'Přidej validateUnion(schemas:readonly Schema[],value:unknown):string[]. Uspěj při shodě kterékoli větve; jinak vrať nejkratší seznam chyb, při shodě podle pořadí schémat. Prázdná schémata vrací ["$: no alternatives"].',
      calls(
        ['validateUnion(["string","number"],2)', []],
        ['validateUnion([],1)', ['$: no alternatives']],
      ),
    ),
  ],
  'react-evolving-board': [
    ui(
      'Create default-exported App with a controlled input labelled "Task" and an "Add" button. Typing should update the input; start empty.',
      'Vytvoř App s default exportem, řízeným vstupem "Task" a tlačítkem "Add". Psaní mění vstup; začni prázdným.',
      `render(<App/>);const input=screen.getByLabelText('Task');expect(input.value).toBe('');fireEvent.change(input,{target:{value:'Write'}});expect(input.value).toBe('Write');expect(screen.getByRole('button',{name:'Add',exact:true})).toBeTruthy();`,
    ),
    ui(
      'Add filter buttons "All", "Active", "Completed". Derive visible rows without changing the full task list.',
      'Přidej filtry "All", "Active", "Completed". Viditelné řádky odvozuj bez změny úplného seznamu.',
      `render(<App/>);add('A');add('B');fireEvent.click(screen.getByRole('checkbox',{name:'A'}));fireEvent.click(screen.getByRole('button',{name:'Active',exact:true}));expect(screen.queryByRole('checkbox',{name:'A'})).toBeNull();expect(screen.getByRole('checkbox',{name:'B'})).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'All',exact:true}));expect(screen.getAllByRole('checkbox').length).toBe(2);`,
    ),
    ui(
      'Add "Undo" for task mutations. Disable it initially; one undo restores the complete task list before the latest add, delete or toggle.',
      'Přidej "Undo" pro změny úkolů. Zpočátku ho zakaž; jedno vrácení obnoví úplný seznam před posledním přidáním, smazáním či přepnutím.',
      `render(<App/>);expect(screen.getByRole('button',{name:'Undo',exact:true}).disabled).toBe(true);add('A');fireEvent.click(screen.getByRole('button',{name:'Undo',exact:true}));expect(screen.queryByRole('checkbox',{name:'A'})).toBeNull();`,
    ),
    ui(
      'Add "Complete all" to mark every task complete regardless of filter. Disable it when no active tasks exist. Treat the action as one undoable mutation.',
      'Přidej "Complete all" pro dokončení všech úkolů bez ohledu na filtr. Bez aktivních úkolů ho zakaž. Akci ber jako jednu vratnou změnu.',
      `render(<App/>);expect(screen.getByRole('button',{name:'Complete all',exact:true}).disabled).toBe(true);add('A');add('B');fireEvent.click(screen.getByRole('button',{name:'Complete all',exact:true}));expect(screen.getAllByRole('checkbox').every(x=>x.checked)).toBe(true);fireEvent.click(screen.getByRole('button',{name:'Undo',exact:true}));expect(screen.getAllByRole('checkbox').every(x=>!x.checked)).toBe(true);`,
    ),
    ui(
      'Add "Move up TASK_TEXT" buttons. Move a task one position earlier in the full list, preserving its ID and completion. Disable the first task’s button.',
      'Přidej tlačítka "Move up TEXT_ÚKOLU". Posuň úkol o místo výše v úplném seznamu a zachovej ID i dokončení. První úkol má tlačítko zakázané.',
      `render(<App/>);add('A');add('B');expect(screen.getByRole('button',{name:'Move up A',exact:true}).disabled).toBe(true);fireEvent.click(screen.getByRole('button',{name:'Move up B',exact:true}));expect(screen.getAllByRole('checkbox')[0].getAttribute('aria-label')||screen.getAllByRole('checkbox')[0].closest('label').textContent).toBe('B');`,
    ),
  ],
  'react-evolving-catalog': [
    ui(
      'Render products in default-exported App: Apple (id 1, price 2), Banana (id 2, price 1), Carrot (id 3, price 3), Dates (id 4, price 4). Use li elements containing each name and price.',
      'V App s default exportem vykresli produkty: Apple (id 1, cena 2), Banana (id 2, cena 1), Carrot (id 3, cena 3), Dates (id 4, cena 4). Použij li s názvem a cenou.',
      `render(<App/>);const rows=screen.getAllByRole('listitem');expect(rows[0].textContent).toContain('Apple');expect(rows[0].textContent).toContain('2');expect(rows[1].textContent).toContain('Banana');expect(rows[1].textContent).toContain('1');`,
    ),
    ui(
      'Add a select labelled "Sort" with values name, price-asc and price-desc, defaulting to name. Sort a copy of the filtered products.',
      'Přidej select "Sort" s hodnotami name, price-asc a price-desc, výchozí name. Seřaď kopii filtrovaných produktů.',
      `render(<App/>);fireEvent.change(screen.getByLabelText('Sort'),{target:{value:'price-desc'}});expect(screen.getAllByRole('listitem')[0].textContent).toContain('Dates');`,
    ),
    ui(
      'Add a checkbox labelled with each product name. Keep selected IDs independent of pagination and search; output "Selected total" sums prices of all selected products.',
      'Přidej checkbox označený názvem každého produktu. Vybraná ID drž nezávisle na stránkování a hledání; output "Selected total" sčítá ceny všech vybraných produktů.',
      `render(<App/>);fireEvent.click(screen.getByRole('checkbox',{name:'Apple'}));expect(screen.getByLabelText('Selected total').textContent).toBe('2');search('Dates');expect(screen.getByLabelText('Selected total').textContent).toBe('2');`,
    ),
    ui(
      'Add the number input "Maximum price". Empty means no limit; a non-negative number retains products priced at or below it. Reset pagination when it changes.',
      'Přidej číselný vstup "Maximum price". Prázdný je bez limitu; nezáporné číslo ponechá produkty nejvýše této ceny. Při změně resetuj stránkování.',
      `render(<App/>);fireEvent.change(screen.getByLabelText('Maximum price'),{target:{value:'1'}});expect(screen.getAllByRole('listitem').length).toBe(1);expect(screen.getByRole('listitem').textContent).toContain('Banana');`,
    ),
    ui(
      'For selected products show "Quantity NAME" inputs, including products hidden by search. Default quantity is 1. Accept integers 1–99 and calculate Selected total as price times quantity.',
      'Pro vybrané produkty zobraz vstupy "Quantity NÁZEV" i mimo výsledky hledání. Výchozí množství je 1. Přijmi celá čísla 1–99 a Selected total počítej jako cena krát množství.',
      `render(<App/>);fireEvent.click(screen.getByRole('checkbox',{name:'Apple'}));expect(screen.getByLabelText('Quantity Apple').value).toBe('1');fireEvent.change(screen.getByLabelText('Quantity Apple'),{target:{value:'3'}});expect(screen.getByLabelText('Selected total').textContent).toBe('6');`,
    ),
  ],
  'react-evolving-form': [
    ui(
      'Create default-exported App with a form, controlled "Email" input and "Next" button. Start with an empty email; typing updates the value. Prevent browser navigation on submit.',
      'Vytvoř App s default exportem, formulářem, řízeným vstupem "Email" a tlačítkem "Next". Začni prázdným e-mailem; psaní mění hodnotu. Při odeslání zabraň navigaci prohlížeče.',
      `render(<App/>);const input=screen.getByLabelText('Email');expect(input.value).toBe('');fireEvent.change(input,{target:{value:'a@b.cz'}});expect(input.value).toBe('a@b.cz');expect(screen.getByRole('button',{name:'Next',exact:true})).toBeTruthy();`,
    ),
    ui(
      'After email acceptance show a second step with a controlled "Name" input and "Back" / "Next" buttons. Keep "Email accepted" visible and preserve email when going Back.',
      'Po přijetí e-mailu ukaž druhý krok s řízeným vstupem "Name" a tlačítky "Back" / "Next". Zachovej "Email accepted" a při návratu Back hodnotu e-mailu.',
      `render(<App/>);fill('Email','a@b.cz');next();expect(screen.getByLabelText('Name')).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'Back',exact:true}));expect(screen.getByLabelText('Email').value).toBe('a@b.cz');`,
    ),
    ui(
      'On the summary add an "I agree" checkbox and "Submit" button. Disable Submit until consent is checked; going Back clears consent.',
      'Do souhrnu přidej checkbox "I agree" a "Submit". Submit zakaž bez souhlasu; návrat Back souhlas zruší.',
      `render(<App/>);fill('Email','a@b.cz');next();fill('Name','Ada');next();expect(screen.getByRole('button',{name:'Submit',exact:true}).disabled).toBe(true);fireEvent.click(screen.getByLabelText('I agree'));expect(screen.getByRole('button',{name:'Submit',exact:true}).disabled).toBe(false);`,
    ),
    ui(
      'On the name step add "Account type" select with personal (default) and business values. Show a controlled "Company" input only for business; retain its value when switching types.',
      'V kroku jména přidej select "Account type" s personal (výchozí) a business. Jen pro business zobraz řízený vstup "Company" a při přepínání zachovej jeho hodnotu.',
      `render(<App/>);fill('Email','a@b.cz');next();expect(screen.getByLabelText('Account type').value).toBe('personal');fireEvent.change(screen.getByLabelText('Account type'),{target:{value:'business'}});fill('Company','Sharks');fireEvent.change(screen.getByLabelText('Account type'),{target:{value:'personal'}});expect(screen.queryByLabelText('Company')).toBeNull();fireEvent.change(screen.getByLabelText('Account type'),{target:{value:'business'}});expect(screen.getByLabelText('Company').value).toBe('Sharks');`,
    ),
    ui(
      'Add "Save draft" before submission. Save JSON {version:1,email,name,account,company} to localStorage key evolving-form-draft. Do not persist consent.',
      'Před odesláním přidej "Save draft". Ulož JSON {version:1,email,name,account,company} do localStorage pod evolving-form-draft. Souhlas neukládej.',
      `localStorage.clear();render(<App/>);fill('Email','saved@b.cz');fireEvent.click(screen.getByRole('button',{name:'Save draft',exact:true}));const draft=JSON.parse(localStorage.getItem('evolving-form-draft'));expect(draft.version).toBe(1);expect(draft.email).toBe('saved@b.cz');expect(Object.prototype.hasOwnProperty.call(draft,'consent')).toBe(false);`,
    ),
  ],
};

const REACT_HEADER =
  "import React from 'react';\nimport { render, screen, fireEvent, cleanup } from '@testing-library/react';\nimport App from './App';\nafterEach(cleanup);\n";

function fullstackCheckpoints(slug: string): Record<string, Checkpoint> {
  const app = FULLSTACK_APPS.find((app) => app.slug === slug)!;
  const { amount, endpoint } = app;
  return {
    '2': {
      ...step(
        `Port normalizeInput to TypeScript: input unknown, return Draft|null, where Draft={name:string;${amount}:number}. Keep all earlier validation. Define Item=Draft & {id:number;version:number}.`,
        `Převeď normalizeInput do TypeScriptu: vstup unknown, návrat Draft|null, kde Draft={name:string;${amount}:number}. Zachovej předchozí validaci. Definuj Item=Draft & {id:number;version:number}.`,
        [],
      ),
      typeTests: [
        { code: '{const d:Draft|null=normalizeInput({});}' },
        { code: '{const bad:string=normalizeInput({});}', rejects: true },
      ],
    },
    '5': ui(
      `Keep and export your API functions. Add default App({fetcher}), importing createLocalFetch from './localFetch'. Use the provided fetcher or one stable createLocalFetch(createApi(SEED)) per mount, with SEED=${JSON.stringify(fullstackSeed(app))}. Fetch GET ${endpoint} and render each name in an li and ${amount} in output labelled '${amount} NAME'. Start with successful responses.`,
      `Zachovej a exportuj funkce API. Přidej default App({fetcher}) a import createLocalFetch z './localFetch'. Použij předaný fetcher nebo jeden stabilní createLocalFetch(createApi(SEED)) při mount, kde SEED=${JSON.stringify(fullstackSeed(app))}. Načti GET ${endpoint} a vykresli názvy v li a ${amount} v output označeném '${amount} NÁZEV'. Začni úspěšnými odpověďmi.`,
      `const calls=[];const local=createLocalFetch(createApi(seed));render(<App fetcher={(url,opt)=>{calls.push(url);return local(url,opt)}}/>);await waitFor(()=>expect(screen.getByLabelText('${amount} ${app.first}').textContent).toBe('2'));expect(calls[0]).toBe(endpoint);`,
    ),
    '6': ui(
      `Add a form with controlled 'Name' and '${amount}' inputs and a 'Create' button. Wire input changes and prevent navigation on submit; sending POST is the next step.`,
      `Přidej formulář s řízenými vstupy 'Name' a '${amount}' a tlačítkem 'Create'. Zapoj změny vstupů a zabraň navigaci při odeslání; POST přijde v další etapě.`,
      `render(<App/>);await settle();fireEvent.change(screen.getByLabelText('Name'),{target:{value:'New'}});fireEvent.change(screen.getByLabelText('${amount}',{exact:true}),{target:{value:'3'}});expect(screen.getByLabelText('Name').value).toBe('New');expect(screen.getByLabelText('${amount}',{exact:true}).value).toBe('3');expect(screen.getByRole('button',{name:'Create',exact:true})).toBeTruthy();`,
    ),
    '8': ui(
      `Add client-side 'Search' and 'Available only' filters. Search uses trimmed case-insensitive name substrings; available means ${amount}>0. Combine filters without changing API records.`,
      `Přidej klientské filtry 'Search' a 'Available only'. Hledej oříznutý podřetězec názvu bez rozlišení velikosti; dostupnost znamená ${amount}>0. Filtry kombinuj bez změny záznamů API.`,
      `const api=createApi(seed);render(<App fetcher={createLocalFetch(api)}/>);await settle();fireEvent.change(screen.getByLabelText('Search'),{target:{value:' ${app.first.toUpperCase()} '}});expect(screen.getAllByRole('listitem').length).toBe(1);expect(screen.getByRole('listitem').textContent).toContain('${app.first}');expect(api({method:'GET',path:endpoint}).body.length).toBe(3);`,
    ),
  };
}

/** Insert smaller prerequisites without changing existing milestone IDs.
 * Test deltas accumulate in stage order, so every subsequent run checks earlier work. */
/**
 * Splits each cumulative project into checkpoints and milestones.
 *
 * Within a stage the tests it introduces come first and the earlier stages'
 * tests follow, so the top of the results panel always shows what the new
 * brief asks for; every earlier check is still there, further down, and still
 * has to pass. Projects this module has no checkpoints for (a standalone
 * course, for instance) pass through untouched.
 */
export function expandEvolvingTasks(tasks: CodingTask[]): CodingTask[] {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const owned = EVOLVING_CHALLENGES.filter(
    (project) => project.category === 'fullstack' || project.id in CHECKPOINTS,
  );
  const out = tasks.filter(
    (task) => !owned.some((project) => project.stages.includes(task.id)),
  );
  for (const project of owned) {
    const milestones = project.stages.filter((id) => !id.endsWith('-start'));
    const fullstack =
      project.category === 'fullstack'
        ? fullstackCheckpoints(project.id.slice(10))
        : null;
    let previousBase: CodingTask | undefined;
    let previous: CodingTask | undefined;
    const prompts: Localized[] = [];
    for (const [index, id] of milestones.entries()) {
      const base = byId.get(id)!;
      const checkpoint = fullstack
        ? fullstack[String(index + 1)]
        : CHECKPOINTS[project.id]?.[index];
      if (checkpoint) {
        const firstReact = base.suite && !previous?.suite;
        const header = firstReact
          ? fullstack
            ? fullstackSpec(
                FULLSTACK_APPS.find(
                  (app) => project.id === `fullstack-${app.slug}`,
                )!,
              ).prelude
            : REACT_HEADER
          : previous?.suite;
        const task: CodingTask = {
          ...base,
          id: `${id}-start`,
          prompt: checkpoint.prompt,
          previousRequirements: [...prompts],
          estimatedMinutes: 5,
          title: text(
            `${project.title.en} · ${prompts.length + 1}`,
            `${project.title.cs} · ${prompts.length + 1}`,
          ),
          ...(base.tests
            ? {
                tests: [
                  ...(checkpoint.tests ?? []),
                  ...(previous?.tests ?? []),
                ],
              }
            : {}),
          ...(base.track === 'typescript'
            ? {
                typeTests:
                  checkpoint.typeTests ??
                  (index === 0 ? base.typeTests : previous?.typeTests) ??
                  [],
              }
            : {}),
          ...(base.suite
            ? { suite: (header ?? REACT_HEADER) + (checkpoint.suite ?? '') }
            : {}),
        };
        out.push(task);
        previous = task;
        prompts.push(task.prompt);
      }
      const built: CodingTask = {
        ...base,
        previousRequirements: [...prompts],
        estimatedMinutes: 10,
        title: text(
          `${project.title.en} · ${prompts.length + 1}`,
          `${project.title.cs} · ${prompts.length + 1}`,
        ),
        ...(base.tests
          ? {
              tests: [
                ...base.tests.slice(previousBase?.tests?.length ?? 0),
                ...(previous?.tests ?? []),
              ],
            }
          : {}),
        ...(base.suite
          ? {
              suite:
                (previous?.suite ?? '') +
                base.suite.slice(
                  previousBase?.suite?.length ??
                    (checkpoint
                      ? fullstack
                        ? fullstackSpec(
                            FULLSTACK_APPS.find(
                              (app) => project.id === `fullstack-${app.slug}`,
                            )!,
                          ).prelude.length
                        : REACT_HEADER.length
                      : 0),
                ),
            }
          : {}),
      };
      out.push(built);
      previous = built;
      previousBase = base;
      prompts.push(base.prompt);
    }
  }
  return out;
}
