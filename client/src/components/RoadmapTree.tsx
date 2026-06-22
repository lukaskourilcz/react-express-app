// Whole-roadmap tree graph for the /roadmap page. Every topic ("family") is a
// node, laid out in dependency tiers (foundations → builds-on-JS → specialise),
// with edges drawn from each prerequisite to the topics that need it. Each node
// branches into its 3 parts (the shorter learning paths), and every part pill
// reflects the signed-in learner's live progress (locked / available /
// in-progress / complete) and deep-links into that path on /learn.

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Box, Typography, Tooltip, useTheme } from '@mui/material';
import type { RoadmapStructure, RoadmapTopic } from '../types/quiz';
import {
  useRoadmapProgress,
  useExtraUnlocks,
  isTopicUnlocked,
  partRanges,
  pathStatus,
  PARTS_PER_TOPIC,
  TOPIC_PREREQS,
  type PathStatus,
} from '../lib/roadmap';
import { getCategoryLabel, getCategoryHexColor, onCategoryColorText } from '../lib/categories';
import { useT } from '../i18n/LanguageContext';
import type { TranslationKey } from '../i18n/translations';

type TFn = (key: TranslationKey, vars?: Record<string, string | number>) => string;

const FAMILIES = Object.keys(TOPIC_PREREQS) as RoadmapTopic[];

// Dependency tier = longest prerequisite chain to a root. Memoised per call.
function computeTiers(): Record<RoadmapTopic, number> {
  const memo = {} as Record<RoadmapTopic, number>;
  const tierOf = (f: RoadmapTopic): number => {
    if (memo[f] !== undefined) return memo[f];
    const reqs = TOPIC_PREREQS[f] ?? [];
    memo[f] = reqs.length === 0 ? 0 : 1 + Math.max(...reqs.map(tierOf));
    return memo[f];
  };
  for (const f of FAMILIES) tierOf(f);
  return memo;
}

// Node + grid geometry (px). The canvas is sized to the tiers and the tallest
// tier; it scrolls horizontally on narrow screens.
const NODE_W = 158;
const NODE_H = 62;
const COL_GAP = 60;
const ROW_GAP = 12;
const COL_W = NODE_W + COL_GAP;
const ROW_H = NODE_H + ROW_GAP;
const PAD = 8;

interface PlacedFamily {
  family: RoadmapTopic;
  x: number;
  y: number;
}

