import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHeaderCell,
} from '@astryxdesign/core/Table';
import LoadingScreen from '../LoadingScreen';
import ErrorRetry from '../ErrorRetry';
import { friendlyError } from '../../lib/api';
import { listAuthEvents } from '../../lib/devApi';

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
  const { data, isPending: loading, error: queryError, refetch } = useQuery({
    queryKey: ['admin', 'logs'],
    queryFn: listAuthEvents,
  });
  const events = data?.events ?? [];
  const error = queryError ? friendlyError(queryError) : null;
  const reload = () => void refetch();

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
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        <Badge variant="neutral" label={`${events.length} events`} />
        <Badge variant="success" label={`${stats.registers} registrations`} />
        <Badge variant="info" label={`${stats.logins} logins`} />
        <div style={{ flex: 1 }} />
        <Button size="sm" variant="ghost" label="Refresh" onClick={reload} />
      </div>

      <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: '0 0 16px' }}>
        Authentication activity (newest first). A user's first-ever sign-in is a registration; later
        sign-ins are logins. Repeat sign-ins within a couple of minutes are de-duplicated.
      </p>

      <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, overflowX: 'auto' }}>
        <Table density="compact" dividers="rows" hasHover>
          <TableHeader>
            <TableRow isHeaderRow>
              <TableHeaderCell>Action</TableHeaderCell>
              <TableHeaderCell style={{ minWidth: 220 }}>User</TableHeaderCell>
              <TableHeaderCell>Provider</TableHeaderCell>
              <TableHeaderCell>When</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((e) => (
              <TableRow key={e.id}>
                <TableCell>
                  {e.event_type === 'register' ? (
                    <Badge variant="success" label="Registered" />
                  ) : (
                    <Badge variant="info" label="Logged in" />
                  )}
                </TableCell>
                <TableCell style={{ maxWidth: 320 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                    {e.email || '(no email)'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                    {e.user_id}
                  </div>
                </TableCell>
                <TableCell>
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                    {e.provider || '—'}
                  </span>
                </TableCell>
                <TableCell>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                    {formatWhen(e.created_at)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
            {events.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>
                  <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', textAlign: 'center', padding: '32px 0' }}>
                    No auth events yet. They appear here once people sign in (requires the auth_events
                    table — supabase/supabase-schema-015.sql).
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
