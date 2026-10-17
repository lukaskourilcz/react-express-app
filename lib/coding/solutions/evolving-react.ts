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

/*
 * Hidden cases (lib/coding/react-hidden.ts) for the requirements a stage's
 * visible check reads in one situation only. A stage keeps every earlier
 * requirement, so a case stays hidden in every later stage of its project.
 * They use the visible suite's helpers: `add` on the board, `search` in the
 * catalog, `fill` and `next` in the form.
 */
const hiddenFrom: Record<string,{from:number;suite:string}[]> = {
  'react-evolving-board': [
    {from:2, suite:`test('Remaining counts every unfinished task under each filter',()=>{render(<App/>);add('One');add('Two');add('Three');fireEvent.click(screen.getByRole('checkbox',{name:'Two'}));for(const name of ['All','Active','Completed','All']){fireEvent.click(screen.getByRole('button',{name,exact:true}));expect(screen.getByLabelText('Remaining').textContent).toBe('2')}});`},
    {from:5, suite:`const order=()=>screen.queryAllByRole('listitem').map(li=>{let name='';require('@testing-library/react').within(li).getByRole('checkbox',{name:value=>{name=value;return true;}});return name;});
test('Move down moves one place and is disabled on the last task of the full list',()=>{render(<App/>);add('A');add('B');add('C');expect(screen.getByRole('button',{name:'Move down C',exact:true}).disabled).toBe(true);fireEvent.click(screen.getByRole('button',{name:'Move down A',exact:true}));expect(order().join(',')).toBe('B,A,C');fireEvent.click(screen.getByRole('button',{name:'Move down A',exact:true}));expect(order().join(',')).toBe('B,C,A');expect(screen.getByRole('button',{name:'Move down A',exact:true}).disabled).toBe(true);expect(screen.getByRole('button',{name:'Move down C',exact:true}).disabled).toBe(false)});
test('under a filter a move swaps with the neighbour in the full list, and the full list decides what is disabled',()=>{render(<App/>);add('A');add('B');add('C');fireEvent.click(screen.getByRole('checkbox',{name:'B'}));fireEvent.click(screen.getByRole('button',{name:'Active',exact:true}));expect(screen.getByRole('button',{name:'Move up A',exact:true}).disabled).toBe(true);expect(screen.getByRole('button',{name:'Move down C',exact:true}).disabled).toBe(true);fireEvent.click(screen.getByRole('button',{name:'Move down A',exact:true}));expect(order().join(',')).toBe('A,C');expect(screen.getByRole('button',{name:'Move up A',exact:true}).disabled).toBe(false);fireEvent.click(screen.getByRole('button',{name:'All',exact:true}));expect(order().join(',')).toBe('B,A,C');expect(screen.getByRole('checkbox',{name:'B'}).checked).toBe(true)});
test('a moved duplicate keeps its own completion, and undo puts it back',()=>{render(<App/>);add('Dup');add('X');add('Dup');fireEvent.click(screen.getAllByRole('checkbox')[2]);fireEvent.click(screen.getAllByRole('button',{name:'Move up Dup',exact:true})[1]);expect(order().join(',')).toBe('Dup,Dup,X');expect(screen.getAllByRole('checkbox').map(box=>box.checked).join(',')).toBe('false,true,false');fireEvent.click(screen.getByRole('button',{name:'Undo',exact:true}));expect(order().join(',')).toBe('Dup,X,Dup');expect(screen.getAllByRole('checkbox').map(box=>box.checked).join(',')).toBe('false,false,true')});`},
    {from:4, suite:`test('Clear completed is disabled while no task is completed, and Complete all once every task is',()=>{render(<App/>);add('A');expect(screen.getByRole('button',{name:'Clear completed',exact:true}).disabled).toBe(true);fireEvent.click(screen.getByRole('checkbox',{name:'A'}));expect(screen.getByRole('button',{name:'Complete all',exact:true}).disabled).toBe(true)});`},
  ],
  'react-evolving-catalog': [
    {from:1, suite:`test('the search matches inside a name, not only its start',()=>{render(<App/>);search('rro');expect(screen.getAllByRole('listitem').length).toBe(1);expect(screen.getByRole('listitem').textContent).toContain('Carrot')});`},
    {from:2, suite:`test('price-asc puts the cheapest first, and a new order goes back to page 1',()=>{render(<App/>);fireEvent.change(screen.getByLabelText('Sort'),{target:{value:'price-asc'}});expect(screen.getAllByRole('listitem')[0].textContent).toContain('Banana');fireEvent.click(screen.getByRole('button',{name:'Next',exact:true}));expect(screen.getByLabelText('Page').textContent).toBe('2 / 2');fireEvent.change(screen.getByLabelText('Sort'),{target:{value:'name'}});expect(screen.getByLabelText('Page').textContent).toBe('1 / 2')});`},
    {from:3, suite:`test('unticking a product takes it out of the selection and the total',()=>{render(<App/>);const apple=screen.getByRole('checkbox',{name:'Apple'});fireEvent.click(apple);fireEvent.click(apple);expect(apple.checked).toBe(false);expect(screen.getByLabelText('Selected total').textContent).toBe('0')});`},
    {from:4, suite:`test('a new maximum price goes back to page 1 even when the current page still exists',()=>{render(<App/>);fireEvent.click(screen.getByRole('button',{name:'Next',exact:true}));fireEvent.change(screen.getByLabelText('Maximum price'),{target:{value:'10'}});expect(screen.getByLabelText('Page').textContent).toBe('1 / 2')});`},
  ],
  'react-evolving-form': [
    {from:4, suite:`test('a company typed before switching to personal is left out of the review and the receipt',()=>{render(<App/>);fill('Email','a@b.cz');next();fill('Name','Ada');fireEvent.change(screen.getByLabelText('Account type'),{target:{value:'business'}});fill('Company','Sharks');fireEvent.change(screen.getByLabelText('Account type'),{target:{value:'personal'}});next();expect(screen.queryByText('Sharks')).toBeNull();fireEvent.click(screen.getByRole('checkbox',{name:'I agree'}));fireEvent.click(screen.getByRole('button',{name:'Submit',exact:true}));expect(screen.queryByText('Sharks')).toBeNull()});`},
    {from:5, suite:`test('a version-1 draft with a field of the wrong type or an unknown account is refused',()=>{for(const bad of ['{"version":1,"email":5,"name":"","account":"personal","company":""}','{"version":1,"email":"x@y.cz","name":"","account":"admin","company":""}']){cleanup();localStorage.setItem('evolving-form-draft',bad);render(<App/>);fill('Email','keep@b.cz');fireEvent.click(screen.getByRole('button',{name:'Restore draft',exact:true}));expect(screen.getByRole('alert').textContent).toBe('Draft unavailable');expect(screen.getByLabelText('Email').value).toBe('keep@b.cz')}});
test('a restore resumes at the email step with consent cleared',()=>{localStorage.setItem('evolving-form-draft',JSON.stringify({version:1,email:'s@b.cz',name:'Ada',account:'personal',company:''}));render(<App/>);fill('Email','a@b.cz');next();fill('Name','Bo');next();fireEvent.click(screen.getByRole('checkbox',{name:'I agree'}));fireEvent.click(screen.getByRole('button',{name:'Restore draft',exact:true}));expect(screen.getByLabelText('Email').value).toBe('s@b.cz');next();next();expect(screen.getByRole('checkbox',{name:'I agree'}).checked).toBe(false)});
test('a saved draft holds the version and the four fields, never the consent',()=>{localStorage.removeItem('evolving-form-draft');render(<App/>);fill('Email','a@b.cz');next();fill('Name','Ada');next();fireEvent.click(screen.getByRole('checkbox',{name:'I agree'}));fireEvent.click(screen.getByRole('button',{name:'Save draft',exact:true}));expect(Object.keys(JSON.parse(localStorage.getItem('evolving-form-draft'))).sort().join(',')).toBe('account,company,email,name,version')});`},
  ],
};

const hiddenSuiteFor = (id:string, stage:number): string|undefined => {
  const cases = (hiddenFrom[id] ?? []).filter(one=>one.from<=stage).map(one=>one.suite);
  return cases.length ? cases.join('\n') : undefined;
};

export const REACT_EVOLVING_SOLUTIONS: Record<string,CodingSolution> = Object.fromEntries(
  Object.entries(builders).flatMap(([id,build])=>[1,2,3,4,5].map(stage=>{
    const hiddenSuite = hiddenSuiteFor(id, stage);
    return [`${id}-${stage}`,{
      solution:advanceReact(build(Math.min(stage,3)),id,stage),
      junior:juniorBuilders[id](stage),
      senior:seniorBuilders[id](stage),
      ...(hiddenSuite ? { hiddenSuite } : {}),
    }];
  })),
);

/*
 * Checkpoints. `…-N-start` is the small step before stage N, and its reference
 * is what a learner reads after giving up on it, or for free once it is
 * passed: the previous stage's App with that one step added and none of stage
 * N's own work, so it never passes stage N. A checkpoint shows no junior or
 * senior board. Each builder gets the previous stage's reference ('' before
 * stage one) and edits it the way advanceReact does.
 */
const checkpoints: Record<string,((earlier:string)=>string)[]> = {
  'react-evolving-board': [
    () => `import React,{useState} from 'react';
// Only the input is wired at this step: its value lives in state, so typing
// shows up and the field starts empty. Adding a task comes with stage one.
export default function App(){
 const [text,setText]=useState('');
 return <main><label>Task<input value={text} onChange={e=>setText(e.target.value)}/></label><button>Add</button></main>;
}`,
    earlier => earlier
      .replace(' return <main>', ` // The filter only decides which rows are drawn; the task list never changes.
 return <main>`)
      .replace('<ul>{tasks.filter(t=>true)', `<div>{['All','Active','Completed'].map(f=><button key={f} onClick={()=>setFilter(f)}>{f}</button>)}</div>
 <ul>{tasks.filter(t=>filter==='All'||(filter==='Completed'?t.done:!t.done))`),
    earlier => earlier
      .replace(' return <main>', ` // Every add, delete and toggle already goes through change, which keeps the
 // list it replaces in past, so undo puts the latest one back. Redo is stage three.
 const undo=()=>setHistory(h=>h.past.length?{past:h.past.slice(0,-1),present:h.past[h.past.length-1],future:[]}:h);
 return <main>`)
      .replace('</main>', '<button disabled={!history.past.length} onClick={undo}>Undo</button></main>'),
    earlier => earlier
      .replace(' return <main>', ` // One change for the whole list, so a single undo takes it back.
 return <main>`)
      .replace('</main>', '<button disabled={!tasks.some(t=>!t.done)} onClick={()=>change(rows=>rows.map(t=>({...t,done:true})))}>Complete all</button></main>'),
    earlier => earlier
      .replace(' return <main>', ` // move swaps neighbours in the full list, so a filter does not change where
 // a task goes. Only Move up exists at this step.
 return <main>`)
      .replace('</li>', `<button aria-label={'Move up '+t.name} disabled={tasks[0].id===t.id} onClick={()=>move(t.id,-1)}>Move up</button></li>`),
  ],
  'react-evolving-catalog': [
    () => `import React from 'react';
const products=[{id:1,name:'Apple',price:2},{id:2,name:'Banana',price:1},{id:3,name:'Carrot',price:3},{id:4,name:'Dates',price:4}];
// A fixed list rendered once: one li per product with its name and price.
export default function App(){
 return <main><ul>{products.map(p=><li key={p.id}>{p.name} {p.price}</li>)}</ul></main>;
}`,
    earlier => earlier
      .replace(' const pages=', ` // filter() already made a new array, so sorting it leaves products in order.
 rows.sort((a,b)=>sort==='name'?a.name.localeCompare(b.name):sort==='price-asc'?a.price-b.price:b.price-a.price);
 const pages=`)
      .replace('</label>\n', `</label>
 <label>Sort<select value={sort} onChange={e=>setSort(e.target.value)}><option value="name">Name</option><option value="price-asc">Price ascending</option><option value="price-desc">Price descending</option></select></label>\n`),
    earlier => earlier
      .replace(' return <main>', ` // Selection is a list of ids, so it outlives paging and searching, and the
 // total adds up every selected product, shown or not.
 return <main>`)
      .replace('{p.name} {p.price}', '<label><input type="checkbox" checked={selected.includes(p.id)} onChange={()=>setSelected(ids=>ids.includes(p.id)?ids.filter(id=>id!==p.id):[...ids,p.id])}/>{p.name}</label> {p.price}')
      .replace('</main>', '<output aria-label="Selected total">{products.filter(p=>selected.includes(p.id)).reduce((sum,p)=>sum+p.price,0)}</output></main>'),
    earlier => earlier
      .replace('const rows=', `const [maxPrice,setMaxPrice]=useState('');
 // An empty field sets no limit. The page stays where it is when the limit
 // changes; when the shorter list ends before it, its last page shows
 // instead. Stage four goes back to the first page.
 const rows=`)
      .replace('includes(query.trim().toLowerCase()))', "includes(query.trim().toLowerCase())&&(maxPrice===''||p.price<=Number(maxPrice)))")
      .replace('const pages=Math.ceil(rows.length/2),visible=rows.slice(page*2,page*2+2);', 'const pages=Math.ceil(rows.length/2),current=Math.min(page,Math.max(0,pages-1)),visible=rows.slice(current*2,current*2+2);')
      .replace('<button disabled={page===0} onClick={()=>setPage(p=>p-1)}>Previous</button><output aria-label="Page">{pages?page+1:0} / {pages}</output><button disabled={page+1>=pages} onClick={()=>setPage(p=>p+1)}>Next</button>', '<button disabled={current===0} onClick={()=>setPage(current-1)}>Previous</button><output aria-label="Page">{pages?current+1:0} / {pages}</output><button disabled={current+1>=pages} onClick={()=>setPage(current+1)}>Next</button>')
      .replace('</main>', '<label>Maximum price<input type="number" min="0" value={maxPrice} onChange={e=>setMaxPrice(e.target.value)}/></label></main>'),
    earlier => earlier
      .replace(' return <main>', ` // A selected product without an entry in quantities counts once. Every edit
 // at this step is a whole number from 1 to 99, so it is stored as typed;
 // stage five keeps the previous value when an edit is out of range.
 return <main>`)
      .replace('sum+p.price,0)', 'sum+p.price*(quantities[p.id]??1),0)')
      .replace('</main>', `<section aria-label="Cart">{products.filter(p=>selected.includes(p.id)).map(p=><label key={p.id}>{'Quantity '+p.name}<input type="number" min="1" max="99" value={quantities[p.id]??1} onChange={e=>setQuantities(q=>({...q,[p.id]:Number(e.target.value)}))}/></label>)}</section></main>`),
  ],
  'react-evolving-form': [
    () => `import React,{useState} from 'react';
// The email lives in state, and the submit handler stops the browser from
// reloading the page. Checking the address comes with stage one.
export default function App(){
 const [email,setEmail]=useState('');
 return <main><form onSubmit={e=>e.preventDefault()}><label>Email<input value={email} onChange={e=>setEmail(e.target.value)}/></label><button>Next</button></form></main>;
}`,
    earlier => earlier
      .replace(' return <main>', ` // The name step keeps email in state, so Back finds it as it was. Its Next
 // does nothing yet: checking the name is stage two.
 return <main>`)
      .replace('</form>', `{step===1&&<><label>Name<input value={name} onChange={e=>setName(e.target.value)}/></label><button type="button" onClick={back}>Back</button><button>Next</button></>}
 </form>`),
    earlier => earlier
      .replace(' return <main>', ` // back already clears consent, so an edited summary has to be agreed to again.
 // Submit does nothing yet: the receipt is stage three.
 return <main>`)
      .replace('<button type="button" onClick={back}>Back</button></>}', '<button type="button" onClick={back}>Back</button><label><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>I agree</label><button type="button" disabled={!consent}>Submit</button></>}'),
    earlier => earlier
      .replace('const next=', `// Company is its own piece of state, so switching to personal hides the field
 // without losing what was typed. Checking it is stage four.
 const [account,setAccount]=useState('personal'),[company,setCompany]=useState('');
 const next=`)
      .replace('<label>Name<input value={name} onChange={e=>setName(e.target.value)}/></label>', `<label>Name<input value={name} onChange={e=>setName(e.target.value)}/></label><label>Account type<select value={account} onChange={e=>setAccount(e.target.value)}><option value="personal">Personal</option><option value="business">Business</option></select></label>{account==='business'&&<label>Company<input value={company} onChange={e=>setCompany(e.target.value)}/></label>}`)
      .replace('setSnapshot(null)', "setSnapshot(null);setAccount('personal');setCompany('')"),
    earlier => earlier
      .replace('const back=', `// The draft holds the four fields and a version, never the consent.
 const saveDraft=()=>localStorage.setItem('evolving-form-draft',JSON.stringify({version:1,email,name,account,company}));
 const back=`)
      .replace('</form>', '<button type="button" onClick={saveDraft}>Save draft</button></form>'),
  ],
};
for (const [id, steps] of Object.entries(checkpoints)) {
  steps.forEach((build, index) => { REACT_EVOLVING_SOLUTIONS[`${id}-${index+1}-start`] = { solution: build(index ? REACT_EVOLVING_SOLUTIONS[`${id}-${index}`].solution : '') }; });
}

