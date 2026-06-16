import { createTheme, responsiveFontSizes, type ThemeOptions } from '@mui/material/styles';
import type { PaletteMode } from '@mui/material';
import { BRAND } from '@shared/brand';

export { BRAND };

// Reusable "brand green" contained-button styling. Theme-aware disabled tokens
// keep the label legible in dark mode. Use via the <BrandButton> component or
// by spreading into an sx prop.
export const brandButtonSx = {
  backgroundColor: BRAND.green,
  color: '#ffffff',
  '&:hover': { backgroundColor: BRAND.greenHover },
  '&.Mui-disabled': {
    backgroundColor: 'action.disabledBackground',
    color: 'text.disabled',
  },
};

export const CATEGORY_GRADIENT =
  'linear-gradient(90deg, #e34c26, #264de4, #f7df1e, #3178c6, #61dafb, #339933, #f05032, #8b5cf6, #06b6d4, #ec4899)';

const baseOptions = (mode: PaletteMode): ThemeOptions => ({
  palette: {
    mode,
    primary: {
      main: mode === 'light' ? '#1a1a1a' : '#ffffff',
      light: mode === 'light' ? '#333333' : '#e5e5e5',
      dark: mode === 'light' ? '#000000' : '#bdbdbd',
    },
    secondary: {
      main: '#6b6b6b',
      light: '#8a8a8a',
      dark: '#444444',
    },
    success: {
      main: '#16a34a',
      light: '#4ade80',
      dark: '#15803d',
    },
    error: {
      main: '#dc2626',
      light: '#f87171',
      dark: '#b91c1c',
    },
    warning: {
      main: '#d97706',
      light: '#fbbf24',
      dark: '#b45309',
    },
    info: {
      main: '#2563eb',
      light: '#60a5fa',
      dark: '#1d4ed8',
    },
    background: {
      default: mode === 'light' ? '#f8f9fa' : '#0f1115',
      paper: mode === 'light' ? '#ffffff' : '#181a20',
    },
    text: {
      primary: mode === 'light' ? '#1a1a1a' : '#f5f5f5',
      secondary: mode === 'light' ? '#525252' : '#b5b5b5',
    },
    divider: mode === 'light' ? '#e5e5e5' : '#2a2d35',
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    overline: {
      fontSize: '0.7rem',
      fontWeight: 600,
      letterSpacing: '0.6px',
      textTransform: 'uppercase',
    },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: 6,
          padding: '8px 16px',
          boxShadow: 'none',
          '&:focus-visible': {
            outline: `2px solid ${BRAND.green}`,
            outlineOffset: '2px',
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          '&:focus-visible': {
            outline: `2px solid ${BRAND.green}`,
            outlineOffset: '2px',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: 'none',
          border: mode === 'light' ? '1px solid #e5e5e5' : '1px solid #2a2d35',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500, fontSize: '0.8rem' },
      },
    },
    MuiRadio: {
      styleOverrides: {
        root: {
          padding: '4px',
          color: mode === 'light' ? '#bdbdbd' : '#6b6b6b',
          '& .MuiSvgIcon-root': { fontSize: '1.1rem' },
          '&.Mui-checked': { color: BRAND.green },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          height: 6,
          borderRadius: 3,
          backgroundColor: mode === 'light' ? '#e5e5e5' : '#2a2d35',
        },
      },
    },
    MuiAlert: { styleOverrides: { root: { borderRadius: 8 } } },
    MuiPaper: { styleOverrides: { root: { borderRadius: 8 } } },
    MuiFormControlLabel: {
      styleOverrides: {
        root: {
          margin: 0,
          padding: '10px 12px',
          borderRadius: 8,
          border: mode === 'light' ? '1px solid #e5e5e5' : '1px solid #2a2d35',
          backgroundColor: mode === 'light' ? '#ffffff' : '#181a20',
          transition: 'all 0.15s ease',
          minHeight: 44,
          '&:hover': {
            borderColor: BRAND.green,
            backgroundColor: mode === 'light' ? '#fafafa' : '#1f222a',
          },
          '&:focus-within': {
            borderColor: BRAND.green,
            boxShadow: `0 0 0 2px ${BRAND.greenSoft}`,
          },
        },
        label: { fontWeight: 400, fontSize: '0.9rem' },
      },
    },
  },
});

// responsiveFontSizes makes all typography variants (h1–h6, body, caption, …)
// scale down on smaller breakpoints, so headings/text are noticeably smaller on
// phones and grow toward their full size on larger screens.
export const createAppTheme = (mode: PaletteMode) => responsiveFontSizes(createTheme(baseOptions(mode)));

export const quizStyles = {
  startButton: { px: 4, py: 1.25, fontSize: '1rem' },
  brandButton: brandButtonSx,
  submitButton: { px: 3, py: 1, ...brandButtonSx },
  nextButton: { px: 3, py: 1, ...brandButtonSx },
  previousButton: {
    px: 3,
    py: 1,
    backgroundColor: 'transparent',
    color: 'text.secondary',
    border: '1px solid',
    borderColor: 'divider',
    '&:hover': { borderColor: BRAND.green, color: BRAND.green },
  },
  optionSelected: {
    borderColor: BRAND.green,
    backgroundColor: BRAND.greenSoft,
  },
};
