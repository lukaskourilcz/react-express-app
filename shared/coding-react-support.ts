/** Fetch fixtures shared by every React runner: the browser harness writes
 * FETCH_STUB_SOURCE into the sandbox as /fetchStub.js, and the node content
 * test evaluates the same string. Suites never touch the network; the live
 * preview keeps using the public training APIs. Ported from interview-prepper. */

export const FIXTURE_USERS = [
  { id: 1, name: 'Leanne Graham', username: 'Bret', email: 'leanne@example.com', address: { city: 'Gwenborough' } },
  { id: 2, name: 'Ervin Howell', username: 'Antonette', email: 'ervin@example.com', address: { city: 'Wisokyburgh' } },
  { id: 3, name: 'Clementine Bauch', username: 'Samantha', email: 'clementine@example.com', address: { city: 'McKenziehaven' } },
];

export const FIXTURE_POSTS = [
  { id: 1, userId: 1, title: 'Post one', body: 'Body one' },
  { id: 2, userId: 1, title: 'Post two', body: 'Body two' },
  { id: 3, userId: 1, title: 'Post three', body: 'Body three' },
  { id: 4, userId: 2, title: 'Post four', body: 'Body four' },
  { id: 5, userId: 2, title: 'Post five', body: 'Body five' },
  { id: 6, userId: 2, title: 'Post six', body: 'Body six' },
  { id: 7, userId: 2, title: 'Post seven', body: 'Body seven' },
];

export const FIXTURE_TODOS = [
  { id: 1, userId: 1, title: 'Todo one', completed: false },
  { id: 2, userId: 1, title: 'Todo two', completed: true },
  { id: 3, userId: 2, title: 'Todo three', completed: false },
];

export const FIXTURE_COMMENTS = [
  { id: 1, postId: 1, name: 'Comment one', email: 'ana@example.com', body: 'First' },
  { id: 2, postId: 1, name: 'Comment two', email: 'bo@example.com', body: 'Second' },
  { id: 3, postId: 2, name: 'Comment three', email: 'ana@example.net', body: 'Third' },
];

export const FIXTURE_PRODUCTS = [
  { id: 1, title: 'Laptop', price: 900, category: 'tech' },
  { id: 2, title: 'Mug', price: 10, category: 'kitchen' },
  { id: 3, title: 'Desk', price: 200, category: 'furniture' },
];

const asSource = (value: unknown) => JSON.stringify(value, null, 2);

export const FETCH_STUB_SOURCE = `// Installed by the test runner. The preview still uses the real training API.
const FIXTURES = {
  users: ${asSource(FIXTURE_USERS)},
  posts: ${asSource(FIXTURE_POSTS)},
  todos: ${asSource(FIXTURE_TODOS)},
  comments: ${asSource(FIXTURE_COMMENTS)},
  products: ${asSource(FIXTURE_PRODUCTS)},
};

const respond = data => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: () => Promise.resolve(data),
  text: () => Promise.resolve(JSON.stringify(data)),
});

const byId = (list, id) => list.find(item => String(item.id) === String(id)) ?? list[0];

const resolveBody = (url, options) => {
  const method = (options && options.method ? options.method : 'GET').toUpperCase();
  const [path, query] = String(url).split('?');
  const params = new URLSearchParams(query || '');
  const segments = path.replace(/\\/+$/, '').split('/');
  const last = segments[segments.length - 1];
  const collection = ['users', 'posts', 'todos', 'comments', 'products'].includes(last)
    ? last
    : segments[segments.length - 2];
  const list = FIXTURES[collection];

  if (!list) return { current: { temperature_2m: 21 } };

  if (method === 'POST') {
    const sent = options && options.body ? JSON.parse(options.body) : {};
    return { id: 101, ...sent };
  }

  if (last !== collection) return byId(list, last);

  let items = list;
  for (const key of ['userId', 'postId']) {
    if (params.has(key)) items = items.filter(item => String(item[key]) === params.get(key));
  }
  if (params.has('_limit')) items = items.slice(0, Number(params.get('_limit')));
  // dummyjson-shaped endpoints nest their collection under a key
  return String(url).includes('dummyjson') ? { [collection]: items, total: items.length } : items;
};

globalThis.fetch = (url, options) => {
  const signal = options && options.signal;
  if (signal && signal.aborted) {
    const error = new Error('The operation was aborted.');
    error.name = 'AbortError';
    return Promise.reject(error);
  }
  return Promise.resolve(respond(resolveBody(url, options)));
};
`;

/** Wrap a component body into a runnable module: solutions and drafts are
 * authored as what a learner types into the starter, which already carries
 * the React import and the default export; add whichever piece is missing. */
export function asRunnableModule(source: string): string {
  const needsImport = !/^import\s/m.test(source);
  const needsExport = !/export\s+default/.test(source);
  return [
    needsImport ? "import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';" : '',
    source,
    needsExport ? 'export default App;' : '',
  ].filter(Boolean).join('\n');
}
