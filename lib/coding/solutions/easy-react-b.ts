// Server-only reference solutions and hidden cases for lib/coding/tasks/easy-react-b.ts.
// Never import from client code. Each `hiddenSuite` is test blocks only: the
// server appends it to the visible suite (lib/coding/react-hidden.ts), so it
// uses that suite's imports and helpers. The hidden cases aim at the shortcut
// each visible suite leaves open: a value read once, a hard-coded line, a
// mutated prop, a timer or listener left behind, and the edge the technique
// exists for.

import type { CodingSolution } from '../types';

export const EASY_REACT_B_SOLUTIONS: Record<string, CodingSolution> = {
  /* ── useRef ───────────────────────────────────────────────────────── */
  'react-easy3-send-latest-draft': {
    solution: `import React, { useRef, useState } from 'react';

const App = () => {
  const [draft, setDraft] = useState('');
  const [sent, setSent] = useState('');
  // Every render shares this one object, so the timeout can read what was typed after the click.
  const draftRef = useRef('');

  const change = (event) => {
    setDraft(event.target.value);
    draftRef.current = event.target.value;
  };

  const sendLater = () => {
    // draft would be the text of the render that made this handler; the ref holds the text now.
    setTimeout(() => setSent(draftRef.current), 300);
  };

  return <main>
    <h2>Send the latest draft</h2>
    <label>Message <input value={draft} onChange={change} /></label>
    <button type="button" onClick={sendLater}>Send later</button>
    <p>{sent ? 'Sent: ' + sent : ''}</p>
  </main>;
};

export default App;`,
    junior: `import React, { useRef, useState } from 'react';

const App = () => {
  const [draft, setDraft] = useState('');
  const [sent, setSent] = useState('');
  const draftRef = useRef('');

  const change = (event) => {
    const value = event.target.value;
    setDraft(value);
    draftRef.current = value;
  };

  const sendLater = () => {
    setTimeout(() => {
      const latest = draftRef.current;
      setSent(latest);
    }, 300);
  };

  let message = '';
  if (sent !== '') {
    message = 'Sent: ' + sent;
  }

  return (
    <main>
      <h2>Send the latest draft</h2>
      <label>Message <input value={draft} onChange={change} /></label>
      <button type="button" onClick={sendLater}>Send later</button>
      <p>{message}</p>
    </main>
  );
};

export default App;`,
    senior: `import React, { useEffect, useRef, useState } from 'react';

const SEND_DELAY_MS = 300;

const App = () => {
  const [draft, setDraft] = useState('');
  const [sent, setSent] = useState('');
  const draftRef = useRef(draft);
  const pendingRef = useRef(new Set());

  // Sends still waiting when the page closes go with it.
  useEffect(() => {
    const pending = pendingRef.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const change = (event) => {
    draftRef.current = event.target.value;
    setDraft(event.target.value);
  };

  const sendLater = () => {
    const id = setTimeout(() => {
      pendingRef.current.delete(id);
      setSent(draftRef.current);
    }, SEND_DELAY_MS);
    pendingRef.current.add(id);
  };

  return (
    <main>
      <h2>Send the latest draft</h2>
      <label>Message <input value={draft} onChange={change} /></label>
      <button type="button" onClick={sendLater}>Send later</button>
      <p>{sent && 'Sent: ' + sent}</p>
    </main>
  );
};

export default App;`,
    hiddenSuite: `test('every change reaches the ref, not only the first', async () => {
  const { container } = render(<App />);
  type('a');
  send();
  type('ab');
  type('abc');
  await wait(500);
  expect(line(container)).toBe('Sent: abc');
});

test('a field emptied during the wait sends nothing', async () => {
  const { container } = render(<App />);
  type('Hi');
  send();
  type('');
  await wait(500);
  expect(line(container)).toBe('');
});

test('text typed after a send waits for the next one', async () => {
  const { container } = render(<App />);
  type('first');
  send();
  await wait(500);
  type('second');
  expect(line(container)).toBe('Sent: first');
  send();
  await wait(500);
  expect(line(container)).toBe('Sent: second');
});`,
  },
  'react-easy3-give-focus-back': {
    solution: `import React, { useRef, useState } from 'react';

const App = () => {
  const [name, setName] = useState('Reef survey');
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(false);
  // The Rename button stays on the page, so this ref is always set.
  const renameRef = useRef(null);

  const open = () => {
    setDraft(name);
    setEditing(true);
  };

  const close = () => {
    setEditing(false);
    // The field is about to leave the page; hand the focus back to where the user started.
    renameRef.current.focus();
  };

  const save = (event) => {
    event.preventDefault();
    setName(draft);
    close();
  };

  // Key presses from the field and from both buttons bubble up to the form.
  const closeOnEscape = (event) => {
    if (event.key === 'Escape') close();
  };

  return <main>
    <h2>Give the focus back</h2>
    <p>Project: {name}</p>
    <button type="button" ref={renameRef} onClick={open}>Rename</button>
    {editing && (
      <form onSubmit={save} onKeyDown={closeOnEscape}>
        <label>New name <input autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} /></label>
        <button type="submit">Save</button>
        <button type="button" onClick={close}>Cancel</button>
      </form>
    )}
  </main>;
};

export default App;`,
    junior: `import React, { useRef, useState } from 'react';

const App = () => {
  const [name, setName] = useState('Reef survey');
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(false);
  const renameRef = useRef(null);

  const open = () => {
    setDraft(name);
    setEditing(true);
  };

  const close = () => {
    setEditing(false);
    const button = renameRef.current;
    if (button) {
      button.focus();
    }
  };

  const save = (event) => {
    event.preventDefault();
    setName(draft);
    close();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      close();
    }
  };

  const handleChange = (event) => {
    setDraft(event.target.value);
  };

  return (
    <main>
      <h2>Give the focus back</h2>
      <p>Project: {name}</p>
      <button type="button" ref={renameRef} onClick={open}>Rename</button>
      {editing && (
        <form onSubmit={save} onKeyDown={handleKeyDown}>
          <label>New name <input autoFocus value={draft} onChange={handleChange} /></label>
          <button type="submit">Save</button>
          <button type="button" onClick={close}>Cancel</button>
        </form>
      )}
    </main>
  );
};

export default App;`,
    senior: `import React, { useRef, useState } from 'react';

const App = () => {
  const [name, setName] = useState('Reef survey');
  const [draft, setDraft] = useState(null);
  const renameRef = useRef(null);
  const editing = draft !== null;

  // One way out of the form, whichever control the user leaves by.
  const close = () => {
    setDraft(null);
    renameRef.current?.focus();
  };

  const save = (event) => {
    event.preventDefault();
    setName(draft);
    close();
  };

  return (
    <main>
      <h2>Give the focus back</h2>
      <p>Project: {name}</p>
      <button type="button" ref={renameRef} onClick={() => setDraft(name)}>Rename</button>
      {editing && (
        <form onSubmit={save} onKeyDown={(event) => event.key === 'Escape' && close()}>
          <label>New name <input autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} /></label>
          <button type="submit">Save</button>
          <button type="button" onClick={close}>Cancel</button>
        </form>
      )}
    </main>
  );
};

export default App;`,
    hiddenSuite: `test('Escape closes the form and gives the focus back', () => {
  render(<App />);
  fireEvent.click(rename());
  fireEvent.keyDown(field(), { key: 'Escape' });
  expect(field()).toBe(null);
  expect(document.activeElement).toBe(rename());
});

test('Escape keeps the old name', () => {
  const { container } = render(<App />);
  fireEvent.click(rename());
  fireEvent.change(field(), { target: { value: 'Kelp count' } });
  fireEvent.keyDown(field(), { key: 'Escape' });
  expect(container.querySelector('p').textContent).toBe('Project: Reef survey');
});

test('other keys leave the form open', () => {
  render(<App />);
  fireEvent.click(rename());
  fireEvent.keyDown(field(), { key: 'a' });
  expect(field()).toBeTruthy();
});

test('Escape on the Cancel button closes the form too', () => {
  render(<App />);
  fireEvent.click(rename());
  fireEvent.keyDown(screen.getByRole('button', { name: 'Cancel' }), { key: 'Escape' });
  expect(field()).toBe(null);
  expect(document.activeElement).toBe(rename());
});`,
  },

  /* ── custom hooks ─────────────────────────────────────────────────── */
  'react-easy3-use-outside-click': {
    solution: `import React, { useEffect, useRef, useState } from 'react';

export const useOutsideClick = (ref, onOutside) => {
  useEffect(() => {
    const onMouseDown = (event) => {
      // contains() is true for the element itself and for everything inside it.
      if (ref.current && !ref.current.contains(event.target)) onOutside();
    };
    document.addEventListener('mousedown', onMouseDown);
    // The same function goes to removeEventListener, or nothing would be removed.
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [ref, onOutside]);
};

const App = () => {
  const [open, setOpen] = useState(false);
  // On the wrapper, so a press on Filters counts as inside and the button's own click can toggle.
  const filtersRef = useRef(null);
  useOutsideClick(filtersRef, () => setOpen(false));

  return <main>
    <h2>A useOutsideClick hook</h2>
    <div className="filters" ref={filtersRef}>
      <button type="button" aria-expanded={open} onClick={() => setOpen((previous) => !previous)}>Filters</button>
      {open && (
        <fieldset>
          <legend>Show</legend>
          <label><input type="checkbox" /> In stock</label>
          <label><input type="checkbox" /> On sale</label>
        </fieldset>
      )}
    </div>
    <p>12 results</p>
  </main>;
};

export default App;`,
    junior: `import React, { useEffect, useRef, useState } from 'react';

export function useOutsideClick(ref, onOutside) {
  useEffect(() => {
    function handleMouseDown(event) {
      const element = ref.current;
      if (element === null) {
        return;
      }
      const clickedInside = element.contains(event.target);
      if (!clickedInside) {
        onOutside();
      }
    }

    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [ref, onOutside]);
}

const App = () => {
  const [open, setOpen] = useState(false);
  const filtersRef = useRef(null);

  const close = () => {
    setOpen(false);
  };

  useOutsideClick(filtersRef, close);

  const toggle = () => {
    setOpen((previous) => !previous);
  };

  return (
    <main>
      <h2>A useOutsideClick hook</h2>
      <div className="filters" ref={filtersRef}>
        <button type="button" aria-expanded={open} onClick={toggle}>Filters</button>
        {open && (
          <fieldset>
            <legend>Show</legend>
            <label><input type="checkbox" /> In stock</label>
            <label><input type="checkbox" /> On sale</label>
          </fieldset>
        )}
      </div>
      <p>12 results</p>
    </main>
  );
};

export default App;`,
    senior: `import React, { useEffect, useRef, useState } from 'react';

export const useOutsideClick = (ref, onOutside) => {
  // The newest handler lives in a ref, so an inline arrow does not re-subscribe on every render.
  const handlerRef = useRef(onOutside);
  useEffect(() => {
    handlerRef.current = onOutside;
  });

  useEffect(() => {
    const onMouseDown = ({ target }) => {
      const element = ref.current;
      if (element && !element.contains(target)) handlerRef.current();
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [ref]);
};

const App = () => {
  const [open, setOpen] = useState(false);
  const filtersRef = useRef(null);
  useOutsideClick(filtersRef, () => setOpen(false));

  return (
    <main>
      <h2>A useOutsideClick hook</h2>
      <div className="filters" ref={filtersRef}>
        <button type="button" aria-expanded={open} onClick={() => setOpen((previous) => !previous)}>Filters</button>
        {open && (
          <fieldset>
            <legend>Show</legend>
            <label><input type="checkbox" /> In stock</label>
            <label><input type="checkbox" /> On sale</label>
          </fieldset>
        )}
      </div>
      <p>12 results</p>
    </main>
  );
};

export default App;`,
    hiddenSuite: `test('the Filters button still closes the panel', () => {
  render(<App />);
  toggle();
  fireEvent.mouseDown(screen.getByRole('button', { name: 'Filters' }));
  toggle();
  expect(isOpen()).toBe(false);
});

test('the hook calls onOutside only for presses outside its element', () => {
  let outside = 0;
  const Probe = () => {
    const ref = React.useRef(null);
    useOutsideClick(ref, () => { outside += 1; });
    return <div><p ref={ref}>inside <b>deep</b></p><p>elsewhere</p></div>;
  };
  render(<Probe />);
  fireEvent.mouseDown(screen.getByText('deep'));
  expect(outside).toBe(0);
  fireEvent.mouseDown(screen.getByText('elsewhere'));
  expect(outside).toBe(1);
});

test('leaving the page removes the listener it added', () => {
  // React empties ref.current on unmount, so a listener left behind would stay
  // quiet in a click test. Watch document and window instead: every mousedown
  // listener the hook added is removed, or was added with a signal that is now
  // aborted.
  const targets = [document, window];
  const real = targets.map(target => [target.addEventListener, target.removeEventListener]);
  const added = [];
  const removed = [];
  targets.forEach((target, index) => {
    const [realAdd, realRemove] = real[index];
    target.addEventListener = function (type, listener, options) {
      if (type === 'mousedown') added.push({ listener, options });
      return realAdd.call(this, type, listener, options);
    };
    target.removeEventListener = function (type, listener, options) {
      if (type === 'mousedown') removed.push(listener);
      return realRemove.call(this, type, listener, options);
    };
  });
  try {
    const Probe = () => {
      const ref = React.useRef(null);
      useOutsideClick(ref, () => {});
      return <p ref={ref}>inside</p>;
    };
    const { unmount } = render(<Probe />);
    expect(added.length > 0).toBe(true);
    unmount();
    const gone = one => removed.includes(one.listener) || Boolean(one.options && one.options.signal && one.options.signal.aborted);
    expect(added.every(gone)).toBe(true);
  } finally {
    targets.forEach((target, index) => {
      target.addEventListener = real[index][0];
      target.removeEventListener = real[index][1];
    });
  }
});`,
  },
  'react-easy3-use-theme-guard': {
    solution: `import React, { createContext, useContext, useState } from 'react';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('dark');
  const toggle = () => setTheme((previous) => (previous === 'dark' ? 'light' : 'dark'));
  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const value = useContext(ThemeContext);
  // null is the createContext default: no ThemeProvider sits above the caller.
  if (value === null) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return value;
};

export const Badge = () => {
  const { theme, toggle } = useTheme();
  return <>
    <p>Theme: {theme}</p>
    <button type="button" onClick={toggle}>Switch theme</button>
  </>;
};

const App = () => (
  <ThemeProvider>
    <main>
      <h2>A useTheme hook with a guard</h2>
      <Badge />
    </main>
  </ThemeProvider>
);

export default App;`,
    junior: `import React, { createContext, useContext, useState } from 'react';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('dark');

  const toggle = () => {
    setTheme((previous) => {
      if (previous === 'dark') {
        return 'light';
      }
      return 'dark';
    });
  };

  const value = { theme: theme, toggle: toggle };
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme() {
  const value = useContext(ThemeContext);
  if (value === null) {
    const error = new Error('useTheme must be used inside ThemeProvider');
    throw error;
  }
  return value;
}

export const Badge = () => {
  const value = useTheme();
  const theme = value.theme;
  const toggle = value.toggle;

  return (
    <>
      <p>Theme: {theme}</p>
      <button type="button" onClick={toggle}>Switch theme</button>
    </>
  );
};

const App = () => {
  return (
    <ThemeProvider>
      <main>
        <h2>A useTheme hook with a guard</h2>
        <Badge />
      </main>
    </ThemeProvider>
  );
};

export default App;`,
    senior: `import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('dark');
  const toggle = useCallback(() => setTheme((previous) => (previous === 'dark' ? 'light' : 'dark')), []);
  // A new object on every render would re-render every consumer; this one changes with the theme only.
  const value = useMemo(() => ({ theme, toggle }), [theme, toggle]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
};

export const Badge = () => {
  const { theme, toggle } = useTheme();
  return (
    <>
      <p>Theme: {theme}</p>
      <button type="button" onClick={toggle}>Switch theme</button>
    </>
  );
};

const App = () => (
  <ThemeProvider>
    <main>
      <h2>A useTheme hook with a guard</h2>
      <Badge />
    </main>
  </ThemeProvider>
);

export default App;`,
    hiddenSuite: `test('Badge outside the provider throws the same error', () => {
  const Probe = () => <output>{message(() => Badge())}</output>;
  const { container } = render(<Probe />);
  expect(container.textContent).toBe('useTheme must be used inside ThemeProvider');
});

test('the guard throws an Error object', () => {
  let thrown = null;
  const Probe = () => {
    try {
      useTheme();
    } catch (error) {
      thrown = error;
    }
    return null;
  };
  render(<Probe />);
  expect(thrown instanceof Error).toBe(true);
});

test('the value carries toggle as well', () => {
  const Probe = () => {
    const { theme, toggle } = useTheme();
    return <button type="button" onClick={toggle}>{theme}</button>;
  };
  render(<ThemeProvider><Probe /></ThemeProvider>);
  fireEvent.click(screen.getByRole('button'));
  expect(screen.getByRole('button').textContent).toBe('light');
});`,
  },
  'react-easy3-use-interval': {
    solution: `import React, { useEffect, useRef, useState } from 'react';

export const useInterval = (callback, delay) => {
  const callbackRef = useRef(callback);

  // After every render, remember the newest callback without touching the timer.
  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    // A null delay is the pause: no interval at all.
    if (delay === null) return undefined;
    const id = setInterval(() => callbackRef.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
};

const App = () => {
  const [count, setCount] = useState(0);
  const [running, setRunning] = useState(true);

  useInterval(() => setCount((previous) => previous + 1), running ? 100 : null);

  return <main>
    <h2>A useInterval hook</h2>
    <p>{count}</p>
    <button type="button" onClick={() => setRunning((previous) => !previous)}>{running ? 'Pause' : 'Resume'}</button>
  </main>;
};

export default App;`,
    junior: `import React, { useEffect, useRef, useState } from 'react';

export function useInterval(callback, delay) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    if (delay === null) {
      return;
    }

    function tick() {
      const latest = callbackRef.current;
      latest();
    }

    const id = setInterval(tick, delay);

    return () => {
      clearInterval(id);
    };
  }, [delay]);
}

const App = () => {
  const [count, setCount] = useState(0);
  const [running, setRunning] = useState(true);

  let delay = null;
  if (running) {
    delay = 100;
  }

  useInterval(() => {
    setCount((previous) => previous + 1);
  }, delay);

  const toggle = () => {
    setRunning((previous) => !previous);
  };

  let label = 'Resume';
  if (running) {
    label = 'Pause';
  }

  return (
    <main>
      <h2>A useInterval hook</h2>
      <p>{count}</p>
      <button type="button" onClick={toggle}>{label}</button>
    </main>
  );
};

export default App;`,
    senior: `import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

const TICK_MS = 100;

export const useInterval = (callback, delay) => {
  const savedCallback = useRef(callback);

  // A layout effect puts the newest callback in place before any timer can fire.
  useLayoutEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay == null) return undefined;
    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
};

const App = () => {
  const [count, setCount] = useState(0);
  const [running, setRunning] = useState(true);

  useInterval(() => setCount((previous) => previous + 1), running ? TICK_MS : null);

  return (
    <main>
      <h2>A useInterval hook</h2>
      <p>{count}</p>
      <button type="button" onClick={() => setRunning((previous) => !previous)}>
        {running ? 'Pause' : 'Resume'}
      </button>
    </main>
  );
};

export default App;`,
    hiddenSuite: `test('a new callback on every render keeps the timer going', async () => {
  let ticks = 0;
  const Probe = ({ n }) => {
    useInterval(() => { ticks += 1; }, 100);
    return <p>{n}</p>;
  };
  const { rerender } = render(<Probe n={0} />);
  for (let n = 1; n <= 12; n += 1) {
    await wait(30);
    rerender(<Probe n={n} />);
  }
  await wait(30);
  expect(ticks > 0).toBe(true);
});

test('the tick calls the latest callback', async () => {
  const seen = [];
  const Probe = ({ label }) => {
    useInterval(() => { seen.push(label); }, 60);
    return null;
  };
  const { rerender } = render(<Probe label="first" />);
  rerender(<Probe label="second" />);
  await waitFor(() => expect(seen.length > 0).toBe(true), { timeout: 2000 });
  expect(seen[0]).toBe('second');
});

test('a null delay starts no interval', async () => {
  let ticks = 0;
  const Probe = () => {
    useInterval(() => { ticks += 1; }, null);
    return null;
  };
  render(<Probe />);
  await wait(250);
  expect(ticks).toBe(0);
});

test('leaving the page stops the ticks', async () => {
  let ticks = 0;
  const Probe = () => {
    useInterval(() => { ticks += 1; }, 50);
    return null;
  };
  const { unmount } = render(<Probe />);
  unmount();
  await wait(250);
  expect(ticks).toBe(0);
});`,
  },

  /* ── abort ────────────────────────────────────────────────────────── */
  'react-easy3-slow-request-timeout': {
    solution: `import React, { useState } from 'react';

const App = () => {
  const [status, setStatus] = useState('');

  const load = async () => {
    setStatus('Loading…');
    // A controller aborts once, so every load gets its own.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 300);
    try {
      const response = await fetch('/api/users/1', { signal: controller.signal });
      const user = await response.json();
      setStatus('Hello, ' + user.name);
    } catch (error) {
      // The timeout's abort rejects fetch with an AbortError; anything else is a real failure.
      setStatus(error.name === 'AbortError' ? 'The server is taking too long' : 'Could not load the user');
    } finally {
      // A load that finished in time must not be aborted later.
      clearTimeout(timer);
    }
  };

  return <main>
    <h2>Give up on a slow request</h2>
    <button type="button" onClick={load}>Load</button>
    <p>{status}</p>
  </main>;
};

export default App;`,
    junior: `import React, { useState } from 'react';

const App = () => {
  const [status, setStatus] = useState('');

  const load = async () => {
    setStatus('Loading…');
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, 300);

    try {
      const options = { signal: controller.signal };
      const response = await fetch('/api/users/1', options);
      const user = await response.json();
      clearTimeout(timer);
      setStatus('Hello, ' + user.name);
    } catch (error) {
      clearTimeout(timer);
      if (error.name === 'AbortError') {
        setStatus('The server is taking too long');
      } else {
        setStatus('Could not load the user');
      }
    }
  };

  return (
    <main>
      <h2>Give up on a slow request</h2>
      <button type="button" onClick={load}>Load</button>
      <p>{status}</p>
    </main>
  );
};

export default App;`,
    senior: `import React, { useState } from 'react';

const TIMEOUT_MS = 300;

// Resolves with the JSON body, or rejects with an AbortError once ms have passed.
const fetchJsonWithin = async (url, ms) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
};

const App = () => {
  const [status, setStatus] = useState('');

  const load = async () => {
    setStatus('Loading…');
    try {
      const user = await fetchJsonWithin('/api/users/1', TIMEOUT_MS);
      setStatus('Hello, ' + user.name);
    } catch (error) {
      setStatus(error.name === 'AbortError' ? 'The server is taking too long' : 'Could not load the user');
    }
  };

  return (
    <main>
      <h2>Give up on a slow request</h2>
      <button type="button" onClick={load}>Load</button>
      <p>{status}</p>
    </main>
  );
};

export default App;`,
    hiddenSuite: `test('a quick answer is not aborted afterwards', () => withFetch(async calls => {
  const { container } = render(<App />);
  load();
  await act(async () => { calls[0].respond({ name: 'Ada' }); });
  await wait(500);
  expect(calls[0].signal.aborted).toBe(false);
  expect(status(container)).toBe('Hello, Ada');
}));

test('another failure keeps its own message', () => withFetch(async calls => {
  const { container } = render(<App />);
  load();
  await act(async () => { calls[0].fail(new TypeError('Failed to fetch')); });
  expect(status(container)).toBe('Could not load the user');
}));

test('a second load gets a controller of its own', () => withFetch(async calls => {
  const { container } = render(<App />);
  load();
  await wait(500);
  load();
  expect(calls[1].signal.aborted).toBe(false);
  await act(async () => { calls[1].respond({ name: 'Grace' }); });
  expect(status(container)).toBe('Hello, Grace');
}));

test('an answer after the give-up changes nothing', () => withFetch(async calls => {
  const { container } = render(<App />);
  load();
  await wait(500);
  await act(async () => { calls[0].respond({ name: 'Ada' }); });
  expect(status(container)).toBe('The server is taking too long');
}));`,
  },
  'react-easy3-one-stop-two-requests': {
    solution: `import React, { useRef, useState } from 'react';

const App = () => {
  const [status, setStatus] = useState('');
  const controllerRef = useRef(null);

  const load = async () => {
    // One controller for this load; its signal goes to both requests.
    const controller = new AbortController();
    controllerRef.current = controller;
    setStatus('Loading…');
    try {
      const [user, posts] = await Promise.all([
        fetch('/api/users/1', { signal: controller.signal }).then((response) => response.json()),
        fetch('/api/posts?userId=1', { signal: controller.signal }).then((response) => response.json()),
      ]);
      setStatus(user.name + ', ' + posts.length + ' posts');
    } catch (error) {
      setStatus(error.name === 'AbortError' ? 'Stopped' : 'Could not load');
    }
  };

  const stop = () => {
    // One abort rejects every request that carries this signal.
    controllerRef.current?.abort();
  };

  return <main>
    <h2>One Stop for two requests</h2>
    <button type="button" onClick={load}>Load</button>
    <button type="button" onClick={stop}>Stop</button>
    <p>{status}</p>
  </main>;
};

export default App;`,
    junior: `import React, { useRef, useState } from 'react';

const App = () => {
  const [status, setStatus] = useState('');
  const controllerRef = useRef(null);

  const load = async () => {
    const controller = new AbortController();
    controllerRef.current = controller;
    const signal = controller.signal;
    setStatus('Loading…');

    try {
      const userRequest = fetch('/api/users/1', { signal: signal }).then((response) => response.json());
      const postsRequest = fetch('/api/posts?userId=1', { signal: signal }).then((response) => response.json());
      const results = await Promise.all([userRequest, postsRequest]);
      const user = results[0];
      const posts = results[1];
      setStatus(user.name + ', ' + posts.length + ' posts');
    } catch (error) {
      if (error.name === 'AbortError') {
        setStatus('Stopped');
      } else {
        setStatus('Could not load');
      }
    }
  };

  const stop = () => {
    if (controllerRef.current !== null) {
      controllerRef.current.abort();
    }
  };

  return (
    <main>
      <h2>One Stop for two requests</h2>
      <button type="button" onClick={load}>Load</button>
      <button type="button" onClick={stop}>Stop</button>
      <p>{status}</p>
    </main>
  );
};

export default App;`,
    senior: `import React, { useRef, useState } from 'react';

const App = () => {
  const [status, setStatus] = useState('');
  const controllerRef = useRef(null);

  const load = async () => {
    controllerRef.current = new AbortController();
    const { signal } = controllerRef.current;
    const getJson = (url) => fetch(url, { signal }).then((response) => response.json());

    setStatus('Loading…');
    try {
      const [user, posts] = await Promise.all([getJson('/api/users/1'), getJson('/api/posts?userId=1')]);
      setStatus(user.name + ', ' + posts.length + ' posts');
    } catch (error) {
      setStatus(error.name === 'AbortError' ? 'Stopped' : 'Could not load');
    }
  };

  return (
    <main>
      <h2>One Stop for two requests</h2>
      <button type="button" onClick={load}>Load</button>
      <button type="button" onClick={() => controllerRef.current?.abort()}>Stop</button>
      <p>{status}</p>
    </main>
  );
};

export default App;`,
    hiddenSuite: `test('Stop after one answer still cancels the other', () => withFetch(async calls => {
  const { container } = render(<App />);
  press('Load');
  await act(async () => { forUrl(calls, '/api/users/1').respond({ name: 'Ada' }); });
  await act(async () => { press('Stop'); });
  expect(forUrl(calls, '/api/posts?userId=1').signal.aborted).toBe(true);
  expect(status(container)).toBe('Stopped');
}));

test('another failure is not a stop', () => withFetch(async calls => {
  const { container } = render(<App />);
  press('Load');
  await act(async () => { forUrl(calls, '/api/posts?userId=1').fail(new TypeError('Failed to fetch')); });
  expect(status(container)).toBe('Could not load');
}));

test('each load gets a signal of its own', () => withFetch(async calls => {
  const { container } = render(<App />);
  press('Load');
  await act(async () => { press('Stop'); });
  press('Load');
  const later = calls.slice(2);
  expect(later.length).toBe(2);
  expect(later[0].signal === calls[0].signal).toBe(false);
  expect(later[0].signal.aborted).toBe(false);
  await act(async () => {
    forUrl(later, '/api/users/1').respond({ name: 'Grace' });
    forUrl(later, '/api/posts?userId=1').respond([{ id: 4 }, { id: 5 }]);
  });
  expect(status(container)).toBe('Grace, 2 posts');
}));`,
  },
  'react-easy3-listeners-one-abort': {
    solution: `import React, { useEffect, useState } from 'react';

const App = () => {
  const [device, setDevice] = useState('none');

  useEffect(() => {
    const controller = new AbortController();
    // Both listeners carry the same signal, so one abort removes both.
    const options = { signal: controller.signal };
    window.addEventListener('keydown', () => setDevice('keyboard'), options);
    window.addEventListener('mousemove', () => setDevice('mouse'), options);
    return () => controller.abort();
  }, []);

  return <main>
    <h2>Remove listeners with one abort</h2>
    <p>Last input: {device}</p>
  </main>;
};

export default App;`,
    junior: `import React, { useEffect, useState } from 'react';

const App = () => {
  const [device, setDevice] = useState('none');

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    function handleKeyDown() {
      setDevice('keyboard');
    }

    function handleMouseMove() {
      setDevice('mouse');
    }

    window.addEventListener('keydown', handleKeyDown, { signal: signal });
    window.addEventListener('mousemove', handleMouseMove, { signal: signal });

    return () => {
      controller.abort();
    };
  }, []);

  return (
    <main>
      <h2>Remove listeners with one abort</h2>
      <p>Last input: {device}</p>
    </main>
  );
};

export default App;`,
    senior: `import React, { useEffect, useState } from 'react';

const DEVICE_FOR_EVENT = { keydown: 'keyboard', mousemove: 'mouse' };

const App = () => {
  const [device, setDevice] = useState('none');

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    for (const [type, name] of Object.entries(DEVICE_FOR_EVENT)) {
      window.addEventListener(type, () => setDevice(name), { signal });
    }
    return () => controller.abort();
  }, []);

  return (
    <main>
      <h2>Remove listeners with one abort</h2>
      <p>Last input: {device}</p>
    </main>
  );
};

export default App;`,
    hiddenSuite: `test('leaving the page aborts the shared signal', () => {
  const added = watchWindowListeners();
  try {
    const { unmount } = render(<App />);
    const signal = added[0].options.signal;
    expect(signal.aborted).toBe(false);
    unmount();
    expect(signal.aborted).toBe(true);
  } finally {
    added.restore();
  }
});

test('the listeners are added once, not on every render', () => {
  const added = watchWindowListeners();
  try {
    render(<App />);
    fireEvent.keyDown(window, { key: 'a' });
    fireEvent.mouseMove(window);
    fireEvent.keyDown(window, { key: 'b' });
    expect(added.length).toBe(2);
  } finally {
    added.restore();
  }
});

test('the status starts at none and follows the latest input', () => {
  const { container } = render(<App />);
  expect(line(container)).toBe('Last input: none');
  fireEvent.mouseMove(window);
  fireEvent.keyDown(window, { key: 'Enter' });
  expect(line(container)).toBe('Last input: keyboard');
});`,
  },

  /* ── pagination ───────────────────────────────────────────────────── */
  'react-easy3-results-line': {
    solution: `import React, { useState } from 'react';

const allRecipes = ['Pancakes', 'Omelette', 'Risotto', 'Chili', 'Ramen', 'Paella', 'Curry', 'Tacos', 'Gnocchi', 'Falafel'];
const PAGE_SIZE = 4;

const App = ({ recipes = allRecipes }) => {
  const [page, setPage] = useState(1);
  const start = (page - 1) * PAGE_SIZE;
  // Everything below comes from page and recipes, so it can never disagree with them.
  const pageCount = Math.ceil(recipes.length / PAGE_SIZE);
  const first = start + 1;
  // The last page can be short: stop at the last recipe.
  const last = Math.min(page * PAGE_SIZE, recipes.length);
  const line = recipes.length === 0
    ? 'No recipes'
    : 'Showing ' + first + ' to ' + last + ' of ' + recipes.length + ' recipes';

  return <main>
    <h2>The results line</h2>
    <ul>
      {recipes.slice(start, start + PAGE_SIZE).map((recipe) => <li key={recipe}>{recipe}</li>)}
    </ul>
    <p>{line}</p>
    <button type="button" disabled={page <= 1} onClick={() => setPage((previous) => previous - 1)}>Previous</button>
    <button type="button" disabled={page >= pageCount} onClick={() => setPage((previous) => previous + 1)}>Next</button>
  </main>;
};

export default App;`,
    junior: `import React, { useState } from 'react';

const allRecipes = ['Pancakes', 'Omelette', 'Risotto', 'Chili', 'Ramen', 'Paella', 'Curry', 'Tacos', 'Gnocchi', 'Falafel'];
const PAGE_SIZE = 4;

const App = ({ recipes = allRecipes }) => {
  const [page, setPage] = useState(1);
  const total = recipes.length;
  const start = (page - 1) * PAGE_SIZE;
  const visible = recipes.slice(start, start + PAGE_SIZE);

  let pageCount = Math.ceil(total / PAGE_SIZE);
  let last = page * PAGE_SIZE;
  if (last > total) {
    last = total;
  }

  let line = 'No recipes';
  if (total > 0) {
    line = 'Showing ' + (start + 1) + ' to ' + last + ' of ' + total + ' recipes';
  }

  const isFirstPage = page <= 1;
  const isLastPage = page >= pageCount;

  return (
    <main>
      <h2>The results line</h2>
      <ul>
        {visible.map((recipe) => <li key={recipe}>{recipe}</li>)}
      </ul>
      <p>{line}</p>
      <button type="button" disabled={isFirstPage} onClick={() => setPage(page - 1)}>Previous</button>
      <button type="button" disabled={isLastPage} onClick={() => setPage(page + 1)}>Next</button>
    </main>
  );
};

export default App;`,
    senior: `import React, { useState } from 'react';

const allRecipes = ['Pancakes', 'Omelette', 'Risotto', 'Chili', 'Ramen', 'Paella', 'Curry', 'Tacos', 'Gnocchi', 'Falafel'];
const PAGE_SIZE = 4;

const describeRange = (first, last, total) =>
  total === 0 ? 'No recipes' : ['Showing', first, 'to', last, 'of', total, 'recipes'].join(' ');

const App = ({ recipes = allRecipes }) => {
  const [page, setPage] = useState(1);
  const total = recipes.length;
  const pageCount = Math.ceil(total / PAGE_SIZE);
  const start = (page - 1) * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, total);

  return (
    <main>
      <h2>The results line</h2>
      <ul>
        {recipes.slice(start, end).map((recipe) => <li key={recipe}>{recipe}</li>)}
      </ul>
      <p>{describeRange(start + 1, end, total)}</p>
      <button type="button" disabled={page <= 1} onClick={() => setPage((previous) => previous - 1)}>Previous</button>
      <button type="button" disabled={page >= pageCount} onClick={() => setPage((previous) => previous + 1)}>Next</button>
    </main>
  );
};

export default App;`,
    hiddenSuite: `test('the middle page shows 5 to 8', () => {
  const { container } = render(<App />);
  press('Next');
  expect(line(container)).toBe('Showing 5 to 8 of 10 recipes');
});

test('no recipes says so and disables both buttons', () => {
  const { container } = render(<App recipes={[]} />);
  expect(line(container)).toBe('No recipes');
  expect(screen.getByRole('button', { name: 'Previous' }).disabled).toBe(true);
  expect(screen.getByRole('button', { name: 'Next' }).disabled).toBe(true);
});

test('a full last page ends on its last recipe', () => {
  const { container } = render(<App recipes={['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']} />);
  press('Next');
  expect(line(container)).toBe('Showing 5 to 8 of 8 recipes');
  expect(screen.getByRole('button', { name: 'Next' }).disabled).toBe(true);
});

test('one short page', () => {
  const { container } = render(<App recipes={['A', 'B', 'C']} />);
  expect(line(container)).toBe('Showing 1 to 3 of 3 recipes');
  expect(screen.getByRole('button', { name: 'Next' }).disabled).toBe(true);
});`,
  },
  'react-easy3-rows-per-page': {
    solution: `import React, { useState } from 'react';

const allOrders = Array.from({ length: 23 }, (_, index) => 'Order ' + (index + 1));

const App = ({ orders = allOrders }) => {
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const pageCount = Math.max(1, Math.ceil(orders.length / rowsPerPage));
  const start = (page - 1) * rowsPerPage;

  const changeSize = (event) => {
    // A select's value is text, and start + '10' would build a string, not an index.
    setRowsPerPage(Number(event.target.value));
    // The page the reader was on may not exist at the new size.
    setPage(1);
  };

  return <main>
    <h2>Rows per page</h2>
    <label>Rows per page <select value={rowsPerPage} onChange={changeSize}>
      <option value="5">5</option>
      <option value="10">10</option>
      <option value="20">20</option>
    </select></label>
    <ul>
      {orders.slice(start, start + rowsPerPage).map((order) => <li key={order}>{order}</li>)}
    </ul>
    <p>Page {page} of {pageCount}</p>
    <button type="button" disabled={page === 1} onClick={() => setPage((previous) => previous - 1)}>Previous</button>
    <button type="button" disabled={page === pageCount} onClick={() => setPage((previous) => previous + 1)}>Next</button>
  </main>;
};

export default App;`,
    junior: `import React, { useState } from 'react';

const allOrders = Array.from({ length: 23 }, (_, index) => 'Order ' + (index + 1));

const App = ({ orders = allOrders }) => {
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  let pageCount = Math.ceil(orders.length / rowsPerPage);
  if (pageCount < 1) {
    pageCount = 1;
  }

  const start = (page - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const visibleOrders = orders.slice(start, end);

  const handleSizeChange = (event) => {
    const text = event.target.value;
    const size = parseInt(text, 10);
    setRowsPerPage(size);
    setPage(1);
  };

  const goBack = () => {
    setPage(page - 1);
  };

  const goForward = () => {
    setPage(page + 1);
  };

  return (
    <main>
      <h2>Rows per page</h2>
      <label>Rows per page <select value={rowsPerPage} onChange={handleSizeChange}>
        <option value="5">5</option>
        <option value="10">10</option>
        <option value="20">20</option>
      </select></label>
      <ul>
        {visibleOrders.map((order) => <li key={order}>{order}</li>)}
      </ul>
      <p>Page {page} of {pageCount}</p>
      <button type="button" disabled={page === 1} onClick={goBack}>Previous</button>
      <button type="button" disabled={page === pageCount} onClick={goForward}>Next</button>
    </main>
  );
};

export default App;`,
    senior: `import React, { useState } from 'react';

const allOrders = Array.from({ length: 23 }, (_, index) => 'Order ' + (index + 1));
const SIZES = [5, 10, 20];

const App = ({ orders = allOrders }) => {
  // Size and page change together, so they live together.
  const [view, setView] = useState({ page: 1, rowsPerPage: SIZES[0] });
  const { page, rowsPerPage } = view;
  const pageCount = Math.max(1, Math.ceil(orders.length / rowsPerPage));
  const start = (page - 1) * rowsPerPage;
  const goTo = (next) => setView((previous) => ({ ...previous, page: next }));

  return (
    <main>
      <h2>Rows per page</h2>
      <label>Rows per page <select
        value={rowsPerPage}
        onChange={(event) => setView({ page: 1, rowsPerPage: Number(event.target.value) })}
      >
        {SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
      </select></label>
      <ul>
        {orders.slice(start, start + rowsPerPage).map((order) => <li key={order}>{order}</li>)}
      </ul>
      <p>Page {page} of {pageCount}</p>
      <button type="button" disabled={page === 1} onClick={() => goTo(page - 1)}>Previous</button>
      <button type="button" disabled={page === pageCount} onClick={() => goTo(page + 1)}>Next</button>
    </main>
  );
};

export default App;`,
    hiddenSuite: `test('the last page can be short', () => {
  const { container } = render(<App />);
  pickSize('20');
  press('Next');
  expect(rows(container)).toEqual(range(21, 23));
  expect(container.querySelector('p').textContent).toBe('Page 2 of 2');
});

test('the size is stored as a number', () => {
  const { container } = render(<App />);
  pickSize('10');
  press('Next');
  expect(rows(container)).toEqual(range(11, 20));
});

test('fewer orders than one page', () => {
  const { container } = render(<App orders={['Order 1', 'Order 2', 'Order 3']} />);
  expect(rows(container)).toEqual(range(1, 3));
  expect(screen.getByRole('button', { name: 'Next' }).disabled).toBe(true);
});

test('a smaller size also goes back to page 1', () => {
  const { container } = render(<App />);
  pickSize('10');
  press('Next');
  pickSize('5');
  expect(rows(container)).toEqual(range(1, 5));
});`,
  },
  'react-easy3-fetch-a-page': {
    solution: `import React, { useEffect, useState } from 'react';

const PAGE_SIZE = 5;

const App = () => {
  const [page, setPage] = useState(1);
  const [posts, setPosts] = useState([]);

  // Runs after the first render and after every render in which page changed.
  useEffect(() => {
    fetch('/api/posts?_page=' + page + '&_limit=' + PAGE_SIZE)
      .then((response) => response.json())
      .then((data) => setPosts(data));
  }, [page]);

  // The server gives no total: a page shorter than PAGE_SIZE is the last one.
  const lastPage = posts.length < PAGE_SIZE;

  return <main>
    <h2>Ask the server for one page</h2>
    <ul>
      {posts.map((post) => <li key={post.id}>{post.title}</li>)}
    </ul>
    <p>Page {page}</p>
    <button type="button" disabled={page === 1} onClick={() => setPage((previous) => previous - 1)}>Previous</button>
    <button type="button" disabled={lastPage} onClick={() => setPage((previous) => previous + 1)}>Next</button>
  </main>;
};

export default App;`,
    junior: `import React, { useEffect, useState } from 'react';

const PAGE_SIZE = 5;

const App = () => {
  const [page, setPage] = useState(1);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const url = '/api/posts?_page=' + page + '&_limit=' + PAGE_SIZE;

    async function loadPage() {
      const response = await fetch(url);
      const data = await response.json();
      setPosts(data);
    }

    loadPage();
  }, [page]);

  let isFirstPage = false;
  if (page === 1) {
    isFirstPage = true;
  }

  let isLastPage = false;
  if (posts.length < PAGE_SIZE) {
    isLastPage = true;
  }

  return (
    <main>
      <h2>Ask the server for one page</h2>
      <ul>
        {posts.map((post) => <li key={post.id}>{post.title}</li>)}
      </ul>
      <p>Page {page}</p>
      <button type="button" disabled={isFirstPage} onClick={() => setPage(page - 1)}>Previous</button>
      <button type="button" disabled={isLastPage} onClick={() => setPage(page + 1)}>Next</button>
    </main>
  );
};

export default App;`,
    senior: `import React, { useEffect, useState } from 'react';

const PAGE_SIZE = 5;

const App = () => {
  const [page, setPage] = useState(1);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    // A slow answer for a page the reader already left must not replace the current one.
    let current = true;
    fetch('/api/posts?_page=' + page + '&_limit=' + PAGE_SIZE)
      .then((response) => response.json())
      .then((data) => {
        if (current) setPosts(data);
      });
    return () => {
      current = false;
    };
  }, [page]);

  return (
    <main>
      <h2>Ask the server for one page</h2>
      <ul>
        {posts.map((post) => <li key={post.id}>{post.title}</li>)}
      </ul>
      <p>Page {page}</p>
      <button type="button" disabled={page === 1} onClick={() => setPage((previous) => previous - 1)}>Previous</button>
      <button type="button" disabled={posts.length < PAGE_SIZE} onClick={() => setPage((previous) => previous + 1)}>Next</button>
    </main>
  );
};

export default App;`,
    hiddenSuite: `test('Previous is disabled on page 1', () => withFetch(async calls => {
  render(<App />);
  await act(async () => { calls[0].respond(posts(1, 5)); });
  expect(button('Previous').disabled).toBe(true);
  expect(button('Next').disabled).toBe(false);
}));

test('Previous fetches the page before', () => withFetch(async calls => {
  const { container } = render(<App />);
  await act(async () => { calls[0].respond(posts(1, 5)); });
  fireEvent.click(button('Next'));
  await act(async () => { calls[1].respond(posts(6, 5)); });
  fireEvent.click(button('Previous'));
  expect(calls[2].url).toBe('/api/posts?_page=1&_limit=5');
  await act(async () => { calls[2].respond(posts(1, 5)); });
  expect(titles(container)[0]).toBe('Post 1');
}));

test('one request for each page', () => withFetch(async calls => {
  render(<App />);
  await act(async () => { calls[0].respond(posts(1, 5)); });
  fireEvent.click(button('Next'));
  await act(async () => { calls[1].respond(posts(6, 5)); });
  expect(calls.length).toBe(2);
}));

test('an empty page disables Next', () => withFetch(async calls => {
  const { container } = render(<App />);
  await act(async () => { calls[0].respond([]); });
  expect(titles(container)).toEqual([]);
  expect(button('Next').disabled).toBe(true);
}));`,
  },

  /* ── slice ────────────────────────────────────────────────────────── */
  'react-easy3-breadcrumbs': {
    solution: `import React, { useState } from 'react';

const App = ({ start = '/docs/react/hooks' }) => {
  const [path, setPath] = useState(start);
  // Worked out on every render, so the crumbs always match the path.
  // filter(Boolean) drops the empty strings the leading and trailing slashes leave.
  const parts = path.split('/').filter(Boolean);

  const goUp = () => setPath((previous) => previous.slice(0, previous.lastIndexOf('/')) || '/');

  return <main>
    <h2>Breadcrumbs from a path</h2>
    <nav aria-label="Breadcrumb">
      <ol>
        {parts.map((part, index) => (
          <li key={index}>
            {index === parts.length - 1
              ? part
              : <a href={'/' + parts.slice(0, index + 1).join('/')}>{part}</a>}
          </li>
        ))}
      </ol>
    </nav>
    <button type="button" onClick={goUp} disabled={path === '/'}>Go up</button>
  </main>;
};

export default App;`,
    junior: `import React, { useState } from 'react';

const App = ({ start = '/docs/react/hooks' }) => {
  const [path, setPath] = useState(start);

  const pieces = path.split('/');
  const parts = [];
  for (const piece of pieces) {
    if (piece !== '') {
      parts.push(piece);
    }
  }

  const crumbs = [];
  for (let index = 0; index < parts.length; index++) {
    const isLast = index === parts.length - 1;
    const href = '/' + parts.slice(0, index + 1).join('/');
    if (isLast) {
      crumbs.push(<li key={index}>{parts[index]}</li>);
    } else {
      crumbs.push(<li key={index}><a href={href}>{parts[index]}</a></li>);
    }
  }

  const goUp = () => {
    const cut = path.lastIndexOf('/');
    let parent = path.slice(0, cut);
    if (parent === '') {
      parent = '/';
    }
    setPath(parent);
  };

  return (
    <main>
      <h2>Breadcrumbs from a path</h2>
      <nav aria-label="Breadcrumb">
        <ol>{crumbs}</ol>
      </nav>
      <button type="button" onClick={goUp} disabled={path === '/'}>Go up</button>
    </main>
  );
};

export default App;`,
    senior: `import React, { useState } from 'react';

// Each crumb with the path up to and including it.
const toCrumbs = (path) => {
  const parts = path.split('/').filter(Boolean);
  return parts.map((label, index) => ({ label, href: '/' + parts.slice(0, index + 1).join('/') }));
};

const App = ({ start = '/docs/react/hooks' }) => {
  const [path, setPath] = useState(start);
  const crumbs = toCrumbs(path);

  return (
    <main>
      <h2>Breadcrumbs from a path</h2>
      <nav aria-label="Breadcrumb">
        <ol>
          {crumbs.map(({ label, href }, index) => (
            <li key={href}>
              {index === crumbs.length - 1 ? <span aria-current="page">{label}</span> : <a href={href}>{label}</a>}
            </li>
          ))}
        </ol>
      </nav>
      <button
        type="button"
        disabled={path === '/'}
        onClick={() => setPath((previous) => previous.slice(0, previous.lastIndexOf('/')) || '/')}
      >
        Go up
      </button>
    </main>
  );
};

export default App;`,
    hiddenSuite: `test('a deeper path links every level', () => {
  const { container } = render(<App start="/a/b/c/d" />);
  expect(crumbs(container)).toEqual(['a', 'b', 'c', 'd']);
  expect(links(container)).toEqual(['/a', '/a/b', '/a/b/c']);
});

test('a trailing slash adds no empty crumb', () => {
  const { container } = render(<App start="/docs/react/" />);
  expect(crumbs(container)).toEqual(['docs', 'react']);
  expect(links(container)).toEqual(['/docs']);
});

test('the top of the site has no crumbs', () => {
  const { container } = render(<App start="/" />);
  expect(crumbs(container)).toEqual([]);
});

test('going up to the top empties the crumbs', () => {
  const { container } = render(<App start="/docs/react" />);
  fireEvent.click(screen.getByRole('button', { name: 'Go up' }));
  expect(crumbs(container)).toEqual(['docs']);
  expect(links(container)).toEqual([]);
  fireEvent.click(screen.getByRole('button', { name: 'Go up' }));
  expect(crumbs(container)).toEqual([]);
});`,
  },
  'react-easy3-read-more': {
    solution: `import React, { useState } from 'react';

const sampleReview = 'The boat left on time, the crew knew every reef by name, and we saw four turtles before lunch.';
const LIMIT = 60;

const App = ({ text = sampleReview }) => {
  const [open, setOpen] = useState(false);
  // Only a review past the limit folds; exactly LIMIT characters still fits.
  const long = text.length > LIMIT;
  // slice leaves text as it is, so unfolding needs nothing stored.
  const shown = long && !open ? text.slice(0, LIMIT) + '...' : text;

  return <main>
    <h2>Read more</h2>
    <p>{shown}</p>
    {long && (
      <button type="button" onClick={() => setOpen((previous) => !previous)}>
        {open ? 'Show less' : 'Read more'}
      </button>
    )}
  </main>;
};

export default App;`,
    junior: `import React, { useState } from 'react';

const sampleReview = 'The boat left on time, the crew knew every reef by name, and we saw four turtles before lunch.';
const LIMIT = 60;

const App = ({ text = sampleReview }) => {
  const [open, setOpen] = useState(false);

  let isLong = false;
  if (text.length > LIMIT) {
    isLong = true;
  }

  let shown = text;
  if (isLong && !open) {
    shown = text.slice(0, LIMIT) + '...';
  }

  let label = 'Read more';
  if (open) {
    label = 'Show less';
  }

  const toggle = () => {
    setOpen(!open);
  };

  return (
    <main>
      <h2>Read more</h2>
      <p>{shown}</p>
      {isLong ? <button type="button" onClick={toggle}>{label}</button> : null}
    </main>
  );
};

export default App;`,
    senior: `import React, { useState } from 'react';

const sampleReview = 'The boat left on time, the crew knew every reef by name, and we saw four turtles before lunch.';
const LIMIT = 60;

const App = ({ text = sampleReview }) => {
  const [open, setOpen] = useState(false);
  const foldable = text.length > LIMIT;
  const folded = foldable && !open;

  return (
    <main>
      <h2>Read more</h2>
      <p>{folded ? text.slice(0, LIMIT) + '...' : text}</p>
      {foldable && (
        <button type="button" aria-expanded={open} onClick={() => setOpen((previous) => !previous)}>
          {open ? 'Show less' : 'Read more'}
        </button>
      )}
    </main>
  );
};

export default App;`,
    hiddenSuite: `test('exactly 60 characters is not long', () => {
  const sixty = 'x'.repeat(60);
  const { container } = render(<App text={sixty} />);
  expect(text(container)).toBe(sixty);
  expect(screen.queryByRole('button')).toBe(null);
});

test('61 characters fold', () => {
  const { container } = render(<App text={'y'.repeat(61)} />);
  expect(text(container)).toBe('y'.repeat(60) + '...');
});

test('the sample review starts folded', () => {
  const { container } = render(<App />);
  expect(text(container).endsWith('...')).toBe(true);
  expect(text(container).length).toBe(63);
});`,
  },

  /* ── accessibility ────────────────────────────────────────────────── */
  'react-easy3-pressed-buttons': {
    solution: `import React, { useState } from 'react';

const App = () => {
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);

  // aria-pressed tells a screen reader what the class name only shows.
  return <main>
    <h2>Buttons that say they are pressed</h2>
    <div role="toolbar" aria-label="Formatting">
      <button type="button" className={bold ? 'on' : ''} aria-pressed={bold} onClick={() => setBold((previous) => !previous)}>Bold</button>
      <button type="button" className={italic ? 'on' : ''} aria-pressed={italic} onClick={() => setItalic((previous) => !previous)}>Italic</button>
    </div>
    <p style={{ fontWeight: bold ? 'bold' : 'normal', fontStyle: italic ? 'italic' : 'normal' }}>The tide turns at noon.</p>
  </main>;
};

export default App;`,
    junior: `import React, { useState } from 'react';

const App = () => {
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);

  const toggleBold = () => {
    setBold(!bold);
  };

  const toggleItalic = () => {
    setItalic(!italic);
  };

  let boldClass = '';
  if (bold) {
    boldClass = 'on';
  }

  let italicClass = '';
  if (italic) {
    italicClass = 'on';
  }

  const previewStyle = {
    fontWeight: bold ? 'bold' : 'normal',
    fontStyle: italic ? 'italic' : 'normal',
  };

  return (
    <main>
      <h2>Buttons that say they are pressed</h2>
      <div role="toolbar" aria-label="Formatting">
        <button type="button" className={boldClass} aria-pressed={bold} onClick={toggleBold}>Bold</button>
        <button type="button" className={italicClass} aria-pressed={italic} onClick={toggleItalic}>Italic</button>
      </div>
      <p style={previewStyle}>The tide turns at noon.</p>
    </main>
  );
};

export default App;`,
    senior: `import React, { useState } from 'react';

// One toggle button: the pressed state is in the markup, not only in the look.
const ToggleButton = ({ pressed, onToggle, children }) => (
  <button type="button" className={pressed ? 'on' : ''} aria-pressed={pressed} onClick={onToggle}>
    {children}
  </button>
);

const App = () => {
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);

  return (
    <main>
      <h2>Buttons that say they are pressed</h2>
      <div role="toolbar" aria-label="Formatting">
        <ToggleButton pressed={bold} onToggle={() => setBold((previous) => !previous)}>Bold</ToggleButton>
        <ToggleButton pressed={italic} onToggle={() => setItalic((previous) => !previous)}>Italic</ToggleButton>
      </div>
      <p style={{ fontWeight: bold ? 'bold' : 'normal', fontStyle: italic ? 'italic' : 'normal' }}>The tide turns at noon.</p>
    </main>
  );
};

export default App;`,
    hiddenSuite: `test('each button keeps its own state', () => {
  const { container } = render(<App />);
  fireEvent.click(button('Italic'));
  expect(pressed('Italic')).toBe('true');
  expect(pressed('Bold')).toBe('false');
  expect(preview(container).fontStyle).toBe('italic');
  expect(preview(container).fontWeight).toBe('normal');
});

test('both styles at once', () => {
  const { container } = render(<App />);
  fireEvent.click(button('Bold'));
  fireEvent.click(button('Italic'));
  expect(pressed('Bold')).toBe('true');
  expect(pressed('Italic')).toBe('true');
  expect(preview(container).fontStyle).toBe('italic');
  expect(preview(container).fontWeight).toBe('bold');
});

test('three clicks leave it pressed', () => {
  render(<App />);
  fireEvent.click(button('Bold'));
  fireEvent.click(button('Bold'));
  fireEvent.click(button('Bold'));
  expect(pressed('Bold')).toBe('true');
});`,
  },
  'react-easy3-name-the-remove-buttons': {
    solution: `import React, { useState } from 'react';

const startingSongs = [
  { id: 1, title: 'Intro' },
  { id: 2, title: 'Tidal' },
  { id: 3, title: 'Undertow' },
  { id: 4, title: 'Tidal' },
  { id: 5, title: 'Outro' },
];

const App = ({ songs = startingSongs }) => {
  const [playlist, setPlaylist] = useState(songs);

  const remove = (index) => {
    // Copy first: splice changes the array it is called on, and playlist belongs to React.
    const next = [...playlist];
    next.splice(index, 1);
    setPlaylist(next);
  };

  return <main>
    <h2>Name the remove buttons</h2>
    <ol>
      {playlist.map((song, index) => (
        <li key={song.id}>
          <span>{song.title}</span>
          {/* aria-label is what a screen reader reads; the × is what the eye sees. */}
          <button type="button" aria-label={'Remove ' + song.title} onClick={() => remove(index)}>×</button>
        </li>
      ))}
    </ol>
  </main>;
};

export default App;`,
    junior: `import React, { useState } from 'react';

const startingSongs = [
  { id: 1, title: 'Intro' },
  { id: 2, title: 'Tidal' },
  { id: 3, title: 'Undertow' },
  { id: 4, title: 'Tidal' },
  { id: 5, title: 'Outro' },
];

const App = ({ songs = startingSongs }) => {
  const [playlist, setPlaylist] = useState(songs);

  const remove = (index) => {
    const copy = playlist.slice();
    copy.splice(index, 1);
    setPlaylist(copy);
  };

  const rows = [];
  for (let index = 0; index < playlist.length; index++) {
    const song = playlist[index];
    const label = 'Remove ' + song.title;
    rows.push(
      <li key={song.id}>
        <span>{song.title}</span>
        <button type="button" aria-label={label} onClick={() => remove(index)}>×</button>
      </li>
    );
  }

  return (
    <main>
      <h2>Name the remove buttons</h2>
      <ol>{rows}</ol>
    </main>
  );
};

export default App;`,
    senior: `import React, { useState } from 'react';

const startingSongs = [
  { id: 1, title: 'Intro' },
  { id: 2, title: 'Tidal' },
  { id: 3, title: 'Undertow' },
  { id: 4, title: 'Tidal' },
  { id: 5, title: 'Outro' },
];

const App = ({ songs = startingSongs }) => {
  const [playlist, setPlaylist] = useState(songs);

  const remove = (index) =>
    setPlaylist((previous) => {
      const next = [...previous];
      next.splice(index, 1);
      return next;
    });

  return (
    <main>
      <h2>Name the remove buttons</h2>
      <ol>
        {playlist.map((song, index) => (
          <li key={song.id}>
            <span>{song.title}</span>
            <button type="button" aria-label={'Remove ' + song.title} onClick={() => remove(index)}>×</button>
          </li>
        ))}
      </ol>
    </main>
  );
};

export default App;`,
    hiddenSuite: `test('only the clicked copy of a repeated song goes', () => {
  const { container } = render(<App />);
  fireEvent.click(screen.getAllByRole('button', { name: 'Remove Tidal' })[1]);
  expect(titles(container)).toEqual(['Intro', 'Tidal', 'Undertow', 'Outro']);
});

test('two removals in a row', () => {
  const { container } = render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Remove Intro' }));
  fireEvent.click(screen.getByRole('button', { name: 'Remove Outro' }));
  expect(titles(container)).toEqual(['Tidal', 'Undertow', 'Tidal']);
});

test('the songs prop is left alone', () => {
  const songs = [{ id: 1, title: 'A' }, { id: 2, title: 'B' }];
  render(<App songs={songs} />);
  fireEvent.click(screen.getByRole('button', { name: 'Remove A' }));
  expect(songs.map(song => song.title)).toEqual(['A', 'B']);
});

test('the last song can go', () => {
  const { container } = render(<App songs={[{ id: 7, title: 'Ebb' }]} />);
  fireEvent.click(screen.getByRole('button', { name: 'Remove Ebb' }));
  expect(titles(container)).toEqual([]);
});`,
  },

  /* ── derived state ────────────────────────────────────────────────── */
  'react-easy3-characters-left': {
    solution: `import React, { useState } from 'react';

const LIMIT = 80;

const App = () => {
  const [text, setText] = useState('');
  const [posts, setPosts] = useState([]);
  // Worked out from text on every render, so it can never fall behind.
  const left = LIMIT - text.length;

  const post = (event) => {
    event.preventDefault();
    setPosts((previous) => [...previous, text]);
    setText('');
  };

  return <main>
    <h2>Characters left</h2>
    <form onSubmit={post}>
      <label>Post <textarea value={text} onChange={(event) => setText(event.target.value)} /></label>
      <p>{left >= 0 ? 'Characters left: ' + left : 'Too long by ' + -left}</p>
      <button type="submit" disabled={text.length === 0 || left < 0}>Post</button>
    </form>
    <ul>
      {posts.map((one, index) => <li key={index}>{one}</li>)}
    </ul>
  </main>;
};

export default App;`,
    junior: `import React, { useState } from 'react';

const LIMIT = 80;

const App = () => {
  const [text, setText] = useState('');
  const [posts, setPosts] = useState([]);

  const length = text.length;
  const left = LIMIT - length;

  let counter = '';
  if (left >= 0) {
    counter = 'Characters left: ' + left;
  } else {
    const over = length - LIMIT;
    counter = 'Too long by ' + over;
  }

  let canPost = true;
  if (length === 0) {
    canPost = false;
  }
  if (length > LIMIT) {
    canPost = false;
  }

  const post = (event) => {
    event.preventDefault();
    setPosts([...posts, text]);
    setText('');
  };

  const handleChange = (event) => {
    setText(event.target.value);
  };

  return (
    <main>
      <h2>Characters left</h2>
      <form onSubmit={post}>
        <label>Post <textarea value={text} onChange={handleChange} /></label>
        <p>{counter}</p>
        <button type="submit" disabled={!canPost}>Post</button>
      </form>
      <ul>
        {posts.map((one, index) => <li key={index}>{one}</li>)}
      </ul>
    </main>
  );
};

export default App;`,
    senior: `import React, { useId, useState } from 'react';

const LIMIT = 80;

const describeLength = (length) =>
  length <= LIMIT ? 'Characters left: ' + (LIMIT - length) : 'Too long by ' + (length - LIMIT);

const App = () => {
  const [text, setText] = useState('');
  const [posts, setPosts] = useState([]);
  const counterId = useId();
  const sendable = text.length > 0 && text.length <= LIMIT;

  const post = (event) => {
    event.preventDefault();
    setPosts((previous) => [...previous, text]);
    setText('');
  };

  return (
    <main>
      <h2>Characters left</h2>
      <form onSubmit={post}>
        <label>Post <textarea value={text} aria-describedby={counterId} onChange={(event) => setText(event.target.value)} /></label>
        <p id={counterId}>{describeLength(text.length)}</p>
        <button type="submit" disabled={!sendable}>Post</button>
      </form>
      <ul>
        {posts.map((one, index) => <li key={index}>{one}</li>)}
      </ul>
    </main>
  );
};

export default App;`,
    hiddenSuite: `test('exactly 80 characters can be posted', () => {
  const { container } = render(<App />);
  type('y'.repeat(80));
  expect(line(container)).toBe('Characters left: 0');
  expect(postButton().disabled).toBe(false);
});

test('one over is too long by 1', () => {
  const { container } = render(<App />);
  type('z'.repeat(81));
  expect(line(container)).toBe('Too long by 1');
});

test('posting resets the count', () => {
  const { container } = render(<App />);
  type('Low tide at six');
  fireEvent.click(postButton());
  expect(container.querySelector('li').textContent).toBe('Low tide at six');
  expect(line(container)).toBe('Characters left: 80');
  expect(postButton().disabled).toBe(true);
});

test('deleting text gives the characters back', () => {
  const { container } = render(<App />);
  type('x'.repeat(90));
  type('x'.repeat(10));
  expect(line(container)).toBe('Characters left: 70');
  expect(postButton().disabled).toBe(false);
});`,
  },

  /* ── splice ───────────────────────────────────────────────────────── */
  'react-easy3-undo-remove': {
    solution: `import React, { useState } from 'react';

const startingTasks = [
  { id: 1, text: 'Check the tanks' },
  { id: 2, text: 'Pack the fins' },
  { id: 3, text: 'Book the boat' },
  { id: 4, text: 'Charge the torch' },
];

const App = ({ initialTasks = startingTasks }) => {
  const [tasks, setTasks] = useState(initialTasks);
  // The latest removal, with the index it had; null when there is nothing to undo.
  const [removed, setRemoved] = useState(null);

  const remove = (index) => {
    setRemoved({ task: tasks[index], index });
    setTasks(tasks.filter((_, position) => position !== index));
  };

  const undo = () => {
    const next = [...tasks];
    // Delete nothing, insert the task before whatever sits at its old index now.
    next.splice(removed.index, 0, removed.task);
    setTasks(next);
    setRemoved(null);
  };

  return <main>
    <h2>Undo a removal</h2>
    <ul>
      {tasks.map((task, index) => (
        <li key={task.id}>
          <span>{task.text}</span>
          <button type="button" onClick={() => remove(index)}>Remove</button>
        </li>
      ))}
    </ul>
    {removed && <button type="button" onClick={undo}>Undo</button>}
  </main>;
};

export default App;`,
    junior: `import React, { useState } from 'react';

const startingTasks = [
  { id: 1, text: 'Check the tanks' },
  { id: 2, text: 'Pack the fins' },
  { id: 3, text: 'Book the boat' },
  { id: 4, text: 'Charge the torch' },
];

const App = ({ initialTasks = startingTasks }) => {
  const [tasks, setTasks] = useState(initialTasks);
  const [removedTask, setRemovedTask] = useState(null);
  const [removedIndex, setRemovedIndex] = useState(-1);

  const remove = (index) => {
    const task = tasks[index];
    setRemovedTask(task);
    setRemovedIndex(index);

    const remaining = [];
    for (let position = 0; position < tasks.length; position++) {
      if (position !== index) {
        remaining.push(tasks[position]);
      }
    }
    setTasks(remaining);
  };

  const undo = () => {
    const copy = tasks.slice();
    copy.splice(removedIndex, 0, removedTask);
    setTasks(copy);
    setRemovedTask(null);
    setRemovedIndex(-1);
  };

  return (
    <main>
      <h2>Undo a removal</h2>
      <ul>
        {tasks.map((task, index) => (
          <li key={task.id}>
            <span>{task.text}</span>
            <button type="button" onClick={() => remove(index)}>Remove</button>
          </li>
        ))}
      </ul>
      {removedTask !== null ? <button type="button" onClick={undo}>Undo</button> : null}
    </main>
  );
};

export default App;`,
    senior: `import React, { useState } from 'react';

const startingTasks = [
  { id: 1, text: 'Check the tanks' },
  { id: 2, text: 'Pack the fins' },
  { id: 3, text: 'Book the boat' },
  { id: 4, text: 'Charge the torch' },
];

const insertAt = (list, index, item) => {
  const next = [...list];
  next.splice(index, 0, item);
  return next;
};

const App = ({ initialTasks = startingTasks }) => {
  const [tasks, setTasks] = useState(initialTasks);
  const [lastRemoval, setLastRemoval] = useState(null);

  const remove = (index) => {
    setLastRemoval({ task: tasks[index], index });
    setTasks((previous) => previous.filter((_, position) => position !== index));
  };

  const undo = () => {
    const { task, index } = lastRemoval;
    setTasks((previous) => insertAt(previous, index, task));
    setLastRemoval(null);
  };

  return (
    <main>
      <h2>Undo a removal</h2>
      <ul>
        {tasks.map((task, index) => (
          <li key={task.id}>
            <span>{task.text}</span>
            <button type="button" onClick={() => remove(index)}>Remove</button>
          </li>
        ))}
      </ul>
      {lastRemoval && <button type="button" onClick={undo}>Undo</button>}
    </main>
  );
};

export default App;`,
    hiddenSuite: `test('only the latest removal comes back', () => {
  const { container } = render(<App />);
  removeTask('Check the tanks');
  removeTask('Book the boat');
  undo();
  expect(texts(container)).toEqual(['Pack the fins', 'Book the boat', 'Charge the torch']);
});

test('there is no Undo before anything is removed', () => {
  render(<App />);
  expect(screen.queryByRole('button', { name: 'Undo' })).toBe(null);
});

test('the first task comes back to the top', () => {
  const { container } = render(<App />);
  removeTask('Check the tanks');
  undo();
  expect(texts(container)).toEqual(ALL);
});

test('Undo works again after the next removal', () => {
  const { container } = render(<App initialTasks={[{ id: 1, text: 'One' }, { id: 2, text: 'Two' }, { id: 3, text: 'Three' }]} />);
  removeTask('Two');
  undo();
  removeTask('Three');
  undo();
  expect(texts(container)).toEqual(['One', 'Two', 'Three']);
});`,
  },
  'react-easy3-split-a-line': {
    solution: `import React, { useState } from 'react';

const startingList = ['Eggs and milk', 'Bread', 'Rice and beans', 'Tea'];

const App = ({ items = startingList }) => {
  const [list, setList] = useState(items);

  const splitLine = (index) => {
    const parts = list[index].split(' and ');
    // Copy first: splice changes the array it is called on.
    const next = [...list];
    // Remove the one line and insert every part in its place; the spread keeps them separate.
    next.splice(index, 1, ...parts);
    setList(next);
  };

  return <main>
    <h2>Split a line in place</h2>
    <ul>
      {list.map((item, index) => (
        <li key={index}>
          <span>{item}</span>
          {item.includes(' and ') && <button type="button" onClick={() => splitLine(index)}>Split</button>}
        </li>
      ))}
    </ul>
  </main>;
};

export default App;`,
    junior: `import React, { useState } from 'react';

const startingList = ['Eggs and milk', 'Bread', 'Rice and beans', 'Tea'];

const App = ({ items = startingList }) => {
  const [list, setList] = useState(items);

  const splitLine = (index) => {
    const line = list[index];
    const parts = line.split(' and ');
    const copy = list.slice();
    copy.splice(index, 1);
    for (let offset = 0; offset < parts.length; offset++) {
      copy.splice(index + offset, 0, parts[offset]);
    }
    setList(copy);
  };

  return (
    <main>
      <h2>Split a line in place</h2>
      <ul>
        {list.map((item, index) => {
          const canSplit = item.includes(' and ');
          return (
            <li key={index}>
              <span>{item}</span>
              {canSplit ? <button type="button" onClick={() => splitLine(index)}>Split</button> : null}
            </li>
          );
        })}
      </ul>
    </main>
  );
};

export default App;`,
    senior: `import React, { useState } from 'react';

const startingList = ['Eggs and milk', 'Bread', 'Rice and beans', 'Tea'];
const SEPARATOR = ' and ';

const App = ({ items = startingList }) => {
  const [list, setList] = useState(items);

  const splitLine = (index) =>
    setList((previous) => {
      const next = [...previous];
      next.splice(index, 1, ...previous[index].split(SEPARATOR));
      return next;
    });

  return (
    <main>
      <h2>Split a line in place</h2>
      <ul>
        {list.map((item, index) => (
          <li key={index}>
            <span>{item}</span>
            {item.includes(SEPARATOR) && <button type="button" onClick={() => splitLine(index)}>Split</button>}
          </li>
        ))}
      </ul>
    </main>
  );
};

export default App;`,
    hiddenSuite: `test('a line with three parts becomes three lines', () => {
  const { container } = render(<App items={['Bread and butter and jam', 'Tea']} />);
  splitLine('Bread and butter and jam');
  expect(lines(container)).toEqual(['Bread', 'butter', 'jam', 'Tea']);
});

test('splitting both lines in turn', () => {
  const { container } = render(<App />);
  splitLine('Eggs and milk');
  splitLine('Rice and beans');
  expect(lines(container)).toEqual(['Eggs', 'milk', 'Bread', 'Rice', 'beans', 'Tea']);
});

test('the last line splits at the end', () => {
  const { container } = render(<App items={['Tea', 'Salt and pepper']} />);
  splitLine('Salt and pepper');
  expect(lines(container)).toEqual(['Tea', 'Salt', 'pepper']);
});

test('the items prop is left alone', () => {
  const items = ['Oil and vinegar'];
  render(<App items={items} />);
  splitLine('Oil and vinegar');
  expect(items).toEqual(['Oil and vinegar']);
});`,
  },

  /* ── useContext ───────────────────────────────────────────────────── */
  'react-easy3-dispatch-through-context': {
    solution: `import React, { createContext, useContext, useReducer, useState } from 'react';

export const TasksDispatchContext = createContext(null);

const tasksReducer = (tasks, action) => {
  switch (action.type) {
    case 'added':
      return [...tasks, { id: tasks.length + 1, text: action.text, done: false }];
    case 'toggled':
      return tasks.map((task) => (task.id === action.id ? { ...task, done: !task.done } : task));
    default:
      return tasks;
  }
};

export const AddTask = () => {
  // Read from the nearest provider: no parent has to pass it along.
  const dispatch = useContext(TasksDispatchContext);
  const [text, setText] = useState('');
  const add = (event) => {
    event.preventDefault();
    dispatch({ type: 'added', text });
    setText('');
  };
  return <form onSubmit={add}>
    <label>New task <input value={text} onChange={(event) => setText(event.target.value)} /></label>
    <button type="submit">Add</button>
  </form>;
};

export const TaskItem = ({ task }) => {
  const dispatch = useContext(TasksDispatchContext);
  return (
    <li>
      <label>
        <input type="checkbox" checked={task.done} onChange={() => dispatch({ type: 'toggled', id: task.id })} />
        {task.text}
      </label>
    </li>
  );
};

// TaskList renders the items and no longer carries anything it does not use.
const TaskList = ({ tasks }) => (
  <ul>
    {tasks.map((task) => <TaskItem key={task.id} task={task} />)}
  </ul>
);

const App = () => {
  const [tasks, dispatch] = useReducer(tasksReducer, [
    { id: 1, text: 'Rinse the regulator', done: false },
    { id: 2, text: 'Log the dive', done: true },
  ]);

  return <TasksDispatchContext.Provider value={dispatch}>
    <main>
      <h2>Dispatch through context</h2>
      <AddTask />
      <TaskList tasks={tasks} />
    </main>
  </TasksDispatchContext.Provider>;
};

export default App;`,
    junior: `import React, { createContext, useContext, useReducer, useState } from 'react';

export const TasksDispatchContext = createContext(null);

function tasksReducer(tasks, action) {
  if (action.type === 'added') {
    const newTask = { id: tasks.length + 1, text: action.text, done: false };
    return [...tasks, newTask];
  }
  if (action.type === 'toggled') {
    const updated = [];
    for (const task of tasks) {
      if (task.id === action.id) {
        updated.push({ ...task, done: !task.done });
      } else {
        updated.push(task);
      }
    }
    return updated;
  }
  return tasks;
}

export const AddTask = () => {
  const dispatch = useContext(TasksDispatchContext);
  const [text, setText] = useState('');

  const handleChange = (event) => {
    setText(event.target.value);
  };

  const add = (event) => {
    event.preventDefault();
    const action = { type: 'added', text: text };
    dispatch(action);
    setText('');
  };

  return (
    <form onSubmit={add}>
      <label>New task <input value={text} onChange={handleChange} /></label>
      <button type="submit">Add</button>
    </form>
  );
};

export const TaskItem = ({ task }) => {
  const dispatch = useContext(TasksDispatchContext);

  const toggle = () => {
    const action = { type: 'toggled', id: task.id };
    dispatch(action);
  };

  return (
    <li>
      <label>
        <input type="checkbox" checked={task.done} onChange={toggle} />
        {task.text}
      </label>
    </li>
  );
};

const TaskList = ({ tasks }) => {
  return (
    <ul>
      {tasks.map((task) => <TaskItem key={task.id} task={task} />)}
    </ul>
  );
};

const App = () => {
  const startingTasks = [
    { id: 1, text: 'Rinse the regulator', done: false },
    { id: 2, text: 'Log the dive', done: true },
  ];
  const [tasks, dispatch] = useReducer(tasksReducer, startingTasks);

  return (
    <TasksDispatchContext.Provider value={dispatch}>
      <main>
        <h2>Dispatch through context</h2>
        <AddTask />
        <TaskList tasks={tasks} />
      </main>
    </TasksDispatchContext.Provider>
  );
};

export default App;`,
    senior: `import React, { createContext, useContext, useReducer, useState } from 'react';

export const TasksDispatchContext = createContext(null);

const useTasksDispatch = () => useContext(TasksDispatchContext);

const tasksReducer = (tasks, action) => {
  switch (action.type) {
    case 'added':
      return [...tasks, { id: tasks.length + 1, text: action.text, done: false }];
    case 'toggled':
      return tasks.map((task) => (task.id === action.id ? { ...task, done: !task.done } : task));
    default:
      return tasks;
  }
};

const initialTasks = [
  { id: 1, text: 'Rinse the regulator', done: false },
  { id: 2, text: 'Log the dive', done: true },
];

export const AddTask = () => {
  const dispatch = useTasksDispatch();
  const [text, setText] = useState('');

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        dispatch({ type: 'added', text });
        setText('');
      }}
    >
      <label>New task <input value={text} onChange={(event) => setText(event.target.value)} /></label>
      <button type="submit">Add</button>
    </form>
  );
};

export const TaskItem = ({ task }) => {
  const dispatch = useTasksDispatch();
  return (
    <li>
      <label>
        <input type="checkbox" checked={task.done} onChange={() => dispatch({ type: 'toggled', id: task.id })} />
        {task.text}
      </label>
    </li>
  );
};

const TaskList = ({ tasks }) => (
  <ul>
    {tasks.map((task) => <TaskItem key={task.id} task={task} />)}
  </ul>
);

const App = () => {
  const [tasks, dispatch] = useReducer(tasksReducer, initialTasks);

  return (
    <TasksDispatchContext.Provider value={dispatch}>
      <main>
        <h2>Dispatch through context</h2>
        <AddTask />
        <TaskList tasks={tasks} />
      </main>
    </TasksDispatchContext.Provider>
  );
};

export default App;`,
    hiddenSuite: `test('ticking a task in App still works', () => {
  render(<App />);
  fireEvent.click(boxes()[0]);
  expect(boxes()[0].checked).toBe(true);
  expect(boxes()[1].checked).toBe(true);
});

test('AddTask clears its field after adding', () => {
  render(<TasksDispatchContext.Provider value={() => {}}><AddTask /></TasksDispatchContext.Provider>);
  fireEvent.change(screen.getByLabelText('New task'), { target: { value: 'Fill the log' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add' }));
  expect(screen.getByLabelText('New task').value).toBe('');
});

test('a ticked task can be unticked', () => {
  render(<App />);
  fireEvent.click(boxes()[1]);
  expect(boxes()[1].checked).toBe(false);
});`,
  },
  'react-easy3-radio-group': {
    solution: `import React, { createContext, useContext, useState } from 'react';

export const RadioContext = createContext(null);

export const RadioGroup = ({ name, value, onChange, legend, children }) => (
  // Every Radio passed in as children renders inside this provider and reads the group from it.
  <RadioContext.Provider value={{ name, value, onChange }}>
    <fieldset>
      <legend>{legend}</legend>
      {children}
    </fieldset>
  </RadioContext.Provider>
);

export const Radio = ({ value, children }) => {
  const group = useContext(RadioContext);
  return (
    <label>
      <input
        type="radio"
        name={group.name}
        value={value}
        checked={group.value === value}
        onChange={() => group.onChange(value)}
      />
      {children}
    </label>
  );
};

const App = () => {
  const [size, setSize] = useState('M');

  return <main>
    <h2>A radio group through context</h2>
    <RadioGroup name="size" value={size} onChange={setSize} legend="Size">
      <Radio value="S">Small</Radio>
      <Radio value="M">Medium</Radio>
      <Radio value="L">Large</Radio>
    </RadioGroup>
    <p>Chosen size: {size}</p>
  </main>;
};

export default App;`,
    junior: `import React, { createContext, useContext, useState } from 'react';

export const RadioContext = createContext(null);

export const RadioGroup = ({ name, value, onChange, legend, children }) => {
  const group = { name: name, value: value, onChange: onChange };
  return (
    <RadioContext.Provider value={group}>
      <fieldset>
        <legend>{legend}</legend>
        {children}
      </fieldset>
    </RadioContext.Provider>
  );
};

export const Radio = ({ value, children }) => {
  const group = useContext(RadioContext);

  let isChecked = false;
  if (group.value === value) {
    isChecked = true;
  }

  const handleChange = () => {
    group.onChange(value);
  };

  return (
    <label>
      <input type="radio" name={group.name} value={value} checked={isChecked} onChange={handleChange} />
      {children}
    </label>
  );
};

const App = () => {
  const [size, setSize] = useState('M');

  return (
    <main>
      <h2>A radio group through context</h2>
      <RadioGroup name="size" value={size} onChange={setSize} legend="Size">
        <Radio value="S">Small</Radio>
        <Radio value="M">Medium</Radio>
        <Radio value="L">Large</Radio>
      </RadioGroup>
      <p>Chosen size: {size}</p>
    </main>
  );
};

export default App;`,
    senior: `import React, { createContext, useContext, useMemo, useState } from 'react';

export const RadioContext = createContext(null);

export const RadioGroup = ({ name, value, onChange, legend, children }) => {
  // A new object on every render would re-render every Radio; this one changes with its fields.
  const group = useMemo(() => ({ name, value, onChange }), [name, value, onChange]);
  return (
    <RadioContext.Provider value={group}>
      <fieldset>
        <legend>{legend}</legend>
        {children}
      </fieldset>
    </RadioContext.Provider>
  );
};

export const Radio = ({ value, children }) => {
  const { name, value: chosen, onChange } = useContext(RadioContext);
  return (
    <label>
      <input type="radio" name={name} value={value} checked={chosen === value} onChange={() => onChange(value)} />
      {children}
    </label>
  );
};

const SIZES = [['S', 'Small'], ['M', 'Medium'], ['L', 'Large']];

const App = () => {
  const [size, setSize] = useState('M');

  return (
    <main>
      <h2>A radio group through context</h2>
      <RadioGroup name="size" value={size} onChange={setSize} legend="Size">
        {SIZES.map(([value, label]) => <Radio key={value} value={value}>{label}</Radio>)}
      </RadioGroup>
      <p>Chosen size: {size}</p>
    </main>
  );
};

export default App;`,
    hiddenSuite: `test('a Radio reads whatever group is above it', () => {
  const picked = [];
  render(
    <RadioContext.Provider value={{ name: 'tank', value: 'b', onChange: value => { picked.push(value); } }}>
      <Radio value="a">Aluminium</Radio>
      <Radio value="b">Steel</Radio>
    </RadioContext.Provider>
  );
  expect(screen.getByLabelText('Steel').checked).toBe(true);
  expect(screen.getByLabelText('Aluminium').name).toBe('tank');
  fireEvent.click(screen.getByLabelText('Aluminium'));
  expect(picked).toEqual(['a']);
});

test('two groups on one page stay apart', () => {
  const Two = () => {
    const [size, setSize] = React.useState('S');
    const [colour, setColour] = React.useState('blue');
    return <>
      <RadioGroup name="size" value={size} onChange={setSize} legend="Size">
        <Radio value="S">Small</Radio>
        <Radio value="L">Large</Radio>
      </RadioGroup>
      <RadioGroup name="colour" value={colour} onChange={setColour} legend="Colour">
        <Radio value="blue">Blue</Radio>
        <Radio value="red">Red</Radio>
      </RadioGroup>
    </>;
  };
  render(<Two />);
  fireEvent.click(screen.getByLabelText('Red'));
  expect(screen.getByLabelText('Red').checked).toBe(true);
  expect(screen.getByLabelText('Small').checked).toBe(true);
  expect(screen.getByLabelText('Blue').name).toBe('colour');
});

test('onChange gets the value, not the event', () => {
  const picked = [];
  render(
    <RadioGroup name="depth" value="10" onChange={value => { picked.push(value); }} legend="Depth">
      <Radio value="10">Ten metres</Radio>
      <Radio value="20">Twenty metres</Radio>
    </RadioGroup>
  );
  fireEvent.click(screen.getByLabelText('Twenty metres'));
  expect(picked).toEqual(['20']);
});

test('a value set from outside checks the matching radio', () => {
  const group = value => (
    <RadioGroup name="size" value={value} onChange={() => {}} legend="Size">
      <Radio value="S">Small</Radio>
      <Radio value="L">Large</Radio>
    </RadioGroup>
  );
  const { rerender } = render(group('S'));
  rerender(group('L'));
  expect(screen.getByLabelText('Large').checked).toBe(true);
  expect(screen.getByLabelText('Small').checked).toBe(false);
});`,
  },
};
