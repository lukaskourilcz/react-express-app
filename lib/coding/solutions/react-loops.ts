// Server-only reference solutions and hidden tests for lib/coding/tasks/react-loops.ts.
// Never import from client code.

import type { CodingSolution } from '../types';

export const REACT_LOOP_SOLUTIONS: Record<string, CodingSolution> = {
  "react-heading-and-intro": {
    solution: `import React from 'react';

const title = 'Deep End';
const intro = 'Practise React one list at a time.';

const App = () => (
  <main>
    <h1>{title}</h1>
    <p>{intro}</p>
  </main>
);

export default App;
`,
    junior: `import React from 'react';

const title = 'Deep End';
const intro = 'Practise React one list at a time.';

const App = () => {
  const heading = <h1>{title}</h1>;
  const paragraph = <p>{intro}</p>;

  return (
    <main>
      {heading}
      {paragraph}
    </main>
  );
};

export default App;
`,
    senior: `import React from 'react';

const title = 'Deep End';
const intro = 'Practise React one list at a time.';

const Intro = ({ heading, text }) => (
  <>
    <h1>{heading}</h1>
    <p>{text}</p>
  </>
);

const App = () => (
  <main>
    <Intro heading={title} text={intro} />
  </main>
);

export default App;
`,
  },
  "react-greeting-component": {
    solution: `import React from 'react';

const names = ['Ana', 'Bo', 'Cyril'];

const Greeting = ({ name }) => <p>Hello, {name}</p>;

const App = () => (
  <main>
    {names.map(name => (
      <Greeting key={name} name={name} />
    ))}
  </main>
);

export default App;
`,
    junior: `import React from 'react';

const names = ['Ana', 'Bo', 'Cyril'];

function Greeting(props) {
  const message = 'Hello, ' + props.name;
  return <p>{message}</p>;
}

const App = () => {
  const greetings = [];
  for (const name of names) {
    greetings.push(<Greeting key={name} name={name} />);
  }

  return <main>{greetings}</main>;
};

export default App;
`,
    senior: `import React from 'react';

const names = ['Ana', 'Bo', 'Cyril'];

const Greeting = ({ name }) => <p>{\`Hello, \${name}\`}</p>;

// A list component may return an array directly; it needs no wrapper of its own.
const Greetings = ({ people }) => people.map(name => <Greeting key={name} name={name} />);

const App = () => (
  <main>
    <Greetings people={names} />
  </main>
);

export default App;
`,
  },
  "react-price-component": {
    solution: `import React from 'react';

const items = [
  { id: 1, name: 'Coffee', amount: 3.5, currency: 'EUR' },
  { id: 2, name: 'Notebook', amount: 120, currency: 'CZK' },
  { id: 3, name: 'Sticker', amount: 0.99, currency: 'USD' },
];

const Price = ({ amount, currency }) => <span>{amount.toFixed(2)} {currency}</span>;

const App = () => (
  <main>
    <ul>
      {items.map(item => (
        <li key={item.id}>
          {item.name} <Price amount={item.amount} currency={item.currency} />
        </li>
      ))}
    </ul>
  </main>
);

export default App;
`,
    junior: `import React from 'react';

const items = [
  { id: 1, name: 'Coffee', amount: 3.5, currency: 'EUR' },
  { id: 2, name: 'Notebook', amount: 120, currency: 'CZK' },
  { id: 3, name: 'Sticker', amount: 0.99, currency: 'USD' },
];

function Price(props) {
  const formatted = props.amount.toFixed(2);
  const text = formatted + ' ' + props.currency;
  return <span>{text}</span>;
}

const App = () => {
  const rows = [];
  for (const item of items) {
    rows.push(
      <li key={item.id}>
        {item.name} <Price amount={item.amount} currency={item.currency} />
      </li>,
    );
  }

  return (
    <main>
      <ul>{rows}</ul>
    </main>
  );
};

export default App;
`,
    senior: `import React from 'react';

const items = [
  { id: 1, name: 'Coffee', amount: 3.5, currency: 'EUR' },
  { id: 2, name: 'Notebook', amount: 120, currency: 'CZK' },
  { id: 3, name: 'Sticker', amount: 0.99, currency: 'USD' },
];

const formatPrice = (amount, currency) => \`\${amount.toFixed(2)} \${currency}\`;

const Price = ({ amount, currency }) => <span>{formatPrice(amount, currency)}</span>;

const App = () => (
  <main>
    <ul>
      {items.map(({ id, name, ...price }) => (
        <li key={id}>
          {name} <Price {...price} />
        </li>
      ))}
    </ul>
  </main>
);

export default App;
`,
  },
  "react-keyed-book-list": {
    solution: `import React from 'react';

const books = [
  { id: 'b1', title: 'Dune', author: 'Frank Herbert' },
  { id: 'b2', title: 'Emma', author: 'Jane Austen' },
  { id: 'b3', title: 'Ubik', author: 'Philip K. Dick' },
];

const App = () => (
  <main>
    <p>{books.length} books</p>
    <ul>
      {books.map(book => (
        <li key={book.id}>{book.title} by {book.author}</li>
      ))}
    </ul>
  </main>
);

export default App;
`,
    junior: `import React from 'react';

const books = [
  { id: 'b1', title: 'Dune', author: 'Frank Herbert' },
  { id: 'b2', title: 'Emma', author: 'Jane Austen' },
  { id: 'b3', title: 'Ubik', author: 'Philip K. Dick' },
];

const App = () => {
  const count = books.length;
  const rows = [];
  for (const book of books) {
    const text = book.title + ' by ' + book.author;
    rows.push(<li key={book.id}>{text}</li>);
  }

  return (
    <main>
      <p>{count} books</p>
      <ul>{rows}</ul>
    </main>
  );
};

export default App;
`,
    senior: `import React from 'react';

const books = [
  { id: 'b1', title: 'Dune', author: 'Frank Herbert' },
  { id: 'b2', title: 'Emma', author: 'Jane Austen' },
  { id: 'b3', title: 'Ubik', author: 'Philip K. Dick' },
];

const Book = ({ title, author }) => <li>{\`\${title} by \${author}\`}</li>;

const App = () => (
  <main>
    <p>{\`\${books.length} books\`}</p>
    <ul>
      {books.map(({ id, ...book }) => (
        <Book key={id} {...book} />
      ))}
    </ul>
  </main>
);

export default App;
`,
  },
  "react-in-stock-list": {
    solution: `import React from 'react';

const products = [
  { id: 1, name: 'Fins', inStock: true },
  { id: 2, name: 'Snorkel', inStock: false },
  { id: 3, name: 'Mask', inStock: true },
  { id: 4, name: 'Wetsuit', inStock: false },
];

const App = () => {
  const available = products.filter(product => product.inStock);
  return (
    <main>
      <p>{available.length} of {products.length} in stock</p>
      <ul>
        {available.map(product => (
          <li key={product.id}>{product.name}</li>
        ))}
      </ul>
    </main>
  );
};

export default App;
`,
    junior: `import React from 'react';

const products = [
  { id: 1, name: 'Fins', inStock: true },
  { id: 2, name: 'Snorkel', inStock: false },
  { id: 3, name: 'Mask', inStock: true },
  { id: 4, name: 'Wetsuit', inStock: false },
];

const App = () => {
  const available = [];
  for (const product of products) {
    if (product.inStock) {
      available.push(product);
    }
  }

  const rows = [];
  for (const product of available) {
    rows.push(<li key={product.id}>{product.name}</li>);
  }

  return (
    <main>
      <p>{available.length} of {products.length} in stock</p>
      <ul>{rows}</ul>
    </main>
  );
};

export default App;
`,
    senior: `import React from 'react';

const products = [
  { id: 1, name: 'Fins', inStock: true },
  { id: 2, name: 'Snorkel', inStock: false },
  { id: 3, name: 'Mask', inStock: true },
  { id: 4, name: 'Wetsuit', inStock: false },
];

const inStock = product => product.inStock;

const ProductList = ({ items }) => (
  <ul>
    {items.map(({ id, name }) => (
      <li key={id}>{name}</li>
    ))}
  </ul>
);

const App = () => {
  const available = products.filter(inStock);
  return (
    <main>
      <p>{\`\${available.length} of \${products.length} in stock\`}</p>
      <ProductList items={available} />
    </main>
  );
};

export default App;
`,
  },
  "react-guest-list": {
    solution: `import React, { useState } from 'react';

const initialGuests = [
  { id: 1, name: 'Ana' },
  { id: 2, name: 'Bo' },
];

const App = () => {
  const [guests, setGuests] = useState(initialGuests);
  const [name, setName] = useState('');

  const addGuest = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const nextId = guests.reduce((max, guest) => Math.max(max, guest.id), 0) + 1;
    setGuests(current => [...current, { id: nextId, name: trimmed }]);
    setName('');
  };

  const removeGuest = id => setGuests(current => current.filter(guest => guest.id !== id));

  return (
    <main>
      <input value={name} onChange={event => setName(event.target.value)} />
      <button onClick={addGuest}>Add</button>
      <ul>
        {guests.map(guest => (
          <li key={guest.id}>
            {guest.name} <button onClick={() => removeGuest(guest.id)}>Remove</button>
          </li>
        ))}
      </ul>
    </main>
  );
};

export default App;
`,
    junior: `import React, { useState } from 'react';

const initialGuests = [
  { id: 1, name: 'Ana' },
  { id: 2, name: 'Bo' },
];

const App = () => {
  const [guests, setGuests] = useState(initialGuests);
  const [name, setName] = useState('');
  const [nextId, setNextId] = useState(initialGuests.length + 1);

  function handleAdd() {
    const trimmed = name.trim();
    if (trimmed === '') {
      return;
    }
    const newGuest = { id: nextId, name: trimmed };
    const newGuests = [...guests, newGuest];
    setGuests(newGuests);
    setNextId(nextId + 1);
    setName('');
  }

  function handleRemove(id) {
    const kept = [];
    for (const guest of guests) {
      if (guest.id !== id) {
        kept.push(guest);
      }
    }
    setGuests(kept);
  }

  const rows = [];
  for (const guest of guests) {
    rows.push(
      <li key={guest.id}>
        {guest.name} <button onClick={() => handleRemove(guest.id)}>Remove</button>
      </li>,
    );
  }

  return (
    <main>
      <input value={name} onChange={event => setName(event.target.value)} />
      <button onClick={handleAdd}>Add</button>
      <ul>{rows}</ul>
    </main>
  );
};

export default App;
`,
    senior: `import React, { useRef, useState } from 'react';

const initialGuests = [
  { id: 1, name: 'Ana' },
  { id: 2, name: 'Bo' },
];

const Guest = ({ guest, onRemove }) => (
  <li>
    {guest.name} <button onClick={() => onRemove(guest.id)}>Remove</button>
  </li>
);

const App = () => {
  const [guests, setGuests] = useState(initialGuests);
  const [name, setName] = useState('');
  // A counter in a ref keeps ids unique even after removals; max(id) + 1 would reuse them.
  const nextId = useRef(Math.max(...initialGuests.map(guest => guest.id)) + 1);

  const addGuest = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const guest = { id: nextId.current, name: trimmed };
    nextId.current += 1;
    setGuests(current => [...current, guest]);
    setName('');
  };

  const removeGuest = id => setGuests(current => current.filter(guest => guest.id !== id));

  return (
    <main>
      <input value={name} onChange={event => setName(event.target.value)} />
      <button onClick={addGuest}>Add</button>
      <ul>
        {guests.map(guest => (
          <Guest key={guest.id} guest={guest} onRemove={removeGuest} />
        ))}
      </ul>
    </main>
  );
};

export default App;
`,
  },
  "react-insert-and-reorder": {
    solution: `import React, { useState } from 'react';

const initialStops = [
  { id: 1, name: 'Harbour' },
  { id: 2, name: 'Reef' },
  { id: 3, name: 'Lighthouse' },
];

const App = () => {
  const [stops, setStops] = useState(initialStops);

  const insertAfter = index => {
    setStops(current => {
      const nextId = current.reduce((max, stop) => Math.max(max, stop.id), 0) + 1;
      return [
        ...current.slice(0, index + 1),
        { id: nextId, name: 'Stop ' + (current.length + 1) },
        ...current.slice(index + 1),
      ];
    });
  };

  const swap = (current, upper) => [
    ...current.slice(0, upper),
    current[upper + 1],
    current[upper],
    ...current.slice(upper + 2),
  ];

  const moveUp = index => {
    if (index === 0) return;
    setStops(current => swap(current, index - 1));
  };

  const moveDown = index => {
    setStops(current => (index >= current.length - 1 ? current : swap(current, index)));
  };

  return (
    <main>
      <ol>
        {stops.map((stop, index) => (
          <li key={stop.id}>
            <span>{stop.name}</span>
            <button onClick={() => insertAfter(index)}>Insert after</button>
            <button onClick={() => moveUp(index)}>Up</button>
            <button onClick={() => moveDown(index)}>Down</button>
          </li>
        ))}
      </ol>
    </main>
  );
};

export default App;
`,
    junior: `import React, { useState } from 'react';

const initialStops = [
  { id: 1, name: 'Harbour' },
  { id: 2, name: 'Reef' },
  { id: 3, name: 'Lighthouse' },
];

const App = () => {
  const [stops, setStops] = useState(initialStops);

  function handleInsertAfter(index) {
    let highestId = 0;
    for (const stop of stops) {
      if (stop.id > highestId) {
        highestId = stop.id;
      }
    }
    const newStop = { id: highestId + 1, name: 'Stop ' + (stops.length + 1) };
    const before = stops.slice(0, index + 1);
    const after = stops.slice(index + 1);
    setStops([...before, newStop, ...after]);
  }

  function handleMoveUp(index) {
    if (index === 0) {
      return;
    }
    const before = stops.slice(0, index - 1);
    const upper = stops[index - 1];
    const lower = stops[index];
    const after = stops.slice(index + 1);
    setStops([...before, lower, upper, ...after]);
  }

  function handleMoveDown(index) {
    if (index === stops.length - 1) {
      return;
    }
    const before = stops.slice(0, index);
    const upper = stops[index];
    const lower = stops[index + 1];
    const after = stops.slice(index + 2);
    setStops([...before, lower, upper, ...after]);
  }

  const rows = [];
  for (let index = 0; index < stops.length; index++) {
    const stop = stops[index];
    rows.push(
      <li key={stop.id}>
        <span>{stop.name}</span>
        <button onClick={() => handleInsertAfter(index)}>Insert after</button>
        <button onClick={() => handleMoveUp(index)}>Up</button>
        <button onClick={() => handleMoveDown(index)}>Down</button>
      </li>,
    );
  }

  return (
    <main>
      <ol>{rows}</ol>
    </main>
  );
};

export default App;
`,
    senior: `import React, { useState } from 'react';

const initialStops = [
  { id: 1, name: 'Harbour' },
  { id: 2, name: 'Reef' },
  { id: 3, name: 'Lighthouse' },
];

const swapped = (list, a, b) => {
  const next = [...list];
  [next[a], next[b]] = [next[b], next[a]];
  return next;
};

const App = () => {
  const [stops, setStops] = useState(initialStops);

  const insertAfter = index =>
    setStops(current => {
      const stop = { id: Math.max(...current.map(s => s.id)) + 1, name: \`Stop \${current.length + 1}\` };
      // flatMap lets one element expand into two, which is an insert with no index arithmetic.
      return current.flatMap((existing, i) => (i === index ? [existing, stop] : [existing]));
    });

  const move = (index, direction) =>
    setStops(current => {
      const target = index + direction;
      return target < 0 || target >= current.length ? current : swapped(current, index, target);
    });

  return (
    <main>
      <ol>
        {stops.map((stop, index) => (
          <li key={stop.id}>
            <span>{stop.name}</span>
            <button onClick={() => insertAfter(index)}>Insert after</button>
            <button onClick={() => move(index, -1)}>Up</button>
            <button onClick={() => move(index, 1)}>Down</button>
          </li>
        ))}
      </ol>
    </main>
  );
};

export default App;
`,
  },
  "react-toggle-done-with-map": {
    solution: `import React, { useState } from 'react';

const initialTasks = [
  { id: 1, text: 'Write tests', done: false },
  { id: 2, text: 'Fix the build', done: true },
  { id: 3, text: 'Ship it', done: false },
];

const App = () => {
  const [tasks, setTasks] = useState(initialTasks);
  const done = tasks.filter(task => task.done).length;

  const toggle = id => {
    setTasks(current => current.map(task => (task.id === id ? { ...task, done: !task.done } : task)));
  };

  return (
    <main>
      <p>{done} of {tasks.length} done</p>
      <ul>
        {tasks.map(task => (
          <li key={task.id}>
            <label>
              <input type="checkbox" checked={task.done} onChange={() => toggle(task.id)} />
              {task.text}
            </label>
          </li>
        ))}
      </ul>
    </main>
  );
};

export default App;
`,
    junior: `import React, { useState } from 'react';

const initialTasks = [
  { id: 1, text: 'Write tests', done: false },
  { id: 2, text: 'Fix the build', done: true },
  { id: 3, text: 'Ship it', done: false },
];

const App = () => {
  const [tasks, setTasks] = useState(initialTasks);

  let doneCount = 0;
  for (const task of tasks) {
    if (task.done) {
      doneCount = doneCount + 1;
    }
  }

  function handleToggle(id) {
    const newTasks = [];
    for (const task of tasks) {
      if (task.id === id) {
        newTasks.push({ id: task.id, text: task.text, done: !task.done });
      } else {
        newTasks.push(task);
      }
    }
    setTasks(newTasks);
  }

  const rows = [];
  for (const task of tasks) {
    rows.push(
      <li key={task.id}>
        <label>
          <input type="checkbox" checked={task.done} onChange={() => handleToggle(task.id)} />
          {task.text}
        </label>
      </li>,
    );
  }

  return (
    <main>
      <p>{doneCount} of {tasks.length} done</p>
      <ul>{rows}</ul>
    </main>
  );
};

export default App;
`,
    senior: `import React, { useState } from 'react';

const initialTasks = [
  { id: 1, text: 'Write tests', done: false },
  { id: 2, text: 'Fix the build', done: true },
  { id: 3, text: 'Ship it', done: false },
];

// Pure and outside the component, so it is trivial to unit test and reuse.
const toggleDone = (tasks, id) => tasks.map(task => (task.id === id ? { ...task, done: !task.done } : task));

const TaskRow = ({ task, onToggle }) => (
  <li>
    <label>
      <input type="checkbox" checked={task.done} onChange={() => onToggle(task.id)} />
      {task.text}
    </label>
  </li>
);

const App = () => {
  const [tasks, setTasks] = useState(initialTasks);
  const doneCount = tasks.filter(task => task.done).length;
  const toggle = id => setTasks(current => toggleDone(current, id));

  return (
    <main>
      <p>{\`\${doneCount} of \${tasks.length} done\`}</p>
      <ul>
        {tasks.map(task => (
          <TaskRow key={task.id} task={task} onToggle={toggle} />
        ))}
      </ul>
    </main>
  );
};

export default App;
`,
  },
  "react-newest-first-todos": {
    solution: `import React, { useRef, useState } from 'react';

const App = () => {
  const [text, setText] = useState('');
  const [todos, setTodos] = useState([]);
  const nextId = useRef(1);

  const submit = event => {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    const todo = { id: nextId.current, text: trimmed };
    nextId.current += 1;
    setTodos(current => [todo, ...current]);
    setText('');
  };

  return (
    <main>
      <form onSubmit={submit}>
        <input value={text} onChange={event => setText(event.target.value)} />
        <button>Add</button>
      </form>
      <ul>
        {todos.map(todo => (
          <li key={todo.id}>{todo.text}</li>
        ))}
      </ul>
    </main>
  );
};

export default App;
`,
    junior: `import React, { useState } from 'react';

const App = () => {
  const [text, setText] = useState('');
  const [todos, setTodos] = useState([]);
  const [nextId, setNextId] = useState(1);

  function handleSubmit(event) {
    event.preventDefault();
    const trimmed = text.trim();
    if (trimmed === '') {
      return;
    }
    const newTodo = { id: nextId, text: trimmed };
    const newTodos = [newTodo];
    for (const todo of todos) {
      newTodos.push(todo);
    }
    setTodos(newTodos);
    setNextId(nextId + 1);
    setText('');
  }

  const rows = [];
  for (const todo of todos) {
    rows.push(<li key={todo.id}>{todo.text}</li>);
  }

  return (
    <main>
      <form onSubmit={handleSubmit}>
        <input value={text} onChange={event => setText(event.target.value)} />
        <button>Add</button>
      </form>
      <ul>{rows}</ul>
    </main>
  );
};

export default App;
`,
    senior: `import React, { useState } from 'react';

const TodoForm = ({ onAdd }) => {
  const [text, setText] = useState('');

  const submit = event => {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setText('');
  };

  return (
    <form onSubmit={submit}>
      <input value={text} onChange={event => setText(event.target.value)} />
      <button>Add</button>
    </form>
  );
};

const App = () => {
  const [todos, setTodos] = useState([]);
  // Nothing is ever removed, so the next length is a unique and stable key.
  const add = text => setTodos(current => [{ id: current.length + 1, text }, ...current]);

  return (
    <main>
      <TodoForm onAdd={add} />
      <ul>
        {todos.map(todo => (
          <li key={todo.id}>{todo.text}</li>
        ))}
      </ul>
    </main>
  );
};

export default App;
`,
  },
  "react-memoised-total": {
    solution: `import React, { useMemo, useState } from 'react';

const orders = [
  { id: 1, name: 'Mask', price: 40 },
  { id: 2, name: 'Fins', price: 90 },
  { id: 3, name: 'Wetsuit', price: 250 },
  { id: 4, name: 'Snorkel', price: 25 },
  { id: 5, name: 'Dive light', price: 120 },
  { id: 6, name: 'Dive knife', price: 60 },
];

const App = () => {
  const [query, setQuery] = useState('');
  const [nudges, setNudges] = useState(0);

  const { matching, total } = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matching = orders.filter(order => order.name.toLowerCase().includes(needle));
    const total = matching.reduce((sum, order) => sum + order.price, 0);
    return { matching, total };
  }, [query]);

  return (
    <main>
      <input value={query} onChange={event => setQuery(event.target.value)} />
      <p>Total: {total}</p>
      <ul>
        {matching.map(order => (
          <li key={order.id}>{order.name}</li>
        ))}
      </ul>
      <button onClick={() => setNudges(count => count + 1)}>Nudge</button>
      <p>Nudges: {nudges}</p>
    </main>
  );
};

export default App;
`,
    junior: `import React, { useMemo, useState } from 'react';

const orders = [
  { id: 1, name: 'Mask', price: 40 },
  { id: 2, name: 'Fins', price: 90 },
  { id: 3, name: 'Wetsuit', price: 250 },
  { id: 4, name: 'Snorkel', price: 25 },
  { id: 5, name: 'Dive light', price: 120 },
  { id: 6, name: 'Dive knife', price: 60 },
];

const App = () => {
  const [query, setQuery] = useState('');
  const [nudges, setNudges] = useState(0);

  const result = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matching = [];
    let total = 0;
    for (const order of orders) {
      const name = order.name.toLowerCase();
      if (name.includes(needle)) {
        matching.push(order);
        total = total + order.price;
      }
    }
    return { matching: matching, total: total };
  }, [query]);

  function handleNudge() {
    setNudges(nudges + 1);
  }

  const rows = [];
  for (const order of result.matching) {
    rows.push(<li key={order.id}>{order.name}</li>);
  }

  return (
    <main>
      <input value={query} onChange={event => setQuery(event.target.value)} />
      <p>Total: {result.total}</p>
      <ul>{rows}</ul>
      <button onClick={handleNudge}>Nudge</button>
      <p>Nudges: {nudges}</p>
    </main>
  );
};

export default App;
`,
    senior: `import React, { useMemo, useState } from 'react';

const orders = [
  { id: 1, name: 'Mask', price: 40 },
  { id: 2, name: 'Fins', price: 90 },
  { id: 3, name: 'Wetsuit', price: 250 },
  { id: 4, name: 'Snorkel', price: 25 },
  { id: 5, name: 'Dive light', price: 120 },
  { id: 6, name: 'Dive knife', price: 60 },
];

const search = (list, query) => {
  const needle = query.trim().toLowerCase();
  return needle ? list.filter(order => order.name.toLowerCase().includes(needle)) : list;
};

const sum = list => list.reduce((acc, order) => acc + order.price, 0);

const App = () => {
  const [query, setQuery] = useState('');
  const [nudges, setNudges] = useState(0);

  // One memo returns both values, so a Nudge re-render reuses the same list and total.
  const { matching, total } = useMemo(() => {
    const matching = search(orders, query);
    return { matching, total: sum(matching) };
  }, [query]);

  return (
    <main>
      <input value={query} onChange={event => setQuery(event.target.value)} />
      <p>{\`Total: \${total}\`}</p>
      <ul>
        {matching.map(({ id, name }) => (
          <li key={id}>{name}</li>
        ))}
      </ul>
      <button onClick={() => setNudges(count => count + 1)}>Nudge</button>
      <p>{\`Nudges: \${nudges}\`}</p>
    </main>
  );
};

export default App;
`,
  },
  "react-stable-pick-handler": {
    solution: `import React, { useCallback, useState } from 'react';

const flavours = ['Vanilla', 'Chocolate', 'Mint'];

const FlavourButton = React.memo(({ label, onPick }) => (
  <button onClick={() => onPick(label)}>{label}</button>
));

const App = () => {
  const [picked, setPicked] = useState('none');
  const onPick = useCallback(label => {
    setPicked(label);
  }, []);

  return (
    <main>
      <p>Picked: {picked}</p>
      {flavours.map(flavour => (
        <FlavourButton key={flavour} label={flavour} onPick={onPick} />
      ))}
    </main>
  );
};

export default App;
`,
    junior: `import React, { useCallback, useState } from 'react';

const flavours = ['Vanilla', 'Chocolate', 'Mint'];

const FlavourButton = React.memo(function FlavourButton(props) {
  function handleClick() {
    props.onPick(props.label);
  }
  return <button onClick={handleClick}>{props.label}</button>;
});

const App = () => {
  const [picked, setPicked] = useState('none');

  const onPick = useCallback(function (label) {
    setPicked(label);
  }, []);

  const buttons = [];
  for (const flavour of flavours) {
    buttons.push(<FlavourButton key={flavour} label={flavour} onPick={onPick} />);
  }

  return (
    <main>
      <p>Picked: {picked}</p>
      {buttons}
    </main>
  );
};

export default App;
`,
    senior: `import React, { memo, useCallback, useState } from 'react';

const flavours = ['Vanilla', 'Chocolate', 'Mint'];

const FlavourButton = memo(({ label, onPick }) => <button onClick={() => onPick(label)}>{label}</button>);

const App = () => {
  const [picked, setPicked] = useState('none');
  // The updater reads no closed-over state, so [] is honest, and a repeat pick returns the same value.
  const onPick = useCallback(label => setPicked(current => (current === label ? current : label)), []);

  return (
    <main>
      <p>{\`Picked: \${picked}\`}</p>
      {flavours.map(flavour => (
        <FlavourButton key={flavour} label={flavour} onPick={onPick} />
      ))}
    </main>
  );
};

export default App;
`,
  },
  "react-undo-stack": {
    solution: `import React, { useReducer } from 'react';

const reducer = (stack, action) => {
  switch (action.type) {
    case 'push': {
      const next = [...stack];
      next.push('Step ' + (stack.length + 1));
      return next;
    }
    case 'pop': {
      const next = [...stack];
      next.pop();
      return next;
    }
    default:
      return stack;
  }
};

const App = () => {
  const [stack, dispatch] = useReducer(reducer, []);

  return (
    <main>
      <button onClick={() => dispatch({ type: 'push' })}>Push</button>
      <button disabled={stack.length === 0} onClick={() => dispatch({ type: 'pop' })}>Undo</button>
      <p>Depth: {stack.length}</p>
      <ul>
        {stack.map(step => (
          <li key={step}>{step}</li>
        ))}
      </ul>
    </main>
  );
};

export default App;
`,
    junior: `import React, { useReducer } from 'react';

function reducer(stack, action) {
  if (action.type === 'push') {
    const next = [];
    for (const step of stack) {
      next.push(step);
    }
    next.push('Step ' + (stack.length + 1));
    return next;
  }
  if (action.type === 'pop') {
    const next = [];
    for (let i = 0; i < stack.length - 1; i++) {
      next.push(stack[i]);
    }
    return next;
  }
  return stack;
}

const App = () => {
  const [stack, dispatch] = useReducer(reducer, []);
  const depth = stack.length;
  const canUndo = depth > 0;

  function handlePush() {
    dispatch({ type: 'push' });
  }

  function handleUndo() {
    dispatch({ type: 'pop' });
  }

  const rows = [];
  for (const step of stack) {
    rows.push(<li key={step}>{step}</li>);
  }

  return (
    <main>
      <button onClick={handlePush}>Push</button>
      <button disabled={!canUndo} onClick={handleUndo}>Undo</button>
      <p>Depth: {depth}</p>
      <ul>{rows}</ul>
    </main>
  );
};

export default App;
`,
    senior: `import React, { useReducer } from 'react';

const reducer = (stack, action) => {
  switch (action.type) {
    case 'push':
      return [...stack, \`Step \${stack.length + 1}\`];
    case 'pop':
      // slice(0, -1) is the immutable pop: a new array without the last entry.
      return stack.slice(0, -1);
    default:
      return stack;
  }
};

const App = () => {
  const [stack, dispatch] = useReducer(reducer, []);
  const depth = stack.length;

  return (
    <main>
      <button onClick={() => dispatch({ type: 'push' })}>Push</button>
      <button disabled={depth === 0} onClick={() => dispatch({ type: 'pop' })}>Undo</button>
      <p>{\`Depth: \${depth}\`}</p>
      <ul>
        {stack.map(step => (
          <li key={step}>{step}</li>
        ))}
      </ul>
    </main>
  );
};

export default App;
`,
  },
  "react-ticket-queue": {
    solution: `import React, { useReducer } from 'react';

const reducer = (state, action) => {
  switch (action.type) {
    case 'enqueue': {
      const issued = state.issued + 1;
      return { issued, tickets: [...state.tickets, 'Ticket ' + issued] };
    }
    case 'dequeue': {
      const tickets = [...state.tickets];
      tickets.shift();
      return { ...state, tickets };
    }
    default:
      return state;
  }
};

const App = () => {
  const [state, dispatch] = useReducer(reducer, { tickets: [], issued: 0 });
  const { tickets } = state;

  return (
    <main>
      <button onClick={() => dispatch({ type: 'enqueue' })}>Take a ticket</button>
      <button disabled={tickets.length === 0} onClick={() => dispatch({ type: 'dequeue' })}>Call next</button>
      <p>Next up: {tickets.length > 0 ? tickets[0] : 'none'}</p>
      <p>Waiting: {tickets.length}</p>
      <ul>
        {tickets.map(ticket => (
          <li key={ticket}>{ticket}</li>
        ))}
      </ul>
    </main>
  );
};

export default App;
`,
    junior: `import React, { useReducer } from 'react';

function reducer(state, action) {
  if (action.type === 'enqueue') {
    const issued = state.issued + 1;
    const tickets = [];
    for (const ticket of state.tickets) {
      tickets.push(ticket);
    }
    tickets.push('Ticket ' + issued);
    return { issued: issued, tickets: tickets };
  }
  if (action.type === 'dequeue') {
    const tickets = [];
    for (let i = 1; i < state.tickets.length; i++) {
      tickets.push(state.tickets[i]);
    }
    return { issued: state.issued, tickets: tickets };
  }
  return state;
}

const App = () => {
  const [state, dispatch] = useReducer(reducer, { tickets: [], issued: 0 });
  const waiting = state.tickets.length;

  let nextUp = 'none';
  if (waiting > 0) {
    nextUp = state.tickets[0];
  }

  const rows = [];
  for (const ticket of state.tickets) {
    rows.push(<li key={ticket}>{ticket}</li>);
  }

  return (
    <main>
      <button onClick={() => dispatch({ type: 'enqueue' })}>Take a ticket</button>
      <button disabled={waiting === 0} onClick={() => dispatch({ type: 'dequeue' })}>Call next</button>
      <p>Next up: {nextUp}</p>
      <p>Waiting: {waiting}</p>
      <ul>{rows}</ul>
    </main>
  );
};

export default App;
`,
    senior: `import React, { useReducer } from 'react';

const reducer = (state, action) => {
  switch (action.type) {
    case 'enqueue': {
      const issued = state.issued + 1;
      return { issued, tickets: state.tickets.concat(\`Ticket \${issued}\`) };
    }
    case 'dequeue': {
      // Rest destructuring is the immutable shift: everything after the head.
      const [, ...tickets] = state.tickets;
      return { ...state, tickets };
    }
    default:
      return state;
  }
};

const App = () => {
  const [{ tickets }, dispatch] = useReducer(reducer, { tickets: [], issued: 0 });
  const [nextUp = 'none'] = tickets;

  return (
    <main>
      <button onClick={() => dispatch({ type: 'enqueue' })}>Take a ticket</button>
      <button disabled={tickets.length === 0} onClick={() => dispatch({ type: 'dequeue' })}>Call next</button>
      <p>{\`Next up: \${nextUp}\`}</p>
      <p>{\`Waiting: \${tickets.length}\`}</p>
      <ul>
        {tickets.map(ticket => (
          <li key={ticket}>{ticket}</li>
        ))}
      </ul>
    </main>
  );
};

export default App;
`,
  },
  "react-usepagination-hook": {
    solution: `import React, { useState } from 'react';

const cities = ['Athens', 'Bergen', 'Cork', 'Dresden', 'Evora', 'Faro', 'Ghent'];

const usePagination = (items, pageSize) => {
  const [index, setIndex] = useState(0);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const start = index * pageSize;
  const pageItems = items.slice(start, start + pageSize);
  const next = () => setIndex(current => Math.min(current + 1, pageCount - 1));
  const previous = () => setIndex(current => Math.max(current - 1, 0));
  return { pageItems, page: index + 1, pageCount, next, previous };
};

const App = () => {
  const { pageItems, page, pageCount, next, previous } = usePagination(cities, 3);

  return (
    <main>
      <ul>
        {pageItems.map(city => (
          <li key={city}>{city}</li>
        ))}
      </ul>
      <p>Page {page} of {pageCount}</p>
      <button disabled={page === 1} onClick={previous}>Previous</button>
      <button disabled={page === pageCount} onClick={next}>Next</button>
    </main>
  );
};

export default App;
`,
    junior: `import React, { useState } from 'react';

const cities = ['Athens', 'Bergen', 'Cork', 'Dresden', 'Evora', 'Faro', 'Ghent'];

function usePagination(items, pageSize) {
  const [page, setPage] = useState(1);
  const pageCount = Math.ceil(items.length / pageSize);
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const pageItems = items.slice(start, end);

  function next() {
    if (page < pageCount) {
      setPage(page + 1);
    }
  }

  function previous() {
    if (page > 1) {
      setPage(page - 1);
    }
  }

  return { pageItems: pageItems, page: page, pageCount: pageCount, next: next, previous: previous };
}

const App = () => {
  const pagination = usePagination(cities, 3);
  const isFirst = pagination.page === 1;
  const isLast = pagination.page === pagination.pageCount;

  const rows = [];
  for (const city of pagination.pageItems) {
    rows.push(<li key={city}>{city}</li>);
  }

  return (
    <main>
      <ul>{rows}</ul>
      <p>Page {pagination.page} of {pagination.pageCount}</p>
      <button disabled={isFirst} onClick={pagination.previous}>Previous</button>
      <button disabled={isLast} onClick={pagination.next}>Next</button>
    </main>
  );
};

export default App;
`,
    senior: `import React, { useState } from 'react';

const cities = ['Athens', 'Bergen', 'Cork', 'Dresden', 'Evora', 'Faro', 'Ghent'];

const usePagination = (items, pageSize) => {
  const [index, setIndex] = useState(0);
  const lastIndex = Math.max(0, Math.ceil(items.length / pageSize) - 1);
  // One clamped step serves both directions and can never leave the valid range.
  const step = delta => setIndex(current => Math.min(Math.max(current + delta, 0), lastIndex));
  return {
    pageItems: items.slice(index * pageSize, (index + 1) * pageSize),
    page: index + 1,
    pageCount: lastIndex + 1,
    hasPrevious: index > 0,
    hasNext: index < lastIndex,
    next: () => step(1),
    previous: () => step(-1),
  };
};

const App = () => {
  const { pageItems, page, pageCount, hasPrevious, hasNext, next, previous } = usePagination(cities, 3);

  return (
    <main>
      <ul>
        {pageItems.map(city => (
          <li key={city}>{city}</li>
        ))}
      </ul>
      <p>{\`Page \${page} of \${pageCount}\`}</p>
      <button disabled={!hasPrevious} onClick={previous}>Previous</button>
      <button disabled={!hasNext} onClick={next}>Next</button>
    </main>
  );
};

export default App;
`,
  },
  "react-reorder-with-stable-keys": {
    solution: `import React, { useState } from 'react';

const initialSteps = [
  { id: 'a', label: 'Plan' },
  { id: 'b', label: 'Build' },
  { id: 'c', label: 'Test' },
  { id: 'd', label: 'Ship' },
];

const App = () => {
  const [steps, setSteps] = useState(initialSteps);

  const move = (index, direction) => {
    setSteps(current => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      const [step] = next.splice(index, 1);
      next.splice(target, 0, step);
      return next;
    });
  };

  return (
    <main>
      <ol>
        {steps.map((step, index) => (
          <li key={step.id}>
            <span>{step.label}</span>
            <button disabled={index === 0} onClick={() => move(index, -1)}>Up</button>
            <button disabled={index === steps.length - 1} onClick={() => move(index, 1)}>Down</button>
          </li>
        ))}
      </ol>
    </main>
  );
};

export default App;
`,
    junior: `import React, { useState } from 'react';

const initialSteps = [
  { id: 'a', label: 'Plan' },
  { id: 'b', label: 'Build' },
  { id: 'c', label: 'Test' },
  { id: 'd', label: 'Ship' },
];

const App = () => {
  const [steps, setSteps] = useState(initialSteps);

  function handleMoveUp(index) {
    if (index === 0) {
      return;
    }
    const copy = steps.slice();
    const removed = copy.splice(index, 1);
    const step = removed[0];
    copy.splice(index - 1, 0, step);
    setSteps(copy);
  }

  function handleMoveDown(index) {
    if (index === steps.length - 1) {
      return;
    }
    const copy = steps.slice();
    const removed = copy.splice(index, 1);
    const step = removed[0];
    copy.splice(index + 1, 0, step);
    setSteps(copy);
  }

  const rows = [];
  for (let index = 0; index < steps.length; index++) {
    const step = steps[index];
    const isFirst = index === 0;
    const isLast = index === steps.length - 1;
    rows.push(
      <li key={step.id}>
        <span>{step.label}</span>
        <button disabled={isFirst} onClick={() => handleMoveUp(index)}>Up</button>
        <button disabled={isLast} onClick={() => handleMoveDown(index)}>Down</button>
      </li>,
    );
  }

  return (
    <main>
      <ol>{rows}</ol>
    </main>
  );
};

export default App;
`,
    senior: `import React, { useState } from 'react';

const initialSteps = [
  { id: 'a', label: 'Plan' },
  { id: 'b', label: 'Build' },
  { id: 'c', label: 'Test' },
  { id: 'd', label: 'Ship' },
];

// toSpliced is the copying splice: take the item out at one index, put it back at the other.
const moveItem = (list, from, to) =>
  to < 0 || to >= list.length ? list : list.toSpliced(from, 1).toSpliced(to, 0, list[from]);

const Step = ({ step, isFirst, isLast, onMove }) => (
  <li>
    <span>{step.label}</span>
    <button disabled={isFirst} onClick={() => onMove(-1)}>Up</button>
    <button disabled={isLast} onClick={() => onMove(1)}>Down</button>
  </li>
);

const App = () => {
  const [steps, setSteps] = useState(initialSteps);
  const move = (index, direction) => setSteps(current => moveItem(current, index, index + direction));

  return (
    <main>
      <ol>
        {steps.map((step, index) => (
          <Step
            key={step.id}
            step={step}
            isFirst={index === 0}
            isLast={index === steps.length - 1}
            onMove={direction => move(index, direction)}
          />
        ))}
      </ol>
    </main>
  );
};

export default App;
`,
  },
};
