// devShark branding flourish: a dorsal-fin glyph, plus an animated "swimming"
// variant used in the header wordmark and the loading screen. Animations respect
// prefers-reduced-motion (they freeze for users who opt out of motion).

import { Box } from '@mui/material';
import { BRAND } from '../theme/MuiTheme';

interface FinProps {
  /** Glyph size in px (square). */
  size?: number;
  /** Fill colour; defaults to brand green. */
  color?: string;
}

/** A static dorsal shark fin. `aria-hidden` — it's decorative. */
export function SharkFin({ size = 22, color = BRAND.green }: FinProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path d="M3 18 Q 6 6 15 3 Q 17 11 21 18 Z" fill={color} />
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
export function SwimmingFin({ size = 22, color = BRAND.green }: FinProps) {
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        transformOrigin: 'bottom center',
        '@keyframes devsharkSwim': {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(-2px) rotate(-5deg)' },
        },
        animation: 'devsharkSwim 3s ease-in-out infinite',
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }}
    >
      <SharkFin size={size} color={color} />
    </Box>
  );
}

/**
 * A larger fin surfacing and swimming side-to-side over a rippling water line —
 * the branded loading indicator.
 */
export function SwimmingShark({ size = 56 }: { size?: number }) {
  return (
    <Box sx={{ position: 'relative', width: size * 1.8, height: size, overflow: 'hidden' }} aria-hidden="true">
      <Box
        component="span"
        sx={{
          position: 'absolute',
          bottom: size * 0.18,
          left: '50%',
          display: 'inline-flex',
          transformOrigin: 'bottom center',
          '@keyframes devsharkCruise': {
            '0%': { transform: 'translateX(-130%) translateY(0) rotate(-6deg)' },
            '50%': { transform: 'translateX(-50%) translateY(-3px) rotate(6deg)' },
            '100%': { transform: 'translateX(30%) translateY(0) rotate(-6deg)' },
          },
          animation: 'devsharkCruise 2.4s ease-in-out infinite alternate',
          '@media (prefers-reduced-motion: reduce)': { animation: 'none', transform: 'translateX(-50%)' },
        }}
      >
        <SharkFin size={size} />
      </Box>
      {/* water line + wake ripple */}
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: size * 0.16,
          height: 2,
          backgroundColor: BRAND.green,
          opacity: 0.25,
          borderRadius: 2,
          '@keyframes devsharkWake': {
            '0%, 100%': { opacity: 0.15, transform: 'scaleX(0.9)' },
            '50%': { opacity: 0.35, transform: 'scaleX(1)' },
          },
          animation: 'devsharkWake 2.4s ease-in-out infinite',
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        }}
      />
    </Box>
  );
}
