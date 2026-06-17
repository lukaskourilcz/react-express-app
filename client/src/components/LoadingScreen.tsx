import { Box, CircularProgress, type SxProps, type Theme } from '@mui/material';
import { BRAND, visuallyHidden } from '../theme/MuiTheme';

interface Props {
  /** Screen-reader announcement describing what is loading. */
  label: string;
  /** Spinner diameter in px. */
  size?: number;
  /** Extra styles merged onto the centering wrapper. */
  sx?: SxProps<Theme>;
}

/** Centered spinner with a visually-hidden, screen-reader-announced label. */
export default function LoadingScreen({ label, size, sx }: Props) {
  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh', ...sx }}
    >
      <CircularProgress size={size} sx={{ color: BRAND.green }} />
      <Box component="span" sx={visuallyHidden}>
        {label}
      </Box>
    </Box>
  );
}
