/** The opening of the suites of the first five React capstones of tier 5
 * (`react-user-directory`, `react-posts-dashboard`, `react-todo-client`,
 * `react-product-explorer`, `react-comments-viewer`).
 *
 * Each capstone talks to a public training API. Its suite answers every
 * request by hand, so a check can read the page while a request is still on
 * its way (the loading line), answer with data of its own (the hidden cases
 * serve data no visible check shows), answer with a failure, and read the
 * method, address and body of what the page sent. The fixture stub is
 * imported first and comes back after every case, so a request made outside a
 * case still gets an answer. The hidden cases (`hiddenSuite` beside each
 * reference solution) run inside the same suite and use these helpers too.
 *
 * The helpers are test code in a string: a regular expression in them avoids
 * backslashes, which the template literal would eat. */
export const CAPSTONE_HEADER = `import './fetchStub';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

// Every request the page makes is recorded with its address, method and
// options, and waits until the check answers it with respond(data, status) or
// fail(error). The fixture stub comes back when the check ends.
const withServer = async body => {
  const calls = [];
  const real = globalThis.fetch;
  globalThis.fetch = (url, options = {}) => new Promise((resolve, reject) => {
    calls.push({
      url: String(url),
      method: String(options.method || 'GET').toUpperCase(),
      options,
      respond: (data, status = 200) => resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(data), text: () => Promise.resolve(JSON.stringify(data)) }),
      fail: error => reject(error),
    });
  });
  try {
    await body(calls);
  } finally {
    globalThis.fetch = real;
  }
};
// Host and path of an address, without the query or a trailing slash.
const addressOf = url => {
  const parsed = new URL(url, 'http://localhost/');
  return parsed.host + parsed.pathname.replace(/[/]+$/, '');
};
const gets = (calls, url) => calls.filter(call => call.method === 'GET' && addressOf(call.url) === addressOf(url));
const says = (container, words) => container.textContent.toLowerCase().includes(words.toLowerCase());
const alertIn = container => container.querySelector('[role="alert"]');
const itemTexts = container => [...container.querySelectorAll('li')].map(item => item.textContent);
// A button element, or an input of type submit or button, by the words on it.
const buttonNamed = (node, name) => [...node.querySelectorAll('button, input[type="submit"], input[type="button"]')]
  .find(button => (button.tagName === 'INPUT' ? button.value : button.textContent).toLowerCase().includes(name.toLowerCase()));
const optionsOf = select => [...select.querySelectorAll('option')].map(option => [option.value, option.textContent.trim()]);
// Each item holds the matching text, in order, and there are no others.
const expectItems = (items, expected) => {
  expect(items).toHaveLength(expected.length);
  expected.forEach((text, index) => expect(items[index]).toContain(text));
};
// A failure puts a message with role="alert" on the page, and no items.
const expectFailure = async container => {
  await waitFor(() => expect(Boolean(alertIn(container))).toBe(true));
  expect(alertIn(container).textContent.trim().length > 0).toBe(true);
  expect(container.querySelectorAll('li')).toHaveLength(0);
  expect(says(container, 'loading')).toBe(false);
};
`;