// Finite edge checks for the first four independently reviewed board steps.
const EARLY_BOARD_REVIEW_CASES: Record<string, string> = {
  "react-evolving-board-1-start": `
const auditInput=view=>view.container.querySelector('input:not([type="checkbox"])');
const auditButton=(view,name)=>[...view.container.querySelectorAll('button')].find(button=>button.textContent===name);
const auditClick=(view,name)=>{const button=auditButton(view,name);expect(Boolean(button)).toBe(true);fireEvent.click(button);};
const auditAdd=(view,text)=>{fireEvent.change(auditInput(view),{target:{value:text}});auditClick(view,'Add');};
const auditWithin=require('@testing-library/react').within;
const auditBoardRows=view=>[...view.container.querySelectorAll('li')].map(li=>{let name='';const box=auditWithin(li).getByRole('checkbox',{name:value=>{name=value;return true;}});return {name,done:box.checked};});
const auditToggle=(view,index)=>fireEvent.click(view.container.querySelectorAll('li input[type="checkbox"]')[index]);

test('controlled text retains literal input rather than trimming or truncating it',()=>{const view=render(<App/>);for(const text of ['  Task  ','<task>&'+('x'.repeat(450)),' 日本語  ','','A	B']){fireEvent.change(auditInput(view),{target:{value:text}});expect(auditInput(view).value).toBe(text);view.rerender(<App/>);expect(auditInput(view).value).toBe(text);}expect(Boolean(auditButton(view,'Add'))).toBe(true);});
test('independent mounted input states survive ordinary parent renders',()=>{const a=render(<App/>),b=render(<App/>);fireEvent.change(auditInput(a),{target:{value:'First'}});fireEvent.change(auditInput(b),{target:{value:'Second'}});a.rerender(<App/>);expect(auditInput(a).value).toBe('First');expect(auditInput(b).value).toBe('Second');});
test('a new mount starts empty after another input held a draft',()=>{const old=render(<App/>);fireEvent.change(auditInput(old),{target:{value:'Pending'}});old.unmount();const fresh=render(<App/>);expect(auditInput(fresh).value).toBe('');});
test('state controls the displayed value on a new render after an external DOM write',()=>{const view=render(<App/>);fireEvent.change(auditInput(view),{target:{value:'Owned by state'}});auditInput(view).value='external';view.rerender(<App/>);expect(auditInput(view).value).toBe('Owned by state');});
`,
  "react-evolving-board-1": `
const auditInput=view=>view.container.querySelector('input:not([type="checkbox"])');
const auditButton=(view,name)=>[...view.container.querySelectorAll('button')].find(button=>button.textContent===name);
const auditClick=(view,name)=>{const button=auditButton(view,name);expect(Boolean(button)).toBe(true);fireEvent.click(button);};
const auditAdd=(view,text)=>{fireEvent.change(auditInput(view),{target:{value:text}});auditClick(view,'Add');};
const auditWithin=require('@testing-library/react').within;
const auditBoardRows=view=>[...view.container.querySelectorAll('li')].map(li=>{let name='';const box=auditWithin(li).getByRole('checkbox',{name:value=>{name=value;return true;}});return {name,done:box.checked};});
const auditToggle=(view,index)=>fireEvent.click(view.container.querySelectorAll('li input[type="checkbox"]')[index]);

test('more than two duplicate identities toggle independently and retain literal trimmed text',()=>{const view=render(<App/>),names=['Same','Same','Third','<task>&'+('x'.repeat(440)),'Last','Same'];for(const name of names)auditAdd(view,'  '+name+'  ');expect(auditBoardRows(view)).toEqual(names.map(name=>({name,done:false})));for(const index of [4,2,0,5,4,1]){auditToggle(view,index);names[index]=names[index];}expect(auditBoardRows(view)).toEqual(names.map((name,i)=>({name,done:[0,1,2,5].includes(i)})));expect(view.container.querySelector('li task')).toBeNull();});
test('a bounded operation model holds forty independent add and toggle operations',()=>{const view=render(<App/>),model=[];for(let i=0;i<40;i++){if(i%3!==2||!model.length){const name=i%4===0?'Repeated':'Task '+i;auditAdd(view,name);model.push({name,done:false});}else{const index=(i*7)%model.length;auditToggle(view,index);model[index].done=!model[index].done;}expect(auditBoardRows(view)).toEqual(model);}auditAdd(view,'   ');expect(auditBoardRows(view)).toEqual(model);expect(auditInput(view).value).toBe('   ');});
test('adding and checkbox state survive rerenders independently across roots',()=>{const a=render(<App/>),b=render(<App/>);auditAdd(a,'A');auditAdd(b,'B');auditToggle(a,0);a.rerender(<App/>);expect(auditBoardRows(a)).toEqual([{name:'A',done:true}]);expect(auditBoardRows(b)).toEqual([{name:'B',done:false}]);});
test('a fresh task list is empty and repeated toggles restore only the clicked row',()=>{const old=render(<App/>);auditAdd(old,'Old');old.unmount();const view=render(<App/>);expect(auditBoardRows(view)).toEqual([]);auditAdd(view,'One');auditAdd(view,'Two');for(let i=0;i<6;i++)auditToggle(view,1);expect(auditBoardRows(view)).toEqual([{name:'One',done:false},{name:'Two',done:false}]);});
`,
  "react-evolving-board-2-start": `
const auditInput=view=>view.container.querySelector('input:not([type="checkbox"])');
const auditButton=(view,name)=>[...view.container.querySelectorAll('button')].find(button=>button.textContent===name);
const auditClick=(view,name)=>{const button=auditButton(view,name);expect(Boolean(button)).toBe(true);fireEvent.click(button);};
const auditAdd=(view,text)=>{fireEvent.change(auditInput(view),{target:{value:text}});auditClick(view,'Add');};
const auditWithin=require('@testing-library/react').within;
const auditBoardRows=view=>[...view.container.querySelectorAll('li')].map(li=>{let name='';const box=auditWithin(li).getByRole('checkbox',{name:value=>{name=value;return true;}});return {name,done:box.checked};});
const auditToggle=(view,index)=>fireEvent.click(view.container.querySelectorAll('li input[type="checkbox"]')[index]);

test('All Active and Completed each show their own derived rows',()=>{const view=render(<App/>),names=['One','One','Three','Four','Five','Six'];for(const name of names)auditAdd(view,name);auditToggle(view,0);auditToggle(view,3);for(const filter of ['Completed','Active','All','Completed','All']){auditClick(view,filter);const expected=names.map((name,i)=>({name,done:i===0||i===3})).filter(row=>filter==='All'||(filter==='Active'?!row.done:row.done));expect(auditBoardRows(view)).toEqual(expected);}expect(auditInput(view).value).toBe('');});
test('toggling from a filtered list updates the full identity rather than its visible index',()=>{const view=render(<App/>);for(const name of ['A','B','C','D','E'])auditAdd(view,name);auditToggle(view,0);auditToggle(view,3);auditClick(view,'Active');auditToggle(view,1);expect(auditBoardRows(view)).toEqual([{name:'B',done:false},{name:'E',done:false}]);auditClick(view,'Completed');expect(auditBoardRows(view)).toEqual([{name:'A',done:true},{name:'C',done:true},{name:'D',done:true}]);auditToggle(view,1);auditClick(view,'All');expect(auditBoardRows(view)).toEqual([{name:'A',done:true},{name:'B',done:false},{name:'C',done:false},{name:'D',done:true},{name:'E',done:false}]);});
test('adding under Completed preserves the filter without discarding hidden active tasks',()=>{const view=render(<App/>);auditAdd(view,'First');auditClick(view,'Completed');expect(auditBoardRows(view)).toEqual([]);auditAdd(view,'<literal>&');expect(auditBoardRows(view)).toEqual([]);auditClick(view,'All');expect(auditBoardRows(view)).toEqual([{name:'First',done:false},{name:'<literal>&',done:false}]);});
test('filters and tasks belong to their own root and a fresh mount starts with All',()=>{const a=render(<App/>),b=render(<App/>);auditAdd(a,'A');auditAdd(b,'B');auditClick(a,'Completed');a.rerender(<App/>);expect(auditBoardRows(a)).toEqual([]);expect(auditBoardRows(b)).toEqual([{name:'B',done:false}]);a.unmount();b.unmount();const fresh=render(<App/>);auditAdd(fresh,'New');expect(auditBoardRows(fresh)).toEqual([{name:'New',done:false}]);});
`,
  "react-evolving-board-2": `
const auditInput=view=>view.container.querySelector('input:not([type="checkbox"])');
const auditButton=(view,name)=>[...view.container.querySelectorAll('button')].find(button=>button.textContent===name);
const auditClick=(view,name)=>{const button=auditButton(view,name);expect(Boolean(button)).toBe(true);fireEvent.click(button);};
const auditAdd=(view,text)=>{fireEvent.change(auditInput(view),{target:{value:text}});auditClick(view,'Add');};
const auditWithin=require('@testing-library/react').within;
const auditBoardRows=view=>[...view.container.querySelectorAll('li')].map(li=>{let name='';const box=auditWithin(li).getByRole('checkbox',{name:value=>{name=value;return true;}});return {name,done:box.checked};});
const auditToggle=(view,index)=>fireEvent.click(view.container.querySelectorAll('li input[type="checkbox"]')[index]);

const auditRemaining=view=>view.container.querySelector('output[aria-label="Remaining"]').textContent;
const auditDelete=(view,index)=>fireEvent.click(view.container.querySelectorAll('li')[index].querySelector('button'));
test('Completed filters mixed states while Remaining counts all unfinished identities',()=>{const view=render(<App/>),names=['One','Two','Three','Four','Five','Six'];for(const name of names)auditAdd(view,name);auditToggle(view,1);auditToggle(view,4);for(const filter of ['Completed','Active','All','Completed']){auditClick(view,filter);const expected=names.map((name,i)=>({name,done:i===1||i===4})).filter(row=>filter==='All'||(filter==='Active'?!row.done:row.done));expect(auditBoardRows(view)).toEqual(expected);expect(auditRemaining(view)).toBe('4');}});
test('a duplicate is deleted by its identity from a filtered view only',()=>{const view=render(<App/>);for(const name of ['Same','Other','Same','Tail','Same'])auditAdd(view,name);auditToggle(view,2);auditClick(view,'Completed');expect(view.container.querySelector('li button').getAttribute('aria-label')).toBe('Delete Same');auditDelete(view,0);expect(auditBoardRows(view)).toEqual([]);expect(auditRemaining(view)).toBe('4');auditClick(view,'All');expect(auditBoardRows(view)).toEqual([{name:'Same',done:false},{name:'Other',done:false},{name:'Tail',done:false},{name:'Same',done:false}]);auditDelete(view,3);expect(auditRemaining(view)).toBe('3');});
test('a deterministic model combines add toggle filter and delete without losing hidden rows',()=>{const view=render(<App/>),model=[];let filter='All',serial=0;for(let i=0;i<60;i++){const visible=model.filter(row=>filter==='All'||(filter==='Active'?!row.done:row.done));if(i%5===0){filter=['All','Active','Completed'][Math.floor(i/5)%3];auditClick(view,filter);}else if(i%5===1||!visible.length){const name=serial%3?'Task '+serial:'Repeated';auditAdd(view,name);model.push({id:serial++,name,done:false});}else if(i%5===2){const index=i%visible.length;auditToggle(view,index);const target=model.find(row=>row.id===visible[index].id);target.done=!target.done;}else if(i%5===3){const index=i%visible.length;auditDelete(view,index);model.splice(model.findIndex(row=>row.id===visible[index].id),1);}else auditClick(view,filter);const expected=model.filter(row=>filter==='All'||(filter==='Active'?!row.done:row.done)).map(({name,done})=>({name,done}));expect(auditBoardRows(view)).toEqual(expected);expect(auditRemaining(view)).toBe(String(model.filter(row=>!row.done).length));}});
test('parent renders and independent or fresh roots preserve the correct complete-list count',()=>{const a=render(<App/>),b=render(<App/>);auditAdd(a,'A');auditAdd(a,'A');auditAdd(b,'B');auditToggle(a,1);auditClick(a,'Completed');a.rerender(<App/>);expect(auditRemaining(a)).toBe('1');expect(auditRemaining(b)).toBe('1');auditDelete(a,0);expect(auditRemaining(a)).toBe('1');expect(auditBoardRows(b)).toEqual([{name:'B',done:false}]);a.unmount();b.unmount();const fresh=render(<App/>);expect(auditRemaining(fresh)).toBe('0');expect(auditBoardRows(fresh)).toEqual([]);});
`,
};
for (const [id, cases] of Object.entries(EARLY_BOARD_REVIEW_CASES)) {
  const solution = REACT_EVOLVING_SOLUTIONS[id];
  solution.hiddenSuite = [solution.hiddenSuite, cases].filter(Boolean).join("\n\n");
}

