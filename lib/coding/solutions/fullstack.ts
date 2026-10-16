import type { CodingSolution } from '../types';
import { FULLSTACK_APPS, fullstackSeed, type FullStackApp } from '../tasks/fullstack';
import { EVOLVING_CHALLENGES } from '../../../shared/evolving';

function build(app:FullStackApp,stage:number):string {
 const {amount,endpoint,action}=app;
 const plain=`function normalizeInput(value){if(!value||typeof value!=='object'||Array.isArray(value)||typeof value.name!=='string')return null;const name=value.name.trim(),amount=value.${amount};if(!name||name.length>80||!Number.isInteger(amount)||amount<0||amount>1000)return null;return {name,${amount}:amount}}`;
 if(stage===1)return plain;
 // The API types and createApi arrive with stage 3, which asks for them: a
 // stage-2 reference that carried them would already pass stage 3.
 const backend=`type Draft={name:string;${amount}:number};type Item=Draft & {id:number;version:number};${stage>=3?'type RequestData={method:string;path:string;body?:unknown};type Reply={status:number;body:unknown};':''}
 function normalizeInput(value:unknown):Draft|null {if(!value||typeof value!=='object'||Array.isArray(value))return null;const v=value as Record<string,unknown>;if(typeof v.name!=='string'||typeof v.${amount}!=='number')return null;const name=v.name.trim(),amount=v.${amount};if(!name||name.length>80||!Number.isInteger(amount)||amount<0||amount>1000)return null;return {name,${amount}:amount}}
 function updateItem(item:Item,patch:unknown):Item|null {if(!patch||typeof patch!=='object'||Array.isArray(patch))return null;const p=patch as Record<string,unknown>;if(!Number.isInteger(p.version)||p.version!==item.version)return null;const draft=normalizeInput({name:item.name,${amount}:p.${amount}});return draft?{...item,${amount}:draft.${amount},version:item.version+1}:null;}
 ${stage>=3?`function createApi(seed:readonly Item[]):(request:RequestData)=>Reply {let rows:Item[]=seed.map(r=>({...r})),nextId=Math.max(0,...rows.map(r=>r.id))+1;return request=>{
 const notFound=():Reply=>({status:404,body:{error:'not_found'}}),invalid=():Reply=>({status:400,body:{error:'invalid'}});
 if(request.path==='${endpoint}'){
 if(request.method==='GET')return {status:200,body:rows.map(r=>({...r}))};
 if(request.method==='POST'){const draft=normalizeInput(request.body);if(!draft)return invalid();const item={...draft,id:nextId++,version:1};rows.push(item);return {status:201,body:{...item}};}
 return notFound();}
 ${stage>=4?`const suffix=request.path.startsWith('${endpoint}/')?request.path.slice('${endpoint}/'.length):'';if(!/^[1-9][0-9]*$/.test(suffix))return notFound();const id=Number(suffix),index=rows.findIndex(r=>r.id===id);if(index<0)return notFound();
 if(request.method==='DELETE'){rows=rows.filter(r=>r.id!==id);return {status:200,body:{deleted:id}};}
 if(request.method==='PATCH'){const p=request.body;if(!p||typeof p!=='object'||Array.isArray(p)||!Number.isInteger((p as Record<string,unknown>).version)||(p as Record<string,unknown>).version!==rows[index].version)return {status:409,body:{error:'conflict'}};const updated=updateItem(rows[index],p);if(!updated)return invalid();rows[index]=updated;return {status:200,body:{...updated}};}`:''}
 return notFound();};}`:''}
 `;
 if(stage<5)return backend;
 return backend+`
 import React,{useState,useEffect,useRef} from 'react';import {createLocalFetch} from './localFetch';
 export {normalizeInput,updateItem,createApi};
 export default function App({fetcher}){
 const [local]=useState(()=>createLocalFetch(createApi(${JSON.stringify(fullstackSeed(app))}))),fetch=fetcher||local;
 const [rows,setRows]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[busy,setBusy]=useState(false),[name,setName]=useState(''),[amount,setAmount]=useState(''),[query,setQuery]=useState(''),[available,setAvailable]=useState(false),[page,setPage]=useState(0);
 const alive=useRef(true),requestId=useRef(0),mutation=useRef(false);
 async function refresh(clearError=true){const token=++requestId.current;setLoading(true);if(clearError)setError('');try{const response=await fetch('${endpoint}');if(!response.ok)throw Error();const data=await response.json();if(alive.current&&token===requestId.current)setRows(data)}catch{if(alive.current&&token===requestId.current)setError('Request failed')}finally{if(alive.current&&token===requestId.current)setLoading(false)}}
 useEffect(()=>{alive.current=true;void refresh();return ()=>{alive.current=false;requestId.current++}},[fetch]);
 async function write(path,method,body){if(mutation.current)return;mutation.current=true;setBusy(true);setError('');try{const response=await fetch(path,{method,headers:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});if(!alive.current)return;if(response.status===409){setError('Changed elsewhere');await refresh(false);return}if(!response.ok)throw Error();if(method==='POST'){setName('');setAmount('')}await refresh(false)}catch{if(alive.current)setError('Request failed')}finally{mutation.current=false;if(alive.current)setBusy(false)}}
 const filtered=rows.filter(r=>${stage>=8?`r.name.toLowerCase().includes(query.trim().toLowerCase())&&(!available||r.${amount}>0)`:'true'}),pages=Math.ceil(filtered.length/2),current=Math.min(page,Math.max(0,pages-1)),visible=${stage>=8?'filtered.slice(current*2,current*2+2)':'filtered'};
 return <main>{loading&&<p role="status">Loading</p>}{error&&<><p role="alert">{error}</p><button disabled={loading||busy} onClick={()=>refresh()}>Retry</button></>}
 ${stage>=6?`<form onSubmit={e=>{e.preventDefault();const draft=normalizeInput({name,${amount}:amount===''?NaN:Number(amount)});if(!draft){setError('Request failed');return}void write('${endpoint}','POST',draft)}}><label>Name<input value={name} onChange={e=>setName(e.target.value)}/></label><label>${amount}<input type="number" value={amount} onChange={e=>setAmount(e.target.value)}/></label><button disabled={busy||loading}>Create</button></form>`:''}
 ${stage>=8?`<label>Search<input value={query} onChange={e=>{setQuery(e.target.value);setPage(0)}}/></label><label><input type="checkbox" checked={available} onChange={e=>{setAvailable(e.target.checked);setPage(0)}}/>Available only</label>`:''}
 {!loading&&!visible.length&&<p>No items</p>}<ul>{visible.map(item=><li key={item.id}>{item.name}<output aria-label={'${amount} '+item.name}>{item.${amount}}</output>
 ${stage>=7?`<button aria-label={'${action} '+item.name} disabled={busy||loading||item.${amount}===0} onClick={()=>write('${endpoint}/'+item.id,'PATCH',{version:item.version,${amount}:item.${amount}-1})}>${action}</button>`:''}
 ${stage>=8?`<button aria-label={'Delete '+item.name} disabled={busy||loading} onClick={()=>write('${endpoint}/'+item.id,'DELETE')}>Delete</button>`:''}</li>)}</ul>
 ${stage>=8?`<button disabled={current===0} onClick={()=>setPage(current-1)}>Previous</button><output aria-label="Page">{pages?current+1:0} / {pages}</output><button disabled={current+1>=pages} onClick={()=>setPage(current+1)}>Next</button>`:''}
 </main>;
 }
 `;
}

/** A checkpoint's reference (`…-N-start`): the previous stage's module with
 * the one step the checkpoint asks for, and none of stage N's own work, so it
 * never passes stage N. A checkpoint shows no junior or senior board. */
function checkpoint(app:FullStackApp,stage:number):string {
 const {amount,endpoint}=app;
 if(stage===2)return build(app,2).replace(/\n function updateItem.*\n/,`
 // The stage-one checks on unknown input: narrow to a record before reading
 // the two fields. Updating an item is the next step.
`);
 if(stage===5)return build(app,4)+`
 import React,{useState,useEffect} from 'react';import {createLocalFetch} from './localFetch';
 export {normalizeInput,updateItem,createApi};
 // Every response succeeds at this step, so the list is fetched once on mount
 // and drawn. Loading, failures and Retry come with stage five.
 export default function App({fetcher}){
 const [local]=useState(()=>createLocalFetch(createApi(${JSON.stringify(fullstackSeed(app))}))),fetch=fetcher||local;
 const [rows,setRows]=useState([]);
 useEffect(()=>{fetch('${endpoint}').then(response=>response.json()).then(setRows)},[fetch]);
 return <main><ul>{rows.map(item=><li key={item.id}>{item.name}<output aria-label={'${amount} '+item.name}>{item.${amount}}</output></li>)}</ul></main>;
 }
 `;
 if(stage===6)return build(app,5).replace('{!loading&&!visible.length',`{/* The inputs keep their text in state, and submitting only stops the page
 from reloading: sending the POST is stage six. */}
 <form onSubmit={e=>e.preventDefault()}><label>Name<input value={name} onChange={e=>setName(e.target.value)}/></label><label>${amount}<input type="number" value={amount} onChange={e=>setAmount(e.target.value)}/></label><button>Create</button></form>
 {!loading&&!visible.length`);
 return build(app,7)
  .replace('rows.filter(r=>true)',`rows.filter(r=>r.name.toLowerCase().includes(query.trim().toLowerCase())&&(!available||r.${amount}>0))`)
  .replace('{!loading&&!visible.length',`{/* Both filters only decide which rows are drawn; the records stay as the API
 sent them. Pages and Delete are stage eight. */}
 <label>Search<input value={query} onChange={e=>setQuery(e.target.value)}/></label><label><input type="checkbox" checked={available} onChange={e=>setAvailable(e.target.checked)}/>Available only</label>
 {!loading&&!visible.length`);
}

/** Emits `text` only once the app has reached the stage that asks for it. */
const since = (stage: number, threshold: number, text: string): string => (stage >= threshold ? text : '');

/* ── junior: one check per line, one useState per value, explicit handlers ── */

function juniorPlain(app: FullStackApp): string {
  const { amount } = app;
  return `function normalizeInput(value) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'object') {
    return null;
  }
  if (Array.isArray(value)) {
    return null;
  }
  if (typeof value.name !== 'string') {
    return null;
  }
  if (typeof value.${amount} !== 'number') {
    return null;
  }
  const name = value.name.trim();
  const ${amount} = value.${amount};
  if (name.length === 0) {
    return null;
  }
  if (name.length > 80) {
    return null;
  }
  if (!Number.isInteger(${amount})) {
    return null;
  }
  if (${amount} < 0) {
    return null;
  }
  if (${amount} > 1000) {
    return null;
  }
  const result = { name: name, ${amount}: ${amount} };
  return result;
}
`;
}

function juniorBackend(app: FullStackApp, stage: number): string {
  const { amount, endpoint } = app;
  return `type Draft = { name: string; ${amount}: number };
type Item = Draft & { id: number; version: number };
${since(stage, 3, `type RequestData = { method: string; path: string; body?: unknown };
type Reply = { status: number; body: unknown };
`)}
function normalizeInput(value: unknown): Draft | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'object') {
    return null;
  }
  if (Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const rawName = record.name;
  const rawAmount = record.${amount};
  if (typeof rawName !== 'string') {
    return null;
  }
  if (typeof rawAmount !== 'number') {
    return null;
  }
  const name = rawName.trim();
  if (name.length === 0 || name.length > 80) {
    return null;
  }
  if (!Number.isInteger(rawAmount)) {
    return null;
  }
  if (rawAmount < 0 || rawAmount > 1000) {
    return null;
  }
  const draft: Draft = { name: name, ${amount}: rawAmount };
  return draft;
}

function updateItem(item: Item, patch: unknown): Item | null {
  if (patch === null || typeof patch !== 'object' || Array.isArray(patch)) {
    return null;
  }
  const record = patch as Record<string, unknown>;
  const version = record.version;
  if (typeof version !== 'number' || !Number.isInteger(version)) {
    return null;
  }
  if (version !== item.version) {
    return null;
  }
  const draft = normalizeInput({ name: item.name, ${amount}: record.${amount} });
  if (draft === null) {
    return null;
  }
  const updated: Item = {
    id: item.id,
    name: item.name,
    ${amount}: draft.${amount},
    version: item.version + 1,
  };
  return updated;
}
${since(stage, 3, `
function copyItem(item: Item): Item {
  return { id: item.id, name: item.name, ${amount}: item.${amount}, version: item.version };
}

function notFound(): Reply {
  return { status: 404, body: { error: 'not_found' } };
}

function createApi(seed: readonly Item[]): (request: RequestData) => Reply {
  const rows: Item[] = [];
  let highestId = 0;
  for (const row of seed) {
    rows.push(copyItem(row));
    if (row.id > highestId) {
      highestId = row.id;
    }
  }
  return function handle(request: RequestData): Reply {
    if (request.path === '${endpoint}') {
      if (request.method === 'GET') {
        const copies: Item[] = [];
        for (const row of rows) {
          copies.push(copyItem(row));
        }
        return { status: 200, body: copies };
      }
      if (request.method === 'POST') {
        const draft = normalizeInput(request.body);
        if (draft === null) {
          return { status: 400, body: { error: 'invalid' } };
        }
        highestId = highestId + 1;
        const created: Item = { id: highestId, name: draft.name, ${amount}: draft.${amount}, version: 1 };
        rows.push(created);
        return { status: 201, body: copyItem(created) };
      }
      return notFound();
    }
${since(stage, 4, `    const prefix = '${endpoint}/';
    if (!request.path.startsWith(prefix)) {
      return notFound();
    }
    const idText = request.path.slice(prefix.length);
    if (idText.length === 0 || idText[0] === '0') {
      return notFound();
    }
    for (const character of idText) {
      if (character < '0' || character > '9') {
        return notFound();
      }
    }
    const id = Number(idText);
    let index = -1;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].id === id) {
        index = i;
        break;
      }
    }
    if (index === -1) {
      return notFound();
    }
    if (request.method === 'DELETE') {
      rows.splice(index, 1);
      return { status: 200, body: { deleted: id } };
    }
    if (request.method === 'PATCH') {
      const body = request.body;
      if (body === null || typeof body !== 'object' || Array.isArray(body)) {
        return { status: 409, body: { error: 'conflict' } };
      }
      const record = body as Record<string, unknown>;
      const version = record.version;
      if (typeof version !== 'number' || version !== rows[index].version) {
        return { status: 409, body: { error: 'conflict' } };
      }
      const updated = updateItem(rows[index], body);
      if (updated === null) {
        return { status: 400, body: { error: 'invalid' } };
      }
      rows[index] = updated;
      return { status: 200, body: copyItem(updated) };
    }
`)}    return notFound();
  };
}
`)}`;
}

