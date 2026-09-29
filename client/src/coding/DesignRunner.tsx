// System-design tasks have no editor. A guided walkthrough asks five
// questions in interview order; a drill asks one, in one of four formats.
// Answers are graded on the server against the key sealed in the session. The
// explanations and the correct options arrive with a passing verdict, never
// before and never with a failed one: that says only which answers were wrong.
import { useCallback, useId, useMemo, useState, type ReactNode } from 'react';
import { Kicker } from '../components/landing/LandingKit';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { RadioCard, RadioCardGroup } from '../components/ui/RadioCards';
import { ApiError } from '../lib/api';
import { submitCoding } from './api';
import { difficultyOf, type Localized, type PlayableCodingTask } from '../../../shared/coding-catalog';
import { DifficultyBadge } from './DifficultyBadge';
import type { CodingLockReason, CodingVerdictResponse, DesignAnswer } from '../../../shared/coding-api';
import './Coding.css';
import { Button } from '@astryxdesign/core/Button';

export interface DesignRunnerProps {
  task: PlayableCodingTask;
  session: string | null;
  locked: CodingLockReason | null;
  signedIn: boolean;
  mode: 'section' | 'lesson';
  onVerdict?: (verdict: CodingVerdictResponse) => void;
  onRetry?: () => void;
  nextHref?: string | null;
  backHref?: string;
  onContinue?: () => void;
}