// Individually reviewed history and bulk-action steps; later stages retain their own checks.
const HISTORY_BOARD_REVIEW_CASES: Record<string, string> = {
"react-evolving-board-3-start": `
const HISTORY_STAGE=1;

const historyWithin=require('@testing-library/react').within;
const historyInput=v=>historyWithin(v.container).getByRole('textbox',{name:'Task'});
const historyButton=(v,name)=>historyWithin(v.container).getByRole('button',{name,exact:true});
const historyClick=(v,name)=>fireEvent.click(historyButton(v,name));
const historyRows=v=>[...v.container.querySelectorAll('li')].map(li=>{let name='';const box=historyWithin(li).getByRole('checkbox',{name:n=>{name=n;return true;}});return {name,done:box.checked};});
const historyModel=()=>({rows:[],past:[],future:[],filter:'All',draft:'',next:0});
const historyVisible=m=>m.rows.filter(r=>m.filter==='All'||(m.filter==='Active'?!r.done:r.done));
const historyCheck=(v,m)=>{
 expect(historyRows(v)).toEqual(historyVisible(m).map(({name,done})=>({name,done})));
 expect(historyWithin(v.container).getByLabelText('Remaining').textContent).toBe(String(m.rows.filter(r=>!r.done).length));
 expect(historyInput(v).value).toBe(m.draft);
 expect(historyButton(v,'Undo').disabled).toBe(!m.past.length);
 if(HISTORY_STAGE>=2)expect(historyButton(v,'Redo').disabled).toBe(!m.future.length);
 if(HISTORY_STAGE>=3)expect(historyButton(v,'Complete all').disabled).toBe(!m.rows.some(r=>!r.done));
 if(HISTORY_STAGE>=4)expect(historyButton(v,'Clear completed').disabled).toBe(!m.rows.some(r=>r.done));
 if(HISTORY_STAGE>=5)for(const [i,li]of [...v.container.querySelectorAll('li')].entries())expect(historyWithin(li).getByRole('button',{name:'Move up '+historyVisible(m)[i].name,exact:true}).disabled).toBe(historyVisible(m)[i].id===m.rows[0].id);
};
const historyAction=(v,m,kind,value)=>{
 let next=null;
 if(kind==='draft'){fireEvent.change(historyInput(v),{target:{value}});m.draft=value;}
 if(kind==='filter'){historyClick(v,value);m.filter=value;}
 if(kind==='add'){fireEvent.change(historyInput(v),{target:{value}});m.draft=value;historyClick(v,'Add');if(value.trim()){next=[...m.rows,{id:++m.next,name:value.trim(),done:false}];m.draft='';}}
 if(kind==='toggle'){const id=historyVisible(m)[value].id;fireEvent.click(v.container.querySelectorAll('li input[type="checkbox"]')[value]);next=m.rows.map(r=>r.id===id?{...r,done:!r.done}:r);}
 if(kind==='delete'){const row=historyVisible(m)[value],li=v.container.querySelectorAll('li')[value];fireEvent.click(historyWithin(li).getByRole('button',{name:'Delete '+row.name,exact:true}));next=m.rows.filter(r=>r.id!==row.id);}
 if(kind==='complete'){historyClick(v,'Complete all');if(m.rows.some(r=>!r.done))next=m.rows.map(r=>({...r,done:true}));}
 if(kind==='clear'){historyClick(v,'Clear completed');if(m.rows.some(r=>r.done))next=m.rows.filter(r=>!r.done);}
 if(kind==='move'){const row=historyVisible(m)[value],i=m.rows.findIndex(r=>r.id===row.id);fireEvent.click(historyWithin(v.container.querySelectorAll('li')[value]).getByRole('button',{name:'Move up '+row.name,exact:true}));if(i>0){next=m.rows.slice();next.splice(i-1,2,m.rows[i],m.rows[i-1]);}}
 if(next){m.past.push(m.rows);m.rows=next;m.future=[];}
 if(kind==='undo'){historyClick(v,'Undo');if(m.past.length){m.future.unshift(m.rows);m.rows=m.past.pop();}}
 if(kind==='redo'){historyClick(v,'Redo');if(m.future.length){m.past.push(m.rows);m.rows=m.future.shift();}}
 historyCheck(v,m);
};
test('Undo restores every complete snapshot beyond two mutations, including duplicate completion and deletion',()=>{const v=render(<App/>),m=historyModel();for(const name of ['Same','Other','Same','Fourth','Fifth','Last'])historyAction(v,m,'add',name);historyAction(v,m,'toggle',2);historyAction(v,m,'delete',2);historyAction(v,m,'undo');historyAction(v,m,'toggle',2);while(m.past.length)historyAction(v,m,'undo');historyAction(v,m,'undo');});

test('history actions preserve draft and filter while a divergent edit invalidates Redo',()=>{const v=render(<App/>),m=historyModel();historyAction(v,m,'add','One');historyAction(v,m,'add','Two');historyAction(v,m,'toggle',0);historyAction(v,m,'draft','  keep typing  ');historyAction(v,m,'filter','Completed');historyAction(v,m,'undo');if(HISTORY_STAGE>=2){historyAction(v,m,'redo');historyAction(v,m,'undo');}historyAction(v,m,'filter','All');historyAction(v,m,'add','   ');if(HISTORY_STAGE>=2)historyAction(v,m,'redo');historyAction(v,m,'undo');historyAction(v,m,'add','New branch');if(HISTORY_STAGE>=2)historyAction(v,m,'redo');});
test('a bounded mixed-operation model retains full-list state and available history',()=>{const v=render(<App/>),m=historyModel();for(let i=0;i<60;i++){const shown=historyVisible(m),kind=i%12;if(kind===0)historyAction(v,m,'filter',['All','Active','Completed'][Math.floor(i/12)%3]);else if(kind===1||kind===2||!shown.length)historyAction(v,m,'add',i%3?'Row '+i:'Same');else if(kind===3)historyAction(v,m,'toggle',i%shown.length);else if(kind===4)historyAction(v,m,'delete',i%shown.length);else if(kind===5)historyAction(v,m,'undo');else if(kind===6&&HISTORY_STAGE>=2)historyAction(v,m,'redo');else if(kind===7&&HISTORY_STAGE>=3)historyAction(v,m,'complete');else if(kind===8&&HISTORY_STAGE>=4)historyAction(v,m,'clear');else if(kind===9&&HISTORY_STAGE>=5)historyAction(v,m,'move',shown.length-1);else historyAction(v,m,'draft','draft '+i);}historyAction(v,m,'filter','All');});
test('history belongs to its mounted root, survives parent renders, and resets on a fresh mount',()=>{const a=render(<App/>),b=render(<App/>),ma=historyModel(),mb=historyModel();historyAction(a,ma,'add','Same');historyAction(a,ma,'add','Same');historyAction(b,mb,'add','Other');historyAction(a,ma,'toggle',1);historyAction(a,ma,'delete',1);a.rerender(<App/>);historyCheck(a,ma);historyCheck(b,mb);historyAction(a,ma,'undo');historyAction(b,mb,'undo');a.unmount();b.unmount();const fresh=render(<App/>);historyCheck(fresh,historyModel());});
`,
"react-evolving-board-3": `
const HISTORY_STAGE=2;

const historyWithin=require('@testing-library/react').within;
const historyInput=v=>historyWithin(v.container).getByRole('textbox',{name:'Task'});
const historyButton=(v,name)=>historyWithin(v.container).getByRole('button',{name,exact:true});
const historyClick=(v,name)=>fireEvent.click(historyButton(v,name));
const historyRows=v=>[...v.container.querySelectorAll('li')].map(li=>{let name='';const box=historyWithin(li).getByRole('checkbox',{name:n=>{name=n;return true;}});return {name,done:box.checked};});
const historyModel=()=>({rows:[],past:[],future:[],filter:'All',draft:'',next:0});
const historyVisible=m=>m.rows.filter(r=>m.filter==='All'||(m.filter==='Active'?!r.done:r.done));
const historyCheck=(v,m)=>{
 expect(historyRows(v)).toEqual(historyVisible(m).map(({name,done})=>({name,done})));
 expect(historyWithin(v.container).getByLabelText('Remaining').textContent).toBe(String(m.rows.filter(r=>!r.done).length));
 expect(historyInput(v).value).toBe(m.draft);
 expect(historyButton(v,'Undo').disabled).toBe(!m.past.length);
 if(HISTORY_STAGE>=2)expect(historyButton(v,'Redo').disabled).toBe(!m.future.length);
 if(HISTORY_STAGE>=3)expect(historyButton(v,'Complete all').disabled).toBe(!m.rows.some(r=>!r.done));
 if(HISTORY_STAGE>=4)expect(historyButton(v,'Clear completed').disabled).toBe(!m.rows.some(r=>r.done));
 if(HISTORY_STAGE>=5)for(const [i,li]of [...v.container.querySelectorAll('li')].entries())expect(historyWithin(li).getByRole('button',{name:'Move up '+historyVisible(m)[i].name,exact:true}).disabled).toBe(historyVisible(m)[i].id===m.rows[0].id);
};
const historyAction=(v,m,kind,value)=>{
 let next=null;
 if(kind==='draft'){fireEvent.change(historyInput(v),{target:{value}});m.draft=value;}
 if(kind==='filter'){historyClick(v,value);m.filter=value;}
 if(kind==='add'){fireEvent.change(historyInput(v),{target:{value}});m.draft=value;historyClick(v,'Add');if(value.trim()){next=[...m.rows,{id:++m.next,name:value.trim(),done:false}];m.draft='';}}
 if(kind==='toggle'){const id=historyVisible(m)[value].id;fireEvent.click(v.container.querySelectorAll('li input[type="checkbox"]')[value]);next=m.rows.map(r=>r.id===id?{...r,done:!r.done}:r);}
 if(kind==='delete'){const row=historyVisible(m)[value],li=v.container.querySelectorAll('li')[value];fireEvent.click(historyWithin(li).getByRole('button',{name:'Delete '+row.name,exact:true}));next=m.rows.filter(r=>r.id!==row.id);}
 if(kind==='complete'){historyClick(v,'Complete all');if(m.rows.some(r=>!r.done))next=m.rows.map(r=>({...r,done:true}));}
 if(kind==='clear'){historyClick(v,'Clear completed');if(m.rows.some(r=>r.done))next=m.rows.filter(r=>!r.done);}
 if(kind==='move'){const row=historyVisible(m)[value],i=m.rows.findIndex(r=>r.id===row.id);fireEvent.click(historyWithin(v.container.querySelectorAll('li')[value]).getByRole('button',{name:'Move up '+row.name,exact:true}));if(i>0){next=m.rows.slice();next.splice(i-1,2,m.rows[i],m.rows[i-1]);}}
 if(next){m.past.push(m.rows);m.rows=next;m.future=[];}
 if(kind==='undo'){historyClick(v,'Undo');if(m.past.length){m.future.unshift(m.rows);m.rows=m.past.pop();}}
 if(kind==='redo'){historyClick(v,'Redo');if(m.future.length){m.past.push(m.rows);m.rows=m.future.shift();}}
 historyCheck(v,m);
};
test('Redo restores unchecked additions and mixed duplicate snapshots without rewriting completion',()=>{const v=render(<App/>),m=historyModel();for(const name of ['Same','Other','Same','Fourth','Fifth'])historyAction(v,m,'add',name);historyAction(v,m,'toggle',0);historyAction(v,m,'delete',2);for(let i=0;i<7;i++)historyAction(v,m,'undo');for(let i=0;i<7;i++)historyAction(v,m,'redo');});

test('history actions preserve draft and filter while a divergent edit invalidates Redo',()=>{const v=render(<App/>),m=historyModel();historyAction(v,m,'add','One');historyAction(v,m,'add','Two');historyAction(v,m,'toggle',0);historyAction(v,m,'draft','  keep typing  ');historyAction(v,m,'filter','Completed');historyAction(v,m,'undo');if(HISTORY_STAGE>=2){historyAction(v,m,'redo');historyAction(v,m,'undo');}historyAction(v,m,'filter','All');historyAction(v,m,'add','   ');if(HISTORY_STAGE>=2)historyAction(v,m,'redo');historyAction(v,m,'undo');historyAction(v,m,'add','New branch');if(HISTORY_STAGE>=2)historyAction(v,m,'redo');});
test('a bounded mixed-operation model retains full-list state and available history',()=>{const v=render(<App/>),m=historyModel();for(let i=0;i<60;i++){const shown=historyVisible(m),kind=i%12;if(kind===0)historyAction(v,m,'filter',['All','Active','Completed'][Math.floor(i/12)%3]);else if(kind===1||kind===2||!shown.length)historyAction(v,m,'add',i%3?'Row '+i:'Same');else if(kind===3)historyAction(v,m,'toggle',i%shown.length);else if(kind===4)historyAction(v,m,'delete',i%shown.length);else if(kind===5)historyAction(v,m,'undo');else if(kind===6&&HISTORY_STAGE>=2)historyAction(v,m,'redo');else if(kind===7&&HISTORY_STAGE>=3)historyAction(v,m,'complete');else if(kind===8&&HISTORY_STAGE>=4)historyAction(v,m,'clear');else if(kind===9&&HISTORY_STAGE>=5)historyAction(v,m,'move',shown.length-1);else historyAction(v,m,'draft','draft '+i);}historyAction(v,m,'filter','All');});
test('history belongs to its mounted root, survives parent renders, and resets on a fresh mount',()=>{const a=render(<App/>),b=render(<App/>),ma=historyModel(),mb=historyModel();historyAction(a,ma,'add','Same');historyAction(a,ma,'add','Same');historyAction(b,mb,'add','Other');historyAction(a,ma,'toggle',1);historyAction(a,ma,'delete',1);a.rerender(<App/>);historyCheck(a,ma);historyCheck(b,mb);historyAction(a,ma,'undo');historyAction(b,mb,'undo');a.unmount();b.unmount();const fresh=render(<App/>);historyCheck(fresh,historyModel());});
`,
"react-evolving-board-4-start": `
const HISTORY_STAGE=3;

const historyWithin=require('@testing-library/react').within;
const historyInput=v=>historyWithin(v.container).getByRole('textbox',{name:'Task'});
const historyButton=(v,name)=>historyWithin(v.container).getByRole('button',{name,exact:true});
const historyClick=(v,name)=>fireEvent.click(historyButton(v,name));
const historyRows=v=>[...v.container.querySelectorAll('li')].map(li=>{let name='';const box=historyWithin(li).getByRole('checkbox',{name:n=>{name=n;return true;}});return {name,done:box.checked};});
const historyModel=()=>({rows:[],past:[],future:[],filter:'All',draft:'',next:0});
const historyVisible=m=>m.rows.filter(r=>m.filter==='All'||(m.filter==='Active'?!r.done:r.done));
const historyCheck=(v,m)=>{
 expect(historyRows(v)).toEqual(historyVisible(m).map(({name,done})=>({name,done})));
 expect(historyWithin(v.container).getByLabelText('Remaining').textContent).toBe(String(m.rows.filter(r=>!r.done).length));
 expect(historyInput(v).value).toBe(m.draft);
 expect(historyButton(v,'Undo').disabled).toBe(!m.past.length);
 if(HISTORY_STAGE>=2)expect(historyButton(v,'Redo').disabled).toBe(!m.future.length);
 if(HISTORY_STAGE>=3)expect(historyButton(v,'Complete all').disabled).toBe(!m.rows.some(r=>!r.done));
 if(HISTORY_STAGE>=4)expect(historyButton(v,'Clear completed').disabled).toBe(!m.rows.some(r=>r.done));
 if(HISTORY_STAGE>=5)for(const [i,li]of [...v.container.querySelectorAll('li')].entries())expect(historyWithin(li).getByRole('button',{name:'Move up '+historyVisible(m)[i].name,exact:true}).disabled).toBe(historyVisible(m)[i].id===m.rows[0].id);
};
const historyAction=(v,m,kind,value)=>{
 let next=null;
 if(kind==='draft'){fireEvent.change(historyInput(v),{target:{value}});m.draft=value;}
 if(kind==='filter'){historyClick(v,value);m.filter=value;}
 if(kind==='add'){fireEvent.change(historyInput(v),{target:{value}});m.draft=value;historyClick(v,'Add');if(value.trim()){next=[...m.rows,{id:++m.next,name:value.trim(),done:false}];m.draft='';}}
 if(kind==='toggle'){const id=historyVisible(m)[value].id;fireEvent.click(v.container.querySelectorAll('li input[type="checkbox"]')[value]);next=m.rows.map(r=>r.id===id?{...r,done:!r.done}:r);}
 if(kind==='delete'){const row=historyVisible(m)[value],li=v.container.querySelectorAll('li')[value];fireEvent.click(historyWithin(li).getByRole('button',{name:'Delete '+row.name,exact:true}));next=m.rows.filter(r=>r.id!==row.id);}
 if(kind==='complete'){historyClick(v,'Complete all');if(m.rows.some(r=>!r.done))next=m.rows.map(r=>({...r,done:true}));}
 if(kind==='clear'){historyClick(v,'Clear completed');if(m.rows.some(r=>r.done))next=m.rows.filter(r=>!r.done);}
 if(kind==='move'){const row=historyVisible(m)[value],i=m.rows.findIndex(r=>r.id===row.id);fireEvent.click(historyWithin(v.container.querySelectorAll('li')[value]).getByRole('button',{name:'Move up '+row.name,exact:true}));if(i>0){next=m.rows.slice();next.splice(i-1,2,m.rows[i],m.rows[i-1]);}}
 if(next){m.past.push(m.rows);m.rows=next;m.future=[];}
 if(kind==='undo'){historyClick(v,'Undo');if(m.past.length){m.future.unshift(m.rows);m.rows=m.past.pop();}}
 if(kind==='redo'){historyClick(v,'Redo');if(m.future.length){m.past.push(m.rows);m.rows=m.future.shift();}}
 historyCheck(v,m);
};
test('Complete all reaches hidden and later tasks and a single undo restores mixed completion',()=>{const v=render(<App/>),m=historyModel();for(const name of ['Same','Second','Same','Fourth','Fifth','Sixth'])historyAction(v,m,'add',name);historyAction(v,m,'toggle',1);historyAction(v,m,'filter','Completed');historyAction(v,m,'complete');historyAction(v,m,'filter','All');historyAction(v,m,'undo');historyAction(v,m,'redo');historyAction(v,m,'undo');historyAction(v,m,'filter','Active');historyAction(v,m,'complete');historyAction(v,m,'undo');});

test('history actions preserve draft and filter while a divergent edit invalidates Redo',()=>{const v=render(<App/>),m=historyModel();historyAction(v,m,'add','One');historyAction(v,m,'add','Two');historyAction(v,m,'toggle',0);historyAction(v,m,'draft','  keep typing  ');historyAction(v,m,'filter','Completed');historyAction(v,m,'undo');if(HISTORY_STAGE>=2){historyAction(v,m,'redo');historyAction(v,m,'undo');}historyAction(v,m,'filter','All');historyAction(v,m,'add','   ');if(HISTORY_STAGE>=2)historyAction(v,m,'redo');historyAction(v,m,'undo');historyAction(v,m,'add','New branch');if(HISTORY_STAGE>=2)historyAction(v,m,'redo');});
test('a bounded mixed-operation model retains full-list state and available history',()=>{const v=render(<App/>),m=historyModel();for(let i=0;i<60;i++){const shown=historyVisible(m),kind=i%12;if(kind===0)historyAction(v,m,'filter',['All','Active','Completed'][Math.floor(i/12)%3]);else if(kind===1||kind===2||!shown.length)historyAction(v,m,'add',i%3?'Row '+i:'Same');else if(kind===3)historyAction(v,m,'toggle',i%shown.length);else if(kind===4)historyAction(v,m,'delete',i%shown.length);else if(kind===5)historyAction(v,m,'undo');else if(kind===6&&HISTORY_STAGE>=2)historyAction(v,m,'redo');else if(kind===7&&HISTORY_STAGE>=3)historyAction(v,m,'complete');else if(kind===8&&HISTORY_STAGE>=4)historyAction(v,m,'clear');else if(kind===9&&HISTORY_STAGE>=5)historyAction(v,m,'move',shown.length-1);else historyAction(v,m,'draft','draft '+i);}historyAction(v,m,'filter','All');});
test('history belongs to its mounted root, survives parent renders, and resets on a fresh mount',()=>{const a=render(<App/>),b=render(<App/>),ma=historyModel(),mb=historyModel();historyAction(a,ma,'add','Same');historyAction(a,ma,'add','Same');historyAction(b,mb,'add','Other');historyAction(a,ma,'toggle',1);historyAction(a,ma,'delete',1);a.rerender(<App/>);historyCheck(a,ma);historyCheck(b,mb);historyAction(a,ma,'undo');historyAction(b,mb,'undo');a.unmount();b.unmount();const fresh=render(<App/>);historyCheck(fresh,historyModel());});
`,
"react-evolving-board-4": `
const HISTORY_STAGE=4;

const historyWithin=require('@testing-library/react').within;
const historyInput=v=>historyWithin(v.container).getByRole('textbox',{name:'Task'});
const historyButton=(v,name)=>historyWithin(v.container).getByRole('button',{name,exact:true});
const historyClick=(v,name)=>fireEvent.click(historyButton(v,name));
const historyRows=v=>[...v.container.querySelectorAll('li')].map(li=>{let name='';const box=historyWithin(li).getByRole('checkbox',{name:n=>{name=n;return true;}});return {name,done:box.checked};});
const historyModel=()=>({rows:[],past:[],future:[],filter:'All',draft:'',next:0});
const historyVisible=m=>m.rows.filter(r=>m.filter==='All'||(m.filter==='Active'?!r.done:r.done));
const historyCheck=(v,m)=>{
 expect(historyRows(v)).toEqual(historyVisible(m).map(({name,done})=>({name,done})));
 expect(historyWithin(v.container).getByLabelText('Remaining').textContent).toBe(String(m.rows.filter(r=>!r.done).length));
 expect(historyInput(v).value).toBe(m.draft);
 expect(historyButton(v,'Undo').disabled).toBe(!m.past.length);
 if(HISTORY_STAGE>=2)expect(historyButton(v,'Redo').disabled).toBe(!m.future.length);
 if(HISTORY_STAGE>=3)expect(historyButton(v,'Complete all').disabled).toBe(!m.rows.some(r=>!r.done));
 if(HISTORY_STAGE>=4)expect(historyButton(v,'Clear completed').disabled).toBe(!m.rows.some(r=>r.done));
 if(HISTORY_STAGE>=5)for(const [i,li]of [...v.container.querySelectorAll('li')].entries())expect(historyWithin(li).getByRole('button',{name:'Move up '+historyVisible(m)[i].name,exact:true}).disabled).toBe(historyVisible(m)[i].id===m.rows[0].id);
};
const historyAction=(v,m,kind,value)=>{
 let next=null;
 if(kind==='draft'){fireEvent.change(historyInput(v),{target:{value}});m.draft=value;}
 if(kind==='filter'){historyClick(v,value);m.filter=value;}
 if(kind==='add'){fireEvent.change(historyInput(v),{target:{value}});m.draft=value;historyClick(v,'Add');if(value.trim()){next=[...m.rows,{id:++m.next,name:value.trim(),done:false}];m.draft='';}}
 if(kind==='toggle'){const id=historyVisible(m)[value].id;fireEvent.click(v.container.querySelectorAll('li input[type="checkbox"]')[value]);next=m.rows.map(r=>r.id===id?{...r,done:!r.done}:r);}
 if(kind==='delete'){const row=historyVisible(m)[value],li=v.container.querySelectorAll('li')[value];fireEvent.click(historyWithin(li).getByRole('button',{name:'Delete '+row.name,exact:true}));next=m.rows.filter(r=>r.id!==row.id);}
 if(kind==='complete'){historyClick(v,'Complete all');if(m.rows.some(r=>!r.done))next=m.rows.map(r=>({...r,done:true}));}
 if(kind==='clear'){historyClick(v,'Clear completed');if(m.rows.some(r=>r.done))next=m.rows.filter(r=>!r.done);}
 if(kind==='move'){const row=historyVisible(m)[value],i=m.rows.findIndex(r=>r.id===row.id);fireEvent.click(historyWithin(v.container.querySelectorAll('li')[value]).getByRole('button',{name:'Move up '+row.name,exact:true}));if(i>0){next=m.rows.slice();next.splice(i-1,2,m.rows[i],m.rows[i-1]);}}
 if(next){m.past.push(m.rows);m.rows=next;m.future=[];}
 if(kind==='undo'){historyClick(v,'Undo');if(m.past.length){m.future.unshift(m.rows);m.rows=m.past.pop();}}
 if(kind==='redo'){historyClick(v,'Redo');if(m.future.length){m.past.push(m.rows);m.rows=m.future.shift();}}
 historyCheck(v,m);
};
test('bulk actions cross filters, clear before Undo, and retain duplicate identities',()=>{const v=render(<App/>),m=historyModel();for(const name of ['Same','Other','Same','Fourth','Same'])historyAction(v,m,'add',name);historyAction(v,m,'toggle',2);historyAction(v,m,'filter','Active');historyAction(v,m,'clear');historyAction(v,m,'filter','All');historyAction(v,m,'undo');historyAction(v,m,'complete');historyAction(v,m,'toggle',2);historyAction(v,m,'filter','Completed');historyAction(v,m,'clear');historyAction(v,m,'filter','All');historyAction(v,m,'undo');historyAction(v,m,'undo');});

test('history actions preserve draft and filter while a divergent edit invalidates Redo',()=>{const v=render(<App/>),m=historyModel();historyAction(v,m,'add','One');historyAction(v,m,'add','Two');historyAction(v,m,'toggle',0);historyAction(v,m,'draft','  keep typing  ');historyAction(v,m,'filter','Completed');historyAction(v,m,'undo');if(HISTORY_STAGE>=2){historyAction(v,m,'redo');historyAction(v,m,'undo');}historyAction(v,m,'filter','All');historyAction(v,m,'add','   ');if(HISTORY_STAGE>=2)historyAction(v,m,'redo');historyAction(v,m,'undo');historyAction(v,m,'add','New branch');if(HISTORY_STAGE>=2)historyAction(v,m,'redo');});
test('a bounded mixed-operation model retains full-list state and available history',()=>{const v=render(<App/>),m=historyModel();for(let i=0;i<60;i++){const shown=historyVisible(m),kind=i%12;if(kind===0)historyAction(v,m,'filter',['All','Active','Completed'][Math.floor(i/12)%3]);else if(kind===1||kind===2||!shown.length)historyAction(v,m,'add',i%3?'Row '+i:'Same');else if(kind===3)historyAction(v,m,'toggle',i%shown.length);else if(kind===4)historyAction(v,m,'delete',i%shown.length);else if(kind===5)historyAction(v,m,'undo');else if(kind===6&&HISTORY_STAGE>=2)historyAction(v,m,'redo');else if(kind===7&&HISTORY_STAGE>=3)historyAction(v,m,'complete');else if(kind===8&&HISTORY_STAGE>=4)historyAction(v,m,'clear');else if(kind===9&&HISTORY_STAGE>=5)historyAction(v,m,'move',shown.length-1);else historyAction(v,m,'draft','draft '+i);}historyAction(v,m,'filter','All');});
test('history belongs to its mounted root, survives parent renders, and resets on a fresh mount',()=>{const a=render(<App/>),b=render(<App/>),ma=historyModel(),mb=historyModel();historyAction(a,ma,'add','Same');historyAction(a,ma,'add','Same');historyAction(b,mb,'add','Other');historyAction(a,ma,'toggle',1);historyAction(a,ma,'delete',1);a.rerender(<App/>);historyCheck(a,ma);historyCheck(b,mb);historyAction(a,ma,'undo');historyAction(b,mb,'undo');a.unmount();b.unmount();const fresh=render(<App/>);historyCheck(fresh,historyModel());});
`,
"react-evolving-board-5-start": `
const HISTORY_STAGE=5;

const historyWithin=require('@testing-library/react').within;
const historyInput=v=>historyWithin(v.container).getByRole('textbox',{name:'Task'});
const historyButton=(v,name)=>historyWithin(v.container).getByRole('button',{name,exact:true});
const historyClick=(v,name)=>fireEvent.click(historyButton(v,name));
const historyRows=v=>[...v.container.querySelectorAll('li')].map(li=>{let name='';const box=historyWithin(li).getByRole('checkbox',{name:n=>{name=n;return true;}});return {name,done:box.checked};});
const historyModel=()=>({rows:[],past:[],future:[],filter:'All',draft:'',next:0});
const historyVisible=m=>m.rows.filter(r=>m.filter==='All'||(m.filter==='Active'?!r.done:r.done));
const historyCheck=(v,m)=>{
 expect(historyRows(v)).toEqual(historyVisible(m).map(({name,done})=>({name,done})));
 expect(historyWithin(v.container).getByLabelText('Remaining').textContent).toBe(String(m.rows.filter(r=>!r.done).length));
 expect(historyInput(v).value).toBe(m.draft);
 expect(historyButton(v,'Undo').disabled).toBe(!m.past.length);
 if(HISTORY_STAGE>=2)expect(historyButton(v,'Redo').disabled).toBe(!m.future.length);
 if(HISTORY_STAGE>=3)expect(historyButton(v,'Complete all').disabled).toBe(!m.rows.some(r=>!r.done));
 if(HISTORY_STAGE>=4)expect(historyButton(v,'Clear completed').disabled).toBe(!m.rows.some(r=>r.done));
 if(HISTORY_STAGE>=5)for(const [i,li]of [...v.container.querySelectorAll('li')].entries())expect(historyWithin(li).getByRole('button',{name:'Move up '+historyVisible(m)[i].name,exact:true}).disabled).toBe(historyVisible(m)[i].id===m.rows[0].id);
};
const historyAction=(v,m,kind,value)=>{
 let next=null;
 if(kind==='draft'){fireEvent.change(historyInput(v),{target:{value}});m.draft=value;}
 if(kind==='filter'){historyClick(v,value);m.filter=value;}
 if(kind==='add'){fireEvent.change(historyInput(v),{target:{value}});m.draft=value;historyClick(v,'Add');if(value.trim()){next=[...m.rows,{id:++m.next,name:value.trim(),done:false}];m.draft='';}}
 if(kind==='toggle'){const id=historyVisible(m)[value].id;fireEvent.click(v.container.querySelectorAll('li input[type="checkbox"]')[value]);next=m.rows.map(r=>r.id===id?{...r,done:!r.done}:r);}
 if(kind==='delete'){const row=historyVisible(m)[value],li=v.container.querySelectorAll('li')[value];fireEvent.click(historyWithin(li).getByRole('button',{name:'Delete '+row.name,exact:true}));next=m.rows.filter(r=>r.id!==row.id);}
 if(kind==='complete'){historyClick(v,'Complete all');if(m.rows.some(r=>!r.done))next=m.rows.map(r=>({...r,done:true}));}
 if(kind==='clear'){historyClick(v,'Clear completed');if(m.rows.some(r=>r.done))next=m.rows.filter(r=>!r.done);}
 if(kind==='move'){const row=historyVisible(m)[value],i=m.rows.findIndex(r=>r.id===row.id);fireEvent.click(historyWithin(v.container.querySelectorAll('li')[value]).getByRole('button',{name:'Move up '+row.name,exact:true}));if(i>0){next=m.rows.slice();next.splice(i-1,2,m.rows[i],m.rows[i-1]);}}
 if(next){m.past.push(m.rows);m.rows=next;m.future=[];}
 if(kind==='undo'){historyClick(v,'Undo');if(m.past.length){m.future.unshift(m.rows);m.rows=m.past.pop();}}
 if(kind==='redo'){historyClick(v,'Redo');if(m.future.length){m.past.push(m.rows);m.rows=m.future.shift();}}
 historyCheck(v,m);
};
test('Move up swaps one full-list neighbor and can cross a hidden first task',()=>{const v=render(<App/>),m=historyModel();for(const name of ['Same','Second','Same','Fourth','Fifth'])historyAction(v,m,'add',name);historyAction(v,m,'toggle',0);historyAction(v,m,'move',3);historyAction(v,m,'move',2);historyAction(v,m,'filter','Active');historyAction(v,m,'move',0);historyAction(v,m,'filter','All');historyAction(v,m,'undo');historyAction(v,m,'redo');historyAction(v,m,'move',0);});

test('history actions preserve draft and filter while a divergent edit invalidates Redo',()=>{const v=render(<App/>),m=historyModel();historyAction(v,m,'add','One');historyAction(v,m,'add','Two');historyAction(v,m,'toggle',0);historyAction(v,m,'draft','  keep typing  ');historyAction(v,m,'filter','Completed');historyAction(v,m,'undo');if(HISTORY_STAGE>=2){historyAction(v,m,'redo');historyAction(v,m,'undo');}historyAction(v,m,'filter','All');historyAction(v,m,'add','   ');if(HISTORY_STAGE>=2)historyAction(v,m,'redo');historyAction(v,m,'undo');historyAction(v,m,'add','New branch');if(HISTORY_STAGE>=2)historyAction(v,m,'redo');});
test('a bounded mixed-operation model retains full-list state and available history',()=>{const v=render(<App/>),m=historyModel();for(let i=0;i<60;i++){const shown=historyVisible(m),kind=i%12;if(kind===0)historyAction(v,m,'filter',['All','Active','Completed'][Math.floor(i/12)%3]);else if(kind===1||kind===2||!shown.length)historyAction(v,m,'add',i%3?'Row '+i:'Same');else if(kind===3)historyAction(v,m,'toggle',i%shown.length);else if(kind===4)historyAction(v,m,'delete',i%shown.length);else if(kind===5)historyAction(v,m,'undo');else if(kind===6&&HISTORY_STAGE>=2)historyAction(v,m,'redo');else if(kind===7&&HISTORY_STAGE>=3)historyAction(v,m,'complete');else if(kind===8&&HISTORY_STAGE>=4)historyAction(v,m,'clear');else if(kind===9&&HISTORY_STAGE>=5)historyAction(v,m,'move',shown.length-1);else historyAction(v,m,'draft','draft '+i);}historyAction(v,m,'filter','All');});
test('history belongs to its mounted root, survives parent renders, and resets on a fresh mount',()=>{const a=render(<App/>),b=render(<App/>),ma=historyModel(),mb=historyModel();historyAction(a,ma,'add','Same');historyAction(a,ma,'add','Same');historyAction(b,mb,'add','Other');historyAction(a,ma,'toggle',1);historyAction(a,ma,'delete',1);a.rerender(<App/>);historyCheck(a,ma);historyCheck(b,mb);historyAction(a,ma,'undo');historyAction(b,mb,'undo');a.unmount();b.unmount();const fresh=render(<App/>);historyCheck(fresh,historyModel());});
`,
};
for (const [id, cases] of Object.entries(HISTORY_BOARD_REVIEW_CASES)) {
  const solution = REACT_EVOLVING_SOLUTIONS[id];
  solution.hiddenSuite = [solution.hiddenSuite, cases].filter(Boolean).join("\n\n");
}

