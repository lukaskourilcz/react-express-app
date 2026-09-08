// Rendering for a learning-path lesson: prose, code, tables, callouts and the
// deterministic trace player.
//
// The trace is an affordance, never the only way to read the material. Every
// frame carries a sentence describing it, the whole sequence is also rendered
// as an ordered list of those sentences, and the marks that highlight cells
// carry a word as well as a border. Autoplay is opt-in and never starts under
// a reduced-motion preference.

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { runCodeTests } from '../../coding/runner/run-tests';
import { TermsBar } from '../ui/Terms';
import { useIsNarrowForEditor } from '../../lib/useMediaQuery';
import { useLanguage, useT } from '../../i18n/LanguageContext';
import type { LessonBody as LessonBodyDto, LessonSection, TraceSpec } from '../../../../shared/learning-path-api';
import type { Localized, LocalizedList } from '../../../../shared/learning-paths';

/** Inline `code` spans, matching how the coding workbench renders a prompt. */
export function RichText({ text }: { text: string }) {
  const paragraphs = text.split('\n\n');
  return (
    <>
      {paragraphs.map((paragraph, index) => (
        <p key={index}>
          {paragraph.split('`').map((part, partIndex) =>
            partIndex % 2 === 1 ? <code key={partIndex}>{part}</code> : <span key={partIndex}>{part}</span>,
          )}
        </p>
      ))}
    </>
  );
}

const STEP_MS = 1400;

function useLocalized() {
  const { lang } = useLanguage();
  return useCallback((value: Localized | undefined) => (value ? (lang === 'cs' ? value.cs || value.en : value.en) : ''), [lang]);
}

function useLocalizedList() {
  const { lang } = useLanguage();
  return useCallback(
    (value: LocalizedList | undefined): string[] => (value ? (lang === 'cs' && value.cs.length ? value.cs : value.en) : []),
    [lang],
  );
}

/**
 * A deterministic trace the learner steps through. Play/pause/step/reset, plus
 * the same sequence written out underneath so the whole thing is readable with
 * the player untouched.
 */
