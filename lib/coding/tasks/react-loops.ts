// Loop and array-method tasks for the React track (authored for devShark).
// English is the source of truth; Czech copy lives in react-loops.cs.ts.

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
    prompt: "The starter declares two constants, `title` and `intro`. Render `title` inside an h1 and `intro` inside a paragraph, placing the constants in the JSX instead of retyping their text. The page must show exactly “Deep End” as its h1 and “Practise React one list at a time.” as its paragraph.",
    starter: `${STARTER_IMPORT}

const title = 'Deep End';
const intro = 'Practise React one list at a time.';

const App = () => {


  return <main>
    <h2>Heading and intro</h2>
  </main>;
};

export default App;
`,
    skeleton: `return (
  <main>
    <h1>{/* the title constant */}</h1>
    <p>{/* the intro constant */}</p>
  </main>
);`,
    hints: ["Curly braces let you drop a JavaScript value into JSX markup."],
    approach: [
      "Return one parent element from App that holds both the heading and the paragraph.",
      "Put the title constant inside the h1 with curly braces instead of typing the words again.",
      "Do the same for intro inside a paragraph, so changing a constant changes the page.",
    ],
    verify: "tests",
    estimatedMinutes: 5,
    suite: `${SUITE_IMPORTS}
test('renders the title constant in an h1', () => {
  const { container } = render(<App />);
  expect(container.querySelector('h1').textContent).toBe('Deep End');
});

test('renders the intro constant in a paragraph', () => {
  const { container } = render(<App />);
  expect(container.querySelector('p').textContent).toBe('Practise React one list at a time.');
});
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
    prompt: "Write a `Greeting` component that takes a `name` prop and renders a paragraph reading “Hello, <name>”. In `App`, map over the `names` array declared in the starter and render one `Greeting` per name, so the page shows three paragraphs, “Hello, Ana”, “Hello, Bo” and “Hello, Cyril”, in that order.",
    starter: `${STARTER_IMPORT}

const names = ['Ana', 'Bo', 'Cyril'];

const App = () => {


  return <main>
    <h2>Greeting component</h2>
  </main>;
};

export default App;
`,
    skeleton: `const Greeting = ({ name }) => (
  <p>{/* the greeting for this name */}</p>
);

{names.map(name => (
  <Greeting key={name} name={/* the name */} />
))}`,
    hints: ["A component is a function that receives props and returns JSX, and map can return one of them per array element."],
    approach: [
      "Declare Greeting above App as a function that reads name from its props.",
      "Return a paragraph from Greeting that joins the fixed word to the name.",
      "Inside App, map the names array to Greeting elements, passing each name as a prop and as the key.",
    ],
    verify: "tests",
    estimatedMinutes: 5,
    suite: `${SUITE_IMPORTS}
test('renders one greeting paragraph per name', () => {
  const { container } = render(<App />);
  expect(container.querySelectorAll('p')).toHaveLength(3);
});

test('greets every name in array order', () => {
  const { container } = render(<App />);
  const texts = [...container.querySelectorAll('p')].map(p => p.textContent.trim());
  expect(texts).toEqual(['Hello, Ana', 'Hello, Bo', 'Hello, Cyril']);
});
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
    prompt: "Write a `Price` component that takes `amount` and `currency` props and renders a span with the amount to two decimals, a space and the currency, so `amount={3.5}` with `currency=\"EUR\"` gives “3.50 EUR”. Render the `items` declared in the starter as a UL with one LI per item holding the item name and its `Price`, keyed by the item id.",
    starter: `${STARTER_IMPORT}

const items = [
  { id: 1, name: 'Coffee', amount: 3.5, currency: 'EUR' },
  { id: 2, name: 'Notebook', amount: 120, currency: 'CZK' },
  { id: 3, name: 'Sticker', amount: 0.99, currency: 'USD' },
];

const App = () => {


  return <main>
    <h2>Price component</h2>
  </main>;
};

export default App;
`,
    skeleton: `const Price = ({ amount, currency }) => (
  <span>{/* amount to two decimals, a space, the currency */}</span>
);

{items.map(item => (
  <li key={item.id}>{item.name} <Price amount={/* ... */} currency={/* ... */} /></li>
))}`,
    hints: ["Props arrive as a single object argument, and toFixed(2) turns a number into a two-decimal string."],
    approach: [
      "Declare Price above App and destructure amount and currency from its props.",
      "Format the amount with toFixed(2) and join it to the currency with one space inside a span.",
      "Map the items to list items keyed by id, each rendering the name and a Price with that item's amount and currency.",
    ],
    verify: "tests",
    estimatedMinutes: 8,
    suite: `${SUITE_IMPORTS}
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
    prompt: "Render the `books` declared in the starter as a UL with one LI per book reading “<title> by <author>” in array order, for example “Dune by Frank Herbert”, with a paragraph above it reading “3 books”. Each LI takes its key from the book's `id`, never from the array index.",
    starter: `${STARTER_IMPORT}

