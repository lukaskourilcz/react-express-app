import type { CodingSolution } from '../types';
import { advanceReact } from './evolving-react-advanced';

const builders: Record<string,(stage:number)=>string> = {
  'react-evolving-board': stage => `import React,{useState,useRef} from 'react';
export default function App(){
 const [text,setText]=useState(''),[filter,setFilter]=useState('All');const id=useRef(0);
 const [history,setHistory]=useState({past:[],present:[],future:[]});const tasks=history.present;
 const change=fn=>setHistory(h=>({past:[...h.past,h.present],present:fn(h.present),future:[]}));
 const add=()=>{const name=text.trim();if(!name)return;const task={id:++id.current,name,done:false};change(rows=>[...rows,task]);setText('')};
 ${stage === 3 ? `const undo=()=>setHistory(h=>h.past.length?{past:h.past.slice(0,-1),present:h.past[h.past.length-1],future:[h.present,...h.future]}:h);
 const redo=()=>setHistory(h=>h.future.length?{past:[...h.past,h.present],present:h.future[0],future:h.future.slice(1)}:h);` : ''}
 return <main><label>Task<input value={text} onChange={e=>setText(e.target.value)}/></label><button onClick={add}>Add</button>
 ${stage >= 2 ? `<div>{['All','Active','Completed'].map(f=><button key={f} onClick={()=>setFilter(f)}>{f}</button>)}</div><output aria-label="Remaining">{tasks.filter(t=>!t.done).length}</output>` : ''}
 <ul>{tasks.filter(t=>${stage >= 2 ? "filter==='All'||(filter==='Completed'?t.done:!t.done)" : 'true'}).map(t=><li key={t.id}><label><input type="checkbox" checked={t.done} onChange={()=>change(rows=>rows.map(row=>row.id===t.id?{...row,done:!row.done}:row))}/>{t.name}</label>${stage >= 2 ? '<button aria-label={"Delete "+t.name} onClick={()=>change(rows=>rows.filter(row=>row.id!==t.id))}>Delete</button>' : ''}</li>)}</ul>
 ${stage === 3 ? '<button disabled={!history.past.length} onClick={undo}>Undo</button><button disabled={!history.future.length} onClick={redo}>Redo</button>' : ''}
 </main>;
}`,
  'react-evolving-catalog': stage => `import React,{useState} from 'react';
const products=[{id:1,name:'Apple',price:2},{id:2,name:'Banana',price:1},{id:3,name:'Carrot',price:3},{id:4,name:'Dates',price:4}];
export default function App(){const [query,setQuery]=useState(''),[sort,setSort]=useState('name'),[page,setPage]=useState(0),[selected,setSelected]=useState([]);
 const rows=products.filter(p=>p.name.toLowerCase().includes(query.trim().toLowerCase()));
 ${stage >= 2 ? `rows.sort((a,b)=>sort==='name'?a.name.localeCompare(b.name):sort==='price-asc'?a.price-b.price:b.price-a.price);` : ''}
 const pages=Math.ceil(rows.length/2),visible=${stage >= 2 ? 'rows.slice(page*2,page*2+2)' : 'rows'};
 return <main><label>Search<input value={query} onChange={e=>{setQuery(e.target.value);setPage(0)}}/></label>
 ${stage >= 2 ? `<label>Sort<select value={sort} onChange={e=>{setSort(e.target.value);setPage(0)}}><option value="name">Name</option><option value="price-asc">Price ascending</option><option value="price-desc">Price descending</option></select></label>` : ''}
 {!visible.length&&<p>No products</p>}<ul>{visible.map(p=><li key={p.id}>${stage === 3 ? '<label><input type="checkbox" checked={selected.includes(p.id)} onChange={()=>setSelected(ids=>ids.includes(p.id)?ids.filter(id=>id!==p.id):[...ids,p.id])}/>{p.name}</label>' : '{p.name}'} {p.price}</li>)}</ul>
 ${stage >= 2 ? '<button disabled={page===0} onClick={()=>setPage(p=>p-1)}>Previous</button><output aria-label="Page">{pages?page+1:0} / {pages}</output><button disabled={page+1>=pages} onClick={()=>setPage(p=>p+1)}>Next</button>' : ''}
 ${stage === 3 ? '<output aria-label="Selected total">{products.filter(p=>selected.includes(p.id)).reduce((sum,p)=>sum+p.price,0)}</output><button disabled={!visible.length} onClick={()=>setSelected(ids=>[...new Set([...ids,...visible.map(p=>p.id)])])}>Select page</button><button disabled={!selected.length} onClick={()=>setSelected([])}>Clear selection</button>' : ''}
 </main>;
}`,
  'react-evolving-form': stage => `import React,{useState} from 'react';
export default function App(){const [email,setEmail]=useState(''),[name,setName]=useState(''),[step,setStep]=useState(0),[error,setError]=useState(''),[consent,setConsent]=useState(false),[snapshot,setSnapshot]=useState(null);
 const next=e=>{e.preventDefault();setError('');if(step===0){const value=email.trim();if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value)){setError('Invalid email');return}setEmail(value);setStep(1)}${stage >= 2 ? "else if(step===1){if(name.replace(/\\s/g,'').length<2){setError('Invalid name');return}setName(name.trim());setStep(2)}" : ''}};
 const back=()=>{setStep(s=>s-1);setError('');setConsent(false)};
 ${stage === 3 ? `if(snapshot)return <main><p>Submitted</p><p>{snapshot.email}</p><p>{snapshot.name}</p><button onClick={()=>{setEmail('');setName('');setStep(0);setError('');setConsent(false);setSnapshot(null)}}>Start over</button></main>;` : ''}
 return <main>{step>0&&<p>Email accepted</p>}{error&&<p role="alert">{error}</p>}<form onSubmit={next}>
 {step===0&&<><label>Email<input value={email} onChange={e=>setEmail(e.target.value)}/></label><button>Next</button></>}
 ${stage >= 2 ? `{step===1&&<><label>Name<input value={name} onChange={e=>setName(e.target.value)}/></label><button type="button" onClick={back}>Back</button><button>Next</button></>}
 {step===2&&<><p>{email}</p><p>{name}</p><button type="button" onClick={back}>Back</button>${stage === 3 ? '<label><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>I agree</label><button type="button" disabled={!consent} onClick={()=>setSnapshot({email,name})}>Submit</button>' : ''}</>}` : ''}
 </form></main>;
}`,
};

/*
 * juniorDev / seniorDev solutions.
 *
 * After a learner passes a stage, the app shows these two side by side with
 * the reference above. Each builder returns the complete App module for one
 * stage; the five stages are written out in full so that every stage reads as
 * the program a learner would actually write, with nothing patched in.
 * Every stage must keep passing the suites of all earlier stages.
 *
 * junior: one useState per value, named handle* functions, for/of loops with
 * if/else, and history kept as three separate arrays.
 * senior: derived values, small helpers, stable ids, functional updates and a
 * reducer (board), a single view object plus Set/Map state (catalog) or a
 * fields object with per-step validators (form).
 */

const unknownStage = (stage: number): never => { throw new Error(`No solution for stage ${stage}`); };

