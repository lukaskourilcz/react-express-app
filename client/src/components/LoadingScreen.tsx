import { useEffect, useState } from 'react';
import { Box, type SxProps, type Theme } from '@mui/material';
import { Text } from '@astryxdesign/core/Text';
import { visuallyHidden } from '../theme/MuiTheme';
import { SwimmingShark } from './SharkFin';

interface Props {
  /** Screen-reader announcement describing what is loading. */
  label: string;
  /** Fin height in px. */
  size?: number;
  /** Extra styles merged onto the centering wrapper. */
  sx?: SxProps<Theme>;
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
    <Box
      role="status"
      aria-live="polite"
      sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}
    >
      <div style={{ fontStyle: 'italic', textAlign: 'center', maxWidth: 520, padding: '0 8px' }}>
        <Text type="large" weight="semibold" color="secondary">
          {quote}
        </Text>
      </div>
      <SwimmingShark size={44} />
      <Box component="span" sx={visuallyHidden}>{label}</Box>
    </Box>
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
    <Box
      role="status"
      aria-live="polite"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 1.5,
        minHeight: '50vh',
        ...sx,
      }}
    >
      <SwimmingShark size={size ?? 48} />
      <Box component="span" sx={visuallyHidden}>
        {label}
      </Box>
      {tip && (
        <Box
          // Decorative flourish — the status label above already conveys "loading",
          // so keep the tip out of the live region to avoid talking over it.
          aria-hidden="true"
          sx={{
            maxWidth: 360,
            px: 2,
            textAlign: 'center',
            fontStyle: 'italic',
            '@keyframes devsharkTipIn': {
              from: { opacity: 0, transform: 'translateY(4px)' },
              to: { opacity: 1, transform: 'translateY(0)' },
            },
            animation: 'devsharkTipIn 400ms ease-out',
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          }}
        >
          <Text type="body" color="secondary">
            {tip}
          </Text>
        </Box>
      )}
    </Box>
  );
}
