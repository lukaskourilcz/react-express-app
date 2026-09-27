import { useId } from 'react';
import {
  FIN_BODY, FIN_MIRROR, FIN_WAVE_CUT, FIN_WAVE_LINE,
  LOGO_FIN_PLACEMENT, LOGO_LETTERS, LOGO_LETTER_STROKE, LOGO_VIEW_BOX, LOGO_WAVE_STROKE, LOGO_WORDMARK_X,
} from './brandGeometry';

/**
 * The devShark compact logo: the fin with its wave, then the devShark
 * wordmark. Every path and transform is copied from
 * client/public/brand/v9/recommended/devshark-logo-compact-green.svg (see
 * brandGeometry.ts). The fill and strokes read `currentColor`, so the parent
 * sets the colour: the subject accent, or white on ink.
 *
 * Brand rules (docs/brand/brand-guidelines.md):
 * - Minimum height: 18 px for this compact logo, 24 px for the primary
 *   horizontal logo.
 * - Below 100 px of width, use the clean fin (`SharkFin`) instead of a logo.
 * - Clear space on every side equals the height of the letter d.
 * - Never redraw, stretch, recolour single letters or add effects. The
 *   spelling is always devShark.
 */

const VIEW_BOX = `${LOGO_VIEW_BOX.x} ${LOGO_VIEW_BOX.y} ${LOGO_VIEW_BOX.width} ${LOGO_VIEW_BOX.height}`;
const FIN_TRANSFORM = `translate(${LOGO_FIN_PLACEMENT.x} ${LOGO_FIN_PLACEMENT.y}) scale(${LOGO_FIN_PLACEMENT.scale})`;

interface BrandLogoProps {
  /** Rendered height in px. 22 in the header, 20 in the mobile menu. */
  height?: number;
  /** Accessible name. Leave it out when the surrounding link names itself. */
  label?: string;
}

export default function BrandLogo({ height = 22, label }: BrandLogoProps) {
  const clipId = `devshark-logo-cut-${useId().replace(/:/g, '')}`;
  const width = Math.round((height * LOGO_VIEW_BOX.width / LOGO_VIEW_BOX.height) * 100) / 100;
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };
  return (
    <svg
      {...a11y}
      focusable="false"
      viewBox={VIEW_BOX}
      width={width}
      height={height}
      fill="currentColor"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <defs><clipPath id={clipId}><path d={FIN_WAVE_CUT} /></clipPath></defs>
      <g transform={FIN_TRANSFORM}>
        <g clipPath={`url(#${clipId})`}><path d={FIN_BODY} transform={FIN_MIRROR} /></g>
        <path d={FIN_WAVE_LINE} fill="none" stroke="currentColor" strokeWidth={LOGO_WAVE_STROKE} strokeLinecap="round" />
      </g>
      <g transform={`translate(${LOGO_WORDMARK_X} 0)`}>
        {LOGO_LETTERS.map(({ d, dx }) => (
          <path
            key={d.slice(0, 12)}
            d={d}
            transform={dx ? `translate(${dx} 0)` : undefined}
            stroke="currentColor"
            strokeWidth={LOGO_LETTER_STROKE}
            strokeLinejoin="round"
            strokeLinecap="round"
            paintOrder="stroke"
          />
        ))}
      </g>
    </svg>
  );
}