function juniorBoard(stage: number): string {
  switch (stage) {
    case 1: return `import React, { useState } from 'react';

export default function App() {
  const [text, setText] = useState('');
  const [tasks, setTasks] = useState([]);
  const [nextId, setNextId] = useState(1);

  function handleTextChange(event) {
    setText(event.target.value);
  }

  function handleAdd() {
    const name = text.trim();
    if (name === '') {
      return;
    }
    const task = { id: nextId, name: name, done: false };
    setTasks([...tasks, task]);
    setNextId(nextId + 1);
    setText('');
  }

  function handleToggle(id) {
    const updated = [];
    for (const task of tasks) {
      if (task.id === id) {
        updated.push({ id: task.id, name: task.name, done: !task.done });
      } else {
        updated.push(task);
      }
    }
    setTasks(updated);
  }

  return (
    <main>
      <label>Task<input value={text} onChange={handleTextChange} /></label>
      <button onClick={handleAdd}>Add</button>
      <ul>
        {tasks.map(task => (
          <li key={task.id}>
            <label><input type="checkbox" checked={task.done} onChange={() => handleToggle(task.id)} />{task.name}</label>
          </li>
        ))}
      </ul>
    </main>
  );
}`;
    case 2: return `import React, { useState } from 'react';

export default function App() {
  const [text, setText] = useState('');
  const [tasks, setTasks] = useState([]);
  const [nextId, setNextId] = useState(1);
  const [filter, setFilter] = useState('All');

  const visibleTasks = [];
  for (const task of tasks) {
    if (filter === 'All') {
      visibleTasks.push(task);
    } else if (filter === 'Active' && !task.done) {
      visibleTasks.push(task);
    } else if (filter === 'Completed' && task.done) {
      visibleTasks.push(task);
    }
  }

  let remaining = 0;
  for (const task of tasks) {
    if (!task.done) {
      remaining = remaining + 1;
    }
  }

  function handleTextChange(event) {
    setText(event.target.value);
  }

  function handleAdd() {
    const name = text.trim();
    if (name === '') {
      return;
    }
    const task = { id: nextId, name: name, done: false };
    setTasks([...tasks, task]);
    setNextId(nextId + 1);
    setText('');
  }

  function handleToggle(id) {
    const updated = [];
    for (const task of tasks) {
      if (task.id === id) {
        updated.push({ id: task.id, name: task.name, done: !task.done });
      } else {
        updated.push(task);
      }
    }
    setTasks(updated);
  }

  function handleDelete(id) {
    const kept = [];
    for (const task of tasks) {
      if (task.id !== id) {
        kept.push(task);
      }
    }
    setTasks(kept);
  }

  return (
    <main>
      <label>Task<input value={text} onChange={handleTextChange} /></label>
      <button onClick={handleAdd}>Add</button>
      <div>
        <button onClick={() => setFilter('All')}>All</button>
        <button onClick={() => setFilter('Active')}>Active</button>
        <button onClick={() => setFilter('Completed')}>Completed</button>
      </div>
      <output aria-label="Remaining">{remaining}</output>
      <ul>
        {visibleTasks.map(task => (
          <li key={task.id}>
            <label><input type="checkbox" checked={task.done} onChange={() => handleToggle(task.id)} />{task.name}</label>
            <button aria-label={'Delete ' + task.name} onClick={() => handleDelete(task.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </main>
  );
}`;
    case 3: return `import React, { useState } from 'react';

export default function App() {
  const [text, setText] = useState('');
  const [tasks, setTasks] = useState([]);
  const [nextId, setNextId] = useState(1);
  const [filter, setFilter] = useState('All');
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);

  const visibleTasks = [];
  for (const task of tasks) {
    if (filter === 'All') {
      visibleTasks.push(task);
    } else if (filter === 'Active' && !task.done) {
      visibleTasks.push(task);
    } else if (filter === 'Completed' && task.done) {
      visibleTasks.push(task);
    }
  }

  let remaining = 0;
  for (const task of tasks) {
    if (!task.done) {
      remaining = remaining + 1;
    }
  }

  // Every change to the list goes through here so Undo can bring the old list back.
  function changeTasks(nextTasks) {
    setPast([...past, tasks]);
    setTasks(nextTasks);
    setFuture([]);
  }

  function handleTextChange(event) {
    setText(event.target.value);
  }

  function handleAdd() {
    const name = text.trim();
    if (name === '') {
      return;
    }
    const task = { id: nextId, name: name, done: false };
    changeTasks([...tasks, task]);
    setNextId(nextId + 1);
    setText('');
  }

  function handleToggle(id) {
    const updated = [];
    for (const task of tasks) {
      if (task.id === id) {
        updated.push({ id: task.id, name: task.name, done: !task.done });
      } else {
        updated.push(task);
      }
    }
    changeTasks(updated);
  }

  function handleDelete(id) {
    const kept = [];
    for (const task of tasks) {
      if (task.id !== id) {
        kept.push(task);
      }
    }
    changeTasks(kept);
  }

  function handleUndo() {
    if (past.length === 0) {
      return;
    }
    const previous = past[past.length - 1];
    setPast(past.slice(0, past.length - 1));
    setFuture([tasks, ...future]);
    setTasks(previous);
  }

  function handleRedo() {
    if (future.length === 0) {
      return;
    }
    const next = future[0];
    setFuture(future.slice(1));
    setPast([...past, tasks]);
    setTasks(next);
  }

  return (
    <main>
      <label>Task<input value={text} onChange={handleTextChange} /></label>
      <button onClick={handleAdd}>Add</button>
      <div>
        <button onClick={() => setFilter('All')}>All</button>
        <button onClick={() => setFilter('Active')}>Active</button>
        <button onClick={() => setFilter('Completed')}>Completed</button>
      </div>
      <output aria-label="Remaining">{remaining}</output>
      <ul>
        {visibleTasks.map(task => (
          <li key={task.id}>
            <label><input type="checkbox" checked={task.done} onChange={() => handleToggle(task.id)} />{task.name}</label>
            <button aria-label={'Delete ' + task.name} onClick={() => handleDelete(task.id)}>Delete</button>
          </li>
        ))}
      </ul>
      <button disabled={past.length === 0} onClick={handleUndo}>Undo</button>
      <button disabled={future.length === 0} onClick={handleRedo}>Redo</button>
    </main>
  );
}`;
    case 4: return `import React, { useState } from 'react';

export default function App() {
  const [text, setText] = useState('');
  const [tasks, setTasks] = useState([]);
  const [nextId, setNextId] = useState(1);
  const [filter, setFilter] = useState('All');
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);

  const visibleTasks = [];
  for (const task of tasks) {
    if (filter === 'All') {
      visibleTasks.push(task);
    } else if (filter === 'Active' && !task.done) {
      visibleTasks.push(task);
    } else if (filter === 'Completed' && task.done) {
      visibleTasks.push(task);
    }
  }

  let remaining = 0;
  let completedCount = 0;
  for (const task of tasks) {
    if (task.done) {
      completedCount = completedCount + 1;
    } else {
      remaining = remaining + 1;
    }
  }

  // Every change to the list goes through here so Undo can bring the old list back.
  function changeTasks(nextTasks) {
    setPast([...past, tasks]);
    setTasks(nextTasks);
    setFuture([]);
  }

  function handleTextChange(event) {
    setText(event.target.value);
  }

  function handleAdd() {
    const name = text.trim();
    if (name === '') {
      return;
    }
    const task = { id: nextId, name: name, done: false };
    changeTasks([...tasks, task]);
    setNextId(nextId + 1);
    setText('');
  }

  function handleToggle(id) {
    const updated = [];
    for (const task of tasks) {
      if (task.id === id) {
        updated.push({ id: task.id, name: task.name, done: !task.done });
      } else {
        updated.push(task);
      }
    }
    changeTasks(updated);
  }

  function handleDelete(id) {
    const kept = [];
    for (const task of tasks) {
      if (task.id !== id) {
        kept.push(task);
      }
    }
    changeTasks(kept);
  }

  function handleCompleteAll() {
    const completed = [];
    for (const task of tasks) {
      completed.push({ id: task.id, name: task.name, done: true });
    }
    changeTasks(completed);
  }

  function handleClearCompleted() {
    const active = [];
    for (const task of tasks) {
      if (!task.done) {
        active.push(task);
      }
    }
    changeTasks(active);
  }

  function handleUndo() {
    if (past.length === 0) {
      return;
    }
    const previous = past[past.length - 1];
    setPast(past.slice(0, past.length - 1));
    setFuture([tasks, ...future]);
    setTasks(previous);
  }

  function handleRedo() {
    if (future.length === 0) {
      return;
    }
    const next = future[0];
    setFuture(future.slice(1));
    setPast([...past, tasks]);
    setTasks(next);
  }

  return (
    <main>
      <label>Task<input value={text} onChange={handleTextChange} /></label>
      <button onClick={handleAdd}>Add</button>
      <div>
        <button onClick={() => setFilter('All')}>All</button>
        <button onClick={() => setFilter('Active')}>Active</button>
        <button onClick={() => setFilter('Completed')}>Completed</button>
      </div>
      <output aria-label="Remaining">{remaining}</output>
      <ul>
        {visibleTasks.map(task => (
          <li key={task.id}>
            <label><input type="checkbox" checked={task.done} onChange={() => handleToggle(task.id)} />{task.name}</label>
            <button aria-label={'Delete ' + task.name} onClick={() => handleDelete(task.id)}>Delete</button>
          </li>
        ))}
      </ul>
      <button disabled={past.length === 0} onClick={handleUndo}>Undo</button>
      <button disabled={future.length === 0} onClick={handleRedo}>Redo</button>
      <button disabled={remaining === 0} onClick={handleCompleteAll}>Complete all</button>
      <button disabled={completedCount === 0} onClick={handleClearCompleted}>Clear completed</button>
    </main>
  );
}`;
    case 5: return `import React, { useState } from 'react';

export default function App() {
  const [text, setText] = useState('');
  const [tasks, setTasks] = useState([]);
  const [nextId, setNextId] = useState(1);
  const [filter, setFilter] = useState('All');
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);

  const visibleTasks = [];
  for (const task of tasks) {
    if (filter === 'All') {
      visibleTasks.push(task);
    } else if (filter === 'Active' && !task.done) {
      visibleTasks.push(task);
    } else if (filter === 'Completed' && task.done) {
      visibleTasks.push(task);
    }
  }

  let remaining = 0;
  let completedCount = 0;
  for (const task of tasks) {
    if (task.done) {
      completedCount = completedCount + 1;
    } else {
      remaining = remaining + 1;
    }
  }

  // Every change to the list goes through here so Undo can bring the old list back.
  function changeTasks(nextTasks) {
    setPast([...past, tasks]);
    setTasks(nextTasks);
    setFuture([]);
  }

  function handleTextChange(event) {
    setText(event.target.value);
  }

  function handleAdd() {
    const name = text.trim();
    if (name === '') {
      return;
    }
    const task = { id: nextId, name: name, done: false };
    changeTasks([...tasks, task]);
    setNextId(nextId + 1);
    setText('');
  }

  function handleToggle(id) {
    const updated = [];
    for (const task of tasks) {
      if (task.id === id) {
        updated.push({ id: task.id, name: task.name, done: !task.done });
      } else {
        updated.push(task);
      }
    }
    changeTasks(updated);
  }

  function handleDelete(id) {
    const kept = [];
    for (const task of tasks) {
      if (task.id !== id) {
        kept.push(task);
      }
    }
    changeTasks(kept);
  }

  function handleCompleteAll() {
    const completed = [];
    for (const task of tasks) {
      completed.push({ id: task.id, name: task.name, done: true });
    }
    changeTasks(completed);
  }

  function handleClearCompleted() {
    const active = [];
    for (const task of tasks) {
      if (!task.done) {
        active.push(task);
      }
    }
    changeTasks(active);
  }

  function moveTask(id, direction) {
    let index = -1;
    for (let i = 0; i < tasks.length; i++) {
      if (tasks[i].id === id) {
        index = i;
      }
    }
    const target = index + direction;
    if (index === -1 || target < 0 || target >= tasks.length) {
      return;
    }
    const reordered = [...tasks];
    reordered[index] = tasks[target];
    reordered[target] = tasks[index];
    changeTasks(reordered);
  }

  function handleMoveUp(id) {
    moveTask(id, -1);
  }

  function handleMoveDown(id) {
    moveTask(id, 1);
  }

  function handleUndo() {
    if (past.length === 0) {
      return;
    }
    const previous = past[past.length - 1];
    setPast(past.slice(0, past.length - 1));
    setFuture([tasks, ...future]);
    setTasks(previous);
  }

  function handleRedo() {
    if (future.length === 0) {
      return;
    }
    const next = future[0];
    setFuture(future.slice(1));
    setPast([...past, tasks]);
    setTasks(next);
  }

  return (
    <main>
      <label>Task<input value={text} onChange={handleTextChange} /></label>
      <button onClick={handleAdd}>Add</button>
      <div>
        <button onClick={() => setFilter('All')}>All</button>
        <button onClick={() => setFilter('Active')}>Active</button>
        <button onClick={() => setFilter('Completed')}>Completed</button>
      </div>
      <output aria-label="Remaining">{remaining}</output>
      <ul>
        {visibleTasks.map(task => (
          <li key={task.id}>
            <label><input type="checkbox" checked={task.done} onChange={() => handleToggle(task.id)} />{task.name}</label>
            <button aria-label={'Delete ' + task.name} onClick={() => handleDelete(task.id)}>Delete</button>
            <button aria-label={'Move up ' + task.name} disabled={task.id === tasks[0].id} onClick={() => handleMoveUp(task.id)}>Move up</button>
            <button aria-label={'Move down ' + task.name} disabled={task.id === tasks[tasks.length - 1].id} onClick={() => handleMoveDown(task.id)}>Move down</button>
          </li>
        ))}
      </ul>
      <button disabled={past.length === 0} onClick={handleUndo}>Undo</button>
      <button disabled={future.length === 0} onClick={handleRedo}>Redo</button>
      <button disabled={remaining === 0} onClick={handleCompleteAll}>Complete all</button>
      <button disabled={completedCount === 0} onClick={handleClearCompleted}>Clear completed</button>
    </main>
  );
}`;
    default: return unknownStage(stage);
  }
}

