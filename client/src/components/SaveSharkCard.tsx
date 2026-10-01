// "Save as Shark Card" (owner decision 12), shown wherever a graded answer's
// explanation is: the quiz and daily-challenge review, the question of the
// day, a Learn answer, and the Challenge's game-over review.
//
// It saves what the server's grading already showed the learner: the question,
// its topic, the correct option and the explanation. Pressed again it takes
// the card back out. Cards belong to an account, so a signed-out visitor sees
// nothing here.
import { Link } from 'react-router-dom';
import { Button } from '@astryxdesign/core/Button';
import { useT } from '../i18n/LanguageContext';
import { friendlyError } from '../lib/api';
import { toSharkCard, useRemoveSharkCard, useSaveSharkCard, useSharkCardSaved, type GradedQuestion } from '../lib/sharkCards';
import { BookmarkIcon, CheckCircleIcon } from './ui/icons';
import './SharkCards.css';

export function SaveSharkCard({
  question,
  correctIndex,
  explanation,
}: {
  question: GradedQuestion;
  /** Index of the correct option in `question.options`, from the grading. */
  correctIndex: number;
  /** The server's explanation, from the grading. */
  explanation: string;
}) {
  const t = useT();
  const saved = useSharkCardSaved(question.id);
  const save = useSaveSharkCard();
  const remove = useRemoveSharkCard();
  if (saved === null || correctIndex < 0) return null;

  const busy = save.isPending || remove.isPending;
  // The press shows at once; a refusal puts it back and says so.
  const pressed = save.isPending ? true : remove.isPending ? false : saved;
  const failure = save.isError ? save.error : remove.isError ? remove.error : null;
  const toggle = () => {
    save.reset();
    remove.reset();
    if (saved) remove.mutate(question.id);
    else save.mutate({ ...toSharkCard(question, correctIndex, explanation), options: question.options, correctIndex });
  };

  return (
    <div className="sc-save" data-saved={pressed ? 'true' : 'false'}>
      <Button
        variant="secondary"
        size="sm"
        aria-pressed={pressed}
        icon={pressed ? <CheckCircleIcon size={16} /> : <BookmarkIcon size={16} />}
        label={pressed ? t('sharkCards.savedButton') : t('sharkCards.save')}
        isDisabled={busy}
        onClick={toggle}
      />
      {pressed && (
        <Link className="sc-save__link" to="/collection">{t('sharkCards.open')}</Link>
      )}
      {failure && (
        <p className="sc-save__error" role="alert">
          {save.isError ? t('sharkCards.saveFailed') : t('sharkCards.removeFailed')} {friendlyError(failure)}
        </p>
      )}
    </div>
  );
}

export default SaveSharkCard;
