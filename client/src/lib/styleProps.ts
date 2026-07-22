import type { CSSProperties } from 'react';

export type SpacingKey =
  | 'p' | 'px' | 'py' | 'pt' | 'pr' | 'pb' | 'pl'
  | 'm' | 'mx' | 'my' | 'mt' | 'mr' | 'mb' | 'ml';

/** The small, backwards-compatible subset of MUI-style spacing props used by legacy callers. */
export type SxLike = CSSProperties & Partial<Record<SpacingKey, number | string>>;

const SPACING_MAP: Record<SpacingKey, Array<keyof CSSProperties>> = {
  p: ['padding'], px: ['paddingLeft', 'paddingRight'], py: ['paddingTop', 'paddingBottom'],
  pt: ['paddingTop'], pr: ['paddingRight'], pb: ['paddingBottom'], pl: ['paddingLeft'],
  m: ['margin'], mx: ['marginLeft', 'marginRight'], my: ['marginTop', 'marginBottom'],
  mt: ['marginTop'], mr: ['marginRight'], mb: ['marginBottom'], ml: ['marginLeft'],
};

/** Expand numeric spacing values using the historic 8px unit without keeping two implementations. */
export function sxToStyle(sx?: SxLike): CSSProperties {
  if (!sx) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(sx)) {
    const targets = SPACING_MAP[key as SpacingKey];
    if (targets) {
      const resolved = typeof value === 'number' ? value * 8 : value;
      for (const property of targets) out[property as string] = resolved;
    } else {
      out[key] = value;
    }
  }
  return out as CSSProperties;
}