function seniorBoard(stage: number): string {
  switch (stage) {
    case 1: return `import React, { useReducer, useState } from 'react';

function reducer(state, action) {
  switch (action.type) {
    case 'add':
      return { tasks: [...state.tasks, { id: state.nextId, name: action.name, done: false }], nextId: state.nextId + 1 };
    case 'toggle':
      return { ...state, tasks: state.tasks.map(task => (task.id === action.id ? { ...task, done: !task.done } : task)) };
    default:
      return state;
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, { tasks: [], nextId: 1 });
  const [text, setText] = useState('');

  const add = () => {
    const name = text.trim();
    if (!name) return;
    dispatch({ type: 'add', name });
    setText('');
  };

  return (
    <main>
      <label>Task<input value={text} onChange={event => setText(event.target.value)} /></label>
      <button onClick={add}>Add</button>
      <ul>
        {state.tasks.map(task => (
          <li key={task.id}>
            <label><input type="checkbox" checked={task.done} onChange={() => dispatch({ type: 'toggle', id: task.id })} />{task.name}</label>
          </li>
        ))}
      </ul>
    </main>
  );
}`;
    case 2: return `import React, { useReducer, useState } from 'react';

const FILTERS = ['All', 'Active', 'Completed'];
const show = { All: () => true, Active: task => !task.done, Completed: task => task.done };

function reducer(state, action) {
  switch (action.type) {
    case 'add':
      return { tasks: [...state.tasks, { id: state.nextId, name: action.name, done: false }], nextId: state.nextId + 1 };
    case 'toggle':
      return { ...state, tasks: state.tasks.map(task => (task.id === action.id ? { ...task, done: !task.done } : task)) };
    case 'delete':
      return { ...state, tasks: state.tasks.filter(task => task.id !== action.id) };
    default:
      return state;
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, { tasks: [], nextId: 1 });
  const [text, setText] = useState('');
  const [filter, setFilter] = useState('All');
  const remaining = state.tasks.filter(task => !task.done).length;

  const add = () => {
    const name = text.trim();
    if (!name) return;
    dispatch({ type: 'add', name });
    setText('');
  };

  return (
    <main>
      <label>Task<input value={text} onChange={event => setText(event.target.value)} /></label>
      <button onClick={add}>Add</button>
      <div>{FILTERS.map(name => <button key={name} onClick={() => setFilter(name)}>{name}</button>)}</div>
      <output aria-label="Remaining">{remaining}</output>
      <ul>
        {state.tasks.filter(show[filter]).map(task => (
          <li key={task.id}>
            <label><input type="checkbox" checked={task.done} onChange={() => dispatch({ type: 'toggle', id: task.id })} />{task.name}</label>
            <button aria-label={'Delete ' + task.name} onClick={() => dispatch({ type: 'delete', id: task.id })}>Delete</button>
          </li>
        ))}
      </ul>
    </main>
  );
}`;
    case 3: return `import React, { useReducer, useState } from 'react';

const FILTERS = ['All', 'Active', 'Completed'];
const show = { All: () => true, Active: task => !task.done, Completed: task => task.done };

// Pure list edits. Returning the same array marks a no-op, which stays out of history.
function edit(tasks, action, nextId) {
  switch (action.type) {
    case 'add':
      return [...tasks, { id: nextId, name: action.name, done: false }];
    case 'toggle':
      return tasks.map(task => (task.id === action.id ? { ...task, done: !task.done } : task));
    case 'delete':
      return tasks.filter(task => task.id !== action.id);
    default:
      return tasks;
  }
}

// Every edit becomes a whole-list snapshot on an undo/redo timeline; ids keep counting up across undo.
function reducer(state, action) {
  const { past, present, future } = state;
  switch (action.type) {
    case 'undo':
      return past.length ? { ...state, past: past.slice(0, -1), present: past[past.length - 1], future: [present, ...future] } : state;
    case 'redo':
      return future.length ? { ...state, past: [...past, present], present: future[0], future: future.slice(1) } : state;
    default: {
      const next = edit(present, action, state.nextId);
      if (next === present) return state;
      return { past: [...past, present], present: next, future: [], nextId: state.nextId + (action.type === 'add' ? 1 : 0) };
    }
  }
}

const initial = { past: [], present: [], future: [], nextId: 1 };

export default function App() {
  const [state, dispatch] = useReducer(reducer, initial);
  const [text, setText] = useState('');
  const [filter, setFilter] = useState('All');
  const tasks = state.present;
  const remaining = tasks.filter(task => !task.done).length;

  const add = () => {
    const name = text.trim();
    if (!name) return;
    dispatch({ type: 'add', name });
    setText('');
  };

  return (
    <main>
      <label>Task<input value={text} onChange={event => setText(event.target.value)} /></label>
      <button onClick={add}>Add</button>
      <div>{FILTERS.map(name => <button key={name} onClick={() => setFilter(name)}>{name}</button>)}</div>
      <output aria-label="Remaining">{remaining}</output>
      <ul>
        {tasks.filter(show[filter]).map(task => (
          <li key={task.id}>
            <label><input type="checkbox" checked={task.done} onChange={() => dispatch({ type: 'toggle', id: task.id })} />{task.name}</label>
            <button aria-label={'Delete ' + task.name} onClick={() => dispatch({ type: 'delete', id: task.id })}>Delete</button>
          </li>
        ))}
      </ul>
      <button disabled={state.past.length === 0} onClick={() => dispatch({ type: 'undo' })}>Undo</button>
      <button disabled={state.future.length === 0} onClick={() => dispatch({ type: 'redo' })}>Redo</button>
    </main>
  );
}`;
    case 4: return `import React, { useReducer, useState } from 'react';

const FILTERS = ['All', 'Active', 'Completed'];
const show = { All: () => true, Active: task => !task.done, Completed: task => task.done };

// Pure list edits. Returning the same array marks a no-op, which stays out of history.
function edit(tasks, action, nextId) {
  switch (action.type) {
    case 'add':
      return [...tasks, { id: nextId, name: action.name, done: false }];
    case 'toggle':
      return tasks.map(task => (task.id === action.id ? { ...task, done: !task.done } : task));
    case 'delete':
      return tasks.filter(task => task.id !== action.id);
    case 'completeAll':
      return tasks.some(task => !task.done) ? tasks.map(task => (task.done ? task : { ...task, done: true })) : tasks;
    case 'clearCompleted':
      return tasks.some(task => task.done) ? tasks.filter(task => !task.done) : tasks;
    default:
      return tasks;
  }
}

// Every edit becomes a whole-list snapshot on an undo/redo timeline; ids keep counting up across undo.
function reducer(state, action) {
  const { past, present, future } = state;
  switch (action.type) {
    case 'undo':
      return past.length ? { ...state, past: past.slice(0, -1), present: past[past.length - 1], future: [present, ...future] } : state;
    case 'redo':
      return future.length ? { ...state, past: [...past, present], present: future[0], future: future.slice(1) } : state;
    default: {
      const next = edit(present, action, state.nextId);
      if (next === present) return state;
      return { past: [...past, present], present: next, future: [], nextId: state.nextId + (action.type === 'add' ? 1 : 0) };
    }
  }
}

const initial = { past: [], present: [], future: [], nextId: 1 };

export default function App() {
  const [state, dispatch] = useReducer(reducer, initial);
  const [text, setText] = useState('');
  const [filter, setFilter] = useState('All');
  const tasks = state.present;
  const remaining = tasks.filter(task => !task.done).length;
  const completed = tasks.length - remaining;

  const add = () => {
    const name = text.trim();
    if (!name) return;
    dispatch({ type: 'add', name });
    setText('');
  };

  return (
    <main>
      <label>Task<input value={text} onChange={event => setText(event.target.value)} /></label>
      <button onClick={add}>Add</button>
      <div>{FILTERS.map(name => <button key={name} onClick={() => setFilter(name)}>{name}</button>)}</div>
      <output aria-label="Remaining">{remaining}</output>
      <ul>
        {tasks.filter(show[filter]).map(task => (
          <li key={task.id}>
            <label><input type="checkbox" checked={task.done} onChange={() => dispatch({ type: 'toggle', id: task.id })} />{task.name}</label>
            <button aria-label={'Delete ' + task.name} onClick={() => dispatch({ type: 'delete', id: task.id })}>Delete</button>
          </li>
        ))}
      </ul>
      <button disabled={state.past.length === 0} onClick={() => dispatch({ type: 'undo' })}>Undo</button>
      <button disabled={state.future.length === 0} onClick={() => dispatch({ type: 'redo' })}>Redo</button>
      <button disabled={remaining === 0} onClick={() => dispatch({ type: 'completeAll' })}>Complete all</button>
      <button disabled={completed === 0} onClick={() => dispatch({ type: 'clearCompleted' })}>Clear completed</button>
    </main>
  );
}`;
    case 5: return `import React, { useReducer, useState } from 'react';

const FILTERS = ['All', 'Active', 'Completed'];
const show = { All: () => true, Active: task => !task.done, Completed: task => task.done };

// Pure list edits. Returning the same array marks a no-op, which stays out of history.
function edit(tasks, action, nextId) {
  switch (action.type) {
    case 'add':
      return [...tasks, { id: nextId, name: action.name, done: false }];
    case 'toggle':
      return tasks.map(task => (task.id === action.id ? { ...task, done: !task.done } : task));
    case 'delete':
      return tasks.filter(task => task.id !== action.id);
    case 'completeAll':
      return tasks.some(task => !task.done) ? tasks.map(task => (task.done ? task : { ...task, done: true })) : tasks;
    case 'clearCompleted':
      return tasks.some(task => task.done) ? tasks.filter(task => !task.done) : tasks;
    case 'move': {
      const from = tasks.findIndex(task => task.id === action.id);
      const to = from + action.by;
      if (from < 0 || to < 0 || to >= tasks.length) return tasks;
      const next = [...tasks];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    }
    default:
      return tasks;
  }
}

// Every edit becomes a whole-list snapshot on an undo/redo timeline; ids keep counting up across undo.
function reducer(state, action) {
  const { past, present, future } = state;
  switch (action.type) {
    case 'undo':
      return past.length ? { ...state, past: past.slice(0, -1), present: past[past.length - 1], future: [present, ...future] } : state;
    case 'redo':
      return future.length ? { ...state, past: [...past, present], present: future[0], future: future.slice(1) } : state;
    default: {
      const next = edit(present, action, state.nextId);
      if (next === present) return state;
      return { past: [...past, present], present: next, future: [], nextId: state.nextId + (action.type === 'add' ? 1 : 0) };
    }
  }
}

const initial = { past: [], present: [], future: [], nextId: 1 };

export default function App() {
  const [state, dispatch] = useReducer(reducer, initial);
  const [text, setText] = useState('');
  const [filter, setFilter] = useState('All');
  const tasks = state.present;
  const remaining = tasks.filter(task => !task.done).length;
  const completed = tasks.length - remaining;
  const first = tasks[0];
  const last = tasks[tasks.length - 1];

  const add = () => {
    const name = text.trim();
    if (!name) return;
    dispatch({ type: 'add', name });
    setText('');
  };

  return (
    <main>
      <label>Task<input value={text} onChange={event => setText(event.target.value)} /></label>
      <button onClick={add}>Add</button>
      <div>{FILTERS.map(name => <button key={name} onClick={() => setFilter(name)}>{name}</button>)}</div>
      <output aria-label="Remaining">{remaining}</output>
      <ul>
        {tasks.filter(show[filter]).map(task => (
          <li key={task.id}>
            <label><input type="checkbox" checked={task.done} onChange={() => dispatch({ type: 'toggle', id: task.id })} />{task.name}</label>
            <button aria-label={'Delete ' + task.name} onClick={() => dispatch({ type: 'delete', id: task.id })}>Delete</button>
            <button aria-label={'Move up ' + task.name} disabled={task === first} onClick={() => dispatch({ type: 'move', id: task.id, by: -1 })}>Move up</button>
            <button aria-label={'Move down ' + task.name} disabled={task === last} onClick={() => dispatch({ type: 'move', id: task.id, by: 1 })}>Move down</button>
          </li>
        ))}
      </ul>
      <button disabled={state.past.length === 0} onClick={() => dispatch({ type: 'undo' })}>Undo</button>
      <button disabled={state.future.length === 0} onClick={() => dispatch({ type: 'redo' })}>Redo</button>
      <button disabled={remaining === 0} onClick={() => dispatch({ type: 'completeAll' })}>Complete all</button>
      <button disabled={completed === 0} onClick={() => dispatch({ type: 'clearCompleted' })}>Clear completed</button>
    </main>
  );
}`;
    default: return unknownStage(stage);
  }
}

