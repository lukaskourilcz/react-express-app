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
 * Every wait gives up after 300 ms rather than Testing Library's 1 s. A page
 * that got its data renders it within a few milliseconds, and a near miss (a
 * table instead of list items, a missing label) then fails each case quickly.
 * At 1 s a case, such a near miss ran the whole suite (visible and hidden,
 * over a dozen cases) past the grader's 10 s limit, and the learner read a
 * timeout with no case results instead of the checks that failed.
 *
 * The helpers are test code in a string: a regular expression in them avoids
 * backslashes, which the template literal would eat. */
export const CAPSTONE_HEADER = `import './fetchStub';
import React from 'react';
import { render, screen, fireEvent, waitFor as waitForSlow } from '@testing-library/react';
import App from './App';

// A page that got its data renders it within a few milliseconds; a page that
// never will fails in well under the grader's time limit.
const waitFor = (check, options) => waitForSlow(check, { timeout: 300, ...options });

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
// The words of every alert on the page; an empty live region says nothing.
const alertText = container => [...container.querySelectorAll('[role="alert"]')].map(node => node.textContent).join(' ').trim();
// The page without its alerts, so a message such as "Error loading users"
// does not count as the loading line.
const outsideAlerts = container => {
  const copy = container.cloneNode(true);
  copy.querySelectorAll('[role="alert"]').forEach(node => node.remove());
  return copy;
};
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
// A failure puts a message with role="alert" on the page, no items, and no
// loading line outside the alert.
const expectFailure = async container => {
  await waitFor(() => expect(alertText(container).length > 0).toBe(true));
  expect(container.querySelectorAll('li')).toHaveLength(0);
  expect(says(outsideAlerts(container), 'loading')).toBe(false);
};
`;
