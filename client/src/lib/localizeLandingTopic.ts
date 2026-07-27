import type { TranslationKey } from '../i18n/translations';
import type { Lang } from '../i18n/LanguageContext';
import type { CategoryType } from '../types/quiz';
import { categoryLabelKey } from './categories';
import type { LandingTopic } from './landingTopics';

type Translate = (key: TranslationKey, vars?: Record<string, string | number>) => string;

/** Landing samples are hand-authored in English. Czech uses a concise,
 * localized sample built from the same real topic id so no English leaks into
 * the public landing while the full lesson still serves its authored content.
 *
 * Level names are the exception: they stay as authored. They name real levels
 * ("Values & Math", "Strings", "Booleans & Comparison"), which is the only way
 * the roadmap preview says anything — numbering them "Level 1..5" duplicated the
 * numbered node already beside each label. It also keeps the preview in step
 * with /learn, which renders the same server-side titles in both languages. */
export function localizeLandingTopic(topic: LandingTopic, lang: Lang, t: Translate): LandingTopic {
  if (lang === 'en') return topic;
  const name = t(categoryLabelKey(topic.id as CategoryType));
  return {
    ...topic,
    name,
    blurb: t('home.topicBlurbLocalized', { name }),
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
