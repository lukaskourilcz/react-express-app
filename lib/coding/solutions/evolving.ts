import type { CodingSolution } from '../types';
import { ADVANCED_JUNIOR, ADVANCED_SENIOR, ADVANCED_SOLUTIONS } from './evolving-advanced';

// Per-stage reference implementations stay on the server. Later capabilities
// are added when generating the later stage, not revealed by earlier stages.
const solutions: Record<string, (stage: number) => string> = {
  'js-evolving-calculator': stage => stage === 1
    ? 'function calculate(s) { return s.split("+").reduce((sum,n)=>sum+Number(n),0); }'
    : `function calculate(s) {
      let i=0;
      const space=()=>{while(/\\s/.test(s[i]||'') && i<s.length)i++};
      function atom(){ space(); ${stage === 3 ? `if(s[i]==='+'||s[i]==='-'){const op=s[i++];const n=atom();return op==='-'?-n:n}
        if(s[i]==='('){i++;const n=sum();space();if(s[i++]!==')')throw 0;return n}` : ''}
        const m=s.slice(i).match(/^\\d+(?:\\.\\d+)?/);if(!m)throw 0;i+=m[0].length;return Number(m[0]);
      }
      function product(){let n=atom();space();while(s[i]==='*'||s[i]==='/'){const op=s[i++],v=atom();if(op==='/'&&v===0)throw 0;n=op==='*'?n*v:n/v;space()}return n}
      function sum(){let n=product();space();while(s[i]==='+'||s[i]==='-'){const op=s[i++],v=product();n=op==='+'?n+v:n-v;space()}return n}
      try{const n=sum();space();return i===s.length&&Number.isFinite(n)?n:null}catch{return null}
    }`,
  'js-evolving-query': stage => `function query(rows, options={}) {
    let out=rows.filter(row=>Object.entries(options.where||{}).every(([k,v])=>row[k]===v));
    ${stage >= 2 ? `if(options.orderBy)out.sort((a,b)=>{const x=a[options.orderBy],y=b[options.orderBy];return (x<y?-1:x>y?1:0)*(options.desc?-1:1)});
    const offset=options.offset??0;out=out.slice(offset,options.limit===undefined?undefined:offset+options.limit);` : ''}
    ${stage === 3 ? `if(options.select)out=out.map(row=>Object.fromEntries(options.select.filter(k=>Object.hasOwn(row,k)).map(k=>[k,row[k]])));
    if(options.distinct){const seen=new Set();out=out.filter(row=>{const key=JSON.stringify(Object.keys(row).sort().map(k=>[k,row[k]]));if(seen.has(key))return false;seen.add(key);return true})}` : ''}
    return out;
  }`,
  'js-evolving-events': stage => `function createBus(){
    const events=new Map();
    function add(event,fn,once=false){const sub={fn,once,fired:false};const list=events.get(event)||[];list.push(sub);events.set(event,list);return ()=>{const i=list.indexOf(sub);if(i>=0)list.splice(i,1)}}
    return {on:(e,f)=>add(e,f),${stage >= 2 ? 'once:(e,f)=>add(e,f,true),' : ''}
      emit(event,value){const errors=[];for(const sub of [...(events.get(event)||[])]){
        ${stage >= 2 ? `if(sub.once){if(sub.fired)continue;sub.fired=true;const list=events.get(event);const i=list.indexOf(sub);if(i>=0)list.splice(i,1)}` : ''}
        ${stage === 3 ? 'try{sub.fn(value)}catch(error){errors.push(error)}' : 'sub.fn(value);'}
      }${stage === 3 ? 'return errors;' : ''}}
    };
  }`,
  'js-evolving-graph': stage => `function plan(graph,options={}){
    const done=new Set(),visiting=new Set(),out=[];
    function visit(id){if(done.has(id))return;${stage >= 2 ? 'if(!Object.hasOwn(graph,id)||visiting.has(id))throw 0;' : ''}visiting.add(id);for(const dep of graph[id])visit(dep);visiting.delete(id);done.add(id);out.push(id)}
    try{for(const id of Object.keys(graph))visit(id)}catch{return null}
    ${stage === 3 ? `if(options.layers){const layers=[];done.clear();while(done.size<out.length){const ready=Object.keys(graph).filter(id=>!done.has(id)&&graph[id].every(dep=>done.has(dep)));layers.push(ready);ready.forEach(id=>done.add(id))}return layers}` : ''}
    return out;
  }`,
  'ts-evolving-result': stage => `type Result<T>={ok:true;value:T}|{ok:false;error:string};
    function mapResult<T,U>(r:Result<T>,fn:(v:T)=>U):Result<U>{if(!r.ok)return r;${stage >= 2 ? 'try{' : ''}return {ok:true,value:fn(r.value)};${stage >= 2 ? '}catch(e){return {ok:false,error:e instanceof Error?e.message:String(e)}}' : ''}}
    ${stage >= 2 ? 'function flatMapResult<T,U>(r:Result<T>,fn:(v:T)=>Result<U>):Result<U>{if(!r.ok)return r;try{return fn(r.value)}catch(e){return {ok:false,error:e instanceof Error?e.message:String(e)}}}' : ''}
    ${stage === 3 ? `function collectResults<T>(rs:readonly Result<T>[]):Result<T[]>{const values:T[]=[];for(const r of rs){if(!r.ok)return r;values.push(r.value)}return {ok:true,value:values}}
    function traverseResults<T,U>(values:readonly T[],fn:(v:T)=>Result<U>):Result<U[]>{const out:U[]=[];for(const value of values){const r=flatMapResult({ok:true,value},fn);if(!r.ok)return r;out.push(r.value)}return {ok:true,value:out}}` : ''}`,
  'ts-evolving-store': stage => `function createStore<T>(initial:T){let value=initial;
    ${stage >= 2 ? 'const listeners=new Set<(v:T)=>void>();const notify=()=>{for(const fn of [...listeners])fn(value)};' : ''}
    ${stage === 3 ? 'const past:T[]=[],future:T[]=[];' : ''}
    const set=(next:T):void=>{if(Object.is(value,next))return;${stage === 3 ? 'past.push(value);future.length=0;' : ''}value=next;${stage >= 2 ? 'notify();' : ''}};
    return {get:():T=>value,set,
    ${stage >= 2 ? 'update:(fn:(v:T)=>T):void=>set(fn(value)),subscribe:(fn:(v:T)=>void):(()=>void)=>{const sub=(v:T)=>fn(v);listeners.add(sub);return ()=>{listeners.delete(sub)}},' : ''}
    ${stage === 3 ? 'undo:():boolean=>{if(!past.length)return false;future.push(value);value=past.pop()!;notify();return true},redo:():boolean=>{if(!future.length)return false;past.push(value);value=future.pop()!;notify();return true},' : ''}
    };
  }`,
  'ts-evolving-schema': stage => `type Schema='string'|'number'|'boolean'${stage >= 2 ? '|{object:Record<string,Schema>}' : ''}${stage === 3 ? '|{array:Schema}|{optional:Schema}' : ''};
    function validate(schema:Schema,value:unknown):string[]{
      function check(s:Schema,v:unknown,path:string):string[]{
        if(typeof s==='string')return typeof v===s&&(s!=='number'||Number.isFinite(v))?[]:[path+': expected '+s];
        ${stage === 3 ? `if('optional' in s)return v===undefined?[]:check(s.optional,v,path);
        if('array' in s)return Array.isArray(v)?v.flatMap((item,i)=>check(s.array,item,path+'['+i+']')):[path+': expected array'];` : ''}
        ${stage >= 2 ? `if(v===null||typeof v!=='object'||Array.isArray(v))return [path+': expected object'];
        return Object.keys(s.object).flatMap(k=>check(s.object[k],Object.prototype.hasOwnProperty.call(v,k)?(v as Record<string,unknown>)[k]:undefined,path+'.'+k));` : ''}
        ${stage === 1 ? "return [path+': expected '+s];" : ''}
      }
      return check(schema,value,'$');
    }`,
};

