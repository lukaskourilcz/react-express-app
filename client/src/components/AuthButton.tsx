import { useAuth0 } from '@auth0/auth0-react';
import { Button, Avatar, Box, Menu, MenuItem, Typography } from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function AuthButton() {
  const { isAuthenticated, isLoading, user, loginWithRedirect, logout } = useAuth0();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

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
      <Button disabled sx={{ minWidth: 80 }}>
        Loading...
      </Button>
    );
  }

  if (!isAuthenticated) {
    return (
      <Button
        variant="outlined"
        onClick={() => loginWithRedirect()}
        sx={{
          borderColor: '#339933',
          color: '#339933',
          fontWeight: 500,
          textTransform: 'none',
          '&:hover': {
            borderColor: '#2d8a2d',
            backgroundColor: 'rgba(51, 153, 51, 0.04)',
          },
        }}
      >
        Log In
      </Button>
    );
  }

  return (
    <Box>
      <Box
        onClick={handleMenuOpen}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          cursor: 'pointer',
          padding: '4px 8px',
          borderRadius: 1,
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
          },
        }}
      >
        <Avatar
          src={user?.picture}
          alt={user?.name || 'User'}
          sx={{ width: 32, height: 32 }}
        />
        <Typography
          variant="body2"
          sx={{
            fontWeight: 500,
            color: '#1a1a1a',
            display: { xs: 'none', sm: 'block' },
          }}
        >
          {user?.name?.split(' ')[0] || 'User'}
        </Typography>
      </Box>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        sx={{
          '& .MuiPaper-root': {
            minWidth: 150,
            mt: 1,
          },
        }}
      >
        <MenuItem onClick={handleProfile}>Profile</MenuItem>
        <MenuItem onClick={handleLogout}>Log Out</MenuItem>
      </Menu>
    </Box>
  );
}

export default AuthButton;
