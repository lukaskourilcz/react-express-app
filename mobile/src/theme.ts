// Brand palette + light/dark colors for the mobile app, mirroring the web
// theme's green-on-paper identity (client/src/theme/MuiTheme.ts). The four
// brand accents (green, ocean, gold, coral) match the web BRAND tokens exactly
// so the two clients read as one product.

export const BRAND = {
  green: '#2d7a2d',
  greenHover: '#246124',
  greenSoft: 'rgba(45, 122, 45, 0.10)',
  /** Legible green for small text on dark surfaces. */
  greenBright: '#4caf50',
  ocean: '#0e7490',
  oceanSoft: 'rgba(14, 116, 144, 0.10)',
  gold: '#f5a623',
  goldDark: '#c77f00',
  coral: '#e4506e',
};

export interface ThemeColors {
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  border: string;
  brand: string;
  brandSoft: string;
  ocean: string;
  gold: string;
  goldDark: string;
  coral: string;
  success: string;
  error: string;
}

export const lightColors: ThemeColors = {
  background: '#f8f9fa',
  card: '#ffffff',
  text: '#1a1a1a',
  textSecondary: '#525252',
  border: '#e5e5e5',
  brand: BRAND.green,
  brandSoft: BRAND.greenSoft,
  ocean: BRAND.ocean,
  gold: BRAND.gold,
  goldDark: BRAND.goldDark,
  coral: BRAND.coral,
  success: '#16a34a',
  error: '#dc2626',
};

export const darkColors: ThemeColors = {
  background: '#0f1115',
  card: '#181a20',
  text: '#f5f5f5',
  textSecondary: '#b5b5b5',
  border: '#2a2d35',
  brand: BRAND.greenBright,
  brandSoft: 'rgba(76, 175, 80, 0.14)',
  ocean: '#22a5c4',
  gold: '#ffbf47',
  goldDark: '#d9971f',
  coral: '#f06a86',
  success: '#4ade80',
  error: '#f87171',
};
