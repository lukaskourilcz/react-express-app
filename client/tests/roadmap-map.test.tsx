// The /roadmap map lays each stage out as one row (UX audit learn-17): the
// label column (number, name, connector) on the left and the stage's topic
// cards on the right, and the stages are numbered as drawn, so a stage the
// learner cannot open yet leaves no gap in the numbers (the map read 1, 2, 4).
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { render, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import RoadmapTree from '../src/components/RoadmapTree';
import { unlockExtraTopics } from '../src/lib/roadmap';
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

// Git and TypeScript open on this device: Foundations, Version control and
// Types on top are drawn, and Frontend and Backend (stages 3 and 4 of the
// track) are not.
function mount() {
  localStorage.clear();
  unlockExtraTopics(['git', 'typescript']);
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <LanguageProvider><RoadmapTree structure={STRUCTURE} track="fullstack" /></LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('the career roadmap map', () => {
  it('draws each stage as one row, its label beside its topic cards', () => {
    const { container } = mount();
    const stages = Array.from(container.querySelectorAll<HTMLElement>('ol.rm-map__stages > li.rm-stage'));
    expect(stages.length).toBeGreaterThan(1);
    for (const stage of stages) {
      expect(stage.children).toHaveLength(2);
      expect(stage.children[0]).toHaveClass('rm-stage__label');
      expect(stage.children[1]).toHaveClass('rm-stage__topics');
      expect(within(stage.children[1] as HTMLElement).getAllByRole('link').length + stage.querySelectorAll('[aria-disabled="true"]').length).toBeGreaterThan(0);
    }
  });

  it('numbers the drawn stages 1, 2, 3 even when a stage of the track is hidden', () => {
    const { container } = mount();
    const numbers = Array.from(container.querySelectorAll('[data-stage-dot]')).map((dot) => dot.textContent);
    expect(numbers).toEqual(['1', '2', '3']);
    const third = container.querySelectorAll('.rm-stage')[2];
    expect(third.querySelector('.rm-stage__title')).toHaveTextContent('Types on top');
  });

  it('keeps the label column at 180px with the connector in it, and stacks below 520px of map', () => {
    const css = readFileSync(new URL('../src/components/RoadmapTree.css', import.meta.url), 'utf8');
    expect(css).toMatch(/\.rm-stage \{[^}]*grid-template-columns: 180px minmax\(0, 1fr\);/);
    expect(css).toMatch(/\.rm-stage:not\(:last-child\) > \.rm-stage__label::after \{[^}]*width: 2px;/);
    expect(css).toMatch(/@container \(max-width: 519px\) \{\s*\.rm-stage \{ grid-template-columns: minmax\(0, 1fr\);/);
    // Narrow cards stay wide enough for three 44px part cells (learn-17).
    expect(css).toMatch(/@container \(max-width: 519px\) \{[^@]*\.rm-stage__topics \{ grid-template-columns: repeat\(auto-fill, minmax\(176px, 1fr\)\); \}/);
  });
});
