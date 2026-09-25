// Server-only reference solutions and hidden cases for lib/coding/tasks/easy-react-a.ts.
// Never import from client code. Each `hiddenSuite` is test blocks only: the
// server appends it to the visible suite (lib/coding/react-hidden.ts), so it
// uses that suite's imports and helpers. The hidden cases aim at the shortcut
// each visible suite leaves open: a value that is right only at mount, a
// hard-coded count, a mutated seed, a listener or timer left behind, and the
// case the technique exists for.

import type { CodingSolution } from '../types';

export const EASY_REACT_A_SOLUTIONS: Record<string, CodingSolution> = {
  /* ── useRef ───────────────────────────────────────────────────────── */
  'react-easy2-focus-the-search': {
    solution: `import React, { useRef } from 'react';

const App = () => {
  // React puts the input element into searchRef.current after the first render.
  const searchRef = useRef(null);

  return <main>
    <h2>Focus the search box</h2>
    <label>Name <input /></label>
    <label>Search <input type="search" ref={searchRef} /></label>
    <button type="button" onClick={() => searchRef.current.focus()}>Jump to search</button>
  </main>;
};

export default App;`,
    junior: `import React, { useRef } from 'react';

const App = () => {
  const searchRef = useRef(null);

  const handleJump = () => {
    const input = searchRef.current;
    if (input) {
      input.focus();
    }
  };

  return (
    <main>
      <h2>Focus the search box</h2>
      <label>Name <input /></label>
      <label>Search <input type="search" ref={searchRef} /></label>
      <button type="button" onClick={handleJump}>Jump to search</button>
    </main>
  );
};

export default App;`,
    senior: `import React, { useRef } from 'react';

const App = () => {
  const searchRef = useRef(null);
  // Optional chaining: the handler cannot run before the ref is set, but it costs nothing to say so.
  const focusSearch = () => searchRef.current?.focus();

  return (
    <main>
      <h2>Focus the search box</h2>
      <label>Name <input /></label>
      <label>Search <input type="search" ref={searchRef} /></label>
      <button type="button" onClick={focusSearch}>Jump to search</button>
    </main>
  );
};

export default App;`,
    hiddenSuite: `test('nothing is focused before the click', () => {
  render(<App />);
  expect(document.activeElement === search()).toBe(false);
});

test('the button works again after the focus moved away', () => {
  render(<App />);
  fireEvent.click(jump());
  screen.getByLabelText('Name').focus();
  fireEvent.click(jump());
  expect(document.activeElement).toBe(search());
});

test('the button still works after App renders again', () => {
  const { rerender } = render(<App />);
  rerender(<App />);
  screen.getByLabelText('Name').focus();
  fireEvent.click(jump());
  expect(document.activeElement).toBe(search());
});`,
  },
  'react-easy2-cancel-the-reminder': {
    solution: `import React, { useRef, useState } from 'react';

const App = () => {
  const [message, setMessage] = useState('');
  // The id only matters to the handlers, so it lives in a ref: storing it causes no render.
  const timeoutRef = useRef(null);

  const remind = () => {
    // A second press starts the wait over instead of queueing a second message.
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setMessage('Time to stretch'), 300);
  };

  const cancel = () => {
    clearTimeout(timeoutRef.current);
  };

  return <main>
    <h2>Cancel the reminder</h2>
    <p>{message}</p>
    <button type="button" onClick={remind}>Remind me</button>
    <button type="button" onClick={cancel}>Cancel</button>
  </main>;
};

export default App;`,
    junior: `import React, { useRef, useState } from 'react';

const App = () => {
  const [message, setMessage] = useState('');
  const timeoutRef = useRef(null);

  const remind = () => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
    }
    const id = setTimeout(() => {
      setMessage('Time to stretch');
      timeoutRef.current = null;
    }, 300);
    timeoutRef.current = id;
  };

  const cancel = () => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  return (
    <main>
      <h2>Cancel the reminder</h2>
      <p>{message}</p>
      <button type="button" onClick={remind}>Remind me</button>
      <button type="button" onClick={cancel}>Cancel</button>
    </main>
  );
};

export default App;`,
    senior: `import React, { useEffect, useRef, useState } from 'react';

const DELAY_MS = 300;

const App = () => {
  const [message, setMessage] = useState('');
  const timeoutRef = useRef(null);

  const cancel = () => clearTimeout(timeoutRef.current);
  const remind = () => {
    cancel();
    timeoutRef.current = setTimeout(() => setMessage('Time to stretch'), DELAY_MS);
  };

  // A reminder still waiting when the page closes goes with it.
  useEffect(() => cancel, []);

  return (
    <main>
      <h2>Cancel the reminder</h2>
      <p>{message}</p>
      <button type="button" onClick={remind}>Remind me</button>
      <button type="button" onClick={cancel}>Cancel</button>
    </main>
  );
};

export default App;`,
    hiddenSuite: `test('the message waits for the timeout', () => {
  const { container } = render(<App />);
  press('Remind me');
  expect(container.textContent).not.toContain('Time to stretch');
});

test('Cancel after two presses stops both', async () => {
  const { container } = render(<App />);
  press('Remind me');
  press('Remind me');
  press('Cancel');
  await wait(500);
  expect(container.textContent).not.toContain('Time to stretch');
});

test('a reminder can be set again after a cancel', async () => {
  const { container } = render(<App />);
  press('Remind me');
  press('Cancel');
  press('Remind me');
  await waitFor(() => expect(container.textContent).toContain('Time to stretch'), { timeout: 2000 });
});`,
  },

  /* ── timers ───────────────────────────────────────────────────────── */
  'react-easy2-countdown': {
    solution: `import React, { useEffect, useState } from 'react';

const App = () => {
  const [count, setCount] = useState(3);

  useEffect(() => {
    // At 0 there is nothing left to count, so no new interval starts.
    if (count === 0) return;
    const id = setInterval(() => setCount((previous) => previous - 1), 100);
    // Runs before the next tick's effect and when the countdown leaves the page.
    return () => clearInterval(id);
  }, [count]);

  return <main>
    <h2>Countdown to launch</h2>
    <p>{count === 0 ? 'Liftoff!' : count}</p>
  </main>;
};

export default App;`,
    junior: `import React, { useEffect, useState } from 'react';

const App = () => {
  const [count, setCount] = useState(3);

  useEffect(() => {
    const id = setInterval(() => {
      setCount((previous) => previous - 1);
    }, 100);

    if (count === 0) {
      clearInterval(id);
    }

    return () => {
      clearInterval(id);
    };
  }, [count]);

  let label = String(count);
  if (count === 0) {
    label = 'Liftoff!';
  }

  return (
    <main>
      <h2>Countdown to launch</h2>
      <p>{label}</p>
    </main>
  );
};

export default App;`,
    senior: `import React, { useEffect, useRef, useState } from 'react';

const TICK_MS = 100;

const App = () => {
  const [count, setCount] = useState(3);
  const intervalRef = useRef(null);

  // One interval for the whole countdown; the effect below stops it at 0.
  useEffect(() => {
    intervalRef.current = setInterval(() => setCount((previous) => previous - 1), TICK_MS);
    return () => clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    if (count === 0) clearInterval(intervalRef.current);
  }, [count]);

  return (
    <main>
      <h2>Countdown to launch</h2>
      <p>{count === 0 ? 'Liftoff!' : count}</p>
    </main>
  );
};

export default App;`,
    hiddenSuite: `test('it stays at Liftoff! after reaching zero', async () => {
  const { container } = render(<App />);
  await waitFor(() => expect(container.textContent).toContain('Liftoff!'), { timeout: 2000 });
  await act(() => new Promise(resolve => setTimeout(resolve, 350)));
  expect(container.querySelector('p').textContent).toBe('Liftoff!');
});

test('the interval is cleared at zero, while the countdown is still on the page', async () => {
  const spy = watchIntervals();
  try {
    const { container } = render(<App />);
    spy.stopRecording();
    await waitFor(() => expect(container.textContent).toContain('Liftoff!'), { timeout: 2000 });
    expect(spy.allCleared()).toBe(true);
  } finally {
    spy.restore();
  }
});

test('a second countdown starts from 3 again', async () => {
  const first = render(<App />);
  await waitFor(() => expect(first.container.textContent).toContain('Liftoff!'), { timeout: 2000 });
  first.unmount();
  const second = render(<App />);
  expect(second.container.querySelector('p').textContent).toBe('3');
});`,
  },

  /* ── useContext ───────────────────────────────────────────────────── */
  'react-easy2-read-the-theme': {
    solution: `import React, { createContext, useContext } from 'react';

export const ThemeContext = createContext('light');

// The nearest provider above Badge decides; Toolbar passes nothing along.
export const Badge = () => {
  const theme = useContext(ThemeContext);
  return <span className={'badge badge--' + theme}>Theme: {theme}</span>;
};

const Toolbar = () => (
  <nav>
    <Badge />
  </nav>
);

const App = () => (
  <ThemeContext.Provider value="dark">
    <main>
      <h2>Read the theme</h2>
      <Toolbar />
    </main>
  </ThemeContext.Provider>
);

export default App;`,
    junior: `import React, { createContext, useContext } from 'react';

export const ThemeContext = createContext('light');

export const Badge = () => {
  const themeFromContext = useContext(ThemeContext);
  const className = 'badge badge--' + themeFromContext;
  const label = 'Theme: ' + themeFromContext;
  return <span className={className}>{label}</span>;
};

const Toolbar = () => (
  <nav>
    <Badge />
  </nav>
);

const App = () => (
  <ThemeContext.Provider value="dark">
    <main>
      <h2>Read the theme</h2>
      <Toolbar />
    </main>
  </ThemeContext.Provider>
);

export default App;`,
    senior: `import React, { createContext, useContext } from 'react';

export const ThemeContext = createContext('light');

// One place to read the theme, so every consumer reads it the same way.
const useTheme = () => useContext(ThemeContext);

export const Badge = () => {
  const theme = useTheme();
  return <span className={['badge', 'badge--' + theme].join(' ')}>Theme: {theme}</span>;
};

const Toolbar = () => (
  <nav>
    <Badge />
  </nav>
);

const App = () => (
  <ThemeContext.Provider value="dark">
    <main>
      <h2>Read the theme</h2>
      <Toolbar />
    </main>
  </ThemeContext.Provider>
);

export default App;`,
    hiddenSuite: `test('the class name follows the context too', () => {
  const { container } = render(<ThemeContext.Provider value="dark"><Badge /></ThemeContext.Provider>);
  expect(container.querySelector('span').className).toContain('badge--dark');
});

test('a theme prop no longer decides', () => {
  const { container } = render(<ThemeContext.Provider value="dark"><Badge theme="light" /></ThemeContext.Provider>);
  expect(container.textContent).toContain('Theme: dark');
});

test('a new provider value reaches the badge', () => {
  const { container, rerender } = render(<ThemeContext.Provider value="dark"><Badge /></ThemeContext.Provider>);
  rerender(<ThemeContext.Provider value="sepia"><Badge /></ThemeContext.Provider>);
  expect(container.textContent).toContain('Theme: sepia');
});`,
  },
  'react-easy2-nearest-provider': {
    solution: `import React, { createContext, useContext } from 'react';

// Used only by a Label with no provider anywhere above it.
export const SizeContext = createContext('medium');

export const Label = ({ text }) => {
  const size = useContext(SizeContext);
  return <span>{text} ({size})</span>;
};

const App = () => (
  <main>
    <h2>Nearest provider wins</h2>
    <Label text="Page" />
    <SizeContext.Provider value="large">
      <section>
        <Label text="Header" />
        {/* Closer to the Note than "large", so it wins there. */}
        <SizeContext.Provider value="small">
          <aside>
            <Label text="Note" />
          </aside>
        </SizeContext.Provider>
      </section>
    </SizeContext.Provider>
  </main>
);

export default App;`,
    junior: `import React, { createContext, useContext } from 'react';

export const SizeContext = createContext('medium');

export const Label = (props) => {
  const size = useContext(SizeContext);
  const label = props.text + ' (' + size + ')';
  return <span>{label}</span>;
};

const App = () => {
  return (
    <main>
      <h2>Nearest provider wins</h2>
      <Label text="Page" />
      <SizeContext.Provider value="large">
        <section>
          <Label text="Header" />
          <SizeContext.Provider value="small">
            <aside>
              <Label text="Note" />
            </aside>
          </SizeContext.Provider>
        </section>
      </SizeContext.Provider>
    </main>
  );
};

export default App;`,
    senior: `import React, { createContext, useContext } from 'react';

export const SizeContext = createContext('medium');

export const Label = ({ text }) => <span>{text} ({useContext(SizeContext)})</span>;

// A small wrapper keeps each size next to the part of the page it applies to.
const Sized = ({ size, children }) => <SizeContext.Provider value={size}>{children}</SizeContext.Provider>;

const App = () => (
  <main>
    <h2>Nearest provider wins</h2>
    <Label text="Page" />
    <Sized size="large">
      <section>
        <Label text="Header" />
        <Sized size="small">
          <aside>
            <Label text="Note" />
          </aside>
        </Sized>
      </section>
    </Sized>
  </main>
);

export default App;`,
    hiddenSuite: `test('SizeContext is exported with its default', () => {
  const { container } = render(<Label text="Alone" />);
  expect(container.textContent).toBe('Alone (medium)');
});

test('any provider decides for the labels under it', () => {
  const { container } = render(<SizeContext.Provider value="huge"><Label text="Big" /></SizeContext.Provider>);
  expect(container.textContent).toBe('Big (huge)');
});

test('the closer of two providers wins', () => {
  const { container } = render(
    <SizeContext.Provider value="large">
      <SizeContext.Provider value="tiny"><Label text="Inner" /></SizeContext.Provider>
    </SizeContext.Provider>,
  );
  expect(container.textContent).toBe('Inner (tiny)');
});`,
  },
  'react-easy2-shared-basket': {
    solution: `import React, { createContext, useContext, useState } from 'react';

export const BasketContext = createContext(null);

export const AddButton = ({ name }) => {
  const { add } = useContext(BasketContext);
  return <button type="button" onClick={add}>Add {name}</button>;
};

export const BasketCount = () => {
  const { count } = useContext(BasketContext);
  return <p>Items in basket: {count}</p>;
};

const App = () => {
  const [count, setCount] = useState(0);
  // The updater form counts every click, even two in one render.
  const add = () => setCount((previous) => previous + 1);

  return <BasketContext.Provider value={{ count, add }}>
    <main>
      <h2>Share a count through context</h2>
      <header><BasketCount /></header>
      <ul>
        <li><AddButton name="Apples" /></li>
        <li><AddButton name="Bread" /></li>
      </ul>
    </main>
  </BasketContext.Provider>;
};

export default App;`,
    junior: `import React, { createContext, useContext, useState } from 'react';

export const BasketContext = createContext(null);

export const AddButton = ({ name }) => {
  const basket = useContext(BasketContext);

  const handleClick = () => {
    basket.add();
  };

  return <button type="button" onClick={handleClick}>Add {name}</button>;
};

export const BasketCount = () => {
  const basket = useContext(BasketContext);
  return <p>Items in basket: {basket.count}</p>;
};

const App = () => {
  const [count, setCount] = useState(0);

  const add = () => {
    setCount((previous) => previous + 1);
  };

  const basket = { count: count, add: add };

  return (
    <BasketContext.Provider value={basket}>
      <main>
        <h2>Share a count through context</h2>
        <header><BasketCount /></header>
        <ul>
          <li><AddButton name="Apples" /></li>
          <li><AddButton name="Bread" /></li>
        </ul>
      </main>
    </BasketContext.Provider>
  );
};

export default App;`,
    senior: `import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export const BasketContext = createContext(null);

const useBasket = () => {
  const basket = useContext(BasketContext);
  if (!basket) throw new Error('useBasket needs a BasketContext provider above it');
  return basket;
};

export const AddButton = ({ name }) => {
  const { add } = useBasket();
  return <button type="button" onClick={add}>Add {name}</button>;
};

export const BasketCount = () => <p>Items in basket: {useBasket().count}</p>;

const App = () => {
  const [count, setCount] = useState(0);
  const add = useCallback(() => setCount((previous) => previous + 1), []);
  // A new object only when the count changes, so consumers skip needless renders.
  const basket = useMemo(() => ({ count, add }), [count, add]);

  return (
    <BasketContext.Provider value={basket}>
      <main>
        <h2>Share a count through context</h2>
        <header><BasketCount /></header>
        <ul>
          <li><AddButton name="Apples" /></li>
          <li><AddButton name="Bread" /></li>
        </ul>
      </main>
    </BasketContext.Provider>
  );
};

export default App;`,
    hiddenSuite: `test('AddButton calls the add it finds in context', () => {
  let calls = 0;
  render(<BasketContext.Provider value={{ count: 0, add: () => { calls += 1; } }}><AddButton name="Tea" /></BasketContext.Provider>);
  fireEvent.click(screen.getByRole('button', { name: 'Add Tea' }));
  expect(calls).toBe(1);
});

test('BasketCount follows the provider when the count changes', () => {
  const { container, rerender } = render(<BasketContext.Provider value={{ count: 1, add: () => {} }}><BasketCount /></BasketContext.Provider>);
  rerender(<BasketContext.Provider value={{ count: 2, add: () => {} }}><BasketCount /></BasketContext.Provider>);
  expect(container.textContent).toBe('Items in basket: 2');
});

test('two baskets on one page count apart', () => {
  const first = render(<App />);
  const second = render(<App />);
  fireEvent.click(within(first.container).getByRole('button', { name: 'Add Apples' }));
  expect(first.container.querySelector('header').textContent).toBe('Items in basket: 1');
  expect(second.container.querySelector('header').textContent).toBe('Items in basket: 0');
});`,
  },

  /* ── custom hooks ─────────────────────────────────────────────────── */
  'react-easy2-use-toggle': {
    solution: `import React, { useState } from 'react';

// Each call gets its own state: the hook shares the code, not the value.
export const useToggle = (initial = false) => {
  const [on, setOn] = useState(initial);
  const toggle = () => setOn((previous) => !previous);
  return [on, toggle];
};

const App = () => {
  const [wifi, toggleWifi] = useToggle(true);
  const [bluetooth, toggleBluetooth] = useToggle();

  return <main>
    <h2>A useToggle hook</h2>
    <button type="button" onClick={toggleWifi}>Wi-Fi: {wifi ? 'on' : 'off'}</button>
    <button type="button" onClick={toggleBluetooth}>Bluetooth: {bluetooth ? 'on' : 'off'}</button>
  </main>;
};

export default App;`,
    junior: `import React, { useState } from 'react';

export const useToggle = (initial = false) => {
  const [on, setOn] = useState(initial);

  const toggle = () => {
    if (on) {
      setOn(false);
    } else {
      setOn(true);
    }
  };

  return [on, toggle];
};

const App = () => {
  const [wifi, toggleWifi] = useToggle(true);
  const [bluetooth, toggleBluetooth] = useToggle(false);

  let wifiLabel = 'off';
  if (wifi) {
    wifiLabel = 'on';
  }
  let bluetoothLabel = 'off';
  if (bluetooth) {
    bluetoothLabel = 'on';
  }

  return (
    <main>
      <h2>A useToggle hook</h2>
      <button type="button" onClick={toggleWifi}>Wi-Fi: {wifiLabel}</button>
      <button type="button" onClick={toggleBluetooth}>Bluetooth: {bluetoothLabel}</button>
    </main>
  );
};

export default App;`,
    senior: `import React, { useCallback, useState } from 'react';

export const useToggle = (initial = false) => {
  const [on, setOn] = useState(initial);
  // Stable across renders, so it can be passed down without new props each time.
  const toggle = useCallback(() => setOn((previous) => !previous), []);
  return [on, toggle];
};

const Switch = ({ label, on, onToggle }) => (
  <button type="button" aria-pressed={on} onClick={onToggle}>
    {label}: {on ? 'on' : 'off'}
  </button>
);

const App = () => {
  const [wifi, toggleWifi] = useToggle(true);
  const [bluetooth, toggleBluetooth] = useToggle();

  return (
    <main>
      <h2>A useToggle hook</h2>
      <Switch label="Wi-Fi" on={wifi} onToggle={toggleWifi} />
      <Switch label="Bluetooth" on={bluetooth} onToggle={toggleBluetooth} />
    </main>
  );
};

export default App;`,
    hiddenSuite: `const Probe = ({ initial }) => {
  const [on, toggle] = useToggle(initial);
  return <button type="button" onClick={toggle}>{on ? 'yes' : 'no'}</button>;
};

test('useToggle starts from the value it is given', () => {
  render(<Probe initial={true} />);
  expect(screen.getByRole('button').textContent).toBe('yes');
});

test('useToggle starts off when given nothing', () => {
  render(<Probe />);
  expect(screen.getByRole('button').textContent).toBe('no');
});

test('toggle flips the value every time', () => {
  render(<Probe initial={true} />);
  const toggle = screen.getByRole('button');
  const seen = [];
  for (let click = 0; click < 3; click += 1) {
    fireEvent.click(toggle);
    seen.push(toggle.textContent);
  }
  expect(seen).toEqual(['no', 'yes', 'no']);
});`,
  },
  'react-easy2-use-window-width': {
    solution: `import React, { useEffect, useState } from 'react';

export const useWindowWidth = () => {
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    // One named function, so the cleanup can hand the same one back.
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return width;
};

const App = () => {
  const width = useWindowWidth();

  return <main>
    <h2>A useWindowWidth hook</h2>
    <p>Width: {width}px</p>
  </main>;
};

export default App;`,
    junior: `import React, { useEffect, useState } from 'react';

export const useWindowWidth = () => {
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    function handleResize() {
      const newWidth = window.innerWidth;
      setWidth(newWidth);
    }

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return width;
};

const App = () => {
  const width = useWindowWidth();

  return (
    <main>
      <h2>A useWindowWidth hook</h2>
      <p>Width: {width}px</p>
    </main>
  );
};

export default App;`,
    senior: `import React, { useSyncExternalStore } from 'react';

// The window is a store React does not own. useSyncExternalStore subscribes once
// per component, re-reads the width after every resize, and calls the function
// subscribe returns when the component leaves, with the same listener.
const subscribe = (onChange) => {
  window.addEventListener('resize', onChange);
  return () => window.removeEventListener('resize', onChange);
};
const readWidth = () => window.innerWidth;

export const useWindowWidth = () => useSyncExternalStore(subscribe, readWidth);

const App = () => (
  <main>
    <h2>A useWindowWidth hook</h2>
    <p>Width: {useWindowWidth()}px</p>
  </main>
);

export default App;`,
    hiddenSuite: `test('adds its listener once, not on every render', () => {
  const seen = watchResizeListeners();
  try {
    window.innerWidth = 1024;
    render(<App />);
    resizeTo(700);
    resizeTo(640);
    resizeTo(900);
    expect(seen.added.length).toBe(1);
  } finally {
    seen.restore();
  }
});

test('two components each follow the window', () => {
  const Probe = ({ label }) => <output>{label}:{useWindowWidth()}</output>;
  window.innerWidth = 800;
  const { container } = render(<><Probe label="a" /><Probe label="b" /></>);
  resizeTo(320);
  expect(container.textContent).toBe('a:320b:320');
});

test('the hook gives back the width as a number', () => {
  const Probe = () => <output>{typeof useWindowWidth()}</output>;
  window.innerWidth = 375;
  const { container } = render(<Probe />);
  expect(container.textContent).toBe('number');
});`,
  },
  'react-easy2-use-basket-totals': {
    solution: `import React, { useState } from 'react';

const startingItems = [
  { name: 'Notebook', price: 4, quantity: 2 },
  { name: 'Mug', price: 6, quantity: 1 },
];

// Worked out on every render from the items it is given: nothing to keep in sync.
export const useBasketTotals = (items) => {
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return { count, total };
};

const App = () => {
  const [items, setItems] = useState(startingItems);
  const { count, total } = useBasketTotals(items);

  const addPen = () => setItems((previous) => [...previous, { name: 'Pen', price: 2, quantity: 1 }]);

  return <main>
    <h2>Totals from a hook</h2>
    <p>Items: {count}</p>
    <p>Total: {total}</p>
    <button type="button" onClick={addPen}>Add a pen</button>
  </main>;
};

export default App;`,
    junior: `import React, { useState } from 'react';

const startingItems = [
  { name: 'Notebook', price: 4, quantity: 2 },
  { name: 'Mug', price: 6, quantity: 1 },
];

export const useBasketTotals = (items) => {
  let count = 0;
  let total = 0;
  for (const item of items) {
    count = count + item.quantity;
    total = total + item.price * item.quantity;
  }
  return { count: count, total: total };
};

const App = () => {
  const [items, setItems] = useState(startingItems);
  const totals = useBasketTotals(items);

  const handleAddPen = () => {
    const pen = { name: 'Pen', price: 2, quantity: 1 };
    setItems([...items, pen]);
  };

  return (
    <main>
      <h2>Totals from a hook</h2>
      <p>Items: {totals.count}</p>
      <p>Total: {totals.total}</p>
      <button type="button" onClick={handleAddPen}>Add a pen</button>
    </main>
  );
};

export default App;`,
    senior: `import React, { useMemo, useState } from 'react';

const startingItems = [
  { name: 'Notebook', price: 4, quantity: 2 },
  { name: 'Mug', price: 6, quantity: 1 },
];
const PEN = { name: 'Pen', price: 2, quantity: 1 };

// Still derived during render; useMemo only skips the loop when items is the same array.
export const useBasketTotals = (items) =>
  useMemo(
    () => items.reduce(
      (totals, { price, quantity }) => ({ count: totals.count + quantity, total: totals.total + price * quantity }),
      { count: 0, total: 0 },
    ),
    [items],
  );

const App = () => {
  const [items, setItems] = useState(startingItems);
  const { count, total } = useBasketTotals(items);

  return (
    <main>
      <h2>Totals from a hook</h2>
      <p>Items: {count}</p>
      <p>Total: {total}</p>
      <button type="button" onClick={() => setItems((previous) => [...previous, PEN])}>Add a pen</button>
    </main>
  );
};

export default App;`,
    hiddenSuite: `test('the totals are right on the first render', () => {
  const seen = [];
  const items = [{ name: 'Tea', price: 3, quantity: 2 }];
  const Probe = () => {
    const { total } = useBasketTotals(items);
    seen.push(total);
    return null;
  };
  render(<Probe />);
  expect(seen[0]).toBe(6);
});

test('new items give new totals without a remount', () => {
  const Probe = ({ items }) => {
    const { count, total } = useBasketTotals(items);
    return <output>{count}/{total}</output>;
  };
  const { container, rerender } = render(<Probe items={[{ name: 'A', price: 5, quantity: 1 }]} />);
  rerender(<Probe items={[{ name: 'A', price: 5, quantity: 1 }, { name: 'B', price: 1, quantity: 3 }]} />);
  expect(container.textContent).toBe('4/8');
});

test('a quantity above one counts in full', () => {
  const items = [{ name: 'Card', price: 2.5, quantity: 4 }];
  const Probe = () => {
    const { count, total } = useBasketTotals(items);
    return <output>{count}/{total}</output>;
  };
  const { container } = render(<Probe />);
  expect(container.textContent).toBe('4/10');
});`,
  },

  /* ── pagination ───────────────────────────────────────────────────── */
  'react-easy2-page-of-photos': {
    solution: `import React, { useState } from 'react';

const allPhotos = ['Harbour', 'Lighthouse', 'Dunes', 'Pier', 'Cliffs', 'Reef', 'Marina', 'Bay', 'Cove', 'Jetty'];
const PAGE_SIZE = 4;

const App = ({ photos = allPhotos }) => {
  const [page, setPage] = useState(1);
  const pageCount = Math.ceil(photos.length / PAGE_SIZE);
  // Pages count from 1, indexes from 0.
  const start = (page - 1) * PAGE_SIZE;
  const visible = photos.slice(start, start + PAGE_SIZE);

  return <main>
    <h2>One page at a time</h2>
    <ul>
      {visible.map((photo) => <li key={photo}>{photo}</li>)}
    </ul>
    <p>Page {page} of {pageCount}</p>
    <button type="button" onClick={() => setPage((previous) => Math.max(1, previous - 1))}>Previous</button>
    <button type="button" onClick={() => setPage((previous) => Math.min(pageCount, previous + 1))}>Next</button>
  </main>;
};

export default App;`,
    junior: `import React, { useState } from 'react';

const allPhotos = ['Harbour', 'Lighthouse', 'Dunes', 'Pier', 'Cliffs', 'Reef', 'Marina', 'Bay', 'Cove', 'Jetty'];
const PAGE_SIZE = 4;

const App = ({ photos = allPhotos }) => {
  const [page, setPage] = useState(1);
  const pageCount = Math.ceil(photos.length / PAGE_SIZE);

  const start = (page - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const visible = photos.slice(start, end);

  const items = [];
  for (const photo of visible) {
    items.push(<li key={photo}>{photo}</li>);
  }

  return (
    <main>
      <h2>One page at a time</h2>
      <ul>{items}</ul>
      <p>Page {page} of {pageCount}</p>
      <button type="button" onClick={() => setPage((previous) => Math.max(1, previous - 1))}>Previous</button>
      <button type="button" onClick={() => setPage((previous) => Math.min(pageCount, previous + 1))}>Next</button>
    </main>
  );
};

export default App;`,
    senior: `import React, { useState } from 'react';

const allPhotos = ['Harbour', 'Lighthouse', 'Dunes', 'Pier', 'Cliffs', 'Reef', 'Marina', 'Bay', 'Cove', 'Jetty'];
const PAGE_SIZE = 4;

const pageOf = (list, page, size) => list.slice((page - 1) * size, page * size);

const App = ({ photos = allPhotos }) => {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(photos.length / PAGE_SIZE));
  const go = (step) => setPage((previous) => Math.min(pageCount, Math.max(1, previous + step)));

  return (
    <main>
      <h2>One page at a time</h2>
      <ul>
        {pageOf(photos, page, PAGE_SIZE).map((photo) => <li key={photo}>{photo}</li>)}
      </ul>
      <p aria-live="polite">Page {page} of {pageCount}</p>
      <button type="button" onClick={() => go(-1)} disabled={page === 1}>Previous</button>
      <button type="button" onClick={() => go(1)} disabled={page === pageCount}>Next</button>
    </main>
  );
};

export default App;`,
    hiddenSuite: `test('Previous goes back to the same four', () => {
  const { container } = render(<App />);
  next();
  fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
  expect(shown(container)).toEqual(['Harbour', 'Lighthouse', 'Dunes', 'Pier']);
  expect(container.textContent).toContain('Page 1 of 3');
});

test('a shorter list pages the same way', () => {
  const { container } = render(<App photos={['One', 'Two', 'Three', 'Four', 'Five']} />);
  expect(container.textContent).toContain('Page 1 of 2');
  next();
  expect(shown(container)).toEqual(['Five']);
  expect(container.textContent).toContain('Page 2 of 2');
});

test('paging leaves the photos as they were for the next visit', () => {
  const first = render(<App />);
  next();
  next();
  first.unmount();
  const { container } = render(<App />);
  expect(shown(container)).toEqual(['Harbour', 'Lighthouse', 'Dunes', 'Pier']);
});`,
  },
  'react-easy2-show-more': {
    solution: `import React, { useState } from 'react';

const allComments = [
  'Great photo',
  'Where was this taken?',
  'Love the colours',
  'I was there last year',
  'Beautiful light',
  'Which lens did you use?',
  'Saving this one',
  'Wonderful',
];

const App = ({ comments = allComments }) => {
  // How many show, not which: the list itself is derived from it.
  const [shown, setShown] = useState(3);

  return <main>
    <h2>Show more</h2>
    <ul>
      {comments.slice(0, shown).map((comment) => <li key={comment}>{comment}</li>)}
    </ul>
    {shown < comments.length && (
      <button type="button" onClick={() => setShown((previous) => previous + 3)}>Show more</button>
    )}
  </main>;
};

export default App;`,
    junior: `import React, { useState } from 'react';

const allComments = [
  'Great photo',
  'Where was this taken?',
  'Love the colours',
  'I was there last year',
  'Beautiful light',
  'Which lens did you use?',
  'Saving this one',
  'Wonderful',
];

const App = ({ comments = allComments }) => {
  const [shown, setShown] = useState(3);

  const visible = comments.slice(0, shown);
  const hasMore = shown < comments.length;

  const handleShowMore = () => {
    setShown(shown + 3);
  };

  return (
    <main>
      <h2>Show more</h2>
      <ul>
        {visible.map((comment) => (
          <li key={comment}>{comment}</li>
        ))}
      </ul>
      {hasMore ? <button type="button" onClick={handleShowMore}>Show more</button> : null}
    </main>
  );
};

export default App;`,
    senior: `import React, { useState } from 'react';

const allComments = [
  'Great photo',
  'Where was this taken?',
  'Love the colours',
  'I was there last year',
  'Beautiful light',
  'Which lens did you use?',
  'Saving this one',
  'Wonderful',
];
const STEP = 3;

const App = ({ comments = allComments }) => {
  const [shown, setShown] = useState(STEP);
  const remaining = comments.length - shown;

  return (
    <main>
      <h2>Show more</h2>
      <ul>
        {comments.slice(0, shown).map((comment) => <li key={comment}>{comment}</li>)}
      </ul>
      {remaining > 0 && (
        <button type="button" onClick={() => setShown((previous) => previous + STEP)}>Show more</button>
      )}
    </main>
  );
};

export default App;`,
    hiddenSuite: `test('a list of exactly six ends after one click', () => {
  const { container } = render(<App comments={['a', 'b', 'c', 'd', 'e', 'f']} />);
  fireEvent.click(more());
  expect(count(container)).toBe(6);
  expect(more()).toBeNull();
});

test('a short list needs no button', () => {
  const { container } = render(<App comments={['only', 'two']} />);
  expect(count(container)).toBe(2);
  expect(more()).toBeNull();
});

test('the comments keep their order', () => {
  const { container } = render(<App />);
  fireEvent.click(more());
  expect([...container.querySelectorAll('li')].map(li => li.textContent).slice(2, 5)).toEqual(['Love the colours', 'I was there last year', 'Beautiful light']);
});`,
  },
  'react-easy2-numbered-pages': {
    solution: `import React, { useState } from 'react';

const allSongs = ['Blue Water', 'Low Tide', 'Salt Air', 'Deep End', 'Riptide', 'Undertow', 'Sea Glass'];
const PAGE_SIZE = 3;

const App = ({ songs = allSongs }) => {
  const [page, setPage] = useState(1);
  const start = (page - 1) * PAGE_SIZE;
  const pageCount = Math.ceil(songs.length / PAGE_SIZE);
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);

  return <main>
    <h2>Numbered page buttons</h2>
    <ul>
      {songs.slice(start, start + PAGE_SIZE).map((song) => <li key={song}>{song}</li>)}
    </ul>
    <nav aria-label="Pages">
      {pages.map((number) => (
        // undefined leaves the attribute out, so only the current page is marked.
        <button key={number} type="button" aria-current={number === page ? 'page' : undefined} onClick={() => setPage(number)}>
          {number}
        </button>
      ))}
    </nav>
  </main>;
};

export default App;`,
    junior: `import React, { useState } from 'react';

const allSongs = ['Blue Water', 'Low Tide', 'Salt Air', 'Deep End', 'Riptide', 'Undertow', 'Sea Glass'];
const PAGE_SIZE = 3;

const App = ({ songs = allSongs }) => {
  const [page, setPage] = useState(1);
  const start = (page - 1) * PAGE_SIZE;
  const pageCount = Math.ceil(songs.length / PAGE_SIZE);

  const buttons = [];
  for (let number = 1; number <= pageCount; number++) {
    let current = undefined;
    if (number === page) {
      current = 'page';
    }
    buttons.push(
      <button key={number} type="button" aria-current={current} onClick={() => setPage(number)}>
        {number}
      </button>,
    );
  }

  return (
    <main>
      <h2>Numbered page buttons</h2>
      <ul>
        {songs.slice(start, start + PAGE_SIZE).map((song) => <li key={song}>{song}</li>)}
      </ul>
      <nav aria-label="Pages">{buttons}</nav>
    </main>
  );
};

export default App;`,
    senior: `import React, { useState } from 'react';

const allSongs = ['Blue Water', 'Low Tide', 'Salt Air', 'Deep End', 'Riptide', 'Undertow', 'Sea Glass'];
const PAGE_SIZE = 3;

const PageButtons = ({ count, current, onPick }) => (
  <nav aria-label="Pages">
    {Array.from({ length: count }, (_, index) => index + 1).map((number) => (
      <button
        key={number}
        type="button"
        aria-current={number === current ? 'page' : undefined}
        onClick={() => onPick(number)}
      >
        {number}
      </button>
    ))}
  </nav>
);

const App = ({ songs = allSongs }) => {
  const [page, setPage] = useState(1);
  const start = (page - 1) * PAGE_SIZE;

  return (
    <main>
      <h2>Numbered page buttons</h2>
      <ul>
        {songs.slice(start, start + PAGE_SIZE).map((song) => <li key={song}>{song}</li>)}
      </ul>
      <PageButtons count={Math.ceil(songs.length / PAGE_SIZE)} current={page} onPick={setPage} />
    </main>
  );
};

export default App;`,
    hiddenSuite: `test('the mark moves with the page', () => {
  render(<App />);
  fireEvent.click(pages()[1]);
  expect(pages()[1].getAttribute('aria-current')).toBe('page');
  expect(pages()[0].getAttribute('aria-current')).toBeNull();
});

test('the number of pages follows the list', () => {
  render(<App songs={['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']} />);
  expect(pages().map(button => button.textContent)).toEqual(['1', '2', '3', '4']);
});

test('a list that fits on one page has one button', () => {
  render(<App songs={['a', 'b']} />);
  expect(pages().map(button => button.textContent)).toEqual(['1']);
});`,
  },

  /* ── abort ────────────────────────────────────────────────────────── */
  'react-easy2-stop-the-download': {
    solution: `import React, { useRef, useState } from 'react';

const App = () => {
  const [status, setStatus] = useState('Ready');
  const controllerRef = useRef(null);

  const download = async () => {
    // A controller aborts once, so every download gets a new one.
    const controller = new AbortController();
    controllerRef.current = controller;
    setStatus('Downloading…');
    try {
      await fetch('/api/report', { signal: controller.signal });
      setStatus('Done');
    } catch (error) {
      setStatus('Stopped');
    }
  };

  const stop = () => {
    // Nothing to stop before the first download.
    controllerRef.current?.abort();
  };

  return <main>
    <h2>Stop the download</h2>
    <p>{status}</p>
    <button type="button" onClick={download}>Download</button>
    <button type="button" onClick={stop}>Stop</button>
  </main>;
};

export default App;`,
    junior: `import React, { useRef, useState } from 'react';

const App = () => {
  const [status, setStatus] = useState('Ready');
  const controllerRef = useRef(null);

  const download = async () => {
    const controller = new AbortController();
    controllerRef.current = controller;
    setStatus('Downloading…');
    try {
      const options = { signal: controller.signal };
      await fetch('/api/report', options);
      setStatus('Done');
    } catch (error) {
      setStatus('Stopped');
    }
  };

  const stop = () => {
    if (controllerRef.current !== null) {
      controllerRef.current.abort();
    }
  };

  return (
    <main>
      <h2>Stop the download</h2>
      <p>{status}</p>
      <button type="button" onClick={download}>Download</button>
      <button type="button" onClick={stop}>Stop</button>
    </main>
  );
};

export default App;`,
    senior: `import React, { useRef, useState } from 'react';

const App = () => {
  const [status, setStatus] = useState('Ready');
  const controllerRef = useRef(null);

  const download = async () => {
    // Starting again replaces an unfinished download instead of racing it.
    controllerRef.current?.abort();
    const { signal } = (controllerRef.current = new AbortController());
    setStatus('Downloading…');
    try {
      await fetch('/api/report', { signal });
      setStatus('Done');
    } catch (error) {
      // Only the latest download may report; a replaced one has nothing to say.
      if (controllerRef.current.signal === signal) setStatus(error.name === 'AbortError' ? 'Stopped' : 'Failed');
    }
  };

  return (
    <main>
      <h2>Stop the download</h2>
      <p aria-live="polite">{status}</p>
      <button type="button" onClick={download}>Download</button>
      <button type="button" onClick={() => controllerRef.current?.abort()}>Stop</button>
    </main>
  );
};

export default App;`,
    hiddenSuite: `test('each download gets a controller of its own', () => withFetch(async calls => {
  const { container } = render(<App />);
  press('Download');
  await act(async () => { press('Stop'); });
  press('Download');
  expect(calls[1].signal.aborted).toBe(false);
  await act(async () => { calls[1].respond({}); });
  expect(status(container)).toBe('Done');
}));

test('Stop after a finished download changes nothing', () => withFetch(async calls => {
  const { container } = render(<App />);
  press('Download');
  await act(async () => { calls[0].respond({}); });
  await act(async () => { press('Stop'); });
  expect(status(container)).toBe('Done');
}));

test('Stop cancels the latest of two downloads', () => withFetch(async calls => {
  render(<App />);
  press('Download');
  press('Download');
  await act(async () => { press('Stop'); });
  expect(calls[1].signal.aborted).toBe(true);
}));`,
  },
  'react-easy2-cancel-is-not-an-error': {
    solution: `import React, { useEffect, useRef, useState } from 'react';

const App = () => {
  const [status, setStatus] = useState('Loading…');
  const controllerRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;
    fetch('/api/prices', { signal: controller.signal })
      .then(() => setStatus('Prices loaded'))
      .catch((error) => {
        // The name is the same everywhere; the message is not.
        setStatus(error.name === 'AbortError' ? 'Cancelled' : 'Could not load prices');
      });
    return () => controller.abort();
  }, []);

  return <main>
    <h2>A cancel is not an error</h2>
    <p>{status}</p>
    <button type="button" onClick={() => controllerRef.current.abort()}>Cancel</button>
  </main>;
};

export default App;`,
    junior: `import React, { useEffect, useRef, useState } from 'react';

const App = () => {
  const [status, setStatus] = useState('Loading…');
  const controllerRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;
    fetch('/api/prices', { signal: controller.signal })
      .then(() => {
        setStatus('Prices loaded');
      })
      .catch((error) => {
        if (error.name === 'AbortError') {
          setStatus('Cancelled');
        } else {
          setStatus('Could not load prices');
        }
      });
    return () => {
      controller.abort();
    };
  }, []);

  const handleCancel = () => {
    controllerRef.current.abort();
  };

  return (
    <main>
      <h2>A cancel is not an error</h2>
      <p>{status}</p>
      <button type="button" onClick={handleCancel}>Cancel</button>
    </main>
  );
};

export default App;`,
    senior: `import React, { useEffect, useRef, useState } from 'react';

const isAbort = (error) => error?.name === 'AbortError';

const App = () => {
  const [status, setStatus] = useState('Loading…');
  const controllerRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;
    (async () => {
      try {
        await fetch('/api/prices', { signal: controller.signal });
        setStatus('Prices loaded');
      } catch (error) {
        setStatus(isAbort(error) ? 'Cancelled' : 'Could not load prices');
      }
    })();
    return () => controller.abort();
  }, []);

  return (
    <main>
      <h2>A cancel is not an error</h2>
      <p role="status">{status}</p>
      <button type="button" onClick={() => controllerRef.current?.abort()}>Cancel</button>
    </main>
  );
};

export default App;`,
    hiddenSuite: `test('an AbortError with another message is still a cancel', () => withFetch(async calls => {
  const { container } = render(<App />);
  const error = new Error('The user aborted a request.');
  error.name = 'AbortError';
  await act(async () => { calls[0].fail(error); });
  expect(status(container)).toBe('Cancelled');
}));

test('an error that only mentions an abort is still an error', () => withFetch(async calls => {
  const { container } = render(<App />);
  await act(async () => { calls[0].fail(new Error('abort: the server hung up')); });
  expect(status(container)).toBe('Could not load prices');
}));

test('a DOMException named AbortError is a cancel too', () => withFetch(async calls => {
  const { container } = render(<App />);
  await act(async () => { calls[0].fail(new DOMException('Aborted', 'AbortError')); });
  expect(status(container)).toBe('Cancelled');
}));`,
  },
  'react-easy2-latest-search-wins': {
    solution: `import React, { useEffect, useState } from 'react';

const App = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (!query) return;
    // Each run owns its controller; the cleanup below aborts this one.
    const controller = new AbortController();
    fetch('/api/posts?q=' + encodeURIComponent(query), { signal: controller.signal })
      .then((response) => response.json())
      .then((posts) => setResults(posts))
      .catch((error) => {
        // An aborted search is expected; anything else is a real failure.
        if (error.name !== 'AbortError') throw error;
      });
    return () => controller.abort();
  }, [query]);

  return <main>
    <h2>Only the latest search</h2>
    <label>Search <input value={query} onChange={(event) => setQuery(event.target.value)} /></label>
    <ul>
      {results.map((post) => <li key={post.id}>{post.title}</li>)}
    </ul>
  </main>;
};

export default App;`,
    junior: `import React, { useEffect, useState } from 'react';

const App = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (query === '') {
      return;
    }

    const controller = new AbortController();
    const url = '/api/posts?q=' + encodeURIComponent(query);

    fetch(url, { signal: controller.signal })
      .then((response) => {
        return response.json();
      })
      .then((posts) => {
        setResults(posts);
      })
      .catch((error) => {
        if (error.name === 'AbortError') {
          return;
        }
        console.error(error);
      });

    return () => {
      controller.abort();
    };
  }, [query]);

  return (
    <main>
      <h2>Only the latest search</h2>
      <label>Search <input value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <ul>
        {results.map((post) => (
          <li key={post.id}>{post.title}</li>
        ))}
      </ul>
    </main>
  );
};

export default App;`,
    senior: `import React, { useEffect, useState } from 'react';

const searchPosts = async (query, signal) => {
  const response = await fetch('/api/posts?q=' + encodeURIComponent(query), { signal });
  return response.json();
};

const App = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (!query) return undefined;
    const controller = new AbortController();
    searchPosts(query, controller.signal).then(setResults, (error) => {
      if (error.name !== 'AbortError') console.error(error);
    });
    return () => controller.abort();
  }, [query]);

  return (
    <main>
      <h2>Only the latest search</h2>
      <label>Search <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <ul aria-live="polite">
        {results.map((post) => <li key={post.id}>{post.title}</li>)}
      </ul>
    </main>
  );
};

export default App;`,
    hiddenSuite: `test('leaving the page cancels the last request', () => withFetch(async calls => {
  const { unmount } = render(<App />);
  type('z');
  unmount();
  expect(forQuery(calls, 'z').signal.aborted).toBe(true);
}));

test('every request has a controller of its own', () => withFetch(async calls => {
  render(<App />);
  type('a');
  type('ab');
  type('abc');
  const signals = calls.map(call => call.signal);
  expect(new Set(signals).size).toBe(3);
  expect(signals.filter(signal => signal.aborted).length).toBe(2);
}));

test('the answer to the latest query is shown', () => withFetch(async calls => {
  const { container } = render(<App />);
  type('ki');
  await act(async () => { forQuery(calls, 'ki').respond([{ id: 4, title: 'Kiwi' }]); });
  expect(shown(container)).toEqual(['Kiwi']);
}));

// Node reports a rejection nobody handled on process, the browser on window.
const watchRejections = () => {
  const seen = [];
  const node = typeof process !== 'undefined' && typeof process.on === 'function' ? process : null;
  const onNode = reason => { seen.push(reason); };
  const onWindow = event => { seen.push(event.reason); event.preventDefault(); };
  if (node) node.on('unhandledRejection', onNode);
  else window.addEventListener('unhandledrejection', onWindow);
  return {
    seen,
    stop: () => {
      if (node) node.off('unhandledRejection', onNode);
      else window.removeEventListener('unhandledrejection', onWindow);
    },
  };
};

test('a cancelled request leaves no unhandled rejection', () => withFetch(async calls => {
  const rejections = watchRejections();
  try {
    render(<App />);
    type('a');
    type('ab');
    await act(() => new Promise(resolve => setTimeout(resolve, 30)));
    expect(rejections.seen.length).toBe(0);
  } finally {
    rejections.stop();
  }
}));`,
  },

  /* ── accessibility ────────────────────────────────────────────────── */
  'react-easy2-disclosure': {
    solution: `import React, { useId, useState } from 'react';

const App = () => {
  const [open, setOpen] = useState(false);
  // Unique per component, so two disclosures on a page never share an id.
  const detailsId = useId();

  return <main>
    <h2>An accessible disclosure</h2>
    <button type="button" aria-expanded={open} aria-controls={detailsId} onClick={() => setOpen(!open)}>
      Shipping details
    </button>
    {open && <p id={detailsId}>Orders ship within two working days.</p>}
  </main>;
};

export default App;`,
    junior: `import React, { useId, useState } from 'react';

const App = () => {
  const [open, setOpen] = useState(false);
  const detailsId = useId();

  const handleClick = () => {
    if (open) {
      setOpen(false);
    } else {
      setOpen(true);
    }
  };

  let details = null;
  if (open) {
    details = <p id={detailsId}>Orders ship within two working days.</p>;
  }

  return (
    <main>
      <h2>An accessible disclosure</h2>
      <button type="button" aria-expanded={open} aria-controls={detailsId} onClick={handleClick}>
        Shipping details
      </button>
      {details}
    </main>
  );
};

export default App;`,
    senior: `import React, { useId, useState } from 'react';

const Disclosure = ({ label, children }) => {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <>
      <button type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((previous) => !previous)}>
        {label}
      </button>
      {open && <p id={panelId}>{children}</p>}
    </>
  );
};

const App = () => (
  <main>
    <h2>An accessible disclosure</h2>
    <Disclosure label="Shipping details">Orders ship within two working days.</Disclosure>
  </main>
);

export default App;`,
    hiddenSuite: `test('closing again hides the details', () => {
  render(<App />);
  fireEvent.click(toggle());
  fireEvent.click(toggle());
  expect(toggle().getAttribute('aria-expanded')).toBe('false');
  expect(screen.queryByText('Orders ship within two working days.')).toBeNull();
});

test('the button never submits a form', () => {
  render(<App />);
  expect(toggle().getAttribute('type')).toBe('button');
});

test('two disclosures on one page use different ids', () => {
  render(<><App /><App /></>);
  const [first, second] = screen.getAllByRole('button', { name: 'Shipping details' });
  expect(first.getAttribute('aria-controls') === second.getAttribute('aria-controls')).toBe(false);
});`,
  },
  'react-easy2-labelled-field': {
    solution: `import React, { useState } from 'react';

const App = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const save = (event) => {
    event.preventDefault();
    setError(email.trim() ? '' : 'Enter your email');
  };

  return <main>
    <h2>A field that explains its error</h2>
    <form onSubmit={save}>
      <label htmlFor="email">Email</label>
      {/* undefined leaves each attribute out while there is no error. */}
      <input
        id="email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? 'email-error' : undefined}
      />
      {error && <p id="email-error" className="error">{error}</p>}
      <button type="submit">Save</button>
    </form>
  </main>;
};

export default App;`,
    junior: `import React, { useState } from 'react';

const App = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const save = (event) => {
    event.preventDefault();
    if (email.trim() === '') {
      setError('Enter your email');
    } else {
      setError('');
    }
  };

  let invalid = undefined;
  let describedBy = undefined;
  if (error !== '') {
    invalid = 'true';
    describedBy = 'email-error';
  }

  return (
    <main>
      <h2>A field that explains its error</h2>
      <form onSubmit={save}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={invalid}
          aria-describedby={describedBy}
        />
        {error !== '' ? <p id="email-error" className="error">{error}</p> : null}
        <button type="submit">Save</button>
      </form>
    </main>
  );
};

export default App;`,
    senior: `import React, { useId, useState } from 'react';

const App = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const fieldId = useId();
  const errorId = fieldId + '-error';

  const save = (event) => {
    event.preventDefault();
    setError(email.trim() ? '' : 'Enter your email');
  };

  // Spread only when there is something to say, so the valid field stays bare.
  const errorProps = error ? { 'aria-invalid': true, 'aria-describedby': errorId } : {};

  return (
    <main>
      <h2>A field that explains its error</h2>
      <form onSubmit={save} noValidate>
        <label htmlFor={fieldId}>Email</label>
        <input id={fieldId} type="email" value={email} onChange={(event) => setEmail(event.target.value)} {...errorProps} />
        {error && <p id={errorId} className="error">{error}</p>}
        <button type="submit">Save</button>
      </form>
    </main>
  );
};

export default App;`,
    hiddenSuite: `test('a filled field carries neither attribute', () => {
  render(<App />);
  fireEvent.change(field(), { target: { value: 'ana@example.com' } });
  save();
  expect(field().getAttribute('aria-invalid')).toBeNull();
  expect(field().getAttribute('aria-describedby')).toBeNull();
});

test('fixing the field clears the error', () => {
  render(<App />);
  save();
  fireEvent.change(field(), { target: { value: 'ana@example.com' } });
  save();
  expect(screen.queryByText('Enter your email')).toBeNull();
  expect(field().getAttribute('aria-invalid')).toBeNull();
});

test('the label is a label element tied to the input', () => {
  render(<App />);
  const label = screen.getByText('Email');
  expect(label.tagName).toBe('LABEL');
  expect(label.getAttribute('for')).toBe(field().id);
});`,
  },

  /* ── splice ───────────────────────────────────────────────────────── */
  'react-easy2-draw-a-card': {
    solution: `import React, { useState } from 'react';

const startingDeck = [
  { id: 1, name: 'Ace' },
  { id: 2, name: 'King' },
  { id: 3, name: 'Queen' },
  { id: 4, name: 'Jack' },
  { id: 5, name: 'Ten' },
];

const App = ({ cards = startingDeck }) => {
  const [deck, setDeck] = useState(cards);
  const [drawn, setDrawn] = useState(null);

  const draw = (index) => {
    // splice changes the array it is called on, so it works on a copy.
    const next = [...deck];
    const [card] = next.splice(index, 1);
    setDeck(next);
    setDrawn(card);
  };

  return <main>
    <h2>Draw a card</h2>
    {deck.map((card, index) => (
      <button key={card.id} type="button" onClick={() => draw(index)}>{card.name}</button>
    ))}
    {drawn && <p>You drew {drawn.name}</p>}
  </main>;
};

export default App;`,
    junior: `import React, { useState } from 'react';

const startingDeck = [
  { id: 1, name: 'Ace' },
  { id: 2, name: 'King' },
  { id: 3, name: 'Queen' },
  { id: 4, name: 'Jack' },
  { id: 5, name: 'Ten' },
];

const App = ({ cards = startingDeck }) => {
  const [deck, setDeck] = useState(cards);
  const [drawn, setDrawn] = useState(null);

  const draw = (index) => {
    const copy = deck.slice();
    const removed = copy.splice(index, 1);
    const card = removed[0];
    setDeck(copy);
    setDrawn(card);
  };

  return (
    <main>
      <h2>Draw a card</h2>
      {deck.map((card, index) => (
        <button key={card.id} type="button" onClick={() => draw(index)}>{card.name}</button>
      ))}
      {drawn !== null ? <p>You drew {drawn.name}</p> : null}
    </main>
  );
};

export default App;`,
    senior: `import React, { useState } from 'react';

const startingDeck = [
  { id: 1, name: 'Ace' },
  { id: 2, name: 'King' },
  { id: 3, name: 'Queen' },
  { id: 4, name: 'Jack' },
  { id: 5, name: 'Ten' },
];

// Returns the new deck and the card, and leaves the deck it was given alone.
const takeAt = (deck, index) => {
  const rest = [...deck];
  const [card] = rest.splice(index, 1);
  return { rest, card };
};

const App = ({ cards = startingDeck }) => {
  const [deck, setDeck] = useState(cards);
  const [drawn, setDrawn] = useState(null);

  const draw = (index) => {
    const { rest, card } = takeAt(deck, index);
    setDeck(rest);
    setDrawn(card);
  };

  return (
    <main>
      <h2>Draw a card</h2>
      {deck.map((card, index) => (
        <button key={card.id} type="button" onClick={() => draw(index)}>{card.name}</button>
      ))}
      {drawn && <p aria-live="polite">You drew {drawn.name}</p>}
    </main>
  );
};

export default App;`,
    hiddenSuite: `test('the index decides which of two equal names goes', () => {
  const cards = [{ id: 1, name: 'Ace' }, { id: 2, name: 'Two' }, { id: 3, name: 'Ace' }];
  const { container } = render(<App cards={cards} />);
  fireEvent.click(container.querySelectorAll('button')[2]);
  expect(deck(container)).toEqual(['Ace', 'Two']);
});

test('the cards App was given stay as they were', () => {
  const cards = [{ id: 1, name: 'Ace' }, { id: 2, name: 'Two' }];
  render(<App cards={cards} />);
  draw('Ace');
  expect(cards.map(card => card.name)).toEqual(['Ace', 'Two']);
});

test('no card is named before the first draw', () => {
  const { container } = render(<App />);
  expect(container.textContent).not.toContain('You drew');
});`,
  },
  'react-easy2-insert-at-position': {
    solution: `import React, { useState } from 'react';

const startingQueue = ['Ana', 'Ben', 'Cleo'];

const App = () => {
  const [queue, setQueue] = useState(startingQueue);
  const [name, setName] = useState('');
  const [position, setPosition] = useState('1');

  const add = (event) => {
    event.preventDefault();
    // Below 1 means the top: a negative start would count back from the end.
    const index = Math.max(0, Number(position) - 1);
    const next = [...queue];
    next.splice(index, 0, name);
    setQueue(next);
  };

  return <main>
    <h2>Insert at a position</h2>
    <form onSubmit={add}>
      <label>Name <input value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label>Position <input type="number" value={position} onChange={(event) => setPosition(event.target.value)} /></label>
      <button type="submit">Add</button>
    </form>
    <ol>
      {queue.map((person, index) => <li key={index}>{person}</li>)}
    </ol>
  </main>;
};

export default App;`,
    junior: `import React, { useState } from 'react';

const startingQueue = ['Ana', 'Ben', 'Cleo'];

const App = () => {
  const [queue, setQueue] = useState(startingQueue);
  const [name, setName] = useState('');
  const [position, setPosition] = useState('1');

  const add = (event) => {
    event.preventDefault();
    let index = Number(position) - 1;
    if (index < 0) {
      index = 0;
    }
    const next = queue.slice();
    next.splice(index, 0, name);
    setQueue(next);
  };

  return (
    <main>
      <h2>Insert at a position</h2>
      <form onSubmit={add}>
        <label>Name <input value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label>Position <input type="number" value={position} onChange={(event) => setPosition(event.target.value)} /></label>
        <button type="submit">Add</button>
      </form>
      <ol>
        {queue.map((person, index) => (
          <li key={index}>{person}</li>
        ))}
      </ol>
    </main>
  );
};

export default App;`,
    senior: `import React, { useState } from 'react';

const startingQueue = ['Ana', 'Ben', 'Cleo'];

// Positions are 1-based for people and clamped at the top; splice clamps the end itself.
const insertAt = (list, position, item) => {
  const next = [...list];
  next.splice(Math.max(0, position - 1), 0, item);
  return next;
};

const App = () => {
  const [queue, setQueue] = useState(startingQueue);
  const [name, setName] = useState('');
  const [position, setPosition] = useState('1');

  const add = (event) => {
    event.preventDefault();
    setQueue((previous) => insertAt(previous, Number(position) || 1, name));
  };

  return (
    <main>
      <h2>Insert at a position</h2>
      <form onSubmit={add}>
        <label>Name <input value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label>Position <input type="number" value={position} onChange={(event) => setPosition(event.target.value)} /></label>
        <button type="submit">Add</button>
      </form>
      <ol>
        {queue.map((person, index) => <li key={index}>{person}</li>)}
      </ol>
    </main>
  );
};

export default App;`,
    hiddenSuite: `test('a position below 1 goes to the top, not before the last', () => {
  const { container } = render(<App />);
  add('Dan', '0');
  expect(queue(container)).toEqual(['Dan', 'Ana', 'Ben', 'Cleo']);
});

test('two inserts in a row', () => {
  const { container } = render(<App />);
  add('Dan', '2');
  add('Eve', '1');
  expect(queue(container)).toEqual(['Eve', 'Ana', 'Dan', 'Ben', 'Cleo']);
});

test('the starting queue is left alone for the next visit', () => {
  const first = render(<App />);
  add('Dan', '2');
  first.unmount();
  const { container } = render(<App />);
  expect(queue(container)).toEqual(['Ana', 'Ben', 'Cleo']);
});`,
  },
  'react-easy2-take-a-seat': {
    solution: `import React, { useState } from 'react';

const startingRow = [null, 'Ana', null, 'Ben'];

const App = () => {
  const [seats, setSeats] = useState(startingRow);
  // Worked out from the row, so it can never disagree with it.
  const seated = seats.includes('You');

  const take = (index) => {
    const next = [...seats];
    // Remove one, insert one: the row keeps its length and its order.
    next.splice(index, 1, 'You');
    setSeats(next);
  };

  return <main>
    <h2>Take a seat</h2>
    <ol>
      {seats.map((person, index) => (
        <li key={index}>
          {person
            ? 'Seat ' + (index + 1) + ': ' + person
            : <button type="button" disabled={seated} onClick={() => take(index)}>Take seat {index + 1}</button>}
        </li>
      ))}
    </ol>
  </main>;
};

export default App;`,
    junior: `import React, { useState } from 'react';

const startingRow = [null, 'Ana', null, 'Ben'];

const App = () => {
  const [seats, setSeats] = useState(startingRow);

  let seated = false;
  for (const person of seats) {
    if (person === 'You') {
      seated = true;
    }
  }

  const take = (index) => {
    const copy = seats.slice();
    copy.splice(index, 1, 'You');
    setSeats(copy);
  };

  return (
    <main>
      <h2>Take a seat</h2>
      <ol>
        {seats.map((person, index) => {
          if (person !== null) {
            return <li key={index}>{'Seat ' + (index + 1) + ': ' + person}</li>;
          }
          return (
            <li key={index}>
              <button type="button" disabled={seated} onClick={() => take(index)}>Take seat {index + 1}</button>
            </li>
          );
        })}
      </ol>
    </main>
  );
};

export default App;`,
    senior: `import React, { useState } from 'react';

const startingRow = [null, 'Ana', null, 'Ben'];
const YOU = 'You';

const replaceAt = (list, index, item) => {
  const next = [...list];
  next.splice(index, 1, item);
  return next;
};

const App = () => {
  const [seats, setSeats] = useState(startingRow);
  const seated = seats.includes(YOU);

  return (
    <main>
      <h2>Take a seat</h2>
      <ol>
        {seats.map((person, index) => (
          // A seat is a fixed place in the row, so its index is a stable key.
          <li key={index}>
            {person ? (
              'Seat ' + (index + 1) + ': ' + person
            ) : (
              <button type="button" disabled={seated} onClick={() => setSeats((previous) => replaceAt(previous, index, YOU))}>
                Take seat {index + 1}
              </button>
            )}
          </li>
        ))}
      </ol>
    </main>
  );
};

export default App;`,
    hiddenSuite: `test('taking seat 1 keeps four seats in their places', () => {
  const { container } = render(<App />);
  fireEvent.click(seat(1));
  expect(row(container)).toEqual(['Seat 1: You', 'Seat 2: Ana', 'Take seat 3', 'Seat 4: Ben']);
  expect(seat(3).disabled).toBe(true);
});

test('no seat is disabled before you sit', () => {
  render(<App />);
  expect(seat(1).disabled).toBe(false);
  expect(seat(3).disabled).toBe(false);
});

test('the starting row is left alone for the next visit', () => {
  const first = render(<App />);
  fireEvent.click(seat(3));
  first.unmount();
  const { container } = render(<App />);
  expect(row(container)).toEqual(['Take seat 1', 'Seat 2: Ana', 'Take seat 3', 'Seat 4: Ben']);
});`,
  },
};