function juniorClient(app: FullStackApp, stage: number, backend: string): string {
  const { amount, endpoint, action } = app;
  const frozen = stage >= 6 ? 'loading || saving' : 'loading';
  const reload = stage >= 7 ? 'loadItems(false)' : 'loadItems()';
  return `import React, { useState, useEffect, useRef } from 'react';
import { createLocalFetch } from './localFetch';

${backend}
export { normalizeInput, updateItem, createApi };

const SEED = ${JSON.stringify(fullstackSeed(app))};

export default function App({ fetcher }) {
  const [localFetch] = useState(() => createLocalFetch(createApi(SEED)));
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
${since(stage, 6, `  const [name, setName] = useState('');
  const [amountText, setAmountText] = useState('');
  const [saving, setSaving] = useState(false);
`)}${since(stage, 8, `  const [search, setSearch] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [page, setPage] = useState(0);
`)}  const mounted = useRef(false);

  let request = fetcher;
  if (!request) {
    request = localFetch;
  }

  async function loadItems(${stage >= 7 ? 'keepError' : ''}) {
    setLoading(true);
${stage >= 7 ? `    if (!keepError) {
      setError('');
    }
` : `    setError('');
`}    let response = null;
    try {
      response = await request('${endpoint}');
    } catch (problem) {
      response = null;
    }
    if (!mounted.current) {
      return;
    }
    if (response === null || !response.ok) {
      setError('Request failed');
      setLoading(false);
      return;
    }
    let data = null;
    try {
      data = await response.json();
    } catch (problem) {
      data = null;
    }
    if (!mounted.current) {
      return;
    }
    if (!Array.isArray(data)) {
      setError('Request failed');
      setLoading(false);
      return;
    }
    setItems(data);
    setLoading(false);
  }

  useEffect(() => {
    mounted.current = true;
    ${reload};
    return () => {
      mounted.current = false;
    };
  }, []);

  function handleRetry() {
    ${reload};
  }
${since(stage, 6, `
  async function sendChange(path, method, body) {
    if (saving) {
      return false;
    }
    setSaving(true);
    setError('');
    const options = { method: method, headers: { 'Content-Type': 'application/json' } };
    if (body !== undefined) {
      options.body = JSON.stringify(body);
    }
    let response = null;
    try {
      response = await request(path, options);
    } catch (problem) {
      response = null;
    }
    if (!mounted.current) {
      return false;
    }
    setSaving(false);
${since(stage, 7, `    if (response !== null && response.status === 409) {
      setError('Changed elsewhere');
      await loadItems(true);
      return false;
    }
`)}    if (response === null || !response.ok) {
      setError('Request failed');
      return false;
    }
    return true;
  }

  function handleNameChange(event) {
    setName(event.target.value);
  }

  function handleAmountChange(event) {
    setAmountText(event.target.value);
  }

  async function handleCreate(event) {
    event.preventDefault();
    let amountValue = NaN;
    if (amountText !== '') {
      amountValue = Number(amountText);
    }
    const draft = normalizeInput({ name: name, ${amount}: amountValue });
    if (draft === null) {
      setError('Request failed');
      return;
    }
    const created = await sendChange('${endpoint}', 'POST', draft);
    if (created) {
      setName('');
      setAmountText('');
      await ${reload};
    }
  }
`)}${since(stage, 7, `
  async function handleAction(item) {
    const patch = { version: item.version, ${amount}: item.${amount} - 1 };
    const changed = await sendChange('${endpoint}/' + item.id, 'PATCH', patch);
    if (changed) {
      await loadItems(false);
    }
  }
`)}${since(stage, 8, `
  async function handleDelete(item) {
    const deleted = await sendChange('${endpoint}/' + item.id, 'DELETE', undefined);
    if (deleted) {
      await loadItems(false);
    }
  }

  function handleSearchChange(event) {
    setSearch(event.target.value);
    setPage(0);
  }

  function handleAvailableChange(event) {
    setAvailableOnly(event.target.checked);
    setPage(0);
  }

  const needle = search.trim().toLowerCase();
  const filtered = [];
  for (const item of items) {
    const nameMatches = item.name.toLowerCase().includes(needle);
    let availableMatches = true;
    if (availableOnly && item.${amount} === 0) {
      availableMatches = false;
    }
    if (nameMatches && availableMatches) {
      filtered.push(item);
    }
  }
  const totalPages = Math.ceil(filtered.length / 2);
  let currentPage = page;
  if (currentPage > totalPages - 1) {
    currentPage = totalPages - 1;
  }
  if (currentPage < 0) {
    currentPage = 0;
  }
  const visible = [];
  for (let index = currentPage * 2; index < currentPage * 2 + 2; index++) {
    if (index < filtered.length) {
      visible.push(filtered[index]);
    }
  }
  let pageLabel = '0 / 0';
  if (totalPages > 0) {
    pageLabel = (currentPage + 1) + ' / ' + totalPages;
  }

  function handlePrevious() {
    setPage(currentPage - 1);
  }

  function handleNext() {
    setPage(currentPage + 1);
  }
`)}${stage < 8 ? `
  const visible = items;
` : ''}
  const listItems = visible.map(function (item) {
    return (
      <li key={item.id}>
        {item.name}
        <output aria-label={'${amount} ' + item.name}>{item.${amount}}</output>
${since(stage, 7, `        <button type="button" aria-label={'${action} ' + item.name} disabled={${frozen} || item.${amount} === 0} onClick={function () { handleAction(item); }}>
          ${action}
        </button>
`)}${since(stage, 8, `        <button type="button" aria-label={'Delete ' + item.name} disabled={${frozen}} onClick={function () { handleDelete(item); }}>
          Delete
        </button>
`)}      </li>
    );
  });

  return (
    <main>
      {loading ? <p role="status">Loading</p> : null}
      {error !== '' ? <p role="alert">{error}</p> : null}
      {error !== '' ? <button type="button" disabled={${frozen}} onClick={handleRetry}>Retry</button> : null}
${since(stage, 6, `      <form onSubmit={handleCreate}>
        <label>
          Name
          <input value={name} onChange={handleNameChange} />
        </label>
        <label>
          ${amount}
          <input type="number" value={amountText} onChange={handleAmountChange} />
        </label>
        <button type="submit" disabled={${frozen}}>Create</button>
      </form>
`)}${since(stage, 8, `      <label>
        Search
        <input value={search} onChange={handleSearchChange} />
      </label>
      <label>
        <input type="checkbox" checked={availableOnly} onChange={handleAvailableChange} />
        Available only
      </label>
`)}      {!loading && visible.length === 0 ? <p>No items</p> : null}
      <ul>{listItems}</ul>
${since(stage, 8, `      <button type="button" disabled={currentPage === 0} onClick={handlePrevious}>Previous</button>
      <output aria-label="Page">{pageLabel}</output>
      <button type="button" disabled={currentPage + 1 >= totalPages} onClick={handleNext}>Next</button>
`)}    </main>
  );
}
`;
}

function buildJunior(app: FullStackApp, stage: number): string {
  if (stage === 1) return juniorPlain(app);
  const backend = juniorBackend(app, stage);
  if (stage < 5) return backend;
  return juniorClient(app, stage, backend);
}

/* ── senior: guard clauses, type predicates, a Map store, a reducer and derived values ── */

function seniorPlain(app: FullStackApp): string {
  const { amount } = app;
  return `const isInputObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const isIntegerBetween = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;

function normalizeInput(value) {
  if (!isInputObject(value)) return null;
  const { name, ${amount} } = value;
  if (typeof name !== 'string' || !isIntegerBetween(${amount}, 0, 1000)) return null;
  // Trim before measuring, so a whitespace-only name counts as empty.
  const trimmed = name.trim();
  return isIntegerBetween(trimmed.length, 1, 80) ? { name: trimmed, ${amount} } : null;
}
`;
}

function seniorBackend(app: FullStackApp, stage: number): string {
  const { amount, endpoint } = app;
  return `type Draft = { name: string; ${amount}: number };
type Item = Draft & { id: number; version: number };
${since(stage, 3, `type RequestData = { method: string; path: string; body?: unknown };
type Reply = { status: number; body: unknown };
`)}
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
// The integer check rejects NaN, floats and non-numbers in one go.
const isAmount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 1000;

function normalizeInput(value: unknown): Draft | null {
  if (!isRecord(value)) return null;
  const { name, ${amount} } = value;
  if (typeof name !== 'string' || !isAmount(${amount})) return null;
  const trimmed = name.trim();
  return trimmed.length >= 1 && trimmed.length <= 80 ? { name: trimmed, ${amount} } : null;
}

function updateItem(item: Item, patch: unknown): Item | null {
  // item.version is always an integer, so a strict match proves the patch version is one too.
  if (!isRecord(patch) || patch.version !== item.version) return null;
  const draft = normalizeInput({ name: item.name, ${amount}: patch.${amount} });
  if (!draft) return null;
  return { ...item, ${amount}: draft.${amount}, version: item.version + 1 };
}
${since(stage, 3, `
const COLLECTION = '${endpoint}';
const reply = (status: number, body: unknown): Reply => ({ status, body });
const notFound = (): Reply => reply(404, { error: 'not_found' });
const invalid = (): Reply => reply(400, { error: 'invalid' });
${since(stage, 4, `// Positive decimal integers only: no leading zeroes, signs or blanks.
const itemId = (path: string): number | null => {
  const tail = path.startsWith(COLLECTION + '/') ? path.slice(COLLECTION.length + 1) : '';
  return /^[1-9][0-9]*$/.test(tail) ? Number(tail) : null;
};
`)}
function createApi(seed: readonly Item[]): (request: RequestData) => Reply {
  // A Map keeps insertion order and makes lookups by id direct; the copies keep the seed untouched.
  const rows = new Map<number, Item>(seed.map((row) => [row.id, { ...row }]));
  let lastId = Math.max(0, ...rows.keys());
  return ({ method, path, body }) => {
    if (path === COLLECTION) {
      if (method === 'GET') return reply(200, [...rows.values()].map((row) => ({ ...row })));
      if (method !== 'POST') return notFound();
      const draft = normalizeInput(body);
      if (!draft) return invalid();
      const created: Item = { ...draft, id: ++lastId, version: 1 };
      rows.set(created.id, created);
      return reply(201, { ...created });
    }
${since(stage, 4, `    const id = itemId(path);
    const current = id === null ? undefined : rows.get(id);
    if (id === null || !current) return notFound();
    if (method === 'DELETE') {
      rows.delete(id);
      return reply(200, { deleted: id });
    }
    if (method !== 'PATCH') return notFound();
    if (!isRecord(body) || body.version !== current.version) return reply(409, { error: 'conflict' });
    const updated = updateItem(current, body);
    if (!updated) return invalid();
    rows.set(id, updated);
    return reply(200, { ...updated });
`)}${stage < 4 ? `    return notFound();
` : ''}  };
}
`)}`;
}

function seniorClient(app: FullStackApp, stage: number, backend: string): string {
  const { amount, endpoint, action } = app;
  const frozen = stage >= 6 ? 'state.loading || state.busy' : 'state.loading';
  return `import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { createLocalFetch } from './localFetch';

${backend}
export { normalizeInput, updateItem, createApi };

const SEED = ${JSON.stringify(fullstackSeed(app))};
${since(stage, 6, `const JSON_HEADERS = { 'Content-Type': 'application/json' };
const EMPTY_FORM = { name: '', ${amount}: '' };
`)}${since(stage, 8, `const PAGE_SIZE = 2;
`)}
// One shape for every outcome the UI branches on: rows${stage >= 7 ? ', a version conflict,' : ''} or a failure.
async function call(http, path, init) {
  try {
    const response = await http(path, init);
${since(stage, 7, `    if (response.status === 409) return { conflict: true };
`)}    if (!response.ok) return { failed: true };
    return { data: await response.json() };
  } catch {
    return { failed: true };
  }
}

const initialState = { items: [], loading: true, ${stage >= 6 ? 'busy: false, ' : ''}error: '' };

function reducer(state, action) {
  switch (action.type) {
    case 'load':
      return { ...state, loading: true, error: ${stage >= 7 ? "action.keepError ? state.error : ''" : "''"} };
    case 'loaded':
      return { ...state, loading: false, items: action.items };
    case 'loadFailed':
      return { ...state, loading: false, error: 'Request failed' };
${since(stage, 6, `    case 'write':
      return { ...state, busy: true, error: '' };
    case 'written':
      return { ...state, busy: false };
    case 'writeFailed':
      return { ...state, busy: false, error: 'Request failed' };
`)}${since(stage, 7, `    case 'conflict':
      return { ...state, busy: false, error: 'Changed elsewhere' };
`)}    default:
      return state;
  }
}

export default function App({ fetcher }) {
  const [fallback] = useState(() => createLocalFetch(createApi(SEED)));
  const http = fetcher ?? fallback;
  const [state, dispatch] = useReducer(reducer, initialState);
${since(stage, 6, `  const [form, setForm] = useState(EMPTY_FORM);
`)}${since(stage, 8, `  const [view, setView] = useState({ query: '', availableOnly: false, page: 0 });
`)}  const alive = useRef(true);
${since(stage, 6, `  const inFlight = useRef(false);
`)}
  const load = useCallback(async (${stage >= 7 ? 'keepError = false' : ''}) => {
    dispatch({ type: 'load'${stage >= 7 ? ', keepError' : ''} });
    const result = await call(http, '${endpoint}');
    if (!alive.current) return;
    dispatch('data' in result ? { type: 'loaded', items: result.data } : { type: 'loadFailed' });
  }, [http]);

  useEffect(() => {
    alive.current = true;
    void load();
    return () => {
      alive.current = false;
    };
  }, [load]);
${since(stage, 6, `
  // Resolves true only once the server accepted the write and the list was reloaded.
  const write = async (path, method, body) => {
    if (inFlight.current) return false;
    inFlight.current = true;
    dispatch({ type: 'write' });
    const result = await call(http, path, { method, headers: JSON_HEADERS, body: body && JSON.stringify(body) });
    inFlight.current = false;
    if (!alive.current) return false;
${since(stage, 7, `    if (result.conflict) {
      dispatch({ type: 'conflict' });
      await load(true);
      return false;
    }
`)}    if (result.failed) {
      dispatch({ type: 'writeFailed' });
      return false;
    }
    dispatch({ type: 'written' });
    await load();
    return true;
  };

  const draft = normalizeInput({ ...form, ${amount}: form.${amount} === '' ? NaN : Number(form.${amount}) });
  const edit = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    if (draft && (await write('${endpoint}', 'POST', draft))) setForm(EMPTY_FORM);
  };
`)}${since(stage, 7, `  const decrement = (item) => write('${endpoint}/' + item.id, 'PATCH', { version: item.version, ${amount}: item.${amount} - 1 });
`)}${since(stage, 8, `  const remove = (item) => write('${endpoint}/' + item.id, 'DELETE');

  const filter = (patch) => setView((current) => ({ ...current, ...patch, page: 0 }));
  const needle = view.query.trim().toLowerCase();
  const matches = state.items.filter((item) => item.name.toLowerCase().includes(needle) && (!view.availableOnly || item.${amount} > 0));
  const pageCount = Math.ceil(matches.length / PAGE_SIZE);
  // Clamp rather than reset, so a deletion on the last page lands on the new last page.
  const page = Math.min(view.page, Math.max(pageCount - 1, 0));
  const visible = matches.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const turn = (delta) => setView((current) => ({ ...current, page: page + delta }));
`)}${stage < 8 ? `
  const visible = state.items;
` : ''}
  const frozen = ${frozen};

  return (
    <main>
      {state.loading && <p role="status">Loading</p>}
      {state.error && (
        <>
          <p role="alert">{state.error}</p>
          <button type="button" disabled={frozen} onClick={() => load()}>Retry</button>
        </>
      )}
${since(stage, 6, `      <form onSubmit={submit}>
        <label>Name<input value={form.name} onChange={edit('name')} /></label>
        <label>${amount}<input type="number" value={form.${amount}} onChange={edit('${amount}')} /></label>
        <button type="submit" disabled={!draft || frozen}>Create</button>
      </form>
`)}${since(stage, 8, `      <label>Search<input value={view.query} onChange={(event) => filter({ query: event.target.value })} /></label>
      <label><input type="checkbox" checked={view.availableOnly} onChange={(event) => filter({ availableOnly: event.target.checked })} />Available only</label>
`)}      {!state.loading && visible.length === 0 && <p>No items</p>}
      <ul>
        {visible.map((item) => (
          <li key={item.id}>
            {item.name}
            <output aria-label={'${amount} ' + item.name}>{item.${amount}}</output>
${since(stage, 7, `            <button type="button" aria-label={'${action} ' + item.name} disabled={frozen || item.${amount} === 0} onClick={() => decrement(item)}>${action}</button>
`)}${since(stage, 8, `            <button type="button" aria-label={'Delete ' + item.name} disabled={frozen} onClick={() => remove(item)}>Delete</button>
`)}          </li>
        ))}
      </ul>
${since(stage, 8, `      <button type="button" disabled={page === 0} onClick={() => turn(-1)}>Previous</button>
      <output aria-label="Page">{pageCount > 0 ? (page + 1) + ' / ' + pageCount : '0 / 0'}</output>
      <button type="button" disabled={page + 1 >= pageCount} onClick={() => turn(1)}>Next</button>
`)}    </main>
  );
}
`;
}

function buildSenior(app: FullStackApp, stage: number): string {
  if (stage === 1) return seniorPlain(app);
  const backend = seniorBackend(app, stage);
  if (stage < 5) return backend;
  return seniorClient(app, stage, backend);
}

/** Hidden cases (lib/coding/react-hidden.ts) for the mutation stage and the
 * stage after it, which keeps its rules: the button is disabled at zero and
 * while its change is in flight, a success refetches the list (another
 * client's change to a different row shows up), and a failure other than a
 * conflict shows 'Request failed'. Two rows only, so the page of the last
 * stage shows both. They use the visible prelude's `settle`, `endpoint`,
 * `createApi` and `createLocalFetch`. */
const mutationHiddenSuite = (app:FullStackApp):string => {
 const {amount,action}=app;
 const rows=JSON.stringify([{id:1,name:app.first,[amount]:2,version:1},{id:2,name:app.second,[amount]:0,version:1}]);
 return `const mutationButton=name=>screen.getByRole('button',{name:'${action} '+name,exact:true});
test('${action} is disabled at zero and while its change is in flight, and a success refetches the list',async()=>{const api=createApi(${rows}),local=createLocalFetch(api);let release=null,gets=0;render(<App fetcher={(url,opt)=>{if(opt?.method==='PATCH')return new Promise(resolve=>{release=()=>resolve(local(url,opt))});gets+=1;return local(url,opt)}}/>);await settle();expect(mutationButton('${app.second}').disabled).toBe(true);expect(mutationButton('${app.first}').disabled).toBe(false);fireEvent.click(mutationButton('${app.first}'));await waitFor(()=>expect(release).not.toBeNull());expect(mutationButton('${app.first}').disabled).toBe(true);const before=gets;api({method:'PATCH',path:endpoint+'/2',body:{version:1,${amount}:7}});release();await waitFor(()=>expect(screen.getByLabelText('${amount} ${app.second}').textContent).toBe('7'));expect(gets>before).toBe(true);expect(screen.getByLabelText('${amount} ${app.first}').textContent).toBe('1');expect(mutationButton('${app.first}').disabled).toBe(false)});
test('a failed change that is not a conflict shows Request failed',async()=>{const local=createLocalFetch(createApi(${rows}));render(<App fetcher={(url,opt)=>opt?.method==='PATCH'?Promise.resolve({ok:false,status:500,json:async()=>({error:'server'})}):local(url,opt)}/>);await settle();fireEvent.click(mutationButton('${app.first}'));await waitFor(()=>expect(alertMessage()).toBe('Request failed'))});`;
};

