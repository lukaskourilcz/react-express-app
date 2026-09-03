// System-design tasks have no editor. A guided walkthrough asks five
// questions in interview order; a drill asks one, in one of four formats.
// Answers are graded on the server against the key sealed in the session, so
// the explanation and the correct option arrive with the verdict, never before.
import { useCallback, useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { RadioCard, RadioCardGroup } from '../components/ui/RadioCards';
import { ApiError } from '../lib/api';
import { submitCoding } from './api';
import type { Localized, PlayableCodingTask } from '../../../shared/coding-catalog';
import type { CodingLockReason, CodingVerdictResponse, DesignAnswer } from '../../../shared/coding-api';
import './Coding.css';

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
      <span className="ss-kicker">{t('coding.track.system-design')} · {design ? t('coding.design.step', { n: Math.min(stepIndex + 1, steps.length), total: steps.length }) : t(`coding.design.format.${drill?.format ?? 'tradeoff'}` as never)}</span>
      <h2>{L(task.title)}</h2>
      <div className="cd-pane__meta">
        <span>{t('coding.minutes', { n: task.estimatedMinutes })}</span>
        {task.focus.map((tag) => <span key={tag} className="cd-tag">{tag}</span>)}
      </div>
    </div>
  );

  const verdictActions = verdict && (
    <div className="cd-verdict__actions">
      {verdict.verdict !== 'passed' && onRetry && <button type="button" className="cd-btn" onClick={onRetry}>{t('coding.design.tryAgain')}</button>}
      {verdict.verdict === 'passed' && mode === 'lesson' && onContinue && <button type="button" className="cd-btn cd-btn--primary" onClick={onContinue}>{t('coding.lesson.continue')}</button>}
      {mode === 'section' && nextHref && <Link className="cd-btn cd-btn--primary" to={nextHref}>{t('coding.verdict.next')}</Link>}
      {mode === 'section' && backHref && <Link className="cd-btn" to={backHref}>{t('coding.verdict.back')}</Link>}
    </div>
  );

  /* ── review after grading ─────────────────────────────────────────── */
  if (verdict) {
    const correct = verdict.design?.filter((one) => one.correct).length ?? 0;
    return (
      <div className="cd-design">
        <section className="cd-pane">
          <span className="cd-visually-hidden" role="status" aria-live="polite">{t(`coding.verdict.${verdict.verdict}` as never)}</span>
          {header}
          <section className={`cd-verdict cd-verdict--${verdict.verdict}`}>
            <h3 className="cd-verdict__title">
              <span>{t(`coding.verdict.${verdict.verdict}` as never)}</span>
              {verdict.xpAwarded > 0 && <span className="cd-verdict__xp">{t('coding.verdict.xp', { xp: verdict.xpAwarded })}</span>}
            </h3>
            {design && <p className="cd-verdict__row">{t('coding.design.score', { correct, total: steps.length })} · {t('coding.design.passMark', { n: design.passMark, total: steps.length })}</p>}
            {verdict.verdict === 'passed' && !verdict.progress && <p className="cd-verdict__row">{signedIn ? t('coding.verdict.notRecorded') : t('coding.verdict.signIn')}</p>}
            {verdictActions}
          </section>
          <div className="cd-review">
            {(verdict.design ?? []).map((one, index) => {
              const step = steps[index];
              const options = step?.options ?? drill?.options ?? [];
              const given = design ? answers[index] : drillAnswer;
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
                  <p className="cd-review__explanation">{L(one.explanation)}</p>
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
              <button type="button" className="cd-btn" onClick={() => setStepIndex((i) => Math.max(0, i - 1))} disabled={stepIndex === 0}>{t('coding.design.previous')}</button>
              {stepIndex < steps.length - 1
                ? <button type="button" className="cd-btn cd-btn--primary" onClick={() => setStepIndex((i) => Math.min(steps.length - 1, i + 1))} disabled={answers[stepIndex] === null}>{t('coding.design.next')}</button>
                : <button type="button" className="cd-btn cd-btn--primary" onClick={() => void submit()} disabled={!session || submitting || answered < steps.length}>{submitting ? t('coding.submitting') : t('coding.design.submit')}</button>}
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
                      <button type="button" className="cd-btn cd-btn--quiet" onClick={() => move(position, -1)} disabled={position === 0} aria-label={`${t('coding.design.moveUp')}: ${L(drill.steps![original])}`}>↑</button>
                      <button type="button" className="cd-btn cd-btn--quiet" onClick={() => move(position, 1)} disabled={position === order.length - 1} aria-label={`${t('coding.design.moveDown')}: ${L(drill.steps![original])}`}>↓</button>
                    </li>
                  ))}
                </ol>
              </>
            )}
            <div className="cd-design__nav">
              <button type="button" className="cd-btn cd-btn--primary" onClick={() => void submit()} disabled={!session || submitting || drillAnswer === null}>{submitting ? t('coding.submitting') : t('coding.design.submit')}</button>
            </div>
          </div>
        )}
        {error && <p className="cd-note cd-note--error" role="alert">{error}</p>}
      </section>
    </div>
  );
}
