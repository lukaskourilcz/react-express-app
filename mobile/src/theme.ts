// Light/dark colors for the mobile app. The brand palette is shared with the
// web client — see ../../shared/brand.ts.
import { BRAND } from '@shared/brand';

export { BRAND };

export interface ThemeColors {
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  border: string;
  brand: string;
  brandSoft: string;
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
  success: '#16a34a',
  error: '#dc2626',
};

export const darkColors: ThemeColors = {
  background: '#0f1115',
  card: '#181a20',
  text: '#f5f5f5',
  textSecondary: '#b5b5b5',
  border: '#2a2d35',
  brand: '#4caf50',
  brandSoft: 'rgba(76, 175, 80, 0.14)',
  success: '#4ade80',
  error: '#f87171',
};
