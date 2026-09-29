// The four activity views a learning-path workspace can show: a lesson, an
// objective check, a code exercise and a written artifact.
//
// They are path-neutral on purpose — the FDE specialization and the DSA
// Foundations skill path render the same components — and none of them decides
// anything. Each collects a submission, hands it to the server, and renders
// the verdict the server sent back.

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Editor } from '../../coding/Editor';
import { useT } from '../../i18n/LanguageContext';
import { LessonView, RichText } from './LessonBody';
import { useLoc, useLocList } from './localized';
import type {
  CheckQuestionPayload,
  CheckQuestionVerdict,
  CriterionResult,
  PathArtifactPayload,
  PathCodePayload,
  PathDraft,
  StartActivityResponse,
  SubmitActivityResponse,
} from '../../../../shared/learning-path-api';
import type { EvidenceState, Localized } from '../../../../shared/learning-paths';
import { Button } from '@astryxdesign/core/Button';

/* ── shared bits ───────────────────────────────────────────────────────── */

const STATE_GLYPH: Record<EvidenceState, string> = {
  not_started: '○',
  in_progress: '◐',
  verified_pass: '✓',
  self_reviewed: '✎',
  needs_revision: '↻',
};

/** The evidence state, always as a glyph plus words — never colour alone. */
export function StateBadge({ state }: { state: EvidenceState }) {
  const t = useT();
  return (
    <span className={`lp-state lp-state--${state}`}>
      <span className="lp-state__glyph" aria-hidden="true">
        {STATE_GLYPH[state]}
      </span>
      {t(`paths.state.${state}` as never)}
    </span>
  );
}