// Individual final-board and early explorer checks; checkpoint inheritance stays scoped.
const EXPLORER_BOARD_REVIEW_CASES: Record<string,string> = {
"react-evolving-board-5": `
const HISTORY_STAGE=6;

const historyWithin=require('@testing-library/react').within;
const historyInput=v=>historyWithin(v.container).getByRole('textbox',{name:'Task'});
const historyButton=(v,name)=>historyWithin(v.container).getByRole('button',{name,exact:true});
const historyClick=(v,name)=>fireEvent.click(historyButton(v,name));
const historyRows=v=>[...v.container.querySelectorAll('li')].map(li=>{let name='';const box=historyWithin(li).getByRole('checkbox',{name:n=>{name=n;return true;}});return {name,done:box.checked};});
const historyModel=()=>({rows:[],past:[],future:[],filter:'All',draft:'',next:0});
const historyVisible=m=>m.rows.filter(r=>m.filter==='All'||(m.filter==='Active'?!r.done:r.done));
const historyCheck=(v,m)=>{
 expect(historyRows(v)).toEqual(historyVisible(m).map(({name,done})=>({name,done})));
 expect(historyWithin(v.container).getByLabelText('Remaining').textContent).toBe(String(m.rows.filter(r=>!r.done).length));
 expect(historyInput(v).value).toBe(m.draft);
 expect(historyButton(v,'Undo').disabled).toBe(!m.past.length);
 if(HISTORY_STAGE>=2)expect(historyButton(v,'Redo').disabled).toBe(!m.future.length);
 if(HISTORY_STAGE>=3)expect(historyButton(v,'Complete all').disabled).toBe(!m.rows.some(r=>!r.done));
 if(HISTORY_STAGE>=4)expect(historyButton(v,'Clear completed').disabled).toBe(!m.rows.some(r=>r.done));
 if(HISTORY_STAGE>=5)for(const [i,li]of [...v.container.querySelectorAll('li')].entries())expect(historyWithin(li).getByRole('button',{name:'Move up '+historyVisible(m)[i].name,exact:true}).disabled).toBe(historyVisible(m)[i].id===m.rows[0].id);
 if(HISTORY_STAGE>=6)for(const [i,li]of [...v.container.querySelectorAll('li')].entries())expect(historyWithin(li).getByRole('button',{name:'Move down '+historyVisible(m)[i].name,exact:true}).disabled).toBe(historyVisible(m)[i].id===m.rows[m.rows.length-1].id);
};
const historyAction=(v,m,kind,value)=>{
 let next=null;
 if(kind==='draft'){fireEvent.change(historyInput(v),{target:{value}});m.draft=value;}
 if(kind==='filter'){historyClick(v,value);m.filter=value;}
 if(kind==='add'){fireEvent.change(historyInput(v),{target:{value}});m.draft=value;historyClick(v,'Add');if(value.trim()){next=[...m.rows,{id:++m.next,name:value.trim(),done:false}];m.draft='';}}
 if(kind==='toggle'){const id=historyVisible(m)[value].id;fireEvent.click(v.container.querySelectorAll('li input[type="checkbox"]')[value]);next=m.rows.map(r=>r.id===id?{...r,done:!r.done}:r);}
 if(kind==='delete'){const row=historyVisible(m)[value],li=v.container.querySelectorAll('li')[value];fireEvent.click(historyWithin(li).getByRole('button',{name:'Delete '+row.name,exact:true}));next=m.rows.filter(r=>r.id!==row.id);}
 if(kind==='complete'){historyClick(v,'Complete all');if(m.rows.some(r=>!r.done))next=m.rows.map(r=>({...r,done:true}));}
 if(kind==='clear'){historyClick(v,'Clear completed');if(m.rows.some(r=>r.done))next=m.rows.filter(r=>!r.done);}
 if(kind==='move'){const row=historyVisible(m)[value],i=m.rows.findIndex(r=>r.id===row.id);fireEvent.click(historyWithin(v.container.querySelectorAll('li')[value]).getByRole('button',{name:'Move up '+row.name,exact:true}));if(i>0){next=m.rows.slice();next.splice(i-1,2,m.rows[i],m.rows[i-1]);}}
 if(kind==='down'){const row=historyVisible(m)[value],i=m.rows.findIndex(r=>r.id===row.id);fireEvent.click(historyWithin(v.container.querySelectorAll('li')[value]).getByRole('button',{name:'Move down '+row.name,exact:true}));if(i<m.rows.length-1){next=m.rows.slice();next.splice(i,2,m.rows[i+1],m.rows[i]);}}
 if(next){m.past.push(m.rows);m.rows=next;m.future=[];}
 if(kind==='undo'){historyClick(v,'Undo');if(m.past.length){m.future.unshift(m.rows);m.rows=m.past.pop();}}
 if(kind==='redo'){historyClick(v,'Redo');if(m.future.length){m.past.push(m.rows);m.rows=m.future.shift();}}
 historyCheck(v,m);
};

test('longer duplicate boards retain all Undo snapshots and independent identity through both move directions',()=>{const v=render(<App/>),m=historyModel();for(const name of ['Same','Second','Same','Fourth','Fifth','Same'])historyAction(v,m,'add',name);historyAction(v,m,'toggle',2);historyAction(v,m,'down',2);historyAction(v,m,'move',4);historyAction(v,m,'delete',3);while(m.past.length)historyAction(v,m,'undo');while(m.future.length)historyAction(v,m,'redo');});
test('both directions cross hidden neighbors and a disabled boundary preserves Redo',()=>{const v=render(<App/>),m=historyModel();for(const name of ['A','B','C','D','E'])historyAction(v,m,'add',name);historyAction(v,m,'toggle',1);historyAction(v,m,'toggle',3);historyAction(v,m,'filter','Active');historyAction(v,m,'down',0);historyAction(v,m,'move',2);historyAction(v,m,'filter','All');historyAction(v,m,'undo');historyAction(v,m,'move',0);historyAction(v,m,'redo');historyAction(v,m,'undo');historyAction(v,m,'down',4);historyAction(v,m,'redo');});
test('a bounded mixed-operation model retains full-list state and available history',()=>{const v=render(<App/>),m=historyModel();for(let i=0;i<60;i++){const shown=historyVisible(m),kind=i%12;if(kind===0)historyAction(v,m,'filter',['All','Active','Completed'][Math.floor(i/12)%3]);else if(kind===1||kind===2||!shown.length)historyAction(v,m,'add',i%3?'Row '+i:'Same');else if(kind===3)historyAction(v,m,'toggle',i%shown.length);else if(kind===4)historyAction(v,m,'delete',i%shown.length);else if(kind===5)historyAction(v,m,'undo');else if(kind===6&&HISTORY_STAGE>=2)historyAction(v,m,'redo');else if(kind===7&&HISTORY_STAGE>=3)historyAction(v,m,'complete');else if(kind===8&&HISTORY_STAGE>=4)historyAction(v,m,'clear');else if(kind===9&&HISTORY_STAGE>=5)historyAction(v,m,'move',shown.length-1);else historyAction(v,m,'draft','draft '+i);}historyAction(v,m,'filter','All');});
test('history belongs to its mounted root, survives parent renders, and resets on a fresh mount',()=>{const a=render(<App/>),b=render(<App/>),ma=historyModel(),mb=historyModel();historyAction(a,ma,'add','Same');historyAction(a,ma,'add','Same');historyAction(b,mb,'add','Other');historyAction(a,ma,'toggle',1);historyAction(a,ma,'delete',1);a.rerender(<App/>);historyCheck(a,ma);historyCheck(b,mb);historyAction(a,ma,'undo');historyAction(b,mb,'undo');a.unmount();b.unmount();const fresh=render(<App/>);historyCheck(fresh,historyModel());});
`,
"react-evolving-catalog-1-start": `
const productsWithin=require('@testing-library/react').within;
const productFixture=[{id:1,name:'Apple',price:2},{id:2,name:'Banana',price:1},{id:3,name:'Carrot',price:3},{id:4,name:'Dates',price:4}];
const productControl=(v,name)=>productsWithin(v.container).getByLabelText(name);
const productRows=(v,expected)=>{const lis=[...v.container.querySelectorAll('li')];expect(lis.length).toBe(expected.length);for(const [i,row]of expected.entries()){expect(lis[i].textContent).toContain(row.name);expect(new RegExp('(^|[^0-9])'+row.price+'([^0-9]|$)').test(lis[i].textContent)).toBe(true);}};
const productQuery=(v,value)=>fireEvent.change(productControl(v,'Search'),{target:{value}});
const productSort=(v,value)=>fireEvent.change(productControl(v,'Sort'),{target:{value}});
const productExpected=(query,mode='name')=>productFixture.filter(p=>p.name.toLowerCase().includes(query.trim().toLowerCase())).sort((a,b)=>mode==='name'?a.name.localeCompare(b.name):mode==='price-asc'?a.price-b.price:b.price-a.price);
const productEmpty=(v,empty)=>expect(Boolean(productsWithin(v.container).queryByText('No products',{exact:true}))).toBe(empty);

test('all four named products retain their own prices exactly once',()=>{const v=render(<App/>);productRows(v,productFixture);expect(v.container.querySelectorAll('li').length).toBe(4);});
test('ordinary parent renders do not lose or duplicate fixed products',()=>{const v=render(<App/>);for(let i=0;i<5;i++){v.rerender(<App/>);productRows(v,productFixture);}});
test('independently mounted lists each retain the whole fixed dataset',()=>{const a=render(<App/>),b=render(<App/>);productRows(a,productFixture);productRows(b,productFixture);});
test('a new list starts with every product after another root unmounts',()=>{const old=render(<App/>);old.unmount();productRows(render(<App/>),productFixture);});
`,
"react-evolving-catalog-1": `
const productsWithin=require('@testing-library/react').within;
const productFixture=[{id:1,name:'Apple',price:2},{id:2,name:'Banana',price:1},{id:3,name:'Carrot',price:3},{id:4,name:'Dates',price:4}];
const productControl=(v,name)=>productsWithin(v.container).getByLabelText(name);
const productRows=(v,expected)=>{const lis=[...v.container.querySelectorAll('li')];expect(lis.length).toBe(expected.length);for(const [i,row]of expected.entries()){expect(lis[i].textContent).toContain(row.name);expect(new RegExp('(^|[^0-9])'+row.price+'([^0-9]|$)').test(lis[i].textContent)).toBe(true);}};
const productQuery=(v,value)=>fireEvent.change(productControl(v,'Search'),{target:{value}});
const productSort=(v,value)=>fireEvent.change(productControl(v,'Sort'),{target:{value}});
const productExpected=(query,mode='name')=>productFixture.filter(p=>p.name.toLowerCase().includes(query.trim().toLowerCase())).sort((a,b)=>mode==='name'?a.name.localeCompare(b.name):mode==='price-asc'?a.price-b.price:b.price-a.price);
const productEmpty=(v,empty)=>expect(Boolean(productsWithin(v.container).queryByText('No products',{exact:true}))).toBe(empty);

test('all products keep their literal name and price through varied substring searches',()=>{const v=render(<App/>);for(const query of ['', ' DATES ','a','rRo','an','le','\u00a0 Da \ufeff','nothing','<task>&','a'.repeat(300),'']){productQuery(v,query);const rows=productExpected(query);productRows(v,rows);productEmpty(v,!rows.length);}});
test('empty results recover and parent renders preserve the selected query',()=>{const v=render(<App/>);productQuery(v,'zzzz');productRows(v,[]);productEmpty(v,true);v.rerender(<App/>);productRows(v,[]);productQuery(v,'dates');productRows(v,productExpected('dates'));productEmpty(v,false);});
test('two mounted searches stay independent',()=>{const a=render(<App/>),b=render(<App/>);productQuery(a,'le');productQuery(b,'at');a.rerender(<App/>);productRows(a,productExpected('le'));productRows(b,productExpected('at'));});
test('a fresh search starts with all four original products',()=>{const old=render(<App/>);productQuery(old,'rro');old.unmount();const v=render(<App/>);productRows(v,productFixture);productEmpty(v,false);});
`,
"react-evolving-catalog-2-start": `
const productsWithin=require('@testing-library/react').within;
const productFixture=[{id:1,name:'Apple',price:2},{id:2,name:'Banana',price:1},{id:3,name:'Carrot',price:3},{id:4,name:'Dates',price:4}];
const productControl=(v,name)=>productsWithin(v.container).getByLabelText(name);
const productRows=(v,expected)=>{const lis=[...v.container.querySelectorAll('li')];expect(lis.length).toBe(expected.length);for(const [i,row]of expected.entries()){expect(lis[i].textContent).toContain(row.name);expect(new RegExp('(^|[^0-9])'+row.price+'([^0-9]|$)').test(lis[i].textContent)).toBe(true);}};
const productQuery=(v,value)=>fireEvent.change(productControl(v,'Search'),{target:{value}});
const productSort=(v,value)=>fireEvent.change(productControl(v,'Sort'),{target:{value}});
const productExpected=(query,mode='name')=>productFixture.filter(p=>p.name.toLowerCase().includes(query.trim().toLowerCase())).sort((a,b)=>mode==='name'?a.name.localeCompare(b.name):mode==='price-asc'?a.price-b.price:b.price-a.price);
const productEmpty=(v,empty)=>expect(Boolean(productsWithin(v.container).queryByText('No products',{exact:true}))).toBe(empty);

test('all three sort modes apply to the complete filtered result without pagination',()=>{const v=render(<App/>);expect(productControl(v,'Sort').value).toBe('name');for(const query of ['','e','t','A','nothing','']){productQuery(v,query);for(const mode of ['price-asc','price-desc','name']){productSort(v,mode);const rows=productExpected(query,mode);productRows(v,rows);productEmpty(v,!rows.length);}}});
test('changing a query retains its chosen sort through parent renders',()=>{const v=render(<App/>);productSort(v,'price-desc');productQuery(v,'e');v.rerender(<App/>);expect(productControl(v,'Sort').value).toBe('price-desc');productRows(v,productExpected('e','price-desc'));productQuery(v,'');productRows(v,productExpected('','price-desc'));});
test('sorting one mounted explorer never changes another root',()=>{const a=render(<App/>),b=render(<App/>);productSort(a,'price-desc');b.rerender(<App/>);productRows(a,productExpected('','price-desc'));productRows(b,productFixture);productQuery(b,'t');productSort(b,'price-asc');productRows(a,productExpected('','price-desc'));productRows(b,productExpected('t','price-asc'));});
test('a newly mounted explorer starts in name order after earlier sorting',()=>{const old=render(<App/>);productSort(old,'price-desc');old.unmount();const v=render(<App/>);expect(productControl(v,'Sort').value).toBe('name');productRows(v,productFixture);});
`,
"react-evolving-catalog-2": `
const productsWithin=require('@testing-library/react').within;
const productFixture=[{id:1,name:'Apple',price:2},{id:2,name:'Banana',price:1},{id:3,name:'Carrot',price:3},{id:4,name:'Dates',price:4}];
const productControl=(v,name)=>productsWithin(v.container).getByLabelText(name);
const productRows=(v,expected)=>{const lis=[...v.container.querySelectorAll('li')];expect(lis.length).toBe(expected.length);for(const [i,row]of expected.entries()){expect(lis[i].textContent).toContain(row.name);expect(new RegExp('(^|[^0-9])'+row.price+'([^0-9]|$)').test(lis[i].textContent)).toBe(true);}};
const productQuery=(v,value)=>fireEvent.change(productControl(v,'Search'),{target:{value}});
const productSort=(v,value)=>fireEvent.change(productControl(v,'Sort'),{target:{value}});
const productExpected=(query,mode='name')=>productFixture.filter(p=>p.name.toLowerCase().includes(query.trim().toLowerCase())).sort((a,b)=>mode==='name'?a.name.localeCompare(b.name):mode==='price-asc'?a.price-b.price:b.price-a.price);
const productEmpty=(v,empty)=>expect(Boolean(productsWithin(v.container).queryByText('No products',{exact:true}))).toBe(empty);

const productButton=(v,name)=>productsWithin(v.container).getByRole('button',{name,exact:true});
const productPage=(v,rows,page)=>{const count=Math.ceil(rows.length/2);productRows(v,rows.slice(page*2,page*2+2));expect(productControl(v,'Page').textContent).toBe((count?page+1:0)+' / '+count);expect(productButton(v,'Previous').disabled).toBe(page===0);expect(productButton(v,'Next').disabled).toBe(page+1>=count);productEmpty(v,!rows.length);};
test('every sort mode pages forward and backward with exact rows and boundary controls',()=>{const v=render(<App/>);for(const mode of ['name','price-desc','price-asc']){productSort(v,mode);const rows=productExpected('',mode);productPage(v,rows,0);fireEvent.click(productButton(v,'Next'));productPage(v,rows,1);fireEvent.click(productButton(v,'Next'));productPage(v,rows,1);fireEvent.click(productButton(v,'Previous'));productPage(v,rows,0);fireEvent.click(productButton(v,'Previous'));productPage(v,rows,0);}});
test('each search and sort change resets page before rendering filtered results',()=>{const v=render(<App/>);for(const query of ['e','t','xyz',' DATES ','a']){productQuery(v,'');productSort(v,'name');fireEvent.click(productButton(v,'Next'));productQuery(v,query);productPage(v,productExpected(query),0);}productQuery(v,'');fireEvent.click(productButton(v,'Next'));productSort(v,'price-asc');productPage(v,productExpected('','price-asc'),0);});
test('parent renders and independent roots retain their own query sort and page',()=>{const a=render(<App/>),b=render(<App/>);productSort(a,'price-desc');fireEvent.click(productButton(a,'Next'));productQuery(b,'t');productSort(b,'price-asc');a.rerender(<App/>);productPage(a,productExpected('','price-desc'),1);productPage(b,productExpected('t','price-asc'),0);});
test('a fresh explorer starts on page one with default sorting after a prior root unmounts',()=>{const old=render(<App/>);productSort(old,'price-desc');fireEvent.click(productButton(old,'Next'));old.unmount();const v=render(<App/>);productPage(v,productFixture,0);expect(productControl(v,'Sort').value).toBe('name');});
`,
};
for (const [id,cases] of Object.entries(EXPLORER_BOARD_REVIEW_CASES)) {
  const solution=REACT_EVOLVING_SOLUTIONS[id];
  solution.hiddenSuite=[solution.hiddenSuite,cases].filter(Boolean).join("\n\n");
}

