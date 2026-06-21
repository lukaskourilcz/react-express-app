import { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import LoadingScreen from '../LoadingScreen';
import ErrorRetry from '../ErrorRetry';
import { useReloadKey, useCancellableEffect } from '../../lib/hooks';
import { friendlyError } from '../../lib/api';
import { listAuthEvents, type AuthEvent } from '../../lib/devApi';

const formatWhen = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function DevLogs() {
  const [events, setEvents] = useState<AuthEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, reload] = useReloadKey();

  useCancellableEffect(
    async (isCancelled) => {
      setLoading(true);
      setError(null);
      try {
        const data = await listAuthEvents();
        if (isCancelled()) return;
        setEvents(data.events);
      } catch (err) {
        if (!isCancelled()) setError(friendlyError(err));
      } finally {
        if (!isCancelled()) setLoading(false);
      }
    },
    [reloadKey],
  );

  const stats = useMemo(() => {
    let registers = 0;
    let logins = 0;
    for (const e of events) {
      if (e.event_type === 'register') registers += 1;
      else logins += 1;
    }
    return { registers, logins };
  }, [events]);

  if (loading) return <LoadingScreen label="Loading logs…" />;
  if (error) return <ErrorRetry message={error} onRetry={reload} />;

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
        <Chip label={`${events.length} events`} size="small" />
        <Chip label={`${stats.registers} registrations`} size="small" color="success" variant="outlined" />
        <Chip label={`${stats.logins} logins`} size="small" color="info" variant="outlined" />
        <Box sx={{ flex: 1 }} />
        <Button size="small" onClick={reload}>
          Refresh
        </Button>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Authentication activity (newest first). A user's first-ever sign-in is a registration; later
        sign-ins are logins. Repeat sign-ins within a couple of minutes are de-duplicated.
      </Typography>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Action</TableCell>
              <TableCell sx={{ minWidth: 220 }}>User</TableCell>
              <TableCell>Provider</TableCell>
              <TableCell>When</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {events.map((e) => (
              <TableRow key={e.id} hover>
                <TableCell>
                  {e.event_type === 'register' ? (
                    <Chip label="Registered" size="small" color="success" variant="outlined" />
                  ) : (
                    <Chip label="Logged in" size="small" color="info" variant="outlined" />
                  )}
                </TableCell>
                <TableCell sx={{ maxWidth: 320 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {e.email || '(no email)'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {e.user_id}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {e.provider || '—'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                    {formatWhen(e.created_at)}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
            {events.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    No auth events yet. They appear here once people sign in (requires the auth_events
                    table — supabase-schema-015.sql).
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
