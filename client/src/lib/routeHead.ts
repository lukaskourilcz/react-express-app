// The document head for each route: its title, description, canonical URL,
// structured data and robots line. The app shell (App.tsx) applies it on
// every navigation.
import type { Lang } from '../i18n/LanguageContext';
import type { TranslationKey } from '../i18n/translations';
import { CURRENT_PRODUCT, productText } from './products';
import { NOINDEX_PATHS, PUBLIC_ORIGIN, premiumSchema, publicPage, topicFromPath, topicSchema } from './publicMetadata';

type Translate = (key: TranslationKey, vars?: Record<string, string | number>) => string;

const ROUTE_TITLE_KEYS: Record<string, TranslationKey> = {
  '/': 'title.home',
  '/quiz': 'title.quiz',
  '/learn': 'title.learn',
  '/roadmap': 'title.roadmap',
  '/profile': 'title.profile',
  '/leaderboard': 'title.leaderboard',
  '/cards': 'title.cards',
  '/today': 'title.today',
  '/collection': 'title.collection',
  '/typing': 'title.typing',
  '/coding': 'title.coding',
  '/coding/review': 'title.coding',
  '/settings/github': 'title.github',
  '/shop': 'title.shop',
  '/play': 'title.play',
  '/challenge': 'title.challenge',
  '/privacy': 'title.privacy',
  '/terms': 'title.terms',
  '/premium': 'title.premium',
  '/premium/success': 'title.premiumSuccess',
  '/premium/cancel': 'title.premiumCancel',
  '/daily': 'title.daily',
  '/classroom': 'title.classroom',
  '/curation': 'title.curation',
  '/dev': 'title.dev',
};

// A learning path's pages, its overview and every module, carry the path's
// name: the manifest title, which the path picker labels in the same words.
const PATH_TITLE_NAMES: readonly (readonly [string, TranslationKey])[] = [
  ['/roadmap/specializations/fde', 'paths.picker.fdeLabel'],
  ['/roadmap/paths/dsa-foundations', 'paths.picker.dsaLabel'],
];

export function routeTitle(pathname: string, t: Translate, lang: Lang): string {
  const publicTopic = topicFromPath(pathname);
  if (publicTopic) return `${publicTopic.topic.title[publicTopic.locale]} · ${CURRENT_PRODUCT.brand}`;
  if (pathname === '/') return productText(CURRENT_PRODUCT.title, lang);
  const titleKey = ROUTE_TITLE_KEYS[pathname];
  if (titleKey) return t(titleKey);
  const path = PATH_TITLE_NAMES.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (path) return t('title.path', { name: t(path[1]) });
  if (pathname.startsWith('/play/')) return t('title.playMatch');
  if (pathname.startsWith('/daily/')) return t('title.daily');
  if (pathname.startsWith('/coding/')) return t('title.coding');
  return t('title.notFound');
}

// ── Share pages ────────────────────────────────────────────────────────────
//
// The build writes a head of its own for every coding task and every dated
// question of the day (vite.config.ts, #239): the task's title, a line about
// it, its canonical URL. The app keeps that head when it starts on such a
// page instead of writing the generic "Coding" one over it.

const SHARE_PAGE_PATH = /^\/(?:daily\/\d{4}-\d{2}-\d{2}|coding\/[a-z-]+\/[a-z0-9-]+)$/;
const SHARED_META = [
  'meta[name="description"]',
  'meta[property="og:title"]',
  'meta[property="og:description"]',
  'meta[name="twitter:title"]',
  'meta[name="twitter:description"]',
] as const;

export interface ShareHead {
  path: string;
  title: string;
  /** The content of each of SHARED_META, in order. */
  content: string[];
  url: string;
}

const trimSlash = (pathname: string) => pathname.replace(/(.)\/$/, '$1');

/** The head this document arrived with, when it is a share page's own: its
 * canonical URL names this path. Null for the plain app shell. Read it before
 * the first route writes a head. */
