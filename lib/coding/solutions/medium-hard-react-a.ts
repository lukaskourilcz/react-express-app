// Server-only reference solutions and hidden cases for
// lib/coding/tasks/medium-hard-react-a.ts. Never import from client code.
// Each `hiddenSuite` is test blocks only: the server appends it to the visible
// suite (lib/coding/react-hidden.ts), so it uses that suite's imports and
// helpers. The hidden cases aim at the shortcut each visible suite leaves
// open: an index for a key, a timer or listener left behind, a handler read
// once, a copy that was not made, and the edge the technique exists for.

import type { CodingSolution } from '../types';

/** A hidden case that watches one kind of timer on both globals a component
 * may call, and checks that every timer of that delay was cleared by the time
 * the page closed. Waits of other lengths (Testing Library's own) are left
 * alone. */
const timersClearedOnUnmount = (name: string, delay: number, act: string): string => `test(${JSON.stringify(name)}, () => {
  const hosts = [globalThis, window];
  const real = hosts.map(host => [host.setTimeout, host.setInterval, host.clearTimeout, host.clearInterval]);
  const started = [];
  const cleared = [];
  hosts.forEach((host, index) => {
    const [setT, setI, clearT, clearI] = real[index];
    host.setTimeout = (callback, ms, ...rest) => { const id = setT.call(host, callback, ms, ...rest); if (ms === ${delay}) started.push(id); return id; };
    host.setInterval = (callback, ms, ...rest) => { const id = setI.call(host, callback, ms, ...rest); if (ms === ${delay}) started.push(id); return id; };
    host.clearTimeout = id => { cleared.push(id); return clearT.call(host, id); };
    host.clearInterval = id => { cleared.push(id); return clearI.call(host, id); };
  });
  try {
    const { unmount } = render(<App />);
${act}
    unmount();
    expect(started.length > 0).toBe(true);
    expect(started.every(id => cleared.includes(id))).toBe(true);
  } finally {
    hosts.forEach((host, index) => {
      [host.setTimeout, host.setInterval, host.clearTimeout, host.clearInterval] = real[index];
    });
  }
});`;

