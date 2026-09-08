// The waterline bank: eight variants of the one decorative underline.
//
// The mark under a kicker, under a review heading and across a section rule is
// the same 24×6 wave tile everywhere, which at any density starts to read as a
// repeated stamp rather than as water. Eight variants fix that without changing
// the mark: same bounding box, same stroke weight, same smooth style, small
// differences in amplitude, phase and how the curve is spaced.
//
// Variant 1 is the mark exactly as it was, so nothing that already looked right
// changes.
//
// SELECTION. Each component instance keeps one variant for its whole life. The
// index comes from React's `useId`, which is stable across rerenders,
// interactions and resizes, and identical on the server and in the browser —
// so there is no `Math.random` in a render and nothing to mismatch. Siblings
// rendered together get consecutive ids, and the step of three (coprime with
// eight) turns that into 1, 4, 7, 2, 5, 8, 3, 6: no two neighbours alike, and
// all eight used before any repeats.
//
// The variants live as CSS custom properties (`--ss-wave-1` … `--ss-wave-8`)
// with one utility class each. A class sets `--ss-wave` on that element only,
// so the global token stays the fallback and changing it does not flatten every
// instance to the same wave.

import { useId } from 'react';

export const WAVE_VARIANT_COUNT = 8;

/** A variant number, 1-based, as the CSS classes name them. */
export type WaveVariant = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

const isWaveVariant = (value: number): value is WaveVariant =>
  Number.isInteger(value) && value >= 1 && value <= WAVE_VARIANT_COUNT;

/** The class that scopes one variant to one element. */
export const waveVariantClass = (variant: WaveVariant): string => `ss-wave-v${variant}`;

/**
 * Turn any stable string into a variant. Exported so a preview or a test can
 * ask for the same variant a given key would produce.
 */
export function waveVariantFor(key: string): WaveVariant {
  // React ids look like ":r7:" or ":Rp2H1:"; the digits are what varies between
  // siblings. Anything else falls back to a character sum, which is stable for
  // the same input and good enough for a decoration.
  const digits = key.replace(/\D/g, '');
  const n = digits.length > 0
    ? Number(digits.slice(-6))
    : Array.from(key).reduce((total, char) => total + char.charCodeAt(0), 0);
  // Step by three so consecutive ids never land on neighbouring variants.
  return ((n * 3) % WAVE_VARIANT_COUNT) + 1 as WaveVariant;
}

/**
 * One variant per component instance, held for the instance's lifetime.
 *
 * Pass `explicit` to pin one — a preview, a screenshot test, or a place where a
 * particular wave belongs. Anything out of range is ignored rather than
 * clamped, because a caller passing 12 meant something and silently drawing
 * variant 4 would hide it.
 */
export function useWaveVariant(explicit?: number): string {
  const id = useId();
  const variant = explicit !== undefined && isWaveVariant(explicit) ? explicit : waveVariantFor(id);
  return waveVariantClass(variant);
}
