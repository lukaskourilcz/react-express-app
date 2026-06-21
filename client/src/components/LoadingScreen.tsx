import { Box, type SxProps, type Theme } from '@mui/material';
import { visuallyHidden } from '../theme/MuiTheme';
import { SwimmingShark } from './SharkFin';

interface Props {
  /** Screen-reader announcement describing what is loading. */
  label: string;
  /** Fin height in px. */
  size?: number;
  /** Extra styles merged onto the centering wrapper. */
  sx?: SxProps<Theme>;
}

/** Centered swimming-shark-fin indicator with a screen-reader-announced label. */
export default function LoadingScreen({ label, size, sx }: Props) {
  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh', ...sx }}
    >
      <SwimmingShark size={size ?? 48} />
      <Box component="span" sx={visuallyHidden}>
        {label}
      </Box>
    </Box>
  );
}
