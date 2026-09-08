// Arranging code instead of typing it.
//
// On a phone or a tablet between quizzes, a code editor is the wrong
// instrument: there is no room, and typing code on glass tests patience rather
// than understanding. Where a task has an authored puzzle, this is what the
// learner gets instead.
//
// It is operable three ways, and dragging is not one of them — dragging is an
// addition we can add later, never the only route:
//
//   * tap a line to select it, then tap where it should go;
//   * move the selected line with the Up and Down buttons, which are real
//     buttons at a real size;
//   * move it with the arrow keys while it has focus.
//
// The list is a listbox with one focus stop and a roving tabindex, so a screen
// reader announces the line, its position and the total, and Tab does not walk
// through fourteen items to reach the submit button.

import { useCallback, useRef, useState, type KeyboardEvent } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import type { PuzzleLine, PuzzleView } from '../../../shared/coding-puzzle';

export function CodePuzzle({
  puzzle,
  busy,
  onSubmit,
}: {
  puzzle: PuzzleView;
  busy: boolean;
  onSubmit: (order: string[]) => void;
}) {
  const { t } = useLanguage();
  const [lines, setLines] = useState<PuzzleLine[]>(puzzle.lines);
  const [selected, setSelected] = useState<string | null>(puzzle.lines[0]?.id ?? null);
  const refs = useRef<Record<string, HTMLLIElement | null>>({});

  const indexOf = useCallback((id: string) => lines.findIndex((line) => line.id === id), [lines]);

  const move = useCallback((id: string, delta: number) => {
    setLines((current) => {
      const from = current.findIndex((line) => line.id === id);
      const to = from + delta;
      if (from < 0 || to < 0 || to >= current.length) return current;
      const next = [...current];
      const [line] = next.splice(from, 1);
      next.splice(to, 0, line);
      return next;
    });
    // Focus follows the line, not the position: after a move the learner is
    // still on the line they were moving.
    window.requestAnimationFrame(() => refs.current[id]?.focus());
  }, []);

  const onKeyDown = useCallback((event: KeyboardEvent<HTMLLIElement>, id: string) => {
    const index = indexOf(id);
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      const delta = event.key === 'ArrowUp' ? -1 : 1;
      // With a modifier the line moves; without one, focus does. Both are
      // useful, and conflating them makes reordering by accident too easy.
      if (event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) {
        move(id, delta);
      } else {
        const next = lines[index + delta];
        if (next) {
          setSelected(next.id);
          refs.current[next.id]?.focus();
        }
      }
      return;
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const target = event.key === 'Home' ? lines[0] : lines[lines.length - 1];
      if (target) {
        setSelected(target.id);
        refs.current[target.id]?.focus();
      }
    }
  }, [indexOf, lines, move]);

  const selectedIndex = selected ? indexOf(selected) : -1;

  return (
    <section className="cd-puzzle" aria-labelledby="cd-puzzle-title">
      <h3 id="cd-puzzle-title">{t('coding.puzzle.title')}</h3>
      <p className="cd-shortcuts">{t('coding.puzzle.help')}</p>

      <ol className="cd-puzzle__list" role="listbox" aria-label={t('coding.puzzle.title')}>
        {lines.map((line, index) => {
          const isSelected = line.id === selected;
          return (
            <li
              key={line.id}
              ref={(node) => { refs.current[line.id] = node; }}
              role="option"
              aria-selected={isSelected}
              // One Tab stop for the whole list, per the listbox pattern.
              tabIndex={isSelected ? 0 : -1}
              className={`cd-puzzle__line${isSelected ? ' cd-puzzle__line--on' : ''}`}
              onClick={() => setSelected(line.id)}
              onKeyDown={(event) => onKeyDown(event, line.id)}
            >
              <span className="cd-puzzle__pos" aria-hidden>{index + 1}</span>
              <code>{line.code}</code>
              <span className="cd-visually-hidden">
                {t('coding.puzzle.position', { n: index + 1, total: lines.length })}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="cd-actions">
        <button
          type="button"
          className="cd-btn"
          disabled={busy || selectedIndex <= 0}
          onClick={() => selected && move(selected, -1)}
        >
          {t('coding.puzzle.up')}
        </button>
        <button
          type="button"
          className="cd-btn"
          disabled={busy || selectedIndex < 0 || selectedIndex >= lines.length - 1}
          onClick={() => selected && move(selected, 1)}
        >
          {t('coding.puzzle.down')}
        </button>
        <button
          type="button"
          className="cd-btn cd-btn--primary"
          disabled={busy}
          onClick={() => onSubmit(lines.map((line) => line.id))}
        >
          {t('coding.puzzle.check')}
        </button>
      </div>

      <p className="cd-shortcuts">{t('coding.puzzle.scope')}</p>
    </section>
  );
}
