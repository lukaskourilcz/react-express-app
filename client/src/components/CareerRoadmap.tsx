// "Roadmap" — an honest, market-grounded picture of what it takes to become a
// senior full-stack engineer, wired to the learner's actual progress on the
// devShark learning path. It deliberately separates "what devShark can teach
// you" (the four knowledge pillars, with live completion %) from "what only the
// real world can" (the Beyond list) so the page never over-promises.

import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Box, Paper, Typography, LinearProgress, Chip, Button, Divider, Alert, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { BRAND, brandButtonSx } from '../theme/MuiTheme';
import { useT } from '../i18n/LanguageContext';
import {
  useRoadmapProgress,
  passedLevelCount,
  syncProgressWithServer,
} from '../lib/roadmap';
import { useRoadmapStructure } from '../lib/queries';
import { useTrack, isTopicInTrack, specializationForTrack, TRACKS, TRACK_ORDER } from '../lib/tracks';
import { getCategoryHexColor } from '../lib/categories';
import type { RoadmapTopic } from '../types/quiz';
import { useTotalXp } from '../lib/xp';
import { levelForXp, displayTitle, getCareerRanks } from '../lib/leveling';
import RoadmapTree from './RoadmapTree';

interface Area {
  topic: RoadmapTopic;
  label: string;
  blurb: string;
}
interface Pillar {
  title: string;
  intro: string;
  areas: Area[];
}

// The knowledge devShark actually covers, grouped the way the market thinks
// about a full-stack engineer. Each area maps to a learning-path topic.
const PILLARS: Pillar[] = [
  {
    title: 'Frontend foundations',
    intro: 'The bedrock. You cannot fake these — every interview and every codebase assumes them.',
    areas: [
      { topic: 'html', label: 'HTML', blurb: 'Semantics, forms, accessibility.' },
      { topic: 'css', label: 'CSS', blurb: 'Layout, flexbox/grid, responsive design.' },
      { topic: 'javascript', label: 'JavaScript', blurb: 'The language of the web — closures, async, the event loop.' },
      { topic: 'typescript', label: 'TypeScript', blurb: 'Non-negotiable in modern teams.' },
    ],
  },
  {
    title: 'Frontend frameworks',
    intro: 'Where most product work happens. React + a meta-framework is the default stack.',
    areas: [
      { topic: 'react', label: 'React', blurb: 'Components, hooks, state, rendering.' },
      { topic: 'nextjs', label: 'Next.js', blurb: 'Routing, server components, data fetching.' },
      { topic: 'rhf-zod', label: 'Forms & validation', blurb: 'React Hook Form + Zod — real apps are full of forms.' },
    ],
  },
  {
    title: 'Backend & the web',
    intro: 'The "stack" half. You need to build and reason about the server, not just call it.',
    areas: [
      { topic: 'nodejs', label: 'Node.js', blurb: 'Modules, async, HTTP, Express, streams.' },
      { topic: 'general', label: 'How the web works', blurb: 'HTTP, clients/servers, caching, auth basics.' },
      { topic: 'internet', label: 'How the internet works', blurb: 'IP, DNS, packets, TCP/IP, HTTPS.' },
    ],
  },
  {
    title: 'Computer science',
    intro: 'What separates someone who copies code from someone who can solve new problems.',
    areas: [
      { topic: 'dsa', label: 'Data structures & algorithms', blurb: 'Complexity, arrays, trees, graphs, sorting.' },
      { topic: 'algorithms', label: 'Problem solving & math', blurb: 'Combinatorics, probability, bitwise, recurrences.' },
    ],
  },
  {
    title: 'Engineering for production',
    intro: 'What turns a coder into an engineer who can design, ship, and run real systems — the senior half of the job.',
    areas: [
      { topic: 'databases', label: 'Databases & data modeling', blurb: 'SQL, schema design, indexing, transactions, N+1s.' },
      { topic: 'system-design', label: 'System design at scale', blurb: 'Caching, queues, sharding, trade-offs, failure modes.' },
      { topic: 'testing', label: 'Automated testing', blurb: 'Unit, integration and end-to-end — and what to test.' },
      { topic: 'devops', label: 'DevOps & cloud', blurb: 'CI/CD, containers, observability, deploying to the cloud.' },
      { topic: 'security', label: 'Security', blurb: 'AuthN/Z, OWASP Top 10, secrets, secure defaults.' },
    ],
  },
];

