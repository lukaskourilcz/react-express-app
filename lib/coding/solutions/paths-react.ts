/** Server-only solutions for the React section's short paths.
 *
 * Every level is a whole `App` module, built here from one template per board
 * so each level reads as the program a learner would write at that point,
 * with nothing from a later level in it. The content contract runs all three
 * boards against the level's suite, which carries every earlier level's
 * checks too.
 *
 * reference: plain hooks and a comment where the reason is not obvious.
 * junior: one useState per value, named handle* functions, for loops.
 * senior: a reducer or a custom hook, derived values and small helpers. */

import type { CodingSolution } from '../types';
import { wholeLevels, type Boards } from './path-boards';

/** Joins the lines that apply at this level; `false` drops a line. */
const lines = (...parts: (string | false)[]): string => parts.filter((part): part is string => part !== false).join('\n');
const levels = (build: (level: number) => string): string[] => [1, 2, 3, 4, 5].map(build);

/* ── State and lists ───────────────────────────────────────────────────── */

const stateReference = (level: number) => lines(
  `import React, { useRef, useState } from 'react';`,
  ``,
  `export default function App() {`,
  `  const [name, setName] = useState('');`,
  `  const [guests, setGuests] = useState([]);`,
  level >= 4 && `  const [show, setShow] = useState('all');`,
  level >= 5 && `  const [error, setError] = useState('');`,
  `  // Ids come from a counter, not the array index, so they survive removals.`,
  `  const nextId = useRef(1);`,
  ``,
  `  function add(event) {`,
  `    event.preventDefault();`,
  `    const trimmed = name.trim();`,
  level >= 5 ? `    if (!trimmed) { setError(''); return; }` : `    if (!trimmed) return;`,
  level >= 5 && `    if (guests.some((guest) => guest.name.toLowerCase() === trimmed.toLowerCase())) {`,
  level >= 5 && `      setError('Already on the list');`,
  level >= 5 && `      return;`,
  level >= 5 && `    }`,
  `    setGuests([...guests, { id: nextId.current++, name: trimmed${level >= 3 ? ', arrived: false' : ''} }]);`,
  `    setName('');`,
  level >= 5 && `    setError('');`,
  `  }`,
  level >= 2 && ``,
  level >= 2 && `  function remove(id) {`,
  level >= 2 && `    setGuests(guests.filter((guest) => guest.id !== id));`,
  level >= 2 && `  }`,
  level >= 3 && ``,
  level >= 3 && `  function toggle(id) {`,
  level >= 3 && `    // A new object for the guest that changed; the others are kept as they are.`,
  level >= 3 && `    setGuests(guests.map((guest) => (guest.id === id ? { ...guest, arrived: !guest.arrived } : guest)));`,
  level >= 3 && `  }`,
  level >= 3 && ``,
  level >= 3 && `  const arrived = guests.filter((guest) => guest.arrived).length;`,
  level >= 4 && `  // Worked out on every render, so it can never disagree with the list.`,
  level >= 4 && `  const visible = guests.filter((guest) => show === 'all' || (show === 'arrived') === guest.arrived);`,
  ``,
  `  return (`,
  `    <main>`,
  `      <form onSubmit={add}>`,
  `        <label>`,
  `          Name <input value={name} onChange={(event) => setName(event.target.value)} />`,
  `        </label>`,
  `        <button>Add</button>`,
  `      </form>`,
  level >= 5 && `      {error && <p role="alert">{error}</p>}`,
  level >= 2 && `      <p>`,
  level >= 2 && `        Guests: <output aria-label="Guests">{guests.length}</output>`,
  level >= 2 && `      </p>`,
  level >= 3 && `      <p>`,
  level >= 3 && `        Arrived: <output aria-label="Arrived">{arrived} of {guests.length}</output>`,
  level >= 3 && `      </p>`,
  level >= 4 && `      <label>`,
  level >= 4 && `        Show{' '}`,
  level >= 4 && `        <select value={show} onChange={(event) => setShow(event.target.value)}>`,
  level >= 4 && `          <option value="all">all</option>`,
  level >= 4 && `          <option value="arrived">arrived</option>`,
  level >= 4 && `          <option value="waiting">waiting</option>`,
  level >= 4 && `        </select>`,
  level >= 4 && `      </label>`,
  `      <ul>`,
  `        {${level >= 4 ? 'visible' : 'guests'}.map((guest) => (`,
  `          <li key={guest.id}>`,
  level >= 3
    ? `            <label>
              <input type="checkbox" checked={guest.arrived} onChange={() => toggle(guest.id)} />
              {guest.name}
            </label>`
    : `            {guest.name}`,
  level >= 2 && `            <button onClick={() => remove(guest.id)}>Remove {guest.name}</button>`,
  `          </li>`,
  `        ))}`,
  `      </ul>`,
  `    </main>`,
  `  );`,
  `}`,
);

const stateJunior = (level: number) => lines(
  `import React, { useState } from 'react';`,
  ``,
  `export default function App() {`,
  `  const [name, setName] = useState('');`,
  `  const [guests, setGuests] = useState([]);`,
  `  const [nextId, setNextId] = useState(1);`,
  level >= 4 && `  const [show, setShow] = useState('all');`,
  level >= 5 && `  const [error, setError] = useState('');`,
  ``,
  `  function handleNameChange(event) {`,
  `    setName(event.target.value);`,
  `  }`,
  ``,
  `  function handleAdd() {`,
  `    const trimmed = name.trim();`,
  `    if (trimmed === '') {`,
  level >= 5 && `      setError('');`,
  `      return;`,
  `    }`,
  level >= 5 && `    for (let i = 0; i < guests.length; i++) {`,
  level >= 5 && `      if (guests[i].name.toLowerCase() === trimmed.toLowerCase()) {`,
  level >= 5 && `        setError('Already on the list');`,
  level >= 5 && `        return;`,
  level >= 5 && `      }`,
  level >= 5 && `    }`,
  `    const guest = { id: nextId, name: trimmed${level >= 3 ? ', arrived: false' : ''} };`,
  `    setGuests([...guests, guest]);`,
  `    setNextId(nextId + 1);`,
  `    setName('');`,
  level >= 5 && `    setError('');`,
  `  }`,
  level >= 2 && ``,
  level >= 2 && `  function handleRemove(id) {`,
  level >= 2 && `    const kept = [];`,
  level >= 2 && `    for (let i = 0; i < guests.length; i++) {`,
  level >= 2 && `      if (guests[i].id !== id) {`,
  level >= 2 && `        kept.push(guests[i]);`,
  level >= 2 && `      }`,
  level >= 2 && `    }`,
  level >= 2 && `    setGuests(kept);`,
  level >= 2 && `  }`,
  level >= 3 && ``,
  level >= 3 && `  function handleToggle(id) {`,
  level >= 3 && `    const updated = [];`,
  level >= 3 && `    for (let i = 0; i < guests.length; i++) {`,
  level >= 3 && `      const guest = guests[i];`,
  level >= 3 && `      if (guest.id === id) {`,
  level >= 3 && `        updated.push({ ...guest, arrived: !guest.arrived });`,
  level >= 3 && `      } else {`,
  level >= 3 && `        updated.push(guest);`,
  level >= 3 && `      }`,
  level >= 3 && `    }`,
  level >= 3 && `    setGuests(updated);`,
  level >= 3 && `  }`,
  level >= 3 && ``,
  level >= 3 && `  let arrivedCount = 0;`,
  level >= 3 && `  for (let i = 0; i < guests.length; i++) {`,
  level >= 3 && `    if (guests[i].arrived) {`,
  level >= 3 && `      arrivedCount = arrivedCount + 1;`,
  level >= 3 && `    }`,
  level >= 3 && `  }`,
  level >= 4 && ``,
  level >= 4 && `  const visibleGuests = [];`,
  level >= 4 && `  for (let i = 0; i < guests.length; i++) {`,
  level >= 4 && `    const guest = guests[i];`,
  level >= 4 && `    if (show === 'all') {`,
  level >= 4 && `      visibleGuests.push(guest);`,
  level >= 4 && `    } else if (show === 'arrived' && guest.arrived) {`,
  level >= 4 && `      visibleGuests.push(guest);`,
  level >= 4 && `    } else if (show === 'waiting' && !guest.arrived) {`,
  level >= 4 && `      visibleGuests.push(guest);`,
  level >= 4 && `    }`,
  level >= 4 && `  }`,
  ``,
  `  return (`,
  `    <main>`,
  `      <label>`,
  `        Name`,
  `        <input value={name} onChange={handleNameChange} />`,
  `      </label>`,
  `      <button onClick={handleAdd}>Add</button>`,
  level >= 5 && `      {error !== '' && <p role="alert">{error}</p>}`,
  level >= 2 && `      <p>`,
  level >= 2 && `        Guests: <output aria-label="Guests">{guests.length}</output>`,
  level >= 2 && `      </p>`,
  level >= 3 && `      <p>`,
  level >= 3 && `        Arrived: <output aria-label="Arrived">{arrivedCount} of {guests.length}</output>`,
  level >= 3 && `      </p>`,
  level >= 4 && `      <label>`,
  level >= 4 && `        Show`,
  level >= 4 && `        <select value={show} onChange={(event) => setShow(event.target.value)}>`,
  level >= 4 && `          <option value="all">all</option>`,
  level >= 4 && `          <option value="arrived">arrived</option>`,
  level >= 4 && `          <option value="waiting">waiting</option>`,
  level >= 4 && `        </select>`,
  level >= 4 && `      </label>`,
  `      <ul>`,
  `        {${level >= 4 ? 'visibleGuests' : 'guests'}.map((guest) => (`,
  `          <li key={guest.id}>`,
  level >= 3
    ? `            <label>
              <input type="checkbox" checked={guest.arrived} onChange={() => handleToggle(guest.id)} />
              {guest.name}
            </label>`
    : `            {guest.name}`,
  level >= 2 && `            <button onClick={() => handleRemove(guest.id)}>Remove {guest.name}</button>`,
  `          </li>`,
  `        ))}`,
  `      </ul>`,
  `    </main>`,
  `  );`,
  `}`,
);

