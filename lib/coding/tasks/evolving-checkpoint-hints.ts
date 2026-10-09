import type { CodingTask } from '../../../shared/coding-catalog';
import { FULLSTACK_APPS } from './fullstack';

/** The hint ladder of each checkpoint (`<milestone>-start`). A checkpoint is
 * built from its milestone, so without a ladder of its own it would show the
 * milestone's hint: advice about work its smaller contract has not asked for
 * yet (a left join on an inner-join step, the next bug on a debugging step).
 * Each entry here fits the checkpoint it names. English only; where the
 * milestone has method steps, the checkpoint gets its own as well. */
interface CheckpointLadder {
  hints: string[];
  approach?: string[];
}

const LADDERS: Record<string, CheckpointLadder> = {
  'js-evolving-calculator-1-start': { hints: ['Trim the expression and turn what is left into a number with Number(); there is no operator to handle yet.'] },
  'js-evolving-calculator-2-start': { hints: ['Read the numbers and the + and - signs between them from left to right, and apply each sign to a running total. A decimal operand reads with Number() like a whole one.'] },
  'js-evolving-calculator-3-start': { hints: ['Treat a parenthesised group like a number: when a factor starts with "(", evaluate the whole expression inside it, then step past the ")". Calling the same function again handles any depth.'] },
  'js-evolving-calculator-4-start': { hints: ['Replace each name that matches /[A-Za-z_][A-Za-z0-9_]*/ with its value from variables, wrapped in parentheses so a negative value stays one operand, then hand the text to calculate.'] },
  'js-evolving-calculator-5-start': { hints: ['Keep the variables in an object. For each line, check for NAME = first: evaluate the right side with calculateWithVariables and store it under NAME. Every line, assignment or not, pushes its value onto results.'] },

  'js-evolving-query-1-start': { hints: ['There are no options to apply yet: return a copy such as rows.slice(), a new array holding the same records in the same order.'] },
  'js-evolving-query-2-start': { hints: ['Sort a copy of the filtered rows with a comparator that returns -1, 1 or 0 from < and > on the field, and flip its sign for desc. sort is stable, so 0 keeps equal values in input order.'] },
  'js-evolving-query-3-start': { hints: ['After the slice, map each row to a new object built from the selected fields the row actually has: Object.hasOwn(row, field) leaves out the absent ones.'] },
  'js-evolving-query-4-start': { hints: ['Keep the groups in an array in first-seen order. For each row, find the group whose key === row[field], create { key, count: 0, sum: 0 } when there is none, then add one to count and the value to sum.'] },
  'js-evolving-query-5-start': { hints: ['For each left row, collect the right rows whose key is strictly equal and emit one { left, right } pair per match, in right order. A left row with no match emits nothing: this is an inner join.'] },

  'js-evolving-events-1-start': { hints: ['Keep a Map from event name to the listeners registered for it. emit looks the event up, calls what it finds with the value straight away, and returns quietly when there is nothing.'] },
  'js-evolving-events-2-start': { hints: ['Store each registration as its own subscription object, and let unsubscribe remove that object rather than the first entry with the same callback. A second call finds nothing to remove and does nothing.'] },
  'js-evolving-events-3-start': { hints: ['Put a try/catch around each listener call on its own, push what the catch receives onto an errors array, and return that array once every listener has run.'] },
  'js-evolving-events-4-start': { hints: ['Wrap a createBus. While paused, emit pushes [event, value] onto a queue and returns []; resume clears the flag, delivers the queue in order through the inner emit, and returns every error it collected.'] },
  'js-evolving-events-5-start': { hints: ['Keep a Map from event to the values emitted so far; emit pushes the value and drops from the front while there are more than capacity. A replay subscription first receives the stored values, oldest first.'] },

  'js-evolving-graph-1-start': { hints: ['With no dependencies there is nothing to order yet: Object.keys(graph) already lists every task once, in the order the result needs.'] },
  'js-evolving-graph-2-start': { hints: ['Before traversing, check every dependency of every task with Object.hasOwn(graph, dependency) and return null at the first one that is missing; otherwise traverse as before.'] },
  'js-evolving-graph-3-start': { hints: ['Repeat until every task is placed: collect, in Object.keys order, each unplaced task whose dependencies are all placed, add that list as one layer, and only then mark its members placed.'] },
  'js-evolving-graph-4-start': { hints: ['Walk the tasks in plan() order, so each dependency comes first: a task finishes at its duration plus the latest finish among its dependencies. Remember which dependency that was, and follow those links back from the task that finishes last.'] },
  'js-evolving-graph-5-start': { hints: ['Walk plan(graph) in order: a task is affected when it is one of the changed ones or any of its dependencies is affected. Keeping the affected tasks in that walk gives them in plan order.'] },

  'js-evolving-debug-1-start': {
    hints: ['Before you fix anything, log `parts` right after the split and read the Console. The item name still has the spaces from the line around it; the numbers wait for the next step.'],
    approach: [
      'Run it as it is. The scratch pad already logs one order; read the Console before you read the code.',
      'Log `parts` after the split and look at the first field: " latte " keeps the spaces the line had around the name.',
      'Trim that one field where the object is built, and log the result once more to confirm.',
    ],
  },
  'js-evolving-debug-2-start': {
    hints: ['One variable is doing two jobs. Trace ["latte,1,4", "tea,2,1"] by hand: which total does tea start from?'],
    approach: [
      'Trace ["latte,1,4", "tea,2,1"] on paper: after each line, write down order, running and totals.',
      'Log the same three values inside the loop and compare with your trace. tea should get 2, and `running` hands it latte\'s 4 as well.',
      'Keep one total per item: read what the item has so far (or 0), add this order, write it back.',
    ],
  },
  'js-evolving-debug-3-start': {
    hints: ['Log `total * percent` alone for applyDiscount(100, 50, 10) and compare it with the 10 you expect to take off: 10 means ten percent, not ten times.'],
    approach: [
      'Call applyDiscount(100, 50, 10) in the scratch pad and log the result. Ten percent off 100 should leave 90.',
      'Log the discount amount alone. 10 means ten percent, so the fraction is percent / 100.',
      'Take total * percent / 100 off the total, and leave the threshold comparison as it is: that is the next step.',
    ],
  },
  'js-evolving-debug-4-start': {
    hints: ['Log what `trace("x", 5)` gives back: undefined. A pass-through logs the label and the value, then returns the value unchanged.'],
    approach: [
      'In the scratch pad, log what trace returns: console.log(trace("x", 5)).',
      'It prints the label and the value, then gives back undefined, because nothing is returned.',
      'Return value after the log, and run trace("x", 5) again to see 5 come back.',
    ],
  },
  'js-evolving-debug-5-start': {
    hints: ['With good input there is nothing to reject yet: the rows are what report already returns, and problems is an empty array.'],
    approach: [
      'Log report(["a,2,2"], 4, 50) in the scratch pad first, so you know what the rows look like.',
      'safeReport returns { rows, problems }: rows from report(lines, threshold, percent), problems as [].',
      'Check an empty list too: no lines gives no rows and no problems.',
    ],
  },

  'ts-evolving-result-1-start': { hints: ['Type it as mapResult<T, U>(result: Result<T>, fn: (value: T) => U): Result<U>, and check `result.ok` before you read `result.value`: inside that branch TypeScript knows the value is there.'] },
  'ts-evolving-result-2-start': { hints: ['A failure goes back as it is. A success returns fn(result.value) directly: it is already a Result<U>, so wrapping it again would nest one result in another.'] },
  'ts-evolving-result-3-start': { hints: ['Loop with for...of and push each value; return the first failure the moment you meet it, and after the loop return { ok: true, value: values }.'] },
  'ts-evolving-result-4-start': { hints: ['Make two arrays and walk every result: narrow on `ok`, then push `value` into values or `error` into errors. Nothing stops early here, unlike collectResults.'] },
  'ts-evolving-result-5-start': { hints: ['A success passes straight through without calling fn. A failure calls fn(result.error) inside try/catch, and a throw becomes { ok: false, error } by the rule mapResult already uses.'] },

  'ts-evolving-store-1-start': { hints: ['Keep the value in a variable inside createStore<T>: get returns it and set replaces it, so every store made by a call has its own.'] },
  'ts-evolving-store-2-start': { hints: ['update(fn) is set(fn(get())): work out the next value from the current one, then let set store it.'] },
  'ts-evolving-store-3-start': { hints: ['Push the old value onto a history stack inside set on every real change. undo pops it back directly, notifies once and returns true; calling set there would record the undo as a new change.'] },
  'ts-evolving-store-4-start': { hints: ['Work out select(store.get()) once, then subscribe to the source and work it out again in that listener, so get() returns the value kept from the last change.'] },
  'ts-evolving-store-5-start': { hints: ['Run the steps over a local variable that starts from store.get(), and call store.set once with the final value: set records one history entry and notifies once.'] },

  'ts-evolving-schema-1-start': { hints: ['Only "string" exists so far: return [] when typeof value is "string", and ["$: expected string"] otherwise.'] },
  'ts-evolving-schema-2-start': { hints: ['For an { object } schema, walk Object.keys(schema.object) in order and validate value[key] against each field\'s schema, rewriting the leading $ of its errors to $.KEY.'] },
  'ts-evolving-schema-3-start': { hints: ['Add an array branch that checks Array.isArray first, then validates every element and rewrites the leading $ of its errors to $[index].'] },
  'ts-evolving-schema-4-start': { hints: ['Run validate on each own value, taking the keys from Object.keys(value) in order, and replace only the leading $ of each error with $.KEY.'] },
  'ts-evolving-schema-5-start': { hints: ['A branch whose validate returns [] wins at once. Otherwise keep the shortest error list, replacing it only with a strictly shorter one, so a tie keeps the earlier schema.'] },

  'react-evolving-board-1-start': { hints: ['Keep the text in state and bind the input with value and onChange, labelled "Task". The Add button does not have to do anything yet.'] },
  'react-evolving-board-2-start': { hints: ['Keep the chosen filter ("All", "Active" or "Completed") in state and work out the visible tasks from the full list while rendering; the buttons only change the filter.'] },
  'react-evolving-board-3-start': { hints: ['Before every add, delete or toggle, push the current task list onto a history array. Undo pops the last list back into the tasks, and is disabled while the history is empty.'] },
  'react-evolving-board-4-start': { hints: ['Complete all maps every task to completed: true and records one history entry, like any single edit. Disable it when no task is still active.'] },
  'react-evolving-board-5-start': { hints: ['Find the task\'s index by its id in the full list, copy the array, swap the task with the one before it, and record the move in history. The first task cannot move up.'] },

  'react-evolving-catalog-1-start': { hints: ['Declare the four products as an array and map it to li elements, each showing the name and the price. There is nothing to filter yet.'] },
  'react-evolving-catalog-2-start': { hints: ['Keep the chosen sort in state, copy the filtered list with [...list] before you sort it, and compare names with localeCompare and prices by subtracting one from the other.'] },
  'react-evolving-catalog-3-start': { hints: ['Keep the selected ids in state of their own, apart from what is on screen; Selected total adds up the prices of every product whose id is selected, shown or not.'] },
  'react-evolving-catalog-4-start': { hints: ['Keep the box\'s text in state: empty means no limit, otherwise keep the products priced at or below Number(text). A lower limit can leave fewer pages, so show the last page that is left rather than one past the end.'] },
  'react-evolving-catalog-5-start': { hints: ['Keep the quantities in an object keyed by product id, with a missing entry counting as 1; Selected total adds price × quantity for every selected product.'] },

  'react-evolving-form-1-start': { hints: ['Keep the email in state bound to the input, and call event.preventDefault() in the form\'s onSubmit. Checking the address is the next step.'] },
  'react-evolving-form-2-start': { hints: ['Keep the email and the name in App\'s state, not inside the step that shows them, so going Back to the email step finds the email still there.'] },
  'react-evolving-form-3-start': { hints: ['Keep consent as a boolean in state, disable Submit while it is false, and set it back to false in the Back handler.'] },
  'react-evolving-form-4-start': { hints: ['Keep the account type and the company in state of their own. Render the Company input only for business, and leave the company alone when the type changes.'] },
  'react-evolving-form-5-start': { hints: ['Save draft writes JSON.stringify({ version: 1, email, name, account, company }) under evolving-form-draft. Consent is not in that object.'] },
};

