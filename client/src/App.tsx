import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { IconButton as AxIconButton } from '@astryxdesign/core/IconButton';
import { Badge as AxBadge } from '@astryxdesign/core/Badge';
import { AppToast } from './components/ui/AppToast';
import { useIsMobile } from './lib/useMediaQuery';
import './styles/app-shell.css';
import LoadingScreen from './components/LoadingScreen';
import { SwimmingFin, Waterline } from './components/SharkFin';
import { useColorMode } from './theme/ColorModeContext';
import { useT, useLanguage } from './i18n/LanguageContext';
import { preferredLanguageOf } from './lib/languagePref';
import { preferredTrackOf } from './lib/trackPref';
import { setTrackValue } from './lib/tracks';
import type { TranslationKey } from './i18n/translations';
import { useGameConfig, type GameConfig } from './lib/gameConfig';
import { primeRankMarker } from './lib/xp';
import XpToaster from './components/XpToaster';
import RegisterPromptSnackbar from './components/RegisterPromptSnackbar';
import { useAuth } from './lib/auth';
import { useHasChosenSubject, useActiveSubject, isSubjectLocked } from './lib/subjects';
import { grantRegistrationBonusIfNew, SIGNUP_BONUS_TOKENS } from './lib/tokens';
import { useSettings } from './lib/settings';
import { capturePageview, identifyUser, resetAnalytics } from './lib/analytics';
import { m, AnimatePresence, useReducedMotion } from './lib/motion';

// AuthButton subscribes to multiple stores and pulls in the leveling/shop
// modules — heavy for the initial bundle. Lazy-load it so the app shell
// (logo, nav, theme/sound toggles) paints first.
const AuthButton = lazy(() => import('./components/AuthButton'));

const Home = lazy(() => import('./components/Home'));
const Quiz = lazy(() => import('./components/Quiz'));
const Roadmap = lazy(() => import('./components/Roadmap'));
const CareerRoadmap = lazy(() => import('./components/CareerRoadmap'));
const Profile = lazy(() => import('./components/Profile'));
const Leaderboard = lazy(() => import('./components/Leaderboard'));
const Flashcards = lazy(() => import('./components/Flashcards'));
const Shop = lazy(() => import('./components/Shop'));
const PlayLanding = lazy(() => import('./components/Play').then((m) => ({ default: m.PlayLanding })));
const PlayMatch = lazy(() => import('./components/Play').then((m) => ({ default: m.PlayMatch })));
const Challenge = lazy(() => import('./components/Challenge'));
const DevPage = lazy(() => import('./components/dev/DevPage'));
const SubjectPicker = lazy(() => import('./components/SubjectPicker'));

// The landing gate: show the subject picker until the learner has chosen a
// subject, then the normal home. Both are lazy and render inside the shared
// route <Suspense>.
function Landing() {
  return useHasChosenSubject() ? <Home /> : <SubjectPicker />;
}

// Route-transition variants, hoisted so the m.div props keep a stable identity
// across App re-renders (App re-renders on every navigation — hottest path).
const ROUTE_ANIM = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
} as const;
const ROUTE_ANIM_REDUCED = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
} as const;
const ROUTE_TRANSITION = { duration: 0.2, ease: 'easeOut' } as const;

const ROUTE_TITLE_KEYS: Record<string, TranslationKey> = {
  '/': 'title.home',
  '/quiz': 'title.quiz',
  '/learn': 'title.learn',
  '/roadmap': 'title.roadmap',
  '/profile': 'title.profile',
  '/leaderboard': 'title.leaderboard',
  '/cards': 'title.cards',
  '/shop': 'title.shop',
  '/play': 'title.play',
  '/challenge': 'title.challenge',
};

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

const SoundOnIcon = () => (
  <svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 5 6 9H2v6h4l5 4V5z" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" />
  </svg>
);

