// "Roadmap" — an honest, market-grounded picture of what it takes to become a
// senior full-stack engineer, wired to the learner's actual progress on the
// StudyShark learning path. It deliberately separates "what StudyShark can teach
// you" (the four knowledge pillars, with live completion %) from "what only the
// real world can" (the Beyond list) so the page never over-promises.
//
// Redesigned on the Astryx design system: Astryx typography, tinted Cards, a
// SegmentedControl track chooser, ProgressBars and Badges — all logic, hooks and
// i18n preserved verbatim.

import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import { Card } from '@astryxdesign/core/Card';
import { Banner } from '@astryxdesign/core/Banner';
import { Divider } from '@astryxdesign/core/Divider';
import { Button } from '@astryxdesign/core/Button';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { SegmentedControl } from '@astryxdesign/core/SegmentedControl';
import { SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { useT } from '../i18n/LanguageContext';
import type { TranslationKey } from '../i18n/translations';
import {
  useRoadmapProgress,
  passedLevelCount,
  syncProgressWithServer,
} from '../lib/roadmap';
import { useRoadmapStructure } from '../lib/queries';
import { useTrack, isTopicInTrack, specializationForTrack, useActiveTracks, TOPIC_DETAIL, TRACK_ORDER, tracksForSubject } from '../lib/tracks';
import { getCategoryHexColor, getCategoryLabel } from '../lib/categories';
import { useSubject, useActiveSubject, type SubjectId } from '../lib/subjects';
import type { RoadmapTopic } from '../types/quiz';
import { useTotalXp } from '../lib/xp';
import { levelForXp, displayTitle, getCareerRanks } from '../lib/leveling';
import RoadmapTree from './RoadmapTree';

type TFn = (key: TranslationKey, vars?: Record<string, string | number>) => string;

// Tinted Card variants cycle across the pillars so each knowledge area reads as
// its own category — adapts to light/dark automatically.
type CardVariant = 'green' | 'blue' | 'purple' | 'teal' | 'orange';
const PILLAR_VARIANTS: CardVariant[] = ['green', 'blue', 'purple', 'teal', 'orange'];
// A playful emoji per pillar; cycles for subjects with derived pillars.
const PILLAR_EMOJI = ['🧱', '⚛️', '🛠️', '🧠', '🚀'];

interface Area {
  topic: RoadmapTopic;
  label: string;
  blurb: string;
}
interface Pillar {
  id: string;
  title: string;
  intro: string;
  areas: Area[];
}

// Web Dev keeps its curated, market-framed pillars (copy in careerRoadmap.*).
function webdevPillars(t: TFn): Pillar[] {
  const area = (topic: RoadmapTopic): Area => ({
    topic,
    label: t(`careerRoadmap.area.${topic}.label` as TranslationKey),
    blurb: t(`careerRoadmap.area.${topic}.blurb` as TranslationKey),
  });
  const p = (id: string, areas: Area[]): Pillar => ({
    id,
    title: t(`careerRoadmap.pillar.${id}.title` as TranslationKey),
    intro: t(`careerRoadmap.pillar.${id}.intro` as TranslationKey),
    areas,
  });
  return [
    p('foundations', [area('html'), area('css'), area('javascript'), area('typescript')]),
    p('frameworks', [area('react'), area('nextjs'), area('rhf-zod')]),
    p('backend', [area('nodejs'), area('general'), area('internet')]),
    p('cs', [area('dsa'), area('algorithms')]),
    p('production', [area('databases'), area('system-design'), area('testing'), area('devops'), area('security')]),
  ];
}

// Every other subject derives its pillars from its "fullstack" track: each
// stage becomes a pillar, each topic an area, labelled from the shared category
// / topic-detail metadata — no per-subject translation keys required.
function derivedPillars(subject: SubjectId): Pillar[] {
  const full = tracksForSubject(subject).fullstack;
  return full.stages.map((stage, i) => ({
    id: `stage-${i}`,
    title: stage.title,
    intro: '',
    areas: stage.topics.map((topic) => ({
      topic,
      label: getCategoryLabel(topic),
      blurb: TOPIC_DETAIL[topic] ?? '',
    })),
  }));
}

function buildPillars(subject: SubjectId, t: TFn): Pillar[] {
  return subject === 'webdev' ? webdevPillars(t) : derivedPillars(subject);
}

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
  const navigate = useNavigate();
  const progress = useRoadmapProgress();
  const totalXp = useTotalXp();
  // Shared (cached, de-duped with /learn) roadmap structure for level counts.
  const structure = useRoadmapStructure().data ?? null;
  // The chosen track drives this whole page — map, pillars and headline %.
  const [track, setTrack] = useTrack();
  // Subject scopes the tracks, pillars and (web-dev-only) career framing.
  const [subject] = useSubject();
  const tracks = useActiveTracks();
  const isWebdev = subject === 'webdev';
  const sdef = useActiveSubject();
  const pillars = useMemo(() => buildPillars(subject, t), [subject, t]);

  // Header copy: Web Dev keeps its curated career framing; other subjects get a
  // clean, subject-branded header (the fullstack track blurb is the pitch).
  const kicker = isWebdev ? t('roadmapPage.kicker') : `${sdef.label} roadmap`;
  const pageTitle = isWebdev ? t('roadmapPage.title') : `Your ${sdef.label} roadmap`;
  const headerBody = isWebdev ? t('careerRoadmap.headerBody') : tracks.fullstack.blurb;

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
    for (const pillar of pillars) {
      for (const area of pillar.areas) {
        if (!isTopicInTrack(track, area.topic)) continue;
        total += levelsFor(area.topic);
        passed += Math.min(passedLevelCount(progress, area.topic), levelsFor(area.topic));
      }
    }
    return { passed, total, pct: pct(passed, total) };
  }, [progress, structure, track, pillars]);

  const info = levelForXp(totalXp);
  const spec = specializationForTrack(track);
  const rankTitle = displayTitle(info.rank.title, spec);
  const seniorRank = getCareerRanks().find((r) => r.title === SENIOR_RANK_TITLE);
  const reachedSenior = seniorRank ? totalXp >= seniorRank.minXp : false;
  const xpToSenior = seniorRank ? Math.max(0, seniorRank.minXp - totalXp) : 0;

  return (
    <div style={{ width: '100%', maxWidth: 780, margin: '0 auto' }}>
      <VStack gap={4}>
        {/* Header */}
        <div className="ss-pop" style={{ width: '100%' }}>
          <VStack gap={1}>
            <HStack gap={1} align="center">
              <span aria-hidden className="ss-float" style={{ fontSize: '1.4rem', lineHeight: 1 }}>🗺️</span>
              <Text type="label" weight="bold" color="accent">
                {kicker}
              </Text>
            </HStack>
            <Heading level={1} type="display-3">
              <span className="ss-gradient-text">{pageTitle}</span>
            </Heading>
            <Text type="large" color="secondary">
              {headerBody}
            </Text>
          </VStack>
        </div>

        {/* Honesty banner — the career/seniority framing is Web Dev specific. */}
        {isWebdev && (
          <Banner
            status="info"
            container="card"
            title={t('careerRoadmap.honestyLead')}
            description={t('careerRoadmap.honestyBody')}
          />
        )}

        {/* Track chooser — drives the headline %, the map and the pillars below. */}
        <VStack gap={1.5} align="center">
          <Text type="label" color="secondary">
            {t('careerRoadmap.chooseTrack')}
          </Text>
          <div style={{ maxWidth: '100%', overflowX: 'auto' }}>
            <SegmentedControl
              value={track}
              onChange={(v) => setTrack(v as typeof track)}
              label={t('careerRoadmap.chooseTrack')}
            >
              {TRACK_ORDER.map((tk) => (
                <SegmentedControlItem key={tk} value={tk} label={tracks[tk].label} />
              ))}
            </SegmentedControl>
          </div>
          <Text type="supporting" color="secondary" justify="center">
            {tracks[track].blurb}
          </Text>
        </VStack>

        {/* Where you are now — the headline stat for the chosen track. */}
        <div className="ss-lift ss-pop" style={{ display: 'flex', width: '100%' }}>
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 16, width: '100%' }}>
        <Card variant="muted" padding={5} width="100%">
          <span aria-hidden className="ss-float" style={{ position: 'absolute', top: 16, right: 20, fontSize: '2rem', opacity: 0.55 }}>📈</span>
          <VStack gap={2}>
            <HStack justify="between" align="center" gap={1} wrap="wrap">
              <Text type="label" color="secondary">
                {t('careerRoadmap.progressTitle')}
              </Text>
              <Badge variant="neutral" label={tracks[track].label} />
            </HStack>

            <HStack gap={2} align="end" wrap="wrap">
              <Text type="display-1" color="accent" weight="bold">
                {overall.pct}%
              </Text>
              <div style={{ flex: '1 1 200px', minWidth: 0, paddingBottom: 8 }}>
                <Text type="supporting" color="secondary">
                  {t('careerRoadmap.progressCaption', {
                    passed: overall.passed,
                    total: overall.total || '…',
                    track: tracks[track].label,
                  })}
                </Text>
              </div>
            </HStack>

            <ProgressBar
              label={t('careerRoadmap.progressTitle')}
              value={overall.pct}
              variant="accent"
              isLabelHidden
            />

            <HStack gap={1} align="center" wrap="wrap">
              {isWebdev ? (
                <>
                  <Badge variant="neutral" label={`${info.rank.emoji} ${rankTitle}`} />
                  <Text type="supporting" size="xsm" color="secondary">
                    {reachedSenior
                      ? t('careerRoadmap.seniorReached')
                      : t('careerRoadmap.xpToSenior', { xp: xpToSenior.toLocaleString() })}
                  </Text>
                </>
              ) : (
                // Other subjects use a neutral XP chip — the "senior engineer"
                // career ranks are Web Dev specific.
                <Badge variant="neutral" label={`${info.rank.emoji} ${totalXp.toLocaleString()} XP`} />
              )}
            </HStack>
          </VStack>
        </Card>
        </div>
        </div>

        {/* The full roadmap as a dependency tree, each topic branched into its 3
            parts, coloured by the learner's live progress. */}
        <div className="ss-lift" style={{ display: 'flex', width: '100%' }}>
        <Card variant="default" padding={4} width="100%">
          <VStack gap={2}>
            <VStack gap={0.5}>
              <HStack gap={1} align="center">
                <span aria-hidden style={{ fontSize: '1.25rem', lineHeight: 1 }}>🌳</span>
                <Heading level={2}>
                  {t('roadmapPage.treeTitle')}
                </Heading>
              </HStack>
              <Text type="supporting" color="secondary">
                {t('roadmapPage.treeIntro')}
              </Text>
            </VStack>
            <RoadmapTree structure={structure} track={track} />
          </VStack>
        </Card>
        </div>

        {/* The pillars, filtered to the chosen track (empty pillars are hidden).
            One shared CTA up top instead of repeating it under every pillar. */}
        <HStack justify="center">
          <Button
            variant="primary"
            size="md"
            label={t('careerRoadmap.continueCta')}
            onClick={() => navigate('/learn')}
          />
        </HStack>

        <Grid columns={{ minWidth: 300, max: 2 }} gap={2}>
          {pillars.map((pillar, i) => {
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
              <div key={pillar.id} className="ss-lift" style={{ display: 'flex', width: '100%' }}>
              <Card variant={PILLAR_VARIANTS[i % PILLAR_VARIANTS.length]} padding={4} width="100%">
                <VStack gap={2}>
                  <HStack justify="between" align="center" gap={1} wrap="wrap">
                    <HStack gap={1.5} align="center">
                      <span aria-hidden style={{ fontSize: '1.5rem', lineHeight: 1 }}>{PILLAR_EMOJI[i % PILLAR_EMOJI.length]}</span>
                      <Heading level={3}>{pillar.title}</Heading>
                    </HStack>
                    <Badge variant={pPct === 100 ? 'success' : 'neutral'} label={`${pPct}%`} />
                  </HStack>
                  {pillar.intro && (
                    <Text type="supporting" color="secondary">{pillar.intro}</Text>
                  )}
                  <VStack gap={2}>
                    {areas.map((area) => {
                      const total = levelsFor(area.topic);
                      const passed = Math.min(passedLevelCount(progress, area.topic), total);
                      const aPct = pct(passed, total);
                      const color = getCategoryHexColor(area.topic);
                      return (
                        <VStack key={area.topic} gap={0.5}>
                          <HStack justify="between" align="center" gap={1}>
                            <HStack gap={1} align="center">
                              <span
                                aria-hidden
                                style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: color, flexShrink: 0, display: 'inline-block' }}
                              />
                              <Text type="body" weight="semibold">{area.label}</Text>
                            </HStack>
                            <Text type="supporting" size="xsm" color="secondary">
                              {total ? t('careerRoadmap.areaLevels', { passed, total }) : '—'}
                            </Text>
                          </HStack>
                          {area.blurb && (
                            <div style={{ paddingLeft: 17 }}>
                              <Text type="supporting" size="xsm" color="secondary">{area.blurb}</Text>
                            </div>
                          )}
                          <ProgressBar
                            label={area.label}
                            value={aPct}
                            variant={aPct === 100 ? 'success' : 'accent'}
                            isLabelHidden
                          />
                        </VStack>
                      );
                    })}
                  </VStack>
                </VStack>
              </Card>
              </div>
            );
          })}
        </Grid>

        {/* The honest gap — Web Dev only (it's about engineering seniority). */}
        {isWebdev && (
          <div className="ss-lift" style={{ display: 'flex', width: '100%' }}>
          <Card variant="orange" padding={4} width="100%">
            <VStack gap={1.5}>
              <HStack gap={1.5} align="center">
                <span aria-hidden style={{ fontSize: '1.4rem', lineHeight: 1 }}>🧗</span>
                <Heading level={2}>{t('careerRoadmap.beyondTitle')}</Heading>
              </HStack>
              <Text type="supporting" color="secondary">
                {t('careerRoadmap.beyondIntro')}
              </Text>
              <Divider variant="subtle" />
              <VStack gap={1.5}>
                {BEYOND.map((b) => (
                  <HStack key={b.id} gap={1.5} align="start">
                    <span aria-hidden style={{ color: 'var(--brand-accent)', fontWeight: 700, lineHeight: 1.4 }}>○</span>
                    <VStack gap={0}>
                      <Text type="body" weight="semibold">{t(b.labelKey)}</Text>
                      <Text type="supporting" size="xsm" color="secondary">{t(b.detailKey)}</Text>
                    </VStack>
                  </HStack>
                ))}
              </VStack>
            </VStack>
          </Card>
          </div>
        )}

        <Text type="supporting" size="xsm" color="secondary" justify="center">
          {t('careerRoadmap.footer')}
        </Text>
      </VStack>
    </div>
  );
}
