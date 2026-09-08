// The code-ordering puzzle (issue #154).
//
// Blocks arrive shuffled from the server. The learner builds the solution by
// tapping a block to move it between the two lists and by moving it up or down;
// every one of those is a real button, so the whole puzzle works by touch, by
// keyboard and with a screen reader. Dragging is deliberately not implemented:
// it would be the least accessible way to do exactly this.
//
// The arrangement is graded on the server against the sealed permutation. What
// comes back says how far the arrangement is right, never which block is wrong,
// and it is labelled for what it is: reading and ordering code, not writing it.

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { readJSON, writeJSON } from '../lib/storage';
import { ApiError } from '../lib/api';
import { submitCodingPuzzle } from './api';
import type { CodingPuzzleVerdict, PlayableCodingPuzzle } from '../../../shared/coding-puzzle';
import type { TranslationKey } from '../i18n/translations';
import './Coding.css';

export interface CodePuzzleProps {
  puzzle: PlayableCodingPuzzle;
  session: string | null;
  signedIn: boolean;
  onVerdict?: (verdict: CodingPuzzleVerdict) => void;
  /** Rendered under the verdict when the puzzle satisfied a Learn level. */
  onContinue?: () => void;
}

const draftKey = (taskId: string) => `devshark:coding:puzzle:${taskId}`;

/** The presented block ids are positional (`b0`, `b1`, …), so they are the same
 * for every shuffle of the same puzzle. A saved arrangement is only meaningful
 * for the shuffle it was made in, so it is stored with a fingerprint of the
 * order the blocks arrived in and dropped when that changes. */
const fingerprintOf = (puzzle: PlayableCodingPuzzle): string =>
  `${puzzle.version}:${puzzle.blocks.map((block) => block.code).join('\u0000')}`;

interface PuzzleDraft {
  fingerprint: string;
  order: string[];
}

