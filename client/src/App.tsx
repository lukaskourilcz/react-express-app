import { Box, AppBar, Toolbar, Typography, Button } from '@mui/material';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import Quiz from './components/Quiz';
import Profile from './components/Profile';
import AuthButton from './components/AuthButton';

function App() {
  const location = useLocation();
  let isAuthenticated = false;

  try {
    const auth0 = useAuth0();
    isAuthenticated = auth0.isAuthenticated;
  } catch {
    // Auth0 not configured
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      {/* Navigation Bar */}
      <AppBar
        position="static"
        elevation={0}
        sx={{
          backgroundColor: '#fff',
          borderBottom: '1px solid #e0e0e0',
        }}
      >
        <Toolbar sx={{ maxWidth: 1200, width: '100%', mx: 'auto', px: { xs: 2, sm: 3 } }}>
          <Typography
            variant="h6"
            component={Link}
            to="/"
            sx={{
              flexGrow: 1,
              fontWeight: 700,
              color: '#1a1a1a',
              textDecoration: 'none',
              fontSize: '1.1rem',
            }}
          >
            DevQuiz
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              component={Link}
              to="/"
              sx={{
                color: location.pathname === '/' ? '#339933' : '#666',
                fontWeight: location.pathname === '/' ? 600 : 500,
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: 'rgba(51, 153, 51, 0.04)',
                },
              }}
            >
              Quiz
            </Button>

            {isAuthenticated && (
              <Button
                component={Link}
                to="/profile"
                sx={{
                  color: location.pathname === '/profile' ? '#339933' : '#666',
                  fontWeight: location.pathname === '/profile' ? 600 : 500,
                  textTransform: 'none',
                  '&:hover': {
                    backgroundColor: 'rgba(51, 153, 51, 0.04)',
                  },
                }}
              >
                Profile
              </Button>
            )}

            <AuthButton />
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box
        sx={{
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
          <Routes>
            <Route path="/" element={<Quiz />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </Box>
      </Box>
    </Box>
  );
}

export default App;