export const FULLSTACK_SOLUTIONS:Record<string,CodingSolution> = Object.fromEntries(FULLSTACK_APPS.flatMap(app=>{
 const project=EVOLVING_CHALLENGES.find(p=>p.id===`fullstack-${app.slug}`)!;
 const row=fullstackSeed(app)[0];
 return project.stages.filter(id => !id.endsWith('-start')).map((id,i)=>[id,{solution:build(app,i+1),junior:buildJunior(app,i+1),senior:buildSenior(app,i+1),...(i>=6?{hiddenSuite:mutationHiddenSuite(app)}:{}),...(i<4?{hiddenTests:[
  {call:`normalizeInput({name:'x'.repeat(81),${app.amount}:1})`,expected:null},
  {call:`normalizeInput({name:'A',${app.amount}:1001})`,expected:null},
  // A missing or non-string name and a value that is not an object are refused, not read.
  {call:`[{${app.amount}:2},{name:42,${app.amount}:2},'${app.first}'].map(value=>normalizeInput(value))`,expected:[null,null,null]},
  // Stage 1 only: from stage 2 on, the checkpoint shows these as visible checks.
  ...(i===0?[
   {call:`normalizeInput({name:'Plan',${app.amount}:5})`,expected:{name:'Plan',[app.amount]:5}},
   {call:`normalizeInput({name:'A',${app.amount}:-1})`,expected:null},
   {call:`normalizeInput({name:'x'.repeat(80),${app.amount}:1})`,expected:{name:'x'.repeat(80),[app.amount]:1}},
   {call:`normalizeInput({name:'A',${app.amount}:1000})`,expected:{name:'A',[app.amount]:1000}},
  ]:[]),
  // updateItem, from stage 2: each rule the brief states.
  ...(i>=1?[
   {call:`updateItem(${JSON.stringify(row)},{${app.amount}:1})`,expected:null},
   {call:`updateItem(${JSON.stringify(row)},{version:1,${app.amount}:1.5})`,expected:null},
   {call:`updateItem(${JSON.stringify(row)},{version:1,${app.amount}:5000})`,expected:null},
   {call:`updateItem(${JSON.stringify(row)},{version:1,${app.amount}:1,name:'Other',id:9})`,expected:{...row,[app.amount]:1,version:2}},
   {call:`[null,5,'patch'].map(patch=>updateItem(${JSON.stringify(row)},patch))`,expected:[null,null,null]},
  ]:[]),
  ...(i>=2?[{call:`(()=>{const seed=${JSON.stringify(fullstackSeed(app))};const api=createApi(seed);seed[0].name='changed';const first=api({method:'GET',path:'${app.endpoint}'});first.body[0].name='mutated';return api({method:'GET',path:'${app.endpoint}'}).body[0].name})()`,expected:app.first}]:[]),
  // From stage 3: a POST stores the row it answers with, its reply is a copy,
  // and a method other than GET or POST on the collection is not found.
  ...(i>=2?[
   {call:`(()=>{const api=createApi([]);const reply=api({method:'POST',path:'${app.endpoint}',body:{name:'A',${app.amount}:1}});reply.body.${app.amount}=99;return api({method:'GET',path:'${app.endpoint}'}).body})()`,expected:[{name:'A',[app.amount]:1,id:1,version:1}]},
   {call:`(()=>{const api=createApi([]);return [api({method:'PUT',path:'${app.endpoint}',body:{name:'A',${app.amount}:1}}),api({method:'GET',path:'${app.endpoint}'}).body.length]})()`,expected:[{status:404,body:{error:'not_found'}},0]},
  ]:[]),
  // Stage 4: DELETE removes the row, PATCH stores the new version behind a
  // copied reply, and any other method on an item is not found and changes nothing.
  ...(i>=3?[
   {call:`(()=>{const api=createApi(${JSON.stringify(fullstackSeed(app))});return [api({method:'PUT',path:'${app.endpoint}/1',body:{version:1,${app.amount}:1}}),api({method:'GET',path:'${app.endpoint}'}).body[0]]})()`,expected:[{status:404,body:{error:'not_found'}},row]},
   {call:`(()=>{const api=createApi(${JSON.stringify(fullstackSeed(app))});const reply=api({method:'DELETE',path:'${app.endpoint}/2'});return [reply,api({method:'GET',path:'${app.endpoint}'}).body.map(item=>item.id)]})()`,expected:[{status:200,body:{deleted:2}},[1,3]]},
   {call:`(()=>{const api=createApi(${JSON.stringify(fullstackSeed(app))});const reply=api({method:'PATCH',path:'${app.endpoint}/1',body:{version:1,${app.amount}:1}});reply.body.${app.amount}=99;return api({method:'GET',path:'${app.endpoint}'}).body[0]})()`,expected:{...row,[app.amount]:1,version:2}},
  ]:[]),
 ]}:{})}] as [string,CodingSolution]).concat(
  project.stages.filter(id => id.endsWith('-start')).map(id=>[id,{solution:checkpoint(app,Number(id.slice(0,-6).split('-').pop()))}] as [string,CodingSolution]),
 );
}));

FULLSTACK_SOLUTIONS["js-fullstack-planner-1"].hiddenTests = [...(FULLSTACK_SOLUTIONS["js-fullstack-planner-1"].hiddenTests ?? []), {"call": "(()=>{const whites=['',' ','\\t','\\n','\\r','\\u00a0','\\ufeff','\\u2003','\\u2028','\\u2029'],names=[['A','A'],['a  b','a  b'],['\u00e9','\u00e9'],['e\\u0301','e\\u0301'],['__proto__','__proto__'],['\\u200b','\\u200b'],['\ud83d\ude00'.repeat(40),'\ud83d\ude00'.repeat(40)],['x'.repeat(80),'x'.repeat(80)],['x'.repeat(81),null],['',null]],numbers=[0,-0,1,999,1000,-1,1001,0.5,NaN,Infinity,-Infinity,'2',null,undefined,1n,new Number(1)];for(const ws of whites)for(const[raw,expectedName]of names)for(const number of numbers){const a=normalizeInput({name:ws+raw+ws,hours:number,extra:1}),valid=expectedName!==null&&typeof number==='number'&&Number.isFinite(number)&&Math.trunc(number)===number&&number>=0&&number<=1000;if(!valid){if(a!==null)return false;}else if(!a||a.name!==expectedName||a.hours!==number||Object.keys(a).length!==2)return false;}return true;})()", "expected": true},{"call": "(()=>{const values=[Object.freeze({name:' A ',hours:0,extra:1}),Object.freeze(Object.create({name:' A ',hours:0})),Object.freeze(Object.assign(Object.create(null),{name:' A ',hours:0}))];for(const value of values){const a=normalizeInput(value),b=normalizeInput(value);if(!a||!b||a===b||a===value||a.name!=='A'||a.hours!==0||Object.keys(a).length!==2)return false;a.name='changed';a.hours=99;a.extra=1;if(b.name!=='A'||b.hours!==0||normalizeInput(value).name!=='A')return false;}const v={name:'A',hours:1};Object.defineProperty(v,'ignored',{get(){throw Error('ignored field read');},enumerable:true});if(normalizeInput(v).hours!==1)return false;const a=[];a.name='A';a.hours=1;const f=()=>0;f.name;return [a,f,undefined,null,true,2,'text',Symbol('x'),1n,{},new String('A'),{name:new String('A'),hours:1}].every(value=>normalizeInput(value)===null);})()", "expected": true},{"call": "(()=>{const value=Object.freeze({name:' '.repeat(9900)+'A'+' '.repeat(9900),hours:1000}),a=normalizeInput(value),b=normalizeInput(Object.freeze({name:'\ud83d\ude00'.repeat(40),hours:-0}));return a.name==='A'&&a.hours===1000&&b.name.length===80&&b.hours===0&&normalizeInput({name:'\ud83d\ude00'.repeat(41),hours:0})===null&&normalizeInput({name:'x'.repeat(20000),hours:0})===null;})()", "expected": true}];

FULLSTACK_SOLUTIONS["js-fullstack-stockroom-1"].hiddenTests = [...(FULLSTACK_SOLUTIONS["js-fullstack-stockroom-1"].hiddenTests ?? []), {"call": "(()=>{const whites=['',' ','\\t','\\n','\\r','\\u00a0','\\ufeff','\\u2003','\\u2028','\\u2029'],names=[['A','A'],['a  b','a  b'],['\u00e9','\u00e9'],['e\\u0301','e\\u0301'],['__proto__','__proto__'],['\\u200b','\\u200b'],['\ud83d\ude00'.repeat(40),'\ud83d\ude00'.repeat(40)],['x'.repeat(80),'x'.repeat(80)],['x'.repeat(81),null],['',null]],numbers=[0,-0,1,999,1000,-1,1001,0.5,NaN,Infinity,-Infinity,'2',null,undefined,1n,new Number(1)];for(const ws of whites)for(const[raw,expectedName]of names)for(const number of numbers){const a=normalizeInput({name:ws+raw+ws,stock:number,extra:1}),valid=expectedName!==null&&typeof number==='number'&&Number.isFinite(number)&&Math.trunc(number)===number&&number>=0&&number<=1000;if(!valid){if(a!==null)return false;}else if(!a||a.name!==expectedName||a.stock!==number||Object.keys(a).length!==2)return false;}return true;})()", "expected": true},{"call": "(()=>{const values=[Object.freeze({name:' A ',stock:0,extra:1}),Object.freeze(Object.create({name:' A ',stock:0})),Object.freeze(Object.assign(Object.create(null),{name:' A ',stock:0}))];for(const value of values){const a=normalizeInput(value),b=normalizeInput(value);if(!a||!b||a===b||a===value||a.name!=='A'||a.stock!==0||Object.keys(a).length!==2)return false;a.name='changed';a.stock=99;a.extra=1;if(b.name!=='A'||b.stock!==0||normalizeInput(value).name!=='A')return false;}const v={name:'A',stock:1};Object.defineProperty(v,'ignored',{get(){throw Error('ignored field read');},enumerable:true});if(normalizeInput(v).stock!==1)return false;const a=[];a.name='A';a.stock=1;const f=()=>0;f.name;return [a,f,undefined,null,true,2,'text',Symbol('x'),1n,{},new String('A'),{name:new String('A'),stock:1}].every(value=>normalizeInput(value)===null);})()", "expected": true},{"call": "(()=>{const value=Object.freeze({name:' '.repeat(9900)+'A'+' '.repeat(9900),stock:1000}),a=normalizeInput(value),b=normalizeInput(Object.freeze({name:'\ud83d\ude00'.repeat(40),stock:-0}));return a.name==='A'&&a.stock===1000&&b.name.length===80&&b.stock===0&&normalizeInput({name:'\ud83d\ude00'.repeat(41),stock:0})===null&&normalizeInput({name:'x'.repeat(20000),stock:0})===null;})()", "expected": true}];

FULLSTACK_SOLUTIONS["js-fullstack-workshops-1"].hiddenTests = [...(FULLSTACK_SOLUTIONS["js-fullstack-workshops-1"].hiddenTests ?? []), {"call": "(()=>{const whites=['',' ','\\t','\\n','\\r','\\u00a0','\\ufeff','\\u2003','\\u2028','\\u2029'],names=[['A','A'],['a  b','a  b'],['\u00e9','\u00e9'],['e\\u0301','e\\u0301'],['__proto__','__proto__'],['\\u200b','\\u200b'],['\ud83d\ude00'.repeat(40),'\ud83d\ude00'.repeat(40)],['x'.repeat(80),'x'.repeat(80)],['x'.repeat(81),null],['',null]],numbers=[0,-0,1,999,1000,-1,1001,0.5,NaN,Infinity,-Infinity,'2',null,undefined,1n,new Number(1)];for(const ws of whites)for(const[raw,expectedName]of names)for(const number of numbers){const a=normalizeInput({name:ws+raw+ws,seats:number,extra:1}),valid=expectedName!==null&&typeof number==='number'&&Number.isFinite(number)&&Math.trunc(number)===number&&number>=0&&number<=1000;if(!valid){if(a!==null)return false;}else if(!a||a.name!==expectedName||a.seats!==number||Object.keys(a).length!==2)return false;}return true;})()", "expected": true},{"call": "(()=>{const values=[Object.freeze({name:' A ',seats:0,extra:1}),Object.freeze(Object.create({name:' A ',seats:0})),Object.freeze(Object.assign(Object.create(null),{name:' A ',seats:0}))];for(const value of values){const a=normalizeInput(value),b=normalizeInput(value);if(!a||!b||a===b||a===value||a.name!=='A'||a.seats!==0||Object.keys(a).length!==2)return false;a.name='changed';a.seats=99;a.extra=1;if(b.name!=='A'||b.seats!==0||normalizeInput(value).name!=='A')return false;}const v={name:'A',seats:1};Object.defineProperty(v,'ignored',{get(){throw Error('ignored field read');},enumerable:true});if(normalizeInput(v).seats!==1)return false;const a=[];a.name='A';a.seats=1;const f=()=>0;f.name;return [a,f,undefined,null,true,2,'text',Symbol('x'),1n,{},new String('A'),{name:new String('A'),seats:1}].every(value=>normalizeInput(value)===null);})()", "expected": true},{"call": "(()=>{const value=Object.freeze({name:' '.repeat(9900)+'A'+' '.repeat(9900),seats:1000}),a=normalizeInput(value),b=normalizeInput(Object.freeze({name:'\ud83d\ude00'.repeat(40),seats:-0}));return a.name==='A'&&a.seats===1000&&b.name.length===80&&b.seats===0&&normalizeInput({name:'\ud83d\ude00'.repeat(41),seats:0})===null&&normalizeInput({name:'x'.repeat(20000),seats:0})===null;})()", "expected": true}];

FULLSTACK_SOLUTIONS["ts-fullstack-planner-2-start"].hiddenTests = [...(FULLSTACK_SOLUTIONS["ts-fullstack-planner-2-start"].hiddenTests ?? []), {"call": "((()=>{const whites=['',' ','\\t','\\n','\\r','\\u00a0','\\ufeff','\\u2003','\\u2028','\\u2029'],names=[['A','A'],['a  b','a  b'],['\u00e9','\u00e9'],['e\\u0301','e\\u0301'],['__proto__','__proto__'],['\\u200b','\\u200b'],['\ud83d\ude00'.repeat(40),'\ud83d\ude00'.repeat(40)],['x'.repeat(80),'x'.repeat(80)],['x'.repeat(81),null],['',null]],numbers=[0,-0,1,999,1000,-1,1001,0.5,NaN,Infinity,-Infinity,'2',null,undefined,1n,new Number(1)];for(const ws of whites)for(const[raw,expectedName]of names)for(const number of numbers){const a=normalizeInput({name:ws+raw+ws,hours:number,extra:1}),valid=expectedName!==null&&typeof number==='number'&&Number.isFinite(number)&&Math.trunc(number)===number&&number>=0&&number<=1000;if(!valid){if(a!==null)return false;}else if(!a||a.name!==expectedName||a.hours!==number||Object.keys(a).length!==2)return false;}return true;})()&&(()=>{const names=['\u00e9','e\\u0301','A  B','\ud83e\udd88'.repeat(40),'x'.repeat(80),'x'.repeat(81)],amounts=[0,-0,1,1000,-1,1001,1.5,NaN,Infinity,'2',null,undefined];for(const name of names)for(const amount of amounts){const out=normalizeInput(Object.freeze({name,hours:amount})),okay=name.length<=80&&typeof amount==='number'&&Number.isInteger(amount)&&amount>=0&&amount<=1000;if(!okay){if(out!==null)return false;}else if(!out||out.name!==name||out.hours!==amount||Object.keys(out).length!==2)return false;}return true;})())", "expected": true},{"call": "((()=>{const values=[Object.freeze({name:' A ',hours:0,extra:1}),Object.freeze(Object.create({name:' A ',hours:0})),Object.freeze(Object.assign(Object.create(null),{name:' A ',hours:0}))];for(const value of values){const a=normalizeInput(value),b=normalizeInput(value);if(!a||!b||a===b||a===value||a.name!=='A'||a.hours!==0||Object.keys(a).length!==2)return false;a.name='changed';a.hours=99;a.extra=1;if(b.name!=='A'||b.hours!==0||normalizeInput(value).name!=='A')return false;}const v={name:'A',hours:1};Object.defineProperty(v,'ignored',{get(){throw Error('ignored field read');},enumerable:true});if(normalizeInput(v).hours!==1)return false;const a=[];a.name='A';a.hours=1;const f=()=>0;f.name;return [a,f,undefined,null,true,2,'text',Symbol('x'),1n,{},new String('A'),{name:new String('A'),hours:1}].every(value=>normalizeInput(value)===null);})()&&(()=>{const source=Object.create({name:' e\\u0301 ',hours:0});Object.defineProperty(source,'ignored',{get(){throw Error('read extra');},enumerable:true});Object.freeze(source);const a=normalizeInput(source),b=normalizeInput(source);if(!a||!b||a===b||a.name!=='e\\u0301'||Object.isFrozen(a))return false;a.name='caller';a.hours=9;return b.name==='e\\u0301'&&b.hours===0&&normalizeInput(source).hours===0;})())", "expected": true},{"call": "((()=>{const value=Object.freeze({name:' '.repeat(9900)+'A'+' '.repeat(9900),hours:1000}),a=normalizeInput(value),b=normalizeInput(Object.freeze({name:'\ud83d\ude00'.repeat(40),hours:-0}));return a.name==='A'&&a.hours===1000&&b.name.length===80&&b.hours===0&&normalizeInput({name:'\ud83d\ude00'.repeat(41),hours:0})===null&&normalizeInput({name:'x'.repeat(20000),hours:0})===null;})()&&(()=>{const input=Object.freeze({name:' '.repeat(9960)+'\ud83e\udd88'.repeat(40)+' '.repeat(9960),hours:1000});for(let i=0;i<1000;i++){const out=normalizeInput(input);if(!out||out.name!=='\ud83e\udd88'.repeat(40)||out.hours!==1000)return false;}return normalizeInput({name:'x'.repeat(20000),hours:1})===null;})())", "expected": true}];