// The full-stack checkpoints are the same steps for every app, with its own
// endpoint and number field.
for (const { slug, endpoint, amount } of FULLSTACK_APPS) {
  LADDERS[`ts-fullstack-${slug}-2-start`] = { hints: [`Narrow the unknown input step by step: a non-null object first, then each field's type, before you build the Draft from it. The earlier rules stay. Item is a type only: Draft & { id: number; version: number }.`] };
  LADDERS[`react-fullstack-${slug}-5-start`] = { hints: [`Create the transport once with lazy state, useState(() => fetcher ?? createLocalFetch(createApi(SEED))), then GET ${endpoint} in a mount effect and keep the items it answers with in state.`] };
  LADDERS[`react-fullstack-${slug}-6-start`] = { hints: [`Bind the Name and ${amount} inputs to state and update them in onChange. In the form's onSubmit call event.preventDefault() and nothing else yet.`] };
  LADDERS[`react-fullstack-${slug}-8-start`] = { hints: [`Keep the search text and the checkbox in state and filter while rendering: match the trimmed, lower-cased search against each name, and when Available only is ticked keep the rows whose ${amount} is above zero.`] };
}

/** The checkpoint's own hints, and method steps when its milestone has any,
 * to put over what it copied from the milestone. Empty for an id with no
 * entry, which the content contract reports. */
export function checkpointLadder(id: string): Partial<Pick<CodingTask, 'hints' | 'approach'>> {
  const ladder = LADDERS[id];
  if (!ladder) return {};
  return {
    hints: { en: ladder.hints, cs: [] },
    ...(ladder.approach ? { approach: { en: ladder.approach, cs: [] } } : {}),
  };
}
