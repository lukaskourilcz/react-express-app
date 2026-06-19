// React roadmap questions — set B (100). A second question per level theme,
// distinct from set A. Combined with set A this gives 8 questions per level so
// each 5-level checkpoint has a full 40-question test. 25 levels × 4.

import type { Seed } from './roadmap-build';

export const reactSeedsB: Seed[] = [
  // ── Level 1 — JSX Basics ───────────────────────────────────────────────
  { q: 'What does this render?\n\n```jsx\n<p>{["a", "b"]}</p>;\n```', opts: ['"a,b"', '"ab"', '["a", "b"]', 'an error'], a: 1, e: 'React renders an array by concatenating its items, so it shows "ab".', tags: ['JSX'] },
  { q: 'What does this render?\n\n```jsx\n<p>{true}</p>;\n```', opts: ['"true"', 'nothing', '1', 'an error'], a: 1, e: 'Booleans are not rendered by React, so nothing appears.', tags: ['JSX'] },
  { q: 'What does this render?\n\n```jsx\n<p>{null}</p>;\n```', opts: ['"null"', 'nothing', 'null', 'an error'], a: 1, e: 'null renders nothing in JSX.', tags: ['JSX'] },
  { q: 'In JSX, void elements like <img> must be:\n\n```jsx\n<img src="a.png" />;\n```', opts: ['left open', 'self-closed', 'wrapped in a div', 'lowercase only'], a: 1, e: 'JSX requires every tag to be closed, so void elements are self-closed with />.', tags: ['JSX'] },

  // ── Level 2 — Components ───────────────────────────────────────────────
  { q: 'Is this a valid component?\n\n```jsx\nconst App = () => <p>Hi</p>;\n```', opts: ['Type error', 'Yes, an arrow-function component', 'needs a class', 'an error'], a: 1, e: 'Arrow functions returning JSX are valid function components.', tags: ['Components'] },
  { q: 'What renders?\n\n```jsx\nfunction App() {\n  <p>Hi</p>;\n}\n```', opts: ['<p>Hi</p>', 'nothing — there is no return', 'always an error', '"Hi"'], a: 1, e: 'Without a return statement the component returns undefined and renders nothing.', tags: ['Components'] },
  { q: 'Writing <Welcome /> tells React to:', opts: ['call it as a plain function now', 'render it as a component', 'ignore it', 'create a class'], a: 1, e: 'JSX element syntax instructs React to render the component.', tags: ['Components'] },
  { q: 'What renders?\n\n```jsx\nfunction App() {\n  return (\n    <div>\n      <Header />\n      <Main />\n    </div>\n  );\n}\n```', opts: ['only the div', 'Header and Main inside a div', 'nothing', 'an error'], a: 1, e: 'Both child components render inside the wrapping div.', tags: ['Components'] },

  // ── Level 3 — Props ────────────────────────────────────────────────────
  { q: 'What is rendered?\n\n```jsx\nfunction B({ a, b }) {\n  return <p>{a + b}</p>;\n}\n<B a={2} b={3} />;\n```', opts: ['"5"', '"23"', '5', 'an error'], a: 0, e: 'Numeric props add: 2 + 3 = 5.', tags: ['Props'] },
  { q: 'In React, props are:', opts: ['mutable by the component', 'read-only', 'always optional', 'global'], a: 1, e: 'A component must treat its props as read-only and never mutate them.', tags: ['Props'] },
  { q: 'What is the value of disabled?\n\n```jsx\n<Btn label="Save" disabled />;\n```', opts: ['"disabled"', 'true', 'false', 'undefined'], a: 1, e: 'A bare prop (shorthand) passes the boolean true.', tags: ['Props'] },
  { q: 'What does spreading props do?\n\n```jsx\n<Input {...props} />;\n```', opts: ['passes all of props’ keys as props', 'passes none', 'clones Input', 'an error'], a: 0, e: 'Spreading an object passes each of its properties as an individual prop.', tags: ['Props', 'Spread'] },

  // ── Level 4 — Rendering Lists ──────────────────────────────────────────
  { q: 'What is rendered?\n\n```jsx\n{[1, 2, 3].map(n => <li key={n}>{n * n}</li>)}\n```', opts: ['1, 2, 3', '1, 4, 9', '3 empty items', 'an error'], a: 1, e: 'Each item renders n squared: 1, 4, 9.', tags: ['Lists', 'map'] },
  { q: 'A list key should be:', opts: ['the index always', 'unique among siblings and stable', 'random each render', 'the value times two'], a: 1, e: 'Good keys are stable across renders and unique within the list.', tags: ['Lists', 'key'] },
  { q: 'Which is the best key here?\n\n```jsx\n{users.map(u => <Row key={???} name={u.name} />)}\n```', opts: ['the array index', 'u.id', 'u.name', 'Math.random()'], a: 1, e: 'A stable unique id (u.id) is the safest key.', tags: ['Lists', 'key'] },
  { q: 'What renders?\n\n```jsx\nconst listItems = [<li key="1">A</li>, <li key="2">B</li>];\n<ul>{listItems}</ul>;\n```', opts: ['only the first', 'both list items', 'nothing', 'an error'], a: 1, e: 'React renders every element in the array of children.', tags: ['Lists'] },

  // ── Level 5 — Conditional Rendering ────────────────────────────────────
  { q: 'When error is truthy, what renders?\n\n```jsx\n{error ? <Err /> : <Ok />}\n```', opts: ['<Ok />', '<Err />', 'both', 'nothing'], a: 1, e: 'A truthy condition renders the first branch, <Err />.', tags: ['Conditional'] },
  { q: 'When items is [], what renders?\n\n```jsx\n{items.length === 0 ? <Empty /> : <List />}\n```', opts: ['<List />', '<Empty />', 'nothing', 'an error'], a: 1, e: 'length === 0 is true for an empty array, so <Empty /> renders.', tags: ['Conditional'] },
  { q: 'When isLoading is false, what renders?\n\n```jsx\n{isLoading && <Spinner />}\n```', opts: ['<Spinner />', 'nothing', '"false"', 'an error'], a: 1, e: 'A false left-hand side makes && render nothing.', tags: ['Conditional', 'Short-circuit'] },
  { q: 'When user is null, what renders?\n\n```jsx\n{user ? `Hi ${user.name}` : "Guest"}\n```', opts: ['"Hi undefined"', '"Guest"', 'an error', 'nothing'], a: 1, e: 'A null user is falsy, so the ternary renders "Guest".', tags: ['Conditional'] },

  // ── Level 6 — useState: Basics ─────────────────────────────────────────
  { q: 'What is the initial value of v?\n\n```jsx\nconst [v, setV] = useState(() => 5);\n```', opts: ['a function', '5', 'undefined', '0'], a: 1, e: 'A function initializer runs once to compute the initial state, so v starts at 5 (lazy init).', tags: ['useState'] },
  { q: 'Calling useState several times in one component is:', opts: ['not allowed', 'allowed — each is independent state', 'sharing one state', 'an error'], a: 1, e: 'You can call useState multiple times; each manages its own state.', tags: ['useState'] },
  { q: 'What is a?\n\n```jsx\nconst [a] = useState([]);\n```', opts: ['undefined', 'an empty array', 'null', 'useState'], a: 1, e: 'The initial state is the empty array passed in.', tags: ['useState'] },
  { q: 'After setV(10), reading v later in the same render gives:\n\n```jsx\nconst [v, setV] = useState(0);\nsetV(10);\n```', opts: ['10 immediately', 'the old value until the next render', 'undefined', 'an error'], a: 1, e: 'State updates apply on the next render, not synchronously.', tags: ['useState'] },

  // ── Level 7 — Event Handling ───────────────────────────────────────────
  { q: 'When is handle called?\n\n```jsx\n<button onClick={handle}>Go</button>;\n```', opts: ['on render', 'when clicked', 'never', 'an error'], a: 1, e: 'Passing the function reference runs it only on click.', tags: ['Events'] },
  { q: 'Which form runs during render (a bug)?', opts: ['onClick={() => doIt()}', 'onClick={doIt()}', 'onClick={doIt}', 'none of them'], a: 1, e: 'onClick={doIt()} calls doIt immediately during render and passes its result.', tags: ['Events', 'Gotchas'] },
  { q: 'onChange on a text input fires:', opts: ['once on blur', 'on every value change', 'only on submit', 'never'], a: 1, e: 'onChange fires each time the input’s value changes (e.g. each keystroke).', tags: ['Events', 'Forms'] },
  { q: 'What does the onSubmit handler receive?\n\n```jsx\n<form onSubmit={handleSubmit}>\n```', opts: ['nothing', 'the submit event', 'the form values', 'a boolean'], a: 1, e: 'Event handlers receive the corresponding event object.', tags: ['Events', 'Forms'] },

  // ── Level 8 — Updating State ───────────────────────────────────────────
  { q: 'What does this do?\n\n```jsx\nsetItems(items => [...items, newItem]);\n```', opts: ['mutates items', 'adds newItem immutably to the end', 'removes items', 'an error'], a: 1, e: 'It builds a new array with newItem appended, without mutating the old one.', tags: ['useState', 'Arrays'] },
  { q: 'Called 3 times from 0, where does count end?\n\n```jsx\nsetCount(c => c + 1);\nsetCount(c => c + 1);\nsetCount(c => c + 1);\n```', opts: ['1', '2', '3', '0'], a: 2, e: 'Functional updates chain off the latest value: 0 → 1 → 2 → 3.', tags: ['useState'] },
  { q: 'What is user after this?\n\n```jsx\n// user was { name: "A", age: 1 }\nsetUser({ name: "B" });\n```', opts: ['{ name: "B", age: 1 }', '{ name: "B" }', '{ age: 1 }', 'an error'], a: 1, e: 'Passing a whole new object replaces the state; age is gone unless you spread the old object.', tags: ['useState', 'Objects'] },
  { q: 'React state updates are:', opts: ['synchronous', 'asynchronous and batched', 'immediate', 'blocking'], a: 1, e: 'Setters schedule an update; React batches them and re-renders afterward.', tags: ['useState'] },

  // ── Level 9 — State with Objects/Arrays ────────────────────────────────
  { q: 'What does this do?\n\n```jsx\nsetList(list.map(x => (x.id === id ? { ...x, done: !x.done } : x)));\n```', opts: ['mutates the item', 'flips done on the matching item immutably', 'removes the item', 'an error'], a: 1, e: 'It maps to a new array, replacing only the matched item with a copy whose done is toggled.', tags: ['useState', 'Arrays'] },
  { q: 'What does this produce?\n\n```jsx\nsetObj({ ...obj, count: obj.count + 1 });\n```', opts: ['mutates obj', 'a new object with count incremented', 'removes count', 'an error'], a: 1, e: 'Spreading then overriding count yields a new object with count + 1.', tags: ['useState', 'Objects'] },
  { q: 'Why copy state before updating it?', opts: ['for speed', 'React compares references to decide whether to re-render', 'to mutate safely', 'no reason'], a: 1, e: 'React relies on a changed reference to know state updated, so you create a new object/array.', tags: ['useState', 'Immutability'] },
  { q: 'What does this do?\n\n```jsx\nsetArr([...arr.slice(0, i), ...arr.slice(i + 1)]);\n```', opts: ['adds at index i', 'removes the item at index i', 'reverses the array', 'an error'], a: 1, e: 'Joining the parts before and after i drops the element at i.', tags: ['useState', 'Arrays'] },

  // ── Level 10 — Derived State ───────────────────────────────────────────
  { q: 'A list filtered by a query should be:', opts: ['stored in useState', 'computed during render', 'kept in a ref', 'set in useEffect'], a: 1, e: 'Derive it during render from the source list and query rather than duplicating state.', tags: ['Derived state'] },
  { q: 'What is total here?\n\n```jsx\nconst total = items.reduce((s, i) => s + i.price, 0);\n```', opts: ['stored state', 'a value derived each render', 'a ref', 'asynchronous'], a: 1, e: 'total is computed from items on every render — derived state.', tags: ['Derived state'] },
  { q: 'What is isValid?\n\n```jsx\nconst isValid = name.length > 0 && email.includes("@");\n```', opts: ['state', 'a derived boolean from the inputs', 'a side effect', 'an error'], a: 1, e: 'It is computed from existing values, so it should be derived, not stored.', tags: ['Derived state'] },
  { q: 'Sorting in render like this is:\n\n```jsx\nconst sorted = [...items].sort();\n```', opts: ['mutating items', 'fine, but recomputes every render', 'forbidden', 'asynchronous'], a: 1, e: 'It copies first (no mutation) but runs each render; memoize if the sort is expensive.', tags: ['Derived state'] },

  // ── Level 11 — useEffect: Basics ───────────────────────────────────────
  { q: 'When does this run?\n\n```jsx\nuseEffect(() => {\n  console.log("hi");\n}, []);\n```', opts: ['every render', 'once after mount', 'before render', 'never'], a: 1, e: 'An empty dependency array runs the effect once after the first render.', tags: ['useEffect'] },
  { q: 'When do effects run relative to rendering?', opts: ['before render', 'during render', 'after the render is committed to the DOM', 'never'], a: 2, e: 'Effects run after React commits the render to the DOM.', tags: ['useEffect'] },
  { q: 'When does this run?\n\n```jsx\nuseEffect(fn, [a, b]);\n```', opts: ['only on mount', 'on mount and when a or b changes', 'every render', 'never'], a: 1, e: 'It runs on mount and whenever any listed dependency changes.', tags: ['useEffect'] },
  { q: 'Returning a function from useEffect:', opts: ['registers a cleanup', 'runs the effect twice', 'is ignored', 'is an error'], a: 0, e: 'The returned function is the effect’s cleanup.', tags: ['useEffect', 'Cleanup'] },

  // ── Level 12 — Effect Dependencies ─────────────────────────────────────
  { q: 'An empty dependency array means the effect:', opts: ['runs every render', 'runs once and not again on updates', 'never runs', 'runs only on unmount'], a: 1, e: '[] means run on mount only; it does not re-run on later renders.', tags: ['useEffect', 'Dependencies'] },
  { q: 'A function re-created each render and used as a dependency causes the effect to:', opts: ['run once', 'run on every render', 'never run', 'error'], a: 1, e: 'Its reference changes each render, so the dependency always looks new.', tags: ['useEffect', 'Dependencies'] },
  { q: 'The exhaustive-deps lint rule wants you to list:', opts: ['no dependencies', 'every reactive value used inside the effect', 'only state', 'only props'], a: 1, e: 'All reactive values referenced inside the effect should be in the deps array.', tags: ['useEffect', 'Dependencies'] },
  { q: 'Omitting a dependency that changes leads to:', opts: ['fresh values', 'stale values inside the effect', 'an infinite loop', 'a syntax error'], a: 1, e: 'The effect closes over outdated values when a real dependency is missing.', tags: ['useEffect', 'Dependencies'] },

  // ── Level 13 — Cleanup Functions ───────────────────────────────────────
  { q: 'A subscription effect should return:', opts: ['the data', 'an unsubscribe function', 'a promise', 'nothing'], a: 1, e: 'Return an unsubscribe so the subscription is torn down on cleanup.', tags: ['useEffect', 'Cleanup'] },
  { q: 'When does cleanup run?', opts: ['only on mount', 'before the next effect run and on unmount', 'only on unmount', 'never'], a: 1, e: 'Cleanup runs before re-running the effect and once when the component unmounts.', tags: ['useEffect', 'Cleanup'] },
  { q: 'A setInterval without clearInterval in cleanup:', opts: ['is fine', 'keeps firing after unmount (a leak)', 'runs once', 'is an error'], a: 1, e: 'Without clearing it, the timer keeps running after the component is gone.', tags: ['useEffect', 'Cleanup'] },
  { q: 'When deps are [id] and id changes, React:', opts: ['skips cleanup', 'runs cleanup for the old id, then the effect for the new id', 'only runs the new effect', 'errors'], a: 1, e: 'It cleans up the previous effect before running the next one.', tags: ['useEffect', 'Cleanup'] },

  // ── Level 14 — useRef ──────────────────────────────────────────────────
  { q: 'A useRef value:', opts: ['triggers a re-render when changed', 'persists across renders without causing re-renders', 'resets each render', 'is the same as state'], a: 1, e: 'Refs hold a mutable value that survives renders but does not trigger them.', tags: ['useRef'] },
  { q: 'Updating ref.current is:', opts: ['asynchronous', 'synchronous and does not schedule a render', 'batched', 'an error'], a: 1, e: 'It mutates immediately and never causes a re-render.', tags: ['useRef'] },
  { q: 'A common use of a ref is to:', opts: ['trigger re-renders', 'imperatively focus a DOM element', 'store derived state', 'dispatch actions'], a: 1, e: 'Refs give you direct access to a DOM node, e.g. inputRef.current.focus().', tags: ['useRef', 'DOM'] },
  { q: 'What does this store?\n\n```jsx\nconst prev = useRef();\nuseEffect(() => {\n  prev.current = value;\n});\n```', opts: ['the next value', 'the previous value across renders', 'nothing', 'an error'], a: 1, e: 'After each render it saves value, so on the next render prev.current is the previous value.', tags: ['useRef'] },

  // ── Level 15 — Forms & Inputs ──────────────────────────────────────────
  { q: 'A controlled input keeps its value in:', opts: ['the DOM only', 'React state', 'a ref only', 'localStorage'], a: 1, e: 'Controlled inputs are driven by React state via value + onChange.', tags: ['Forms'] },
  { q: 'This is a:\n\n```jsx\n<select value={v} onChange={onChange}>\n```', opts: ['uncontrolled select', 'controlled select', 'read-only select', 'ref-based select'], a: 1, e: 'value bound to state with onChange makes it a controlled select.', tags: ['Forms'] },
  { q: 'A common pattern for many inputs is:', opts: ['one state for the whole app', 'one state object keyed by input name', 'no state at all', 'refs only'], a: 1, e: 'Keep a single object in state and update by the input’s name on change.', tags: ['Forms'] },
  { q: 'e.preventDefault() in onSubmit:', opts: ['submits twice', 'stops the default page reload', 'clears the form', 'focuses an input'], a: 1, e: 'It prevents the browser’s default form submission (full-page reload).', tags: ['Forms'] },

  // ── Level 16 — Lifting State Up ────────────────────────────────────────
  { q: 'Two siblings need the same value. You should:', opts: ['duplicate it in each', 'lift it to their common parent', 'use a ref', 'use a global variable'], a: 1, e: 'Lift shared state up to the closest common parent and pass it down.', tags: ['Lifting state'] },
  { q: 'A parent passes value and onChange to a child input. The child is:', opts: ['the owner of the state', 'controlled by the parent', 'uncontrolled', 'an error'], a: 1, e: 'The parent owns the state; the child is controlled via props.', tags: ['Lifting state'] },
  { q: 'After lifting state, the child updates it by:', opts: ['calling setState directly', 'calling the callback prop from the parent', 'mutating props', 'using a ref'], a: 1, e: 'The child invokes the parent-provided callback to request a state change.', tags: ['Lifting state'] },
  { q: 'Lifting state too far up tends to cause:', opts: ['faster renders', 'prop drilling through many layers', 'fewer renders', 'an error'], a: 1, e: 'Over-lifting forces you to thread props through many intermediate components.', tags: ['Lifting state'] },

  // ── Level 17 — useMemo ─────────────────────────────────────────────────
  { q: 'What does this do?\n\n```jsx\nconst r = useMemo(() => compute(a), [a]);\n```', opts: ['runs compute every render', 'caches compute(a) until a changes', 'never runs', 'is asynchronous'], a: 1, e: 'useMemo recomputes only when a dependency changes; otherwise it reuses the cached value.', tags: ['useMemo'] },
  { q: 'useMemo is intended for:', opts: ['side effects', 'expensive computations and stable references', 'subscriptions', 'routing'], a: 1, e: 'Use it to cache costly values or keep object/array references stable.', tags: ['useMemo'] },
  { q: 'Omitting a dependency the computation uses gives you:', opts: ['an always-fresh value', 'a stale memoized value', 'an infinite loop', 'an error'], a: 1, e: 'A missing dep means the cached value is not recomputed when it should be.', tags: ['useMemo'] },
  { q: 'What does this keep stable?\n\n```jsx\nconst obj = useMemo(() => ({ id }), [id]);\n```', opts: ['nothing', 'the object reference, unless id changes', 'the id only', 'an error'], a: 1, e: 'The same object reference is reused until id changes.', tags: ['useMemo'] },

  // ── Level 18 — useCallback ─────────────────────────────────────────────
  { q: 'What does useCallback return?', opts: ['the function’s result', 'a memoized callback stable until deps change', 'undefined', 'a new function each render'], a: 1, e: 'It returns a cached function that stays the same reference until a dependency changes.', tags: ['useCallback'] },
  { q: 'The main reason to use useCallback is to:', opts: ['speed up the function body', 'keep a stable function reference for memoized children/effects', 'run side effects', 'create state'], a: 1, e: 'A stable reference prevents memoized children from re-rendering and effects from re-running.', tags: ['useCallback'] },
  { q: 'Passing a memoized callback to a React.memo child:', opts: ['forces a re-render', 'lets the child skip re-rendering', 'breaks memo', 'is an error'], a: 1, e: 'A stable callback prop keeps the memoized child from re-rendering unnecessarily.', tags: ['useCallback', 'Performance'] },
  { q: 'A useCallback with empty deps that reads state:', opts: ['always sees current state', 'captures the initial state (stale)', 'errors', 're-renders'], a: 1, e: 'Empty deps freeze the closure on the first render’s state.', tags: ['useCallback', 'Gotchas'] },

  // ── Level 19 — useReducer ──────────────────────────────────────────────
  { q: 'What does dispatch({ type: "reset" }) do?', opts: ['reads state', 'sends an action; the reducer returns the next state', 're-renders only', 'is an error'], a: 1, e: 'dispatch passes the action to the reducer, which computes the next state.', tags: ['useReducer'] },
  { q: 'A reducer’s signature is:', opts: ['(action) => state', '(state, action) => newState', '() => state', '(state) => action'], a: 1, e: 'A reducer takes the current state and an action and returns the next state.', tags: ['useReducer'] },
  { q: 'useReducer returns:', opts: ['[state, setState]', '[state, dispatch]', '[dispatch]', '{ state, dispatch }'], a: 1, e: 'It returns the current state and a dispatch function.', tags: ['useReducer'] },
  { q: 'A reducer should be:', opts: ['asynchronous', 'a pure function with no side effects', 'a hook', 'a component'], a: 1, e: 'Reducers must be pure: same inputs → same output, no side effects.', tags: ['useReducer'] },

  // ── Level 20 — useContext ──────────────────────────────────────────────
  { q: 'What does useContext(MyContext) return?', opts: ['a setter', 'the current value from the nearest Provider', 'a ref', 'undefined always'], a: 1, e: 'It returns the context value supplied by the closest matching Provider.', tags: ['useContext'] },
  { q: 'Updating a Provider’s value:', opts: ['does nothing', 're-renders the components consuming that context', 'only re-renders the Provider', 'is an error'], a: 1, e: 'Consumers of the context re-render when the Provider value changes.', tags: ['useContext'] },
  { q: 'Context is best suited for:', opts: ['fast-changing local state', 'app-wide data like theme, auth, or locale', 'DOM refs', 'a single form input'], a: 1, e: 'Context shines for broadly shared, relatively stable data.', tags: ['useContext'] },
  { q: 'With no Provider, a consumer gets:', opts: ['undefined', 'the createContext default value', 'an error', 'null always'], a: 1, e: 'Without a Provider, useContext returns the default passed to createContext.', tags: ['useContext'] },

  // ── Level 21 — Custom Hooks ────────────────────────────────────────────
  { q: 'A custom hook’s name must:', opts: ['start with "use"', 'be capitalized', 'return JSX', 'be a class'], a: 0, e: 'Hooks must be named use* so the linter and React can enforce the rules of hooks.', tags: ['Custom hooks'] },
  { q: 'A useWindowWidth() hook returning a number mainly:', opts: ['renders UI', 'encapsulates reusable stateful logic', 'is a component', 'is a context'], a: 1, e: 'Custom hooks package reusable logic that components can share.', tags: ['Custom hooks'] },
  { q: 'Two components both calling useCounter():', opts: ['share the same state', 'each get independent state', 'have no state', 'one re-renders the other'], a: 1, e: 'Hooks share logic, not state — each call has its own state.', tags: ['Custom hooks'] },
  { q: 'Custom hooks may call:', opts: ['no hooks', 'other hooks like useState and useEffect', 'only useState', 'only useEffect'], a: 1, e: 'Custom hooks can compose any other hooks.', tags: ['Custom hooks'] },

  // ── Level 22 — Keys & Reconciliation ───────────────────────────────────
  { q: 'React uses keys to:', opts: ['style elements', 'match elements between renders', 'sort lists', 'nothing'], a: 1, e: 'Keys identify which items changed, were added, or removed across renders.', tags: ['Keys'] },
  { q: 'Using Math.random() as a key:', opts: ['is ideal', 'remounts every item on each render', 'is required', 'speeds up rendering'], a: 1, e: 'A new random key each render makes React throw away and recreate every item.', tags: ['Keys', 'Gotchas'] },
  { q: 'Stable keys preserve:', opts: ['nothing', 'component state and DOM across reorders', 'only styles', 'random data'], a: 1, e: 'With stable keys, React keeps each item’s state and DOM even when the list reorders.', tags: ['Keys', 'Reconciliation'] },
  { q: 'Duplicate keys among siblings:', opts: ['are fine', 'cause warnings and rendering bugs', 'are required', 'improve speed'], a: 1, e: 'Keys must be unique among siblings; duplicates confuse reconciliation.', tags: ['Keys'] },

  // ── Level 23 — Performance Patterns ────────────────────────────────────
  { q: 'React.memo(Comp) re-renders only when:', opts: ['its state changes', 'its props change (shallow compare)', 'always', 'never'], a: 1, e: 'memo skips re-render unless the props shallowly differ.', tags: ['Performance', 'memo'] },
  { q: 'Wrapping every component in memo:', opts: ['always makes it faster', 'can add overhead without real benefit', 'is required', 'removes all re-renders'], a: 1, e: 'Memoization has its own cost; apply it where it actually helps.', tags: ['Performance'] },
  { q: 'To keep a callback stable for a memoized child, use:', opts: ['useState', 'useCallback', 'useRef', 'useEffect'], a: 1, e: 'useCallback memoizes the function so the child’s props stay stable.', tags: ['Performance', 'useCallback'] },
  { q: 'The React DevTools Profiler helps you:', opts: ['write CSS', 'measure what actually re-renders', 'fetch data', 'set up routing'], a: 1, e: 'The Profiler shows render timings so you optimize based on real data.', tags: ['Performance'] },

  // ── Level 24 — Common Pitfalls ─────────────────────────────────────────
  { q: 'Calling a hook inside a loop or condition:', opts: ['is fine', 'breaks the Rules of Hooks', 'is faster', 'needs a key'], a: 1, e: 'Hooks must be called in the same order every render — never conditionally.', tags: ['Pitfalls', 'Rules of hooks'] },
  { q: 'Mutating state directly (state.x = 1):', opts: ['always re-renders', 'may not re-render and is a bug', 'is required', 'is faster'], a: 1, e: 'React needs a new reference to detect change; mutating in place can skip the re-render.', tags: ['Pitfalls', 'Immutability'] },
  { q: 'Why is this a problem?\n\n```jsx\nuseEffect(async () => {\n  await load();\n}, []);\n```', opts: ['it is fine', 'effect callbacks must not be async — define an inner async function', 'it needs deps', 'always errors'], a: 1, e: 'An async function returns a promise, but an effect must return undefined or a cleanup.', tags: ['Pitfalls', 'useEffect'] },
  { q: 'Calling setState unconditionally during render:', opts: ['renders once', 'causes an infinite render loop', 'does nothing', 'is caught automatically'], a: 1, e: 'Each render schedules another, looping forever.', tags: ['Pitfalls'] },

  // ── Level 25 — Mixed Mastery ───────────────────────────────────────────
  { q: 'What does this do?\n\n```jsx\nconst [q, setQ] = useState("");\nconst results = items.filter(i => i.includes(q));\n```', opts: ['stores results in state', 'live-filters items by the query', 'fetches data', 'an error'], a: 1, e: 'results is derived each render, filtering items by the current query.', tags: ['Mastery'] },
  { q: 'What does this implement?\n\n```jsx\nuseEffect(() => {\n  const t = setTimeout(cb, 500);\n  return () => clearTimeout(t);\n}, [cb]);\n```', opts: ['runs cb immediately', 'a delayed call with cleanup when cb changes', 'an infinite loop', 'an error'], a: 1, e: 'It schedules cb after 500ms and clears the pending timeout on cleanup — a debounce-style pattern.', tags: ['Mastery'] },
  { q: 'What is this?\n\n```jsx\nfunction useToggle() {\n  const [on, set] = useState(false);\n  return [on, () => set(o => !o)];\n}\n```', opts: ['a component', 'a reusable boolean-toggle custom hook', 'a context', 'invalid'], a: 1, e: 'It packages toggle state and logic into a reusable hook.', tags: ['Mastery'] },
  { q: 'When does value recompute?\n\n```jsx\nconst value = useMemo(() => expensive(a, b), [a, b]);\n```', opts: ['every render', 'when a or b changes', 'never', 'on unmount'], a: 1, e: 'useMemo recomputes only when a listed dependency changes.', tags: ['Mastery'] },
];
