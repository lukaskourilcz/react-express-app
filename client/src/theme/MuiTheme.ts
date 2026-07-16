/**
 * StudyShark brand constants. (Formerly the MUI theme factory — the app is now
 * MUI-free; only these plain, framework-agnostic tokens remain.)
 *
 *   green   #2d7a2d  brand / primary actions / success moments ("shark green")
 *   ocean   #0e7490  informational accents, links, water flourishes
 *   gold    #f5a623  checkpoints, trophies, celebration
 *   coral   #e4506e  hearts / lives (decorative danger — distinct from error red)
 */
export const BRAND = {
  green: '#2d7a2d',
  greenHover: '#246124',
  greenSoft: 'rgba(45, 122, 45, 0.08)',
  /** Legible green for small text on dark surfaces (4.5:1 on #181a20). */
  greenBright: '#4caf50',
  ocean: '#0e7490',
  oceanSoft: 'rgba(14, 116, 144, 0.08)',
  gold: '#f5a623',
  goldDark: '#c77f00',
  coral: '#e4506e',
  textTertiary: '#6b6b6b',
};

// Visually hide an element while keeping it available to screen readers.
// Standard sr-only clipping (not off-screen positioning, which can create
// phantom scroll regions). Used for status text and off-screen labels.
export const visuallyHidden = {
  position: 'absolute',
  width: 1,
  height: 1,
  margin: -1,
  border: 0,
  padding: 0,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
} as const;
