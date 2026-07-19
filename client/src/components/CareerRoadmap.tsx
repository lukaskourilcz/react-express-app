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
import { useTrack, isTopicInTrack, rankLabelKeyFor, trackLabelKey, trackBlurbKey, stageTitleKey, localizedTopicDetail, TRACK_ORDER, tracksForSubject } from '../lib/tracks';
import { getCategoryHexColor, categoryLabelKey } from '../lib/categories';
import { useSubject, subjectNameKey, type SubjectId } from '../lib/subjects';
import type { RoadmapTopic } from '../types/quiz';
import { useTotalXp } from '../lib/xp';
import { levelForXp, getCareerRanks } from '../lib/leveling';
import RoadmapTree from './RoadmapTree';
import { SwimCta } from './landing/LandingKit';
import './DeepEndScreens.css';
import { TrophyIcon } from './ui/icons';

type TFn = (key: TranslationKey, vars?: Record<string, string | number>) => string;

// Tinted Card variants cycle across the pillars so each knowledge area reads as
// its own category — adapts to light/dark automatically. The tint alone is the
// differentiator; pillar titles stay clean text.
type CardVariant = 'green' | 'blue' | 'purple' | 'teal' | 'orange';
const PILLAR_VARIANTS: CardVariant[] = ['green', 'blue', 'purple', 'teal', 'orange'];

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
// / topic-detail translation keys.
function derivedPillars(subject: SubjectId, t: TFn): Pillar[] {
  const full = tracksForSubject(subject).fullstack;
  return full.stages.map((stage, i) => ({
    id: `stage-${i}`,
    title: t(stageTitleKey(subject, 'fullstack', i)),
    intro: '',
    areas: stage.topics.map((topic) => ({
      topic,
      label: t(categoryLabelKey(topic)),
      blurb: localizedTopicDetail(t, topic) ?? '',
    })),
  }));
}