FULLSTACK_SOLUTIONS["ts-fullstack-stockroom-2-start"].hiddenTests = [...(FULLSTACK_SOLUTIONS["ts-fullstack-stockroom-2-start"].hiddenTests ?? []), {"call": "((()=>{const whites=['',' ','\\t','\\n','\\r','\\u00a0','\\ufeff','\\u2003','\\u2028','\\u2029'],names=[['A','A'],['a  b','a  b'],['\u00e9','\u00e9'],['e\\u0301','e\\u0301'],['__proto__','__proto__'],['\\u200b','\\u200b'],['\ud83d\ude00'.repeat(40),'\ud83d\ude00'.repeat(40)],['x'.repeat(80),'x'.repeat(80)],['x'.repeat(81),null],['',null]],numbers=[0,-0,1,999,1000,-1,1001,0.5,NaN,Infinity,-Infinity,'2',null,undefined,1n,new Number(1)];for(const ws of whites)for(const[raw,expectedName]of names)for(const number of numbers){const a=normalizeInput({name:ws+raw+ws,stock:number,extra:1}),valid=expectedName!==null&&typeof number==='number'&&Number.isFinite(number)&&Math.trunc(number)===number&&number>=0&&number<=1000;if(!valid){if(a!==null)return false;}else if(!a||a.name!==expectedName||a.stock!==number||Object.keys(a).length!==2)return false;}return true;})()&&(()=>{const names=['\u00e9','e\\u0301','A  B','\ud83e\udd88'.repeat(40),'x'.repeat(80),'x'.repeat(81)],amounts=[0,-0,1,1000,-1,1001,1.5,NaN,Infinity,'2',null,undefined];for(const name of names)for(const amount of amounts){const out=normalizeInput(Object.freeze({name,stock:amount})),okay=name.length<=80&&typeof amount==='number'&&Number.isInteger(amount)&&amount>=0&&amount<=1000;if(!okay){if(out!==null)return false;}else if(!out||out.name!==name||out.stock!==amount||Object.keys(out).length!==2)return false;}return true;})())", "expected": true},{"call": "((()=>{const values=[Object.freeze({name:' A ',stock:0,extra:1}),Object.freeze(Object.create({name:' A ',stock:0})),Object.freeze(Object.assign(Object.create(null),{name:' A ',stock:0}))];for(const value of values){const a=normalizeInput(value),b=normalizeInput(value);if(!a||!b||a===b||a===value||a.name!=='A'||a.stock!==0||Object.keys(a).length!==2)return false;a.name='changed';a.stock=99;a.extra=1;if(b.name!=='A'||b.stock!==0||normalizeInput(value).name!=='A')return false;}const v={name:'A',stock:1};Object.defineProperty(v,'ignored',{get(){throw Error('ignored field read');},enumerable:true});if(normalizeInput(v).stock!==1)return false;const a=[];a.name='A';a.stock=1;const f=()=>0;f.name;return [a,f,undefined,null,true,2,'text',Symbol('x'),1n,{},new String('A'),{name:new String('A'),stock:1}].every(value=>normalizeInput(value)===null);})()&&(()=>{const source=Object.create({name:' e\\u0301 ',stock:0});Object.defineProperty(source,'ignored',{get(){throw Error('read extra');},enumerable:true});Object.freeze(source);const a=normalizeInput(source),b=normalizeInput(source);if(!a||!b||a===b||a.name!=='e\\u0301'||Object.isFrozen(a))return false;a.name='caller';a.stock=9;return b.name==='e\\u0301'&&b.stock===0&&normalizeInput(source).stock===0;})())", "expected": true},{"call": "((()=>{const value=Object.freeze({name:' '.repeat(9900)+'A'+' '.repeat(9900),stock:1000}),a=normalizeInput(value),b=normalizeInput(Object.freeze({name:'\ud83d\ude00'.repeat(40),stock:-0}));return a.name==='A'&&a.stock===1000&&b.name.length===80&&b.stock===0&&normalizeInput({name:'\ud83d\ude00'.repeat(41),stock:0})===null&&normalizeInput({name:'x'.repeat(20000),stock:0})===null;})()&&(()=>{const input=Object.freeze({name:' '.repeat(9960)+'\ud83e\udd88'.repeat(40)+' '.repeat(9960),stock:1000});for(let i=0;i<1000;i++){const out=normalizeInput(input);if(!out||out.name!=='\ud83e\udd88'.repeat(40)||out.stock!==1000)return false;}return normalizeInput({name:'x'.repeat(20000),stock:1})===null;})())", "expected": true}];

FULLSTACK_SOLUTIONS["ts-fullstack-planner-2"].hiddenTests = [...(FULLSTACK_SOLUTIONS["ts-fullstack-planner-2"].hiddenTests ?? []), {"call": "(((()=>{const whites=['',' ','\\t','\\n','\\r','\\u00a0','\\ufeff','\\u2003','\\u2028','\\u2029'],names=[['A','A'],['a  b','a  b'],['\u00e9','\u00e9'],['e\\u0301','e\\u0301'],['__proto__','__proto__'],['\\u200b','\\u200b'],['\ud83d\ude00'.repeat(40),'\ud83d\ude00'.repeat(40)],['x'.repeat(80),'x'.repeat(80)],['x'.repeat(81),null],['',null]],numbers=[0,-0,1,999,1000,-1,1001,0.5,NaN,Infinity,-Infinity,'2',null,undefined,1n,new Number(1)];for(const ws of whites)for(const[raw,expectedName]of names)for(const number of numbers){const a=normalizeInput({name:ws+raw+ws,hours:number,extra:1}),valid=expectedName!==null&&typeof number==='number'&&Number.isFinite(number)&&Math.trunc(number)===number&&number>=0&&number<=1000;if(!valid){if(a!==null)return false;}else if(!a||a.name!==expectedName||a.hours!==number||Object.keys(a).length!==2)return false;}return true;})()&&(()=>{const names=['\u00e9','e\\u0301','A  B','\ud83e\udd88'.repeat(40),'x'.repeat(80),'x'.repeat(81)],amounts=[0,-0,1,1000,-1,1001,1.5,NaN,Infinity,'2',null,undefined];for(const name of names)for(const amount of amounts){const out=normalizeInput(Object.freeze({name,hours:amount})),okay=name.length<=80&&typeof amount==='number'&&Number.isInteger(amount)&&amount>=0&&amount<=1000;if(!okay){if(out!==null)return false;}else if(!out||out.name!==name||out.hours!==amount||Object.keys(out).length!==2)return false;}return true;})())&&(()=>{const amounts=[0,-0,1,1000,-1,1001,1.5,NaN,Infinity,'2',null,undefined],versions=[1,2,17,1000000];for(const version of versions)for(const amount of amounts)for(const incoming of [version,version+1,version-1,'1',null,undefined,1.5,NaN]){const item=Object.freeze({id:17,name:'e\\u0301',hours:2,version}),patch=Object.freeze({version:incoming,hours:amount}),out=updateItem(item,patch),okay=typeof incoming==='number'&&Number.isInteger(incoming)&&incoming===version&&typeof amount==='number'&&Number.isInteger(amount)&&amount>=0&&amount<=1000;if(!okay){if(out!==null)return false;}else if(!out||out===item||out.id!==17||out.name!==item.name||out.hours!==amount||out.version!==version+1||Object.isFrozen(out))return false;if(item.hours!==2||item.version!==version)return false;}return true;})())", "expected": true},{"call": "(((()=>{const values=[Object.freeze({name:' A ',hours:0,extra:1}),Object.freeze(Object.create({name:' A ',hours:0})),Object.freeze(Object.assign(Object.create(null),{name:' A ',hours:0}))];for(const value of values){const a=normalizeInput(value),b=normalizeInput(value);if(!a||!b||a===b||a===value||a.name!=='A'||a.hours!==0||Object.keys(a).length!==2)return false;a.name='changed';a.hours=99;a.extra=1;if(b.name!=='A'||b.hours!==0||normalizeInput(value).name!=='A')return false;}const v={name:'A',hours:1};Object.defineProperty(v,'ignored',{get(){throw Error('ignored field read');},enumerable:true});if(normalizeInput(v).hours!==1)return false;const a=[];a.name='A';a.hours=1;const f=()=>0;f.name;return [a,f,undefined,null,true,2,'text',Symbol('x'),1n,{},new String('A'),{name:new String('A'),hours:1}].every(value=>normalizeInput(value)===null);})()&&(()=>{const source=Object.create({name:' e\\u0301 ',hours:0});Object.defineProperty(source,'ignored',{get(){throw Error('read extra');},enumerable:true});Object.freeze(source);const a=normalizeInput(source),b=normalizeInput(source);if(!a||!b||a===b||a.name!=='e\\u0301'||Object.isFrozen(a))return false;a.name='caller';a.hours=9;return b.name==='e\\u0301'&&b.hours===0&&normalizeInput(source).hours===0;})())&&(()=>{const item=Object.freeze({id:1,name:'Same',hours:2,version:1}),patch=Object.create({version:1,hours:2});Object.defineProperty(patch,'ignored',{get(){throw Error('read extra');},enumerable:true});Object.freeze(patch);const a=updateItem(item,patch),b=updateItem(item,patch);if(!a||!b||a===b||a===item||a.version!==2||a.hours!==2)return false;a.name='caller';a.id=99;a.version=99;return b.name==='Same'&&b.id===1&&b.version===2&&item.version===1;})())", "expected": true},{"call": "(((()=>{const value=Object.freeze({name:' '.repeat(9900)+'A'+' '.repeat(9900),hours:1000}),a=normalizeInput(value),b=normalizeInput(Object.freeze({name:'\ud83d\ude00'.repeat(40),hours:-0}));return a.name==='A'&&a.hours===1000&&b.name.length===80&&b.hours===0&&normalizeInput({name:'\ud83d\ude00'.repeat(41),hours:0})===null&&normalizeInput({name:'x'.repeat(20000),hours:0})===null;})()&&(()=>{const input=Object.freeze({name:' '.repeat(9960)+'\ud83e\udd88'.repeat(40)+' '.repeat(9960),hours:1000});for(let i=0;i<1000;i++){const out=normalizeInput(input);if(!out||out.name!=='\ud83e\udd88'.repeat(40)||out.hours!==1000)return false;}return normalizeInput({name:'x'.repeat(20000),hours:1})===null;})())&&(()=>{let item={id:1,name:'Exact  Name',hours:0,version:1};for(let i=0;i<1000;i++){const before=item,next=updateItem(item,Object.freeze({version:item.version,hours:i%1001}));if(!next||next===before||next.version!==before.version+1||next.name!=='Exact  Name'||before.version!==i+1)return false;item=next;}return item.version===1001&&item.hours===999;})())", "expected": true}];

FULLSTACK_SOLUTIONS["ts-fullstack-planner-3"].hiddenTests = [...(FULLSTACK_SOLUTIONS["ts-fullstack-planner-3"].hiddenTests ?? []), {"call": "((((()=>{const whites=['',' ','\\t','\\n','\\r','\\u00a0','\\ufeff','\\u2003','\\u2028','\\u2029'],names=[['A','A'],['a  b','a  b'],['\u00e9','\u00e9'],['e\\u0301','e\\u0301'],['__proto__','__proto__'],['\\u200b','\\u200b'],['\ud83d\ude00'.repeat(40),'\ud83d\ude00'.repeat(40)],['x'.repeat(80),'x'.repeat(80)],['x'.repeat(81),null],['',null]],numbers=[0,-0,1,999,1000,-1,1001,0.5,NaN,Infinity,-Infinity,'2',null,undefined,1n,new Number(1)];for(const ws of whites)for(const[raw,expectedName]of names)for(const number of numbers){const a=normalizeInput({name:ws+raw+ws,hours:number,extra:1}),valid=expectedName!==null&&typeof number==='number'&&Number.isFinite(number)&&Math.trunc(number)===number&&number>=0&&number<=1000;if(!valid){if(a!==null)return false;}else if(!a||a.name!==expectedName||a.hours!==number||Object.keys(a).length!==2)return false;}return true;})()&&(()=>{const names=['\u00e9','e\\u0301','A  B','\ud83e\udd88'.repeat(40),'x'.repeat(80),'x'.repeat(81)],amounts=[0,-0,1,1000,-1,1001,1.5,NaN,Infinity,'2',null,undefined];for(const name of names)for(const amount of amounts){const out=normalizeInput(Object.freeze({name,hours:amount})),okay=name.length<=80&&typeof amount==='number'&&Number.isInteger(amount)&&amount>=0&&amount<=1000;if(!okay){if(out!==null)return false;}else if(!out||out.name!==name||out.hours!==amount||Object.keys(out).length!==2)return false;}return true;})())&&(()=>{const amounts=[0,-0,1,1000,-1,1001,1.5,NaN,Infinity,'2',null,undefined],versions=[1,2,17,1000000];for(const version of versions)for(const amount of amounts)for(const incoming of [version,version+1,version-1,'1',null,undefined,1.5,NaN]){const item=Object.freeze({id:17,name:'e\\u0301',hours:2,version}),patch=Object.freeze({version:incoming,hours:amount}),out=updateItem(item,patch),okay=typeof incoming==='number'&&Number.isInteger(incoming)&&incoming===version&&typeof amount==='number'&&Number.isInteger(amount)&&amount>=0&&amount<=1000;if(!okay){if(out!==null)return false;}else if(!out||out===item||out.id!==17||out.name!==item.name||out.hours!==amount||out.version!==version+1||Object.isFrozen(out))return false;if(item.hours!==2||item.version!==version)return false;}return true;})())&&(()=>{const stable=v=>JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a<b?-1:a>b?1:0)):x); for(let seed=0;seed<16;seed++){let rows=[{id:100+seed,name:'First',hours:2,version:1},{id:1,name:'Second',hours:0,version:2}],last=100+seed;const api=createApi(rows),other=createApi([]);for(let step=0;step<96;step++){const op=(step*7+seed)%4,id=rows.length?rows[step%rows.length].id:1;let request,expected;if(op===0){request={method:'GET',path:'/api/tasks'};expected={status:200,body:rows.map(x=>({...x}))};}else if(op===1){request={method:'POST',path:'/api/tasks',body:{name:'  e\\u0301  ',hours:step%1001}};const value={id:++last,name:'e\\u0301',hours:step%1001,version:1};rows.push(value);expected={status:201,body:{...value}};}else if(op===2){request={method:'POST',path:'/api/tasks',body:{name:'',hours:0}};expected={status:400,body:{error:'invalid'}};}else if(op===3){request={method:'PUT',path:'/api/tasks/'+id};expected={status:404,body:{error:'not_found'}};} if(stable(api(request))!==stable(expected)||stable(api({method:'GET',path:'/api/tasks'}).body)!==stable(rows)||other({method:'GET',path:'/api/tasks'}).body.length)return false;}}return true;})())", "expected": true},{"call": "((((()=>{const values=[Object.freeze({name:' A ',hours:0,extra:1}),Object.freeze(Object.create({name:' A ',hours:0})),Object.freeze(Object.assign(Object.create(null),{name:' A ',hours:0}))];for(const value of values){const a=normalizeInput(value),b=normalizeInput(value);if(!a||!b||a===b||a===value||a.name!=='A'||a.hours!==0||Object.keys(a).length!==2)return false;a.name='changed';a.hours=99;a.extra=1;if(b.name!=='A'||b.hours!==0||normalizeInput(value).name!=='A')return false;}const v={name:'A',hours:1};Object.defineProperty(v,'ignored',{get(){throw Error('ignored field read');},enumerable:true});if(normalizeInput(v).hours!==1)return false;const a=[];a.name='A';a.hours=1;const f=()=>0;f.name;return [a,f,undefined,null,true,2,'text',Symbol('x'),1n,{},new String('A'),{name:new String('A'),hours:1}].every(value=>normalizeInput(value)===null);})()&&(()=>{const source=Object.create({name:' e\\u0301 ',hours:0});Object.defineProperty(source,'ignored',{get(){throw Error('read extra');},enumerable:true});Object.freeze(source);const a=normalizeInput(source),b=normalizeInput(source);if(!a||!b||a===b||a.name!=='e\\u0301'||Object.isFrozen(a))return false;a.name='caller';a.hours=9;return b.name==='e\\u0301'&&b.hours===0&&normalizeInput(source).hours===0;})())&&(()=>{const item=Object.freeze({id:1,name:'Same',hours:2,version:1}),patch=Object.create({version:1,hours:2});Object.defineProperty(patch,'ignored',{get(){throw Error('read extra');},enumerable:true});Object.freeze(patch);const a=updateItem(item,patch),b=updateItem(item,patch);if(!a||!b||a===b||a===item||a.version!==2||a.hours!==2)return false;a.name='caller';a.id=99;a.version=99;return b.name==='Same'&&b.id===1&&b.version===2&&item.version===1;})())&&(()=>{const seed=[{id:99,name:'High',hours:2,version:1},{id:1,name:'Low',hours:1,version:1}],api=createApi(seed),other=createApi(seed);seed[0].name='changed';seed[0].id=1000;seed[0].version=99;seed.push({id:500,name:'Added',hours:1,version:1});const created=api({method:'POST',path:'/api/tasks',body:{name:'New',hours:0}});if(created.status!==201||created.body.id!==100||created.body.version!==1)return false;created.body.id=500;created.body.hours=9;const first=api({method:'GET',path:'/api/tasks'});if(first.body.map(x=>x.id).join(',')!=='99,1,100'||first.body[0].name!=='High')return false;first.body[0].name='caller';first.body.pop();const next=api({method:'GET',path:'/api/tasks'});return next.body.length===3&&next.body[0].name==='High'&&next.body[2].hours===0&&other({method:'GET',path:'/api/tasks'}).body.length===2;})())", "expected": true},{"call": "((((()=>{const value=Object.freeze({name:' '.repeat(9900)+'A'+' '.repeat(9900),hours:1000}),a=normalizeInput(value),b=normalizeInput(Object.freeze({name:'\ud83d\ude00'.repeat(40),hours:-0}));return a.name==='A'&&a.hours===1000&&b.name.length===80&&b.hours===0&&normalizeInput({name:'\ud83d\ude00'.repeat(41),hours:0})===null&&normalizeInput({name:'x'.repeat(20000),hours:0})===null;})()&&(()=>{const input=Object.freeze({name:' '.repeat(9960)+'\ud83e\udd88'.repeat(40)+' '.repeat(9960),hours:1000});for(let i=0;i<1000;i++){const out=normalizeInput(input);if(!out||out.name!=='\ud83e\udd88'.repeat(40)||out.hours!==1000)return false;}return normalizeInput({name:'x'.repeat(20000),hours:1})===null;})())&&(()=>{let item={id:1,name:'Exact  Name',hours:0,version:1};for(let i=0;i<1000;i++){const before=item,next=updateItem(item,Object.freeze({version:item.version,hours:i%1001}));if(!next||next===before||next.version!==before.version+1||next.name!=='Exact  Name'||before.version!==i+1)return false;item=next;}return item.version===1001&&item.hours===999;})())&&(()=>{const seed=Object.freeze(Array.from({length:10000},(_,i)=>Object.freeze({id:10000-i,name:'N'+i,hours:i%1001,version:1}))),api=createApi(seed);const listed=api({method:'GET',path:'/api/tasks'});if(listed.status!==200||listed.body.length!==10000||listed.body[0].id!==10000||listed.body[9999].id!==1)return false;listed.body[0].hours=999;return api({method:'GET',path:'/api/tasks'}).body[0].hours===0&&seed[0].hours===0;})())", "expected": true}];

