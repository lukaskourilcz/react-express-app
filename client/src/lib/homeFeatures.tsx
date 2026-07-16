// Per-subject landing-page feature cards. Every platform pitches ITS OWN
// promises: History doesn't advertise a developer career roadmap, Geography
// leads with the world atlas, and each card carries a subject-appropriate
// icon and tint so no two homepages read the same. Copy lives in i18n
// (`home.f.<subject>.<n>.*`); Web Dev keeps its original curated keys.

import type { ReactNode } from 'react';
import type { SubjectId } from './subjects';
import type { TranslationKey } from '../i18n/translations';
import {
  CompassIcon,
  BoltIcon,
  MapIcon,
  GlobeIcon,
  BookIcon,
  CalculatorIcon,
  HeartPulseIcon,
  TargetIcon,
  TrophyIcon,
  CardsIcon,
} from '../components/ui/icons';

type CardVariant = 'green' | 'blue' | 'purple' | 'teal' | 'orange' | 'yellow' | 'cyan' | 'red' | 'gray';

export interface HomeFeature {
  titleKey: TranslationKey;
  textKey: TranslationKey;
  icon: ReactNode;
  /** Icon tint inside the tile. */
  color: string;
  variant: CardVariant;
}

const f = (base: string, icon: ReactNode, color: string, variant: CardVariant): HomeFeature => ({
  // Follows the existing key convention: home.featureLearnTitle/-Text.
  titleKey: `${base}Title` as TranslationKey,
  textKey: `${base}Text` as TranslationKey,
  icon,
  color,
  variant,
});

export const HOME_FEATURES: Record<SubjectId, HomeFeature[]> = {
  webdev: [
    f('home.featureLearn', <CompassIcon size={22} />, '#2d7a2d', 'green'),
    f('home.featureQuiz', <BoltIcon size={22} />, '#1565c0', 'blue'),
    f('home.featureRoadmap', <MapIcon size={22} />, '#7c3aed', 'purple'),
  ],
  geography: [
    f('home.f.geography.1', <GlobeIcon size={22} />, '#0d9488', 'teal'),
    f('home.f.geography.2', <BoltIcon size={22} />, '#c2410c', 'orange'),
    f('home.f.geography.3', <TrophyIcon size={22} />, '#b45309', 'yellow'),
  ],
  math: [
    f('home.f.math.1', <CalculatorIcon size={22} />, '#1565c0', 'blue'),
    f('home.f.math.2', <BoltIcon size={22} />, '#7c3aed', 'purple'),
    f('home.f.math.3', <CardsIcon size={22} />, '#0e7490', 'cyan'),
  ],
  history: [
    f('home.f.history.1', <BookIcon size={22} />, '#b45309', 'orange'),
    f('home.f.history.2', <BoltIcon size={22} />, '#4b5563', 'gray'),
    f('home.f.history.3', <TrophyIcon size={22} />, '#a16207', 'yellow'),
  ],
  chess: [
    f('home.f.chess.1', <TargetIcon size={22} />, '#7b4b2a', 'yellow'),
    f('home.f.chess.2', <BoltIcon size={22} />, '#2d7a2d', 'green'),
    f('home.f.chess.3', <TrophyIcon size={22} />, '#4b5563', 'gray'),
  ],
  biology: [
    f('home.f.biology.1', <HeartPulseIcon size={22} />, '#0f766e', 'teal'),
    f('home.f.biology.2', <BoltIcon size={22} />, '#2d7a2d', 'green'),
    f('home.f.biology.3', <CardsIcon size={22} />, '#7c3aed', 'purple'),
  ],
  poker: [
    f('home.f.poker.1', <CardsIcon size={22} />, '#b91c1c', 'red'),
    f('home.f.poker.2', <BoltIcon size={22} />, '#4b5563', 'gray'),
    f('home.f.poker.3', <TrophyIcon size={22} />, '#a16207', 'yellow'),
  ],
};
