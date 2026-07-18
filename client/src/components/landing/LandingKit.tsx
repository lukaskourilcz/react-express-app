// Shared primitives for the two editorial "Deep End v2" landings — the
// per-subject Home (topics) and the umbrella SubjectPicker (subjects). Both
// screens are the same layout with a different card set, so the kicker, fins,
// stat tiles, fade-in / swim-through CTAs and the interactive sample-question
// card all live here and re-skin from var(--brand-accent).
//
// See DESIGN_RULES.md for the fin-baseline, fade-in-only and accent rules these
// implement.

import { useState, type ReactNode } from 'react';
import { useT } from '../../i18n/LanguageContext';

// The fin glyph path, base at y=18 in a 24-unit box (see DESIGN_RULES §1).
export const FIN_PATH = 'M3 18 Q 6 6 15 3 Q 17 11 21 18 Z';

/** A ghost-fin CSS background (a low-opacity fin in the accent, '#' encoded). */
export const finBg = (hex: string, opacity: number): string =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Cpath d='${FIN_PATH}' fill='${encodeURIComponent(hex)}' fill-opacity='${opacity}'/%3E%3C/svg%3E")`;

/** Editorial kicker: uppercase accent label with a waterline tick beneath. */
export function Kicker({ children, center }: { children: ReactNode; center?: boolean }) {
  return <span className={`ss-kicker${center ? ' ss-kicker--center' : ''}`}>{children}</span>;
}

/** A raw fin SVG (fades/swims as a positioned child). */
export function Fin({ size, color = 'var(--brand-accent)', opacity = 1 }: { size: number; color?: string; opacity?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d={FIN_PATH} fill={color} fillOpacity={opacity} />
    </svg>
  );
}

export interface StatSpec { value: string; label: string; pos: string; size: number; }

/** A hero stat with a ghost-fin relief + subtle lift on hover. */
export function StatItem({ value, label, pos, size, accent }: StatSpec & { accent: string }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', flexDirection: 'column', cursor: 'default',
        transition: 'transform 0.35s cubic-bezier(0.16,1,0.3,1)',
        transform: hover ? 'translateY(-2px)' : 'none',
        backgroundImage: hover ? finBg(accent, 0.14) : 'none',
        backgroundRepeat: 'no-repeat', backgroundPosition: pos, backgroundSize: `${size}px ${size}px`,
      }}
    >
      <span style={{ fontFamily: 'var(--font-family-heading)', fontWeight: 800, fontSize: '1.5rem', letterSpacing: '-0.015em' }}>{value}</span>
      <span style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>{label}</span>
    </div>
  );
}

/** A CTA whose fin fades in on hover (no drift — see DESIGN_RULES §3). */
export function FadeFinCta({
  label, primary, onClick, finLeft, finSize, accent,
}: {
  label: string; primary?: boolean; onClick: () => void; finLeft: string; finSize: number; accent: string;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button" onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative', overflow: 'hidden', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: primary ? 'var(--brand-accent)' : 'var(--color-background-surface)',
        color: primary ? '#fff' : 'var(--color-text-primary)',
        border: primary ? 'none' : '1px solid var(--ss-card-edge)',
        borderRadius: 'var(--radius-element)', padding: '12px 22px',
        fontFamily: 'var(--font-family-body)', fontWeight: 600, fontSize: '1rem', cursor: 'pointer',
        filter: hover && primary ? 'brightness(0.92)' : 'none',
        transition: 'filter 0.2s ease, background 0.2s ease',
        backgroundColor: hover && !primary ? 'var(--color-background-muted)' : undefined,
      }}
    >
      <span aria-hidden style={{ position: 'absolute', left: finLeft, bottom: Math.round(finSize * -0.25) + 'px', lineHeight: 0, opacity: hover ? 1 : 0, transition: 'opacity 0.35s ease', pointerEvents: 'none' }}>
        <Fin size={finSize} color={primary ? '#fff' : accent} opacity={primary ? 0.35 : 0.22} />
      </span>
      <span style={{ position: 'relative' }}>{label}</span>
    </button>
  );
}

/** A CTA whose fin swims the full width on hover (see DESIGN_RULES §3). */
export function SwimCta({ label, onClick, dir, disabled, size = 'md' }: { label: string; onClick: () => void; dir: 1 | -1; disabled?: boolean; size?: 'md' | 'lg' }) {
  const [hover, setHover] = useState(false);
  const distance = 260;
  const active = hover && !disabled;
  return (
    <button
      type="button" onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative', overflow: 'hidden', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--brand-accent)', color: '#fff', border: 'none',
        borderRadius: 'var(--radius-element)', padding: size === 'lg' ? '13px 26px' : '10px 18px',
        fontFamily: 'var(--font-family-body)', fontWeight: 600, fontSize: size === 'lg' ? '1rem' : '0.95rem',
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
        filter: active ? 'brightness(0.92)' : 'none', transition: 'filter 0.2s ease, opacity 0.2s ease',
      }}
    >
      <span
        aria-hidden
        style={{
          position: 'absolute', left: dir === 1 ? '0' : '100%', right: dir === -1 ? undefined : '100%',
          bottom: -8, lineHeight: 0, opacity: active ? 1 : 0,
          transform: `translateX(${active ? dir * distance : 0}px)${dir === 1 ? ' scaleX(-1)' : ''}`,
          transition: `transform ${dir === 1 ? 3.8 : 2.6}s ease-in-out, opacity 0.4s ease`, pointerEvents: 'none',
        }}
      >
        <Fin size={38} color="#fff" opacity={0.28} />
      </span>
      <span style={{ position: 'relative' }}>{label}</span>
    </button>
  );
}

