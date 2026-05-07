import { lazy, Suspense, useEffect, useState } from 'react';
import { Box, AppBar, Toolbar, Typography, Button, IconButton, CircularProgress, Tooltip } from '@mui/material';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import AuthButton from './components/AuthButton';
import { useColorMode } from './theme/ColorModeContext';
import { BRAND } from './theme/MuiTheme';

const Quiz = lazy(() => import('./components/Quiz'));
const Profile = lazy(() => import('./components/Profile'));
const Leaderboard = lazy(() => import('./components/Leaderboard'));
const CodeSandbox = lazy(() => import('./components/CodeSandbox'));
const PlayLanding = lazy(() => import('./components/Play').then((m) => ({ default: m.PlayLanding })));
const PlayMatch = lazy(() => import('./components/Play').then((m) => ({ default: m.PlayMatch })));

const ROUTE_TITLES: Record<string, string> = {
  '/': 'DevQuiz — Test your web dev skills',
  '/profile': 'Profile · DevQuiz',
  '/leaderboard': 'Leaderboard · DevQuiz',
  '/sandbox': 'Code playground · DevQuiz',
  '/play': 'Play live · DevQuiz',
};

const InstagramIcon = () => (
  <svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

const GitHubIcon = () => (
  <svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

const SunIcon = () => (
  <svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
);

const MoonIcon = () => (
  <svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const RouteLoader = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }} role="status" aria-live="polite">
    <CircularProgress size={28} sx={{ color: BRAND.green }} />
    <span style={{ position: 'absolute', left: -9999 }}>Loading…</span>
  </Box>
);

function App() {
  const location = useLocation();
  const [quizActive, setQuizActive] = useState(false);
  const { mode, toggle } = useColorMode();
  let isAuthenticated = false;

  try {
    isAuthenticated = useAuth0().isAuthenticated;
  } catch {
    // Auth0 not configured
  }

  useEffect(() => {
    document.title =
      ROUTE_TITLES[location.pathname] ??
      (location.pathname.startsWith('/play/') ? 'Live match · DevQuiz' : 'DevQuiz');
    const main = document.getElementById('main-content');
    if (main) {
      main.focus({ preventScroll: true });
    }
  }, [location.pathname]);

  const showChrome = !(quizActive && location.pathname === '/');
  const navLinkSx = (isActive: boolean) => ({
    color: isActive ? BRAND.green : 'text.secondary',
    fontWeight: isActive ? 700 : 500,
    textTransform: 'none' as const,
    textDecoration: isActive ? 'underline' : 'none',
    textUnderlineOffset: '4px',
    '&:hover': { backgroundColor: 'action.hover' },
  });

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default', display: 'flex', flexDirection: 'column' }}>
      <Box
        component="a"
        href="#main-content"
        sx={{
          position: 'absolute',
          left: -9999,
          top: 8,
          zIndex: 9999,
          background: 'background.paper',
          color: 'text.primary',
          px: 2,
          py: 1,
          borderRadius: 1,
          '&:focus': { left: 8 },
        }}
      >
        Skip to content
      </Box>

      {showChrome && (
        <AppBar position="static" elevation={0} sx={{ backgroundColor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Toolbar sx={{ maxWidth: 1200, width: '100%', mx: 'auto', px: { xs: 2, sm: 3 } }}>
            <Typography
              variant="h6"
              component={Link}
              to="/"
              aria-label="DevQuiz home"
              sx={{ flexGrow: 1, fontWeight: 700, color: 'text.primary', textDecoration: 'none', fontSize: '1.1rem' }}
            >
              DevQuiz
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button component={Link} to="/" sx={navLinkSx(location.pathname === '/')}>
                Quiz
              </Button>
              <Button
                component={Link}
                to="/play"
                sx={navLinkSx(location.pathname.startsWith('/play'))}
              >
                Play
              </Button>
              <Button
                component={Link}
                to="/leaderboard"
                sx={navLinkSx(location.pathname === '/leaderboard')}
              >
                Leaderboard
              </Button>
              <Button
                component={Link}
                to="/sandbox"
                sx={{
                  ...navLinkSx(location.pathname === '/sandbox'),
                  display: { xs: 'none', sm: 'inline-flex' },
                }}
              >
                Sandbox
              </Button>
              {isAuthenticated && (
                <Button component={Link} to="/profile" sx={navLinkSx(location.pathname === '/profile')}>
                  Profile
                </Button>
              )}
              <Tooltip title={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
                <IconButton
                  onClick={toggle}
                  aria-label={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                  sx={{ color: 'text.secondary' }}
                >
                  {mode === 'light' ? <MoonIcon /> : <SunIcon />}
                </IconButton>
              </Tooltip>
              <AuthButton />
            </Box>
          </Toolbar>
        </AppBar>
      )}

      <Box
        component="main"
        id="main-content"
        tabIndex={-1}
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: { xs: '2rem 1rem', sm: '3rem 1.5rem' },
          boxSizing: 'border-box',
          outline: 'none',
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 500 }}>
          <Suspense fallback={<RouteLoader />}>
            <Routes>
              <Route path="/" element={<Quiz onActiveChange={setQuizActive} />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/sandbox" element={<CodeSandbox />} />
              <Route path="/play" element={<PlayLanding />} />
              <Route path="/play/:code" element={<PlayMatch />} />
            </Routes>
          </Suspense>
        </Box>
      </Box>

      {showChrome && (
        <Box
          component="footer"
          sx={{ py: 2, textAlign: 'center', borderTop: '1px solid', borderColor: 'divider', backgroundColor: 'background.paper' }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
            <IconButton
              component="a"
              href="https://instagram.com/lukasbarsinbars"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram (opens in new tab)"
              sx={{ color: 'text.secondary', '&:hover': { color: '#E4405F' } }}
            >
              <InstagramIcon />
            </IconButton>
            <IconButton
              component="a"
              href="https://github.com/lukaskourilcz"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub (opens in new tab)"
              sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
            >
              <GitHubIcon />
            </IconButton>
          </Box>
        </Box>
      )}
    </Box>
  );
}

export default App;
