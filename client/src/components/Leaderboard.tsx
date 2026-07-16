// The subject-scoped leaderboard. Three views (all-time / today / by category)
// share the same ranked-rows shape; ranking, data fetching, tab + category
// filtering and i18n are unchanged — only the presentation was moved onto the
// Astryx design system.
//
// Redesigned on Astryx: a SegmentedControl for the period toggle, per-category
// filter pills, and an Astryx Table on tablet/desktop that collapses to stacked
// cards on narrow phones (a table squishes badly under ~380px).

import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '../lib/useMediaQuery';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@astryxdesign/core/Avatar';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { Table, proportional, pixel } from '@astryxdesign/core/Table';
import {
  type LeaderboardGlobalEntry,
  type LeaderboardDailyEntry,
  type CategoryLeaderboardEntry,
} from '../lib/play';
import { friendlyError } from '../lib/api';
import { useLeaderboard } from '../lib/queries';
import { useT } from '../i18n/LanguageContext';
import { visibleCategoryOptionsFor, getCategoryLabel, onCategoryColorText } from '../lib/categories';
import { useActiveSubject, categoriesForSubject } from '../lib/subjects';
import ErrorRetry from './ErrorRetry';
import { IconTile, TrophyIcon } from './ui/icons';
import { visuallyHidden } from '../theme/MuiTheme';

type Tab = 'global' | 'daily' | 'category';

const today = () => new Date().toISOString().slice(0, 10);

type Entry = LeaderboardGlobalEntry | LeaderboardDailyEntry | CategoryLeaderboardEntry;

// A flat, view-agnostic row the Table and the mobile cards both render.
interface RankedRow extends Record<string, unknown> {
  rank: number;
  medal: string | null;
  picture: string | null;
  name: string;
  secondary: string;
  score: string;
}

