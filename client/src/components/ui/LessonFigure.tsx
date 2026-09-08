// Rendering for the authored lesson figures.
//
// Everything here is HTML and CSS. No canvas, no image, no generated picture:
// a diagram of a box model or an execution order is a claim about behaviour,
// and the browser laying out real boxes is both the most accurate way to show
// one and the only way it stays readable at 200% zoom in either language.
//
// Four properties the markup is written to keep:
//
//   * The text alternative is always present, not an attribute. It sits in a
//     disclosure under every figure, so it is available to everyone rather than
//     only to a screen reader, and the figure is complete without the picture.
//   * No meaning is carried by colour. Every marked cell, row and layer also
//     carries the word that says why it is marked.
//   * Stepping is manual. Previous, Next and Reset, no autoplay, nothing that
//     requires a drag, and the step description lives in a live region so a
//     keyboard user hears what changed.
//   * Nothing moves under a reduced-motion preference, because nothing moves at
//     all — the frames are states, not an animation.

import { useId, useState, type ReactNode } from 'react';
import { useLanguage, useT } from '../../i18n/LanguageContext';
import { TermsBar } from './Terms';
import { glossaryDomainFor } from '../../lib/glossaryDomain';
import type { FigureText, LessonFigure as Figure } from '../../../../shared/lesson-figures';

export function LessonFigures({ figures }: { figures: readonly Figure[] }) {
  if (figures.length === 0) return null;
  return (
    <>
      {figures.map((figure) => (
        <LessonFigureView key={figure.id} figure={figure} />
      ))}
    </>
  );
}

export function LessonFigureView({ figure }: { figure: Figure }) {
  const t = useT();
  const { lang } = useLanguage();
  const L = (text: FigureText) => text[lang] || text.en;
  const captionId = useId();
  const [showText, setShowText] = useState(false);

  return (
    <figure className="ss-figure" aria-labelledby={captionId}>
      <figcaption id={captionId} className="ss-figure__caption">
        {L(figure.title)}
      </figcaption>

      {figure.body.kind === 'flow' && <FlowView body={figure.body} L={L} />}
      {figure.body.kind === 'nested' && <NestedView body={figure.body} L={L} />}
      {figure.body.kind === 'table' && <TableView body={figure.body} L={L} />}
      {figure.body.kind === 'steps' && <StepsView body={figure.body} L={L} />}

      {figure.assumes && (
        <p className="ss-figure__assumes">
          <span className="ss-figure__assumes-label">{t('figure.assumes')}</span> {L(figure.assumes)}
        </p>
      )}

      {/* The whole figure in words. Open it and the picture is redundant, which
          is the test of whether it was written properly. */}
      <div className="ss-figure__text">
        <button
          type="button"
          className="ss-figure__toggle"
          aria-expanded={showText}
          onClick={() => setShowText((current) => !current)}
        >
          {t('figure.inWords')}
        </button>
        {showText && <p className="ss-figure__alt">{L(figure.alt)}</p>}
      </div>

      {/* Abbreviation help beside the figure, never injected into its labels. */}
      <TermsBar
        texts={[L(figure.title), L(figure.alt)]}
        domain={glossaryDomainFor(figure.topic)}
      />
    </figure>
  );
}

type Localize = (text: FigureText) => string;

