import { TOPIC_LANDINGS } from './topicCatalog';
export const PUBLIC_ORIGIN = 'https://devshark.app';
export function topicFromPath(pathname: string) {
  const match = /^(\/cs)?\/topics\/([a-z0-9-]+)\/?$/.exec(pathname);
  if (!match) return null;
  const topic = TOPIC_LANDINGS.find(topic => topic.slug === match[2]);
  return topic ? { topic, locale: match[1] ? 'cs' as const : 'en' as const } : null;
}
export function topicSchema(title: string, description: string, url: string, locale: 'en' | 'cs') {
  return { '@context': 'https://schema.org', '@type': 'LearningResource', name: title, description, url, inLanguage: locale, learningResourceType: 'Quick guide', isAccessibleForFree: true };
}
