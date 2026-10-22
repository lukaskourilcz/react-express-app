import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { LessonView, RichText } from '../src/components/learn/LessonBody';
it('opens a case in Learn and keeps source links isolated in a new tab', () => {
  render(<RichText text={'Try [the case](/learn/forward-deployed-engineer/path/fde-v1-m02?activity=fde-v1-m02-cases-01). Read [the source](https://www.typescriptlang.org/docs/).'} />);
  expect(screen.getByRole('link', { name: 'the case' })).toHaveAttribute('href', '/learn/forward-deployed-engineer/path/fde-v1-m02?activity=fde-v1-m02-cases-01');
  expect(screen.getByRole('link', { name: 'the case' })).not.toHaveAttribute('target');
  expect(screen.getByRole('link', { name: 'the source' })).toHaveAttribute('rel', 'noreferrer noopener');
  expect(screen.getByRole('link', { name: 'the source' })).toHaveAttribute('target', '_blank');
});
it('leaves dangerous/unsupported destinations, HTML and inline-code examples as plain text', () => {
  const unsafe = [
    'javascript:alert', 'data:text/html,unsafe', 'http://example.invalid', '//example.invalid', '/admin',
    '/learn/../admin', '/learn/fde/../../admin', '/learn/fde/../web-developer', '/learn/./web-developer',
    '/learn/%2e%2e/admin', '/learn/%2E%2E/admin', '/learn/%2e%2e%2fadmin', '/learn/%252e%252e/admin',
    '/learn/web-developer%2f..%2fadmin', '/learn/web-developer%5c..%5cadmin', '/learn//web-developer',
  ];
  const text = unsafe.map((href, index) => `[unsafe ${index}](${href})`).join(' ')
    + ' [   ](https://example.invalid) <img src=x onerror=alert> `[code](https://example.invalid)` ``[double](https://example.invalid) `example` ``';
  const { container } = render(<RichText text={text} />);
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
  expect(container.querySelector('img')).toBeNull();
  expect(container.querySelector('code')).toHaveTextContent('[code](https://example.invalid)');
  expect(container.querySelectorAll('code')[1]).toHaveTextContent('[double](https://example.invalid) `example`');
});

it('renders authored case-bank links in row headings without interpreting HTML cells', () => {
  render(<LanguageProvider><LessonView lesson={{ id: 'case-bank', title: 'Case bank', sources: [], sections: [{ kind: 'table', caption: 'Cases', headers: ['Case', 'Focus'], rows: [
    ['[Dashboard](/learn/forward-deployed-engineer/path/fde-v1-m02?activity=fde-v1-m02-cases-dashboard)', '<img src=x> [Docs](https://www.typescriptlang.org/docs/)'],
    ['`[literal heading](https://example.invalid)`', '``[literal cell](https://example.invalid)``'],
  ] }] }} /></LanguageProvider>);
  expect(screen.getByRole('link', { name: 'Dashboard' }).closest('th')).toHaveAttribute('scope', 'row');
  expect(screen.getByRole('link', { name: 'Docs' }).closest('td')).not.toBeNull();
  expect(screen.getAllByRole('columnheader')).toHaveLength(2);
  expect(screen.getByRole('table')).toHaveAccessibleName('Cases');
  expect(screen.queryByRole('link', { name: 'literal heading' })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'literal cell' })).not.toBeInTheDocument();
  expect(document.querySelector('img')).toBeNull();
});
