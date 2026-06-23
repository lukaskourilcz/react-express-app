// The /roadmap "map": a curated, top-to-bottom path through the topics that
// actually matter for a Frontend, Backend or Fullstack engineer. The learner
// picks a track and the map re-renders to just that track's stages, flowing
// from foundations at the top down to production concerns at the bottom. Every
// topic node is coloured by its brand/logo colour (matching the quiz + learn
// surfaces), carries a one-line "what you'll learn" detail, and branches into
// its 3 parts — each part pill reflects live progress and deep-links into
// /learn. Non-essential topics (Cool Stuff, AI, Abbreviations) are intentionally
// left off the map to keep it focused on the important stuff.

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Box, Typography, Tooltip, ToggleButton, ToggleButtonGroup } from '@mui/material';
import type { RoadmapStructure, RoadmapTopic } from '../types/quiz';
import {
  useRoadmapProgress,
  useExtraUnlocks,
  isTopicUnlocked,
  partRanges,
  pathStatus,
  PARTS_PER_TOPIC,
  type PathStatus,
  type RoadmapProgress,
} from '../lib/roadmap';
import { getCategoryLabel, getCategoryHexColor, onCategoryColorText } from '../lib/categories';
import { readJSON, writeJSON } from '../lib/storage';
import { BRAND } from '../theme/MuiTheme';
import { useT } from '../i18n/LanguageContext';
import type { TranslationKey } from '../i18n/translations';

type TFn = (key: TranslationKey, vars?: Record<string, string | number>) => string;

type Track = 'frontend' | 'backend' | 'fullstack';

// A one-line "what you'll learn" detail shown on each topic node.
const TOPIC_DETAIL: Partial<Record<RoadmapTopic, string>> = {
  html: 'Semantic markup, forms, accessibility.',
  css: 'Layout, flexbox & grid, responsive design.',
  javascript: 'Closures, async, and the event loop.',
  typescript: 'Types, generics, and safer refactors.',
  git: 'Branches, merges, pull requests, history.',
  react: 'Components, hooks, state, rendering.',
  nextjs: 'Routing, server components, data fetching.',
  'rhf-zod': 'Forms & validation with React Hook Form + Zod.',
  nodejs: 'Modules, async, HTTP, Express, streams.',
  general: 'How the web works: HTTP, caching, auth.',
  databases: 'SQL, schema design, indexing, transactions.',
  dsa: 'Complexity, arrays, trees, graphs, sorting.',
  algorithms: 'Problem-solving: recursion, combinatorics, math.',
  testing: 'Unit, integration, and end-to-end testing.',
  'system-design': 'Caching, queues, sharding, trade-offs.',
  devops: 'CI/CD, containers, observability, the cloud.',
  security: 'Auth, the OWASP Top 10, secure defaults.',
};

interface Stage {
  title: string;
  topics: RoadmapTopic[];
}
interface TrackDef {
  label: string;
  blurb: string;
  stages: Stage[];
}

// Curated tracks. Each is a top-to-bottom story: foundations → specialise →
// production. Fullstack is the union; Frontend and Backend share the core
// (JS/TS/Git/Testing) and branch into their own concerns.
const TRACKS: Record<Track, TrackDef> = {
  frontend: {
    label: 'Frontend',
    blurb: 'Build the interfaces people actually touch — markup, styling, and the React stack.',
    stages: [
      { title: 'Foundations', topics: ['html', 'css', 'javascript'] },
      { title: 'Level up the language', topics: ['typescript', 'git'] },
      { title: 'The React stack', topics: ['react', 'nextjs', 'rhf-zod'] },
      { title: 'Ship with confidence', topics: ['testing', 'dsa'] },
    ],
  },
  backend: {
    label: 'Backend',
    blurb: 'Build and run the server — APIs, data, and systems that hold up under load.',
    stages: [
      { title: 'Foundations', topics: ['javascript', 'typescript', 'git'] },
      { title: 'The server & the web', topics: ['nodejs', 'general'] },
      { title: 'Data & computer science', topics: ['databases', 'dsa', 'algorithms'] },
      { title: 'Production & scale', topics: ['testing', 'system-design', 'devops', 'security'] },
    ],
  },
  fullstack: {
    label: 'Fullstack',
    blurb: 'The whole picture — frontend, backend, and everything that ties them together.',
    stages: [
      { title: 'Foundations', topics: ['html', 'css', 'javascript'] },
      { title: 'Level up the language', topics: ['typescript', 'git'] },
      { title: 'Frontend', topics: ['react', 'nextjs', 'rhf-zod'] },
      { title: 'Backend', topics: ['nodejs', 'general', 'databases'] },
      { title: 'Computer science', topics: ['dsa', 'algorithms'] },
      { title: 'Production & scale', topics: ['testing', 'system-design', 'devops', 'security'] },
    ],
  },
};

const TRACK_ORDER: Track[] = ['frontend', 'backend', 'fullstack'];
const TRACK_KEY = 'devquiz:roadmap:track';
const isTrack = (v: unknown): v is Track => v === 'frontend' || v === 'backend' || v === 'fullstack';