export interface SampleQuestion { text: string; code?: string; opts: string[]; a: number; e: string; }

/**
 * The interactive "try one — no signup" sample-question card. `chip` labels it
 * (e.g. "JavaScript · Level 1 — Values & Math"); mount with a `key` so picking
 * resets when the parent swaps the question.
 */
export function SampleCard({ chip, question }: { chip: string; question: SampleQuestion }) {
  const t = useT();
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const correct = question.a;
  const right = answered && picked === correct;

  return (
    <div className="ss-panel" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14, borderRadius: 'var(--radius-container)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ borderRadius: 999, padding: '3px 10px', background: 'var(--brand-accent-soft)', color: 'var(--brand-accent)', fontSize: '0.75rem', fontWeight: 600 }}>{chip}</span>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginLeft: 'auto' }}>{t('home.tryOne')}</span>
      </div>
      <p style={{ margin: 0, fontFamily: 'var(--font-family-heading)', fontWeight: 700, fontSize: '1.15rem', letterSpacing: '-0.01em' }}>{question.text}</p>
      {question.code && (
        <pre style={{ margin: 0, background: 'var(--color-background-muted)', border: '1px solid var(--ss-card-line)', borderRadius: 'var(--radius-inner)', padding: '10px 14px', fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', fontSize: '0.9rem', color: 'var(--color-text-primary)', overflowX: 'auto' }}>{question.code}</pre>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {question.opts.map((label, i) => {
          const isCorrect = answered && i === correct;
          const isWrong = answered && i === picked && picked !== correct;
          const dim = answered && !isCorrect && !isWrong;
          return (
            <button
              key={i} type="button" disabled={answered}
              onClick={() => { if (picked === null) setPicked(i); }}
              className="ss-radio-card" data-tone={isCorrect ? 'success' : undefined}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', fontSize: '0.95rem', opacity: dim ? 0.6 : 1,
                borderColor: isWrong ? 'var(--ss-error)' : undefined,
                boxShadow: isWrong ? 'inset 0 0 0 1px var(--ss-error)' : undefined,
                background: isWrong ? 'var(--ss-error-soft)' : undefined,
              }}
            >
              <span style={{ display: 'grid', placeItems: 'center', width: 22, height: 22, borderRadius: 6, background: 'var(--color-background-muted)', fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-secondary)', flexShrink: 0 }}>{String.fromCharCode(65 + i)}</span>
              <span>{label}</span>
              {(isCorrect || isWrong) && (
                <span style={{ marginLeft: 'auto', fontSize: '0.8rem', fontWeight: 700, color: isCorrect ? 'var(--ss-success)' : 'var(--ss-error)' }}>{isCorrect ? '✓' : '✕'}</span>
              )}
            </button>
          );
        })}
      </div>
      {answered && (
        <div style={{
          borderRadius: 'var(--radius-element)', padding: '12px 14px',
          background: right ? 'var(--ss-success-soft)' : 'var(--ss-error-soft)',
          border: `1px solid ${right ? 'var(--ss-success)' : 'var(--ss-error)'}`,
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: right ? 'var(--ss-success)' : 'var(--ss-error)' }}>
            {right ? t('home.answerCorrect') : t('home.answerWrong', { answer: question.opts[correct] })}
          </span>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{question.e}</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{t('home.checkpointBlurb')}</span>
        </div>
      )}
    </div>
  );
}

/** Gold "checkpoint" node used at the end of a roadmap-preview path. */
export function CheckpointNode({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, minWidth: 110, flexShrink: 0 }}>
      <span style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: '50%', background: 'rgba(245,166,35,0.14)', color: '#c77f00', border: '2px solid rgba(245,166,35,0.5)' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" /><path d="M5 4H3v2a3 3 0 0 0 3 3M19 4h2v2a3 3 0 0 1-3 3" />
        </svg>
      </span>
      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#c77f00', whiteSpace: 'nowrap' }}>{label}</span>
    </div>
  );
}

/** A single wave connector for roadmap-preview paths (varied per index). */
export function pathWave(i: number): string {
  const amp = 1.2 + ((i * 7) % 4) * 0.55;
  const dir = i % 2 === 0 ? -1 : 1;
  const y1 = 4 + dir * amp;
  return i % 3 === 0 ? `M0 4 Q 5 ${y1} 10 4 T 20 4 T 30 4 T 40 4` : `M0 4 Q 7 ${y1} 14 4 T 28 4 T 42 4`;
}
