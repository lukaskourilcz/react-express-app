// Mesh gradients, Colorflow-style (colorflow.ls.graphics) - authored in the
// OKLCH colour space so the colour stops blend perceptually instead of muddying
// through sRGB. Tuned to StudyShark's brand green with teal/lime accents.
//
// Zero runtime cost and zero dependency: these are plain CSS `background-image`
// layers (radial gradients only, no base colour) so they compose *over* the
// theme's `background.default`. If a browser doesn't understand `oklch()` the
// whole image declaration is simply ignored and the flat theme background shows
// through - graceful degradation for free. Kept low-alpha so foreground text
// stays well above contrast thresholds.

import type { PaletteMode } from '@mui/material';

// Light mode runs noticeably richer chroma + alpha than dark: pastel washes on
// a near-white page need the extra saturation to register at all.
const HERO_MESH_LIGHT = [
  'radial-gradient(at 16% 20%, oklch(0.87 0.15 145 / 0.85) 0px, transparent 55%)',
  'radial-gradient(at 84% 10%, oklch(0.85 0.12 195 / 0.70) 0px, transparent 50%)',
  'radial-gradient(at 72% 84%, oklch(0.90 0.14 128 / 0.65) 0px, transparent 55%)',
  'radial-gradient(at 26% 80%, oklch(0.86 0.11 162 / 0.58) 0px, transparent 50%)',
].join(', ');

const HERO_MESH_DARK = [
  'radial-gradient(at 16% 20%, oklch(0.50 0.11 145 / 0.45) 0px, transparent 55%)',
  'radial-gradient(at 84% 10%, oklch(0.46 0.09 195 / 0.36) 0px, transparent 50%)',
  'radial-gradient(at 72% 84%, oklch(0.48 0.10 128 / 0.32) 0px, transparent 55%)',
  'radial-gradient(at 26% 80%, oklch(0.44 0.08 162 / 0.28) 0px, transparent 50%)',
].join(', ');

/** Mesh-gradient `background-image` for the landing hero, per colour mode. */
export function heroMeshFor(mode: PaletteMode): string {
  return mode === 'light' ? HERO_MESH_LIGHT : HERO_MESH_DARK;
}
