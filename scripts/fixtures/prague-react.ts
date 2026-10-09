/* A React component that prints what time it is in Prague, and the suite
 * that checks it. The grader's page realm (test:grading-integrity), the real
 * guest bundle (test:launch) and the browser's React frame
 * (tests/browser/coding-workbench.spec.ts) all have to pass it, whatever
 * zone their host is in. */

export const PRAGUE_REACT_APP = `export default function App() {
  const at = new Date(Date.UTC(2026, 2, 29, 1, 30));
  return (
    <main>
      <p data-testid="summer">{new Date(2026, 6, 1).getTimezoneOffset()}</p>
      <p data-testid="winter">{new Date(2026, 0, 1).getTimezoneOffset()}</p>
      <p data-testid="skipped">{new Date(2026, 2, 29, 2, 30).toISOString()}</p>
      <p data-testid="repeated">{new Date(2026, 9, 25, 2, 30).toISOString()}</p>
      <p data-testid="text">{at.toString()}</p>
      <p data-testid="locale">{at.toLocaleString('en-US')}</p>
      <p data-testid="intl">{new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(at)}</p>
      <p data-testid="zone">{Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
    </main>
  );
}
`;

export const PRAGUE_REACT_SUITE = `import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

const read = (id) => screen.getByTestId(id).textContent;

test('local time is Prague time', () => {
  render(<App />);
  expect(read('summer')).toBe('-120');
  expect(read('winter')).toBe('-60');
  expect(read('skipped')).toBe('2026-03-29T01:30:00.000Z');
  expect(read('repeated')).toBe('2026-10-25T00:30:00.000Z');
  expect(read('text')).toBe('Sun Mar 29 2026 03:30:00 GMT+0200 (Central European Summer Time)');
});

test('Intl formats in Prague time', () => {
  render(<App />);
  expect(read('locale')).toBe('3/29/2026, 3:30:00 AM');
  expect(read('intl')).toBe('3:30 AM');
  expect(read('zone')).toBe('Europe/Prague');
});
`;
