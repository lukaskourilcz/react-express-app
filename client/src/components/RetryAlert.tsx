import { Alert, Button, type SxProps, type Theme } from '@mui/material';
import { useT } from '../i18n/LanguageContext';

interface Props {
  message: string;
  onRetry: () => void;
  retryLabel?: string;
  sx?: SxProps<Theme>;
}

// Error alert with a retry action. Replaces the identical
// `<Alert severity="error" action={<Button…>Retry</Button>}>` block in
// Quiz, Profile, Leaderboard and Flashcards.
export default function RetryAlert({ message, onRetry, retryLabel, sx }: Props) {
  const t = useT();
  return (
    <Alert
      severity="error"
      role="alert"
      sx={sx}
      action={
        <Button color="inherit" size="small" onClick={onRetry}>
          {retryLabel ?? t('quiz.retry')}
        </Button>
      }
    >
      {message}
    </Alert>
  );
}