export function TracePlayer({ trace, caption }: { trace: TraceSpec; caption: string }) {
  const t = useT();
  const loc = useLocalized();
  const locList = useLocalizedList();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number | null>(null);
  const labelId = useId();

  const frames = trace.frames;
  const legend = locList(trace.legend);
  const reduceMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  useEffect(() => {
    if (!playing) return;
    if (index >= frames.length - 1) {
      setPlaying(false);
      return;
    }
    timer.current = window.setTimeout(() => setIndex((current) => Math.min(current + 1, frames.length - 1)), STEP_MS);
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [playing, index, frames.length]);

  const frame = frames[Math.min(index, frames.length - 1)];
  const roleWord = (role: string) => t(`paths.trace.role.${role}` as never);

  return (
    <figure className="lp-figure lp-trace" aria-labelledby={labelId}>
      <figcaption id={labelId}>{caption}</figcaption>

      <div className="lp-trace__cells" role="group" aria-label={caption}>
        {frame.cells.map((cell, cellIndex) => {
          const mark = frame.marks?.find((one) => one.index === cellIndex);
          return (
            <span
              key={cellIndex}
              className={`lp-trace__cell${mark ? ` lp-trace__cell--${mark.role}` : ''}`}
            >
              {legend[cellIndex] ? <span className="lp-trace__role">{legend[cellIndex]}</span> : null}
              {cell}
              {mark ? <span className="lp-trace__role">{roleWord(mark.role)}</span> : null}
            </span>
          );
        })}
      </div>

      {/* The live region carries the step description, so stepping through with
          the keyboard announces what changed rather than leaving it to sight. */}
      <p className="lp-trace__note" aria-live="polite">
        {loc(frame.note)}
        {frame.counter ? (
          <>
            {' '}
            <span className="lp-trace__counter">
              {loc(frame.counter.label)}: {frame.counter.value}
            </span>
          </>
        ) : null}
      </p>

      <div className="lp-trace__controls">
        <button
          type="button"
          className="lp-btn lp-btn--quiet"
          onClick={() => setIndex((current) => Math.max(0, current - 1))}
          disabled={index === 0}
        >
          {t('paths.trace.back')}
        </button>
        <button
          type="button"
          className="lp-btn lp-btn--quiet"
          onClick={() => setIndex((current) => Math.min(frames.length - 1, current + 1))}
          disabled={index >= frames.length - 1}
        >
          {t('paths.trace.step')}
        </button>
        {!reduceMotion && (
          <button
            type="button"
            className="lp-btn lp-btn--quiet"
            onClick={() => setPlaying((current) => !current)}
            disabled={index >= frames.length - 1 && !playing}
          >
            {playing ? t('paths.trace.pause') : t('paths.trace.play')}
          </button>
        )}
        <button
          type="button"
          className="lp-btn lp-btn--quiet"
          onClick={() => {
            setPlaying(false);
            setIndex(0);
          }}
          disabled={index === 0 && !playing}
        >
          {t('paths.trace.reset')}
        </button>
        <span className="lp-trace__step">
          {t('paths.trace.position', { current: index + 1, total: frames.length })}
        </span>
      </div>

      <details>
        <summary>{t('paths.trace.allSteps')}</summary>
        <ol className="lp-trace__steps">
          {frames.map((one, frameIndex) => (
            <li key={frameIndex}>
              {loc(one.note)}
              {one.counter ? ` (${loc(one.counter.label)}: ${one.counter.value})` : ''}
            </li>
          ))}
        </ol>
      </details>
    </figure>
  );
}

function Section({ section }: { section: LessonSection }) {
  const t = useT();
  const loc = useLocalized();
  const locList = useLocalizedList();

  switch (section.kind) {
    case 'prose':
      return <RichText text={loc(section.body)} />;
    case 'callout':
      return (
        <div className={`lp-callout${section.tone === 'warning' ? ' lp-callout--warning' : ''}`}>
          <span className="lp-callout__label">
            {section.tone === 'warning' ? t('paths.callout.warning') : t('paths.callout.note')}
          </span>
          <div>
            <RichText text={loc(section.body)} />
          </div>
        </div>
      );
    case 'code':
      return (
        <figure className="lp-figure">
          <pre>
            <code>{section.code}</code>
          </pre>
          <figcaption>{loc(section.caption)}</figcaption>
        </figure>
      );
    case 'table': {
      const headers = locList(section.headers);
      return (
        <figure className="lp-figure">
          <div className="lp-table-wrap">
            <table className="lp-table">
              <caption className="lp-visually-hidden">{loc(section.caption)}</caption>
              <thead>
                <tr>
                  {headers.map((header, index) => (
                    <th key={index} scope="col">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {section.rows.map((row, rowIndex) => {
                  const cells = locList(row);
                  return (
                    <tr key={rowIndex}>
                      {cells.map((cell, cellIndex) =>
                        cellIndex === 0 ? (
                          <th key={cellIndex} scope="row">
                            {cell}
                          </th>
                        ) : (
                          <td key={cellIndex}>{cell}</td>
                        ),
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <figcaption>{loc(section.caption)}</figcaption>
        </figure>
      );
    }
    case 'trace':
      return <TracePlayer trace={section.trace} caption={loc(section.caption)} />;
    case 'example':
      return <InteractiveExample section={section} />;
  }
}

/**
 * A snippet the learner can change and run.
 *
 * Exploration, and it says so: nothing is graded, nothing is recorded, and
 * running it proves nothing about mastery. It exists because changing a loop
 * and watching the output change teaches more than a paragraph about loops.
 *
 * The code runs in the same bounded, isolated worker the Run button uses —
 * never in the page itself and never on the server. On a narrow screen the
 * editor is not offered at all: the snippet stays readable and runnable, and
 * the typing waits for a keyboard, the same policy a coding task follows.
 */
function InteractiveExample({ section }: { section: Extract<LessonSection, { kind: 'example' }> }) {
  const t = useT();
  const loc = useLocalized();
  const narrow = useIsNarrowForEditor();
  const [code, setCode] = useState(section.code);
  const [output, setOutput] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const labelId = useId();

  const run = useCallback(async () => {
    setRunning(true);
    setError(null);
    try {
      const outcome = await runCodeTests({ track: 'javascript', code, tests: [], grade: false });
      setOutput(outcome.logs);
      setError(outcome.codeError);
    } finally {
      setRunning(false);
    }
  }, [code]);

  return (
    <figure className="lp-figure lp-example">
      <figcaption id={labelId}>{loc(section.caption)}</figcaption>
      {narrow ? (
        <pre className="lp-code"><code>{code}</code></pre>
      ) : (
        <>
          <label className="lp-visually-hidden" htmlFor={`${labelId}-editor`}>{loc(section.caption)}</label>
          <textarea
            id={`${labelId}-editor`}
            className="lp-example__editor"
            spellCheck={false}
            rows={Math.min(16, code.split('\n').length + 1)}
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
        </>
      )}
      <div className="lp-example__actions">
        <button type="button" className="lp-btn" disabled={running} onClick={() => void run()}>
          {running ? t('paths.example.running') : t('paths.example.run')}
        </button>
        <button
          type="button"
          className="lp-btn lp-btn--quiet"
          disabled={running || code === section.code}
          onClick={() => { setCode(section.code); setOutput(null); setError(null); }}
        >
          {t('paths.example.reset')}
        </button>
      </div>
      {error && <p className="lp-notice lp-notice--error" role="alert">{error}</p>}
      {output !== null && !error && (
        <pre className="lp-example__output" role="status" aria-live="polite">
          {output.length > 0 ? output.join('\n') : t('paths.example.noOutput')}
        </pre>
      )}
      <p className="lp-example__note">{loc(section.note)}</p>
    </figure>
  );
}

export function LessonView({ lesson }: { lesson: LessonBodyDto }) {
  const t = useT();
  const loc = useLocalized();
  return (
    <article className="lp-lesson">
      <h2>{loc(lesson.title)}</h2>
      {lesson.sections.map((section, index) => (
        <Section key={index} section={section} />
      ))}
      {/* One control for the page: the abbreviations its prose actually uses,
          explained where the learner meets them. */}
      <TermsBar
        texts={lesson.sections.flatMap((section) =>
          section.kind === 'prose' || section.kind === 'callout'
            ? [loc(section.body)]
            : section.kind === 'code' || section.kind === 'example'
              ? [loc(section.caption)]
              : [])}
      />
      {lesson.sources.length > 0 && (
        <section className="lp-section">
          <h3>{t('paths.lesson.sources')}</h3>
          <ul className="lp-sources">
            {lesson.sources.map((source) => (
              <li key={source.url}>
                <a href={source.url} target="_blank" rel="noreferrer noopener">
                  {source.label}
                </a>{' '}
                {t('paths.lesson.checkedOn', { date: source.reviewedOn })}
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
