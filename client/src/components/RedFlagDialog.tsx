import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  Alert,
} from '@mui/material';
import { useT } from '../i18n/LanguageContext';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called when the user confirms the flag. `detail` is the optional note. */
  onSubmit: (detail?: string) => void | Promise<void>;
}

/**
 * Lightweight "this looks wrong" flag shown next to a question. The note is
 * optional; ticking "this question should be reviewed" is the only thing the
 * user must do to send the flag (it's what triggers the notification), so the
 * submit button stays disabled until the box is checked.
 */
export function RedFlagDialog({ open, onClose, onSubmit }: Props) {
  const t = useT();
  const [detail, setDetail] = useState('');
  const [review, setReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setDetail('');
    setReview(false);
    setError(null);
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!review) return;
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(detail.trim() || undefined);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('flag.failed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth aria-labelledby="flag-dialog-title">
      <DialogTitle id="flag-dialog-title">{t('flag.title')}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2, fontSize: '0.9rem' }}>{t('flag.intro')}</DialogContentText>
        <TextField
          fullWidth
          multiline
          minRows={2}
          maxRows={6}
          label={t('flag.detailLabel')}
          value={detail}
          onChange={(e) => setDetail(e.target.value.slice(0, 1000))}
        />
        <FormControlLabel
          sx={{ mt: 1.5 }}
          control={<Checkbox checked={review} onChange={(e) => setReview(e.target.checked)} />}
          label={t('flag.reviewLabel')}
        />
        {error && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={submitting}>
          {t('common.cancel')}
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!review || submitting}>
          {submitting ? t('flag.sending') : t('flag.send')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
