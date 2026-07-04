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
import type { TranslationKey } from '../i18n/translations';
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
  labelKey: TranslationKey;
  blurbKey: TranslationKey;
}
interface Pillar {
  id: string;
  titleKey: TranslationKey;
  introKey: TranslationKey;
  areas: Area[];
}

// Helper: each area maps 1:1 to a learning-path topic, and its label/blurb
// live in the translation dictionaries under careerRoadmap.area.<topic>.*.
function area(topic: RoadmapTopic): Area {
  return {
    topic,
    labelKey: `careerRoadmap.area.${topic}.label` as TranslationKey,
    blurbKey: `careerRoadmap.area.${topic}.blurb` as TranslationKey,
  };
}

// The knowledge devShark actually covers, grouped the way the market thinks
// about a full-stack engineer. All copy comes from the careerRoadmap.* keys.
const PILLARS: Pillar[] = [
  {
    id: 'foundations',
    titleKey: 'careerRoadmap.pillar.foundations.title',
    introKey: 'careerRoadmap.pillar.foundations.intro',
    areas: [area('html'), area('css'), area('javascript'), area('typescript')],
  },
  {
    id: 'frameworks',
    titleKey: 'careerRoadmap.pillar.frameworks.title',
    introKey: 'careerRoadmap.pillar.frameworks.intro',
    areas: [area('react'), area('nextjs'), area('rhf-zod')],
  },
  {
    id: 'backend',
    titleKey: 'careerRoadmap.pillar.backend.title',
    introKey: 'careerRoadmap.pillar.backend.intro',
    areas: [area('nodejs'), area('general'), area('internet')],
  },
  {
    id: 'cs',
    titleKey: 'careerRoadmap.pillar.cs.title',
    introKey: 'careerRoadmap.pillar.cs.intro',
    areas: [area('dsa'), area('algorithms')],
  },
  {
    id: 'production',
    titleKey: 'careerRoadmap.pillar.production.title',
    introKey: 'careerRoadmap.pillar.production.intro',
    areas: [area('databases'), area('system-design'), area('testing'), area('devops'), area('security')],
  },
];

// The honest part: things a quiz app genuinely cannot give you. Seniority is
// mostly this list plus years of shipping.
const BEYOND: { id: string; labelKey: TranslationKey; detailKey: TranslationKey }[] = [
  { id: 'production', labelKey: 'careerRoadmap.beyond.production.label', detailKey: 'careerRoadmap.beyond.production.detail' },
  { id: 'communication', labelKey: 'careerRoadmap.beyond.communication.label', detailKey: 'careerRoadmap.beyond.communication.detail' },
  { id: 'leadership', labelKey: 'careerRoadmap.beyond.leadership.label', detailKey: 'careerRoadmap.beyond.leadership.detail' },
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
          {t('careerRoadmap.headerBody')}
        </Typography>
      </Box>

      {/* Honesty banner */}
      <Alert severity="info" icon={false} sx={{ mb: 3, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="body2">
          <strong>{t('careerRoadmap.honestyLead')}</strong> {t('careerRoadmap.honestyBody')}
        </Typography>
      </Alert>

      {/* Track chooser — drives the headline %, the map and the pillars below. */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, mb: 3 }}>
        <Typography variant="overline" color="text.secondary">
          {t('careerRoadmap.chooseTrack')}
        </Typography>
        <ToggleButtonGroup
          value={track}
          exclusive
          onChange={(_, v: typeof track | null) => v && setTrack(v)}
          size="small"
          aria-label={t('careerRoadmap.chooseTrack')}
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
            {t('careerRoadmap.progressTitle')}
          </Typography>
          <Chip size="small" label={TRACKS[track].label} sx={{ fontWeight: 700, backgroundColor: BRAND.greenSoft, color: BRAND.green }} />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, mt: 1, mb: 1.5, flexWrap: 'wrap' }}>
          <Typography variant="h3" sx={{ fontWeight: 800, color: BRAND.green, lineHeight: 1 }}>
            {overall.pct}%
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('careerRoadmap.progressCaption', {
              passed: overall.passed,
              total: overall.total || '…',
              track: TRACKS[track].label,
            })}
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
            {reachedSenior
              ? t('careerRoadmap.seniorReached')
              : t('careerRoadmap.xpToSenior', { xp: xpToSenior.toLocaleString() })}
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

      {/* The pillars, filtered to the chosen track (empty pillars are hidden).
          One shared CTA up top instead of repeating it under every pillar. */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
        <Button component={Link} to="/learn" size="small" sx={{ ...brandButtonSx, color: '#fff' }} variant="contained">
          {t('careerRoadmap.continueCta')}
        </Button>
      </Box>
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
          <Paper key={pillar.id} elevation={0} sx={{ p: { xs: 2, sm: 3 }, mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>{t(pillar.titleKey)}</Typography>
              <Chip size="small" label={`${pPct}%`} sx={{ fontWeight: 700, backgroundColor: pPct === 100 ? BRAND.green : BRAND.greenSoft, color: pPct === 100 ? '#fff' : BRAND.green }} />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{t(pillar.introKey)}</Typography>
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
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{t(area.labelKey)}</Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {total ? t('careerRoadmap.areaLevels', { passed, total }) : '—'}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, pl: 1.75 }}>{t(area.blurbKey)}</Typography>
                    <LinearProgress
                      variant="determinate"
                      value={aPct}
                      sx={{ height: 6, borderRadius: 3, backgroundColor: 'action.hover', '& .MuiLinearProgress-bar': { borderRadius: 3, backgroundColor: color } }}
                    />
                  </Box>
                );
              })}
            </Box>
          </Paper>
        );
      })}

      {/* The honest gap */}
      <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, mt: 3, border: '1px dashed', borderColor: 'warning.main', borderRadius: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>{t('careerRoadmap.beyondTitle')}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {t('careerRoadmap.beyondIntro')}
        </Typography>
        <Divider sx={{ mb: 1.5 }} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {BEYOND.map((b) => (
            <Box key={b.id} sx={{ display: 'flex', gap: 1 }}>
              <Box aria-hidden sx={{ color: 'warning.dark', fontWeight: 700 }}>○</Box>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{t(b.labelKey)}</Typography>
                <Typography variant="caption" color="text.secondary">{t(b.detailKey)}</Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Paper>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 3 }}>
        {t('careerRoadmap.footer')}
      </Typography>
    </Box>
  );
}
