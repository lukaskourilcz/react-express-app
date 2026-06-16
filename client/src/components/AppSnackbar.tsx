import { Snackbar } from '@mui/material';

interface Props {
  message: string | null;
  onClose: () => void;
  autoHideDuration?: number;
}

// Bottom-center transient message. Open state is derived from `message` so a
// single piece of `string | null` state drives it. Replaces the repeated
// <Snackbar> blocks in Quiz.
export default function AppSnackbar({ message, onClose, autoHideDuration = 2500 }: Props) {
  return (
    <Snackbar
      open={!!message}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      message={message ?? ''}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    />
  );
}