function Leaderboard() {
  const t = useT();
  // The whole board is scoped to the active subject (platform): the all-time
  // tab sums that subject's categories, and the category chips are its own.
  const subject = useActiveSubject();
  const CATEGORIES = visibleCategoryOptionsFor();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<Tab>('global');
  const [category, setCategory] = useState<string>(() => CATEGORIES[0]?.value ?? '');
  const [date] = useState<string>(today());

  // Switching platform swaps the category list — reset the selection with it.
  useEffect(() => {
    setCategory(categoriesForSubject(subject.id)[0] ?? '');
  }, [subject.id]);

  const { data, isLoading: loading, error: queryError, refetch } = useLeaderboard(
    tab,
    date,
    category,
    categoriesForSubject(subject.id),
  );
  const entries = (data?.entries ?? []) as Entry[];
  const error = queryError ? friendlyError(queryError) : null;
  const reload = () => void refetch();

  // The score column shares one label (all rows are the same metric), so it
  // lives in the header on desktop and beside each number on mobile.
  const scoreLabel = tab === 'daily' ? t('leaderboard.todayLabel') : t('leaderboard.correct');

  const rows: RankedRow[] = entries.map((entry, i) => {
    const rank = i + 1;
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;

    let secondary = '';
    let score = '';
    if (tab === 'daily') {
      const e = entry as LeaderboardDailyEntry;
      secondary = formatMs(e.duration_ms);
      score = `${e.correct}/${e.total}`;
    } else {
      // Subject-scoped all-time board has the same shape as a category board
      // (the server sums the subject's categories), so render the same columns.
      const e = entry as CategoryLeaderboardEntry;
      secondary = t('leaderboard.categorySecondary', { attempts: e.total_questions, accuracy: e.accuracy_pct });
      score = String(e.total_correct);
    }

    return { rank, medal, picture: entry.picture ?? null, name: entry.display_name, secondary, score };
  });

  const hasRows = !loading && !error && rows.length > 0;

  return (
    <div style={{ width: '100%', maxWidth: 880, margin: '0 auto' }}>
      <VStack gap={2} width="100%">
        <HStack gap={1.5} align="center" wrap="wrap">
          <Heading level={1} type="display-3">
            {t('leaderboard.title')}
          </Heading>
          {/* Every tab counts this platform only — make the scope visible. */}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              borderRadius: 999,
              fontWeight: 700,
              fontSize: '0.8125rem',
              lineHeight: 1.2,
              color: subject.accent,
              border: `1px solid ${subject.accent}`,
              background: `${subject.accent}14`,
            }}
          >
            <span aria-hidden>{subject.emoji}</span>
            {subject.label}
          </span>
        </HStack>

        <SegmentedControl
          value={tab}
          onChange={(v) => setTab(v as Tab)}
          label={t('leaderboard.period')}
          layout="fill"
        >
          <SegmentedControlItem value="global" label={t('leaderboard.allTime')} />
          <SegmentedControlItem value="daily" label={t('leaderboard.today')} />
          <SegmentedControlItem value="category" label={t('leaderboard.byCategory')} />
        </SegmentedControl>

        {tab === 'category' && (
          <HStack gap={1} wrap="wrap">
            {CATEGORIES.map((c) => {
              const active = category === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  aria-pressed={active}
                  aria-label={t('leaderboard.categoryAria', { label: c.label })}
                  style={{
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '8px 14px',
                    borderRadius: 999,
                    fontSize: '0.8125rem',
                    fontWeight: active ? 700 : 500,
                    // Luminance-aware text on the solid chip; inactive chips keep
                    // neutral text so light brand hues never fail contrast.
                    color: active ? onCategoryColorText(c.value) : 'var(--color-text-primary, inherit)',
                    background: active ? c.color : `${c.color}14`,
                    border: `1px solid ${active ? c.color : 'transparent'}`,
                    transition: 'background 120ms ease, color 120ms ease',
                  }}
                >
                  {c.label}
                </button>
              );
            })}
          </HStack>
        )}

        {loading && (
          <Card variant="default" padding={0} width="100%">
            <VStack gap={0} width="100%">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '14px 20px',
                    borderTop: i === 0 ? 'none' : '1px solid var(--astryx-color-border, rgba(0,0,0,0.08))',
                  }}
                >
                  <Skeleton width={24} height={20} />
                  <Skeleton width={36} height={36} radius="rounded" />
                  <div style={{ flex: 1 }}>
                    <Skeleton width="60%" height={16} />
                  </div>
                  <Skeleton width={48} height={20} />
                </div>
              ))}
            </VStack>
          </Card>
        )}

        {!loading && error && <ErrorRetry message={error} onRetry={reload} />}

        {!loading && !error && rows.length === 0 && (
          <Card variant="default" padding={6} width="100%">
            <VStack gap={2} align="center">
              <IconTile color={subject.accent} size={48}>
                <TrophyIcon size={22} />
              </IconTile>
              <Text type="body" color="secondary" justify="center">
                {tab === 'category'
                  ? t('leaderboard.noCategoryAttempts', { label: getCategoryLabel(category) })
                  : t('leaderboard.noEntries')}
              </Text>
              <Button variant="primary" size="sm" label={t('leaderboard.emptyCta')} onClick={() => navigate('/quiz')} />
            </VStack>
          </Card>
        )}

        {hasRows && isMobile && (
          <VStack gap={1.5} width="100%">
            {rows.map((row) => (
              <div key={row.rank} className="ss-raised" style={{ display: 'flex', width: '100%' }}>
                <Card variant={row.medal ? 'muted' : 'default'} padding={3} width="100%">
                  <HStack gap={2} align="center">
                    <RankMedal rank={row.rank} medal={row.medal} />
                    <Avatar src={row.picture ?? undefined} name={row.name} size="small" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text type="body" weight="semibold" maxLines={1}>
                        {row.name}
                      </Text>
                      <Text type="supporting" size="xsm" color="secondary">
                        {row.secondary}
                      </Text>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <Text type="large" weight="bold">
                        {row.score}
                      </Text>
                      <Text type="supporting" size="xsm" color="secondary">
                        {scoreLabel}
                      </Text>
                    </div>
                  </HStack>
                </Card>
              </div>
            ))}
          </VStack>
        )}

        {hasRows && !isMobile && (
          <Card variant="default" padding={0} width="100%">
            <Table<RankedRow>
              data={rows}
              idKey="rank"
              density="spacious"
              dividers="rows"
              hasHover
              verticalAlign="middle"
              columns={[
                {
                  key: 'rank',
                  header: '#',
                  width: pixel(72),
                  align: 'center',
                  renderCell: (row) => <RankMedal rank={row.rank} medal={row.medal} />,
                },
                {
                  key: 'name',
                  header: '',
                  width: proportional(2),
                  renderCell: (row) => (
                    <HStack gap={2} align="center">
                      <Avatar src={row.picture ?? undefined} name={row.name} size="small" />
                      <div style={{ minWidth: 0 }}>
                        <Text type="body" weight="semibold" maxLines={1}>
                          {row.name}
                        </Text>
                        <Text type="supporting" size="xsm" color="secondary">
                          {row.secondary}
                        </Text>
                      </div>
                    </HStack>
                  ),
                },
                {
                  key: 'score',
                  header: scoreLabel,
                  width: pixel(120),
                  align: 'end',
                  renderCell: (row) => (
                    <Text type="large" weight="bold">
                      {row.score}
                    </Text>
                  ),
                },
              ]}
            />
          </Card>
        )}

        <Text type="supporting" size="xsm" color="secondary">
          {tab === 'category' ? t('leaderboard.footerCategory') : t('leaderboard.footerDefault')}
        </Text>
      </VStack>
    </div>
  );
}

// The rank indicator: a medal for the podium, otherwise the number in a subtle
// disc. Top-three discs pick up the subject accent so the podium reads at a
// glance without a full-row highlight.
function RankMedal({ rank, medal }: { rank: number; medal: string | null }): ReactNode {
  // Screen readers get the placement as text in both branches; the visual disc
  // itself stays decorative.
  if (medal) {
    // Podium: the medal sits in a quietly tinted disc — gold / silver / bronze.
    const tint = rank === 1 ? '#f5b301' : rank === 2 ? '#9aa4b2' : '#cd7f32';
    return (
      <span style={{ display: 'inline-flex' }}>
        <span style={visuallyHidden}>#{rank}</span>
        <span
          aria-hidden
          style={{
            display: 'inline-grid',
            placeItems: 'center',
            width: 38,
            height: 38,
            borderRadius: 999,
            fontSize: '1.25rem',
            lineHeight: 1,
            background: `${tint}1f`,
            boxShadow: `inset 0 0 0 1px ${tint}55`,
          }}
        >
          {medal}
        </span>
      </span>
    );
  }
  return (
    <span style={{ display: 'inline-flex' }}>
      <span style={visuallyHidden}>#{rank}</span>
      <span
        aria-hidden
        style={{
          display: 'inline-grid',
          placeItems: 'center',
          minWidth: 28,
          height: 28,
          padding: '0 6px',
          borderRadius: 999,
          fontSize: '0.8125rem',
          fontWeight: 700,
          color: 'var(--astryx-color-text-secondary, #64748b)',
          background: 'var(--astryx-color-surface-muted, rgba(100,116,139,0.12))',
        }}
      >
        {rank}
      </span>
    </span>
  );
}

function formatMs(ms: number): string {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`;
}

export default Leaderboard;
