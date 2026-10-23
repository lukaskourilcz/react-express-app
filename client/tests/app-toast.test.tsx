// A toast is announced only when its words arrive in a live region that was
// already on the page: a region mounted together with its text is not read.
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { AppToast } from '../src/components/ui/AppToast';
import type { ToastSeverity } from '../src/components/ui/AppToast';

function toast(open: boolean, severity: ToastSeverity, message = 'Saved.') {
  return (
    <LanguageProvider>
      <AppToast open={open} onClose={() => {}} severity={severity} message={message} autoHideDuration={null} />
    </LanguageProvider>
  );
}

describe('AppToast live region', () => {
  it.each([
    ['info', 'status', 'polite'],
    ['success', 'status', 'polite'],
    ['error', 'alert', 'assertive'],
  ] as const)('keeps the %s region mounted and fills it when the toast opens', (severity, role, live) => {
    const view = render(toast(false, severity));
    // Closed, the region is there but empty and claims no role, so a page of
    // closed toasts holds no empty alerts.
    expect(screen.queryByRole(role)).toBeNull();
    const region = document.querySelector<HTMLElement>(`[aria-live="${live}"]`)!;
    expect(region).toBeEmptyDOMElement();

    view.rerender(toast(true, severity));
    expect(screen.getByRole(role)).toBe(region);
    expect(region).toHaveAttribute('aria-live', live);
    expect(region).toHaveTextContent('Saved.');
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
  });

  it('changes only the text when a new message replaces an open one', () => {
    const view = render(toast(true, 'info', 'First.'));
    const region = screen.getByRole('status');
    view.rerender(toast(true, 'info', 'Second.'));
    expect(screen.getByRole('status')).toBe(region);
    expect(region).toHaveTextContent('Second.');
  });
});