export default function RoadmapTree({ structure }: { structure: RoadmapStructure | null }) {
  const t = useT();
  const progress = useRoadmapProgress();
  const extraUnlocks = useExtraUnlocks();
  const extraSet = useMemo(() => new Set(extraUnlocks), [extraUnlocks]);

  // Remember the learner's chosen track across visits.
  const [track, setTrack] = useState<Track>(() => {
    const saved = readJSON<string>(TRACK_KEY, 'fullstack');
    return isTrack(saved) ? saved : 'fullstack';
  });
  const selectTrack = (next: Track | null) => {
    if (!next) return; // ignore deselect — a track is always active
    setTrack(next);
    writeJSON(TRACK_KEY, next);
  };

  const def = TRACKS[track];
  const levelCountOf = (family: RoadmapTopic): number =>
    structure?.structure?.[family]?.levels.length ?? 0;

  return (
    <Box sx={{ width: '100%' }}>
      {/* Track chooser — the answer to "Frontend, Backend or Fullstack?" */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, mb: 2.5 }}>
        <ToggleButtonGroup
          value={track}
          exclusive
          onChange={(_, v: Track | null) => selectTrack(v)}
          size="small"
          aria-label="Choose your track"
          sx={{ flexWrap: 'wrap', justifyContent: 'center' }}
        >
          {TRACK_ORDER.map((tk) => (
            <ToggleButton
              key={tk}
              value={tk}
              sx={{
                px: 2.25,
                py: 0.6,
                textTransform: 'none',
                fontWeight: 700,
                '&.Mui-selected': {
                  backgroundColor: BRAND.green,
                  color: '#fff',
                  '&:hover': { backgroundColor: BRAND.greenHover },
                },
              }}
            >
              {TRACKS[tk].label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 520 }}>
          {def.blurb}
        </Typography>
      </Box>

      {/* The map: stages flow top → bottom. Keyed by track so switching tracks
          remounts and gently re-animates the new path into place. */}
      <Box
        key={track}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          '@keyframes rmTrackIn': {
            from: { opacity: 0, transform: 'translateY(8px)' },
            to: { opacity: 1, transform: 'none' },
          },
          animation: 'rmTrackIn 320ms ease-out',
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        }}
      >
        {def.stages.map((stage, i) => (
          <Box key={stage.title} sx={{ width: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1.25 }}>
              <Box
                aria-hidden
                sx={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  backgroundColor: BRAND.green,
                  color: '#fff',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, letterSpacing: '0.3px' }}>
                {stage.title}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25, justifyContent: 'center' }}>
              {stage.topics.map((family) => (
                <TopicCard
                  key={family}
                  family={family}
                  levelCount={levelCountOf(family)}
                  progress={progress}
                  extraSet={extraSet}
                  t={t}
                />
              ))}
            </Box>

            {i < def.stages.length - 1 && <StageConnector />}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/** A short vertical line + downward chevron linking one stage to the next. */
function StageConnector() {
  return (
    <Box
      aria-hidden
      sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 1 }}
    >
      <Box sx={{ width: 2, height: 16, backgroundColor: 'divider' }} />
      <Box
        component="svg"
        width="12"
        height="8"
        viewBox="0 0 12 8"
        sx={{ color: 'divider', display: 'block', mt: '-2px' }}
      >
        <path d="M1 1l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </Box>
    </Box>
  );
}

/** One topic node: colour-matched header, a detail line, and its 3 part pills. */
function TopicCard({
  family, levelCount, progress, extraSet, t,
}: {
  family: RoadmapTopic;
  levelCount: number;
  progress: RoadmapProgress;
  extraSet: Set<RoadmapTopic>;
  t: TFn;
}) {
  const color = getCategoryHexColor(family);
  const unlocked = isTopicUnlocked(progress, family, extraSet);
  const ranges = partRanges(levelCount);
  const complete =
    ranges.length > 0 &&
    ranges.every((r) => pathStatus(progress, family, ranges, r.part, extraSet) === 'complete');
  const detail = TOPIC_DETAIL[family];

  return (
    <Box
      sx={{
        width: { xs: '100%', sm: 232 },
        borderRadius: 2,
        border: '1px solid',
        borderColor: complete ? color : unlocked ? 'divider' : 'transparent',
        borderTop: `3px solid ${color}`,
        backgroundColor: 'background.paper',
        opacity: unlocked ? 1 : 0.6,
        boxShadow: unlocked ? `0 1px 6px ${color}22` : 'none',
        p: 1.25,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.6,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <Box aria-hidden sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
        <Typography variant="body2" sx={{ fontWeight: 700, color: unlocked ? 'text.primary' : 'text.disabled', lineHeight: 1.2 }}>
          {getCategoryLabel(family)}
        </Typography>
        {complete && (
          <Box component="svg" aria-hidden width="16" height="16" viewBox="0 0 24 24" sx={{ ml: 'auto', color }}>
            <path d="M20 6 9 17l-5-5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </Box>
        )}
      </Box>

      {detail && (
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4, minHeight: 32 }}>
          {detail}
        </Typography>
      )}

      <Box sx={{ display: 'flex', gap: 0.5, mt: 'auto', pt: 0.25 }}>
        {(ranges.length > 0 ? ranges.map((r) => r.part) : Array.from({ length: PARTS_PER_TOPIC }, (_, i) => i + 1)).map((part) => {
          const status: PathStatus = ranges.length > 0 ? pathStatus(progress, family, ranges, part, extraSet) : 'locked';
          return <PartPill key={part} family={family} part={part} status={status} color={color} t={t} />;
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