FULLSTACK_SOLUTIONS["ts-fullstack-planner-4"].hiddenTests = [...(FULLSTACK_SOLUTIONS["ts-fullstack-planner-4"].hiddenTests ?? []), {"call": "(((((()=>{const whites=['',' ','\\t','\\n','\\r','\\u00a0','\\ufeff','\\u2003','\\u2028','\\u2029'],names=[['A','A'],['a  b','a  b'],['\u00e9','\u00e9'],['e\\u0301','e\\u0301'],['__proto__','__proto__'],['\\u200b','\\u200b'],['\ud83d\ude00'.repeat(40),'\ud83d\ude00'.repeat(40)],['x'.repeat(80),'x'.repeat(80)],['x'.repeat(81),null],['',null]],numbers=[0,-0,1,999,1000,-1,1001,0.5,NaN,Infinity,-Infinity,'2',null,undefined,1n,new Number(1)];for(const ws of whites)for(const[raw,expectedName]of names)for(const number of numbers){const a=normalizeInput({name:ws+raw+ws,hours:number,extra:1}),valid=expectedName!==null&&typeof number==='number'&&Number.isFinite(number)&&Math.trunc(number)===number&&number>=0&&number<=1000;if(!valid){if(a!==null)return false;}else if(!a||a.name!==expectedName||a.hours!==number||Object.keys(a).length!==2)return false;}return true;})()&&(()=>{const names=['\u00e9','e\\u0301','A  B','\ud83e\udd88'.repeat(40),'x'.repeat(80),'x'.repeat(81)],amounts=[0,-0,1,1000,-1,1001,1.5,NaN,Infinity,'2',null,undefined];for(const name of names)for(const amount of amounts){const out=normalizeInput(Object.freeze({name,hours:amount})),okay=name.length<=80&&typeof amount==='number'&&Number.isInteger(amount)&&amount>=0&&amount<=1000;if(!okay){if(out!==null)return false;}else if(!out||out.name!==name||out.hours!==amount||Object.keys(out).length!==2)return false;}return true;})())&&(()=>{const amounts=[0,-0,1,1000,-1,1001,1.5,NaN,Infinity,'2',null,undefined],versions=[1,2,17,1000000];for(const version of versions)for(const amount of amounts)for(const incoming of [version,version+1,version-1,'1',null,undefined,1.5,NaN]){const item=Object.freeze({id:17,name:'e\\u0301',hours:2,version}),patch=Object.freeze({version:incoming,hours:amount}),out=updateItem(item,patch),okay=typeof incoming==='number'&&Number.isInteger(incoming)&&incoming===version&&typeof amount==='number'&&Number.isInteger(amount)&&amount>=0&&amount<=1000;if(!okay){if(out!==null)return false;}else if(!out||out===item||out.id!==17||out.name!==item.name||out.hours!==amount||out.version!==version+1||Object.isFrozen(out))return false;if(item.hours!==2||item.version!==version)return false;}return true;})())&&(()=>{const stable=v=>JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a<b?-1:a>b?1:0)):x); for(let seed=0;seed<16;seed++){let rows=[{id:100+seed,name:'First',hours:2,version:1},{id:1,name:'Second',hours:0,version:2}],last=100+seed;const api=createApi(rows),other=createApi([]);for(let step=0;step<96;step++){const op=(step*7+seed)%4,id=rows.length?rows[step%rows.length].id:1;let request,expected;if(op===0){request={method:'GET',path:'/api/tasks'};expected={status:200,body:rows.map(x=>({...x}))};}else if(op===1){request={method:'POST',path:'/api/tasks',body:{name:'  e\\u0301  ',hours:step%1001}};const value={id:++last,name:'e\\u0301',hours:step%1001,version:1};rows.push(value);expected={status:201,body:{...value}};}else if(op===2){request={method:'POST',path:'/api/tasks',body:{name:'',hours:0}};expected={status:400,body:{error:'invalid'}};}else if(op===3){request={method:'PUT',path:'/api/tasks/'+id};expected={status:404,body:{error:'not_found'}};} if(stable(api(request))!==stable(expected)||stable(api({method:'GET',path:'/api/tasks'}).body)!==stable(rows)||other({method:'GET',path:'/api/tasks'}).body.length)return false;}}return true;})())&&(()=>{const stable=v=>JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a<b?-1:a>b?1:0)):x); for(let seed=0;seed<16;seed++){let rows=[{id:100+seed,name:'First',hours:2,version:1},{id:1,name:'Second',hours:0,version:2}],last=100+seed;const api=createApi(rows),other=createApi([]);for(let step=0;step<96;step++){const op=(step*7+seed)%8,id=rows.length?rows[step%rows.length].id:1;let request,expected;if(op===0){request={method:'GET',path:'/api/tasks'};expected={status:200,body:rows.map(x=>({...x}))};}else if(op===1){request={method:'POST',path:'/api/tasks',body:{name:'  e\\u0301  ',hours:step%1001}};const value={id:++last,name:'e\\u0301',hours:step%1001,version:1};rows.push(value);expected={status:201,body:{...value}};}else if(op===2){request={method:'POST',path:'/api/tasks',body:{name:'',hours:0}};expected={status:400,body:{error:'invalid'}};}else if(op===3){request={method:'PUT',path:'/api/tasks/'+id};expected={status:404,body:{error:'not_found'}};}else if(op===4){request={method:'DELETE',path:'/api/tasks/'+id};const index=rows.findIndex(x=>x.id===id);if(index<0)expected={status:404,body:{error:'not_found'}};else{rows.splice(index,1);expected={status:200,body:{deleted:id}};}}else{const row=rows.find(x=>x.id===id),version=row?row.version:1;request={method:'PATCH',path:'/api/tasks/'+id,body:{version:op===6?version+1:version,hours:op===7||op===6?-1:step%1001}};if(!row)expected={status:404,body:{error:'not_found'}};else if(op===6)expected={status:409,body:{error:'conflict'}};else if(op===7)expected={status:400,body:{error:'invalid'}};else{row.hours=step%1001;row.version++;expected={status:200,body:{...row}};}} if(stable(api(request))!==stable(expected)||stable(api({method:'GET',path:'/api/tasks'}).body)!==stable(rows)||other({method:'GET',path:'/api/tasks'}).body.length)return false;}}return true;})())", "expected": true},{"call": "(((((()=>{const values=[Object.freeze({name:' A ',hours:0,extra:1}),Object.freeze(Object.create({name:' A ',hours:0})),Object.freeze(Object.assign(Object.create(null),{name:' A ',hours:0}))];for(const value of values){const a=normalizeInput(value),b=normalizeInput(value);if(!a||!b||a===b||a===value||a.name!=='A'||a.hours!==0||Object.keys(a).length!==2)return false;a.name='changed';a.hours=99;a.extra=1;if(b.name!=='A'||b.hours!==0||normalizeInput(value).name!=='A')return false;}const v={name:'A',hours:1};Object.defineProperty(v,'ignored',{get(){throw Error('ignored field read');},enumerable:true});if(normalizeInput(v).hours!==1)return false;const a=[];a.name='A';a.hours=1;const f=()=>0;f.name;return [a,f,undefined,null,true,2,'text',Symbol('x'),1n,{},new String('A'),{name:new String('A'),hours:1}].every(value=>normalizeInput(value)===null);})()&&(()=>{const source=Object.create({name:' e\\u0301 ',hours:0});Object.defineProperty(source,'ignored',{get(){throw Error('read extra');},enumerable:true});Object.freeze(source);const a=normalizeInput(source),b=normalizeInput(source);if(!a||!b||a===b||a.name!=='e\\u0301'||Object.isFrozen(a))return false;a.name='caller';a.hours=9;return b.name==='e\\u0301'&&b.hours===0&&normalizeInput(source).hours===0;})())&&(()=>{const item=Object.freeze({id:1,name:'Same',hours:2,version:1}),patch=Object.create({version:1,hours:2});Object.defineProperty(patch,'ignored',{get(){throw Error('read extra');},enumerable:true});Object.freeze(patch);const a=updateItem(item,patch),b=updateItem(item,patch);if(!a||!b||a===b||a===item||a.version!==2||a.hours!==2)return false;a.name='caller';a.id=99;a.version=99;return b.name==='Same'&&b.id===1&&b.version===2&&item.version===1;})())&&(()=>{const seed=[{id:99,name:'High',hours:2,version:1},{id:1,name:'Low',hours:1,version:1}],api=createApi(seed),other=createApi(seed);seed[0].name='changed';seed[0].id=1000;seed[0].version=99;seed.push({id:500,name:'Added',hours:1,version:1});const created=api({method:'POST',path:'/api/tasks',body:{name:'New',hours:0}});if(created.status!==201||created.body.id!==100||created.body.version!==1)return false;created.body.id=500;created.body.hours=9;const first=api({method:'GET',path:'/api/tasks'});if(first.body.map(x=>x.id).join(',')!=='99,1,100'||first.body[0].name!=='High')return false;first.body[0].name='caller';first.body.pop();const next=api({method:'GET',path:'/api/tasks'});return next.body.length===3&&next.body[0].name==='High'&&next.body[2].hours===0&&other({method:'GET',path:'/api/tasks'}).body.length===2;})())&&(()=>{const api=createApi([{id:1,name:'A',hours:2,version:2}]),conflicts=[null,undefined,false,0,'x',[],{}, {version:1,hours:-1},{version:'2',hours:0},{version:2.5,hours:0}];for(const body of conflicts){if(api({method:'PATCH',path:'/api/tasks/1',body}).status!==409||api({method:'PATCH',path:'/api/tasks/99',body}).status!==404)return false;}for(const hours of [-1,1001,1.5,NaN,Infinity,'2',undefined])if(api({method:'PATCH',path:'/api/tasks/1',body:{version:2,hours}}).status!==400)return false;return api({method:'GET',path:'/api/tasks'}).body[0].version===2;})())", "expected": true},{"call": "(((((()=>{const value=Object.freeze({name:' '.repeat(9900)+'A'+' '.repeat(9900),hours:1000}),a=normalizeInput(value),b=normalizeInput(Object.freeze({name:'\ud83d\ude00'.repeat(40),hours:-0}));return a.name==='A'&&a.hours===1000&&b.name.length===80&&b.hours===0&&normalizeInput({name:'\ud83d\ude00'.repeat(41),hours:0})===null&&normalizeInput({name:'x'.repeat(20000),hours:0})===null;})()&&(()=>{const input=Object.freeze({name:' '.repeat(9960)+'\ud83e\udd88'.repeat(40)+' '.repeat(9960),hours:1000});for(let i=0;i<1000;i++){const out=normalizeInput(input);if(!out||out.name!=='\ud83e\udd88'.repeat(40)||out.hours!==1000)return false;}return normalizeInput({name:'x'.repeat(20000),hours:1})===null;})())&&(()=>{let item={id:1,name:'Exact  Name',hours:0,version:1};for(let i=0;i<1000;i++){const before=item,next=updateItem(item,Object.freeze({version:item.version,hours:i%1001}));if(!next||next===before||next.version!==before.version+1||next.name!=='Exact  Name'||before.version!==i+1)return false;item=next;}return item.version===1001&&item.hours===999;})())&&(()=>{const seed=Object.freeze(Array.from({length:10000},(_,i)=>Object.freeze({id:10000-i,name:'N'+i,hours:i%1001,version:1}))),api=createApi(seed);const listed=api({method:'GET',path:'/api/tasks'});if(listed.status!==200||listed.body.length!==10000||listed.body[0].id!==10000||listed.body[9999].id!==1)return false;listed.body[0].hours=999;return api({method:'GET',path:'/api/tasks'}).body[0].hours===0&&seed[0].hours===0;})())&&(()=>{const api=createApi([{id:1,name:'A',hours:2,version:1},{id:99,name:'B',hours:0,version:1}]);for(const suffix of ['01','0','-1','1.0','+1','1/','1?x','1\\n','1x',' 1','1/extra'])if(api({method:'DELETE',path:'/api/tasks/'+suffix}).status!==404)return false;for(let i=0;i<1000;i++){const result=api({method:'PATCH',path:'/api/tasks/1',body:{version:i+1,hours:2}});if(result.status!==200||result.body.version!==i+2)return false;result.body.version=0;}if(api({method:'DELETE',path:'/api/tasks/99'}).status!==200)return false;const created=api({method:'POST',path:'/api/tasks',body:{name:'C',hours:1}});return created.body.id===100&&api({method:'GET',path:'/api/tasks'}).body.map(x=>x.id).join(',')==='1,100';})())", "expected": true}];

FULLSTACK_SOLUTIONS["ts-fullstack-stockroom-2"].hiddenTests = [...(FULLSTACK_SOLUTIONS["ts-fullstack-stockroom-2"].hiddenTests ?? []), {"call": "(((()=>{const whites=['',' ','\\t','\\n','\\r','\\u00a0','\\ufeff','\\u2003','\\u2028','\\u2029'],names=[['A','A'],['a  b','a  b'],['\u00e9','\u00e9'],['e\\u0301','e\\u0301'],['__proto__','__proto__'],['\\u200b','\\u200b'],['\ud83d\ude00'.repeat(40),'\ud83d\ude00'.repeat(40)],['x'.repeat(80),'x'.repeat(80)],['x'.repeat(81),null],['',null]],numbers=[0,-0,1,999,1000,-1,1001,0.5,NaN,Infinity,-Infinity,'2',null,undefined,1n,new Number(1)];for(const ws of whites)for(const[raw,expectedName]of names)for(const number of numbers){const a=normalizeInput({name:ws+raw+ws,stock:number,extra:1}),valid=expectedName!==null&&typeof number==='number'&&Number.isFinite(number)&&Math.trunc(number)===number&&number>=0&&number<=1000;if(!valid){if(a!==null)return false;}else if(!a||a.name!==expectedName||a.stock!==number||Object.keys(a).length!==2)return false;}return true;})()&&(()=>{const names=['\u00e9','e\\u0301','A  B','\ud83e\udd88'.repeat(40),'x'.repeat(80),'x'.repeat(81)],amounts=[0,-0,1,1000,-1,1001,1.5,NaN,Infinity,'2',null,undefined];for(const name of names)for(const amount of amounts){const out=normalizeInput(Object.freeze({name,stock:amount})),okay=name.length<=80&&typeof amount==='number'&&Number.isInteger(amount)&&amount>=0&&amount<=1000;if(!okay){if(out!==null)return false;}else if(!out||out.name!==name||out.stock!==amount||Object.keys(out).length!==2)return false;}return true;})())&&(()=>{const amounts=[0,-0,1,1000,-1,1001,1.5,NaN,Infinity,'2',null,undefined],versions=[1,2,17,1000000];for(const version of versions)for(const amount of amounts)for(const incoming of [version,version+1,version-1,'1',null,undefined,1.5,NaN]){const item=Object.freeze({id:17,name:'e\\u0301',stock:2,version}),patch=Object.freeze({version:incoming,stock:amount}),out=updateItem(item,patch),okay=typeof incoming==='number'&&Number.isInteger(incoming)&&incoming===version&&typeof amount==='number'&&Number.isInteger(amount)&&amount>=0&&amount<=1000;if(!okay){if(out!==null)return false;}else if(!out||out===item||out.id!==17||out.name!==item.name||out.stock!==amount||out.version!==version+1||Object.isFrozen(out))return false;if(item.stock!==2||item.version!==version)return false;}return true;})())", "expected": true},{"call": "(((()=>{const values=[Object.freeze({name:' A ',stock:0,extra:1}),Object.freeze(Object.create({name:' A ',stock:0})),Object.freeze(Object.assign(Object.create(null),{name:' A ',stock:0}))];for(const value of values){const a=normalizeInput(value),b=normalizeInput(value);if(!a||!b||a===b||a===value||a.name!=='A'||a.stock!==0||Object.keys(a).length!==2)return false;a.name='changed';a.stock=99;a.extra=1;if(b.name!=='A'||b.stock!==0||normalizeInput(value).name!=='A')return false;}const v={name:'A',stock:1};Object.defineProperty(v,'ignored',{get(){throw Error('ignored field read');},enumerable:true});if(normalizeInput(v).stock!==1)return false;const a=[];a.name='A';a.stock=1;const f=()=>0;f.name;return [a,f,undefined,null,true,2,'text',Symbol('x'),1n,{},new String('A'),{name:new String('A'),stock:1}].every(value=>normalizeInput(value)===null);})()&&(()=>{const source=Object.create({name:' e\\u0301 ',stock:0});Object.defineProperty(source,'ignored',{get(){throw Error('read extra');},enumerable:true});Object.freeze(source);const a=normalizeInput(source),b=normalizeInput(source);if(!a||!b||a===b||a.name!=='e\\u0301'||Object.isFrozen(a))return false;a.name='caller';a.stock=9;return b.name==='e\\u0301'&&b.stock===0&&normalizeInput(source).stock===0;})())&&(()=>{const item=Object.freeze({id:1,name:'Same',stock:2,version:1}),patch=Object.create({version:1,stock:2});Object.defineProperty(patch,'ignored',{get(){throw Error('read extra');},enumerable:true});Object.freeze(patch);const a=updateItem(item,patch),b=updateItem(item,patch);if(!a||!b||a===b||a===item||a.version!==2||a.stock!==2)return false;a.name='caller';a.id=99;a.version=99;return b.name==='Same'&&b.id===1&&b.version===2&&item.version===1;})())", "expected": true},{"call": "(((()=>{const value=Object.freeze({name:' '.repeat(9900)+'A'+' '.repeat(9900),stock:1000}),a=normalizeInput(value),b=normalizeInput(Object.freeze({name:'\ud83d\ude00'.repeat(40),stock:-0}));return a.name==='A'&&a.stock===1000&&b.name.length===80&&b.stock===0&&normalizeInput({name:'\ud83d\ude00'.repeat(41),stock:0})===null&&normalizeInput({name:'x'.repeat(20000),stock:0})===null;})()&&(()=>{const input=Object.freeze({name:' '.repeat(9960)+'\ud83e\udd88'.repeat(40)+' '.repeat(9960),stock:1000});for(let i=0;i<1000;i++){const out=normalizeInput(input);if(!out||out.name!=='\ud83e\udd88'.repeat(40)||out.stock!==1000)return false;}return normalizeInput({name:'x'.repeat(20000),stock:1})===null;})())&&(()=>{let item={id:1,name:'Exact  Name',stock:0,version:1};for(let i=0;i<1000;i++){const before=item,next=updateItem(item,Object.freeze({version:item.version,stock:i%1001}));if(!next||next===before||next.version!==before.version+1||next.name!=='Exact  Name'||before.version!==i+1)return false;item=next;}return item.version===1001&&item.stock===999;})())", "expected": true}];

