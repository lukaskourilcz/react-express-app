import { useId, useState, type CSSProperties } from 'react';
import { generateWaterline } from '../lib/waveBank';

// devShark branding flourish: a dorsal-fin glyph, plus an animated "swimming"
// variant used in the header wordmark and the loading screen. Animations respect
// prefers-reduced-motion (they freeze for users who opt out of motion).

interface FinProps {
  /** Glyph size in px (square). */
  size?: number;
  /** Fill colour; defaults to brand green. */
  color?: string;
  /** Cut the base into a wave, so the fin breaks the surface. Only the logo in
   * the navigation uses it: every other fin keeps a straight base on y=18,
   * which reads cleanly on waterlines, cards and buttons. */
  wave?: boolean;
}

// The swim/cruise/wake keyframes live in styles/app-shell.css (one static
// copy) — previously each mount injected its own duplicate <style> tag.

// The fin sweeps back to a hooked tip. `flat` sits on a straight base at y=18;
// `wave` cuts the same base into a wave around that line for the logo.
// favicon.svg repeats the logo's paths.
const FIN_PATHS = {
  flat: {
    body: 'M2.4 18 C 4.5 11.4 9.5 4.1 18 2.1 C 15.2 6.1 15.4 12.2 21.6 18 Z',
    shade: 'M18 2.1 C 15.2 6.1 15.4 12.2 21.6 18 L 16.9 18 C 14.3 14.2 13.6 7.2 18 2.1 Z',
  },
  wave: {
    body: 'M2.4 18 C 4.5 11.4 9.5 4.1 18 2.1 C 15.2 6.1 15.4 12.2 21.6 18 Q 19.25 15.5 16.9 18 T 12.2 18 T 7.5 18 T 2.4 18 Z',
    shade: 'M18 2.1 C 15.2 6.1 15.4 12.2 21.6 18 Q 19.25 15.5 16.9 18 C 14.3 14.2 13.6 7.2 18 2.1 Z',
  },
} as const;

/** A static dorsal shark fin. `aria-hidden` — it's decorative. */
export function SharkFin({ size = 22, color = 'var(--brand-accent)', wave = false }: FinProps) {
  const paths = wave ? FIN_PATHS.wave : FIN_PATHS.flat;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path d={paths.body} style={{ fill: color }} />
      {/* subtle inner shading down the trailing edge */}
      <path d={paths.shade} fill="#000" opacity="0.12" />
    </svg>
  );
}

/**
 * A fin that gently bobs and tilts as if cutting through water. Used inline next
 * to the wordmark. Tiny, looping, and calm so it reads as a flourish, not a
 * distraction.
 */
export function SwimmingFin({ size = 22, color = 'var(--brand-accent)', wave = false }: FinProps) {
  return (
    <span className="devshark-swim" style={{ display: 'inline-flex', transformOrigin: 'bottom center' }}>
      <SharkFin size={size} color={color} wave={wave} />
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
export function WaterlineProgress({ value, label, decorativeFins = false }: { value: number; label?: string; decorativeFins?: boolean }) {
  const [wave] = useState(() => generateWaterline());
  const clamped = Math.max(0, Math.min(100, value));
  const pct = `${clamped}%`;
  const clipId = useId().replace(/:/g, '');
  // Begin and end beyond the viewport so translating one full wavelength is
  // seamless: the water keeps moving without exposing either edge.
  const d = wave.path;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{ position: 'relative', height: 18, '--ss-waterline-distance': `${wave.wavelength * wave.direction}px`, '--ss-waterline-duration': `${wave.duration}s`, '--ss-waterline-delay': `${wave.delay}s` } as CSSProperties}
    >
      <svg aria-hidden viewBox="0 0 600 18" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: 18, overflow: 'hidden' }}>
        <defs><clipPath id={clipId}><rect className="ss-waterline-reveal" x="0" y="0" width="600" height="18" style={{ transform: `scaleX(${clamped / 100})` }} /></clipPath></defs>
        <path className="ss-waterline-drift" d={d} fill="none" stroke="var(--color-border)" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <g clipPath={`url(#${clipId})`}><path className="ss-waterline-drift" d={d} fill="none" stroke="var(--brand-accent)" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" /></g>
      </svg>
      {decorativeFins ? wave.fins.map((fin, index) => <div key={index} aria-hidden style={{position:'absolute', top:12-fin.size*.75, left:`${fin.position}%`, transform:`translateX(-50%) scaleX(${fin.direction})`, lineHeight:0, opacity:fin.opacity}}>
        <span className="ss-progress-fin-motion ss-waterline-fin-motion" style={{animationDuration:`${fin.duration}s`,animationDelay:`${fin.delay}s`}}><SharkFin size={fin.size} /></span>
      </div>) : <div className="ss-progress-fin" aria-hidden style={{ position: 'absolute', top: -3, left: pct, transform: 'translateX(-50%)', lineHeight: 0 }}>
        <span className="ss-progress-fin-motion"><SharkFin size={16} /></span>
      </div>}
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
