// A reading whose lesson is already in when it draws (the press that opens it
// now asks for the lesson, #587 C19 follow-up) takes focus without the
// browser's own scroll, which moved a reading taller than the window to its
// first line and hid Back under the site header. Out of sight, it opens at its
// top, as the level runner's screens do (UX audit learn-02).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { LearnLesson } from '../src/components/learn/LearnLesson';
import { learnLessonQuery } from '../src/components/learn/lessonQuery';

const LESSON = { id: 'dsa-v1-d01-l1', title: 'Complexity Basics', sources: [], sections: [{ kind: 'prose', body: 'Count the operations as the input grows.' }] };

function openReading(top: number) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ x: 0, y: top, top, left: 0, right: 720, bottom: top + 2400, width: 720, height: 2400, toJSON: () => ({}) } as DOMRect);
  const focus = vi.spyOn(HTMLElement.prototype, 'focus');
  const scrollIntoView = vi.fn();
  HTMLElement.prototype.scrollIntoView = scrollIntoView;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(learnLessonQuery(LESSON.id).queryKey, { lesson: LESSON, hash: 'fixture-hash' } as never);
  render(
    <QueryClientProvider client={client}>
      <LanguageProvider>
        <LearnLesson lessonId={LESSON.id} backLabel="Big O introduction" onStart={() => {}} onBack={() => {}} />
      </LanguageProvider>
    </QueryClientProvider>,
  );
  return { focus, scrollIntoView };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('a reading that opens with its lesson in', () => {
  it('takes focus without scrolling while its top is in sight', () => {
    const { focus, scrollIntoView } = openReading(130);
    expect(screen.getByText('Count the operations as the input grows.')).toBeInTheDocument();
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('opens at its top when its top is out of sight', () => {
    const { focus, scrollIntoView } = openReading(-400);
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
  });
});