FULLSTACK_SOLUTIONS["ts-fullstack-stockroom-3"].hiddenTests = [...(FULLSTACK_SOLUTIONS["ts-fullstack-stockroom-3"].hiddenTests ?? []), {"call": "((((()=>{const whites=['',' ','\\t','\\n','\\r','\\u00a0','\\ufeff','\\u2003','\\u2028','\\u2029'],names=[['A','A'],['a  b','a  b'],['\u00e9','\u00e9'],['e\\u0301','e\\u0301'],['__proto__','__proto__'],['\\u200b','\\u200b'],['\ud83d\ude00'.repeat(40),'\ud83d\ude00'.repeat(40)],['x'.repeat(80),'x'.repeat(80)],['x'.repeat(81),null],['',null]],numbers=[0,-0,1,999,1000,-1,1001,0.5,NaN,Infinity,-Infinity,'2',null,undefined,1n,new Number(1)];for(const ws of whites)for(const[raw,expectedName]of names)for(const number of numbers){const a=normalizeInput({name:ws+raw+ws,stock:number,extra:1}),valid=expectedName!==null&&typeof number==='number'&&Number.isFinite(number)&&Math.trunc(number)===number&&number>=0&&number<=1000;if(!valid){if(a!==null)return false;}else if(!a||a.name!==expectedName||a.stock!==number||Object.keys(a).length!==2)return false;}return true;})()&&(()=>{const names=['\u00e9','e\\u0301','A  B','\ud83e\udd88'.repeat(40),'x'.repeat(80),'x'.repeat(81)],amounts=[0,-0,1,1000,-1,1001,1.5,NaN,Infinity,'2',null,undefined];for(const name of names)for(const amount of amounts){const out=normalizeInput(Object.freeze({name,stock:amount})),okay=name.length<=80&&typeof amount==='number'&&Number.isInteger(amount)&&amount>=0&&amount<=1000;if(!okay){if(out!==null)return false;}else if(!out||out.name!==name||out.stock!==amount||Object.keys(out).length!==2)return false;}return true;})())&&(()=>{const amounts=[0,-0,1,1000,-1,1001,1.5,NaN,Infinity,'2',null,undefined],versions=[1,2,17,1000000];for(const version of versions)for(const amount of amounts)for(const incoming of [version,version+1,version-1,'1',null,undefined,1.5,NaN]){const item=Object.freeze({id:17,name:'e\\u0301',stock:2,version}),patch=Object.freeze({version:incoming,stock:amount}),out=updateItem(item,patch),okay=typeof incoming==='number'&&Number.isInteger(incoming)&&incoming===version&&typeof amount==='number'&&Number.isInteger(amount)&&amount>=0&&amount<=1000;if(!okay){if(out!==null)return false;}else if(!out||out===item||out.id!==17||out.name!==item.name||out.stock!==amount||out.version!==version+1||Object.isFrozen(out))return false;if(item.stock!==2||item.version!==version)return false;}return true;})())&&(()=>{const stable=v=>JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a<b?-1:a>b?1:0)):x); for(let seed=0;seed<16;seed++){let rows=[{id:100+seed,name:'First',stock:2,version:1},{id:1,name:'Second',stock:0,version:2}],last=100+seed;const api=createApi(rows),other=createApi([]);for(let step=0;step<96;step++){const op=(step*7+seed)%4,id=rows.length?rows[step%rows.length].id:1;let request,expected;if(op===0){request={method:'GET',path:'/api/products'};expected={status:200,body:rows.map(x=>({...x}))};}else if(op===1){request={method:'POST',path:'/api/products',body:{name:'  e\\u0301  ',stock:step%1001}};const value={id:++last,name:'e\\u0301',stock:step%1001,version:1};rows.push(value);expected={status:201,body:{...value}};}else if(op===2){request={method:'POST',path:'/api/products',body:{name:'',stock:0}};expected={status:400,body:{error:'invalid'}};}else if(op===3){request={method:'PUT',path:'/api/products/'+id};expected={status:404,body:{error:'not_found'}};} if(stable(api(request))!==stable(expected)||stable(api({method:'GET',path:'/api/products'}).body)!==stable(rows)||other({method:'GET',path:'/api/products'}).body.length)return false;}}return true;})())", "expected": true},{"call": "((((()=>{const values=[Object.freeze({name:' A ',stock:0,extra:1}),Object.freeze(Object.create({name:' A ',stock:0})),Object.freeze(Object.assign(Object.create(null),{name:' A ',stock:0}))];for(const value of values){const a=normalizeInput(value),b=normalizeInput(value);if(!a||!b||a===b||a===value||a.name!=='A'||a.stock!==0||Object.keys(a).length!==2)return false;a.name='changed';a.stock=99;a.extra=1;if(b.name!=='A'||b.stock!==0||normalizeInput(value).name!=='A')return false;}const v={name:'A',stock:1};Object.defineProperty(v,'ignored',{get(){throw Error('ignored field read');},enumerable:true});if(normalizeInput(v).stock!==1)return false;const a=[];a.name='A';a.stock=1;const f=()=>0;f.name;return [a,f,undefined,null,true,2,'text',Symbol('x'),1n,{},new String('A'),{name:new String('A'),stock:1}].every(value=>normalizeInput(value)===null);})()&&(()=>{const source=Object.create({name:' e\\u0301 ',stock:0});Object.defineProperty(source,'ignored',{get(){throw Error('read extra');},enumerable:true});Object.freeze(source);const a=normalizeInput(source),b=normalizeInput(source);if(!a||!b||a===b||a.name!=='e\\u0301'||Object.isFrozen(a))return false;a.name='caller';a.stock=9;return b.name==='e\\u0301'&&b.stock===0&&normalizeInput(source).stock===0;})())&&(()=>{const item=Object.freeze({id:1,name:'Same',stock:2,version:1}),patch=Object.create({version:1,stock:2});Object.defineProperty(patch,'ignored',{get(){throw Error('read extra');},enumerable:true});Object.freeze(patch);const a=updateItem(item,patch),b=updateItem(item,patch);if(!a||!b||a===b||a===item||a.version!==2||a.stock!==2)return false;a.name='caller';a.id=99;a.version=99;return b.name==='Same'&&b.id===1&&b.version===2&&item.version===1;})())&&(()=>{const seed=[{id:99,name:'High',stock:2,version:1},{id:1,name:'Low',stock:1,version:1}],api=createApi(seed),other=createApi(seed);seed[0].name='changed';seed[0].id=1000;seed[0].version=99;seed.push({id:500,name:'Added',stock:1,version:1});const created=api({method:'POST',path:'/api/products',body:{name:'New',stock:0}});if(created.status!==201||created.body.id!==100||created.body.version!==1)return false;created.body.id=500;created.body.stock=9;const first=api({method:'GET',path:'/api/products'});if(first.body.map(x=>x.id).join(',')!=='99,1,100'||first.body[0].name!=='High')return false;first.body[0].name='caller';first.body.pop();const next=api({method:'GET',path:'/api/products'});return next.body.length===3&&next.body[0].name==='High'&&next.body[2].stock===0&&other({method:'GET',path:'/api/products'}).body.length===2;})())", "expected": true},{"call": "((((()=>{const value=Object.freeze({name:' '.repeat(9900)+'A'+' '.repeat(9900),stock:1000}),a=normalizeInput(value),b=normalizeInput(Object.freeze({name:'\ud83d\ude00'.repeat(40),stock:-0}));return a.name==='A'&&a.stock===1000&&b.name.length===80&&b.stock===0&&normalizeInput({name:'\ud83d\ude00'.repeat(41),stock:0})===null&&normalizeInput({name:'x'.repeat(20000),stock:0})===null;})()&&(()=>{const input=Object.freeze({name:' '.repeat(9960)+'\ud83e\udd88'.repeat(40)+' '.repeat(9960),stock:1000});for(let i=0;i<1000;i++){const out=normalizeInput(input);if(!out||out.name!=='\ud83e\udd88'.repeat(40)||out.stock!==1000)return false;}return normalizeInput({name:'x'.repeat(20000),stock:1})===null;})())&&(()=>{let item={id:1,name:'Exact  Name',stock:0,version:1};for(let i=0;i<1000;i++){const before=item,next=updateItem(item,Object.freeze({version:item.version,stock:i%1001}));if(!next||next===before||next.version!==before.version+1||next.name!=='Exact  Name'||before.version!==i+1)return false;item=next;}return item.version===1001&&item.stock===999;})())&&(()=>{const seed=Object.freeze(Array.from({length:10000},(_,i)=>Object.freeze({id:10000-i,name:'N'+i,stock:i%1001,version:1}))),api=createApi(seed);const listed=api({method:'GET',path:'/api/products'});if(listed.status!==200||listed.body.length!==10000||listed.body[0].id!==10000||listed.body[9999].id!==1)return false;listed.body[0].stock=999;return api({method:'GET',path:'/api/products'}).body[0].stock===0&&seed[0].stock===0;})())", "expected": true}];

FULLSTACK_SOLUTIONS["ts-fullstack-stockroom-4"].hiddenTests = [...(FULLSTACK_SOLUTIONS["ts-fullstack-stockroom-4"].hiddenTests ?? []), {"call": "(((((()=>{const whites=['',' ','\\t','\\n','\\r','\\u00a0','\\ufeff','\\u2003','\\u2028','\\u2029'],names=[['A','A'],['a  b','a  b'],['\u00e9','\u00e9'],['e\\u0301','e\\u0301'],['__proto__','__proto__'],['\\u200b','\\u200b'],['\ud83d\ude00'.repeat(40),'\ud83d\ude00'.repeat(40)],['x'.repeat(80),'x'.repeat(80)],['x'.repeat(81),null],['',null]],numbers=[0,-0,1,999,1000,-1,1001,0.5,NaN,Infinity,-Infinity,'2',null,undefined,1n,new Number(1)];for(const ws of whites)for(const[raw,expectedName]of names)for(const number of numbers){const a=normalizeInput({name:ws+raw+ws,stock:number,extra:1}),valid=expectedName!==null&&typeof number==='number'&&Number.isFinite(number)&&Math.trunc(number)===number&&number>=0&&number<=1000;if(!valid){if(a!==null)return false;}else if(!a||a.name!==expectedName||a.stock!==number||Object.keys(a).length!==2)return false;}return true;})()&&(()=>{const names=['\u00e9','e\\u0301','A  B','\ud83e\udd88'.repeat(40),'x'.repeat(80),'x'.repeat(81)],amounts=[0,-0,1,1000,-1,1001,1.5,NaN,Infinity,'2',null,undefined];for(const name of names)for(const amount of amounts){const out=normalizeInput(Object.freeze({name,stock:amount})),okay=name.length<=80&&typeof amount==='number'&&Number.isInteger(amount)&&amount>=0&&amount<=1000;if(!okay){if(out!==null)return false;}else if(!out||out.name!==name||out.stock!==amount||Object.keys(out).length!==2)return false;}return true;})())&&(()=>{const amounts=[0,-0,1,1000,-1,1001,1.5,NaN,Infinity,'2',null,undefined],versions=[1,2,17,1000000];for(const version of versions)for(const amount of amounts)for(const incoming of [version,version+1,version-1,'1',null,undefined,1.5,NaN]){const item=Object.freeze({id:17,name:'e\\u0301',stock:2,version}),patch=Object.freeze({version:incoming,stock:amount}),out=updateItem(item,patch),okay=typeof incoming==='number'&&Number.isInteger(incoming)&&incoming===version&&typeof amount==='number'&&Number.isInteger(amount)&&amount>=0&&amount<=1000;if(!okay){if(out!==null)return false;}else if(!out||out===item||out.id!==17||out.name!==item.name||out.stock!==amount||out.version!==version+1||Object.isFrozen(out))return false;if(item.stock!==2||item.version!==version)return false;}return true;})())&&(()=>{const stable=v=>JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a<b?-1:a>b?1:0)):x); for(let seed=0;seed<16;seed++){let rows=[{id:100+seed,name:'First',stock:2,version:1},{id:1,name:'Second',stock:0,version:2}],last=100+seed;const api=createApi(rows),other=createApi([]);for(let step=0;step<96;step++){const op=(step*7+seed)%4,id=rows.length?rows[step%rows.length].id:1;let request,expected;if(op===0){request={method:'GET',path:'/api/products'};expected={status:200,body:rows.map(x=>({...x}))};}else if(op===1){request={method:'POST',path:'/api/products',body:{name:'  e\\u0301  ',stock:step%1001}};const value={id:++last,name:'e\\u0301',stock:step%1001,version:1};rows.push(value);expected={status:201,body:{...value}};}else if(op===2){request={method:'POST',path:'/api/products',body:{name:'',stock:0}};expected={status:400,body:{error:'invalid'}};}else if(op===3){request={method:'PUT',path:'/api/products/'+id};expected={status:404,body:{error:'not_found'}};} if(stable(api(request))!==stable(expected)||stable(api({method:'GET',path:'/api/products'}).body)!==stable(rows)||other({method:'GET',path:'/api/products'}).body.length)return false;}}return true;})())&&(()=>{const stable=v=>JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a<b?-1:a>b?1:0)):x); for(let seed=0;seed<16;seed++){let rows=[{id:100+seed,name:'First',stock:2,version:1},{id:1,name:'Second',stock:0,version:2}],last=100+seed;const api=createApi(rows),other=createApi([]);for(let step=0;step<96;step++){const op=(step*7+seed)%8,id=rows.length?rows[step%rows.length].id:1;let request,expected;if(op===0){request={method:'GET',path:'/api/products'};expected={status:200,body:rows.map(x=>({...x}))};}else if(op===1){request={method:'POST',path:'/api/products',body:{name:'  e\\u0301  ',stock:step%1001}};const value={id:++last,name:'e\\u0301',stock:step%1001,version:1};rows.push(value);expected={status:201,body:{...value}};}else if(op===2){request={method:'POST',path:'/api/products',body:{name:'',stock:0}};expected={status:400,body:{error:'invalid'}};}else if(op===3){request={method:'PUT',path:'/api/products/'+id};expected={status:404,body:{error:'not_found'}};}else if(op===4){request={method:'DELETE',path:'/api/products/'+id};const index=rows.findIndex(x=>x.id===id);if(index<0)expected={status:404,body:{error:'not_found'}};else{rows.splice(index,1);expected={status:200,body:{deleted:id}};}}else{const row=rows.find(x=>x.id===id),version=row?row.version:1;request={method:'PATCH',path:'/api/products/'+id,body:{version:op===6?version+1:version,stock:op===7||op===6?-1:step%1001}};if(!row)expected={status:404,body:{error:'not_found'}};else if(op===6)expected={status:409,body:{error:'conflict'}};else if(op===7)expected={status:400,body:{error:'invalid'}};else{row.stock=step%1001;row.version++;expected={status:200,body:{...row}};}} if(stable(api(request))!==stable(expected)||stable(api({method:'GET',path:'/api/products'}).body)!==stable(rows)||other({method:'GET',path:'/api/products'}).body.length)return false;}}return true;})())", "expected": true},{"call": "(((((()=>{const values=[Object.freeze({name:' A ',stock:0,extra:1}),Object.freeze(Object.create({name:' A ',stock:0})),Object.freeze(Object.assign(Object.create(null),{name:' A ',stock:0}))];for(const value of values){const a=normalizeInput(value),b=normalizeInput(value);if(!a||!b||a===b||a===value||a.name!=='A'||a.stock!==0||Object.keys(a).length!==2)return false;a.name='changed';a.stock=99;a.extra=1;if(b.name!=='A'||b.stock!==0||normalizeInput(value).name!=='A')return false;}const v={name:'A',stock:1};Object.defineProperty(v,'ignored',{get(){throw Error('ignored field read');},enumerable:true});if(normalizeInput(v).stock!==1)return false;const a=[];a.name='A';a.stock=1;const f=()=>0;f.name;return [a,f,undefined,null,true,2,'text',Symbol('x'),1n,{},new String('A'),{name:new String('A'),stock:1}].every(value=>normalizeInput(value)===null);})()&&(()=>{const source=Object.create({name:' e\\u0301 ',stock:0});Object.defineProperty(source,'ignored',{get(){throw Error('read extra');},enumerable:true});Object.freeze(source);const a=normalizeInput(source),b=normalizeInput(source);if(!a||!b||a===b||a.name!=='e\\u0301'||Object.isFrozen(a))return false;a.name='caller';a.stock=9;return b.name==='e\\u0301'&&b.stock===0&&normalizeInput(source).stock===0;})())&&(()=>{const item=Object.freeze({id:1,name:'Same',stock:2,version:1}),patch=Object.create({version:1,stock:2});Object.defineProperty(patch,'ignored',{get(){throw Error('read extra');},enumerable:true});Object.freeze(patch);const a=updateItem(item,patch),b=updateItem(item,patch);if(!a||!b||a===b||a===item||a.version!==2||a.stock!==2)return false;a.name='caller';a.id=99;a.version=99;return b.name==='Same'&&b.id===1&&b.version===2&&item.version===1;})())&&(()=>{const seed=[{id:99,name:'High',stock:2,version:1},{id:1,name:'Low',stock:1,version:1}],api=createApi(seed),other=createApi(seed);seed[0].name='changed';seed[0].id=1000;seed[0].version=99;seed.push({id:500,name:'Added',stock:1,version:1});const created=api({method:'POST',path:'/api/products',body:{name:'New',stock:0}});if(created.status!==201||created.body.id!==100||created.body.version!==1)return false;created.body.id=500;created.body.stock=9;const first=api({method:'GET',path:'/api/products'});if(first.body.map(x=>x.id).join(',')!=='99,1,100'||first.body[0].name!=='High')return false;first.body[0].name='caller';first.body.pop();const next=api({method:'GET',path:'/api/products'});return next.body.length===3&&next.body[0].name==='High'&&next.body[2].stock===0&&other({method:'GET',path:'/api/products'}).body.length===2;})())&&(()=>{const api=createApi([{id:1,name:'A',stock:2,version:2}]),conflicts=[null,undefined,false,0,'x',[],{}, {version:1,stock:-1},{version:'2',stock:0},{version:2.5,stock:0}];for(const body of conflicts){if(api({method:'PATCH',path:'/api/products/1',body}).status!==409||api({method:'PATCH',path:'/api/products/99',body}).status!==404)return false;}for(const stock of [-1,1001,1.5,NaN,Infinity,'2',undefined])if(api({method:'PATCH',path:'/api/products/1',body:{version:2,stock}}).status!==400)return false;return api({method:'GET',path:'/api/products'}).body[0].version===2;})())", "expected": true},{"call": "(((((()=>{const value=Object.freeze({name:' '.repeat(9900)+'A'+' '.repeat(9900),stock:1000}),a=normalizeInput(value),b=normalizeInput(Object.freeze({name:'\ud83d\ude00'.repeat(40),stock:-0}));return a.name==='A'&&a.stock===1000&&b.name.length===80&&b.stock===0&&normalizeInput({name:'\ud83d\ude00'.repeat(41),stock:0})===null&&normalizeInput({name:'x'.repeat(20000),stock:0})===null;})()&&(()=>{const input=Object.freeze({name:' '.repeat(9960)+'\ud83e\udd88'.repeat(40)+' '.repeat(9960),stock:1000});for(let i=0;i<1000;i++){const out=normalizeInput(input);if(!out||out.name!=='\ud83e\udd88'.repeat(40)||out.stock!==1000)return false;}return normalizeInput({name:'x'.repeat(20000),stock:1})===null;})())&&(()=>{let item={id:1,name:'Exact  Name',stock:0,version:1};for(let i=0;i<1000;i++){const before=item,next=updateItem(item,Object.freeze({version:item.version,stock:i%1001}));if(!next||next===before||next.version!==before.version+1||next.name!=='Exact  Name'||before.version!==i+1)return false;item=next;}return item.version===1001&&item.stock===999;})())&&(()=>{const seed=Object.freeze(Array.from({length:10000},(_,i)=>Object.freeze({id:10000-i,name:'N'+i,stock:i%1001,version:1}))),api=createApi(seed);const listed=api({method:'GET',path:'/api/products'});if(listed.status!==200||listed.body.length!==10000||listed.body[0].id!==10000||listed.body[9999].id!==1)return false;listed.body[0].stock=999;return api({method:'GET',path:'/api/products'}).body[0].stock===0&&seed[0].stock===0;})())&&(()=>{const api=createApi([{id:1,name:'A',stock:2,version:1},{id:99,name:'B',stock:0,version:1}]);for(const suffix of ['01','0','-1','1.0','+1','1/','1?x','1\\n','1x',' 1','1/extra'])if(api({method:'DELETE',path:'/api/products/'+suffix}).status!==404)return false;for(let i=0;i<1000;i++){const result=api({method:'PATCH',path:'/api/products/1',body:{version:i+1,stock:2}});if(result.status!==200||result.body.version!==i+2)return false;result.body.version=0;}if(api({method:'DELETE',path:'/api/products/99'}).status!==200)return false;const created=api({method:'POST',path:'/api/products',body:{name:'C',stock:1}});return created.body.id===100&&api({method:'GET',path:'/api/products'}).body.map(x=>x.id).join(',')==='1,100';})())", "expected": true}];

