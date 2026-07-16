// The account widget in the header: avatar, sign-in / out, and the account menu.
//
// Redesigned on the Astryx design system: Astryx Avatar + a level Badge for the
// signed-in identity, Astryx Button for the signed-out call to action, and
// Astryx Text for the name / rank. The account dropdown keeps MUI's Menu (no
// clean Astryx equivalent) but its trigger is fully restyled with Astryx.

import { Box, Menu, MenuItem, Snackbar, Alert } from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '@astryxdesign/core/Avatar';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import { Text } from '@astryxdesign/core/Text';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { useT } from '../i18n/LanguageContext';
import { useAuth, getUserProfile } from '../lib/auth';
import { useQuestXp } from '../lib/xp';
import { useRoadmapProgress } from '../lib/roadmap';
import { computeLearningXp, levelForXp } from '../lib/leveling';
import { useTrack, rankLabelFor } from '../lib/tracks';
import { useEquippedRingColor } from '../lib/shop';
import { useActiveSubject, topicSetForSubject } from '../lib/subjects';

function AuthButton() {
  const { isAuthenticated, isLoading, user, signInWithGoogle, signOut } = useAuth();
  const profile = getUserProfile(user);
  // Subscribe to roadmap progress once; derive total XP locally rather than
  // calling useTotalXp() (which would set up a second subscription). XP is
  // per subject, so only the active subject's topics count.
  const progress = useRoadmapProgress();
  const questXp = useQuestXp();
  const subject = useActiveSubject();
  const totalXp = computeLearningXp(progress, topicSetForSubject(subject.id)) + questXp;
  const ringColor = useEquippedRingColor();
  const [track] = useTrack();
  const levelInfo = levelForXp(totalXp);
  const { title: rankTitle } = rankLabelFor(levelInfo.rank, track);
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px' }} aria-label={t('auth.loadingAccount')}>
        <Skeleton width={34} height={34} radius="rounded" />
        <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
          <Skeleton width={64} height={12} radius={2} />
        </Box>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <Button variant="secondary" size="md" label={t('auth.logIn')} onClick={handleLogin} />
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
      <button
        type="button"
        onClick={handleMenuOpen}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? 'account-menu' : undefined}
        aria-label={t('auth.accountMenu', { name: displayName })}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          maxWidth: 232,
          margin: 0,
          padding: 4,
          background: 'transparent',
          border: 'none',
          borderRadius: 14,
          cursor: 'pointer',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexShrink: 0,
            borderRadius: '50%',
            ...(ringColor
              ? { padding: 2, background: `${ringColor}22`, boxShadow: `0 0 0 1.5px ${ringColor}` }
              : null),
          }}
        >
          <Avatar src={profile.picture} name={displayName} alt="" size="medium" />
        </div>
        <Box
          sx={{
            display: { xs: 'none', sm: 'flex' },
            flexDirection: 'column',
            alignItems: 'flex-start',
            minWidth: 0,
            maxWidth: 190,
            gap: '2px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, maxWidth: '100%' }}>
            <Text type="body" weight="medium" color="primary" maxLines={1}>
              {displayName}
            </Text>
            <Badge variant="green" label={levelInfo.level} />
          </div>
          {/* The full rank — up to "Superjunior Full-Stack Developer" — must
              always be readable: wrap to at most two lines, never truncate
              mid-title, never push the toolbar taller. */}
          <Text type="supporting" size="xsm" color="accent" weight="semibold" maxLines={2}>
            {rankTitle}
          </Text>
          {/* Thin progress bar toward the next rank — ambient goal feedback
              with zero extra copy. Hidden at the ladder cap. */}
          {!levelInfo.isMax && (
            <div
              aria-hidden
              style={{
                marginTop: 2,
                width: '100%',
                height: 3,
                borderRadius: 2,
                background: 'rgba(128,128,128,0.25)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${levelInfo.progressPct}%`,
                  height: '100%',
                  borderRadius: 2,
                  background: 'var(--brand-accent)',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          )}
        </Box>
      </button>
      <Menu
        id="account-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { minWidth: 168, mt: 1, borderRadius: 2.5 } } }}
      >
        <MenuItem onClick={handleProfile}>{t('auth.profile')}</MenuItem>
        <MenuItem onClick={handleLogout}>{t('auth.logOut')}</MenuItem>
      </Menu>
    </>
  );
}

export default AuthButton;