// Scoped selection, price-filter and valid-quantity checkpoints and milestones.
const SELECTION_CART_REVIEW_CASES: Record<string,string> = {
"react-evolving-catalog-3-start": `
const CART_STAGE=0;

const cartWithin=require('@testing-library/react').within;
const cartProducts=[{id:1,name:'Apple',price:2},{id:2,name:'Banana',price:1},{id:3,name:'Carrot',price:3},{id:4,name:'Dates',price:4}];
const cartModel=()=>({query:'',sort:'name',maximum:'',page:0,selected:[],quantities:{}});
const cartField=(v,name)=>cartWithin(v.container).getByLabelText(name);
const cartButton=(v,name)=>cartWithin(v.container).getByRole('button',{name,exact:true});
const cartFiltered=m=>cartProducts.filter(p=>p.name.toLowerCase().includes(m.query.trim().toLowerCase())&&(CART_STAGE<2||m.maximum===''||p.price<=Number(m.maximum))).sort((a,b)=>m.sort==='name'?a.name.localeCompare(b.name):m.sort==='price-asc'?a.price-b.price:b.price-a.price);
const cartCheck=(v,m)=>{const rows=cartFiltered(m),pages=Math.ceil(rows.length/2),visible=rows.slice(m.page*2,m.page*2+2),boxes=cartWithin(v.container).queryAllByRole('checkbox');expect(boxes.length).toBe(visible.length);for(const [i,p]of visible.entries()){const li=boxes[i].closest('li');expect(Boolean(li)).toBe(true);expect(cartWithin(li).getByRole('checkbox',{name:p.name,exact:true}).checked).toBe(m.selected.includes(p.id));expect(new RegExp('(^|[^0-9])'+p.price+'([^0-9]|$)').test(li.textContent)).toBe(true);}expect(cartField(v,'Page').textContent).toBe((pages?m.page+1:0)+' / '+pages);expect(cartButton(v,'Previous').disabled).toBe(m.page===0);expect(cartButton(v,'Next').disabled).toBe(m.page+1>=pages);const sum=cartProducts.filter(p=>m.selected.includes(p.id)).reduce((n,p)=>n+p.price*(m.quantities[p.id]??1),0);expect(cartField(v,'Selected total').textContent).toBe(String(sum));if(CART_STAGE>=1){expect(cartButton(v,'Select page').disabled).toBe(!visible.length);expect(cartButton(v,'Clear selection').disabled).toBe(!m.selected.length);}if(CART_STAGE>=4)for(const p of cartProducts.filter(p=>m.selected.includes(p.id)))expect(Number(cartField(v,'Quantity '+p.name).value)).toBe(m.quantities[p.id]??1);expect(Boolean(cartWithin(v.container).queryByText('No products',{exact:true}))).toBe(!visible.length);};
const cartAction=(v,m,kind,value)=>{const rows=cartFiltered(m),visible=rows.slice(m.page*2,m.page*2+2),pages=Math.ceil(rows.length/2);
 if(kind==='query'||kind==='sort'||kind==='maximum'){const label=kind==='query'?'Search':kind==='sort'?'Sort':'Maximum price',changed=cartField(v,label).value!==value;if(changed)fireEvent.change(cartField(v,label),{target:{value}});m[kind]=value;if(changed){if(kind!=='maximum'||CART_STAGE>=3)m.page=0;else {const count=Math.ceil(cartFiltered(m).length/2),shown=cartField(v,'Page').textContent.split('/').map(Number)[0];m.page=count?shown-1:0;expect(m.page>=0&&m.page<Math.max(1,count)).toBe(true);}}}
 if(kind==='next'){fireEvent.click(cartButton(v,'Next'));if(m.page+1<pages)m.page++;}
 if(kind==='previous'){fireEvent.click(cartButton(v,'Previous'));if(m.page>0)m.page--;}
 if(kind==='toggle'){const p=visible[value];fireEvent.click(cartWithin(v.container).getByRole('checkbox',{name:p.name,exact:true}));m.selected=m.selected.includes(p.id)?m.selected.filter(id=>id!==p.id):[...m.selected,p.id];}
 if(kind==='select'){fireEvent.click(cartButton(v,'Select page'));for(const p of visible)if(!m.selected.includes(p.id))m.selected.push(p.id);}
 if(kind==='clear'){fireEvent.click(cartButton(v,'Clear selection'));m.selected=[];}
 if(kind==='quantity'){const p=cartProducts.find(p=>p.id===value[0]);fireEvent.change(cartField(v,'Quantity '+p.name),{target:{value:String(value[1])}});m.quantities[p.id]=value[1];}
 cartCheck(v,m);
};

test('every product toggles independently across pages and hidden searches with full-list totals',()=>{const v=render(<App/>),m=cartModel();cartCheck(v,m);cartAction(v,m,'toggle',0);cartAction(v,m,'toggle',1);cartAction(v,m,'next');cartAction(v,m,'toggle',0);cartAction(v,m,'toggle',1);cartAction(v,m,'query','zzz');cartAction(v,m,'query','');cartAction(v,m,'toggle',0);cartAction(v,m,'next');cartAction(v,m,'toggle',1);cartAction(v,m,'previous');});

test('a bounded selection and view model preserves identities totals and independent paging',()=>{const v=render(<App/>),m=cartModel();for(let i=0;i<48;i++){const rows=cartFiltered(m),shown=rows.slice(m.page*2,m.page*2+2),step=i%8;if(step===0)cartAction(v,m,'query',['','t','zzz','a'][Math.floor(i/8)%4]);else if(step===1&&CART_STAGE>=1)cartAction(v,m,'select');else if(step===2)cartAction(v,m,'next');else if(step===3&&shown.length)cartAction(v,m,'toggle',i%shown.length);else if(step===4&&CART_STAGE>=1)cartAction(v,m,'sort',['name','price-asc','price-desc'][Math.floor(i/8)%3]);else if(step===5&&CART_STAGE>=2){if(CART_STAGE===2)cartAction(v,m,'clear');cartAction(v,m,'maximum',['0','1.5','4',''][Math.floor(i/8)%4]);}else if(step===6)cartAction(v,m,'previous');else if(step===7&&CART_STAGE>=1)cartAction(v,m,'clear');else cartCheck(v,m);}});

test('parent renders independent explorers and fresh mounts keep their own selection state',()=>{const a=render(<App/>),b=render(<App/>),ma=cartModel(),mb=cartModel();cartAction(a,ma,'toggle',0);cartAction(b,mb,'toggle',1);cartAction(a,ma,'query','zzz');a.rerender(<App/>);cartCheck(a,ma);cartCheck(b,mb);a.unmount();b.unmount();cartCheck(render(<App/>),cartModel());});

test('empty-result recovery never transfers a hidden selection to a visible position',()=>{const v=render(<App/>),m=cartModel();cartAction(v,m,'toggle',1);for(const query of ['Dates','zzz','apple','banana',''])cartAction(v,m,'query',query);cartAction(v,m,'toggle',1);});
`,
"react-evolving-catalog-3": `
const CART_STAGE=1;

const cartWithin=require('@testing-library/react').within;
const cartProducts=[{id:1,name:'Apple',price:2},{id:2,name:'Banana',price:1},{id:3,name:'Carrot',price:3},{id:4,name:'Dates',price:4}];
const cartModel=()=>({query:'',sort:'name',maximum:'',page:0,selected:[],quantities:{}});
const cartField=(v,name)=>cartWithin(v.container).getByLabelText(name);
const cartButton=(v,name)=>cartWithin(v.container).getByRole('button',{name,exact:true});
const cartFiltered=m=>cartProducts.filter(p=>p.name.toLowerCase().includes(m.query.trim().toLowerCase())&&(CART_STAGE<2||m.maximum===''||p.price<=Number(m.maximum))).sort((a,b)=>m.sort==='name'?a.name.localeCompare(b.name):m.sort==='price-asc'?a.price-b.price:b.price-a.price);
const cartCheck=(v,m)=>{const rows=cartFiltered(m),pages=Math.ceil(rows.length/2),visible=rows.slice(m.page*2,m.page*2+2),boxes=cartWithin(v.container).queryAllByRole('checkbox');expect(boxes.length).toBe(visible.length);for(const [i,p]of visible.entries()){const li=boxes[i].closest('li');expect(Boolean(li)).toBe(true);expect(cartWithin(li).getByRole('checkbox',{name:p.name,exact:true}).checked).toBe(m.selected.includes(p.id));expect(new RegExp('(^|[^0-9])'+p.price+'([^0-9]|$)').test(li.textContent)).toBe(true);}expect(cartField(v,'Page').textContent).toBe((pages?m.page+1:0)+' / '+pages);expect(cartButton(v,'Previous').disabled).toBe(m.page===0);expect(cartButton(v,'Next').disabled).toBe(m.page+1>=pages);const sum=cartProducts.filter(p=>m.selected.includes(p.id)).reduce((n,p)=>n+p.price*(m.quantities[p.id]??1),0);expect(cartField(v,'Selected total').textContent).toBe(String(sum));if(CART_STAGE>=1){expect(cartButton(v,'Select page').disabled).toBe(!visible.length);expect(cartButton(v,'Clear selection').disabled).toBe(!m.selected.length);}if(CART_STAGE>=4)for(const p of cartProducts.filter(p=>m.selected.includes(p.id)))expect(Number(cartField(v,'Quantity '+p.name).value)).toBe(m.quantities[p.id]??1);expect(Boolean(cartWithin(v.container).queryByText('No products',{exact:true}))).toBe(!visible.length);};
const cartAction=(v,m,kind,value)=>{const rows=cartFiltered(m),visible=rows.slice(m.page*2,m.page*2+2),pages=Math.ceil(rows.length/2);
 if(kind==='query'||kind==='sort'||kind==='maximum'){const label=kind==='query'?'Search':kind==='sort'?'Sort':'Maximum price',changed=cartField(v,label).value!==value;if(changed)fireEvent.change(cartField(v,label),{target:{value}});m[kind]=value;if(changed){if(kind!=='maximum'||CART_STAGE>=3)m.page=0;else {const count=Math.ceil(cartFiltered(m).length/2),shown=cartField(v,'Page').textContent.split('/').map(Number)[0];m.page=count?shown-1:0;expect(m.page>=0&&m.page<Math.max(1,count)).toBe(true);}}}
 if(kind==='next'){fireEvent.click(cartButton(v,'Next'));if(m.page+1<pages)m.page++;}
 if(kind==='previous'){fireEvent.click(cartButton(v,'Previous'));if(m.page>0)m.page--;}
 if(kind==='toggle'){const p=visible[value];fireEvent.click(cartWithin(v.container).getByRole('checkbox',{name:p.name,exact:true}));m.selected=m.selected.includes(p.id)?m.selected.filter(id=>id!==p.id):[...m.selected,p.id];}
 if(kind==='select'){fireEvent.click(cartButton(v,'Select page'));for(const p of visible)if(!m.selected.includes(p.id))m.selected.push(p.id);}
 if(kind==='clear'){fireEvent.click(cartButton(v,'Clear selection'));m.selected=[];}
 if(kind==='quantity'){const p=cartProducts.find(p=>p.id===value[0]);fireEvent.change(cartField(v,'Quantity '+p.name),{target:{value:String(value[1])}});m.quantities[p.id]=value[1];}
 cartCheck(v,m);
};

test('Select page unions actual visible identities and Clear removes hidden selections',()=>{const v=render(<App/>),m=cartModel();cartAction(v,m,'select');cartAction(v,m,'select');cartAction(v,m,'next');cartAction(v,m,'select');cartAction(v,m,'select');cartAction(v,m,'sort','price-desc');cartAction(v,m,'toggle',0);cartAction(v,m,'sort','price-asc');cartAction(v,m,'query','zzz');cartAction(v,m,'select');cartAction(v,m,'clear');cartAction(v,m,'clear');cartAction(v,m,'query','');});

test('a bounded selection and view model preserves identities totals and independent paging',()=>{const v=render(<App/>),m=cartModel();for(let i=0;i<48;i++){const rows=cartFiltered(m),shown=rows.slice(m.page*2,m.page*2+2),step=i%8;if(step===0)cartAction(v,m,'query',['','t','zzz','a'][Math.floor(i/8)%4]);else if(step===1&&CART_STAGE>=1)cartAction(v,m,'select');else if(step===2)cartAction(v,m,'next');else if(step===3&&shown.length)cartAction(v,m,'toggle',i%shown.length);else if(step===4&&CART_STAGE>=1)cartAction(v,m,'sort',['name','price-asc','price-desc'][Math.floor(i/8)%3]);else if(step===5&&CART_STAGE>=2){if(CART_STAGE===2)cartAction(v,m,'clear');cartAction(v,m,'maximum',['0','1.5','4',''][Math.floor(i/8)%4]);}else if(step===6)cartAction(v,m,'previous');else if(step===7&&CART_STAGE>=1)cartAction(v,m,'clear');else cartCheck(v,m);}});

test('parent renders independent explorers and fresh mounts keep their own selection state',()=>{const a=render(<App/>),b=render(<App/>),ma=cartModel(),mb=cartModel();cartAction(a,ma,'toggle',0);cartAction(b,mb,'toggle',1);cartAction(a,ma,'query','zzz');a.rerender(<App/>);cartCheck(a,ma);cartCheck(b,mb);a.unmount();b.unmount();cartCheck(render(<App/>),cartModel());});

test('every product toggles independently across pages and hidden searches with full-list totals',()=>{const v=render(<App/>),m=cartModel();cartCheck(v,m);cartAction(v,m,'toggle',0);cartAction(v,m,'toggle',1);cartAction(v,m,'next');cartAction(v,m,'toggle',0);cartAction(v,m,'toggle',1);cartAction(v,m,'query','zzz');cartAction(v,m,'query','');cartAction(v,m,'toggle',0);cartAction(v,m,'next');cartAction(v,m,'toggle',1);cartAction(v,m,'previous');});
`,
"react-evolving-catalog-4-start": `
const CART_STAGE=2;

const cartWithin=require('@testing-library/react').within;
const cartProducts=[{id:1,name:'Apple',price:2},{id:2,name:'Banana',price:1},{id:3,name:'Carrot',price:3},{id:4,name:'Dates',price:4}];
const cartModel=()=>({query:'',sort:'name',maximum:'',page:0,selected:[],quantities:{}});
const cartField=(v,name)=>cartWithin(v.container).getByLabelText(name);
const cartButton=(v,name)=>cartWithin(v.container).getByRole('button',{name,exact:true});
const cartFiltered=m=>cartProducts.filter(p=>p.name.toLowerCase().includes(m.query.trim().toLowerCase())&&(CART_STAGE<2||m.maximum===''||p.price<=Number(m.maximum))).sort((a,b)=>m.sort==='name'?a.name.localeCompare(b.name):m.sort==='price-asc'?a.price-b.price:b.price-a.price);
const cartCheck=(v,m)=>{const rows=cartFiltered(m),pages=Math.ceil(rows.length/2),visible=rows.slice(m.page*2,m.page*2+2),boxes=cartWithin(v.container).queryAllByRole('checkbox');expect(boxes.length).toBe(visible.length);for(const [i,p]of visible.entries()){const li=boxes[i].closest('li');expect(Boolean(li)).toBe(true);expect(cartWithin(li).getByRole('checkbox',{name:p.name,exact:true}).checked).toBe(m.selected.includes(p.id));expect(new RegExp('(^|[^0-9])'+p.price+'([^0-9]|$)').test(li.textContent)).toBe(true);}expect(cartField(v,'Page').textContent).toBe((pages?m.page+1:0)+' / '+pages);expect(cartButton(v,'Previous').disabled).toBe(m.page===0);expect(cartButton(v,'Next').disabled).toBe(m.page+1>=pages);const sum=cartProducts.filter(p=>m.selected.includes(p.id)).reduce((n,p)=>n+p.price*(m.quantities[p.id]??1),0);expect(cartField(v,'Selected total').textContent).toBe(String(sum));if(CART_STAGE>=1){expect(cartButton(v,'Select page').disabled).toBe(!visible.length);expect(cartButton(v,'Clear selection').disabled).toBe(!m.selected.length);}if(CART_STAGE>=4)for(const p of cartProducts.filter(p=>m.selected.includes(p.id)))expect(Number(cartField(v,'Quantity '+p.name).value)).toBe(m.quantities[p.id]??1);expect(Boolean(cartWithin(v.container).queryByText('No products',{exact:true}))).toBe(!visible.length);};
const cartAction=(v,m,kind,value)=>{const rows=cartFiltered(m),visible=rows.slice(m.page*2,m.page*2+2),pages=Math.ceil(rows.length/2);
 if(kind==='query'||kind==='sort'||kind==='maximum'){const label=kind==='query'?'Search':kind==='sort'?'Sort':'Maximum price',changed=cartField(v,label).value!==value;if(changed)fireEvent.change(cartField(v,label),{target:{value}});m[kind]=value;if(changed){if(kind!=='maximum'||CART_STAGE>=3)m.page=0;else {const count=Math.ceil(cartFiltered(m).length/2),shown=cartField(v,'Page').textContent.split('/').map(Number)[0];m.page=count?shown-1:0;expect(m.page>=0&&m.page<Math.max(1,count)).toBe(true);}}}
 if(kind==='next'){fireEvent.click(cartButton(v,'Next'));if(m.page+1<pages)m.page++;}
 if(kind==='previous'){fireEvent.click(cartButton(v,'Previous'));if(m.page>0)m.page--;}
 if(kind==='toggle'){const p=visible[value];fireEvent.click(cartWithin(v.container).getByRole('checkbox',{name:p.name,exact:true}));m.selected=m.selected.includes(p.id)?m.selected.filter(id=>id!==p.id):[...m.selected,p.id];}
 if(kind==='select'){fireEvent.click(cartButton(v,'Select page'));for(const p of visible)if(!m.selected.includes(p.id))m.selected.push(p.id);}
 if(kind==='clear'){fireEvent.click(cartButton(v,'Clear selection'));m.selected=[];}
 if(kind==='quantity'){const p=cartProducts.find(p=>p.id===value[0]);fireEvent.change(cartField(v,'Quantity '+p.name),{target:{value:String(value[1])}});m.quantities[p.id]=value[1];}
 cartCheck(v,m);
};

test('zero fractional exact and empty price limits combine with search and every sort mode',()=>{const v=render(<App/>),m=cartModel();for(const maximum of ['0','1.1','2','2.1','3.5','4','10','']){cartAction(v,m,'maximum',maximum);for(const sort of ['name','price-desc','price-asc']){cartAction(v,m,'sort',sort);cartAction(v,m,'query','t');cartAction(v,m,'query','');}}});

test('price changes keep pagination valid at the checkpoint and reset it at the full milestone',()=>{const v=render(<App/>),m=cartModel();cartAction(v,m,'next');cartAction(v,m,'maximum','10');cartAction(v,m,'maximum','3');cartAction(v,m,'maximum','0');cartAction(v,m,'maximum','');cartAction(v,m,'next');cartAction(v,m,'maximum','1');if(CART_STAGE>=3){cartAction(v,m,'select');cartAction(v,m,'maximum','0');cartAction(v,m,'maximum','');cartAction(v,m,'next');cartAction(v,m,'select');cartAction(v,m,'maximum','1.1');}});

test('a bounded selection and view model preserves identities totals and independent paging',()=>{const v=render(<App/>),m=cartModel();for(let i=0;i<48;i++){const rows=cartFiltered(m),shown=rows.slice(m.page*2,m.page*2+2),step=i%8;if(step===0)cartAction(v,m,'query',['','t','zzz','a'][Math.floor(i/8)%4]);else if(step===1&&CART_STAGE>=1)cartAction(v,m,'select');else if(step===2)cartAction(v,m,'next');else if(step===3&&shown.length)cartAction(v,m,'toggle',i%shown.length);else if(step===4&&CART_STAGE>=1)cartAction(v,m,'sort',['name','price-asc','price-desc'][Math.floor(i/8)%3]);else if(step===5&&CART_STAGE>=2){if(CART_STAGE===2)cartAction(v,m,'clear');cartAction(v,m,'maximum',['0','1.5','4',''][Math.floor(i/8)%4]);}else if(step===6)cartAction(v,m,'previous');else if(step===7&&CART_STAGE>=1)cartAction(v,m,'clear');else cartCheck(v,m);}});

test('parent renders independent explorers and fresh mounts keep their own selection state',()=>{const a=render(<App/>),b=render(<App/>),ma=cartModel(),mb=cartModel();cartAction(a,ma,'toggle',0);cartAction(b,mb,'toggle',1);cartAction(a,ma,'query','zzz');a.rerender(<App/>);cartCheck(a,ma);cartCheck(b,mb);a.unmount();b.unmount();cartCheck(render(<App/>),cartModel());});
`,
"react-evolving-catalog-4": `
const CART_STAGE=3;

const cartWithin=require('@testing-library/react').within;
const cartProducts=[{id:1,name:'Apple',price:2},{id:2,name:'Banana',price:1},{id:3,name:'Carrot',price:3},{id:4,name:'Dates',price:4}];
const cartModel=()=>({query:'',sort:'name',maximum:'',page:0,selected:[],quantities:{}});
const cartField=(v,name)=>cartWithin(v.container).getByLabelText(name);
const cartButton=(v,name)=>cartWithin(v.container).getByRole('button',{name,exact:true});
const cartFiltered=m=>cartProducts.filter(p=>p.name.toLowerCase().includes(m.query.trim().toLowerCase())&&(CART_STAGE<2||m.maximum===''||p.price<=Number(m.maximum))).sort((a,b)=>m.sort==='name'?a.name.localeCompare(b.name):m.sort==='price-asc'?a.price-b.price:b.price-a.price);
const cartCheck=(v,m)=>{const rows=cartFiltered(m),pages=Math.ceil(rows.length/2),visible=rows.slice(m.page*2,m.page*2+2),boxes=cartWithin(v.container).queryAllByRole('checkbox');expect(boxes.length).toBe(visible.length);for(const [i,p]of visible.entries()){const li=boxes[i].closest('li');expect(Boolean(li)).toBe(true);expect(cartWithin(li).getByRole('checkbox',{name:p.name,exact:true}).checked).toBe(m.selected.includes(p.id));expect(new RegExp('(^|[^0-9])'+p.price+'([^0-9]|$)').test(li.textContent)).toBe(true);}expect(cartField(v,'Page').textContent).toBe((pages?m.page+1:0)+' / '+pages);expect(cartButton(v,'Previous').disabled).toBe(m.page===0);expect(cartButton(v,'Next').disabled).toBe(m.page+1>=pages);const sum=cartProducts.filter(p=>m.selected.includes(p.id)).reduce((n,p)=>n+p.price*(m.quantities[p.id]??1),0);expect(cartField(v,'Selected total').textContent).toBe(String(sum));if(CART_STAGE>=1){expect(cartButton(v,'Select page').disabled).toBe(!visible.length);expect(cartButton(v,'Clear selection').disabled).toBe(!m.selected.length);}if(CART_STAGE>=4)for(const p of cartProducts.filter(p=>m.selected.includes(p.id)))expect(Number(cartField(v,'Quantity '+p.name).value)).toBe(m.quantities[p.id]??1);expect(Boolean(cartWithin(v.container).queryByText('No products',{exact:true}))).toBe(!visible.length);};
const cartAction=(v,m,kind,value)=>{const rows=cartFiltered(m),visible=rows.slice(m.page*2,m.page*2+2),pages=Math.ceil(rows.length/2);
 if(kind==='query'||kind==='sort'||kind==='maximum'){const label=kind==='query'?'Search':kind==='sort'?'Sort':'Maximum price',changed=cartField(v,label).value!==value;if(changed)fireEvent.change(cartField(v,label),{target:{value}});m[kind]=value;if(changed){if(kind!=='maximum'||CART_STAGE>=3)m.page=0;else {const count=Math.ceil(cartFiltered(m).length/2),shown=cartField(v,'Page').textContent.split('/').map(Number)[0];m.page=count?shown-1:0;expect(m.page>=0&&m.page<Math.max(1,count)).toBe(true);}}}
 if(kind==='next'){fireEvent.click(cartButton(v,'Next'));if(m.page+1<pages)m.page++;}
 if(kind==='previous'){fireEvent.click(cartButton(v,'Previous'));if(m.page>0)m.page--;}
 if(kind==='toggle'){const p=visible[value];fireEvent.click(cartWithin(v.container).getByRole('checkbox',{name:p.name,exact:true}));m.selected=m.selected.includes(p.id)?m.selected.filter(id=>id!==p.id):[...m.selected,p.id];}
 if(kind==='select'){fireEvent.click(cartButton(v,'Select page'));for(const p of visible)if(!m.selected.includes(p.id))m.selected.push(p.id);}
 if(kind==='clear'){fireEvent.click(cartButton(v,'Clear selection'));m.selected=[];}
 if(kind==='quantity'){const p=cartProducts.find(p=>p.id===value[0]);fireEvent.change(cartField(v,'Quantity '+p.name),{target:{value:String(value[1])}});m.quantities[p.id]=value[1];}
 cartCheck(v,m);
};

test('zero fractional exact and empty price limits combine with search and every sort mode',()=>{const v=render(<App/>),m=cartModel();for(const maximum of ['0','1.1','2','2.1','3.5','4','10','']){cartAction(v,m,'maximum',maximum);for(const sort of ['name','price-desc','price-asc']){cartAction(v,m,'sort',sort);cartAction(v,m,'query','t');cartAction(v,m,'query','');}}});

test('price changes keep pagination valid at the checkpoint and reset it at the full milestone',()=>{const v=render(<App/>),m=cartModel();cartAction(v,m,'next');cartAction(v,m,'maximum','10');cartAction(v,m,'maximum','3');cartAction(v,m,'maximum','0');cartAction(v,m,'maximum','');cartAction(v,m,'next');cartAction(v,m,'maximum','1');if(CART_STAGE>=3){cartAction(v,m,'select');cartAction(v,m,'maximum','0');cartAction(v,m,'maximum','');cartAction(v,m,'next');cartAction(v,m,'select');cartAction(v,m,'maximum','1.1');}});

test('a bounded selection and view model preserves identities totals and independent paging',()=>{const v=render(<App/>),m=cartModel();for(let i=0;i<48;i++){const rows=cartFiltered(m),shown=rows.slice(m.page*2,m.page*2+2),step=i%8;if(step===0)cartAction(v,m,'query',['','t','zzz','a'][Math.floor(i/8)%4]);else if(step===1&&CART_STAGE>=1)cartAction(v,m,'select');else if(step===2)cartAction(v,m,'next');else if(step===3&&shown.length)cartAction(v,m,'toggle',i%shown.length);else if(step===4&&CART_STAGE>=1)cartAction(v,m,'sort',['name','price-asc','price-desc'][Math.floor(i/8)%3]);else if(step===5&&CART_STAGE>=2){if(CART_STAGE===2)cartAction(v,m,'clear');cartAction(v,m,'maximum',['0','1.5','4',''][Math.floor(i/8)%4]);}else if(step===6)cartAction(v,m,'previous');else if(step===7&&CART_STAGE>=1)cartAction(v,m,'clear');else cartCheck(v,m);}});

test('parent renders independent explorers and fresh mounts keep their own selection state',()=>{const a=render(<App/>),b=render(<App/>),ma=cartModel(),mb=cartModel();cartAction(a,ma,'toggle',0);cartAction(b,mb,'toggle',1);cartAction(a,ma,'query','zzz');a.rerender(<App/>);cartCheck(a,ma);cartCheck(b,mb);a.unmount();b.unmount();cartCheck(render(<App/>),cartModel());});
`,
"react-evolving-catalog-5-start": `
const CART_STAGE=4;

const cartWithin=require('@testing-library/react').within;
const cartProducts=[{id:1,name:'Apple',price:2},{id:2,name:'Banana',price:1},{id:3,name:'Carrot',price:3},{id:4,name:'Dates',price:4}];
const cartModel=()=>({query:'',sort:'name',maximum:'',page:0,selected:[],quantities:{}});
const cartField=(v,name)=>cartWithin(v.container).getByLabelText(name);
const cartButton=(v,name)=>cartWithin(v.container).getByRole('button',{name,exact:true});
const cartFiltered=m=>cartProducts.filter(p=>p.name.toLowerCase().includes(m.query.trim().toLowerCase())&&(CART_STAGE<2||m.maximum===''||p.price<=Number(m.maximum))).sort((a,b)=>m.sort==='name'?a.name.localeCompare(b.name):m.sort==='price-asc'?a.price-b.price:b.price-a.price);
const cartCheck=(v,m)=>{const rows=cartFiltered(m),pages=Math.ceil(rows.length/2),visible=rows.slice(m.page*2,m.page*2+2),boxes=cartWithin(v.container).queryAllByRole('checkbox');expect(boxes.length).toBe(visible.length);for(const [i,p]of visible.entries()){const li=boxes[i].closest('li');expect(Boolean(li)).toBe(true);expect(cartWithin(li).getByRole('checkbox',{name:p.name,exact:true}).checked).toBe(m.selected.includes(p.id));expect(new RegExp('(^|[^0-9])'+p.price+'([^0-9]|$)').test(li.textContent)).toBe(true);}expect(cartField(v,'Page').textContent).toBe((pages?m.page+1:0)+' / '+pages);expect(cartButton(v,'Previous').disabled).toBe(m.page===0);expect(cartButton(v,'Next').disabled).toBe(m.page+1>=pages);const sum=cartProducts.filter(p=>m.selected.includes(p.id)).reduce((n,p)=>n+p.price*(m.quantities[p.id]??1),0);expect(cartField(v,'Selected total').textContent).toBe(String(sum));if(CART_STAGE>=1){expect(cartButton(v,'Select page').disabled).toBe(!visible.length);expect(cartButton(v,'Clear selection').disabled).toBe(!m.selected.length);}if(CART_STAGE>=4)for(const p of cartProducts.filter(p=>m.selected.includes(p.id)))expect(Number(cartField(v,'Quantity '+p.name).value)).toBe(m.quantities[p.id]??1);expect(Boolean(cartWithin(v.container).queryByText('No products',{exact:true}))).toBe(!visible.length);};
const cartAction=(v,m,kind,value)=>{const rows=cartFiltered(m),visible=rows.slice(m.page*2,m.page*2+2),pages=Math.ceil(rows.length/2);
 if(kind==='query'||kind==='sort'||kind==='maximum'){const label=kind==='query'?'Search':kind==='sort'?'Sort':'Maximum price',changed=cartField(v,label).value!==value;if(changed)fireEvent.change(cartField(v,label),{target:{value}});m[kind]=value;if(changed){if(kind!=='maximum'||CART_STAGE>=3)m.page=0;else {const count=Math.ceil(cartFiltered(m).length/2),shown=cartField(v,'Page').textContent.split('/').map(Number)[0];m.page=count?shown-1:0;expect(m.page>=0&&m.page<Math.max(1,count)).toBe(true);}}}
 if(kind==='next'){fireEvent.click(cartButton(v,'Next'));if(m.page+1<pages)m.page++;}
 if(kind==='previous'){fireEvent.click(cartButton(v,'Previous'));if(m.page>0)m.page--;}
 if(kind==='toggle'){const p=visible[value];fireEvent.click(cartWithin(v.container).getByRole('checkbox',{name:p.name,exact:true}));m.selected=m.selected.includes(p.id)?m.selected.filter(id=>id!==p.id):[...m.selected,p.id];}
 if(kind==='select'){fireEvent.click(cartButton(v,'Select page'));for(const p of visible)if(!m.selected.includes(p.id))m.selected.push(p.id);}
 if(kind==='clear'){fireEvent.click(cartButton(v,'Clear selection'));m.selected=[];}
 if(kind==='quantity'){const p=cartProducts.find(p=>p.id===value[0]);fireEvent.change(cartField(v,'Quantity '+p.name),{target:{value:String(value[1])}});m.quantities[p.id]=value[1];}
 cartCheck(v,m);
};

test('all selected products expose independent valid quantities and full-list weighted totals',()=>{const v=render(<App/>),m=cartModel();cartAction(v,m,'select');cartAction(v,m,'next');cartAction(v,m,'select');for(const pair of [[1,99],[2,2],[3,17],[4,98],[3,99],[4,1]])cartAction(v,m,'quantity',pair);cartAction(v,m,'query','zzz');cartAction(v,m,'maximum','0');for(const pair of [[2,99],[4,99],[1,1]])cartAction(v,m,'quantity',pair);cartAction(v,m,'maximum','');cartAction(v,m,'query','');});
test('valid quantity edits remain attached to hidden products through sort page and parent renders',()=>{const v=render(<App/>),m=cartModel();cartAction(v,m,'select');cartAction(v,m,'next');cartAction(v,m,'select');for(let i=0;i<16;i++){cartAction(v,m,'quantity',[i%4+1,(i*7)%99+1]);cartAction(v,m,'sort',i%2?'price-asc':'price-desc');cartAction(v,m,'next');cartAction(v,m,'previous');v.rerender(<App/>);cartCheck(v,m);}});
test('independent carts keep their own quantities and a fresh selected product defaults to one',()=>{const a=render(<App/>),b=render(<App/>),ma=cartModel(),mb=cartModel();cartAction(a,ma,'toggle',0);cartAction(b,mb,'toggle',0);cartAction(a,ma,'quantity',[1,99]);cartAction(b,mb,'quantity',[1,2]);a.rerender(<App/>);cartCheck(a,ma);cartCheck(b,mb);a.unmount();b.unmount();const v=render(<App/>),m=cartModel();cartAction(v,m,'toggle',0);});

test('parent renders independent explorers and fresh mounts keep their own selection state',()=>{const a=render(<App/>),b=render(<App/>),ma=cartModel(),mb=cartModel();cartAction(a,ma,'toggle',0);cartAction(b,mb,'toggle',1);cartAction(a,ma,'query','zzz');a.rerender(<App/>);cartCheck(a,ma);cartCheck(b,mb);a.unmount();b.unmount();cartCheck(render(<App/>),cartModel());});
`,
};
for (const [id,cases] of Object.entries(SELECTION_CART_REVIEW_CASES)) {
  const solution=REACT_EVOLVING_SOLUTIONS[id];
  solution.hiddenSuite=[solution.hiddenSuite,cases].filter(Boolean).join("\n\n");
}

