import { useState, type FormEvent } from 'react';
import { Box, Paper, Typography, TextField, Button, Alert } from '@mui/material';
import { brandButtonSx } from '../../theme/MuiTheme';
import { friendlyError } from '../../lib/api';
import { verifyPassword, setDevPassword } from '../../lib/devApi';

/** Password prompt for the /dev console. On success, stores the password and continues. */
export default function DevLogin({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const ok = await verifyPassword(password);
      if (ok) {
        setDevPassword(password);
        onSuccess();
      } else {
        setError('Incorrect password.');
      }
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh', px: 2 }}>
      <Paper
        component="form"
        onSubmit={handleSubmit}
        elevation={0}
        sx={{ p: 4, width: '100%', maxWidth: 380, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
      >
        <Typography variant="h6" component="h1" sx={{ fontWeight: 700, mb: 0.5 }}>
          Dev console
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Enter the password to manage questions and game settings.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          autoFocus
          fullWidth
          type="password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          sx={{ mb: 2 }}
        />
        <Button type="submit" fullWidth variant="contained" disabled={!password || submitting} sx={brandButtonSx}>
          {submitting ? 'Checking…' : 'Unlock'}
        </Button>
      </Paper>
    </Box>
  );
}