// The junior and senior readings shown side by side after a pass. Each stage
// is a complete module: stages 1–3 are built here, stages 4 and 5 add the
// functions from the advanced file on top of the stage-3 module.
const juniorStages: Record<string, (stage: number) => string> = {
  'js-evolving-calculator': stage => stage === 1 ? `function calculate(expression) {
  const parts = expression.split('+');
  let total = 0;
  for (const part of parts) {
    const trimmed = part.trim();
    const number = Number(trimmed);
    total = total + number;
  }
  return total;
}` : stage === 2 ? `const DIGITS = '0123456789.';

function tokenize(expression) {
  const tokens = [];
  let index = 0;
  while (index < expression.length) {
    const char = expression[index];
    if (char.trim() === '') {
      index = index + 1;
    } else if (DIGITS.includes(char)) {
      let digits = '';
      while (index < expression.length && DIGITS.includes(expression[index])) {
        digits = digits + expression[index];
        index = index + 1;
      }
      tokens.push({ type: 'number', value: Number(digits) });
    } else {
      tokens.push({ type: 'operator', value: char });
      index = index + 1;
    }
  }
  return tokens;
}

function calculate(expression) {
  const tokens = tokenize(expression);
  let position = 0;

  function nextIsOneOf(first, second) {
    if (position >= tokens.length) return false;
    const token = tokens[position];
    return token.type === 'operator' && (token.value === first || token.value === second);
  }

  function parseNumber() {
    const token = tokens[position];
    position = position + 1;
    return token.value;
  }

  function parseProduct() {
    let result = parseNumber();
    while (nextIsOneOf('*', '/')) {
      const operator = tokens[position].value;
      position = position + 1;
      const right = parseNumber();
      if (operator === '*') {
        result = result * right;
      } else {
        result = result / right;
      }
    }
    return result;
  }

  function parseSum() {
    let result = parseProduct();
    while (nextIsOneOf('+', '-')) {
      const operator = tokens[position].value;
      position = position + 1;
      const right = parseProduct();
      if (operator === '+') {
        result = result + right;
      } else {
        result = result - right;
      }
    }
    return result;
  }

  return parseSum();
}` : `const DIGITS = '0123456789';
const SYMBOLS = '+-*/()';

function tokenize(expression) {
  const tokens = [];
  let index = 0;
  while (index < expression.length) {
    const char = expression[index];
    if (char.trim() === '') {
      index = index + 1;
    } else if (DIGITS.includes(char)) {
      let digits = '';
      while (index < expression.length && DIGITS.includes(expression[index])) {
        digits = digits + expression[index];
        index = index + 1;
      }
      if (expression[index] === '.') {
        index = index + 1;
        let fraction = '';
        while (index < expression.length && DIGITS.includes(expression[index])) {
          fraction = fraction + expression[index];
          index = index + 1;
        }
        if (fraction === '') return null;
        digits = digits + '.' + fraction;
      }
      tokens.push({ type: 'number', value: Number(digits) });
    } else if (SYMBOLS.includes(char)) {
      tokens.push({ type: 'symbol', value: char });
      index = index + 1;
    } else {
      return null;
    }
  }
  return tokens;
}

function calculate(expression) {
  const tokens = tokenize(expression);
  if (tokens === null || tokens.length === 0) return null;
  let position = 0;

  function currentSymbol() {
    if (position >= tokens.length) return null;
    const token = tokens[position];
    if (token.type !== 'symbol') return null;
    return token.value;
  }

  function parseAtom() {
    if (position >= tokens.length) return null;
    const token = tokens[position];
    if (token.type === 'number') {
      position = position + 1;
      return token.value;
    }
    if (token.value === '(') {
      position = position + 1;
      const inner = parseSum();
      if (inner === null) return null;
      if (currentSymbol() !== ')') return null;
      position = position + 1;
      return inner;
    }
    return null;
  }

  function parseUnary() {
    const symbol = currentSymbol();
    if (symbol === '+' || symbol === '-') {
      position = position + 1;
      const operand = parseUnary();
      if (operand === null) return null;
      if (symbol === '-') return -operand;
      return operand;
    }
    return parseAtom();
  }

  function parseProduct() {
    let result = parseUnary();
    if (result === null) return null;
    while (currentSymbol() === '*' || currentSymbol() === '/') {
      const operator = currentSymbol();
      position = position + 1;
      const right = parseUnary();
      if (right === null) return null;
      if (operator === '*') {
        result = result * right;
      } else {
        if (right === 0) return null;
        result = result / right;
      }
    }
    return result;
  }

  function parseSum() {
    let result = parseProduct();
    if (result === null) return null;
    while (currentSymbol() === '+' || currentSymbol() === '-') {
      const operator = currentSymbol();
      position = position + 1;
      const right = parseProduct();
      if (right === null) return null;
      if (operator === '+') {
        result = result + right;
      } else {
        result = result - right;
      }
    }
    return result;
  }

  const value = parseSum();
  if (value === null) return null;
  if (position !== tokens.length) return null;
  return value;
}`,
  'js-evolving-query': stage => stage === 1 ? `function query(rows, options = {}) {
  const where = options.where === undefined ? {} : options.where;
  const conditions = Object.keys(where);
  const matching = [];
  for (const row of rows) {
    let matches = true;
    for (const field of conditions) {
      if (row[field] !== where[field]) {
        matches = false;
      }
    }
    if (matches) {
      matching.push(row);
    }
  }
  return matching;
}` : `function compareValues(first, second) {
  if (first < second) return -1;
  if (first > second) return 1;
  return 0;
}
${stage === 3 ? `
function rowIdentity(row) {
  const fields = Object.keys(row);
  fields.sort();
  const pairs = [];
  for (const field of fields) {
    pairs.push([field, row[field]]);
  }
  return JSON.stringify(pairs);
}
` : ''}
function query(rows, options = {}) {
  const where = options.where === undefined ? {} : options.where;
  const conditions = Object.keys(where);
  const matching = [];
  for (const row of rows) {
    let matches = true;
    for (const field of conditions) {
      if (row[field] !== where[field]) {
        matches = false;
      }
    }
    if (matches) {
      matching.push(row);
    }
  }

  let ordered = matching;
  if (options.orderBy !== undefined) {
    const field = options.orderBy;
    ordered = matching.slice();
    ordered.sort(function (first, second) {
      const comparison = compareValues(first[field], second[field]);
      if (options.desc === true) {
        return -comparison;
      }
      return comparison;
    });
  }

  const offset = options.offset === undefined ? 0 : options.offset;
  let page;
  if (options.limit === undefined) {
    page = ordered.slice(offset);
  } else {
    page = ordered.slice(offset, offset + options.limit);
  }
${stage === 2 ? `  return page;
}` : `
  let projected = page;
  if (options.select !== undefined) {
    projected = [];
    for (const row of page) {
      const picked = {};
      for (const field of options.select) {
        if (Object.prototype.hasOwnProperty.call(row, field)) {
          picked[field] = row[field];
        }
      }
      projected.push(picked);
    }
  }

  if (options.distinct !== true) {
    return projected;
  }
  const seenIdentities = [];
  const unique = [];
  for (const row of projected) {
    const identity = rowIdentity(row);
    if (!seenIdentities.includes(identity)) {
      seenIdentities.push(identity);
      unique.push(row);
    }
  }
  return unique;
}`}`,
  'js-evolving-events': stage => stage === 1 ? `function createBus() {
  const listenersByEvent = new Map();

  function on(event, listener) {
    let listeners = listenersByEvent.get(event);
    if (listeners === undefined) {
      listeners = [];
      listenersByEvent.set(event, listeners);
    }
    listeners.push(listener);
  }

  function emit(event, value) {
    const listeners = listenersByEvent.get(event);
    if (listeners === undefined) return;
    for (const listener of listeners) {
      listener(value);
    }
  }

  return { on: on, emit: emit };
}` : `function createBus() {
  const subscriptionsByEvent = new Map();
  let nextId = 1;

  function getSubscriptions(event) {
    const existing = subscriptionsByEvent.get(event);
    if (existing !== undefined) return existing;
    const created = [];
    subscriptionsByEvent.set(event, created);
    return created;
  }

  function removeSubscription(event, id) {
    const remaining = [];
    for (const subscription of getSubscriptions(event)) {
      if (subscription.id !== id) {
        remaining.push(subscription);
      }
    }
    subscriptionsByEvent.set(event, remaining);
  }

  function addSubscription(event, listener, once) {
    const id = nextId;
    nextId = nextId + 1;
    const subscription = { id: id, listener: listener, once: once, fired: false };
    getSubscriptions(event).push(subscription);
    return function unsubscribe() {
      removeSubscription(event, id);
    };
  }

  function on(event, listener) {
    return addSubscription(event, listener, false);
  }

  function once(event, listener) {
    return addSubscription(event, listener, true);
  }
${stage === 2 ? `
  function emit(event, value) {
    const subscriptions = subscriptionsByEvent.get(event);
    if (subscriptions === undefined) return;
    for (const subscription of subscriptions) {
      if (subscription.once) {
        if (subscription.fired) continue;
        subscription.fired = true;
        removeSubscription(event, subscription.id);
      }
      subscription.listener(value);
    }
  }` : `
  function emit(event, value) {
    const errors = [];
    const subscriptions = subscriptionsByEvent.get(event);
    if (subscriptions === undefined) return errors;
    const snapshot = subscriptions.slice();
    for (const subscription of snapshot) {
      if (subscription.once) {
        if (subscription.fired) continue;
        subscription.fired = true;
        removeSubscription(event, subscription.id);
      }
      try {
        subscription.listener(value);
      } catch (error) {
        errors.push(error);
      }
    }
    return errors;
  }`}

  return { on: on, once: once, emit: emit };
}`,
  'js-evolving-graph': stage => stage === 1 ? `function plan(graph) {
  const order = [];
  const finished = new Set();

  function visit(id) {
    if (finished.has(id)) return;
    for (const dependency of graph[id]) {
      visit(dependency);
    }
    finished.add(id);
    order.push(id);
  }

  for (const id of Object.keys(graph)) {
    visit(id);
  }
  return order;
}` : `function plan(graph${stage === 3 ? ', options = {}' : ''}) {
  const order = [];
  const finished = new Set();
  const inProgress = new Set();
  let invalid = false;

  function visit(id) {
    if (invalid) return;
    if (finished.has(id)) return;
    if (!Object.prototype.hasOwnProperty.call(graph, id)) {
      invalid = true;
      return;
    }
    if (inProgress.has(id)) {
      invalid = true;
      return;
    }
    inProgress.add(id);
    for (const dependency of graph[id]) {
      visit(dependency);
    }
    inProgress.delete(id);
    finished.add(id);
    order.push(id);
  }

  for (const id of Object.keys(graph)) {
    visit(id);
  }
  if (invalid) return null;
${stage === 2 ? `  return order;
}` : `  if (options.layers !== true) return order;

  const layers = [];
  const completed = new Set();
  const ids = Object.keys(graph);
  while (completed.size < ids.length) {
    const ready = [];
    for (const id of ids) {
      if (completed.has(id)) continue;
      let dependenciesDone = true;
      for (const dependency of graph[id]) {
        if (!completed.has(dependency)) {
          dependenciesDone = false;
        }
      }
      if (dependenciesDone) {
        ready.push(id);
      }
    }
    for (const id of ready) {
      completed.add(id);
    }
    layers.push(ready);
  }
  return layers;
}`}`,
  'ts-evolving-result': stage => stage === 1 ? `type Result<T> = { ok: true; value: T } | { ok: false; error: string };

function mapResult<T, U>(result: Result<T>, fn: (value: T) => U): Result<U> {
  if (result.ok === false) {
    return { ok: false, error: result.error };
  }
  const mapped = fn(result.value);
  return { ok: true, value: mapped };
}` : `type Result<T> = { ok: true; value: T } | { ok: false; error: string };

function describeError(thrown: unknown): string {
  if (thrown instanceof Error) {
    return thrown.message;
  }
  return String(thrown);
}

function mapResult<T, U>(result: Result<T>, fn: (value: T) => U): Result<U> {
  if (result.ok === false) {
    return { ok: false, error: result.error };
  }
  try {
    const mapped = fn(result.value);
    return { ok: true, value: mapped };
  } catch (thrown) {
    return { ok: false, error: describeError(thrown) };
  }
}

function flatMapResult<T, U>(result: Result<T>, fn: (value: T) => Result<U>): Result<U> {
  if (result.ok === false) {
    return { ok: false, error: result.error };
  }
  try {
    const next = fn(result.value);
    return next;
  } catch (thrown) {
    return { ok: false, error: describeError(thrown) };
  }
}${stage === 3 ? `

