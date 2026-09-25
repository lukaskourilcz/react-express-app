// The Easy band of the React track, second wave (#226).
//
// The first wave left no React tag short, but ten of the tags on React Medium
// challenges sat at exactly three Easy challenges: useRef, useContext, custom
// hooks, timers, pagination, slice, abort, accessibility, derived state and
// splice. Each challenge here practises one or two of them, and together they
// bring all ten to six. Effect cleanup and useEffect gain one each.
//
// Same rules as the first wave: ten minutes or less, a starter that fails its
// own suite, a first focus tag whose documentation page ends the hint ladder,
// and three or more hidden cases beside the solutions (`hiddenSuite`, see
// `../react-hidden.ts`). The suite header and the hand-answered fetch come
// from the first wave. Solutions live in `../solutions/easy-react-b.ts`, and
// `EASY_BAND` in `../catalog.ts` lists this file. English only: there is no
// Czech overlay.
//
// Task bodies only: prompts, starters, visible tests, hints. No solutions.

import type { CodingTaskSource } from '../types';
import { FAKE_FETCH, header } from './easy-react-a';

export const EASY_REACT_B_TASKS: CodingTaskSource[] = [
  /* ── useRef ───────────────────────────────────────────────────────── */
  {
    id: 'react-easy3-send-latest-draft',
    track: 'react',
    topic: 'react',
    level: 14,
    tier: 2,
    focus: ['useRef', 'timers'],
    title: 'Send the latest draft',
    prompt: '"Send later" sends the message 300 milliseconds after the click and shows "Sent: <text>". Whatever you type during that wait belongs in the message, but the timeout reads `draft` from the render in which you clicked, so it sends the old text. Keep the latest draft in a ref as well: set `draftRef.current` in the change handler, and read `draftRef.current` when the timeout fires. If the field is empty by then, nothing is sent.',
    starter: `import React, { useRef, useState } from 'react';

const App = () => {
  const [draft, setDraft] = useState('');
  const [sent, setSent] = useState('');

  const change = (event) => {
    setDraft(event.target.value);
  };

  const sendLater = () => {
    setTimeout(() => setSent(draft), 300);
  };

  return <main>
    <h2>Send the latest draft</h2>
    <label>Message <input value={draft} onChange={change} /></label>
    <button type="button" onClick={sendLater}>Send later</button>
    <p>{sent ? 'Sent: ' + sent : ''}</p>
  </main>;
};

export default App;
`,
    skeleton: `const draftRef = useRef('');

const change = (event) => {
  setDraft(event.target.value);
  // keep the same text in draftRef.current
};

const sendLater = () => {
  setTimeout(() => setSent(/* the latest draft */), 300);
};`,
    hints: ['Each render makes new handler functions, and each one sees the state of its own render. A timeout keeps the function it was given, so it keeps that render\'s `draft`. A ref is one object shared by every render, so `ref.current` read later gives the value written last.'],
    approach: [
      'Create `const draftRef = useRef("")` in App.',
      'In `change`, set `draftRef.current = event.target.value` beside the `setDraft` call.',
      'In the timeout, call `setSent(draftRef.current)` instead of `setSent(draft)`.',
    ],
    verify: 'tests',
    estimatedMinutes: 7,
    suite: `${header()}
const type = value => fireEvent.change(screen.getByLabelText('Message'), { target: { value } });
const send = () => fireEvent.click(screen.getByRole('button', { name: 'Send later' }));
const wait = ms => act(() => new Promise(resolve => setTimeout(resolve, ms)));
const line = container => container.querySelector('p').textContent;

test('nothing is sent before the wait ends', () => {
  const { container } = render(<App />);
  type('Hi');
  send();
  expect(line(container)).toBe('');
});

test('the message is sent after the wait', async () => {
  const { container } = render(<App />);
  type('Hi');
  send();
  await wait(500);
  expect(line(container)).toBe('Sent: Hi');
});

test('text typed during the wait is sent', async () => {
  const { container } = render(<App />);
  type('Hi');
  send();
  type('Hi there');
  await wait(500);
  expect(line(container)).toBe('Sent: Hi there');
});
`,
  },
  {
    id: 'react-easy3-give-focus-back',
    track: 'react',
    topic: 'react',
    level: 14,
    tier: 2,
    focus: ['useRef', 'accessibility'],
    title: 'Give the focus back',
    prompt: '"Rename" opens a small form, and its field takes the keyboard focus. When the form closes, by Save, by Cancel or by the Escape key, the field leaves the page and the focus drops to the page body, so a keyboard user has to find their place again. Put a ref on the Rename button and call `focus()` on it whenever the form closes. Escape anywhere in the form closes it without saving.',
    starter: `import React, { useRef, useState } from 'react';

const App = () => {
  const [name, setName] = useState('Reef survey');
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(false);

  const open = () => {
    setDraft(name);
    setEditing(true);
  };

  const close = () => {
    setEditing(false);
  };

  const save = (event) => {
    event.preventDefault();
    setName(draft);
    close();
  };

  return <main>
    <h2>Give the focus back</h2>
    <p>Project: {name}</p>
    <button type="button" onClick={open}>Rename</button>
    {editing && (
      <form onSubmit={save}>
        <label>New name <input autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} /></label>
        <button type="submit">Save</button>
        <button type="button" onClick={close}>Cancel</button>
      </form>
    )}
  </main>;
};

export default App;
`,
    skeleton: `const renameRef = useRef(null);

const close = () => {
  setEditing(false);
  // move the focus to the Rename button
};

// <button type="button" ref={renameRef} onClick={open}>Rename</button>
// <form onSubmit={save} onKeyDown={(event) => { if (event.key === 'Escape') close(); }}>`,
    hints: ['When the element that has the focus leaves the page, the browser moves the focus to the `body`. The Rename button stays on the page the whole time, so the handler that closes the form can focus it straight away.'],
    approach: [
      'Create `const renameRef = useRef(null)` and pass `ref={renameRef}` to the Rename button.',
      'In `close`, call `renameRef.current.focus()` after `setEditing(false)`. Save and Cancel both go through `close`.',
      'Give the form an `onKeyDown` handler that calls `close()` when `event.key` is "Escape". Key events from the field and the buttons bubble up to it.',
    ],
    verify: 'tests',
    estimatedMinutes: 8,
    suite: `${header()}
const rename = () => screen.getByRole('button', { name: 'Rename' });
const field = () => screen.queryByLabelText('New name');

test('Rename puts the focus in the field', () => {
  render(<App />);
  fireEvent.click(rename());
  expect(document.activeElement).toBe(field());
});

test('Cancel gives the focus back to Rename', () => {
  render(<App />);
  fireEvent.click(rename());
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(field()).toBe(null);
  expect(document.activeElement).toBe(rename());
});

test('Save renames and gives the focus back', () => {
  const { container } = render(<App />);
  fireEvent.click(rename());
  fireEvent.change(field(), { target: { value: 'Kelp count' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  expect(container.querySelector('p').textContent).toBe('Project: Kelp count');
  expect(document.activeElement).toBe(rename());
});
`,
  },

  /* ── custom hooks ─────────────────────────────────────────────────── */
  {
    id: 'react-easy3-use-outside-click',
    track: 'react',
    topic: 'react',
    level: 21,
    tier: 2,
    focus: ['custom-hook', 'useRef'],
    title: 'A useOutsideClick hook',
    prompt: '"Filters" opens a panel of options, and a press anywhere outside should close it. Write and export `useOutsideClick(ref, onOutside)`. In an effect, listen for `mousedown` on `document` and call `onOutside` when `ref.current` does not contain the event\'s `target`; remove the same listener in the effect\'s cleanup. In App, put a ref on the `div` that holds both the button and the panel. A press on Filters then counts as inside, and the button can still close the panel itself.',
    starter: `import React, { useEffect, useRef, useState } from 'react';

// Write and export useOutsideClick here.

const App = () => {
  const [open, setOpen] = useState(false);

  return <main>
    <h2>A useOutsideClick hook</h2>
    <div className="filters">
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

export default App;
`,
    skeleton: `export const useOutsideClick = (ref, onOutside) => {
  useEffect(() => {
    const onMouseDown = (event) => {
      // call onOutside when ref.current does not contain event.target
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => /* remove the same listener */;
  }, [ref, onOutside]);
};

// in App:
// const filtersRef = useRef(null);
// useOutsideClick(filtersRef, () => setOpen(false));`,
    hints: ['`element.contains(node)` is true for the element itself and for anything inside it. A custom hook can take a ref from the component that calls it, and that ref tells the hook which element counts as inside.'],
    approach: [
      'Declare `export const useOutsideClick = (ref, onOutside) => { ... }` with a `useEffect` inside.',
      'In the effect, name a `mousedown` handler that calls `onOutside()` when `ref.current && !ref.current.contains(event.target)`. Add it to `document`, and return a cleanup that removes it.',
      'In App, create a ref with `useRef(null)`, put it on the `div` around the button and the panel, and call `useOutsideClick(ref, () => setOpen(false))`.',
    ],
    verify: 'tests',
    estimatedMinutes: 9,
    suite: `${header('useOutsideClick')}
const toggle = () => fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
const isOpen = () => screen.queryByLabelText('In stock') !== null;

test('Filters opens the panel', () => {
  render(<App />);
  toggle();
  expect(isOpen()).toBe(true);
});

test('a press outside closes it', () => {
  render(<App />);
  toggle();
  fireEvent.mouseDown(screen.getByText('12 results'));
  expect(isOpen()).toBe(false);
});

test('a press inside leaves it open', () => {
  render(<App />);
  toggle();
  fireEvent.mouseDown(screen.getByLabelText('On sale'));
  expect(isOpen()).toBe(true);
});
`,
  },
  {
    id: 'react-easy3-use-theme-guard',
    track: 'react',
    topic: 'react',
    level: 21,
    tier: 2,
    focus: ['custom-hook', 'useContext'],
    title: 'A useTheme hook with a guard',
    prompt: '`Badge` reads the theme with `useContext(ThemeContext)`. Rendered outside `ThemeProvider`, it gets `null` and shows "Theme: " with nothing after it, and nothing says why. Write and export `useTheme()`. It reads `ThemeContext`, throws `new Error("useTheme must be used inside ThemeProvider")` when the value is `null`, and returns the value otherwise. Use it in `Badge` in place of `useContext`.',
    starter: `import React, { createContext, useContext, useState } from 'react';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('dark');
  const toggle = () => setTheme((previous) => (previous === 'dark' ? 'light' : 'dark'));
  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
};

// Write and export useTheme here.

export const Badge = () => {
  const value = useContext(ThemeContext);
  return <>
    <p>Theme: {value?.theme}</p>
    <button type="button" onClick={value?.toggle}>Switch theme</button>
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

export default App;
`,
    skeleton: `export const useTheme = () => {
  const value = useContext(ThemeContext);
  if (/* no provider above */) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return value;
};

// in Badge: const { theme, toggle } = useTheme();`,
    hints: ['`useContext` returns the default from `createContext` when no provider sits above the component. Here the default is `null`, so a `null` value means the component was rendered in the wrong place. A hook may throw during render, and its message can name the mistake.'],
    approach: [
      'Declare `export const useTheme = () => { ... }` and call `useContext(ThemeContext)` inside it.',
      'If the value is `null`, throw the error with the exact message; otherwise return the value.',
      'In Badge, replace the `useContext` call with `const { theme, toggle } = useTheme()`.',
    ],
    verify: 'tests',
    estimatedMinutes: 7,
    suite: `${header('Badge, ThemeProvider, useTheme')}
const message = run => {
  try {
    run();
    return 'no error';
  } catch (error) {
    return error.message;
  }
};

test('the badge shows the theme and switches it', () => {
  const { container } = render(<App />);
  expect(container.querySelector('p').textContent).toBe('Theme: dark');
  fireEvent.click(screen.getByRole('button', { name: 'Switch theme' }));
  expect(container.querySelector('p').textContent).toBe('Theme: light');
});

test('useTheme returns the theme inside the provider', () => {
  const Probe = () => <output>{useTheme().theme}</output>;
  const { container } = render(<ThemeProvider><Probe /></ThemeProvider>);
  expect(container.textContent).toBe('dark');
});

test('useTheme outside the provider throws a clear error', () => {
  const Probe = () => <output>{message(() => useTheme())}</output>;
  const { container } = render(<Probe />);
  expect(container.textContent).toBe('useTheme must be used inside ThemeProvider');
});
`,
  },
  {
    id: 'react-easy3-use-interval',
    track: 'react',
    topic: 'react',
    level: 21,
    tier: 2,
    focus: ['custom-hook', 'timers'],
    title: 'A useInterval hook',
    prompt: 'Write and export `useInterval(callback, delay)`. It calls `callback` every `delay` milliseconds, and a `delay` of `null` runs no interval, which is how a caller pauses it. Start the interval in an effect that depends on `delay` alone, and clear it in the cleanup. Keep the latest `callback` in a ref, updated in an effect of its own, and call `ref.current()` on each tick: a new callback on every render then never restarts the timer. App counts up every 100 milliseconds, and Pause stops the count.',
    starter: `import React, { useEffect, useRef, useState } from 'react';

// Write and export useInterval here.

const App = () => {
  const [count, setCount] = useState(0);
  const [running, setRunning] = useState(true);

  return <main>
    <h2>A useInterval hook</h2>
    <p>{count}</p>
    <button type="button" onClick={() => setRunning((previous) => !previous)}>{running ? 'Pause' : 'Resume'}</button>
  </main>;
};

export default App;
`,
    skeleton: `export const useInterval = (callback, delay) => {
  const callbackRef = useRef(callback);

  useEffect(() => {
    // remember the latest callback
  });

  useEffect(() => {
    if (delay === null) return;
    // start an interval that calls callbackRef.current(), and clear it in the cleanup
  }, [delay]);
};

// in App: useInterval(() => setCount((previous) => previous + 1), running ? 100 : null);`,
    hints: ['An effect whose dependencies change runs its cleanup and starts again. If the interval effect depended on `callback`, the new function from each render would clear the timer and start it over, and a component that renders more often than `delay` would never see a tick.'],
    approach: [
      'In the hook, create `const callbackRef = useRef(callback)` and an effect with no dependency array that sets `callbackRef.current = callback`.',
      'In a second effect with `[delay]`, return early when `delay` is `null`. Otherwise start `setInterval(() => callbackRef.current(), delay)` and return `() => clearInterval(id)`.',
      'In App, call `useInterval(() => setCount((previous) => previous + 1), running ? 100 : null)`.',
    ],
    verify: 'tests',
    estimatedMinutes: 9,
    suite: `${header('useInterval')}
const count = container => Number(container.querySelector('p').textContent);
const wait = ms => act(() => new Promise(resolve => setTimeout(resolve, ms)));

test('counts up while it runs', async () => {
  const { container } = render(<App />);
  await waitFor(() => expect(count(container) >= 2).toBe(true), { timeout: 2000 });
});

test('Pause stops the count', async () => {
  const { container } = render(<App />);
  await waitFor(() => expect(count(container) >= 1).toBe(true), { timeout: 2000 });
  fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
  const paused = count(container);
  await wait(350);
  expect(count(container)).toBe(paused);
});

test('Resume carries on from the paused count', async () => {
  const { container } = render(<App />);
  await waitFor(() => expect(count(container) >= 1).toBe(true), { timeout: 2000 });
  fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
  const paused = count(container);
  fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
  await waitFor(() => expect(count(container) > paused).toBe(true), { timeout: 2000 });
});
`,
  },

  /* ── abort ────────────────────────────────────────────────────────── */
  {
    id: 'react-easy3-slow-request-timeout',
    track: 'react',
    topic: 'react',
    level: 13,
    tier: 2,
    focus: ['abort', 'timers'],
    title: 'Give up on a slow request',
    prompt: '"Load" fetches `/api/users/1` and greets the user by name. When the server takes longer than 300 milliseconds, give up. Create an `AbortController` for each load, pass its `signal` to `fetch`, and start a `setTimeout` that calls `abort()` after 300 milliseconds. The aborted request rejects with an `AbortError`: show "The server is taking too long" for it, and keep "Could not load the user" for any other error. Clear the timeout once the request has finished, so a load that answered in time is never aborted afterwards.',
    starter: `import React, { useState } from 'react';

const App = () => {
  const [status, setStatus] = useState('');

  const load = async () => {
    setStatus('Loading…');
    try {
      const response = await fetch('/api/users/1');
      const user = await response.json();
      setStatus('Hello, ' + user.name);
    } catch (error) {
      setStatus('Could not load the user');
    }
  };

  return <main>
    <h2>Give up on a slow request</h2>
    <button type="button" onClick={load}>Load</button>
    <p>{status}</p>
  </main>;
};

export default App;
`,
    skeleton: `const load = async () => {
  setStatus('Loading…');
  const controller = new AbortController();
  const timer = setTimeout(() => /* abort the request */, 300);
  try {
    const response = await fetch('/api/users/1', { signal: controller.signal });
    // read the user and greet them
  } catch (error) {
    // an AbortError means the timeout fired
  } finally {
    clearTimeout(timer);
  }
};`,
    hints: ['A timeout and an `AbortController` work as a pair: the timeout calls `controller.abort()`, and the `fetch` that got `controller.signal` rejects at once with an error named "AbortError". `clearTimeout` stops a timeout that has not fired yet.'],
    approach: [
      'At the start of `load`, create a new `AbortController` and start `setTimeout(() => controller.abort(), 300)`, keeping its id.',
      'Pass `{ signal: controller.signal }` to `fetch`, and call `clearTimeout` with the id in a `finally` once the request has finished.',
      'In the `catch`, show "The server is taking too long" when `error.name` is "AbortError", and "Could not load the user" otherwise.',
    ],
    verify: 'tests',
    estimatedMinutes: 9,
    suite: `${header()}${FAKE_FETCH}
const load = () => fireEvent.click(screen.getByRole('button', { name: 'Load' }));
const status = container => container.querySelector('p').textContent;
const wait = ms => act(() => new Promise(resolve => setTimeout(resolve, ms)));

test('a quick answer greets the user', () => withFetch(async calls => {
  const { container } = render(<App />);
  load();
  await act(async () => { calls[0].respond({ name: 'Ada' }); });
  expect(status(container)).toBe('Hello, Ada');
}));

test('the request carries a signal', () => withFetch(async calls => {
  render(<App />);
  load();
  expect(calls[0].signal).toBeTruthy();
  expect(calls[0].signal.aborted).toBe(false);
}));

test('a slow request gives up after the wait', () => withFetch(async calls => {
  const { container } = render(<App />);
  load();
  await wait(500);
  expect(calls[0].signal.aborted).toBe(true);
  expect(status(container)).toBe('The server is taking too long');
}));
`,
  },
  {
    id: 'react-easy3-one-stop-two-requests',
    track: 'react',
    topic: 'react',
    level: 13,
    tier: 2,
    focus: ['abort', 'fetch'],
    title: 'One Stop for two requests',
    prompt: '"Load" asks for a user and their posts at once, `/api/users/1` and `/api/posts?userId=1`, and shows "Leanne Graham, 3 posts" when both arrive. "Stop" should cancel both. Create one `AbortController` for each load, keep it in a ref, pass the same `signal` to both `fetch` calls, and call `abort()` from Stop: one signal cancels every request that carries it. Show "Stopped" when the error is an `AbortError`, and keep "Could not load" for anything else.',
    starter: `import React, { useRef, useState } from 'react';

const App = () => {
  const [status, setStatus] = useState('');

  const load = async () => {
    setStatus('Loading…');
    try {
      const [user, posts] = await Promise.all([
        fetch('/api/users/1').then((response) => response.json()),
        fetch('/api/posts?userId=1').then((response) => response.json()),
      ]);
      setStatus(user.name + ', ' + posts.length + ' posts');
    } catch (error) {
      setStatus('Could not load');
    }
  };

  const stop = () => {
  };

  return <main>
    <h2>One Stop for two requests</h2>
    <button type="button" onClick={load}>Load</button>
    <button type="button" onClick={stop}>Stop</button>
    <p>{status}</p>
  </main>;
};

export default App;
`,
    skeleton: `const controllerRef = useRef(null);

const load = async () => {
  const controller = new AbortController();
  controllerRef.current = controller;
  // pass { signal: controller.signal } to both fetch calls
};

const stop = () => {
  // abort the latest controller, if there is one
};`,
    hints: ['A signal belongs to its controller, not to one request. Every `fetch` given the same signal rejects when that controller aborts, and `Promise.all` rejects as soon as the first of them does.'],
    approach: [
      'Create `const controllerRef = useRef(null)`, and at the start of `load` store a new `AbortController` in it.',
      'Pass `{ signal: controller.signal }` as the second argument to both `fetch` calls.',
      'In `stop`, call `controllerRef.current?.abort()`. In the `catch`, show "Stopped" when `error.name` is "AbortError".',
    ],
    verify: 'tests',
    estimatedMinutes: 8,
    suite: `${header()}${FAKE_FETCH}
const press = label => fireEvent.click(screen.getByRole('button', { name: label }));
const status = container => container.querySelector('p').textContent;
const forUrl = (calls, url) => calls.find(call => call.url === url);

test('both answers show together', () => withFetch(async calls => {
  const { container } = render(<App />);
  press('Load');
  await act(async () => {
    forUrl(calls, '/api/users/1').respond({ name: 'Ada' });
    forUrl(calls, '/api/posts?userId=1').respond([{ id: 1 }, { id: 2 }, { id: 3 }]);
  });
  expect(status(container)).toBe('Ada, 3 posts');
}));

test('both requests carry one signal', () => withFetch(async calls => {
  render(<App />);
  press('Load');
  expect(calls.length).toBe(2);
  expect(calls[0].signal).toBeTruthy();
  expect(calls[0].signal).toBe(calls[1].signal);
}));

test('Stop cancels both and shows Stopped', () => withFetch(async calls => {
  const { container } = render(<App />);
  press('Load');
  await act(async () => { press('Stop'); });
  expect(calls[0].signal.aborted).toBe(true);
  expect(calls[1].signal.aborted).toBe(true);
  expect(status(container)).toBe('Stopped');
}));
`,
  },
  {
    id: 'react-easy3-listeners-one-abort',
    track: 'react',
    topic: 'react',
    level: 13,
    tier: 2,
    focus: ['abort', 'effect-cleanup'],
    title: 'Remove listeners with one abort',
    prompt: 'The status line shows which device you used last: "Last input: keyboard" after a key press anywhere in the window, and "Last input: mouse" after the mouse moves. Add both listeners to `window` in one effect that runs once, and give each of them the options `{ signal: controller.signal }` from a single `AbortController`. The effect\'s cleanup is then one call, `controller.abort()`, which removes both listeners without a `removeEventListener` for each.',
    starter: `import React, { useEffect, useState } from 'react';

const App = () => {
  const [device, setDevice] = useState('none');

  return <main>
    <h2>Remove listeners with one abort</h2>
    <p>Last input: {device}</p>
  </main>;
};

export default App;
`,
    skeleton: `useEffect(() => {
  const controller = new AbortController();
  window.addEventListener('keydown', () => setDevice('keyboard'), { signal: controller.signal });
  // the same for mousemove
  return () => /* one call removes both */;
}, []);`,
    hints: ['`addEventListener` takes an options object as its third argument. A listener added with a `signal` goes away when that signal aborts, and any number of listeners can share one signal.'],
    approach: [
      'In a `useEffect` with an empty dependency array, create `const controller = new AbortController()`.',
      'Add a `keydown` listener that sets "keyboard" and a `mousemove` listener that sets "mouse" to `window`, each with `{ signal: controller.signal }` as the third argument.',
      'Return `() => controller.abort()` from the effect.',
    ],
    verify: 'tests',
    estimatedMinutes: 7,
    suite: `${header()}
const line = container => container.querySelector('p').textContent;
// Records the keydown and mousemove listeners added to window, with their options.
const watchWindowListeners = () => {
  const realAdd = window.addEventListener;
  const added = [];
  window.addEventListener = function (type, listener, options) {
    if (type === 'keydown' || type === 'mousemove') added.push({ type, options });
    return realAdd.call(this, type, listener, options);
  };
  added.restore = () => { window.addEventListener = realAdd; };
  return added;
};

test('a key press shows keyboard', () => {
  const { container } = render(<App />);
  fireEvent.keyDown(window, { key: 'a' });
  expect(line(container)).toBe('Last input: keyboard');
});

test('a mouse move shows mouse', () => {
  const { container } = render(<App />);
  fireEvent.keyDown(window, { key: 'a' });
  fireEvent.mouseMove(window);
  expect(line(container)).toBe('Last input: mouse');
});

test('both listeners share one signal', () => {
  const added = watchWindowListeners();
  try {
    render(<App />);
    expect(added.map(one => one.type).sort()).toEqual(['keydown', 'mousemove']);
    expect(Boolean(added[0].options && added[0].options.signal)).toBe(true);
    expect(added[0].options.signal).toBe(added[1].options.signal);
  } finally {
    added.restore();
  }
});
`,
  },

  /* ── pagination ───────────────────────────────────────────────────── */
  {
    id: 'react-easy3-results-line',
    track: 'react',
    topic: 'react',
    level: 23,
    tier: 1,
    focus: ['pagination', 'derived-state'],
    title: 'The results line',
    prompt: 'Under the recipes, a line says which ones the page shows: "Showing 1 to 4 of 10 recipes" on the first page. Work both ends out from `page` while rendering. The first is `(page - 1) * PAGE_SIZE + 1`, and the last is `page * PAGE_SIZE`, but never more than the number of recipes. With no recipes at all, the line reads "No recipes". Disable Previous on the first page and Next on the last, and both when there are no recipes. `page` stays the only state.',
    starter: `import React, { useState } from 'react';

const allRecipes = ['Pancakes', 'Omelette', 'Risotto', 'Chili', 'Ramen', 'Paella', 'Curry', 'Tacos', 'Gnocchi', 'Falafel'];
const PAGE_SIZE = 4;

const App = ({ recipes = allRecipes }) => {
  const [page, setPage] = useState(1);
  const start = (page - 1) * PAGE_SIZE;

  return <main>
    <h2>The results line</h2>
    <ul>
      {recipes.slice(start, start + PAGE_SIZE).map((recipe) => <li key={recipe}>{recipe}</li>)}
    </ul>
    <p>Showing 1 to 4 of 10 recipes</p>
    <button type="button" onClick={() => setPage((previous) => previous - 1)}>Previous</button>
    <button type="button" onClick={() => setPage((previous) => previous + 1)}>Next</button>
  </main>;
};

export default App;
`,
    skeleton: `const pageCount = Math.ceil(recipes.length / PAGE_SIZE);
const first = start + 1;
const last = /* page * PAGE_SIZE, but no more than recipes.length */;

// <p>{recipes.length === 0 ? 'No recipes' : 'Showing ' + first + ' to ' + last + ' of ' + recipes.length + ' recipes'}</p>
// <button type="button" disabled={page <= 1} ...>Previous</button>`,
    hints: ['People count results from 1 and arrays count from 0, so the first recipe on a page sits at index `start` and reads as number `start + 1`. `Math.min(a, b)` keeps the smaller of two numbers, which trims the last page.'],
    approach: [
      'Work out `first` as `start + 1` and `last` as `Math.min(page * PAGE_SIZE, recipes.length)`.',
      'Render "No recipes" when the list is empty, and the "Showing ... to ... of ... recipes" line otherwise.',
      'Work out `pageCount` as `Math.ceil(recipes.length / PAGE_SIZE)`, then pass `disabled={page <= 1}` to Previous and `disabled={page >= pageCount}` to Next.',
    ],
    verify: 'tests',
    estimatedMinutes: 7,
    suite: `${header()}
const press = label => fireEvent.click(screen.getByRole('button', { name: label }));
const line = container => container.querySelector('p').textContent;

test('the first page shows 1 to 4', () => {
  const { container } = render(<App />);
  expect(line(container)).toBe('Showing 1 to 4 of 10 recipes');
});

test('the last page stops at the last recipe', () => {
  const { container } = render(<App />);
  press('Next');
  press('Next');
  expect(line(container)).toBe('Showing 9 to 10 of 10 recipes');
});

test('Previous is disabled on the first page and Next on the last', () => {
  render(<App />);
  expect(screen.getByRole('button', { name: 'Previous' }).disabled).toBe(true);
  expect(screen.getByRole('button', { name: 'Next' }).disabled).toBe(false);
  press('Next');
  press('Next');
  expect(screen.getByRole('button', { name: 'Next' }).disabled).toBe(true);
});
`,
  },
  {
    id: 'react-easy3-rows-per-page',
    track: 'react',
    topic: 'react',
    level: 23,
    tier: 2,
    focus: ['pagination', 'slice'],
    title: 'Rows per page',
    prompt: 'The list shows 23 orders one page at a time, and a "Rows per page" select offers 5, 10 and 20. Show the orders of the current page with `orders.slice(start, start + rowsPerPage)`, where `start` is `(page - 1) * rowsPerPage`. When the reader picks another size, go back to page 1: page 4 of five rows would point past the end once a page holds twenty. A select hands you its value as text, so turn it into a number before you store it.',
    starter: `import React, { useState } from 'react';

const allOrders = Array.from({ length: 23 }, (_, index) => 'Order ' + (index + 1));

const App = ({ orders = allOrders }) => {
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const pageCount = Math.max(1, Math.ceil(orders.length / rowsPerPage));

  return <main>
    <h2>Rows per page</h2>
    <label>Rows per page <select value={rowsPerPage}>
      <option value="5">5</option>
      <option value="10">10</option>
      <option value="20">20</option>
    </select></label>
    <ul>
      {orders.map((order) => <li key={order}>{order}</li>)}
    </ul>
    <p>Page {page} of {pageCount}</p>
    <button type="button" disabled={page === 1} onClick={() => setPage((previous) => previous - 1)}>Previous</button>
    <button type="button" disabled={page === pageCount} onClick={() => setPage((previous) => previous + 1)}>Next</button>
  </main>;
};

export default App;
`,
    skeleton: `const start = (page - 1) * rowsPerPage;
const visible = orders.slice(start, start + rowsPerPage);

const changeSize = (event) => {
  // store Number(event.target.value), and go back to page 1
};

// <select value={rowsPerPage} onChange={changeSize}>`,
    hints: ['Page 1 starts at index 0 and page 2 at index `rowsPerPage`. `slice` stops before its end index and never runs past the end of the array, so a short last page needs no special case.'],
    approach: [
      'Work out `start` as `(page - 1) * rowsPerPage` and render `orders.slice(start, start + rowsPerPage)` instead of every order.',
      'Give the select an `onChange` that calls `setRowsPerPage(Number(event.target.value))`.',
      'In the same handler, call `setPage(1)`.',
    ],
    verify: 'tests',
    estimatedMinutes: 8,
    suite: `${header()}
const rows = container => [...container.querySelectorAll('li')].map(li => li.textContent);
const range = (from, to) => Array.from({ length: to - from + 1 }, (_, index) => 'Order ' + (from + index));
const press = label => fireEvent.click(screen.getByRole('button', { name: label }));
const pickSize = size => fireEvent.change(screen.getByLabelText('Rows per page'), { target: { value: size } });

test('five rows to start', () => {
  const { container } = render(<App />);
  expect(rows(container)).toEqual(range(1, 5));
});

test('Next shows the next five', () => {
  const { container } = render(<App />);
  press('Next');
  expect(rows(container)).toEqual(range(6, 10));
});

test('a new size goes back to page 1', () => {
  const { container } = render(<App />);
  press('Next');
  press('Next');
  pickSize('10');
  expect(rows(container)).toEqual(range(1, 10));
  expect(container.querySelector('p').textContent).toBe('Page 1 of 3');
});
`,
  },
  {
    id: 'react-easy3-fetch-a-page',
    track: 'react',
    topic: 'react',
    level: 23,
    tier: 2,
    focus: ['pagination', 'useEffect'],
    title: 'Ask the server for one page',
    prompt: 'The server hands out posts one page at a time. Whenever `page` changes, fetch `/api/posts?_page=<page>&_limit=5` in an effect and show the titles it sends back. The server never says how many pages there are, so a page that comes back with fewer than 5 posts is the last one: disable Next then. Disable Previous on page 1.',
    starter: `import React, { useEffect, useState } from 'react';

const PAGE_SIZE = 5;

const App = () => {
  const [page, setPage] = useState(1);
  const [posts, setPosts] = useState([]);

  return <main>
    <h2>Ask the server for one page</h2>
    <ul>
      {posts.map((post) => <li key={post.id}>{post.title}</li>)}
    </ul>
    <p>Page {page}</p>
    <button type="button" onClick={() => setPage((previous) => previous - 1)}>Previous</button>
    <button type="button" onClick={() => setPage((previous) => previous + 1)}>Next</button>
  </main>;
};

export default App;
`,
    skeleton: `useEffect(() => {
  fetch('/api/posts?_page=' + page + '&_limit=' + PAGE_SIZE)
    .then((response) => response.json())
    .then(/* store the posts */);
}, [/* run again when the page changes */]);

const lastPage = posts.length < PAGE_SIZE;`,
    hints: ['An effect with `[page]` as its dependency array runs after the first render and again after every render in which `page` changed. That is the moment to ask for the new page.'],
    approach: [
      'Write a `useEffect` that fetches the URL for the current `page`, reads the JSON and stores it with `setPosts`.',
      'Give the effect the dependency array `[page]`, so Next and Previous each start one request.',
      'Pass `disabled={page === 1}` to Previous and `disabled={posts.length < PAGE_SIZE}` to Next.',
    ],
    verify: 'tests',
    estimatedMinutes: 9,
    suite: `${header()}${FAKE_FETCH}
const posts = (from, count) => Array.from({ length: count }, (_, index) => ({ id: from + index, title: 'Post ' + (from + index) }));
const titles = container => [...container.querySelectorAll('li')].map(li => li.textContent);
const button = label => screen.getByRole('button', { name: label });

test('the first page is fetched when the page opens', () => withFetch(async calls => {
  const { container } = render(<App />);
  expect(calls.length > 0 && calls[0].url).toBe('/api/posts?_page=1&_limit=5');
  await act(async () => { calls[0].respond(posts(1, 5)); });
  expect(titles(container)).toEqual(['Post 1', 'Post 2', 'Post 3', 'Post 4', 'Post 5']);
}));

test('Next fetches the next page', () => withFetch(async calls => {
  const { container } = render(<App />);
  expect(calls.length).toBe(1);
  await act(async () => { calls[0].respond(posts(1, 5)); });
  fireEvent.click(button('Next'));
  expect(calls.length > 1 && calls[1].url).toBe('/api/posts?_page=2&_limit=5');
  await act(async () => { calls[1].respond(posts(6, 2)); });
  expect(titles(container)).toEqual(['Post 6', 'Post 7']);
}));

test('a short page disables Next', () => withFetch(async calls => {
  render(<App />);
  expect(calls.length).toBe(1);
  await act(async () => { calls[0].respond(posts(1, 5)); });
  fireEvent.click(button('Next'));
  await act(async () => { calls[1].respond(posts(6, 2)); });
  expect(button('Next').disabled).toBe(true);
  expect(button('Previous').disabled).toBe(false);
}));
`,
  },

  /* ── slice ────────────────────────────────────────────────────────── */
  {
    id: 'react-easy3-breadcrumbs',
    track: 'react',
    topic: 'react',
    level: 10,
    tier: 2,
    focus: ['slice', 'derived-state'],
    title: 'Breadcrumbs from a path',
    prompt: 'Show the current `path` as breadcrumbs. For "/docs/react/hooks" the crumbs read "docs", "react" and "hooks". Every crumb but the last is a link to the path up to and including it, "/docs" and then "/docs/react", and the last is plain text. Split the path on "/", drop the empty parts that the leading slash and any trailing slash leave, and build each link from `parts.slice(0, index + 1)`. Work the crumbs out while rendering, so they follow when "Go up" shortens the path.',
    starter: `import React, { useState } from 'react';

const App = ({ start = '/docs/react/hooks' }) => {
  const [path, setPath] = useState(start);

  const goUp = () => setPath((previous) => previous.slice(0, previous.lastIndexOf('/')) || '/');

  return <main>
    <h2>Breadcrumbs from a path</h2>
    <nav aria-label="Breadcrumb">
      <ol>
      </ol>
    </nav>
    <button type="button" onClick={goUp} disabled={path === '/'}>Go up</button>
  </main>;
};

export default App;
`,
    skeleton: `const parts = path.split('/').filter(/* keep the parts that are not empty */);

// {parts.map((part, index) => (
//   <li key={index}>
//     {index === parts.length - 1
//       ? part
//       : <a href={'/' + parts.slice(0, index + 1).join('/')}>{part}</a>}
//   </li>
// ))}`,
    hints: ['`"/docs/react".split("/")` gives `["", "docs", "react"]`: the leading slash leaves an empty string in front. `slice(0, n)` copies the first `n` parts, so the crumb at `index` needs `index + 1` of them.'],
    approach: [
      'Split `path` on "/" and filter out the empty strings to get `parts`.',
      'Map `parts` to list items. The last one renders its text; every other one renders an `<a>` whose `href` is "/" followed by `parts.slice(0, index + 1).join("/")`.',
      'Compute `parts` in the body of App rather than in state, so a new path gives new crumbs on the next render.',
    ],
    verify: 'tests',
    estimatedMinutes: 8,
    suite: `${header()}
const crumbs = container => [...container.querySelectorAll('li')].map(li => li.textContent);
const links = container => [...container.querySelectorAll('li a')].map(a => a.getAttribute('href'));

test('one crumb for each part of the path', () => {
  const { container } = render(<App />);
  expect(crumbs(container)).toEqual(['docs', 'react', 'hooks']);
});

test('each crumb but the last links to its own path', () => {
  const { container } = render(<App />);
  expect(links(container)).toEqual(['/docs', '/docs/react']);
  expect(container.querySelector('li:last-child a')).toBe(null);
});

test('Go up shortens the crumbs', () => {
  const { container } = render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Go up' }));
  expect(crumbs(container)).toEqual(['docs', 'react']);
  expect(links(container)).toEqual(['/docs']);
});
`,
  },
  {
    id: 'react-easy3-read-more',
    track: 'react',
    topic: 'react',
    level: 9,
    tier: 1,
    focus: ['slice', 'conditional'],
    title: 'Read more',
    prompt: 'A review longer than 60 characters starts folded: show `text.slice(0, 60)` followed by "...", with a "Read more" button under it. The button shows the whole review and turns into "Show less", which folds it again. A review of 60 characters or fewer shows in full, with no button at all.',
    starter: `import React, { useState } from 'react';

const sampleReview = 'The boat left on time, the crew knew every reef by name, and we saw four turtles before lunch.';
const LIMIT = 60;

const App = ({ text = sampleReview }) => {
  const [open, setOpen] = useState(false);

  return <main>
    <h2>Read more</h2>
    <p>{text}</p>
  </main>;
};

export default App;
`,
    skeleton: `const long = text.length > LIMIT;
const shown = long && !open ? /* the first LIMIT characters and "..." */ : text;

// <p>{shown}</p>
// {long && <button type="button" onClick={...}>{open ? 'Show less' : 'Read more'}</button>}`,
    hints: ['`slice(0, n)` on a string returns its first `n` characters and leaves the string as it was. A button that should not exist stays out of the JSX: `{long && <button>...</button>}` renders nothing when `long` is false.'],
    approach: [
      'Work out `long` as `text.length > LIMIT`.',
      'Render `text.slice(0, LIMIT) + "..."` while the review is long and folded, and `text` otherwise.',
      'Render the button only when `long` is true. Its click flips `open`, and its label reads "Show less" while open and "Read more" while folded.',
    ],
    verify: 'tests',
    estimatedMinutes: 6,
    suite: `${header()}
const LONG = 'We booked two dives and the second was even better than the first. Bring a warm hood.';
const SHORT = 'Great trip.';
const text = container => container.querySelector('p').textContent;

test('a long review starts folded', () => {
  const { container } = render(<App text={LONG} />);
  expect(text(container)).toBe(LONG.slice(0, 60) + '...');
  expect(screen.getByRole('button').textContent).toBe('Read more');
});

test('Read more unfolds it and Show less folds it again', () => {
  const { container } = render(<App text={LONG} />);
  fireEvent.click(screen.getByRole('button', { name: 'Read more' }));
  expect(text(container)).toBe(LONG);
  fireEvent.click(screen.getByRole('button', { name: 'Show less' }));
  expect(text(container)).toBe(LONG.slice(0, 60) + '...');
});

test('a short review shows in full, with no button', () => {
  const { container } = render(<App text={SHORT} />);
  expect(text(container)).toBe(SHORT);
  expect(screen.queryByRole('button')).toBe(null);
});
`,
  },

  /* ── accessibility ────────────────────────────────────────────────── */
  {
    id: 'react-easy3-pressed-buttons',
    track: 'react',
    topic: 'react',
    level: 8,
    tier: 1,
    focus: ['accessibility', 'useState'],
    title: 'Buttons that say they are pressed',
    prompt: 'Bold and Italic should switch their style on and off for the preview line, and a pressed button should say so. Give each button a state of its own and a click that flips it. Show that state with `aria-pressed`: `true` while the style is on and `false` while it is off. A screen reader announces the attribute as "pressed" or "not pressed", which a change of color cannot tell anyone. Keep the labels "Bold" and "Italic" as they are.',
    starter: `import React, { useState } from 'react';

const App = () => {
  const bold = false;
  const italic = false;

  return <main>
    <h2>Buttons that say they are pressed</h2>
    <div role="toolbar" aria-label="Formatting">
      <button type="button" className={bold ? 'on' : ''}>Bold</button>
      <button type="button" className={italic ? 'on' : ''}>Italic</button>
    </div>
    <p style={{ fontWeight: bold ? 'bold' : 'normal', fontStyle: italic ? 'italic' : 'normal' }}>The tide turns at noon.</p>
  </main>;
};

export default App;
`,
    skeleton: `const [bold, setBold] = useState(false);

// <button type="button" aria-pressed={bold} onClick={() => setBold((previous) => !previous)}>Bold</button>`,
    hints: ['React writes `aria-pressed={true}` as "true" and `aria-pressed={false}` as "false", the two values the attribute expects. To a screen reader, a button with `aria-pressed` is a toggle button.'],
    approach: [
      'Replace the two constants with `useState(false)` for `bold` and for `italic`.',
      'Give each button an `onClick` that flips its own state with the updater form.',
      'Add `aria-pressed={bold}` to Bold and `aria-pressed={italic}` to Italic.',
    ],
    verify: 'tests',
    estimatedMinutes: 6,
    suite: `${header()}
const button = name => screen.getByRole('button', { name });
const pressed = name => button(name).getAttribute('aria-pressed');
const preview = container => container.querySelector('p').style;

test('both start not pressed', () => {
  render(<App />);
  expect(pressed('Bold')).toBe('false');
  expect(pressed('Italic')).toBe('false');
});

test('Bold presses and releases', () => {
  const { container } = render(<App />);
  fireEvent.click(button('Bold'));
  expect(pressed('Bold')).toBe('true');
  expect(preview(container).fontWeight).toBe('bold');
  fireEvent.click(button('Bold'));
  expect(pressed('Bold')).toBe('false');
  expect(preview(container).fontWeight).toBe('normal');
});

test('the labels stay the same', () => {
  render(<App />);
  fireEvent.click(button('Italic'));
  expect(button('Italic').textContent).toBe('Italic');
});
`,
  },
  {
    id: 'react-easy3-name-the-remove-buttons',
    track: 'react',
    topic: 'react',
    level: 22,
    tier: 1,
    focus: ['accessibility', 'splice'],
    title: 'Name the remove buttons',
    prompt: 'Each song in the playlist has a "×" button, and a screen reader reads every one of them the same way, so nobody can tell which song a button removes. Give each button an `aria-label` of "Remove <title>"; the "×" stays as the text you see. Make the button remove its song: copy the playlist and call `splice(index, 1)` on the copy. Remove by position, because the same song can be on the list twice.',
    starter: `import React, { useState } from 'react';

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
  };

  return <main>
    <h2>Name the remove buttons</h2>
    <ol>
      {playlist.map((song, index) => (
        <li key={song.id}>
          <span>{song.title}</span>
          <button type="button" onClick={() => remove(index)}>×</button>
        </li>
      ))}
    </ol>
  </main>;
};

export default App;
`,
    skeleton: `const remove = (index) => {
  const next = [...playlist];
  // take out the one song at index
  setPlaylist(next);
};

// <button type="button" aria-label={/* "Remove " and the title */} onClick={() => remove(index)}>×</button>`,
    hints: ['A screen reader reads a button by its accessible name. By default that is the text inside it; `aria-label` replaces it, and the "×" still shows on screen.'],
    approach: [
      'Add `aria-label={"Remove " + song.title}` to the button.',
      'In `remove`, copy the playlist with `[...playlist]` and call `splice(index, 1)` on the copy.',
      'Store the copy with `setPlaylist`. Never call `splice` on `playlist` itself: it is the array in state, and at first it is the `songs` prop.',
    ],
    verify: 'tests',
    estimatedMinutes: 6,
    suite: `${header()}
const titles = container => [...container.querySelectorAll('li span')].map(span => span.textContent);

test('each button is named after its song', () => {
  render(<App />);
  expect(screen.getByRole('button', { name: 'Remove Undertow' }).textContent).toBe('×');
});

test('a button removes its own song', () => {
  const { container } = render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Remove Undertow' }));
  expect(titles(container)).toEqual(['Intro', 'Tidal', 'Tidal', 'Outro']);
});

test('every song has a named button', () => {
  render(<App />);
  expect(screen.getAllByRole('button', { name: /^Remove / }).length).toBe(5);
});
`,
  },

  /* ── derived state ────────────────────────────────────────────────── */
  {
    id: 'react-easy3-characters-left',
    track: 'react',
    topic: 'react',
    level: 15,
    tier: 1,
    focus: ['derived-state', 'forms'],
    title: 'Characters left',
    prompt: 'A post holds at most 80 characters. Under the text box, show "Characters left: <n>", or "Too long by <n>" once the text runs over. Disable Post while the text is empty or too long. Work all of it out from `text` while rendering: a count kept in a state of its own needs an update on every change, and one missed update leaves it wrong.',
    starter: `import React, { useState } from 'react';

const LIMIT = 80;

const App = () => {
  const [text, setText] = useState('');
  const [posts, setPosts] = useState([]);

  const post = (event) => {
    event.preventDefault();
    setPosts((previous) => [...previous, text]);
    setText('');
  };

  return <main>
    <h2>Characters left</h2>
    <form onSubmit={post}>
      <label>Post <textarea value={text} onChange={(event) => setText(event.target.value)} /></label>
      <p>Characters left: 80</p>
      <button type="submit">Post</button>
    </form>
    <ul>
      {posts.map((one, index) => <li key={index}>{one}</li>)}
    </ul>
  </main>;
};

export default App;
`,
    skeleton: `const left = LIMIT - text.length;

// <p>{left >= 0 ? 'Characters left: ' + left : 'Too long by ' + -left}</p>
// <button type="submit" disabled={/* empty or too long */}>Post</button>`,
    hints: ['Anything you can work out from state during render is not state itself. `LIMIT - text.length` is right for whatever text is on screen, so there is nothing to keep in step.'],
    approach: [
      'Work out `left` as `LIMIT - text.length` in the body of App.',
      'Render "Characters left: <left>" when `left` is 0 or more, and "Too long by <-left>" when it is negative.',
      'Pass `disabled={text.length === 0 || left < 0}` to the Post button.',
    ],
    verify: 'tests',
    estimatedMinutes: 6,
    suite: `${header()}
const type = value => fireEvent.change(screen.getByLabelText('Post'), { target: { value } });
const line = container => container.querySelector('p').textContent;
const postButton = () => screen.getByRole('button', { name: 'Post' });

test('the count goes down as you type', () => {
  const { container } = render(<App />);
  type('Hello');
  expect(line(container)).toBe('Characters left: 75');
});

test('over the limit it says by how much, and Post is disabled', () => {
  const { container } = render(<App />);
  type('x'.repeat(83));
  expect(line(container)).toBe('Too long by 3');
  expect(postButton().disabled).toBe(true);
});

test('an empty post cannot be sent', () => {
  render(<App />);
  expect(postButton().disabled).toBe(true);
});
`,
  },

  /* ── splice ───────────────────────────────────────────────────────── */
  {
    id: 'react-easy3-undo-remove',
    track: 'react',
    topic: 'react',
    level: 22,
    tier: 2,
    focus: ['splice', 'useState'],
    title: 'Undo a removal',
    prompt: 'Removing a task shows an "Undo" button. Undo puts the task back at the position it came from, and the button goes away. When a task is removed, remember it and its index in state. For Undo, copy the list and call `splice(index, 0, task)` on the copy, which inserts without removing anything. Only the latest removal can be undone.',
    starter: `import React, { useState } from 'react';

const startingTasks = [
  { id: 1, text: 'Check the tanks' },
  { id: 2, text: 'Pack the fins' },
  { id: 3, text: 'Book the boat' },
  { id: 4, text: 'Charge the torch' },
];

const App = ({ initialTasks = startingTasks }) => {
  const [tasks, setTasks] = useState(initialTasks);

  const remove = (index) => {
    setTasks(tasks.filter((_, position) => position !== index));
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
  </main>;
};

export default App;
`,
    skeleton: `const [removed, setRemoved] = useState(null);

const remove = (index) => {
  setRemoved({ task: tasks[index], index });
  setTasks(tasks.filter((_, position) => position !== index));
};

const undo = () => {
  const next = [...tasks];
  // put removed.task back at removed.index
  setTasks(next);
  setRemoved(null);
};

// {removed && <button type="button" onClick={undo}>Undo</button>}`,
    hints: ['`splice(index, 0, item)` removes nothing and inserts `item` before the element now at `index`. An index equal to the length inserts at the end, which is where a removed last task came from.'],
    approach: [
      'Add `const [removed, setRemoved] = useState(null)`, and in `remove` store `{ task: tasks[index], index }` as well as filtering the task out.',
      'Write `undo`: copy `tasks`, call `splice(removed.index, 0, removed.task)` on the copy, store the copy, and set `removed` back to `null`.',
      'Render the Undo button only while `removed` holds something.',
    ],
    verify: 'tests',
    estimatedMinutes: 9,
    suite: `${header()}
const texts = container => [...container.querySelectorAll('li span')].map(span => span.textContent);
const removeTask = text => {
  const row = screen.getByText(text).closest('li');
  fireEvent.click(within(row).getByRole('button', { name: 'Remove' }));
};
const undo = () => fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
const ALL = ['Check the tanks', 'Pack the fins', 'Book the boat', 'Charge the torch'];

test('removing a task offers Undo', () => {
  const { container } = render(<App />);
  removeTask('Pack the fins');
  expect(texts(container)).toEqual(['Check the tanks', 'Book the boat', 'Charge the torch']);
  expect(screen.getByRole('button', { name: 'Undo' })).toBeTruthy();
});

test('Undo puts the task back where it was', () => {
  const { container } = render(<App />);
  removeTask('Pack the fins');
  undo();
  expect(texts(container)).toEqual(ALL);
  expect(screen.queryByRole('button', { name: 'Undo' })).toBe(null);
});

test('Undo brings the last task back to the end', () => {
  const { container } = render(<App />);
  removeTask('Charge the torch');
  undo();
  expect(texts(container)).toEqual(ALL);
});
`,
  },
  {
    id: 'react-easy3-split-a-line',
    track: 'react',
    topic: 'react',
    level: 22,
    tier: 2,
    focus: ['splice', 'split'],
    title: 'Split a line in place',
    prompt: 'Some lines on the shopping list hold more than one thing, such as "Eggs and milk". Every line that contains " and " has a Split button, which replaces the line with its parts in the same place: "Eggs", then "milk". Get the parts with `split(" and ")`, copy the list, and call `splice(index, 1, ...parts)` on the copy. That one call removes the line and inserts every part where it stood.',
    starter: `import React, { useState } from 'react';

const startingList = ['Eggs and milk', 'Bread', 'Rice and beans', 'Tea'];

const App = ({ items = startingList }) => {
  const [list, setList] = useState(items);

  const splitLine = (index) => {
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

export default App;
`,
    skeleton: `const splitLine = (index) => {
  const parts = list[index].split(' and ');
  const next = [...list];
  // replace the one line at index with every part
  setList(next);
};`,
    hints: ['`splice(start, deleteCount, ...items)` removes `deleteCount` elements and inserts every item in their place, in order. Spread the parts into the call; passed as one array, they would go in as a single element.'],
    approach: [
      'Split the line at `index` with `split(" and ")` to get its parts.',
      'Copy the list with `[...list]` and call `splice(index, 1, ...parts)` on the copy.',
      'Store the copy with `setList`.',
    ],
    verify: 'tests',
    estimatedMinutes: 7,
    suite: `${header()}
const lines = container => [...container.querySelectorAll('li span')].map(span => span.textContent);
const splitLine = text => {
  const row = screen.getByText(text).closest('li');
  fireEvent.click(within(row).getByRole('button', { name: 'Split' }));
};

test('Split replaces a line with its parts', () => {
  const { container } = render(<App />);
  splitLine('Eggs and milk');
  expect(lines(container)).toEqual(['Eggs', 'milk', 'Bread', 'Rice and beans', 'Tea']);
});

test('the parts stay where the line was', () => {
  const { container } = render(<App />);
  splitLine('Rice and beans');
  expect(lines(container)).toEqual(['Eggs and milk', 'Bread', 'Rice', 'beans', 'Tea']);
});

test('only lines with " and " have a Split button', () => {
  render(<App />);
  expect(screen.getAllByRole('button', { name: 'Split' }).length).toBe(2);
});
`,
  },

  /* ── useContext ───────────────────────────────────────────────────── */
  {
    id: 'react-easy3-dispatch-through-context',
    track: 'react',
    topic: 'react',
    level: 20,
    tier: 2,
    focus: ['useContext', 'useReducer'],
    title: 'Dispatch through context',
    prompt: 'App keeps the tasks in a reducer and hands `dispatch` to `AddTask` and, through `TaskList`, to every `TaskItem` as an `onDispatch` prop. `TaskList` never uses it; it only passes it on. Provide `dispatch` through `TasksDispatchContext` around the page instead, have `AddTask` and `TaskItem` read it with `useContext`, and remove the `onDispatch` props.',
    starter: `import React, { createContext, useContext, useReducer, useState } from 'react';

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

export const AddTask = ({ onDispatch }) => {
  const [text, setText] = useState('');
  const add = (event) => {
    event.preventDefault();
    onDispatch({ type: 'added', text });
    setText('');
  };
  return <form onSubmit={add}>
    <label>New task <input value={text} onChange={(event) => setText(event.target.value)} /></label>
    <button type="submit">Add</button>
  </form>;
};

export const TaskItem = ({ task, onDispatch }) => (
  <li>
    <label>
      <input type="checkbox" checked={task.done} onChange={() => onDispatch({ type: 'toggled', id: task.id })} />
      {task.text}
    </label>
  </li>
);

const TaskList = ({ tasks, onDispatch }) => (
  <ul>
    {tasks.map((task) => <TaskItem key={task.id} task={task} onDispatch={onDispatch} />)}
  </ul>
);

const App = () => {
  const [tasks, dispatch] = useReducer(tasksReducer, [
    { id: 1, text: 'Rinse the regulator', done: false },
    { id: 2, text: 'Log the dive', done: true },
  ]);

  return <main>
    <h2>Dispatch through context</h2>
    <AddTask onDispatch={dispatch} />
    <TaskList tasks={tasks} onDispatch={dispatch} />
  </main>;
};

export default App;
`,
    skeleton: `// in App:
// <TasksDispatchContext.Provider value={dispatch}>
//   ...the page, with no onDispatch props
// </TasksDispatchContext.Provider>

// in AddTask and TaskItem:
const dispatch = useContext(TasksDispatchContext);`,
    hints: ['The `dispatch` that `useReducer` returns stays the same function for the whole life of the component, so it makes a steady context value: the components that read it never re-render because it changed.'],
    approach: [
      'In App, wrap the page in `<TasksDispatchContext.Provider value={dispatch}>`.',
      'In AddTask and TaskItem, get `dispatch` with `useContext(TasksDispatchContext)` and call it where `onDispatch` was called.',
      'Delete the `onDispatch` props from AddTask, TaskList and TaskItem, and from the places that render them.',
    ],
    verify: 'tests',
    estimatedMinutes: 8,
    suite: `${header('AddTask, TaskItem, TasksDispatchContext')}
const boxes = () => screen.getAllByRole('checkbox');

test('adding a task still works', () => {
  const { container } = render(<App />);
  fireEvent.change(screen.getByLabelText('New task'), { target: { value: 'Dry the wetsuit' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add' }));
  expect([...container.querySelectorAll('li')].map(li => li.textContent)).toEqual(['Rinse the regulator', 'Log the dive', 'Dry the wetsuit']);
});

test('AddTask dispatches through the context', () => {
  const seen = [];
  render(<TasksDispatchContext.Provider value={action => { seen.push(action); }}><AddTask /></TasksDispatchContext.Provider>);
  fireEvent.change(screen.getByLabelText('New task'), { target: { value: 'Fill the log' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add' }));
  expect(seen).toEqual([{ type: 'added', text: 'Fill the log' }]);
});

test('TaskItem dispatches through the context', () => {
  const seen = [];
  render(<TasksDispatchContext.Provider value={action => { seen.push(action); }}><ul><TaskItem task={{ id: 7, text: 'Wash the mask', done: false }} /></ul></TasksDispatchContext.Provider>);
  fireEvent.click(boxes()[0]);
  expect(seen).toEqual([{ type: 'toggled', id: 7 }]);
});
`,
  },
  {
    id: 'react-easy3-radio-group',
    track: 'react',
    topic: 'react',
    level: 20,
    tier: 2,
    focus: ['useContext', 'forms'],
    title: 'A radio group through context',
    prompt: '`RadioGroup` takes a `name`, the chosen `value` and an `onChange`, and every `Radio` inside it needs all three. Have `RadioGroup` provide `{ name, value, onChange }` through `RadioContext`, and have `Radio` read it with `useContext`. Each Radio\'s input takes the group\'s `name`, is `checked` when its own `value` equals the group\'s, and calls `onChange` with its own value when picked. App passes each Radio only its value and its label.',
    starter: `import React, { createContext, useContext, useState } from 'react';

export const RadioContext = createContext(null);

export const RadioGroup = ({ name, value, onChange, legend, children }) => (
  <fieldset>
    <legend>{legend}</legend>
    {children}
  </fieldset>
);

export const Radio = ({ value, children }) => (
  <label>
    <input type="radio" value={value} />
    {children}
  </label>
);

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

export default App;
`,
    skeleton: `export const RadioGroup = ({ name, value, onChange, legend, children }) => (
  <RadioContext.Provider value={{ name, value, onChange }}>
    {/* the fieldset */}
  </RadioContext.Provider>
);

export const Radio = ({ value, children }) => {
  const group = useContext(RadioContext);
  // name={group.name}, checked={...}, onChange={() => group.onChange(value)}
};`,
    hints: ['A component can provide context to its own `children`. The Radio elements App passes in render inside RadioGroup\'s provider, so each one reads the group around it, and none of them needs the settings as props.'],
    approach: [
      'In RadioGroup, wrap the `fieldset` in `<RadioContext.Provider value={{ name, value, onChange }}>`.',
      'In Radio, read the group with `useContext(RadioContext)`.',
      'Give the input `name={group.name}`, `checked={group.value === value}` and `onChange={() => group.onChange(value)}`.',
    ],
    verify: 'tests',
    estimatedMinutes: 8,
    suite: `${header('Radio, RadioContext, RadioGroup')}
test('Medium starts checked', () => {
  render(<App />);
  expect(screen.getByLabelText('Medium').checked).toBe(true);
  expect(screen.getByLabelText('Small').checked).toBe(false);
});

test('picking Large updates the page', () => {
  const { container } = render(<App />);
  fireEvent.click(screen.getByLabelText('Large'));
  expect(container.querySelector('p').textContent).toBe('Chosen size: L');
  expect(screen.getByLabelText('Large').checked).toBe(true);
  expect(screen.getByLabelText('Medium').checked).toBe(false);
});

test('every radio carries the group name', () => {
  render(<App />);
  expect(screen.getAllByRole('radio').map(radio => radio.name)).toEqual(['size', 'size', 'size']);
});
`,
  },
];
