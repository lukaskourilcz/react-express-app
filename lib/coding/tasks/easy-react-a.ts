// The Easy band of the React track, first wave (#226).
//
// Before this wave the React matrix listed eleven short tags: custom hooks,
// pagination, abort, accessibility, splice, useContext and useRef had no Easy
// challenge at all, effect cleanup, timers and slice had one, and derived
// state two. Each challenge here takes one of them (two focus tags at most),
// and together they bring all eleven to three Easy challenges or more.
//
// Same rules as the JavaScript and TypeScript waves: ten minutes or less, a
// starter that fails its own suite, and a first focus tag whose documentation
// page ends the hint ladder. A React challenge is graded by its Testing
// Library suite; the server also runs the hidden cases kept beside the
// solutions (`hiddenSuite`, see `../react-hidden.ts`). Several suites import
// a named export as well as `App`, so a check can render the part the
// technique lives in: a context consumer, a hook inside a probe component.
// Solutions live in `../solutions/easy-react-a.ts`, and `EASY_BAND` in
// `../catalog.ts` lists this file. English only: there is no Czech overlay.
//
// Task bodies only: prompts, starters, visible tests, hints. No solutions.

import type { CodingTaskSource } from '../types';

/** The opening every suite here shares; `names` adds named exports of App.
 * Later React waves import it too. */
export const header = (names = ''): string => `import './fetchStub';
import React from 'react';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import App${names ? `, { ${names} }` : ''} from './App';
`;

/** A fetch the suite answers by hand. Every call is recorded with its URL and
 * signal; an aborted signal rejects it with an AbortError, as the browser
 * does. The real stub comes back after each case, so the preview never gets
 * a request that waits forever. */
export const FAKE_FETCH = `
const withFetch = async (body) => {
  const calls = [];
  const real = globalThis.fetch;
  globalThis.fetch = (url, options = {}) => new Promise((resolve, reject) => {
    const signal = options.signal;
    calls.push({
      url: String(url),
      signal,
      respond: data => resolve({ ok: true, status: 200, json: () => Promise.resolve(data) }),
      fail: error => reject(error),
    });
    const abort = () => {
      const error = new Error('The operation was aborted.');
      error.name = 'AbortError';
      reject(error);
    };
    if (signal && signal.aborted) abort();
    else if (signal) signal.addEventListener('abort', abort);
  });
  try {
    await body(calls);
  } finally {
    globalThis.fetch = real;
  }
};
`;

/** A clock the suite moves by hand, for a check that counts milliseconds.
 * While `withClock` runs, `setTimeout`, `clearTimeout`, `setInterval` and
 * `clearInterval` (on `globalThis` and `window`, because a component may call
 * either) and `Date.now` run on it. A timer then fires when the clock passes
 * its time and never because the machine was busy: a collector pause or a
 * loaded CI runner cannot make a save fire before a check that expects none.
 * `clock.tick(ms)` fires the timers that fall due in the order a browser
 * would, each inside `act()`, so React renders and runs the effects one timer
 * causes before the next timer fires, as it does on an idle page. The real
 * timers come back when the case ends, whether it passed or failed. */
export const FAKE_CLOCK = `
const withClock = async (body) => {
  const hosts = typeof window !== 'undefined' && window !== globalThis ? [globalThis, window] : [globalThis];
  const names = ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'];
  const real = hosts.map(host => names.map(name => host[name]));
  const realNow = Date.now;
  const epoch = realNow();
  const timers = new Map();
  let now = 0;
  let serial = 0;
  // Ids far above a real timer's, so a component that clears one after the
  // case has ended clears nothing else.
  const start = (callback, ms, args, repeat) => {
    serial += 1;
    const delay = Math.max(0, Number(ms) || 0);
    timers.set(1000000000 + serial, { at: now + delay, order: serial, every: repeat ? Math.max(1, delay) : 0, callback, args });
    return 1000000000 + serial;
  };
  const stop = id => { timers.delete(id); };
  const fake = {
    setTimeout: (callback, ms, ...args) => start(callback, ms, args, false),
    clearTimeout: stop,
    setInterval: (callback, ms, ...args) => start(callback, ms, args, true),
    clearInterval: stop,
  };
  hosts.forEach(host => names.forEach(name => { host[name] = fake[name]; }));
  Date.now = () => epoch + now;
  const clock = {
    tick: async ms => {
      const end = now + ms;
      for (;;) {
        let id = null;
        let due = null;
        for (const [key, timer] of timers) {
          if (timer.at <= end && (!due || timer.at < due.at || (timer.at === due.at && timer.order < due.order))) {
            id = key;
            due = timer;
          }
        }
        if (!due) break;
        now = due.at;
        if (due.every) {
          serial += 1;
          due.at += due.every;
          due.order = serial;
        } else {
          timers.delete(id);
        }
        await act(async () => { if (typeof due.callback === 'function') due.callback(...due.args); });
      }
      now = end;
    },
  };
  try {
    await body(clock);
  } finally {
    hosts.forEach((host, index) => names.forEach((name, n) => { host[name] = real[index][n]; }));
    Date.now = realNow;
  }
};
`;

