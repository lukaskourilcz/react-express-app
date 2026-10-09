import type { CodingVerdictResponse } from '../../../shared/coding-api';
import { useLanguage } from '../i18n/LanguageContext';

/** One line under a verified pass about earning the task's XP again
 * (migration 058): after a reset, from an hour after the task last paid its
 * XP. It says why this pass paid nothing when the reason is the rule, and
 * stays out of the way of a pass after a reveal, whose title already says so. */
export function RepeatXpNote({ verdict }: { verdict: CodingVerdictResponse }) {
  const { t } = useLanguage();
  const repeat = verdict.repeatXp;
  if (verdict.verdict !== 'passed' || !repeat || verdict.xpForfeited) return null;
  const time = repeat.availableAt
    ? new Date(repeat.availableAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;
  const line = repeat.withheld === 'reset'
    ? t('coding.repeat.needsReset')
    : repeat.withheld === 'cooldown' && time
      ? t('coding.repeat.cooldown', { time })
      : time ? t('coding.repeat.next', { time }) : null;
  return line ? <p className="cd-verdict__row">{line}</p> : null;
}
