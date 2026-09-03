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
  },
};