export function CodePuzzle({ puzzle, session, signedIn, onVerdict, onContinue }: CodePuzzleProps) {
  const { t } = useLanguage();
  const baseId = useId();
  const startedAt = useRef(Date.now());

  const blockById = useMemo(() => new Map(puzzle.blocks.map((block) => [block.id, block])), [puzzle.blocks]);
  const allIds = useMemo(() => puzzle.blocks.map((block) => block.id), [puzzle.blocks]);

  const fingerprint = useMemo(() => fingerprintOf(puzzle), [puzzle]);
  const [used, setUsed] = useState<string[]>(() => {
    const saved = readJSON<PuzzleDraft | null>(draftKey(puzzle.taskId), null);
    if (!saved || saved.fingerprint !== fingerprint || !Array.isArray(saved.order)) return [];
    return saved.order.filter((id) => allIds.includes(id));
  });
  const [busy, setBusy] = useState(false);
  const [verdict, setVerdict] = useState<CodingPuzzleVerdict | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  // Every control here removes itself: a block moves to the other list, or
  // reaching an end disables the arrow that was just pressed. Without this the
  // keyboard falls back to the top of the page after every single move.
  const rowRefs = useRef(new Map<string, HTMLLIElement | null>());
  const [pendingFocus, setPendingFocus] = useState<{ id: string; control: string } | null>(null);
  useEffect(() => {
    if (!pendingFocus) return;
    const row = rowRefs.current.get(pendingFocus.id);
    const wanted = row?.querySelector<HTMLButtonElement>(`button[data-control="${pendingFocus.control}"]:not([disabled])`);
    (wanted ?? row?.querySelector<HTMLButtonElement>('button:not([disabled])'))?.focus();
    setPendingFocus(null);
  }, [pendingFocus]);

  useEffect(() => {
    writeJSON(draftKey(puzzle.taskId), { fingerprint, order: used } satisfies PuzzleDraft);
  }, [used, fingerprint, puzzle.taskId]);

  const available = allIds.filter((id) => !used.includes(id));

  const announce = useCallback((key: TranslationKey, vars?: Record<string, string | number>) => {
    setAnnouncement((prev) => {
      const text = t(key, vars);
      // A live region speaks when its text changes, so the same message twice
      // in a row — two removals, two moves — is silent. A zero-width space,
      // toggled on and off, changes the text without changing what is read.
      return prev.replace(/\u200b$/, '') === text ? `${text}\u200b` : text;
    });
  }, [t]);

  const add = (id: string) => {
    setUsed((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setVerdict(null);
    setPendingFocus({ id, control: 'remove' });
    announce('coding.puzzle.added', { n: used.length + 1 });
  };
  const remove = (id: string) => {
    setUsed((prev) => prev.filter((one) => one !== id));
    setVerdict(null);
    setPendingFocus({ id, control: 'add' });
    announce('coding.puzzle.removed');
  };
  const move = (id: string, delta: -1 | 1) => {
    setUsed((prev) => {
      const index = prev.indexOf(id);
      const next = index + delta;
      if (index < 0 || next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      [copy[index], copy[next]] = [copy[next], copy[index]];
      return copy;
    });
    setVerdict(null);
    // Stay on the arrow that was pressed; fall back to the other one when the
    // block has reached an end and that arrow is now disabled.
    setPendingFocus({ id, control: delta === -1 ? 'up' : 'down' });
    announce('coding.puzzle.moved', { n: Math.max(1, used.indexOf(id) + 1 + delta) });
  };

  const submit = async () => {
    if (!session || busy || used.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const result = await submitCodingPuzzle({ session, puzzleOrder: used, durationMs: Date.now() - startedAt.current });
      setVerdict(result);
      onVerdict?.(result);
    } catch (err) {
      setError(err instanceof ApiError && err.code === 'invalid_session'
        ? t('coding.verdict.sessionExpired')
        : t('coding.verdict.submitError'));
    } finally {
      setBusy(false);
    }
  };

  const renderBlock = (id: string, position: number, inAnswer: boolean) => {
    const block = blockById.get(id);
    if (!block) return null;
    const label = block.code;
    return (
      <li key={id} className="cd-puzzle__block" ref={(node) => { rowRefs.current.set(id, node); }}>
        <div className="cd-puzzle__code" style={{ paddingInlineStart: 8 + block.indent * 16 }}>
          <code>{label}</code>
        </div>
        <div className="cd-puzzle__controls">
          {inAnswer ? (
            <>
              <button
                type="button"
                className="cd-btn cd-btn--quiet"
                data-control="up"
                onClick={() => move(id, -1)}
                disabled={position === 0}
                aria-label={t('coding.puzzle.moveUp', { code: label })}
              >
                ↑
              </button>
              <button
                type="button"
                className="cd-btn cd-btn--quiet"
                data-control="down"
                onClick={() => move(id, 1)}
                disabled={position === used.length - 1}
                aria-label={t('coding.puzzle.moveDown', { code: label })}
              >
                ↓
              </button>
              <button type="button" className="cd-btn" data-control="remove" onClick={() => remove(id)} aria-label={t('coding.puzzle.remove', { code: label })}>
                {t('coding.puzzle.removeShort')}
              </button>
            </>
          ) : (
            <button type="button" className="cd-btn" data-control="add" onClick={() => add(id)} aria-label={t('coding.puzzle.add', { code: label })}>
              {t('coding.puzzle.addShort')}
            </button>
          )}
        </div>
      </li>
    );
  };

  return (
    <section className="cd-pane cd-puzzle" aria-labelledby={`${baseId}-title`}>
      <div className="cd-pane__head">
        <h3 id={`${baseId}-title`}>{t('coding.puzzle.title')}</h3>
        <p className="cd-note">{t('coding.puzzle.intro')}</p>
        <p className="cd-shortcuts">{t('coding.puzzle.evidenceNote')}</p>
        <ul className="cd-puzzle__competencies">
          {puzzle.competencies.map((one) => (
            <li key={one} className="cd-tag">{t(`coding.puzzle.competency.${one}` as TranslationKey)}</li>
          ))}
        </ul>
        {puzzle.distractorCount > 0 && (
          <p className="cd-note cd-note--warn">{t('coding.puzzle.distractors', { n: puzzle.distractorCount })}</p>
        )}
      </div>

      <span className="cd-visually-hidden" role="status" aria-live="polite">{announcement}</span>

      <h4 id={`${baseId}-answer`} className="cd-editor-label">{t('coding.puzzle.answerLabel')}</h4>
      {used.length === 0
        ? <p className="cd-console__empty">{t('coding.puzzle.answerEmpty')}</p>
        : <ol className="cd-puzzle__list" aria-labelledby={`${baseId}-answer`}>{used.map((id, index) => renderBlock(id, index, true))}</ol>}

      <h4 id={`${baseId}-bank`} className="cd-editor-label">{t('coding.puzzle.bankLabel')}</h4>
      {available.length === 0
        ? <p className="cd-console__empty">{t('coding.puzzle.bankEmpty')}</p>
        : <ul className="cd-puzzle__list" aria-labelledby={`${baseId}-bank`}>{available.map((id, index) => renderBlock(id, index, false))}</ul>}

      <div className="cd-actions">
        <button type="button" className="cd-btn cd-btn--primary" onClick={() => void submit()} disabled={!session || busy || used.length === 0}>
          {busy ? t('coding.submitting') : t('coding.puzzle.check')}
        </button>
        <button type="button" className="cd-btn cd-btn--quiet" onClick={() => { setUsed([]); setVerdict(null); }} disabled={busy || used.length === 0}>
          {t('coding.reset')}
        </button>
      </div>

      {!signedIn && <p className="cd-note">{t('coding.signInHint')}</p>}
      {error && <p className="cd-note cd-note--error" role="alert">{error}</p>}

      {verdict && (
        <div className={`cd-verdict cd-verdict--${verdict.verdict}`} role="status">
          <h4 className="cd-verdict__title">{t(verdict.verdict === 'passed' ? 'coding.puzzle.passed' : 'coding.puzzle.failed')}</h4>
          {verdict.verdict === 'failed' && (
            verdict.correctPrefix === null
              // Placing one block and reading back whether it is the first
              // would give the whole ordering away, so how far it is right is
              // only reported once every block is placed.
              ? <p className="cd-verdict__row">{t('coding.puzzle.incomplete', { total: verdict.expectedLength })}</p>
              : <p className="cd-verdict__row">{t('coding.puzzle.progressNote', { correct: verdict.correctPrefix, total: verdict.expectedLength })}</p>
          )}
          {verdict.verdict === 'failed' && verdict.usedDistractor && (
            <p className="cd-verdict__row">{t('coding.puzzle.distractorUsed')}</p>
          )}
          {verdict.verdict === 'passed' && <p className="cd-verdict__row">{t('coding.puzzle.passedNote')}</p>}
          {verdict.verdict === 'passed' && verdict.satisfiesLevel && onContinue && (
            <div className="cd-verdict__actions">
              <button type="button" className="cd-btn cd-btn--primary" onClick={onContinue}>{t('coding.lesson.continue')}</button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
