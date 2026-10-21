// Loop and array-method tasks for the React track (authored for devShark).

import type { CodingTaskSource } from '../types';

const STARTER_IMPORT = "import React, { useState, useEffect, useMemo, useCallback, useReducer, useRef } from 'react';";

const SUITE_IMPORTS = `import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
`;

export const REACT_LOOP_TASKS: CodingTaskSource[] = [
  {
    id: "react-heading-and-intro",
    track: "react",
    topic: "react",
    level: 1,
    tier: 1,
    focus: ["jsx"],
    title: "Heading and intro",
    prompt: "The starter supplies `heading` and `description` values to App, defaulting to the `title` and `intro` constants. Render heading in one h1 and description in one paragraph using JSX expressions. With no props the texts are exactly “Deep End” and “Practise React one list at a time.” Changing either prop must change its text on the next render. Both inputs are plain strings of up to 2000 UTF16 code units, including empty strings, whitespace, Unicode and markup-like text. Preserve their exact text and display markup-like content literally; do not parse it as HTML. No state or effect is needed.",
    starter: `${STARTER_IMPORT}

const title = 'Deep End';
const intro = 'Practise React one list at a time.';

const App = ({ heading = title, description = intro } = {}) => {


  return <main>
    <h2>Heading and intro</h2>
  </main>;
};

export default App;
`,
    skeleton: `return (
  <main>
    <h1>{/* the heading value */}</h1>
    <p>{/* the description value */}</p>
  </main>
);`,
    hints: ["Curly braces let you drop a JavaScript value into JSX markup."],
    approach: [
      "Return one parent element from App that holds both the heading and the paragraph.",
      "Put the heading value inside the h1 with curly braces instead of typing the words again.",
      "Put description inside the paragraph. The supplied defaults keep the original page when no props are passed.",
    ],
    verify: "tests",
    estimatedMinutes: 5,
    suite: `${SUITE_IMPORTS}
test('renders the heading value in an h1', () => {
  const { container } = render(<App />);
  expect(container.querySelector('h1').textContent).toBe('Deep End');
});

test('renders the description value in a paragraph', () => {
  const { container } = render(<App />);
  expect(container.querySelector('p').textContent).toBe('Practise React one list at a time.');
});
test('accepts a different heading and description',()=>{const {container}=render(<App heading="Another heading" description="Another introduction"/>);expect(container.querySelector('h1').textContent).toBe('Another heading');expect(container.querySelector('p').textContent).toBe('Another introduction');});
`,
  },
  {
    id: "react-greeting-component",
    track: "react",
    topic: "react",
    level: 2,
    tier: 1,
    focus: ["jsx", "map"],
    title: "Greeting component",
    prompt: "Export a named `Greeting` component taking a name prop and rendering one paragraph with exactly `Hello, ` followed by that name. App receives `people`, defaulting to the starter names array, and renders one greeting per name in array order. With no props it shows “Hello, Ana”, “Hello, Bo” and “Hello, Cyril”. people is a dense read-only array of at most 100 unique strings, each at most 2000 UTF16 units; it may be frozen or empty. Preserve names exactly, including empty strings, whitespace, Unicode and markup-like text, without parsing HTML or mutating input. Re-rendering with new people must update the list; an empty array renders no paragraphs. Declare Greeting outside App and use each unique name as its key. map or a loop is fine; no state or effect is needed.",
    starter: `${STARTER_IMPORT}

const names = ['Ana', 'Bo', 'Cyril'];

export const Greeting = ({ name }) => null;

const App = ({ people = names } = {}) => {


  return <main>
    <h2>Greeting component</h2>
  </main>;
};

export default App;
`,
    skeleton: `export const Greeting = ({ name }) => (
  <p>{/* the greeting for this name */}</p>
);

{people.map(name => (
  <Greeting key={name} name={/* the name */} />
))}`,
    hints: ["A component is a function that receives props and returns JSX, and map can return one of them per array element."],
    approach: [
      "Declare Greeting above App as a function that reads name from its props.",
      "Return a paragraph from Greeting that joins the fixed word to the name.",
      "Inside App, render people in order as Greeting elements with the name prop and stable unique name key; keep the supplied default.",
    ],
    verify: "tests",
    estimatedMinutes: 5,
    suite: `${SUITE_IMPORTS.replace("import App from './App';", "import App, { Greeting } from './App';")}
test('renders one greeting paragraph per name', () => {
  const { container } = render(<App />);
  expect(container.querySelectorAll('p')).toHaveLength(3);
});

test('greets every name in array order', () => {
  const { container } = render(<App />);
  const texts = [...container.querySelectorAll('p')].map(p => p.textContent.trim());
  expect(texts).toEqual(['Hello, Ana', 'Hello, Bo', 'Hello, Cyril']);
});
test('exports Greeting and accepts a different people list',()=>{const direct=render(<Greeting name="Mia"/>);expect(direct.container.querySelector('p').textContent).toBe('Hello, Mia');direct.unmount();const {container}=render(<App people={['Zoe','Ada']}/>);expect([...container.querySelectorAll('p')].map(p=>p.textContent)).toEqual(['Hello, Zoe','Hello, Ada']);});
`,
  },
  {
    id: "react-price-component",
    track: "react",
    topic: "react",
    level: 3,
    tier: 1,
    focus: ["jsx", "lists-keys", "map"],
    title: "Price component",
    prompt: "Export a named `Price` component taking amount and currency props. Render one span with exactly `amount.toFixed(2)`, one space and currency: 3.5 with EUR gives “3.50 EUR”. Use JavaScript Number.toFixed(2), including its binary floating-point rounding (2.675 gives 2.67), rather than a different money-rounding rule. App receives products, defaulting to the starter items, and renders one UL with one LI per product in order, containing its exact name and Price. Use the unique item id as its key. products is a dense read-only array of at most 100 records with unique positive integer ids, plain string names up to 2000 UTF16 units, finite numeric amounts from -1000000 through 1000000, and three-uppercase-letter currencies. Arrays/records may be frozen; do not mutate them. Preserve literal name text, including whitespace and markup-like content, without parsing HTML. An empty array renders an empty UL. New products and changed Price props must update on re-render. No state or effect is needed.",
    starter: `${STARTER_IMPORT}

const items = [
  { id: 1, name: 'Coffee', amount: 3.5, currency: 'EUR' },
  { id: 2, name: 'Notebook', amount: 120, currency: 'CZK' },
  { id: 3, name: 'Sticker', amount: 0.99, currency: 'USD' },
];

export const Price = ({ amount, currency }) => null;

const App = ({ products = items } = {}) => {


  return <main>
    <h2>Price component</h2>
  </main>;
};

export default App;
`,
    skeleton: `export const Price = ({ amount, currency }) => (
  <span>{/* amount to two decimals, a space, the currency */}</span>
);

{products.map(item => (
  <li key={item.id}>{item.name} <Price amount={/* ... */} currency={/* ... */} /></li>
))}`,
    hints: ["Props arrive as a single object argument, and toFixed(2) turns a number into a two-decimal string."],
    approach: [
      "Declare Price above App and destructure amount and currency from its props.",
      "Format the amount with toFixed(2) and join it to the currency with one space inside a span.",
      "Render products in order as list items keyed by id, each with the exact name and a Price using that amount and currency.",
    ],
    verify: "tests",
    estimatedMinutes: 8,
    suite: `${SUITE_IMPORTS.replace("import App from './App';", "import App, { Price } from './App';")}
test('renders one list item per item with its name', () => {
  const { container } = render(<App />);
  const items = [...container.querySelectorAll('ul li')];
  expect(items).toHaveLength(3);
  expect(items[1].textContent).toContain('Notebook');
});

test('formats every price to two decimals with its currency', () => {
  const { container } = render(<App />);
  const items = [...container.querySelectorAll('ul li')];
  expect(items[0].textContent).toContain('3.50 EUR');
  expect(items[1].textContent).toContain('120.00 CZK');
  expect(items[2].textContent).toContain('0.99 USD');
});

test('renders the formatted price inside a span', () => {
  const { container } = render(<App />);
  const spans = [...container.querySelectorAll('span')].map(span => span.textContent.trim());
  expect(spans).toContain('3.50 EUR');
});
test('exports Price and accepts other products',()=>{const direct=render(<Price amount={2.675} currency="GBP"/>);expect(direct.container.querySelector('span').textContent).toBe('2.67 GBP');direct.unmount();const {container}=render(<App products={[{id:9,name:'Tea',amount:0,currency:'JPY'}]}/>);expect(container.querySelectorAll('li')).toHaveLength(1);expect(container.querySelector('li').textContent).toContain('Tea');expect(container.querySelector('li span').textContent).toBe('0.00 JPY');});
`,
  },
  {
    id: "react-keyed-book-list",
    track: "react",
    topic: "react",
    level: 4,
    tier: 1,
    focus: ["lists-keys", "map"],
    title: "Keyed book list",
    prompt: "Render App's books prop, defaulting to the starter initialBooks, as one UL with one LI per book reading exactly `<title> by <author>` in array order. Above it render one paragraph with exactly `<count> books` (use books even for one). The no-props page keeps the original three books. books is a dense read-only array of at most 100 ordinary records with unique nonempty string ids up to 80 UTF16 units, and plain string titles/authors up to 2000 units; records/array may be frozen. Preserve exact text including empty strings, spaces, Unicode and markup-like text, displaying it literally. Do not mutate input. New props update the rows/count; an empty array keeps an empty UL and `0 books`. Key rows by id: an existing book must keep its LI DOM node through reorder, renaming and insertion/removal of other books. map or a loop is fine; no state or effect is needed.",
    starter: `${STARTER_IMPORT}

const initialBooks = [
  { id: 'b1', title: 'Dune', author: 'Frank Herbert' },
  { id: 'b2', title: 'Emma', author: 'Jane Austen' },
  { id: 'b3', title: 'Ubik', author: 'Philip K. Dick' },
];

const App = ({ books = initialBooks } = {}) => {


  return <main>
    <h2>Keyed book list</h2>
  </main>;
};

export default App;
`,
    skeleton: `<p>{/* how many books */}</p>
<ul>
  {books.map(book => (
    <li key={/* a stable id */}>{/* title by author */}</li>
  ))}
</ul>`,
    hints: ["One map call over the array returns every list item, and the key goes on the element the callback returns."],
    approach: [
      "Render the count paragraph from the array length so it stays right if the data changes.",
      "Map the books to list items inside a UL, joining the title and the author with the word by.",
      "Set the key of every list item to the book's id, which stays the same even if the order changes.",
    ],
    verify: "tests",
    estimatedMinutes: 8,
    suite: `${SUITE_IMPORTS}
test('shows the book count', () => {
  const { container } = render(<App />);
  expect(container.querySelector('p').textContent).toContain('3 books');
});

test('renders every book as title by author, in order', () => {
  const { container } = render(<App />);
  const items = [...container.querySelectorAll('ul li')].map(li => li.textContent.trim());
  expect(items).toEqual(['Dune by Frank Herbert', 'Emma by Jane Austen', 'Ubik by Philip K. Dick']);
});
test('accepts other books and an empty list',()=>{const view=render(<App books={[{id:'x',title:'Other',author:'Writer'}]}/>);expect(view.container.querySelector('li').textContent).toBe('Other by Writer');expect(view.container.querySelector('p').textContent).toBe('1 books');view.rerender(<App books={[]}/>);expect(view.container.querySelectorAll('li')).toHaveLength(0);expect(view.container.querySelector('p').textContent).toBe('0 books');});
`,
  },
  {
    id: "react-in-stock-list",
    track: "react",
    topic: "react",
    level: 4,
    tier: 1,
    focus: ["lists-keys", "filter", "map"],
    title: "In-stock list",
    prompt: "App receives products, defaulting to the starter initialProducts. Render only products whose boolean inStock is true as one UL with one LI containing each exact name in input order, and one paragraph reading exactly `<available> of <total> in stock`. The default is `2 of 4 in stock`. products is a dense read-only array of at most 100 ordinary records with unique positive integer ids, plain string names up to 2000 UTF16 units and boolean inStock values; records/array may be frozen. Names can repeat across different ids. Preserve exact literal text including empty, whitespace, Unicode and markup-like values; do not parse HTML or mutate input. Changing products updates filtering and both counts; empty input keeps an empty UL and `0 of 0 in stock`. Key rows by id: rows that remain visible keep their LI DOM node through reorder, rename and filtering of other rows. filter/map or an equivalent immutable loop is fine; no state or effect is needed.",
    starter: `${STARTER_IMPORT}

const initialProducts = [
  { id: 1, name: 'Fins', inStock: true },
  { id: 2, name: 'Snorkel', inStock: false },
  { id: 3, name: 'Mask', inStock: true },
  { id: 4, name: 'Wetsuit', inStock: false },
];

const App = ({ products = initialProducts } = {}) => {


  return <main>
    <h2>In-stock list</h2>
  </main>;
};

export default App;
`,
    skeleton: `const available = products.filter(product => /* keep the in-stock ones */);

<p>{/* available of total in stock */}</p>
<ul>
  {available.map(product => (
    <li key={product.id}>{product.name}</li>
  ))}
</ul>`,
    hints: ["Chain filter and map: filter keeps the products you want and map turns each one into a list item."],
    approach: [
      "Build the in-stock array with filter on the inStock flag, outside the JSX so you can reuse it.",
      "Map that filtered array to keyed list items inside a UL.",
      "Render the paragraph from the filtered length and the full length.",
    ],
    verify: "tests",
    estimatedMinutes: 8,
    suite: `${SUITE_IMPORTS}
test('lists only the products in stock', () => {
  const { container } = render(<App />);
  const names = [...container.querySelectorAll('li')].map(li => li.textContent.trim());
  expect(names).toEqual(['Fins', 'Mask']);
});

test('reports how many products are in stock', () => {
  const { container } = render(<App />);
  expect(container.textContent).toContain('2 of 4 in stock');
});
test('accepts changed stock and empty products',()=>{const view=render(<App products={[{id:9,name:'Tea',inStock:false},{id:2,name:'Coffee',inStock:true}]}/>);expect([...view.container.querySelectorAll('li')].map(li=>li.textContent)).toEqual(['Coffee']);expect(view.container.querySelector('p').textContent).toBe('1 of 2 in stock');view.rerender(<App products={[]}/>);expect(view.container.querySelector('p').textContent).toBe('0 of 0 in stock');});
`,
  },
  {
    id: "react-guest-list",
    track: "react",
    topic: "react",
    level: 9,
    tier: 1,
    focus: ["useState", "spread", "filter"],
    title: "Guest list",
    prompt: "Start from initialGuests and render a text input with accessible name `Guest name`, an Add button and a UL with one LI per guest holding the exact name and its own Remove button. On Add, trim the input with JavaScript trim. Ignore an empty/whitespace-only result without changing the list or clearing that input; otherwise append one guest and clear the input. Duplicate names are allowed as separate guests. Remove deletes only the clicked guest, even when names match; adding after removing every guest works. Preserve internal spaces, Unicode and markup-like text literally. Use distinct stable row ids, keep surviving rows in order, and support repeated mixed additions/removals. Build new arrays/changed records without mutating previous state or the seed; spread/filter or equivalent immutable operations are fine. Independently mounted apps and fresh mounts each start with Ana and Bo. No network, persistence or Enter-key behavior is required.",
    starter: `${STARTER_IMPORT}

const initialGuests = [
  { id: 1, name: 'Ana' },
  { id: 2, name: 'Bo' },
];

const App = () => {


  return <main>
    <h2>Guest list</h2>
  </main>;
};

export default App;
`,
    skeleton: `const [guests, setGuests] = useState(initialGuests);
const [name, setName] = useState('');

const addGuest = () => {
  setGuests(current => [/* the previous guests, then the new one */]);
  setName('');
};

const removeGuest = id => {
  setGuests(current => current.filter(guest => /* keep the others */));
};`,
    hints: ["Both updates produce a new array: spread the old one plus the new guest, or filter the old one by id."],
    approach: [
      "Keep the guests array and the input text in two separate useState values, seeding the array from initialGuests.",
      "On Add, store a new array made of the previous guests followed by an object with a fresh id and the trimmed text, then clear the text.",
      "On Remove, store the result of filtering the previous guests by a different id, or another immutable equivalent, so nothing touches the original array.",
    ],
    verify: "tests",
    estimatedMinutes: 10,
    suite: `${SUITE_IMPORTS}
const button = (root, label) => [...root.querySelectorAll('button')].find(b => b.textContent.trim() === label);

test('starts with the two seeded guests', () => {
  const { container } = render(<App />);
  expect(container.querySelectorAll('li')).toHaveLength(2);
  expect(container.textContent).toContain('Ana');
  expect(container.textContent).toContain('Bo');
});

test('appends the typed guest and clears the input', () => {
  const { container } = render(<App />);
  const input = container.querySelector('input');
  fireEvent.change(input, { target: { value: 'Dana' } });
  fireEvent.click(button(container, 'Add'));
  const items = [...container.querySelectorAll('li')];
  expect(items).toHaveLength(3);
  expect(items[2].textContent).toContain('Dana');
  expect(input.value).toBe('');
});

test('removes only the clicked guest', () => {
  const { container } = render(<App />);
  fireEvent.click(container.querySelectorAll('li')[0].querySelector('button'));
  const items = [...container.querySelectorAll('li')];
  expect(items).toHaveLength(1);
  expect(items[0].textContent).toContain('Bo');
});

test('leaves the seed array untouched for the next mount', () => {
  const first = render(<App />);
  fireEvent.change(first.container.querySelector('input'), { target: { value: 'Dana' } });
  fireEvent.click(button(first.container, 'Add'));
  fireEvent.click(first.container.querySelectorAll('li')[0].querySelector('button'));
  first.unmount();
  const second = render(<App />);
  const names = [...second.container.querySelectorAll('li')].map(li => li.textContent);
  expect(names).toHaveLength(2);
  expect(names[0]).toContain('Ana');
});
test('ignores blank names and removes one duplicate',()=>{const view=render(<App/>),input=view.container.querySelector('input');fireEvent.change(input,{target:{value:'  '}});fireEvent.click(button(view.container,'Add'));expect(view.container.querySelectorAll('li')).toHaveLength(2);fireEvent.change(input,{target:{value:' Ana '}});fireEvent.click(button(view.container,'Add'));expect(view.container.querySelectorAll('li')).toHaveLength(3);fireEvent.click(view.container.querySelectorAll('li')[2].querySelector('button'));expect(view.container.querySelectorAll('li')).toHaveLength(2);expect(view.container.querySelector('li').textContent).toContain('Ana');});
`,
  },
  {
    id: "react-insert-and-reorder",
    track: "react",
    topic: "react",
    level: 9,
    tier: 2,
    focus: ["useState", "slice", "spread"],
    title: "Insert and reorder",
    prompt: "Render initialStops as one OL. Each LI shows the exact stop name in a span and three buttons: Insert after, Up and Down. Insert a new `Stop <n>`, where n is the total current length plus one, directly after the selected item. Repeated insertions work at the first, middle and last positions. Up/Down swap the selected stop with its neighbour and do nothing at either edge. Preserve order for every other item and keep each surviving stop's LI DOM node through moves/insertions by using stable unique ids as keys. Build new arrays without mutating prior state or initialStops; slice/spread or equivalent immutable array operations are fine. Support repeated mixed actions and independent/fresh mounts. Initially Harbour, Reef, Lighthouse; inserting after Reef gives Harbour, Reef, Stop 4, Lighthouse.",
    starter: `${STARTER_IMPORT}

const initialStops = [
  { id: 1, name: 'Harbour' },
  { id: 2, name: 'Reef' },
  { id: 3, name: 'Lighthouse' },
];

const App = () => {


  return <main>
    <h2>Insert and reorder</h2>
  </main>;
};

export default App;
`,
    skeleton: `const [stops, setStops] = useState(initialStops);

const insertAfter = index => {
  setStops(current => [
    ...current.slice(0, /* up to and including index */),
    /* the new stop */,
    ...current.slice(/* after index */),
  ]);
};

const moveUp = index => {
  setStops(current => /* the part before the pair, the pair swapped, the part after */);
};`,
    hints: ["Cut the array into the part before the position and the part after it, then spread both around whatever belongs in between."],
    approach: [
      "Keep the stops in useState seeded from initialStops, and give every handler the index it works on.",
      "For Insert after, spread the slice up to and including the index, then the new stop, then the slice after the index.",
      "For Up and Down, build the array from the slice before the pair, the two items in swapped order and the slice after them; at the edges return the previous array unchanged.",
    ],
    verify: "tests",
    estimatedMinutes: 15,
    suite: `${SUITE_IMPORTS}
const stopNames = root => [...root.querySelectorAll('li')].map(li => li.querySelector('span').textContent.trim());
const control = (li, label) => [...li.querySelectorAll('button')].find(b => b.textContent.trim() === label);

test('renders the seeded stops in order', () => {
  const { container } = render(<App />);
  expect(stopNames(container)).toEqual(['Harbour', 'Reef', 'Lighthouse']);
});

test('inserts a new stop right after the clicked one', () => {
  const { container } = render(<App />);
  fireEvent.click(control(container.querySelectorAll('li')[1], 'Insert after'));
  expect(stopNames(container)).toEqual(['Harbour', 'Reef', 'Stop 4', 'Lighthouse']);
});

test('moves a stop up or down by one position and ignores the edges', () => {
  const { container } = render(<App />);
  fireEvent.click(control(container.querySelectorAll('li')[2], 'Up'));
  expect(stopNames(container)).toEqual(['Harbour', 'Lighthouse', 'Reef']);
  fireEvent.click(control(container.querySelectorAll('li')[0], 'Down'));
  expect(stopNames(container)).toEqual(['Lighthouse', 'Harbour', 'Reef']);
  fireEvent.click(control(container.querySelectorAll('li')[0], 'Up'));
  fireEvent.click(control(container.querySelectorAll('li')[2], 'Down'));
  expect(stopNames(container)).toEqual(['Lighthouse', 'Harbour', 'Reef']);
});

test('leaves the seed array untouched for the next mount', () => {
  const first = render(<App />);
  fireEvent.click(control(first.container.querySelectorAll('li')[0], 'Insert after'));
  fireEvent.click(control(first.container.querySelectorAll('li')[2], 'Up'));
  first.unmount();
  const second = render(<App />);
  expect(stopNames(second.container)).toEqual(['Harbour', 'Reef', 'Lighthouse']);
});
test('inserts after the first item using the total length',()=>{const view=render(<App/>);fireEvent.click(control(view.container.querySelectorAll('li')[0],'Insert after'));expect(stopNames(view.container)).toEqual(['Harbour','Stop 4','Reef','Lighthouse']);});
`,
  },
  {
    id: "react-toggle-done-with-map",
    track: "react",
    topic: "react",
    level: 9,
    tier: 2,
    focus: ["useState", "map", "spread"],
    title: "Toggle done with map",
    prompt: "Render initialTasks as a UL where every LI holds a labelled checkbox followed by its exact task text, checked when done is true. A paragraph reads exactly `<done> of <total> done`, initially `1 of 3 done`. Clicking any checkbox flips only that task, works repeatedly in both directions and updates the count while preserving list order and surviving LI DOM nodes. Key rows by stable task id. Prefer map to create a new array and a new object for the matching task, keeping unaffected objects unchanged; equivalent immutable loops are fine. Do not mutate prior state or the seed. Independently mounted apps and fresh mounts each start from the original flags. After ticking Write tests, the count is `2 of 3 done`; ticking it again restores `1 of 3 done`.",
    starter: `${STARTER_IMPORT}

const initialTasks = [
  { id: 1, text: 'Write tests', done: false },
  { id: 2, text: 'Fix the build', done: true },
  { id: 3, text: 'Ship it', done: false },
];

const App = () => {


  return <main>
    <h2>Toggle done with map</h2>
  </main>;
};

export default App;
`,
    skeleton: `const [tasks, setTasks] = useState(initialTasks);

const toggle = id => {
  setTasks(current => current.map(task => /* a copy with done flipped when the id matches, else the task */));
};

<li key={task.id}>
  <label>
    <input type="checkbox" checked={/* the done flag */} onChange={() => toggle(task.id)} />
    {task.text}
  </label>
</li>`,
    hints: ["Map over the previous array and spread the matching task into a copy with done flipped, leaving every other task as it was."],
    approach: [
      "Hold the tasks in useState seeded from initialTasks; derive the done count from them during render.",
      "Render each task as a list item with a controlled checkbox whose checked value is the task's done flag.",
      "In the change handler, map the previous tasks: for the matching id return a copy with done negated, otherwise return the task unchanged.",
    ],
    verify: "tests",
    estimatedMinutes: 10,
    suite: `${SUITE_IMPORTS}
const boxes = root => [...root.querySelectorAll('input[type="checkbox"]')];

test('renders a checkbox per task with the seeded done flags', () => {
  const { container } = render(<App />);
  expect(boxes(container).map(box => box.checked)).toEqual([false, true, false]);
  expect(container.textContent).toContain('1 of 3 done');
});

test('flips only the clicked task and updates the count', () => {
  const { container } = render(<App />);
  fireEvent.click(boxes(container)[0]);
  expect(boxes(container).map(box => box.checked)).toEqual([true, true, false]);
  expect(container.textContent).toContain('2 of 3 done');
  fireEvent.click(boxes(container)[1]);
  expect(boxes(container).map(box => box.checked)).toEqual([true, false, false]);
  expect(container.textContent).toContain('1 of 3 done');
});

test('keeps the tasks in their original order', () => {
  const { container } = render(<App />);
  fireEvent.click(boxes(container)[2]);
  const texts = [...container.querySelectorAll('li')].map(li => li.textContent.trim());
  expect(texts).toEqual(['Write tests', 'Fix the build', 'Ship it']);
});

test('leaves the seed tasks untouched for the next mount', () => {
  const first = render(<App />);
  fireEvent.click(boxes(first.container)[0]);
  first.unmount();
  const second = render(<App />);
  expect(boxes(second.container).map(box => box.checked)).toEqual([false, true, false]);
  expect(second.container.textContent).toContain('1 of 3 done');
});
test('toggling the first task twice restores its original flag',()=>{const view=render(<App/>);fireEvent.click(boxes(view.container)[0]);fireEvent.click(boxes(view.container)[0]);expect(boxes(view.container).map(b=>b.checked)).toEqual([false,true,false]);expect(view.container.querySelector('p').textContent).toBe('1 of 3 done');});
`,
  },
  {
    id: "react-newest-first-todos",
    track: "react",
    topic: "react",
    level: 15,
    tier: 1,
    focus: ["forms", "unshift", "useState"],
    title: "Newest-first todos",
    prompt: "Render a form with a text input named `Todo text`, an Add submit button and a UL that starts empty. Submitting prevents page navigation, trims the input with JavaScript trim, prepends one new LI and clears the input. A blank or whitespace-only submission changes neither list nor input. Duplicate text is allowed as distinct todos. Keep exact internal spaces, Unicode and markup-like text as literal text; inputs are plain strings up to 2000 UTF16 units. Newest-first means insertion order, not alphabetical sorting. Use stable unique row ids so existing LI nodes survive later prepends. Build new arrays without mutating prior state, support repeated submissions, and keep simultaneous/fresh mounts independent. Adding First then Second lists Second before First.",
    starter: `${STARTER_IMPORT}

const App = () => {


  return <main>
    <h2>Newest-first todos</h2>
  </main>;
};

export default App;
`,
    skeleton: `const [text, setText] = useState('');
const [todos, setTodos] = useState([]);

const submit = event => {
  event.preventDefault();
  /* stop when the trimmed text is empty */
  setTodos(current => [/* the new todo first, then the previous ones */]);
  setText('');
};

<form onSubmit={submit}>
  <input aria-label="Todo text" value={text} onChange={event => setText(event.target.value)} />
  <button>Add</button>
</form>`,
    hints: ["Put the new item first and spread the previous array after it, which is the immutable form of unshift."],
    approach: [
      "Keep the input text and the todos array in separate useState values, with the input controlled by its state.",
      "Handle submit on the form, call preventDefault, and stop early when the trimmed text is empty.",
      "Otherwise store a new array with the new todo first and the previous ones spread after it, then clear the text.",
    ],
    verify: "tests",
    estimatedMinutes: 10,
    suite: `${SUITE_IMPORTS}
const add = (container, text) => {
  fireEvent.change(container.querySelector('input'), { target: { value: text } });
  fireEvent.submit(container.querySelector('form'));
};

test('starts empty and clears the input after adding', () => {
  const { container } = render(<App />);
  expect(container.querySelectorAll('li')).toHaveLength(0);
  add(container, 'First');
  expect(container.querySelectorAll('li')).toHaveLength(1);
  expect(container.querySelector('input').value).toBe('');
});

test('puts the newest todo at the top', () => {
  const { container } = render(<App />);
  add(container, 'First');
  add(container, 'Second');
  add(container, 'Third');
  const texts = [...container.querySelectorAll('li')].map(li => li.textContent.trim());
  expect(texts).toEqual(['Third', 'Second', 'First']);
});

test('ignores a blank submission', () => {
  const { container } = render(<App />);
  add(container, '   ');
  expect(container.querySelectorAll('li')).toHaveLength(0);
});
test('keeps duplicate texts as separate newest-first rows',()=>{const view=render(<App/>);add(view.container,' zzz ');add(view.container,'aaa');add(view.container,'zzz');expect([...view.container.querySelectorAll('li')].map(li=>li.textContent)).toEqual(['zzz','aaa','zzz']);});
`,
  },
  {
    id: "react-memoised-total",
    track: "react",
    topic: "react",
    level: 17,
    tier: 2,
    focus: ["useMemo", "filter", "reduce"],
    title: "Memoised total",
    prompt: "Practice memoizing derived work with useMemo. Export `summarizeOrders(query)`: trim the plain string query, compare it case-insensitively with each starter order name using substring matching, and return `{matching, total}` in original order with the sum of matching prices. Query length is at most 2000 UTF16 units; an empty/whitespace query matches all six (total 585), DIVE matches two (total 180), and no match totals 0. Treat source orders and returned records as read-only. App receives optional `calculate`, defaulting to summarizeOrders, and passes it the current raw query. A supplied synchronous pure calculator has the same result shape, with at most 100 uniquely identified ordinary order records, literal string names and a numeric total; render its returned result. Render a controlled input named `Search orders`, a UL of matching names, `Total: <total>`, a Nudge button and `Nudges: <n>` starting at 0. Memoize the calculation using every reactive input it reads: query and calculate. Ordinary Nudge/parent re-renders with those inputs unchanged skip the calculation; a changed query or calculator function recomputes. Observations in this exercise use ordinary mounted updates without Strict Mode, Suspense or hot reload. Memoization is a performance tool, not persistent storage; this small list is for practice, and real performance should be measured before optimizing. Keep mounted apps independent.",
    starter: `${STARTER_IMPORT}

const orders = [
  { id: 1, name: 'Mask', price: 40 },
  { id: 2, name: 'Fins', price: 90 },
  { id: 3, name: 'Wetsuit', price: 250 },
  { id: 4, name: 'Snorkel', price: 25 },
  { id: 5, name: 'Dive light', price: 120 },
  { id: 6, name: 'Dive knife', price: 60 },
];

export const summarizeOrders = query => ({ matching: [], total: 0 });

const App = ({ calculate = summarizeOrders } = {}) => {


  return <main>
    <h2>Memoised total</h2>
  </main>;
};

export default App;
`,
    skeleton: `export function summarizeOrders(query) {
  const needle = query.trim().toLowerCase();
  const matching = orders.filter(order => /* name contains needle */);
  const total = matching.reduce((sum, order) => /* add the price */, 0);
  return { matching, total };
}

const App = ({ calculate = summarizeOrders } = {}) => {
  const [query, setQuery] = useState('');
  const [nudges, setNudges] = useState(0);
  const result = useMemo(() => /* call calculate with query */, [/* both reactive inputs */]);
  return <main>{/* controlled search, result list/total, Nudge and its count */}</main>;
};`,
    hints: ["Keep a pure named summarizer outside App. The memo callback calls calculate(query), and both values belong in its dependency list."],
    approach: [
      "In summarizeOrders, trim/lowercase the query, filter the fixed orders and sum matching prices without changing them.",
      "Keep query and nudges in state. useMemo(() => calculate(query), [query, calculate]) caches only the derived work.",
      "Render matching names and total from that result; Nudge changes only its own state. Label the input Search orders.",
    ],
    verify: "tests",
    estimatedMinutes: 12,
    suite: `${SUITE_IMPORTS.replace("import App from './App';", "import App, { summarizeOrders } from './App';")}
const button = (root, label) => [...root.querySelectorAll('button')].find(b => b.textContent.trim() === label);

test('shows every order and the full total before typing', () => {
  const { container } = render(<App />);
  expect(container.querySelectorAll('li')).toHaveLength(6);
  expect(container.textContent).toContain('Total: 585');
});

test('narrows the list and the total to the query, ignoring case', () => {
  const { container } = render(<App />);
  fireEvent.change(container.querySelector('input'), { target: { value: 'DIVE' } });
  expect(container.querySelectorAll('li')).toHaveLength(2);
  expect(container.textContent).toContain('Total: 180');
  fireEvent.change(container.querySelector('input'), { target: { value: 'zzz' } });
  expect(container.querySelectorAll('li')).toHaveLength(0);
  expect(container.textContent).toContain('Total: 0');
});

test('counts nudges without touching the total', () => {
  const { container } = render(<App />);
  fireEvent.change(container.querySelector('input'), { target: { value: 'mask' } });
  fireEvent.click(button(container, 'Nudge'));
  fireEvent.click(button(container, 'Nudge'));
  expect(container.textContent).toContain('Nudges: 2');
  expect(container.textContent).toContain('Total: 40');
  expect(container.querySelectorAll('li')).toHaveLength(1);
});
test('uses a supplied calculator and skips nudge-only work',()=>{let calls=0;const calculate=query=>{calls++;return {matching:[{id:9,name:query||'Custom',price:7}],total:7};};const view=render(<App calculate={calculate}/>);expect(calls).toBe(1);fireEvent.click(button(view.container,'Nudge'));expect(calls).toBe(1);fireEvent.change(view.container.querySelector('input'),{target:{value:'Other'}});expect(calls).toBe(2);expect(view.container.querySelector('li').textContent).toBe('Other');});
`,
  },
  {
    id: "react-stable-pick-handler",
    track: "react",
    topic: "react",
    level: 18,
    tier: 2,
    focus: ["events", "useState", "map"],
    title: "Stable pick handler",
    prompt: "Render `Picked: none` and one button for each starter flavour, in order. The starter supplies a memoized FlavourButton outside App, receiving label and onPick. App also accepts an optional `Button` component prop, defaulting to FlavourButton; render that component for each flavour with its label and one shared onPick callback. A supplied component follows the same label/onPick interface and may be memoized. Clicking calls onPick(label) and updates the paragraph, for example `Picked: Mint`. Use useCallback with an empty dependency array: the callback only uses the stable state updater. Its function identity stays the same during ordinary parent/selection re-renders of one mounted App, allowing memoized children with unchanged props to skip work. Give mapped children stable flavour keys, keep their type outside App, and keep separate mounts independent. This is a focused identity exercise; memoization should serve an observed performance need rather than being added to every callback.",
    starter: `${STARTER_IMPORT}

const flavours = ['Vanilla', 'Chocolate', 'Mint'];

const FlavourButton = React.memo(({ label, onPick }) => (
  <button onClick={() => onPick(label)}>{label}</button>
));

const App = ({ Button = FlavourButton } = {}) => {


  return <main>
    <h2>Stable pick handler</h2>
  </main>;
};

export default App;
`,
    skeleton: `const [picked, setPicked] = useState('none');
const onPick = useCallback(label => {
  /* store the supplied label */
}, []);

return <main>
  <p>Picked: {picked}</p>
  {flavours.map(label => <Button key={label} label={label} onPick={onPick} />)}
</main>;`,
    hints: ["A function created in the component body is new on every render, while useCallback with no dependencies hands back the same one each time."],
    approach: [
      "Keep the picked label in useState starting as none, and render the paragraph from it.",
      "Wrap the handler in useCallback with an empty dependency array; it only calls the setter with the label it receives.",
      "Keep the supplied FlavourButton outside App. Map flavours to the Button prop with stable keys, labels and the shared handler.",
    ],
    verify: "tests",
    estimatedMinutes: 12,
    suite: `${SUITE_IMPORTS}
const button = (root, label) => [...root.querySelectorAll('button')].find(b => b.textContent.trim() === label);

test('starts with nothing picked and one button per flavour', () => {
  const { container } = render(<App />);
  expect(container.textContent).toContain('Picked: none');
  expect(container.querySelectorAll('button')).toHaveLength(3);
});

test('shows the label of the clicked flavour', () => {
  const { container } = render(<App />);
  fireEvent.click(button(container, 'Mint'));
  expect(container.textContent).toContain('Picked: Mint');
  fireEvent.click(button(container, 'Vanilla'));
  expect(container.textContent).toContain('Picked: Vanilla');
  expect(container.textContent).not.toContain('Picked: Mint');
});
test('keeps the supplied child callback stable across a selection',()=>{let latest;const Probe=({label,onPick})=>{latest=onPick;return <button onClick={()=>onPick(label)}>{label}</button>;};const view=render(<App Button={Probe}/>);const first=latest;fireEvent.click(button(view.container,'Mint'));expect(view.container.textContent).toContain('Picked: Mint');expect(latest).toBe(first);});
`,
  },
  {
    id: "react-undo-stack",
    track: "react",
    topic: "react",
    level: 19,
    tier: 2,
    focus: ["useReducer", "push", "pop"],
    title: "Undo stack",
    prompt: "Render Push and Undo buttons, a paragraph `Depth: <n>` and a UL listing the stack from bottom to top. Manage immutable state with useReducer: push appends `Step <n>`, where n is the new current depth, and pop removes only the last entry. Undo is disabled when empty and an empty Undo click does nothing. Number by depth, not total lifetime pushes: after two pushes, Undo and another push, the list is Step 1, Step 2 again. Support repeated mixed actions beyond three steps without mutating prior state. Derive depth/disabled status from the current stack, preserve order, and keep simultaneous/fresh mounts independent. Two pushes and one Undo leave Step 1 with `Depth: 1`.",
    starter: `${STARTER_IMPORT}

const App = () => {


  return <main>
    <h2>Undo stack</h2>
  </main>;
};

export default App;
`,
    skeleton: `const reducer = (stack, action) => {
  switch (action.type) {
    case 'push': {
      const next = [...stack];
      next.push(/* the next step name */);
      return next;
    }
    case 'pop': {
      /* copy, pop, return the copy */
    }
    default:
      return stack;
  }
};

const [stack, dispatch] = useReducer(reducer, []);`,
    hints: ["Inside the reducer, copy the array before calling push or pop on it, then return the copy."],
    approach: [
      "Write a reducer outside the component that takes the current array and an action with a type.",
      "For push, spread the array into a copy, push the next step name onto the copy and return it; for pop, copy and pop the same way.",
      "Wire the buttons to dispatch, derive the depth from the array length, and disable Undo when that length is zero.",
    ],
    verify: "tests",
    estimatedMinutes: 12,
    suite: `${SUITE_IMPORTS}
const button = (root, label) => [...root.querySelectorAll('button')].find(b => b.textContent.trim() === label);
const steps = root => [...root.querySelectorAll('li')].map(li => li.textContent.trim());

test('starts empty with Undo disabled', () => {
  const { container } = render(<App />);
  expect(container.textContent).toContain('Depth: 0');
  expect(container.querySelectorAll('li')).toHaveLength(0);
  expect(button(container, 'Undo').disabled).toBe(true);
});

test('pushes numbered steps onto the top', () => {
  const { container } = render(<App />);
  fireEvent.click(button(container, 'Push'));
  fireEvent.click(button(container, 'Push'));
  fireEvent.click(button(container, 'Push'));
  expect(steps(container)).toEqual(['Step 1', 'Step 2', 'Step 3']);
  expect(container.textContent).toContain('Depth: 3');
  expect(button(container, 'Undo').disabled).toBe(false);
});

test('undo removes the last step only', () => {
  const { container } = render(<App />);
  fireEvent.click(button(container, 'Push'));
  fireEvent.click(button(container, 'Push'));
  fireEvent.click(button(container, 'Undo'));
  expect(steps(container)).toEqual(['Step 1']);
  expect(container.textContent).toContain('Depth: 1');
  fireEvent.click(button(container, 'Undo'));
  expect(container.querySelectorAll('li')).toHaveLength(0);
  expect(button(container, 'Undo').disabled).toBe(true);
});
test('a push after Undo uses the new depth, not a lifetime counter',()=>{const view=render(<App/>);fireEvent.click(button(view.container,'Push'));fireEvent.click(button(view.container,'Push'));fireEvent.click(button(view.container,'Undo'));fireEvent.click(button(view.container,'Push'));expect(steps(view.container)).toEqual(['Step 1','Step 2']);});
`,
  },
  {
    id: "react-ticket-queue",
    track: "react",
    topic: "react",
    level: 19,
    tier: 2,
    focus: ["useReducer", "shift", "spread"],
    title: "Ticket queue",
    prompt: "Render Take a ticket and Call next buttons, paragraphs `Next up: <first ticket or none>` and `Waiting: <n>`, and a UL of waiting tickets in FIFO order. Manage immutable queue state with useReducer. Enqueue appends `Ticket <n>`, counting issued tickets from 1 for the lifetime of this mounted App, independently of how many still wait. Dequeue removes only the first ticket and never resets the issued counter. Call next is disabled when empty and does nothing there. After issuing and calling tickets 1 through 3, the next issued ticket must be Ticket 4. Support repeated interleaved actions beyond three tickets without mutating prior state; both status paragraphs and disabled state always reflect the current queue. Separate mounted apps and fresh mounts have their own numbering starting at 1; this exercise has no persistence across unmounts.",
    starter: `${STARTER_IMPORT}

const App = () => {


  return <main>
    <h2>Ticket queue</h2>
  </main>;
};

export default App;
`,
    skeleton: `const reducer = (state, action) => {
  switch (action.type) {
    case 'enqueue':
      return { issued: /* one more */, tickets: [/* the previous tickets, then the new one */] };
    case 'dequeue': {
      const tickets = [...state.tickets];
      /* drop the first one from the copy */
      return { ...state, tickets };
    }
    default:
      return state;
  }
};

const [state, dispatch] = useReducer(reducer, { tickets: [], issued: 0 });`,
    hints: ["Keep both the waiting list and the number of tickets issued in the reducer state, and copy the list before calling shift on it."],
    approach: [
      "Write a reducer outside the component whose state holds the waiting tickets and how many tickets have been issued.",
      "For enqueue, raise the issued count and append a ticket named after it to a copy of the list; for dequeue, copy the list and shift the copy.",
      "Derive Next up from the first ticket and Waiting from the length, and disable Call next while the list is empty.",
    ],
    verify: "tests",
    estimatedMinutes: 15,
    suite: `${SUITE_IMPORTS}
const button = (root, label) => [...root.querySelectorAll('button')].find(b => b.textContent.trim() === label);
const tickets = root => [...root.querySelectorAll('li')].map(li => li.textContent.trim());

test('starts with nobody waiting and Call next disabled', () => {
  const { container } = render(<App />);
  expect(container.textContent).toContain('Next up: none');
  expect(container.textContent).toContain('Waiting: 0');
  expect(button(container, 'Call next').disabled).toBe(true);
});

test('queues tickets in the order they were taken', () => {
  const { container } = render(<App />);
  fireEvent.click(button(container, 'Take a ticket'));
  fireEvent.click(button(container, 'Take a ticket'));
  fireEvent.click(button(container, 'Take a ticket'));
  expect(tickets(container)).toEqual(['Ticket 1', 'Ticket 2', 'Ticket 3']);
  expect(container.textContent).toContain('Next up: Ticket 1');
  expect(container.textContent).toContain('Waiting: 3');
});

test('calling next removes the first ticket and keeps the numbering', () => {
  const { container } = render(<App />);
  fireEvent.click(button(container, 'Take a ticket'));
  fireEvent.click(button(container, 'Take a ticket'));
  fireEvent.click(button(container, 'Call next'));
  expect(tickets(container)).toEqual(['Ticket 2']);
  expect(container.textContent).toContain('Next up: Ticket 2');
  fireEvent.click(button(container, 'Take a ticket'));
  expect(tickets(container)).toEqual(['Ticket 2', 'Ticket 3']);
  fireEvent.click(button(container, 'Call next'));
  fireEvent.click(button(container, 'Call next'));
  expect(container.textContent).toContain('Next up: none');
  expect(container.textContent).toContain('Waiting: 0');
  expect(button(container, 'Call next').disabled).toBe(true);
});
test('a new ticket after an empty queue continues numbering',()=>{const view=render(<App/>);fireEvent.click(button(view.container,'Take a ticket'));fireEvent.click(button(view.container,'Call next'));fireEvent.click(button(view.container,'Take a ticket'));expect(tickets(view.container)).toEqual(['Ticket 2']);});
`,
  },
  {
    id: "react-usepagination-hook",
    track: "react",
    topic: "react",
    level: 21,
    tier: 3,
    focus: ["custom-hook", "pagination", "slice"],
    title: "usePagination hook",
    prompt: "Export `usePagination(items, pageSize)`, a stateful hook returning `{pageItems, page, pageCount, next, previous}`. items is a dense read-only array of up to 1000 arbitrary values; preserve each selected value/reference and do not mutate input. pageSize is a positive integer from 1 through 100. Start on page 1. pageCount is at least 1, even for empty input; an empty page contains no items. Derive each page using slice or an equivalent immutable operation. next/previous move one page and clamp at both ends, even if callers do not disable their own controls. Repeated calls in one event batch apply each step. When items or pageSize change, retain the page number when valid and otherwise clamp the stored page to the nearest valid page; later growth must not resurrect an out-of-range page. Keep hook instances independent. App receives optional items and pageSize, defaulting to the starter cities and 3, and uses the hook. App items are unique plain strings up to 2000 UTF16 units, possibly frozen or empty. Render one UL of exact literal page strings, `Page <page> of <pageCount>` and Previous/Next buttons disabled at the current ends. Defaults show Athens, Bergen, Cork and `Page 1 of 3`; empty input shows `Page 1 of 1` with both controls disabled.",
    starter: `${STARTER_IMPORT}

const cities = ['Athens', 'Bergen', 'Cork', 'Dresden', 'Evora', 'Faro', 'Ghent'];

export const usePagination = (items, pageSize) => ({
  pageItems: [], page: 1, pageCount: 1, next: () => {}, previous: () => {}
});

const App = ({ items = cities, pageSize = 3 } = {}) => {


  return <main>
    <h2>usePagination hook</h2>
  </main>;
};

export default App;
`,
    skeleton: `export const usePagination = (items, pageSize) => {
  const [requested, setIndex] = useState(0);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const index = Math.min(requested, pageCount - 1);
  if (requested !== index) setIndex(index);
  const pageItems = items.slice(/* start */, /* end */);
  const next = () => setIndex(current => /* one further, clamped */);
  const previous = () => setIndex(current => /* one back, clamped */);
  return { pageItems, page: index + 1, pageCount, next, previous };
};`,
    hints: ["Multiply the zero-based page index by the page size to find where a page starts, then slice one page length from there."],
    approach: [
      "Declare usePagination outside App; inside it, hold the zero-based page index in useState.",
      "Derive the page count from the item count and the page size, and the visible items from a slice that starts at the index times the page size.",
      "Return visible items and numeric page/pageCount with bounded next/previous functional updates. Guard a stored-page clamp when changed inputs reduce the range, without an unconditional render update.",
      "Call the hook with App items/pageSize, which default to cities and 3. Render exact items, the page status and current disabled flags.",
    ],
    verify: "tests",
    estimatedMinutes: 15,
    suite: `${SUITE_IMPORTS.replace("import App from './App';", "import App, { usePagination } from './App';")}
const button = (root, label) => [...root.querySelectorAll('button')].find(b => b.textContent.trim() === label);
const shown = root => [...root.querySelectorAll('li')].map(li => li.textContent.trim());

test('shows the first page of three with Previous disabled', () => {
  const { container } = render(<App />);
  expect(shown(container)).toEqual(['Athens', 'Bergen', 'Cork']);
  expect(container.textContent).toContain('Page 1 of 3');
  expect(button(container, 'Previous').disabled).toBe(true);
  expect(button(container, 'Next').disabled).toBe(false);
});

test('Next slices the following page', () => {
  const { container } = render(<App />);
  fireEvent.click(button(container, 'Next'));
  expect(shown(container)).toEqual(['Dresden', 'Evora', 'Faro']);
  expect(container.textContent).toContain('Page 2 of 3');
});

test('the last page holds the remainder and disables Next', () => {
  const { container } = render(<App />);
  fireEvent.click(button(container, 'Next'));
  fireEvent.click(button(container, 'Next'));
  expect(shown(container)).toEqual(['Ghent']);
  expect(container.textContent).toContain('Page 3 of 3');
  expect(button(container, 'Next').disabled).toBe(true);
  fireEvent.click(button(container, 'Previous'));
  expect(shown(container)).toEqual(['Dresden', 'Evora', 'Faro']);
  expect(button(container, 'Previous').disabled).toBe(false);
});
test('handles empty items and a different page size',()=>{const view=render(<App items={[]} pageSize={2}/>);expect(view.container.textContent).toContain('Page 1 of 1');expect(button(view.container,'Previous').disabled).toBe(true);expect(button(view.container,'Next').disabled).toBe(true);view.rerender(<App items={['A','B','C']} pageSize={2}/>);expect(shown(view.container)).toEqual(['A','B']);fireEvent.click(button(view.container,'Next'));expect(shown(view.container)).toEqual(['C']);});
`,
  },
  {
    id: "react-reorder-with-stable-keys",
    track: "react",
    topic: "react",
    level: 22,
    tier: 3,
    focus: ["lists-keys", "splice", "useState"],
    title: "Reorder with stable keys",
    prompt: "Render initialSteps as an OL. Each LI shows the exact label in a span plus Up and Down buttons. Disable Up on the current first row and Down on the current last row; the flags follow positions after every move. A move swaps one item with its neighbour, leaves every other relative position unchanged and does nothing past an edge. Keep stable step ids as keys so the same LI nodes follow their steps, including repeated mixed moves beyond two actions. Never mutate prior state or initialSteps. Copying then using splice, non-mutating toSpliced or an equivalent immutable operation is fine. Keep simultaneous and fresh mounts independent. Initially Plan, Build, Test, Ship; moving Build down gives Plan, Test, Build, Ship while preserving its LI node.",
    starter: `${STARTER_IMPORT}

const initialSteps = [
  { id: 'a', label: 'Plan' },
  { id: 'b', label: 'Build' },
  { id: 'c', label: 'Test' },
  { id: 'd', label: 'Ship' },
];

const App = () => {


  return <main>
    <h2>Reorder with stable keys</h2>
  </main>;
};

export default App;
`,
    skeleton: `const [steps, setSteps] = useState(initialSteps);

const move = (index, direction) => {
  setSteps(current => {
    const next = [...current];
    const [step] = next.splice(index, 1);
    next.splice(/* the neighbouring index */, 0, step);
    return next;
  });
};

<li key={/* stable per step */}>
  <span>{step.label}</span>
  <button disabled={/* first */} onClick={() => move(index, -1)}>Up</button>
  <button disabled={/* last */} onClick={() => move(index, 1)}>Down</button>
</li>`,
    hints: ["One splice removes the item at its index and hands it back, and a second splice inserts it at the neighbouring index in the same copy."],
    approach: [
      "Hold the steps in useState seeded from initialSteps, and write one move function that takes an index and a direction.",
      "Inside it, spread the previous array into a copy, splice the item out at the index, splice it back in at the index plus the direction, and return the copy.",
      "Render the list items keyed by id with the label in a span and two buttons, disabling Up at index zero and Down at the last index.",
      "Trust the key: because it follows the id, React moves the existing LI node instead of rewriting labels in place.",
    ],
    verify: "tests",
    estimatedMinutes: 15,
    suite: `${SUITE_IMPORTS}
const labels = root => [...root.querySelectorAll('li')].map(li => li.querySelector('span').textContent.trim());
const control = (li, label) => [...li.querySelectorAll('button')].find(b => b.textContent.trim() === label);

test('renders the seeded steps with the edge buttons disabled', () => {
  const { container } = render(<App />);
  expect(labels(container)).toEqual(['Plan', 'Build', 'Test', 'Ship']);
  const items = container.querySelectorAll('li');
  expect(control(items[0], 'Up').disabled).toBe(true);
  expect(control(items[0], 'Down').disabled).toBe(false);
  expect(control(items[3], 'Down').disabled).toBe(true);
});

test('moves a step one position down or up', () => {
  const { container } = render(<App />);
  fireEvent.click(control(container.querySelectorAll('li')[1], 'Down'));
  expect(labels(container)).toEqual(['Plan', 'Test', 'Build', 'Ship']);
  fireEvent.click(control(container.querySelectorAll('li')[3], 'Up'));
  expect(labels(container)).toEqual(['Plan', 'Test', 'Ship', 'Build']);
});

test('moves the same LI element instead of re-labelling it', () => {
  const { container } = render(<App />);
  const build = container.querySelectorAll('li')[1];
  fireEvent.click(control(build, 'Down'));
  expect(container.querySelectorAll('li')[2]).toBe(build);
  expect(build.querySelector('span').textContent.trim()).toBe('Build');
});

test('leaves the seed array untouched for the next mount', () => {
  const first = render(<App />);
  fireEvent.click(control(first.container.querySelectorAll('li')[0], 'Down'));
  first.unmount();
  const second = render(<App />);
  expect(labels(second.container)).toEqual(['Plan', 'Build', 'Test', 'Ship']);
});
test('disabled Up follows the new first item',()=>{const view=render(<App/>);fireEvent.click(control(view.container.querySelectorAll('li')[0],'Down'));const rows=view.container.querySelectorAll('li');expect(labels(view.container)).toEqual(['Build','Plan','Test','Ship']);expect(control(rows[0],'Up').disabled).toBe(true);expect(control(rows[1],'Up').disabled).toBe(false);});
`,
  },
];