const SoundOffIcon = () => (
  <svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 5 6 9H2v6h4l5 4V5z" />
    <line x1="23" y1="9" x2="17" y2="15" />
    <line x1="17" y1="9" x2="23" y2="15" />
  </svg>
);

const MenuIcon = () => (
  <svg aria-hidden="true" focusable="false" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const TrophyNavIcon = () => (
  <svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" />
    <path d="M5 4H3v2a3 3 0 0 0 3 3M19 4h2v2a3 3 0 0 1-3 3" />
  </svg>
);

const ShopNavIcon = () => (
  <svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 0 1-8 0" />
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
  { to: '/quiz', key: 'nav.quiz', isActive: (p) => p === '/quiz' },
  { to: '/learn', key: 'nav.learn', isActive: (p) => p.startsWith('/learn') },
  { to: '/challenge', key: 'nav.challenge', isActive: (p) => p.startsWith('/challenge') },
  { to: '/play', key: 'nav.play', isActive: (p) => p.startsWith('/play'), feature: 'multiplayer' },
  { to: '/leaderboard', key: 'nav.leaderboard', isActive: (p) => p === '/leaderboard', feature: 'leaderboard' },
  { to: '/cards', key: 'nav.cards', isActive: (p) => p === '/cards', feature: 'flashcards' },
  { to: '/shop', key: 'nav.shop', isActive: (p) => p === '/shop' },
  // Roadmap sits last in the nav, after the day-to-day learning links.
  { to: '/roadmap', key: 'nav.roadmap', isActive: (p) => p === '/roadmap' },
];

const RouteLoader = () => {
  const t = useT();
  const config = useGameConfig();
  // Full-page route load: hand the configured dev tips to the loader so one
  // surfaces under the shark if the load runs long.
  return <LoadingScreen label={t('common.loading')} size={28} tips={config.devTips} sx={{ minHeight: 'auto', py: 6 }} />;
};

// Compact active-subject indicator in the header; tapping it opens the subject
// picker so the learner can switch what they're studying.
function SubjectSwitcher() {
  const subject = useActiveSubject();
  return (
    <Link
      to="/subjects"
      style={{ marginLeft: 4, display: 'inline-flex', textDecoration: 'none', borderRadius: 999 }}
    >
      <AxBadge label={`${subject.emoji} ${subject.label}`} />
    </Link>
  );
}

// The header brand. On desktop it's the umbrella StudyShark wordmark with the
// active-subject chip beside it; on mobile (where space is tight and the chip
// is easy to miss) the wordmark itself becomes the logo of the platform the
// learner is currently on — its emoji + name in the subject accent.
function HeaderBrand() {
  const subject = useActiveSubject();
  const t = useT();
  const locked = isSubjectLocked();
  // On a standalone deploy (devShark, geoShark, …) the umbrella "StudyShark"
  // wordmark is replaced by this subject's own brand, and there's no chip to
  // switch subjects because there's nothing to switch to.
  if (locked) {
    return (
      <Link
        to="/"
        aria-label={t('nav.home')}
        className="ss-drawer-brand"
        style={{ padding: 0, color: subject.accent }}
      >
        <SwimmingFin size={22} />
        {subject.standaloneBrand ?? subject.label}
      </Link>
    );
  }
  return (
    <>
      <Link
        to="/"
        aria-label={t('nav.home')}
        className="ss-drawer-brand"
        style={{ padding: 0, color: 'var(--color-text-primary)' }}
      >
        <span className="ss-show-desktop" style={{ alignItems: 'center', gap: 6 }}>
          <SwimmingFin size={22} />
          StudyShark
        </span>
        <span className="ss-show-mobile" style={{ alignItems: 'center', gap: 4, color: subject.accent, whiteSpace: 'nowrap' }}>
          <span aria-hidden style={{ fontSize: '1.25rem', lineHeight: 1 }}>{subject.emoji}</span>
          {subject.label}
        </span>
      </Link>
      {/* The subject chip is redundant on mobile (the wordmark shows it), so it's desktop-only. */}
      <span className="ss-show-desktop">
        <SubjectSwitcher />
      </span>
    </>
  );
}

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, setLang } = useLanguage();
  const config = useGameConfig();
  const [quizActive, setQuizActive] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const activeSubject = useActiveSubject();
  const { mode, toggle } = useColorMode();
  const [settings, updateSettings] = useSettings();
  const { user } = useAuth();
  const [signupBonusOpen, setSignupBonusOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const mobile = useIsMobile();
  const analyticsIdentified = useRef(false);

  // Remember the learner's current rank on load so we don't re-celebrate a
  // rank-up earned in a previous session.
  useEffect(() => primeRankMarker(), []);

  // Tie analytics events to the signed-in learner (and drop the identity on
  // sign-out). No-op unless PostHog is configured.
  useEffect(() => {
    if (user?.id) {
      identifyUser(user.id, { email: user.email ?? undefined });
      analyticsIdentified.current = true;
    } else if (analyticsIdentified.current) {
      resetAnalytics();
      analyticsIdentified.current = false;
    }
  }, [user]);

  // Apply the account's saved language preference on sign-in, so the learner's
  // chosen default loads automatically across devices.
  useEffect(() => {
    const pref = preferredLanguageOf(user);
    if (pref) setLang(pref);
  }, [user, setLang]);

  // Apply the account's saved learning track on sign-in, so the chosen path
  // follows the learner across devices.
  useEffect(() => {
    const pref = preferredTrackOf(user);
    if (pref) setTrackValue(pref);
  }, [user]);

  // One-time 200-token welcome bonus on first sign-in. Idempotent across
  // devices via a user_metadata flag inside grantRegistrationBonusIfNew.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void grantRegistrationBonusIfNew(user).then((granted) => {
      if (granted && !cancelled) setSignupBonusOpen(true);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Nav items for features that are currently enabled in /dev → Settings.
  const navItems = NAV_ITEMS.filter((item) => !item.feature || config.features[item.feature]);
  // Leaderboard & Shop aren't learning surfaces, so they don't crowd the centre
  // nav — they get compact icon buttons in the right slot instead (and stay in
  // the mobile drawer via navItems).
  const SECONDARY_ROUTES = ['/leaderboard', '/shop'];
  const primaryNavItems = navItems.filter((item) => !SECONDARY_ROUTES.includes(item.to));
  const showLeaderboardIcon = navItems.some((item) => item.to === '/leaderboard');

  useEffect(() => {
    const titleKey = ROUTE_TITLE_KEYS[location.pathname];
    document.title = titleKey
      ? t(titleKey)
      : location.pathname.startsWith('/play/')
        ? t('title.playMatch')
        : t('title.default');
    // Move focus after the AnimatePresence enter transition (200ms) settles,
    // so AT reads the new route's content rather than the exiting tree.
    const timer = window.setTimeout(() => {
      document.getElementById('main-content')?.focus({ preventScroll: true });
    }, 230);
    // Manual SPA pageview (capture_pageview is off in the SDK). No-op unless
    // PostHog is configured.
    capturePageview(location.pathname);
    return () => window.clearTimeout(timer);
  }, [location.pathname, t]);

  // The /dev console is a standalone admin surface — no app chrome, full width.
  const isDev = location.pathname.startsWith('/dev');
  // The landing page gets a little more width for its hero + cards.
  const isHome = location.pathname === '/';
  // The quiz setup screen gets tighter padding and vertical centering so it fits
  // one viewport.
  const isQuiz = location.pathname === '/quiz';

  // Content-light pages read better wide on desktop (cards laid out side by side)
  // than in a narrow 800px column, and it keeps them closer to one viewport tall.
  // The Roadmap surfaces (/learn, /roadmap) manage their own width and are left
  // out on purpose.
  // Focused single-task screens (quiz, challenge, flashcards) stay in the narrow
  // 800px column on purpose; only content-light overview pages go wide.
  const isWide =
    location.pathname === '/profile' ||
    location.pathname === '/leaderboard' ||
    location.pathname === '/shop' ||
    location.pathname.startsWith('/play');
  const contentMaxWidth = isDev ? 'none' : isHome ? 1000 : isWide ? 1200 : 800;

  // 1–5 shark fins on the footer ocean line, at random (non-overlapping) spots
  // each page load, each independently facing left or right so the school
  // isn't all swimming the same way. Each fin also drifts sideways extremely
  // slowly (a whole crossing takes 1–2 minutes), with a random duration and
  // phase so no two fins ever move in sync.
  const fins = useMemo<{ left: number; flip: boolean; driftS: number; delayS: number }[]>(() => {
    const count = 1 + Math.floor(Math.random() * 5); // 1..5 inclusive
    const minGap = 10;
    const out: { left: number; flip: boolean; driftS: number; delayS: number }[] = [];
    let tries = 0;
    while (out.length < count && tries < 400) {
      tries += 1;
      const pos = 6 + Math.random() * 88;
      if (out.every((f) => Math.abs(f.left - pos) >= minGap)) {
        out.push({
          left: pos,
          flip: Math.random() < 0.5,
          driftS: 70 + Math.random() * 50, // 70–120s per crossing
          delayS: -Math.random() * 60, // negative = start mid-swim
        });
      }
    }
    return out;
  }, []);
  const showChrome = !isDev && !(quizActive && isQuiz);

  // Sound + theme toggles. On desktop/tablet they sit in the toolbar's profile
  // section (next to the account widget); on mobile they live in the nav drawer.
  const utilityToggles = (
    <>
      <AxIconButton
        variant="ghost"
        size="md"
        onClick={() => updateSettings({ soundEffects: !settings.soundEffects })}
        label={settings.soundEffects ? t('common.soundOff') : t('common.soundOn')}
        tooltip={settings.soundEffects ? t('common.soundOff') : t('common.soundOn')}
        icon={settings.soundEffects ? <SoundOnIcon /> : <SoundOffIcon />}
      />
      <AxIconButton
        variant="ghost"
        size="md"
        onClick={toggle}
        label={mode === 'light' ? t('common.darkMode') : t('common.lightMode')}
        tooltip={mode === 'light' ? t('common.darkMode') : t('common.lightMode')}
        icon={mode === 'light' ? <MoonIcon /> : <SunIcon />}
      />
    </>
  );

  return (
    // One-screen shell: the app is exactly one viewport tall. Pages scroll
    // INSIDE <main>, so the header and the ocean footer (waterline + fins) are
    // always visible. `dvh` tracks the collapsing mobile URL bar.
    <div className="ss-app-root">
      <a href="#main-content" className="ss-skip-link">
        {t('common.skipToContent')}
      </a>

      {showChrome && (
        <>
        <header className="ss-header">
          <div className="ss-toolbar">
            {/* Left slot: mobile menu + logo. Flex-basis 0 so all three slots
                share width equally, keeping the centre slot truly centred. */}
            <div className="ss-slot">
              {/* Nav links appear from 760px (tablets), not MUI's 900px `md`,
                  so a 768px iPad doesn't get a mostly-empty toolbar. */}
              <span className="ss-show-mobile" style={{ marginRight: 4 }}>
                <AxIconButton
                  variant="ghost"
                  size="lg"
                  label={t('nav.menu')}
                  onClick={() => setMobileNavOpen(true)}
                  icon={<MenuIcon />}
                />
              </span>
              <HeaderBrand />
            </div>

            {/* Centre slot: primary nav links, perfectly centred between logo
                and auth widget from 760px up. Below that, the drawer. */}
            <nav className="ss-nav-center">
              {primaryNavItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="ss-navlink"
                  data-active={item.isActive(location.pathname)}
                >
                  {t(item.key)}
                </Link>
              ))}
            </nav>

            {/* Right slot: Leaderboard + Shop icons, sound/theme toggles, and
                the auth widget. On mobile the sound/theme toggles live in the
                nav drawer (not here), so they never crowd the account avatar. */}
            <div className="ss-slot ss-slot-end">
              {/* Icon links to the non-learning surfaces. Hidden below 760px —
                  the drawer covers them there. */}
              <span className="ss-show-desktop" style={{ alignItems: 'center', gap: 2 }}>
                {showLeaderboardIcon && (
                  <AxIconButton
                    variant="ghost"
                    size="sm"
                    label={t('nav.leaderboard')}
                    tooltip={t('nav.leaderboard')}
                    onClick={() => navigate('/leaderboard')}
                    icon={<TrophyNavIcon />}
                  />
                )}
                <AxIconButton
                  variant="ghost"
                  size="sm"
                  label={t('nav.shop')}
                  tooltip={t('nav.shop')}
                  onClick={() => navigate('/shop')}
                  icon={<ShopNavIcon />}
                />
              </span>
              {/* Sound + theme toggles, grouped into the profile section on
                  desktop/tablet. Hidden below `sm` — the nav drawer covers
                  them there. */}
              <span className="ss-toggles">
                {utilityToggles}
              </span>
              <Suspense fallback={null}>
                <AuthButton />
              </Suspense>
            </div>
          </div>
        </header>
        {mobileNavOpen && (
          <div className="ss-show-mobile">
            <div className="ss-drawer-backdrop" onClick={() => setMobileNavOpen(false)} />
            <div
              className="ss-drawer-panel"
              role="presentation"
              onClick={() => setMobileNavOpen(false)}
            >
              {/* Drawer header shows the platform the learner is on, and tapping
                  it opens the subject picker to switch. */}
              <Link
                to={isSubjectLocked() ? '/' : '/subjects'}
                className="ss-drawer-brand"
                style={{ color: activeSubject.accent }}
              >
                <span aria-hidden style={{ fontSize: '1.35rem', lineHeight: 1 }}>{activeSubject.emoji}</span>
                {isSubjectLocked() ? (activeSubject.standaloneBrand ?? activeSubject.label) : activeSubject.label}
              </Link>
              <div style={{ height: 1, background: 'var(--color-border)' }} />
              <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* No "switch subject" on a standalone deploy — there's only one. */}
                {!isSubjectLocked() && (
                  <>
                    <Link
                      to="/subjects"
                      className="ss-drawer-link"
                      data-active={location.pathname === '/subjects'}
                    >
                      {t('nav.switchSubject')}
                    </Link>
                    <div style={{ height: 1, background: 'var(--color-border)', margin: '4px 0' }} />
                  </>
                )}
                {navItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="ss-drawer-link"
                    data-active={item.isActive(location.pathname)}
                  >
                    {t(item.key)}
                  </Link>
                ))}
              </div>
              <div style={{ height: 1, background: 'var(--color-border)' }} />
              {/* Sound + theme toggles live here on mobile. stopPropagation keeps
                  the drawer open so you can flip both without it closing. */}
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '12px 16px' }}
                onClick={(e) => e.stopPropagation()}
              >
                {utilityToggles}
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                  {t('nav.soundAndTheme')}
                </span>
              </div>
            </div>
          </div>
        )}
        </>
      )}

      <main
        id="main-content"
        tabIndex={-1}
        style={{
          // The ONLY scroll container in the app: pages taller than the
          // viewport scroll here, keeping the chrome + ocean footer in place.
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          display: 'flex',
          justifyContent: 'center',
          padding: isDev
            ? (mobile ? '0.5rem' : '0.5rem 1rem')
            : isQuiz
              ? (mobile ? '0.75rem' : '1rem 1.5rem')
              : (mobile ? '1rem' : '1.5rem'),
          // Clear the floating ocean overlay so anchored buttons and the end
          // of scrolled pages never sit under the waterline.
          paddingBottom: isDev ? undefined : '2.5rem',
          boxSizing: 'border-box',
          outline: 'none',
        }}
      >
        {/* minHeight 100% + flex column: normal pages take their natural height
            (and scroll within <main>); question screens (quiz/challenge/lesson)
            set flex:1 on their root to fill EXACTLY one viewport, keeping the
            answers anchored in a stable position with no page scroll. */}
        <div style={{ width: '100%', maxWidth: contentMaxWidth, minWidth: 0, minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Route transition: each navigation fades/slides the new view in.
              `mode="wait"` lets the old view fade out first; `initial={false}`
              skips the animation on the very first load. Reduced-motion users
              get a plain opacity fade with no movement. Routes is handed the
              current location so the exiting view keeps rendering its own tree. */}
          <AnimatePresence mode="wait" initial={false}>
            <m.div
              key={location.pathname}
              style={{ flex: 1, minHeight: 0, minWidth: 0, maxWidth: '100%', display: 'flex', flexDirection: 'column' }}
              {...(reduceMotion ? ROUTE_ANIM_REDUCED : ROUTE_ANIM)}
              transition={ROUTE_TRANSITION}
            >
              <Suspense fallback={<RouteLoader />}>
                <Routes location={location}>
                  <Route path="/" element={<Landing />} />
                  <Route path="/subjects" element={isSubjectLocked() ? <Navigate to="/" replace /> : <SubjectPicker />} />
                  <Route path="/quiz" element={<Quiz onActiveChange={setQuizActive} />} />
                  <Route path="/learn" element={<Roadmap />} />
                  <Route path="/roadmap" element={<CareerRoadmap />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/leaderboard" element={<Leaderboard />} />
                  <Route path="/cards" element={<Flashcards />} />
                  <Route path="/shop" element={<Shop />} />
                  <Route path="/play" element={<PlayLanding />} />
                  <Route path="/play/:code" element={<PlayMatch />} />
                  <Route path="/challenge" element={<Challenge />} />
                  <Route path="/dev" element={<DevPage />} />
                </Routes>
              </Suspense>
            </m.div>
          </AnimatePresence>
        </div>
      </main>

      {/* StudyShark ocean: pinned to the bottom of the fixed-height shell, so the
          waterline + surfacing fins are visible on every page, always. Hidden
          only in the /dev admin console. */}
      {!isDev && (
        <footer
          aria-hidden
          // Transparent overlay pinned to the shell bottom (not a layout band):
          // the wave + fins float over whatever is behind them, so there is no
          // solid background strip. Content scrolls beneath; pointer-events off.
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 30, zIndex: 1, overflow: 'hidden', pointerEvents: 'none' }}
        >
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 8 }}>
            <Waterline />
          </div>
          {fins.map((fin, i) => (
            <div
              key={i}
              style={{ position: 'absolute', bottom: 7, left: `${fin.left}%`, transform: 'translateX(-50%)', lineHeight: 0 }}
            >
              {/* Slow sideways drift — ±22px over 70–120s, so the motion sits
                  right at the edge of perception (keyframes in app-shell.css). */}
              <div
                className="ss-fin-drift"
                style={{
                  animation: `ssFinDrift ${fin.driftS}s ease-in-out ${fin.delayS}s infinite alternate`,
                  lineHeight: 0,
                }}
              >
                {/* scaleX(-1) mirrors the fin so it swims the other way. */}
                <div style={{ transform: fin.flip ? 'scaleX(-1)' : 'none', lineHeight: 0 }}>
                  <SwimmingFin size={20} />
                </div>
              </div>
            </div>
          ))}
        </footer>
      )}

      <XpToaster />
      <RegisterPromptSnackbar />
      <AppToast
        open={signupBonusOpen}
        onClose={() => setSignupBonusOpen(false)}
        severity="success"
        autoHideDuration={6000}
        message={t('auth.signupBonusToast', { tokens: SIGNUP_BONUS_TOKENS })}
      />
    </div>
  );
}

export default App;
