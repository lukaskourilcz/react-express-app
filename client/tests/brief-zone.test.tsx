// The capped brief at the top of the coding frame (UX audit coding-01): a
// body that fits gets no toggle; one that does not scrolls as a named,
// focusable region with a "Show full brief" toggle that lifts the cap.
import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { BriefZone } from '../src/coding/BriefZone';

const sizes = (scroll: number, client: number) => {
  Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { configurable: true, get() { return (this as HTMLElement).classList.contains('cd-brief__body') ? scroll : 0; } });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get() { return (this as HTMLElement).classList.contains('cd-brief__body') ? client : 0; } });
};

afterEach(() => {
  delete (HTMLElement.prototype as { scrollHeight?: number }).scrollHeight;
  delete (HTMLElement.prototype as { clientHeight?: number }).clientHeight;
});

const mount = () => render(
  <LanguageProvider>
    <BriefZone labelledBy="task-title" head={<h1 id="task-title">Digit sum</h1>} after={<p>Premium task</p>}>
      <p>Write digitSum(n).</p>
    </BriefZone>
  </LanguageProvider>,
);

describe('BriefZone', () => {
  it('shows a brief that fits without a toggle, a fade or a tab stop', () => {
    sizes(80, 120);
    const { container } = mount();
    const body = container.querySelector('.cd-brief__body')!;
    expect(body).toHaveAttribute('data-capped', 'true');
    expect(body).not.toHaveAttribute('data-fade');
    expect(body).not.toHaveAttribute('tabindex');
    expect(screen.queryByRole('button', { name: 'Show full brief' })).toBeNull();
    expect(screen.getByText('Premium task')).toBeInTheDocument();
  });

  it('scrolls a long brief inside the cap as a region named by the title, and the toggle lifts the cap', () => {
    sizes(400, 120);
    const { container } = mount();
    const body = container.querySelector('.cd-brief__body')!;
    const region = screen.getByRole('region', { name: 'Digit sum' });
    expect(region).toBe(body);
    expect(region).toHaveAttribute('tabindex', '0');
    expect(region).toHaveAttribute('data-fade', 'true');
    const toggle = screen.getByRole('button', { name: 'Show full brief' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAttribute('aria-controls', body.id);
    fireEvent.click(toggle);
    expect(body).toHaveAttribute('data-capped', 'false');
    expect(body).not.toHaveAttribute('tabindex');
    const less = screen.getByRole('button', { name: 'Show less' });
    expect(less).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(less);
    expect(body).toHaveAttribute('data-capped', 'true');
    expect(screen.getByRole('button', { name: 'Show full brief' })).toBe(less);
  });

  it('caps the body with one token and fixes the frame height from 1024px', () => {
    const css = readFileSync(resolve(__dirname, '../src/coding/Coding.css'), 'utf8');
    expect(css).toContain("--cd-frame-h: clamp(600px, calc(100dvh - 7rem - 48px), 900px);");
    expect(css).toContain(".cd-brief__body[data-capped='true'] { max-height: var(--cd-brief-cap);");
    expect(css).toMatch(/\.cd-workbench--section \.cd-workbench__grid,\s*\.cd-workbench--lesson \.cd-workbench__grid,\s*\.cd-workbench--activity \.cd-workbench__grid \{ grid-template-rows: var\(--cd-frame-h\) auto; \}/);
  });
});