export default function RoadmapTree({ structure }: { structure: RoadmapStructure | null }) {
  const t = useT();
  const theme = useTheme();
  const progress = useRoadmapProgress();
  const extraUnlocks = useExtraUnlocks();
  const extraSet = useMemo(() => new Set(extraUnlocks), [extraUnlocks]);

  // Place every family by tier (column) and its index within the tier (row),
  // vertically centring shorter tiers so the graph reads as a balanced tree.
  const { placed, width, height } = useMemo(() => {
    const tiers = computeTiers();
    const byTier = new Map<number, RoadmapTopic[]>();
    for (const f of FAMILIES) {
      const tr = tiers[f];
      if (!byTier.has(tr)) byTier.set(tr, []);
      byTier.get(tr)!.push(f);
    }
    const tierKeys = Array.from(byTier.keys()).sort((a, b) => a - b);
    const maxRows = Math.max(...tierKeys.map((k) => byTier.get(k)!.length));
    const canvasH = maxRows * ROW_H - ROW_GAP + PAD * 2;
    const canvasW = tierKeys.length * COL_W - COL_GAP + PAD * 2;

    const pos = new Map<RoadmapTopic, PlacedFamily>();
    tierKeys.forEach((k, col) => {
      const fams = byTier.get(k)!;
      const tierH = fams.length * ROW_H - ROW_GAP;
      const top = PAD + (canvasH - PAD * 2 - tierH) / 2;
      fams.forEach((family, row) => {
        pos.set(family, { family, x: PAD + col * COL_W, y: top + row * ROW_H });
      });
    });
    return { placed: pos, width: canvasW, height: canvasH };
  }, []);

  // Edges: prerequisite (right edge) → dependent (left edge), as soft curves.
  const edges = useMemo(() => {
    const out: { d: string; key: string }[] = [];
    for (const f of FAMILIES) {
      const to = placed.get(f);
      if (!to) continue;
      for (const req of TOPIC_PREREQS[f] ?? []) {
        const from = placed.get(req);
        if (!from) continue;
        const x1 = from.x + NODE_W;
        const y1 = from.y + NODE_H / 2;
        const x2 = to.x;
        const y2 = to.y + NODE_H / 2;
        const mx = (x1 + x2) / 2;
        out.push({ key: `${req}->${f}`, d: `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}` });
      }
    }
    return out;
  }, [placed]);

  const levelCountOf = (family: RoadmapTopic): number =>
    structure?.structure?.[family]?.levels.length ?? 0;

  return (
    <Box sx={{ width: '100%', overflowX: 'auto', pb: 1 }}>
      <Box sx={{ position: 'relative', width, height, mx: 'auto' }}>
        {/* edges */}
        <Box component="svg" aria-hidden width={width} height={height} sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {edges.map((e) => (
            <path key={e.key} d={e.d} fill="none" stroke={theme.palette.divider} strokeWidth={2} />
          ))}
        </Box>

        {/* nodes */}
        {FAMILIES.map((family) => {
          const p = placed.get(family);
          if (!p) return null;
          const familyUnlocked = isTopicUnlocked(progress, family, extraSet);
          const color = getCategoryHexColor(family);
          const ranges = partRanges(levelCountOf(family));
          const complete = ranges.length > 0 && ranges.every((r) => pathStatus(progress, family, ranges, r.part, extraSet) === 'complete');
          return (
            <Box
              key={family}
              style={{ left: p.x, top: p.y, width: NODE_W, height: NODE_H }}
              sx={{
                position: 'absolute',
                borderRadius: 2,
                border: '2px solid',
                borderColor: complete ? color : familyUnlocked ? 'divider' : 'transparent',
                backgroundColor: 'background.paper',
                opacity: familyUnlocked ? 1 : 0.55,
                boxShadow: familyUnlocked ? `0 1px 4px ${color}22` : 'none',
                p: 0.75,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
                <Typography variant="caption" noWrap sx={{ fontWeight: 700, color: familyUnlocked ? 'text.primary' : 'text.disabled' }}>
                  {getCategoryLabel(family)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {(ranges.length > 0 ? ranges.map((r) => r.part) : Array.from({ length: PARTS_PER_TOPIC }, (_, i) => i + 1)).map((part) => {
                  const status: PathStatus = ranges.length > 0 ? pathStatus(progress, family, ranges, part, extraSet) : 'locked';
                  return <PartPill key={part} family={family} part={part} status={status} color={color} t={t} />;
                })}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

function PartPill({
  family, part, status, color, t,
}: {
  family: RoadmapTopic; part: number; status: PathStatus; color: string; t: TFn;
}) {
  const locked = status === 'locked';
  const complete = status === 'complete';
  const filled = complete;
  const stateLabel = t(
    complete ? 'roadmapTree.complete' : status === 'in-progress' ? 'roadmapTree.inProgress' : locked ? 'roadmapTree.locked' : 'roadmapTree.available',
  );
  const sx = {
    flex: 1,
    textAlign: 'center' as const,
    fontSize: '0.62rem',
    fontWeight: 800,
    lineHeight: 1.6,
    borderRadius: 1,
    border: '1.5px solid',
    borderColor: locked ? 'divider' : color,
    backgroundColor: filled ? color : status === 'in-progress' ? `${color}24` : 'transparent',
    color: filled ? onCategoryColorText(family) : locked ? 'text.disabled' : 'text.primary',
    textDecoration: 'none',
    cursor: locked ? 'default' : 'pointer',
    display: 'block',
  };
  const label = t('roadmapTree.partPill', { n: part });
  const title = `${getCategoryLabel(family)} · ${label} — ${stateLabel}`;
  if (locked) {
    return (
      <Tooltip title={title} arrow>
        <Box sx={sx} aria-label={title}>{part}</Box>
      </Tooltip>
    );
  }
  return (
    <Tooltip title={title} arrow>
      <Box component={Link} to={`/learn?topic=${family}&part=${part}`} sx={sx} aria-label={title}>
        {part}
      </Box>
    </Tooltip>
  );
}
