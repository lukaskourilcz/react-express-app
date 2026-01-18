import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#5a67d8',
      light: '#7c85e0',
      dark: '#4c56c0',
    },
    secondary: {
      main: '#764ba2',
      light: '#9b6fc7',
      dark: '#5a3480',
    },
    success: {
      main: '#48bb78',
      light: '#68d391',
      dark: '#38a169',
    },
    error: {
      main: '#f56565',
      light: '#fc8181',
      dark: '#e53e3e',
    },
    background: {
      default: '#f7fafc',
      paper: '#ffffff',
    },
    text: {
      primary: '#2d3748',
      secondary: '#718096',
    },
  },
  typography: {
    fontFamily: 'Roboto, -apple-system, BlinkMacSystemFont, sans-serif',
    h4: {
      fontWeight: 600,
      color: '#2d3748',
    },
    h5: {
      fontWeight: 600,
      color: '#4a5568',
    },
    h6: {
      fontWeight: 600,
      color: '#4a5568',
    },
    body1: {
      color: '#2d3748',
    },
    body2: {
      color: '#718096',
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
          borderRadius: 8,
          padding: '8px 20px',
          boxShadow: 'none',
        },
        containedPrimary: {
          backgroundColor: '#5a67d8',
          '&:hover': {
            backgroundColor: '#4c56c0',
            boxShadow: 'none',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #e2e8f0',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          textTransform: 'capitalize',
          fontSize: '0.75rem',
        },
      },
    },
    MuiRadio: {
      styleOverrides: {
        root: {
          padding: '2px',
          color: '#a0aec0',
          '& .MuiSvgIcon-root': {
            fontSize: '1rem',
          },
          '&.Mui-checked': {
            color: '#5a67d8',
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          height: 6,
          borderRadius: 3,
          backgroundColor: '#e2e8f0',
        },
        bar: {
          borderRadius: 3,
          backgroundColor: '#5a67d8',
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
          padding: '6px 10px',
          borderRadius: 6,
          border: '1px solid #e2e8f0',
          backgroundColor: '#ffffff',
          transition: 'all 0.15s ease',
          '&:hover': {
            borderColor: '#cbd5e0',
            backgroundColor: '#f7fafc',
          },
        },
        label: {
          fontWeight: 400,
          color: '#4a5568',
          fontSize: '0.8rem',
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
    backgroundColor: '#ffffff',
    color: '#5a67d8',
    border: '1px solid #5a67d8',
    '&:hover': {
      backgroundColor: '#f7fafc',
    },
    '&.Mui-disabled': {
      backgroundColor: '#f7fafc',
      color: '#a0aec0',
      borderColor: '#e2e8f0',
    },
  },
  nextButton: {
    px: 3,
    py: 1,
    backgroundColor: '#ffffff',
    color: '#5a67d8',
    border: '1px solid #5a67d8',
    '&:hover': {
      backgroundColor: '#f7fafc',
    },
  },
  previousButton: {
    px: 3,
    py: 1,
    backgroundColor: '#ffffff',
    color: '#4a5568',
    border: '1px solid #e2e8f0',
    '&:hover': {
      backgroundColor: '#f7fafc',
      borderColor: '#cbd5e0',
    },
    '&.Mui-disabled': {
      backgroundColor: 'transparent',
      color: 'rgba(255,255,255,0.4)',
      borderColor: 'rgba(255,255,255,0.2)',
    },
  },
  optionSelected: {
    borderColor: '#5a67d8',
    backgroundColor: '#ebf4ff',
  },
};
