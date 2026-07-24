import type { Question } from './quiz-data';

// devShark "Fix the failing test" set — category `testing`, subject webdev.
//
// Each item shows a small, realistic Jest/Vitest-style failing test (with the
// code under test and the observed failure) and four candidate code changes,
// exactly ONE of which makes the test pass. These are authored as full Question
// objects (not roadmap seeds) with explicit, varied difficulty (1-5) because
// they live in the `testing` CATEGORY pool — served through daily, challenge,
// and practice quizzes — rather than the fixed 15-level `testing` Learn path
// (ids rm-testing-1..120, which stays untouched). Ids are `testfix-1..24`.
//
// `introduction` is a safe, non-spoiling nudge (never names the fix).
// `explanation` is shown only after answering and may reveal the fix.
export const fixTheTestQuestions: Question[] = [
  {
    id: 'testfix-1',
    tags: ['Testing', 'fix-the-test', 'assertions'],
    introduction: 'A helper and its test disagree by a small amount. Compare what the function computes with what the assertion expects.',
    question: `A helper adds two numbers, but its test fails.

\`\`\`js
function add(a, b) {
  return a + b + 1;
}

// FAILS: expect(add(2, 3)).toBe(5)  ->  Received: 6
\`\`\`

Which change makes the test pass?`,
    options: ['return a + b;', 'return a + b + 2;', 'return a * b;', 'return a - b;'],
    correctAnswer: 0,
    category: 'testing',
    explanation: 'The implementation adds a stray `+ 1`, so `add(2, 3)` returns 6 instead of 5. Returning `a + b` gives the sum the test expects. The other options produce 7, 6, and -1.',
    difficulty: 1,
  },
  {
    id: 'testfix-2',
    tags: ['Testing', 'fix-the-test', 'functions'],
    introduction: 'The assertion receives `undefined`. Think about what a function hands back to its caller.',
    question: `This function computes a value, but the assertion receives \`undefined\`.

\`\`\`js
function double(n) {
  n * 2;
}

// FAILS: expect(double(4)).toBe(8)  ->  Received: undefined
\`\`\`

Which change makes the test pass?`,
    options: ['n = n * 2;', 'return n * 2;', 'return n + 2;', 'console.log(n * 2);'],
    correctAnswer: 1,
    category: 'testing',
    explanation: 'The function evaluates `n * 2` but never returns it, so `double(4)` is `undefined`. Adding `return` sends back 8. Assigning to `n`, logging, or returning `n + 2` do not return the doubled value.',
    difficulty: 1,
  },
  {
    id: 'testfix-3',
    tags: ['Testing', 'fix-the-test', 'equality'],
    introduction: 'Two objects have the same contents but the matcher still fails. Recall the difference between identity and structural equality.',
    question: `Two objects have identical contents, yet the matcher reports them as different.

\`\`\`js
function makeUser(name) {
  return { name };
}

// FAILS: expect(makeUser('Ada')).toBe({ name: 'Ada' })
// toBe compares identity, not structure
\`\`\`

Which change makes the test pass?`,
    options: [
      "expect(makeUser('Ada')).toBe({ name: 'Ada' });",
      "expect(makeUser('Ada')).toContain({ name: 'Ada' });",
      "expect(makeUser('Ada')).toEqual({ name: 'Ada' });",
      "expect(makeUser('Ada')).toEqual({ name: 'Ada', id: 1 });",
    ],
    correctAnswer: 2,
    category: 'testing',
    explanation: '`toBe` uses `Object.is` (reference identity), and two separate object literals are never the same reference, so it fails even when the shapes match. `toEqual` compares recursively by value and passes. `toContain` is for arrays and strings, and the four-field object expects an `id` the result lacks.',
    difficulty: 1,
  },
  {
    id: 'testfix-4',
    tags: ['Testing', 'fix-the-test', 'coercion'],
    introduction: 'The received value is a string, not a number. Look at how the two values are being combined.',
    question: `A totals helper returns a string where a number is expected.

\`\`\`js
function total(a, b) {
  return '' + a + b;
}

// FAILS: expect(total(2, 3)).toBe(5)  ->  Received: '23'
\`\`\`

Which change makes the test pass?`,
    options: [
      'return String(a) + String(b);',
      'return String(a + b);',
      'return a.toString() + b;',
      'return a + b;',
    ],
    correctAnswer: 3,
    category: 'testing',
    explanation: "Prefixing with `''` coerces the numbers to strings, so `2` and `3` concatenate into `'23'`. Returning `a + b` keeps them numeric and yields `5`. `String(a) + String(b)` and `a.toString() + b` also concatenate strings, and `String(a + b)` returns the string `'5'`, which fails the strict numeric `toBe(5)`.",
    difficulty: 1,
  },
  {
    id: 'testfix-5',
    tags: ['Testing', 'fix-the-test', 'floating-point'],
    introduction: 'The result is off by a minuscule fraction. Think about how floating-point numbers should be compared.',
    question: `A floating-point sum is compared for exact equality.

\`\`\`js
// FAILS: expect(0.1 + 0.2).toBe(0.3)
// Received: 0.30000000000000004
\`\`\`

Which change makes the assertion pass without altering the arithmetic?`,
    options: [
      'expect(0.1 + 0.2).toBeCloseTo(0.3);',
      'expect(0.1 + 0.2).toBe(0.3);',
      'expect(0.1 + 0.2).toBeLessThan(0.3);',
      'expect(Math.round(0.1 + 0.2)).toBe(0.3);',
    ],
    correctAnswer: 0,
    category: 'testing',
    explanation: 'Binary floating point cannot represent `0.1 + 0.2` exactly; it equals 0.30000000000000004, so strict `toBe(0.3)` fails. `toBeCloseTo(0.3)` compares to a small precision and passes. The sum is not less than 0.3, and rounding it gives 0, not 0.3.',
    difficulty: 2,
  },
  {
    id: 'testfix-6',
    tags: ['Testing', 'fix-the-test', 'async'],
    introduction: 'The assertion received a Promise instead of a value. Consider how a test waits for asynchronous work.',
    question: `An async function is compared directly to its resolved value.

\`\`\`js
async function getValue() {
  return 42;
}

test('returns 42', () => {
  expect(getValue()).toBe(42); // Received: Promise {}
});
\`\`\`

Which change makes the test pass?`,
    options: [
      "test('returns 42', () => { expect(getValue()).toEqual(42); });",
      "test('returns 42', async () => { expect(await getValue()).toBe(42); });",
      "test('returns 42', () => { expect(getValue().value).toBe(42); });",
      "test('returns 42', async () => { expect(getValue()).toBe(42); });",
    ],
    correctAnswer: 1,
    category: 'testing',
    explanation: 'An `async` function returns a Promise, so comparing it directly to 42 fails. Making the callback `async` and `await`ing the call unwraps the resolved value 42. `toEqual`, reading `.value`, or adding `async` without `await` all still compare the Promise itself.',
    difficulty: 2,
  },
  {
    id: 'testfix-7',
    tags: ['Testing', 'fix-the-test', 'exceptions'],
    introduction: 'The error is thrown before the matcher can observe it. Think about what `toThrow` needs to receive.',
    question: `A test wants to assert that a call throws, but the error escapes before the matcher runs.

\`\`\`js
function parseAge(input) {
  const n = Number(input);
  if (Number.isNaN(n)) throw new Error('not a number');
  return n;
}

// FAILS: expect(parseAge('abc')).toThrow()
// parseAge('abc') throws before expect() is reached
\`\`\`

Which change makes the test pass?`,
    options: [
      "expect(parseAge('abc')).toThrow();",
      "expect(parseAge).toThrow('abc');",
      "expect(() => parseAge('abc')).toThrow();",
      "expect(await parseAge('abc')).toThrow();",
    ],
    correctAnswer: 2,
    category: 'testing',
    explanation: 'Writing `parseAge(\'abc\')` calls the function immediately, so it throws before `expect` can catch it. Wrapping the call in an arrow function lets Jest invoke it inside `toThrow` and catch the error. Passing the bare function calls it with `undefined`, and `await` does not defer a synchronous throw.',
    difficulty: 2,
  },
  {
    id: 'testfix-8',
    tags: ['Testing', 'fix-the-test', 'mocks'],
    introduction: 'State from the first test leaks into the second. Think about isolating tests from one another.',
    question: `Two tests share one mock, and the second sees calls left over from the first.

\`\`\`js
const send = jest.fn();

test('first', () => { send('a'); expect(send).toHaveBeenCalledTimes(1); });
test('second', () => { send('b'); expect(send).toHaveBeenCalledTimes(1); });
// 'second' FAILS: Expected: 1, Received: 2
\`\`\`

Which addition makes both tests pass?`,
    options: [
      'afterAll(() => send.mockClear());',
      'beforeAll(() => send.mockClear());',
      'afterEach(() => send.mockReturnValue(undefined));',
      'afterEach(() => send.mockClear());',
    ],
    correctAnswer: 3,
    category: 'testing',
    explanation: 'A shared `jest.fn()` keeps its call history across tests, so by the second test it has been called twice. Clearing it after every test (`mockClear` in `afterEach`) resets the count. `afterAll` and `beforeAll` run only once, and `mockReturnValue` changes the return value without clearing calls.',
    difficulty: 2,
  },
  {
    id: 'testfix-9',
    tags: ['Testing', 'fix-the-test', 'sorting'],
    introduction: 'The array comes back in string order. Recall how `sort` compares elements by default.',
    question: `A descending sort returns the array in the wrong order.

\`\`\`js
function sortDesc(nums) {
  return nums.sort();
}

// FAILS: expect(sortDesc([1, 10, 2])).toEqual([10, 2, 1])
// Received: [1, 10, 2]
\`\`\`

Which change makes the test pass?`,
    options: [
      'return nums.sort((a, b) => b - a);',
      'return nums.sort().reverse();',
      'return nums.sort((a, b) => a - b);',
      'return nums.reverse();',
    ],
    correctAnswer: 0,
    category: 'testing',
    explanation: '`Array.sort` without a comparator sorts by string order, so `[1, 10, 2]` stays `[1, 10, 2]`. A numeric descending comparator `(a, b) => b - a` produces `[10, 2, 1]`. The default sort reversed gives `[2, 10, 1]`, ascending gives `[1, 2, 10]`, and reversing the input gives `[2, 10, 1]`.',
    difficulty: 3,
  },
  {
    id: 'testfix-10',
    tags: ['Testing', 'fix-the-test', 'spies'],
    introduction: 'The logged string is almost right. Compare it character by character with what the spy expects.',
    question: `A logging helper produces a message that is one character off from what the spy expects.

\`\`\`js
function greet(logger, name) {
  logger('Hi ' + name);
}

const logger = jest.fn();
greet(logger, 'Ada');

// FAILS: expect(logger).toHaveBeenCalledWith('Hi, Ada')
// Received: 'Hi Ada'
\`\`\`

Which change to \`greet\` makes the test pass?`,
    options: [
      "logger('Hi ' + name + '!');",
      "logger('Hi, ' + name);",
      "logger('Hi', name);",
      "logger('hi, ' + name);",
    ],
    correctAnswer: 1,
    category: 'testing',
    explanation: 'The assertion expects the exact string `\'Hi, Ada\'` (with a comma), but the code logs `\'Hi Ada\'`. Adding the comma matches. The others add an exclamation mark, split into two arguments, or change the capitalization, so none equal the expected call.',
    difficulty: 3,
  },
  {
    id: 'testfix-11',
    tags: ['Testing', 'fix-the-test', 'timers'],
    introduction: 'The timer callback never ran. Think about how fake timers move virtual time forward.',
    question: `With fake timers enabled, a scheduled callback is asserted but has not run.

\`\`\`js
jest.useFakeTimers();
const cb = jest.fn();
setTimeout(cb, 1000);

// FAILS: expect(cb).toHaveBeenCalledTimes(1)
// Received: 0
\`\`\`

Which line, added before the assertion, makes the test pass?`,
    options: [
      'jest.clearAllTimers();',
      'jest.useRealTimers();',
      'jest.advanceTimersByTime(1000);',
      'await Promise.resolve();',
    ],
    correctAnswer: 2,
    category: 'testing',
    explanation: 'With fake timers, scheduled callbacks do not run until you advance the virtual clock. `advanceTimersByTime(1000)` fires the pending `setTimeout`, so `cb` is called once. Clearing timers cancels it, switching to real timers does not run the already-scheduled fake timer, and flushing a microtask does not advance timers.',
    difficulty: 3,
  },
  {
    id: 'testfix-12',
    tags: ['Testing', 'fix-the-test', 'async'],
    introduction: 'The function rejects instead of throwing synchronously. Recall how to assert on a rejected Promise.',
    question: `An async function reports an invalid id by rejecting, but the test asserts a synchronous throw.

\`\`\`js
async function loadUser(id) {
  if (id < 0) throw new Error('invalid id');
  return { id };
}

// FAILS: expect(loadUser(-1)).toThrow('invalid id')
// loadUser(-1) returns a rejected Promise
\`\`\`

Which change makes the test pass?`,
    options: [
      "expect(() => loadUser(-1)).toThrow('invalid id');",
      "await expect(loadUser(-1)).resolves.toThrow('invalid id');",
      "expect(await loadUser(-1)).toThrow('invalid id');",
      "await expect(loadUser(-1)).rejects.toThrow('invalid id');",
    ],
    correctAnswer: 3,
    category: 'testing',
    explanation: 'An `async` function reports errors by rejecting its Promise, not by throwing synchronously, so `toThrow` on the returned Promise fails. `await expect(promise).rejects.toThrow(\'invalid id\')` waits for the rejection and matches the message. An arrow wrapper still does not throw synchronously, `.resolves` expects success, and `await`ing the call throws before `expect` runs.',
    difficulty: 3,
  },
  {
    id: 'testfix-13',
    tags: ['Testing', 'fix-the-test', 'isolation'],
    introduction: 'The second test sees data left by the first. Think about when shared setup should run.',
    question: `A shared fixture is created once, so state from the first test leaks into the second.

\`\`\`js
let cart;
beforeAll(() => { cart = []; });

test('adds one', () => { cart.push('a'); expect(cart).toHaveLength(1); });
test('starts empty', () => { expect(cart).toHaveLength(0); });
// 'starts empty' FAILS: Expected length: 0, Received length: 1
\`\`\`

Which hook should replace the current one so both tests pass?`,
    options: [
      'beforeEach(() => { cart = []; });',
      'afterEach(() => { cart = []; });',
      'beforeAll(() => { cart = null; });',
      'afterAll(() => { cart = []; });',
    ],
    correctAnswer: 0,
    category: 'testing',
    explanation: '`beforeAll` initializes `cart` once, so the item added by the first test is still there for the second. `beforeEach` re-creates an empty array before every test, isolating them. `afterEach` or removing the eager setup leaves `cart` unset when the first test runs, and `null` is not an array to push onto.',
    difficulty: 3,
  },
  {
    id: 'testfix-14',
    tags: ['Testing', 'fix-the-test', 'equality'],
    introduction: 'The shapes match but the matcher still fails. Recall what `toStrictEqual` checks beyond property values.',
    question: `A factory returns a plain object where the test expects a class instance.

\`\`\`js
class Point {
  constructor(x, y) { this.x = x; this.y = y; }
}
function makePoint(x, y) {
  return { x, y };
}

// FAILS: expect(makePoint(1, 2)).toStrictEqual(new Point(1, 2))
// Same fields, but the received value is not a Point
\`\`\`

Which change to \`makePoint\` makes the test pass?`,
    options: [
      'return Object.assign({}, { x, y });',
      'return new Point(x, y);',
      'return [x, y];',
      'return { x: x, y: y };',
    ],
    correctAnswer: 1,
    category: 'testing',
    explanation: '`toStrictEqual` checks structural equality and that both values share the same type (constructor). A plain `{ x, y }` is not a `Point`, so it fails. Returning `new Point(x, y)` produces a real instance. `Object.assign` and `{ x: x, y: y }` stay plain objects, and `[x, y]` is an array.',
    difficulty: 4,
  },
  {
    id: 'testfix-15',
    tags: ['Testing', 'fix-the-test', 'mocks'],
    introduction: 'The code awaits or chains a Promise, but the mock returns something else. Match the mock return type to how the value is used.',
    question: `The code chains \`.then\` on a mocked call, but the mock returns a plain object.

\`\`\`js
function getName(api) {
  return api.fetchUser().then((res) => res.name);
}

const api = { fetchUser: jest.fn() };
// FAILS: await expect(getName(api)).resolves.toBe('Ada')
// api.fetchUser(...).then is not a function
\`\`\`

Which mock setup makes the test pass?`,
    options: [
      "api.fetchUser.mockReturnValue({ name: 'Ada' });",
      'api.fetchUser.mockReturnValue(Promise.resolve());',
      "api.fetchUser.mockResolvedValue({ name: 'Ada' });",
      "api.fetchUser.mockImplementation(() => ({ name: 'Ada' }));",
    ],
    correctAnswer: 2,
    category: 'testing',
    explanation: 'The code calls `.then` on the mock return value, so the mock must return a Promise. `mockResolvedValue({ name: \'Ada\' })` returns a Promise resolving to that object. A plain `mockReturnValue` object has no `.then`, resolving with no value makes `res.name` undefined, and the implementation still returns a non-Promise.',
    difficulty: 4,
  },
  {
    id: 'testfix-16',
    tags: ['Testing', 'fix-the-test', 'determinism'],
    introduction: 'The result depends on the calendar day the test runs. Think about removing that dependency with a fixed input.',
    question: `A weekend check passes only on some days because it reads the real calendar.

\`\`\`js
function isWeekend(date = new Date()) {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

// FLAKY: expect(isWeekend()).toBe(true) depends on the run day
\`\`\`

Which change makes the test reliably pass?`,
    options: [
      "expect(isWeekend(new Date('2026-07-24'))).toBe(true);",
      'expect(isWeekend()).toBe(true);',
      'expect(isWeekend(Date.now())).toBe(true);',
      "expect(isWeekend(new Date('2026-07-25'))).toBe(true);",
    ],
    correctAnswer: 3,
    category: 'testing',
    explanation: 'Calling `isWeekend()` with no argument depends on the day the test runs, so it is flaky. Passing a fixed Saturday (`2026-07-25`, UTC day 6) makes it deterministic and true. `2026-07-24` is a Friday (day 5), the no-argument call stays date-dependent, and `Date.now()` returns a number with no `getUTCDay`.',
    difficulty: 4,
  },
  {
    id: 'testfix-17',
    tags: ['Testing', 'fix-the-test', 'matchers'],
    introduction: 'The result has more fields than the assertion lists. Think about a matcher that checks a subset of properties.',
    question: `A result carries an extra timestamp field the assertion does not list.

\`\`\`js
function createOrder(id) {
  return { id, status: 'new', createdAt: Date.now() };
}

// FAILS: expect(createOrder(7)).toEqual({ id: 7, status: 'new' })
// Received has an extra createdAt property
\`\`\`

Which change makes the test pass while keeping \`createdAt\` in the result?`,
    options: [
      "expect(createOrder(7)).toMatchObject({ id: 7, status: 'new' });",
      "expect(createOrder(7)).toEqual({ id: 7, status: 'new' });",
      "expect(createOrder(7)).toContain({ id: 7, status: 'new' });",
      "expect(createOrder(7)).toStrictEqual({ id: 7, status: 'new' });",
    ],
    correctAnswer: 0,
    category: 'testing',
    explanation: '`toEqual` requires the same set of properties, but the result has an extra `createdAt`, so it fails. `toMatchObject` checks that the received object contains at least the expected properties, ignoring extras, and passes. `toContain` is for arrays and strings, and `toStrictEqual` is stricter than `toEqual`.',
    difficulty: 4,
  },
  {
    id: 'testfix-18',
    tags: ['Testing', 'fix-the-test', 'spies'],
    introduction: 'A spy from the first test still overrides the method in the second. Recall how to put the original implementation back.',
    question: `A spy set up in one test still overrides the method in the next.

\`\`\`js
const config = { mode: () => 'live' };

test('mocked mode', () => {
  jest.spyOn(config, 'mode').mockReturnValue('test');
  expect(config.mode()).toBe('test');
});
test('real mode', () => {
  expect(config.mode()).toBe('live'); // Received: 'test'
});
\`\`\`

Which addition makes both tests pass?`,
    options: [
      'afterEach(() => jest.clearAllMocks());',
      'afterEach(() => jest.restoreAllMocks());',
      'beforeAll(() => jest.restoreAllMocks());',
      'afterAll(() => jest.restoreAllMocks());',
    ],
    correctAnswer: 1,
    category: 'testing',
    explanation: '`jest.spyOn(...).mockReturnValue(\'test\')` replaces the real method, and that replacement persists into the next test, so `config.mode()` still returns `\'test\'`. `restoreAllMocks` in `afterEach` puts the original method back. `clearAllMocks` only resets call data (the return value stays), and once-only hooks do not restore between the two tests.',
    difficulty: 4,
  },
  {
    id: 'testfix-19',
    tags: ['Testing', 'fix-the-test', 'testing-library'],
    introduction: 'The element appears after asynchronous work, but the query runs immediately. Think about a query that waits.',
    question: `A component shows text after an async fetch, but the query runs immediately.

\`\`\`jsx
render(<Profile />); // fetches, then renders the name

// FAILS: expect(screen.getByText('Ada')).toBeInTheDocument()
// Unable to find an element with the text: Ada
\`\`\`

Which change makes the test pass?`,
    options: [
      "expect(screen.queryByText('Ada')).toBeInTheDocument();",
      "expect(screen.getByText('Ada')).toBeVisible();",
      "expect(await screen.findByText('Ada')).toBeInTheDocument();",
      "expect(screen.getAllByText('Ada')).toBeInTheDocument();",
    ],
    correctAnswer: 2,
    category: 'testing',
    explanation: 'The name appears after an async fetch, so a synchronous `getByText` runs too early and finds nothing. `findByText` returns a Promise that retries until the element appears, so awaiting it passes. `queryByText` returns null immediately, `getAllByText` still finds nothing, and changing the matcher does not wait for the element.',
    difficulty: 5,
  },
  {
    id: 'testfix-20',
    tags: ['Testing', 'fix-the-test', 'async'],
    introduction: 'The callback has not fired when the assertion runs. Think about retrying the assertion until the condition holds.',
    question: `A callback fires after several async ticks, but the assertion checks it too early.

\`\`\`js
const onReady = jest.fn();
startPolling(onReady); // invokes onReady after some async work

// FAILS: expect(onReady).toHaveBeenCalled()
// Received number of calls: 0
\`\`\`

Which change makes the test pass?`,
    options: [
      'expect(onReady).toHaveBeenCalled();',
      'setTimeout(() => expect(onReady).toHaveBeenCalled(), 0);',
      'await Promise.resolve(); expect(onReady).toHaveBeenCalled();',
      'await waitFor(() => expect(onReady).toHaveBeenCalled());',
    ],
    correctAnswer: 3,
    category: 'testing',
    explanation: 'The callback fires after several asynchronous ticks, so an immediate assertion sees zero calls. `waitFor` retries the assertion until it passes or times out. A detached `setTimeout` callback runs after the test has finished, and flushing a single microtask is not guaranteed to cover all pending async work.',
    difficulty: 5,
  },
  {
    id: 'testfix-21',
    tags: ['Testing', 'fix-the-test', 'isolation'],
    introduction: 'Module-level state carries over between tests. Think about how the module registry is cached.',
    question: `A cached module keeps its counter between tests.

\`\`\`js
// counter.js:  let count = 0; module.exports = () => ++count;
let next = require('./counter');

test('starts at 1', () => { expect(next()).toBe(1); });
test('also starts at 1', () => { expect(next()).toBe(1); });
// second test FAILS: Expected: 1, Received: 2
\`\`\`

Which setup makes both tests pass?`,
    options: [
      "beforeEach(() => { jest.resetModules(); next = require('./counter'); });",
      'beforeEach(() => { jest.clearAllMocks(); });',
      'beforeEach(() => { jest.restoreAllMocks(); });',
      "beforeEach(() => { next = require('./counter'); });",
    ],
    correctAnswer: 0,
    category: 'testing',
    explanation: '`require` caches the module, so `count` keeps its value across tests and the second call returns 2. `jest.resetModules()` clears the registry, and re-`require`ing gives a fresh module with `count` back to 0. Mock-clearing helpers do not touch real module state, and re-requiring without resetting returns the same cached instance.',
    difficulty: 5,
  },
  {
    id: 'testfix-22',
    tags: ['Testing', 'fix-the-test', 'matchers'],
    introduction: 'One field is randomly generated and cannot be matched exactly. Recall matchers that assert a value type instead of an exact value.',
    question: `One field is randomly generated, so it never matches a fixed expected value.

\`\`\`js
function event(type) {
  return { type, id: Math.random().toString(36).slice(2) };
}

// FAILS: expect(event('click')).toEqual({ type: 'click', id: 'abc123' })
// id is random and differs every run
\`\`\`

Which change makes the test pass?`,
    options: [
      "expect(event('click')).toEqual({ type: 'click', id: 'abc123' });",
      "expect(event('click')).toEqual({ type: 'click', id: expect.any(String) });",
      "expect(event('click')).toEqual({ type: 'click', id: expect.any(Number) });",
      "expect(event('click')).toEqual({ type: expect.any(String) });",
    ],
    correctAnswer: 1,
    category: 'testing',
    explanation: 'The `id` is randomly generated, so matching it against a fixed string always fails. The asymmetric matcher `expect.any(String)` accepts any string id while still checking `type`. `any(Number)` rejects the string id, and dropping `id` from the expected object fails because the result carries an extra property.',
    difficulty: 5,
  },
  {
    id: 'testfix-23',
    tags: ['Testing', 'fix-the-test', 'exceptions'],
    introduction: 'The function throws, but the expected error type is wrong. Compare the thrown error class with the asserted one.',
    question: `A function throws a custom error, but the test asserts the wrong error type.

\`\`\`js
class ValidationError extends Error {}
function check(n) {
  if (n < 0) throw new ValidationError('negative');
  return n;
}

// FAILS: expect(() => check(-1)).toThrow(TypeError)
// Thrown error is a ValidationError, not a TypeError
\`\`\`

Which change makes the test pass?`,
    options: [
      'expect(() => check(-1)).toThrow(RangeError);',
      'expect(() => check(-1)).not.toThrow();',
      'expect(() => check(-1)).toThrow(ValidationError);',
      'expect(() => check(1)).toThrow(ValidationError);',
    ],
    correctAnswer: 2,
    category: 'testing',
    explanation: 'The code throws a `ValidationError`, but the test asserts a `TypeError`, so the constructor check fails. Matching the actual `ValidationError` type passes. `RangeError` is still the wrong type, `not.toThrow` contradicts the thrown error, and `check(1)` does not throw at all.',
    difficulty: 5,
  },
  {
    id: 'testfix-24',
    tags: ['Testing', 'fix-the-test', 'async'],
    introduction: 'The returned total is empty because the loop does not wait for async work. Recall which looping constructs respect `await`.',
    question: `An async accumulator returns before its loop finishes adding values.

\`\`\`js
async function sumDoubled(items, dbl) {
  let sum = 0;
  items.forEach(async (n) => { sum += await dbl(n); });
  return sum;
}
const dbl = (n) => Promise.resolve(n * 2);

// FAILS: expect(await sumDoubled([1, 2, 3], dbl)).toBe(12)
// Received: 0
\`\`\`

Which change to the loop makes the test pass?`,
    options: [
      'items.map(async (n) => { sum += await dbl(n); });',
      'items.forEach((n) => { sum += dbl(n); });',
      'sum = await Promise.all(items.map((n) => dbl(n)));',
      'for (const n of items) { sum += await dbl(n); }',
    ],
    correctAnswer: 3,
    category: 'testing',
    explanation: '`forEach` does not await its async callback, so `sumDoubled` returns `sum` (still 0) before any addition runs. A `for...of` loop with `await` accumulates each doubled value before returning, giving 12. `map` without `Promise.all` is also not awaited, plain `forEach` adds Promise objects instead of numbers, and assigning `Promise.all(...)` makes `sum` the array `[2, 4, 6]` rather than their total.',
    difficulty: 5,
  },
];
