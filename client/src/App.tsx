import { lazy, Suspense, useEffect, useState } from 'react';
import { Box, AppBar, Toolbar, Typography, Button, IconButton, Tooltip, Drawer, List, ListItemButton, ListItemText, Divider } from '@mui/material';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import AuthButton from './components/AuthButton';
import LanguageSwitcher from './components/LanguageSwitcher';
import LoadingScreen from './components/LoadingScreen';
import { useColorMode } from './theme/ColorModeContext';
import { useT } from './i18n/LanguageContext';
import type { TranslationKey } from './i18n/translations';
import { BRAND } from './theme/MuiTheme';
import { useGameConfig, type GameConfig } from './lib/gameConfig';

const Quiz = lazy(() => import('./components/Quiz'));
const Profile = lazy(() => import('./components/Profile'));
const Leaderboard = lazy(() => import('./components/Leaderboard'));
const Flashcards = lazy(() => import('./components/Flashcards'));
const PlayLanding = lazy(() => import('./components/Play').then((m) => ({ default: m.PlayLanding })));
const PlayMatch = lazy(() => import('./components/Play').then((m) => ({ default: m.PlayMatch })));
const DevPage = lazy(() => import('./components/dev/DevPage'));

const ROUTE_TITLE_KEYS: Record<string, TranslationKey> = {
  '/': 'title.home',
  '/profile': 'title.profile',
  '/leaderboard': 'title.leaderboard',
  '/cards': 'title.cards',
  '/play': 'title.play',
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

const MenuIcon = () => (
  <svg aria-hidden="true" focusable="false" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

// `feature` ties a nav item to a toggle in /dev → Settings; when that feature is
// off, the item is hidden from the nav (quiz is always available).
const NAV_ITEMS: {
  to: string;
  key: TranslationKey;
  isActive: (path: string) => boolean;
  feature?: keyof GameConfig['features'];
}[] = [
  { to: '/', key: 'nav.quiz', isActive: (p) => p === '/' },
  { to: '/play', key: 'nav.play', isActive: (p) => p.startsWith('/play'), feature: 'multiplayer' },
  { to: '/leaderboard', key: 'nav.leaderboard', isActive: (p) => p === '/leaderboard', feature: 'leaderboard' },
  { to: '/cards', key: 'nav.cards', isActive: (p) => p === '/cards', feature: 'flashcards' },
];

const RouteLoader = () => {
  const t = useT();
  return <LoadingScreen label={t('common.loading')} size={28} sx={{ minHeight: 'auto', py: 6 }} />;
};

function App() {
  const location = useLocation();
  const t = useT();
  const config = useGameConfig();
  const [quizActive, setQuizActive] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { mode, toggle } = useColorMode();

  // Nav items for features that are currently enabled in /dev → Settings.
  const navItems = NAV_ITEMS.filter((item) => !item.feature || config.features[item.feature]);

  useEffect(() => {
    const titleKey = ROUTE_TITLE_KEYS[location.pathname];
    document.title = titleKey
      ? t(titleKey)
      : location.pathname.startsWith('/play/')
        ? t('title.playMatch')
        : t('title.default');
    const main = document.getElementById('main-content');
    if (main) {
      main.focus({ preventScroll: true });
    }
  }, [location.pathname, t]);

  // The /dev console is a standalone admin surface — no app chrome.
  const showChrome = !location.pathname.startsWith('/dev') && !(quizActive && location.pathname === '/');
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
        {t('common.skipToContent')}
      </Box>

      {showChrome && (
        <>
        <AppBar position="static" elevation={0} sx={{ backgroundColor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Toolbar sx={{ maxWidth: 1200, width: '100%', mx: 'auto', px: { xs: 2, sm: 3 } }}>
            <IconButton
              edge="start"
              aria-label={t('nav.menu')}
              onClick={() => setMobileNavOpen(true)}
              sx={{ display: { xs: 'inline-flex', sm: 'none' }, mr: 0.5, color: 'text.secondary' }}
            >
              <MenuIcon />
            </IconButton>

            <Typography
              variant="h6"
              component={Link}
              to="/"
              aria-label={t('nav.home')}
              sx={{ flexGrow: 1, fontWeight: 700, color: 'text.primary', textDecoration: 'none', fontSize: '1.1rem' }}
            >
              DevQuiz
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 } }}>
              <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1 }}>
                {navItems.map((item) => (
                  <Button
                    key={item.to}
                    component={Link}
                    to={item.to}
                    sx={navLinkSx(item.isActive(location.pathname))}
                  >
                    {t(item.key)}
                  </Button>
                ))}
              </Box>
              <LanguageSwitcher />
              <Tooltip title={mode === 'light' ? t('common.darkMode') : t('common.lightMode')}>
                <IconButton
                  onClick={toggle}
                  aria-label={mode === 'light' ? t('common.darkMode') : t('common.lightMode')}
                  sx={{ color: 'text.secondary' }}
                >
                  {mode === 'light' ? <MoonIcon /> : <SunIcon />}
                </IconButton>
              </Tooltip>
              <AuthButton />
            </Box>
          </Toolbar>
        </AppBar>
        <Drawer
          anchor="left"
          open={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
          sx={{ display: { xs: 'block', sm: 'none' } }}
        >
          <Box sx={{ width: 240 }} role="presentation" onClick={() => setMobileNavOpen(false)}>
            <Typography variant="h6" sx={{ p: 2, fontWeight: 700, color: 'text.primary' }}>
              DevQuiz
            </Typography>
            <Divider />
            <List>
              {navItems.map((item) => (
                <ListItemButton
                  key={item.to}
                  component={Link}
                  to={item.to}
                  selected={item.isActive(location.pathname)}
                >
                  <ListItemText primary={t(item.key)} />
                </ListItemButton>
              ))}
            </List>
          </Box>
        </Drawer>
        </>
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
          padding: { xs: '1.25rem 1rem', sm: '3rem 1.5rem' },
          boxSizing: 'border-box',
          outline: 'none',
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 800 }}>
          <Suspense fallback={<RouteLoader />}>
            <Routes>
              <Route path="/" element={<Quiz onActiveChange={setQuizActive} />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/cards" element={<Flashcards />} />
              <Route path="/play" element={<PlayLanding />} />
              <Route path="/play/:code" element={<PlayMatch />} />
              <Route path="/dev" element={<DevPage />} />
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