function collectResults<T>(results: readonly Result<T>[]): Result<T[]> {
  const values: T[] = [];
  for (const result of results) {
    if (result.ok === false) {
      return { ok: false, error: result.error };
    }
    values.push(result.value);
  }
  return { ok: true, value: values };
}

function traverseResults<T, U>(values: readonly T[], fn: (value: T) => Result<U>): Result<U[]> {
  const collected: U[] = [];
  for (const value of values) {
    let result: Result<U>;
    try {
      result = fn(value);
    } catch (thrown) {
      return { ok: false, error: describeError(thrown) };
    }
    if (result.ok === false) {
      return { ok: false, error: result.error };
    }
    collected.push(result.value);
  }
  return { ok: true, value: collected };
}` : ''}`,
  'ts-evolving-store': stage => stage === 1 ? `function createStore<T>(initial: T) {
  let currentValue: T = initial;

  function get(): T {
    return currentValue;
  }

  function set(value: T): void {
    currentValue = value;
  }

  return { get: get, set: set };
}` : `function createStore<T>(initial: T) {
  let currentValue: T = initial;
  const subscriptions: { listener: (value: T) => void }[] = [];${stage === 3 ? `
  const undoStack: T[] = [];
  const redoStack: T[] = [];` : ''}

  function notifyAll(): void {
    const snapshot = subscriptions.slice();
    for (const subscription of snapshot) {
      subscription.listener(currentValue);
    }
  }

  function get(): T {
    return currentValue;
  }

  function set(value: T): void {
    if (Object.is(currentValue, value)) {
      return;
    }${stage === 3 ? `
    undoStack.push(currentValue);
    redoStack.length = 0;` : ''}
    currentValue = value;
    notifyAll();
  }

  function update(fn: (value: T) => T): void {
    const next = fn(currentValue);
    set(next);
  }

  function subscribe(listener: (value: T) => void): () => void {
    const subscription = { listener: listener };
    subscriptions.push(subscription);
    return function unsubscribe(): void {
      const index = subscriptions.indexOf(subscription);
      if (index !== -1) {
        subscriptions.splice(index, 1);
      }
    };
  }
${stage === 2 ? `
  return { get: get, set: set, update: update, subscribe: subscribe };
}` : `
  function undo(): boolean {
    if (undoStack.length === 0) {
      return false;
    }
    const previous = undoStack[undoStack.length - 1];
    undoStack.pop();
    redoStack.push(currentValue);
    currentValue = previous;
    notifyAll();
    return true;
  }

  function redo(): boolean {
    if (redoStack.length === 0) {
      return false;
    }
    const next = redoStack[redoStack.length - 1];
    redoStack.pop();
    undoStack.push(currentValue);
    currentValue = next;
    notifyAll();
    return true;
  }

  return { get: get, set: set, update: update, subscribe: subscribe, undo: undo, redo: redo };
}`}`,
  'ts-evolving-schema': stage => stage === 1 ? `type Schema = 'string' | 'number' | 'boolean';

function validate(schema: Schema, value: unknown): string[] {
  const errors: string[] = [];
  if (schema === 'string') {
    if (typeof value !== 'string') {
      errors.push('$: expected string');
    }
  } else if (schema === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      errors.push('$: expected number');
    }
  } else {
    if (typeof value !== 'boolean') {
      errors.push('$: expected boolean');
    }
  }
  return errors;
}` : `type Schema = 'string' | 'number' | 'boolean' | { object: Record<string, Schema> }${stage === 3 ? ' | { array: Schema } | { optional: Schema }' : ''};

function validate(schema: Schema, value: unknown): string[] {
  function checkValue(current: Schema, candidate: unknown, path: string): string[] {
    const errors: string[] = [];
    if (current === 'string') {
      if (typeof candidate !== 'string') {
        errors.push(path + ': expected string');
      }
    } else if (current === 'number') {
      if (typeof candidate !== 'number' || !Number.isFinite(candidate)) {
        errors.push(path + ': expected number');
      }
    } else if (current === 'boolean') {
      if (typeof candidate !== 'boolean') {
        errors.push(path + ': expected boolean');
      }${stage === 3 ? `
    } else if ('optional' in current) {
      if (candidate !== undefined) {
        const innerErrors = checkValue(current.optional, candidate, path);
        for (const error of innerErrors) {
          errors.push(error);
        }
      }
    } else if ('array' in current) {
      if (!Array.isArray(candidate)) {
        errors.push(path + ': expected array');
        return errors;
      }
      for (let index = 0; index < candidate.length; index++) {
        const itemErrors = checkValue(current.array, candidate[index], path + '[' + index + ']');
        for (const error of itemErrors) {
          errors.push(error);
        }
      }` : ''}
    } else {
      if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) {
        errors.push(path + ': expected object');
        return errors;
      }
      const record = candidate as Record<string, unknown>;
      const fields = current.object;
      for (const key of Object.keys(fields)) {
        let fieldValue: unknown = undefined;
        if (Object.prototype.hasOwnProperty.call(record, key)) {
          fieldValue = record[key];
        }
        const fieldErrors = checkValue(fields[key], fieldValue, path + '.' + key);
        for (const error of fieldErrors) {
          errors.push(error);
        }
      }
    }
    return errors;
  }
  return checkValue(schema, value, '$');
}`,
};