function FlowView({ body, L }: { body: Extract<Figure['body'], { kind: 'flow' }>; L: Localize }) {
  const label = (id: string) => body.nodes.find((node) => node.id === id);
  return (
    <div className="ss-figure__flow">
      <ol className="ss-figure__nodes">
        {body.nodes.map((node) => (
          <li key={node.id} className="ss-figure__node">
            <span className="ss-figure__node-label">{L(node.label)}</span>
            {node.note && <span className="ss-figure__node-note">{L(node.note)}</span>}
          </li>
        ))}
      </ol>
      <ul className="ss-figure__edges">
        {body.edges.map((edge, index) => (
          <li key={index}>
            <span className="ss-figure__edge-ends">
              {L(label(edge.from)?.label ?? { en: edge.from, cs: edge.from })}
              <span aria-hidden="true"> → </span>
              {L(label(edge.to)?.label ?? { en: edge.to, cs: edge.to })}
            </span>
            <span className="ss-figure__edge-label">{L(edge.label)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NestedView({ body, L }: { body: Extract<Figure['body'], { kind: 'nested' }>; L: Localize }) {
  // Rendered by real nesting, so the containment the figure is about is the
  // containment the browser lays out.
  const render = (index: number): ReactNode => {
    const layer = body.layers[index];
    if (!layer) return null;
    return (
      <div className="ss-figure__layer">
        <span className="ss-figure__layer-head">
          <span className="ss-figure__layer-label">{L(layer.label)}</span>
          {layer.value && <span className="ss-figure__layer-value">{layer.value}</span>}
          {layer.note && <span className="ss-figure__layer-note">{L(layer.note)}</span>}
        </span>
        {render(index + 1)}
      </div>
    );
  };
  return <div className="ss-figure__nested">{render(0)}</div>;
}

function TableView({ body, L }: { body: Extract<Figure['body'], { kind: 'table' }>; L: Localize }) {
  return (
    <div className="ss-figure__scroll">
      <table className="ss-figure__table">
        <thead>
          <tr>
            {body.columns.map((column, index) => (
              <th key={index} scope="col">{L(column)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.rows.map((row, rowIndex) => {
            const mark = body.marks?.find((one) => one.row === rowIndex);
            return (
              <tr key={rowIndex} className={mark ? 'ss-figure__row--marked' : undefined}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex}>
                    {typeof cell === 'string' ? cell : L(cell)}
                    {/* The word is the mark; the background is decoration. */}
                    {mark && cellIndex === row.length - 1 && (
                      <span className="ss-figure__role"> {L(mark.role)}</span>
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StepsView({ body, L }: { body: Extract<Figure['body'], { kind: 'steps' }>; L: Localize }) {
  const t = useT();
  const [index, setIndex] = useState(0);
  const frame = body.frames[Math.min(index, body.frames.length - 1)];

  return (
    <div className="ss-figure__steps">
      <div className="ss-figure__scroll">
        <ol className="ss-figure__cells">
          {frame.cells.map((cell, cellIndex) => {
            const mark = frame.marks?.find((one) => one.index === cellIndex);
            return (
              <li key={cellIndex} className={`ss-figure__cell${mark ? ' ss-figure__cell--marked' : ''}`}>
                {body.legend?.[cellIndex] && (
                  <span className="ss-figure__role">{L(body.legend[cellIndex])}</span>
                )}
                <span className="ss-figure__cell-value">{cell}</span>
                {mark && <span className="ss-figure__role">{L(mark.role)}</span>}
              </li>
            );
          })}
        </ol>
      </div>

      {/* What changed, announced rather than left to sight. */}
      <p className="ss-figure__note" aria-live="polite">
        {L(frame.note)}
        {frame.counter && (
          <span className="ss-figure__counter">
            {' '}
            {L(frame.counter.label)}: {frame.counter.value}
          </span>
        )}
      </p>

      <div className="ss-figure__controls">
        <button
          type="button"
          className="ss-figure__button"
          onClick={() => setIndex((current) => Math.max(0, current - 1))}
          disabled={index === 0}
        >
          {t('figure.previous')}
        </button>
        <span className="ss-figure__position">
          {t('figure.step', { current: Math.min(index, body.frames.length - 1) + 1, total: body.frames.length })}
        </span>
        <button
          type="button"
          className="ss-figure__button"
          onClick={() => setIndex((current) => Math.min(body.frames.length - 1, current + 1))}
          disabled={index >= body.frames.length - 1}
        >
          {t('figure.next')}
        </button>
        <button
          type="button"
          className="ss-figure__button ss-figure__button--quiet"
          onClick={() => setIndex(0)}
          disabled={index === 0}
        >
          {t('figure.reset')}
        </button>
      </div>

      {/* Every frame, written out, so the sequence is readable without touching
          the controls at all. */}
      <ol className="ss-figure__frames">
        {body.frames.map((one, frameIndex) => (
          <li key={frameIndex}>{L(one.note)}</li>
        ))}
      </ol>
    </div>
  );
}
