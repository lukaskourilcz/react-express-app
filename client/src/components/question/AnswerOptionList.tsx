import type { ReactNode } from 'react';
import { RadioCardGroup, RadioCard } from '../ui/RadioCards';
import { questionText as t } from '../../i18n/translations.question';
import './question.css';

export interface AnswerGrade {
  /** Index of the right answer. */
  correct: number;
  /** Index the learner chose, or null when nothing was picked (time ran out). */
  picked: number | null;
}

export interface AnswerOptionListProps {
  /** The answer texts, in order. They are also each row's accessible name. */
  options: readonly string[];
  /** The selected index, or null. */
  value: number | null;
  /** Selection moved: a click, Enter/Space, or an arrow key. */
  onChange: (index: number) => void;
  /**
   * A click or Enter/Space on a row, not arrow browsing: for a runner where a
   * press commits the answer at once (the Learn runner, Play).
   */
  onActivate?: (index: number) => void;
  /** Id of the question block that names the group. */
  labelledBy: string;
  /** No more picks: graded, locked or checking. */
  disabled?: boolean;
  /**
   * The graded marks. The right answer gets the success tone, a check and
   * "Correct answer"; a wrong pick the error tone, a cross and "Your pick".
   * Rows never move: only the tone and a trailing mark are added.
   */
  grade?: AnswerGrade | null;
  /** How a row's text is drawn (inline code, say). Defaults to the text. */
  renderOption?: (option: string, index: number) => ReactNode;
  className?: string;
}

/**
 * The one answer list (UX audit U2, questions-04 and questions-01): a radio
 * group of 48px rows 8px apart, a 26px number chip, body text that turns
 * semibold when selected, and the brand accent for the selection. Arrow keys
 * move along the column only, so a runner can keep Left/Right for questions.
 */
export function AnswerOptionList({ options, value, onChange, onActivate, labelledBy, disabled, grade, renderOption, className }: AnswerOptionListProps) {
  return (
    <RadioCardGroup
      value={value}
      onChange={(next) => onChange(Number(next))}
      onActivate={onActivate ? (next) => onActivate(Number(next)) : undefined}
      labelledBy={labelledBy}
      className={className ? `ss-answer-list ${className}` : 'ss-answer-list'}
    >
      {options.map((option, index) => {
        const mark = !grade ? null
          : index === grade.correct ? 'correct'
            : index === grade.picked ? 'pick'
              : null;
        const markText = mark === 'correct' ? t('question.correctAnswer') : mark === 'pick' ? t('question.yourPick') : null;
        return (
          <RadioCard
            key={index}
            value={index}
            index={index}
            label={markText ? `${option}, ${markText}` : option}
            padding={2}
            disabled={disabled}
            tone={mark === 'correct' ? 'success' : mark === 'pick' ? 'error' : 'default'}
            className="ss-answer-option"
          >
            <span className="ss-answer-option__row">
              <span className="ss-answer-option__key" aria-hidden>{index + 1}</span>
              {/* data-reserve: a hidden semibold copy of the words holds the
                  row's height, so selecting or grading a row (its text turns
                  semibold) never rewraps it. */}
              <span className="ss-answer-option__text" data-reserve={option}>
                <span className="ss-answer-option__label">{renderOption ? renderOption(option, index) : option}</span>
              </span>
              {markText && (
                <span className="ss-answer-option__mark">
                  <span aria-hidden>{mark === 'correct' ? '✓' : '✕'}</span>
                  <span className="ss-answer-option__mark-text">{markText}</span>
                </span>
              )}
            </span>
          </RadioCard>
        );
      })}
    </RadioCardGroup>
  );
}
