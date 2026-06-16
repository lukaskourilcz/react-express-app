import { Box, CircularProgress, Typography } from '@mui/material';
import { BRAND } from '../theme/MuiTheme';

interface Props {
  /** Screen-reader status text (always announced). */
  label: string;
  /** Optional visible caption rendered under the spinner. */
  subtitle?: string;
  minHeight?: number | string;
  py?: number;
  size?: number;
}

// Centered loading spinner with an accessible `role="status"` live region.
// Replaces the spinner-plus-visually-hidden-text block that was duplicated
// across the route loader, Profile, Flashcards and Play.
export default function LoadingState({ label, subtitle, minHeight, py, size = 40 }: Props) {
  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        display: 'flex',
        flexDirection: subtitle ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: subtitle ? 1.5 : 0,
        minHeight,
        py,
      }}
    >
      <CircularProgress size={size} sx={{ color: BRAND.green }} aria-hidden />
      {subtitle ? (
        <Typography variant="body2" color="text.secondary">
          {subtitle}
        </Typography>
      ) : (
        <span style={{ position: 'absolute', left: -9999 }}>{label}</span>
      )}
    </Box>
  );
}
