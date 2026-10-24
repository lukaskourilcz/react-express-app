// When the lesson reader's own code does not load, the level still offers its
// questions, as a failed lesson read does (perf baseline #587 C19 moved the
// reader out of the Learn map's chunk).
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { LessonReader } from '../src/components/learn/lessonParts';

vi.mock('../src/components/learn/LearnLesson', () => {
  throw new Error('Failed to fetch dynamically imported module');
});

describe('a reading whose code did not load', () => {
  it('says the lesson could not load and offers Try again and the questions', async () => {
    const onStart = vi.fn();
    render(<LanguageProvider><LessonReader lessonId="dsa-v1-d01-l1" backLabel="DSA" onStart={onStart} onBack={() => {}} /></LanguageProvider>);
    expect(await screen.findByText('The lesson could not load. Try again or start the questions.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start the questions' }));
    expect(onStart).toHaveBeenCalled();
  });
});