const books = [
  { id: 'b1', title: 'Dune', author: 'Frank Herbert' },
  { id: 'b2', title: 'Emma', author: 'Jane Austen' },
  { id: 'b3', title: 'Ubik', author: 'Philip K. Dick' },
];

const App = () => {


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
    prompt: "Render only the `products` declared in the starter whose `inStock` is true, as a UL with one LI per product name, plus a paragraph reading “2 of 4 in stock”. Filter the array before mapping it, so Snorkel and Wetsuit never appear, and key each LI by the product id.",
    starter: `${STARTER_IMPORT}

const products = [
  { id: 1, name: 'Fins', inStock: true },
  { id: 2, name: 'Snorkel', inStock: false },
  { id: 3, name: 'Mask', inStock: true },
  { id: 4, name: 'Wetsuit', inStock: false },
];

const App = () => {


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
    prompt: "Start from the `initialGuests` declared in the starter and render a text input, an Add button and a UL with one LI per guest holding the name and its own Remove button. Add appends the typed name to the end of the list and clears the input; Remove drops only that guest. Never mutate an existing array: build a new one with spread when adding and with `filter` when removing, so a fresh mount still starts from the two original guests.",
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
      "On Remove, store the result of filtering the previous guests by a different id, so nothing touches the original array.",
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
    prompt: "Render the `initialStops` declared in the starter as an OL where every LI shows the stop name in a span and three buttons: “Insert after”, “Up” and “Down”. Insert after places a new stop named “Stop <n>” (n being the current length plus one) directly after that item; Up swaps the item with the one above, Down with the one below, and nothing happens at the edges. Build every next array from `slice` and spread without mutating the previous one, so Insert after on Reef gives Harbour, Reef, Stop 4, Lighthouse.",
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
    prompt: "Render the `initialTasks` declared in the starter as a UL where every LI holds a checkbox followed by the task text, checked when `done` is true, plus a paragraph reading “1 of 3 done”. Clicking a checkbox flips only that task's `done` and keeps the list order, so ticking “Write tests” makes the paragraph read “2 of 3 done”. Update with `map`, returning a new object for the matching task and the same object for every other one, so a fresh mount starts again from the seed.",
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
    prompt: "Render a form with a text input and an Add button, and a UL that starts empty. Submitting adds the trimmed text as a new LI at the top of the list, above everything added earlier, and clears the input; a blank submission adds nothing. Adding “First” and then “Second” must list Second before First.",
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
  <input value={text} onChange={event => setText(event.target.value)} />
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
    prompt: "Render a search input, a UL of the `orders` declared in the starter whose name contains the query ignoring case, and a paragraph reading “Total: <sum of the matching prices>”, so an empty query shows all six with “Total: 585” and “dive” shows two with “Total: 180”. Add a button labelled “Nudge” that increments a counter shown as “Nudges: <n>”. Compute the filtered list and its total inside one `useMemo` that depends only on the query, so a re-render caused by Nudge skips that work.",
    starter: `${STARTER_IMPORT}

const orders = [
  { id: 1, name: 'Mask', price: 40 },
  { id: 2, name: 'Fins', price: 90 },
  { id: 3, name: 'Wetsuit', price: 250 },
  { id: 4, name: 'Snorkel', price: 25 },
  { id: 5, name: 'Dive light', price: 120 },
  { id: 6, name: 'Dive knife', price: 60 },
];

const App = () => {


  return <main>
    <h2>Memoised total</h2>
  </main>;
};

export default App;
`,
    skeleton: `const [query, setQuery] = useState('');
const [nudges, setNudges] = useState(0);

const { matching, total } = useMemo(() => {
  const matching = orders.filter(order => /* the name contains the query, ignoring case */);
  const total = matching.reduce((sum, order) => /* add the price */, 0);
  return { matching, total };
}, [/* only what the calculation reads */]);`,
    hints: ["useMemo takes a function that returns the filtered list with its total, and a dependency array holding the query alone."],
    approach: [
      "Keep the query and the nudge counter in two useState values, and bind the input to the query.",
      "Wrap the filter and the reduce in useMemo with the query as its only dependency, returning both the matching orders and their total.",
      "Render the list, the total and the counter from those values; clicking Nudge changes only its own state.",
    ],
    verify: "tests",
    estimatedMinutes: 12,
    suite: `${SUITE_IMPORTS}
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
    prompt: "Render a paragraph reading “Picked: none” and one button per flavour declared in the starter, each rendered by a `FlavourButton` child wrapped in `React.memo` that receives `label` and `onPick` props. Clicking a button passes its label to `onPick` and the paragraph shows it, so clicking Mint gives “Picked: Mint”. Create `onPick` with `useCallback` and an empty dependency array, so the memoised children receive the same function on every render.",
    starter: `${STARTER_IMPORT}

const flavours = ['Vanilla', 'Chocolate', 'Mint'];

const App = () => {


  return <main>
    <h2>Stable pick handler</h2>
  </main>;
};

export default App;
`,
    skeleton: `const FlavourButton = React.memo(({ label, onPick }) => (
  <button onClick={() => onPick(label)}>{label}</button>
));

const [picked, setPicked] = useState('none');
const onPick = useCallback(label => {
  /* store the label */
}, []);`,
    hints: ["A function created in the component body is new on every render, while useCallback with no dependencies hands back the same one each time."],
    approach: [
      "Keep the picked label in useState starting as none, and render the paragraph from it.",
      "Wrap the handler in useCallback with an empty dependency array; it only calls the setter with the label it receives.",
      "Declare FlavourButton outside App, wrap it in React.memo, and map the flavours to it, passing the label and the shared handler.",
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
    prompt: "Render a Push button, an Undo button, a paragraph reading “Depth: <n>” and a UL listing the stack from bottom to top. Manage the stack with `useReducer`: a `push` action adds “Step <n>” where n is the new depth, and a `pop` action removes the last entry. Undo is disabled while the stack is empty, so two pushes and one undo leave only “Step 1” with “Depth: 1”.",
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
    prompt: "Render a “Take a ticket” button, a “Call next” button, a paragraph reading “Next up: <first ticket or none>”, a paragraph reading “Waiting: <n>” and a UL of the waiting tickets in order. Keep the queue in `useReducer`: an `enqueue` action appends “Ticket <n>” with n counting up from 1 for the whole session, and a `dequeue` action removes the first ticket. Call next is disabled when nobody waits, so three takes and one call leave Ticket 2 and Ticket 3 with “Next up: Ticket 2”.",
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
    prompt: "Write `usePagination(items, pageSize)`, a hook that keeps the current page in state and returns that page's items, the page number, the page count and functions that move forward and back. Use it in App with the `cities` declared in the starter and a page size of 3: render the page items as a UL, a paragraph reading “Page 1 of 3”, and Previous and Next buttons that are disabled on the first and the last page. Cut each page out of the array with `slice`.",
    starter: `${STARTER_IMPORT}

const cities = ['Athens', 'Bergen', 'Cork', 'Dresden', 'Evora', 'Faro', 'Ghent'];

const App = () => {


  return <main>
    <h2>usePagination hook</h2>
  </main>;
};

export default App;
`,
    skeleton: `const usePagination = (items, pageSize) => {
  const [index, setIndex] = useState(0);
  const pageCount = Math.ceil(items.length / pageSize);
  const pageItems = items.slice(/* start */, /* end */);
  const next = () => setIndex(current => /* one further, never past the last page */);
  const previous = () => setIndex(current => /* one back, never below zero */);
  return { pageItems, page: index + 1, pageCount, next, previous };
};`,
    hints: ["Multiply the zero-based page index by the page size to find where a page starts, then slice one page length from there."],
    approach: [
      "Declare usePagination outside App; inside it, hold the zero-based page index in useState.",
      "Derive the page count from the item count and the page size, and the visible items from a slice that starts at the index times the page size.",
      "Return the visible items, the one-based page number, the page count, and next and previous functions that stay within the bounds.",
      "Call the hook in App with the cities and 3, then render the list, the status line and the two buttons with their disabled flags.",
    ],
    verify: "tests",
    estimatedMinutes: 15,
    suite: `${SUITE_IMPORTS}
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
    prompt: "Render the `initialSteps` declared in the starter as an OL where each LI shows the label in a span plus Up and Down buttons; Up is disabled on the first item and Down on the last. A move copies the array, takes the item out with `splice`, puts it back one position over with a second `splice`, and stores the copy. Key every LI by the step's `id`, so when Build moves down the same LI element travels with it instead of being re-labelled, and the order reads Plan, Test, Build, Ship.",
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
`,
  },
];
