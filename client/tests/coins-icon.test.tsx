// The header's Coins button draws two coins in the stroke language its
// neighbours (trophy, diamond) use; a filled 20px accent disc read as a status
// light there (UX audit shell-public-10).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { render } from '@testing-library/react';
import { CoinsIcon } from '../src/components/ui/icons';

describe('CoinsIcon', () => {
  it('is a decorative 20px stroke icon in the text colour, with no filled disc', () => {
    const { container } = render(<CoinsIcon />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('width')).toBe('20');
    expect(svg.getAttribute('fill')).toBe('none');
    expect(svg.getAttribute('stroke')).toBe('currentColor');
    expect(container.querySelector('[fill="var(--brand-accent)"]')).toBeNull();
  });

  it('is the icon of the header Coins button', () => {
    const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
    expect(app).toMatch(/label=\{t\('nav\.shop'\)\}[\s\S]{0,200}icon=\{<CoinsIcon \/>\}/);
  });
});
