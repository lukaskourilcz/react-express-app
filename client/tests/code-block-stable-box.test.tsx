// A code block draws its code into one <pre> from the first paint on: when
// the highlighter arrives it colours the tokens in that same element, so the
// block's height, font and a learner's horizontal scroll do not jump, and a
// reader that holds the element keeps a connected one.
import { describe, expect, it } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { LanguageProvider } from '../src/i18n/LanguageContext';

describe('the code block', () => {
  it('keeps its <pre> while the highlighter replaces the plain code', async () => {
    const { CodeBlock } = await import('../src/components/CodeBlock');
    const { container } = render(<LanguageProvider><CodeBlock code={'const answer = 42;'} language="javascript" /></LanguageProvider>);
    const plain = container.querySelector('pre');
    expect(plain).not.toBeNull();
    expect(plain).toHaveTextContent('const answer = 42;');
    expect(plain).toHaveAccessibleName('javascript code block');
    await waitFor(() => expect(container.querySelector('code .token')).not.toBeNull());
    expect(container.querySelectorAll('pre')).toHaveLength(1);
    expect(container.querySelector('pre')).toBe(plain);
    expect(plain!.isConnected).toBe(true);
    expect(plain).toHaveTextContent('const answer = 42;');
  });
});