export const EASY_REACT_A_TASKS: CodingTaskSource[] = [
  /* ── useRef ───────────────────────────────────────────────────────── */
  {
    id: 'react-easy2-focus-the-search',
    track: 'react',
    topic: 'react',
    level: 14,
    tier: 1,
    focus: ['useRef', 'events'],
    title: 'Focus the search box',
    prompt: `The page has a Name field, a Search field and a "Jump to search" button. Clicking the button puts the keyboard focus in the Search field, so the user can type straight away. Create a ref with \`useRef(null)\`, attach it to the Search input with the \`ref\` attribute, and call \`focus()\` on \`ref.current\` in the click handler. Nothing is focused before the click, so do not use \`autoFocus\`. Preserve both field values exactly, including spaces, literal text and up to 2000 UTF-16 code units of single-line text. Repeated clicks and parent renders must work, and each instance must focus its own Search field.`,
    starter: `import React, { useRef } from 'react';

const App = () => {

  return <main>
    <h2>Focus the search box</h2>
    <label>Name <input /></label>
    <label>Search <input type="search" /></label>
    <button type="button">Jump to search</button>
  </main>;
};

export default App;
`,
    skeleton: `const searchRef = useRef(null);

// <input type="search" ref={searchRef} />
// <button type="button" onClick={() => /* focus searchRef.current */}>`,
    hints: ['A ref object keeps the same `current` value between renders. React puts the DOM element into `ref.current` once the input is on the page, and the element has a `focus()` method.'],
    approach: [
      'Call `useRef(null)` at the top of App to get a ref object.',
      'Pass it to the Search input as `ref={searchRef}`. After the first render, `searchRef.current` is that input element.',
      'In the button\'s click handler, call `searchRef.current.focus()`.',
    ],
    verify: 'tests',
    estimatedMinutes: 6,
    suite: `${header()}
const search = () => screen.getByLabelText('Search');
const jump = () => screen.getByRole('button', { name: 'Jump to search' });

test('the button moves the focus to the Search field', () => {
  render(<App />);
  fireEvent.click(jump());
  expect(document.activeElement).toBe(search());
});

test('the focus leaves the Name field', () => {
  render(<App />);
  screen.getByLabelText('Name').focus();
  fireEvent.click(jump());
  expect(document.activeElement).toBe(search());
});

test('text already in the Search field stays there', () => {
  render(<App />);
  fireEvent.change(search(), { target: { value: 'shoes' } });
  screen.getByLabelText('Name').focus();
  fireEvent.click(jump());
  expect(document.activeElement).toBe(search());
  expect(search().value).toBe('shoes');
});

test('a long search survives a jump unchanged',()=>{
 render(<App/>);const value='a'.repeat(120);fireEvent.change(search(),{target:{value}});screen.getByLabelText('Name').focus();fireEvent.click(jump());expect(search().value).toBe(value);expect(document.activeElement).toBe(search());
});`,
  },
  {
    id: 'react-easy2-cancel-the-reminder',
    track: 'react',
    topic: 'react',
    level: 14,
    tier: 2,
    focus: ['useRef', 'timers'],
    title: 'Cancel the reminder',
    prompt: `Pressing "Remind me" shows "Time to stretch" 300 milliseconds later. Pressing "Cancel" while the reminder is waiting stops it, so the message never appears. Keep the id that \`setTimeout\` returns in a ref rather than in state, and pass it to \`clearTimeout\` when Cancel is pressed. Pressing "Remind me" again while a reminder waits starts the wait over, so clear the old timeout first. Cancel with nothing waiting does nothing. The wait lasts the full 300 ms; a real browser callback may run later. A new reminder and Cancel do not erase an already displayed message. Parent renders must not restart a pending wait. Clear the pending timeout on unmount, and keep each instance independent.`,
    starter: `import React, { useEffect, useRef, useState } from 'react';

const App = () => {
  const [message, setMessage] = useState('');

  const remind = () => {
  };

  const cancel = () => {
  };

  return <main>
    <h2>Cancel the reminder</h2>
    <p>{message}</p>
    <button type="button" onClick={remind}>Remind me</button>
    <button type="button" onClick={cancel}>Cancel</button>
  </main>;
};

export default App;
`,
    skeleton: `const timeoutRef = useRef(null);

const remind = () => {
  // clear any reminder that is still waiting
  // store the id of a new 300 ms timeout that sets the message
};

const cancel = () => {
  // clear the waiting timeout
};

// Clear timeoutRef.current from an effect cleanup on unmount.`,
    hints: ['`setTimeout` returns an id, and `clearTimeout(id)` stops that timeout if it has not fired yet. A ref keeps the id between renders without causing a render of its own; `clearTimeout(null)` is allowed and does nothing.'],
    approach: [
      'Create `const timeoutRef = useRef(null)` in App.',
      'In `remind`, first call `clearTimeout(timeoutRef.current)`, then store the id of a new 300 ms timeout that sets the message.',
      'In `cancel`, call `clearTimeout(timeoutRef.current)`.',
    ],
    verify: 'tests',
    estimatedMinutes: 8,
    suite: `${header()}
const press = label => fireEvent.click(screen.getByRole('button', { name: label }));
const wait = ms => act(() => new Promise(resolve => setTimeout(resolve, ms)));

test('the reminder appears after the wait', async () => {
  const { container } = render(<App />);
  press('Remind me');
  await waitFor(() => expect(container.textContent).toContain('Time to stretch'), { timeout: 1000 });
});

test('Cancel stops a waiting reminder', async () => {
  const { container } = render(<App />);
  press('Remind me');
  press('Cancel');
  await wait(500);
  expect(container.textContent).not.toContain('Time to stretch');
});

test('Cancel with nothing waiting does no harm', async () => {
  const { container } = render(<App />);
  press('Cancel');
  press('Remind me');
  await waitFor(() => expect(container.textContent).toContain('Time to stretch'), { timeout: 1000 });
});

const withTestClock = async (body) => {
  const hosts = typeof window !== 'undefined' && window !== globalThis ? [globalThis, window] : [globalThis];
  const names = ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'];
  const real = hosts.map(host => names.map(name => host[name]));
  const realNow = Date.now;
  const epoch = realNow();
  const timers = new Map();
  let now = 0;
  let serial = 0;
  // Ids far above a real timer's, so a component that clears one after the
  // case has ended clears nothing else.
  const start = (callback, ms, args, repeat) => {
    serial += 1;
    const delay = Math.max(0, Number(ms) || 0);
    timers.set(1000000000 + serial, { at: now + delay, order: serial, every: repeat ? Math.max(1, delay) : 0, callback, args });
    return 1000000000 + serial;
  };
  const stop = id => { timers.delete(id); };
  const fake = {
    setTimeout: (callback, ms, ...args) => start(callback, ms, args, false),
    clearTimeout: stop,
    setInterval: (callback, ms, ...args) => start(callback, ms, args, true),
    clearInterval: stop,
  };
  hosts.forEach(host => names.forEach(name => { host[name] = fake[name]; }));
  Date.now = () => epoch + now;
  const clock = {
    pending: () => timers.size,
    tick: async ms => {
      const end = now + ms;
      for (;;) {
        let id = null;
        let due = null;
        for (const [key, timer] of timers) {
          if (timer.at <= end && (!due || timer.at < due.at || (timer.at === due.at && timer.order < due.order))) {
            id = key;
            due = timer;
          }
        }
        if (!due) break;
        now = due.at;
        if (due.every) {
          serial += 1;
          due.at += due.every;
          due.order = serial;
        } else {
          timers.delete(id);
        }
        await act(async () => { if (typeof due.callback === 'function') due.callback(...due.args); });
      }
      now = end;
    },
  };
  try {
    await body(clock);
  } finally {
    hosts.forEach((host, index) => names.forEach((name, n) => { host[name] = real[index][n]; }));
    Date.now = realNow;
  }
};
test('the first reminder waits the full 300 ms',()=>withTestClock(async clock=>{
 const view=render(<App/>);press('Remind me');await clock.tick(299);expect(view.container.querySelector('p').textContent).toBe('');await clock.tick(1);expect(view.container.querySelector('p').textContent).toBe('Time to stretch');
}));`,
  },

  /* ── timers ───────────────────────────────────────────────────────── */
  {
    id: 'react-easy2-countdown',
    track: 'react',
    topic: 'react',
    level: 13,
    tier: 2,
    focus: ['timers', 'effect-cleanup'],
    title: 'Countdown to launch',
    prompt: "Show a number that starts at 3 and goes down by one every 100 milliseconds. At 0, show \"Liftoff!\" instead of the number and stop counting: clear the interval then, so it does not keep running. Start the interval with `setInterval` in an effect, and return a cleanup that calls `clearInterval`, so a countdown that leaves the page stops too. Keep the number in a paragraph, unchanged until each full 100 ms boundary: 3, then 2, then 1, then Liftoff! at 300 ms. A controlled clock checks these boundaries; real browser timers may run later. There is one active interval per waiting mounted countdown and none after Liftoff or unmount. Ordinary parent re-renders must not restart the remaining delay or add listeners/timers. Independent and fresh mounts start their own countdown at 3. Either a count-dependent interval with cleanup or a single interval cleared at zero is fine. Development Strict Mode may repeat setup and cleanup.",
    starter: `import React, { useEffect, useState } from 'react';

const App = () => {
  const [count, setCount] = useState(3);

  return <main>
    <h2>Countdown to launch</h2>
    <p>{count}</p>
  </main>;
};

export default App;
`,
    skeleton: `useEffect(() => {
  if (count === 0) return; // nothing left to count
  const id = setInterval(() => {
    // one less, from the previous count
  }, 100);
  return () => clearInterval(id);
}, [count]);`,
    hints: ['An effect that depends on `count` runs again after every tick. Its cleanup clears the old interval before the next run starts, and once `count` is 0 the effect can return early without starting a new one.'],
    approach: [
      'Write an effect that depends on `count`. If `count` is 0, return straight away.',
      'Otherwise start an interval that calls `setCount((previous) => previous - 1)` every 100 ms, and return `() => clearInterval(id)`.',
      'Render "Liftoff!" when `count` is 0, and the number otherwise.',
    ],
    verify: 'tests',
    estimatedMinutes: 8,
    suite: `${header()}
// Records the intervals the component starts while it renders, and every
// clearInterval call. waitFor runs intervals of its own, so recording stops
// once App is on the page and only the component's ids are checked.
const watchIntervals = () => {
  const realSet = globalThis.setInterval;
  const realClear = globalThis.clearInterval;
  const spy = { started: [], cleared: [], recording: true };
  globalThis.setInterval = (callback, ms, ...rest) => {
    const id = realSet(callback, ms, ...rest);
    if (spy.recording) spy.started.push(id);
    return id;
  };
  globalThis.clearInterval = id => {
    spy.cleared.push(id);
    return realClear(id);
  };
  spy.stopRecording = () => { spy.recording = false; };
  spy.allCleared = () => spy.started.every(id => spy.cleared.includes(id));
  spy.restore = () => {
    globalThis.setInterval = realSet;
    globalThis.clearInterval = realClear;
  };
  return spy;
};

test('starts at 3', () => {
  const { container } = render(<App />);
  expect(container.querySelector('p').textContent).toBe('3');
});

test('counts down to Liftoff!', async () => {
  const { container } = render(<App />);
  await waitFor(() => expect(container.textContent).toContain('Liftoff!'), { timeout: 2000 });
});

test('leaving the page clears the interval', () => {
  const spy = watchIntervals();
  try {
    const { unmount } = render(<App />);
    spy.stopRecording();
    expect(spy.started.length > 0).toBe(true);
    unmount();
    expect(spy.allCleared()).toBe(true);
  } finally {
    spy.restore();
  }
});


const withStepClock = async (body) => {
  const hosts = typeof window !== 'undefined' && window !== globalThis ? [globalThis, window] : [globalThis];
  const names = ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'];
  const real = hosts.map(host => names.map(name => host[name]));
  const realNow = Date.now;
  const epoch = realNow();
  const timers = new Map();
  let now = 0;
  let serial = 0;
  // Ids far above a real timer's, so a component that clears one after the
  // case has ended clears nothing else.
  const start = (callback, ms, args, repeat) => {
    serial += 1;
    const delay = Math.max(0, Number(ms) || 0);
    timers.set(1000000000 + serial, { at: now + delay, order: serial, every: repeat ? Math.max(1, delay) : 0, callback, args });
    return 1000000000 + serial;
  };
  const stop = id => { timers.delete(id); };
  const fake = {
    setTimeout: (callback, ms, ...args) => start(callback, ms, args, false),
    clearTimeout: stop,
    setInterval: (callback, ms, ...args) => start(callback, ms, args, true),
    clearInterval: stop,
  };
  hosts.forEach(host => names.forEach(name => { host[name] = fake[name]; }));
  Date.now = () => epoch + now;
  const clock = {
    pendingIntervals: () => [...timers.values()].filter(timer => timer.every > 0).length,
    tick: async ms => {
      const end = now + ms;
      for (;;) {
        let id = null;
        let due = null;
        for (const [key, timer] of timers) {
          if (timer.at <= end && (!due || timer.at < due.at || (timer.at === due.at && timer.order < due.order))) {
            id = key;
            due = timer;
          }
        }
        if (!due) break;
        now = due.at;
        if (due.every) {
          serial += 1;
          due.at += due.every;
          due.order = serial;
        } else {
          timers.delete(id);
        }
        await act(async () => { if (typeof due.callback === 'function') due.callback(...due.args); });
      }
      now = end;
    },
  };
  try {
    await body(clock);
  } finally {
    hosts.forEach((host, index) => names.forEach((name, n) => { host[name] = real[index][n]; }));
    Date.now = realNow;
  }
};


test('the first tick waits one full100ms',()=>withStepClock(async clock=>{const root=render(<App/>);expect(root.container.querySelector('p').textContent).toBe('3');await clock.tick(99);expect(root.container.querySelector('p').textContent).toBe('3');await clock.tick(1);expect(root.container.querySelector('p').textContent).toBe('2');root.unmount();expect(clock.pendingIntervals()).toBe(0);}));

`,
  },

  /* ── useContext ───────────────────────────────────────────────────── */
  {
    id: 'react-easy2-read-the-theme',
    track: 'react',
    topic: 'react',
    level: 20,
    tier: 1,
    focus: ['useContext'],
    title: 'Read the theme',
    prompt: `\`Badge\` expects a \`theme\` prop, but \`Toolbar\` renders it without one, so it shows "Theme: " and nothing after it. App already provides "dark" through \`ThemeContext\`. Make \`Badge\` read the theme with \`useContext(ThemeContext)\` instead of taking a prop, for both its text and its class name. Leave \`Toolbar\` as it is: with context, the components in between pass nothing along. Provider values are strings, including an explicitly empty string; an empty value is not the no-provider default. Use the latest value for both the exact text Theme: <value> and the badge--<value> class. Repeated provider changes must reach the same child element, and nested or separate providers must remain independent. Without a provider, use light. Keep the supplied Toolbar unchanged.`,
    starter: `import React, { createContext, useContext } from 'react';

export const ThemeContext = createContext('light');

export const Badge = ({ theme }) => {
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

export default App;
`,
    skeleton: `export const Badge = () => {
  const theme = /* read ThemeContext */;
  return <span className={'badge badge--' + theme}>Theme: {theme}</span>;
};`,
    hints: ['`useContext(SomeContext)` returns the `value` of the nearest `SomeContext.Provider` above the component, or the default passed to `createContext` when there is none.'],
    approach: [
      'Remove the `theme` prop from Badge\'s parameters.',
      'Inside Badge, call `useContext(ThemeContext)` and keep the result in a `theme` variable.',
      'Leave the rest of Badge as it is: its text and class name now use the theme from context.',
    ],
    verify: 'tests',
    estimatedMinutes: 6,
    suite: `${header('Badge, ThemeContext')}
test('the badge shows the theme App provides', () => {
  const { container } = render(<App />);
  expect(container.textContent).toContain('Theme: dark');
});

test('the badge reads the nearest provider', () => {
  const { container } = render(<ThemeContext.Provider value="sepia"><Badge /></ThemeContext.Provider>);
  expect(container.textContent).toContain('Theme: sepia');
});

test('outside any provider it shows the default', () => {
  const { container } = render(<Badge />);
  expect(container.textContent).toContain('Theme: light');
});


test('an explicitly empty theme does not use the no-provider default',()=>{
 const view=render(<ThemeContext.Provider value=""><Badge theme="ignored"/></ThemeContext.Provider>);expect(view.container.textContent).toBe('Theme: ');expect(view.container.querySelector('span').className.split(' ')).toContain('badge--');
});
`,
  },
  {
    id: 'react-easy2-nearest-provider',
    track: 'react',
    topic: 'react',
    level: 20,
    tier: 2,
    focus: ['useContext'],
    title: 'Nearest provider wins',
    prompt: `Create and export \`SizeContext\` with \`createContext("medium")\`. \`Label\` shows its text and then, in brackets, the size it reads from \`SizeContext\`, like "Page (medium)". In App, wrap the section in a provider with the value "large", and the aside inside it in a provider with the value "small". A Label with no provider above it gets the default; every other Label gets the value of the nearest provider above it. Size values are strings, including an explicitly empty string; that displays an empty pair of brackets rather than the default. Follow the current nearest provider through repeated updates to the same child, and keep sibling providers independent. Preserve the raw label text, including spaces, Unicode and literal markup up to 2000 UTF-16 units. medium is used only when there is no provider.`,
    starter: `import React, { createContext, useContext } from 'react';

// Create and export SizeContext here, with "medium" as its default.

export const Label = ({ text }) => {
  return <span>{text}</span>;
};

const App = () => (
  <main>
    <h2>Nearest provider wins</h2>
    <Label text="Page" />
    {/* a provider of "large" around this section */}
    <section>
      <Label text="Header" />
      {/* a provider of "small" around this aside */}
      <aside>
        <Label text="Note" />
      </aside>
    </section>
  </main>
);

export default App;
`,
    skeleton: `export const SizeContext = createContext(/* the default */);

export const Label = ({ text }) => {
  const size = /* read SizeContext */;
  return <span>{text} ({size})</span>;
};

// <SizeContext.Provider value="large"> <section> ... </section> </SizeContext.Provider>`,
    hints: ['`createContext(defaultValue)` returns an object with a `Provider`. A provider can sit inside another provider of the same context, and a component reads the one closest above it.'],
    approach: [
      'Export `const SizeContext = createContext("medium")`.',
      'In Label, read the size with `useContext(SizeContext)` and render `{text} ({size})`.',
      'In App, wrap the section in `<SizeContext.Provider value="large">` and the aside in `<SizeContext.Provider value="small">`.',
    ],
    verify: 'tests',
    estimatedMinutes: 7,
    suite: `${header('Label, SizeContext')}
test('a label outside every provider gets the default', () => {
  const { container } = render(<App />);
  expect(container.textContent).toContain('Page (medium)');
});

test('the label in the section reads large', () => {
  const { container } = render(<App />);
  expect(container.querySelector('section').textContent).toContain('Header (large)');
});

test('the inner provider wins for the note', () => {
  const { container } = render(<App />);
  expect(container.querySelector('aside').textContent).toBe('Note (small)');
});


test('an empty nearest size is a provided value rather than the default',()=>{
 const view=render(<SizeContext.Provider value="outer"><SizeContext.Provider value=""><Label text="Raw label"/></SizeContext.Provider></SizeContext.Provider>);expect(view.container.textContent).toBe('Raw label ()');
});
`,
  },
  {
    id: 'react-easy2-shared-basket',
    track: 'react',
    topic: 'react',
    level: 20,
    tier: 2,
    focus: ['useContext', 'useState'],
    title: 'Share a count through context',
    prompt: `The basket count lives in App's state. Provide \`{ count, add }\` through \`BasketContext\`, where \`add\` adds one to the count. \`AddButton\` calls \`add\` when clicked, and \`BasketCount\` shows "Items in basket: <count>". Neither takes a prop for this: both read the context with \`useContext\`. The count starts at 0. Every invocation of add adds one, including several updates queued before the next render. Use the current nearest provider’s count and callback, even when the same consumer element is retained and the provider value changes. Names are raw plain text up to 2000 UTF-16 units. Keep the count and existing button nodes through parent renders, and keep separate and fresh baskets independent. Consumers are always placed under a provider; behavior outside one is not part of this exercise.`,
    starter: `import React, { createContext, useContext, useState } from 'react';

export const BasketContext = createContext(null);

export const AddButton = ({ name }) => {
  return <button type="button">Add {name}</button>;
};

export const BasketCount = () => {
  return <p>Items in basket: 0</p>;
};

const App = () => {
  return <main>
    <h2>Share a count through context</h2>
    <header><BasketCount /></header>
    <ul>
      <li><AddButton name="Apples" /></li>
      <li><AddButton name="Bread" /></li>
    </ul>
  </main>;
};

export default App;
`,
    skeleton: `const App = () => {
  const [count, setCount] = useState(0);
  const add = () => setCount((previous) => previous + 1);
  return <BasketContext.Provider value={/* count and add */}>
    {/* the page */}
  </BasketContext.Provider>;
};

// in AddButton and BasketCount: const { count, add } = useContext(BasketContext);`,
    hints: ['A provider\'s `value` can be an object that holds both a value and a function that changes it. Every component below the provider that reads the context gets the new value when the state in App changes.'],
    approach: [
      'In App, keep `count` in `useState(0)` and write `add` with the updater form `setCount((previous) => previous + 1)`.',
      'Wrap the page in `<BasketContext.Provider value={{ count, add }}>`.',
      'In AddButton, take `add` from `useContext(BasketContext)` and call it on click; in BasketCount, take `count` from it.',
    ],
    verify: 'tests',
    estimatedMinutes: 9,
    suite: `${header('AddButton, BasketCount, BasketContext')}
const add = name => fireEvent.click(screen.getByRole('button', { name: 'Add ' + name }));

test('the count starts at 0', () => {
  const { container } = render(<App />);
  expect(container.querySelector('header').textContent).toBe('Items in basket: 0');
});

test('each Add button adds one', () => {
  const { container } = render(<App />);
  add('Apples');
  expect(container.querySelector('header').textContent).toBe('Items in basket: 1');
  add('Bread');
  add('Apples');
  expect(container.querySelector('header').textContent).toBe('Items in basket: 3');
});

test('BasketCount shows whatever the provider holds', () => {
  const { container } = render(<BasketContext.Provider value={{ count: 7, add: () => {} }}><BasketCount /></BasketContext.Provider>);
  expect(container.textContent).toBe('Items in basket: 7');
});


test('two add calls queued before the next render both count',()=>{
 const view=render(<App/>),button=screen.getByRole('button',{name:'Add Apples'});act(()=>{fireEvent.click(button);fireEvent.click(button);});expect(view.container.querySelector('header').textContent).toBe('Items in basket: 2');
});
`,
  },

  /* ── custom hooks ─────────────────────────────────────────────────── */
  {
    id: 'react-easy2-use-toggle',
    track: 'react',
    topic: 'react',
    level: 21,
    tier: 1,
    focus: ['custom-hook', 'useState'],
    title: 'A useToggle hook',
    prompt: `Write and export \`useToggle(initial = false)\`, a hook that keeps a boolean in state and returns \`[on, toggle]\`, where \`toggle\` flips it. Use it twice in App: Wi-Fi starts on and Bluetooth starts off. Each button reads "Wi-Fi: on" or "Wi-Fi: off" (and the same for Bluetooth) and flips only its own setting. Two calls to one hook share the code, never the state. initial is a boolean used only on the first render, with false as the default; later prop changes must not reset the state. Every call to toggle flips the current boolean, including several calls in one handler or a retained earlier toggle function. The returned function does not need to keep the same identity between renders. Preserve independent queues for separate hook calls and component instances, state through parent renders, and fresh initial state after unmounting.`,
    starter: `import React, { useState } from 'react';

// Write and export useToggle here.

const App = () => {

  return <main>
    <h2>A useToggle hook</h2>
    <button type="button">Wi-Fi: off</button>
    <button type="button">Bluetooth: off</button>
  </main>;
};

export default App;
`,
    skeleton: `export const useToggle = (initial = false) => {
  const [on, setOn] = useState(initial);
  const toggle = () => /* flip on */;
  return [on, toggle];
};

// in App: const [wifi, toggleWifi] = useToggle(true);`,
    hints: ['A custom hook is a function whose name starts with `use` and that calls other hooks. Each component call gets its own state, just as two `useState` calls do.'],
    approach: [
      'Declare `export const useToggle = (initial = false) => { ... }` and call `useState(initial)` inside it.',
      'Write `toggle` with the updater form `setOn((previous) => !previous)` and return `[on, toggle]`.',
      'In App, call `useToggle(true)` for Wi-Fi and `useToggle()` for Bluetooth, and render each button\'s label from its own value.',
    ],
    verify: 'tests',
    estimatedMinutes: 7,
    suite: `${header('useToggle')}
const button = name => screen.getByRole('button', { name: new RegExp('^' + name + ':') });

test('Wi-Fi starts on and Bluetooth off', () => {
  render(<App />);
  expect(button('Wi-Fi').textContent).toBe('Wi-Fi: on');
  expect(button('Bluetooth').textContent).toBe('Bluetooth: off');
});

test('each button flips only its own setting', () => {
  render(<App />);
  fireEvent.click(button('Bluetooth'));
  expect(button('Bluetooth').textContent).toBe('Bluetooth: on');
  expect(button('Wi-Fi').textContent).toBe('Wi-Fi: on');
});

test('a click turns it off and a second click back on', () => {
  render(<App />);
  fireEvent.click(button('Wi-Fi'));
  expect(button('Wi-Fi').textContent).toBe('Wi-Fi: off');
  fireEvent.click(button('Wi-Fi'));
  expect(button('Wi-Fi').textContent).toBe('Wi-Fi: on');
});


test('two toggle calls in one handler apply two flips',()=>{
 const Twice=()=>{const[on,toggle]=useToggle(true);return <button onClick={()=>{toggle();toggle();}}>{on?'yes':'no'}</button>;};render(<Twice/>);const button=screen.getByRole('button');fireEvent.click(button);expect(button.textContent).toBe('yes');
});
`,
  },
  {
    id: 'react-easy2-use-window-width',
    track: 'react',
    topic: 'react',
    level: 21,
    tier: 2,
    focus: ['custom-hook', 'effect-cleanup'],
    title: 'A useWindowWidth hook',
    prompt: 'Write and export `useWindowWidth()`. It starts from `window.innerWidth` and returns the current width. In an effect that runs once, add a `resize` listener on `window` that stores the new width, and in the effect\'s cleanup remove that same listener: `removeEventListener` only removes a listener it is given the very same function for. App shows "Width: <n>px".',
    starter: `import React, { useEffect, useState } from 'react';

// Write and export useWindowWidth here.

const App = () => {
  const width = 0;

  return <main>
    <h2>A useWindowWidth hook</h2>
    <p>Width: {width}px</p>
  </main>;
};

export default App;
`,
    skeleton: `export const useWindowWidth = () => {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const onResize = () => /* store window.innerWidth */;
    window.addEventListener('resize', onResize);
    return () => /* remove the same onResize */;
  }, []);
  return width;
};`,
    hints: ['Name the listener once inside the effect, then pass that one function to both `addEventListener` and `removeEventListener`. An inline arrow in the cleanup is a new function, so nothing would be removed.'],
    approach: [
      'Keep the width in `useState(window.innerWidth)` inside the hook.',
      'In `useEffect(..., [])`, declare `onResize`, which calls `setWidth(window.innerWidth)`, and add it as the `resize` listener.',
      'Return `() => window.removeEventListener("resize", onResize)` from the effect, and return `width` from the hook.',
    ],
    verify: 'tests',
    estimatedMinutes: 9,
    suite: `${header('useWindowWidth')}
const resizeTo = width => {
  window.innerWidth = width;
  fireEvent(window, new Event('resize'));
};
const watchResizeListeners = () => {
  const realAdd = window.addEventListener;
  const realRemove = window.removeEventListener;
  const seen = { added: [], removed: [] };
  window.addEventListener = function (type, listener, options) {
    if (type === 'resize') seen.added.push(listener);
    return realAdd.call(this, type, listener, options);
  };
  window.removeEventListener = function (type, listener, options) {
    if (type === 'resize') seen.removed.push(listener);
    return realRemove.call(this, type, listener, options);
  };
  seen.restore = () => {
    window.addEventListener = realAdd;
    window.removeEventListener = realRemove;
  };
  return seen;
};

test('shows the current width', () => {
  window.innerWidth = 1024;
  const { container } = render(<App />);
  expect(container.querySelector('p').textContent).toBe('Width: 1024px');
});

test('follows a resize', () => {
  window.innerWidth = 1024;
  const { container } = render(<App />);
  resizeTo(480);
  expect(container.querySelector('p').textContent).toBe('Width: 480px');
});

test('removes the same listener it added when it leaves the page', () => {
  const seen = watchResizeListeners();
  try {
    const { unmount } = render(<App />);
    expect(seen.added.length).toBe(1);
    unmount();
    expect(seen.removed).toContain(seen.added[0]);
  } finally {
    seen.restore();
  }
});
`,
  },
  {
    id: 'react-easy2-use-basket-totals',
    track: 'react',
    topic: 'react',
    level: 21,
    tier: 2,
    focus: ['custom-hook', 'derived-state'],
    title: 'Totals from a hook',
    prompt: 'Write and export `useBasketTotals(items)`. It returns `{ count, total }`: `count` adds up every item\'s `quantity`, and `total` adds up `price * quantity`. Work both out from `items` while rendering: no state and no effect inside the hook, so the totals can never fall behind the items. App keeps the items in state, shows "Items: <count>" and "Total: <total>", and its "Add a pen" button appends `{ name: "Pen", price: 2, quantity: 1 }`.',
    starter: `import React, { useState } from 'react';

const startingItems = [
  { name: 'Notebook', price: 4, quantity: 2 },
  { name: 'Mug', price: 6, quantity: 1 },
];

// Write and export useBasketTotals here.

const App = () => {
  const [items, setItems] = useState(startingItems);

  return <main>
    <h2>Totals from a hook</h2>
    <p>Items: 0</p>
    <p>Total: 0</p>
    <button type="button">Add a pen</button>
  </main>;
};

export default App;
`,
    skeleton: `export const useBasketTotals = (items) => {
  // add up quantity, and price * quantity, over items
  return { count, total };
};

// in App: const { count, total } = useBasketTotals(items);`,
    hints: ['A value you can work out from props or state is not state of its own. Compute it in the body of the hook, and it is fresh on every render.'],
    approach: [
      'In the hook, loop over `items` (or use `reduce`) to add up `quantity` for the count and `price * quantity` for the total.',
      'Return `{ count, total }`, with no `useState` or `useEffect` in the hook.',
      'In App, call the hook with `items`, render both lines, and let the button call `setItems((previous) => [...previous, pen])`.',
    ],
    verify: 'tests',
    estimatedMinutes: 8,
    suite: `${header('useBasketTotals')}
const lines = container => [...container.querySelectorAll('p')].map(p => p.textContent);

test('shows the starting totals', () => {
  const { container } = render(<App />);
  expect(lines(container)).toEqual(['Items: 3', 'Total: 14']);
});

test('the totals follow a new item', () => {
  const { container } = render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Add a pen' }));
  expect(lines(container)).toEqual(['Items: 4', 'Total: 16']);
});

test('an empty basket is zero', () => {
  const empty = [];
  const Probe = () => {
    const { count, total } = useBasketTotals(empty);
    return <output>{count}/{total}</output>;
  };
  const { container } = render(<Probe />);
  expect(container.textContent).toBe('0/0');
});
`,
  },

  /* ── pagination ───────────────────────────────────────────────────── */
  {
    id: 'react-easy2-page-of-photos',
    track: 'react',
    topic: 'react',
    level: 23,
    tier: 1,
    focus: ['pagination', 'slice'],
    title: 'One page at a time',
    prompt: 'The Previous and Next buttons already change `page`, which starts at 1, but the list shows every photo. Show only the current page: take `photos.slice(start, start + PAGE_SIZE)`, where `start` is `(page - 1) * PAGE_SIZE`, and render each photo as a list item. Under the list, show "Page <page> of <pageCount>". App takes the photos as a prop, so a longer or shorter list pages the same way.',
    starter: `import React, { useState } from 'react';

const allPhotos = ['Harbour', 'Lighthouse', 'Dunes', 'Pier', 'Cliffs', 'Reef', 'Marina', 'Bay', 'Cove', 'Jetty'];
const PAGE_SIZE = 4;

const App = ({ photos = allPhotos }) => {
  const [page, setPage] = useState(1);
  const pageCount = Math.ceil(photos.length / PAGE_SIZE);

  return <main>
    <h2>One page at a time</h2>
    <ul>
      {photos.map((photo) => <li key={photo}>{photo}</li>)}
    </ul>
    <button type="button" onClick={() => setPage((previous) => Math.max(1, previous - 1))}>Previous</button>
    <button type="button" onClick={() => setPage((previous) => Math.min(pageCount, previous + 1))}>Next</button>
  </main>;
};

export default App;
`,
    skeleton: `const start = /* where the page begins */;
const visible = photos.slice(start, start + PAGE_SIZE);

// <ul>{visible.map(...)}</ul>
// <p>Page {page} of {pageCount}</p>`,
    hints: ['Pages count from 1 and array indexes from 0, so page 1 starts at index 0 and page 2 at index `PAGE_SIZE`. `slice(start, end)` stops before `end` and never runs past the end of the array.'],
    approach: [
      'Work out `start` as `(page - 1) * PAGE_SIZE` while rendering.',
      'Take `photos.slice(start, start + PAGE_SIZE)` and map that, not `photos`, to list items.',
      'Add a paragraph that reads "Page {page} of {pageCount}".',
    ],
    verify: 'tests',
    estimatedMinutes: 8,
    suite: `${header()}
const shown = container => [...container.querySelectorAll('li')].map(li => li.textContent);
const next = () => fireEvent.click(screen.getByRole('button', { name: 'Next' }));

test('the first page shows four photos', () => {
  const { container } = render(<App />);
  expect(shown(container)).toEqual(['Harbour', 'Lighthouse', 'Dunes', 'Pier']);
  expect(container.textContent).toContain('Page 1 of 3');
});

test('Next shows the following four', () => {
  const { container } = render(<App />);
  next();
  expect(shown(container)).toEqual(['Cliffs', 'Reef', 'Marina', 'Bay']);
  expect(container.textContent).toContain('Page 2 of 3');
});

test('the last page holds the two that are left', () => {
  const { container } = render(<App />);
  next();
  next();
  expect(shown(container)).toEqual(['Cove', 'Jetty']);
  expect(container.textContent).toContain('Page 3 of 3');
});
`,
  },
  {
    id: 'react-easy2-show-more',
    track: 'react',
    topic: 'react',
    level: 23,
    tier: 2,
    focus: ['pagination', 'slice'],
    title: 'Show more',
    prompt: 'Show the first 3 comments as list items and a "Show more" button under them. Each click shows 3 more. Keep how many are shown in state, not a second copy of the comments, and render `comments.slice(0, shown)`. While any comment is still hidden the button stays; once every comment shows, the button goes away. App takes the comments as a prop, and a short list may need no button at all.',
    starter: `import React, { useState } from 'react';

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

  return <main>
    <h2>Show more</h2>
    <ul>
      {comments.map((comment) => <li key={comment}>{comment}</li>)}
    </ul>
  </main>;
};

export default App;
`,
    skeleton: `const [shown, setShown] = useState(3);

// <ul>{comments.slice(0, shown).map(...)}</ul>
// {/* some comments still hidden? */ && <button ...>Show more</button>}`,
    hints: ['Store a number, the count of comments on screen, and derive the list from it with `slice(0, shown)`. Asking `slice` for more than the array holds is fine: it stops at the end.'],
    approach: [
      'Keep `shown` in `useState(3)`.',
      'Render `comments.slice(0, shown)` as list items.',
      'Render the button only while `shown < comments.length`, and let a click call `setShown((previous) => previous + 3)`.',
    ],
    verify: 'tests',
    estimatedMinutes: 8,
    suite: `${header()}
const count = container => container.querySelectorAll('li').length;
const more = () => screen.queryByRole('button', { name: 'Show more' });

test('shows the first three', () => {
  const { container } = render(<App />);
  expect(count(container)).toBe(3);
  expect(container.querySelector('li').textContent).toBe('Great photo');
});

test('Show more adds three', () => {
  const { container } = render(<App />);
  fireEvent.click(more());
  expect(count(container)).toBe(6);
});

test('the button goes when every comment shows', () => {
  const { container } = render(<App />);
  fireEvent.click(more());
  fireEvent.click(more());
  expect(count(container)).toBe(8);
  expect(more()).toBeNull();
});
`,
  },
  {
    id: 'react-easy2-numbered-pages',
    track: 'react',
    topic: 'react',
    level: 23,
    tier: 2,
    focus: ['pagination', 'accessibility'],
    title: 'Numbered page buttons',
    prompt: 'The list already shows one page of `songs`. Add a button for each page, labelled 1, 2, 3 and so on up to `Math.ceil(songs.length / PAGE_SIZE)`, inside `<nav aria-label="Pages">`. Clicking a number shows that page. The button of the current page carries `aria-current="page"`, and the others carry no `aria-current` at all, so a screen reader says which page is open. App takes the songs as a prop, so work the page count out from them.',
    starter: `import React, { useState } from 'react';

const allSongs = ['Blue Water', 'Low Tide', 'Salt Air', 'Deep End', 'Riptide', 'Undertow', 'Sea Glass'];
const PAGE_SIZE = 3;

const App = ({ songs = allSongs }) => {
  const [page, setPage] = useState(1);
  const start = (page - 1) * PAGE_SIZE;

  return <main>
    <h2>Numbered page buttons</h2>
    <ul>
      {songs.slice(start, start + PAGE_SIZE).map((song) => <li key={song}>{song}</li>)}
    </ul>
  </main>;
};

export default App;
`,
    skeleton: `const pageCount = Math.ceil(songs.length / PAGE_SIZE);
const pages = Array.from({ length: pageCount }, (_, index) => index + 1);

// <nav aria-label="Pages">
//   {pages.map((number) => <button key={number} type="button"
//     aria-current={/* "page" or undefined */} onClick={...}>{number}</button>)}
// </nav>`,
    hints: ['React leaves an attribute out when its value is `undefined`, so `aria-current={number === page ? "page" : undefined}` marks one button and leaves the rest bare.'],
    approach: [
      'Work out `pageCount` from `songs.length` and `PAGE_SIZE`, and build the list of page numbers from 1 to `pageCount`.',
      'Render one button per number inside `<nav aria-label="Pages">`; a click calls `setPage(number)`.',
      'Give each button `aria-current="page"` when its number is the current page and `undefined` otherwise.',
    ],
    verify: 'tests',
    estimatedMinutes: 9,
    suite: `${header()}
const pages = () => within(screen.getByRole('navigation', { name: 'Pages' })).getAllByRole('button');
const shown = container => [...container.querySelectorAll('li')].map(li => li.textContent);

test('one numbered button per page, inside the Pages navigation', () => {
  render(<App />);
  expect(pages().map(button => button.textContent)).toEqual(['1', '2', '3']);
});

test('clicking a number shows that page', () => {
  const { container } = render(<App />);
  fireEvent.click(pages()[2]);
  expect(shown(container)).toEqual(['Sea Glass']);
});

test('only the current page is marked', () => {
  render(<App />);
  expect(pages()[0].getAttribute('aria-current')).toBe('page');
  expect(pages()[1].getAttribute('aria-current')).toBeNull();
  expect(pages()[2].getAttribute('aria-current')).toBeNull();
});
`,
  },

  /* ── abort ────────────────────────────────────────────────────────── */
  {
    id: 'react-easy2-stop-the-download',
    track: 'react',
    topic: 'react',
    level: 13,
    tier: 2,
    focus: ['abort', 'useRef'],
    title: 'Stop the download',
    prompt: "\"Download\" fetches `/api/report`, shows \"Downloading…\" and then \"Done\" when the response arrives. Make \"Stop\" cancel it: create a new `AbortController` each time a download starts, keep it in a ref, pass its `signal` to `fetch`, and call `abort()` on it from Stop. The aborted `fetch` rejects, and the code in the starter then shows \"Stopped\". Stop after a finished download changes nothing, and so does Stop with no download at all. Keep one paragraph for Ready, Downloading…, Done, Stopped or Failed. A non-abort rejection shows Failed; an AbortError shows Stopped. This exercise finishes when fetch resolves and does not parse a download body. Each new Download supersedes and aborts the previous request; only its own current controller may update success or failure. An already-fulfilled older fetch must not finish the new pending download. All requests target exactly /api/report. Keep both buttons available through repeated downloads; Stop with no pending work preserves the terminal status. Ordinary parent re-renders do not start another request. Unmount aborts and invalidates pending work, while independent/fresh instances own their controller and start Ready. Development Strict Mode may repeat cleanup/setup.",
    starter: `import React, { useEffect, useRef, useState } from 'react';

const App = () => {
  const [status, setStatus] = useState('Ready');

  const download = async () => {
    setStatus('Downloading…');
    try {
      await fetch('/api/report');
      setStatus('Done');
    } catch (error) {
      setStatus(error.name === 'AbortError' ? 'Stopped' : 'Failed');
    }
  };

  const stop = () => {
  };

  return <main>
    <h2>Stop the download</h2>
    <p>{status}</p>
    <button type="button" onClick={download}>Download</button>
    <button type="button" onClick={stop}>Stop</button>
  </main>;
};

export default App;
`,
    skeleton: `const controllerRef = useRef(null);

useEffect(() => () => {
  const previous = controllerRef.current;
  controllerRef.current = null;
  previous?.abort();
}, []);

const download = async () => {
  // Abort the previous download before storing a new controller.
  const controller = new AbortController();
  controllerRef.current = controller;
  // Pass controller.signal to fetch. Check it is still current before
  // showing Done, Stopped or Failed.
};

const stop = () => {
  // Abort the current controller, if any.
};`,
    hints: ["A controller aborts once. Give each new download its own controller and allow only that current controller to update status; cleanup aborts and invalidates it."],
    approach: [
      "Keep the current download controller in a ref; each new Download aborts and replaces the previous controller.",
      "Pass its signal to fetch, show Downloading…, and accept Done or the classified error only if it is still current.",
      "Stop aborts the current controller and is harmless when no request is pending.",
      "Cleanup clears the current ref before aborting, so late continuations cannot update the removed instance."
],
    verify: 'tests',
    estimatedMinutes: 9,
    suite: `${header()}${FAKE_FETCH}
const press = label => fireEvent.click(screen.getByRole('button', { name: label }));
const status = container => container.querySelector('p').textContent;

test('a download that finishes shows Done', () => withFetch(async calls => {
  const { container } = render(<App />);
  press('Download');
  expect(status(container)).toBe('Downloading…');
  await act(async () => { calls[0].respond({}); });
  expect(status(container)).toBe('Done');
}));

test('the request carries a signal that is not aborted yet', () => withFetch(async calls => {
  render(<App />);
  press('Download');
  expect(calls[0].signal).toBeTruthy();
  expect(calls[0].signal.aborted).toBe(false);
}));

test('Stop aborts the request and shows Stopped', () => withFetch(async calls => {
  const { container } = render(<App />);
  press('Download');
  await act(async () => { press('Stop'); });
  expect(calls[0].signal.aborted).toBe(true);
  expect(status(container)).toBe('Stopped');
}));

test('Stop is harmless before or after one correctly addressed download',()=>withFetch(async calls=>{const root=render(<App/>);expect(status(root.container)).toBe('Ready');press('Stop');expect(calls).toHaveLength(0);expect(status(root.container)).toBe('Ready');press('Download');expect(calls).toHaveLength(1);expect(calls[0].url).toBe('/api/report');await act(async()=>calls[0].respond({}));expect(status(root.container)).toBe('Done');await act(async()=>press('Stop'));expect(status(root.container)).toBe('Done');}));

`,
  },
  {
    id: 'react-easy2-cancel-is-not-an-error',
    track: 'react',
    topic: 'react',
    level: 13,
    tier: 2,
    focus: ['abort', 'fetch'],
    title: 'A cancel is not an error',
    prompt: "The starter loads `/api/prices` with an `AbortController`, and its Cancel button aborts the request. But every rejection shows \"Could not load prices\", so a cancel looks like a failure. In the `catch`, check the error's `name`: an `AbortError` shows \"Cancelled\", and any other error still shows \"Could not load prices\". Check the name, not the message, which differs from browser to browser. On a normal mount, start one request to exactly /api/prices and initially show Loading…. A resolved fetch shows Prices loaded. For ordinary Error or DOMException rejections, compare the case-sensitive name exactly: AbortError means Cancelled; aborterror, TimeoutError and other names are failures regardless of the message. Keep one paragraph with the current status and the Cancel button. Repeated Cancel after the request settles does not replace its terminal status or make another request. Parent re-renders preserve the same request. Each independent or fresh mount owns a new controller and starts Loading; unmounting aborts its request. Development Strict Mode may repeat setup and cleanup.",
    starter: `import React, { useEffect, useRef, useState } from 'react';

const App = () => {
  const [status, setStatus] = useState('Loading…');
  const controllerRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;
    fetch('/api/prices', { signal: controller.signal })
      .then(() => setStatus('Prices loaded'))
      .catch((error) => {
        setStatus('Could not load prices');
      });
    return () => controller.abort();
  }, []);

  return <main>
    <h2>A cancel is not an error</h2>
    <p>{status}</p>
    <button type="button" onClick={() => controllerRef.current.abort()}>Cancel</button>
  </main>;
};

export default App;
`,
    skeleton: `.catch((error) => {
  if (/* the request was aborted */) {
    setStatus('Cancelled');
  } else {
    setStatus('Could not load prices');
  }
});`,
    hints: ['When a `fetch` is aborted, the promise rejects with an error whose `name` is `"AbortError"`. A network failure rejects with a different error, usually a `TypeError`.'],
    approach: [
      'Find the `catch` in the effect.',
      'Compare `error.name` with `"AbortError"`.',
      'Set "Cancelled" when they match and "Could not load prices" when they do not.',
    ],
    verify: 'tests',
    estimatedMinutes: 6,
    suite: `${header()}${FAKE_FETCH}
const status = container => container.querySelector('p').textContent;

test('a response shows Prices loaded', () => withFetch(async calls => {
  const { container } = render(<App />);
  await act(async () => { calls[0].respond([]); });
  expect(status(container)).toBe('Prices loaded');
}));

test('Cancel shows Cancelled, not an error', () => withFetch(async calls => {
  const { container } = render(<App />);
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Cancel' })); });
  expect(calls[0].signal.aborted).toBe(true);
  expect(status(container)).toBe('Cancelled');
}));

test('a failed request is still an error', () => withFetch(async calls => {
  const { container } = render(<App />);
  await act(async () => { calls[0].fail(new TypeError('Failed to fetch')); });
  expect(status(container)).toBe('Could not load prices');
}));

test('case-sensitive error names do not turn a real failure into a cancellation',()=>withFetch(async calls=>{const root=render(<App/>);expect(calls).toHaveLength(1);expect(calls[0].url).toBe('/api/prices');expect(status(root.container)).toBe('Loading…');const error=new Error('The operation was aborted.');error.name='aborterror';await act(async()=>calls[0].fail(error));expect(status(root.container)).toBe('Could not load prices');}));

`,
  },
  {
    id: 'react-easy2-latest-search-wins',
    track: 'react',
    topic: 'react',
    level: 13,
    tier: 2,
    focus: ['abort', 'effect-cleanup'],
    title: 'Only the latest search',
    prompt: "Each change of the query starts a request for `/api/posts?q=<query>`, which answers with matching posts, but an old, slow answer can still arrive last and replace the results of a newer query. Give each run of the effect its own `AbortController`, pass its `signal` to `fetch`, and abort it in the effect's cleanup. React runs that cleanup before the next run and when the component leaves the page, so every request but the latest is cancelled. Ignore the `AbortError` an aborted request rejects with. Keep the Search input controlled with well-formed Unicode text up to 2000 UTF-16 code units; encode it with encodeURIComponent as the single q parameter, without trimming it. Empty query makes no request, clears results/errors and cancels old work. Clear the previous list/error when any new query starts. Await the JSON body, checking response.ok first. Render every exact literal returned post title in order in one UL, keyed by id; the dense read-only response has at most 100 ordinary records with unique positive integer ids and plain titles up to 2000 code units, including duplicate or empty titles. HTTP, network or JSON failure for the active query shows Could not load posts. as an alert with an empty list; another query can recover. Ignore completed or queued response-processing work after that effect cleans up, even if the transport has already settled. Only the active query may change results or errors. Parent re-renders do not refetch; removed/fresh mounts own separate query state. A loading label is optional. One effect lifetime means normal mounting; development Strict Mode may repeat setup and cleanup.",
    starter: `import React, { useEffect, useState } from 'react';

const App = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!query) return;
    fetch('/api/posts?q=' + encodeURIComponent(query))
      .then((response) => response.json())
      .then((posts) => setResults(posts));
  }, [query]);

  return <main>
    <h2>Only the latest search</h2>
    <label>Search <input value={query} onChange={(event) => setQuery(event.target.value)} /></label>
    {error && <p role="alert">{error}</p>}
    <ul>
      {results.map((post) => <li key={post.id}>{post.title}</li>)}
    </ul>
  </main>;
};

export default App;
`,
    skeleton: `useEffect(() => {
  setResults([]);
  setError('');
  if (!query) return;
  let active = true;
  const controller = new AbortController();
  fetch('/api/posts?q=' + encodeURIComponent(query), { signal: controller.signal })
    .then(response => {
      if (!response.ok) throw new Error('Request failed');
      return response.json();
    })
    .then(posts => {
      // Commit results only while this effect is active.
    })
    .catch(error => {
      // Ignore cancellation and stale work; show other active failures.
    });
  return () => { active = false; controller.abort(); };
}, [query]);`,
    hints: ["Each effect run owns its controller and active flag. Abort and mark it inactive during cleanup, then accept parsed results or errors only while that run is active."],
    approach: [
      "Clear results/errors whenever the raw query changes; empty query starts no request.",
      "Each nonempty effect creates its own controller and active flag, then fetches the encoded query with its signal.",
      "Check response.ok, await JSON, and commit exact titles only while active. Show the fixed alert for active non-abort failures.",
      "Cleanup first invalidates the effect and then aborts its transport so queued processing cannot replace the latest query."
],
    verify: 'tests',
    estimatedMinutes: 9,
    suite: `${header()}${FAKE_FETCH}
const type = value => fireEvent.change(screen.getByLabelText('Search'), { target: { value } });
const forQuery = (calls, query) => calls.find(call => call.url.endsWith('q=' + query));
const shown = container => [...container.querySelectorAll('li')].map(li => li.textContent);

test('each query sends a request with a signal', () => withFetch(async calls => {
  render(<App />);
  type('a');
  expect(forQuery(calls, 'a').signal).toBeTruthy();
}));

test('a new query cancels the request before it', () => withFetch(async calls => {
  render(<App />);
  type('a');
  type('ab');
  expect(forQuery(calls, 'a').signal.aborted).toBe(true);
  expect(forQuery(calls, 'ab').signal.aborted).toBe(false);
}));

test('an old answer never replaces a newer one', () => withFetch(async calls => {
  const { container } = render(<App />);
  type('a');
  type('ab');
  await act(async () => { forQuery(calls, 'ab').respond([{ id: 1, title: 'Abacus' }]); });
  await act(async () => { forQuery(calls, 'a').respond([{ id: 2, title: 'Apples' }, { id: 3, title: 'Avocados' }]); });
  expect(shown(container)).toEqual(['Abacus']);
}));

const withSearchPhases=async body=>{const real=globalThis.fetch,calls=[];globalThis.fetch=(url,options={})=>new Promise((resolve,reject)=>{let releaseJSON,rejectJSON;const json=new Promise((yes,no)=>{releaseJSON=yes;rejectJSON=no;});const signal=options.signal;calls.push({url:String(url),signal,headers:(status=200)=>resolve({ok:status>=200&&status<300,status,json:()=>json}),body:releaseJSON,badJSON:()=>rejectJSON(new Error('Bad JSON')),fail:()=>reject(new TypeError('Offline'))});const abort=()=>{const error=new Error('Aborted');error.name='AbortError';reject(error);};if(signal?.aborted)abort();else signal?.addEventListener('abort',abort);});try{await body(calls);}finally{globalThis.fetch=real;}};
const searchInput=scope=>within(scope).getByLabelText('Search');
const changeSearch=(scope,text)=>fireEvent.change(searchInput(scope),{target:{value:text}});
const searchHeaders=async(call,status=200)=>{await act(async()=>call.headers(status));};
const searchBody=async(call,data)=>{await act(async()=>call.body(data));};
const searchDone=async(call,data,status=200)=>{await searchHeaders(call,status);await searchBody(call,data);};

test('raw queries are encoded and actual response titles stay literal',()=>withFetch(async calls=>{const root=render(<App/>);expect(calls).toHaveLength(0);const query='ice cream & tea/☕';changeSearch(root.container,query);await waitFor(()=>expect(calls).toHaveLength(1));const url=new URL(calls[0].url,'https://example.test');expect(url.pathname).toBe('/api/posts');expect(url.searchParams.get('q')).toBe(query);expect([...url.searchParams.keys()]).toEqual(['q']);await act(async()=>calls[0].respond([{id:1,title:'<b>Actual title</b>'},{id:2,title:'<b>Actual title</b>'}]));expect(shown(root.container)).toEqual(['<b>Actual title</b>','<b>Actual title</b>']);expect(root.container.querySelector('li b')).toBeNull();}));

`,
  },

  /* ── accessibility ────────────────────────────────────────────────── */
  {
    id: 'react-easy2-disclosure',
    track: 'react',
    topic: 'react',
    level: 7,
    tier: 1,
    focus: ['accessibility'],
    title: 'An accessible disclosure',
    prompt: "The \"Shipping details\" toggle is a clickable `div`, which a keyboard cannot reach and a screen reader does not announce as a control. Make it a `<button type=\"button\">` with `aria-expanded`, \"true\" while the details show and \"false\" while they are hidden. Give the details paragraph an id made with `useId`, so two of these on one page never share it, and point the button's `aria-controls` at that id. Render the details only while they are open. Start closed and keep the button label and paragraph text from the starter. The nonempty controlled id stays stable through open/close cycles and ordinary parent re-renders; when open it identifies this instance's paragraph. Repeated clicks keep alternating. Simultaneously mounted disclosures have distinct ids and independent open state, and each fresh mount starts closed. Keep focus on the native button after toggling; its native keyboard activation needs no custom Enter/Space handler.",
    starter: `import React, { useId, useState } from 'react';

const App = () => {
  const [open, setOpen] = useState(false);

  return <main>
    <h2>An accessible disclosure</h2>
    <div className="disclosure" onClick={() => setOpen(!open)}>Shipping details</div>
    {open && <p>Orders ship within two working days.</p>}
  </main>;
};

export default App;
`,
    skeleton: `const detailsId = useId();

// <button type="button" aria-expanded={open} aria-controls={detailsId} onClick={...}>
//   Shipping details
// </button>
// {open && <p id={detailsId}>...</p>}`,
    hints: ['A real `<button>` is focusable and answers Enter and Space by itself. React writes `aria-expanded={open}` as "true" or "false", which is what the attribute expects.'],
    approach: [
      'Replace the `div` with `<button type="button">` and keep its click handler.',
      'Add `aria-expanded={open}` to the button.',
      'Create an id with `useId()`, put it on the paragraph, and give the button `aria-controls` with the same id.',
    ],
    verify: 'tests',
    estimatedMinutes: 7,
    suite: `${header()}
const toggle = () => screen.getByRole('button', { name: 'Shipping details' });

test('the toggle is a real button', () => {
  render(<App />);
  expect(toggle().tagName).toBe('BUTTON');
});

test('aria-expanded follows the details', () => {
  render(<App />);
  expect(toggle().getAttribute('aria-expanded')).toBe('false');
  fireEvent.click(toggle());
  expect(toggle().getAttribute('aria-expanded')).toBe('true');
});

test('aria-controls names the details', () => {
  render(<App />);
  fireEvent.click(toggle());
  const details = document.getElementById(toggle().getAttribute('aria-controls'));
  expect(details.textContent).toBe('Orders ship within two working days.');
});

test('reopening keeps the same controlled paragraph id',()=>{render(<App/>);const t=toggle(),id=t.getAttribute('aria-controls');for(let i=0;i<3;i++)fireEvent.click(t);expect(t.getAttribute('aria-expanded')).toBe('true');expect(t.getAttribute('aria-controls')).toBe(id);expect(document.getElementById(id).textContent).toBe('Orders ship within two working days.');});

`,
  },
  {
    id: 'react-easy2-labelled-field',
    track: 'react',
    topic: 'react',
    level: 15,
    tier: 2,
    focus: ['accessibility', 'forms'],
    title: 'A field that explains its error',
    prompt: `The email field has no label, and its error is red text that nothing connects to the field. Replace the "Email" span with a \`<label>\` whose \`htmlFor\` matches the input's \`id\`. When Save is pressed with the field empty, show "Enter your email" in an element with its own id, set \`aria-invalid="true"\` on the input, and point the input's \`aria-describedby\` at the error. While there is no error, the input carries neither attribute. Use stable unique field and error ids for each instance. This exercise validates blankness only: test the current native field value with trim(), and use noValidate on the form so native email-format validation does not block that custom check. On each Save, blank or whitespace-only text sets the error and any nonblank text clears it; do not normalize the stored field value yourself. Values are single-line strings up to 2000 UTF-16 code units. Parent renders preserve ids and state, and each label/error must refer to its own instance.`,
    starter: `import React, { useId, useState } from 'react';

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
      <span>Email</span>
      <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      {error && <p className="error">{error}</p>}
      <button type="submit">Save</button>
    </form>
  </main>;
};

export default App;
`,
    skeleton: `const fieldId = useId();
const errorId = fieldId + '-error';

<label htmlFor={fieldId}>Email</label>
<input
  id={fieldId}
  aria-invalid={error ? true : undefined}
  aria-describedby={error ? errorId : undefined}
  ...
/>
{error && <p id={errorId} className="error">{error}</p>}

// <form noValidate onSubmit={save}>`,
    hints: [`useId supplies a stable id for this instance. Derive an error id from it and use the same values in htmlFor, id and aria-describedby. An undefined attribute is left out, so add the error attributes only while an error exists.`],
    approach: [
      `Create a field id with useId and derive an error id from it; tie the label to that field id.`,
      `On Save, prevent navigation and check email.trim(); use noValidate on the form because this lesson checks blankness, not email syntax.`,
      `Give the error its own id and add aria-invalid plus aria-describedby only while the error exists.`,
    ],
    verify: 'tests',
    estimatedMinutes: 9,
    suite: `${header()}
const field = () => screen.getByLabelText('Email');
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save' }));

test('the field has a label', () => {
  render(<App />);
  expect(field().tagName).toBe('INPUT');
});

test('an empty save marks the field invalid', () => {
  render(<App />);
  save();
  expect(field().getAttribute('aria-invalid')).toBe('true');
});

test('the field points at its error', () => {
  render(<App />);
  save();
  const message = document.getElementById(field().getAttribute('aria-describedby'));
  expect(message.textContent).toBe('Enter your email');
});

test('Unicode whitespace is empty for this custom blankness rule',()=>{
 render(<App/>);fireEvent.change(field(),{target:{value:' '}});save();expect(field().getAttribute('aria-invalid')).toBe('true');expect(document.getElementById(field().getAttribute('aria-describedby')).textContent).toBe('Enter your email');
});`,
  },

  /* ── splice ───────────────────────────────────────────────────────── */
  {
    id: 'react-easy2-draw-a-card',
    track: 'react',
    topic: 'react',
    level: 22,
    tier: 1,
    focus: ['splice', 'useState'],
    title: 'Draw a card',
    prompt: 'Each card in the deck is a button. Clicking one takes that card out of the deck and shows "You drew <name>". Copy the deck, call `splice(index, 1)` on the copy, and read the drawn card from the array `splice` returns. Never splice the array that is in state, or the `cards` prop App was given. A deck can hold two cards with the same name (each has its own id), and only the one clicked goes.',
    starter: `import React, { useState } from 'react';

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
  };

  return <main>
    <h2>Draw a card</h2>
    {deck.map((card, index) => (
      <button key={card.id} type="button" onClick={() => draw(index)}>{card.name}</button>
    ))}
    {drawn && <p>You drew {drawn.name}</p>}
  </main>;
};

export default App;
`,
    skeleton: `const draw = (index) => {
  const next = [...deck];
  const [card] = next.splice(index, 1);
  // store next, and remember card
};`,
    hints: ['`splice` changes the array it is called on and returns an array of what it removed. Called on a copy made with spread, it leaves the original alone.'],
    approach: [
      'In `draw`, copy the deck with `[...deck]`.',
      'Call `splice(index, 1)` on the copy and take the first element of what it returns.',
      'Store the copy with `setDeck` and the card with `setDrawn`.',
    ],
    verify: 'tests',
    estimatedMinutes: 7,
    suite: `${header()}
const deck = container => [...container.querySelectorAll('button')].map(button => button.textContent);
const draw = name => fireEvent.click(screen.getByRole('button', { name }));

test('drawing removes that card and names it', () => {
  const { container } = render(<App />);
  draw('Queen');
  expect(deck(container)).toEqual(['Ace', 'King', 'Jack', 'Ten']);
  expect(container.textContent).toContain('You drew Queen');
});

test('two draws in a row', () => {
  const { container } = render(<App />);
  draw('King');
  draw('Ace');
  expect(deck(container)).toEqual(['Queen', 'Jack', 'Ten']);
  expect(container.textContent).toContain('You drew Ace');
});

test('the last card empties the deck', () => {
  const { container } = render(<App cards={[{ id: 9, name: 'Joker' }]} />);
  draw('Joker');
  expect(deck(container)).toEqual([]);
  expect(container.textContent).toContain('You drew Joker');
});
`,
  },
  {
    id: 'react-easy2-insert-at-position',
    track: 'react',
    topic: 'react',
    level: 22,
    tier: 2,
    focus: ['splice', 'forms'],
    title: 'Insert at a position',
    prompt: 'The form has a Name field and a Position field, where 1 is the top of the queue. "Add" inserts the name at that position: copy the queue and call `splice(position - 1, 0, name)` on the copy. A position past the end adds the name at the end, which `splice` does by itself. A position below 1 puts the name at the top: a negative start would make `splice` count from the end.',
    starter: `import React, { useState } from 'react';

const startingQueue = ['Ana', 'Ben', 'Cleo'];

const App = () => {
  const [queue, setQueue] = useState(startingQueue);
  const [name, setName] = useState('');
  const [position, setPosition] = useState('1');

  const add = (event) => {
    event.preventDefault();
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

export default App;
`,
    skeleton: `const add = (event) => {
  event.preventDefault();
  const index = Math.max(0, Number(position) - 1);
  const next = [...queue];
  // insert name at index, removing nothing
  setQueue(next);
};`,
    hints: ['`splice(start, 0, item)` removes nothing and inserts `item` before the element at `start`. A `start` past the end appends, and a negative `start` counts back from the end.'],
    approach: [
      'Turn the Position text into an index: `Number(position) - 1`, and no lower than 0.',
      'Copy the queue with `[...queue]` and call `splice(index, 0, name)` on the copy.',
      'Store the copy with `setQueue`.',
    ],
    verify: 'tests',
    estimatedMinutes: 9,
    suite: `${header()}
const queue = container => [...container.querySelectorAll('li')].map(li => li.textContent);
const add = (name, position) => {
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: name } });
  fireEvent.change(screen.getByLabelText('Position'), { target: { value: position } });
  fireEvent.click(screen.getByRole('button', { name: 'Add' }));
};

test('inserts at the given position', () => {
  const { container } = render(<App />);
  add('Dan', '2');
  expect(queue(container)).toEqual(['Ana', 'Dan', 'Ben', 'Cleo']);
});

test('position 1 is the top', () => {
  const { container } = render(<App />);
  add('Dan', '1');
  expect(queue(container)).toEqual(['Dan', 'Ana', 'Ben', 'Cleo']);
});

test('a position past the end adds at the end', () => {
  const { container } = render(<App />);
  add('Dan', '9');
  expect(queue(container)).toEqual(['Ana', 'Ben', 'Cleo', 'Dan']);
});
`,
  },
  {
    id: 'react-easy2-take-a-seat',
    track: 'react',
    topic: 'react',
    level: 22,
    tier: 2,
    focus: ['splice', 'useState'],
    title: 'Take a seat',
    prompt: 'A row of four seats holds a name or `null` for a free seat. A free seat shows a "Take seat <n>" button. Clicking it puts "You" in that seat: copy the row and call `splice(index, 1, "You")` on the copy, which replaces one element, so the row keeps four seats and every other seat stays where it was. Once you are seated, the buttons of the other free seats are disabled.',
    starter: `import React, { useState } from 'react';

const startingRow = [null, 'Ana', null, 'Ben'];

const App = () => {
  const [seats, setSeats] = useState(startingRow);

  const take = (index) => {
  };

  return <main>
    <h2>Take a seat</h2>
    <ol>
      {seats.map((person, index) => (
        <li key={index}>
          {person
            ? 'Seat ' + (index + 1) + ': ' + person
            : <button type="button" onClick={() => take(index)}>Take seat {index + 1}</button>}
        </li>
      ))}
    </ol>
  </main>;
};

export default App;
`,
    skeleton: `const seated = seats.includes('You');

const take = (index) => {
  const next = [...seats];
  // replace the element at index with 'You'
  setSeats(next);
};

// <button ... disabled={seated}>`,
    hints: ['`splice(index, 1, item)` removes one element and puts `item` in its place, so the length does not change.'],
    approach: [
      'In `take`, copy the row with `[...seats]` and call `splice(index, 1, "You")` on the copy.',
      'Store the copy with `setSeats`.',
      'Work out `seated` as `seats.includes("You")` while rendering, and pass `disabled={seated}` to every button.',
    ],
    verify: 'tests',
    estimatedMinutes: 8,
    suite: `${header()}
const row = container => [...container.querySelectorAll('li')].map(li => li.textContent);
const seat = n => screen.getByRole('button', { name: 'Take seat ' + n });

test('each free seat offers a button', () => {
  render(<App />);
  expect(seat(1)).toBeTruthy();
  expect(seat(3)).toBeTruthy();
});

test('taking a seat puts You in it', () => {
  const { container } = render(<App />);
  fireEvent.click(seat(3));
  expect(row(container)).toEqual(['Take seat 1', 'Seat 2: Ana', 'Seat 3: You', 'Seat 4: Ben']);
});

test('once seated, the other free seat is disabled', () => {
  render(<App />);
  fireEvent.click(seat(3));
  expect(seat(1).disabled).toBe(true);
});
`,
  },
];
