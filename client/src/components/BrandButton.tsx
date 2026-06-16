import { Button, type ButtonProps } from '@mui/material';
import { brandButtonSx } from '../theme/MuiTheme';

// A contained button in the brand green, with theme-aware disabled styling.
// Replaces the repeated inline
// `sx={{ backgroundColor: BRAND.green, '&:hover': { backgroundColor: BRAND.greenHover } }}`.
export default function BrandButton({ sx, variant = 'contained', ...props }: ButtonProps) {
  return <Button variant={variant} sx={{ ...brandButtonSx, ...sx }} {...props} />;
}