function juniorCatalog(stage: number): string {
  switch (stage) {
    case 1: return `import React, { useState } from 'react';

const products = [
  { id: 1, name: 'Apple', price: 2 },
  { id: 2, name: 'Banana', price: 1 },
  { id: 3, name: 'Carrot', price: 3 },
  { id: 4, name: 'Dates', price: 4 },
];

export default function App() {
  const [query, setQuery] = useState('');

  const search = query.trim().toLowerCase();
  const visible = [];
  for (const product of products) {
    if (product.name.toLowerCase().includes(search)) {
      visible.push(product);
    }
  }

  function handleQueryChange(event) {
    setQuery(event.target.value);
  }

  let list = <p>No products</p>;
  if (visible.length > 0) {
    list = (
      <ul>
        {visible.map(product => (
          <li key={product.id}>{product.name} {product.price}</li>
        ))}
      </ul>
    );
  }

  return (
    <main>
      <label>Search<input value={query} onChange={handleQueryChange} /></label>
      {list}
    </main>
  );
}`;
    case 2: return `import React, { useState } from 'react';

const products = [
  { id: 1, name: 'Apple', price: 2 },
  { id: 2, name: 'Banana', price: 1 },
  { id: 3, name: 'Carrot', price: 3 },
  { id: 4, name: 'Dates', price: 4 },
];

export default function App() {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('name');
  const [page, setPage] = useState(0);

  const search = query.trim().toLowerCase();
  const filtered = [];
  for (const product of products) {
    if (product.name.toLowerCase().includes(search)) {
      filtered.push(product);
    }
  }

  const sorted = [...filtered];
  sorted.sort(function (a, b) {
    if (sort === 'price-asc') {
      return a.price - b.price;
    }
    if (sort === 'price-desc') {
      return b.price - a.price;
    }
    return a.name.localeCompare(b.name);
  });

  const pageCount = Math.ceil(sorted.length / 2);
  const start = page * 2;
  const visible = sorted.slice(start, start + 2);

  let pageLabel = '0 / 0';
  if (pageCount > 0) {
    pageLabel = (page + 1) + ' / ' + pageCount;
  }

  function handleQueryChange(event) {
    setQuery(event.target.value);
    setPage(0);
  }

  function handleSortChange(event) {
    setSort(event.target.value);
    setPage(0);
  }

  function handlePrevious() {
    setPage(page - 1);
  }

  function handleNext() {
    setPage(page + 1);
  }

  let list = <p>No products</p>;
  if (visible.length > 0) {
    list = (
      <ul>
        {visible.map(product => (
          <li key={product.id}>{product.name} {product.price}</li>
        ))}
      </ul>
    );
  }

  return (
    <main>
      <label>Search<input value={query} onChange={handleQueryChange} /></label>
      <label>Sort
        <select value={sort} onChange={handleSortChange}>
          <option value="name">Name</option>
          <option value="price-asc">Price ascending</option>
          <option value="price-desc">Price descending</option>
        </select>
      </label>
      {list}
      <button disabled={page === 0} onClick={handlePrevious}>Previous</button>
      <output aria-label="Page">{pageLabel}</output>
      <button disabled={page + 1 >= pageCount} onClick={handleNext}>Next</button>
    </main>
  );
}`;
    case 3: return `import React, { useState } from 'react';

const products = [
  { id: 1, name: 'Apple', price: 2 },
  { id: 2, name: 'Banana', price: 1 },
  { id: 3, name: 'Carrot', price: 3 },
  { id: 4, name: 'Dates', price: 4 },
];

export default function App() {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('name');
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState([]);

  const search = query.trim().toLowerCase();
  const filtered = [];
  for (const product of products) {
    if (product.name.toLowerCase().includes(search)) {
      filtered.push(product);
    }
  }

  const sorted = [...filtered];
  sorted.sort(function (a, b) {
    if (sort === 'price-asc') {
      return a.price - b.price;
    }
    if (sort === 'price-desc') {
      return b.price - a.price;
    }
    return a.name.localeCompare(b.name);
  });

  const pageCount = Math.ceil(sorted.length / 2);
  const start = page * 2;
  const visible = sorted.slice(start, start + 2);

  let pageLabel = '0 / 0';
  if (pageCount > 0) {
    pageLabel = (page + 1) + ' / ' + pageCount;
  }

  // The total counts every selected product, not only the ones on this page.
  let total = 0;
  for (const product of products) {
    if (selectedIds.includes(product.id)) {
      total = total + product.price;
    }
  }

  function handleQueryChange(event) {
    setQuery(event.target.value);
    setPage(0);
  }

  function handleSortChange(event) {
    setSort(event.target.value);
    setPage(0);
  }

  function handlePrevious() {
    setPage(page - 1);
  }

  function handleNext() {
    setPage(page + 1);
  }

  function handleToggle(id) {
    if (selectedIds.includes(id)) {
      const kept = [];
      for (const selectedId of selectedIds) {
        if (selectedId !== id) {
          kept.push(selectedId);
        }
      }
      setSelectedIds(kept);
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  }

  function handleSelectPage() {
    const next = [...selectedIds];
    for (const product of visible) {
      if (!next.includes(product.id)) {
        next.push(product.id);
      }
    }
    setSelectedIds(next);
  }

  function handleClearSelection() {
    setSelectedIds([]);
  }

  let list = <p>No products</p>;
  if (visible.length > 0) {
    list = (
      <ul>
        {visible.map(product => (
          <li key={product.id}>
            <label><input type="checkbox" checked={selectedIds.includes(product.id)} onChange={() => handleToggle(product.id)} />{product.name}</label> {product.price}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <main>
      <label>Search<input value={query} onChange={handleQueryChange} /></label>
      <label>Sort
        <select value={sort} onChange={handleSortChange}>
          <option value="name">Name</option>
          <option value="price-asc">Price ascending</option>
          <option value="price-desc">Price descending</option>
        </select>
      </label>
      {list}
      <button disabled={page === 0} onClick={handlePrevious}>Previous</button>
      <output aria-label="Page">{pageLabel}</output>
      <button disabled={page + 1 >= pageCount} onClick={handleNext}>Next</button>
      <output aria-label="Selected total">{total}</output>
      <button disabled={visible.length === 0} onClick={handleSelectPage}>Select page</button>
      <button disabled={selectedIds.length === 0} onClick={handleClearSelection}>Clear selection</button>
    </main>
  );
}`;
    case 4: return `import React, { useState } from 'react';

const products = [
  { id: 1, name: 'Apple', price: 2 },
  { id: 2, name: 'Banana', price: 1 },
  { id: 3, name: 'Carrot', price: 3 },
  { id: 4, name: 'Dates', price: 4 },
];

export default function App() {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('name');
  const [maxPrice, setMaxPrice] = useState('');
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState([]);

  const search = query.trim().toLowerCase();
  const filtered = [];
  for (const product of products) {
    const nameMatches = product.name.toLowerCase().includes(search);
    let priceMatches = true;
    if (maxPrice !== '') {
      priceMatches = product.price <= Number(maxPrice);
    }
    if (nameMatches && priceMatches) {
      filtered.push(product);
    }
  }

  const sorted = [...filtered];
  sorted.sort(function (a, b) {
    if (sort === 'price-asc') {
      return a.price - b.price;
    }
    if (sort === 'price-desc') {
      return b.price - a.price;
    }
    return a.name.localeCompare(b.name);
  });

  const pageCount = Math.ceil(sorted.length / 2);
  const start = page * 2;
  const visible = sorted.slice(start, start + 2);

  let pageLabel = '0 / 0';
  if (pageCount > 0) {
    pageLabel = (page + 1) + ' / ' + pageCount;
  }

  // The total counts every selected product, not only the ones on this page.
  let total = 0;
  for (const product of products) {
    if (selectedIds.includes(product.id)) {
      total = total + product.price;
    }
  }

  function handleQueryChange(event) {
    setQuery(event.target.value);
    setPage(0);
  }

  function handleSortChange(event) {
    setSort(event.target.value);
    setPage(0);
  }

  function handleMaxPriceChange(event) {
    setMaxPrice(event.target.value);
    setPage(0);
  }

  function handlePrevious() {
    setPage(page - 1);
  }

  function handleNext() {
    setPage(page + 1);
  }

  function handleToggle(id) {
    if (selectedIds.includes(id)) {
      const kept = [];
      for (const selectedId of selectedIds) {
        if (selectedId !== id) {
          kept.push(selectedId);
        }
      }
      setSelectedIds(kept);
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  }

  function handleSelectPage() {
    const next = [...selectedIds];
    for (const product of visible) {
      if (!next.includes(product.id)) {
        next.push(product.id);
      }
    }
    setSelectedIds(next);
  }

  function handleClearSelection() {
    setSelectedIds([]);
  }

  let list = <p>No products</p>;
  if (visible.length > 0) {
    list = (
      <ul>
        {visible.map(product => (
          <li key={product.id}>
            <label><input type="checkbox" checked={selectedIds.includes(product.id)} onChange={() => handleToggle(product.id)} />{product.name}</label> {product.price}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <main>
      <label>Search<input value={query} onChange={handleQueryChange} /></label>
      <label>Sort
        <select value={sort} onChange={handleSortChange}>
          <option value="name">Name</option>
          <option value="price-asc">Price ascending</option>
          <option value="price-desc">Price descending</option>
        </select>
      </label>
      <label>Maximum price<input type="number" min="0" value={maxPrice} onChange={handleMaxPriceChange} /></label>
      {list}
      <button disabled={page === 0} onClick={handlePrevious}>Previous</button>
      <output aria-label="Page">{pageLabel}</output>
      <button disabled={page + 1 >= pageCount} onClick={handleNext}>Next</button>
      <output aria-label="Selected total">{total}</output>
      <button disabled={visible.length === 0} onClick={handleSelectPage}>Select page</button>
      <button disabled={selectedIds.length === 0} onClick={handleClearSelection}>Clear selection</button>
    </main>
  );
}`;
    case 5: return `import React, { useState } from 'react';

const products = [
  { id: 1, name: 'Apple', price: 2 },
  { id: 2, name: 'Banana', price: 1 },
  { id: 3, name: 'Carrot', price: 3 },
  { id: 4, name: 'Dates', price: 4 },
];

export default function App() {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('name');
  const [maxPrice, setMaxPrice] = useState('');
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState([]);
  const [quantities, setQuantities] = useState({});

  const search = query.trim().toLowerCase();
  const filtered = [];
  for (const product of products) {
    const nameMatches = product.name.toLowerCase().includes(search);
    let priceMatches = true;
    if (maxPrice !== '') {
      priceMatches = product.price <= Number(maxPrice);
    }
    if (nameMatches && priceMatches) {
      filtered.push(product);
    }
  }

  const sorted = [...filtered];
  sorted.sort(function (a, b) {
    if (sort === 'price-asc') {
      return a.price - b.price;
    }
    if (sort === 'price-desc') {
      return b.price - a.price;
    }
    return a.name.localeCompare(b.name);
  });

  const pageCount = Math.ceil(sorted.length / 2);
  const start = page * 2;
  const visible = sorted.slice(start, start + 2);

  let pageLabel = '0 / 0';
  if (pageCount > 0) {
    pageLabel = (page + 1) + ' / ' + pageCount;
  }

  // The cart holds every selected product, not only the ones on this page.
  const selectedProducts = [];
  let total = 0;
  for (const product of products) {
    if (selectedIds.includes(product.id)) {
      selectedProducts.push(product);
      total = total + product.price * quantities[product.id];
    }
  }

  function handleQueryChange(event) {
    setQuery(event.target.value);
    setPage(0);
  }

  function handleSortChange(event) {
    setSort(event.target.value);
    setPage(0);
  }

  function handleMaxPriceChange(event) {
    setMaxPrice(event.target.value);
    setPage(0);
  }

  function handlePrevious() {
    setPage(page - 1);
  }

  function handleNext() {
    setPage(page + 1);
  }

  function handleToggle(id) {
    const nextQuantities = { ...quantities };
    if (selectedIds.includes(id)) {
      const kept = [];
      for (const selectedId of selectedIds) {
        if (selectedId !== id) {
          kept.push(selectedId);
        }
      }
      delete nextQuantities[id];
      setSelectedIds(kept);
    } else {
      nextQuantities[id] = 1;
      setSelectedIds([...selectedIds, id]);
    }
    setQuantities(nextQuantities);
  }

  function handleSelectPage() {
    const nextIds = [...selectedIds];
    const nextQuantities = { ...quantities };
    for (const product of visible) {
      if (!nextIds.includes(product.id)) {
        nextIds.push(product.id);
        nextQuantities[product.id] = 1;
      }
    }
    setSelectedIds(nextIds);
    setQuantities(nextQuantities);
  }

  function handleClearSelection() {
    setSelectedIds([]);
    setQuantities({});
  }

  function handleQuantityChange(id, event) {
    const quantity = Number(event.target.value);
    if (!Number.isInteger(quantity)) {
      return;
    }
    if (quantity < 1 || quantity > 99) {
      return;
    }
    const nextQuantities = { ...quantities };
    nextQuantities[id] = quantity;
    setQuantities(nextQuantities);
  }

  let list = <p>No products</p>;
  if (visible.length > 0) {
    list = (
      <ul>
        {visible.map(product => (
          <li key={product.id}>
            <label><input type="checkbox" checked={selectedIds.includes(product.id)} onChange={() => handleToggle(product.id)} />{product.name}</label> {product.price}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <main>
      <label>Search<input value={query} onChange={handleQueryChange} /></label>
      <label>Sort
        <select value={sort} onChange={handleSortChange}>
          <option value="name">Name</option>
          <option value="price-asc">Price ascending</option>
          <option value="price-desc">Price descending</option>
        </select>
      </label>
      <label>Maximum price<input type="number" min="0" value={maxPrice} onChange={handleMaxPriceChange} /></label>
      {list}
      <button disabled={page === 0} onClick={handlePrevious}>Previous</button>
      <output aria-label="Page">{pageLabel}</output>
      <button disabled={page + 1 >= pageCount} onClick={handleNext}>Next</button>
      <output aria-label="Selected total">{total}</output>
      <button disabled={visible.length === 0} onClick={handleSelectPage}>Select page</button>
      <button disabled={selectedIds.length === 0} onClick={handleClearSelection}>Clear selection</button>
      <section aria-label="Cart">
        {selectedProducts.map(product => (
          <label key={product.id}>
            {'Quantity ' + product.name}
            <input type="number" min="1" max="99" value={quantities[product.id]} onChange={event => handleQuantityChange(product.id, event)} />
          </label>
        ))}
      </section>
    </main>
  );
}`;
    default: return unknownStage(stage);
  }
}

