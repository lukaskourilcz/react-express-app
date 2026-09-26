// The Medium and Hard band of the React track, first wave (#226).
//
// Every challenge here combines two to four techniques the Easy band already
// taught: the technique-coverage contract (`scripts/coding-coverage.ts`) only
// lets a Medium or Hard challenge carry a focus tag that at least three Easy
// React challenges carry. Tier 3 reads Medium, tier 4 reads Hard, and the two
// capstones at the end sit at tier 5, beside the track's other capstones;
// nothing sets an authored difficulty.
//
// A React challenge is graded by its Testing Library suite, and the server
// also runs the hidden cases kept beside the solutions (`hiddenSuite`, see
// `../react-hidden.ts`). The suites reuse the first Easy wave's header and
// its hand-answered fetch; the autosave capstone needs the method and body of
// each request, so it brings a fake fetch of its own. Timers are real and
// short, 100 to 300 milliseconds, so no suite takes longer than the slowest
// suite already in the catalogue: in production the whole run, loading jsdom
// and React included, has ten seconds. The one check that needs a timer not to
// have fired yet, the autosave's "150 ms after the last key", runs on the
// hand-moved clock of `FAKE_CLOCK` instead: with a real clock a collector pause
// of 50 ms let the save fire before the check that expects none. Solutions live in
// `../solutions/medium-hard-react-a.ts`, and `MEDIUM_HARD_BAND` in
// `../catalog.ts` lists this file, which keeps these challenges out of every
// Learn level's quota. English only: there is no Czech overlay.
//
// Task bodies only: prompts, starters, visible tests, hints. No solutions.

import type { CodingTaskSource } from '../types';
import { FAKE_CLOCK, FAKE_FETCH, header } from './easy-react-a';

