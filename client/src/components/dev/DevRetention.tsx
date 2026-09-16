/**
 * The one number the weekly league is judged by.
 *
 * Of the people who learned something yesterday, how many came back today. A
 * league can be made to look successful by almost any other measure — more
 * sessions, more answers, more minutes on the page — while the people it was
 * built for quietly leave, so this is the only number on this tab.
 *
 * Operator-only, and a plain table on purpose. There is no chart library in
 * this repository and a sparkline over a handful of learners would draw a trend
 * that the data does not contain. `priorActive` is shown beside every rate so a
 * 100% that came from one person cannot be mistaken for a finding.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { getRetention } from '../../lib/devApi';

const WINDOWS = [7, 14, 30] as const;

export default function DevRetention() {
  const [days, setDays] = useState<number>(14);
  const { data, isPending: loading, error: queryError, refetch } = useQuery({
    queryKey: ['admin', 'retention', days],
    queryFn: () => getRetention(days),
  });

  const error = queryError ? friendlyError(queryError) : null;
  const reload = () => void refetch();
  const rows = data?.rows ?? [];

  // A mean of the daily rates weighted by how many people each day actually
  // had, so one quiet day with one learner cannot swing the summary.
  const totals = rows.reduce(
    (acc, row) => ({ prior: acc.prior + row.priorActive, returned: acc.returned + row.returned }),
    { prior: 0, returned: 0 },
  );
  const overall = totals.prior > 0 ? Math.round((100 * totals.returned) / totals.prior) : null;

  if (loading) return <LoadingScreen label="Loading the return rate…" />;
  if (error) return <ErrorRetry message={error} onRetry={reload} />;

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        {WINDOWS.map((window) => (
          <Button
            key={window}
            size="sm"
            variant={days === window ? 'primary' : 'ghost'}
            label={`${window} days`}
            onClick={() => setDays(window)}
          />
        ))}
        <div style={{ flex: 1 }} />
        <Button size="sm" variant="ghost" label="Refresh" onClick={reload} />
      </div>

      <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: '0 0 16px' }}>
        Of the people who answered a quiz, a daily challenge, a roadmap level or a coding task on one
        day, the share who came back the next day. Counted across every subject this deployment
        serves. {overall === null
          ? 'No learner days in this window yet, so there is no rate to report.'
          : `Over the whole window: ${overall}% of ${totals.prior} learner days returned.`}
      </p>

      <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, overflowX: 'auto' }}>
        <Table density="compact" dividers="rows" hasHover>
          <TableHeader>
            <TableRow isHeaderRow>
              <TableHeaderCell style={{ minWidth: 120 }}>Day</TableHeaderCell>
              <TableHeaderCell>Learned the day before</TableHeaderCell>
              <TableHeaderCell>Came back</TableHeaderCell>
              <TableHeaderCell>Return rate</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.day}>
                <TableCell>
                  <span style={{ fontSize: '0.875rem', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                    {row.day}
                  </span>
                </TableCell>
                <TableCell>
                  <span style={{ fontSize: '0.875rem', fontVariantNumeric: 'tabular-nums' }}>{row.priorActive}</span>
                </TableCell>
                <TableCell>
                  <span style={{ fontSize: '0.875rem', fontVariantNumeric: 'tabular-nums' }}>{row.returned}</span>
                </TableCell>
                <TableCell>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {row.priorActive === 0 ? '—' : `${row.ratePct}%`}
                  </span>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>
                  <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', textAlign: 'center', padding: '32px 0' }}>
                    Nothing to report yet. The rate appears once there is activity on two consecutive
                    days (requires supabase/supabase-schema-038.sql).
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
