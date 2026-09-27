// Parts inside a page that load their own code: the Learn workbench, the
// friends tab, a path's reward and the code highlighter. Each used React.lazy
// with no boundary of its own, so a failed chunk took the whole page to the
// route error panel, and React.lazy kept the failure for good. Each is now a
// `lazyShellPart` inside a ShellPartBoundary; this file checks the fallbacks
// the pages draw in their place.
import { Suspense } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ShellPartBoundary } from '../src/components/ShellPartBoundary';
import ErrorRetry from '../src/components/ErrorRetry';
import { lazyShellPart, type Recovery } from '../src/lib/routeRecovery';
import { reportError } from '../src/lib/sentry';
import { LanguageProvider } from '../src/i18n/LanguageContext';

vi.mock('../src/lib/sentry', () => ({ reportError: vi.fn(), initSentry: vi.fn() }));
// The highlighter's grammar registry "does not load".
vi.mock('react-syntax-highlighter/dist/esm/prism-light', () => {
  throw new TypeError('Failed to fetch dynamically imported module: http://localhost:3000/assets/prism-light-AAAA.js');
});

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.mocked(reportError).mockClear();
});

const chunkError = (name: string) => new TypeError(`Failed to fetch dynamically imported module: http://localhost:3000/assets/${name}.js`);

describe('a part inside a page whose code did not load', () => {
  it('keeps the page and offers Retry in the part’s place; the press draws the part', async () => {
    let fails = true;
    const load = vi.fn(async () => {
      if (fails) throw chunkError('FriendsPanel-AAAA');
      return { default: () => <p>the friends</p> };
    });
    const Part = lazyShellPart(load);
    const recovery = { checkServedBuild: vi.fn(async () => 'same' as const), reload: vi.fn() } satisfies Recovery;
    await act(async () => {
      render(
        <LanguageProvider>
          <h1>Profile</h1>
          <Suspense fallback={null}>
            <ShellPartBoundary recovery={recovery} fallback={(retry, busy) => <ErrorRetry message="Your friends did not load." onRetry={retry} busy={busy} />}>
              <Part />
            </ShellPartBoundary>
          </Suspense>
        </LanguageProvider>,
      );
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('Your friends did not load.');
    expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument();
    expect(reportError).toHaveBeenCalledTimes(1);

    fails = false;
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Retry' })));
    expect(await screen.findByText('the friends')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(load).toHaveBeenCalledTimes(2);
    expect(recovery.reload).not.toHaveBeenCalled();
  });

  it('a code block whose highlighter did not load stays plain, readable code, and the page stays', async () => {
    const { renderQuestion } = await import('../src/components/CodeBlock');
    await act(async () => {
      render(
        <LanguageProvider>
          <h1>Question</h1>
          <div>{renderQuestion('What does this print?\n```js\nconsole.log(1 + 1);\n```')}</div>
        </LanguageProvider>,
      );
    });
    await vi.waitFor(() => expect(reportError).toHaveBeenCalled());
    expect(screen.getByRole('heading', { name: 'Question' })).toBeInTheDocument();
    expect(screen.getByLabelText(/javascript/i)).toHaveTextContent('console.log(1 + 1);');
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
