// Server-only reference solutions and hidden tests for lib/coding/tasks/react-loops.ts.
// Never import from client code.

import type { CodingSolution } from '../types';

export const REACT_LOOP_SOLUTIONS: Record<string, CodingSolution> = {
  "react-heading-and-intro": {
    solution: `import React from 'react';

const title = 'Deep End';
const intro = 'Practise React one list at a time.';

const App = ({ heading = title, description = intro } = {}) => (
  <main>
    <h1>{heading}</h1>
    <p>{description}</p>
  </main>
);

export default App;
`,
    junior: `import React from 'react';

const title = 'Deep End';
const intro = 'Practise React one list at a time.';

const App = ({ heading = title, description = intro } = {}) => {
  const headingNode = <h1>{heading}</h1>;
  const paragraphNode = <p>{description}</p>;

  return (
    <main>
      {headingNode}
      {paragraphNode}
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

const App = ({ heading = title, description = intro } = {}) => (
  <main>
    <Intro heading={heading} text={description} />
  </main>
);

export default App;
`,
    hiddenSuite: "\ntest('renders changed plain strings exactly, including empty and markup-like values', () => {\n const values=['',' ','  Deep  End  ','\u017dralok \ud83e\udd88','e\\u0301','<em>literal</em>','&amp;','line\\nbreak','x'.repeat(2000)];\n const view=render(<App heading=\"first\" description=\"initial\"/>);\n for(let i=0;i<values.length;i++){\n  const heading=values[i],description=values[values.length-1-i];\n  view.rerender(<App heading={heading} description={description}/>);\n  expect(view.container.querySelectorAll('h1')).toHaveLength(1);\n  expect(view.container.querySelectorAll('p')).toHaveLength(1);\n  expect(view.container.querySelector('h1').textContent).toBe(heading);\n  expect(view.container.querySelector('p').textContent).toBe(description);\n }\n});\ntest('keeps two app instances independent', () => {\n const first=render(<App heading=\"One\" description=\"First\"/>);\n const second=render(<App heading=\"Two\" description=\"Second\"/>);\n first.rerender(<App heading=\"Updated\" description=\"Changed\"/>);\n expect(second.container.querySelector('h1').textContent).toBe('Two');\n expect(second.container.querySelector('p').textContent).toBe('Second');\n expect(first.container.querySelector('h1').textContent).toBe('Updated');\n});\ntest('defaults each omitted prop independently', () => {\n const view=render(<App heading=\"Custom\"/>);\n expect(view.container.querySelector('p').textContent).toBe('Practise React one list at a time.');\n view.rerender(<App description=\"Another\"/>);\n expect(view.container.querySelector('h1').textContent).toBe('Deep End');\n expect(view.container.querySelector('p').textContent).toBe('Another');\n});\n",
  },
  "react-greeting-component": {
    solution: `import React from 'react';

const names = ['Ana', 'Bo', 'Cyril'];

export const Greeting = ({ name }) => <p>Hello, {name}</p>;

const App = ({ people = names } = {}) => (
  <main>
    {people.map(name => (
      <Greeting key={name} name={name} />
    ))}
  </main>
);

export default App;
`,
    junior: `import React from 'react';

const names = ['Ana', 'Bo', 'Cyril'];

export function Greeting(props) {
  const message = 'Hello, ' + props.name;
  return <p>{message}</p>;
}

const App = ({ people = names } = {}) => {
  const greetings = [];
  for (const name of people) {
    greetings.push(<Greeting key={name} name={name} />);
  }

  return <main>{greetings}</main>;
};

export default App;
`,
    senior: `import React from 'react';

const names = ['Ana', 'Bo', 'Cyril'];

export const Greeting = ({ name }) => <p>{\`Hello, \${name}\`}</p>;

// A list component may return an array directly; it needs no wrapper of its own.
const Greetings = ({ people }) => people.map(name => <Greeting key={name} name={name} />);

const App = ({ people = names } = {}) => (
  <main>
    <Greetings people={people} />
  </main>
);

export default App;
`,
    hiddenSuite: "\ntest('named Greeting accepts exact names and changes with its prop', () => {\n const view=render(<Greeting name=\"Initial\"/>);\n for(const name of ['',' ','  Ana  ','\u017dofie \ud83e\udd88','e\\u0301','<b>Ada</b>','&amp;','line\\nbreak','x'.repeat(2000)]){\n  view.rerender(<Greeting name={name}/>);\n  expect(view.container.querySelectorAll('p')).toHaveLength(1);\n  expect(view.container.querySelector('p').textContent).toBe('Hello, '+name);\n }\n});\ntest('renders arbitrary read-only lists in order through changes and emptiness', () => {\n const values=Object.freeze(['Zoe','  Ana  ','','<i>Bo</i>','\u017dofie']);\n const view=render(<App people={values}/>);\n const messages=()=>[...view.container.querySelectorAll('p')].map(p=>p.textContent);\n expect(messages()).toEqual(values.map(name=>'Hello, '+name));\n view.rerender(<App people={Object.freeze([...values].reverse())}/>);\n expect(messages()).toEqual([...values].reverse().map(name=>'Hello, '+name));\n view.rerender(<App people={Object.freeze([])}/>);expect(messages()).toEqual([]);\n view.rerender(<App people={Object.freeze(['New'])}/>);expect(messages()).toEqual(['Hello, New']);\n expect([...values]).toEqual(['Zoe','  Ana  ','','<i>Bo</i>','\u017dofie']);\n});\ntest('handles a hundred unique names and independent app instances', () => {\n const names=Object.freeze(Array.from({length:100},(_,i)=>'Person '+(99-i)));\n const first=render(<App people={names}/>),second=render(<App people={Object.freeze(['Other'])}/>);\n expect([...first.container.querySelectorAll('p')].map(p=>p.textContent)).toEqual(names.map(name=>'Hello, '+name));\n first.rerender(<App people={Object.freeze([])}/>);\n expect(second.container.querySelector('p').textContent).toBe('Hello, Other');\n});\n",
  },
  "react-price-component": {
    solution: `import React from 'react';

const items = [
  { id: 1, name: 'Coffee', amount: 3.5, currency: 'EUR' },
  { id: 2, name: 'Notebook', amount: 120, currency: 'CZK' },
  { id: 3, name: 'Sticker', amount: 0.99, currency: 'USD' },
];

export const Price = ({ amount, currency }) => <span>{amount.toFixed(2)} {currency}</span>;

const App = ({ products = items } = {}) => (
  <main>
    <ul>
      {products.map(item => (
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

export function Price(props) {
  const formatted = props.amount.toFixed(2);
  const text = formatted + ' ' + props.currency;
  return <span>{text}</span>;
}

const App = ({ products = items } = {}) => {
  const rows = [];
  for (const item of products) {
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

export const Price = ({ amount, currency }) => <span>{formatPrice(amount, currency)}</span>;

const App = ({ products = items } = {}) => (
  <main>
    <ul>
      {products.map(({ id, name, ...price }) => (
        <li key={id}>
          {name} <Price {...price} />
        </li>
      ))}
    </ul>
  </main>
);

export default App;
`,
    hiddenSuite: "\ntest('named Price follows Number.toFixed for changed amounts and currencies', () => {\n const view=render(<Price amount={0} currency=\"EUR\"/>);\n const amounts=[-1000000,-12.345,-0.005,-0,0,0.004,0.005,1.005,2.675,9.999,1234.5,1000000];\n for(let i=0;i<amounts.length;i++){\n  const amount=amounts[i],currency=i%2?'JPY':'QQQ';\n  view.rerender(<Price amount={amount} currency={currency}/>);\n  expect(view.container.querySelectorAll('span')).toHaveLength(1);\n  expect(view.container.querySelector('span').textContent).toBe(amount.toFixed(2)+' '+currency);\n }\n});\ntest('renders read-only products exactly in order through replacement and emptiness', () => {\n const products=Object.freeze([\n  Object.freeze({id:99,name:'  Caf\u00e9 \ud83e\udd88  ',amount:2.675,currency:'GBP'}),\n  Object.freeze({id:1,name:'<b>literal</b>',amount:0,currency:'JPY'}),\n  Object.freeze({id:42,name:'',amount:-9.999,currency:'USD'}),\n ]);\n const view=render(<App products={products}/>);\n const check=(expected)=>{\n  expect(view.container.querySelectorAll('ul')).toHaveLength(1);\n  const rows=[...view.container.querySelectorAll('ul li')];expect(rows).toHaveLength(expected.length);\n  rows.forEach((row,i)=>{\n   expect(row.textContent).toContain(expected[i].name);\n   expect(row.querySelector('span').textContent).toBe(expected[i].amount.toFixed(2)+' '+expected[i].currency);\n  });\n };\n check(products);const reversed=Object.freeze([...products].reverse());\n view.rerender(<App products={reversed}/>);check(reversed);\n view.rerender(<App products={Object.freeze([])}/>);check([]);\n view.rerender(<App products={products}/>);check(products);\n expect(products[0].amount).toBe(2.675);expect(products[1].name).toBe('<b>literal</b>');\n});\ntest('supports a hundred products and independent mounted lists', () => {\n const products=Object.freeze(Array.from({length:100},(_,i)=>Object.freeze({id:100-i,name:'Product '+i,amount:i-50.125,currency:i%2?'EUR':'CZK'})));\n const first=render(<App products={products}/>),second=render(<App products={Object.freeze([])}/>);\n const rows=[...first.container.querySelectorAll('ul li')];expect(rows).toHaveLength(100);\n rows.forEach((row,i)=>{\n  expect(row.textContent).toContain(products[i].name);\n  expect(row.querySelector('span').textContent).toBe(products[i].amount.toFixed(2)+' '+products[i].currency);\n });\n first.rerender(<App products={Object.freeze([])}/>);\n expect(second.container.querySelectorAll('li')).toHaveLength(0);\n});\n",
  },
  "react-keyed-book-list": {
    solution: `import React from 'react';

const initialBooks = [
  { id: 'b1', title: 'Dune', author: 'Frank Herbert' },
  { id: 'b2', title: 'Emma', author: 'Jane Austen' },
  { id: 'b3', title: 'Ubik', author: 'Philip K. Dick' },
];

const App = ({ books = initialBooks } = {}) => (
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

const initialBooks = [
  { id: 'b1', title: 'Dune', author: 'Frank Herbert' },
  { id: 'b2', title: 'Emma', author: 'Jane Austen' },
  { id: 'b3', title: 'Ubik', author: 'Philip K. Dick' },
];

const App = ({ books = initialBooks } = {}) => {
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

const initialBooks = [
  { id: 'b1', title: 'Dune', author: 'Frank Herbert' },
  { id: 'b2', title: 'Emma', author: 'Jane Austen' },
  { id: 'b3', title: 'Ubik', author: 'Philip K. Dick' },
];

const Book = ({ title, author }) => <li>{\`\${title} by \${author}\`}</li>;

const App = ({ books = initialBooks } = {}) => (
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
    hiddenSuite: "\ntest('renders exact arbitrary book text, counts and empty replacements',()=>{\n const books=Object.freeze([Object.freeze({id:'z',title:'  <b>Book</b>  ',author:'\u017dofie \ud83e\udd88'}),Object.freeze({id:'a',title:'',author:'  A  '})]);\n const view=render(<App books={books}/>);\n const check=values=>{expect(view.container.querySelector('p').textContent).toBe(values.length+' books');expect([...view.container.querySelectorAll('ul li')].map(li=>li.textContent)).toEqual(values.map(book=>book.title+' by '+book.author));};\n check(books);view.rerender(<App books={Object.freeze([])}/>);check([]);\n view.rerender(<App books={Object.freeze([books[1]])}/>);check([books[1]]);\n expect(books[0].title).toBe('  <b>Book</b>  ');\n});\ntest('keeps each existing row attached to its id through reorder and renamed data',()=>{\n const initial=[{id:'one',title:'First',author:'A'},{id:'two',title:'Second',author:'B'},{id:'three',title:'Third',author:'C'}];\n const view=render(<App books={initial}/>),nodes=[...view.container.querySelectorAll('li')];\n view.rerender(<App books={[{...initial[2],title:'Renamed'},initial[0],initial[1]]}/>);\n let current=[...view.container.querySelectorAll('li')];\n expect(current[0]).toBe(nodes[2]);expect(current[1]).toBe(nodes[0]);expect(current[2]).toBe(nodes[1]);\n expect(current[0].textContent).toBe('Renamed by C');\n view.rerender(<App books={[initial[1],{id:'new',title:'New',author:'D'},initial[2]]}/>);\n current=[...view.container.querySelectorAll('li')];expect(current[0]).toBe(nodes[1]);expect(current[2]).toBe(nodes[2]);\n});\ntest('handles a hundred read-only books and independent mounts',()=>{\n const books=Object.freeze(Array.from({length:100},(_,i)=>Object.freeze({id:'b'+(100-i),title:i===0?'x'.repeat(2000):'Book '+i,author:i===99?'y'.repeat(2000):'Author '+i})));\n const first=render(<App books={books}/>),second=render(<App books={[]}/>);\n expect([...first.container.querySelectorAll('li')].map(li=>li.textContent)).toEqual(books.map(book=>book.title+' by '+book.author));\n first.rerender(<App books={[]}/>);expect(second.container.querySelector('p').textContent).toBe('0 books');\n});\n",
  },
  "react-in-stock-list": {
    solution: `import React from 'react';

const initialProducts = [
  { id: 1, name: 'Fins', inStock: true },
  { id: 2, name: 'Snorkel', inStock: false },
  { id: 3, name: 'Mask', inStock: true },
  { id: 4, name: 'Wetsuit', inStock: false },
];

const App = ({ products = initialProducts } = {}) => {
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

const initialProducts = [
  { id: 1, name: 'Fins', inStock: true },
  { id: 2, name: 'Snorkel', inStock: false },
  { id: 3, name: 'Mask', inStock: true },
  { id: 4, name: 'Wetsuit', inStock: false },
];

const App = ({ products = initialProducts } = {}) => {
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

const initialProducts = [
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

const App = ({ products = initialProducts } = {}) => {
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
    hiddenSuite: "\ntest('filters changed read-only products and reports exact counts, including empty',()=>{\n const products=Object.freeze([Object.freeze({id:99,name:'<b>Literal</b>',inStock:false}),Object.freeze({id:7,name:'  Caf\u00e9 \ud83e\udd88  ',inStock:true}),Object.freeze({id:2,name:'',inStock:true})]);\n const view=render(<App products={products}/>);\n const check=values=>{const available=values.filter(row=>row.inStock);expect(view.container.querySelector('p').textContent).toBe(available.length+' of '+values.length+' in stock');expect([...view.container.querySelectorAll('ul li')].map(li=>li.textContent)).toEqual(available.map(row=>row.name));};\n check(products);const changed=Object.freeze(products.map(row=>Object.freeze({...row,inStock:!row.inStock})));view.rerender(<App products={changed}/>);check(changed);\n view.rerender(<App products={[]}/>);check([]);expect(products[0].inStock).toBe(false);\n});\ntest('keeps surviving rows attached to product ids across reorder, rename and filtering',()=>{\n const products=[{id:1,name:'Same',inStock:true},{id:2,name:'Same',inStock:true},{id:3,name:'Third',inStock:false}];\n const view=render(<App products={products}/>),nodes=[...view.container.querySelectorAll('li')];\n view.rerender(<App products={[{...products[1],name:'Renamed'},products[0],{...products[2],inStock:true}]}/>);\n let current=[...view.container.querySelectorAll('li')];expect(current[0]).toBe(nodes[1]);expect(current[1]).toBe(nodes[0]);expect(current[0].textContent).toBe('Renamed');\n view.rerender(<App products={[{...products[0],inStock:false},products[2],products[1]]}/>);\n current=[...view.container.querySelectorAll('li')];expect(current).toHaveLength(1);expect(current[0]).toBe(nodes[1]);\n view.rerender(<App products={[{...products[2],inStock:true},products[1]]}/>);\n expect([...view.container.querySelectorAll('li')].map(li=>li.textContent)).toEqual(['Third','Same']);\n});\ntest('handles all and no stock, a hundred products and independent mounts',()=>{\n const products=Object.freeze(Array.from({length:100},(_,i)=>Object.freeze({id:100-i,name:i===0?'x'.repeat(2000):'Product '+i,inStock:true})));\n const first=render(<App products={products}/>),second=render(<App products={[]}/>);\n expect(first.container.querySelector('p').textContent).toBe('100 of 100 in stock');expect([...first.container.querySelectorAll('li')].map(li=>li.textContent)).toEqual(products.map(row=>row.name));\n first.rerender(<App products={products.map(row=>({...row,inStock:false}))}/>);expect(first.container.querySelectorAll('li')).toHaveLength(0);expect(first.container.querySelector('p').textContent).toBe('0 of 100 in stock');expect(second.container.querySelector('p').textContent).toBe('0 of 0 in stock');\n});\n",
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
      <input aria-label="Guest name" value={name} onChange={event => setName(event.target.value)} />
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
      <input aria-label="Guest name" value={name} onChange={event => setName(event.target.value)} />
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
      <input aria-label="Guest name" value={name} onChange={event => setName(event.target.value)} />
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
    hiddenSuite: "\ntest('labels the input, trims names and ignores whitespace without clearing it',()=>{\n const view=render(<App/>),input=screen.getByRole('textbox',{name:'Guest name'});\n const names=()=>[...view.container.querySelectorAll('li')].map(li=>{const copy=li.cloneNode(true);copy.querySelectorAll('button').forEach(b=>b.remove());return copy.textContent.trim();});\n for(const value of ['',' ','\\t\\u00a0']){fireEvent.change(input,{target:{value}});fireEvent.click(button(view.container,'Add'));expect(names()).toEqual(['Ana','Bo']);expect(input.value).toBe(value);}\n fireEvent.change(input,{target:{value:'\\t<em>\u017dofie \ud83e\udd88</em>\\u00a0'}});fireEvent.click(button(view.container,'Add'));expect(names()).toEqual(['Ana','Bo','<em>\u017dofie \ud83e\udd88</em>']);expect(input.value).toBe('');\n});\ntest('removes only the selected duplicate and supports deleting then adding to an empty list',()=>{\n const view=render(<App/>),input=view.container.querySelector('input');\n const names=()=>[...view.container.querySelectorAll('li')].map(li=>{const copy=li.cloneNode(true);copy.querySelectorAll('button').forEach(b=>b.remove());return copy.textContent.trim();});\n for(const value of ['Ana',' Ana ','Bo']){fireEvent.change(input,{target:{value}});fireEvent.click(button(view.container,'Add'));}\n expect(names()).toEqual(['Ana','Bo','Ana','Ana','Bo']);\n fireEvent.click(view.container.querySelectorAll('li')[2].querySelector('button'));expect(names()).toEqual(['Ana','Bo','Ana','Bo']);\n while(view.container.querySelector('li'))fireEvent.click(view.container.querySelector('li button'));\n expect(names()).toEqual([]);fireEvent.change(input,{target:{value:'New'}});fireEvent.click(button(view.container,'Add'));expect(names()).toEqual(['New']);\n});\ntest('matches an ordered add/remove model and keeps mounted apps independent',()=>{\n const first=render(<App/>),second=render(<App/>),input=first.container.querySelector('input');let expected=['Ana','Bo'];\n const names=root=>[...root.querySelectorAll('li')].map(li=>{const copy=li.cloneNode(true);copy.querySelectorAll('button').forEach(b=>b.remove());return copy.textContent.trim();});\n for(let step=0;step<24;step++){\n  if(step%3!==2||expected.length===0){const value=step%4===0?' Ana ':'Guest '+step;fireEvent.change(input,{target:{value}});fireEvent.click(button(first.container,'Add'));expected=expected.concat(value.trim());expect(input.value).toBe('');}\n  else{const index=(step*7)%expected.length;fireEvent.click(first.container.querySelectorAll('li')[index].querySelector('button'));expected=expected.filter((_,i)=>i!==index);}\n  expect(names(first.container)).toEqual(expected);expect(names(second.container)).toEqual(['Ana','Bo']);\n }\n});\n",
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
    hiddenSuite: "\ntest('inserts repeatedly at first, middle and last positions using the current length',()=>{\n const view=render(<App/>);fireEvent.click(control(view.container.querySelectorAll('li')[0],'Insert after'));\n expect(stopNames(view.container)).toEqual(['Harbour','Stop 4','Reef','Lighthouse']);\n fireEvent.click(control(view.container.querySelectorAll('li')[3],'Insert after'));expect(stopNames(view.container)).toEqual(['Harbour','Stop 4','Reef','Lighthouse','Stop 5']);\n fireEvent.click(control(view.container.querySelectorAll('li')[1],'Insert after'));expect(stopNames(view.container)).toEqual(['Harbour','Stop 4','Stop 6','Reef','Lighthouse','Stop 5']);\n});\ntest('matches mixed insertion/move steps and preserves surviving row identity',()=>{\n const view=render(<App/>);let expected=['Harbour','Reef','Lighthouse'];\n for(let step=0;step<24;step++){\n  const prior=new Map([...view.container.querySelectorAll('li')].map(li=>[li.querySelector('span').textContent,li]));const index=(step*7+1)%expected.length;const row=view.container.querySelectorAll('li')[index];\n  if(step%4===0){fireEvent.click(control(row,'Insert after'));expected=[...expected.slice(0,index+1),'Stop '+(expected.length+1),...expected.slice(index+1)];}\n  else{const delta=step%4===2?1:-1;fireEvent.click(control(row,delta===1?'Down':'Up'));const target=index+delta;if(target>=0&&target<expected.length){const next=[...expected];[next[index],next[target]]=[next[target],next[index]];expected=next;}}\n  expect(stopNames(view.container)).toEqual(expected);\n  for(const li of view.container.querySelectorAll('li')){const name=li.querySelector('span').textContent;if(prior.has(name))expect(li).toBe(prior.get(name));}\n }\n});\ntest('ignores repeated edge moves and keeps independent mounts unchanged',()=>{\n const first=render(<App/>),second=render(<App/>);\n for(let i=0;i<6;i++){fireEvent.click(control(first.container.querySelectorAll('li')[0],'Up'));fireEvent.click(control(first.container.querySelectorAll('li')[2],'Down'));}\n expect(stopNames(first.container)).toEqual(['Harbour','Reef','Lighthouse']);\n fireEvent.click(control(first.container.querySelectorAll('li')[0],'Insert after'));fireEvent.click(control(first.container.querySelectorAll('li')[0],'Down'));\n expect(stopNames(second.container)).toEqual(['Harbour','Reef','Lighthouse']);\n});\n",
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
    hiddenSuite: "\ntest('can toggle the same task repeatedly in both directions',()=>{\n const view=render(<App/>);\n for(let i=0;i<6;i++){fireEvent.click(boxes(view.container)[0]);expect(boxes(view.container).map(b=>b.checked)).toEqual([i%2===0,true,false]);expect(view.container.querySelector('p').textContent).toBe((i%2===0?2:1)+' of 3 done');}\n});\ntest('matches a repeated toggle model while preserving labels, order and row identity',()=>{\n const view=render(<App/>),nodes=[...view.container.querySelectorAll('li')];let expected=[false,true,false];\n for(let step=0;step<36;step++){\n  const index=(step*7+Math.floor(step/3))%3;fireEvent.click(boxes(view.container)[index]);expected=expected.map((value,i)=>i===index?!value:value);\n  expect(boxes(view.container).map(b=>b.checked)).toEqual(expected);expect(view.container.querySelector('p').textContent).toBe(expected.filter(Boolean).length+' of 3 done');\n  const rows=[...view.container.querySelectorAll('li')];expect(rows.map(li=>li.textContent.trim())).toEqual(['Write tests','Fix the build','Ship it']);rows.forEach((row,i)=>expect(row).toBe(nodes[i]));\n }\n});\ntest('keeps two mounted apps and a fresh mount independent',()=>{\n const first=render(<App/>),second=render(<App/>);fireEvent.click(boxes(first.container)[2]);fireEvent.click(boxes(first.container)[1]);\n expect(boxes(first.container).map(b=>b.checked)).toEqual([false,false,true]);expect(boxes(second.container).map(b=>b.checked)).toEqual([false,true,false]);\n first.unmount();const third=render(<App/>);expect(boxes(third.container).map(b=>b.checked)).toEqual([false,true,false]);\n});\n",
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
        <input aria-label="Todo text" value={text} onChange={event => setText(event.target.value)} />
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
        <input aria-label="Todo text" value={text} onChange={event => setText(event.target.value)} />
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
      <input aria-label="Todo text" value={text} onChange={event => setText(event.target.value)} />
      <button>Add</button>
    </form>
  );
};

const App = () => {
  const [todos, setTodos] = useState([]);
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
    hiddenSuite: "\ntest('accepts an accessible form, exact trimmed duplicates and literal text',()=>{\n const view=render(<App/>),input=screen.getByRole('textbox',{name:'Todo text'});expect(input.form).toBe(view.container.querySelector('form'));\n for(const text of ['',' ','\\t\\u00a0']){add(view.container,text);expect(view.container.querySelectorAll('li')).toHaveLength(0);expect(input.value).toBe(text);}\n for(const text of [' same ','same','\\t<em>\u017dofie \ud83e\udd88</em>\\u00a0'])add(view.container,text);\n expect([...view.container.querySelectorAll('li')].map(li=>li.textContent)).toEqual(['<em>\u017dofie \ud83e\udd88</em>','same','same']);expect(input.value).toBe('');\n});\ntest('follows insertion order rather than sorting and preserves existing row nodes',()=>{\n const view=render(<App/>);let expected=[];let nodes=[];\n for(const text of ['zzz','aaa','mmm','ZZZ','aaa','x'.repeat(2000)]){\n  add(view.container,text);expected=[text,...expected];const next=[...view.container.querySelectorAll('li')];\n  expect(next.map(li=>li.textContent)).toEqual(expected);nodes.forEach((node,i)=>expect(next[i+1]).toBe(node));nodes=next;\n }\n});\ntest('matches repeated submissions and keeps simultaneous and fresh mounts independent',()=>{\n const first=render(<App/>),second=render(<App/>);let expected=[];\n for(let step=0;step<24;step++){\n  const raw=step%5===0?'   ':step%3===0?' repeated ':'Todo '+step;add(first.container,raw);if(raw.trim())expected=[raw.trim(),...expected];\n  expect([...first.container.querySelectorAll('li')].map(li=>li.textContent)).toEqual(expected);expect(second.container.querySelectorAll('li')).toHaveLength(0);\n }\n first.unmount();const third=render(<App/>);expect(third.container.querySelectorAll('li')).toHaveLength(0);\n});\n",
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

export function summarizeOrders(query) {
  const needle = query.trim().toLowerCase();
  const matching = orders.filter(order => order.name.toLowerCase().includes(needle));
  const total = matching.reduce((sum, order) => sum + order.price, 0);
  return { matching, total };
}

const App = ({ calculate = summarizeOrders } = {}) => {
  const [query, setQuery] = useState('');
  const [nudges, setNudges] = useState(0);

  const { matching, total } = useMemo(() => calculate(query), [query, calculate]);

  return (
    <main>
      <input aria-label="Search orders" value={query} onChange={event => setQuery(event.target.value)} />
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

export function summarizeOrders(query) {
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
}

const App = ({ calculate = summarizeOrders } = {}) => {
  const [query, setQuery] = useState('');
  const [nudges, setNudges] = useState(0);

  const result = useMemo(() => calculate(query), [query, calculate]);

  function handleNudge() {
    setNudges(nudges + 1);
  }

  const rows = [];
  for (const order of result.matching) {
    rows.push(<li key={order.id}>{order.name}</li>);
  }

  return (
    <main>
      <input aria-label="Search orders" value={query} onChange={event => setQuery(event.target.value)} />
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

export function summarizeOrders(query) {
  const matching = search(orders, query);
  return { matching, total: sum(matching) };
}

const App = ({ calculate = summarizeOrders } = {}) => {
  const [query, setQuery] = useState('');
  const [nudges, setNudges] = useState(0);

  const { matching, total } = useMemo(() => calculate(query), [query, calculate]);

  return (
    <main>
      <input aria-label="Search orders" value={query} onChange={event => setQuery(event.target.value)} />
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
    hiddenSuite: "\ntest('summarizes fixed orders with exact trimmed case-insensitive substring matching',()=>{\n const orders=[{id:1,name:'Mask',price:40},{id:2,name:'Fins',price:90},{id:3,name:'Wetsuit',price:250},{id:4,name:'Snorkel',price:25},{id:5,name:'Dive light',price:120},{id:6,name:'Dive knife',price:60}];\n const view=render(<App/>);expect(screen.getByRole('textbox',{name:'Search orders'})).toBe(view.container.querySelector('input'));\n for(const query of ['',' ','DIVE','\\tDive\\u00a0','mask','i','knife','zz','x'.repeat(2000)]){\n  const matching=orders.filter(row=>row.name.toLowerCase().includes(query.trim().toLowerCase()));const result=summarizeOrders(query);\n  expect(Array.from(result.matching,row=>row.id)).toEqual(matching.map(row=>row.id));expect(result.total).toBe(matching.reduce((n,row)=>n+row.price,0));\n  fireEvent.change(view.container.querySelector('input'),{target:{value:query}});expect([...view.container.querySelectorAll('li')].map(li=>li.textContent)).toEqual(matching.map(row=>row.name));\n  expect([...view.container.querySelectorAll('p')].map(p=>p.textContent)).toContain('Total: '+result.total);\n }\n});\ntest('skips unchanged work on nudges and parent renders, but follows query and calculator identity',()=>{\n const calls=[],otherCalls=[];\n const calculate=query=>{calls.push(query);return {matching:[{id:9,name:'Custom '+query,price:7}],total:7};};\n const other=query=>{otherCalls.push(query);return Object.freeze({matching:Object.freeze([Object.freeze({id:8,name:'Other '+query,price:11})]),total:11});};\n const view=render(<App calculate={calculate}/>);expect(calls).toEqual(['']);\n for(let i=0;i<4;i++)fireEvent.click(button(view.container,'Nudge'));view.rerender(<App calculate={calculate}/>);expect(calls).toEqual(['']);\n fireEvent.change(view.container.querySelector('input'),{target:{value:'dive'}});expect(calls).toEqual(['','dive']);expect(view.container.querySelector('li').textContent).toBe('Custom dive');\n view.rerender(<App calculate={other}/>);expect(otherCalls).toEqual(['dive']);expect(view.container.querySelector('li').textContent).toBe('Other dive');expect(view.container.textContent).toContain('Total: 11');\n fireEvent.click(button(view.container,'Nudge'));view.rerender(<App calculate={other}/>);expect(otherCalls).toEqual(['dive']);expect(view.container.textContent).toContain('Nudges: 5');\n view.rerender(<App/>);expect([...view.container.querySelectorAll('li')].map(li=>li.textContent)).toEqual(['Dive light','Dive knife']);expect(view.container.textContent).toContain('Total: 180');\n});\ntest('owns separate query,nudge and memo lifetimes for mounted apps',()=>{\n const calls=[];const calculate=query=>{calls.push(query);return {matching:[],total:0};};\n const first=render(<App calculate={calculate}/>),second=render(<App calculate={calculate}/>);expect(calls).toEqual(['','']);\n fireEvent.change(first.container.querySelector('input'),{target:{value:'first'}});fireEvent.click(button(first.container,'Nudge'));expect(calls).toEqual(['','','first']);expect(second.container.querySelector('input').value).toBe('');expect(second.container.textContent).toContain('Nudges: 0');\n second.rerender(<App calculate={calculate}/>);expect(calls).toEqual(['','','first']);\n});\n",
  },
  "react-stable-pick-handler": {
    solution: `import React, { useCallback, useState } from 'react';

const flavours = ['Vanilla', 'Chocolate', 'Mint'];

const FlavourButton = React.memo(({ label, onPick }) => (
  <button onClick={() => onPick(label)}>{label}</button>
));

const App = ({ Button = FlavourButton } = {}) => {
  const [picked, setPicked] = useState('none');
  const onPick = useCallback(label => {
    setPicked(label);
  }, []);

  return (
    <main>
      <p>Picked: {picked}</p>
      {flavours.map(flavour => (
        <Button key={flavour} label={flavour} onPick={onPick} />
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

const App = ({ Button = FlavourButton } = {}) => {
  const [picked, setPicked] = useState('none');

  const onPick = useCallback(function (label) {
    setPicked(label);
  }, []);

  const buttons = [];
  for (const flavour of flavours) {
    buttons.push(<Button key={flavour} label={flavour} onPick={onPick} />);
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

const App = ({ Button = FlavourButton } = {}) => {
  const [picked, setPicked] = useState('none');
  const onPick = useCallback(label => setPicked(current => (current === label ? current : label)), []);

  return (
    <main>
      <p>{\`Picked: \${picked}\`}</p>
      {flavours.map(flavour => (
        <Button key={flavour} label={flavour} onPick={onPick} />
      ))}
    </main>
  );
};

export default App;
`,
    hiddenSuite: "\ntest('passes one stable shared callback through ordinary parent and selection updates',()=>{\n const seen=[];const Probe=({label,onPick})=>{seen.push({label,onPick});return <button onClick={()=>onPick(label)}>{label}</button>;};\n const view=render(<App Button={Probe}/>);expect(seen.map(row=>row.label)).toEqual(['Vanilla','Chocolate','Mint']);const handler=seen[0].onPick;expect(typeof handler).toBe('function');\n view.rerender(<App Button={Probe}/>);fireEvent.click(button(view.container,'Chocolate'));fireEvent.click(button(view.container,'Mint'));fireEvent.click(button(view.container,'Vanilla'));\n expect(view.container.textContent).toContain('Picked: Vanilla');expect(seen.every(row=>row.onPick===handler)).toBe(true);\n});\ntest('stable props let supplied memoized children skip ordinary selection rerenders',()=>{\n let renders=0;const MemoButton=React.memo(({label,onPick})=>{renders++;return <button onClick={()=>onPick(label)}>{label}</button>;});\n const view=render(<App Button={MemoButton}/>);expect(renders).toBe(3);\n for(const label of ['Mint','Chocolate','Vanilla','Mint']){fireEvent.click(button(view.container,label));expect(view.container.textContent).toContain('Picked: '+label);expect(renders).toBe(3);}\n view.rerender(<App Button={MemoButton}/>);expect(renders).toBe(3);\n});\ntest('keeps stable callbacks scoped to each mounted app',()=>{\n const firstHandlers=[],secondHandlers=[];\n const First=({label,onPick})=>{firstHandlers.push(onPick);return <button onClick={()=>onPick(label)}>{label}</button>;};\n const Second=({label,onPick})=>{secondHandlers.push(onPick);return <button onClick={()=>onPick(label)}>{label}</button>;};\n const first=render(<App Button={First}/>),second=render(<App Button={Second}/>);\n fireEvent.click(button(first.container,'Chocolate'));expect(second.container.textContent).toContain('Picked: none');fireEvent.click(button(second.container,'Mint'));expect(first.container.textContent).toContain('Picked: Chocolate');expect(second.container.textContent).toContain('Picked: Mint');\n expect(firstHandlers.every(fn=>fn===firstHandlers[0])).toBe(true);expect(secondHandlers.every(fn=>fn===secondHandlers[0])).toBe(true);\n});\n",
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
    hiddenSuite: "\ntest('numbers repushed steps by current depth after partial and complete undo',()=>{\n const view=render(<App/>);for(let i=0;i<3;i++)fireEvent.click(button(view.container,'Push'));for(let i=0;i<2;i++)fireEvent.click(button(view.container,'Undo'));\n fireEvent.click(button(view.container,'Push'));expect(steps(view.container)).toEqual(['Step 1','Step 2']);expect(view.container.textContent).toContain('Depth: 2');\n fireEvent.click(button(view.container,'Undo'));fireEvent.click(button(view.container,'Undo'));expect(button(view.container,'Undo').disabled).toBe(true);\n fireEvent.click(button(view.container,'Undo'));fireEvent.click(button(view.container,'Push'));expect(steps(view.container)).toEqual(['Step 1']);\n});\ntest('matches repeated push/pop transitions beyond the three-step sample',()=>{\n const view=render(<App/>);let depth=0;\n for(let step=0;step<36;step++){\n  if(step%3===2){fireEvent.click(button(view.container,'Undo'));depth=Math.max(0,depth-1);}else{fireEvent.click(button(view.container,'Push'));depth++;}\n  expect(steps(view.container)).toEqual(Array.from({length:depth},(_,i)=>'Step '+(i+1)));expect(view.container.textContent).toContain('Depth: '+depth);expect(button(view.container,'Undo').disabled).toBe(depth===0);\n }\n});\ntest('keeps simultaneously mounted and remounted stack state separate',()=>{\n const first=render(<App/>),second=render(<App/>);fireEvent.click(button(first.container,'Push'));fireEvent.click(button(first.container,'Push'));expect(steps(second.container)).toEqual([]);\n fireEvent.click(button(second.container,'Push'));fireEvent.click(button(first.container,'Undo'));expect(steps(first.container)).toEqual(['Step 1']);expect(steps(second.container)).toEqual(['Step 1']);\n first.unmount();const third=render(<App/>);expect(steps(third.container)).toEqual([]);expect(button(third.container,'Undo').disabled).toBe(true);\n});\n",
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
    hiddenSuite: "\ntest('keeps session numbering after draining and refilling the queue',()=>{\n const view=render(<App/>);for(let i=0;i<3;i++)fireEvent.click(button(view.container,'Take a ticket'));for(let i=0;i<3;i++)fireEvent.click(button(view.container,'Call next'));\n expect(tickets(view.container)).toEqual([]);expect(button(view.container,'Call next').disabled).toBe(true);fireEvent.click(button(view.container,'Call next'));\n fireEvent.click(button(view.container,'Take a ticket'));fireEvent.click(button(view.container,'Take a ticket'));expect(tickets(view.container)).toEqual(['Ticket 4','Ticket 5']);expect(view.container.textContent).toContain('Next up: Ticket 4');expect(view.container.textContent).toContain('Waiting: 2');\n});\ntest('matches a mixed FIFO model and keeps all statuses current',()=>{\n const view=render(<App/>);let issued=0,waiting=[];\n for(let step=0;step<36;step++){\n  if(step%3===2){fireEvent.click(button(view.container,'Call next'));waiting=waiting.slice(1);}else{fireEvent.click(button(view.container,'Take a ticket'));waiting=waiting.concat('Ticket '+(++issued));}\n  expect(tickets(view.container)).toEqual(waiting);expect([...view.container.querySelectorAll('p')].map(p=>p.textContent)).toContain('Next up: '+(waiting[0]||'none'));expect([...view.container.querySelectorAll('p')].map(p=>p.textContent)).toContain('Waiting: '+waiting.length);expect(button(view.container,'Call next').disabled).toBe(waiting.length===0);\n }\n});\ntest('scopes ticket numbering and waiting state to one mounted session',()=>{\n const first=render(<App/>),second=render(<App/>);fireEvent.click(button(first.container,'Take a ticket'));fireEvent.click(button(second.container,'Take a ticket'));expect(tickets(first.container)).toEqual(['Ticket 1']);expect(tickets(second.container)).toEqual(['Ticket 1']);\n fireEvent.click(button(first.container,'Call next'));fireEvent.click(button(first.container,'Take a ticket'));expect(tickets(first.container)).toEqual(['Ticket 2']);expect(tickets(second.container)).toEqual(['Ticket 1']);\n first.unmount();const third=render(<App/>);fireEvent.click(button(third.container,'Take a ticket'));expect(tickets(third.container)).toEqual(['Ticket 1']);\n});\n",
  },
  "react-usepagination-hook": {
    solution: `import React, { useState } from 'react';

const cities = ['Athens', 'Bergen', 'Cork', 'Dresden', 'Evora', 'Faro', 'Ghent'];

export const usePagination = (items, pageSize) => {
  const [requestedIndex, setIndex] = useState(0);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const index = Math.min(requestedIndex, pageCount - 1);
  if (requestedIndex !== index) setIndex(index);
  const start = index * pageSize;
  const pageItems = items.slice(start, start + pageSize);
  const next = () => setIndex(current => Math.min(current + 1, pageCount - 1));
  const previous = () => setIndex(current => Math.max(current - 1, 0));
  return { pageItems, page: index + 1, pageCount, next, previous };
};

const App = ({ items = cities, pageSize = 3 } = {}) => {
  const { pageItems, page, pageCount, next, previous } = usePagination(items, pageSize);

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

export function usePagination(items, pageSize) {
  const [requestedPage, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(requestedPage, pageCount);
  if (requestedPage !== page) setPage(page);
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const pageItems = items.slice(start, end);

  function next() {
    setPage(current => Math.min(current + 1, pageCount));
  }

  function previous() {
    setPage(current => Math.max(current - 1, 1));
  }

  return { pageItems: pageItems, page: page, pageCount: pageCount, next: next, previous: previous };
}

const App = ({ items = cities, pageSize = 3 } = {}) => {
  const pagination = usePagination(items, pageSize);
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

export const usePagination = (items, pageSize) => {
  const [requestedIndex, setIndex] = useState(0);
  const lastIndex = Math.max(0, Math.ceil(items.length / pageSize) - 1);
  const index = Math.min(requestedIndex, lastIndex);
  if (requestedIndex !== index) setIndex(index);
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

const App = ({ items = cities, pageSize = 3 } = {}) => {
  const { pageItems, page, pageCount, hasPrevious, hasNext, next, previous } = usePagination(items, pageSize);

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
    hiddenSuite: "\nconst pageProbe=()=>{\n let current;\n const Probe=({items,size})=>{\n  const page=usePagination(items,size);current=page;\n  return <main><p>{'Page '+page.page+' of '+page.pageCount}</p><button onClick={page.previous}>Back</button><button onClick={page.next}>Forward</button><button onClick={()=>{page.next();page.next();}}>Forward twice</button></main>;\n };\n return {Probe,read:()=>current};\n};\n\ntest('the named hook handles generic read-only values,empty input,bounds and batched calls',()=>{\n const token=()=>1,symbol=Symbol('token'),record=Object.freeze({id:1});\n const cases=[{items:Object.freeze([]),size:3},{items:Object.freeze(['one']),size:1},{items:Object.freeze(['A','B','C','D','E','F','G']),size:3},{items:Object.freeze([record,token,symbol,null,undefined,0,false]),size:2},{items:Object.freeze(Array.from({length:1000},(_,i)=>Object.freeze({id:i}))),size:100}];\n for(const data of cases){\n  const driver=pageProbe(),view=render(<driver.Probe items={data.items} size={data.size}/>),count=Math.max(1,Math.ceil(data.items.length/data.size));let expected=1;\n  const check=()=>{const page=driver.read();expect(page.page).toBe(expected);expect(page.pageCount).toBe(count);const items=Array.from(page.pageItems),start=(expected-1)*data.size;expect(items.length).toBe(Math.min(data.size,Math.max(0,data.items.length-start)));items.forEach((item,i)=>expect(item).toBe(data.items[start+i]));};\n  check();fireEvent.click(button(view.container,'Forward twice'));expected=Math.min(3,count);check();\n  while(expected<count){fireEvent.click(button(view.container,'Forward'));expected++;check();}\n  fireEvent.click(button(view.container,'Forward'));check();\n  while(expected>1){fireEvent.click(button(view.container,'Back'));expected--;check();}\n  fireEvent.click(button(view.container,'Back'));check();view.unmount();\n }\n});\ntest('App follows changed items and page sizes and persists a page clamp',()=>{\n const original=Object.freeze(['A','B','C','D','E','F','G']);const view=render(<App items={original} pageSize={3}/>);\n const check=(names,page,count)=>{expect([...view.container.querySelectorAll('ul li')].map(li=>li.textContent)).toEqual(names);expect(view.container.querySelector('p').textContent).toBe('Page '+page+' of '+count);expect(button(view.container,'Previous').disabled).toBe(page===1);expect(button(view.container,'Next').disabled).toBe(page===count);};\n check(['A','B','C'],1,3);fireEvent.click(button(view.container,'Next'));fireEvent.click(button(view.container,'Next'));check(['G'],3,3);\n view.rerender(<App items={Object.freeze(['<b>New</b>'])} pageSize={3}/>);check(['<b>New</b>'],1,1);\n const larger=Object.freeze(Array.from({length:10},(_,i)=>'City '+i));view.rerender(<App items={larger} pageSize={2}/>);check(['City 0','City 1'],1,5);\n fireEvent.click(button(view.container,'Next'));check(['City 2','City 3'],2,5);view.rerender(<App items={larger} pageSize={1}/>);check(['City 1'],2,10);\n view.rerender(<App items={Object.freeze([])} pageSize={1}/>);check([],1,1);view.rerender(<App items={Object.freeze(['Restored','More'])} pageSize={1}/>);check(['Restored'],1,2);\n expect([...original]).toEqual(['A','B','C','D','E','F','G']);\n});\ntest('the hook clamps its own state on input changes and keeps mounted instances independent',()=>{\n const first=pageProbe(),second=pageProbe(),items=Object.freeze(['a','b','c','d','e','f','g','h']);\n const a=render(<first.Probe items={items} size={2}/>),b=render(<second.Probe items={items} size={2}/>);\n fireEvent.click(button(a.container,'Forward twice'));expect(first.read().page).toBe(3);expect(second.read().page).toBe(1);\n a.rerender(<first.Probe items={Object.freeze(['one'])} size={1}/>);expect(first.read().page).toBe(1);expect(first.read().pageCount).toBe(1);\n a.rerender(<first.Probe items={Object.freeze(['x','y','z','w'])} size={2}/>);expect(first.read().page).toBe(1);fireEvent.click(button(a.container,'Forward twice'));expect(first.read().page).toBe(2);\n fireEvent.click(button(b.container,'Forward'));expect(second.read().page).toBe(2);expect(first.read().page).toBe(2);\n a.unmount();const third=pageProbe(),c=render(<third.Probe items={items} size={2}/>);expect(third.read().page).toBe(1);expect(Array.from(third.read().pageItems)).toEqual(['a','b']);\n});\n",
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
    hiddenSuite: "\ntest('edge disabled flags follow current positions after moves',()=>{\n const view=render(<App/>);fireEvent.click(control(view.container.querySelectorAll('li')[0],'Down'));expect(labels(view.container)).toEqual(['Build','Plan','Test','Ship']);\n const check=()=>{const rows=[...view.container.querySelectorAll('li')];rows.forEach((li,i)=>{expect(control(li,'Up').disabled).toBe(i===0);expect(control(li,'Down').disabled).toBe(i===rows.length-1);});};\n check();fireEvent.click(control(view.container.querySelectorAll('li')[3],'Up'));expect(labels(view.container)).toEqual(['Build','Plan','Ship','Test']);check();\n fireEvent.click(control(view.container.querySelectorAll('li')[1],'Up'));expect(labels(view.container)).toEqual(['Plan','Build','Ship','Test']);check();\n});\ntest('matches repeated neighbour moves while retaining every row node',()=>{\n const view=render(<App/>);let expected=['Plan','Build','Test','Ship'];const nodes=new Map([...view.container.querySelectorAll('li')].map(li=>[li.querySelector('span').textContent,li]));\n for(let step=0;step<36;step++){\n  const index=(step*5+Math.floor(step/3))%4,delta=step%2===0?1:-1,target=index+delta;fireEvent.click(control(view.container.querySelectorAll('li')[index],delta===1?'Down':'Up'));\n  if(target>=0&&target<4){const next=[...expected];[next[index],next[target]]=[next[target],next[index]];expected=next;}\n  expect(labels(view.container)).toEqual(expected);[...view.container.querySelectorAll('li')].forEach((li,i)=>{expect(li).toBe(nodes.get(expected[i]));expect(control(li,'Up').disabled).toBe(i===0);expect(control(li,'Down').disabled).toBe(i===3);});\n }\n});\ntest('keeps concurrent and fresh ordered lists independent',()=>{\n const first=render(<App/>),second=render(<App/>);fireEvent.click(control(first.container.querySelectorAll('li')[1],'Down'));fireEvent.click(control(first.container.querySelectorAll('li')[3],'Up'));expect(labels(second.container)).toEqual(['Plan','Build','Test','Ship']);\n fireEvent.click(control(second.container.querySelectorAll('li')[0],'Down'));expect(labels(first.container)).toEqual(['Plan','Test','Ship','Build']);expect(labels(second.container)).toEqual(['Build','Plan','Test','Ship']);first.unmount();const third=render(<App/>);expect(labels(third.container)).toEqual(['Plan','Build','Test','Ship']);\n});\n",
  },
};
