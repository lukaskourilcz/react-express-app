import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1a1a1a',
      light: '#333333',
      dark: '#000000',
    },
    secondary: {
      main: '#666666',
      light: '#888888',
      dark: '#444444',
    },
    success: {
      main: '#22c55e',
      light: '#4ade80',
      dark: '#16a34a',
    },
    error: {
      main: '#ef4444',
      light: '#f87171',
      dark: '#dc2626',
    },
    warning: {
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706',
    },
    info: {
      main: '#3b82f6',
      light: '#60a5fa',
      dark: '#2563eb',
    },
    background: {
      default: '#ffffff',
      paper: '#ffffff',
    },
    text: {
      primary: '#1a1a1a',
      secondary: '#666666',
    },
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h4: {
      fontWeight: 600,
      color: '#1a1a1a',
    },
    h5: {
      fontWeight: 600,
      color: '#1a1a1a',
    },
    h6: {
      fontWeight: 600,
      color: '#1a1a1a',
    },
    body1: {
      color: '#1a1a1a',
    },
    body2: {
      color: '#666666',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: 6,
          padding: '8px 16px',
          boxShadow: 'none',
        },
        containedPrimary: {
          backgroundColor: '#1a1a1a',
          '&:hover': {
            backgroundColor: '#333333',
            boxShadow: 'none',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: 'none',
          border: '1px solid #e5e5e5',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          fontSize: '0.8rem',
        },
      },
    },
    MuiRadio: {
      styleOverrides: {
        root: {
          padding: '4px',
          color: '#d4d4d4',
          '& .MuiSvgIcon-root': {
            fontSize: '1.1rem',
          },
          '&.Mui-checked': {
            color: '#1a1a1a',
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          height: 4,
          borderRadius: 2,
          backgroundColor: '#e5e5e5',
        },
        bar: {
          borderRadius: 2,
          backgroundColor: '#1a1a1a',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiFormControlLabel: {
      styleOverrides: {
        root: {
          margin: 0,
          padding: '10px 12px',
          borderRadius: 8,
          border: '1px solid #e5e5e5',
          backgroundColor: '#ffffff',
          transition: 'all 0.15s ease',
          '&:hover': {
            borderColor: '#d4d4d4',
            backgroundColor: '#fafafa',
          },
        },
        label: {
          fontWeight: 400,
          color: '#1a1a1a',
          fontSize: '0.9rem',
        },
      },
    },
  },
});

// Custom style variants for specific use cases
export const quizStyles = {
  startButton: {
    px: 4,
    py: 1.25,
    fontSize: '1rem',
  },
  submitButton: {
    px: 3,
    py: 1,
    backgroundColor: '#1a1a1a',
    color: '#ffffff',
    '&:hover': {
      backgroundColor: '#333333',
    },
    '&.Mui-disabled': {
      backgroundColor: '#e5e5e5',
      color: '#a3a3a3',
    },
  },
  nextButton: {
    px: 3,
    py: 1,
    backgroundColor: '#1a1a1a',
    color: '#ffffff',
    '&:hover': {
      backgroundColor: '#333333',
    },
  },
  previousButton: {
    px: 3,
    py: 1,
    backgroundColor: '#ffffff',
    color: '#666666',
    border: '1px solid #e5e5e5',
    '&:hover': {
      backgroundColor: '#fafafa',
      borderColor: '#d4d4d4',
    },
    '&.Mui-disabled': {
      backgroundColor: '#fafafa',
      color: '#d4d4d4',
      borderColor: '#e5e5e5',
    },
  },
  optionSelected: {
    borderColor: '#1a1a1a',
    backgroundColor: '#fafafa',
  },
};
