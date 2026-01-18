import { Typography, Box } from '@mui/material';
import Quiz from './components/Quiz';

function App() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#5a67d8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: { xs: '1.5rem 1rem', sm: '2rem 1.5rem' },
        boxSizing: 'border-box',
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: '600px',
        }}
      >
        <Box sx={{ textAlign: 'center', mb: { xs: 3, sm: 4 } }}>
          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontWeight: 700,
              color: '#ffffff',
              fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
              letterSpacing: '-0.5px',
            }}
          >
            Code Quiz
          </Typography>
          <Typography
            variant="subtitle1"
            sx={{
              color: 'rgba(255,255,255,0.75)',
              mt: 1,
              fontSize: { xs: '0.85rem', sm: '0.9rem' },
            }}
          >
            Test your knowledge of React, TypeScript, and Git
          </Typography>
        </Box>
        <Quiz />
      </Box>
    </Box>
  );
}

export default App;
