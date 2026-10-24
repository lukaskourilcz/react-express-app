// CodeBlock's preloader (perf baseline #587 C28): it starts the highlighter's
// code once, and the first code block then draws with that same load instead
// of starting its own. A load that failed is asked for again.
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { LanguageProvider } from '../src/i18n/LanguageContext';

const loads = vi.hoisted(() => ({ prism: 0 }));
vi.mock('react-syntax-highlighter/dist/esm/prism-light', async (importOriginal) => {
  loads.prism += 1;
  return importOriginal();
});

describe('the code highlighter’s preloader', () => {
  it('loads the highlighter ahead of the first code block, once', async () => {
    const { CodeBlock, preloadCodeHighlighter } = await import('../src/components/CodeBlock');
    expect(loads.prism).toBe(0);
    preloadCodeHighlighter();
    preloadCodeHighlighter();
    await waitFor(() => expect(loads.prism).toBe(1));
    const { container } = render(<LanguageProvider><CodeBlock code={'const answer = 42;'} language="javascript" /></LanguageProvider>);
    // Highlighted: Prism splits the code into tokens.
    await waitFor(() => expect(container.querySelector('code .token')).not.toBeNull());
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(loads.prism).toBe(1);
  });
});