export function DesignRunner({ task, session, locked, signedIn, mode, onVerdict, onRetry, nextHref, backHref, onContinue }: DesignRunnerProps) {
  const { t, lang } = useLanguage();
  const L = useCallback((value: Localized | undefined): string => (value ? value[lang] || value.en : ''), [lang]);
  const baseId = useId();
  const design = task.design;
  const drill = task.drill;
  const steps = design?.steps ?? [];
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<(DesignAnswer | null)[]>(() => steps.map(() => null));
  const [choice, setChoice] = useState<number | null>(null);
  const [estimate, setEstimate] = useState('');
  const [order, setOrder] = useState<number[]>(() => (drill?.steps ?? []).map((_, index) => index));
  const [verdict, setVerdict] = useState<CodingVerdictResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moved, setMoved] = useState('');

  const answered = useMemo(() => answers.filter((one) => one !== null).length, [answers]);
  const drillAnswer = useMemo((): DesignAnswer | null => {
    if (!drill) return null;
    if (drill.format === 'estimate') {
      const value = Number(estimate.replace(/[\s,]/g, ''));
      return estimate.trim() !== '' && Number.isFinite(value) ? value : null;
    }
    if (drill.format === 'sequence') return order;
    return choice;
  }, [drill, estimate, order, choice]);

  const submit = useCallback(async () => {
    if (!session || submitting) return;
    const payload: DesignAnswer[] = design ? answers.map((one) => (one ?? -1)) : drillAnswer !== null ? [drillAnswer] : [];
    if (design && answered < steps.length) return;
    if (!design && drillAnswer === null) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await submitCoding({ session, answers: payload });
      setVerdict(result);
      onVerdict?.(result);
    } catch (caught) {
      setError(caught instanceof ApiError && caught.code === 'invalid_session' ? t('coding.verdict.sessionExpired') : t('coding.verdict.submitError'));
    } finally {
      setSubmitting(false);
    }
  }, [session, submitting, design, answers, answered, steps.length, drillAnswer, onVerdict, t]);

  const move = (from: number, direction: -1 | 1) => {
    setOrder((prev) => {
      const to = from + direction;
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      [next[from], next[to]] = [next[to], next[from]];
      // Reordering is silent otherwise: say what moved and where it landed.
      setMoved(t('coding.design.moved', { step: L(drill!.steps![next[to]]), n: to + 1, total: next.length }));
      return next;
    });
  };

  const header = (
    <div className="cd-pane__head">
      <Kicker>{t('coding.track.system-design')} · {design ? t('coding.design.step', { n: Math.min(stepIndex + 1, steps.length), total: steps.length }) : t(`coding.design.format.${drill?.format ?? 'tradeoff'}` as never)}</Kicker>
      <h2>{L(task.title)}</h2>
      <div className="cd-pane__meta">
        <DifficultyBadge difficulty={difficultyOf(task)} />
        <span>{t('coding.minutes', { n: task.estimatedMinutes })}</span>
        {task.focus.map((tag) => <span key={tag} className="cd-tag">{tag}</span>)}
      </div>
    </div>
  );

  const verdictActions = verdict && (
    <div className="cd-verdict__actions">
      {verdict.verdict !== 'passed' && onRetry && <Button variant="secondary" onClick={onRetry} label={t('coding.design.tryAgain')} />}
      {verdict.verdict === 'passed' && mode === 'lesson' && onContinue && <Button variant="primary" onClick={onContinue} label={t('coding.lesson.continue')} />}
      {mode === 'section' && nextHref && <Button variant="primary" as={Link} href={nextHref} label={t('coding.verdict.next')} />}
      {mode === 'section' && backHref && <Button variant="secondary" as={Link} href={backHref} label={t('coding.verdict.back')} />}
    </div>
  );

  /** The learner's own answer to one step or drill, in words. */
  const answerText = (given: DesignAnswer | null, options: readonly Localized[]): ReactNode => {
    if (typeof given === 'number' && drill?.format === 'estimate') return `${given.toLocaleString(lang)}${drill.unit ? ` ${L(drill.unit)}` : ''}`;
    if (typeof given === 'number') return given >= 0 && options[given] ? L(options[given]) : null;
    if (Array.isArray(given) && drill?.steps) {
      return <ol className="cd-review__explanation" style={{ paddingLeft: 20 }}>{given.map((position) => <li key={position}>{L(drill.steps![position])}</li>)}</ol>;
    }
    return null;
  };

  /* ── review after grading ─────────────────────────────────────────── */
  if (verdict) {
    const correct = verdict.design?.filter((one) => one.correct).length ?? 0;
    const passed = verdict.verdict === 'passed';
    // A pass after a revealed solution says why it paid nothing.
    const label = passed && verdict.xpForfeited === true ? t('coding.verdict.passedNoXp') : t(`coding.verdict.${verdict.verdict}` as never);
    return (
      <div className="cd-design">
        <section className="cd-pane">
          <span className="cd-visually-hidden" role="status" aria-live="polite">{label}</span>
          {header}
          <section className={`cd-verdict cd-verdict--${verdict.verdict}`}>
            <h3 className="cd-verdict__title">
              <span>{label}</span>
              {verdict.xpAwarded > 0 && <span className="cd-verdict__xp">{t('coding.verdict.xp', { xp: verdict.xpAwarded })}</span>}
            </h3>
            {design && <p className="cd-verdict__row">{t('coding.design.score', { correct, total: steps.length })} · {t('coding.design.passMark', { n: design.passMark, total: steps.length })}</p>}
            {!passed && <p className="cd-verdict__row">{t('coding.design.failedNote')}</p>}
            {passed && !verdict.progress && <p className="cd-verdict__row">{signedIn ? t('coding.verdict.notRecorded') : t('coding.verdict.signIn')}</p>}
            {verdictActions}
          </section>
          <div className="cd-review">
            {(verdict.design ?? []).map((one, index) => {
              const step = steps[index];
              const options = step?.options ?? drill?.options ?? [];
              const given = one.given ?? (design ? answers[index] : drillAnswer);
              // Short of a pass the server sends which steps were right and
              // nothing of the key, so this says no more than that.
              if (!passed) {
                const answer = answerText(given, options);
                return (
                  <div key={index} className={`cd-review__step cd-review__step--${one.correct ? 'correct' : 'incorrect'}`}>
                    {step && <p className="cd-editor-label">{L(step.title)}: {L(step.prompt)}</p>}
                    <p className="cd-review__verdict">{one.correct ? t('coding.design.correct') : t('coding.design.incorrect')}</p>
                    {answer !== null && (Array.isArray(given)
                      ? <><p className="cd-review__explanation"><b>{t('coding.design.yourAnswer')}:</b></p>{answer}</>
                      : <p className="cd-review__explanation"><b>{t('coding.design.yourAnswer')}:</b> {answer}</p>)}
                  </div>
                );
              }
              return (
                <div key={index} className={`cd-review__step cd-review__step--${one.correct ? 'correct' : 'incorrect'}`}>
                  {step && <p className="cd-editor-label">{L(step.title)}: {L(step.prompt)}</p>}
                  <p className="cd-review__verdict">{one.correct ? t('coding.design.correct') : t('coding.design.incorrect')}</p>
                  {typeof one.correctIndex === 'number' && options[one.correctIndex] && (
                    <p className="cd-review__explanation"><b>{t('coding.design.correct')}:</b> {L(options[one.correctIndex])}{!one.correct && typeof given === 'number' && given >= 0 && options[given] ? <> · <span className="cd-result__label">{L(options[given])}</span></> : null}</p>
                  )}
                  {one.acceptedRange && <p className="cd-review__explanation">{t('coding.design.estimateRange', { min: one.acceptedRange.min.toLocaleString(lang), max: one.acceptedRange.max.toLocaleString(lang), answer: one.acceptedRange.answer.toLocaleString(lang) })}</p>}
                  {one.correctOrder && drill?.steps && (
                    <ol className="cd-review__explanation" style={{ paddingLeft: 20 }}>
                      {one.correctOrder.map((position) => <li key={position}>{L(drill.steps![position])}</li>)}
                    </ol>
                  )}
                  {one.explanation && <p className="cd-review__explanation">{L(one.explanation)}</p>}
                </div>
              );
            })}
          </div>
          {verdict.designReference && (
            <details>
              <summary className="cd-editor-label" style={{ cursor: 'pointer', minHeight: 44, display: 'flex', alignItems: 'center' }}>{t('coding.design.reference')}</summary>
              <p className="cd-reference">{L(verdict.designReference)}</p>
            </details>
          )}
        </section>
      </div>
    );
  }

  /* ── answering ───────────────────────────────────────────────────── */
  const current = steps[stepIndex];
  return (
    <div className="cd-design">
      <section className="cd-pane">
        {header}
        {locked && <p className="cd-note cd-note--warn">{t('coding.lockedTask')} {t(`coding.lock.${locked}` as never)}</p>}
        {!signedIn && mode === 'section' && <p className="cd-note">{t('coding.signInHint')}</p>}
        {design && (
          <details open={stepIndex === 0}>
            <summary className="cd-editor-label" style={{ cursor: 'pointer', minHeight: 44, display: 'flex', alignItems: 'center' }}>{t('coding.design.brief')}</summary>
            <p className="cd-design__brief">{L(design.scenario)}</p>
            <p className="cd-design__brief">{L(design.brief)}</p>
          </details>
        )}
        {drill && (
          <>
            <p className="cd-design__brief">{L(drill.scenario)}</p>
            <p className="cd-design__brief"><b>{L(drill.prompt)}</b></p>
          </>
        )}

        {design && current && (
          <div className="cd-design__step" key={current.key}>
            <h3 id={`${baseId}-q`} style={{ margin: 0 }}>{L(current.title)}</h3>
            <p className="cd-design__brief">{L(current.prompt)}</p>
            <RadioCardGroup value={answers[stepIndex] === null ? null : String(answers[stepIndex])} onChange={(value) => setAnswers((prev) => prev.map((one, i) => (i === stepIndex ? Number(value) : one)))} labelledBy={`${baseId}-q`}>
              {current.options.map((option, index) => (
                <RadioCard key={index} value={String(index)} index={index} label={L(option)}>{L(option)}</RadioCard>
              ))}
            </RadioCardGroup>
            <div className="cd-design__nav">
              <Button variant="secondary" onClick={() => setStepIndex((i) => Math.max(0, i - 1))} isDisabled={stepIndex === 0} label={t('coding.design.previous')} />
              {stepIndex < steps.length - 1
                ? <Button variant="primary" onClick={() => setStepIndex((i) => Math.min(steps.length - 1, i + 1))} isDisabled={answers[stepIndex] === null} label={t('coding.design.next')} />
                : <Button variant="primary" onClick={() => void submit()} isDisabled={!session || submitting || answered < steps.length} label={submitting ? t('coding.submitting') : t('coding.design.submit')} />}
            </div>
          </div>
        )}

        {drill && (
          <div className="cd-design__step">
            {drill.format === 'estimate' && (
              <div className="cd-estimate">
                <label className="cd-editor-label" htmlFor={`${baseId}-estimate`}>{t('coding.design.estimatePlaceholder')}</label>
                <input id={`${baseId}-estimate`} inputMode="decimal" value={estimate} onChange={(e) => setEstimate(e.target.value)} placeholder="0" />
                {drill.unit && <span>{L(drill.unit)}</span>}
              </div>
            )}
            {(drill.format === 'tradeoff' || drill.format === 'bottleneck') && drill.options && (
              <RadioCardGroup value={choice === null ? null : String(choice)} onChange={(value) => setChoice(Number(value))} label={L(drill.prompt)}>
                {drill.options.map((option, index) => (
                  <RadioCard key={index} value={String(index)} index={index} label={L(option)}>{L(option)}</RadioCard>
                ))}
              </RadioCardGroup>
            )}
            {drill.format === 'sequence' && drill.steps && (
              <>
                <p className="cd-editor-label">{t('coding.design.order')}</p>
                <span className="cd-visually-hidden" role="status" aria-live="polite">{moved}</span>
                <ol className="cd-sequence">
                  {order.map((original, position) => (
                    <li key={original}>
                      <span className="cd-sequence__n">{position + 1}</span>
                      <span>{L(drill.steps![original])}</span>
                      <Button variant="ghost" onClick={() => move(position, -1)} isDisabled={position === 0} label={`${t('coding.design.moveUp')}: ${L(drill.steps![original])}`}>↑</Button>
                      <Button variant="ghost" onClick={() => move(position, 1)} isDisabled={position === order.length - 1} label={`${t('coding.design.moveDown')}: ${L(drill.steps![original])}`}>↓</Button>
                    </li>
                  ))}
                </ol>
              </>
            )}
            <div className="cd-design__nav">
              <Button variant="primary" onClick={() => void submit()} isDisabled={!session || submitting || drillAnswer === null} label={submitting ? t('coding.submitting') : t('coding.design.submit')} />
            </div>
          </div>
        )}
        {error && <p className="cd-note cd-note--error" role="alert">{error}</p>}
      </section>
    </div>
  );
}
