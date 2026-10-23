// The route shell's one page-width map (UX audit U1, #573) and the request a
// mounted part makes for a wider page (a Learn or FDE coding phase, coding-03).
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { useCallback, useState } from 'react';
import {
  PageWidthContext,
  effectivePageWidth,
  pageMaxWidth,
  routePageWidth,
  usePageWidthRequest,
  type RouteWidth,
} from '../src/components/ui/pageWidth';

describe('routePageWidth', () => {
  it.each([
    ['/', 'standard'],
    ['/profile', 'standard'],
    ['/play', 'standard'],
    ['/play/ABCD', 'standard'],
    ['/coding', 'wide'],
    ['/coding/javascript', 'wide'],
    ['/coding/javascript/js-sum', 'wide'],
    ['/dev', 'none'],
  ])('gives %s the %s width', (path, width) => {
    expect(routePageWidth(path)).toBe(width);
  });

  // These used to be 1200px (isWide); every page-based and social route now
  // shares the 800px column, so its h1 and cards stand at one x.
  it.each(['/shop', '/premium', '/premium/checkout', '/premium/cancel', '/privacy', '/terms', '/classroom', '/collection', '/leaderboard', '/auth/confirmed', '/learn/web-developer', '/quiz', '/no-such-page'])(
    'keeps %s in the narrow column',
    (path) => {
      expect(routePageWidth(path)).toBe('narrow');
    },
  );

  it('does not widen a route that merely starts with a listed name', () => {
    expect(routePageWidth('/codingx')).toBe('narrow');
    expect(routePageWidth('/players')).toBe('narrow');
    expect(routePageWidth('/profiles')).toBe('narrow');
  });

  it('maps each width to its token', () => {
    expect(pageMaxWidth('narrow')).toBe('var(--ss-width-narrow)');
    expect(pageMaxWidth('standard')).toBe('var(--ss-width-standard)');
    expect(pageMaxWidth('wide')).toBe('var(--ss-width-wide)');
    expect(pageMaxWidth('none')).toBe('none');
  });
});

describe('effectivePageWidth', () => {
  it('widens to the widest request and never narrows', () => {
    expect(effectivePageWidth('narrow', [])).toBe('narrow');
    expect(effectivePageWidth('narrow', ['wide'])).toBe('wide');
    expect(effectivePageWidth('standard', ['narrow'])).toBe('standard');
    expect(effectivePageWidth('narrow', ['standard', 'wide', 'narrow'])).toBe('wide');
  });

  it('leaves /dev uncapped whatever is requested', () => {
    expect(effectivePageWidth('none', ['wide'])).toBe('none');
  });
});

describe('usePageWidthRequest', () => {
  function Shell({ children, onWidth }: { children: React.ReactNode; onWidth: (width: string) => void }) {
    const [requests, setRequests] = useState<Record<string, RouteWidth>>({});
    const request = useCallback((id: string, width: RouteWidth | null) => {
      setRequests((prev) => {
        const next = { ...prev };
        if (width) next[id] = width;
        else delete next[id];
        return next;
      });
    }, []);
    onWidth(pageMaxWidth(effectivePageWidth('narrow', Object.values(requests))));
    return <PageWidthContext.Provider value={request}>{children}</PageWidthContext.Provider>;
  }
  function CodingPhase({ width }: { width: RouteWidth | null }) {
    usePageWidthRequest(width);
    return null;
  }

  it('asks for the wide page while mounted and gives it back on unmount', () => {
    const seen: string[] = [];
    const { rerender } = render(<Shell onWidth={(w) => seen.push(w)}><CodingPhase width="wide" /></Shell>);
    expect(seen[seen.length - 1]).toBe('var(--ss-width-wide)');
    rerender(<Shell onWidth={(w) => seen.push(w)}>{null}</Shell>);
    expect(seen[seen.length - 1]).toBe('var(--ss-width-narrow)');
  });

  it('ends the request when the caller passes null', () => {
    const seen: string[] = [];
    const { rerender } = render(<Shell onWidth={(w) => seen.push(w)}><CodingPhase width="wide" /></Shell>);
    rerender(<Shell onWidth={(w) => seen.push(w)}><CodingPhase width={null} /></Shell>);
    expect(seen[seen.length - 1]).toBe('var(--ss-width-narrow)');
  });

  it('does nothing outside the route shell', () => {
    expect(() => render(<CodingPhase width="wide" />)).not.toThrow();
  });
});
