// The one question header (UX audit U2, questions-09 and questions-19): an
// h1 that names the run, progress and status on the first row, tags and 44px
// icon buttons on the second.
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { QuestionHeader, QuestionIconButton, HintIcon, ReportFlagIcon, ExitIcon } from '../src/components/question';

const renderIn = (ui: React.ReactNode) => render(<LanguageProvider>{ui}</LanguageProvider>);

describe('QuestionHeader', () => {
  it('names the run in one h1, with progress and status on the first row', () => {
    const { container } = renderIn(
      <QuestionHeader
        run="Quiz"
        title="Question 3 of 10"
        progress={{ value: 20, label: 'Quiz progress' }}
        status={<span>0:42</span>}
      />,
    );
    const headings = screen.getAllByRole('heading');
    expect(headings).toHaveLength(1);
    expect(headings[0].tagName).toBe('H1');
    expect(headings[0]).toHaveTextContent('Quiz · Question 3 of 10');
    // The counter is the h1's own words, said once.
    expect(screen.getAllByText('Question 3 of 10')).toHaveLength(1);
    expect(screen.getByRole('progressbar', { name: 'Quiz progress' })).toHaveAttribute('aria-valuenow', '20');
    const rows = container.querySelectorAll('.ss-question-header__row');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent('0:42');
  });

  it('puts tags, the difficulty and the icon buttons on the second row', () => {
    const { container } = renderIn(
      <QuestionHeader
        title="Question 1 of 2"
        meta={<span>JavaScript</span>}
        difficulty={3}
        tools={<QuestionIconButton label="Report this question" icon={<ReportFlagIcon />} />}
      />,
    );
    const rows = container.querySelectorAll('.ss-question-header__row');
    expect(rows).toHaveLength(2);
    expect(rows[1]).toHaveTextContent('JavaScript');
    expect(rows[1]).toHaveTextContent('Difficulty 3');
    expect(rows[1]).toContainElement(screen.getByRole('button', { name: 'Report this question' }));
  });

  it('can take focus on its h1 when the runner asks', () => {
    const ref = createRef<HTMLHeadingElement>();
    renderIn(<QuestionHeader title="Level 1 · Values & Math" titleRef={ref} />);
    expect(ref.current).toHaveAttribute('tabindex', '-1');
    ref.current!.focus();
    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus();
  });
});

describe('QuestionIconButton', () => {
  it('is a 44px button with its name, and a pressed state for a toggle', () => {
    const onClick = vi.fn();
    renderIn(
      <>
        <QuestionIconButton label="Show hint" icon={<HintIcon />} pressed={false} onClick={onClick} />
        <QuestionIconButton label="Exit quiz" icon={<ExitIcon />} tooltip={false} />
      </>,
    );
    const hint = screen.getByRole('button', { name: 'Show hint' });
    expect(hint.style.width).toBe('44px');
    expect(hint.style.height).toBe('44px');
    expect(hint).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(hint);
    expect(onClick).toHaveBeenCalledOnce();
    const exit = screen.getByRole('button', { name: 'Exit quiz' });
    expect(exit).not.toHaveAttribute('aria-pressed');
    expect(exit.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
