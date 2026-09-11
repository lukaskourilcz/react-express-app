import { TOPIC_LANDINGS } from './topicCatalog';
import type { CatalogProductId } from '../../product-catalog';
export const PUBLIC_ORIGINS = { devshark: 'https://devshark.app', studyshark: 'https://studyshark-app.vercel.app' };
export function publicOrigin(product: CatalogProductId) { return product === 'devshark' ? PUBLIC_ORIGINS.devshark : PUBLIC_ORIGINS.studyshark; }
export function publicTopics(product: CatalogProductId) { return TOPIC_LANDINGS.filter(topic => product === 'devshark' ? topic.subject === 'webdev' : topic.subject !== 'webdev'); }
export function topicFromPath(pathname: string, product: CatalogProductId) {
  const match = /^(\/cs)?\/topics\/([a-z0-9-]+)\/?$/.exec(pathname);
  if (!match) return null;
  const topic = publicTopics(product).find(topic => topic.slug === match[2]);
  return topic ? { topic, locale: match[1] ? 'cs' as const : 'en' as const } : null;
}
export function topicSchema(title: string, description: string, url: string, locale: 'en' | 'cs') {
  return { '@context': 'https://schema.org', '@type': 'LearningResource', name: title, description, url, inLanguage: locale, learningResourceType: 'Quick guide', isAccessibleForFree: true };
}