function seniorCatalog(stage: number): string {
  switch (stage) {
    case 1: return `import React, { useState } from 'react';

const PRODUCTS = [
  { id: 1, name: 'Apple', price: 2 },
  { id: 2, name: 'Banana', price: 1 },
  { id: 3, name: 'Carrot', price: 3 },
  { id: 4, name: 'Dates', price: 4 },
];

export default function App() {
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const rows = PRODUCTS.filter(product => product.name.toLowerCase().includes(needle));

  return (
    <main>
      <label>Search<input value={query} onChange={event => setQuery(event.target.value)} /></label>
      {rows.length === 0 && <p>No products</p>}
      <ul>
        {rows.map(product => <li key={product.id}>{product.name} {product.price}</li>)}
      </ul>
    </main>
  );
}`;
    case 2: return `import React, { useState } from 'react';

const PRODUCTS = [
  { id: 1, name: 'Apple', price: 2 },
  { id: 2, name: 'Banana', price: 1 },
  { id: 3, name: 'Carrot', price: 3 },
  { id: 4, name: 'Dates', price: 4 },
];
const PAGE_SIZE = 2;
const compare = {
  name: (a, b) => a.name.localeCompare(b.name),
  'price-asc': (a, b) => a.price - b.price,
  'price-desc': (a, b) => b.price - a.price,
};

export default function App() {
  const [view, setView] = useState({ query: '', sort: 'name', page: 0 });
  // Changing what is shown always lands on the first page; only paging itself keeps the rest.
  const refine = patch => setView(current => ({ ...current, ...patch, page: 0 }));
  const turn = by => setView(current => ({ ...current, page: current.page + by }));

  const needle = view.query.trim().toLowerCase();
  const rows = PRODUCTS.filter(product => product.name.toLowerCase().includes(needle)).sort(compare[view.sort]);
  const pages = Math.ceil(rows.length / PAGE_SIZE);
  const visible = rows.slice(view.page * PAGE_SIZE, (view.page + 1) * PAGE_SIZE);
  const pageLabel = (pages ? view.page + 1 : 0) + ' / ' + pages;

  return (
    <main>
      <label>Search<input value={view.query} onChange={event => refine({ query: event.target.value })} /></label>
      <label>Sort
        <select value={view.sort} onChange={event => refine({ sort: event.target.value })}>
          <option value="name">Name</option>
          <option value="price-asc">Price ascending</option>
          <option value="price-desc">Price descending</option>
        </select>
      </label>
      {visible.length === 0 && <p>No products</p>}
      <ul>
        {visible.map(product => <li key={product.id}>{product.name} {product.price}</li>)}
      </ul>
      <button disabled={view.page === 0} onClick={() => turn(-1)}>Previous</button>
      <output aria-label="Page">{pageLabel}</output>
      <button disabled={view.page + 1 >= pages} onClick={() => turn(1)}>Next</button>
    </main>
  );
}`;
    case 3: return `import React, { useState } from 'react';

const PRODUCTS = [
  { id: 1, name: 'Apple', price: 2 },
  { id: 2, name: 'Banana', price: 1 },
  { id: 3, name: 'Carrot', price: 3 },
  { id: 4, name: 'Dates', price: 4 },
];
const PAGE_SIZE = 2;
const compare = {
  name: (a, b) => a.name.localeCompare(b.name),
  'price-asc': (a, b) => a.price - b.price,
  'price-desc': (a, b) => b.price - a.price,
};

export default function App() {
  const [view, setView] = useState({ query: '', sort: 'name', page: 0 });
  const [selected, setSelected] = useState(() => new Set());
  // Changing what is shown always lands on the first page; only paging itself keeps the rest.
  const refine = patch => setView(current => ({ ...current, ...patch, page: 0 }));
  const turn = by => setView(current => ({ ...current, page: current.page + by }));

  const needle = view.query.trim().toLowerCase();
  const rows = PRODUCTS.filter(product => product.name.toLowerCase().includes(needle)).sort(compare[view.sort]);
  const pages = Math.ceil(rows.length / PAGE_SIZE);
  const visible = rows.slice(view.page * PAGE_SIZE, (view.page + 1) * PAGE_SIZE);
  const pageLabel = (pages ? view.page + 1 : 0) + ' / ' + pages;
  // Selection is keyed by id, so it outlives paging, searching and sorting.
  const total = PRODUCTS.filter(product => selected.has(product.id)).reduce((sum, product) => sum + product.price, 0);

  const toggle = id => setSelected(current => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
  const selectPage = () => setSelected(current => new Set([...current, ...visible.map(product => product.id)]));
  const clear = () => setSelected(new Set());

  return (
    <main>
      <label>Search<input value={view.query} onChange={event => refine({ query: event.target.value })} /></label>
      <label>Sort
        <select value={view.sort} onChange={event => refine({ sort: event.target.value })}>
          <option value="name">Name</option>
          <option value="price-asc">Price ascending</option>
          <option value="price-desc">Price descending</option>
        </select>
      </label>
      {visible.length === 0 && <p>No products</p>}
      <ul>
        {visible.map(product => (
          <li key={product.id}>
            <label><input type="checkbox" checked={selected.has(product.id)} onChange={() => toggle(product.id)} />{product.name}</label> {product.price}
          </li>
        ))}
      </ul>
      <button disabled={view.page === 0} onClick={() => turn(-1)}>Previous</button>
      <output aria-label="Page">{pageLabel}</output>
      <button disabled={view.page + 1 >= pages} onClick={() => turn(1)}>Next</button>
      <output aria-label="Selected total">{total}</output>
      <button disabled={visible.length === 0} onClick={selectPage}>Select page</button>
      <button disabled={selected.size === 0} onClick={clear}>Clear selection</button>
    </main>
  );
}`;
    case 4: return `import React, { useState } from 'react';

const PRODUCTS = [
  { id: 1, name: 'Apple', price: 2 },
  { id: 2, name: 'Banana', price: 1 },
  { id: 3, name: 'Carrot', price: 3 },
  { id: 4, name: 'Dates', price: 4 },
];
const PAGE_SIZE = 2;
const compare = {
  name: (a, b) => a.name.localeCompare(b.name),
  'price-asc': (a, b) => a.price - b.price,
  'price-desc': (a, b) => b.price - a.price,
};

export default function App() {
  const [view, setView] = useState({ query: '', sort: 'name', maxPrice: '', page: 0 });
  const [selected, setSelected] = useState(() => new Set());
  // Changing what is shown always lands on the first page; only paging itself keeps the rest.
  const refine = patch => setView(current => ({ ...current, ...patch, page: 0 }));
  const turn = by => setView(current => ({ ...current, page: current.page + by }));

  const needle = view.query.trim().toLowerCase();
  const limit = view.maxPrice === '' ? Infinity : Number(view.maxPrice);
  const matches = product => product.name.toLowerCase().includes(needle) && product.price <= limit;
  const rows = PRODUCTS.filter(matches).sort(compare[view.sort]);
  const pages = Math.ceil(rows.length / PAGE_SIZE);
  const visible = rows.slice(view.page * PAGE_SIZE, (view.page + 1) * PAGE_SIZE);
  const pageLabel = (pages ? view.page + 1 : 0) + ' / ' + pages;
  // Selection is keyed by id, so it outlives paging, searching, sorting and the price limit.
  const total = PRODUCTS.filter(product => selected.has(product.id)).reduce((sum, product) => sum + product.price, 0);

  const toggle = id => setSelected(current => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
  const selectPage = () => setSelected(current => new Set([...current, ...visible.map(product => product.id)]));
  const clear = () => setSelected(new Set());

  return (
    <main>
      <label>Search<input value={view.query} onChange={event => refine({ query: event.target.value })} /></label>
      <label>Sort
        <select value={view.sort} onChange={event => refine({ sort: event.target.value })}>
          <option value="name">Name</option>
          <option value="price-asc">Price ascending</option>
          <option value="price-desc">Price descending</option>
        </select>
      </label>
      <label>Maximum price<input type="number" min="0" value={view.maxPrice} onChange={event => refine({ maxPrice: event.target.value })} /></label>
      {visible.length === 0 && <p>No products</p>}
      <ul>
        {visible.map(product => (
          <li key={product.id}>
            <label><input type="checkbox" checked={selected.has(product.id)} onChange={() => toggle(product.id)} />{product.name}</label> {product.price}
          </li>
        ))}
      </ul>
      <button disabled={view.page === 0} onClick={() => turn(-1)}>Previous</button>
      <output aria-label="Page">{pageLabel}</output>
      <button disabled={view.page + 1 >= pages} onClick={() => turn(1)}>Next</button>
      <output aria-label="Selected total">{total}</output>
      <button disabled={visible.length === 0} onClick={selectPage}>Select page</button>
      <button disabled={selected.size === 0} onClick={clear}>Clear selection</button>
    </main>
  );
}`;
    case 5: return `import React, { useState } from 'react';

const PRODUCTS = [
  { id: 1, name: 'Apple', price: 2 },
  { id: 2, name: 'Banana', price: 1 },
  { id: 3, name: 'Carrot', price: 3 },
  { id: 4, name: 'Dates', price: 4 },
];
const PAGE_SIZE = 2;
const compare = {
  name: (a, b) => a.name.localeCompare(b.name),
  'price-asc': (a, b) => a.price - b.price,
  'price-desc': (a, b) => b.price - a.price,
};

export default function App() {
  const [view, setView] = useState({ query: '', sort: 'name', maxPrice: '', page: 0 });
  // The cart maps product id to quantity; being in the map is what "selected" means.
  const [cart, setCart] = useState(() => new Map());
  // Changing what is shown always lands on the first page; only paging itself keeps the rest.
  const refine = patch => setView(current => ({ ...current, ...patch, page: 0 }));
  const turn = by => setView(current => ({ ...current, page: current.page + by }));

  const needle = view.query.trim().toLowerCase();
  const limit = view.maxPrice === '' ? Infinity : Number(view.maxPrice);
  const matches = product => product.name.toLowerCase().includes(needle) && product.price <= limit;
  const rows = PRODUCTS.filter(matches).sort(compare[view.sort]);
  const pages = Math.ceil(rows.length / PAGE_SIZE);
  const visible = rows.slice(view.page * PAGE_SIZE, (view.page + 1) * PAGE_SIZE);
  const pageLabel = (pages ? view.page + 1 : 0) + ' / ' + pages;
  const lines = PRODUCTS.filter(product => cart.has(product.id));
  const total = lines.reduce((sum, product) => sum + product.price * cart.get(product.id), 0);

  const toggle = id => setCart(current => {
    const next = new Map(current);
    if (next.has(id)) next.delete(id);
    else next.set(id, 1);
    return next;
  });
  const selectPage = () => setCart(current => {
    const next = new Map(current);
    for (const product of visible) if (!next.has(product.id)) next.set(product.id, 1);
    return next;
  });
  const clear = () => setCart(new Map());
  const setQuantity = (id, raw) => {
    const quantity = Number(raw);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) return; // the controlled input snaps back
    setCart(current => new Map(current).set(id, quantity));
  };

  return (
    <main>
      <label>Search<input value={view.query} onChange={event => refine({ query: event.target.value })} /></label>
      <label>Sort
        <select value={view.sort} onChange={event => refine({ sort: event.target.value })}>
          <option value="name">Name</option>
          <option value="price-asc">Price ascending</option>
          <option value="price-desc">Price descending</option>
        </select>
      </label>
      <label>Maximum price<input type="number" min="0" value={view.maxPrice} onChange={event => refine({ maxPrice: event.target.value })} /></label>
      {visible.length === 0 && <p>No products</p>}
      <ul>
        {visible.map(product => (
          <li key={product.id}>
            <label><input type="checkbox" checked={cart.has(product.id)} onChange={() => toggle(product.id)} />{product.name}</label> {product.price}
          </li>
        ))}
      </ul>
      <button disabled={view.page === 0} onClick={() => turn(-1)}>Previous</button>
      <output aria-label="Page">{pageLabel}</output>
      <button disabled={view.page + 1 >= pages} onClick={() => turn(1)}>Next</button>
      <output aria-label="Selected total">{total}</output>
      <button disabled={visible.length === 0} onClick={selectPage}>Select page</button>
      <button disabled={cart.size === 0} onClick={clear}>Clear selection</button>
      <section aria-label="Cart">
        {lines.map(product => (
          <label key={product.id}>
            {'Quantity ' + product.name}
            <input type="number" min="1" max="99" value={cart.get(product.id)} onChange={event => setQuantity(product.id, event.target.value)} />
          </label>
        ))}
      </section>
    </main>
  );
}`;
    default: return unknownStage(stage);
  }
}

