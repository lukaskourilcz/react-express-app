import { Alert, Button, type SxProps, type Theme } from '@mui/material';
import { useT } from '../i18n/LanguageContext';

interface Props {
  /** Error message to display. */
  message: string;
  /** Called when the user clicks the retry action. */
  onRetry: () => void;
  /** Extra styles merged onto the Alert. */
  sx?: SxProps<Theme>;
}

/** Standard error alert with a "Retry" action, used by data-loading screens. */
export default function ErrorRetry({ message, onRetry, sx }: Props) {
  const t = useT();
  return (
    <Alert
      severity="error"
      role="alert"
      sx={sx}
      action={
        <Button color="inherit" size="small" onClick={onRetry}>
          {t('quiz.retry')}
        </Button>
      }
    >
      {message}
    </Alert>
  );
}
