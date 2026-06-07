import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  FormLabel,
  FormControl,
  Alert,
} from '@mui/material';
import { useT } from '../i18n/LanguageContext';

type Reason = 'incorrect-answer' | 'unclear' | 'typo' | 'outdated' | 'duplicate' | 'other';

const REASON_VALUES: Reason[] = ['incorrect-answer', 'unclear', 'typo', 'outdated', 'duplicate', 'other'];

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (reason: Reason, detail?: string) => void | Promise<void>;
}

export function ReportDialog({ open, onClose, onSubmit }: Props) {
  const t = useT();
  const [reason, setReason] = useState<Reason>('incorrect-answer');
  const [detail, setDetail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(reason, detail.trim() || undefined);
      setDetail('');
      setReason('incorrect-answer');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('quiz.reportFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    setError(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="report-dialog-title"
    >
      <DialogTitle id="report-dialog-title">{t('report.title')}</DialogTitle>
      <DialogContent>
        <FormControl component="fieldset" sx={{ width: '100%' }}>
          <FormLabel id="report-reason-label" sx={{ mb: 1, fontSize: '0.85rem' }}>
            {t('report.reasonLabel')}
          </FormLabel>
          <RadioGroup
            aria-labelledby="report-reason-label"
            value={reason}
            onChange={(e) => setReason(e.target.value as Reason)}
          >
            {REASON_VALUES.map((value) => (
              <FormControlLabel
                key={value}
                value={value}
                control={<Radio />}
                label={t(`report.reason.${value}` as const)}
                sx={{
                  my: 0.25,
                  border: 0,
                  p: 0,
                  minHeight: 'auto',
                  '&:hover': { backgroundColor: 'transparent' },
                }}
              />
            ))}
          </RadioGroup>
        </FormControl>
        <TextField
          fullWidth
          multiline
          minRows={2}
          maxRows={5}
          label={t('report.detailLabel')}
          value={detail}
          onChange={(e) => setDetail(e.target.value.slice(0, 1000))}
          sx={{ mt: 2 }}
        />
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={submitting}>
          {t('common.cancel')}
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
          {submitting ? t('report.sending') : t('report.send')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