function juniorForm(stage: number): string {
  switch (stage) {
    case 1: return `import React, { useState } from 'react';

const emailPattern = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;

export default function App() {
  const [email, setEmail] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');

  function handleEmailChange(event) {
    setEmail(event.target.value);
  }

  function handleNext(event) {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!emailPattern.test(trimmedEmail)) {
      setError('Invalid email');
      return;
    }
    setEmail(trimmedEmail);
    setError('');
    setAccepted(true);
  }

  return (
    <main>
      {accepted && <p>Email accepted</p>}
      {error !== '' && <p role="alert">{error}</p>}
      <form onSubmit={handleNext}>
        <label>Email<input value={email} onChange={handleEmailChange} /></label>
        <button>Next</button>
      </form>
    </main>
  );
}`;
    case 2: return `import React, { useState } from 'react';

const emailPattern = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;

export default function App() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');

  function handleEmailChange(event) {
    setEmail(event.target.value);
  }

  function handleNameChange(event) {
    setName(event.target.value);
  }

  function hasTwoCharacters(value) {
    const withoutSpaces = value.replace(/\\s/g, '');
    return withoutSpaces.length >= 2;
  }

  function handleNext(event) {
    event.preventDefault();
    if (step === 0) {
      const trimmedEmail = email.trim();
      if (!emailPattern.test(trimmedEmail)) {
        setError('Invalid email');
        return;
      }
      setEmail(trimmedEmail);
      setError('');
      setStep(1);
    } else if (step === 1) {
      const trimmedName = name.trim();
      if (!hasTwoCharacters(trimmedName)) {
        setError('Invalid name');
        return;
      }
      setName(trimmedName);
      setError('');
      setStep(2);
    }
  }

  function handleBack() {
    setStep(step - 1);
    setError('');
  }

  let stepContent = null;
  if (step === 0) {
    stepContent = (
      <>
        <label>Email<input value={email} onChange={handleEmailChange} /></label>
        <button>Next</button>
      </>
    );
  } else if (step === 1) {
    stepContent = (
      <>
        <label>Name<input value={name} onChange={handleNameChange} /></label>
        <button type="button" onClick={handleBack}>Back</button>
        <button>Next</button>
      </>
    );
  } else {
    stepContent = (
      <>
        <p>{email}</p>
        <p>{name}</p>
        <button type="button" onClick={handleBack}>Back</button>
      </>
    );
  }

  return (
    <main>
      {step > 0 && <p>Email accepted</p>}
      {error !== '' && <p role="alert">{error}</p>}
      <form onSubmit={handleNext}>{stepContent}</form>
    </main>
  );
}`;
    case 3: return `import React, { useState } from 'react';

const emailPattern = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;

export default function App() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [consent, setConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [submittedName, setSubmittedName] = useState('');

  function handleEmailChange(event) {
    setEmail(event.target.value);
  }

  function handleNameChange(event) {
    setName(event.target.value);
  }

  function handleConsentChange(event) {
    setConsent(event.target.checked);
  }

  function hasTwoCharacters(value) {
    const withoutSpaces = value.replace(/\\s/g, '');
    return withoutSpaces.length >= 2;
  }

  function handleNext(event) {
    event.preventDefault();
    if (step === 0) {
      const trimmedEmail = email.trim();
      if (!emailPattern.test(trimmedEmail)) {
        setError('Invalid email');
        return;
      }
      setEmail(trimmedEmail);
      setError('');
      setStep(1);
    } else if (step === 1) {
      const trimmedName = name.trim();
      if (!hasTwoCharacters(trimmedName)) {
        setError('Invalid name');
        return;
      }
      setName(trimmedName);
      setError('');
      setStep(2);
    }
  }

  function handleBack() {
    setStep(step - 1);
    setError('');
    setConsent(false);
  }

  function handleSubmit() {
    setSubmittedEmail(email);
    setSubmittedName(name);
    setSubmitted(true);
  }

  function handleStartOver() {
    setEmail('');
    setName('');
    setStep(0);
    setError('');
    setConsent(false);
    setSubmitted(false);
    setSubmittedEmail('');
    setSubmittedName('');
  }

  if (submitted) {
    return (
      <main>
        <p>Submitted</p>
        <p>{submittedEmail}</p>
        <p>{submittedName}</p>
        <button onClick={handleStartOver}>Start over</button>
      </main>
    );
  }

  let stepContent = null;
  if (step === 0) {
    stepContent = (
      <>
        <label>Email<input value={email} onChange={handleEmailChange} /></label>
        <button>Next</button>
      </>
    );
  } else if (step === 1) {
    stepContent = (
      <>
        <label>Name<input value={name} onChange={handleNameChange} /></label>
        <button type="button" onClick={handleBack}>Back</button>
        <button>Next</button>
      </>
    );
  } else {
    stepContent = (
      <>
        <p>{email}</p>
        <p>{name}</p>
        <button type="button" onClick={handleBack}>Back</button>
        <label><input type="checkbox" checked={consent} onChange={handleConsentChange} />I agree</label>
        <button type="button" disabled={!consent} onClick={handleSubmit}>Submit</button>
      </>
    );
  }

  return (
    <main>
      {step > 0 && <p>Email accepted</p>}
      {error !== '' && <p role="alert">{error}</p>}
      <form onSubmit={handleNext}>{stepContent}</form>
    </main>
  );
}`;
    case 4: return `import React, { useState } from 'react';

const emailPattern = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;

export default function App() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [account, setAccount] = useState('personal');
  const [company, setCompany] = useState('');
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [consent, setConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [submittedName, setSubmittedName] = useState('');
  const [submittedCompany, setSubmittedCompany] = useState('');

  function handleEmailChange(event) {
    setEmail(event.target.value);
  }

  function handleNameChange(event) {
    setName(event.target.value);
  }

  function handleAccountChange(event) {
    setAccount(event.target.value);
  }

  function handleCompanyChange(event) {
    setCompany(event.target.value);
  }

  function handleConsentChange(event) {
    setConsent(event.target.checked);
  }

  function hasTwoCharacters(value) {
    const withoutSpaces = value.replace(/\\s/g, '');
    return withoutSpaces.length >= 2;
  }

  function handleNext(event) {
    event.preventDefault();
    if (step === 0) {
      const trimmedEmail = email.trim();
      if (!emailPattern.test(trimmedEmail)) {
        setError('Invalid email');
        return;
      }
      setEmail(trimmedEmail);
      setError('');
      setStep(1);
    } else if (step === 1) {
      const trimmedName = name.trim();
      if (!hasTwoCharacters(trimmedName)) {
        setError('Invalid name');
        return;
      }
      if (account === 'business') {
        const trimmedCompany = company.trim();
        if (!hasTwoCharacters(trimmedCompany)) {
          setError('Invalid company');
          return;
        }
        setCompany(trimmedCompany);
      }
      setName(trimmedName);
      setError('');
      setStep(2);
    }
  }

  function handleBack() {
    setStep(step - 1);
    setError('');
    setConsent(false);
  }

  function handleSubmit() {
    setSubmittedEmail(email);
    setSubmittedName(name);
    if (account === 'business') {
      setSubmittedCompany(company);
    } else {
      setSubmittedCompany('');
    }
    setSubmitted(true);
  }

  function handleStartOver() {
    setEmail('');
    setName('');
    setAccount('personal');
    setCompany('');
    setStep(0);
    setError('');
    setConsent(false);
    setSubmitted(false);
    setSubmittedEmail('');
    setSubmittedName('');
    setSubmittedCompany('');
  }

  if (submitted) {
    let companyLine = null;
    if (submittedCompany !== '') {
      companyLine = <p>{submittedCompany}</p>;
    }
    return (
      <main>
        <p>Submitted</p>
        <p>{submittedEmail}</p>
        <p>{submittedName}</p>
        {companyLine}
        <button onClick={handleStartOver}>Start over</button>
      </main>
    );
  }

  let companyField = null;
  let companyLine = null;
  if (account === 'business') {
    companyField = <label>Company<input value={company} onChange={handleCompanyChange} /></label>;
    companyLine = <p>{company}</p>;
  }

  let stepContent = null;
  if (step === 0) {
    stepContent = (
      <>
        <label>Email<input value={email} onChange={handleEmailChange} /></label>
        <button>Next</button>
      </>
    );
  } else if (step === 1) {
    stepContent = (
      <>
        <label>Name<input value={name} onChange={handleNameChange} /></label>
        <label>Account type
          <select value={account} onChange={handleAccountChange}>
            <option value="personal">Personal</option>
            <option value="business">Business</option>
          </select>
        </label>
        {companyField}
        <button type="button" onClick={handleBack}>Back</button>
        <button>Next</button>
      </>
    );
  } else {
    stepContent = (
      <>
        <p>{email}</p>
        <p>{name}</p>
        {companyLine}
        <button type="button" onClick={handleBack}>Back</button>
        <label><input type="checkbox" checked={consent} onChange={handleConsentChange} />I agree</label>
        <button type="button" disabled={!consent} onClick={handleSubmit}>Submit</button>
      </>
    );
  }

  return (
    <main>
      {step > 0 && <p>Email accepted</p>}
      {error !== '' && <p role="alert">{error}</p>}
      <form onSubmit={handleNext}>{stepContent}</form>
    </main>
  );
}`;
    case 5: return `import React, { useState } from 'react';

const emailPattern = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
const draftKey = 'evolving-form-draft';

export default function App() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [account, setAccount] = useState('personal');
  const [company, setCompany] = useState('');
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [consent, setConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [submittedName, setSubmittedName] = useState('');
  const [submittedCompany, setSubmittedCompany] = useState('');

  function handleEmailChange(event) {
    setEmail(event.target.value);
  }

  function handleNameChange(event) {
    setName(event.target.value);
  }

  function handleAccountChange(event) {
    setAccount(event.target.value);
  }

  function handleCompanyChange(event) {
    setCompany(event.target.value);
  }

  function handleConsentChange(event) {
    setConsent(event.target.checked);
  }

  function hasTwoCharacters(value) {
    const withoutSpaces = value.replace(/\\s/g, '');
    return withoutSpaces.length >= 2;
  }

  function handleNext(event) {
    event.preventDefault();
    if (step === 0) {
      const trimmedEmail = email.trim();
      if (!emailPattern.test(trimmedEmail)) {
        setError('Invalid email');
        return;
      }
      setEmail(trimmedEmail);
      setError('');
      setStep(1);
    } else if (step === 1) {
      const trimmedName = name.trim();
      if (!hasTwoCharacters(trimmedName)) {
        setError('Invalid name');
        return;
      }
      if (account === 'business') {
        const trimmedCompany = company.trim();
        if (!hasTwoCharacters(trimmedCompany)) {
          setError('Invalid company');
          return;
        }
        setCompany(trimmedCompany);
      }
      setName(trimmedName);
      setError('');
      setStep(2);
    }
  }

  function handleBack() {
    setStep(step - 1);
    setError('');
    setConsent(false);
  }

  function handleSubmit() {
    setSubmittedEmail(email);
    setSubmittedName(name);
    if (account === 'business') {
      setSubmittedCompany(company);
    } else {
      setSubmittedCompany('');
    }
    setSubmitted(true);
  }

  function handleStartOver() {
    setEmail('');
    setName('');
    setAccount('personal');
    setCompany('');
    setStep(0);
    setError('');
    setConsent(false);
    setSubmitted(false);
    setSubmittedEmail('');
    setSubmittedName('');
    setSubmittedCompany('');
  }

  function handleSaveDraft() {
    const draft = { version: 1, email: email, name: name, account: account, company: company };
    try {
      localStorage.setItem(draftKey, JSON.stringify(draft));
    } catch (problem) {
      setError('Draft unavailable');
    }
  }

  function handleRestoreDraft() {
    let draft = null;
    try {
      const stored = localStorage.getItem(draftKey);
      draft = JSON.parse(stored);
    } catch (problem) {
      draft = null;
    }
    let valid = true;
    if (draft === null || typeof draft !== 'object') {
      valid = false;
    } else if (draft.version !== 1) {
      valid = false;
    } else if (typeof draft.email !== 'string' || typeof draft.name !== 'string' || typeof draft.company !== 'string') {
      valid = false;
    } else if (draft.account !== 'personal' && draft.account !== 'business') {
      valid = false;
    }
    if (!valid) {
      setError('Draft unavailable');
      return;
    }
    setEmail(draft.email);
    setName(draft.name);
    setAccount(draft.account);
    setCompany(draft.company);
    setStep(0);
    setConsent(false);
    setError('');
  }

  function handleClearDraft() {
    try {
      localStorage.removeItem(draftKey);
    } catch (problem) {
      setError('Draft unavailable');
    }
  }

  if (submitted) {
    let companyLine = null;
    if (submittedCompany !== '') {
      companyLine = <p>{submittedCompany}</p>;
    }
    return (
      <main>
        <p>Submitted</p>
        <p>{submittedEmail}</p>
        <p>{submittedName}</p>
        {companyLine}
        <button onClick={handleStartOver}>Start over</button>
      </main>
    );
  }

  let companyField = null;
  let companyLine = null;
  if (account === 'business') {
    companyField = <label>Company<input value={company} onChange={handleCompanyChange} /></label>;
    companyLine = <p>{company}</p>;
  }

  let stepContent = null;
  if (step === 0) {
    stepContent = (
      <>
        <label>Email<input value={email} onChange={handleEmailChange} /></label>
        <button>Next</button>
      </>
    );
  } else if (step === 1) {
    stepContent = (
      <>
        <label>Name<input value={name} onChange={handleNameChange} /></label>
        <label>Account type
          <select value={account} onChange={handleAccountChange}>
            <option value="personal">Personal</option>
            <option value="business">Business</option>
          </select>
        </label>
        {companyField}
        <button type="button" onClick={handleBack}>Back</button>
        <button>Next</button>
      </>
    );
  } else {
    stepContent = (
      <>
        <p>{email}</p>
        <p>{name}</p>
        {companyLine}
        <button type="button" onClick={handleBack}>Back</button>
        <label><input type="checkbox" checked={consent} onChange={handleConsentChange} />I agree</label>
        <button type="button" disabled={!consent} onClick={handleSubmit}>Submit</button>
      </>
    );
  }

  return (
    <main>
      {step > 0 && <p>Email accepted</p>}
      {error !== '' && <p role="alert">{error}</p>}
      <form onSubmit={handleNext}>{stepContent}</form>
      <button type="button" onClick={handleSaveDraft}>Save draft</button>
      <button type="button" onClick={handleRestoreDraft}>Restore draft</button>
      <button type="button" onClick={handleClearDraft}>Clear draft</button>
    </main>
  );
}`;
    default: return unknownStage(stage);
  }
}

