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
