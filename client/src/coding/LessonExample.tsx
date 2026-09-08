// A tiny interactive example inside a lesson (issue #162).
//
// Exploration, not assessment: nothing here is graded, nothing is recorded, and
// no XP or evidence comes out of it — the panel says so. The code runs through
// the same worker-isolated, time-bounded runner the coding tasks use, so it is
// never evaluated in the page's own context and never on the server.
//
// Where typing is the wrong interaction — a phone, a tablet between quizzes —
// the example offers the authored parameter choices and a read-only trace
// instead of an editor. An example that cannot be executed at all (a React
// render) is trace-only and says which it is.

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { Editor } from './Editor';
import { runCodeTests } from './runner/run-tests';
import { useIsCompactPractice } from '../lib/useMediaQuery';
import {
  EXAMPLE_MAX_OUTPUT_CHARS,
  EXAMPLE_MAX_OUTPUT_LINES,
  type LessonExample,
} from '../../../shared/lesson-examples';
import './Coding.css';

interface OutputLine { call: string; value: string }

export function LessonExamplePanel({ example }: { example: LessonExample }) {
  const { t, lang } = useLanguage();
  const baseId = useId();
  const compact = useIsCompactPractice();
  const [code, setCode] = useState(example.code);
  const [lines, setLines] = useState<OutputLine[] | null>(null);
  const [status, setStatus] = useState<'idle' | 'running' | 'timeout' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  // Leaving the lesson must not leave a worker running behind it.
  useEffect(() => () => abort.current?.abort(), []);
  useEffect(() => {
    setCode(example.code);
    setLines(null);
    setStatus('idle');
    setMessage(null);
  }, [example.id, example.code]);

  const run = useCallback(async (calls: string[], source: string) => {
    if (!example.runnable || calls.length === 0) return;
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setStatus('running');
    setMessage(null);
    const outcome = await runCodeTests({
      track: example.track === 'typescript' ? 'typescript' : 'javascript',
      code: source,
      tests: calls.map((call) => ({ call, expected: null })),
      grade: false,
      signal: controller.signal,
    });
    if (controller.signal.aborted) return;
    if (outcome.timedOut) {
      setStatus('timeout');
      setLines(null);
      return;
    }
    if (outcome.codeError) {
      setStatus('error');
      setMessage(outcome.codeError.slice(0, 200));
      setLines(null);
      return;
    }
    setStatus('idle');
    setLines(
      outcome.results
        .slice(0, EXAMPLE_MAX_OUTPUT_LINES)
        .map((result, index) => ({
          call: calls[index] ?? '',
          value: (result.actual ?? '').slice(0, Math.floor(EXAMPLE_MAX_OUTPUT_CHARS / EXAMPLE_MAX_OUTPUT_LINES)),
        })),
    );
  }, [example.runnable, example.track]);

  const reset = () => {
    abort.current?.abort();
    setCode(example.code);
    setLines(null);
    setStatus('idle');
    setMessage(null);
  };

  const showEditor = example.runnable && !compact;

  return (
    <section className="cd-example" aria-labelledby={`${baseId}-title`}>
      <h4 id={`${baseId}-title`}>{example.title[lang] || example.title.en}</h4>
      <p className="cd-note">{example.blurb[lang] || example.blurb.en}</p>
      <p className="cd-shortcuts">{t('coding.example.explorationNote')}</p>

      {showEditor ? (
        <>
          <label className="cd-editor-label" htmlFor={`${baseId}-editor`}>{t('coding.example.editorLabel')}</label>
          <div id={`${baseId}-editor`}>
            <Editor value={code} onChange={setCode} track={example.track === 'typescript' ? 'typescript' : 'javascript'} ariaLabel={t('coding.example.editorLabel')} />
          </div>
          <div className="cd-actions">
            <button type="button" className="cd-btn cd-btn--primary" disabled={status === 'running'} onClick={() => void run(example.calls, code)}>
              {status === 'running' ? t('coding.running') : t('coding.example.run')}
            </button>
            <button type="button" className="cd-btn cd-btn--quiet" onClick={reset} disabled={status === 'running'}>{t('coding.example.reset')}</button>
          </div>
        </>
      ) : (
        <pre className="cd-example__code">{example.code}</pre>
      )}

      {!showEditor && example.variants.length > 0 && (
        <div className="cd-chips" role="group" aria-label={t('coding.example.tryLabel')}>
          {example.variants.map((variant) => (
            <button
              key={variant.call}
              type="button"
              className="cd-chip"
              disabled={!example.runnable || status === 'running'}
              onClick={() => void run([variant.call], code)}
            >
              {variant.label[lang] || variant.label.en}
            </button>
          ))}
        </div>
      )}

      <h5 className="cd-editor-label">{t('coding.example.outputLabel')}</h5>
      {status === 'timeout' && <p className="cd-note cd-note--warn" role="status">{t('coding.example.timeout')}</p>}
      {status === 'error' && <p className="cd-note cd-note--error" role="status">{t('coding.example.error')} <code className="cd-inline-code">{message}</code></p>}
      {lines
        ? (
          <ul className="cd-example__output">
            {lines.map((line, index) => (
              <li key={index}><code>{line.call}</code> <span aria-hidden>→</span> <code>{line.value}</code></li>
            ))}
          </ul>
        )
        : (
          <>
            {!example.runnable && <p className="cd-shortcuts">{t('coding.example.traceOnly')}</p>}
            <ul className="cd-example__output">
              {example.trace.map((step, index) => (
                <li key={index}><code>{step.call}</code> <span aria-hidden>→</span> <code>{step.output}</code></li>
              ))}
            </ul>
          </>
        )}
    </section>
  );
}
