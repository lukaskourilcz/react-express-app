/**
 * The progression-velocity review list.
 *
 * Rate limits answer how often an address may call an endpoint. They do not
 * answer whether a person could have produced a result, and a leaderboard
 * ranked by correct answers needs that second question. The server asks it on
 * every graded submission and writes what it finds here.
 *
 * Nothing on this screen can change a score. The strongest verdict is
 * "confirmed", which marks the row and leaves every number the flagged account
 * earned exactly where it was. That restraint is why the floors can be strict:
 * a false positive costs the owner ten seconds of reading and costs the learner
 * nothing at all, because nothing happened to them.
 *
 * Operator-only, like every other tab here, and deliberately plain — an account
 * id, a pace and a count, with the thresholds the server actually applied
 * printed beside them so this file never restates a number it does not own.
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { getIntegrityFlags, resolveIntegrityFlag, type IntegrityFlag } from '../../lib/devApi';

const FILTERS = [
  { id: 'open', label: 'Open' },
  { id: 'reviewed', label: 'Seen' },
  { id: 'cleared', label: 'Cleared' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'all', label: 'Everything' },
] as const;

const SIGNAL_COPY: Record<string, string> = {
  'pace-below-reading-floor': 'Answered faster than the questions can be read, and nearly all correct',
  'pace-below-reaction-floor': 'Answered faster than a deliberate click, whatever the accuracy',
  'sustained-volume': 'Held a volume of answers no session length accounts for',
  'unattested-signup': 'First sign-in could not prove a browser while the bot check was enforcing',
};

const SURFACE_COPY: Record<string, string> = {
  quiz: 'Quiz',
  challenge: 'Challenge run',
  signup: 'Sign-up',
};

const secondary = { fontSize: '0.875rem', color: 'var(--color-text-secondary)' } as const;
const numeric = { fontSize: '0.875rem', fontVariantNumeric: 'tabular-nums' } as const;

function evidenceLine(flag: IntegrityFlag): string {
  const parts: string[] = [];
  const read = (key: string): number | null => {
    const value = flag.evidence[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  };
  const answered = read('answered');
  const accuracy = read('accuracyPct');
  const pace = read('msPerAnswer');
  if (pace !== null) parts.push(`${pace} ms per answer`);
  if (answered !== null) parts.push(`${answered} answers`);
  if (accuracy !== null) parts.push(`${accuracy}% correct`);
  const outcome = flag.evidence.outcome;
  if (typeof outcome === 'string') parts.push(`check: ${outcome}`);
  return parts.join(' · ');
}

export default function DevIntegrity() {
  const [status, setStatus] = useState<string>('open');
  const queryClient = useQueryClient();
  const { data, isPending: loading, error: queryError, refetch } = useQuery({
    queryKey: ['admin', 'integrity', status],
    queryFn: () => getIntegrityFlags(status),
  });

  const decide = useMutation({
    mutationFn: resolveIntegrityFlag,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'integrity'] }),
  });

  const error = queryError ? friendlyError(queryError) : null;
  const reload = () => void refetch();
  const flags = data?.flags ?? [];
  const rules = data?.rules;

  if (loading) return <LoadingScreen label="Loading the review list…" />;
  if (error) return <ErrorRetry message={error} onRetry={reload} />;

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        {FILTERS.map((filter) => (
          <Button
            key={filter.id}
            size="sm"
            variant={status === filter.id ? 'primary' : 'ghost'}
            label={filter.label}
            onClick={() => setStatus(filter.id)}
          />
        ))}
        <div style={{ flex: 1 }} />
        <Button size="sm" variant="ghost" label="Refresh" onClick={reload} />
      </div>

      <p style={{ ...secondary, margin: '0 0 16px' }}>
        Submissions whose pace no play loop accounts for. A flag changes nothing for the learner —
        their score, XP, streak and place on every board are exactly what they were.
        {rules
          ? ` The server flags a set of at least ${rules.minSample} answers averaging under ${rules.readingFloorMs} ms each at ${rules.accuracyFloorPct}% accuracy or better, or under ${rules.reactionFloorMs} ms each at any accuracy.`
          : ''}
      </p>

      {decide.error && (
        <p role="alert" style={{ ...secondary, color: 'var(--ss-error-text)', margin: '0 0 16px' }}>
          {friendlyError(decide.error)}
        </p>
      )}

      <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, overflowX: 'auto' }}>
        <Table density="compact" dividers="rows" hasHover>
          <TableHeader>
            <TableRow isHeaderRow>
              <TableHeaderCell style={{ minWidth: 160 }}>Account</TableHeaderCell>
              <TableHeaderCell style={{ minWidth: 220 }}>What the server saw</TableHeaderCell>
              <TableHeaderCell>Times</TableHeaderCell>
              <TableHeaderCell>Last seen</TableHeaderCell>
              <TableHeaderCell style={{ minWidth: 200 }}>Decision</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {flags.map((flag) => (
              <TableRow key={`${flag.userId ?? 'anonymous'}:${flag.surface}:${flag.signal}`}>
                <TableCell>
                  <span style={{ ...numeric, wordBreak: 'break-all' }}>{flag.userId ?? 'Anonymous'}</span>
                  <span style={{ ...secondary, display: 'block' }}>
                    {SURFACE_COPY[flag.surface] ?? flag.surface}
                    {flag.subject ? ` · ${flag.subject}` : ''}
                    {flag.severity === 'urgent' ? ' · two floors crossed' : ''}
                  </span>
                </TableCell>
                <TableCell>
                  <span style={{ fontSize: '0.875rem' }}>{SIGNAL_COPY[flag.signal] ?? flag.signal}</span>
                  <span style={{ ...secondary, display: 'block' }}>{evidenceLine(flag)}</span>
                  {flag.answersLastHour > 0 && (
                    <span style={{ ...secondary, display: 'block' }}>
                      {flag.answersLastHour} graded attempts in the hour around it
                    </span>
                  )}
                  {flag.note && <span style={{ ...secondary, display: 'block' }}>Note: {flag.note}</span>}
                </TableCell>
                <TableCell>
                  <span style={numeric}>{flag.hits}</span>
                </TableCell>
                <TableCell>
                  <span style={{ ...numeric, whiteSpace: 'nowrap' }}>
                    {flag.lastSeenAt ? new Date(flag.lastSeenAt).toLocaleString() : '—'}
                  </span>
                </TableCell>
                <TableCell>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Button
                      size="sm"
                      variant="ghost"
                      label="Real person"
                      isDisabled={decide.isPending || flag.status === 'cleared'}
                      onClick={() =>
                        decide.mutate({ userId: flag.userId, surface: flag.surface, signal: flag.signal, status: 'cleared' })
                      }
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      label="Not a person"
                      isDisabled={decide.isPending || flag.status === 'confirmed'}
                      onClick={() =>
                        decide.mutate({ userId: flag.userId, surface: flag.surface, signal: flag.signal, status: 'confirmed' })
                      }
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      label="Seen"
                      isDisabled={decide.isPending || flag.status === 'reviewed'}
                      onClick={() =>
                        decide.mutate({ userId: flag.userId, surface: flag.surface, signal: flag.signal, status: 'reviewed' })
                      }
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {flags.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  <div style={{ ...secondary, textAlign: 'center', padding: '32px 0' }}>
                    {status === 'open'
                      ? 'Nothing to review. Every graded submission so far has a pace a person could produce.'
                      : 'No rows with this decision.'}{' '}
                    The list needs supabase/supabase-schema-041.sql.
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