const seniorStages: Record<string, (stage: number) => string> = {
  'js-evolving-calculator': stage => stage === 1 ? `function calculate(expression) {
  const numbers = expression.match(/\\d+/g) ?? [];
  return numbers.reduce((total, digits) => total + Number(digits), 0);
}` : stage === 2 ? `const OPERATORS = new Map([
  ['+', { precedence: 1, apply: (left, right) => left + right }],
  ['-', { precedence: 1, apply: (left, right) => left - right }],
  ['*', { precedence: 2, apply: (left, right) => left * right }],
  ['/', { precedence: 2, apply: (left, right) => left / right }],
]);
const precedenceOf = token => OPERATORS.get(token)?.precedence ?? 0;

function calculate(expression) {
  const tokens = expression.match(/\\d+(?:\\.\\d+)?|[-+*/]/g);
  let index = 0;
  const parse = minPrecedence => {
    let left = Number(tokens[index++]);
    while (precedenceOf(tokens[index]) >= minPrecedence) {
      const operator = tokens[index++];
      // Parsing the right side one level tighter keeps equal operators left-associative.
      const right = parse(precedenceOf(operator) + 1);
      left = OPERATORS.get(operator).apply(left, right);
    }
    return left;
  };
  return parse(1);
}` : `const OPERATORS = new Map([
  ['+', { precedence: 1, apply: (left, right) => left + right }],
  ['-', { precedence: 1, apply: (left, right) => left - right }],
  ['*', { precedence: 2, apply: (left, right) => left * right }],
  ['/', { precedence: 2, apply: (left, right) => left / right }],
]);
const precedenceOf = token => OPERATORS.get(token)?.precedence ?? 0;

function calculate(expression) {
  // The trailing catch-all keeps stray characters as tokens, so the parser rejects them.
  const tokens = [...expression.matchAll(/\\d+(?:\\.\\d+)?|[-+*/()]|\\S/g)].map(([token]) => token);
  let index = 0;
  const fail = () => { throw new SyntaxError('malformed expression'); };
  const operand = () => {
    const token = tokens[index++];
    if (token === '+') return operand();
    if (token === '-') return -operand();
    if (token === '(') {
      const inner = binary(1);
      if (tokens[index++] !== ')') fail();
      return inner;
    }
    if (!/^\\d/.test(token ?? '')) fail();
    return Number(token);
  };
  const binary = minPrecedence => {
    let left = operand();
    while (precedenceOf(tokens[index]) >= minPrecedence) {
      const operator = tokens[index++];
      const right = binary(precedenceOf(operator) + 1);
      if (operator === '/' && right === 0) fail();
      left = OPERATORS.get(operator).apply(left, right);
    }
    return left;
  };
  try {
    const value = binary(1);
    return index === tokens.length && Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}`,
  'js-evolving-query': stage => stage === 1 ? `function query(rows, { where = {} } = {}) {
  const conditions = Object.keys(where);
  return rows.filter(row => conditions.every(field => row[field] === where[field]));
}` : stage === 2 ? `// Booleans coerce to 1 and 0, so the difference is -1, 0 or 1 for numbers and strings alike.
const compare = (first, second) => (first > second) - (first < second);

function query(rows, { where = {}, orderBy, desc = false, offset = 0, limit } = {}) {
  const conditions = Object.keys(where);
  const matching = rows.filter(row => conditions.every(field => row[field] === where[field]));
  const direction = desc ? -1 : 1;
  const ordered = orderBy === undefined
    ? matching
    : [...matching].sort((first, second) => direction * compare(first[orderBy], second[orderBy]));
  // Without a limit the page runs to the end: offset plus length can never cut it short.
  return ordered.slice(offset, offset + (limit ?? ordered.length));
}` : `// Booleans coerce to 1 and 0, so the difference is -1, 0 or 1 for numbers and strings alike.
const compare = (first, second) => (first > second) - (first < second);
// Sorting the entries by key makes {x, y} and {y, x} produce the same identity.
const identity = row => JSON.stringify(Object.entries(row).sort(([first], [second]) => compare(first, second)));
const pick = (row, selected) => Object.fromEntries(Object.entries(row).filter(([field]) => selected.has(field)));

function unique(rows) {
  const seen = new Map();
  for (const row of rows) {
    const key = identity(row);
    if (!seen.has(key)) seen.set(key, row);
  }
  return [...seen.values()];
}

function query(rows, { where = {}, orderBy, desc = false, offset = 0, limit, select, distinct = false } = {}) {
  const conditions = Object.keys(where);
  const matching = rows.filter(row => conditions.every(field => row[field] === where[field]));
  const direction = desc ? -1 : 1;
  const ordered = orderBy === undefined
    ? matching
    : [...matching].sort((first, second) => direction * compare(first[orderBy], second[orderBy]));
  const page = ordered.slice(offset, offset + (limit ?? ordered.length));
  const selected = select ? new Set(select) : null;
  const projected = selected ? page.map(row => pick(row, selected)) : page;
  return distinct ? unique(projected) : projected;
}`,
  'js-evolving-events': stage => stage === 1 ? `function createBus() {
  const channels = new Map();
  return {
    on(event, listener) {
      const subscriptions = channels.get(event) ?? new Set();
      // Each registration gets its own wrapper, so the same function can subscribe twice.
      subscriptions.add({ listener });
      channels.set(event, subscriptions);
    },
    emit(event, value) {
      for (const { listener } of channels.get(event) ?? []) listener(value);
    },
  };
}` : `function createBus() {
  const channels = new Map();
  const on = (event, listener) => {
    const subscriptions = channels.get(event) ?? new Set();
    // Each registration gets its own wrapper, so the same function can subscribe twice.
    const subscription = { listener };
    subscriptions.add(subscription);
    channels.set(event, subscriptions);
    return () => { subscriptions.delete(subscription); };
  };
  const once = (event, listener) => {
    let pending = true;
    const off = on(event, value => {
      if (!pending) return;
      pending = false;
      off();
      listener(value);
    });
    return off;
  };
${stage === 2 ? `  const emit = (event, value) => {
    for (const { listener } of channels.get(event) ?? []) listener(value);
  };` : `  const emit = (event, value) => {
    const errors = [];
    // The copy fixes this round's audience: later subscriptions wait, removals do not cancel.
    for (const { listener } of [...(channels.get(event) ?? [])]) {
      try {
        listener(value);
      } catch (error) {
        errors.push(error);
      }
    }
    return errors;
  };`}
  return { on, once, emit };
}`,
  'js-evolving-graph': stage => stage === 1 ? `function plan(graph) {
  const order = [];
  const seen = new Set();
  const visit = id => {
    if (seen.has(id)) return;
    seen.add(id);
    graph[id].forEach(visit);
    order.push(id);
  };
  Object.keys(graph).forEach(visit);
  return order;
}` : `function plan(graph${stage === 3 ? ', { layers = false } = {}' : ''}) {
  const order = [];
  // 'visiting' marks the current path, so meeting it again means a cycle.
  const state = new Map();
  const visit = id => {
    if (state.get(id) === 'done') return true;
    if (state.get(id) === 'visiting' || !Object.hasOwn(graph, id)) return false;
    state.set(id, 'visiting');
    for (const dependency of graph[id]) {
      if (!visit(dependency)) return false;
    }
    state.set(id, 'done');
    order.push(id);
    return true;
  };
  for (const id of Object.keys(graph)) {
    if (!visit(id)) return null;
  }
${stage === 2 ? `  return order;
}` : `  if (!layers) return order;
  // A task sits one layer past its deepest dependency, and order lists dependencies first.
  const depth = new Map();
  for (const id of order) {
    depth.set(id, Math.max(-1, ...graph[id].map(dependency => depth.get(dependency))) + 1);
  }
  const grouped = [];
  for (const id of Object.keys(graph)) (grouped[depth.get(id)] ??= []).push(id);
  return grouped;
}`}`,
  'ts-evolving-result': stage => stage === 1 ? `type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const success = <T>(value: T): Result<T> => ({ ok: true, value });

function mapResult<T, U>(result: Result<T>, fn: (value: T) => U): Result<U> {
  return result.ok ? success(fn(result.value)) : result;
}` : `type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const success = <T>(value: T): Result<T> => ({ ok: true, value });
const failure = (thrown: unknown): Result<never> =>
  ({ ok: false, error: thrown instanceof Error ? thrown.message : String(thrown) });

// Every callback runs through here, so throw handling lives in one place.
function attempt<T>(run: () => Result<T>): Result<T> {
  try {
    return run();
  } catch (thrown) {
    return failure(thrown);
  }
}

function mapResult<T, U>(result: Result<T>, fn: (value: T) => U): Result<U> {
  if (!result.ok) return result;
  const { value } = result;
  return attempt(() => success(fn(value)));
}

function flatMapResult<T, U>(result: Result<T>, fn: (value: T) => Result<U>): Result<U> {
  if (!result.ok) return result;
  const { value } = result;
  return attempt(() => fn(value));
}${stage === 3 ? `