FULLSTACK_SOLUTIONS["ts-fullstack-workshops-2-start"].hiddenTests = [...(FULLSTACK_SOLUTIONS["ts-fullstack-workshops-2-start"].hiddenTests ?? []), {"call": "((()=>{const whites=['',' ','\\t','\\n','\\r','\\u00a0','\\ufeff','\\u2003','\\u2028','\\u2029'],names=[['A','A'],['a  b','a  b'],['\u00e9','\u00e9'],['e\\u0301','e\\u0301'],['__proto__','__proto__'],['\\u200b','\\u200b'],['\ud83d\ude00'.repeat(40),'\ud83d\ude00'.repeat(40)],['x'.repeat(80),'x'.repeat(80)],['x'.repeat(81),null],['',null]],numbers=[0,-0,1,999,1000,-1,1001,0.5,NaN,Infinity,-Infinity,'2',null,undefined,1n,new Number(1)];for(const ws of whites)for(const[raw,expectedName]of names)for(const number of numbers){const a=normalizeInput({name:ws+raw+ws,seats:number,extra:1}),valid=expectedName!==null&&typeof number==='number'&&Number.isFinite(number)&&Math.trunc(number)===number&&number>=0&&number<=1000;if(!valid){if(a!==null)return false;}else if(!a||a.name!==expectedName||a.seats!==number||Object.keys(a).length!==2)return false;}return true;})()&&(()=>{const names=['\u00e9','e\\u0301','A  B','\ud83e\udd88'.repeat(40),'x'.repeat(80),'x'.repeat(81)],amounts=[0,-0,1,1000,-1,1001,1.5,NaN,Infinity,'2',null,undefined];for(const name of names)for(const amount of amounts){const out=normalizeInput(Object.freeze({name,seats:amount})),okay=name.length<=80&&typeof amount==='number'&&Number.isInteger(amount)&&amount>=0&&amount<=1000;if(!okay){if(out!==null)return false;}else if(!out||out.name!==name||out.seats!==amount||Object.keys(out).length!==2)return false;}return true;})())", "expected": true},{"call": "((()=>{const values=[Object.freeze({name:' A ',seats:0,extra:1}),Object.freeze(Object.create({name:' A ',seats:0})),Object.freeze(Object.assign(Object.create(null),{name:' A ',seats:0}))];for(const value of values){const a=normalizeInput(value),b=normalizeInput(value);if(!a||!b||a===b||a===value||a.name!=='A'||a.seats!==0||Object.keys(a).length!==2)return false;a.name='changed';a.seats=99;a.extra=1;if(b.name!=='A'||b.seats!==0||normalizeInput(value).name!=='A')return false;}const v={name:'A',seats:1};Object.defineProperty(v,'ignored',{get(){throw Error('ignored field read');},enumerable:true});if(normalizeInput(v).seats!==1)return false;const a=[];a.name='A';a.seats=1;const f=()=>0;f.name;return [a,f,undefined,null,true,2,'text',Symbol('x'),1n,{},new String('A'),{name:new String('A'),seats:1}].every(value=>normalizeInput(value)===null);})()&&(()=>{const source=Object.create({name:' e\\u0301 ',seats:0});Object.defineProperty(source,'ignored',{get(){throw Error('read extra');},enumerable:true});Object.freeze(source);const a=normalizeInput(source),b=normalizeInput(source);if(!a||!b||a===b||a.name!=='e\\u0301'||Object.isFrozen(a))return false;a.name='caller';a.seats=9;return b.name==='e\\u0301'&&b.seats===0&&normalizeInput(source).seats===0;})())", "expected": true},{"call": "((()=>{const value=Object.freeze({name:' '.repeat(9900)+'A'+' '.repeat(9900),seats:1000}),a=normalizeInput(value),b=normalizeInput(Object.freeze({name:'\ud83d\ude00'.repeat(40),seats:-0}));return a.name==='A'&&a.seats===1000&&b.name.length===80&&b.seats===0&&normalizeInput({name:'\ud83d\ude00'.repeat(41),seats:0})===null&&normalizeInput({name:'x'.repeat(20000),seats:0})===null;})()&&(()=>{const input=Object.freeze({name:' '.repeat(9960)+'\ud83e\udd88'.repeat(40)+' '.repeat(9960),seats:1000});for(let i=0;i<1000;i++){const out=normalizeInput(input);if(!out||out.name!=='\ud83e\udd88'.repeat(40)||out.seats!==1000)return false;}return normalizeInput({name:'x'.repeat(20000),seats:1})===null;})())", "expected": true}];

FULLSTACK_SOLUTIONS["ts-fullstack-workshops-2"].hiddenTests = [...(FULLSTACK_SOLUTIONS["ts-fullstack-workshops-2"].hiddenTests ?? []), {"call": "(((()=>{const whites=['',' ','\\t','\\n','\\r','\\u00a0','\\ufeff','\\u2003','\\u2028','\\u2029'],names=[['A','A'],['a  b','a  b'],['\u00e9','\u00e9'],['e\\u0301','e\\u0301'],['__proto__','__proto__'],['\\u200b','\\u200b'],['\ud83d\ude00'.repeat(40),'\ud83d\ude00'.repeat(40)],['x'.repeat(80),'x'.repeat(80)],['x'.repeat(81),null],['',null]],numbers=[0,-0,1,999,1000,-1,1001,0.5,NaN,Infinity,-Infinity,'2',null,undefined,1n,new Number(1)];for(const ws of whites)for(const[raw,expectedName]of names)for(const number of numbers){const a=normalizeInput({name:ws+raw+ws,seats:number,extra:1}),valid=expectedName!==null&&typeof number==='number'&&Number.isFinite(number)&&Math.trunc(number)===number&&number>=0&&number<=1000;if(!valid){if(a!==null)return false;}else if(!a||a.name!==expectedName||a.seats!==number||Object.keys(a).length!==2)return false;}return true;})()&&(()=>{const names=['\u00e9','e\\u0301','A  B','\ud83e\udd88'.repeat(40),'x'.repeat(80),'x'.repeat(81)],amounts=[0,-0,1,1000,-1,1001,1.5,NaN,Infinity,'2',null,undefined];for(const name of names)for(const amount of amounts){const out=normalizeInput(Object.freeze({name,seats:amount})),okay=name.length<=80&&typeof amount==='number'&&Number.isInteger(amount)&&amount>=0&&amount<=1000;if(!okay){if(out!==null)return false;}else if(!out||out.name!==name||out.seats!==amount||Object.keys(out).length!==2)return false;}return true;})())&&(()=>{const amounts=[0,-0,1,1000,-1,1001,1.5,NaN,Infinity,'2',null,undefined],versions=[1,2,17,1000000];for(const version of versions)for(const amount of amounts)for(const incoming of [version,version+1,version-1,'1',null,undefined,1.5,NaN]){const item=Object.freeze({id:17,name:'e\\u0301',seats:2,version}),patch=Object.freeze({version:incoming,seats:amount}),out=updateItem(item,patch),okay=typeof incoming==='number'&&Number.isInteger(incoming)&&incoming===version&&typeof amount==='number'&&Number.isInteger(amount)&&amount>=0&&amount<=1000;if(!okay){if(out!==null)return false;}else if(!out||out===item||out.id!==17||out.name!==item.name||out.seats!==amount||out.version!==version+1||Object.isFrozen(out))return false;if(item.seats!==2||item.version!==version)return false;}return true;})())", "expected": true},{"call": "(((()=>{const values=[Object.freeze({name:' A ',seats:0,extra:1}),Object.freeze(Object.create({name:' A ',seats:0})),Object.freeze(Object.assign(Object.create(null),{name:' A ',seats:0}))];for(const value of values){const a=normalizeInput(value),b=normalizeInput(value);if(!a||!b||a===b||a===value||a.name!=='A'||a.seats!==0||Object.keys(a).length!==2)return false;a.name='changed';a.seats=99;a.extra=1;if(b.name!=='A'||b.seats!==0||normalizeInput(value).name!=='A')return false;}const v={name:'A',seats:1};Object.defineProperty(v,'ignored',{get(){throw Error('ignored field read');},enumerable:true});if(normalizeInput(v).seats!==1)return false;const a=[];a.name='A';a.seats=1;const f=()=>0;f.name;return [a,f,undefined,null,true,2,'text',Symbol('x'),1n,{},new String('A'),{name:new String('A'),seats:1}].every(value=>normalizeInput(value)===null);})()&&(()=>{const source=Object.create({name:' e\\u0301 ',seats:0});Object.defineProperty(source,'ignored',{get(){throw Error('read extra');},enumerable:true});Object.freeze(source);const a=normalizeInput(source),b=normalizeInput(source);if(!a||!b||a===b||a.name!=='e\\u0301'||Object.isFrozen(a))return false;a.name='caller';a.seats=9;return b.name==='e\\u0301'&&b.seats===0&&normalizeInput(source).seats===0;})())&&(()=>{const item=Object.freeze({id:1,name:'Same',seats:2,version:1}),patch=Object.create({version:1,seats:2});Object.defineProperty(patch,'ignored',{get(){throw Error('read extra');},enumerable:true});Object.freeze(patch);const a=updateItem(item,patch),b=updateItem(item,patch);if(!a||!b||a===b||a===item||a.version!==2||a.seats!==2)return false;a.name='caller';a.id=99;a.version=99;return b.name==='Same'&&b.id===1&&b.version===2&&item.version===1;})())", "expected": true},{"call": "(((()=>{const value=Object.freeze({name:' '.repeat(9900)+'A'+' '.repeat(9900),seats:1000}),a=normalizeInput(value),b=normalizeInput(Object.freeze({name:'\ud83d\ude00'.repeat(40),seats:-0}));return a.name==='A'&&a.seats===1000&&b.name.length===80&&b.seats===0&&normalizeInput({name:'\ud83d\ude00'.repeat(41),seats:0})===null&&normalizeInput({name:'x'.repeat(20000),seats:0})===null;})()&&(()=>{const input=Object.freeze({name:' '.repeat(9960)+'\ud83e\udd88'.repeat(40)+' '.repeat(9960),seats:1000});for(let i=0;i<1000;i++){const out=normalizeInput(input);if(!out||out.name!=='\ud83e\udd88'.repeat(40)||out.seats!==1000)return false;}return normalizeInput({name:'x'.repeat(20000),seats:1})===null;})())&&(()=>{let item={id:1,name:'Exact  Name',seats:0,version:1};for(let i=0;i<1000;i++){const before=item,next=updateItem(item,Object.freeze({version:item.version,seats:i%1001}));if(!next||next===before||next.version!==before.version+1||next.name!=='Exact  Name'||before.version!==i+1)return false;item=next;}return item.version===1001&&item.seats===999;})())", "expected": true}];