function buildPillars(subject: SubjectId, t: TFn): Pillar[] {
  return subject === 'webdev' ? webdevPillars(t) : derivedPillars(subject, t);
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
  const isWebdev = subject === 'webdev';
  const pillars = useMemo(() => buildPillars(subject, t), [subject, t]);

  // Header copy: Web Dev keeps its curated career framing; other subjects get a
  // clean, subject-branded header (the fullstack track blurb is the pitch).
  const subjectName = t(subjectNameKey(subject));
  const kicker = isWebdev ? t('roadmapPage.kicker') : t('careerRoadmap.subjectKicker', { subject: subjectName });
  const pageTitle = isWebdev ? t('roadmapPage.title') : t('careerRoadmap.subjectTitle', { subject: subjectName });
  const headerBody = isWebdev ? t('careerRoadmap.headerBody') : t(trackBlurbKey(subject, 'fullstack'));

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
  const rankKeys = rankLabelKeyFor(info.rank, track);
  const rankTitle = t(rankKeys.key, rankKeys.vars);
  const seniorRank = getCareerRanks().find((r) => r.title === SENIOR_RANK_TITLE);
  const reachedSenior = seniorRank ? totalXp >= seniorRank.minXp : false;
  const xpToSenior = seniorRank ? Math.max(0, seniorRank.minXp - totalXp) : 0;

  const selectedTrack = tracksForSubject(subject)[track];
  const ladderStages = selectedTrack.stages.map((stage, index) => {
    const topics = stage.topics;
    const total = topics.reduce((sum, topic) => sum + levelsFor(topic), 0);
    const passed = topics.reduce((sum, topic) => sum + Math.min(passedLevelCount(progress, topic), levelsFor(topic)), 0);
    const completion = pct(passed, total);
    return { index, topics, completion, done: completion === 100, current: completion > 0 && completion < 100 };
  });

  if (ladderStages.length >= 0) {
    return (
      <div className="de-page">
        <VStack gap={3}>
          <div className="ss-pop">
            <VStack gap={1}>
              <span className="ss-kicker">{kicker}</span>
              <Heading level={1} type="display-3">{t('careerRoadmap.editorialTitle')}</Heading>
              <Text type="large" color="secondary">{t('careerRoadmap.editorialBody')}</Text>
            </VStack>
          </div>
          <div className="de-track-cards" role="radiogroup" aria-label={t('careerRoadmap.chooseTrack')}>
            {TRACK_ORDER.map((trackId) => (
              <button key={trackId} type="button" className="de-track-card" role="radio" aria-checked={track === trackId} aria-pressed={track === trackId} onClick={() => setTrack(trackId)}>
                <strong>{t(trackLabelKey(subject, trackId))}</strong>
                <span>{t(trackBlurbKey(subject, trackId))}</span>
              </button>
            ))}
          </div>
          <section className="de-ladder" aria-label={t(trackLabelKey(subject, track))}>
            {ladderStages.map((stage, index) => (
              <div key={index} className={`de-stage${stage.done ? ' is-done' : stage.current || (index === 0 && stage.completion === 0) ? ' is-current' : ''}`}>
                <div className="de-stage__rail">
                  <span className="de-stage__node">{stage.done ? '✓' : index + 1}</span>
                  {index < ladderStages.length - 1 && <span className="de-stage__line" />}
                </div>
                <div className="de-stage__body">
                  <div className="de-stage__head">
                    <strong>{t(stageTitleKey(subject, track, index))}</strong>
                    <span className="de-stage__tag">{stage.done ? t('careerRoadmap.stageDone') : stage.current ? t('careerRoadmap.stageCurrent') : t('careerRoadmap.stageAhead')}</span>
                  </div>
                  <div className="de-stage__chips">
                    {stage.topics.map((topic) => <span key={topic}>{t(categoryLabelKey(topic))}</span>)}
                  </div>
                </div>
              </div>
            ))}
            <div className="de-stage de-stage--finish">
              <div className="de-stage__rail"><span className="de-stage__node"><TrophyIcon size={18} /></span></div>
              <div className="de-stage__body">
                <div className="de-stage__head"><strong style={{ color: '#c77f00' }}>{t('careerRoadmap.seniorReady')}</strong></div>
                <Text type="supporting" color="secondary">{t('careerRoadmap.skillCheckLead')}</Text>
              </div>
              <SwimCta label={t('roadmap.skillCheckCta')} dir={-1} onClick={() => navigate('/learn')} />
            </div>
          </section>
        </VStack>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: 780, margin: '0 auto' }}>
      <VStack gap={4}>
        {/* Header */}
        <div className="ss-pop" style={{ width: '100%' }}>
          <VStack gap={1}>
            <span className="ss-kicker">{kicker}</span>
            <Heading level={1} type="display-3">
              {pageTitle}
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
                <SegmentedControlItem key={tk} value={tk} label={t(trackLabelKey(subject, tk))} />
              ))}
            </SegmentedControl>
          </div>
          <Text type="supporting" color="secondary" justify="center">
            {t(trackBlurbKey(subject, track))}
          </Text>
        </VStack>

        {/* Where you are now — the headline stat for the chosen track. */}
        <div className="ss-raised ss-pop" style={{ display: 'flex', width: '100%' }}>
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius-container)', width: '100%' }}>
        <Card variant="muted" padding={5} width="100%">
          <VStack gap={2}>
            <HStack justify="between" align="center" gap={1} wrap="wrap">
              <Text type="label" color="secondary">
                {t('careerRoadmap.progressTitle')}
              </Text>
              <Badge variant="neutral" label={t(trackLabelKey(subject, track))} />
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
                    track: t(trackLabelKey(subject, track)),
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
                  <Badge variant="neutral" label={rankTitle} />
                  <Text type="supporting" size="xsm" color="secondary">
                    {reachedSenior
                      ? t('careerRoadmap.seniorReached')
                      : t('careerRoadmap.xpToSenior', { xp: xpToSenior.toLocaleString() })}
                  </Text>
                </>
              ) : (
                // Other subjects use a neutral XP chip — the "senior engineer"
                // career ranks are Web Dev specific.
                <Badge variant="neutral" label={`${totalXp.toLocaleString()} XP`} />
              )}
            </HStack>
          </VStack>
        </Card>
        </div>
        </div>

        {/* The full roadmap as a dependency tree, each topic branched into its 3
            parts, coloured by the learner's live progress. */}
        <div className="ss-raised" style={{ display: 'flex', width: '100%' }}>
        <Card variant="default" padding={5} width="100%">
          <VStack gap={2}>
            <VStack gap={0.5}>
              <Heading level={2}>
                {t('roadmapPage.treeTitle')}
              </Heading>
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
              <div key={pillar.id} className="ss-raised" style={{ display: 'flex', width: '100%' }}>
              <Card variant={PILLAR_VARIANTS[i % PILLAR_VARIANTS.length]} padding={5} width="100%">
                <VStack gap={2}>
                  <HStack justify="between" align="center" gap={1} wrap="wrap">
                    <Heading level={3}>{pillar.title}</Heading>
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
          <div className="ss-raised" style={{ display: 'flex', width: '100%' }}>
          <Card variant="orange" padding={5} width="100%">
            <VStack gap={1.5}>
              <Heading level={2}>{t('careerRoadmap.beyondTitle')}</Heading>
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
