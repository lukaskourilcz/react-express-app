// Learn controls take a 44px press on every pointer (UX audit learn-18). The
// floor itself (app-shell.css) is covered in touch-and-motion.test.ts; this
// covers the career roadmap's part cells, which keep their 31px look and get
// a 44px hit area of their own.
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import RoadmapTree from '../src/components/RoadmapTree';
import type { RoadmapStructure } from '../src/types/quiz';

vi.mock('../src/lib/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/lib/auth')>()),
  useAuth: () => ({ user: null, isAuthenticated: false, isLoading: false, signInWithGoogle: async () => {} }),
}));

const levels = (count: number) => Array.from({ length: count }, (_, i) => ({ level: i + 1, title: `Level ${i + 1}`, difficulty: 1 as const, questionCount: 8 }));
const STRUCTURE = {
  topics: ['javascript', 'html', 'css', 'git'],
  structure: {
    javascript: { levels: levels(25), checkpoints: [] },
    html: { levels: levels(6), checkpoints: [] },
    css: { levels: levels(6), checkpoints: [] },
    git: { levels: levels(15), checkpoints: [] },
  },
} as unknown as RoadmapStructure;

function Where() {
  const { pathname, search } = useLocation();
  return <output aria-label="Opened">{pathname + search}</output>;
}

describe('career roadmap part cells', () => {
  it('give every part cell a 44px hit area inside the cell, so a press on it opens the part', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/roadmap']}>
          <LanguageProvider>
            <Routes>
              <Route path="/roadmap" element={<RoadmapTree structure={STRUCTURE} track="fullstack" />} />
              <Route path="/learn" element={<Where />} />
            </Routes>
          </LanguageProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    const cells = Array.from(document.querySelectorAll<HTMLElement>('.rm-part-pill'));
    expect(cells.length).toBeGreaterThan(0);
    for (const cell of cells) {
      // The cell is the positioning box; the layer is its own child, hidden
      // from assistive technology, so the cell's name is unchanged.
      expect(cell.style.position).toBe('relative');
      const hit = cell.querySelector<HTMLElement>(':scope > .rm-part-pill__hit');
      expect(hit).not.toBeNull();
      expect(hit).toHaveAttribute('aria-hidden', 'true');
      expect(hit!.style.position).toBe('absolute');
    }
    const open = cells.find((cell) => cell.tagName === 'A');
    expect(open).toBeDefined();
    fireEvent.click(open!.querySelector('.rm-part-pill__hit')!);
    expect(screen.getByRole('status', { hidden: true, name: 'Opened' }).textContent).toMatch(/^\/learn\?topic=\w+&part=\d+$/);
  });
});
