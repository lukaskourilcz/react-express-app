import { useId } from 'react';
import {
  FIN_BODY, FIN_MIRROR, FIN_WAVE_CUT, FIN_WAVE_LINE,
  LOGO_WAVE_STROKE,
} from './brandGeometry';
import wordmarkUrl from '../assets/brand/devshark-wordmark.svg';

/**
 * Approved October 2026 wordmark with the unchanged V9 fin and wave.
 * Both visible silhouettes are vertically centred, including the wave stroke.
 * A shared, cacheable SVG keeps the outlines out of the JavaScript bundle.
 * Fixed dimensions avoid layout shifts; the lettering needs no font.
 */

// Fin bounds including the round wave: x=-0.5..26.5, y=2.1..21.7.
const WORDMARK_WIDTH = 1347;
const WORDMARK_HEIGHT = 229;
const FIN_HEIGHT = 19.6;
const FIN_SCALE = WORDMARK_HEIGHT * 0.88 / FIN_HEIGHT;
const FIN_WIDTH = 27 * FIN_SCALE;
const WORDMARK_X = FIN_WIDTH + WORDMARK_HEIGHT * 0.28;
const WIDTH = WORDMARK_X + WORDMARK_WIDTH;
const FIN_TRANSFORM = `translate(${0.5 * FIN_SCALE} ${(WORDMARK_HEIGHT - FIN_HEIGHT * FIN_SCALE) / 2 - 2.1 * FIN_SCALE}) scale(${FIN_SCALE})`;

interface BrandLogoProps {
  /** Rendered height in px. 22 in the header, 20 in the mobile menu. */
  height?: number;
  /** Accessible name. Leave it out when the surrounding link names itself. */
  label?: string;
}

export default function BrandLogo({ height = 22, label }: BrandLogoProps) {
  const clipId = `devshark-logo-cut-${useId().replace(/:/g, '')}`;
  const width = Math.round((height * WIDTH / WORDMARK_HEIGHT) * 100) / 100;
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };
  return (
    <svg
      {...a11y}
      focusable="false"
      viewBox={`0 0 ${WIDTH} ${WORDMARK_HEIGHT}`}
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
      <g transform={`translate(${WORDMARK_X} 0)`} fillRule="evenodd">
        <use href={`${wordmarkUrl}#dev`} />
        <use href={`${wordmarkUrl}#shark`} fill="light-dark(var(--brand-ink), #fff)" />
      </g>
    </svg>
  );
}
