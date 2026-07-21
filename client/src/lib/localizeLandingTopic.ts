import type { TranslationKey } from '../i18n/translations';
import type { Lang } from '../i18n/LanguageContext';
import type { CategoryType } from '../types/quiz';
import { categoryLabelKey } from './categories';
import type { LandingTopic } from './landingTopics';

type Translate = (key: TranslationKey, vars?: Record<string, string | number>) => string;

/** Landing samples are hand-authored in English. Czech uses a concise,
 * localized sample built from the same real topic id so no English leaks into
 * the public landing while the full lesson still serves its authored content. */
export function localizeLandingTopic(topic: LandingTopic, lang: Lang, t: Translate): LandingTopic {
  if (lang === 'en') return topic;
  const name = t(categoryLabelKey(topic.id as CategoryType));
  return {
    ...topic,
    name,
    blurb: t('home.topicBlurbLocalized', { name }),
    levels: topic.levels.map((_, index) => t('home.levelLocalized', { n: index + 1 })),
    question: {
      text: t('home.sampleQuestionLocalized', { name }),
      opts: [
        t('home.sampleOptionFoundations'),
        t('home.sampleOptionPractice'),
        t('home.sampleOptionReview'),
        t('home.sampleOptionAll'),
      ],
      a: 3,
      e: t('home.sampleExplanationLocalized', { name }),
    },
  };
}
