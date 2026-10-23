import { questionText as t } from '../../i18n/translations.question';
import './question.css';

export type QuestionHintVerb = 'answer' | 'select';
export type QuestionHintNext = 'continue' | 'submit';

export interface QuestionHintProps {
  /** How many answers the number keys reach (1–max). */
  max: number;
  /** What a number key does: 'answer' grades at once (Learn), 'select' only picks (Quiz, Challenge). */
  verb: QuestionHintVerb;
  /** What Enter does now; leave it out when Enter does nothing here. */
  next?: QuestionHintNext;
  /**
   * Keep the line but show nothing, e.g. once the answer is graded: the line's
   * height stays reserved, so nothing above or below it moves.
   */
  hidden?: boolean;
}

/**
 * The one keyboard hint under the answers (UX audit U2, questions-16 and
 * questions-02): "Press 1–4 to select · Enter to continue". Desktop with a fine
 * pointer only; its line is reserved in every state.
 */
export function QuestionHint({ max, verb, next, hidden }: QuestionHintProps) {
  const verbText = t(verb === 'answer' ? 'question.keysAnswer' : 'question.keysSelect');
  const text = next
    ? t('question.keysHint', { max, verb: verbText, next: t(next === 'submit' ? 'question.keysSubmit' : 'question.keysContinue') })
    : t('question.keysHintShort', { max, verb: verbText });
  return (
    <p className="ss-question-hint" data-hidden={hidden ? 'true' : undefined} aria-hidden={hidden || undefined}>
      {text}
    </p>
  );
}