export const MEDIUM_HARD_REACT_A_TASKS: CodingTaskSource[] = [
  /* ── Medium ───────────────────────────────────────────────────────── */
  {
    id: 'react-mh-basket-context',
    track: 'react',
    topic: 'react',
    level: 21,
    tier: 3,
    focus: ['useContext', 'useReducer', 'custom-hook'],
    title: 'A basket every page can reach',
    prompt: 'A shop shows its basket in the header, the product list and the basket panel, three components that all need the same lines. Share them through context. `basketReducer(lines, action)` works out the next lines, where a line is `{ id, name, quantity }`. `{ type: "add", product }` adds one: the product’s line gains 1, or a new line with quantity 1 goes on the end. `{ type: "remove", id }` takes one away, and a line that reaches 0 leaves the list. Any other action returns the very same `lines`. Never change the array or a line you were given: return new ones. `BasketProvider` keeps the lines with `useReducer(basketReducer, [])` and provides `{ lines, add, remove }`, where `add(product)` and `remove(id)` dispatch. `useBasket()` reads that context and throws `new Error("useBasket must be used inside BasketProvider")` when there is no provider, so create the context with `null` as its default. Then finish the components: `BasketBadge` shows `Basket (n)`, where n counts items, not lines. `BasketLines` shows "Your basket is empty" when it is, and otherwise a list labelled "Basket" with one `li` per line: the text `Tea × 2` in a `span`, then the buttons "Remove one Tea" and "Add one Tea".',
    starter: `import React, { createContext, useContext, useReducer } from 'react';

const PRODUCTS = [
  { id: 'tea', name: 'Tea' },
  { id: 'cake', name: 'Cake' },
  { id: 'jam', name: 'Jam' },
];

export const basketReducer = (lines, action) => {
  return lines;
};

export const BasketProvider = ({ children }) => {
  return children;
};

export const useBasket = () => {
  return { lines: [], add: () => {}, remove: () => {} };
};

const BasketBadge = () => {
  const { lines } = useBasket();
  return <p>Basket (0)</p>;
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
  return <p>Your basket is empty</p>;
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

export default App;
`,
    skeleton: `export const basketReducer = (lines, action) => {
  switch (action.type) {
    case 'add':
      // a line for this product already: map to a copy with quantity + 1
      // otherwise: [...lines, { id, name, quantity: 1 }]
    case 'remove':
      // map to a copy with quantity - 1, then filter out the zeros
    default:
      return lines;
  }
};

const BasketContext = createContext(null);

export const BasketProvider = ({ children }) => {
  const [lines, dispatch] = useReducer(basketReducer, []);
  const add = (product) => dispatch({ type: 'add', product });
  const remove = (id) => dispatch({ type: 'remove', id });
  return <BasketContext.Provider value={{ lines, add, remove }}>{children}</BasketContext.Provider>;
};

export const useBasket = () => {
  const basket = useContext(BasketContext);
  // no provider above: throw the error
  return basket;
};`,
    hints: [
      'A reducer is a plain function, so you can call it in a test or in your head: the same lines and the same action always give the same answer. Returning the same array for an action you do not know is how React knows nothing changed.',
      'A context with `null` as its default tells you something: `useContext` gives `null` only when no provider sits above the component. The count in the badge is a sum, `lines.reduce((sum, line) => sum + line.quantity, 0)`.',
    ],
    approach: [
      'Write `basketReducer` with a `switch` on `action.type`: `map` to update a line, spread to append one, `filter` to drop a line at 0.',
      'Create the context with `createContext(null)`. `BasketProvider` calls `useReducer` and provides the lines with `add` and `remove`.',
      '`useBasket` reads the context and throws when it is `null`.',
      'Finish `BasketBadge` with the total quantity and `BasketLines` with the empty message or the labelled list.',
    ],
    verify: 'tests',
    estimatedMinutes: 25,
    suite: `${header('BasketProvider, useBasket, basketReducer')}
const press = label => fireEvent.click(screen.getByRole('button', { name: label }));
const lines = () => {
  const list = screen.queryByRole('list', { name: 'Basket' });
  return list ? within(list).getAllByRole('listitem').map(li => li.querySelector('span').textContent) : [];
};
const message = run => {
  try {
    run();
    return 'no error';
  } catch (error) {
    return error.message;
  }
};

test('the badge starts at Basket (0) and the basket is empty', () => {
  render(<App />);
  expect(screen.getByText('Basket (0)')).toBeTruthy();
  expect(screen.getByText('Your basket is empty')).toBeTruthy();
});

test('adding Tea twice gives one line of 2', () => {
  render(<App />);
  press('Add Tea');
  press('Add Tea');
  expect(lines()).toEqual(['Tea × 2']);
  expect(screen.getByText('Basket (2)')).toBeTruthy();
});

test('the badge counts items, not lines', () => {
  render(<App />);
  press('Add Tea');
  press('Add Cake');
  press('Add Tea');
  expect(lines()).toEqual(['Tea × 2', 'Cake × 1']);
  expect(screen.getByText('Basket (3)')).toBeTruthy();
});

test('Remove one takes one away, and a line at 0 leaves', () => {
  render(<App />);
  press('Add Tea');
  press('Add Tea');
  press('Remove one Tea');
  expect(lines()).toEqual(['Tea × 1']);
  press('Remove one Tea');
  expect(lines()).toEqual([]);
  expect(screen.getByText('Your basket is empty')).toBeTruthy();
  expect(screen.getByText('Basket (0)')).toBeTruthy();
});

test('useBasket outside the provider throws a clear error', () => {
  const Probe = () => <output>{message(() => useBasket())}</output>;
  const { container } = render(<Probe />);
  expect(container.textContent).toBe('useBasket must be used inside BasketProvider');
});

test('the reducer gives new arrays and leaves the old ones alone', () => {
  const before = Object.freeze([Object.freeze({ id: 'tea', name: 'Tea', quantity: 1 })]);
  const after = basketReducer(before, { type: 'add', product: { id: 'tea', name: 'Tea' } });
  expect(after === before).toBe(false);
  expect(after).toEqual([{ id: 'tea', name: 'Tea', quantity: 2 }]);
  expect(before[0].quantity).toBe(1);
});
`,
  },
  {
    id: 'react-mh-load-more',
    track: 'react',
    topic: 'react',
    level: 23,
    tier: 3,
    focus: ['fetch', 'pagination', 'spread', 'conditional'],
    title: 'Load more from the server',
    prompt: 'A photo library shows 3 photos a page and asks the server for one page at a time. On mount, fetch `/api/photos?page=1`; the answer is a list of `{ id, title }`, and each title goes in an `li`. A "Load more" button fetches the next page and adds its photos after the ones already shown, with spread. While a request is on its way, the button is disabled and reads "Loading…". A page with fewer than 3 photos is the last one: the button goes, and a paragraph says "That’s everything". When a request fails, keep the photos already shown, show "Could not load photos" in an element with `role="alert"`, and turn the button into "Try again", which asks for the same page again. The alert goes as soon as the next request starts.',
    starter: `import React, { useEffect, useState } from 'react';

const PAGE_SIZE = 3;

const App = () => {
  const [photos, setPhotos] = useState([]);

  useEffect(() => {
    fetch('/api/photos?page=1')
      .then((response) => response.json())
      .then((page) => setPhotos(page));
  }, []);

  return <main>
    <h2>Photos</h2>
    <ul>
      {photos.map((photo) => <li key={photo.id}>{photo.title}</li>)}
    </ul>
    <button type="button">Load more</button>
  </main>;
};

export default App;
`,
    skeleton: `const [photos, setPhotos] = useState([]);
const [page, setPage] = useState(0);          // the last page shown
const [status, setStatus] = useState('loading'); // 'loading', 'ready', 'error' or 'done'

const load = (number) => {
  setStatus('loading');
  fetch('/api/photos?page=' + number)
    .then((response) => response.json())
    .then((next) => {
      // append with spread, remember the page, and decide: 'ready' or 'done'
    })
    .catch(() => setStatus('error'));
};

useEffect(() => { load(1); }, []);

// render: the list, then one of "That’s everything", the alert with "Try again",
// or the Load more button, disabled and reading "Loading…" while loading`,
    hints: [
      'Add a page with the updater form, `setPhotos((shown) => [...shown, ...next])`, so the new photos land after the ones on screen even if the list changed while the request was out.',
      'One `status` value, `"loading"`, `"ready"`, `"error"` or `"done"`, decides what shows under the list. The page to ask for next is always the last page shown plus one, and "Try again" asks for that same page.',
    ],
    approach: [
      'Keep the photos, the last page shown and a status in state.',
      'Write `load(number)`: set the status to loading, fetch that page, append its photos, remember the page number, and set the status to done for a short page and ready otherwise. A failure sets the status to error.',
      'Call `load(1)` in an effect on mount, and `load(page + 1)` from the button.',
      'Render the button as "Load more", "Loading…" (disabled) or "Try again" from the status, the alert on an error, and "That’s everything" instead of the button when the status is done.',
    ],
    verify: 'tests',
    estimatedMinutes: 25,
    suite: `${header()}${FAKE_FETCH}
const photos = (from, count) => Array.from({ length: count }, (_, i) => ({ id: from + i, title: 'Photo ' + (from + i) }));
const titles = () => screen.queryAllByRole('listitem').map(li => li.textContent);
const press = label => fireEvent.click(screen.getByRole('button', { name: label }));

test('the first page is asked for on mount and listed', () => withFetch(async calls => {
  render(<App />);
  expect(calls[0].url).toBe('/api/photos?page=1');
  await act(async () => { calls[0].respond(photos(1, 3)); });
  expect(titles()).toEqual(['Photo 1', 'Photo 2', 'Photo 3']);
  expect(screen.getByRole('button', { name: 'Load more' }).disabled).toBe(false);
}));

test('Load more adds the next page after the first', () => withFetch(async calls => {
  render(<App />);
  await act(async () => { calls[0].respond(photos(1, 3)); });
  press('Load more');
  expect(calls[1].url).toBe('/api/photos?page=2');
  await act(async () => { calls[1].respond(photos(4, 3)); });
  expect(titles()).toEqual(['Photo 1', 'Photo 2', 'Photo 3', 'Photo 4', 'Photo 5', 'Photo 6']);
}));

test('the button is disabled and says Loading… while a request is out', () => withFetch(async calls => {
  render(<App />);
  expect(screen.getByRole('button', { name: 'Loading…' }).disabled).toBe(true);
  await act(async () => { calls[0].respond(photos(1, 3)); });
  press('Load more');
  expect(screen.getByRole('button', { name: 'Loading…' }).disabled).toBe(true);
}));

test('a short page is the last one', () => withFetch(async calls => {
  render(<App />);
  await act(async () => { calls[0].respond(photos(1, 3)); });
  press('Load more');
  await act(async () => { calls[1].respond(photos(4, 1)); });
  expect(titles()).toHaveLength(4);
  expect(screen.getByText('That’s everything')).toBeTruthy();
  expect(screen.queryByRole('button')).toBeNull();
}));

test('a failure keeps the photos and Try again asks for the same page', () => withFetch(async calls => {
  render(<App />);
  await act(async () => { calls[0].respond(photos(1, 3)); });
  press('Load more');
  await act(async () => { calls[1].fail(new TypeError('Failed to fetch')); });
  expect(screen.getByRole('alert').textContent).toBe('Could not load photos');
  expect(titles()).toHaveLength(3);
  press('Try again');
  expect(calls[2].url).toBe('/api/photos?page=2');
  expect(screen.queryByRole('alert')).toBeNull();
}));
`,
  },
  {
    id: 'react-mh-sortable-table',
    track: 'react',
    topic: 'react',
    level: 10,
    tier: 3,
    focus: ['derived-state', 'accessibility', 'events'],
    title: 'Sort a table by any column',
    prompt: 'The table of top scorers should sort by whichever column you choose. Each column header holds a button. The first click on a column sorts the rows by it, ascending; the next click on the same column sorts descending, and the one after that ascending again. A click on a different column sorts by that column, ascending. The sorted column’s `th` carries `aria-sort="ascending"` or `aria-sort="descending"`, and the other headers carry no `aria-sort` at all, so a screen reader can announce how the table is sorted. Keep only the column and the direction in state, and sort a copy of `PLAYERS` while rendering: `PLAYERS` itself never changes order. Names and teams compare with `localeCompare`, goals as numbers, and rows that tie keep their order from `PLAYERS` in both directions. Before the first click, the rows are in `PLAYERS` order.',
    starter: `import React, { useState } from 'react';

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
  return <table>
    <caption>Top scorers</caption>
    <thead>
      <tr>
        {COLUMNS.map((column) => (
          <th key={column.key} scope="col">
            <button type="button">{column.label}</button>
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {PLAYERS.map((player) => (
        <tr key={player.name}>
          <td>{player.name}</td>
          <td>{player.team}</td>
          <td>{player.goals}</td>
        </tr>
      ))}
    </tbody>
  </table>;
};

export default App;
`,
    skeleton: `const [sort, setSort] = useState(null); // { key, direction } or null

const choose = (key) => {
  // the same column: flip the direction; another column: ascending
};

const compare = (a, b, key) => /* numbers by value, text with localeCompare */;

const rows = sort === null
  ? PLAYERS
  : [...PLAYERS].sort((a, b) => /* compare, turned round for descending */);

// <th aria-sort={...}>: the direction for the sorted column, undefined for the rest`,
    hints: [
      'Sorting while rendering keeps the rows and the choice in step: there is no second list to update. `[...PLAYERS].sort(...)` sorts a copy; `PLAYERS.sort(...)` would reorder the original for every later render.',
      'For descending, flip the result of the comparison: `-compare(a, b)`. Reversing the ascending list would also reverse rows that tie. React leaves out an attribute whose value is `undefined`, which is how the other headers carry no `aria-sort`.',
    ],
    approach: [
      'Keep `{ key, direction }` in state, or `null` before the first click.',
      'On a click, flip the direction when the column is already sorted, and start ascending otherwise.',
      'While rendering, sort a copy of `PLAYERS` with a comparison that handles numbers and text and flips for descending.',
      'Set `aria-sort` on the sorted `th` only, and give each header button an `onClick` for its column.',
    ],
    verify: 'tests',
    estimatedMinutes: 20,
    suite: `${header('PLAYERS')}
const names = () => screen.getAllByRole('row').slice(1).map(row => row.cells[0].textContent);
const heading = label => screen.getByRole('columnheader', { name: label });
const sortBy = label => fireEvent.click(screen.getByRole('button', { name: label }));

test('the rows start in PLAYERS order and no header is sorted', () => {
  render(<App />);
  expect(names()).toEqual(['Mia', 'Ali', 'Zoe', 'Ben']);
  expect(['Name', 'Team', 'Goals'].map(label => heading(label).getAttribute('aria-sort'))).toEqual([null, null, null]);
});

test('a click sorts ascending and marks the header', () => {
  render(<App />);
  sortBy('Goals');
  expect(names()).toEqual(['Ben', 'Mia', 'Zoe', 'Ali']);
  expect(heading('Goals').getAttribute('aria-sort')).toBe('ascending');
});

test('a second click sorts descending, and ties keep their order', () => {
  render(<App />);
  sortBy('Goals');
  sortBy('Goals');
  expect(names()).toEqual(['Ali', 'Mia', 'Zoe', 'Ben']);
  expect(heading('Goals').getAttribute('aria-sort')).toBe('descending');
});

test('another column sorts ascending and takes aria-sort with it', () => {
  render(<App />);
  sortBy('Goals');
  sortBy('Name');
  expect(names()).toEqual(['Ali', 'Ben', 'Mia', 'Zoe']);
  expect(heading('Name').getAttribute('aria-sort')).toBe('ascending');
  expect(heading('Goals').getAttribute('aria-sort')).toBeNull();
});

test('text columns sort as text', () => {
  render(<App />);
  sortBy('Team');
  expect(names()).toEqual(['Ali', 'Ben', 'Mia', 'Zoe']);
});
`,
  },
  {
    id: 'react-mh-notices',
    track: 'react',
    topic: 'react',
    level: 13,
    tier: 3,
    focus: ['timers', 'effect-cleanup', 'lists-keys'],
    title: 'Notices that dismiss themselves',
    prompt: 'The Save and Delete buttons each add a notice, "Saved" or "Deleted", to the region with `role="status"`. Each notice is an `li` with its text in a `span` and a button named "Dismiss <text>", such as "Dismiss Saved", which removes it at once. A notice also leaves by itself 300 milliseconds after it appeared; a real one would stay for several seconds, and the short wait keeps the checks quick. At most three notices show at once, so a fourth pushes out the oldest. Give every notice an id from a counter and use it as the key: the text is not unique, and an index moves when an older notice leaves. Move each notice into a `Notice` component whose effect starts the 300 ms timeout and whose cleanup clears it. Then a notice that is dismissed or pushed out early leaves no timer behind, and each timer belongs to exactly one notice.',
    starter: `import React, { useState } from 'react';

const App = () => {
  const [notices, setNotices] = useState([]);

  const notify = (text) => {
    setNotices((current) => [...current, text]);
  };

  return <main>
    <h2>Notices</h2>
    <button type="button" onClick={() => notify('Saved')}>Save</button>
    <button type="button" onClick={() => notify('Deleted')}>Delete</button>
    <div role="status">
      <ul>
        {notices.map((text, index) => <li key={index}><span>{text}</span></li>)}
      </ul>
    </div>
  </main>;
};

export default App;
`,
    skeleton: `const Notice = ({ text, onClose }) => {
  useEffect(() => {
    // start a 300 ms timeout that calls onClose
    // return a cleanup that clears it
  }, []);
  return <li><span>{text}</span> <button type="button" aria-label={'Dismiss ' + text} onClick={onClose}>×</button></li>;
};

const nextId = useRef(1);
const notify = (text) => {
  const notice = { id: nextId.current++, text };
  // add it, and keep only the newest three
};
const dismiss = (id) => /* remove the notice with that id */;

// {notices.map((notice) => <Notice key={notice.id} text={notice.text} onClose={() => dismiss(notice.id)} />)}`,
    hints: [
      'An effect with `[]` runs once for each component instance, and its cleanup runs when that instance leaves. With the notice’s id as its key, React keeps each `Notice` instance with its own notice, so the timeout and the cleanup belong to the right one.',
      'With an index as the key, removing the oldest notice hands its instance, and its finished timer, to the next notice in the list, and unmounts the last instance, clearing a timer that was still needed.',
    ],
    approach: [
      'Store notices as `{ id, text }`, with ids from a counter kept in a ref.',
      'Add a notice with the updater form and `slice(-3)`, so the list never holds more than three.',
      'Write `Notice`: an effect with `[]` starts the timeout and returns `() => clearTimeout(timer)`, and the button calls the same `onClose`.',
      'Render `<Notice key={notice.id} ... />` inside the status region, with `onClose` removing that id.',
    ],
    verify: 'tests',
    estimatedMinutes: 25,
    suite: `${header()}${FAKE_CLOCK}
const wait = ms => act(() => new Promise(resolve => setTimeout(resolve, ms)));
const press = label => fireEvent.click(screen.getAllByRole('button', { name: label })[0]);
const texts = () => [...screen.getByRole('status').querySelectorAll('li span')].map(span => span.textContent);

test('a notice appears in the status region', () => {
  render(<App />);
  press('Save');
  expect(texts()).toEqual(['Saved']);
});

// The timing checks run on the hand-moved clock, so a busy machine cannot
// make a notice leave before the check that expects it still there.
test('a notice leaves by itself after 300 ms', () => withClock(async clock => {
  render(<App />);
  press('Save');
  await clock.tick(180);
  expect(texts()).toEqual(['Saved']);
  await clock.tick(210);
  expect(texts()).toEqual([]);
}));

test('Dismiss removes its own notice at once', () => {
  render(<App />);
  press('Save');
  press('Delete');
  press('Dismiss Deleted');
  expect(texts()).toEqual(['Saved']);
});

test('a fourth notice pushes out the oldest', () => {
  render(<App />);
  press('Save');
  press('Delete');
  press('Save');
  press('Delete');
  expect(texts()).toEqual(['Deleted', 'Saved', 'Deleted']);
});

test('each notice keeps its own 300 ms', () => withClock(async clock => {
  render(<App />);
  press('Save');
  await clock.tick(180);
  press('Delete');
  await clock.tick(180);
  expect(texts()).toEqual(['Deleted']);
  await clock.tick(180);
  expect(texts()).toEqual([]);
}));
`,
  },
  {
    id: 'react-mh-tag-input',
    track: 'react',
    topic: 'react',
    level: 22,
    tier: 3,
    focus: ['forms', 'events', 'splice', 'accessibility'],
    title: 'A tag input',
    prompt: 'A field labelled "Tags" turns what you type into tags. Enter, or a comma, adds the text as a tag, trimmed and in lower case, and clears the field. Blank text adds nothing, and a tag that is already there is not added twice; the field is cleared either way. Call `preventDefault()` for those two keys, so Enter does not submit a form around the field and a comma never lands in it. Backspace in an empty field removes the last tag. The tags form a list labelled "Tags chosen": each is an `li` with the tag in a `span` and a button whose accessible name is "Remove tag <tag>", such as "Remove tag css". Remove a tag by copying the array and calling `splice` on the copy.',
    starter: `import React, { useState } from 'react';

const App = () => {
  const [text, setText] = useState('');
  const [tags, setTags] = useState([]);

  const keyDown = (event) => {
  };

  return <main>
    <h2>A tag input</h2>
    <label>Tags <input value={text} onChange={(event) => setText(event.target.value)} onKeyDown={keyDown} /></label>
    <ul aria-label="Tags chosen">
      {tags.map((tag) => <li key={tag}><span>{tag}</span></li>)}
    </ul>
  </main>;
};

export default App;
`,
    skeleton: `const add = () => {
  const tag = /* the text, trimmed and in lower case */;
  // not blank and not there yet: add it
  setText('');
};

const keyDown = (event) => {
  if (event.key === 'Enter' || event.key === ',') {
    event.preventDefault();
    add();
  } else if (event.key === 'Backspace' && text === '') {
    // remove the last tag
  }
};

const remove = (index) => {
  const next = [...tags];
  // splice the tag out of the copy
  setTags(next);
};

// <button type="button" aria-label={'Remove tag ' + tag} onClick={() => remove(index)}>×</button>`,
    hints: [
      'A keydown handler runs before the browser acts on the key, which is why `preventDefault()` there keeps the comma out of the field and stops Enter from submitting a form.',
      '`splice(index, 1)` changes the array it is called on, so call it on a copy made with spread; the array in state must stay as it was until `setTags` hands React the new one. `tags.slice(0, -1)` is a new array without the last tag.',
    ],
    approach: [
      'Handle `onKeyDown` on the input: Enter and comma prevent the default and add the tag, Backspace on empty text removes the last one.',
      'Adding trims and lower-cases the text, skips blank text and a tag already there, and always clears the field.',
      'Removing copies the tags, splices out one index and stores the copy.',
      'Render each tag with a remove button that has `aria-label="Remove tag <tag>"`, so the button says what it removes.',
    ],
    verify: 'tests',
    estimatedMinutes: 20,
    suite: `${header()}
const field = () => screen.getByLabelText('Tags');
const type = value => fireEvent.change(field(), { target: { value } });
const key = name => fireEvent.keyDown(field(), { key: name });
const tags = () => [...screen.getByRole('list', { name: 'Tags chosen' }).querySelectorAll('li span')].map(span => span.textContent);
const add = value => { type(value); key('Enter'); };

test('Enter adds the text as a tag and clears the field', () => {
  render(<App />);
  add('React');
  expect(tags()).toEqual(['react']);
  expect(field().value).toBe('');
});

test('a comma adds a tag too', () => {
  render(<App />);
  type(' CSS ');
  key(',');
  expect(tags()).toEqual(['css']);
});

test('blank text and a repeated tag add nothing', () => {
  render(<App />);
  add('   ');
  add('css');
  add('CSS');
  expect(tags()).toEqual(['css']);
  expect(field().value).toBe('');
});

test('Backspace in an empty field removes the last tag', () => {
  render(<App />);
  add('a');
  add('b');
  key('Backspace');
  expect(tags()).toEqual(['a']);
});

test('each tag has a remove button named after it', () => {
  render(<App />);
  add('a');
  add('b');
  add('c');
  fireEvent.click(screen.getByRole('button', { name: 'Remove tag b' }));
  expect(tags()).toEqual(['a', 'c']);
});

test('Enter is prevented, so a form around the field is not sent', () => {
  render(<App />);
  type('html');
  expect(fireEvent.keyDown(field(), { key: 'Enter' })).toBe(false);
});
`,
  },
  {
    id: 'react-mh-select-all',
    track: 'react',
    topic: 'react',
    level: 14,
    tier: 3,
    focus: ['derived-state', 'forms', 'useRef', 'useEffect'],
    title: 'Select all, or some',
    prompt: 'An inbox lists four messages, each with a checkbox labelled by its subject. Above them, a checkbox labelled "Select all" shows the selection: checked when every message is selected, unchecked when none is, and in between when some are, which a checkbox shows through its `indeterminate` property. `indeterminate` has no HTML attribute and no React prop, so put a ref on the box and set `ref.current.indeterminate` in an effect that runs whenever the selection changes. Clicking "Select all" selects every message, unless all are selected already, and then it clears them. A button "Delete selected (n)", disabled when n is 0, removes the selected messages. Keep the messages and the selected ids in state, and work out all, none and some while rendering. With no messages left, "Select all" is unchecked and disabled.',
    starter: `import React, { useEffect, useRef, useState } from 'react';

const MESSAGES = [
  { id: 1, subject: 'Lunch on Friday' },
  { id: 2, subject: 'Invoice 1042' },
  { id: 3, subject: 'Your parcel is on its way' },
  { id: 4, subject: 'Team photos' },
];

const App = () => {
  const [messages, setMessages] = useState(MESSAGES);
  const [selected, setSelected] = useState([]);

  const toggle = (id) => {
    setSelected(selected.includes(id) ? selected.filter((one) => one !== id) : [...selected, id]);
  };

  return <main>
    <h2>Inbox</h2>
    <label><input type="checkbox" /> Select all</label>
    <button type="button">Delete selected (0)</button>
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

export default App;
`,
    skeleton: `const allRef = useRef(null);
const count = /* how many of the messages are selected */;
const all = messages.length > 0 && count === messages.length;
const some = count > 0 && !all;

useEffect(() => {
  // allRef.current.indeterminate = some
}, [some]);

const toggleAll = () => {
  // all selected: clear; otherwise select every message
};

const removeSelected = () => {
  // keep the messages that are not selected, and clear the selection
};

// <input type="checkbox" ref={allRef} checked={all} disabled={messages.length === 0} onChange={toggleAll} />`,
    hints: [
      'All, none and some follow from the messages and the selected ids, so they are worked out on every render and never stored. Only the effect needs to reach the DOM, because `indeterminate` exists only as a property of the element.',
      'Count the selected messages that still exist, `messages.filter((message) => selected.includes(message.id)).length`, or clear the selection when you delete: either way a deleted message must not stay counted.',
    ],
    approach: [
      'Work out how many messages are selected, and from that whether all or some are.',
      'Put a ref on the "Select all" box, give it `checked={all}`, and set its `indeterminate` property in an effect that depends on `some`.',
      '"Select all" selects every id, or clears the selection when all are selected.',
      'The delete button shows the count, is disabled at 0, and keeps only the messages that are not selected.',
    ],
    verify: 'tests',
    estimatedMinutes: 20,
    suite: `${header()}
const box = name => screen.getByRole('checkbox', { name });
const all = () => box('Select all');
const deleteButton = () => screen.getByRole('button', { name: /^Delete selected/ });

test('nothing is selected at first', () => {
  render(<App />);
  expect(all().checked).toBe(false);
  expect(all().indeterminate).toBe(false);
  expect(deleteButton().textContent).toBe('Delete selected (0)');
  expect(deleteButton().disabled).toBe(true);
});

test('one selected message makes Select all indeterminate', () => {
  render(<App />);
  fireEvent.click(box('Lunch on Friday'));
  expect(all().indeterminate).toBe(true);
  expect(all().checked).toBe(false);
  expect(deleteButton().textContent).toBe('Delete selected (1)');
  expect(deleteButton().disabled).toBe(false);
});

test('selecting every message checks Select all', () => {
  render(<App />);
  ['Lunch on Friday', 'Invoice 1042', 'Your parcel is on its way', 'Team photos'].forEach(name => fireEvent.click(box(name)));
  expect(all().checked).toBe(true);
  expect(all().indeterminate).toBe(false);
});

test('Select all selects everything, and clicked again clears it', () => {
  render(<App />);
  fireEvent.click(all());
  expect(screen.getAllByRole('checkbox').every(one => one.checked)).toBe(true);
  fireEvent.click(all());
  expect(screen.getAllByRole('checkbox').some(one => one.checked)).toBe(false);
});

test('Select all with some selected selects the rest', () => {
  render(<App />);
  fireEvent.click(box('Invoice 1042'));
  fireEvent.click(all());
  expect(screen.getAllByRole('checkbox').every(one => one.checked)).toBe(true);
});

test('Delete selected removes the chosen messages', () => {
  render(<App />);
  fireEvent.click(box('Invoice 1042'));
  fireEvent.click(box('Team photos'));
  fireEvent.click(deleteButton());
  expect(screen.getAllByRole('listitem').map(li => li.textContent.trim())).toEqual(['Lunch on Friday', 'Your parcel is on its way']);
  expect(all().checked).toBe(false);
  expect(all().indeterminate).toBe(false);
});
`,
  },
  {
    id: 'react-mh-use-shortcut',
    track: 'react',
    topic: 'react',
    level: 21,
    tier: 3,
    focus: ['custom-hook', 'events', 'effect-cleanup', 'useRef'],
    title: 'Keyboard shortcuts with a hook',
    prompt: 'Write `useShortcut(key, handler)`, a hook that calls `handler(event)` whenever that key is pressed anywhere on the page: add a `keydown` listener to `window` in an effect, and remove it in the cleanup. Two details make it pleasant to use. Keep the newest handler in a ref, updated on every render, and let the listener call `handlerRef.current`: the handler can then read fresh state while the listener is added once per key, not after every render. And ignore key presses whose target is an `input`, a `textarea` or a `select`, so typing a slash into a text field still types a slash. App already uses the hook: "/" moves the focus to the Search field, and "n" adds one to "New notes".',
    starter: `import React, { useEffect, useRef, useState } from 'react';

export const useShortcut = (key, handler) => {
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

export default App;
`,
    skeleton: `const TYPING = ['INPUT', 'TEXTAREA', 'SELECT'];

export const useShortcut = (key, handler) => {
  const handlerRef = useRef(handler);
  handlerRef.current = handler; // the newest handler, every render

  useEffect(() => {
    const onKeyDown = (event) => {
      // the right key, and not typed into a field: call handlerRef.current(event)
    };
    window.addEventListener('keydown', onKeyDown);
    return () => /* remove the same function */;
  }, [key]);
};`,
    hints: [
      'The effect depends on `key` only, so it runs once for a key and the listener it adds lives until the key changes or the component leaves. The handler App passes is a new function on every render; reading it from a ref means the listener always calls the newest one without being added again.',
      '`event.target.tagName` is `"INPUT"`, `"TEXTAREA"` or `"SELECT"` for a key typed into a field. `removeEventListener` only removes the very function that was added, so keep it in a variable inside the effect.',
    ],
    approach: [
      'Create `handlerRef` with `useRef(handler)` and assign `handlerRef.current = handler` in the hook’s body.',
      'In an effect that depends on `key`, define the listener: skip events from fields, and call `handlerRef.current(event)` when `event.key` matches.',
      'Add it to `window` and return a cleanup that removes it.',
    ],
    verify: 'tests',
    estimatedMinutes: 25,
    suite: `${header('useShortcut')}
const press = (key, target = document.body) => fireEvent.keyDown(target, { key });
const notes = () => screen.getByText(/^New notes:/).textContent;

test('/ moves the focus to the search field', () => {
  render(<App />);
  press('/');
  expect(document.activeElement).toBe(screen.getByLabelText('Search'));
});

test('n adds one each time, from the newest count', () => {
  render(<App />);
  press('n');
  press('n');
  press('n');
  expect(notes()).toBe('New notes: 3');
});

test('a key typed into a field is left alone', () => {
  render(<App />);
  const search = screen.getByLabelText('Search');
  search.focus();
  press('n', search);
  expect(notes()).toBe('New notes: 0');
});

test('the hook hands the handler the event, for its key only', () => {
  const seen = [];
  const Probe = () => {
    useShortcut('k', event => seen.push(event.key));
    return <p>probe</p>;
  };
  render(<Probe />);
  press('k');
  press('j');
  expect(seen).toEqual(['k']);
});

test('/ is prevented, so no slash is typed anywhere', () => {
  render(<App />);
  expect(press('/')).toBe(false);
});
`,
  },
  {
    id: 'react-mh-rename-in-place',
    track: 'react',
    topic: 'react',
    level: 15,
    tier: 3,
    focus: ['forms', 'useRef', 'events', 'lists-keys'],
    title: 'Rename in place',
    prompt: 'Each file in the list shows its name in a `span` and a button whose accessible name is "Rename <name>". Clicking it swaps the name for a small form: an input labelled "New name for <name>", filled with the current name and focused. Submitting the form saves the trimmed text; blank text, or the name the file already has, just closes the form. The Escape key in the input closes the form without saving. A name that another file already has is refused: the form stays open and shows "That name is taken" in an element with `role="alert"`, which goes when the form closes. Only one file is renamed at a time: Rename on another file closes the first form without saving. Whenever a form closes by a save or by Escape, the focus goes back to that file’s Rename button, so a keyboard user keeps their place. Keep the buttons in a `Map` in a ref, keyed by file id, and focus the right one in an effect once the form has gone.',
    starter: `import React, { useEffect, useRef, useState } from 'react';

const FILES = [
  { id: 1, name: 'report.pdf' },
  { id: 2, name: 'notes.txt' },
  { id: 3, name: 'photo.jpg' },
];

const App = () => {
  const [files, setFiles] = useState(FILES);

  return <main>
    <h2>Files</h2>
    <ul>
      {files.map((file) => (
        <li key={file.id}>
          <span>{file.name}</span>
          <button type="button" aria-label={'Rename ' + file.name}>Rename</button>
        </li>
      ))}
    </ul>
  </main>;
};

export default App;
`,
    skeleton: `const [editingId, setEditingId] = useState(null);
const [draft, setDraft] = useState('');
const [error, setError] = useState('');
const buttons = useRef(new Map());
const returnTo = useRef(null);

const open = (file) => { /* editingId, draft, no error */ };
const close = () => { returnTo.current = editingId; setEditingId(null); setError(''); };

const save = (event) => {
  event.preventDefault();
  // blank or unchanged: close; taken by another file: set the error; otherwise rename, then close
};

useEffect(() => {
  // no form open and a button to return to: focus it, then forget it
}, [editingId]);

// <button ref={(node) => node ? buttons.current.set(file.id, node) : buttons.current.delete(file.id)} ...>`,
    hints: [
      'A callback ref receives the element when it mounts and `null` when it leaves, which is how one ref can hold a `Map` of every button. The button is not on the page while its form is open, so focus it in an effect that runs after the render where the form went away.',
      'Submitting a form covers Enter in its input. Escape needs a `keyDown` handler on the input. A name counts as taken only when a different file has it: compare ids as well as names.',
    ],
    approach: [
      'Keep the id being renamed, the draft text and an error message in state.',
      'Rename fills the draft with the file’s name and opens its form; an `autoFocus` input takes the focus as it appears.',
      'On submit, trim the draft: blank or unchanged closes, a name another file has sets the error, anything else renames the file and closes.',
      'Closing remembers the id in a ref; an effect on `editingId` focuses that button from the `Map` once the form is gone.',
    ],
    verify: 'tests',
    estimatedMinutes: 25,
    suite: `${header()}
const renameButton = name => screen.getByRole('button', { name: 'Rename ' + name });
const input = name => screen.getByLabelText('New name for ' + name);
const names = () => screen.getAllByRole('listitem').map(li => li.querySelector('span') ? li.querySelector('span').textContent : '(editing)');
const type = (name, value) => fireEvent.change(input(name), { target: { value } });
const submit = name => fireEvent.submit(input(name).closest('form'));

test('Rename opens a field that holds the name and has the focus', () => {
  render(<App />);
  fireEvent.click(renameButton('notes.txt'));
  expect(input('notes.txt').value).toBe('notes.txt');
  expect(document.activeElement).toBe(input('notes.txt'));
  expect(names()).toEqual(['report.pdf', '(editing)', 'photo.jpg']);
});

test('submitting saves the trimmed name and gives the focus back', () => {
  render(<App />);
  fireEvent.click(renameButton('notes.txt'));
  type('notes.txt', '  todo.txt ');
  submit('notes.txt');
  expect(names()).toEqual(['report.pdf', 'todo.txt', 'photo.jpg']);
  expect(document.activeElement).toBe(renameButton('todo.txt'));
});

test('Escape closes without saving and gives the focus back', () => {
  render(<App />);
  fireEvent.click(renameButton('notes.txt'));
  type('notes.txt', 'draft.txt');
  fireEvent.keyDown(input('notes.txt'), { key: 'Escape' });
  expect(names()).toEqual(['report.pdf', 'notes.txt', 'photo.jpg']);
  expect(document.activeElement).toBe(renameButton('notes.txt'));
});

test('a name another file has is refused', () => {
  render(<App />);
  fireEvent.click(renameButton('notes.txt'));
  type('notes.txt', 'report.pdf');
  submit('notes.txt');
  expect(screen.getByRole('alert').textContent).toBe('That name is taken');
  expect(input('notes.txt').value).toBe('report.pdf');
});

test('blank text keeps the old name', () => {
  render(<App />);
  fireEvent.click(renameButton('photo.jpg'));
  type('photo.jpg', '   ');
  submit('photo.jpg');
  expect(names()).toEqual(['report.pdf', 'notes.txt', 'photo.jpg']);
});
`,
  },
  {
    id: 'react-mh-wait-for-export',
    track: 'react',
    topic: 'react',
    level: 13,
    tier: 3,
    focus: ['fetch', 'timers', 'effect-cleanup', 'conditional'],
    title: 'Wait for the export',
    prompt: 'Exporting a large report takes the server a while, so the page starts a job and keeps asking how it is going. "Export" posts to `/api/exports`, and the answer is `{ id }`. Then ask `/api/exports/<id>` about the job: once straight away, then again 200 milliseconds after each answer, never while an answer is still on its way. An answer `{ status: "running", progress }` shows "Preparing… <progress>%". `{ status: "done", url }` shows a link "Download the export" to that url, and `{ status: "failed" }` shows "The export failed" in an element with `role="alert"`; either one ends the asking. The Export button is disabled while a job runs. Do the asking in an effect that depends on the job id, and clear the waiting timeout in its cleanup, so a page that closes stops asking.',
    starter: `import React, { useEffect, useState } from 'react';

const App = () => {
  const [jobId, setJobId] = useState(null);
  const [job, setJob] = useState(null);

  const start = () => {
    fetch('/api/exports', { method: 'POST' })
      .then((response) => response.json())
      .then((answer) => setJobId(answer.id));
  };

  return <main>
    <h2>Export the report</h2>
    <button type="button" onClick={start}>Export</button>
  </main>;
};

export default App;
`,
    skeleton: `useEffect(() => {
  if (jobId === null) return;
  let stopped = false;
  let timer;
  const ask = () => {
    fetch('/api/exports/' + jobId)
      .then((response) => response.json())
      .then((answer) => {
        if (stopped) return;
        setJob(answer);
        // still running: timer = setTimeout(ask, 200)
      });
  };
  ask();
  return () => {
    // stop, and clear the timer
  };
}, [jobId]);

// running: "Preparing… n%"; done: the link; failed: the alert
// the button is disabled while a job has started and is not done or failed`,
    hints: [
      'A `setTimeout` started inside the answer handler, not a `setInterval`, is what keeps the questions from piling up: the next one is only planned once the last one has been answered.',
      'The cleanup runs when the job id changes and when the page closes. Clearing the timeout stops the next question, and a `stopped` flag makes an answer that arrives afterwards change nothing.',
    ],
    approach: [
      'Export posts, reads `{ id }` and stores the id; starting a new export clears the last job’s answer.',
      'In an effect on the id, write `ask()`: fetch the job, store the answer, and schedule the next `ask` 200 ms later only while it is running.',
      'Return a cleanup that sets a stopped flag and clears the timeout.',
      'Render the progress, the link or the alert from the last answer, and disable Export while a job runs.',
    ],
    verify: 'tests',
    estimatedMinutes: 25,
    suite: `${header()}${FAKE_FETCH}${FAKE_CLOCK}
const wait = ms => act(() => new Promise(resolve => setTimeout(resolve, ms)));
const exportButton = () => screen.getByRole('button', { name: 'Export' });
const begin = async (calls, id = 'x1') => {
  fireEvent.click(exportButton());
  await act(async () => { calls[0].respond({ id }); });
};

test('Export starts a job and asks about it straight away', () => withFetch(async calls => {
  render(<App />);
  fireEvent.click(exportButton());
  expect(calls[0].url).toBe('/api/exports');
  await act(async () => { calls[0].respond({ id: 'x1' }); });
  expect(calls[1].url).toBe('/api/exports/x1');
}));

test('the progress shows while the job runs', () => withFetch(async calls => {
  render(<App />);
  await begin(calls);
  await act(async () => { calls[1].respond({ status: 'running', progress: 40 }); });
  expect(screen.getByText('Preparing… 40%')).toBeTruthy();
}));

// On the hand-moved clock, so a busy machine cannot bring the next question
// before the check that expects none yet.
test('the next question waits 200 ms after the answer', () => withFetch(calls => withClock(async clock => {
  render(<App />);
  await begin(calls);
  await act(async () => { calls[1].respond({ status: 'running', progress: 10 }); });
  await clock.tick(100);
  expect(calls).toHaveLength(2);
  await clock.tick(200);
  expect(calls).toHaveLength(3);
  expect(calls[2].url).toBe('/api/exports/x1');
})));

test('done shows the download link and ends the asking', () => withFetch(async calls => {
  render(<App />);
  await begin(calls);
  await act(async () => { calls[1].respond({ status: 'done', url: '/files/x1.csv' }); });
  expect(screen.getByRole('link', { name: 'Download the export' }).getAttribute('href')).toBe('/files/x1.csv');
  await wait(400);
  expect(calls).toHaveLength(2);
}));

test('failed shows an alert and lets you export again', () => withFetch(async calls => {
  render(<App />);
  await begin(calls);
  await act(async () => { calls[1].respond({ status: 'failed' }); });
  expect(screen.getByRole('alert').textContent).toBe('The export failed');
  expect(exportButton().disabled).toBe(false);
}));

test('Export is disabled while a job runs', () => withFetch(async calls => {
  render(<App />);
  await begin(calls);
  expect(exportButton().disabled).toBe(true);
}));
`,
  },

  /* ── Hard ─────────────────────────────────────────────────────────── */
  {
    id: 'react-mh-menu-button',
    track: 'react',
    topic: 'react',
    level: 14,
    tier: 4,
    focus: ['accessibility', 'useRef', 'events', 'effect-cleanup'],
    title: 'A menu button',
    prompt: 'A button "Actions" opens a menu of three items, Rename, Duplicate and Delete. Build it the way the ARIA Authoring Practices describe a menu button. The button has `aria-haspopup="menu"` and `aria-expanded`, `"true"` or `"false"`. The open menu is a `ul` with `role="menu"`, each item an `li` with `role="menuitem"` and `tabIndex={-1}`. Opening the menu, with a click or with ArrowDown on the button, moves the focus to the first item. In the menu, ArrowDown and ArrowUp move the focus to the next and previous item, wrapping at the ends, and Home and End move it to the first and last. Enter on an item, or a click, chooses it: the menu closes, the focus returns to the button, and a paragraph reads "Chose Duplicate". Escape closes the menu and returns the focus to the button. A `mousedown` anywhere outside the button and the menu closes it without moving the focus: add that listener to `document` only while the menu is open, and remove it in the effect’s cleanup. Keep the items in refs, so you can call `focus()` on them.',
    starter: `import React, { useEffect, useRef, useState } from 'react';

const ITEMS = ['Rename', 'Duplicate', 'Delete'];

const App = () => {
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState('');

  return <main>
    <h2>Report.pdf</h2>
    <button type="button" onClick={() => setOpen(!open)}>Actions</button>
    {open && (
      <ul>
        {ITEMS.map((item) => <li key={item}>{item}</li>)}
      </ul>
    )}
    <p>{chosen && 'Chose ' + chosen}</p>
  </main>;
};

export default App;
`,
    skeleton: `const [active, setActive] = useState(0); // the item with the focus
const buttonRef = useRef(null);
const menuRef = useRef(null);
const itemRefs = useRef([]);

useEffect(() => {
  // while open: focus itemRefs.current[active]
}, [open, active]);

useEffect(() => {
  if (!open) return;
  const onMouseDown = (event) => {
    // outside both the button and the menu: close
  };
  document.addEventListener('mousedown', onMouseDown);
  return () => document.removeEventListener('mousedown', onMouseDown);
}, [open]);

const close = (returnFocus) => { setOpen(false); if (returnFocus) buttonRef.current.focus(); };
const choose = (item) => { setChosen(item); close(true); };

const onMenuKeyDown = (event) => {
  // ArrowDown, ArrowUp (wrapping), Home, End, Enter, Escape
};`,
    hints: [
      'Which item has the focus is state: an index. An effect that runs after each render with the menu open can then call `focus()` on the item at that index, because by then the item is on the page. `(active + 1) % ITEMS.length` wraps forward; `(active - 1 + ITEMS.length) % ITEMS.length` wraps back.',
      'Put the key handler on the `ul`: keydown events from the focused item bubble up to it. `element.contains(event.target)` tells you whether a mousedown landed inside the button or the menu.',
    ],
    approach: [
      'Give the button its ARIA attributes and a ref. Clicking toggles the menu; ArrowDown on it opens the menu at the first item.',
      'Render the menu with the roles and `tabIndex={-1}`, a ref per item, and an effect that focuses the active item while it is open.',
      'Handle the keys on the menu: move the active index with the arrows, Home and End, choose on Enter, and close on Escape with the focus back on the button.',
      'While open, listen for `mousedown` on `document` and close on one outside both refs; return the cleanup that removes the listener.',
    ],
    verify: 'tests',
    estimatedMinutes: 35,
    suite: `${header()}
const trigger = () => screen.getByRole('button', { name: 'Actions' });
const items = () => screen.getAllByRole('menuitem');
const key = name => fireEvent.keyDown(document.activeElement, { key: name });
const focused = () => document.activeElement.textContent;

test('the button says whether its menu is open', () => {
  render(<App />);
  expect(trigger().getAttribute('aria-haspopup')).toBe('menu');
  expect(trigger().getAttribute('aria-expanded')).toBe('false');
  expect(screen.queryByRole('menu')).toBeNull();
  fireEvent.click(trigger());
  expect(trigger().getAttribute('aria-expanded')).toBe('true');
  expect(items().map(item => item.textContent)).toEqual(['Rename', 'Duplicate', 'Delete']);
});

test('opening moves the focus to the first item', () => {
  render(<App />);
  fireEvent.click(trigger());
  expect(document.activeElement).toBe(items()[0]);
});

test('the arrow keys move the focus and wrap at the ends', () => {
  render(<App />);
  fireEvent.click(trigger());
  key('ArrowDown');
  expect(focused()).toBe('Duplicate');
  key('ArrowDown');
  key('ArrowDown');
  expect(focused()).toBe('Rename');
  key('ArrowUp');
  expect(focused()).toBe('Delete');
});

test('Enter chooses the item and returns the focus to the button', () => {
  render(<App />);
  fireEvent.click(trigger());
  key('ArrowDown');
  key('Enter');
  expect(screen.queryByRole('menu')).toBeNull();
  expect(screen.getByText('Chose Duplicate')).toBeTruthy();
  expect(document.activeElement).toBe(trigger());
});

test('Escape closes the menu and returns the focus to the button', () => {
  render(<App />);
  fireEvent.click(trigger());
  key('Escape');
  expect(screen.queryByRole('menu')).toBeNull();
  expect(trigger().getAttribute('aria-expanded')).toBe('false');
  expect(document.activeElement).toBe(trigger());
});

test('a mousedown outside closes the menu', () => {
  render(<App />);
  fireEvent.click(trigger());
  fireEvent.mouseDown(screen.getByRole('heading'));
  expect(screen.queryByRole('menu')).toBeNull();
});
`,
  },
  {
    id: 'react-mh-city-combobox',
    track: 'react',
    topic: 'react',
    level: 10,
    tier: 4,
    focus: ['accessibility', 'events', 'filter', 'derived-state'],
    title: 'An autocomplete for cities',
    prompt: 'A field labelled "City" suggests cities as you type. Build it as an ARIA combobox. The input has `role="combobox"`, `aria-autocomplete="list"`, `aria-controls` with the id of the list, and `aria-expanded`, `"true"` while suggestions show. The suggestions are the cities that start with the typed text, ignoring case and the spaces around it, at most five, in a `ul` with `role="listbox"`; each is an `li` with `role="option"` and an id of its own. An empty field shows no list. When nothing matches there is no list either, and a paragraph says "No cities match". ArrowDown and ArrowUp move the active option, wrapping at the ends; with no active option, ArrowDown goes to the first and ArrowUp to the last. The focus stays in the input: `aria-activedescendant` names the active option’s id, and that option has `aria-selected="true"`; with no active option the input has no `aria-activedescendant`. Enter picks the active option: the field takes its name, the list closes, and a paragraph reads "Selected: Paris". A click on an option picks it too, and Enter with no active option does nothing. Escape closes the list and leaves the text alone. Typing opens the list again with no active option. Keep the text, the active index and whether the list is open in state, and work the suggestions out from the text while rendering.',
    starter: `import React, { useState } from 'react';

const CITIES = [
  'Amsterdam', 'Athens', 'Barcelona', 'Berlin', 'Bern', 'Bratislava', 'Brussels',
  'Bucharest', 'Budapest', 'Copenhagen', 'Dublin', 'Helsinki', 'Lisbon', 'London',
  'Madrid', 'Oslo', 'Paris', 'Prague', 'Rome', 'Vienna',
];

const App = () => {
  const [text, setText] = useState('');

  return <main>
    <h2>Where to?</h2>
    <label htmlFor="city">City</label>
    <input id="city" value={text} onChange={(event) => setText(event.target.value)} />
  </main>;
};

export default App;
`,
    skeleton: `const [text, setText] = useState('');
const [active, setActive] = useState(-1);
const [open, setOpen] = useState(false);
const [selected, setSelected] = useState('');

const query = text.trim().toLowerCase();
const suggestions = query === '' ? [] : CITIES.filter(/* starts with query */).slice(0, 5);
const showList = open && suggestions.length > 0;
const optionId = (index) => 'city-option-' + index;

const onKeyDown = (event) => {
  // ArrowDown / ArrowUp: move active, wrapping; preventDefault so the caret stays put
  // Enter: pick suggestions[active] when there is one
  // Escape: close
};

// <input role="combobox" aria-expanded={showList ? 'true' : 'false'}
//        aria-activedescendant={showList && active >= 0 ? optionId(active) : undefined} ... />`,
    hints: [
      'In this pattern the keyboard focus never leaves the input. The list only looks focused: `aria-activedescendant` tells assistive technology which option is active, and `aria-selected` marks it.',
      'The suggestions come from the text, so they are worked out on every render and never stored. What you store is the text, the active index, which typing resets to -1, and whether the list is open, which picking and Escape turn off and typing turns on.',
    ],
    approach: [
      'Work out the suggestions from the trimmed, lower-case text with `filter` and `startsWith`, and keep the first five.',
      'Give the input the combobox attributes, with `aria-expanded` and `aria-activedescendant` from the state.',
      'Handle ArrowDown and ArrowUp with wrapping, Enter to pick the active option, and Escape to close; typing sets the text, opens the list and clears the active index.',
      'Render the listbox with an id per option and `aria-selected` on the active one, a click handler that picks, "No cities match" for text with no match, and "Selected: …" once a city is picked.',
    ],
    verify: 'tests',
    estimatedMinutes: 35,
    suite: `${header()}
const field = () => screen.getByRole('combobox', { name: 'City' });
const type = value => fireEvent.change(field(), { target: { value } });
const key = name => fireEvent.keyDown(field(), { key: name });
const options = () => screen.queryAllByRole('option').map(option => option.textContent);
const activeOption = () => {
  const id = field().getAttribute('aria-activedescendant');
  return id ? document.getElementById(id) : null;
};

test('typing shows the matching cities, at most five', () => {
  render(<App />);
  type('b');
  expect(options()).toEqual(['Barcelona', 'Berlin', 'Bern', 'Bratislava', 'Brussels']);
  expect(field().getAttribute('aria-expanded')).toBe('true');
  expect(field().getAttribute('aria-autocomplete')).toBe('list');
  expect(field().getAttribute('aria-controls')).toBe(screen.getByRole('listbox').id);
});

test('matching ignores case and the spaces around the text', () => {
  render(<App />);
  type('  LON ');
  expect(options()).toEqual(['London']);
});

test('ArrowDown makes an option active while the focus stays in the field', () => {
  render(<App />);
  field().focus();
  type('be');
  key('ArrowDown');
  expect(activeOption().textContent).toBe('Berlin');
  expect(activeOption().getAttribute('aria-selected')).toBe('true');
  key('ArrowDown');
  expect(activeOption().textContent).toBe('Bern');
  expect(document.activeElement).toBe(field());
});

test('Enter picks the active option', () => {
  render(<App />);
  type('par');
  key('ArrowDown');
  key('Enter');
  expect(field().value).toBe('Paris');
  expect(screen.queryByRole('listbox')).toBeNull();
  expect(field().getAttribute('aria-expanded')).toBe('false');
  expect(screen.getByText('Selected: Paris')).toBeTruthy();
});

test('Escape closes the list and keeps the text', () => {
  render(<App />);
  type('ro');
  key('Escape');
  expect(screen.queryByRole('listbox')).toBeNull();
  expect(field().value).toBe('ro');
});

test('text with no match says so', () => {
  render(<App />);
  type('xyz');
  expect(screen.getByText('No cities match')).toBeTruthy();
  expect(screen.queryByRole('listbox')).toBeNull();
  expect(field().getAttribute('aria-expanded')).toBe('false');
});
`,
  },
  {
    id: 'react-mh-signup-form',
    track: 'react',
    topic: 'react',
    level: 15,
    tier: 4,
    focus: ['forms', 'derived-state', 'accessibility', 'useRef'],
    title: 'A sign-up form that says what is wrong',
    prompt: 'The sign-up form has three fields, Email, Password and Repeat password, and a "Create account" submit button. Each field has a rule and a message. Email must match `/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/` once trimmed: "Enter an email like name@example.com". Password needs 8 or more characters and at least one digit: "Use 8 or more characters with a number". Repeat password must equal Password: "The passwords do not match". Work the errors out from the values while rendering; do not store them. A field’s error shows only once the field has been left, on its `blur`, or after a submit attempt, so nobody is told off while still typing. A shown error sits in a `p` with an id of its own, and the field gets `aria-invalid="true"` and `aria-describedby` with that id; while its error is hidden, or once the value is fixed, the field has neither attribute. Submitting with any error shows every error, sends nothing, and moves the focus to the first field with an error, so keep the inputs in refs. A valid submit replaces the form with "Welcome, <email>", using the trimmed email.',
    starter: `import React, { useRef, useState } from 'react';

const App = () => {
  const [values, setValues] = useState({ email: '', password: '', repeat: '' });

  const change = (event) => {
    setValues({ ...values, [event.target.name]: event.target.value });
  };

  const submit = (event) => {
    event.preventDefault();
  };

  return <main>
    <h2>Create an account</h2>
    <form onSubmit={submit} noValidate>
      <label htmlFor="email">Email</label>
      <input id="email" name="email" value={values.email} onChange={change} />
      <label htmlFor="password">Password</label>
      <input id="password" name="password" type="password" value={values.password} onChange={change} />
      <label htmlFor="repeat">Repeat password</label>
      <input id="repeat" name="repeat" type="password" value={values.repeat} onChange={change} />
      <button type="submit">Create account</button>
    </form>
  </main>;
};

export default App;
`,
    skeleton: `const [touched, setTouched] = useState({ email: false, password: false, repeat: false });
const [tried, setTried] = useState(false);
const [welcome, setWelcome] = useState('');
const refs = { email: useRef(null), password: useRef(null), repeat: useRef(null) };

const errors = {
  email: /* the message, or '' when the email is fine */,
  password: /* ... */,
  repeat: /* ... */,
};
const shown = (name) => (touched[name] || tried) && errors[name] !== '';

const submit = (event) => {
  event.preventDefault();
  setTried(true);
  const first = ['email', 'password', 'repeat'].find((name) => errors[name] !== '');
  // an error: focus refs[first].current and stop; otherwise welcome the trimmed email
};

// <input ... onBlur={() => setTouched({ ...touched, email: true })}
//        aria-invalid={shown('email') ? 'true' : undefined}
//        aria-describedby={shown('email') ? 'email-error' : undefined} />
// {shown('email') && <p id="email-error">{errors.email}</p>}`,
    hints: [
      'The errors follow from the values alone, so they are always right for what is on screen. What needs state is whether to show them: a touched flag per field, and whether a submit was tried.',
      '`aria-describedby` makes a screen reader read the error with the field, and `aria-invalid` says the field needs attention. React drops an attribute whose value is `undefined`, which is how a field with no shown error has neither.',
    ],
    approach: [
      'Work out each field’s message from the values: the email pattern on the trimmed email, the length and a digit for the password, equality for the repeat.',
      'Keep a touched flag per field, set on blur, and a flag for a submit attempt; an error shows when its field is touched or a submit was tried.',
      'Give each field `aria-invalid` and `aria-describedby` only while its error shows, and render the message in a `p` with that id.',
      'On submit, prevent the default and mark the attempt. Focus the first field with an error through its ref, or show the welcome.',
    ],
    verify: 'tests',
    estimatedMinutes: 35,
    suite: `${header()}
const field = label => screen.getByLabelText(label);
const type = (label, value) => fireEvent.change(field(label), { target: { value } });
const leave = label => fireEvent.blur(field(label));
const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
const describedBy = label => {
  const id = field(label).getAttribute('aria-describedby');
  return id && document.getElementById(id) ? document.getElementById(id).textContent : null;
};

test('no error shows while a field is being typed in', () => {
  render(<App />);
  type('Email', 'ada');
  expect(field('Email').getAttribute('aria-invalid')).toBeNull();
  expect(screen.queryByText('Enter an email like name@example.com')).toBeNull();
});

test('leaving a field shows its error, tied to the field', () => {
  render(<App />);
  type('Email', 'ada');
  leave('Email');
  expect(field('Email').getAttribute('aria-invalid')).toBe('true');
  expect(describedBy('Email')).toBe('Enter an email like name@example.com');
});

test('fixing the value hides the error and its attributes', () => {
  render(<App />);
  type('Email', 'ada');
  leave('Email');
  type('Email', 'ada@example.com');
  expect(field('Email').getAttribute('aria-invalid')).toBeNull();
  expect(field('Email').getAttribute('aria-describedby')).toBeNull();
  expect(screen.queryByText('Enter an email like name@example.com')).toBeNull();
});

test('the passwords must match', () => {
  render(<App />);
  type('Password', 'correct1horse');
  type('Repeat password', 'correct1hors');
  leave('Repeat password');
  expect(describedBy('Repeat password')).toBe('The passwords do not match');
});

test('a submit with errors shows them all and focuses the first bad field', () => {
  render(<App />);
  type('Email', 'ada@example.com');
  type('Password', 'short');
  submit();
  expect(describedBy('Password')).toBe('Use 8 or more characters with a number');
  expect(describedBy('Repeat password')).toBe('The passwords do not match');
  expect(describedBy('Email')).toBeNull();
  expect(document.activeElement).toBe(field('Password'));
  expect(screen.queryByText(/^Welcome/)).toBeNull();
});

test('a valid submit welcomes the new user', () => {
  render(<App />);
  type('Email', ' ada@example.com ');
  type('Password', 'correct1horse');
  type('Repeat password', 'correct1horse');
  submit();
  expect(screen.getByText('Welcome, ada@example.com')).toBeTruthy();
});
`,
  },
  {
    id: 'react-mh-carousel',
    track: 'react',
    topic: 'react',
    level: 13,
    tier: 4,
    focus: ['timers', 'effect-cleanup', 'accessibility', 'events'],
    title: 'A carousel that plays itself',
    prompt: 'A carousel shows one of four slides and moves on by itself every 200 milliseconds; a real one would wait several seconds, and the short wait keeps the checks quick. The slides sit in a `section` with `aria-roledescription="carousel"` and `aria-label="Featured"`, and in it a `p` reads "Slide 2 of 4: <title>". Previous and Next buttons, inside the section, move one slide, wrapping at the ends, and start the 200 ms wait over, so the slide never changes straight after a click. A "Pause" button stops the autoplay and becomes "Play", which starts it again. The autoplay also stops while the pointer is over the section or the keyboard focus is inside it, and goes on when both have left; the Pause button still wins, so a paused carousel stays paused when the pointer leaves. The slide’s `p` has `aria-live="off"` while the carousel plays, so a screen reader is not interrupted by every change, and `aria-live="polite"` while it does not. Run the timer in an effect that depends on whether the carousel plays and on the current slide, and clear it in the cleanup.',
    starter: `import React, { useEffect, useState } from 'react';

const SLIDES = ['Spring sale', 'New arrivals', 'Free delivery', 'Gift cards'];

const App = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setIndex(index + 1), 200);
    return () => clearInterval(timer);
  }, []);

  return <main>
    <section>
      <p>Slide {index + 1} of {SLIDES.length}: {SLIDES[index]}</p>
      <button type="button">Previous</button>
      <button type="button">Next</button>
      <button type="button">Pause</button>
    </section>
  </main>;
};

export default App;
`,
    skeleton: `const [index, setIndex] = useState(0);
const [paused, setPaused] = useState(false);   // the Pause button
const [hovered, setHovered] = useState(false);
const [focused, setFocused] = useState(false);
const playing = !paused && !hovered && !focused;

useEffect(() => {
  if (!playing) return;
  const timer = setTimeout(/* the next slide, wrapping */, 200);
  return () => clearTimeout(timer);
}, [playing, index]);

const go = (step) => setIndex((current) => (current + step + SLIDES.length) % SLIDES.length);

// <section onMouseEnter onMouseLeave onFocus onBlur ...>
// onBlur: leave "focused" only when event.relatedTarget is outside the section`,
    hints: [
      'An effect that depends on the slide runs again after every change of slide, so its timeout always counts from the latest change, whether the timer or a click made it. Its cleanup clears the old timeout first, which is why a click never leaves two running.',
      'Moving the focus from Previous to Next fires a blur and then a focus on the section. Check `event.currentTarget.contains(event.relatedTarget)` in the blur handler, so the carousel only counts as left when the focus really went somewhere else.',
    ],
    approach: [
      'Keep the slide index and three reasons to stop: the Pause button, the pointer and the focus. The carousel plays when none of them holds.',
      'In an effect on the playing flag and the index, start a 200 ms timeout to the next slide, and clear it in the cleanup.',
      'Previous and Next change the index with wrapping, and the effect starts the wait over by itself.',
      'Track the pointer with `onMouseEnter` and `onMouseLeave` and the focus with `onFocus` and `onBlur` on the section, and set `aria-live` from the playing flag.',
    ],
    verify: 'tests',
    estimatedMinutes: 30,
    suite: `${header()}${FAKE_CLOCK}
const wait = ms => act(() => new Promise(resolve => setTimeout(resolve, ms)));
const slide = () => screen.getByText(/^Slide \\d of 4/);
const press = label => fireEvent.click(screen.getByRole('button', { name: label }));
const carousel = () => screen.getByRole('region', { name: 'Featured' });

// The timing checks run on the hand-moved clock: with a real one, a busy
// machine could bring the slide after the one a check expects.
test('the first slide shows, and the next one follows by itself', () => withClock(async clock => {
  render(<App />);
  expect(slide().textContent).toBe('Slide 1 of 4: Spring sale');
  expect(carousel().getAttribute('aria-roledescription')).toBe('carousel');
  await clock.tick(270);
  expect(slide().textContent).toBe('Slide 2 of 4: New arrivals');
}));

test('Previous and Next wrap around', () => {
  render(<App />);
  press('Previous');
  expect(slide().textContent).toBe('Slide 4 of 4: Gift cards');
  press('Next');
  expect(slide().textContent).toBe('Slide 1 of 4: Spring sale');
});

test('Pause stops the autoplay, and Play starts it again', () => withClock(async clock => {
  render(<App />);
  press('Pause');
  expect(screen.getByRole('button', { name: 'Play' })).toBeTruthy();
  await clock.tick(300);
  expect(slide().textContent).toBe('Slide 1 of 4: Spring sale');
  press('Play');
  await clock.tick(270);
  expect(slide().textContent).toBe('Slide 2 of 4: New arrivals');
}));

test('the pointer over the carousel stops it until it leaves', () => withClock(async clock => {
  render(<App />);
  fireEvent.mouseEnter(carousel());
  await clock.tick(300);
  expect(slide().textContent).toBe('Slide 1 of 4: Spring sale');
  fireEvent.mouseLeave(carousel());
  await clock.tick(270);
  expect(slide().textContent).toBe('Slide 2 of 4: New arrivals');
}));

test('aria-live is off while it plays and polite while it does not', () => {
  render(<App />);
  expect(slide().getAttribute('aria-live')).toBe('off');
  press('Pause');
  expect(slide().getAttribute('aria-live')).toBe('polite');
});
`,
  },
  {
    id: 'react-mh-search-as-you-type',
    track: 'react',
    topic: 'react',
    level: 25,
    tier: 5,
    focus: ['fetch', 'abort', 'timers', 'effect-cleanup'],
    title: 'Search as you type',
    prompt: 'A book search asks the server as you type, without asking on every key. An input labelled "Search books" holds the text. 100 milliseconds after the typing stops, fetch `/api/books?q=<text>`, with the text trimmed and passed through `encodeURIComponent`; the answer is a list of `{ id, title }`. A real search box might wait a little longer; the short wait keeps the checks quick. Text shorter than 2 characters once trimmed asks nothing and clears the results. Give every request an `AbortController` signal, and abort the request still on its way when a newer one starts or the page closes; an aborted request never shows an error. While a request is on its way, show "Searching…", and only then. Afterwards show the titles, one `li` each, or "No books match “<text>”" for an empty answer. A failed request shows "Search failed" in an element with `role="alert"` and a "Try again" button, which repeats the same search at once. Keep every answer in a `Map` in a ref, keyed by the trimmed text, so a search answered before shows its results with no request. Build it from two effects: one copies the text into a second piece of state 100 ms after the last change and clears its timeout in the cleanup; the other fetches when that state, or a retry count, changes, and aborts in its cleanup.',
    starter: `import React, { useEffect, useRef, useState } from 'react';

const App = () => {
  const [text, setText] = useState('');
  const [books, setBooks] = useState([]);

  useEffect(() => {
    fetch('/api/books?q=' + text)
      .then((response) => response.json())
      .then(setBooks);
  }, [text]);

  return <main>
    <h2>Find a book</h2>
    <label>Search books <input value={text} onChange={(event) => setText(event.target.value)} /></label>
    <ul>
      {books.map((book) => <li key={book.id}>{book.title}</li>)}
    </ul>
  </main>;
};

export default App;
`,
    skeleton: `const [text, setText] = useState('');
const [query, setQuery] = useState('');       // the text, 100 ms after the typing stops
const [attempt, setAttempt] = useState(0);    // Try again adds one
const [result, setResult] = useState({ status: 'idle', books: [] });
const cache = useRef(new Map());

useEffect(() => {
  const timer = setTimeout(() => setQuery(text.trim()), 100);
  return () => clearTimeout(timer);
}, [text]);

useEffect(() => {
  // shorter than 2: clear and stop
  // in the cache: show it and stop
  const controller = new AbortController();
  setResult({ status: 'searching', books: [] });
  fetch('/api/books?q=' + encodeURIComponent(query), { signal: controller.signal })
    .then((response) => response.json())
    .then((books) => { /* remember and show */ })
    .catch((error) => { /* an AbortError is not a failure */ });
  return () => controller.abort();
}, [query, attempt]);`,
    hints: [
      'Two pieces of state split the job. `text` changes on every key and drives the input; `query` changes 100 ms after the last key and drives the request. The first effect’s cleanup clears the timeout whenever another key arrives, which is the whole debounce.',
      'The second effect’s cleanup runs just before it runs again and when the page closes, which is exactly when the old request should be aborted. An aborted `fetch` rejects with an error whose `name` is `"AbortError"`: ignore that one and treat every other rejection as a failure.',
    ],
    approach: [
      'Debounce: an effect on `text` sets `query` to the trimmed text after 100 ms and clears its timeout in the cleanup.',
      'Fetch: an effect on `query` and a retry count clears the results for a short query and shows a cached answer when there is one.',
      'Otherwise it shows "Searching…", fetches with an `AbortController` signal, stores the answer in the cache and on screen, and returns `() => controller.abort()`.',
      'In `catch`, skip an `AbortError` and show the alert for anything else. Try again adds one to the retry count, which runs the fetch effect again straight away.',
    ],
    verify: 'tests',
    estimatedMinutes: 45,
    suite: `${header()}${FAKE_FETCH}${FAKE_CLOCK}
const field = () => screen.getByLabelText('Search books');
const type = value => fireEvent.change(field(), { target: { value } });
const wait = ms => act(() => new Promise(resolve => setTimeout(resolve, ms)));
const titles = () => screen.queryAllByRole('listitem').map(li => li.textContent);
const DUNE = [{ id: 1, title: 'Dune' }, { id: 2, title: 'Dune Messiah' }];

// The clock moves only when the check moves it, so a busy machine cannot let
// the request go out before the check that expects none.
test('nothing is asked until the typing stops', () => withFetch(calls => withClock(async clock => {
  render(<App />);
  type('du');
  type('dun');
  type('dune');
  await clock.tick(50);
  expect(calls).toHaveLength(0);
  expect(screen.queryByText('Searching…')).toBeNull();
  await clock.tick(100);
  expect(calls).toHaveLength(1);
  expect(calls[0].url).toBe('/api/books?q=dune');
})));

test('the text is trimmed and encoded', () => withFetch(async calls => {
  render(<App />);
  type(' sci fi&more ');
  await wait(150);
  expect(calls[0].url).toBe('/api/books?q=sci%20fi%26more');
}));

test('Searching… gives way to the titles', () => withFetch(async calls => {
  render(<App />);
  type('dune');
  await wait(150);
  expect(screen.getByText('Searching…')).toBeTruthy();
  await act(async () => { calls[0].respond(DUNE); });
  expect(titles()).toEqual(['Dune', 'Dune Messiah']);
  expect(screen.queryByText('Searching…')).toBeNull();
}));

test('a newer search aborts the older request, with no error', () => withFetch(async calls => {
  render(<App />);
  type('dune');
  await wait(150);
  type('emma');
  await wait(150);
  expect(calls[0].signal.aborted).toBe(true);
  expect(calls[1].url).toBe('/api/books?q=emma');
  expect(screen.queryByRole('alert')).toBeNull();
}));

test('an empty answer says so', () => withFetch(async calls => {
  render(<App />);
  type('dune');
  await wait(150);
  await act(async () => { calls[0].respond([]); });
  expect(screen.getByText('No books match “dune”')).toBeTruthy();
}));

test('a failed search offers Try again, which asks at once', () => withFetch(async calls => {
  render(<App />);
  type('dune');
  await wait(150);
  await act(async () => { calls[0].fail(new TypeError('Failed to fetch')); });
  expect(screen.getByRole('alert').textContent).toBe('Search failed');
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(calls).toHaveLength(2);
  expect(calls[1].url).toBe('/api/books?q=dune');
}));
`,
  },
  {
    id: 'react-mh-autosave',
    track: 'react',
    topic: 'react',
    level: 25,
    tier: 5,
    focus: ['fetch', 'timers', 'useRef', 'effect-cleanup'],
    title: 'Autosave a note',
    prompt: 'A notes editor saves by itself. A `textarea` labelled "Note" starts with `INITIAL`. 150 milliseconds after the typing stops, save with `fetch("/api/notes/1", { method: "PUT", body: text })`; a real editor would wait longer, and the short wait keeps the checks quick. A status line, a `p` with `role="status"`, reads "Saving…" while a save is on its way, "All changes saved" when the text on screen is the text last saved, and "Unsaved changes" otherwise, so text typed and then changed back needs no save. Only one save is on its way at a time: when the wait ends during a save, let that save answer first, then save the newest text straight away. A failed save, a network error or an answer that is not `ok`, shows "Could not save" in an element with `role="alert"` and a "Retry" button that saves the newest text at once; the alert goes when a save succeeds. When the page closes with unsaved text, save it at once from the cleanup of an effect. That cleanup belongs to the first render, so it must read the newest text, and the text last saved, from refs.',
    starter: `import React, { useEffect, useRef, useState } from 'react';

const INITIAL = 'Buy milk';

const App = () => {
  const [text, setText] = useState(INITIAL);

  useEffect(() => {
    fetch('/api/notes/1', { method: 'PUT', body: text });
  }, [text]);

  return <main>
    <h2>Note</h2>
    <label>Note <textarea value={text} onChange={(event) => setText(event.target.value)} /></label>
    <p role="status">All changes saved</p>
  </main>;
};

export default App;
`,
    skeleton: `const [text, setText] = useState(INITIAL);
const [saved, setSaved] = useState(INITIAL);   // the text last saved, for the status
const [saving, setSaving] = useState(false);
const [failed, setFailed] = useState(false);
const latest = useRef(INITIAL);                // the newest text
const savedRef = useRef(INITIAL);              // the text last saved, for callbacks
const busy = useRef(false);
const again = useRef(false);                   // the wait ended during a save

const save = async () => {
  if (busy.current) { again.current = true; return; }
  const body = latest.current;
  if (body === savedRef.current) return;
  // busy, saving, fetch PUT; ok: remember as saved; otherwise failed
  // finally: not busy; if again, save once more
};

useEffect(() => {
  if (text === savedRef.current) return;
  const timer = setTimeout(save, 150);
  return () => clearTimeout(timer);
}, [text]);

useEffect(() => () => {
  // closing: unsaved text goes out at once
}, []);`,
    hints: [
      'State drives what the page shows; refs hold what callbacks need to read later. A timeout, an answer handler and an unmount cleanup were all created by an earlier render, so the newest text and the text last saved must come from refs, not from the variables of that render.',
      'One save at a time needs two flags in refs: one that says a save is on its way, and one that says another save was asked for meanwhile. When the save on its way answers, look at the second flag and save the newest text if it is set.',
    ],
    approach: [
      'Keep the text, the text last saved and the saving and failed flags in state, and mirror the newest and the saved text in refs.',
      'Write `save()`: while busy, only note that another save is wanted. Otherwise PUT the newest text, treat a rejection or an answer that is not `ok` as a failure, and when done, save again if one was wanted.',
      'An effect on the text waits 150 ms and calls `save`, clearing the timeout in its cleanup; Retry calls `save` straight away.',
      'An effect with `[]` returns a cleanup that PUTs the newest text when it differs from the text last saved.',
    ],
    verify: 'tests',
    estimatedMinutes: 45,
    suite: `${header()}${FAKE_CLOCK}
const withSaves = async (body) => {
  const calls = [];
  const real = globalThis.fetch;
  globalThis.fetch = (url, options = {}) => new Promise((resolve, reject) => {
    calls.push({
      url: String(url),
      method: options.method,
      body: options.body,
      ok: () => resolve({ ok: true, status: 200, json: () => Promise.resolve({}) }),
      error: () => resolve({ ok: false, status: 500, json: () => Promise.resolve({}) }),
      fail: () => reject(new TypeError('Failed to fetch')),
    });
  });
  try {
    await body(calls);
  } finally {
    globalThis.fetch = real;
  }
};
const note = () => screen.getByLabelText('Note');
const type = value => fireEvent.change(note(), { target: { value } });
const status = () => screen.getByRole('status').textContent;
const wait = ms => act(() => new Promise(resolve => setTimeout(resolve, ms)));

test('it starts with everything saved', () => withSaves(async calls => {
  render(<App />);
  expect(note().value).toBe('Buy milk');
  expect(status()).toBe('All changes saved');
  await wait(250);
  expect(calls).toHaveLength(0);
}));

// The clock moves only when the check moves it, so a busy machine cannot let
// the save fire early.
test('typing is saved 150 ms after the last key', () => withSaves(calls => withClock(async clock => {
  render(<App />);
  type('Buy milk and eggs');
  expect(status()).toBe('Unsaved changes');
  await clock.tick(100);
  type('Buy milk and bread');
  await clock.tick(100);
  expect(calls).toHaveLength(0);
  await clock.tick(100);
  expect(calls).toHaveLength(1);
  expect([calls[0].url, calls[0].method, calls[0].body]).toEqual(['/api/notes/1', 'PUT', 'Buy milk and bread']);
  expect(status()).toBe('Saving…');
})));

test('the answer marks the text as saved', () => withSaves(async calls => {
  render(<App />);
  type('Buy bread');
  await wait(200);
  await act(async () => { calls[0].ok(); });
  expect(status()).toBe('All changes saved');
}));

test('a change during a save waits, then the newest text is saved', () => withSaves(async calls => {
  render(<App />);
  type('Buy bread');
  await wait(200);
  type('Buy bread and jam');
  await wait(200);
  expect(calls).toHaveLength(1);
  await act(async () => { calls[0].ok(); });
  expect(calls).toHaveLength(2);
  expect(calls[1].body).toBe('Buy bread and jam');
}));

test('a failed save offers Retry', () => withSaves(async calls => {
  render(<App />);
  type('Buy bread');
  await wait(200);
  await act(async () => { calls[0].fail(); });
  expect(screen.getByRole('alert').textContent).toBe('Could not save');
  expect(status()).toBe('Unsaved changes');
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(calls).toHaveLength(2);
  expect(calls[1].body).toBe('Buy bread');
  await act(async () => { calls[1].ok(); });
  expect(screen.queryByRole('alert')).toBeNull();
  expect(status()).toBe('All changes saved');
}));

test('closing the page saves unsaved text at once', () => withSaves(async calls => {
  const { unmount } = render(<App />);
  type('Buy milk and honey');
  unmount();
  expect(calls).toHaveLength(1);
  expect(calls[0].body).toBe('Buy milk and honey');
}));
`,
  },
];