const stateSenior = (level: number) => lines(
  `import React, { useReducer, useState } from 'react';`,
  ``,
  level >= 4 && `const FILTERS = { all: () => true, arrived: (guest) => guest.arrived, waiting: (guest) => !guest.arrived };`,
  level >= 4 && ``,
  `function guestsReducer(state, action) {`,
  `  switch (action.type) {`,
  `    case 'add':`,
  `      return { nextId: state.nextId + 1, guests: [...state.guests, { id: state.nextId, name: action.name${level >= 3 ? ', arrived: false' : ''} }] };`,
  level >= 2 && `    case 'remove':`,
  level >= 2 && `      return { ...state, guests: state.guests.filter((guest) => guest.id !== action.id) };`,
  level >= 3 && `    case 'toggle':`,
  level >= 3 && `      return { ...state, guests: state.guests.map((guest) => (guest.id === action.id ? { ...guest, arrived: !guest.arrived } : guest)) };`,
  `    default:`,
  `      return state;`,
  `  }`,
  `}`,
  ``,
  `export default function App() {`,
  `  const [{ guests }, dispatch] = useReducer(guestsReducer, { nextId: 1, guests: [] });`,
  `  const [name, setName] = useState('');`,
  level >= 4 && `  const [show, setShow] = useState('all');`,
  level >= 5 && `  const [error, setError] = useState('');`,
  level === 3 && `  const arrived = guests.filter((guest) => guest.arrived).length;`,
  level >= 4 && `  const arrived = guests.filter(FILTERS.arrived).length;`,
  ``,
  `  const add = (event) => {`,
  `    event.preventDefault();`,
  `    const trimmed = name.trim();`,
  level >= 5 ? `    if (!trimmed) { setError(''); return; }` : `    if (!trimmed) return;`,
  level >= 5 && `    const key = trimmed.toLowerCase();`,
  level >= 5 && `    if (guests.some((guest) => guest.name.toLowerCase() === key)) return setError('Already on the list');`,
  `    dispatch({ type: 'add', name: trimmed });`,
  `    setName('');`,
  level >= 5 && `    setError('');`,
  `  };`,
  ``,
  `  return (`,
  `    <main>`,
  `      <form onSubmit={add}>`,
  `        <label>`,
  `          Name <input value={name} onChange={(event) => setName(event.target.value)} />`,
  `        </label>`,
  `        <button>Add</button>`,
  `      </form>`,
  level >= 5 && `      {error && <p role="alert">{error}</p>}`,
  level >= 2 && `      <p>Guests: <output aria-label="Guests">{guests.length}</output></p>`,
  level >= 3 && `      <p>Arrived: <output aria-label="Arrived">{arrived} of {guests.length}</output></p>`,
  level >= 4 && `      <label>`,
  level >= 4 && `        Show{' '}`,
  level >= 4 && `        <select value={show} onChange={(event) => setShow(event.target.value)}>`,
  level >= 4 && `          {Object.keys(FILTERS).map((key) => <option key={key}>{key}</option>)}`,
  level >= 4 && `        </select>`,
  level >= 4 && `      </label>`,
  `      <ul>`,
  `        {guests${level >= 4 ? '.filter(FILTERS[show])' : ''}.map((guest) => (`,
  `          <li key={guest.id}>`,
  level >= 3
    ? `            <label>
              <input type="checkbox" checked={guest.arrived} onChange={() => dispatch({ type: 'toggle', id: guest.id })} />
              {guest.name}
            </label>`
    : `            {guest.name}`,
  level >= 2 && `            <button onClick={() => dispatch({ type: 'remove', id: guest.id })}>Remove {guest.name}</button>`,
  `          </li>`,
  `        ))}`,
  `      </ul>`,
  `    </main>`,
  `  );`,
  `}`,
);

/* ── Effects and loading ───────────────────────────────────────────────── */

const SAMPLE_USERS = `// A stand-in for a real request, so the preview has something to show.
// The checks pass their own loadUsers instead.
const sampleUsers = () =>
  new Promise((resolve) =>
    setTimeout(() => resolve([{ id: 1, name: 'Ada' }, { id: 2, name: 'Linus' }, { id: 3, name: 'Grace' }]), 300),
  );`;

const effectsReference = (level: number) => lines(
  `import React, { useEffect, useState } from 'react';`,
  ``,
  SAMPLE_USERS,
  ``,
  `export default function App({ loadUsers = sampleUsers }) {`,
  `  const [users, setUsers] = useState([]);`,
  `  // Starts as 'loading', so the very first render already says Loading.`,
  `  const [status, setStatus] = useState('loading');`,
  level >= 2 && `  const [attempt, setAttempt] = useState(0);`,
  level >= 3 && `  const [query, setQuery] = useState('');`,
  ``,
  `  useEffect(() => {`,
  level >= 4 && `    // Set when loadUsers changes or App unmounts, so a late answer is dropped.`,
  level >= 4 && `    let ignore = false;`,
  level >= 2 && `    setStatus('loading');`,
  level === 1 && `    loadUsers().then((list) => {`,
  level === 1 && `      setUsers(list);`,
  level === 1 && `      setStatus('ready');`,
  level === 1 && `    });`,
  level === 1 && `  }, []);`,
  level >= 2 && `    loadUsers().then(`,
  level >= 2 && `      (list) => {`,
  level >= 4 && `        if (ignore) return;`,
  level >= 2 && `        setUsers(list);`,
  level >= 2 && `        setStatus('ready');`,
  level >= 2 && `      },`,
  level >= 2 && `      () => {`,
  level >= 4 ? `        if (!ignore) setStatus('error');` : level >= 2 && `        setStatus('error');`,
  level >= 2 && `      },`,
  level >= 2 && `    );`,
  level >= 4 && `    return () => {`,
  level >= 4 && `      ignore = true;`,
  level >= 4 && `    };`,
  level >= 2 && `  }, [${level >= 4 ? 'loadUsers, attempt' : 'attempt'}]);`,
  level >= 5 && ``,
  level >= 5 && `  // Put back the title the page had before App mounted.`,
  level >= 5 && `  useEffect(() => {`,
  level >= 5 && `    const before = document.title;`,
  level >= 5 && `    return () => {`,
  level >= 5 && `      document.title = before;`,
  level >= 5 && `    };`,
  level >= 5 && `  }, []);`,
  level >= 5 && ``,
  level >= 5 && `  useEffect(() => {`,
  level >= 5 && `    if (status === 'ready') document.title = users.length + (users.length === 1 ? ' user' : ' users');`,
  level >= 5 && `  }, [status, users.length]);`,
  level >= 3 && ``,
  level >= 3 && `  // Filtered while rendering: there is no second list to keep in step.`,
  level >= 3 && `  const needle = query.trim().toLowerCase();`,
  level >= 3 && `  const visible = users.filter((user) => user.name.toLowerCase().includes(needle));`,
  ``,
  `  return (`,
  `    <main>`,
  level >= 3 && `      <label>`,
  level >= 3 && `        Search <input value={query} onChange={(event) => setQuery(event.target.value)} />`,
  level >= 3 && `      </label>`,
  `      {status === 'loading' && <p role="status">Loading</p>}`,
  level >= 2 && `      {status === 'error' && (`,
  level >= 2 && `        <>`,
  level >= 2 && `          <p role="alert">Could not load users</p>`,
  level >= 2 && `          <button onClick={() => setAttempt((n) => n + 1)}>Retry</button>`,
  level >= 2 && `        </>`,
  level >= 2 && `      )}`,
  `      {status === 'ready' && users.length === 0 && <p>No users</p>}`,
  level >= 3 && `      {status === 'ready' && users.length > 0 && visible.length === 0 && <p>No matches</p>}`,
  `      {status === 'ready' && (`,
  `        <ul>`,
  `          {${level >= 3 ? 'visible' : 'users'}.map((user) => (`,
  `            <li key={user.id}>{user.name}</li>`,
  `          ))}`,
  `        </ul>`,
  `      )}`,
  `    </main>`,
  `  );`,
  `}`,
);