function seniorForm(stage: number): string {
  switch (stage) {
    case 1: return `import React, { useState } from 'react';

const EMAIL = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;

const Field = ({ label, value, onChange }) => (
  <label>{label}<input value={value} onChange={event => onChange(event.target.value)} /></label>
);

export default function App() {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');

  const advance = event => {
    event.preventDefault();
    const value = email.trim();
    if (!EMAIL.test(value)) {
      setError('Invalid email');
      return;
    }
    setEmail(value);
    setError('');
    setStep(1);
  };

  return (
    <main>
      {step > 0 && <p>Email accepted</p>}
      {error && <p role="alert">{error}</p>}
      <form onSubmit={advance}>
        {step === 0 && <><Field label="Email" value={email} onChange={setEmail} /><button>Next</button></>}
      </form>
    </main>
  );
}`;
    case 2: return `import React, { useState } from 'react';

const EMAIL = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
const EMPTY = { email: '', name: '' };
const compact = value => value.replace(/\\s/g, '');

// One validator per step; an empty string means the step may advance.
const validate = [
  fields => (EMAIL.test(fields.email.trim()) ? '' : 'Invalid email'),
  fields => (compact(fields.name).length < 2 ? 'Invalid name' : ''),
];

const trimAll = fields => Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, value.trim()]));

const Field = ({ label, value, onChange }) => (
  <label>{label}<input value={value} onChange={event => onChange(event.target.value)} /></label>
);

export default function App() {
  const [fields, setFields] = useState(EMPTY);
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const update = (key, value) => setFields(current => ({ ...current, [key]: value }));

  const advance = event => {
    event.preventDefault();
    const problem = validate[step](fields);
    setError(problem);
    if (problem) return;
    setFields(trimAll);
    setStep(step + 1);
  };
  const back = () => {
    setStep(step - 1);
    setError('');
  };

  return (
    <main>
      {step > 0 && <p>Email accepted</p>}
      {error && <p role="alert">{error}</p>}
      <form onSubmit={advance}>
        {step === 0 && <><Field label="Email" value={fields.email} onChange={value => update('email', value)} /><button>Next</button></>}
        {step === 1 && (
          <>
            <Field label="Name" value={fields.name} onChange={value => update('name', value)} />
            <button type="button" onClick={back}>Back</button>
            <button>Next</button>
          </>
        )}
        {step === 2 && (
          <>
            <p>{fields.email}</p>
            <p>{fields.name}</p>
            <button type="button" onClick={back}>Back</button>
          </>
        )}
      </form>
    </main>
  );
}`;
    case 3: return `import React, { useState } from 'react';

const EMAIL = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
const EMPTY = { email: '', name: '' };
const compact = value => value.replace(/\\s/g, '');

// One validator per step; an empty string means the step may advance.
const validate = [
  fields => (EMAIL.test(fields.email.trim()) ? '' : 'Invalid email'),
  fields => (compact(fields.name).length < 2 ? 'Invalid name' : ''),
];

const trimAll = fields => Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, value.trim()]));

const Field = ({ label, value, onChange }) => (
  <label>{label}<input value={value} onChange={event => onChange(event.target.value)} /></label>
);

export default function App() {
  const [fields, setFields] = useState(EMPTY);
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [consent, setConsent] = useState(false);
  // The receipt is its own copy, so later edits can never change what was submitted.
  const [receipt, setReceipt] = useState(null);
  const update = (key, value) => setFields(current => ({ ...current, [key]: value }));

  const advance = event => {
    event.preventDefault();
    const problem = validate[step](fields);
    setError(problem);
    if (problem) return;
    setFields(trimAll);
    setStep(step + 1);
  };
  const back = () => {
    setStep(step - 1);
    setError('');
    setConsent(false);
  };
  const submit = () => setReceipt({ ...fields });
  const restart = () => {
    setFields(EMPTY);
    setStep(0);
    setError('');
    setConsent(false);
    setReceipt(null);
  };

  if (receipt) {
    return (
      <main>
        <p>Submitted</p>
        <p>{receipt.email}</p>
        <p>{receipt.name}</p>
        <button onClick={restart}>Start over</button>
      </main>
    );
  }

  return (
    <main>
      {step > 0 && <p>Email accepted</p>}
      {error && <p role="alert">{error}</p>}
      <form onSubmit={advance}>
        {step === 0 && <><Field label="Email" value={fields.email} onChange={value => update('email', value)} /><button>Next</button></>}
        {step === 1 && (
          <>
            <Field label="Name" value={fields.name} onChange={value => update('name', value)} />
            <button type="button" onClick={back}>Back</button>
            <button>Next</button>
          </>
        )}
        {step === 2 && (
          <>
            <p>{fields.email}</p>
            <p>{fields.name}</p>
            <button type="button" onClick={back}>Back</button>
            <label><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} />I agree</label>
            <button type="button" disabled={!consent} onClick={submit}>Submit</button>
          </>
        )}
      </form>
    </main>
  );
}`;
    case 4: return `import React, { useState } from 'react';

const EMAIL = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
const EMPTY = { email: '', name: '', account: 'personal', company: '' };
const compact = value => value.replace(/\\s/g, '');

// One validator per step; an empty string means the step may advance.
const validate = [
  fields => (EMAIL.test(fields.email.trim()) ? '' : 'Invalid email'),
  fields => {
    if (compact(fields.name).length < 2) return 'Invalid name';
    if (fields.account === 'business' && compact(fields.company).length < 2) return 'Invalid company';
    return '';
  },
];

const trimAll = fields => Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, value.trim()]));

const Field = ({ label, value, onChange }) => (
  <label>{label}<input value={value} onChange={event => onChange(event.target.value)} /></label>
);

export default function App() {
  const [fields, setFields] = useState(EMPTY);
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [consent, setConsent] = useState(false);
  // The receipt is its own copy, so later edits can never change what was submitted.
  const [receipt, setReceipt] = useState(null);
  const business = fields.account === 'business';
  const update = (key, value) => setFields(current => ({ ...current, [key]: value }));

  const advance = event => {
    event.preventDefault();
    const problem = validate[step](fields);
    setError(problem);
    if (problem) return;
    setFields(trimAll);
    setStep(step + 1);
  };
  const back = () => {
    setStep(step - 1);
    setError('');
    setConsent(false);
  };
  // A personal account keeps its typed company for later, but never submits it.
  const submit = () => setReceipt({ email: fields.email, name: fields.name, company: business ? fields.company : '' });
  const restart = () => {
    setFields(EMPTY);
    setStep(0);
    setError('');
    setConsent(false);
    setReceipt(null);
  };

  if (receipt) {
    return (
      <main>
        <p>Submitted</p>
        <p>{receipt.email}</p>
        <p>{receipt.name}</p>
        {receipt.company && <p>{receipt.company}</p>}
        <button onClick={restart}>Start over</button>
      </main>
    );
  }

  return (
    <main>
      {step > 0 && <p>Email accepted</p>}
      {error && <p role="alert">{error}</p>}
      <form onSubmit={advance}>
        {step === 0 && <><Field label="Email" value={fields.email} onChange={value => update('email', value)} /><button>Next</button></>}
        {step === 1 && (
          <>
            <Field label="Name" value={fields.name} onChange={value => update('name', value)} />
            <label>Account type
              <select value={fields.account} onChange={event => update('account', event.target.value)}>
                <option value="personal">Personal</option>
                <option value="business">Business</option>
              </select>
            </label>
            {business && <Field label="Company" value={fields.company} onChange={value => update('company', value)} />}
            <button type="button" onClick={back}>Back</button>
            <button>Next</button>
          </>
        )}
        {step === 2 && (
          <>
            <p>{fields.email}</p>
            <p>{fields.name}</p>
            {business && <p>{fields.company}</p>}
            <button type="button" onClick={back}>Back</button>
            <label><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} />I agree</label>
            <button type="button" disabled={!consent} onClick={submit}>Submit</button>
          </>
        )}
      </form>
    </main>
  );
}`;
    case 5: return `import React, { useState } from 'react';

const EMAIL = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
const EMPTY = { email: '', name: '', account: 'personal', company: '' };
const ACCOUNTS = ['personal', 'business'];
const DRAFT_KEY = 'evolving-form-draft';
const compact = value => value.replace(/\\s/g, '');

// One validator per step; an empty string means the step may advance.
const validate = [
  fields => (EMAIL.test(fields.email.trim()) ? '' : 'Invalid email'),
  fields => {
    if (compact(fields.name).length < 2) return 'Invalid name';
    if (fields.account === 'business' && compact(fields.company).length < 2) return 'Invalid company';
    return '';
  },
];

const trimAll = fields => Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, value.trim()]));

// Only a well-formed version-1 record is trusted; anything else counts as no draft.
const isDraft = value =>
  value !== null && typeof value === 'object' && value.version === 1 &&
  Object.keys(EMPTY).every(key => typeof value[key] === 'string') && ACCOUNTS.includes(value.account);

const Field = ({ label, value, onChange }) => (
  <label>{label}<input value={value} onChange={event => onChange(event.target.value)} /></label>
);

export default function App() {
  const [fields, setFields] = useState(EMPTY);
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [consent, setConsent] = useState(false);
  // The receipt is its own copy, so later edits can never change what was submitted.
  const [receipt, setReceipt] = useState(null);
  const business = fields.account === 'business';
  const update = (key, value) => setFields(current => ({ ...current, [key]: value }));

  const advance = event => {
    event.preventDefault();
    const problem = validate[step](fields);
    setError(problem);
    if (problem) return;
    setFields(trimAll);
    setStep(step + 1);
  };
  const back = () => {
    setStep(step - 1);
    setError('');
    setConsent(false);
  };
  // A personal account keeps its typed company for later, but never submits it.
  const submit = () => setReceipt({ email: fields.email, name: fields.name, company: business ? fields.company : '' });
  const restart = () => {
    setFields(EMPTY);
    setStep(0);
    setError('');
    setConsent(false);
    setReceipt(null);
  };

  // Storage may be blocked or hold junk; every draft action degrades to one message and leaves the fields alone.
  const saveDraft = () => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ version: 1, ...fields }));
    } catch {
      setError('Draft unavailable');
    }
  };
  const restoreDraft = () => {
    let draft = null;
    try {
      draft = JSON.parse(localStorage.getItem(DRAFT_KEY));
    } catch {
      draft = null;
    }
    if (!isDraft(draft)) {
      setError('Draft unavailable');
      return;
    }
    const { email, name, account, company } = draft;
    setFields({ email, name, account, company });
    setStep(0);
    setConsent(false);
    setError('');
  };
  const clearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      setError('Draft unavailable');
    }
  };

  if (receipt) {
    return (
      <main>
        <p>Submitted</p>
        <p>{receipt.email}</p>
        <p>{receipt.name}</p>
        {receipt.company && <p>{receipt.company}</p>}
        <button onClick={restart}>Start over</button>
      </main>
    );
  }

  return (
    <main>
      {step > 0 && <p>Email accepted</p>}
      {error && <p role="alert">{error}</p>}
      <form onSubmit={advance}>
        {step === 0 && <><Field label="Email" value={fields.email} onChange={value => update('email', value)} /><button>Next</button></>}
        {step === 1 && (
          <>
            <Field label="Name" value={fields.name} onChange={value => update('name', value)} />
            <label>Account type
              <select value={fields.account} onChange={event => update('account', event.target.value)}>
                <option value="personal">Personal</option>
                <option value="business">Business</option>
              </select>
            </label>
            {business && <Field label="Company" value={fields.company} onChange={value => update('company', value)} />}
            <button type="button" onClick={back}>Back</button>
            <button>Next</button>
          </>
        )}
        {step === 2 && (
          <>
            <p>{fields.email}</p>
            <p>{fields.name}</p>
            {business && <p>{fields.company}</p>}
            <button type="button" onClick={back}>Back</button>
            <label><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} />I agree</label>
            <button type="button" disabled={!consent} onClick={submit}>Submit</button>
          </>
        )}
      </form>
      <button type="button" onClick={saveDraft}>Save draft</button>
      <button type="button" onClick={restoreDraft}>Restore draft</button>
      <button type="button" onClick={clearDraft}>Clear draft</button>
    </main>
  );
}`;
    default: return unknownStage(stage);
  }
}

const juniorBuilders: Record<string,(stage:number)=>string> = {
  'react-evolving-board': juniorBoard,
  'react-evolving-catalog': juniorCatalog,
  'react-evolving-form': juniorForm,
};
const seniorBuilders: Record<string,(stage:number)=>string> = {
  'react-evolving-board': seniorBoard,
  'react-evolving-catalog': seniorCatalog,
  'react-evolving-form': seniorForm,
};

export const REACT_EVOLVING_SOLUTIONS: Record<string,CodingSolution> = Object.fromEntries(
  Object.entries(builders).flatMap(([id,build])=>[1,2,3,4,5].map(stage=>[`${id}-${stage}`,{
    solution:advanceReact(build(Math.min(stage,3)),id,stage),
    junior:juniorBuilders[id](stage),
    senior:seniorBuilders[id](stage),
  }])),
);