// Scoped final-cart and initial wizard checks, preserving later-stage contracts.
const EARLY_WIZARD_REVIEW_CASES: Record<string,string> = {
"react-evolving-catalog-5": `
const CART_STAGE=5;

const cartWithin=require('@testing-library/react').within;
const cartProducts=[{id:1,name:'Apple',price:2},{id:2,name:'Banana',price:1},{id:3,name:'Carrot',price:3},{id:4,name:'Dates',price:4}];
const cartModel=()=>({query:'',sort:'name',maximum:'',page:0,selected:[],quantities:{}});
const cartField=(v,name)=>cartWithin(v.container).getByLabelText(name);
const cartButton=(v,name)=>cartWithin(v.container).getByRole('button',{name,exact:true});
const cartFiltered=m=>cartProducts.filter(p=>p.name.toLowerCase().includes(m.query.trim().toLowerCase())&&(CART_STAGE<2||m.maximum===''||p.price<=Number(m.maximum))).sort((a,b)=>m.sort==='name'?a.name.localeCompare(b.name):m.sort==='price-asc'?a.price-b.price:b.price-a.price);
const cartCheck=(v,m)=>{const rows=cartFiltered(m),pages=Math.ceil(rows.length/2),visible=rows.slice(m.page*2,m.page*2+2),boxes=cartWithin(v.container).queryAllByRole('checkbox');expect(boxes.length).toBe(visible.length);for(const [i,p]of visible.entries()){const li=boxes[i].closest('li');expect(Boolean(li)).toBe(true);expect(cartWithin(li).getByRole('checkbox',{name:p.name,exact:true}).checked).toBe(m.selected.includes(p.id));expect(new RegExp('(^|[^0-9])'+p.price+'([^0-9]|$)').test(li.textContent)).toBe(true);}expect(cartField(v,'Page').textContent).toBe((pages?m.page+1:0)+' / '+pages);expect(cartButton(v,'Previous').disabled).toBe(m.page===0);expect(cartButton(v,'Next').disabled).toBe(m.page+1>=pages);const sum=cartProducts.filter(p=>m.selected.includes(p.id)).reduce((n,p)=>n+p.price*(m.quantities[p.id]??1),0);expect(cartField(v,'Selected total').textContent).toBe(String(sum));if(CART_STAGE>=1){expect(cartButton(v,'Select page').disabled).toBe(!visible.length);expect(cartButton(v,'Clear selection').disabled).toBe(!m.selected.length);}if(CART_STAGE>=4)for(const p of cartProducts.filter(p=>m.selected.includes(p.id)))expect(Number(cartField(v,'Quantity '+p.name).value)).toBe(m.quantities[p.id]??1);expect(Boolean(cartWithin(v.container).queryByText('No products',{exact:true}))).toBe(!visible.length);};
const cartAction=(v,m,kind,value)=>{const rows=cartFiltered(m),visible=rows.slice(m.page*2,m.page*2+2),pages=Math.ceil(rows.length/2);
 if(kind==='query'||kind==='sort'||kind==='maximum'){const label=kind==='query'?'Search':kind==='sort'?'Sort':'Maximum price',changed=cartField(v,label).value!==value;if(changed)fireEvent.change(cartField(v,label),{target:{value}});m[kind]=value;if(changed){if(kind!=='maximum'||CART_STAGE>=3)m.page=0;else {const count=Math.ceil(cartFiltered(m).length/2),shown=cartField(v,'Page').textContent.split('/').map(Number)[0];m.page=count?shown-1:0;expect(m.page>=0&&m.page<Math.max(1,count)).toBe(true);}}}
 if(kind==='next'){fireEvent.click(cartButton(v,'Next'));if(m.page+1<pages)m.page++;}
 if(kind==='previous'){fireEvent.click(cartButton(v,'Previous'));if(m.page>0)m.page--;}
 if(kind==='toggle'){const p=visible[value];fireEvent.click(cartWithin(v.container).getByRole('checkbox',{name:p.name,exact:true}));m.selected=m.selected.includes(p.id)?m.selected.filter(id=>id!==p.id):[...m.selected,p.id];if(CART_STAGE>=5)delete m.quantities[p.id];}
 if(kind==='select'){fireEvent.click(cartButton(v,'Select page'));for(const p of visible)if(!m.selected.includes(p.id))m.selected.push(p.id);}
 if(kind==='clear'){fireEvent.click(cartButton(v,'Clear selection'));m.selected=[];if(CART_STAGE>=5)m.quantities={};}
 if(kind==='quantity'){const p=cartProducts.find(p=>p.id===value[0]);fireEvent.change(cartField(v,'Quantity '+p.name),{target:{value:String(value[1])}});const n=Number(value[1]);if(CART_STAGE<5||(Number.isInteger(n)&&n>=1&&n<=99))m.quantities[p.id]=n;}
 cartCheck(v,m);
};

test('each cart line accepts valid quantity boundaries and retains its last value after invalid edits',()=>{const v=render(<App/>),m=cartModel();cartAction(v,m,'select');cartAction(v,m,'next');cartAction(v,m,'select');for(const id of [1,2,3,4]){cartAction(v,m,'quantity',[id,99]);for(const bad of [0,100,-1,1.5,'','not-a-number'])cartAction(v,m,'quantity',[id,bad]);cartAction(v,m,'quantity',[id,id]);}cartAction(v,m,'query','zzz');cartAction(v,m,'maximum','0');cartAction(v,m,'quantity',[3,98]);});
test('deselect reselect and Clear drop quantities while Select page preserves existing amounts',()=>{const v=render(<App/>),m=cartModel();cartAction(v,m,'select');cartAction(v,m,'quantity',[1,99]);cartAction(v,m,'select');cartAction(v,m,'toggle',0);cartAction(v,m,'toggle',0);cartAction(v,m,'quantity',[1,5]);cartAction(v,m,'next');cartAction(v,m,'select');cartAction(v,m,'quantity',[4,33]);cartAction(v,m,'query','zzz');cartAction(v,m,'clear');cartAction(v,m,'query','');cartAction(v,m,'select');cartAction(v,m,'next');cartAction(v,m,'select');});
test('a bounded weighted-cart model keeps quantities attached to identities through view changes',()=>{const v=render(<App/>),m=cartModel();for(let i=0;i<60;i++){const rows=cartFiltered(m),shown=rows.slice(m.page*2,m.page*2+2),step=i%10;if(step===0)cartAction(v,m,'query',['','t','a'][Math.floor(i/10)%3]);else if(step===1)cartAction(v,m,'select');else if(step===2&&shown.length)cartAction(v,m,'toggle',i%shown.length);else if(step===3&&m.selected.length)cartAction(v,m,'quantity',[m.selected[i%m.selected.length],(i*7)%99+1]);else if(step===4&&m.selected.length)cartAction(v,m,'quantity',[m.selected[0],100]);else if(step===5)cartAction(v,m,'next');else if(step===6)cartAction(v,m,'previous');else if(step===7)cartAction(v,m,'sort',['name','price-asc','price-desc'][Math.floor(i/10)%3]);else if(step===8)cartAction(v,m,'maximum',['0','1.5','4',''][Math.floor(i/10)%4]);else if(step===9)cartAction(v,m,'clear');else cartCheck(v,m);}});
test('parent renders independent carts and remounts retain the right quantity ownership',()=>{const a=render(<App/>),b=render(<App/>),ma=cartModel(),mb=cartModel();cartAction(a,ma,'select');cartAction(b,mb,'select');cartAction(a,ma,'quantity',[1,99]);cartAction(b,mb,'quantity',[1,2]);a.rerender(<App/>);cartCheck(a,ma);cartCheck(b,mb);a.unmount();b.unmount();const fresh=render(<App/>),m=cartModel();cartAction(fresh,m,'select');});
`,
"react-evolving-form-1-start": `
const wizardWithin=require('@testing-library/react').within;
const wizardField=(v,label)=>wizardWithin(v.container).getByLabelText(label);
const wizardFill=(v,label,value)=>{const field=wizardField(v,label);if(field.value!==value)fireEvent.change(field,{target:{value}});};
const wizardClick=(v,label)=>fireEvent.click(wizardWithin(v.container).getByRole('button',{name:label,exact:true}));
const wizardSubmit=v=>{const form=v.container.querySelector('form');expect(Boolean(form)).toBe(true);expect(fireEvent.submit(form)).toBe(false);};
const wizardAccepted=v=>expect(Boolean(wizardWithin(v.container).queryByText('Email accepted',{exact:true}))).toBe(true);
const wizardError=(v,text)=>{expect(wizardWithin(v.container).getByRole('alert').textContent).toBe(text);};
const wizardEnterName=(v,email='person@example.org')=>{wizardFill(v,'Email',email);wizardSubmit(v);wizardAccepted(v);};

test('the controlled Email field holds long ordinary values and restores state after an external DOM write',()=>{const v=render(<App/>),input=wizardField(v,'Email');expect(input.value).toBe('');for(const value of ['not-email-yet','very.long+tag@sub.example.org','second@example.net']){wizardFill(v,'Email',value);expect(input.value).toBe(value);v.rerender(<App/>);expect(input.value).toBe(value);}input.value='external@example.org';v.rerender(<App/>);expect(input.value).toBe('second@example.net');});
test('submitting the actual form always cancels browser navigation without requiring validation yet',()=>{const v=render(<App/>);for(const value of ['','draft','person@example.org']){wizardFill(v,'Email',value);wizardSubmit(v);expect(Boolean(wizardWithin(v.container).getByRole('button',{name:'Next',exact:true}))).toBe(true);}});
test('independent controlled emails survive parent renders separately',()=>{const a=render(<App/>),b=render(<App/>);wizardFill(a,'Email','one@example.org');wizardFill(b,'Email','two@example.net');a.rerender(<App/>);expect(wizardField(a,'Email').value).toBe('one@example.org');expect(wizardField(b,'Email').value).toBe('two@example.net');});
test('a fresh Email field starts empty after another draft unmounts',()=>{const old=render(<App/>);wizardFill(old,'Email','old@example.org');old.unmount();const v=render(<App/>);expect(wizardField(v,'Email').value).toBe('');});
`,
"react-evolving-form-1": `
const wizardWithin=require('@testing-library/react').within;
const wizardField=(v,label)=>wizardWithin(v.container).getByLabelText(label);
const wizardFill=(v,label,value)=>{const field=wizardField(v,label);if(field.value!==value)fireEvent.change(field,{target:{value}});};
const wizardClick=(v,label)=>fireEvent.click(wizardWithin(v.container).getByRole('button',{name:label,exact:true}));
const wizardSubmit=v=>{const form=v.container.querySelector('form');expect(Boolean(form)).toBe(true);expect(fireEvent.submit(form)).toBe(false);};
const wizardAccepted=v=>expect(Boolean(wizardWithin(v.container).queryByText('Email accepted',{exact:true}))).toBe(true);
const wizardError=(v,text)=>{expect(wizardWithin(v.container).getByRole('alert').textContent).toBe(text);};
const wizardEnterName=(v,email='person@example.org')=>{wizardFill(v,'Email',email);wizardSubmit(v);wizardAccepted(v);};

test('email validation follows the exact stated expression and keeps rejected submissions editable',()=>{const v=render(<App/>);for(const value of ['','bad','a@b','a@@b.c','a b@c.d','a@b .c','@x.y','x@.y']){wizardFill(v,'Email',value);wizardSubmit(v);wizardError(v,'Invalid email');expect(Boolean(wizardField(v,'Email'))).toBe(true);}wizardFill(v,'Email','  name+tag@sub.example.org  ');wizardSubmit(v);wizardAccepted(v);expect(wizardWithin(v.container).queryByRole('alert')).toBeNull();});
test('every regex-valid address accepts after edge trimming without extra domain or RFC restrictions',()=>{for(const value of ['x@y.z',' person@example.org ','a@b..c','\\u00a0one@two.net\\ufeff','李@例.中']){const v=render(<App/>);wizardFill(v,'Email',value);wizardSubmit(v);wizardAccepted(v);expect(wizardWithin(v.container).queryByRole('alert')).toBeNull();v.unmount();}});
test('independent acceptance and invalid-state recovery survive ordinary parent renders',()=>{const a=render(<App/>),b=render(<App/>);wizardFill(a,'Email','one@example.org');wizardSubmit(a);wizardFill(b,'Email','bad');wizardSubmit(b);a.rerender(<App/>);wizardAccepted(a);wizardError(b,'Invalid email');wizardFill(b,'Email','two@example.net');wizardSubmit(b);wizardAccepted(b);});
test('a new email attempt starts empty without a prior root acceptance or error',()=>{const old=render(<App/>);wizardFill(old,'Email','bad');wizardSubmit(old);old.unmount();const v=render(<App/>);expect(wizardField(v,'Email').value).toBe('');expect(wizardWithin(v.container).queryByRole('alert')).toBeNull();expect(wizardWithin(v.container).queryByText('Email accepted',{exact:true})).toBeNull();});
`,
"react-evolving-form-2-start": `
const wizardWithin=require('@testing-library/react').within;
const wizardField=(v,label)=>wizardWithin(v.container).getByLabelText(label);
const wizardFill=(v,label,value)=>{const field=wizardField(v,label);if(field.value!==value)fireEvent.change(field,{target:{value}});};
const wizardClick=(v,label)=>fireEvent.click(wizardWithin(v.container).getByRole('button',{name:label,exact:true}));
const wizardSubmit=v=>{const form=v.container.querySelector('form');expect(Boolean(form)).toBe(true);expect(fireEvent.submit(form)).toBe(false);};
const wizardAccepted=v=>expect(Boolean(wizardWithin(v.container).queryByText('Email accepted',{exact:true}))).toBe(true);
const wizardError=(v,text)=>{expect(wizardWithin(v.container).getByRole('alert').textContent).toBe(text);};
const wizardEnterName=(v,email='person@example.org')=>{wizardFill(v,'Email',email);wizardSubmit(v);wizardAccepted(v);};

test('the Name step is controlled through long literal edits and parent rerenders',()=>{const v=render(<App/>);wizardEnterName(v);const field=wizardField(v,'Name');expect(field.value).toBe('');for(const value of ['  Person  ','李雷','<name>&'+('x'.repeat(240))]){wizardFill(v,'Name',value);expect(field.value).toBe(value);v.rerender(<App/>);expect(field.value).toBe(value);}field.value='external';v.rerender(<App/>);expect(field.value).toBe('<name>&'+('x'.repeat(240)));wizardAccepted(v);});
test('Back retains the trimmed accepted email and email edits can open the Name step again',()=>{const v=render(<App/>);wizardEnterName(v,'  one@example.org  ');wizardClick(v,'Back');expect(wizardField(v,'Email').value).toBe('one@example.org');wizardFill(v,'Email','bad');wizardSubmit(v);wizardError(v,'Invalid email');wizardFill(v,'Email','two@example.net');wizardSubmit(v);wizardAccepted(v);expect(Boolean(wizardField(v,'Name'))).toBe(true);});
test('Next at the Name checkpoint cancels navigation without requiring the next milestone validation',()=>{const v=render(<App/>);wizardEnterName(v);wizardFill(v,'Name','Draft');wizardSubmit(v);expect(Boolean(v.container.querySelector('main'))).toBe(true);});
test('independent Name drafts belong to their root and a new attempt starts with empty Email',()=>{const a=render(<App/>),b=render(<App/>);wizardEnterName(a,'one@example.org');wizardEnterName(b,'two@example.net');wizardFill(a,'Name','First');wizardFill(b,'Name','Second');a.rerender(<App/>);expect(wizardField(a,'Name').value).toBe('First');expect(wizardField(b,'Name').value).toBe('Second');a.unmount();b.unmount();expect(wizardField(render(<App/>),'Email').value).toBe('');});
`,
"react-evolving-form-2": `
const wizardWithin=require('@testing-library/react').within;
const wizardField=(v,label)=>wizardWithin(v.container).getByLabelText(label);
const wizardFill=(v,label,value)=>{const field=wizardField(v,label);if(field.value!==value)fireEvent.change(field,{target:{value}});};
const wizardClick=(v,label)=>fireEvent.click(wizardWithin(v.container).getByRole('button',{name:label,exact:true}));
const wizardSubmit=v=>{const form=v.container.querySelector('form');expect(Boolean(form)).toBe(true);expect(fireEvent.submit(form)).toBe(false);};
const wizardAccepted=v=>expect(Boolean(wizardWithin(v.container).queryByText('Email accepted',{exact:true}))).toBe(true);
const wizardError=(v,text)=>{expect(wizardWithin(v.container).getByRole('alert').textContent).toBe(text);};
const wizardEnterName=(v,email='person@example.org')=>{wizardFill(v,'Email',email);wizardSubmit(v);wizardAccepted(v);};

const wizardExact=(v,text)=>expect(Boolean(wizardWithin(v.container).getByText(text,{exact:true,normalizer:value=>value}))).toBe(true);
test('Name rejects fewer than two non-whitespace characters and accepts exact two-character BMP names',()=>{for(const accepted of ['Al','李雷']){const v=render(<App/>);wizardEnterName(v,'  person@example.org  ');for(const invalid of ['',' ','A','\\tA\\u00a0']){wizardFill(v,'Name',invalid);wizardSubmit(v);wizardError(v,'Invalid name');expect(Boolean(wizardField(v,'Name'))).toBe(true);}wizardFill(v,'Name','  '+accepted+'  ');wizardSubmit(v);wizardExact(v,accepted);wizardExact(v,'person@example.org');wizardAccepted(v);expect(wizardWithin(v.container).queryByRole('alert')).toBeNull();v.unmount();}});
test('the summary trims only name edges and renders literal long names without HTML interpretation',()=>{const v=render(<App/>),value='<name>& '+('x'.repeat(220));wizardEnterName(v,'person@example.org');wizardFill(v,'Name','  '+value+'  ');wizardSubmit(v);wizardExact(v,value);expect(v.container.querySelector('name')).toBeNull();v.rerender(<App/>);wizardExact(v,value);});
test('Back from summary and Name retains both fields while subsequent valid edits replace the summary',()=>{const v=render(<App/>);wizardEnterName(v,'one@example.org');wizardFill(v,'Name','  First Person  ');wizardSubmit(v);wizardClick(v,'Back');expect(wizardField(v,'Name').value).toBe('First Person');wizardClick(v,'Back');expect(wizardField(v,'Email').value).toBe('one@example.org');wizardFill(v,'Email','two@example.net');wizardSubmit(v);wizardFill(v,'Name','  Second Person  ');wizardSubmit(v);wizardExact(v,'Second Person');wizardExact(v,'two@example.net');});
test('independent accepted summaries and fresh attempts do not share field or error state',()=>{const a=render(<App/>),b=render(<App/>);wizardEnterName(a,'one@example.org');wizardEnterName(b,'two@example.net');wizardFill(a,'Name','First');wizardFill(b,'Name','Second');wizardSubmit(a);wizardSubmit(b);a.rerender(<App/>);wizardExact(a,'First');wizardExact(b,'Second');a.unmount();b.unmount();const fresh=render(<App/>);expect(wizardField(fresh,'Email').value).toBe('');expect(wizardWithin(fresh.container).queryByRole('alert')).toBeNull();});
`,
};
for (const [id,cases] of Object.entries(EARLY_WIZARD_REVIEW_CASES)) {
  const solution=REACT_EVOLVING_SOLUTIONS[id];
  solution.hiddenSuite=[solution.hiddenSuite,cases].filter(Boolean).join("\n\n");
}