const effectsJunior = (level: number) => lines(
  `import React, { useEffect, useState } from 'react';`,
  ``,
  SAMPLE_USERS,
  ``,
  `export default function App({ loadUsers = sampleUsers }) {`,
  `  const [users, setUsers] = useState([]);`,
  `  const [loading, setLoading] = useState(true);`,
  level >= 2 && `  const [failed, setFailed] = useState(false);`,
  level >= 2 && `  const [retries, setRetries] = useState(0);`,
  level >= 3 && `  const [search, setSearch] = useState('');`,
  ``,
  `  useEffect(() => {`,
  level >= 4 && `    let cancelled = false;`,
  level >= 4 && ``,
  `    async function load() {`,
  level === 1 && `      const list = await loadUsers();`,
  level === 1 && `      setUsers(list);`,
  level === 1 && `      setLoading(false);`,
  level >= 2 && `      setLoading(true);`,
  level >= 2 && `      setFailed(false);`,
  level >= 2 && `      try {`,
  level >= 2 && `        const list = await loadUsers();`,
  level >= 4 && `        if (cancelled) {`,
  level >= 4 && `          return;`,
  level >= 4 && `        }`,
  level >= 2 && `        setUsers(list);`,
  level >= 2 && `        setLoading(false);`,
  level >= 2 && `      } catch (error) {`,
  level >= 4 && `        if (cancelled) {`,
  level >= 4 && `          return;`,
  level >= 4 && `        }`,
  level >= 2 && `        setFailed(true);`,
  level >= 2 && `        setLoading(false);`,
  level >= 2 && `      }`,
  `    }`,
  ``,
  `    load();`,
  level >= 4 && `    return () => {`,
  level >= 4 && `      cancelled = true;`,
  level >= 4 && `    };`,
  `  }, [${level >= 4 ? 'loadUsers, retries' : level >= 2 ? 'retries' : ''}]);`,
  level >= 5 && ``,
  level >= 5 && `  useEffect(() => {`,
  level >= 5 && `    const previousTitle = document.title;`,
  level >= 5 && `    return () => {`,
  level >= 5 && `      document.title = previousTitle;`,
  level >= 5 && `    };`,
  level >= 5 && `  }, []);`,
  level >= 5 && ``,
  level >= 5 && `  useEffect(() => {`,
  level >= 5 && `    if (loading || failed) {`,
  level >= 5 && `      return;`,
  level >= 5 && `    }`,
  level >= 5 && `    if (users.length === 1) {`,
  level >= 5 && `      document.title = '1 user';`,
  level >= 5 && `    } else {`,
  level >= 5 && `      document.title = users.length + ' users';`,
  level >= 5 && `    }`,
  level >= 5 && `  }, [loading, failed, users]);`,
  level >= 2 && ``,
  level >= 2 && `  function handleRetry() {`,
  level >= 2 && `    setRetries(retries + 1);`,
  level >= 2 && `  }`,
  level >= 3 && ``,
  level >= 3 && `  function handleSearchChange(event) {`,
  level >= 3 && `    setSearch(event.target.value);`,
  level >= 3 && `  }`,
  level >= 3 && ``,
  level >= 3 && `  const needle = search.trim().toLowerCase();`,
  level >= 3 && `  const matching = [];`,
  level >= 3 && `  for (let i = 0; i < users.length; i++) {`,
  level >= 3 && `    if (users[i].name.toLowerCase().includes(needle)) {`,
  level >= 3 && `      matching.push(users[i]);`,
  level >= 3 && `    }`,
  level >= 3 && `  }`,
  ``,
  `  let content;`,
  `  if (loading) {`,
  `    content = <p role="status">Loading</p>;`,
  level >= 2 && `  } else if (failed) {`,
  level >= 2 && `    content = (`,
  level >= 2 && `      <>`,
  level >= 2 && `        <p role="alert">Could not load users</p>`,
  level >= 2 && `        <button onClick={handleRetry}>Retry</button>`,
  level >= 2 && `      </>`,
  level >= 2 && `    );`,
  `  } else if (users.length === 0) {`,
  `    content = <p>No users</p>;`,
  level >= 3 && `  } else if (matching.length === 0) {`,
  level >= 3 && `    content = <p>No matches</p>;`,
  `  } else {`,
  `    content = (`,
  `      <ul>`,
  `        {${level >= 3 ? 'matching' : 'users'}.map((user) => (`,
  `          <li key={user.id}>{user.name}</li>`,
  `        ))}`,
  `      </ul>`,
  `    );`,
  `  }`,
  ``,
  `  return (`,
  `    <main>`,
  level >= 3 && `      <label>`,
  level >= 3 && `        Search`,
  level >= 3 && `        <input value={search} onChange={handleSearchChange} />`,
  level >= 3 && `      </label>`,
  `      {content}`,
  `    </main>`,
  `  );`,
  `}`,
);

const effectsSenior = (level: number) => lines(
  `import React, { useEffect, useState } from 'react';`,
  ``,
  SAMPLE_USERS,
  ``,
  `function useUsers(loadUsers) {`,
  `  const [state, setState] = useState({ status: 'loading', users: [] });`,
  level >= 2 && `  const [attempt, setAttempt] = useState(0);`,
  `  useEffect(() => {`,
  `    let live = true;`,
  `    setState((current) => ({ ...current, status: 'loading' }));`,
  `    loadUsers().then(`,
  `      (users) => live && setState({ status: 'ready', users }),`,
  `      () => live && setState((current) => ({ ...current, status: 'error' })),`,
  `    );`,
  `    return () => {`,
  `      live = false;`,
  `    };`,
  `  }, [loadUsers${level >= 2 ? ', attempt' : ''}]);`,
  level >= 2 ? `  return { ...state, retry: () => setAttempt((n) => n + 1) };` : `  return state;`,
  `}`,
  level >= 5 && ``,
  level >= 5 && `function useTitle(title) {`,
  level >= 5 && `  useEffect(() => {`,
  level >= 5 && `    const before = document.title;`,
  level >= 5 && `    return () => {`,
  level >= 5 && `      document.title = before;`,
  level >= 5 && `    };`,
  level >= 5 && `  }, []);`,
  level >= 5 && `  useEffect(() => {`,
  level >= 5 && `    if (title) document.title = title;`,
  level >= 5 && `  }, [title]);`,
  level >= 5 && `}`,
  level >= 5 && ``,
  level >= 5 && `const plural = (n) => n + (n === 1 ? ' user' : ' users');`,
  ``,
  `export default function App({ loadUsers = sampleUsers }) {`,
  `  const { status, users${level >= 2 ? ', retry' : ''} } = useUsers(loadUsers);`,
  level >= 3 && `  const [query, setQuery] = useState('');`,
  level >= 3 && `  const needle = query.trim().toLowerCase();`,
  level >= 3 && `  const visible = users.filter(({ name }) => name.toLowerCase().includes(needle));`,
  level >= 5 && `  useTitle(status === 'ready' ? plural(users.length) : null);`,
  ``,
  `  return (`,
  `    <main>`,
  level >= 3 && `      <label>`,
  level >= 3 && `        Search <input value={query} onChange={(event) => setQuery(event.target.value)} />`,
  level >= 3 && `      </label>`,
  `      {status === 'loading' && <p role="status">Loading</p>}`,
  level >= 2 && `      {status === 'error' && (`,
  level >= 2 && `        <>`,
  level >= 2 && `          <p role="alert">Could not load users</p>`,
  level >= 2 && `          <button onClick={retry}>Retry</button>`,
  level >= 2 && `        </>`,
  level >= 2 && `      )}`,
  level >= 3
    ? `      {status === 'ready' &&
        (users.length === 0 ? (
          <p>No users</p>
        ) : visible.length === 0 ? (
          <p>No matches</p>
        ) : (
          <ul>
            {visible.map(({ id, name }) => (
              <li key={id}>{name}</li>
            ))}
          </ul>
        ))}`
    : `      {status === 'ready' &&
        (users.length === 0 ? (
          <p>No users</p>
        ) : (
          <ul>
            {users.map(({ id, name }) => (
              <li key={id}>{name}</li>
            ))}
          </ul>
        ))}`,
  `    </main>`,
  `  );`,
  `}`,
);

const STATE: Boards = { reference: levels(stateReference), junior: levels(stateJunior), senior: levels(stateSenior) };
const EFFECTS: Boards = { reference: levels(effectsReference), junior: levels(effectsJunior), senior: levels(effectsSenior) };

/* Hidden cases (lib/coding/react-hidden.ts) for what a level's visible checks
 * read in one situation only. A level keeps every earlier requirement, so a
 * case stays in every later level of its path. They use the visible suite's
 * `soon` and `names`. */
const EFFECTS_HIDDEN: { from: number; suite: string }[] = [
  { from: 1, suite: `test('No users appears only after an empty answer, never while loading',async()=>{let finish;render(<App loadUsers={()=>new Promise((resolve)=>{finish=resolve;})}/>);expect(screen.queryByText('No users')).toBeNull();finish([{id:1,name:'Ada'}]);await screen.findByText('Ada',{},soon);expect(screen.queryByText('No users')).toBeNull();});` },
  { from: 3, suite: `test('the search matches inside a name, not only its start',async()=>{render(<App loadUsers={()=>Promise.resolve([{id:1,name:'Ada'},{id:2,name:'Linus'}])}/>);await screen.findByText('Linus',{},soon);fireEvent.change(screen.getByLabelText('Search'),{target:{value:'nus'}});expect(names()).toEqual(['Linus']);});` },
  { from: 4, suite: `test('a late failure from the old loader is ignored',async()=>{let failOld;const {rerender}=render(<App loadUsers={()=>new Promise((_resolve,reject)=>{failOld=reject;})}/>);rerender(<App loadUsers={()=>Promise.resolve([{id:9,name:'Grace'}])}/>);await screen.findByText('Grace',{},soon);failOld(new Error('late'));await new Promise((resolve)=>setTimeout(resolve,30));expect(screen.queryByRole('alert')).toBeNull();expect(names()).toEqual(['Grace']);});` },
];

const withHidden = (entries: [string, CodingSolution][], hidden: { from: number; suite: string }[]): [string, CodingSolution][] =>
  entries.map(([id, solution]) => {
    const level = Number(id.slice(id.lastIndexOf('-') + 1));
    const cases = hidden.filter((one) => one.from <= level).map((one) => one.suite);
    return [id, cases.length > 0 ? { ...solution, hiddenSuite: cases.join('\n') } : solution];
  });

export const REACT_PATH_SOLUTIONS: Record<string, CodingSolution> = Object.fromEntries([
  ...wholeLevels('react-path-state', STATE),
  ...withHidden(wholeLevels('react-path-effects', EFFECTS), EFFECTS_HIDDEN),
]);