function traverseResults<T, U>(values: readonly T[], fn: (value: T) => Result<U>): Result<U[]> {
  const collected: U[] = [];
  for (const value of values) {
    const result = attempt(() => fn(value));
    if (!result.ok) return result;
    collected.push(result.value);
  }
  return success(collected);
}

// Collecting is traversing with the identity callback.
const collectResults = <T>(results: readonly Result<T>[]): Result<T[]> =>
  traverseResults(results, result => result);` : ''}`,
  'ts-evolving-store': stage => stage === 1 ? `function createStore<T>(initial: T) {
  let value = initial;
  return {
    get: (): T => value,
    set: (next: T): void => {
      value = next;
    },
  };
}` : `// Subscription bookkeeping is its own concern, kept apart from the state it reports on.
function createListeners<T>() {
  const registry = new Map<number, (value: T) => void>();
  let nextId = 0;
  return {
    add(listener: (value: T) => void): () => void {
      const id = nextId++;
      registry.set(id, listener);
      return () => {
        registry.delete(id);
      };
    },
    emit(value: T): void {
      for (const listener of [...registry.values()]) listener(value);
    },
    clear(): void {
      registry.clear();
    },
  };
}
${stage === 2 ? `
function createStore<T>(initial: T) {
  let value = initial;
  const listeners = createListeners<T>();
  const set = (next: T): void => {
    if (Object.is(value, next)) return;
    value = next;
    listeners.emit(value);
  };
  return {
    get: (): T => value,
    set,
    update: (fn: (value: T) => T): void => set(fn(value)),
    subscribe: listeners.add,
  };
}` : `
function createStore<T>(initial: T) {
  // One timeline plus a cursor: entries after the cursor are the redo history.
  const timeline: T[] = [initial];
  let cursor = 0;
  const listeners = createListeners<T>();
  const current = (): T => timeline[cursor];
  const set = (next: T): void => {
    if (Object.is(current(), next)) return;
    timeline.splice(cursor + 1, timeline.length, next);
    cursor += 1;
    listeners.emit(next);
  };
  const jump = (steps: number): boolean => {
    const target = cursor + steps;
    if (target < 0 || target >= timeline.length) return false;
    cursor = target;
    listeners.emit(current());
    return true;
  };
  return {
    get: current,
    set,
    update: (fn: (value: T) => T): void => set(fn(current())),
    subscribe: listeners.add,
    undo: (): boolean => jump(-1),
    redo: (): boolean => jump(1),
  };
}`}`,
  'ts-evolving-schema': stage => stage === 1 ? `type Schema = 'string' | 'number' | 'boolean';

const PRIMITIVES: Record<Schema, (value: unknown) => boolean> = {
  string: value => typeof value === 'string',
  number: value => Number.isFinite(value),
  boolean: value => typeof value === 'boolean',
};

function validate(schema: Schema, value: unknown): string[] {
  return PRIMITIVES[schema](value) ? [] : [\`$: expected \${schema}\`];
}` : `type Primitive = 'string' | 'number' | 'boolean';
type Schema = Primitive | { object: Record<string, Schema> }${stage === 3 ? ' | { array: Schema } | { optional: Schema }' : ''};

const PRIMITIVES: Record<Primitive, (value: unknown) => boolean> = {
  string: value => typeof value === 'string',
  number: value => Number.isFinite(value),
  boolean: value => typeof value === 'boolean',
};
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function validateAt(schema: Schema, value: unknown, path: string): string[] {
  if (typeof schema === 'string') return PRIMITIVES[schema](value) ? [] : [\`\${path}: expected \${schema}\`];${stage === 3 ? `
  if ('optional' in schema) return value === undefined ? [] : validateAt(schema.optional, value, path);
  if ('array' in schema) {
    if (!Array.isArray(value)) return [\`\${path}: expected array\`];
    return value.flatMap((item, index) => validateAt(schema.array, item, \`\${path}[\${index}]\`));
  }` : ''}
  if (!isRecord(value)) return [\`\${path}: expected object\`];
  // Missing fields validate as undefined, and inherited ones must not count as present.
  return Object.entries(schema.object).flatMap(([key, field]) =>
    validateAt(field, Object.hasOwn(value, key) ? value[key] : undefined, \`\${path}.\${key}\`));
}

function validate(schema: Schema, value: unknown): string[] {
  return validateAt(schema, value, '$');
}`,
};

const cumulative = (stages: Record<string, (stage: number) => string>, additions: Record<string, string[]>): Record<string, (stage: number) => string> =>
  Object.fromEntries(Object.entries(stages).map(([id, build]) => [id, (stage: number) => [build(Math.min(stage, 3)), ...(additions[id] ?? []).slice(0, Math.max(0, stage - 3))].join('\n\n')]));
const juniorBuilders = cumulative(juniorStages, ADVANCED_JUNIOR);
const seniorBuilders = cumulative(seniorStages, ADVANCED_SENIOR);

export const EVOLVING_SOLUTIONS: Record<string, CodingSolution> = Object.fromEntries(
  Object.entries(solutions).flatMap(([id, build]) => [1,2,3,4,5].map(stage => [`${id}-${stage}`, {
    solution: build(Math.min(stage,3)) + '\n' + (ADVANCED_SOLUTIONS[id] ?? []).slice(0,Math.max(0,stage-3)).join('\n'),
    junior: juniorBuilders[id](stage),
    senior: seniorBuilders[id](stage),
  } ])),
);

const hidden: Record<string, [string, unknown][][]> = {
  'js-evolving-calculator': [
    [['calculate("17+23+0+4")',44]],
    [['calculate("20/2/2-1.5")',3.5]],
    [['calculate("(1+2")',null],['calculate("2**3")',null],['calculate("1e2")',null],['calculate("3 / -(-2)")',1.5]],
  ],
  'js-evolving-query': [
    [['(()=>{const a=[{x:1},{x:2}];const out=query(a);out.pop();return a.length})()',2]],
    [['(()=>{const a=[{x:2},{x:1}];query(a,{orderBy:"x"});return a})()',[{x:2},{x:1}]]],
    [['query([{a:null},{a:false},{a:0},{a:null}],{select:["a"],distinct:true})',[{a:null},{a:false},{a:0}]]],
  ],
  'js-evolving-events': [
    [['(()=>{const b=createBus(),a=[];const fn=v=>a.push(v);b.on("e",fn);b.on("e",fn);b.emit("e",0);return a})()',[0,0]]],
    [['(()=>{const b=createBus();let n=0;const off=b.once("x",()=>n++);off();b.emit("x");return n})()',0]],
    [['(()=>{const b=createBus(),a=[];b.once("e",()=>{a.push(1);throw "oops"});b.on("e",()=>a.push(2));return [b.emit("e"),b.emit("e"),a]})()',[['oops'],[],[1,2,2]]]],
  ],
  'js-evolving-graph': [
    [['plan({a:["c","c"],b:["c"],c:[]})',['c','a','b']]],
    [['plan({a:["b"],b:["c"],c:["b"]})',null]],
    [['plan({d:["b","c"],c:["a"],b:["a"],a:[]},{layers:true})',[['a'],['c','b'],['d']]]],
  ],
  'ts-evolving-result': [
    [['mapResult({ok:true,value:false},x=>!x)',{ok:true,value:true}]],
    [['flatMapResult({ok:false,error:"first"},()=>{throw "second"})',{ok:false,error:'first'}]],
    [['collectResults([{ok:true,value:0},{ok:false,error:"a"},{ok:false,error:"b"}])',{ok:false,error:'a'}],['traverseResults([1,2],()=>{throw "stop"})',{ok:false,error:'stop'}]],
  ],
  'ts-evolving-store': [
    [['(()=>{const s=createStore(null);s.set(null);return s.get()})()',null]],
    [['(()=>{const s=createStore(0),a=[];s.subscribe(v=>a.push(v));s.update(v=>v);return a})()',[]]],
    [['(()=>{const s=createStore(0);s.update(x=>x+1);s.update(x=>x+1);s.undo();s.undo();s.redo();s.redo();return [s.get(),s.redo()]})()',[2,false]]],
  ],
  'ts-evolving-schema': [
    [['validate("number",Infinity)',['$: expected number']],['validate("boolean",false)',[]]],
    [['validate({object:{a:"string",b:"number"}},null)',['$: expected object']],['validate({object:{a:"string",b:"number"}},{})',['$.a: expected string','$.b: expected number']]],
    [['validate({array:{optional:"number"}},[undefined,0,null])',['$[2]: expected number']],['validate({array:"string"},{})',['$: expected array']]],
  ],
};
for (const [id, stages] of Object.entries(hidden)) {
  for (let index=0; index<5; index++) EVOLVING_SOLUTIONS[`${id}-${index+1}`].hiddenTests = stages.slice(0,index+1).flat().map(([call,expected])=>({call,expected,edge:true}));
}