// Consent, branch and draft steps reviewed individually after checkpoint construction.
const CONSENT_BRANCH_REVIEW_CASES: Record<string,string> = {
"react-evolving-form-3-start": `
const FLOW_STAGE=0;

const wizardWithin=require('@testing-library/react').within;
const wizardField=(v,label)=>wizardWithin(v.container).getByLabelText(label);
const wizardFill=(v,label,value)=>{const field=wizardField(v,label);if(field.value!==value)fireEvent.change(field,{target:{value}});};
const wizardClick=(v,label)=>fireEvent.click(wizardWithin(v.container).getByRole('button',{name:label,exact:true}));
const wizardSubmit=v=>{const form=v.container.querySelector('form');expect(Boolean(form)).toBe(true);expect(fireEvent.submit(form)).toBe(false);};
const wizardAccepted=v=>expect(Boolean(wizardWithin(v.container).queryByText('Email accepted',{exact:true}))).toBe(true);
const wizardError=(v,text)=>{expect(wizardWithin(v.container).getByRole('alert').textContent).toBe(text);};
const wizardEnterName=(v,email='person@example.org')=>{wizardFill(v,'Email',email);wizardSubmit(v);wizardAccepted(v);};

const flowSummary=(v,email='person@example.org',name='Person',account='personal',company='Company')=>{wizardEnterName(v,email);wizardFill(v,'Name',name);if(FLOW_STAGE>=2){wizardFill(v,'Account type',account);if(account==='business')wizardFill(v,'Company',company);}wizardSubmit(v);};
const flowConsent=v=>wizardWithin(v.container).getByRole('checkbox',{name:'I agree',exact:true});
const flowSubmitButton=v=>wizardWithin(v.container).getByRole('button',{name:'Submit',exact:true});
const flowAgree=v=>fireEvent.click(flowConsent(v));
const flowExact=(v,text)=>expect(Boolean(wizardWithin(v.container).getByText(text,{exact:true,normalizer:value=>value}))).toBe(true);
const flowTerminal=(v,email,name,company)=>{flowExact(v,'Submitted');flowExact(v,email);flowExact(v,name);if(company)flowExact(v,company);expect(wizardWithin(v.container).queryByRole('button',{name:'Submit',exact:true})).toBeNull();expect(wizardWithin(v.container).queryAllByRole('textbox').length).toBe(0);expect(wizardWithin(v.container).queryAllByRole('checkbox').length).toBe(0);expect(Boolean(wizardWithin(v.container).getByRole('button',{name:'Start over',exact:true}))).toBe(true);};
const flowSave=v=>wizardClick(v,'Save draft');
const flowDraft=()=>JSON.parse(localStorage.getItem('evolving-form-draft'));
const flowDraftCheck=expected=>{const actual=flowDraft();expect(Object.keys(actual).sort()).toEqual(['account','company','email','name','version']);expect(actual).toEqual({version:1,...expected});};

test('consent can be checked and unchecked repeatedly and gates Submit in both directions',()=>{const v=render(<App/>);flowSummary(v);expect(flowSubmitButton(v).disabled).toBe(true);wizardClick(v,'Submit');expect(wizardWithin(v.container).queryByText('Submitted',{exact:true})).toBeNull();for(let i=0;i<6;i++){flowAgree(v);expect(flowConsent(v).checked).toBe(i%2===0);expect(flowSubmitButton(v).disabled).toBe(i%2!==0);}});
test('Back invalidates agreement even when returning to an unchanged or edited summary',()=>{const v=render(<App/>);flowSummary(v);for(let i=0;i<6;i++){flowAgree(v);expect(flowSubmitButton(v).disabled).toBe(false);wizardClick(v,'Back');wizardFill(v,'Name','Person '+i);wizardSubmit(v);expect(flowConsent(v).checked).toBe(false);expect(flowSubmitButton(v).disabled).toBe(true);}flowAgree(v);wizardClick(v,'Back');wizardClick(v,'Back');wizardFill(v,'Email','other@example.net');wizardSubmit(v);wizardSubmit(v);expect(flowConsent(v).checked).toBe(false);});
test('agreement belongs to each mounted summary and survives ordinary parent renders',()=>{const a=render(<App/>),b=render(<App/>);flowSummary(a,'one@example.org','First');flowSummary(b,'two@example.net','Second');flowAgree(a);a.rerender(<App/>);expect(flowConsent(a).checked).toBe(true);expect(flowConsent(b).checked).toBe(false);});
test('a fresh summary needs its own consent after another agreed summary unmounts',()=>{const old=render(<App/>);flowSummary(old);flowAgree(old);old.unmount();const v=render(<App/>);flowSummary(v);expect(flowConsent(v).checked).toBe(false);expect(flowSubmitButton(v).disabled).toBe(true);});
`,
"react-evolving-form-3": `
const FLOW_STAGE=1;

const wizardWithin=require('@testing-library/react').within;
const wizardField=(v,label)=>wizardWithin(v.container).getByLabelText(label);
const wizardFill=(v,label,value)=>{const field=wizardField(v,label);if(field.value!==value)fireEvent.change(field,{target:{value}});};
const wizardClick=(v,label)=>fireEvent.click(wizardWithin(v.container).getByRole('button',{name:label,exact:true}));
const wizardSubmit=v=>{const form=v.container.querySelector('form');expect(Boolean(form)).toBe(true);expect(fireEvent.submit(form)).toBe(false);};
const wizardAccepted=v=>expect(Boolean(wizardWithin(v.container).queryByText('Email accepted',{exact:true}))).toBe(true);
const wizardError=(v,text)=>{expect(wizardWithin(v.container).getByRole('alert').textContent).toBe(text);};
const wizardEnterName=(v,email='person@example.org')=>{wizardFill(v,'Email',email);wizardSubmit(v);wizardAccepted(v);};

const flowSummary=(v,email='person@example.org',name='Person',account='personal',company='Company')=>{wizardEnterName(v,email);wizardFill(v,'Name',name);if(FLOW_STAGE>=2){wizardFill(v,'Account type',account);if(account==='business')wizardFill(v,'Company',company);}wizardSubmit(v);};
const flowConsent=v=>wizardWithin(v.container).getByRole('checkbox',{name:'I agree',exact:true});
const flowSubmitButton=v=>wizardWithin(v.container).getByRole('button',{name:'Submit',exact:true});
const flowAgree=v=>fireEvent.click(flowConsent(v));
const flowExact=(v,text)=>expect(Boolean(wizardWithin(v.container).getByText(text,{exact:true,normalizer:value=>value}))).toBe(true);
const flowTerminal=(v,email,name,company)=>{flowExact(v,'Submitted');flowExact(v,email);flowExact(v,name);if(company)flowExact(v,company);expect(wizardWithin(v.container).queryByRole('button',{name:'Submit',exact:true})).toBeNull();expect(wizardWithin(v.container).queryAllByRole('textbox').length).toBe(0);expect(wizardWithin(v.container).queryAllByRole('checkbox').length).toBe(0);expect(Boolean(wizardWithin(v.container).getByRole('button',{name:'Start over',exact:true}))).toBe(true);};
const flowSave=v=>wizardClick(v,'Save draft');
const flowDraft=()=>JSON.parse(localStorage.getItem('evolving-form-draft'));
const flowDraftCheck=expected=>{const actual=flowDraft();expect(Object.keys(actual).sort()).toEqual(['account','company','email','name','version']);expect(actual).toEqual({version:1,...expected});};

test('submission captures the actual literal trimmed fields and removes editable controls',()=>{const v=render(<App/>);flowSummary(v,'  other@example.org  ','  Person <name>&  ');expect(wizardWithin(v.container).queryByRole('button',{name:'Start over',exact:true})).toBeNull();wizardClick(v,'Submit');expect(wizardWithin(v.container).queryByText('Submitted',{exact:true})).toBeNull();flowAgree(v);wizardClick(v,'Submit');flowTerminal(v,'other@example.org','Person <name>&');v.rerender(<App/>);flowTerminal(v,'other@example.org','Person <name>&');expect(v.container.querySelector('name')).toBeNull();});
test('Start over clears Name and consent as well as Email before a second independent submission',()=>{const v=render(<App/>);for(let i=0;i<3;i++){expect(wizardField(v,'Email').value).toBe('');wizardEnterName(v,'person'+i+'@example.org');expect(wizardField(v,'Name').value).toBe('');wizardFill(v,'Name','Person '+i);wizardSubmit(v);expect(flowConsent(v).checked).toBe(false);flowAgree(v);wizardClick(v,'Submit');flowTerminal(v,'person'+i+'@example.org','Person '+i);wizardClick(v,'Start over');expect(wizardWithin(v.container).queryByRole('alert')).toBeNull();}});
test('independent terminal snapshots retain their own values while another root restarts',()=>{const a=render(<App/>),b=render(<App/>);flowSummary(a,'one@example.org','First');flowSummary(b,'two@example.net','Second');flowAgree(a);flowAgree(b);wizardClick(a,'Submit');wizardClick(b,'Submit');a.rerender(<App/>);flowTerminal(a,'one@example.org','First');flowTerminal(b,'two@example.net','Second');wizardClick(a,'Start over');flowTerminal(b,'two@example.net','Second');expect(wizardField(a,'Email').value).toBe('');});
test('a fresh attempt does not inherit submitted or validation state',()=>{const old=render(<App/>);wizardFill(old,'Email','bad');wizardSubmit(old);wizardError(old,'Invalid email');wizardFill(old,'Email','old@example.org');wizardSubmit(old);wizardFill(old,'Name','Old');wizardSubmit(old);flowAgree(old);wizardClick(old,'Submit');old.unmount();const v=render(<App/>);expect(wizardField(v,'Email').value).toBe('');expect(wizardWithin(v.container).queryByText('Submitted',{exact:true})).toBeNull();expect(wizardWithin(v.container).queryByRole('alert')).toBeNull();});
`,
"react-evolving-form-4-start": `
const FLOW_STAGE=2;

const wizardWithin=require('@testing-library/react').within;
const wizardField=(v,label)=>wizardWithin(v.container).getByLabelText(label);
const wizardFill=(v,label,value)=>{const field=wizardField(v,label);if(field.value!==value)fireEvent.change(field,{target:{value}});};
const wizardClick=(v,label)=>fireEvent.click(wizardWithin(v.container).getByRole('button',{name:label,exact:true}));
const wizardSubmit=v=>{const form=v.container.querySelector('form');expect(Boolean(form)).toBe(true);expect(fireEvent.submit(form)).toBe(false);};
const wizardAccepted=v=>expect(Boolean(wizardWithin(v.container).queryByText('Email accepted',{exact:true}))).toBe(true);
const wizardError=(v,text)=>{expect(wizardWithin(v.container).getByRole('alert').textContent).toBe(text);};
const wizardEnterName=(v,email='person@example.org')=>{wizardFill(v,'Email',email);wizardSubmit(v);wizardAccepted(v);};

const flowSummary=(v,email='person@example.org',name='Person',account='personal',company='Company')=>{wizardEnterName(v,email);wizardFill(v,'Name',name);if(FLOW_STAGE>=2){wizardFill(v,'Account type',account);if(account==='business')wizardFill(v,'Company',company);}wizardSubmit(v);};
const flowConsent=v=>wizardWithin(v.container).getByRole('checkbox',{name:'I agree',exact:true});
const flowSubmitButton=v=>wizardWithin(v.container).getByRole('button',{name:'Submit',exact:true});
const flowAgree=v=>fireEvent.click(flowConsent(v));
const flowExact=(v,text)=>expect(Boolean(wizardWithin(v.container).getByText(text,{exact:true,normalizer:value=>value}))).toBe(true);
const flowTerminal=(v,email,name,company)=>{flowExact(v,'Submitted');flowExact(v,email);flowExact(v,name);if(company)flowExact(v,company);expect(wizardWithin(v.container).queryByRole('button',{name:'Submit',exact:true})).toBeNull();expect(wizardWithin(v.container).queryAllByRole('textbox').length).toBe(0);expect(wizardWithin(v.container).queryAllByRole('checkbox').length).toBe(0);expect(Boolean(wizardWithin(v.container).getByRole('button',{name:'Start over',exact:true}))).toBe(true);};
const flowSave=v=>wizardClick(v,'Save draft');
const flowDraft=()=>JSON.parse(localStorage.getItem('evolving-form-draft'));
const flowDraftCheck=expected=>{const actual=flowDraft();expect(Object.keys(actual).sort()).toEqual(['account','company','email','name','version']);expect(actual).toEqual({version:1,...expected});};

test('Company is controlled through long literal edits and repeated personal business switches',()=>{const v=render(<App/>);wizardEnterName(v);expect(wizardField(v,'Account type').value).toBe('personal');expect(wizardWithin(v.container).queryByLabelText('Company')).toBeNull();wizardFill(v,'Account type','business');const field=wizardField(v,'Company'),value='  <company>&'+('x'.repeat(220))+'  ';wizardFill(v,'Company',value);expect(field.value).toBe(value);field.value='external';v.rerender(<App/>);expect(field.value).toBe(value);for(let i=0;i<5;i++){wizardFill(v,'Account type','personal');expect(wizardWithin(v.container).queryByLabelText('Company')).toBeNull();wizardFill(v,'Account type','business');expect(wizardField(v,'Company').value).toBe(value);}});
test('Start over resets the newly added account and company together with inherited fields',()=>{const v=render(<App/>);for(let i=0;i<3;i++){wizardEnterName(v,'person'+i+'@example.org');expect(wizardField(v,'Name').value).toBe('');expect(wizardField(v,'Account type').value).toBe('personal');wizardFill(v,'Account type','business');expect(wizardField(v,'Company').value).toBe('');wizardFill(v,'Name','Person '+i);wizardFill(v,'Company','Company '+i);wizardSubmit(v);flowAgree(v);wizardClick(v,'Submit');flowTerminal(v,'person'+i+'@example.org','Person '+i);wizardClick(v,'Start over');expect(wizardField(v,'Email').value).toBe('');}});
test('independent Company drafts survive parent renders without sharing the branch or value',()=>{const a=render(<App/>),b=render(<App/>);wizardEnterName(a,'one@example.org');wizardEnterName(b,'two@example.net');wizardFill(a,'Account type','business');wizardFill(a,'Company','First Company');a.rerender(<App/>);expect(wizardField(a,'Company').value).toBe('First Company');expect(wizardField(b,'Account type').value).toBe('personal');expect(wizardWithin(b.container).queryByLabelText('Company')).toBeNull();wizardFill(b,'Account type','business');expect(wizardField(b,'Company').value).toBe('');});
test('a fresh account branch starts personal after another business draft unmounts',()=>{const old=render(<App/>);wizardEnterName(old);wizardFill(old,'Account type','business');wizardFill(old,'Company','Old Company');old.unmount();const v=render(<App/>);wizardEnterName(v);expect(wizardField(v,'Account type').value).toBe('personal');wizardFill(v,'Account type','business');expect(wizardField(v,'Company').value).toBe('');});
`,
"react-evolving-form-4": `
const FLOW_STAGE=3;

const wizardWithin=require('@testing-library/react').within;
const wizardField=(v,label)=>wizardWithin(v.container).getByLabelText(label);
const wizardFill=(v,label,value)=>{const field=wizardField(v,label);if(field.value!==value)fireEvent.change(field,{target:{value}});};
const wizardClick=(v,label)=>fireEvent.click(wizardWithin(v.container).getByRole('button',{name:label,exact:true}));
const wizardSubmit=v=>{const form=v.container.querySelector('form');expect(Boolean(form)).toBe(true);expect(fireEvent.submit(form)).toBe(false);};
const wizardAccepted=v=>expect(Boolean(wizardWithin(v.container).queryByText('Email accepted',{exact:true}))).toBe(true);
const wizardError=(v,text)=>{expect(wizardWithin(v.container).getByRole('alert').textContent).toBe(text);};
const wizardEnterName=(v,email='person@example.org')=>{wizardFill(v,'Email',email);wizardSubmit(v);wizardAccepted(v);};

const flowSummary=(v,email='person@example.org',name='Person',account='personal',company='Company')=>{wizardEnterName(v,email);wizardFill(v,'Name',name);if(FLOW_STAGE>=2){wizardFill(v,'Account type',account);if(account==='business')wizardFill(v,'Company',company);}wizardSubmit(v);};
const flowConsent=v=>wizardWithin(v.container).getByRole('checkbox',{name:'I agree',exact:true});
const flowSubmitButton=v=>wizardWithin(v.container).getByRole('button',{name:'Submit',exact:true});
const flowAgree=v=>fireEvent.click(flowConsent(v));
const flowExact=(v,text)=>expect(Boolean(wizardWithin(v.container).getByText(text,{exact:true,normalizer:value=>value}))).toBe(true);
const flowTerminal=(v,email,name,company)=>{flowExact(v,'Submitted');flowExact(v,email);flowExact(v,name);if(company)flowExact(v,company);expect(wizardWithin(v.container).queryByRole('button',{name:'Submit',exact:true})).toBeNull();expect(wizardWithin(v.container).queryAllByRole('textbox').length).toBe(0);expect(wizardWithin(v.container).queryAllByRole('checkbox').length).toBe(0);expect(Boolean(wizardWithin(v.container).getByRole('button',{name:'Start over',exact:true}))).toBe(true);};
const flowSave=v=>wizardClick(v,'Save draft');
const flowDraft=()=>JSON.parse(localStorage.getItem('evolving-form-draft'));
const flowDraftCheck=expected=>{const actual=flowDraft();expect(Object.keys(actual).sort()).toEqual(['account','company','email','name','version']);expect(actual).toEqual({version:1,...expected});};

test('business Company rejects zero or one non-space character and accepts exactly two BMP characters',()=>{for(const valid of ['AB','李雷']){const v=render(<App/>);wizardEnterName(v);wizardFill(v,'Name','Person');wizardFill(v,'Account type','business');for(const bad of ['',' ','A','\\tA\\u00a0']){wizardFill(v,'Company',bad);wizardSubmit(v);wizardError(v,'Invalid company');expect(Boolean(wizardField(v,'Company'))).toBe(true);}wizardFill(v,'Company','  '+valid+'  ');wizardSubmit(v);flowExact(v,valid);expect(wizardWithin(v.container).queryByRole('alert')).toBeNull();flowAgree(v);wizardClick(v,'Submit');flowTerminal(v,'person@example.org','Person',valid);v.unmount();}});
test('personal hides and excludes retained invalid Company while switching back validates the business branch',()=>{const v=render(<App/>);wizardEnterName(v);wizardFill(v,'Name','Person');wizardFill(v,'Account type','business');wizardFill(v,'Company','Q');wizardFill(v,'Account type','personal');wizardSubmit(v);expect(wizardWithin(v.container).queryByText('Q',{exact:true})).toBeNull();flowAgree(v);wizardClick(v,'Back');wizardFill(v,'Account type','business');expect(wizardField(v,'Company').value).toBe('Q');wizardSubmit(v);wizardError(v,'Invalid company');wizardFill(v,'Company','Business');wizardSubmit(v);expect(flowConsent(v).checked).toBe(false);flowAgree(v);wizardClick(v,'Submit');flowTerminal(v,'person@example.org','Person','Business');});
test('business submission and Start over reset every branch field before a personal receipt',()=>{const v=render(<App/>);flowSummary(v,'other@example.org','Person','business','  Company <name>&  ');flowAgree(v);wizardClick(v,'Submit');flowTerminal(v,'other@example.org','Person','Company <name>&');wizardClick(v,'Start over');wizardEnterName(v,'fresh@example.net');expect(wizardField(v,'Name').value).toBe('');expect(wizardField(v,'Account type').value).toBe('personal');wizardFill(v,'Account type','business');expect(wizardField(v,'Company').value).toBe('');wizardFill(v,'Company','Hidden Company');wizardFill(v,'Account type','personal');wizardFill(v,'Name','Fresh');wizardSubmit(v);expect(wizardWithin(v.container).queryByText('Hidden Company',{exact:true})).toBeNull();flowAgree(v);wizardClick(v,'Submit');flowTerminal(v,'fresh@example.net','Fresh');expect(wizardWithin(v.container).queryByText('Hidden Company',{exact:true})).toBeNull();});
test('independent branch summaries and fresh mounts retain no foreign company or consent',()=>{const a=render(<App/>),b=render(<App/>);flowSummary(a,'one@example.org','First','business','First Company');flowSummary(b,'two@example.net','Second','personal');flowAgree(a);a.rerender(<App/>);flowExact(a,'First Company');expect(wizardWithin(b.container).queryByText('First Company',{exact:true})).toBeNull();expect(flowConsent(b).checked).toBe(false);a.unmount();b.unmount();expect(wizardField(render(<App/>),'Email').value).toBe('');});
`,
"react-evolving-form-5-start": `
const FLOW_STAGE=4;

const wizardWithin=require('@testing-library/react').within;
const wizardField=(v,label)=>wizardWithin(v.container).getByLabelText(label);
const wizardFill=(v,label,value)=>{const field=wizardField(v,label);if(field.value!==value)fireEvent.change(field,{target:{value}});};
const wizardClick=(v,label)=>fireEvent.click(wizardWithin(v.container).getByRole('button',{name:label,exact:true}));
const wizardSubmit=v=>{const form=v.container.querySelector('form');expect(Boolean(form)).toBe(true);expect(fireEvent.submit(form)).toBe(false);};
const wizardAccepted=v=>expect(Boolean(wizardWithin(v.container).queryByText('Email accepted',{exact:true}))).toBe(true);
const wizardError=(v,text)=>{expect(wizardWithin(v.container).getByRole('alert').textContent).toBe(text);};
const wizardEnterName=(v,email='person@example.org')=>{wizardFill(v,'Email',email);wizardSubmit(v);wizardAccepted(v);};

const flowSummary=(v,email='person@example.org',name='Person',account='personal',company='Company')=>{wizardEnterName(v,email);wizardFill(v,'Name',name);if(FLOW_STAGE>=2){wizardFill(v,'Account type',account);if(account==='business')wizardFill(v,'Company',company);}wizardSubmit(v);};
const flowConsent=v=>wizardWithin(v.container).getByRole('checkbox',{name:'I agree',exact:true});
const flowSubmitButton=v=>wizardWithin(v.container).getByRole('button',{name:'Submit',exact:true});
const flowAgree=v=>fireEvent.click(flowConsent(v));
const flowExact=(v,text)=>expect(Boolean(wizardWithin(v.container).getByText(text,{exact:true,normalizer:value=>value}))).toBe(true);
const flowTerminal=(v,email,name,company)=>{flowExact(v,'Submitted');flowExact(v,email);flowExact(v,name);if(company)flowExact(v,company);expect(wizardWithin(v.container).queryByRole('button',{name:'Submit',exact:true})).toBeNull();expect(wizardWithin(v.container).queryAllByRole('textbox').length).toBe(0);expect(wizardWithin(v.container).queryAllByRole('checkbox').length).toBe(0);expect(Boolean(wizardWithin(v.container).getByRole('button',{name:'Start over',exact:true}))).toBe(true);};
const flowSave=v=>wizardClick(v,'Save draft');
const flowDraft=()=>JSON.parse(localStorage.getItem('evolving-form-draft'));
const flowDraftCheck=expected=>{const actual=flowDraft();expect(Object.keys(actual).sort()).toEqual(['account','company','email','name','version']);expect(actual).toEqual({version:1,...expected});};

test('Save draft writes exactly five schema fields without navigating or validating the current draft',()=>{localStorage.removeItem('evolving-form-draft');localStorage.setItem('unrelated-draft','keep');const v=render(<App/>);flowSave(v);flowDraftCheck({email:'',name:'',account:'personal',company:''});wizardFill(v,'Email','not email yet');flowSave(v);flowDraftCheck({email:'not email yet',name:'',account:'personal',company:''});expect(wizardField(v,'Email').value).toBe('not email yet');expect(wizardWithin(v.container).queryByRole('alert')).toBeNull();expect(localStorage.getItem('unrelated-draft')).toBe('keep');localStorage.removeItem('unrelated-draft');});
test('repeated saves include current Name account and retained raw Company rather than an initial closure',()=>{const v=render(<App/>);wizardEnterName(v,'person@example.org');wizardFill(v,'Name','  Name draft  ');wizardFill(v,'Account type','business');wizardFill(v,'Company','  Company <name>&  ');flowSave(v);flowDraftCheck({email:'person@example.org',name:'  Name draft  ',account:'business',company:'  Company <name>&  '});wizardFill(v,'Name','New Name');wizardFill(v,'Account type','personal');flowSave(v);flowDraftCheck({email:'person@example.org',name:'New Name',account:'personal',company:'  Company <name>&  '});});
test('summary saves never persist consent and are unavailable after terminal submission',()=>{const v=render(<App/>);flowSummary(v,'person@example.org','Person','business','Company');flowSave(v);flowDraftCheck({email:'person@example.org',name:'Person',account:'business',company:'Company'});flowAgree(v);flowSave(v);flowDraftCheck({email:'person@example.org',name:'Person',account:'business',company:'Company'});expect(flowConsent(v).checked).toBe(true);wizardClick(v,'Submit');flowTerminal(v,'person@example.org','Person','Company');expect(wizardWithin(v.container).queryByRole('button',{name:'Save draft',exact:true})).toBeNull();});
test('independent roots save their own fields with last-write semantics and a fresh mount stays empty',()=>{const a=render(<App/>),b=render(<App/>);wizardEnterName(a,'one@example.org');wizardEnterName(b,'two@example.net');wizardFill(a,'Name','First');wizardFill(b,'Name','Second');flowSave(a);flowDraftCheck({email:'one@example.org',name:'First',account:'personal',company:''});flowSave(b);flowDraftCheck({email:'two@example.net',name:'Second',account:'personal',company:''});a.rerender(<App/>);flowSave(a);flowDraftCheck({email:'one@example.org',name:'First',account:'personal',company:''});a.unmount();b.unmount();expect(wizardField(render(<App/>),'Email').value).toBe('');});
`,
};
for (const [id,cases] of Object.entries(CONSENT_BRANCH_REVIEW_CASES)) {
  const solution=REACT_EVOLVING_SOLUTIONS[id];
  solution.hiddenSuite=[solution.hiddenSuite,cases].filter(Boolean).join("\n\n");
}
