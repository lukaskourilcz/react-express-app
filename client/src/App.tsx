import { Box } from '@mui/material';
import Quiz from './components/Quiz';

function App() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#ffffff',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: { xs: '2rem 1rem', sm: '3rem 1.5rem' },
        boxSizing: 'border-box',
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: '500px',
        }}
      >
        <Quiz />
      </Box>
    </Box>
  );
}

export default App;
