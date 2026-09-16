// WCAG 2.x contrast arithmetic, plus the one brand colour the design system
// needs a formula for instead of a hex: accent text sitting on the accent's
// own soft tint.
//
// `--brand-accent-soft` is not a colour anyone picked. It is the active
// subject's accent composited over whatever surface it lands on at
// ACCENT_SOFT_ALPHA (theme/ColorModeContext writes it; SubjectPicker writes a
// per-card copy). So whether `--brand-accent` is readable *on* that tint is a
// property of the subject's hue, not of one stylesheet — geoShark's
// orange-700 measured 4.34:1 against the tint on a white card and failed a
// real axe scan, while other subjects cleared the bar on the same markup.
//
// `accentOnSoft` answers that per subject and per mode: it walks the accent's
// own hue darker (light mode) or lighter (dark mode) until the pair clears
// 4.5:1 on the worst surface the tint is used over, and stops there. Hue and
// saturation never move, so the chip stays the subject's colour. The result is
// published as `--brand-accent-on-soft` and used only where accent-coloured
// text or a glyph sits on `--brand-accent-soft`; `--brand-accent` itself is
// untouched, because darkening it globally would repaint the brand.

type Mode = 'light' | 'dark';

/** Alpha `--brand-accent-soft` tints the accent with. One number, one meaning. */
export const ACCENT_SOFT_ALPHA = 0.12;

/** WCAG 2.2 AA minimum for text below 18.66px bold / 24px regular. */
const AA_SMALL_TEXT = 4.5;

/**
 * The `--brand-accent-soft` value for an accent: the accent as a translucent
 * tint, so chips and subtle fills pick up whatever surface they land on. One
 * definition, because `accentOnSoft` has to know the exact alpha it is
 * measuring against.
 */
export function accentSoft(accent: string): string {
  const [r, g, b] = parseHex(accent);
  return `rgba(${r}, ${g}, ${b}, ${ACCENT_SOFT_ALPHA})`;
}

/**
 * Surfaces `--brand-accent-soft` is composited over, per mode, taken from the
 * `--color-background-*` / `--ss-card-bg` ramp in styles/astryx-theme.css. The
 * derived colour has to clear the bar on the worst of them, so the token is
 * safe on a muted panel and not only on the white card that axe happened to
 * scan. In light mode the worst case is the darkest surface (dark text loses
 * contrast as the tint darkens); in dark mode it is the lightest.
 */
const SOFT_BACKDROPS: Record<Mode, readonly string[]> = {
  light: ['#ffffff', '#f3f6f5', '#edf2f1'],
  dark: ['#0b141b', '#101c24', '#14232c', '#16242d'],
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

function parseHex(hex: string): [number, number, number] {
  const raw = hex.trim().replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

const formatHex = (rgb: [number, number, number]): string =>
  '#' + rgb.map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');

/** WCAG relative luminance of an opaque `#rgb` / `#rrggbb` colour. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two opaque colours, 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** `top` at `alpha` over opaque `bottom`, as an opaque hex. */
export function compositeOver(top: string, alpha: number, bottom: string): string {
  const t = parseHex(top);
  const b = parseHex(bottom);
  return formatHex([
    t[0] * alpha + b[0] * (1 - alpha),
    t[1] * alpha + b[1] * (1 - alpha),
    t[2] * alpha + b[2] * (1 - alpha),
  ]);
}

function toHsl([r, g, b]: [number, number, number]): [number, number, number] {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rr) h = ((gg - bb) / d + (gg < bb ? 6 : 0)) / 6;
  else if (max === gg) h = ((bb - rr) / d + 2) / 6;
  else h = ((rr - gg) / d + 4) / 6;
  return [h, s, l];
}

function fromHsl(h: number, s: number, l: number): string {
  if (s === 0) {
    const v = l * 255;
    return formatHex([v, v, v]);
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t: number) => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return formatHex([channel(h + 1 / 3) * 255, channel(h) * 255, channel(h - 1 / 3) * 255]);
}

/**
 * The contrast `text` actually gets against `--brand-accent-soft` — the worst
 * ratio across the surfaces the tint is composited over in `mode`.
 */
export function accentSoftContrast(text: string, tint: string, mode: Mode): number {
  return Math.min(
    ...SOFT_BACKDROPS[mode].map((surface) =>
      contrastRatio(text, compositeOver(tint, ACCENT_SOFT_ALPHA, surface))),
  );
}

const derived = new Map<string, string>();

/**
 * A same-hue variant of `text` that clears 4.5:1 against the tint `tint`
 * produces, moved as little as it can be. Returns `text` unchanged when it
 * already passes, so subjects that never had a problem keep their exact hex.
 *
 * `text` is the accent the mode renders (`accent` in light, `accentBright` in
 * dark); `tint` is the accent `--brand-accent-soft` is mixed from, which is
 * the light `accent` in both modes.
 */
export function accentOnSoft(text: string, tint: string, mode: Mode): string {
  const key = `${text}|${tint}|${mode}`;
  const cached = derived.get(key);
  if (cached) return cached;
  let result = text;
  if (accentSoftContrast(text, tint, mode) < AA_SMALL_TEXT) {
    const [h, s, l] = toHsl(parseHex(text));
    // 0.5% of lightness per step: fine enough that the shift stays invisible
    // next to the undarkened accent, coarse enough to settle in a few dozen
    // iterations. Black on a light tint and white on a dark one always clear
    // the bar, so the walk terminates on a passing colour.
    const step = mode === 'light' ? -0.005 : 0.005;
    for (let next = l + step; next >= 0 && next <= 1; next += step) {
      const candidate = fromHsl(h, s, next);
      if (accentSoftContrast(candidate, tint, mode) >= AA_SMALL_TEXT) {
        result = candidate;
        break;
      }
      result = candidate;
    }
  }
  derived.set(key, result);
  return result;
}