// The honest part: things a quiz app genuinely cannot give you. Seniority is
// mostly this list plus years of shipping.
const BEYOND: { label: string; detail: string }[] = [
  { label: 'Real production experience', detail: 'Shipping, on-call, incidents, reading large unfamiliar codebases.' },
  { label: 'Communication & judgement', detail: 'Code review, mentoring, scoping, saying no, product sense.' },
  { label: 'Leadership & ownership', detail: 'Driving projects, mentoring others, and being accountable for outcomes.' },
];

const SENIOR_RANK_TITLE = 'Senior Developer';

function pct(passed: number, total: number): number {
  return total > 0 ? Math.round((passed / total) * 100) : 0;
}

export default function CareerRoadmap() {
  const t = useT();
  const progress = useRoadmapProgress();
  const totalXp = useTotalXp();
  // Shared (cached, de-duped with /learn) roadmap structure for level counts.
  const structure = useRoadmapStructure().data ?? null;
  // The chosen track drives this whole page — map, pillars and headline %.
  const [track, setTrack] = useTrack();

  // Sync account progress so the percentages are accurate even on a fresh device.
  useEffect(() => {
    syncProgressWithServer().catch(() => {});
  }, []);

  const levelsFor = (topic: RoadmapTopic): number => structure?.structure?.[topic]?.levels.length ?? 0;
  const inTrack = (topic: RoadmapTopic): boolean => isTopicInTrack(track, topic);

  // Aggregate completion across the areas that belong to the chosen track.
  const overall = useMemo(() => {
    let passed = 0;
    let total = 0;
    for (const pillar of PILLARS) {
      for (const area of pillar.areas) {
        if (!isTopicInTrack(track, area.topic)) continue;
        total += levelsFor(area.topic);
        passed += Math.min(passedLevelCount(progress, area.topic), levelsFor(area.topic));
      }
    }
    return { passed, total, pct: pct(passed, total) };
  }, [progress, structure, track]);

  const info = levelForXp(totalXp);
  const spec = specializationForTrack(track);
  const rankTitle = displayTitle(info.rank.title, spec);
  const seniorRank = getCareerRanks().find((r) => r.title === SENIOR_RANK_TITLE);
  const reachedSenior = seniorRank ? totalXp >= seniorRank.minXp : false;
  const xpToSenior = seniorRank ? Math.max(0, seniorRank.minXp - totalXp) : 0;

  return (
    <Box sx={{ maxWidth: 760, mx: 'auto' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="overline" sx={{ color: BRAND.green, letterSpacing: '0.8px' }}>
          {t('roadmapPage.kicker')}
        </Typography>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 800, mb: 1 }}>
          {t('roadmapPage.title')}
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          A straight-talking map of what it takes to make it as a senior full-stack engineer — and exactly how
          far devShark can carry you. No hype: the path below is the knowledge base, not the finish line.
        </Typography>
      </Box>

      {/* Honesty banner */}
      <Alert severity="info" icon={false} sx={{ mb: 3, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="body2">
          <strong>The honest version:</strong> senior full-stack is typically <strong>5–8+ years</strong> of
          shipping real software. Knowledge is necessary but not sufficient — you also need the “Beyond devShark”
          list below, which no quiz app can hand you. devShark gets your <strong>fundamentals</strong> genuinely
          solid; the rest is reps in the real world.
        </Typography>
      </Alert>

      {/* Track chooser — drives the headline %, the map and the pillars below. */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, mb: 3 }}>
        <Typography variant="overline" color="text.secondary">
          Choose your track
        </Typography>
        <ToggleButtonGroup
          value={track}
          exclusive
          onChange={(_, v: typeof track | null) => v && setTrack(v)}
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
          {TRACKS[track].blurb}
        </Typography>
      </Box>

      {/* Where you are now */}
      <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, mb: 3, border: '1px solid', borderColor: 'divider', borderTop: `4px solid ${BRAND.green}`, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="overline" color="text.secondary" component="h2">
            Your fundamentals progress
          </Typography>
          <Chip size="small" label={TRACKS[track].label} sx={{ fontWeight: 700, backgroundColor: BRAND.greenSoft, color: BRAND.green }} />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, mt: 1, mb: 1.5, flexWrap: 'wrap' }}>
          <Typography variant="h3" sx={{ fontWeight: 800, color: BRAND.green, lineHeight: 1 }}>
            {overall.pct}%
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {overall.passed} / {overall.total || '…'} learning-path levels passed on the {TRACKS[track].label} track
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={overall.pct}
          sx={{ height: 10, borderRadius: 5, backgroundColor: 'action.hover', '& .MuiLinearProgress-bar': { borderRadius: 5, backgroundColor: BRAND.green } }}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
          <Chip size="small" label={`${info.rank.emoji} ${rankTitle}`} sx={{ fontWeight: 700, backgroundColor: BRAND.greenSoft, color: 'text.primary' }} />
          <Typography variant="caption" color="text.secondary">
            {reachedSenior ? (
              'You’ve crossed this app’s Senior threshold — keep it sharp and go build real things.'
            ) : (
              <>
                {xpToSenior.toLocaleString()} XP to devShark’s “Senior Developer” rank (a knowledge proxy, not a job
                title. <strong>Yet</strong>.)
              </>
            )}
          </Typography>
        </Box>
      </Paper>

      {/* The full roadmap as a dependency tree, each topic branched into its 3
          parts, coloured by the learner's live progress. */}
      <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2.5 }, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
          {t('roadmapPage.treeTitle')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('roadmapPage.treeIntro')}
        </Typography>
        <RoadmapTree structure={structure} track={track} />
      </Paper>

      {/* The pillars, filtered to the chosen track (empty pillars are hidden). */}
      {PILLARS.map((pillar) => {
        const areas = pillar.areas.filter((area) => inTrack(area.topic));
        if (areas.length === 0) return null;
        let pPassed = 0;
        let pTotal = 0;
        for (const area of areas) {
          pTotal += levelsFor(area.topic);
          pPassed += Math.min(passedLevelCount(progress, area.topic), levelsFor(area.topic));
        }
        const pPct = pct(pPassed, pTotal);
        return (
          <Paper key={pillar.title} elevation={0} sx={{ p: { xs: 2, sm: 3 }, mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>{pillar.title}</Typography>
              <Chip size="small" label={`${pPct}%`} sx={{ fontWeight: 700, backgroundColor: pPct === 100 ? BRAND.green : BRAND.greenSoft, color: pPct === 100 ? '#fff' : BRAND.green }} />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{pillar.intro}</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              {areas.map((area) => {
                const total = levelsFor(area.topic);
                const passed = Math.min(passedLevelCount(progress, area.topic), total);
                const aPct = pct(passed, total);
                const color = getCategoryHexColor(area.topic);
                return (
                  <Box key={area.topic}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
                        <Box aria-hidden sx={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{area.label}</Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {total ? `${passed}/${total} levels` : '—'}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, pl: 1.75 }}>{area.blurb}</Typography>
                    <LinearProgress
                      variant="determinate"
                      value={aPct}
                      sx={{ height: 6, borderRadius: 3, backgroundColor: 'action.hover', '& .MuiLinearProgress-bar': { borderRadius: 3, backgroundColor: color } }}
                    />
                  </Box>
                );
              })}
            </Box>
            <Button component={Link} to="/learn" size="small" sx={{ mt: 1.5, ...brandButtonSx, color: '#fff' }} variant="contained">
              Continue in the learning path →
            </Button>
          </Paper>
        );
      })}

      {/* The honest gap */}
      <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, mt: 3, border: '1px dashed', borderColor: 'warning.main', borderRadius: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>Beyond devShark — what you still have to earn</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          devShark doesn’t teach these, and honestly most of them can’t be taught by any quiz — they’re learned by
          building, breaking and shipping. This is the bulk of the gap to “senior”.
        </Typography>
        <Divider sx={{ mb: 1.5 }} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {BEYOND.map((b) => (
            <Box key={b.label} sx={{ display: 'flex', gap: 1 }}>
              <Box aria-hidden sx={{ color: 'warning.dark', fontWeight: 700 }}>○</Box>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{b.label}</Typography>
                <Typography variant="caption" color="text.secondary">{b.detail}</Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Paper>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 3 }}>
        Master these fundamentals here, then go get the reps. That combination is what actually makes it in this market.
      </Typography>
    </Box>
  );
}