FULLSTACK_SOLUTIONS["ts-fullstack-workshops-3"].hiddenTests = [...(FULLSTACK_SOLUTIONS["ts-fullstack-workshops-3"].hiddenTests ?? []), {"call": "((((()=>{const whites=['',' ','\\t','\\n','\\r','\\u00a0','\\ufeff','\\u2003','\\u2028','\\u2029'],names=[['A','A'],['a  b','a  b'],['\u00e9','\u00e9'],['e\\u0301','e\\u0301'],['__proto__','__proto__'],['\\u200b','\\u200b'],['\ud83d\ude00'.repeat(40),'\ud83d\ude00'.repeat(40)],['x'.repeat(80),'x'.repeat(80)],['x'.repeat(81),null],['',null]],numbers=[0,-0,1,999,1000,-1,1001,0.5,NaN,Infinity,-Infinity,'2',null,undefined,1n,new Number(1)];for(const ws of whites)for(const[raw,expectedName]of names)for(const number of numbers){const a=normalizeInput({name:ws+raw+ws,seats:number,extra:1}),valid=expectedName!==null&&typeof number==='number'&&Number.isFinite(number)&&Math.trunc(number)===number&&number>=0&&number<=1000;if(!valid){if(a!==null)return false;}else if(!a||a.name!==expectedName||a.seats!==number||Object.keys(a).length!==2)return false;}return true;})()&&(()=>{const names=['\u00e9','e\\u0301','A  B','\ud83e\udd88'.repeat(40),'x'.repeat(80),'x'.repeat(81)],amounts=[0,-0,1,1000,-1,1001,1.5,NaN,Infinity,'2',null,undefined];for(const name of names)for(const amount of amounts){const out=normalizeInput(Object.freeze({name,seats:amount})),okay=name.length<=80&&typeof amount==='number'&&Number.isInteger(amount)&&amount>=0&&amount<=1000;if(!okay){if(out!==null)return false;}else if(!out||out.name!==name||out.seats!==amount||Object.keys(out).length!==2)return false;}return true;})())&&(()=>{const amounts=[0,-0,1,1000,-1,1001,1.5,NaN,Infinity,'2',null,undefined],versions=[1,2,17,1000000];for(const version of versions)for(const amount of amounts)for(const incoming of [version,version+1,version-1,'1',null,undefined,1.5,NaN]){const item=Object.freeze({id:17,name:'e\\u0301',seats:2,version}),patch=Object.freeze({version:incoming,seats:amount}),out=updateItem(item,patch),okay=typeof incoming==='number'&&Number.isInteger(incoming)&&incoming===version&&typeof amount==='number'&&Number.isInteger(amount)&&amount>=0&&amount<=1000;if(!okay){if(out!==null)return false;}else if(!out||out===item||out.id!==17||out.name!==item.name||out.seats!==amount||out.version!==version+1||Object.isFrozen(out))return false;if(item.seats!==2||item.version!==version)return false;}return true;})())&&(()=>{const stable=v=>JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a<b?-1:a>b?1:0)):x); for(let seed=0;seed<16;seed++){let rows=[{id:100+seed,name:'First',seats:2,version:1},{id:1,name:'Second',seats:0,version:2}],last=100+seed;const api=createApi(rows),other=createApi([]);for(let step=0;step<96;step++){const op=(step*7+seed)%4,id=rows.length?rows[step%rows.length].id:1;let request,expected;if(op===0){request={method:'GET',path:'/api/workshops'};expected={status:200,body:rows.map(x=>({...x}))};}else if(op===1){request={method:'POST',path:'/api/workshops',body:{name:'  e\\u0301  ',seats:step%1001}};const value={id:++last,name:'e\\u0301',seats:step%1001,version:1};rows.push(value);expected={status:201,body:{...value}};}else if(op===2){request={method:'POST',path:'/api/workshops',body:{name:'',seats:0}};expected={status:400,body:{error:'invalid'}};}else if(op===3){request={method:'PUT',path:'/api/workshops/'+id};expected={status:404,body:{error:'not_found'}};} if(stable(api(request))!==stable(expected)||stable(api({method:'GET',path:'/api/workshops'}).body)!==stable(rows)||other({method:'GET',path:'/api/workshops'}).body.length)return false;}}return true;})())", "expected": true},{"call": "((((()=>{const values=[Object.freeze({name:' A ',seats:0,extra:1}),Object.freeze(Object.create({name:' A ',seats:0})),Object.freeze(Object.assign(Object.create(null),{name:' A ',seats:0}))];for(const value of values){const a=normalizeInput(value),b=normalizeInput(value);if(!a||!b||a===b||a===value||a.name!=='A'||a.seats!==0||Object.keys(a).length!==2)return false;a.name='changed';a.seats=99;a.extra=1;if(b.name!=='A'||b.seats!==0||normalizeInput(value).name!=='A')return false;}const v={name:'A',seats:1};Object.defineProperty(v,'ignored',{get(){throw Error('ignored field read');},enumerable:true});if(normalizeInput(v).seats!==1)return false;const a=[];a.name='A';a.seats=1;const f=()=>0;f.name;return [a,f,undefined,null,true,2,'text',Symbol('x'),1n,{},new String('A'),{name:new String('A'),seats:1}].every(value=>normalizeInput(value)===null);})()&&(()=>{const source=Object.create({name:' e\\u0301 ',seats:0});Object.defineProperty(source,'ignored',{get(){throw Error('read extra');},enumerable:true});Object.freeze(source);const a=normalizeInput(source),b=normalizeInput(source);if(!a||!b||a===b||a.name!=='e\\u0301'||Object.isFrozen(a))return false;a.name='caller';a.seats=9;return b.name==='e\\u0301'&&b.seats===0&&normalizeInput(source).seats===0;})())&&(()=>{const item=Object.freeze({id:1,name:'Same',seats:2,version:1}),patch=Object.create({version:1,seats:2});Object.defineProperty(patch,'ignored',{get(){throw Error('read extra');},enumerable:true});Object.freeze(patch);const a=updateItem(item,patch),b=updateItem(item,patch);if(!a||!b||a===b||a===item||a.version!==2||a.seats!==2)return false;a.name='caller';a.id=99;a.version=99;return b.name==='Same'&&b.id===1&&b.version===2&&item.version===1;})())&&(()=>{const seed=[{id:99,name:'High',seats:2,version:1},{id:1,name:'Low',seats:1,version:1}],api=createApi(seed),other=createApi(seed);seed[0].name='changed';seed[0].id=1000;seed[0].version=99;seed.push({id:500,name:'Added',seats:1,version:1});const created=api({method:'POST',path:'/api/workshops',body:{name:'New',seats:0}});if(created.status!==201||created.body.id!==100||created.body.version!==1)return false;created.body.id=500;created.body.seats=9;const first=api({method:'GET',path:'/api/workshops'});if(first.body.map(x=>x.id).join(',')!=='99,1,100'||first.body[0].name!=='High')return false;first.body[0].name='caller';first.body.pop();const next=api({method:'GET',path:'/api/workshops'});return next.body.length===3&&next.body[0].name==='High'&&next.body[2].seats===0&&other({method:'GET',path:'/api/workshops'}).body.length===2;})())", "expected": true},{"call": "((((()=>{const value=Object.freeze({name:' '.repeat(9900)+'A'+' '.repeat(9900),seats:1000}),a=normalizeInput(value),b=normalizeInput(Object.freeze({name:'\ud83d\ude00'.repeat(40),seats:-0}));return a.name==='A'&&a.seats===1000&&b.name.length===80&&b.seats===0&&normalizeInput({name:'\ud83d\ude00'.repeat(41),seats:0})===null&&normalizeInput({name:'x'.repeat(20000),seats:0})===null;})()&&(()=>{const input=Object.freeze({name:' '.repeat(9960)+'\ud83e\udd88'.repeat(40)+' '.repeat(9960),seats:1000});for(let i=0;i<1000;i++){const out=normalizeInput(input);if(!out||out.name!=='\ud83e\udd88'.repeat(40)||out.seats!==1000)return false;}return normalizeInput({name:'x'.repeat(20000),seats:1})===null;})())&&(()=>{let item={id:1,name:'Exact  Name',seats:0,version:1};for(let i=0;i<1000;i++){const before=item,next=updateItem(item,Object.freeze({version:item.version,seats:i%1001}));if(!next||next===before||next.version!==before.version+1||next.name!=='Exact  Name'||before.version!==i+1)return false;item=next;}return item.version===1001&&item.seats===999;})())&&(()=>{const seed=Object.freeze(Array.from({length:10000},(_,i)=>Object.freeze({id:10000-i,name:'N'+i,seats:i%1001,version:1}))),api=createApi(seed);const listed=api({method:'GET',path:'/api/workshops'});if(listed.status!==200||listed.body.length!==10000||listed.body[0].id!==10000||listed.body[9999].id!==1)return false;listed.body[0].seats=999;return api({method:'GET',path:'/api/workshops'}).body[0].seats===0&&seed[0].seats===0;})())", "expected": true}];

FULLSTACK_SOLUTIONS["ts-fullstack-workshops-4"].hiddenTests = [...(FULLSTACK_SOLUTIONS["ts-fullstack-workshops-4"].hiddenTests ?? []), {"call": "(((((()=>{const whites=['',' ','\\t','\\n','\\r','\\u00a0','\\ufeff','\\u2003','\\u2028','\\u2029'],names=[['A','A'],['a  b','a  b'],['\u00e9','\u00e9'],['e\\u0301','e\\u0301'],['__proto__','__proto__'],['\\u200b','\\u200b'],['\ud83d\ude00'.repeat(40),'\ud83d\ude00'.repeat(40)],['x'.repeat(80),'x'.repeat(80)],['x'.repeat(81),null],['',null]],numbers=[0,-0,1,999,1000,-1,1001,0.5,NaN,Infinity,-Infinity,'2',null,undefined,1n,new Number(1)];for(const ws of whites)for(const[raw,expectedName]of names)for(const number of numbers){const a=normalizeInput({name:ws+raw+ws,seats:number,extra:1}),valid=expectedName!==null&&typeof number==='number'&&Number.isFinite(number)&&Math.trunc(number)===number&&number>=0&&number<=1000;if(!valid){if(a!==null)return false;}else if(!a||a.name!==expectedName||a.seats!==number||Object.keys(a).length!==2)return false;}return true;})()&&(()=>{const names=['\u00e9','e\\u0301','A  B','\ud83e\udd88'.repeat(40),'x'.repeat(80),'x'.repeat(81)],amounts=[0,-0,1,1000,-1,1001,1.5,NaN,Infinity,'2',null,undefined];for(const name of names)for(const amount of amounts){const out=normalizeInput(Object.freeze({name,seats:amount})),okay=name.length<=80&&typeof amount==='number'&&Number.isInteger(amount)&&amount>=0&&amount<=1000;if(!okay){if(out!==null)return false;}else if(!out||out.name!==name||out.seats!==amount||Object.keys(out).length!==2)return false;}return true;})())&&(()=>{const amounts=[0,-0,1,1000,-1,1001,1.5,NaN,Infinity,'2',null,undefined],versions=[1,2,17,1000000];for(const version of versions)for(const amount of amounts)for(const incoming of [version,version+1,version-1,'1',null,undefined,1.5,NaN]){const item=Object.freeze({id:17,name:'e\\u0301',seats:2,version}),patch=Object.freeze({version:incoming,seats:amount}),out=updateItem(item,patch),okay=typeof incoming==='number'&&Number.isInteger(incoming)&&incoming===version&&typeof amount==='number'&&Number.isInteger(amount)&&amount>=0&&amount<=1000;if(!okay){if(out!==null)return false;}else if(!out||out===item||out.id!==17||out.name!==item.name||out.seats!==amount||out.version!==version+1||Object.isFrozen(out))return false;if(item.seats!==2||item.version!==version)return false;}return true;})())&&(()=>{const stable=v=>JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a<b?-1:a>b?1:0)):x); for(let seed=0;seed<16;seed++){let rows=[{id:100+seed,name:'First',seats:2,version:1},{id:1,name:'Second',seats:0,version:2}],last=100+seed;const api=createApi(rows),other=createApi([]);for(let step=0;step<96;step++){const op=(step*7+seed)%4,id=rows.length?rows[step%rows.length].id:1;let request,expected;if(op===0){request={method:'GET',path:'/api/workshops'};expected={status:200,body:rows.map(x=>({...x}))};}else if(op===1){request={method:'POST',path:'/api/workshops',body:{name:'  e\\u0301  ',seats:step%1001}};const value={id:++last,name:'e\\u0301',seats:step%1001,version:1};rows.push(value);expected={status:201,body:{...value}};}else if(op===2){request={method:'POST',path:'/api/workshops',body:{name:'',seats:0}};expected={status:400,body:{error:'invalid'}};}else if(op===3){request={method:'PUT',path:'/api/workshops/'+id};expected={status:404,body:{error:'not_found'}};} if(stable(api(request))!==stable(expected)||stable(api({method:'GET',path:'/api/workshops'}).body)!==stable(rows)||other({method:'GET',path:'/api/workshops'}).body.length)return false;}}return true;})())&&(()=>{const stable=v=>JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a<b?-1:a>b?1:0)):x); for(let seed=0;seed<16;seed++){let rows=[{id:100+seed,name:'First',seats:2,version:1},{id:1,name:'Second',seats:0,version:2}],last=100+seed;const api=createApi(rows),other=createApi([]);for(let step=0;step<96;step++){const op=(step*7+seed)%8,id=rows.length?rows[step%rows.length].id:1;let request,expected;if(op===0){request={method:'GET',path:'/api/workshops'};expected={status:200,body:rows.map(x=>({...x}))};}else if(op===1){request={method:'POST',path:'/api/workshops',body:{name:'  e\\u0301  ',seats:step%1001}};const value={id:++last,name:'e\\u0301',seats:step%1001,version:1};rows.push(value);expected={status:201,body:{...value}};}else if(op===2){request={method:'POST',path:'/api/workshops',body:{name:'',seats:0}};expected={status:400,body:{error:'invalid'}};}else if(op===3){request={method:'PUT',path:'/api/workshops/'+id};expected={status:404,body:{error:'not_found'}};}else if(op===4){request={method:'DELETE',path:'/api/workshops/'+id};const index=rows.findIndex(x=>x.id===id);if(index<0)expected={status:404,body:{error:'not_found'}};else{rows.splice(index,1);expected={status:200,body:{deleted:id}};}}else{const row=rows.find(x=>x.id===id),version=row?row.version:1;request={method:'PATCH',path:'/api/workshops/'+id,body:{version:op===6?version+1:version,seats:op===7||op===6?-1:step%1001}};if(!row)expected={status:404,body:{error:'not_found'}};else if(op===6)expected={status:409,body:{error:'conflict'}};else if(op===7)expected={status:400,body:{error:'invalid'}};else{row.seats=step%1001;row.version++;expected={status:200,body:{...row}};}} if(stable(api(request))!==stable(expected)||stable(api({method:'GET',path:'/api/workshops'}).body)!==stable(rows)||other({method:'GET',path:'/api/workshops'}).body.length)return false;}}return true;})())", "expected": true},{"call": "(((((()=>{const values=[Object.freeze({name:' A ',seats:0,extra:1}),Object.freeze(Object.create({name:' A ',seats:0})),Object.freeze(Object.assign(Object.create(null),{name:' A ',seats:0}))];for(const value of values){const a=normalizeInput(value),b=normalizeInput(value);if(!a||!b||a===b||a===value||a.name!=='A'||a.seats!==0||Object.keys(a).length!==2)return false;a.name='changed';a.seats=99;a.extra=1;if(b.name!=='A'||b.seats!==0||normalizeInput(value).name!=='A')return false;}const v={name:'A',seats:1};Object.defineProperty(v,'ignored',{get(){throw Error('ignored field read');},enumerable:true});if(normalizeInput(v).seats!==1)return false;const a=[];a.name='A';a.seats=1;const f=()=>0;f.name;return [a,f,undefined,null,true,2,'text',Symbol('x'),1n,{},new String('A'),{name:new String('A'),seats:1}].every(value=>normalizeInput(value)===null);})()&&(()=>{const source=Object.create({name:' e\\u0301 ',seats:0});Object.defineProperty(source,'ignored',{get(){throw Error('read extra');},enumerable:true});Object.freeze(source);const a=normalizeInput(source),b=normalizeInput(source);if(!a||!b||a===b||a.name!=='e\\u0301'||Object.isFrozen(a))return false;a.name='caller';a.seats=9;return b.name==='e\\u0301'&&b.seats===0&&normalizeInput(source).seats===0;})())&&(()=>{const item=Object.freeze({id:1,name:'Same',seats:2,version:1}),patch=Object.create({version:1,seats:2});Object.defineProperty(patch,'ignored',{get(){throw Error('read extra');},enumerable:true});Object.freeze(patch);const a=updateItem(item,patch),b=updateItem(item,patch);if(!a||!b||a===b||a===item||a.version!==2||a.seats!==2)return false;a.name='caller';a.id=99;a.version=99;return b.name==='Same'&&b.id===1&&b.version===2&&item.version===1;})())&&(()=>{const seed=[{id:99,name:'High',seats:2,version:1},{id:1,name:'Low',seats:1,version:1}],api=createApi(seed),other=createApi(seed);seed[0].name='changed';seed[0].id=1000;seed[0].version=99;seed.push({id:500,name:'Added',seats:1,version:1});const created=api({method:'POST',path:'/api/workshops',body:{name:'New',seats:0}});if(created.status!==201||created.body.id!==100||created.body.version!==1)return false;created.body.id=500;created.body.seats=9;const first=api({method:'GET',path:'/api/workshops'});if(first.body.map(x=>x.id).join(',')!=='99,1,100'||first.body[0].name!=='High')return false;first.body[0].name='caller';first.body.pop();const next=api({method:'GET',path:'/api/workshops'});return next.body.length===3&&next.body[0].name==='High'&&next.body[2].seats===0&&other({method:'GET',path:'/api/workshops'}).body.length===2;})())&&(()=>{const api=createApi([{id:1,name:'A',seats:2,version:2}]),conflicts=[null,undefined,false,0,'x',[],{}, {version:1,seats:-1},{version:'2',seats:0},{version:2.5,seats:0}];for(const body of conflicts){if(api({method:'PATCH',path:'/api/workshops/1',body}).status!==409||api({method:'PATCH',path:'/api/workshops/99',body}).status!==404)return false;}for(const seats of [-1,1001,1.5,NaN,Infinity,'2',undefined])if(api({method:'PATCH',path:'/api/workshops/1',body:{version:2,seats}}).status!==400)return false;return api({method:'GET',path:'/api/workshops'}).body[0].version===2;})())", "expected": true},{"call": "(((((()=>{const value=Object.freeze({name:' '.repeat(9900)+'A'+' '.repeat(9900),seats:1000}),a=normalizeInput(value),b=normalizeInput(Object.freeze({name:'\ud83d\ude00'.repeat(40),seats:-0}));return a.name==='A'&&a.seats===1000&&b.name.length===80&&b.seats===0&&normalizeInput({name:'\ud83d\ude00'.repeat(41),seats:0})===null&&normalizeInput({name:'x'.repeat(20000),seats:0})===null;})()&&(()=>{const input=Object.freeze({name:' '.repeat(9960)+'\ud83e\udd88'.repeat(40)+' '.repeat(9960),seats:1000});for(let i=0;i<1000;i++){const out=normalizeInput(input);if(!out||out.name!=='\ud83e\udd88'.repeat(40)||out.seats!==1000)return false;}return normalizeInput({name:'x'.repeat(20000),seats:1})===null;})())&&(()=>{let item={id:1,name:'Exact  Name',seats:0,version:1};for(let i=0;i<1000;i++){const before=item,next=updateItem(item,Object.freeze({version:item.version,seats:i%1001}));if(!next||next===before||next.version!==before.version+1||next.name!=='Exact  Name'||before.version!==i+1)return false;item=next;}return item.version===1001&&item.seats===999;})())&&(()=>{const seed=Object.freeze(Array.from({length:10000},(_,i)=>Object.freeze({id:10000-i,name:'N'+i,seats:i%1001,version:1}))),api=createApi(seed);const listed=api({method:'GET',path:'/api/workshops'});if(listed.status!==200||listed.body.length!==10000||listed.body[0].id!==10000||listed.body[9999].id!==1)return false;listed.body[0].seats=999;return api({method:'GET',path:'/api/workshops'}).body[0].seats===0&&seed[0].seats===0;})())&&(()=>{const api=createApi([{id:1,name:'A',seats:2,version:1},{id:99,name:'B',seats:0,version:1}]);for(const suffix of ['01','0','-1','1.0','+1','1/','1?x','1\\n','1x',' 1','1/extra'])if(api({method:'DELETE',path:'/api/workshops/'+suffix}).status!==404)return false;for(let i=0;i<1000;i++){const result=api({method:'PATCH',path:'/api/workshops/1',body:{version:i+1,seats:2}});if(result.status!==200||result.body.version!==i+2)return false;result.body.version=0;}if(api({method:'DELETE',path:'/api/workshops/99'}).status!==200)return false;const created=api({method:'POST',path:'/api/workshops',body:{name:'C',seats:1}});return created.body.id===100&&api({method:'GET',path:'/api/workshops'}).body.map(x=>x.id).join(',')==='1,100';})())", "expected": true}];
