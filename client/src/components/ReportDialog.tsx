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
} from '@mui/material';

type Reason = 'incorrect-answer' | 'unclear' | 'typo' | 'outdated' | 'duplicate' | 'other';

const REASONS: { value: Reason; label: string }[] = [
  { value: 'incorrect-answer', label: 'Wrong answer marked correct' },
  { value: 'unclear', label: 'Question or options unclear' },
  { value: 'typo', label: 'Typo or formatting issue' },
  { value: 'outdated', label: 'Outdated information' },
  { value: 'duplicate', label: 'Duplicate of another question' },
  { value: 'other', label: 'Other' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (reason: Reason, detail?: string) => void;
}

export function ReportDialog({ open, onClose, onSubmit }: Props) {
  const [reason, setReason] = useState<Reason>('incorrect-answer');
  const [detail, setDetail] = useState('');

  const handleSubmit = () => {
    onSubmit(reason, detail.trim() || undefined);
    setDetail('');
    setReason('incorrect-answer');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Report this question</DialogTitle>
      <DialogContent>
        <RadioGroup value={reason} onChange={(e) => setReason(e.target.value as Reason)}>
          {REASONS.map((r) => (
            <FormControlLabel
              key={r.value}
              value={r.value}
              control={<Radio />}
              label={r.label}
              sx={{ my: 0.25 }}
            />
          ))}
        </RadioGroup>
        <TextField
          fullWidth
          multiline
          minRows={2}
          maxRows={5}
          placeholder="Add details (optional)"
          value={detail}
          onChange={(e) => setDetail(e.target.value.slice(0, 1000))}
          sx={{ mt: 2 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit}>
          Send report
        </Button>
      </DialogActions>
    </Dialog>
  );
}
