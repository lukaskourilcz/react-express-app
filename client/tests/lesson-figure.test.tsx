// The authored lesson figures: the stepped trace and its controls.
import { expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { LessonFigureView } from '../src/components/ui/LessonFigure';
import type { LessonFigure } from '../../shared/lesson-figures';

const steps = (frames: Extract<LessonFigure['body'], { kind: 'steps' }>['frames']): LessonFigure => ({
  id: 'test-trace', topic: 'dsa', level: 1, title: 'A test trace',
  alt: 'Three cells, 1, 2 and 3. The first frame marks the first cell, the second frame the second, and the third frame the third.',
  body: { kind: 'steps', frames },
});
const mount = (figure: LessonFigure) => render(<LanguageProvider><LessonFigureView figure={figure} /></LanguageProvider>);

// A trace with no frames read `frame.cells` of undefined, and the error
// replaced the whole lesson.
it('shows a trace with no frames as its words, without throwing', () => {
  mount(steps([]));
  expect(screen.getByText('A test trace')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'This figure in words' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
});
