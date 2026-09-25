/** The React section's short paths. Five levels each; every level adds one
 * feature to the same `App`, and the Testing Library checks of every earlier
 * level run again.
 *
 * State and lists builds a guest list: controlled input, keys, immutable
 * updates, derived values and validation. Effects and loading loads data in
 * an effect: pending and failed states, derived filtering, effect
 * dependencies with a cleanup that ignores a stale answer, and keeping
 * something outside React (the tab title) in step.
 *
 * Task bodies only. Solutions live in `lib/coding/solutions/paths-react.ts`. */

import type { Spec } from './evolving';
import { doc, en } from './path-helpers';

const react = (title: string, path: string) => doc(title, `https://react.dev/${path}`);

export const REACT_PATHS: Record<string, Spec> = {
  'react-path-state': {
    starter: `import React, { useState } from 'react';

export default function App() {
  return <main />;
}
`,
    focus: ['useState', 'lists-keys', 'forms'],
    prompts: [
      en('Build a guest list in the default-exported `App`. Start with no guests. Give it an input labelled "Name" and a button "Add". Add trims the name, ignores a blank one, adds the guest to a list as an `li`, and clears the input. Keep the input controlled: its value lives in state.'),
      en('Show how many guests there are in an `output` labelled "Guests". Give every guest a button named "Remove NAME", for example "Remove Ada", that removes that guest only. Give each guest a stable id when you add them and use it as the `key`, not the array index.'),
      en('Give every guest a checkbox labelled with their name that marks them as arrived. Show "ARRIVED of TOTAL" in an `output` labelled "Arrived", for example "1 of 3". Update a guest with a new object, `{ ...guest, arrived: !guest.arrived }`, instead of changing the old one.'),
      en('Add a select labelled "Show" with the options "all", "arrived" and "waiting"; "all" is the default. It decides which guests are listed. Work out the visible guests while rendering rather than keeping a second list in state. "Guests" and "Arrived" still count everyone.'),
      en('Refuse a name that is already on the list, compared trimmed and without case: "ada" matches "Ada". Show "Already on the list" in an element with `role="alert"`, leave the typed text in the input, and add nothing. The next successful add removes the message. A blank name still does nothing and shows no message.'),
    ],
    hints: [
      en('Two pieces of state: `const [name, setName] = useState("")` for the input and `const [guests, setGuests] = useState([])` for the list. Add with `setGuests([...guests, newGuest])`, never `guests.push`.'),
      en('A counter outside the list gives stable ids: `const nextId = useRef(1)`, then `id: nextId.current++`. Remove with `guests.filter((guest) => guest.id !== id)`.'),
      en('Toggle with `guests.map((guest) => guest.id === id ? { ...guest, arrived: !guest.arrived } : guest)`. The arrived count is `guests.filter((guest) => guest.arrived).length`, worked out on every render.'),
      en('Keep only the select\'s value in state. `const visible = guests.filter(...)` during render follows every change to the list and to the filter without extra code.'),
      en('`guests.some((guest) => guest.name.toLowerCase() === trimmed.toLowerCase())` finds a clash. Keep the message in state: set it on a clash, clear it on a successful add.'),
    ],
    approaches: [
      [en('Keep the input\'s text and the guest list in state.'), en('On Add, trim the text; stop if it is empty.'), en('Append the guest, clear the input, and render the list with `map`.')],
      [en('Give each new guest an id from a counter.'), en('Render the count of the whole list in the output.'), en('Add a Remove button to each row that filters that id out.')],
      [en('Store `arrived: false` on each new guest.'), en('Render a labelled checkbox that maps the list to a new one with that guest toggled.'), en('Count the arrived guests during render.')],
      [en('Keep the select\'s value in state, starting at "all".'), en('Filter the guests for rendering by that value.'), en('Leave both outputs counting the full list.')],
      [en('Keep an error message in state.'), en('On Add, compare the trimmed name with every guest\'s, ignoring case; on a clash, set the message and stop.'), en('On success, clear the message as well as the input. Render the alert only while there is a message.')],
    ],
    suites: [
      `const addGuest=(name)=>{fireEvent.change(screen.getByLabelText('Name'),{target:{value:name}});fireEvent.click(screen.getByRole('button',{name:'Add',exact:true}));};
test('adds trimmed guests and clears the input',()=>{render(<App/>);expect(screen.queryAllByRole('listitem').length).toBe(0);addGuest('  Ada ');addGuest('Linus');const items=screen.getAllByRole('listitem');expect(items.length).toBe(2);expect(items[0].textContent.startsWith('Ada')).toBe(true);expect(items[1].textContent).toContain('Linus');expect(screen.getByLabelText('Name').value).toBe('');});
test('ignores a blank name',()=>{render(<App/>);addGuest('   ');expect(screen.queryAllByRole('listitem').length).toBe(0);});`,
      `test('counts the guests and removes the right one',()=>{render(<App/>);addGuest('Ada');addGuest('Linus');addGuest('Grace');expect(screen.getByLabelText('Guests').textContent).toBe('3');fireEvent.click(screen.getByRole('button',{name:'Remove Linus',exact:true}));expect(screen.getByLabelText('Guests').textContent).toBe('2');const items=screen.getAllByRole('listitem');expect(items.length).toBe(2);expect(items[0].textContent).toContain('Ada');expect(items[1].textContent).toContain('Grace');});`,
      `test('marks guests as arrived',()=>{render(<App/>);addGuest('Ada');addGuest('Linus');expect(screen.getByLabelText('Arrived').textContent).toBe('0 of 2');fireEvent.click(screen.getByRole('checkbox',{name:'Linus'}));expect(screen.getByRole('checkbox',{name:'Linus'}).checked).toBe(true);expect(screen.getByRole('checkbox',{name:'Ada'}).checked).toBe(false);expect(screen.getByLabelText('Arrived').textContent).toBe('1 of 2');fireEvent.click(screen.getByRole('checkbox',{name:'Linus'}));expect(screen.getByLabelText('Arrived').textContent).toBe('0 of 2');});
test('removing an arrived guest updates both counts',()=>{render(<App/>);addGuest('Ada');addGuest('Linus');fireEvent.click(screen.getByRole('checkbox',{name:'Ada'}));fireEvent.click(screen.getByRole('button',{name:'Remove Ada',exact:true}));expect(screen.getByLabelText('Guests').textContent).toBe('1');expect(screen.getByLabelText('Arrived').textContent).toBe('0 of 1');});`,
      `test('filters the list without changing the counts',()=>{render(<App/>);addGuest('Ada');addGuest('Linus');addGuest('Grace');fireEvent.click(screen.getByRole('checkbox',{name:'Grace'}));const show=screen.getByLabelText('Show');expect(show.value).toBe('all');fireEvent.change(show,{target:{value:'arrived'}});const arrived=screen.getAllByRole('listitem');expect(arrived.length).toBe(1);expect(arrived[0].textContent).toContain('Grace');fireEvent.change(show,{target:{value:'waiting'}});expect(screen.getAllByRole('listitem').length).toBe(2);expect(screen.getByLabelText('Guests').textContent).toBe('3');expect(screen.getByLabelText('Arrived').textContent).toBe('1 of 3');fireEvent.change(show,{target:{value:'all'}});expect(screen.getAllByRole('listitem').length).toBe(3);});
test('a guest who arrives leaves the waiting list',()=>{render(<App/>);addGuest('Ada');fireEvent.change(screen.getByLabelText('Show'),{target:{value:'waiting'}});fireEvent.click(screen.getByRole('checkbox',{name:'Ada'}));expect(screen.queryAllByRole('listitem').length).toBe(0);});`,
      `test('refuses a name already on the list',()=>{render(<App/>);addGuest('Ada');addGuest(' ada ');expect(screen.getAllByRole('listitem').length).toBe(1);expect(screen.getByRole('alert').textContent).toBe('Already on the list');expect(screen.getByLabelText('Name').value).toBe(' ada ');addGuest('Linus');expect(screen.queryByRole('alert')).toBeNull();expect(screen.getAllByRole('listitem').length).toBe(2);});
test('a removed guest can come back',()=>{render(<App/>);addGuest('Ada');fireEvent.click(screen.getByRole('button',{name:'Remove Ada',exact:true}));addGuest('Ada');expect(screen.queryByRole('alert')).toBeNull();expect(screen.getAllByRole('listitem').length).toBe(1);});
test('a blank name shows no message',()=>{render(<App/>);addGuest('  ');expect(screen.queryByRole('alert')).toBeNull();});`,
    ],
    references: [
      [react('Reacting to input with state', 'learn/reacting-to-input-with-state'), react('Rendering lists', 'learn/rendering-lists')],
      [react('Keeping list items in order with key', 'learn/rendering-lists#keeping-list-items-in-order-with-key'), react('useRef', 'reference/react/useRef')],
      [react('Updating arrays in state', 'learn/updating-arrays-in-state'), react('Updating objects in state', 'learn/updating-objects-in-state')],
      [react('Choosing the state structure', 'learn/choosing-the-state-structure#avoid-redundant-state'), react('<select>', 'reference/react-dom/components/select')],
      [react('Conditional rendering', 'learn/conditional-rendering'), doc('ARIA: alert role', 'https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/alert_role')],
    ],
  },

  'react-path-effects': {
    starter: `import React, { useEffect, useState } from 'react';

// A stand-in for a real request, so the preview has something to show.
// The checks pass their own loadUsers instead.
const sampleUsers = () =>
  new Promise((resolve) =>
    setTimeout(() => resolve([{ id: 1, name: 'Ada' }, { id: 2, name: 'Linus' }, { id: 3, name: 'Grace' }]), 300),
  );

export default function App({ loadUsers = sampleUsers }) {
  return <main />;
}
`,
    focus: ['useEffect', 'effect-cleanup', 'conditional'],
    prompts: [
      en('`App` receives `loadUsers`: a function that returns a Promise of users, each `{ id, name }`. Call it once when `App` mounts, inside `useEffect`. Until it settles, show "Loading" in an element with `role="status"`; when it resolves, remove that and list each user\'s name in an `li`. An empty result shows "No users".'),
      en('If `loadUsers` rejects, show "Could not load users" in an element with `role="alert"` and a "Retry" button. Retry shows "Loading" again and calls `loadUsers` once more; a success replaces the alert with the list.'),
      en('Add an input labelled "Search" that filters the loaded names, trimmed, without case, matching anywhere in the name. Filter while rendering; searching never calls `loadUsers` again. When users are loaded but none match, show "No matches".'),
      en('`loadUsers` can change while `App` is on screen, for example when a parent switches teams. Load again whenever it changes by listing it in the effect\'s dependencies. If the old request answers after the new one started, ignore that answer: set a flag in the effect\'s cleanup and check it before you update state. The same `loadUsers` on a re-render must not load again.'),
      en('Keep the browser tab in step: once users are loaded, set `document.title` to the number of loaded users, "2 users" (or "1 user" for one), counting every user, not only the ones the search shows. When `App` unmounts, put back the title the page had before it mounted, from an effect\'s cleanup.'),
    ],
    hints: [
      en('Keep `users` and `status` in state, with `status` starting as "loading", so "Loading" shows on the very first render. In `useEffect(() => { loadUsers().then(...) }, [])`, set the users and the status when the Promise resolves.'),
      en('Add `.catch(() => setStatus("error"))`. A retry is easiest as a counter in state that the effect depends on: Retry sets the status back to "loading" and bumps the counter, and the effect runs again.'),
      en('Keep only the search text in state. `users.filter((user) => user.name.toLowerCase().includes(query.trim().toLowerCase()))` during render gives the visible list.'),
      en('`useEffect(() => { let ignore = false; loadUsers().then((list) => { if (!ignore) setUsers(list); }); return () => { ignore = true; }; }, [loadUsers, attempt]);` React runs the cleanup before the effect runs again and when the component unmounts.'),
      en('Two effects: one with `[]` dependencies saves `document.title` when `App` mounts and puts it back in its cleanup; another, depending on the user count, sets the new title once the users are loaded.'),
    ],
    approaches: [
      [en('Keep the users and a status ("loading" or "ready") in state.'), en('In an effect with an empty dependency list, call `loadUsers()` and store the result.'), en('Render the status, "No users", or the list, depending on the state.')],
      [en('Add an "error" status and a retry counter to state.'), en('Catch a rejection and set the status to "error".'), en('Retry sets "loading" and bumps the counter; the effect depends on the counter and loads again.')],
      [en('Keep the search text in state and render a labelled input for it.'), en('Filter the loaded users by the trimmed, lower-case text while rendering.'), en('Show "No matches" when users are loaded but the filtered list is empty.')],
      [en('Add `loadUsers` to the effect\'s dependencies.'), en('Declare `let ignore = false` in the effect and return a cleanup that sets it to `true`.'), en('Check `ignore` before every state update that follows the Promise.')],
      [en('In an effect with `[]` dependencies, remember `document.title` and return a cleanup that restores it.'), en('In a second effect, set the title from the user count once the status is "ready".'), en('Use "user" for exactly one and "users" otherwise.')],
    ],
    suites: [
      `const users=[{id:1,name:'Ada'},{id:2,name:'Linus'}];
const names=()=>screen.getAllByRole('listitem').map((item)=>item.textContent);
test('shows Loading, then the users',async()=>{let calls=0;render(<App loadUsers={()=>{calls+=1;return Promise.resolve(users);}}/>);expect(screen.getByRole('status').textContent).toBe('Loading');await screen.findByText('Linus');expect(screen.queryByRole('status')).toBeNull();expect(names()).toEqual(['Ada','Linus']);expect(calls).toBe(1);});
test('an empty result says so',async()=>{render(<App loadUsers={()=>Promise.resolve([])}/>);expect((await screen.findByText('No users')).textContent).toBe('No users');expect(screen.queryAllByRole('listitem').length).toBe(0);});`,
      `test('a failed load can be retried',async()=>{let calls=0;render(<App loadUsers={()=>{calls+=1;return calls===1?Promise.reject(new Error('offline')):Promise.resolve(users);}}/>);expect((await screen.findByRole('alert')).textContent).toBe('Could not load users');expect(screen.queryByRole('status')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Retry',exact:true}));expect(screen.getByRole('status').textContent).toBe('Loading');await screen.findByText('Ada');expect(screen.queryByRole('alert')).toBeNull();expect(calls).toBe(2);});`,
      `test('search filters the loaded users without loading again',async()=>{let calls=0;render(<App loadUsers={()=>{calls+=1;return Promise.resolve([...users,{id:3,name:'Grace'}]);}}/>);await screen.findByText('Grace');fireEvent.change(screen.getByLabelText('Search'),{target:{value:'  LI '}});expect(names()).toEqual(['Linus']);fireEvent.change(screen.getByLabelText('Search'),{target:{value:'zzz'}});expect(screen.getByText('No matches').textContent).toBe('No matches');expect(screen.queryAllByRole('listitem').length).toBe(0);fireEvent.change(screen.getByLabelText('Search'),{target:{value:''}});expect(names()).toEqual(['Ada','Linus','Grace']);expect(calls).toBe(1);});`,
      `test('a new loader loads again, and a late answer from the old one is ignored',async()=>{let finishOld;const {rerender}=render(<App loadUsers={()=>new Promise((resolve)=>{finishOld=resolve;})}/>);rerender(<App loadUsers={()=>Promise.resolve([{id:9,name:'Grace'}])}/>);await screen.findByText('Grace');finishOld([{id:1,name:'Ada'}]);await new Promise((resolve)=>setTimeout(resolve,30));expect(names()).toEqual(['Grace']);});
test('the same loader does not load again on a re-render',async()=>{let calls=0;const load=()=>{calls+=1;return Promise.resolve(users);};const {rerender}=render(<App loadUsers={load}/>);await screen.findByText('Ada');rerender(<App loadUsers={load}/>);await new Promise((resolve)=>setTimeout(resolve,30));expect(calls).toBe(1);});`,
      `import { waitFor } from '@testing-library/react';
test('the tab title counts the users and comes back on unmount',async()=>{document.title='Before';const {unmount}=render(<App loadUsers={()=>Promise.resolve(users)}/>);await waitFor(()=>expect(document.title).toBe('2 users'));fireEvent.change(screen.getByLabelText('Search'),{target:{value:'ada'}});expect(document.title).toBe('2 users');unmount();expect(document.title).toBe('Before');});
test('one user is singular, none is plural',async()=>{document.title='Before';render(<App loadUsers={()=>Promise.resolve([{id:1,name:'Ada'}])}/>);await waitFor(()=>expect(document.title).toBe('1 user'));cleanup();expect(document.title).toBe('Before');render(<App loadUsers={()=>Promise.resolve([])}/>);await waitFor(()=>expect(document.title).toBe('0 users'));});`,
    ],
    references: [
      [react('Synchronizing with effects', 'learn/synchronizing-with-effects'), react('useEffect', 'reference/react/useEffect')],
      [react('Fetching data with effects', 'reference/react/useEffect#fetching-data-with-effects'), doc('Promise.prototype.catch()', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/catch')],
      [react('You might not need an effect', 'learn/you-might-not-need-an-effect'), doc('String.prototype.includes()', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/includes')],
      [react('Lifecycle of reactive effects', 'learn/lifecycle-of-reactive-effects'), react('Fetching data: ignoring stale responses', 'learn/synchronizing-with-effects#fetching-data')],
      [react('Connecting to an external system', 'reference/react/useEffect#connecting-to-an-external-system'), doc('Document: title property', 'https://developer.mozilla.org/en-US/docs/Web/API/Document/title')],
    ],
  },
};
