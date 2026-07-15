import { Avatar, ButtonBase, Box, Menu, MenuItem, Typography, Button, Skeleton, Snackbar, Alert } from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BRAND } from '../theme/MuiTheme';
import { useT } from '../i18n/LanguageContext';
import { useAuth, getUserProfile } from '../lib/auth';
import { useQuestXp } from '../lib/xp';
import { useRoadmapProgress } from '../lib/roadmap';
import { computeLearningXp, levelForXp, displayTitle } from '../lib/leveling';
import { useTrack, specializationForTrack } from '../lib/tracks';
import { useEquippedRingColor } from '../lib/shop';

function AuthButton() {
  const { isAuthenticated, isLoading, user, signInWithGoogle, signOut } = useAuth();
  const profile = getUserProfile(user);
  // Subscribe to roadmap progress once; derive total XP locally rather than
  // calling useTotalXp() (which would set up a second subscription).
  const progress = useRoadmapProgress();
  const questXp = useQuestXp();
  const totalXp = computeLearningXp(progress) + questXp;
  const ringColor = useEquippedRingColor();
  const [track] = useTrack();
  const levelInfo = levelForXp(totalXp);
  const rankTitle = displayTitle(levelInfo.rank.title, specializationForTrack(track));
  const navigate = useNavigate();
  const t = useT();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const open = Boolean(anchorEl);

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Sign-in failed. Please try again.');
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => setAnchorEl(null);
  const handleProfile = () => {
    handleMenuClose();
    navigate('/profile');
  };
  const handleLogout = () => {
    handleMenuClose();
    signOut();
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1 }} aria-label={t('auth.loadingAccount')}>
        <Skeleton variant="circular" width={32} height={32} />
        <Skeleton variant="text" width={56} sx={{ display: { xs: 'none', sm: 'block' } }} />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <Button
          variant="outlined"
          onClick={handleLogin}
          sx={{
            borderColor: 'var(--brand-accent)',
            color: 'var(--brand-accent)',
            fontWeight: 500,
            textTransform: 'none',
            '&:hover': { borderColor: 'var(--brand-accent-hover)', backgroundColor: 'rgba(45,122,45,0.06)' },
          }}
        >
          {t('auth.logIn')}
        </Button>
        <Snackbar
          open={!!authError}
          autoHideDuration={8000}
          onClose={() => setAuthError(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity="error" variant="filled" onClose={() => setAuthError(null)}>
            {authError}
          </Alert>
        </Snackbar>
      </>
    );
  }

  const displayName = profile.name?.split(' ')[0] || profile.email?.split('@')[0] || t('auth.account');

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ButtonBase
          onClick={handleMenuOpen}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? 'account-menu' : undefined}
          aria-label={t('auth.accountMenu', { name: displayName })}
          sx={{
            borderRadius: '50%',
            '&:focus-visible': { outline: `2px solid var(--brand-accent)`, outlineOffset: 2 },
          }}
        >
          <Avatar
            src={profile.picture}
            alt=""
            sx={{
              width: 34,
              height: 34,
              ...(ringColor ? { border: `2px solid ${ringColor}`, boxShadow: `0 0 0 1.5px ${ringColor}33` } : null),
            }}
          />
        </ButtonBase>
        <Box sx={{ display: { xs: 'none', sm: 'flex' }, flexDirection: 'column', alignItems: 'flex-start', minWidth: 0, maxWidth: 190 }}>
          <Typography
            variant="body2"
            sx={{ fontWeight: 500, color: 'text.primary', lineHeight: 1.2, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {displayName}
          </Typography>
          {/* The full rank — up to "Superjunior Full-Stack Developer" — must
              always be readable: wrap to at most two lines, never truncate
              mid-title, never push the toolbar taller. */}
          <Typography
            variant="caption"
            sx={{
              color: (theme) => (theme.palette.mode === 'dark' ? BRAND.greenBright : 'var(--brand-accent)'),
              fontWeight: 600,
              fontSize: '0.62rem',
              lineHeight: 1.2,
              maxWidth: '100%',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              overflowWrap: 'break-word',
            }}
          >
            {rankTitle}
          </Typography>
          {/* Thin progress bar toward the next rank — ambient goal feedback
              with zero extra copy. Hidden at the ladder cap. */}
          {!levelInfo.isMax && (
            <Box
              aria-hidden
              sx={{ mt: 0.4, width: '100%', height: 3, borderRadius: 2, backgroundColor: 'action.hover', overflow: 'hidden' }}
            >
              <Box
                sx={{
                  width: `${levelInfo.progressPct}%`,
                  height: '100%',
                  borderRadius: 2,
                  backgroundColor: (theme) => (theme.palette.mode === 'dark' ? BRAND.greenBright : 'var(--brand-accent)'),
                  transition: 'width 0.4s ease',
                }}
              />
            </Box>
          )}
        </Box>
      </Box>
      <Menu
        id="account-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { minWidth: 160, mt: 1 } } }}
      >
        <MenuItem onClick={handleProfile}>{t('auth.profile')}</MenuItem>
        <MenuItem onClick={handleLogout}>{t('auth.logOut')}</MenuItem>
      </Menu>
    </>
  );
}

export default AuthButton;