export function CriteriaList({ criteria }: { criteria: CriterionResult[] }) {
  const t = useT();
  const loc = useLoc();
  if (criteria.length === 0) return null;
  return (
    <ul className="lp-criteria">
      {criteria.map((criterion) => (
        <li key={criterion.id} className={`lp-criterion lp-criterion--${criterion.passed ? 'passed' : 'failed'}`}>
          <span className="lp-criterion__mark" aria-hidden="true">
            {criterion.passed ? '✓' : '✗'}
          </span>
          <div className="lp-criterion__body">
            <span className="lp-criterion__label">
              {loc(criterion.label)}
              <span className="ss-sr-only">
                {' '}
                — {criterion.passed ? t('paths.criterion.passed') : t('paths.criterion.failed')}
              </span>
            </span>
            {criterion.critical && <span className="lp-criterion__critical">{t('paths.criterion.critical')}</span>}
            {!criterion.passed && criterion.detail && <p className="lp-criterion__detail">{loc(criterion.detail)}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Feedback({ feedback }: { feedback: Localized[] }) {
  const loc = useLoc();
  if (feedback.length === 0) return null;
  return (
    <div className="lp-notice lp-notice--info">
      <span className="lp-notice__glyph" aria-hidden="true">
        ℹ
      </span>
      <div>
        {feedback.map((entry, index) => (
          <p key={index} style={{ margin: index === 0 ? 0 : '8px 0 0' }}>
            {loc(entry)}
          </p>
        ))}
      </div>
    </div>
  );
}

/* ── lesson ────────────────────────────────────────────────────────────── */

export function LessonActivity({
  activity,
  onAcknowledge,
  busy,
  acknowledged,
}: {
  activity: StartActivityResponse;
  onAcknowledge: () => void;
  busy: boolean;
  acknowledged: boolean;
}) {
  const t = useT();
  if (!activity.lesson) return null;
  return (
    <div className="lp-workspace">
      <LessonView lesson={activity.lesson} />
      <div className="lp-actions">
        <span className="lp-actions__status">{t('paths.lesson.notGated')}</span>
        <Button variant="primary" onClick={onAcknowledge} isDisabled={busy || acknowledged} label={acknowledged ? t('paths.lesson.marked') : t('paths.lesson.markRead')} />
      </div>
    </div>
  );
}

/* ── objective check ───────────────────────────────────────────────────── */

export function CheckActivity({
  questions,
  passThreshold,
  domains,
  domainThreshold,
  result,
  onSubmit,
  onRetry,
  retryNeeded = false,
  busy,
}: {
  questions: CheckQuestionPayload[];
  passThreshold: number;
  domains: string[] | undefined;
  /** The share each domain needs on its own, which the server lowers for a
   * domain with only a few questions. */
  domainThreshold?: number;
  result: SubmitActivityResponse | null;
  onSubmit: (answers: number[]) => void;
  /** Starts the check again: a new attempt deals the questions afresh. */
  onRetry: () => void;
  /** The attempt cannot take this submission (expired, or already graded), so
   * the way on is a new one rather than Submit. */
  retryNeeded?: boolean;
  busy: boolean;
}) {
  const t = useT();
  const loc = useLoc();
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const groupName = useId();

  useEffect(() => {
    setAnswers(questions.map(() => null));
  }, [questions]);

  const verdicts = useMemo(() => {
    const map = new Map<string, CheckQuestionVerdict>();
    for (const verdict of result?.questions ?? []) map.set(verdict.questionId, verdict);
    return map;
  }, [result]);

  const answered = answers.filter((one) => one !== null).length;
  const graded = verdicts.size > 0;

  return (
    <div className="lp-check">
      <div className="lp-notice">
        <span className="lp-notice__glyph" aria-hidden="true">
          ◉
        </span>
        <span>
          {t('paths.check.threshold', { percent: Math.round(passThreshold * 100) })}
          {domains?.length ? ` ${t('paths.check.domainGate', { percent: Math.round((domainThreshold ?? passThreshold) * 100) })}` : ''}
        </span>
      </div>

      {questions.map((question, index) => {
        const verdict = verdicts.get(question.id);
        return (
          <fieldset key={question.id} className="lp-question" style={{ border: 0, margin: 0, padding: 0 }}>
            <legend className="lp-question__prompt">
              {t('paths.check.questionNumber', { current: index + 1, total: questions.length })} — {loc(question.prompt)}
            </legend>
            {question.context && (
              <pre className="lp-question__context">
                <code>{question.context.code}</code>
              </pre>
            )}
            <div className="lp-options">
              {question.options.map((option, optionIndex) => {
                const chosen = answers[index] === optionIndex;
                // After a failed project check the server names only the
                // questions that were wrong, so the one option known to be
                // right is the learner's own right answer.
                const isCorrect = verdict && (verdict.correctIndex === undefined
                  ? chosen && verdict.correct
                  : verdict.correctIndex === optionIndex);
                const isWrongChoice = verdict && chosen && !verdict.correct;
                const className = [
                  'lp-option',
                  chosen && !graded ? 'lp-option--chosen' : '',
                  isCorrect ? 'lp-option--correct' : '',
                  isWrongChoice ? 'lp-option--wrong' : '',
                ]
                  .filter(Boolean)
                  .join(' ');
                return (
                  <label key={optionIndex} className={className}>
                    <input
                      type="radio"
                      name={`${groupName}-${index}`}
                      checked={chosen}
                      disabled={graded || busy}
                      onChange={() =>
                        setAnswers((current) => current.map((one, position) => (position === index ? optionIndex : one)))
                      }
                    />
                    <span>
                      {graded && (isCorrect || isWrongChoice) ? (
                        <span className="lp-option__mark" aria-hidden="true">
                          {isCorrect ? '✓ ' : '✗ '}
                        </span>
                      ) : null}
                      {loc(option)}
                      {graded && isCorrect && <span className="ss-sr-only"> — {t('paths.check.correctAnswer')}</span>}
                      {graded && isWrongChoice && <span className="ss-sr-only"> — {t('paths.check.yourAnswer')}</span>}
                    </span>
                  </label>
                );
              })}
            </div>
            {verdict?.explanation && <p className="lp-explanation">{loc(verdict.explanation)}</p>}
            {verdict && !verdict.explanation && !verdict.correct && (
              <p className="lp-explanation">{t('paths.check.answerWithheld')}</p>
            )}
          </fieldset>
        );
      })}

      {graded || retryNeeded ? (
        // A graded check is retried as a new attempt, as often as the learner
        // likes; the threshold note above says so.
        <div className="lp-actions">
          <Button variant={graded ? 'secondary' : 'primary'} isDisabled={busy} onClick={onRetry} label={t('error.tryAgain')} />
        </div>
      ) : (
        <div className="lp-actions">
          <span className="lp-actions__status">
            {t('paths.check.answered', { answered, total: questions.length })}
          </span>
          <Button variant="primary" isDisabled={busy || answered < questions.length} onClick={() => onSubmit(answers.map((one) => one ?? 0))} label={busy ? t('paths.action.submitting') : t('paths.action.submit')} />
        </div>
      )}
    </div>
  );
}

/* ── code exercise ─────────────────────────────────────────────────────── */

const DRAFT_DEBOUNCE_MS = 900;
export type DraftStatus = 'idle' | 'saving' | 'saved' | 'error' | 'conflict' | 'offline';

export function CodeActivity({
  code,
  draft,
  result,
  onSubmit,
  onDraft,
  draftStatus,
  busy,
}: {
  code: PathCodePayload;
  draft: PathDraft | null;
  result: SubmitActivityResponse | null;
  onSubmit: (source: string) => void;
  onDraft: (source: string) => void;
  draftStatus: DraftStatus;
  busy: boolean;
}) {
  const t = useT();
  const loc = useLoc();
  const locList = useLocList();
  const [source, setSource] = useState<string>(() => (typeof draft?.content.code === 'string' ? draft.content.code : code.starter));
  const [hintsShown, setHintsShown] = useState(0);
  const timer = useRef<number | null>(null);

  const hints = locList(code.hints);
  const approach = locList(code.approach);
  const contract = locList(code.contract);
  // The ladder is hints, then the approach steps, then the skeleton. The
  // reference implementation is not part of it: a path exercise has no reveal.
  const ladder = useMemo(
    () => [...hints.map((text) => ({ kind: 'hint' as const, text })), ...approach.map((text) => ({ kind: 'approach' as const, text }))],
    [hints, approach],
  );

  const queueDraft = useCallback(
    (next: string) => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => onDraft(next), DRAFT_DEBOUNCE_MS);
    },
    [onDraft],
  );

  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);

  const verdict = result?.code ?? null;

  return (
    <div className="lp-split">
      <div className="lp-split__brief">
        <div className="lp-brief lp-card">
          <RichText text={loc(code.prompt)} />
          {contract.length > 0 && (
            <section className="lp-section">
              <h3>{t('paths.code.contract')}</h3>
              <ul className="lp-list">
                {contract.map((entry, index) => (
                  <li key={index}>{entry}</li>
                ))}
              </ul>
            </section>
          )}
          {ladder.length > 0 && (
            <section className="lp-section">
              <h3>{t('paths.code.hints')}</h3>
              <ol className="lp-list">
                {ladder.slice(0, hintsShown).map((rung, index) => (
                  <li key={index}>{rung.text}</li>
                ))}
              </ol>
              {hintsShown < ladder.length && (
                <Button variant="ghost" onClick={() => setHintsShown((n) => n + 1)} label={t('paths.code.nextHint', { remaining: ladder.length - hintsShown })} />
              )}
              {code.skeleton && hintsShown >= ladder.length && (
                <details>
                  <summary>{t('paths.code.skeleton')}</summary>
                  <pre className="lp-question__context">
                    <code>{code.skeleton}</code>
                  </pre>
                </details>
              )}
            </section>
          )}
        </div>
      </div>

      <div className="lp-work">
        <div className="lp-actions">
          <span className="lp-actions__status" aria-live="polite">
            {t(`paths.draft.${draftStatus}` as never)}
          </span>
          <Button variant="ghost" onClick={() => {
              setSource(code.starter);
              queueDraft(code.starter);
            }} isDisabled={busy} label={t('paths.code.reset')} />
          <Button variant="primary" onClick={() => onSubmit(source)} isDisabled={busy || source.trim().length === 0} label={busy ? t('paths.action.submitting') : t('paths.action.submit')} />
        </div>

        <Editor
          value={source}
          onChange={(next) => {
            setSource(next);
            queueDraft(next);
          }}
          track={code.language === 'typescript' ? 'typescript' : code.language === 'react' ? 'react' : 'javascript'}
          ariaLabel={t('paths.code.editorLabel')}
          readOnly={busy}
          minHeight={320}
        />

        {code.tests && code.tests.length > 0 && (
          <section className="lp-section lp-card lp-card--muted">
            <h3>{t('paths.code.visibleTests')}</h3>
            <ul className="lp-results">
              {code.tests.map((test, index) => {
                const outcome = verdict?.results[index];
                return (
                  <li key={index} className="lp-result">
                    <span className="lp-result__mark" aria-hidden="true">
                      {outcome ? (outcome.pass ? '✓' : '✗') : '·'}
                    </span>
                    <code>{test.call}</code>
                    {test.label && <span>— {loc(test.label)}</span>}
                    {outcome && (
                      <span className="ss-sr-only">
                        {outcome.pass ? t('paths.code.testPassed') : t('paths.code.testFailed')}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
            {verdict?.hidden && (
              <p className="lp-field__help">
                {t('paths.code.hiddenTests', { passed: verdict.hidden.passed, total: verdict.hidden.total })}
              </p>
            )}
          </section>
        )}

        {verdict?.codeError && (
          <div className="lp-notice lp-notice--error">
            <span className="lp-notice__glyph" aria-hidden="true">
              !
            </span>
            <span>{verdict.codeError}</span>
          </div>
        )}
        {verdict && verdict.logs.length > 0 && (
          <details>
            <summary>{t('paths.code.console')}</summary>
            <pre className="lp-console">{verdict.logs.join('\n')}</pre>
          </details>
        )}
      </div>
    </div>
  );
}

/* ── written artifact ──────────────────────────────────────────────────── */

export function ArtifactActivity({
  artifact,
  rubric,
  draft,
  result,
  onSubmit,
  onDraft,
  draftStatus,
  busy,
}: {
  artifact: PathArtifactPayload;
  rubric: { id: string; title: Localized; levels: Record<string, Localized> }[];
  draft: PathDraft | null;
  result: SubmitActivityResponse | null;
  onSubmit: (values: Record<string, string | string[]>) => void;
  onDraft: (values: Record<string, string | string[]>) => void;
  draftStatus: DraftStatus;
  busy: boolean;
}) {
  const t = useT();
  const loc = useLoc();
  const initial = useMemo(() => {
    const saved = (draft?.content.artifact ?? {}) as Record<string, string | string[]>;
    const out: Record<string, string> = {};
    for (const field of artifact.fields) {
      const value = saved[field.id];
      out[field.id] = Array.isArray(value) ? value.join('\n') : typeof value === 'string' ? value : '';
    }
    return out;
  }, [artifact.fields, draft]);
  const [values, setValues] = useState<Record<string, string>>(initial);
  const timer = useRef<number | null>(null);

  const shaped = useCallback(
    (next: Record<string, string>): Record<string, string | string[]> => {
      const out: Record<string, string | string[]> = {};
      for (const field of artifact.fields) {
        const raw = next[field.id] ?? '';
        out[field.id] = field.kind === 'list' ? raw.split('\n').map((one) => one.trim()).filter(Boolean) : raw;
      }
      return out;
    },
    [artifact.fields],
  );

  const change = (id: string, value: string) => {
    setValues((current) => {
      const next = { ...current, [id]: value };
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => onDraft(shaped(next)), DRAFT_DEBOUNCE_MS);
      return next;
    });
  };

  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);

  return (
    <div className="lp-split">
      <div className="lp-split__brief">
        <div className="lp-brief lp-card">
          <RichText text={loc(artifact.brief)} />
          <div className="lp-notice lp-notice--info">
            <span className="lp-notice__glyph" aria-hidden="true">
              ✎
            </span>
            <span>{t('paths.artifact.selfReviewed')}</span>
          </div>
          {rubric.length > 0 && (
            <section className="lp-section">
              <h3>{t('paths.artifact.rubric')}</h3>
              <div className="lp-rubric">
                {rubric.map((dimension) => (
                  <div key={dimension.id} className="lp-rubric__dimension">
                    <strong>{loc(dimension.title)}</strong>
                    <dl className="lp-rubric__levels">
                      {(['missing', 'partial', 'adequate', 'strong'] as const).map((level) => (
                        <div key={level} style={{ display: 'contents' }}>
                          <dt>{t(`paths.rubric.${level}` as never)}</dt>
                          <dd>{loc(dimension.levels[level])}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      <div className="lp-work">
        <div className="lp-actions">
          <span className="lp-actions__status" aria-live="polite">
            {t(`paths.draft.${draftStatus}` as never)}
          </span>
          <Button variant="primary" onClick={() => onSubmit(shaped(values))} isDisabled={busy} label={busy ? t('paths.action.submitting') : t('paths.action.submit')} />
        </div>

        <div className="lp-fields">
          {artifact.fields.map((field) => {
            const value = values[field.id] ?? '';
            const over = value.length > field.maxLength;
            const failed = result?.criteria.find((one) => one.id === `field:${field.id}` && !one.passed);
            return (
              <div key={field.id} className="lp-field">
                <label className="lp-field__label" htmlFor={`lp-field-${field.id}`}>
                  {loc(field.label)}
                  {!field.required && <span className="lp-criterion__critical">{t('paths.artifact.optional')}</span>}
                </label>
                <p className="lp-field__help" id={`lp-help-${field.id}`}>
                  {loc(field.help)}
                </p>
                {field.kind === 'long-text' || field.kind === 'list' ? (
                  <textarea
                    id={`lp-field-${field.id}`}
                    aria-describedby={`lp-help-${field.id}`}
                    value={value}
                    onChange={(event) => change(field.id, event.target.value)}
                    rows={field.kind === 'list' ? 6 : 10}
                    disabled={busy}
                  />
                ) : (
                  <input
                    id={`lp-field-${field.id}`}
                    aria-describedby={`lp-help-${field.id}`}
                    type={field.kind === 'url' ? 'url' : 'text'}
                    value={value}
                    onChange={(event) => change(field.id, event.target.value)}
                    disabled={busy}
                  />
                )}
                <span className={`lp-field__count${over ? ' lp-field__count--over' : ''}`}>
                  {t('paths.artifact.count', { used: value.length, max: field.maxLength })}
                </span>
                {failed?.detail && <p className="lp-field__help">{loc(failed.detail)}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
