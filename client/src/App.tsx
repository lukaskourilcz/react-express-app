import { lazy, Suspense, useEffect, useState } from 'react';
import { Box, AppBar, Toolbar, Typography, Button, IconButton, Tooltip, Drawer, List, ListItemButton, ListItemText, Divider } from '@mui/material';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import AuthButton from './components/AuthButton';
import LanguageSwitcher from './components/LanguageSwitcher';
import LoadingState from './components/LoadingState';
import { InstagramIcon, GitHubIcon, SunIcon, MoonIcon, MenuIcon } from './components/icons';
import { useColorMode } from './theme/ColorModeContext';
import { useT } from './i18n/LanguageContext';
import type { TranslationKey } from './i18n/translations';
import { BRAND } from './theme/MuiTheme';

const Quiz = lazy(() => import('./components/Quiz'));
const Profile = lazy(() => import('./components/Profile'));
const Leaderboard = lazy(() => import('./components/Leaderboard'));
const Flashcards = lazy(() => import('./components/Flashcards'));
const PlayLanding = lazy(() => import('./components/Play').then((m) => ({ default: m.PlayLanding })));
const PlayMatch = lazy(() => import('./components/Play').then((m) => ({ default: m.PlayMatch })));

const ROUTE_TITLE_KEYS: Record<string, TranslationKey> = {
  '/': 'title.home',
  '/profile': 'title.profile',
  '/leaderboard': 'title.leaderboard',
  '/cards': 'title.cards',
  '/play': 'title.play',
};

const NAV_ITEMS: { to: string; key: TranslationKey; isActive: (path: string) => boolean }[] = [
  { to: '/', key: 'nav.quiz', isActive: (p) => p === '/' },
  { to: '/play', key: 'nav.play', isActive: (p) => p.startsWith('/play') },
  { to: '/leaderboard', key: 'nav.leaderboard', isActive: (p) => p === '/leaderboard' },
  { to: '/cards', key: 'nav.cards', isActive: (p) => p === '/cards' },
];

const RouteLoader = () => {
  const t = useT();
  return <LoadingState label={t('common.loading')} py={6} size={28} />;
};

function App() {
  const location = useLocation();
  const t = useT();
  const [quizActive, setQuizActive] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { mode, toggle } = useColorMode();

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
                {NAV_ITEMS.map((item) => (
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
              {NAV_ITEMS.map((item) => (
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
