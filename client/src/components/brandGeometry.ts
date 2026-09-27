// The devShark V9 fin, copied 1:1 from the brand kit in
// client/public/brand/v9/recommended/ (devshark-fin-clean-*.svg,
// devshark-fin-wave-*.svg, devshark-logo-compact-*.svg). Do not redraw or
// round these numbers: SharkFin, SwimmingFin and BrandLogo share them, and the
// favicon and app icons are rendered from the same geometry.

/** The fin body in a 24-unit box: straight base on y=18, tip at the top. */
export const FIN_BODY = 'M2.4 18 C4.5 11.4 9.5 4.1 18 2.1 C15.2 6.1 15.4 12.2 21.6 18 Z';
/** Mirrors the body so the tip points left, away from the wordmark. */
export const FIN_MIRROR = 'translate(24 0) scale(-1 1)';
/** Clip region that cuts the base of the fin into the wave (transparent cutout). */
export const FIN_WAVE_CUT = 'M-7 16 Q-5 18.4 -3 16 T1 16 T5 16 T9 16 T13 16 T17 16 T21 16 T25 16 T29 16 T33 16 V -20 H -7 Z';
/** The single wave line under the fin, stroked with round caps. */
export const FIN_WAVE_LINE = 'M1 19 Q3 21.4 5 19 T9 19 T13 19 T17 19 T21 19 T25 19';
/** Stroke width of the wave on the standalone fin (the logo uses 3). */
export const FIN_WAVE_STROKE = 2.7;