export const MEDIUM_HARD_REACT_A_SOLUTIONS: Record<string, CodingSolution> = {
  /* ── Medium ───────────────────────────────────────────────────────── */
  'react-mh-basket-context': {
    solution: `import React, { createContext, useContext, useMemo, useReducer } from 'react';

const PRODUCTS = [
  { id: 'tea', name: 'Tea' },
  { id: 'cake', name: 'Cake' },
  { id: 'jam', name: 'Jam' },
];

// A pure function: the same lines and action always give the same answer.
export const basketReducer = (lines, action) => {
  switch (action.type) {
    case 'add': {
      const { id, name } = action.product;
      if (lines.some((line) => line.id === id)) {
        // A new array, and a new object for the line that changed.
        return lines.map((line) => (line.id === id ? { ...line, quantity: line.quantity + 1 } : line));
      }
      return [...lines, { id, name, quantity: 1 }];
    }
    case 'remove':
      return lines
        .map((line) => (line.id === action.id ? { ...line, quantity: line.quantity - 1 } : line))
        .filter((line) => line.quantity > 0);
    default:
      // Nothing changed, and the same array tells React so.
      return lines;
  }
};

// null by default: useContext gives null only when no provider is above.
const BasketContext = createContext(null);

export const BasketProvider = ({ children }) => {
  const [lines, dispatch] = useReducer(basketReducer, []);
  // A new value only when the lines change, so the consumers re-render only then.
  const value = useMemo(() => ({
    lines,
    add: (product) => dispatch({ type: 'add', product }),
    remove: (id) => dispatch({ type: 'remove', id }),
  }), [lines]);
  return <BasketContext.Provider value={value}>{children}</BasketContext.Provider>;
};

export const useBasket = () => {
  const basket = useContext(BasketContext);
  if (basket === null) throw new Error('useBasket must be used inside BasketProvider');
  return basket;
};

const BasketBadge = () => {
  const { lines } = useBasket();
  // Items, not lines: two teas count as two.
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  return <p>Basket ({count})</p>;
};

const ProductList = () => {
  const { add } = useBasket();
  return <ul aria-label="Products">
    {PRODUCTS.map((product) => (
      <li key={product.id}>
        {product.name} <button type="button" onClick={() => add(product)}>Add {product.name}</button>
      </li>
    ))}
  </ul>;
};

const BasketLines = () => {
  const { lines, add, remove } = useBasket();
  if (lines.length === 0) return <p>Your basket is empty</p>;
  return <ul aria-label="Basket">
    {lines.map((line) => (
      <li key={line.id}>
        <span>{line.name} × {line.quantity}</span>
        <button type="button" onClick={() => remove(line.id)}>Remove one {line.name}</button>
        <button type="button" onClick={() => add(line)}>Add one {line.name}</button>
      </li>
    ))}
  </ul>;
};

const App = () => (
  <BasketProvider>
    <header><BasketBadge /></header>
    <main>
      <h2>Shop</h2>
      <ProductList />
      <BasketLines />
    </main>
  </BasketProvider>
);

export default App;`,
    junior: `import React, { createContext, useContext, useReducer } from 'react';

const PRODUCTS = [
  { id: 'tea', name: 'Tea' },
  { id: 'cake', name: 'Cake' },
  { id: 'jam', name: 'Jam' },
];

export const basketReducer = (lines, action) => {
  if (action.type === 'add') {
    const product = action.product;
    let found = false;
    const next = [];
    for (const line of lines) {
      if (line.id === product.id) {
        next.push({ id: line.id, name: line.name, quantity: line.quantity + 1 });
        found = true;
      } else {
        next.push(line);
      }
    }
    if (!found) {
      next.push({ id: product.id, name: product.name, quantity: 1 });
    }
    return next;
  }
  if (action.type === 'remove') {
    const next = [];
    for (const line of lines) {
      if (line.id === action.id) {
        if (line.quantity > 1) {
          next.push({ id: line.id, name: line.name, quantity: line.quantity - 1 });
        }
      } else {
        next.push(line);
      }
    }
    return next;
  }
  return lines;
};

const BasketContext = createContext(null);

export const BasketProvider = ({ children }) => {
  const [lines, dispatch] = useReducer(basketReducer, []);

  const add = (product) => {
    dispatch({ type: 'add', product: product });
  };

  const remove = (id) => {
    dispatch({ type: 'remove', id: id });
  };

  return (
    <BasketContext.Provider value={{ lines: lines, add: add, remove: remove }}>
      {children}
    </BasketContext.Provider>
  );
};

export const useBasket = () => {
  const basket = useContext(BasketContext);
  if (basket === null) {
    throw new Error('useBasket must be used inside BasketProvider');
  }
  return basket;
};

const BasketBadge = () => {
  const { lines } = useBasket();
  let count = 0;
  for (const line of lines) {
    count = count + line.quantity;
  }
  return <p>Basket ({count})</p>;
};

const ProductList = () => {
  const { add } = useBasket();
  return (
    <ul aria-label="Products">
      {PRODUCTS.map((product) => (
        <li key={product.id}>
          {product.name} <button type="button" onClick={() => add(product)}>Add {product.name}</button>
        </li>
      ))}
    </ul>
  );
};

const BasketLines = () => {
  const { lines, add, remove } = useBasket();
  if (lines.length === 0) {
    return <p>Your basket is empty</p>;
  }
  return (
    <ul aria-label="Basket">
      {lines.map((line) => (
        <li key={line.id}>
          <span>{line.name + ' × ' + line.quantity}</span>
          <button type="button" onClick={() => remove(line.id)}>{'Remove one ' + line.name}</button>
          <button type="button" onClick={() => add({ id: line.id, name: line.name })}>{'Add one ' + line.name}</button>
        </li>
      ))}
    </ul>
  );
};

const App = () => {
  return (
    <BasketProvider>
      <header>
        <BasketBadge />
      </header>
      <main>
        <h2>Shop</h2>
        <ProductList />
        <BasketLines />
      </main>
    </BasketProvider>
  );
};

export default App;`,
    senior: `import React, { createContext, useContext, useMemo, useReducer } from 'react';

const PRODUCTS = [
  { id: 'tea', name: 'Tea' },
  { id: 'cake', name: 'Cake' },
  { id: 'jam', name: 'Jam' },
];

const withQuantity = (line, change) => ({ ...line, quantity: line.quantity + change });

const HANDLERS = {
  add: (lines, { product: { id, name } }) =>
    lines.some((line) => line.id === id)
      ? lines.map((line) => (line.id === id ? withQuantity(line, 1) : line))
      : [...lines, { id, name, quantity: 1 }],
  remove: (lines, { id }) =>
    lines.flatMap((line) => (line.id !== id ? [line] : line.quantity > 1 ? [withQuantity(line, -1)] : [])),
};

export const basketReducer = (lines, action) =>
  Object.hasOwn(HANDLERS, action.type) ? HANDLERS[action.type](lines, action) : lines;

const BasketContext = createContext(null);

export const BasketProvider = ({ children }) => {
  const [lines, dispatch] = useReducer(basketReducer, []);
  const actions = useMemo(() => ({
    add: (product) => dispatch({ type: 'add', product }),
    remove: (id) => dispatch({ type: 'remove', id }),
  }), []);
  const value = useMemo(() => ({ lines, ...actions }), [lines, actions]);
  return <BasketContext.Provider value={value}>{children}</BasketContext.Provider>;
};

export const useBasket = () => {
  const basket = useContext(BasketContext);
  if (!basket) throw new Error('useBasket must be used inside BasketProvider');
  return basket;
};

const BasketBadge = () => {
  const { lines } = useBasket();
  return <p>Basket ({lines.reduce((sum, { quantity }) => sum + quantity, 0)})</p>;
};

const ProductList = () => {
  const { add } = useBasket();
  return (
    <ul aria-label="Products">
      {PRODUCTS.map((product) => (
        <li key={product.id}>
          {product.name} <button type="button" onClick={() => add(product)}>Add {product.name}</button>
        </li>
      ))}
    </ul>
  );
};

const BasketLine = ({ line }) => {
  const { add, remove } = useBasket();
  return (
    <li>
      <span>{line.name} × {line.quantity}</span>
      <button type="button" onClick={() => remove(line.id)}>Remove one {line.name}</button>
      <button type="button" onClick={() => add(line)}>Add one {line.name}</button>
    </li>
  );
};

const BasketLines = () => {
  const { lines } = useBasket();
  return lines.length === 0
    ? <p>Your basket is empty</p>
    : <ul aria-label="Basket">{lines.map((line) => <BasketLine key={line.id} line={line} />)}</ul>;
};

const App = () => (
  <BasketProvider>
    <header><BasketBadge /></header>
    <main>
      <h2>Shop</h2>
      <ProductList />
      <BasketLines />
    </main>
  </BasketProvider>
);

export default App;`,
    hiddenSuite: `test('an action it does not know gives back the very same array', () => {
  const current = [{ id: 'tea', name: 'Tea', quantity: 1 }];
  expect(basketReducer(current, { type: 'clear-all' }) === current).toBe(true);
});

test('remove gives new arrays and leaves the old lines alone', () => {
  const before = Object.freeze([Object.freeze({ id: 'tea', name: 'Tea', quantity: 2 }), Object.freeze({ id: 'jam', name: 'Jam', quantity: 1 })]);
  expect(basketReducer(before, { type: 'remove', id: 'tea' })).toEqual([{ id: 'tea', name: 'Tea', quantity: 1 }, { id: 'jam', name: 'Jam', quantity: 1 }]);
  expect(basketReducer(before, { type: 'remove', id: 'jam' })).toEqual([{ id: 'tea', name: 'Tea', quantity: 2 }]);
  expect(before[0].quantity).toBe(2);
});

test('two providers keep two baskets', () => {
  const Probe = ({ label }) => {
    const { lines, add } = useBasket();
    return <div>
      <button type="button" onClick={() => add({ id: 'tea', name: 'Tea' })}>{label}</button>
      <output aria-label={label + ' count'}>{lines.length}</output>
    </div>;
  };
  render(<div><BasketProvider><Probe label="left" /></BasketProvider><BasketProvider><Probe label="right" /></BasketProvider></div>);
  fireEvent.click(screen.getByRole('button', { name: 'left' }));
  expect(screen.getByLabelText('left count').textContent).toBe('1');
  expect(screen.getByLabelText('right count').textContent).toBe('0');
});

test('Add one in the basket adds to its line and keeps the order', () => {
  render(<App />);
  press('Add Tea');
  press('Add Cake');
  press('Add one Tea');
  expect(lines()).toEqual(['Tea × 2', 'Cake × 1']);
  expect(screen.getByText('Basket (3)')).toBeTruthy();
});

test('a line that comes back goes on the end', () => {
  render(<App />);
  press('Add Tea');
  press('Add Cake');
  press('Remove one Tea');
  press('Add Tea');
  expect(lines()).toEqual(['Cake × 1', 'Tea × 1']);
});`,
  },
  'react-mh-load-more': {
    solution: `import React, { useEffect, useState } from 'react';

const PAGE_SIZE = 3;

const App = () => {
  const [photos, setPhotos] = useState([]);
  // The last page on screen: the next request asks for page + 1.
  const [page, setPage] = useState(0);
  // One value decides what shows under the list: 'loading', 'ready', 'error' or 'done'.
  const [status, setStatus] = useState('loading');

  const load = (number) => {
    setStatus('loading');
    fetch('/api/photos?page=' + number)
      .then((response) => response.json())
      .then((next) => {
        // The updater form appends to whatever is on screen when the answer arrives.
        setPhotos((shown) => [...shown, ...next]);
        setPage(number);
        // A short page is the last one.
        setStatus(next.length < PAGE_SIZE ? 'done' : 'ready');
      })
      .catch(() => setStatus('error'));
  };

  useEffect(() => {
    load(1);
  }, []);

  return <main>
    <h2>Photos</h2>
    <ul>
      {photos.map((photo) => <li key={photo.id}>{photo.title}</li>)}
    </ul>
    {status === 'error' && <p role="alert">Could not load photos</p>}
    {status === 'done' ? (
      <p>That’s everything</p>
    ) : (
      // Disabled while loading, so a second click cannot send a second request.
      <button type="button" disabled={status === 'loading'} onClick={() => load(page + 1)}>
        {status === 'loading' ? 'Loading…' : status === 'error' ? 'Try again' : 'Load more'}
      </button>
    )}
  </main>;
};

export default App;`,
    junior: `import React, { useEffect, useState } from 'react';

const PAGE_SIZE = 3;

const App = () => {
  const [photos, setPhotos] = useState([]);
  const [lastPage, setLastPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [finished, setFinished] = useState(false);

  const loadPage = async (number) => {
    setLoading(true);
    setFailed(false);
    try {
      const response = await fetch('/api/photos?page=' + number);
      const newPhotos = await response.json();
      setPhotos((oldPhotos) => [...oldPhotos, ...newPhotos]);
      setLastPage(number);
      if (newPhotos.length < PAGE_SIZE) {
        setFinished(true);
      }
    } catch (error) {
      setFailed(true);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPage(1);
  }, []);

  let buttonText = 'Load more';
  if (loading) {
    buttonText = 'Loading…';
  } else if (failed) {
    buttonText = 'Try again';
  }

  return (
    <main>
      <h2>Photos</h2>
      <ul>
        {photos.map((photo) => (
          <li key={photo.id}>{photo.title}</li>
        ))}
      </ul>
      {failed && !loading && <p role="alert">Could not load photos</p>}
      {finished && <p>That’s everything</p>}
      {!finished && (
        <button type="button" disabled={loading} onClick={() => loadPage(lastPage + 1)}>
          {buttonText}
        </button>
      )}
    </main>
  );
};

export default App;`,
    senior: `import React, { useCallback, useEffect, useReducer } from 'react';

const PAGE_SIZE = 3;
const LABELS = { loading: 'Loading…', ready: 'Load more', error: 'Try again' };

const reducer = (state, action) => {
  switch (action.type) {
    case 'request':
      return { ...state, status: 'loading' };
    case 'page':
      return {
        photos: [...state.photos, ...action.photos],
        page: action.page,
        status: action.photos.length < PAGE_SIZE ? 'done' : 'ready',
      };
    case 'failure':
      return { ...state, status: 'error' };
    default:
      return state;
  }
};

const App = () => {
  const [{ photos, page, status }, dispatch] = useReducer(reducer, { photos: [], page: 0, status: 'loading' });

  const load = useCallback(async (number) => {
    dispatch({ type: 'request' });
    try {
      const response = await fetch('/api/photos?page=' + number);
      if (!response.ok) throw new Error('HTTP ' + response.status);
      dispatch({ type: 'page', page: number, photos: await response.json() });
    } catch {
      dispatch({ type: 'failure' });
    }
  }, []);

  useEffect(() => {
    load(1);
  }, [load]);

  return (
    <main>
      <h2>Photos</h2>
      <ul>
        {photos.map(({ id, title }) => <li key={id}>{title}</li>)}
      </ul>
      {status === 'error' && <p role="alert">Could not load photos</p>}
      {status === 'done'
        ? <p>That’s everything</p>
        : (
          <button type="button" disabled={status === 'loading'} onClick={() => load(page + 1)}>
            {LABELS[status]}
          </button>
        )}
    </main>
  );
};

export default App;`,
    hiddenSuite: `test('an empty first page says that is everything', () => withFetch(async calls => {
  render(<App />);
  await act(async () => { calls[0].respond([]); });
  expect(titles()).toEqual([]);
  expect(screen.getByText('That’s everything')).toBeTruthy();
  expect(screen.queryByRole('button')).toBeNull();
}));

test('a click while loading asks nothing more', () => withFetch(async calls => {
  render(<App />);
  await act(async () => { calls[0].respond(photos(1, 3)); });
  press('Load more');
  fireEvent.click(screen.getByRole('button', { name: 'Loading…' }));
  expect(calls).toHaveLength(2);
}));

test('after a retry that works, Load more asks for the page after it', () => withFetch(async calls => {
  render(<App />);
  await act(async () => { calls[0].respond(photos(1, 3)); });
  press('Load more');
  await act(async () => { calls[1].fail(new TypeError('Failed to fetch')); });
  press('Try again');
  await act(async () => { calls[2].respond(photos(4, 3)); });
  expect(titles()).toHaveLength(6);
  press('Load more');
  expect(calls[3].url).toBe('/api/photos?page=3');
}));

test('a failed first page can be tried again', () => withFetch(async calls => {
  render(<App />);
  await act(async () => { calls[0].fail(new TypeError('Failed to fetch')); });
  expect(screen.getByRole('alert').textContent).toBe('Could not load photos');
  press('Try again');
  expect(calls[1].url).toBe('/api/photos?page=1');
  await act(async () => { calls[1].respond(photos(1, 2)); });
  expect(titles()).toEqual(['Photo 1', 'Photo 2']);
  expect(screen.getByText('That’s everything')).toBeTruthy();
}));

test('a full page keeps the button until an empty one ends the list', () => withFetch(async calls => {
  render(<App />);
  await act(async () => { calls[0].respond(photos(1, 3)); });
  press('Load more');
  await act(async () => { calls[1].respond(photos(4, 3)); });
  press('Load more');
  expect(calls[2].url).toBe('/api/photos?page=3');
  await act(async () => { calls[2].respond([]); });
  expect(titles()).toHaveLength(6);
  expect(screen.getByText('That’s everything')).toBeTruthy();
}));`,
  },
  'react-mh-sortable-table': {
    solution: `import React, { useState } from 'react';

export const PLAYERS = [
  { name: 'Mia', team: 'Reds', goals: 7 },
  { name: 'Ali', team: 'Blues', goals: 12 },
  { name: 'Zoe', team: 'Reds', goals: 7 },
  { name: 'Ben', team: 'Greens', goals: 3 },
];

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'team', label: 'Team' },
  { key: 'goals', label: 'Goals' },
];

const compare = (a, b, key) =>
  typeof a[key] === 'number' ? a[key] - b[key] : a[key].localeCompare(b[key]);

const App = () => {
  // Only the choice is state: { key, direction }, or null before the first click.
  const [sort, setSort] = useState(null);

  const choose = (key) => {
    setSort((current) => (current && current.key === key
      ? { key, direction: current.direction === 'ascending' ? 'descending' : 'ascending' }
      : { key, direction: 'ascending' }));
  };

  // Worked out while rendering, from a copy, so PLAYERS keeps its order. Flipping
  // the comparison, not reversing the list, keeps tied rows in PLAYERS order both ways.
  const rows = sort === null
    ? PLAYERS
    : [...PLAYERS].sort((a, b) => (sort.direction === 'ascending' ? 1 : -1) * compare(a, b, sort.key));

  return <table>
    <caption>Top scorers</caption>
    <thead>
      <tr>
        {COLUMNS.map((column) => (
          // undefined leaves the attribute out, so only the sorted header has aria-sort.
          <th key={column.key} scope="col" aria-sort={sort && sort.key === column.key ? sort.direction : undefined}>
            <button type="button" onClick={() => choose(column.key)}>{column.label}</button>
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {rows.map((player) => (
        <tr key={player.name}>
          <td>{player.name}</td>
          <td>{player.team}</td>
          <td>{player.goals}</td>
        </tr>
      ))}
    </tbody>
  </table>;
};

export default App;`,
    junior: `import React, { useState } from 'react';

export const PLAYERS = [
  { name: 'Mia', team: 'Reds', goals: 7 },
  { name: 'Ali', team: 'Blues', goals: 12 },
  { name: 'Zoe', team: 'Reds', goals: 7 },
  { name: 'Ben', team: 'Greens', goals: 3 },
];

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'team', label: 'Team' },
  { key: 'goals', label: 'Goals' },
];

const App = () => {
  const [sortKey, setSortKey] = useState('');
  const [ascending, setAscending] = useState(true);

  const clickHeader = (key) => {
    if (key === sortKey) {
      setAscending(!ascending);
    } else {
      setSortKey(key);
      setAscending(true);
    }
  };

  let rows = PLAYERS;
  if (sortKey !== '') {
    rows = [...PLAYERS];
    rows.sort((a, b) => {
      let result = 0;
      if (sortKey === 'goals') {
        result = a.goals - b.goals;
      } else {
        result = a[sortKey].localeCompare(b[sortKey]);
      }
      if (!ascending) {
        result = -result;
      }
      return result;
    });
  }

  const ariaSortFor = (key) => {
    if (key !== sortKey) {
      return undefined;
    }
    if (ascending) {
      return 'ascending';
    }
    return 'descending';
  };

  return (
    <table>
      <caption>Top scorers</caption>
      <thead>
        <tr>
          {COLUMNS.map((column) => (
            <th key={column.key} scope="col" aria-sort={ariaSortFor(column.key)}>
              <button type="button" onClick={() => clickHeader(column.key)}>{column.label}</button>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((player) => (
          <tr key={player.name}>
            <td>{player.name}</td>
            <td>{player.team}</td>
            <td>{player.goals}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default App;`,
    senior: `import React, { useMemo, useState } from 'react';

export const PLAYERS = [
  { name: 'Mia', team: 'Reds', goals: 7 },
  { name: 'Ali', team: 'Blues', goals: 12 },
  { name: 'Zoe', team: 'Reds', goals: 7 },
  { name: 'Ben', team: 'Greens', goals: 3 },
];

const COLUMNS = [
  { key: 'name', label: 'Name', compare: (a, b) => a.localeCompare(b) },
  { key: 'team', label: 'Team', compare: (a, b) => a.localeCompare(b) },
  { key: 'goals', label: 'Goals', compare: (a, b) => a - b },
];

const SIGN = { ascending: 1, descending: -1 };
const next = (sort, key) =>
  sort?.key === key && sort.direction === 'ascending' ? { key, direction: 'descending' } : { key, direction: 'ascending' };

const App = () => {
  const [sort, setSort] = useState(null);

  const rows = useMemo(() => {
    if (!sort) return PLAYERS;
    const { compare } = COLUMNS.find((column) => column.key === sort.key);
    return PLAYERS.toSorted((a, b) => SIGN[sort.direction] * compare(a[sort.key], b[sort.key]));
  }, [sort]);

  return (
    <table>
      <caption>Top scorers</caption>
      <thead>
        <tr>
          {COLUMNS.map(({ key, label }) => (
            <th key={key} scope="col" aria-sort={sort?.key === key ? sort.direction : undefined}>
              <button type="button" onClick={() => setSort((current) => next(current, key))}>{label}</button>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(({ name, team, goals }) => (
          <tr key={name}>
            <td>{name}</td>
            <td>{team}</td>
            <td>{goals}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default App;`,
    hiddenSuite: `test('PLAYERS keeps its order after sorting', () => {
  render(<App />);
  sortBy('Goals');
  sortBy('Name');
  sortBy('Name');
  expect(PLAYERS.map(player => player.name)).toEqual(['Mia', 'Ali', 'Zoe', 'Ben']);
});

test('a third click sorts ascending again', () => {
  render(<App />);
  sortBy('Goals');
  sortBy('Goals');
  sortBy('Goals');
  expect(names()).toEqual(['Ben', 'Mia', 'Zoe', 'Ali']);
  expect(heading('Goals').getAttribute('aria-sort')).toBe('ascending');
});

test('descending by team keeps tied rows in PLAYERS order', () => {
  render(<App />);
  sortBy('Team');
  sortBy('Team');
  expect(names()).toEqual(['Mia', 'Zoe', 'Ben', 'Ali']);
});

test('a new column starts ascending even after a descending one', () => {
  render(<App />);
  sortBy('Goals');
  sortBy('Goals');
  sortBy('Team');
  expect(names()).toEqual(['Ali', 'Ben', 'Mia', 'Zoe']);
  expect(heading('Team').getAttribute('aria-sort')).toBe('ascending');
  expect(heading('Goals').getAttribute('aria-sort')).toBeNull();
});

test('each row keeps its own team and goals', () => {
  render(<App />);
  sortBy('Goals');
  const cells = screen.getAllByRole('row').slice(1).map(row => [...row.cells].map(cell => cell.textContent));
  expect(cells).toEqual([['Ben', 'Greens', '3'], ['Mia', 'Reds', '7'], ['Zoe', 'Reds', '7'], ['Ali', 'Blues', '12']]);
});`,
  },
  'react-mh-notices': {
    solution: `import React, { useEffect, useRef, useState } from 'react';

const LIFETIME_MS = 300;
const MAX_NOTICES = 3;

// One instance per notice. Its effect starts one timer, and its cleanup clears
// that timer when the notice leaves: timed out, dismissed or pushed out.
const Notice = ({ text, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, LIFETIME_MS);
    return () => clearTimeout(timer);
  }, []);
  return <li>
    <span>{text}</span> <button type="button" aria-label={'Dismiss ' + text} onClick={onClose}>×</button>
  </li>;
};

const App = () => {
  const [notices, setNotices] = useState([]);
  // A counter in a ref: every notice gets an id no other notice has had.
  const nextId = useRef(1);

  const notify = (text) => {
    const notice = { id: nextId.current++, text };
    // The newest three stay; a fourth pushes the oldest out.
    setNotices((current) => [...current, notice].slice(-MAX_NOTICES));
  };

  const dismiss = (id) => {
    setNotices((current) => current.filter((notice) => notice.id !== id));
  };

  return <main>
    <h2>Notices</h2>
    <button type="button" onClick={() => notify('Saved')}>Save</button>
    <button type="button" onClick={() => notify('Deleted')}>Delete</button>
    <div role="status">
      <ul>
        {/* The id as the key keeps each Notice instance, and its timer, with its own notice. */}
        {notices.map((notice) => (
          <Notice key={notice.id} text={notice.text} onClose={() => dismiss(notice.id)} />
        ))}
      </ul>
    </div>
  </main>;
};

export default App;`,
    junior: `import React, { useEffect, useRef, useState } from 'react';

const Notice = ({ id, text, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, 300);
    return () => {
      clearTimeout(timer);
    };
  }, []);

  return (
    <li>
      <span>{text}</span>
      <button type="button" aria-label={'Dismiss ' + text} onClick={() => onClose(id)}>×</button>
    </li>
  );
};

const App = () => {
  const [notices, setNotices] = useState([]);
  const counter = useRef(0);

  const notify = (text) => {
    counter.current = counter.current + 1;
    const newNotice = { id: counter.current, text: text };
    setNotices((oldNotices) => {
      const all = [...oldNotices, newNotice];
      if (all.length > 3) {
        return all.slice(all.length - 3);
      }
      return all;
    });
  };

  const removeNotice = (id) => {
    setNotices((oldNotices) => oldNotices.filter((notice) => notice.id !== id));
  };

  return (
    <main>
      <h2>Notices</h2>
      <button type="button" onClick={() => notify('Saved')}>Save</button>
      <button type="button" onClick={() => notify('Deleted')}>Delete</button>
      <div role="status">
        <ul>
          {notices.map((notice) => (
            <Notice key={notice.id} id={notice.id} text={notice.text} onClose={removeNotice} />
          ))}
        </ul>
      </div>
    </main>
  );
};

export default App;`,
    senior: `import React, { useCallback, useEffect, useRef, useState } from 'react';

const LIFETIME_MS = 300;
const MAX_NOTICES = 3;

const useTimeout = (callback, delay) => {
  const latest = useRef(callback);
  latest.current = callback;
  useEffect(() => {
    const timer = setTimeout(() => latest.current(), delay);
    return () => clearTimeout(timer);
  }, [delay]);
};

const Notice = ({ notice, onClose }) => {
  const close = () => onClose(notice.id);
  useTimeout(close, LIFETIME_MS);
  return (
    <li>
      <span>{notice.text}</span> <button type="button" aria-label={'Dismiss ' + notice.text} onClick={close}>×</button>
    </li>
  );
};

const App = () => {
  const [notices, setNotices] = useState([]);
  const nextId = useRef(1);

  const notify = (text) => {
    const id = nextId.current++;
    setNotices((current) => [...current, { id, text }].slice(-MAX_NOTICES));
  };
  const dismiss = useCallback((id) => setNotices((current) => current.filter((notice) => notice.id !== id)), []);

  return (
    <main>
      <h2>Notices</h2>
      <button type="button" onClick={() => notify('Saved')}>Save</button>
      <button type="button" onClick={() => notify('Deleted')}>Delete</button>
      <div role="status">
        <ul>
          {notices.map((notice) => <Notice key={notice.id} notice={notice} onClose={dismiss} />)}
        </ul>
      </div>
    </main>
  );
};

export default App;`,
    // On the hand-moved clock of the visible suite: with real timers a pause
    // of 60 ms let the newer notice leave before the check that expects it.
    hiddenSuite: `test('dismissing one notice leaves the timers of the others running', () => withClock(async clock => {
  render(<App />);
  press('Save');
  await clock.tick(120);
  press('Delete');
  press('Dismiss Saved');
  await clock.tick(240);
  expect(texts()).toEqual(['Deleted']);
  await clock.tick(150);
  expect(texts()).toEqual([]);
}));

test('a notice pushed out early takes no newer notice with it', () => withClock(async clock => {
  render(<App />);
  press('Save');
  press('Save');
  press('Save');
  press('Save');
  await clock.tick(120);
  press('Delete');
  expect(texts()).toEqual(['Saved', 'Saved', 'Deleted']);
  await clock.tick(240);
  expect(texts()).toEqual(['Deleted']);
  await clock.tick(150);
  expect(texts()).toEqual([]);
}));

test('the status region is there before any notice', () => {
  render(<App />);
  expect(screen.getByRole('status').querySelectorAll('li')).toHaveLength(0);
});

${timersClearedOnUnmount('leaving the page clears every waiting notice timer', 300, `    press('Save');
    press('Delete');`)}`,
  },
  'react-mh-tag-input': {
    solution: `import React, { useState } from 'react';

const App = () => {
  const [text, setText] = useState('');
  const [tags, setTags] = useState([]);

  const add = () => {
    const tag = text.trim().toLowerCase();
    if (tag !== '' && !tags.includes(tag)) setTags([...tags, tag]);
    // Cleared either way, so a blank or repeated tag does not linger.
    setText('');
  };

  const remove = (index) => {
    // splice changes the array it is called on, so it works on a copy.
    const next = [...tags];
    next.splice(index, 1);
    setTags(next);
  };

  const keyDown = (event) => {
    if (event.key === 'Enter' || event.key === ',') {
      // Before the browser acts on the key: no form submit, and no comma in the field.
      event.preventDefault();
      add();
    } else if (event.key === 'Backspace' && text === '' && tags.length > 0) {
      remove(tags.length - 1);
    }
  };

  return <main>
    <h2>A tag input</h2>
    <label>Tags <input value={text} onChange={(event) => setText(event.target.value)} onKeyDown={keyDown} /></label>
    <ul aria-label="Tags chosen">
      {tags.map((tag, index) => (
        <li key={tag}>
          <span>{tag}</span>
          {/* The visible × says nothing to a screen reader; the label says which tag goes. */}
          <button type="button" aria-label={'Remove tag ' + tag} onClick={() => remove(index)}>×</button>
        </li>
      ))}
    </ul>
  </main>;
};

export default App;`,
    junior: `import React, { useState } from 'react';

const App = () => {
  const [text, setText] = useState('');
  const [tags, setTags] = useState([]);

  const addTag = () => {
    const newTag = text.trim().toLowerCase();
    let alreadyThere = false;
    for (const tag of tags) {
      if (tag === newTag) {
        alreadyThere = true;
      }
    }
    if (newTag !== '' && !alreadyThere) {
      const copy = [...tags];
      copy.push(newTag);
      setTags(copy);
    }
    setText('');
  };

  const removeTag = (index) => {
    const copy = [...tags];
    copy.splice(index, 1);
    setTags(copy);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addTag();
    }
    if (event.key === ',') {
      event.preventDefault();
      addTag();
    }
    if (event.key === 'Backspace') {
      if (text === '' && tags.length > 0) {
        removeTag(tags.length - 1);
      }
    }
  };

  return (
    <main>
      <h2>A tag input</h2>
      <label>
        Tags <input value={text} onChange={(event) => setText(event.target.value)} onKeyDown={handleKeyDown} />
      </label>
      <ul aria-label="Tags chosen">
        {tags.map((tag, index) => (
          <li key={tag}>
            <span>{tag}</span>
            <button type="button" aria-label={'Remove tag ' + tag} onClick={() => removeTag(index)}>×</button>
          </li>
        ))}
      </ul>
    </main>
  );
};

export default App;`,
    senior: `import React, { useState } from 'react';

const ADD_KEYS = new Set(['Enter', ',']);

const withoutIndex = (list, index) => {
  const copy = [...list];
  copy.splice(index, 1);
  return copy;
};

const App = () => {
  const [text, setText] = useState('');
  const [tags, setTags] = useState([]);

  const onKeyDown = (event) => {
    if (ADD_KEYS.has(event.key)) {
      event.preventDefault();
      const tag = text.trim().toLowerCase();
      if (tag && !tags.includes(tag)) setTags((current) => [...current, tag]);
      setText('');
    } else if (event.key === 'Backspace' && !text && tags.length) {
      setTags((current) => withoutIndex(current, current.length - 1));
    }
  };

  return (
    <main>
      <h2>A tag input</h2>
      <label>Tags <input value={text} onChange={(event) => setText(event.target.value)} onKeyDown={onKeyDown} /></label>
      <ul aria-label="Tags chosen">
        {tags.map((tag, index) => (
          <li key={tag}>
            <span>{tag}</span>
            <button type="button" aria-label={\`Remove tag \${tag}\`} onClick={() => setTags((current) => withoutIndex(current, index))}>×</button>
          </li>
        ))}
      </ul>
    </main>
  );
};

export default App;`,
    hiddenSuite: `test('Backspace with text in the field removes no tag', () => {
  render(<App />);
  add('a');
  type('b');
  key('Backspace');
  expect(tags()).toEqual(['a']);
});

test('Backspace with no tags does nothing', () => {
  render(<App />);
  key('Backspace');
  expect(tags()).toEqual([]);
});

test('other keys are left to the browser', () => {
  render(<App />);
  type('x');
  expect(fireEvent.keyDown(field(), { key: 'x' })).toBe(true);
  expect(tags()).toEqual([]);
  expect(field().value).toBe('x');
});

test('a comma is prevented too', () => {
  render(<App />);
  type('css');
  expect(fireEvent.keyDown(field(), { key: ',' })).toBe(false);
  expect(tags()).toEqual(['css']);
});

test('removing from either end keeps the rest in order', () => {
  render(<App />);
  ['a', 'b', 'c', 'd'].forEach(add);
  fireEvent.click(screen.getByRole('button', { name: 'Remove tag a' }));
  fireEvent.click(screen.getByRole('button', { name: 'Remove tag d' }));
  expect(tags()).toEqual(['b', 'c']);
});`,
  },
  'react-mh-select-all': {
    solution: `import React, { useEffect, useRef, useState } from 'react';

const MESSAGES = [
  { id: 1, subject: 'Lunch on Friday' },
  { id: 2, subject: 'Invoice 1042' },
  { id: 3, subject: 'Your parcel is on its way' },
  { id: 4, subject: 'Team photos' },
];

const App = () => {
  const [messages, setMessages] = useState(MESSAGES);
  const [selected, setSelected] = useState([]);
  const allRef = useRef(null);

  // Worked out on every render, counting only messages that still exist.
  const count = messages.filter((message) => selected.includes(message.id)).length;
  const all = messages.length > 0 && count === messages.length;
  const some = count > 0 && !all;

  // indeterminate is a DOM property with no attribute and no React prop,
  // so it is set on the node itself once the render is on the page.
  useEffect(() => {
    allRef.current.indeterminate = some;
  }, [some]);

  const toggle = (id) => {
    setSelected(selected.includes(id) ? selected.filter((one) => one !== id) : [...selected, id]);
  };

  const toggleAll = () => {
    setSelected(all ? [] : messages.map((message) => message.id));
  };

  const removeSelected = () => {
    setMessages(messages.filter((message) => !selected.includes(message.id)));
    setSelected([]);
  };

  return <main>
    <h2>Inbox</h2>
    <label>
      <input type="checkbox" ref={allRef} checked={all} disabled={messages.length === 0} onChange={toggleAll} /> Select all
    </label>
    <button type="button" disabled={count === 0} onClick={removeSelected}>Delete selected ({count})</button>
    <ul>
      {messages.map((message) => (
        <li key={message.id}>
          <label>
            <input type="checkbox" checked={selected.includes(message.id)} onChange={() => toggle(message.id)} /> {message.subject}
          </label>
        </li>
      ))}
    </ul>
  </main>;
};

export default App;`,
    junior: `import React, { useEffect, useRef, useState } from 'react';

const MESSAGES = [
  { id: 1, subject: 'Lunch on Friday' },
  { id: 2, subject: 'Invoice 1042' },
  { id: 3, subject: 'Your parcel is on its way' },
  { id: 4, subject: 'Team photos' },
];

const App = () => {
  const [messages, setMessages] = useState(MESSAGES);
  const [selected, setSelected] = useState([]);
  const selectAllBox = useRef(null);

  let selectedCount = 0;
  for (const message of messages) {
    if (selected.includes(message.id)) {
      selectedCount = selectedCount + 1;
    }
  }
  const allSelected = messages.length > 0 && selectedCount === messages.length;
  const someSelected = selectedCount > 0 && selectedCount < messages.length;

  useEffect(() => {
    if (selectAllBox.current) {
      selectAllBox.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const toggle = (id) => {
    if (selected.includes(id)) {
      setSelected(selected.filter((one) => one !== id));
    } else {
      setSelected([...selected, id]);
    }
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelected([]);
    } else {
      const ids = [];
      for (const message of messages) {
        ids.push(message.id);
      }
      setSelected(ids);
    }
  };

  const deleteSelected = () => {
    const kept = [];
    for (const message of messages) {
      if (!selected.includes(message.id)) {
        kept.push(message);
      }
    }
    setMessages(kept);
    setSelected([]);
  };

  return (
    <main>
      <h2>Inbox</h2>
      <label>
        <input
          type="checkbox"
          ref={selectAllBox}
          checked={allSelected}
          disabled={messages.length === 0}
          onChange={toggleAll}
        /> Select all
      </label>
      <button type="button" disabled={selectedCount === 0} onClick={deleteSelected}>
        {'Delete selected (' + selectedCount + ')'}
      </button>
      <ul>
        {messages.map((message) => (
          <li key={message.id}>
            <label>
              <input type="checkbox" checked={selected.includes(message.id)} onChange={() => toggle(message.id)} /> {message.subject}
            </label>
          </li>
        ))}
      </ul>
    </main>
  );
};

export default App;`,
    senior: `import React, { useEffect, useRef, useState } from 'react';

const MESSAGES = [
  { id: 1, subject: 'Lunch on Friday' },
  { id: 2, subject: 'Invoice 1042' },
  { id: 3, subject: 'Your parcel is on its way' },
  { id: 4, subject: 'Team photos' },
];

const TriStateCheckbox = ({ state, label, ...props }) => {
  const ref = useRef(null);
  useEffect(() => {
    ref.current.indeterminate = state === 'some';
  }, [state]);
  return (
    <label>
      <input type="checkbox" ref={ref} checked={state === 'all'} {...props} /> {label}
    </label>
  );
};

const App = () => {
  const [messages, setMessages] = useState(MESSAGES);
  const [selected, setSelected] = useState(() => new Set());

  const chosen = messages.filter(({ id }) => selected.has(id));
  const state = chosen.length === 0 ? 'none' : chosen.length === messages.length ? 'all' : 'some';

  const toggle = (id) => setSelected((current) => {
    const next = new Set(current);
    if (!next.delete(id)) next.add(id);
    return next;
  });
  const toggleAll = () => setSelected(state === 'all' ? new Set() : new Set(messages.map(({ id }) => id)));
  const removeSelected = () => {
    setMessages((current) => current.filter(({ id }) => !selected.has(id)));
    setSelected(new Set());
  };

  return (
    <main>
      <h2>Inbox</h2>
      <TriStateCheckbox label="Select all" state={state} disabled={messages.length === 0} onChange={toggleAll} />
      <button type="button" disabled={chosen.length === 0} onClick={removeSelected}>Delete selected ({chosen.length})</button>
      <ul>
        {messages.map(({ id, subject }) => (
          <li key={id}>
            <label>
              <input type="checkbox" checked={selected.has(id)} onChange={() => toggle(id)} /> {subject}
            </label>
          </li>
        ))}
      </ul>
    </main>
  );
};

export default App;`,
    hiddenSuite: `test('deleting every message leaves Select all unchecked and disabled', () => {
  render(<App />);
  fireEvent.click(all());
  fireEvent.click(deleteButton());
  expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  expect(all().checked).toBe(false);
  expect(all().indeterminate).toBe(false);
  expect(all().disabled).toBe(true);
  expect(deleteButton().disabled).toBe(true);
});

test('clearing the last selected message turns indeterminate off', () => {
  render(<App />);
  fireEvent.click(box('Team photos'));
  fireEvent.click(box('Team photos'));
  expect(all().indeterminate).toBe(false);
  expect(all().checked).toBe(false);
});

test('the count follows the selection', () => {
  render(<App />);
  fireEvent.click(box('Lunch on Friday'));
  fireEvent.click(box('Invoice 1042'));
  fireEvent.click(box('Team photos'));
  expect(deleteButton().textContent).toBe('Delete selected (3)');
  expect(all().indeterminate).toBe(true);
});

test('a deleted message is not counted afterwards', () => {
  render(<App />);
  fireEvent.click(box('Invoice 1042'));
  fireEvent.click(deleteButton());
  fireEvent.click(box('Team photos'));
  expect(deleteButton().textContent).toBe('Delete selected (1)');
});

test('Select all after a delete selects only what is left', () => {
  render(<App />);
  fireEvent.click(box('Invoice 1042'));
  fireEvent.click(deleteButton());
  fireEvent.click(all());
  expect(deleteButton().textContent).toBe('Delete selected (3)');
  expect(all().checked).toBe(true);
});`,
  },
  'react-mh-use-shortcut': {
    solution: `import React, { useEffect, useRef, useState } from 'react';

const TYPING = ['INPUT', 'TEXTAREA', 'SELECT'];

export const useShortcut = (key, handler) => {
  // Updated on every render, so the listener always calls the newest handler,
  // with the newest state in it, without being added again.
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const onKeyDown = (event) => {
      // A key typed into a field belongs to the field.
      if (TYPING.includes(event.target.tagName)) return;
      if (event.key === key) handlerRef.current(event);
    };
    window.addEventListener('keydown', onKeyDown);
    // The same function, so removeEventListener finds it.
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [key]); // once per key, not once per render
};

const App = () => {
  const [count, setCount] = useState(0);
  const searchRef = useRef(null);

  useShortcut('/', (event) => {
    event.preventDefault();
    searchRef.current.focus();
  });
  useShortcut('n', () => setCount(count + 1));

  return <main>
    <h2>Notes</h2>
    <label>Search <input ref={searchRef} /></label>
    <p>New notes: {count}</p>
  </main>;
};

export default App;`,
    junior: `import React, { useEffect, useRef, useState } from 'react';

export const useShortcut = (key, handler) => {
  const savedHandler = useRef(handler);
  savedHandler.current = handler;

  useEffect(() => {
    const listener = (event) => {
      const tag = event.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        return;
      }
      if (event.key !== key) {
        return;
      }
      savedHandler.current(event);
    };

    window.addEventListener('keydown', listener);

    return () => {
      window.removeEventListener('keydown', listener);
    };
  }, [key]);
};

const App = () => {
  const [count, setCount] = useState(0);
  const searchRef = useRef(null);

  useShortcut('/', (event) => {
    event.preventDefault();
    searchRef.current.focus();
  });
  useShortcut('n', () => setCount(count + 1));

  return (
    <main>
      <h2>Notes</h2>
      <label>Search <input ref={searchRef} /></label>
      <p>New notes: {count}</p>
    </main>
  );
};

export default App;`,
    senior: `import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

const isTyping = (target) => target instanceof Element && target.matches('input, textarea, select');

export const useShortcut = (key, handler) => {
  const handlerRef = useRef(handler);
  useLayoutEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    const controller = new AbortController();
    window.addEventListener('keydown', (event) => {
      if (event.key === key && !isTyping(event.target)) handlerRef.current(event);
    }, { signal: controller.signal });
    return () => controller.abort();
  }, [key]);
};

const App = () => {
  const [count, setCount] = useState(0);
  const searchRef = useRef(null);

  useShortcut('/', (event) => {
    event.preventDefault();
    searchRef.current?.focus();
  });
  useShortcut('n', () => setCount(count + 1));

  return (
    <main>
      <h2>Notes</h2>
      <label>Search <input ref={searchRef} /></label>
      <p>New notes: {count}</p>
    </main>
  );
};

export default App;`,
    hiddenSuite: `test('leaving the page removes the listener', () => {
  const realAdd = window.addEventListener;
  const realRemove = window.removeEventListener;
  const added = [];
  const removed = [];
  window.addEventListener = function (type, listener, options) {
    if (type === 'keydown') added.push({ listener, options });
    return realAdd.call(this, type, listener, options);
  };
  window.removeEventListener = function (type, listener, options) {
    if (type === 'keydown') removed.push(listener);
    return realRemove.call(this, type, listener, options);
  };
  try {
    let calls = 0;
    const Probe = () => {
      useShortcut('q', () => { calls += 1; });
      return <p>probe</p>;
    };
    const { unmount } = render(<Probe />);
    expect(added.length > 0).toBe(true);
    unmount();
    press('q');
    expect(calls).toBe(0);
    expect(added.every(one => removed.includes(one.listener) || Boolean(one.options && one.options.signal && one.options.signal.aborted))).toBe(true);
  } finally {
    window.addEventListener = realAdd;
    window.removeEventListener = realRemove;
  }
});

test('the listener is added once per key, not after every render', () => {
  const realAdd = window.addEventListener;
  let adds = 0;
  window.addEventListener = function (type, listener, options) {
    if (type === 'keydown') adds += 1;
    return realAdd.call(this, type, listener, options);
  };
  try {
    const Probe = () => {
      const [n, setN] = React.useState(0);
      useShortcut('x', () => setN(n + 1));
      return <output>{n}</output>;
    };
    const { container } = render(<Probe />);
    press('x');
    press('x');
    press('x');
    expect(container.textContent).toBe('3');
    expect(adds).toBe(1);
  } finally {
    window.addEventListener = realAdd;
  }
});

test('keys typed into a textarea or a select are left alone too', () => {
  let calls = 0;
  const Probe = () => {
    useShortcut('n', () => { calls += 1; });
    return <div><textarea aria-label="Body" /><select aria-label="Size"><option>S</option></select></div>;
  };
  render(<Probe />);
  press('n', screen.getByLabelText('Body'));
  press('n', screen.getByLabelText('Size'));
  expect(calls).toBe(0);
  press('n');
  expect(calls).toBe(1);
});

test('a new key moves the listener to that key', () => {
  const seen = [];
  const Probe = ({ shortcut }) => {
    useShortcut(shortcut, event => seen.push(event.key));
    return <p>probe</p>;
  };
  const { rerender } = render(<Probe shortcut="a" />);
  press('a');
  rerender(<Probe shortcut="b" />);
  press('a');
  press('b');
  expect(seen).toEqual(['a', 'b']);
});`,
  },
  'react-mh-rename-in-place': {
    solution: `import React, { useEffect, useRef, useState } from 'react';

const FILES = [
  { id: 1, name: 'report.pdf' },
  { id: 2, name: 'notes.txt' },
  { id: 3, name: 'photo.jpg' },
];

const App = () => {
  const [files, setFiles] = useState(FILES);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  // Every Rename button by file id, kept up to date by callback refs.
  const buttons = useRef(new Map());
  // The file whose button gets the focus back once its form has gone.
  const returnTo = useRef(null);

  const open = (file) => {
    // Switching files: the focus goes to the new field, not back to a button.
    returnTo.current = null;
    setEditingId(file.id);
    setDraft(file.name);
    setError('');
  };

  const close = () => {
    returnTo.current = editingId;
    setEditingId(null);
    setError('');
  };

  const save = (event) => {
    event.preventDefault();
    const name = draft.trim();
    const file = files.find((one) => one.id === editingId);
    if (name === '' || name === file.name) {
      close();
      return;
    }
    // Taken only when a different file already has the name.
    if (files.some((one) => one.id !== editingId && one.name === name)) {
      setError('That name is taken');
      return;
    }
    setFiles(files.map((one) => (one.id === editingId ? { ...one, name } : one)));
    close();
  };

  // Runs after the render in which the form went away, when the button is back.
  useEffect(() => {
    if (editingId === null && returnTo.current !== null) {
      buttons.current.get(returnTo.current)?.focus();
      returnTo.current = null;
    }
  }, [editingId]);

  return <main>
    <h2>Files</h2>
    <ul>
      {files.map((file) => (
        <li key={file.id}>
          {file.id === editingId ? (
            <form onSubmit={save}>
              <label>
                New name for {file.name}{' '}
                <input
                  autoFocus
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => { if (event.key === 'Escape') close(); }}
                />
              </label>
              {error && <p role="alert">{error}</p>}
            </form>
          ) : (
            <>
              <span>{file.name}</span>
              <button
                type="button"
                aria-label={'Rename ' + file.name}
                ref={(node) => { if (node) buttons.current.set(file.id, node); else buttons.current.delete(file.id); }}
                onClick={() => open(file)}
              >Rename</button>
            </>
          )}
        </li>
      ))}
    </ul>
  </main>;
};

export default App;`,
    junior: `import React, { useEffect, useRef, useState } from 'react';

const FILES = [
  { id: 1, name: 'report.pdf' },
  { id: 2, name: 'notes.txt' },
  { id: 3, name: 'photo.jpg' },
];

const App = () => {
  const [files, setFiles] = useState(FILES);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const buttonRefs = useRef(new Map());
  const inputRef = useRef(null);
  const focusButtonFor = useRef(null);

  useEffect(() => {
    if (editingId !== null && inputRef.current) {
      inputRef.current.focus();
    }
    if (editingId === null && focusButtonFor.current !== null) {
      const button = buttonRefs.current.get(focusButtonFor.current);
      if (button) {
        button.focus();
      }
      focusButtonFor.current = null;
    }
  }, [editingId]);

  const startRename = (file) => {
    focusButtonFor.current = null;
    setEditingId(file.id);
    setDraft(file.name);
    setError('');
  };

  const stopRename = () => {
    focusButtonFor.current = editingId;
    setEditingId(null);
    setError('');
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const newName = draft.trim();
    let oldName = '';
    for (const file of files) {
      if (file.id === editingId) {
        oldName = file.name;
      }
    }
    if (newName === '' || newName === oldName) {
      stopRename();
      return;
    }
    for (const file of files) {
      if (file.id !== editingId && file.name === newName) {
        setError('That name is taken');
        return;
      }
    }
    const updated = files.map((file) => {
      if (file.id === editingId) {
        return { id: file.id, name: newName };
      }
      return file;
    });
    setFiles(updated);
    stopRename();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      stopRename();
    }
  };

  return (
    <main>
      <h2>Files</h2>
      <ul>
        {files.map((file) => {
          if (file.id === editingId) {
            return (
              <li key={file.id}>
                <form onSubmit={handleSubmit}>
                  <label htmlFor={'rename-' + file.id}>{'New name for ' + file.name}</label>
                  <input
                    id={'rename-' + file.id}
                    ref={inputRef}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  {error !== '' && <p role="alert">{error}</p>}
                </form>
              </li>
            );
          }
          return (
            <li key={file.id}>
              <span>{file.name}</span>
              <button
                type="button"
                aria-label={'Rename ' + file.name}
                ref={(node) => {
                  if (node) {
                    buttonRefs.current.set(file.id, node);
                  } else {
                    buttonRefs.current.delete(file.id);
                  }
                }}
                onClick={() => startRename(file)}
              >
                Rename
              </button>
            </li>
          );
        })}
      </ul>
    </main>
  );
};

export default App;`,
    senior: `import React, { useEffect, useRef, useState } from 'react';

const FILES = [
  { id: 1, name: 'report.pdf' },
  { id: 2, name: 'notes.txt' },
  { id: 3, name: 'photo.jpg' },
];

const RenameForm = ({ file, isTaken, onSave, onCancel }) => {
  const [draft, setDraft] = useState(file.name);
  const [error, setError] = useState('');

  const submit = (event) => {
    event.preventDefault();
    const name = draft.trim();
    if (!name || name === file.name) return onCancel();
    if (isTaken(name)) return setError('That name is taken');
    onSave(name);
  };

  return (
    <form onSubmit={submit}>
      <label>
        New name for {file.name}{' '}
        <input autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => event.key === 'Escape' && onCancel()} />
      </label>
      {error && <p role="alert">{error}</p>}
    </form>
  );
};

const App = () => {
  const [files, setFiles] = useState(FILES);
  const [editingId, setEditingId] = useState(null);
  const buttons = useRef(new Map());
  const returnTo = useRef(null);

  useEffect(() => {
    if (editingId !== null || returnTo.current === null) return;
    buttons.current.get(returnTo.current)?.focus();
    returnTo.current = null;
  }, [editingId]);

  const close = () => {
    returnTo.current = editingId;
    setEditingId(null);
  };

  const rename = (id, name) => {
    setFiles((current) => current.map((file) => (file.id === id ? { ...file, name } : file)));
    close();
  };

  const buttonRef = (id) => (node) => {
    if (node) buttons.current.set(id, node);
    else buttons.current.delete(id);
  };

  return (
    <main>
      <h2>Files</h2>
      <ul>
        {files.map((file) => (
          <li key={file.id}>
            {file.id === editingId ? (
              <RenameForm
                file={file}
                isTaken={(name) => files.some((other) => other.id !== file.id && other.name === name)}
                onSave={(name) => rename(file.id, name)}
                onCancel={close}
              />
            ) : (
              <>
                <span>{file.name}</span>
                <button
                  type="button"
                  aria-label={\`Rename \${file.name}\`}
                  ref={buttonRef(file.id)}
                  onClick={() => { returnTo.current = null; setEditingId(file.id); }}
                >Rename</button>
              </>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
};

export default App;`,
    hiddenSuite: `test('Rename on another file closes the first form without saving', () => {
  render(<App />);
  fireEvent.click(renameButton('notes.txt'));
  type('notes.txt', 'draft.txt');
  fireEvent.click(renameButton('photo.jpg'));
  expect(names()).toEqual(['report.pdf', 'notes.txt', '(editing)']);
  expect(document.activeElement).toBe(input('photo.jpg'));
  expect(screen.getAllByRole('textbox')).toHaveLength(1);
});

test('the alert goes when the form closes', () => {
  render(<App />);
  fireEvent.click(renameButton('notes.txt'));
  type('notes.txt', 'photo.jpg');
  submit('notes.txt');
  expect(screen.getByRole('alert')).toBeTruthy();
  fireEvent.keyDown(input('notes.txt'), { key: 'Escape' });
  expect(screen.queryByRole('alert')).toBeNull();
  expect(document.activeElement).toBe(renameButton('notes.txt'));
});

test('the name the file already has just closes the form', () => {
  render(<App />);
  fireEvent.click(renameButton('report.pdf'));
  submit('report.pdf');
  expect(screen.queryByRole('alert')).toBeNull();
  expect(names()).toEqual(['report.pdf', 'notes.txt', 'photo.jpg']);
  expect(document.activeElement).toBe(renameButton('report.pdf'));
});

test('a renamed file keeps its place and its button follows the new name', () => {
  render(<App />);
  fireEvent.click(renameButton('report.pdf'));
  type('report.pdf', 'summary.pdf');
  submit('report.pdf');
  expect(names()).toEqual(['summary.pdf', 'notes.txt', 'photo.jpg']);
  fireEvent.click(renameButton('summary.pdf'));
  expect(input('summary.pdf').value).toBe('summary.pdf');
});

test('a refused name can still be changed and saved', () => {
  render(<App />);
  fireEvent.click(renameButton('photo.jpg'));
  type('photo.jpg', 'notes.txt');
  submit('photo.jpg');
  type('photo.jpg', 'beach.jpg');
  submit('photo.jpg');
  expect(names()).toEqual(['report.pdf', 'notes.txt', 'beach.jpg']);
  expect(document.activeElement).toBe(renameButton('beach.jpg'));
});`,
  },
  'react-mh-wait-for-export': {
    solution: `import React, { useEffect, useState } from 'react';

const App = () => {
  const [jobId, setJobId] = useState(null);
  const [job, setJob] = useState(null);
  const [starting, setStarting] = useState(false);

  const start = () => {
    setJob(null);
    setStarting(true);
    fetch('/api/exports', { method: 'POST' })
      .then((response) => response.json())
      .then((answer) => {
        setStarting(false);
        setJobId(answer.id);
      });
  };

  useEffect(() => {
    if (jobId === null) return undefined;
    let stopped = false;
    let timer;
    const ask = () => {
      fetch('/api/exports/' + jobId)
        .then((response) => response.json())
        .then((answer) => {
          if (stopped) return;
          setJob(answer);
          // The next question is planned only once this answer is in, so they never pile up.
          if (answer.status === 'running') timer = setTimeout(ask, 200);
        });
    };
    ask();
    // A new job or a closed page: no more questions, and a late answer changes nothing.
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [jobId]);

  const running = starting || (jobId !== null && (job === null || job.status === 'running'));

  return <main>
    <h2>Export the report</h2>
    <button type="button" onClick={start} disabled={running}>Export</button>
    {job && job.status === 'running' && <p>Preparing… {job.progress}%</p>}
    {job && job.status === 'done' && <a href={job.url}>Download the export</a>}
    {job && job.status === 'failed' && <p role="alert">The export failed</p>}
  </main>;
};

export default App;`,
    junior: `import React, { useEffect, useState } from 'react';

const App = () => {
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState('');

  const startExport = async () => {
    setStatus('starting');
    const response = await fetch('/api/exports', { method: 'POST' });
    const answer = await response.json();
    setStatus('running');
    setProgress(0);
    setJobId(answer.id);
  };

  useEffect(() => {
    if (jobId === null) {
      return;
    }
    let cancelled = false;
    let timeoutId = null;

    const checkJob = async () => {
      const response = await fetch('/api/exports/' + jobId);
      const answer = await response.json();
      if (cancelled) {
        return;
      }
      if (answer.status === 'running') {
        setProgress(answer.progress);
        timeoutId = setTimeout(checkJob, 200);
      } else if (answer.status === 'done') {
        setDownloadUrl(answer.url);
        setStatus('done');
      } else if (answer.status === 'failed') {
        setStatus('failed');
      }
    };

    checkJob();

    return () => {
      cancelled = true;
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  }, [jobId]);

  const busy = status === 'starting' || status === 'running';

  return (
    <main>
      <h2>Export the report</h2>
      <button type="button" onClick={startExport} disabled={busy}>Export</button>
      {status === 'running' && <p>{'Preparing… ' + progress + '%'}</p>}
      {status === 'done' && <a href={downloadUrl}>Download the export</a>}
      {status === 'failed' && <p role="alert">The export failed</p>}
    </main>
  );
};

export default App;`,
    senior: `import React, { useEffect, useState } from 'react';

const POLL_MS = 200;

const useExportJob = (jobId) => {
  const [job, setJob] = useState(null);

  useEffect(() => {
    if (jobId === null) return undefined;
    const controller = new AbortController();
    let timer;
    const ask = async () => {
      try {
        const response = await fetch('/api/exports/' + jobId, { signal: controller.signal });
        const answer = await response.json();
        if (controller.signal.aborted) return;
        setJob(answer);
        if (answer.status === 'running') timer = setTimeout(ask, POLL_MS);
      } catch (error) {
        if (error.name !== 'AbortError') setJob({ status: 'failed' });
      }
    };
    setJob(null);
    ask();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [jobId]);

  return job;
};

const App = () => {
  const [jobId, setJobId] = useState(null);
  const [starting, setStarting] = useState(false);
  const job = useExportJob(jobId);

  const start = async () => {
    setStarting(true);
    try {
      const response = await fetch('/api/exports', { method: 'POST' });
      const { id } = await response.json();
      setJobId(id);
    } finally {
      setStarting(false);
    }
  };

  const running = starting || (jobId !== null && job?.status !== 'done' && job?.status !== 'failed');

  return (
    <main>
      <h2>Export the report</h2>
      <button type="button" onClick={start} disabled={running}>Export</button>
      {job?.status === 'running' && <p>Preparing… {job.progress}%</p>}
      {job?.status === 'done' && <a href={job.url}>Download the export</a>}
      {job?.status === 'failed' && !starting && <p role="alert">The export failed</p>}
    </main>
  );
};

export default App;`,
    hiddenSuite: `test('no new question while an answer is on its way', () => withFetch(async calls => {
  render(<App />);
  await begin(calls);
  await wait(500);
  expect(calls).toHaveLength(2);
}));

test('closing the page ends the asking', () => withFetch(async calls => {
  const { unmount } = render(<App />);
  await begin(calls);
  await act(async () => { calls[1].respond({ status: 'running', progress: 5 }); });
  unmount();
  await wait(400);
  expect(calls).toHaveLength(2);
}));

test('a new export after a failure starts a new job', () => withFetch(async calls => {
  render(<App />);
  await begin(calls, 'x1');
  await act(async () => { calls[1].respond({ status: 'failed' }); });
  fireEvent.click(exportButton());
  expect(calls[2].url).toBe('/api/exports');
  await act(async () => { calls[2].respond({ id: 'x2' }); });
  expect(calls[3].url).toBe('/api/exports/x2');
  expect(screen.queryByRole('alert')).toBeNull();
}));

test('the progress follows each answer', () => withFetch(async calls => {
  render(<App />);
  await begin(calls, 'abc');
  expect(calls[1].url).toBe('/api/exports/abc');
  await act(async () => { calls[1].respond({ status: 'running', progress: 10 }); });
  await wait(250);
  await act(async () => { calls[2].respond({ status: 'running', progress: 70 }); });
  expect(screen.getByText('Preparing… 70%')).toBeTruthy();
  expect(screen.queryByText('Preparing… 10%')).toBeNull();
}));

test('Export is disabled from the click on', () => withFetch(async calls => {
  render(<App />);
  fireEvent.click(exportButton());
  expect(exportButton().disabled).toBe(true);
  fireEvent.click(exportButton());
  expect(calls).toHaveLength(1);
}));`,
  },

  /* ── Hard ─────────────────────────────────────────────────────────── */
  'react-mh-menu-button': {
    solution: `import React, { useEffect, useRef, useState } from 'react';

const ITEMS = ['Rename', 'Duplicate', 'Delete'];

const App = () => {
  const [open, setOpen] = useState(false);
  // The item with the focus, by index.
  const [active, setActive] = useState(0);
  const [chosen, setChosen] = useState('');
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const itemRefs = useRef([]);

  // After a render with the menu open, the active item is on the page: focus it.
  useEffect(() => {
    if (open) itemRefs.current[active]?.focus();
  }, [open, active]);

  // Only while open: a mousedown outside both the button and the menu closes it.
  useEffect(() => {
    if (!open) return undefined;
    const onMouseDown = (event) => {
      if (buttonRef.current.contains(event.target) || menuRef.current.contains(event.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  const openAt = (index) => {
    setActive(index);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    buttonRef.current.focus();
  };

  const choose = (item) => {
    setChosen(item);
    close();
  };

  const onButtonKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      openAt(0);
    }
  };

  // Keydown events from the focused item bubble up to the menu.
  const onMenuKeyDown = (event) => {
    const last = ITEMS.length - 1;
    switch (event.key) {
      case 'ArrowDown':
        setActive(active === last ? 0 : active + 1);
        break;
      case 'ArrowUp':
        setActive(active === 0 ? last : active - 1);
        break;
      case 'Home':
        setActive(0);
        break;
      case 'End':
        setActive(last);
        break;
      case 'Enter':
        choose(ITEMS[active]);
        break;
      case 'Escape':
        close();
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  return <main>
    <h2>Report.pdf</h2>
    <button
      type="button"
      ref={buttonRef}
      aria-haspopup="menu"
      aria-expanded={open ? 'true' : 'false'}
      aria-controls={open ? 'actions-menu' : undefined}
      onClick={() => (open ? setOpen(false) : openAt(0))}
      onKeyDown={onButtonKeyDown}
    >Actions</button>
    {open && (
      <ul id="actions-menu" role="menu" aria-label="Actions" ref={menuRef} onKeyDown={onMenuKeyDown}>
        {ITEMS.map((item, index) => (
          <li
            key={item}
            role="menuitem"
            tabIndex={-1}
            ref={(node) => { itemRefs.current[index] = node; }}
            onClick={() => choose(item)}
          >{item}</li>
        ))}
      </ul>
    )}
    <p>{chosen && 'Chose ' + chosen}</p>
  </main>;
};

export default App;`,
    junior: `import React, { useEffect, useRef, useState } from 'react';

const ITEMS = ['Rename', 'Duplicate', 'Delete'];

const App = () => {
  const [open, setOpen] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);
  const [chosen, setChosen] = useState('');
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const itemRefs = useRef([]);

  useEffect(() => {
    if (open) {
      const item = itemRefs.current[focusIndex];
      if (item) {
        item.focus();
      }
    }
  }, [open, focusIndex]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handleMouseDown = (event) => {
      const onButton = buttonRef.current && buttonRef.current.contains(event.target);
      const onMenu = menuRef.current && menuRef.current.contains(event.target);
      if (!onButton && !onMenu) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [open]);

  const openMenu = () => {
    setFocusIndex(0);
    setOpen(true);
  };

  const closeMenu = () => {
    setOpen(false);
    buttonRef.current.focus();
  };

  const chooseItem = (item) => {
    setChosen(item);
    closeMenu();
  };

  const handleButtonClick = () => {
    if (open) {
      setOpen(false);
    } else {
      openMenu();
    }
  };

  const handleButtonKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      openMenu();
    }
  };

  const handleMenuKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      let next = focusIndex + 1;
      if (next >= ITEMS.length) {
        next = 0;
      }
      setFocusIndex(next);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      let previous = focusIndex - 1;
      if (previous < 0) {
        previous = ITEMS.length - 1;
      }
      setFocusIndex(previous);
    } else if (event.key === 'Home') {
      event.preventDefault();
      setFocusIndex(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setFocusIndex(ITEMS.length - 1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      chooseItem(ITEMS[focusIndex]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu();
    }
  };

  let message = '';
  if (chosen !== '') {
    message = 'Chose ' + chosen;
  }

  return (
    <main>
      <h2>Report.pdf</h2>
      <button
        type="button"
        ref={buttonRef}
        aria-haspopup="menu"
        aria-expanded={open ? 'true' : 'false'}
        onClick={handleButtonClick}
        onKeyDown={handleButtonKeyDown}
      >
        Actions
      </button>
      {open && (
        <ul role="menu" ref={menuRef} onKeyDown={handleMenuKeyDown}>
          {ITEMS.map((item, index) => (
            <li
              key={item}
              role="menuitem"
              tabIndex={-1}
              ref={(node) => {
                itemRefs.current[index] = node;
              }}
              onClick={() => chooseItem(item)}
            >
              {item}
            </li>
          ))}
        </ul>
      )}
      <p>{message}</p>
    </main>
  );
};

export default App;`,
    senior: `import React, { useEffect, useId, useRef, useState } from 'react';

const ITEMS = ['Rename', 'Duplicate', 'Delete'];
const LAST = ITEMS.length - 1;
const MOVES = {
  ArrowDown: (index) => (index === LAST ? 0 : index + 1),
  ArrowUp: (index) => (index === 0 ? LAST : index - 1),
  Home: () => 0,
  End: () => LAST,
};

const useOutsideMouseDown = (active, refs, onOutside) => {
  const latest = useRef(onOutside);
  latest.current = onOutside;
  useEffect(() => {
    if (!active) return undefined;
    const controller = new AbortController();
    document.addEventListener('mousedown', (event) => {
      if (!refs.some((ref) => ref.current?.contains(event.target))) latest.current();
    }, { signal: controller.signal });
    return () => controller.abort();
  }, [active]);
};

const App = () => {
  const menuId = useId();
  const [active, setActive] = useState(null);
  const [chosen, setChosen] = useState('');
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const itemRefs = useRef([]);
  const open = active !== null;

  useEffect(() => {
    if (open) itemRefs.current[active]?.focus();
  }, [open, active]);

  useOutsideMouseDown(open, [buttonRef, menuRef], () => setActive(null));

  const close = () => {
    setActive(null);
    buttonRef.current?.focus();
  };
  const choose = (item) => {
    setChosen(item);
    close();
  };

  const onMenuKeyDown = (event) => {
    if (Object.hasOwn(MOVES, event.key)) setActive(MOVES[event.key](active));
    else if (event.key === 'Enter') choose(ITEMS[active]);
    else if (event.key === 'Escape') close();
    else return;
    event.preventDefault();
  };

  return (
    <main>
      <h2>Report.pdf</h2>
      <button
        type="button"
        ref={buttonRef}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setActive(open ? null : 0)}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowDown') return;
          event.preventDefault();
          setActive(0);
        }}
      >Actions</button>
      {open && (
        <ul id={menuId} role="menu" aria-label="Actions" ref={menuRef} onKeyDown={onMenuKeyDown}>
          {ITEMS.map((item, index) => (
            <li key={item} role="menuitem" tabIndex={-1} ref={(node) => { itemRefs.current[index] = node; }} onClick={() => choose(item)}>
              {item}
            </li>
          ))}
        </ul>
      )}
      <p>{chosen && \`Chose \${chosen}\`}</p>
    </main>
  );
};

export default App;`,
    hiddenSuite: `test('Home and End move the focus to the first and last item', () => {
  render(<App />);
  fireEvent.click(trigger());
  key('End');
  expect(focused()).toBe('Delete');
  key('Home');
  expect(focused()).toBe('Rename');
});

test('ArrowDown on the closed button opens the menu at the first item', () => {
  render(<App />);
  trigger().focus();
  fireEvent.keyDown(trigger(), { key: 'ArrowDown' });
  expect(trigger().getAttribute('aria-expanded')).toBe('true');
  expect(document.activeElement).toBe(items()[0]);
});

test('a click on an item chooses it', () => {
  render(<App />);
  fireEvent.click(trigger());
  fireEvent.click(items()[2]);
  expect(screen.getByText('Chose Delete')).toBeTruthy();
  expect(screen.queryByRole('menu')).toBeNull();
  expect(document.activeElement).toBe(trigger());
});

test('a mousedown on the menu or the button leaves it open, and the button closes it', () => {
  render(<App />);
  fireEvent.click(trigger());
  fireEvent.mouseDown(items()[1]);
  fireEvent.mouseDown(trigger());
  expect(screen.queryByRole('menu')).toBeTruthy();
  fireEvent.click(trigger());
  expect(screen.queryByRole('menu')).toBeNull();
});

test('the mousedown listener on document lives only while the menu is open', () => {
  const realAdd = document.addEventListener;
  const realRemove = document.removeEventListener;
  const live = new Set();
  document.addEventListener = function (type, listener, options) {
    if (type === 'mousedown') {
      live.add(listener);
      if (options && options.signal) options.signal.addEventListener('abort', () => live.delete(listener));
    }
    return realAdd.call(this, type, listener, options);
  };
  document.removeEventListener = function (type, listener, options) {
    if (type === 'mousedown') live.delete(listener);
    return realRemove.call(this, type, listener, options);
  };
  try {
    const { unmount } = render(<App />);
    expect(live.size).toBe(0);
    fireEvent.click(trigger());
    expect(live.size).toBe(1);
    key('Escape');
    expect(live.size).toBe(0);
    fireEvent.click(trigger());
    unmount();
    expect(live.size).toBe(0);
  } finally {
    document.addEventListener = realAdd;
    document.removeEventListener = realRemove;
  }
});`,
  },
  'react-mh-city-combobox': {
    solution: `import React, { useState } from 'react';

const CITIES = [
  'Amsterdam', 'Athens', 'Barcelona', 'Berlin', 'Bern', 'Bratislava', 'Brussels',
  'Bucharest', 'Budapest', 'Copenhagen', 'Dublin', 'Helsinki', 'Lisbon', 'London',
  'Madrid', 'Oslo', 'Paris', 'Prague', 'Rome', 'Vienna',
];

const LIST_ID = 'city-options';
const optionId = (index) => 'city-option-' + index;

const App = () => {
  const [text, setText] = useState('');
  // -1 means no active option.
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState('');

  // Worked out from the text on every render; never stored.
  const query = text.trim().toLowerCase();
  const suggestions = query === '' ? [] : CITIES.filter((city) => city.toLowerCase().startsWith(query)).slice(0, 5);
  const showList = open && suggestions.length > 0;

  const change = (event) => {
    setText(event.target.value);
    setOpen(true);
    setActive(-1); // typing starts again with no active option
  };

  const pick = (city) => {
    setText(city);
    setSelected(city);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (event) => {
    const count = suggestions.length;
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && showList) {
      // The focus stays in the input; only the active option moves.
      event.preventDefault();
      if (event.key === 'ArrowDown') setActive(active < 0 ? 0 : (active + 1) % count);
      else setActive(active < 0 ? count - 1 : (active - 1 + count) % count);
    } else if (event.key === 'Enter' && showList && active >= 0) {
      event.preventDefault();
      pick(suggestions[active]);
    } else if (event.key === 'Escape') {
      setOpen(false);
      setActive(-1);
    }
  };

  return <main>
    <h2>Where to?</h2>
    <label htmlFor="city">City</label>
    <input
      id="city"
      role="combobox"
      autoComplete="off"
      aria-autocomplete="list"
      aria-controls={LIST_ID}
      aria-expanded={showList ? 'true' : 'false'}
      aria-activedescendant={showList && active >= 0 ? optionId(active) : undefined}
      value={text}
      onChange={change}
      onKeyDown={onKeyDown}
    />
    {showList && (
      <ul id={LIST_ID} role="listbox" aria-label="Cities">
        {suggestions.map((city, index) => (
          <li
            key={city}
            id={optionId(index)}
            role="option"
            aria-selected={index === active ? 'true' : 'false'}
            onClick={() => pick(city)}
          >{city}</li>
        ))}
      </ul>
    )}
    {query !== '' && suggestions.length === 0 && <p>No cities match</p>}
    {selected && <p>Selected: {selected}</p>}
  </main>;
};

export default App;`,
    junior: `import React, { useState } from 'react';

const CITIES = [
  'Amsterdam', 'Athens', 'Barcelona', 'Berlin', 'Bern', 'Bratislava', 'Brussels',
  'Bucharest', 'Budapest', 'Copenhagen', 'Dublin', 'Helsinki', 'Lisbon', 'London',
  'Madrid', 'Oslo', 'Paris', 'Prague', 'Rome', 'Vienna',
];

const App = () => {
  const [text, setText] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [listOpen, setListOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState('');

  const search = text.trim().toLowerCase();
  const matches = [];
  if (search !== '') {
    for (const city of CITIES) {
      if (city.toLowerCase().startsWith(search) && matches.length < 5) {
        matches.push(city);
      }
    }
  }
  const listVisible = listOpen && matches.length > 0;

  const chooseCity = (city) => {
    setText(city);
    setSelectedCity(city);
    setListOpen(false);
    setActiveIndex(-1);
  };

  const handleChange = (event) => {
    setText(event.target.value);
    setListOpen(true);
    setActiveIndex(-1);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      if (!listVisible) {
        return;
      }
      event.preventDefault();
      let next = activeIndex + 1;
      if (next >= matches.length) {
        next = 0;
      }
      setActiveIndex(next);
    } else if (event.key === 'ArrowUp') {
      if (!listVisible) {
        return;
      }
      event.preventDefault();
      let previous = activeIndex - 1;
      if (activeIndex === -1 || previous < 0) {
        previous = matches.length - 1;
      }
      setActiveIndex(previous);
    } else if (event.key === 'Enter') {
      if (listVisible && activeIndex >= 0) {
        event.preventDefault();
        chooseCity(matches[activeIndex]);
      }
    } else if (event.key === 'Escape') {
      setListOpen(false);
      setActiveIndex(-1);
    }
  };

  let activeId;
  if (listVisible && activeIndex >= 0) {
    activeId = 'option-' + activeIndex;
  }

  return (
    <main>
      <h2>Where to?</h2>
      <label htmlFor="city">City</label>
      <input
        id="city"
        role="combobox"
        aria-autocomplete="list"
        aria-controls="city-list"
        aria-expanded={listVisible ? 'true' : 'false'}
        aria-activedescendant={activeId}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      {listVisible && (
        <ul id="city-list" role="listbox">
          {matches.map((city, index) => (
            <li
              key={city}
              id={'option-' + index}
              role="option"
              aria-selected={index === activeIndex ? 'true' : 'false'}
              onClick={() => chooseCity(city)}
            >
              {city}
            </li>
          ))}
        </ul>
      )}
      {search !== '' && matches.length === 0 && <p>No cities match</p>}
      {selectedCity !== '' && <p>{'Selected: ' + selectedCity}</p>}
    </main>
  );
};

export default App;`,
    senior: `import React, { useId, useState } from 'react';

const CITIES = [
  'Amsterdam', 'Athens', 'Barcelona', 'Berlin', 'Bern', 'Bratislava', 'Brussels',
  'Bucharest', 'Budapest', 'Copenhagen', 'Dublin', 'Helsinki', 'Lisbon', 'London',
  'Madrid', 'Oslo', 'Paris', 'Prague', 'Rome', 'Vienna',
];
const MAX_SUGGESTIONS = 5;

const suggestionsFor = (text) => {
  const query = text.trim().toLowerCase();
  return query ? CITIES.filter((city) => city.toLowerCase().startsWith(query)).slice(0, MAX_SUGGESTIONS) : [];
};

const App = () => {
  const baseId = useId();
  const [text, setText] = useState('');
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState('');

  const suggestions = suggestionsFor(text);
  const expanded = open && suggestions.length > 0;
  const idOf = (index) => baseId + '-option-' + index;
  const listId = baseId + '-list';

  const pick = (city) => {
    setText(city);
    setSelected(city);
    setOpen(false);
    setActive(-1);
  };

  const step = (delta) => setActive((current) => {
    const count = suggestions.length;
    if (current < 0) return delta > 0 ? 0 : count - 1;
    return (current + delta + count) % count;
  });

  const onKeyDown = (event) => {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        if (!expanded) return;
        event.preventDefault();
        step(event.key === 'ArrowDown' ? 1 : -1);
        break;
      case 'Enter':
        if (!expanded || active < 0) return;
        event.preventDefault();
        pick(suggestions[active]);
        break;
      case 'Escape':
        setOpen(false);
        setActive(-1);
        break;
      default:
    }
  };

  return (
    <main>
      <h2>Where to?</h2>
      <label htmlFor="city">City</label>
      <input
        id="city"
        role="combobox"
        autoComplete="off"
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={expanded}
        aria-activedescendant={expanded && active >= 0 ? idOf(active) : undefined}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onKeyDown={onKeyDown}
      />
      {expanded && (
        <ul id={listId} role="listbox" aria-label="Cities">
          {suggestions.map((city, index) => (
            <li key={city} id={idOf(index)} role="option" aria-selected={index === active} onClick={() => pick(city)}>
              {city}
            </li>
          ))}
        </ul>
      )}
      {text.trim() && suggestions.length === 0 && <p>No cities match</p>}
      {selected && <p>Selected: {selected}</p>}
    </main>
  );
};

export default App;`,
    hiddenSuite: `test('the arrows wrap, and ArrowUp from no option goes to the last', () => {
  render(<App />);
  type('b');
  key('ArrowUp');
  expect(activeOption().textContent).toBe('Brussels');
  key('ArrowDown');
  expect(activeOption().textContent).toBe('Barcelona');
});

test('typing again leaves no option active', () => {
  render(<App />);
  type('be');
  key('ArrowDown');
  type('ber');
  expect(field().getAttribute('aria-activedescendant')).toBeFalsy();
  expect(screen.getAllByRole('option').some(option => option.getAttribute('aria-selected') === 'true')).toBe(false);
});

test('Enter with no active option does nothing', () => {
  render(<App />);
  type('b');
  key('Enter');
  expect(screen.getByRole('listbox')).toBeTruthy();
  expect(field().value).toBe('b');
  expect(screen.queryByText(/^Selected:/)).toBeNull();
});

test('a click on an option picks it', () => {
  render(<App />);
  type('lis');
  fireEvent.click(screen.getByRole('option', { name: 'Lisbon' }));
  expect(field().value).toBe('Lisbon');
  expect(screen.getByText('Selected: Lisbon')).toBeTruthy();
  expect(screen.queryByRole('listbox')).toBeNull();
});

test('an empty field shows neither a list nor the message', () => {
  render(<App />);
  type('b');
  type('');
  expect(screen.queryByRole('listbox')).toBeNull();
  expect(screen.queryByText('No cities match')).toBeNull();
  expect(field().getAttribute('aria-expanded')).toBe('false');
});

test('every option has an id of its own, and typing after a pick opens the list again', () => {
  render(<App />);
  type('b');
  const ids = screen.getAllByRole('option').map(option => option.id);
  expect(ids.every(Boolean) && new Set(ids).size === ids.length).toBe(true);
  type('par');
  key('ArrowDown');
  key('Enter');
  type('pa');
  expect(options()).toEqual(['Paris']);
});`,
  },
  'react-mh-signup-form': {
    solution: `import React, { useRef, useState } from 'react';

const EMAIL = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
const FIELDS = ['email', 'password', 'repeat'];

// The messages follow from the values alone, so they are worked out on every render.
const errorsFor = (values) => ({
  email: EMAIL.test(values.email.trim()) ? '' : 'Enter an email like name@example.com',
  password: values.password.length >= 8 && /\\d/.test(values.password) ? '' : 'Use 8 or more characters with a number',
  repeat: values.repeat === values.password ? '' : 'The passwords do not match',
});

const App = () => {
  const [values, setValues] = useState({ email: '', password: '', repeat: '' });
  // Only whether to show an error is state: a field was left, or a submit was tried.
  const [touched, setTouched] = useState({ email: false, password: false, repeat: false });
  const [tried, setTried] = useState(false);
  const [welcome, setWelcome] = useState('');
  const refs = { email: useRef(null), password: useRef(null), repeat: useRef(null) };

  const errors = errorsFor(values);
  const shown = (name) => (touched[name] || tried) && errors[name] !== '';

  const change = (event) => setValues({ ...values, [event.target.name]: event.target.value });
  const leave = (event) => setTouched({ ...touched, [event.target.name]: true });

  const submit = (event) => {
    event.preventDefault();
    setTried(true);
    const first = FIELDS.find((name) => errors[name] !== '');
    if (first) {
      // Take the user to the first thing to fix.
      refs[first].current.focus();
      return;
    }
    setWelcome(values.email.trim());
  };

  if (welcome) {
    return <main><h2>Create an account</h2><p>Welcome, {welcome}</p></main>;
  }

  // A function, not a component: the inputs keep their identity between renders.
  const field = (name, label, type) => (
    <div>
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        ref={refs[name]}
        value={values[name]}
        onChange={change}
        onBlur={leave}
        // undefined leaves the attribute out while the error is hidden.
        aria-invalid={shown(name) ? 'true' : undefined}
        aria-describedby={shown(name) ? name + '-error' : undefined}
      />
      {shown(name) && <p id={name + '-error'}>{errors[name]}</p>}
    </div>
  );

  return <main>
    <h2>Create an account</h2>
    <form onSubmit={submit} noValidate>
      {field('email', 'Email', 'email')}
      {field('password', 'Password', 'password')}
      {field('repeat', 'Repeat password', 'password')}
      <button type="submit">Create account</button>
    </form>
  </main>;
};

export default App;`,
    junior: `import React, { useRef, useState } from 'react';

const App = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [emailLeft, setEmailLeft] = useState(false);
  const [passwordLeft, setPasswordLeft] = useState(false);
  const [repeatLeft, setRepeatLeft] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [welcomeEmail, setWelcomeEmail] = useState('');
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const repeatRef = useRef(null);

  let emailError = '';
  if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email.trim())) {
    emailError = 'Enter an email like name@example.com';
  }
  let passwordError = '';
  if (password.length < 8 || !/[0-9]/.test(password)) {
    passwordError = 'Use 8 or more characters with a number';
  }
  let repeatError = '';
  if (repeat !== password) {
    repeatError = 'The passwords do not match';
  }

  const showEmailError = emailError !== '' && (emailLeft || submitted);
  const showPasswordError = passwordError !== '' && (passwordLeft || submitted);
  const showRepeatError = repeatError !== '' && (repeatLeft || submitted);

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);
    if (emailError !== '') {
      emailRef.current.focus();
      return;
    }
    if (passwordError !== '') {
      passwordRef.current.focus();
      return;
    }
    if (repeatError !== '') {
      repeatRef.current.focus();
      return;
    }
    setWelcomeEmail(email.trim());
  };

  if (welcomeEmail !== '') {
    return (
      <main>
        <h2>Create an account</h2>
        <p>{'Welcome, ' + welcomeEmail}</p>
      </main>
    );
  }

  return (
    <main>
      <h2>Create an account</h2>
      <form onSubmit={handleSubmit} noValidate>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          ref={emailRef}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          onBlur={() => setEmailLeft(true)}
          aria-invalid={showEmailError ? 'true' : undefined}
          aria-describedby={showEmailError ? 'email-error' : undefined}
        />
        {showEmailError && <p id="email-error">{emailError}</p>}

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          ref={passwordRef}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          onBlur={() => setPasswordLeft(true)}
          aria-invalid={showPasswordError ? 'true' : undefined}
          aria-describedby={showPasswordError ? 'password-error' : undefined}
        />
        {showPasswordError && <p id="password-error">{passwordError}</p>}

        <label htmlFor="repeat">Repeat password</label>
        <input
          id="repeat"
          type="password"
          ref={repeatRef}
          value={repeat}
          onChange={(event) => setRepeat(event.target.value)}
          onBlur={() => setRepeatLeft(true)}
          aria-invalid={showRepeatError ? 'true' : undefined}
          aria-describedby={showRepeatError ? 'repeat-error' : undefined}
        />
        {showRepeatError && <p id="repeat-error">{repeatError}</p>}

        <button type="submit">Create account</button>
      </form>
    </main>
  );
};

export default App;`,
    senior: `import React, { useId, useRef, useState } from 'react';

const EMAIL = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;

const RULES = [
  { name: 'email', label: 'Email', type: 'email', check: ({ email }) => EMAIL.test(email.trim()), message: 'Enter an email like name@example.com' },
  { name: 'password', label: 'Password', type: 'password', check: ({ password }) => password.length >= 8 && /\\d/.test(password), message: 'Use 8 or more characters with a number' },
  { name: 'repeat', label: 'Repeat password', type: 'password', check: ({ password, repeat }) => repeat === password, message: 'The passwords do not match' },
];

const Field = ({ rule, value, error, inputRef, onChange, onBlur }) => {
  const errorId = useId();
  return (
    <div>
      <label htmlFor={rule.name}>{rule.label}</label>
      <input
        id={rule.name}
        name={rule.name}
        type={rule.type}
        ref={inputRef}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      />
      {error && <p id={errorId}>{error}</p>}
    </div>
  );
};

const App = () => {
  const [values, setValues] = useState({ email: '', password: '', repeat: '' });
  const [touched, setTouched] = useState(() => new Set());
  const [tried, setTried] = useState(false);
  const [welcome, setWelcome] = useState(null);
  const inputs = useRef({});

  const failing = RULES.filter((rule) => !rule.check(values));
  const visibleError = (rule) =>
    (tried || touched.has(rule.name)) && failing.includes(rule) ? rule.message : '';

  const submit = (event) => {
    event.preventDefault();
    setTried(true);
    if (failing.length) inputs.current[failing[0].name]?.focus();
    else setWelcome(values.email.trim());
  };

  if (welcome !== null) {
    return <main><h2>Create an account</h2><p>Welcome, {welcome}</p></main>;
  }

  return (
    <main>
      <h2>Create an account</h2>
      <form onSubmit={submit} noValidate>
        {RULES.map((rule) => (
          <Field
            key={rule.name}
            rule={rule}
            value={values[rule.name]}
            error={visibleError(rule)}
            inputRef={(node) => { inputs.current[rule.name] = node; }}
            onChange={(event) => setValues((current) => ({ ...current, [rule.name]: event.target.value }))}
            onBlur={() => setTouched((current) => new Set(current).add(rule.name))}
          />
        ))}
        <button type="submit">Create account</button>
      </form>
    </main>
  );
};

export default App;`,
    hiddenSuite: `test('a password needs a digit as well as the length', () => {
  render(<App />);
  type('Password', 'abcdefgh');
  leave('Password');
  expect(describedBy('Password')).toBe('Use 8 or more characters with a number');
  type('Password', 'abcdefg1');
  expect(describedBy('Password')).toBeNull();
});

test('an untouched field stays quiet until a submit', () => {
  render(<App />);
  type('Email', 'ada@example.com');
  leave('Email');
  expect(describedBy('Password')).toBeNull();
  expect(field('Password').getAttribute('aria-invalid')).toBeNull();
  submit();
  expect(describedBy('Password')).toBe('Use 8 or more characters with a number');
});

test('the email is trimmed before it is checked', () => {
  render(<App />);
  type('Email', '  ada@example.com  ');
  leave('Email');
  expect(field('Email').getAttribute('aria-invalid')).toBeNull();
});

test('an empty form focuses Email, and each shown error has an id of its own', () => {
  render(<App />);
  submit();
  expect(document.activeElement).toBe(field('Email'));
  type('Repeat password', 'x');
  const ids = ['Email', 'Password', 'Repeat password'].map(label => field(label).getAttribute('aria-describedby'));
  expect(ids.every(Boolean) && new Set(ids).size === 3).toBe(true);
});

test('after a submit attempt the errors follow the typing at once', () => {
  render(<App />);
  submit();
  type('Email', 'ada@example.com');
  expect(describedBy('Email')).toBeNull();
  type('Email', 'ada');
  expect(describedBy('Email')).toBe('Enter an email like name@example.com');
});

test('a form with errors is not sent', () => {
  render(<App />);
  type('Email', 'ada@example.com');
  type('Password', 'correct1horse');
  type('Repeat password', 'correct1horsf');
  submit();
  expect(screen.queryByText(/^Welcome/)).toBeNull();
  expect(document.activeElement).toBe(field('Repeat password'));
});`,
  },
  'react-mh-carousel': {
    solution: `import React, { useEffect, useState } from 'react';

const SLIDES = ['Spring sale', 'New arrivals', 'Free delivery', 'Gift cards'];
const DELAY_MS = 200;

const App = () => {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  // Three reasons to stop; the carousel plays only when none of them holds.
  const playing = !paused && !hovered && !focused;

  // Runs again after every change of slide, so the wait always counts from the
  // latest change, whether the timer or a click made it. The cleanup clears the
  // old timeout first, so there is never more than one.
  useEffect(() => {
    if (!playing) return undefined;
    const timer = setTimeout(() => setIndex((current) => (current + 1) % SLIDES.length), DELAY_MS);
    return () => clearTimeout(timer);
  }, [playing, index]);

  const go = (step) => setIndex((current) => (current + step + SLIDES.length) % SLIDES.length);

  // Moving the focus between two buttons inside fires a blur and then a focus:
  // only a blur to somewhere outside the section counts as leaving.
  const onBlur = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
  };

  return <main>
    <section
      aria-roledescription="carousel"
      aria-label="Featured"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={onBlur}
    >
      {/* Off while it plays, so a screen reader is not interrupted by every change. */}
      <p aria-live={playing ? 'off' : 'polite'}>Slide {index + 1} of {SLIDES.length}: {SLIDES[index]}</p>
      <button type="button" onClick={() => go(-1)}>Previous</button>
      <button type="button" onClick={() => go(1)}>Next</button>
      <button type="button" onClick={() => setPaused(!paused)}>{paused ? 'Play' : 'Pause'}</button>
    </section>
  </main>;
};

export default App;`,
    junior: `import React, { useEffect, useState } from 'react';

const SLIDES = ['Spring sale', 'New arrivals', 'Free delivery', 'Gift cards'];

const App = () => {
  const [index, setIndex] = useState(0);
  const [pausedByButton, setPausedByButton] = useState(false);
  const [mouseInside, setMouseInside] = useState(false);
  const [focusInside, setFocusInside] = useState(false);

  let playing = true;
  if (pausedByButton || mouseInside || focusInside) {
    playing = false;
  }

  useEffect(() => {
    if (!playing) {
      return;
    }
    const timer = setTimeout(() => {
      setIndex((oldIndex) => {
        if (oldIndex === SLIDES.length - 1) {
          return 0;
        }
        return oldIndex + 1;
      });
    }, 200);
    return () => {
      clearTimeout(timer);
    };
  }, [playing, index]);

  const previous = () => {
    if (index === 0) {
      setIndex(SLIDES.length - 1);
    } else {
      setIndex(index - 1);
    }
  };

  const next = () => {
    if (index === SLIDES.length - 1) {
      setIndex(0);
    } else {
      setIndex(index + 1);
    }
  };

  const handleBlur = (event) => {
    const section = event.currentTarget;
    const goingTo = event.relatedTarget;
    if (goingTo === null || !section.contains(goingTo)) {
      setFocusInside(false);
    }
  };

  let liveSetting = 'polite';
  if (playing) {
    liveSetting = 'off';
  }

  return (
    <main>
      <section
        aria-roledescription="carousel"
        aria-label="Featured"
        onMouseEnter={() => setMouseInside(true)}
        onMouseLeave={() => setMouseInside(false)}
        onFocus={() => setFocusInside(true)}
        onBlur={handleBlur}
      >
        <p aria-live={liveSetting}>{'Slide ' + (index + 1) + ' of ' + SLIDES.length + ': ' + SLIDES[index]}</p>
        <button type="button" onClick={previous}>Previous</button>
        <button type="button" onClick={next}>Next</button>
        <button type="button" onClick={() => setPausedByButton(!pausedByButton)}>
          {pausedByButton ? 'Play' : 'Pause'}
        </button>
      </section>
    </main>
  );
};

export default App;`,
    senior: `import React, { useEffect, useReducer, useState } from 'react';

const SLIDES = ['Spring sale', 'New arrivals', 'Free delivery', 'Gift cards'];
const DELAY_MS = 200;

const wrap = (index) => (index + SLIDES.length) % SLIDES.length;

const useAutoAdvance = (playing, index, advance) => {
  useEffect(() => {
    if (!playing) return undefined;
    const timer = setTimeout(advance, DELAY_MS);
    return () => clearTimeout(timer);
  }, [playing, index, advance]);
};

const holdsReducer = (holds, { reason, on }) => (holds[reason] === on ? holds : { ...holds, [reason]: on });

const App = () => {
  const [index, setIndex] = useState(0);
  const [holds, setHold] = useReducer(holdsReducer, { button: false, pointer: false, focus: false });
  const playing = !Object.values(holds).some(Boolean);

  const step = (delta) => setIndex((current) => wrap(current + delta));
  const advance = React.useCallback(() => setIndex((current) => wrap(current + 1)), []);
  useAutoAdvance(playing, index, advance);

  return (
    <main>
      <section
        aria-roledescription="carousel"
        aria-label="Featured"
        onMouseEnter={() => setHold({ reason: 'pointer', on: true })}
        onMouseLeave={() => setHold({ reason: 'pointer', on: false })}
        onFocus={() => setHold({ reason: 'focus', on: true })}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setHold({ reason: 'focus', on: false });
        }}
      >
        <p aria-live={playing ? 'off' : 'polite'}>Slide {index + 1} of {SLIDES.length}: {SLIDES[index]}</p>
        <button type="button" onClick={() => step(-1)}>Previous</button>
        <button type="button" onClick={() => step(1)}>Next</button>
        <button type="button" onClick={() => setHold({ reason: 'button', on: !holds.button })}>
          {holds.button ? 'Play' : 'Pause'}
        </button>
      </section>
    </main>
  );
};

export default App;`,
    // On the hand-moved clock of the visible suite: with real timers a pause
    // of 70 ms let the old timer turn the slide before the click restarted it.
    hiddenSuite: `test('a click starts the wait over', () => withClock(async clock => {
  render(<App />);
  await clock.tick(130);
  press('Next');
  await clock.tick(130);
  expect(slide().textContent).toBe('Slide 2 of 4: New arrivals');
  await clock.tick(130);
  expect(slide().textContent).toBe('Slide 3 of 4: Free delivery');
}));

test('the focus inside the carousel stops it until the focus leaves', () => withClock(async clock => {
  render(<App />);
  act(() => { screen.getByRole('button', { name: 'Next' }).focus(); });
  expect(slide().getAttribute('aria-live')).toBe('polite');
  await clock.tick(300);
  expect(slide().textContent).toBe('Slide 1 of 4: Spring sale');
  act(() => { screen.getByRole('button', { name: 'Next' }).blur(); });
  await clock.tick(270);
  expect(slide().textContent).toBe('Slide 2 of 4: New arrivals');
}));

test('a paused carousel stays paused when the pointer leaves', () => withClock(async clock => {
  render(<App />);
  press('Pause');
  fireEvent.mouseEnter(carousel());
  fireEvent.mouseLeave(carousel());
  await clock.tick(300);
  expect(slide().textContent).toBe('Slide 1 of 4: Spring sale');
  expect(slide().getAttribute('aria-live')).toBe('polite');
}));

test('it goes on round from the last slide to the first', () => withClock(async clock => {
  render(<App />);
  press('Previous');
  await clock.tick(270);
  expect(slide().textContent).toBe('Slide 1 of 4: Spring sale');
}));

${timersClearedOnUnmount('leaving the page clears the timer', 200, `    press('Next');`)}`,
  },
  'react-mh-search-as-you-type': {
    solution: `import React, { useEffect, useRef, useState } from 'react';

const App = () => {
  const [text, setText] = useState('');
  // The trimmed text, 100 ms after it last changed: this is what gets searched.
  const [query, setQuery] = useState('');
  // Try again adds one, which runs the fetch effect again for the same query.
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState({ status: 'idle', books: [] });
  // Every answer so far, by trimmed text.
  const cache = useRef(new Map());

  // The debounce: each change clears the last timeout, so only a pause lets one fire.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(text.trim()), 100);
    return () => clearTimeout(timer);
  }, [text]);

  useEffect(() => {
    if (query.length < 2) {
      setResult({ status: 'idle', books: [] });
      return undefined;
    }
    if (cache.current.has(query)) {
      setResult({ status: 'done', books: cache.current.get(query) });
      return undefined;
    }
    const controller = new AbortController();
    setResult({ status: 'searching', books: [] });
    fetch('/api/books?q=' + encodeURIComponent(query), { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      })
      .then((books) => {
        cache.current.set(query, books);
        setResult({ status: 'done', books });
      })
      .catch((error) => {
        // Aborting is this component's own doing, not a failure.
        if (error.name === 'AbortError') return;
        setResult({ status: 'error', books: [] });
      });
    // A newer query, a retry or a closed page: the old request is no longer wanted.
    return () => controller.abort();
  }, [query, attempt]);

  return <main>
    <h2>Find a book</h2>
    <label>Search books <input value={text} onChange={(event) => setText(event.target.value)} /></label>
    {result.status === 'searching' && <p>Searching…</p>}
    {result.status === 'error' && (
      <>
        <p role="alert">Search failed</p>
        <button type="button" onClick={() => setAttempt((count) => count + 1)}>Try again</button>
      </>
    )}
    {result.status === 'done' && result.books.length === 0 && <p>No books match “{query}”</p>}
    {result.status === 'done' && result.books.length > 0 && (
      <ul>
        {result.books.map((book) => <li key={book.id}>{book.title}</li>)}
      </ul>
    )}
  </main>;
};

export default App;`,
    junior: `import React, { useEffect, useRef, useState } from 'react';

const App = () => {
  const [text, setText] = useState('');
  const [searchText, setSearchText] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [books, setBooks] = useState([]);
  const [searching, setSearching] = useState(false);
  const [failed, setFailed] = useState(false);
  const [answered, setAnswered] = useState(false);
  const savedAnswers = useRef(new Map());

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSearchText(text.trim());
    }, 100);
    return () => {
      clearTimeout(timeoutId);
    };
  }, [text]);

  useEffect(() => {
    setFailed(false);
    if (searchText.length < 2) {
      setBooks([]);
      setSearching(false);
      setAnswered(false);
      return;
    }
    if (savedAnswers.current.has(searchText)) {
      setBooks(savedAnswers.current.get(searchText));
      setSearching(false);
      setAnswered(true);
      return;
    }

    const controller = new AbortController();
    setSearching(true);
    setAnswered(false);
    setBooks([]);

    const runSearch = async () => {
      try {
        const url = '/api/books?q=' + encodeURIComponent(searchText);
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
          throw new Error('Request failed');
        }
        const data = await response.json();
        savedAnswers.current.set(searchText, data);
        setBooks(data);
        setAnswered(true);
        setSearching(false);
      } catch (error) {
        if (error.name === 'AbortError') {
          return;
        }
        setFailed(true);
        setSearching(false);
      }
    };

    runSearch();

    return () => {
      controller.abort();
    };
  }, [searchText, retryCount]);

  return (
    <main>
      <h2>Find a book</h2>
      <label>
        Search books <input value={text} onChange={(event) => setText(event.target.value)} />
      </label>
      {searching && <p>Searching…</p>}
      {failed && <p role="alert">Search failed</p>}
      {failed && (
        <button type="button" onClick={() => setRetryCount(retryCount + 1)}>Try again</button>
      )}
      {answered && books.length === 0 && <p>{'No books match “' + searchText + '”'}</p>}
      {answered && books.length > 0 && (
        <ul>
          {books.map((book) => (
            <li key={book.id}>{book.title}</li>
          ))}
        </ul>
      )}
    </main>
  );
};

export default App;`,
    senior: `import React, { useEffect, useRef, useState } from 'react';

const DEBOUNCE_MS = 100;
const MIN_LENGTH = 2;

const useDebouncedValue = (value, delay) => {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return settled;
};

const useBookSearch = (query) => {
  const cache = useRef(new Map());
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ status: 'idle', books: [] });

  useEffect(() => {
    const cached = cache.current.get(query);
    if (query.length < MIN_LENGTH || cached) {
      setState(cached ? { status: 'done', books: cached } : { status: 'idle', books: [] });
      return undefined;
    }

    const controller = new AbortController();
    setState({ status: 'searching', books: [] });
    (async () => {
      try {
        const response = await fetch(\`/api/books?q=\${encodeURIComponent(query)}\`, { signal: controller.signal });
        if (!response.ok) throw new Error(\`HTTP \${response.status}\`);
        const books = await response.json();
        cache.current.set(query, books);
        setState({ status: 'done', books });
      } catch (error) {
        if (error.name !== 'AbortError') setState({ status: 'error', books: [] });
      }
    })();
    return () => controller.abort();
  }, [query, attempt]);

  return { ...state, retry: () => setAttempt((count) => count + 1) };
};

const App = () => {
  const [text, setText] = useState('');
  const query = useDebouncedValue(text.trim(), DEBOUNCE_MS);
  const { status, books, retry } = useBookSearch(query);

  return (
    <main>
      <h2>Find a book</h2>
      <label>Search books <input value={text} onChange={(event) => setText(event.target.value)} /></label>
      {status === 'searching' && <p>Searching…</p>}
      {status === 'error' && (
        <>
          <p role="alert">Search failed</p>
          <button type="button" onClick={retry}>Try again</button>
        </>
      )}
      {status === 'done' && (books.length
        ? <ul>{books.map(({ id, title }) => <li key={id}>{title}</li>)}</ul>
        : <p>No books match “{query}”</p>)}
    </main>
  );
};

export default App;`,
    hiddenSuite: `test('short text asks nothing and clears the results', () => withFetch(async calls => {
  render(<App />);
  type('dune');
  await wait(150);
  await act(async () => { calls[0].respond(DUNE); });
  type('d');
  await wait(150);
  expect(calls).toHaveLength(1);
  expect(titles()).toEqual([]);
}));

test('an answer seen before comes back with no request', () => withFetch(async calls => {
  render(<App />);
  type('dune');
  await wait(150);
  await act(async () => { calls[0].respond(DUNE); });
  type('emma');
  await wait(150);
  await act(async () => { calls[1].respond([{ id: 3, title: 'Emma' }]); });
  type('dune');
  await wait(150);
  expect(calls).toHaveLength(2);
  expect(titles()).toEqual(['Dune', 'Dune Messiah']);
}));

test('the same text with other spaces asks nothing new', () => withFetch(async calls => {
  render(<App />);
  type('dune');
  await wait(150);
  await act(async () => { calls[0].respond(DUNE); });
  type('  dune ');
  await wait(150);
  expect(calls).toHaveLength(1);
  expect(titles()).toEqual(['Dune', 'Dune Messiah']);
}));

test('closing the page aborts the request on its way', () => withFetch(async calls => {
  const { unmount } = render(<App />);
  type('dune');
  await wait(150);
  unmount();
  expect(calls[0].signal.aborted).toBe(true);
}));

test('a retry that works shows the titles and drops the alert', () => withFetch(async calls => {
  render(<App />);
  type('dune');
  await wait(150);
  await act(async () => { calls[0].fail(new TypeError('Failed to fetch')); });
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await act(async () => { calls[1].respond(DUNE); });
  expect(screen.queryByRole('alert')).toBeNull();
  expect(titles()).toEqual(['Dune', 'Dune Messiah']);
}));

test('a failure is not kept as an answer', () => withFetch(async calls => {
  render(<App />);
  type('dune');
  await wait(150);
  await act(async () => { calls[0].fail(new TypeError('Failed to fetch')); });
  type('emma');
  await wait(150);
  type('dune');
  await wait(150);
  expect(calls).toHaveLength(3);
  expect(calls[2].url).toBe('/api/books?q=dune');
}));`,
  },
  'react-mh-autosave': {
    solution: `import React, { useEffect, useRef, useState } from 'react';

const INITIAL = 'Buy milk';
const WAIT_MS = 150;

const App = () => {
  const [text, setText] = useState(INITIAL);
  // The text last saved, for the status line.
  const [saved, setSaved] = useState(INITIAL);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  // What callbacks made by earlier renders must read: the newest text, the
  // text last saved, whether a save is on its way, and whether another was asked for.
  const latest = useRef(INITIAL);
  const savedRef = useRef(INITIAL);
  const busy = useRef(false);
  const again = useRef(false);

  const save = async () => {
    if (busy.current) {
      // One at a time: the save on its way runs this one when it answers.
      again.current = true;
      return;
    }
    const body = latest.current;
    if (body === savedRef.current) return;
    busy.current = true;
    setSaving(true);
    let ok = false;
    try {
      const response = await fetch('/api/notes/1', { method: 'PUT', body });
      ok = response.ok;
    } catch {
      ok = false;
    }
    busy.current = false;
    setSaving(false);
    if (!ok) {
      setFailed(true);
      again.current = false;
      return;
    }
    savedRef.current = body;
    setSaved(body);
    setFailed(false);
    if (again.current) {
      again.current = false;
      save();
    }
  };

  // 150 ms after the last change; each change clears the timeout before it.
  useEffect(() => {
    if (text === savedRef.current) return undefined;
    const timer = setTimeout(save, WAIT_MS);
    return () => clearTimeout(timer);
  }, [text]);

  // This cleanup belongs to the first render, so only the refs know the newest text.
  useEffect(() => () => {
    if (latest.current !== savedRef.current) {
      fetch('/api/notes/1', { method: 'PUT', body: latest.current, keepalive: true }).catch(() => {});
    }
  }, []);

  const change = (event) => {
    latest.current = event.target.value;
    setText(event.target.value);
  };

  const status = saving ? 'Saving…' : text === saved ? 'All changes saved' : 'Unsaved changes';

  return <main>
    <h2>Note</h2>
    <label>Note <textarea value={text} onChange={change} /></label>
    <p role="status">{status}</p>
    {failed && (
      <>
        <p role="alert">Could not save</p>
        <button type="button" onClick={save}>Retry</button>
      </>
    )}
  </main>;
};

export default App;`,
    junior: `import React, { useEffect, useRef, useState } from 'react';

const INITIAL = 'Buy milk';

const App = () => {
  const [text, setText] = useState(INITIAL);
  const [lastSaved, setLastSaved] = useState(INITIAL);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const newestText = useRef(INITIAL);
  const lastSavedText = useRef(INITIAL);
  const saveInProgress = useRef(false);
  const saveWanted = useRef(false);

  const saveNote = async () => {
    if (saveInProgress.current) {
      saveWanted.current = true;
      return;
    }
    const textToSave = newestText.current;
    if (textToSave === lastSavedText.current) {
      return;
    }
    saveInProgress.current = true;
    setIsSaving(true);

    let worked = false;
    try {
      const response = await fetch('/api/notes/1', { method: 'PUT', body: textToSave });
      if (response.ok) {
        worked = true;
      }
    } catch (error) {
      worked = false;
    }

    saveInProgress.current = false;
    setIsSaving(false);

    if (worked) {
      lastSavedText.current = textToSave;
      setLastSaved(textToSave);
      setSaveFailed(false);
      if (saveWanted.current) {
        saveWanted.current = false;
        saveNote();
      }
    } else {
      setSaveFailed(true);
      saveWanted.current = false;
    }
  };

  useEffect(() => {
    if (text === lastSavedText.current) {
      return;
    }
    const timeoutId = setTimeout(() => {
      saveNote();
    }, 150);
    return () => {
      clearTimeout(timeoutId);
    };
  }, [text]);

  useEffect(() => {
    return () => {
      if (newestText.current !== lastSavedText.current) {
        const request = fetch('/api/notes/1', { method: 'PUT', body: newestText.current });
        request.catch(() => {});
      }
    };
  }, []);

  const handleChange = (event) => {
    newestText.current = event.target.value;
    setText(event.target.value);
  };

  let status = 'Unsaved changes';
  if (isSaving) {
    status = 'Saving…';
  } else if (text === lastSaved) {
    status = 'All changes saved';
  }

  return (
    <main>
      <h2>Note</h2>
      <label>
        Note <textarea value={text} onChange={handleChange} />
      </label>
      <p role="status">{status}</p>
      {saveFailed && <p role="alert">Could not save</p>}
      {saveFailed && <button type="button" onClick={saveNote}>Retry</button>}
    </main>
  );
};

export default App;`,
    senior: `import React, { useCallback, useEffect, useRef, useState } from 'react';

const INITIAL = 'Buy milk';
const WAIT_MS = 150;

const putNote = (body, init = {}) => fetch('/api/notes/1', { method: 'PUT', body, ...init });

const useAutosave = (text, initial) => {
  const [saved, setSaved] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const refs = useRef({ latest: initial, saved: initial, busy: false, again: false });
  refs.current.latest = text;

  const save = useCallback(async () => {
    const r = refs.current;
    if (r.busy) {
      r.again = true;
      return;
    }
    const body = r.latest;
    if (body === r.saved) return;
    r.busy = true;
    setSaving(true);
    const ok = await putNote(body).then((response) => response.ok, () => false);
    r.busy = false;
    setSaving(false);
    if (!ok) {
      r.again = false;
      setFailed(true);
      return;
    }
    r.saved = body;
    setSaved(body);
    setFailed(false);
    if (r.again) {
      r.again = false;
      save();
    }
  }, []);

  useEffect(() => {
    if (text === refs.current.saved) return undefined;
    const timer = setTimeout(save, WAIT_MS);
    return () => clearTimeout(timer);
  }, [text, save]);

  useEffect(() => () => {
    const { latest, saved: last } = refs.current;
    if (latest !== last) putNote(latest, { keepalive: true }).catch(() => {});
  }, []);

  return { saved, saving, failed, save };
};

const App = () => {
  const [text, setText] = useState(INITIAL);
  const { saved, saving, failed, save } = useAutosave(text, INITIAL);
  const status = saving ? 'Saving…' : text === saved ? 'All changes saved' : 'Unsaved changes';

  return (
    <main>
      <h2>Note</h2>
      <label>Note <textarea value={text} onChange={(event) => setText(event.target.value)} /></label>
      <p role="status">{status}</p>
      {failed && (
        <>
          <p role="alert">Could not save</p>
          <button type="button" onClick={save}>Retry</button>
        </>
      )}
    </main>
  );
};

export default App;`,
    hiddenSuite: `test('text changed back needs no save', () => withSaves(async calls => {
  render(<App />);
  type('Buy milk!');
  type('Buy milk');
  expect(status()).toBe('All changes saved');
  await wait(250);
  expect(calls).toHaveLength(0);
}));

test('an answer that is not ok is a failure too', () => withSaves(async calls => {
  render(<App />);
  type('Buy bread');
  await wait(200);
  await act(async () => { calls[0].error(); });
  expect(screen.getByRole('alert').textContent).toBe('Could not save');
  expect(status()).toBe('Unsaved changes');
}));

test('closing with everything saved sends nothing', () => withSaves(async calls => {
  const { unmount } = render(<App />);
  unmount();
  expect(calls).toHaveLength(0);
}));

test('closing during a save sends the newest text', () => withSaves(async calls => {
  const { unmount } = render(<App />);
  type('Buy bread');
  await wait(200);
  type('Buy bread and jam');
  unmount();
  expect(calls).toHaveLength(2);
  expect(calls[1].body).toBe('Buy bread and jam');
}));

test('only one save is on its way at a time, and the newest text goes next', () => withSaves(async calls => {
  render(<App />);
  type('A');
  await wait(200);
  type('AB');
  await wait(200);
  type('ABC');
  await wait(200);
  expect(calls).toHaveLength(1);
  await act(async () => { calls[0].ok(); });
  expect(calls).toHaveLength(2);
  expect(calls[1].body).toBe('ABC');
}));

test('Retry sends the newest text', () => withSaves(async calls => {
  render(<App />);
  type('Buy bread');
  await wait(200);
  await act(async () => { calls[0].fail(); });
  type('Buy bread and jam');
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(calls).toHaveLength(2);
  expect(calls[1].body).toBe('Buy bread and jam');
}));`,
  },
};
