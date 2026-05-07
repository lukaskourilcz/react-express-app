import { useAuth0 } from '@auth0/auth0-react';
import { Avatar, ButtonBase, Box, Menu, MenuItem, Typography, Button, Skeleton } from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BRAND } from '../theme/MuiTheme';

function AuthButton() {
  const { isAuthenticated, isLoading, user, loginWithRedirect, logout } = useAuth0();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

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
    logout({ logoutParams: { returnTo: window.location.origin } });
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1 }} aria-label="Loading account">
        <Skeleton variant="circular" width={32} height={32} />
        <Skeleton variant="text" width={56} sx={{ display: { xs: 'none', sm: 'block' } }} />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return (
      <Button
        variant="outlined"
        onClick={() => loginWithRedirect()}
        sx={{
          borderColor: BRAND.green,
          color: BRAND.green,
          fontWeight: 500,
          textTransform: 'none',
          '&:hover': { borderColor: BRAND.greenHover, backgroundColor: 'rgba(45,122,45,0.06)' },
        }}
      >
        Log in
      </Button>
    );
  }

  const displayName = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'Account';

  return (
    <>
      <ButtonBase
        onClick={handleMenuOpen}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? 'account-menu' : undefined}
        aria-label={`Account menu for ${displayName}`}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          padding: '4px 8px',
          borderRadius: 1,
          minHeight: 40,
          '&:hover': { backgroundColor: 'action.hover' },
          '&:focus-visible': { outline: `2px solid ${BRAND.green}`, outlineOffset: 2 },
        }}
      >
        <Avatar src={user?.picture} alt="" sx={{ width: 32, height: 32 }} />
        <Typography
          variant="body2"
          sx={{ fontWeight: 500, color: 'text.primary', display: { xs: 'none', sm: 'block' } }}
        >
          {displayName}
        </Typography>
      </ButtonBase>
      <Menu
        id="account-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { minWidth: 160, mt: 1 } } }}
      >
        <MenuItem onClick={handleProfile}>Profile</MenuItem>
        <MenuItem onClick={handleLogout}>Log out</MenuItem>
      </Menu>
    </>
  );
}

export default AuthButton;
