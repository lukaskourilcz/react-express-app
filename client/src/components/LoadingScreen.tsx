import { useEffect, useState } from 'react';
import { Text } from '@astryxdesign/core/Text';
import { visuallyHidden } from '../theme/MuiTheme';
import { SwimmingShark } from './SharkFin';
import { sxToStyle, type SxLike } from '../lib/styleProps';

/**
 * Style object accepted by `LoadingScreen`. Mirrors the small slice of MUI `sx`
 * callers actually pass (real CSS properties plus the `p*`/`m*` spacing
 * shorthands, whose numeric values are ×8px), merged onto the centring wrapper.
 */
interface Props {
  /** Screen-reader announcement describing what is loading. */
  label: string;
  /** Fin height in px. */
  size?: number;
  /** Extra styles merged onto the centering wrapper. */
  sx?: SxLike;
  /**
   * Optional one-liner "dev tips". When provided (and non-empty), a random tip
   * fades in beneath the shark after a short delay so the learner has something
   * to read on longer, full-page loads. Configurable in /dev → Settings.
   */
  tips?: string[];
}

// How long the shark swims alone before a tip surfaces. Long enough that quick
// loads never flash a tip; short enough to read one on a slow load.
const TIP_DELAY_MS = 2500;

// Tip fade-in keyframes (previously an inline MUI `sx` `@keyframes`). Scoped
// <style> so the animation travels with the component.
const TIP_ANIM_CSS = `
@keyframes devsharkTipIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
.devshark-tip { animation: devsharkTipIn 400ms ease-out; }
@media (prefers-reduced-motion: reduce) {
  .devshark-tip { animation: none; }
}
`;

/* ──── Study-mode loading beat (shared by Quiz, Learn, Challenge, Play) ────
 * Every question-fetching moment shows the house motto with the swimming fin
 * beneath, and holds for at least MIN_LOADING_MS so it reads as a beat, not a
 * flicker. Use `holdLoadingScreen(startedAt)` after the fetch resolves. */

export const MIN_LOADING_MS = 1200;

export const holdLoadingScreen = (startedAt: number): Promise<void> =>
  new Promise((resolve) => window.setTimeout(resolve, Math.max(0, MIN_LOADING_MS - (Date.now() - startedAt))));

/** The quote + fin loading state for study modes. Fills its flex parent. */
export function QuoteLoader({ quote, label }: { quote: string; label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}
    >
      <div style={{ fontStyle: 'italic', textAlign: 'center', maxWidth: 520, padding: '0 8px' }}>
        <Text type="large" weight="semibold" color="secondary">
          {quote}
        </Text>
      </div>
      <SwimmingShark size={44} />
      <span style={visuallyHidden}>{label}</span>
    </div>
  );
}

/** Centered swimming-shark-fin indicator with a screen-reader-announced label. */
export default function LoadingScreen({ label, size, sx, tips }: Props) {
  // -1 until the delay elapses, then the index of the tip to reveal.
  const [tipIndex, setTipIndex] = useState(-1);

  useEffect(() => {
    if (!tips || tips.length === 0) return;
    const id = setTimeout(() => setTipIndex(Math.floor(Math.random() * tips.length)), TIP_DELAY_MS);
    return () => clearTimeout(id);
  }, [tips]);

  const tip = tips && tipIndex >= 0 ? tips[tipIndex] : null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        minHeight: '50vh',
        ...sxToStyle(sx),
      }}
    >
      <SwimmingShark size={size ?? 48} />
      <span style={visuallyHidden}>{label}</span>
      {tip && (
        <div
          // Decorative flourish — the status label above already conveys "loading",
          // so keep the tip out of the live region to avoid talking over it.
          aria-hidden="true"
          className="devshark-tip"
          style={{
            maxWidth: 360,
            paddingLeft: 16,
            paddingRight: 16,
            textAlign: 'center',
            fontStyle: 'italic',
          }}
        >
          <style>{TIP_ANIM_CSS}</style>
          <Text type="body" color="secondary">
            {tip}
          </Text>
        </div>
      )}
    </div>
  );
}
