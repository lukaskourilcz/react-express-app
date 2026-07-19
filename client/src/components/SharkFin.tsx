import { useId } from 'react';

// StudyShark branding flourish: a dorsal-fin glyph, plus an animated "swimming"
// variant used in the header wordmark and the loading screen. Animations respect
// prefers-reduced-motion (they freeze for users who opt out of motion).

interface FinProps {
  /** Glyph size in px (square). */
  size?: number;
  /** Fill colour; defaults to brand green. */
  color?: string;
}

// The swim/cruise/wake keyframes live in styles/app-shell.css (one static
// copy) — previously each mount injected its own duplicate <style> tag.

/** A static dorsal shark fin. `aria-hidden` — it's decorative. */
export function SharkFin({ size = 22, color = 'var(--brand-accent)' }: FinProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path d="M3 18 Q 6 6 15 3 Q 17 11 21 18 Z" style={{ fill: color }} />
      {/* subtle inner shading down the trailing edge */}
      <path d="M15 3 Q 17 11 21 18 L 16 18 Q 14 10 15 3 Z" fill="#000" opacity="0.12" />
    </svg>
  );
}

/**
 * A fin that gently bobs and tilts as if cutting through water. Used inline next
 * to the wordmark. Tiny, looping, and calm so it reads as a flourish, not a
 * distraction.
 */
export function SwimmingFin({ size = 22, color = 'var(--brand-accent)' }: FinProps) {
  return (
    <span className="devshark-swim" style={{ display: 'inline-flex', transformOrigin: 'bottom center' }}>
      <SharkFin size={size} color={color} />
    </span>
  );
}

/**
 * A wavy "ocean surface" line in brand green that stretches to fill its parent's
 * width (set the width on the wrapping element). Decorative. The stroke stays a
 * constant thickness regardless of how far it's stretched.
 */
export function Waterline({ color = 'var(--brand-accent)' }: { color?: string }) {
  // Generate a continuous wave across the viewBox: an initial quadratic hump,
  // then smooth reflections (T) that alternate up/down.
  const span = 600;
  const count = 30;
  const step = span / count;
  const mid = 5;
  const amp = 3;
  let d = `M0 ${mid} Q ${step / 2} ${mid - amp} ${step} ${mid}`;
  for (let k = 2; k <= count; k++) d += ` T ${k * step} ${mid}`;

  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${span} 10`}
      preserveAspectRatio="none"
      style={{ width: '100%', height: 10, display: 'block' }}
    >
      <path
        d={d}
        fill="none"
        style={{ stroke: color }}
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.65}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/**
 * A progress bar rendered as a waterline: a hairline track, an accent fill, and
 * a small shark fin that rides the leading edge of the fill like a dorsal
 * breaking the surface. The signature "Deep End" progress moment, used in the
 * quiz/challenge play flow. `value` is 0–100. Decorative marker; the semantics
 * live on the surrounding label.
 */
export function WaterlineProgress({ value, label }: { value: number; label?: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  const pct = `${clamped}%`;
  const clipId = useId().replace(/:/g, '');
  const d = 'M0 9 Q 12 5 24 9 T 48 9 T 72 9 T 96 9 T 120 9 T 144 9 T 168 9 T 192 9 T 216 9 T 240 9 T 264 9 T 288 9 T 312 9 T 336 9 T 360 9 T 384 9 T 408 9 T 432 9 T 456 9 T 480 9 T 504 9 T 528 9 T 552 9 T 576 9 T 600 9';
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{ position: 'relative', height: 18 }}
    >
      <svg aria-hidden viewBox="0 0 600 18" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: 18, overflow: 'visible' }}>
        <defs><clipPath id={clipId}><rect x="0" y="0" width={clamped * 6} height="18" /></clipPath></defs>
        <path d={d} fill="none" stroke="var(--color-border)" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <path d={d} fill="none" stroke="var(--brand-accent)" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" clipPath={`url(#${clipId})`} />
      </svg>
      {/* Fin marker riding the fill edge. */}
      <div className="ss-progress-fin" aria-hidden style={{ position: 'absolute', top: -3, left: pct, transform: 'translateX(-50%)', lineHeight: 0, transition: 'left 0.4s ease' }}>
        <SharkFin size={16} />
      </div>
    </div>
  );
}

/**
 * A larger fin surfacing and swimming side-to-side over a rippling water line —
 * the branded loading indicator.
 */
export function SwimmingShark({ size = 56 }: { size?: number }) {
  // Container is sized 1.3× the fin tall so the dorsal tip isn't clipped when
  // the fin bobs + rotates. `overflow: hidden` clips the horizontal cruise
  // outside the box but doesn't crop the top of the fin anymore.
  return (
    <div style={{ position: 'relative', width: size * 1.8, height: size * 1.3, overflow: 'hidden' }} aria-hidden="true">
      <span
        className="devshark-cruise"
        style={{
          position: 'absolute',
          bottom: size * 0.18,
          left: '50%',
          display: 'inline-flex',
          transformOrigin: 'bottom center',
        }}
      >
        <SharkFin size={size} />
      </span>
      {/* water line + wake ripple */}
      <div
        className="devshark-wake"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: size * 0.16,
          height: 2,
          backgroundColor: 'var(--brand-accent)',
          opacity: 0.25,
          borderRadius: 2,
        }}
      />
    </div>
  );
}
