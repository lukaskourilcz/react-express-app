// The public topic guides (/topics/<slug>): the same markup as their
// build-time HTML, with the guide's own links kept inside the app.
import { expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import TopicLandingPage from '../src/components/TopicLandingPage';

function Where() {
  const location = useLocation();
  return <p data-testid="location">{location.pathname + location.search}</p>;
}

function renderGuide(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <LanguageProvider>
        <Routes>
          <Route path="/topics/:slug" element={<><TopicLandingPage /><Where /></>} />
          <Route path="*" element={<Where />} />
        </Routes>
      </LanguageProvider>
    </MemoryRouter>,
  );
}

// A related guide, the home link and the practice link used to reload the
// whole app (only the practice link stayed inside it).
it('follows a related guide and the home link inside the app', () => {
  renderGuide('/topics/javascript-closures');
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('JavaScript closures, clearly explained');
  const related = screen.getByRole('link', { name: 'TypeScript narrowing fundamentals' });
  expect(related).toHaveAttribute('href', '/topics/typescript-narrowing');
  expect(fireEvent.click(related)).toBe(false);
  expect(screen.getByTestId('location')).toHaveTextContent('/topics/typescript-narrowing');
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('TypeScript narrowing fundamentals');

  expect(fireEvent.click(screen.getByRole('link', { name: /· Home$/ }))).toBe(false);
  expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/);
});

it('leaves a modified click to the browser and still opens practice in the app', () => {
  renderGuide('/topics/javascript-closures');
  const related = screen.getByRole('link', { name: 'TypeScript narrowing fundamentals' });
  expect(fireEvent.click(related, { ctrlKey: true })).toBe(true);
  expect(screen.getByTestId('location')).toHaveTextContent('/topics/javascript-closures');
  expect(fireEvent.click(screen.getByRole('link', { name: 'Practice in a quiz' }))).toBe(false);
  expect(screen.getByTestId('location')).toHaveTextContent('/quiz?category=javascript');
});