// These stages are reviewed individually; later path stages retain their own checks.
const GUEST_LIST_REVIEW_CASES: Record<string,string> = {
"react-path-state-1": `const GUEST_LEVEL=1;

const guestWithin=container=>require('@testing-library/react').within(container);
const guestQuery=v=>guestWithin(v.container);
const guestInput=v=>guestQuery(v).getByRole('textbox',{name:'Name',exact:true});
const guestAdd=(v,text)=>{fireEvent.change(guestInput(v),{target:{value:text}});fireEvent.click(guestQuery(v).getByRole('button',{name:'Add',exact:true}));};
const guestRows=v=>guestQuery(v).queryAllByRole('listitem');
const guestCount=(v,total,arrived)=>{if(GUEST_LEVEL>=2){const output=guestQuery(v).getByLabelText('Guests');expect(output.tagName).toBe('OUTPUT');expect(output.textContent).toBe(String(total));}if(GUEST_LEVEL>=3){const output=guestQuery(v).getByLabelText('Arrived');expect(output.tagName).toBe('OUTPUT');expect(output.textContent).toBe(arrived+' of '+total);}};
const guestRemove=(v,name)=>fireEvent.click(guestQuery(v).getByRole('button',{name:'Remove '+name,exact:true}));
const guestToggle=(v,name)=>fireEvent.click(guestQuery(v).getByRole('checkbox',{name,exact:true}));
const guestShow=(v,value)=>{const field=guestQuery(v).getByRole('combobox',{name:'Show',exact:true});if(field.value!==value)fireEvent.change(field,{target:{value}});};

test('the controlled Name input retains long literal text across parent renders',()=>{const v=render(<App/>);const field=guestInput(v),text='  <guest>& '+('x'.repeat(150))+'  ';fireEvent.change(field,{target:{value:text}});expect(field.value).toBe(text);field.value='external';v.rerender(<App/>);expect(guestInput(v).value).toBe(text);guestAdd(v,text);const row=guestRows(v)[0];if(GUEST_LEVEL===1)expect(row.textContent).toBe(text.trim());else if(GUEST_LEVEL>=3)expect(Boolean(guestQuery(v).getByRole('checkbox',{name:text.trim(),exact:true}))).toBe(true);else expect(guestWithin(row).getByRole('button',{name:'Remove '+text.trim(),exact:true}).textContent.trim()).toBe('Remove '+text.trim());expect(guestInput(v).value).toBe('');expect(v.container.querySelector('guest')).toBeNull();});
test('blank attempts leave existing guests unchanged and do not impose the later duplicate policy',()=>{const v=render(<App/>);guestCount(v,0,0);for(const blank of ['','   ','\\t\\n','\\u2003'])guestAdd(v,blank);expect(guestRows(v).length).toBe(0);guestAdd(v,'  Same Person  ');guestAdd(v,'Same Person');for(const blank of [' ','\\t'])guestAdd(v,blank);expect(guestRows(v).length).toBe(2);guestCount(v,2,0);if(GUEST_LEVEL===1)expect(guestRows(v).map(row=>row.textContent)).toEqual(['Same Person','Same Person']);});
test('mounted lists and fresh attempts retain separate input and guest state',()=>{const a=render(<App/>),b=render(<App/>);guestAdd(a,'First Person');fireEvent.change(guestInput(a),{target:{value:'Pending First'}});guestAdd(b,'Second Person');a.rerender(<App/>);expect(guestRows(a).length).toBe(1);expect(guestRows(b).length).toBe(1);expect(guestInput(a).value).toBe('Pending First');guestCount(a,1,0);guestCount(b,1,0);a.unmount();const fresh=render(<App/>);expect(guestInput(fresh).value).toBe('');expect(guestRows(fresh).length).toBe(0);guestCount(fresh,0,0);});
`,
"react-path-state-2": `const GUEST_LEVEL=2;

const guestWithin=container=>require('@testing-library/react').within(container);
const guestQuery=v=>guestWithin(v.container);
const guestInput=v=>guestQuery(v).getByRole('textbox',{name:'Name',exact:true});
const guestAdd=(v,text)=>{fireEvent.change(guestInput(v),{target:{value:text}});fireEvent.click(guestQuery(v).getByRole('button',{name:'Add',exact:true}));};
const guestRows=v=>guestQuery(v).queryAllByRole('listitem');
const guestCount=(v,total,arrived)=>{if(GUEST_LEVEL>=2){const output=guestQuery(v).getByLabelText('Guests');expect(output.tagName).toBe('OUTPUT');expect(output.textContent).toBe(String(total));}if(GUEST_LEVEL>=3){const output=guestQuery(v).getByLabelText('Arrived');expect(output.tagName).toBe('OUTPUT');expect(output.textContent).toBe(arrived+' of '+total);}};
const guestRemove=(v,name)=>fireEvent.click(guestQuery(v).getByRole('button',{name:'Remove '+name,exact:true}));
const guestToggle=(v,name)=>fireEvent.click(guestQuery(v).getByRole('checkbox',{name,exact:true}));
const guestShow=(v,value)=>{const field=guestQuery(v).getByRole('combobox',{name:'Show',exact:true});if(field.value!==value)fireEvent.change(field,{target:{value}});};

test('the controlled Name input retains long literal text across parent renders',()=>{const v=render(<App/>);const field=guestInput(v),text='  <guest>& '+('x'.repeat(150))+'  ';fireEvent.change(field,{target:{value:text}});expect(field.value).toBe(text);field.value='external';v.rerender(<App/>);expect(guestInput(v).value).toBe(text);guestAdd(v,text);const row=guestRows(v)[0];if(GUEST_LEVEL===1)expect(row.textContent).toBe(text.trim());else if(GUEST_LEVEL>=3)expect(Boolean(guestQuery(v).getByRole('checkbox',{name:text.trim(),exact:true}))).toBe(true);else expect(guestWithin(row).getByRole('button',{name:'Remove '+text.trim(),exact:true}).textContent.trim()).toBe('Remove '+text.trim());expect(guestInput(v).value).toBe('');expect(v.container.querySelector('guest')).toBeNull();});
test('blank attempts leave existing guests unchanged and do not impose the later duplicate policy',()=>{const v=render(<App/>);guestCount(v,0,0);for(const blank of ['','   ','\\t\\n','\\u2003'])guestAdd(v,blank);expect(guestRows(v).length).toBe(0);guestAdd(v,'  Same Person  ');guestAdd(v,'Same Person');for(const blank of [' ','\\t'])guestAdd(v,blank);expect(guestRows(v).length).toBe(2);guestCount(v,2,0);if(GUEST_LEVEL===1)expect(guestRows(v).map(row=>row.textContent)).toEqual(['Same Person','Same Person']);});
test('mounted lists and fresh attempts retain separate input and guest state',()=>{const a=render(<App/>),b=render(<App/>);guestAdd(a,'First Person');fireEvent.change(guestInput(a),{target:{value:'Pending First'}});guestAdd(b,'Second Person');a.rerender(<App/>);expect(guestRows(a).length).toBe(1);expect(guestRows(b).length).toBe(1);expect(guestInput(a).value).toBe('Pending First');guestCount(a,1,0);guestCount(b,1,0);a.unmount();const fresh=render(<App/>);expect(guestInput(fresh).value).toBe('');expect(guestRows(fresh).length).toBe(0);guestCount(fresh,0,0);});

test('removing one duplicate preserves the other guest and stable row identity',()=>{const v=render(<App/>);guestAdd(v,'Twin');guestAdd(v,'Middle');guestAdd(v,'Twin');const before=guestRows(v),first=before[0],last=before[2];fireEvent.click(guestWithin(before[1]).getByRole('button',{name:'Remove Middle',exact:true}));expect(guestRows(v).length).toBe(2);expect(guestRows(v)[0]).toBe(first);expect(guestRows(v)[1]).toBe(last);guestCount(v,2,0);fireEvent.click(guestWithin(last).getByRole('button',{name:'Remove Twin',exact:true}));expect(guestRows(v).length).toBe(1);expect(guestRows(v)[0]).toBe(first);guestAdd(v,'New Person');expect(guestRows(v)[0]).toBe(first);guestCount(v,2,0);guestRemove(v,'New Person');guestRemove(v,'Twin');expect(guestRows(v).length).toBe(0);guestCount(v,0,0);});
`,
"react-path-state-3": `const GUEST_LEVEL=3;

const guestWithin=container=>require('@testing-library/react').within(container);
const guestQuery=v=>guestWithin(v.container);
const guestInput=v=>guestQuery(v).getByRole('textbox',{name:'Name',exact:true});
const guestAdd=(v,text)=>{fireEvent.change(guestInput(v),{target:{value:text}});fireEvent.click(guestQuery(v).getByRole('button',{name:'Add',exact:true}));};
const guestRows=v=>guestQuery(v).queryAllByRole('listitem');
const guestCount=(v,total,arrived)=>{if(GUEST_LEVEL>=2){const output=guestQuery(v).getByLabelText('Guests');expect(output.tagName).toBe('OUTPUT');expect(output.textContent).toBe(String(total));}if(GUEST_LEVEL>=3){const output=guestQuery(v).getByLabelText('Arrived');expect(output.tagName).toBe('OUTPUT');expect(output.textContent).toBe(arrived+' of '+total);}};
const guestRemove=(v,name)=>fireEvent.click(guestQuery(v).getByRole('button',{name:'Remove '+name,exact:true}));
const guestToggle=(v,name)=>fireEvent.click(guestQuery(v).getByRole('checkbox',{name,exact:true}));
const guestShow=(v,value)=>{const field=guestQuery(v).getByRole('combobox',{name:'Show',exact:true});if(field.value!==value)fireEvent.change(field,{target:{value}});};

test('the controlled Name input retains long literal text across parent renders',()=>{const v=render(<App/>);const field=guestInput(v),text='  <guest>& '+('x'.repeat(150))+'  ';fireEvent.change(field,{target:{value:text}});expect(field.value).toBe(text);field.value='external';v.rerender(<App/>);expect(guestInput(v).value).toBe(text);guestAdd(v,text);const row=guestRows(v)[0];if(GUEST_LEVEL===1)expect(row.textContent).toBe(text.trim());else if(GUEST_LEVEL>=3)expect(Boolean(guestQuery(v).getByRole('checkbox',{name:text.trim(),exact:true}))).toBe(true);else expect(guestWithin(row).getByRole('button',{name:'Remove '+text.trim(),exact:true}).textContent.trim()).toBe('Remove '+text.trim());expect(guestInput(v).value).toBe('');expect(v.container.querySelector('guest')).toBeNull();});
test('blank attempts leave existing guests unchanged and do not impose the later duplicate policy',()=>{const v=render(<App/>);guestCount(v,0,0);for(const blank of ['','   ','\\t\\n','\\u2003'])guestAdd(v,blank);expect(guestRows(v).length).toBe(0);guestAdd(v,'  Same Person  ');guestAdd(v,'Same Person');for(const blank of [' ','\\t'])guestAdd(v,blank);expect(guestRows(v).length).toBe(2);guestCount(v,2,0);if(GUEST_LEVEL===1)expect(guestRows(v).map(row=>row.textContent)).toEqual(['Same Person','Same Person']);});
test('mounted lists and fresh attempts retain separate input and guest state',()=>{const a=render(<App/>),b=render(<App/>);guestAdd(a,'First Person');fireEvent.change(guestInput(a),{target:{value:'Pending First'}});guestAdd(b,'Second Person');a.rerender(<App/>);expect(guestRows(a).length).toBe(1);expect(guestRows(b).length).toBe(1);expect(guestInput(a).value).toBe('Pending First');guestCount(a,1,0);guestCount(b,1,0);a.unmount();const fresh=render(<App/>);expect(guestInput(fresh).value).toBe('');expect(guestRows(fresh).length).toBe(0);guestCount(fresh,0,0);});

test('removing one duplicate preserves the other guest and stable row identity',()=>{const v=render(<App/>);guestAdd(v,'Twin');guestAdd(v,'Middle');guestAdd(v,'Twin');const before=guestRows(v),first=before[0],last=before[2];fireEvent.click(guestWithin(before[1]).getByRole('button',{name:'Remove Middle',exact:true}));expect(guestRows(v).length).toBe(2);expect(guestRows(v)[0]).toBe(first);expect(guestRows(v)[1]).toBe(last);guestCount(v,2,0);fireEvent.click(guestWithin(last).getByRole('button',{name:'Remove Twin',exact:true}));expect(guestRows(v).length).toBe(1);expect(guestRows(v)[0]).toBe(first);guestAdd(v,'New Person');expect(guestRows(v)[0]).toBe(first);guestCount(v,2,0);guestRemove(v,'New Person');guestRemove(v,'Twin');expect(guestRows(v).length).toBe(0);guestCount(v,0,0);});

test('same-name guests toggle independently and all arrived counts exceed one correctly',()=>{const v=render(<App/>);guestAdd(v,'Twin');guestAdd(v,'Other');guestAdd(v,'Twin');const checkboxes=guestQuery(v).getAllByRole('checkbox',{name:'Twin',exact:true});fireEvent.click(checkboxes[1]);expect(checkboxes[0].checked).toBe(false);expect(checkboxes[1].checked).toBe(true);guestCount(v,3,1);guestToggle(v,'Other');fireEvent.click(checkboxes[0]);guestCount(v,3,3);fireEvent.click(checkboxes[1]);guestCount(v,3,2);guestRemove(v,'Other');guestCount(v,2,1);v.rerender(<App/>);guestCount(v,2,1);});
test('a sequence of arrivals and removals matches the whole-list state model',()=>{const v=render(<App/>);const names=['A Person','B Person','C Person','D Person','E Person'];const model=names.map(name=>({name,arrived:false}));names.forEach(name=>guestAdd(v,name));for(let i=0;i<35;i++){const row=model[(i*7+3)%model.length];guestToggle(v,row.name);row.arrived=!row.arrived;guestCount(v,model.length,model.filter(item=>item.arrived).length);for(const item of model)expect(guestQuery(v).getByRole('checkbox',{name:item.name,exact:true}).checked).toBe(item.arrived);}guestRemove(v,model[2].name);model.splice(2,1);guestCount(v,model.length,model.filter(item=>item.arrived).length);});
`,
"react-path-state-4": `const GUEST_LEVEL=4;

const guestWithin=container=>require('@testing-library/react').within(container);
const guestQuery=v=>guestWithin(v.container);
const guestInput=v=>guestQuery(v).getByRole('textbox',{name:'Name',exact:true});
const guestAdd=(v,text)=>{fireEvent.change(guestInput(v),{target:{value:text}});fireEvent.click(guestQuery(v).getByRole('button',{name:'Add',exact:true}));};
const guestRows=v=>guestQuery(v).queryAllByRole('listitem');
const guestCount=(v,total,arrived)=>{if(GUEST_LEVEL>=2){const output=guestQuery(v).getByLabelText('Guests');expect(output.tagName).toBe('OUTPUT');expect(output.textContent).toBe(String(total));}if(GUEST_LEVEL>=3){const output=guestQuery(v).getByLabelText('Arrived');expect(output.tagName).toBe('OUTPUT');expect(output.textContent).toBe(arrived+' of '+total);}};
const guestRemove=(v,name)=>fireEvent.click(guestQuery(v).getByRole('button',{name:'Remove '+name,exact:true}));
const guestToggle=(v,name)=>fireEvent.click(guestQuery(v).getByRole('checkbox',{name,exact:true}));
const guestShow=(v,value)=>{const field=guestQuery(v).getByRole('combobox',{name:'Show',exact:true});if(field.value!==value)fireEvent.change(field,{target:{value}});};

test('the controlled Name input retains long literal text across parent renders',()=>{const v=render(<App/>);const field=guestInput(v),text='  <guest>& '+('x'.repeat(150))+'  ';fireEvent.change(field,{target:{value:text}});expect(field.value).toBe(text);field.value='external';v.rerender(<App/>);expect(guestInput(v).value).toBe(text);guestAdd(v,text);const row=guestRows(v)[0];if(GUEST_LEVEL===1)expect(row.textContent).toBe(text.trim());else if(GUEST_LEVEL>=3)expect(Boolean(guestQuery(v).getByRole('checkbox',{name:text.trim(),exact:true}))).toBe(true);else expect(guestWithin(row).getByRole('button',{name:'Remove '+text.trim(),exact:true}).textContent.trim()).toBe('Remove '+text.trim());expect(guestInput(v).value).toBe('');expect(v.container.querySelector('guest')).toBeNull();});
test('blank attempts leave existing guests unchanged and do not impose the later duplicate policy',()=>{const v=render(<App/>);guestCount(v,0,0);for(const blank of ['','   ','\\t\\n','\\u2003'])guestAdd(v,blank);expect(guestRows(v).length).toBe(0);guestAdd(v,'  Same Person  ');guestAdd(v,'Same Person');for(const blank of [' ','\\t'])guestAdd(v,blank);expect(guestRows(v).length).toBe(2);guestCount(v,2,0);if(GUEST_LEVEL===1)expect(guestRows(v).map(row=>row.textContent)).toEqual(['Same Person','Same Person']);});
test('mounted lists and fresh attempts retain separate input and guest state',()=>{const a=render(<App/>),b=render(<App/>);guestAdd(a,'First Person');fireEvent.change(guestInput(a),{target:{value:'Pending First'}});guestAdd(b,'Second Person');a.rerender(<App/>);expect(guestRows(a).length).toBe(1);expect(guestRows(b).length).toBe(1);expect(guestInput(a).value).toBe('Pending First');guestCount(a,1,0);guestCount(b,1,0);a.unmount();const fresh=render(<App/>);expect(guestInput(fresh).value).toBe('');expect(guestRows(fresh).length).toBe(0);guestCount(fresh,0,0);});

test('removing one duplicate preserves the other guest and stable row identity',()=>{const v=render(<App/>);guestAdd(v,'Twin');guestAdd(v,'Middle');guestAdd(v,'Twin');const before=guestRows(v),first=before[0],last=before[2];fireEvent.click(guestWithin(before[1]).getByRole('button',{name:'Remove Middle',exact:true}));expect(guestRows(v).length).toBe(2);expect(guestRows(v)[0]).toBe(first);expect(guestRows(v)[1]).toBe(last);guestCount(v,2,0);fireEvent.click(guestWithin(last).getByRole('button',{name:'Remove Twin',exact:true}));expect(guestRows(v).length).toBe(1);expect(guestRows(v)[0]).toBe(first);guestAdd(v,'New Person');expect(guestRows(v)[0]).toBe(first);guestCount(v,2,0);guestRemove(v,'New Person');guestRemove(v,'Twin');expect(guestRows(v).length).toBe(0);guestCount(v,0,0);});

test('same-name guests toggle independently and all arrived counts exceed one correctly',()=>{const v=render(<App/>);guestAdd(v,'Twin');guestAdd(v,'Other');guestAdd(v,'Twin');const checkboxes=guestQuery(v).getAllByRole('checkbox',{name:'Twin',exact:true});fireEvent.click(checkboxes[1]);expect(checkboxes[0].checked).toBe(false);expect(checkboxes[1].checked).toBe(true);guestCount(v,3,1);guestToggle(v,'Other');fireEvent.click(checkboxes[0]);guestCount(v,3,3);fireEvent.click(checkboxes[1]);guestCount(v,3,2);guestRemove(v,'Other');guestCount(v,2,1);v.rerender(<App/>);guestCount(v,2,1);});
test('a sequence of arrivals and removals matches the whole-list state model',()=>{const v=render(<App/>);const names=['A Person','B Person','C Person','D Person','E Person'];const model=names.map(name=>({name,arrived:false}));names.forEach(name=>guestAdd(v,name));for(let i=0;i<35;i++){const row=model[(i*7+3)%model.length];guestToggle(v,row.name);row.arrived=!row.arrived;guestCount(v,model.length,model.filter(item=>item.arrived).length);for(const item of model)expect(guestQuery(v).getByRole('checkbox',{name:item.name,exact:true}).checked).toBe(item.arrived);}guestRemove(v,model[2].name);model.splice(2,1);guestCount(v,model.length,model.filter(item=>item.arrived).length);});

test('new guests are waiting even when added through an empty arrived view',()=>{const v=render(<App/>);expect(guestQuery(v).getByRole('combobox',{name:'Show',exact:true}).value).toBe('all');guestShow(v,'arrived');guestAdd(v,'New Person');expect(guestRows(v).length).toBe(0);guestCount(v,1,0);guestShow(v,'waiting');expect(guestRows(v).length).toBe(1);guestToggle(v,'New Person');expect(guestRows(v).length).toBe(0);guestCount(v,1,1);guestShow(v,'arrived');expect(guestRows(v).length).toBe(1);guestToggle(v,'New Person');expect(guestRows(v).length).toBe(0);guestCount(v,1,0);});
test('filtered removal keeps hidden guests and full-list counts and reacts to every update',()=>{const v=render(<App/>);for(const name of ['First Person','Second Person','Third Person'])guestAdd(v,name);guestToggle(v,'Second Person');guestShow(v,'arrived');guestRemove(v,'Second Person');expect(guestRows(v).length).toBe(0);guestCount(v,2,0);guestShow(v,'waiting');expect(guestRows(v).length).toBe(2);guestToggle(v,'Third Person');expect(guestRows(v).length).toBe(1);guestCount(v,2,1);guestRemove(v,'First Person');guestCount(v,1,1);guestShow(v,'all');expect(guestRows(v).length).toBe(1);expect(guestQuery(v).getByRole('checkbox',{name:'Third Person',exact:true}).checked).toBe(true);v.rerender(<App/>);guestCount(v,1,1);});
`,
};
for (const [id,cases] of Object.entries(GUEST_LIST_REVIEW_CASES)) {
  const solution=REACT_PATH_SOLUTIONS[id];
  solution.hiddenSuite=[solution.hiddenSuite,cases].filter(Boolean).join("\n\n");
}