export function readShareHead(): ShareHead | null {
  if (typeof document === 'undefined') return null;
  const path = trimSlash(window.location.pathname);
  if (!SHARE_PAGE_PATH.test(path)) return null;
  const url = document.querySelector('link[rel="canonical"]')?.getAttribute('href');
  if (url !== PUBLIC_ORIGIN + path) return null;
  const content = SHARED_META.map((selector) => document.querySelector(selector)?.getAttribute('content') ?? '');
  return { path, title: document.title, content, url };
}

/**
 * Writes the head for `pathname`. A robots line marked `data-not-found`
 * belongs to the not-found page, which adds it while it shows and removes it
 * when it goes (PublicInfoPages.tsx), so it is left alone here.
 */
export function applyRouteHead(pathname: string, t: Translate, lang: Lang, shareHead: ShareHead | null = null): void {
  const setMeta = (selector: string, value: string) => {
    document.querySelector<HTMLMetaElement>(selector)?.setAttribute('content', value);
  };
  const clear = () => document
    .querySelectorAll('link[rel="canonical"], link[hreflang], #public-schema, meta[property="og:url"], meta[name="robots"]:not([data-not-found])')
    .forEach((node) => node.remove());

  if (shareHead && shareHead.path === trimSlash(pathname)) {
    document.title = shareHead.title;
    SHARED_META.forEach((selector, index) => setMeta(selector, shareHead.content[index]));
    clear();
    const link = document.createElement('link'); link.rel = 'canonical'; link.href = shareHead.url;
    const ogUrl = document.createElement('meta'); ogUrl.setAttribute('property', 'og:url'); ogUrl.content = shareHead.url;
    document.head.append(link, ogUrl);
    return;
  }

  const publicTopic = topicFromPath(pathname);
  document.title = routeTitle(pathname, t, lang);
  // /premium and /premium/cancel carry their own description and canonical,
  // the same ones the build writes into their static HTML.
  const page = publicPage(pathname);
  const description = publicTopic
    ? publicTopic.topic.description[publicTopic.locale]
    : page ? t(page.descriptionKey) : productText(CURRENT_PRODUCT.description, lang);
  setMeta('meta[name="description"]', description);
  setMeta('meta[property="og:title"]', document.title);
  setMeta('meta[property="og:description"]', description);
  setMeta('meta[name="twitter:title"]', document.title);
  setMeta('meta[name="twitter:description"]', description);
  clear();
  const canonical = publicTopic
    ? PUBLIC_ORIGIN + pathname.replace(/\/$/, '')
    : pathname === '/' ? PUBLIC_ORIGIN + '/' : page ? PUBLIC_ORIGIN + page.path : null;
  if (canonical) {
    const link = document.createElement('link'); link.rel = 'canonical'; link.href = canonical; document.head.append(link);
  }
  if (publicTopic && canonical) {
    for (const locale of ['en', 'cs']) {
      const link = document.createElement('link'); link.rel = 'alternate'; link.hreflang = locale;
      link.href = `${PUBLIC_ORIGIN}${locale === 'cs' ? '/cs' : ''}/topics/${publicTopic.topic.slug}`; document.head.append(link);
    }
    const schema = document.createElement('script'); schema.id = 'public-schema'; schema.type = 'application/ld+json';
    schema.textContent = JSON.stringify(topicSchema(document.title, description, canonical, publicTopic.locale)); document.head.append(schema);
  } else if (page?.schema === 'premium' && canonical) {
    const schema = document.createElement('script'); schema.id = 'public-schema'; schema.type = 'application/ld+json';
    schema.textContent = JSON.stringify(premiumSchema(document.title, description, canonical)); document.head.append(schema);
  } else if (pathname.includes('/topics/') || NOINDEX_PATHS.includes(pathname)) {
    const robots = document.createElement('meta'); robots.name = 'robots'; robots.content = 'noindex'; document.head.append(robots);
  }
}