// Duplicate handling and loading are audited per stage, without advancing later stages.
const GUEST_DUPLICATE_EFFECT_REVIEW_CASES: Record<string,string> = {
"react-path-state-5": `const GUEST_LEVEL=5;

const guestWithin=container=>require('@testing-library/react').within(container);
const guestQuery=v=>guestWithin(v.container);
const guestInput=v=>guestQuery(v).getByRole('textbox',{name:'Name',exact:true});
const guestAdd=(v,text)=>{fireEvent.change(guestInput(v),{target:{value:text}});fireEvent.click(guestQuery(v).getByRole('button',{name:'Add',exact:true}));};
const guestRows=v=>guestQuery(v).queryAllByRole('listitem');
const guestCount=(v,total,arrived)=>{if(GUEST_LEVEL>=2){const output=guestQuery(v).getByLabelText('Guests');expect(output.tagName).toBe('OUTPUT');expect(output.textContent).toBe(String(total));}if(GUEST_LEVEL>=3){const output=guestQuery(v).getByLabelText('Arrived');expect(output.tagName).toBe('OUTPUT');expect(output.textContent).toBe(arrived+' of '+total);}};
const guestRemove=(v,name)=>fireEvent.click(guestQuery(v).getByRole('button',{name:'Remove '+name,exact:true}));
const guestToggle=(v,name)=>fireEvent.click(guestQuery(v).getByRole('checkbox',{name,exact:true}));
const guestShow=(v,value)=>{const field=guestQuery(v).getByRole('combobox',{name:'Show',exact:true});if(field.value!==value)fireEvent.change(field,{target:{value}});};

const guestAlert=v=>guestQuery(v).queryAllByRole('alert').map(node=>node.textContent).join('');
test('duplicates are checked against the whole list even when the original row is hidden',()=>{const v=render(<App/>);guestAdd(v,'  First Person  ');guestToggle(v,'First Person');guestShow(v,'waiting');for(const text of ['FIRST PERSON','  first person  ','First Person']){guestAdd(v,text);expect(guestAlert(v)).toBe('Already on the list');expect(guestInput(v).value).toBe(text);guestCount(v,1,1);expect(guestRows(v).length).toBe(0);}guestAdd(v,'Second Person');expect(guestAlert(v)).toBe('');guestCount(v,2,1);guestShow(v,'all');expect(guestRows(v).length).toBe(2);});
test('only an equal normalized name is a duplicate and removing it makes the name available again',()=>{const v=render(<App/>);for(const text of ['Person Alpha','Person','Person Alpha Extra','Éva'])guestAdd(v,text);guestCount(v,4,0);guestAdd(v,' éVA ');expect(guestAlert(v)).toBe('Already on the list');guestCount(v,4,0);guestRemove(v,'Person Alpha');guestAdd(v,'  PERSON ALPHA  ');expect(guestAlert(v)).toBe('');guestCount(v,4,0);expect(Boolean(guestQuery(v).getByRole('checkbox',{name:'PERSON ALPHA',exact:true}))).toBe(true);});
test('a blank attempt adds nothing and leaves no alert after a duplicate rejection',()=>{const v=render(<App/>);guestAdd(v,'Person');for(const blank of [' ','\\t','\\u2003']){guestAdd(v,' person ');expect(guestAlert(v)).toBe('Already on the list');guestAdd(v,blank);expect(guestAlert(v)).toBe('');guestCount(v,1,0);}guestAdd(v,'New Person');expect(guestInput(v).value).toBe('');guestCount(v,2,0);});
test('duplicate state and filtered edits remain local to their mounted guest list',()=>{const a=render(<App/>),b=render(<App/>);guestAdd(a,'Shared Name');guestAdd(a,'SHARED NAME');expect(guestAlert(a)).toBe('Already on the list');guestAdd(b,'Shared Name');expect(guestAlert(b)).toBe('');guestToggle(a,'Shared Name');guestCount(a,1,1);guestCount(b,1,0);guestShow(a,'arrived');guestAdd(a,'New Person');expect(guestRows(a).length).toBe(1);guestCount(a,2,1);guestRemove(a,'Shared Name');guestShow(a,'all');guestCount(a,1,0);guestCount(b,1,0);a.rerender(<App/>);guestCount(a,1,0);a.unmount();const fresh=render(<App/>);guestCount(fresh,0,0);expect(guestAlert(fresh)).toBe('');});
`,
"react-path-effects-1": `
const fxRTL=require('@testing-library/react');
const fxQuery=v=>fxRTL.within(v.container);
const fxDeferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
const fxFlush=async callback=>{await fxRTL.act(async()=>{callback();await Promise.resolve();});};
const fxNames=v=>fxQuery(v).queryAllByRole('listitem').map(node=>node.textContent);
const fxLoading=v=>{expect(fxQuery(v).getByRole('status').textContent).toBe('Loading');expect(fxQuery(v).queryByText('No users',{exact:true})).toBeNull();expect(fxQuery(v).queryByText('No matches',{exact:true})).toBeNull();};
const fxAlert=v=>{const node=fxQuery(v).getByRole('alert'),copy=node.cloneNode(true);copy.querySelectorAll('button').forEach(button=>button.remove());expect(copy.textContent.trim()).toBe('Could not load users');};
const fxRetry=v=>fireEvent.click(fxQuery(v).getByRole('button',{name:'Retry',exact:true}));
const fxSearch=(v,text)=>fireEvent.change(fxQuery(v).getByRole('textbox',{name:'Search',exact:true}),{target:{value:text}});
const fxUsers=[{id:31,name:'<person>& Literal'},{id:107,name:'Second Person'},{id:203,name:'Third Person'},{id:404,name:'Fourth Person'}];

test('a deferred answer lists every arbitrary-id literal user without fixture filtering',async()=>{const pending=fxDeferred();let calls=0;const load=()=>{calls++;return pending.promise;};const v=render(<App loadUsers={load}/>);fxLoading(v);expect(calls).toBe(1);v.rerender(<App loadUsers={load}/>);expect(calls).toBe(1);await fxFlush(()=>pending.resolve(fxUsers));expect(fxNames(v)).toEqual(fxUsers.map(user=>user.name));expect(fxQuery(v).queryByRole('status')).toBeNull();expect(v.container.querySelector('person')).toBeNull();v.rerender(<App loadUsers={load}/>);expect(calls).toBe(1);});
test('empty completion removes Loading without inventing a matching or error state',async()=>{const pending=fxDeferred(),v=render(<App loadUsers={()=>pending.promise}/>);fxLoading(v);await fxFlush(()=>pending.resolve([]));expect(Boolean(fxQuery(v).getByText('No users',{exact:true}))).toBe(true);expect(fxQuery(v).queryByRole('status')).toBeNull();expect(fxQuery(v).queryByRole('alert')).toBeNull();expect(fxNames(v)).toEqual([]);expect(fxQuery(v).queryByText('No matches',{exact:true})).toBeNull();});
test('independent mounts own their answers and a fresh mount starts a new request',async()=>{const one=fxDeferred(),two=fxDeferred();let firstCalls=0,secondCalls=0;const first=()=>{firstCalls++;return one.promise;},second=()=>{secondCalls++;return two.promise;};const a=render(<App loadUsers={first}/>),b=render(<App loadUsers={second}/>);fxLoading(a);fxLoading(b);await fxFlush(()=>two.resolve([{id:90,name:'Second Root'}]));fxLoading(a);expect(fxNames(b)).toEqual(['Second Root']);await fxFlush(()=>one.resolve([{id:80,name:'First Root'}]));expect(fxNames(a)).toEqual(['First Root']);expect(fxNames(b)).toEqual(['Second Root']);a.rerender(<App loadUsers={first}/>);expect(firstCalls).toBe(1);a.unmount();const pending=fxDeferred();const fresh=render(<App loadUsers={()=>pending.promise}/>);fxLoading(fresh);await fxFlush(()=>pending.resolve([]));expect(fxNames(b)).toEqual(['Second Root']);expect(secondCalls).toBe(1);});
`,
"react-path-effects-2": `
const fxRTL=require('@testing-library/react');
const fxQuery=v=>fxRTL.within(v.container);
const fxDeferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
const fxFlush=async callback=>{await fxRTL.act(async()=>{callback();await Promise.resolve();});};
const fxNames=v=>fxQuery(v).queryAllByRole('listitem').map(node=>node.textContent);
const fxLoading=v=>{expect(fxQuery(v).getByRole('status').textContent).toBe('Loading');expect(fxQuery(v).queryByText('No users',{exact:true})).toBeNull();expect(fxQuery(v).queryByText('No matches',{exact:true})).toBeNull();};
const fxAlert=v=>{const node=fxQuery(v).getByRole('alert'),copy=node.cloneNode(true);copy.querySelectorAll('button').forEach(button=>button.remove());expect(copy.textContent.trim()).toBe('Could not load users');};
const fxRetry=v=>fireEvent.click(fxQuery(v).getByRole('button',{name:'Retry',exact:true}));
const fxSearch=(v,text)=>fireEvent.change(fxQuery(v).getByRole('textbox',{name:'Search',exact:true}),{target:{value:text}});
const fxUsers=[{id:31,name:'<person>& Literal'},{id:107,name:'Second Person'},{id:203,name:'Third Person'},{id:404,name:'Fourth Person'}];

test('a deferred answer lists every arbitrary-id literal user without fixture filtering',async()=>{const pending=fxDeferred();let calls=0;const load=()=>{calls++;return pending.promise;};const v=render(<App loadUsers={load}/>);fxLoading(v);expect(calls).toBe(1);v.rerender(<App loadUsers={load}/>);expect(calls).toBe(1);await fxFlush(()=>pending.resolve(fxUsers));expect(fxNames(v)).toEqual(fxUsers.map(user=>user.name));expect(fxQuery(v).queryByRole('status')).toBeNull();expect(v.container.querySelector('person')).toBeNull();v.rerender(<App loadUsers={load}/>);expect(calls).toBe(1);});
test('empty completion removes Loading without inventing a matching or error state',async()=>{const pending=fxDeferred(),v=render(<App loadUsers={()=>pending.promise}/>);fxLoading(v);await fxFlush(()=>pending.resolve([]));expect(Boolean(fxQuery(v).getByText('No users',{exact:true}))).toBe(true);expect(fxQuery(v).queryByRole('status')).toBeNull();expect(fxQuery(v).queryByRole('alert')).toBeNull();expect(fxNames(v)).toEqual([]);expect(fxQuery(v).queryByText('No matches',{exact:true})).toBeNull();});
test('independent mounts own their answers and a fresh mount starts a new request',async()=>{const one=fxDeferred(),two=fxDeferred();let firstCalls=0,secondCalls=0;const first=()=>{firstCalls++;return one.promise;},second=()=>{secondCalls++;return two.promise;};const a=render(<App loadUsers={first}/>),b=render(<App loadUsers={second}/>);fxLoading(a);fxLoading(b);await fxFlush(()=>two.resolve([{id:90,name:'Second Root'}]));fxLoading(a);expect(fxNames(b)).toEqual(['Second Root']);await fxFlush(()=>one.resolve([{id:80,name:'First Root'}]));expect(fxNames(a)).toEqual(['First Root']);expect(fxNames(b)).toEqual(['Second Root']);a.rerender(<App loadUsers={first}/>);expect(firstCalls).toBe(1);a.unmount();const pending=fxDeferred();const fresh=render(<App loadUsers={()=>pending.promise}/>);fxLoading(fresh);await fxFlush(()=>pending.resolve([]));expect(fxNames(b)).toEqual(['Second Root']);expect(secondCalls).toBe(1);});

test('multiple failed retries handle arbitrary rejection reasons and keep one request per attempt',async()=>{const attempts=[fxDeferred(),fxDeferred(),fxDeferred(),fxDeferred()];let calls=0;const loader=()=>attempts[calls++].promise,v=render(<App loadUsers={loader}/>);fxLoading(v);for(const reason of ['offline',null,{message:'unavailable'}]){const index=calls-1;await fxFlush(()=>attempts[index].reject(reason));fxAlert(v);expect(fxQuery(v).queryByRole('status')).toBeNull();expect(fxNames(v)).toEqual([]);v.rerender(<App loadUsers={loader}/>);expect(calls).toBe(index+1);fxRetry(v);expect(calls).toBe(index+2);fxLoading(v);expect(fxQuery(v).queryByRole('alert')).toBeNull();}await fxFlush(()=>attempts[3].resolve(fxUsers));expect(fxNames(v)).toEqual(fxUsers.map(user=>user.name));expect(fxQuery(v).queryByRole('alert')).toBeNull();expect(fxQuery(v).queryByRole('button',{name:'Retry',exact:true})).toBeNull();expect(calls).toBe(4);});
test('a retry that succeeds empty shows No users rather than the old error',async()=>{const first=fxDeferred(),last=fxDeferred();let calls=0;const v=render(<App loadUsers={()=>++calls===1?first.promise:last.promise}/>);await fxFlush(()=>first.reject(new Error('offline')));fxAlert(v);fxRetry(v);fxLoading(v);await fxFlush(()=>last.resolve([]));expect(Boolean(fxQuery(v).getByText('No users',{exact:true}))).toBe(true);expect(fxQuery(v).queryByRole('alert')).toBeNull();expect(calls).toBe(2);});
`,
"react-path-effects-3": `
const fxRTL=require('@testing-library/react');
const fxQuery=v=>fxRTL.within(v.container);
const fxDeferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
const fxFlush=async callback=>{await fxRTL.act(async()=>{callback();await Promise.resolve();});};
const fxNames=v=>fxQuery(v).queryAllByRole('listitem').map(node=>node.textContent);
const fxLoading=v=>{expect(fxQuery(v).getByRole('status').textContent).toBe('Loading');expect(fxQuery(v).queryByText('No users',{exact:true})).toBeNull();expect(fxQuery(v).queryByText('No matches',{exact:true})).toBeNull();};
const fxAlert=v=>{const node=fxQuery(v).getByRole('alert'),copy=node.cloneNode(true);copy.querySelectorAll('button').forEach(button=>button.remove());expect(copy.textContent.trim()).toBe('Could not load users');};
const fxRetry=v=>fireEvent.click(fxQuery(v).getByRole('button',{name:'Retry',exact:true}));
const fxSearch=(v,text)=>fireEvent.change(fxQuery(v).getByRole('textbox',{name:'Search',exact:true}),{target:{value:text}});
const fxUsers=[{id:31,name:'<person>& Literal'},{id:107,name:'Second Person'},{id:203,name:'Third Person'},{id:404,name:'Fourth Person'}];

test('a deferred answer lists every arbitrary-id literal user without fixture filtering',async()=>{const pending=fxDeferred();let calls=0;const load=()=>{calls++;return pending.promise;};const v=render(<App loadUsers={load}/>);fxLoading(v);expect(calls).toBe(1);v.rerender(<App loadUsers={load}/>);expect(calls).toBe(1);await fxFlush(()=>pending.resolve(fxUsers));expect(fxNames(v)).toEqual(fxUsers.map(user=>user.name));expect(fxQuery(v).queryByRole('status')).toBeNull();expect(v.container.querySelector('person')).toBeNull();v.rerender(<App loadUsers={load}/>);expect(calls).toBe(1);});
test('empty completion removes Loading without inventing a matching or error state',async()=>{const pending=fxDeferred(),v=render(<App loadUsers={()=>pending.promise}/>);fxLoading(v);await fxFlush(()=>pending.resolve([]));expect(Boolean(fxQuery(v).getByText('No users',{exact:true}))).toBe(true);expect(fxQuery(v).queryByRole('status')).toBeNull();expect(fxQuery(v).queryByRole('alert')).toBeNull();expect(fxNames(v)).toEqual([]);expect(fxQuery(v).queryByText('No matches',{exact:true})).toBeNull();});
test('independent mounts own their answers and a fresh mount starts a new request',async()=>{const one=fxDeferred(),two=fxDeferred();let firstCalls=0,secondCalls=0;const first=()=>{firstCalls++;return one.promise;},second=()=>{secondCalls++;return two.promise;};const a=render(<App loadUsers={first}/>),b=render(<App loadUsers={second}/>);fxLoading(a);fxLoading(b);await fxFlush(()=>two.resolve([{id:90,name:'Second Root'}]));fxLoading(a);expect(fxNames(b)).toEqual(['Second Root']);await fxFlush(()=>one.resolve([{id:80,name:'First Root'}]));expect(fxNames(a)).toEqual(['First Root']);expect(fxNames(b)).toEqual(['Second Root']);a.rerender(<App loadUsers={first}/>);expect(firstCalls).toBe(1);a.unmount();const pending=fxDeferred();const fresh=render(<App loadUsers={()=>pending.promise}/>);fxLoading(fresh);await fxFlush(()=>pending.resolve([]));expect(fxNames(b)).toEqual(['Second Root']);expect(secondCalls).toBe(1);});

test('multiple failed retries handle arbitrary rejection reasons and keep one request per attempt',async()=>{const attempts=[fxDeferred(),fxDeferred(),fxDeferred(),fxDeferred()];let calls=0;const loader=()=>attempts[calls++].promise,v=render(<App loadUsers={loader}/>);fxLoading(v);for(const reason of ['offline',null,{message:'unavailable'}]){const index=calls-1;await fxFlush(()=>attempts[index].reject(reason));fxAlert(v);expect(fxQuery(v).queryByRole('status')).toBeNull();expect(fxNames(v)).toEqual([]);v.rerender(<App loadUsers={loader}/>);expect(calls).toBe(index+1);fxRetry(v);expect(calls).toBe(index+2);fxLoading(v);expect(fxQuery(v).queryByRole('alert')).toBeNull();}await fxFlush(()=>attempts[3].resolve(fxUsers));expect(fxNames(v)).toEqual(fxUsers.map(user=>user.name));expect(fxQuery(v).queryByRole('alert')).toBeNull();expect(fxQuery(v).queryByRole('button',{name:'Retry',exact:true})).toBeNull();expect(calls).toBe(4);});
test('a retry that succeeds empty shows No users rather than the old error',async()=>{const first=fxDeferred(),last=fxDeferred();let calls=0;const v=render(<App loadUsers={()=>++calls===1?first.promise:last.promise}/>);await fxFlush(()=>first.reject(new Error('offline')));fxAlert(v);fxRetry(v);fxLoading(v);await fxFlush(()=>last.resolve([]));expect(Boolean(fxQuery(v).getByText('No users',{exact:true}))).toBe(true);expect(fxQuery(v).queryByRole('alert')).toBeNull();expect(calls).toBe(2);});

test('search keeps the complete trimmed case-insensitive substring without refetching',async()=>{const rows=[{id:77,name:'Person Ready'},{id:89,name:'Person Resting'},{id:102,name:'Performer'},{id:200,name:'Éva Shark'}];let calls=0;const loader=()=>{calls++;return Promise.resolve(rows);};const v=render(<App loadUsers={loader}/>);await fxQuery(v).findByText('Person Ready',{},soon);for(const needle of ['ready','  SON REA  ','ÉVA','not anywhere','']){fxSearch(v,needle);const expected=rows.filter(row=>row.name.toLowerCase().includes(needle.trim().toLowerCase())).map(row=>row.name);expect(fxNames(v)).toEqual(expected);expect(Boolean(fxQuery(v).queryByText('No matches',{exact:true}))).toBe(expected.length===0);expect(fxQuery(v).queryByText('No users',{exact:true})).toBeNull();expect(calls).toBe(1);}v.rerender(<App loadUsers={loader}/>);expect(calls).toBe(1);});
test('a query entered during Loading applies to the later answer without an extra request',async()=>{const pending=fxDeferred();let calls=0;const v=render(<App loadUsers={()=>{calls++;return pending.promise;}}/>);fxSearch(v,'  third  ');fxLoading(v);expect(calls).toBe(1);await fxFlush(()=>pending.resolve(fxUsers));expect(fxNames(v)).toEqual(['Third Person']);fxSearch(v,'literal');expect(fxNames(v)).toEqual(['<person>& Literal']);expect(calls).toBe(1);});
`,
"react-path-effects-4": `
const fxRTL=require('@testing-library/react');
const fxQuery=v=>fxRTL.within(v.container);
const fxDeferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
const fxFlush=async callback=>{await fxRTL.act(async()=>{callback();await Promise.resolve();});};
const fxNames=v=>fxQuery(v).queryAllByRole('listitem').map(node=>node.textContent);
const fxLoading=v=>{expect(fxQuery(v).getByRole('status').textContent).toBe('Loading');expect(fxQuery(v).queryByText('No users',{exact:true})).toBeNull();expect(fxQuery(v).queryByText('No matches',{exact:true})).toBeNull();};
const fxAlert=v=>{const node=fxQuery(v).getByRole('alert'),copy=node.cloneNode(true);copy.querySelectorAll('button').forEach(button=>button.remove());expect(copy.textContent.trim()).toBe('Could not load users');};
const fxRetry=v=>fireEvent.click(fxQuery(v).getByRole('button',{name:'Retry',exact:true}));
const fxSearch=(v,text)=>fireEvent.change(fxQuery(v).getByRole('textbox',{name:'Search',exact:true}),{target:{value:text}});
const fxUsers=[{id:31,name:'<person>& Literal'},{id:107,name:'Second Person'},{id:203,name:'Third Person'},{id:404,name:'Fourth Person'}];

test('a deferred answer lists every arbitrary-id literal user without fixture filtering',async()=>{const pending=fxDeferred();let calls=0;const load=()=>{calls++;return pending.promise;};const v=render(<App loadUsers={load}/>);fxLoading(v);expect(calls).toBe(1);v.rerender(<App loadUsers={load}/>);expect(calls).toBe(1);await fxFlush(()=>pending.resolve(fxUsers));expect(fxNames(v)).toEqual(fxUsers.map(user=>user.name));expect(fxQuery(v).queryByRole('status')).toBeNull();expect(v.container.querySelector('person')).toBeNull();v.rerender(<App loadUsers={load}/>);expect(calls).toBe(1);});
test('empty completion removes Loading without inventing a matching or error state',async()=>{const pending=fxDeferred(),v=render(<App loadUsers={()=>pending.promise}/>);fxLoading(v);await fxFlush(()=>pending.resolve([]));expect(Boolean(fxQuery(v).getByText('No users',{exact:true}))).toBe(true);expect(fxQuery(v).queryByRole('status')).toBeNull();expect(fxQuery(v).queryByRole('alert')).toBeNull();expect(fxNames(v)).toEqual([]);expect(fxQuery(v).queryByText('No matches',{exact:true})).toBeNull();});
test('independent mounts own their answers and a fresh mount starts a new request',async()=>{const one=fxDeferred(),two=fxDeferred();let firstCalls=0,secondCalls=0;const first=()=>{firstCalls++;return one.promise;},second=()=>{secondCalls++;return two.promise;};const a=render(<App loadUsers={first}/>),b=render(<App loadUsers={second}/>);fxLoading(a);fxLoading(b);await fxFlush(()=>two.resolve([{id:90,name:'Second Root'}]));fxLoading(a);expect(fxNames(b)).toEqual(['Second Root']);await fxFlush(()=>one.resolve([{id:80,name:'First Root'}]));expect(fxNames(a)).toEqual(['First Root']);expect(fxNames(b)).toEqual(['Second Root']);a.rerender(<App loadUsers={first}/>);expect(firstCalls).toBe(1);a.unmount();const pending=fxDeferred();const fresh=render(<App loadUsers={()=>pending.promise}/>);fxLoading(fresh);await fxFlush(()=>pending.resolve([]));expect(fxNames(b)).toEqual(['Second Root']);expect(secondCalls).toBe(1);});

test('multiple failed retries handle arbitrary rejection reasons and keep one request per attempt',async()=>{const attempts=[fxDeferred(),fxDeferred(),fxDeferred(),fxDeferred()];let calls=0;const loader=()=>attempts[calls++].promise,v=render(<App loadUsers={loader}/>);fxLoading(v);for(const reason of ['offline',null,{message:'unavailable'}]){const index=calls-1;await fxFlush(()=>attempts[index].reject(reason));fxAlert(v);expect(fxQuery(v).queryByRole('status')).toBeNull();expect(fxNames(v)).toEqual([]);v.rerender(<App loadUsers={loader}/>);expect(calls).toBe(index+1);fxRetry(v);expect(calls).toBe(index+2);fxLoading(v);expect(fxQuery(v).queryByRole('alert')).toBeNull();}await fxFlush(()=>attempts[3].resolve(fxUsers));expect(fxNames(v)).toEqual(fxUsers.map(user=>user.name));expect(fxQuery(v).queryByRole('alert')).toBeNull();expect(fxQuery(v).queryByRole('button',{name:'Retry',exact:true})).toBeNull();expect(calls).toBe(4);});
test('a retry that succeeds empty shows No users rather than the old error',async()=>{const first=fxDeferred(),last=fxDeferred();let calls=0;const v=render(<App loadUsers={()=>++calls===1?first.promise:last.promise}/>);await fxFlush(()=>first.reject(new Error('offline')));fxAlert(v);fxRetry(v);fxLoading(v);await fxFlush(()=>last.resolve([]));expect(Boolean(fxQuery(v).getByText('No users',{exact:true}))).toBe(true);expect(fxQuery(v).queryByRole('alert')).toBeNull();expect(calls).toBe(2);});

test('search keeps the complete trimmed case-insensitive substring without refetching',async()=>{const rows=[{id:77,name:'Person Ready'},{id:89,name:'Person Resting'},{id:102,name:'Performer'},{id:200,name:'Éva Shark'}];let calls=0;const loader=()=>{calls++;return Promise.resolve(rows);};const v=render(<App loadUsers={loader}/>);await fxQuery(v).findByText('Person Ready',{},soon);for(const needle of ['ready','  SON REA  ','ÉVA','not anywhere','']){fxSearch(v,needle);const expected=rows.filter(row=>row.name.toLowerCase().includes(needle.trim().toLowerCase())).map(row=>row.name);expect(fxNames(v)).toEqual(expected);expect(Boolean(fxQuery(v).queryByText('No matches',{exact:true}))).toBe(expected.length===0);expect(fxQuery(v).queryByText('No users',{exact:true})).toBeNull();expect(calls).toBe(1);}v.rerender(<App loadUsers={loader}/>);expect(calls).toBe(1);});
test('a query entered during Loading applies to the later answer without an extra request',async()=>{const pending=fxDeferred();let calls=0;const v=render(<App loadUsers={()=>{calls++;return pending.promise;}}/>);fxSearch(v,'  third  ');fxLoading(v);expect(calls).toBe(1);await fxFlush(()=>pending.resolve(fxUsers));expect(fxNames(v)).toEqual(['Third Person']);fxSearch(v,'literal');expect(fxNames(v)).toEqual(['<person>& Literal']);expect(calls).toBe(1);});

test('three changing loaders ignore the middle late success and first late failure',async()=>{const requests=[fxDeferred(),fxDeferred(),fxDeferred()];const calls=[0,0,0],loaders=requests.map((request,index)=>()=>{calls[index]++;return request.promise;});const v=render(<App loadUsers={loaders[0]}/>);fxLoading(v);v.rerender(<App loadUsers={loaders[1]}/>);fxLoading(v);v.rerender(<App loadUsers={loaders[2]}/>);fxLoading(v);await fxFlush(()=>requests[2].resolve([{id:99,name:'Latest Team'}]));expect(fxNames(v)).toEqual(['Latest Team']);await fxFlush(()=>requests[1].resolve([{id:45,name:'Obsolete Middle'}]));expect(fxNames(v)).toEqual(['Latest Team']);await fxFlush(()=>requests[0].reject(new Error('obsolete first')));expect(fxNames(v)).toEqual(['Latest Team']);expect(fxQuery(v).queryByRole('alert')).toBeNull();v.rerender(<App loadUsers={loaders[2]}/>);expect(calls).toEqual([1,1,1]);});
test('an obsolete empty success cannot replace a newer loaded list or filtered view',async()=>{const old=fxDeferred(),current=fxDeferred(),v=render(<App loadUsers={()=>old.promise}/>);const loader=()=>current.promise;v.rerender(<App loadUsers={loader}/>);fxLoading(v);await fxFlush(()=>current.resolve(fxUsers));fxSearch(v,'third');expect(fxNames(v)).toEqual(['Third Person']);await fxFlush(()=>old.resolve([]));expect(fxNames(v)).toEqual(['Third Person']);expect(fxQuery(v).queryByText('No users',{exact:true})).toBeNull();expect(fxQuery(v).getByRole('textbox',{name:'Search',exact:true}).value).toBe('third');});
`,
};
for (const [id,cases] of Object.entries(GUEST_DUPLICATE_EFFECT_REVIEW_CASES)) {
  const solution=REACT_PATH_SOLUTIONS[id];
  solution.hiddenSuite=[solution.hiddenSuite,cases].filter(Boolean).join("\n\n");
}
