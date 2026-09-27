// The body of /changelog (#239), newest day first.
//
// Pure, like PremiumFacts.tsx: the app renders it with the translator and
// router links, and the build (vite.config.ts) renders the same component
// with the English dictionary into the static HTML of /changelog. Nothing
// here may reach for a hook, the router or the network.
import type { ReactNode } from 'react';
import type { TranslationKey } from '../i18n/translations';
import { CHANGELOG, changelogDate, type ChangelogEntry } from '../lib/changelog';
import BrandCase from './BrandCase';

type Translate = (key: TranslationKey, vars?: Record<string, string | number>) => string;
/** One link: a router link in the app, a plain anchor in static HTML. */
type RenderLink = (to: string, label: string) => ReactNode;

const plainLink: RenderLink = (to, label) => <a href={to}>{label}</a>;

export function ChangelogArticle({ t, link = plainLink, entries = CHANGELOG }: { t: Translate; link?: RenderLink; entries?: readonly ChangelogEntry[] }) {
  return (
    <article className="ss-info-page ss-changelog">
      <header className="ss-info-page__header">
        <span className="ss-info-page__kicker"><BrandCase text={t('changelog.kicker')} /></span>
        <h1>{t('changelog.title')}</h1>
        <p>{t('changelog.lead')}</p>
      </header>
      {entries.length === 0 ? (
        <p className="ss-changelog__empty">{t('changelog.empty')}</p>
      ) : (
        <ol className="ss-changelog__days">
          {entries.map((entry) => (
            <li key={entry.date} className="ss-changelog__day">
              <h2 className="ss-changelog__date">
                <time dateTime={entry.date}>{changelogDate(entry.date)}</time>
              </h2>
              <ul className="ss-changelog__items">
                {entry.items.map((item) => (
                  <li key={item.title} className="ss-info-card ss-changelog__item">
                    <h3>{item.title}</h3>
                    <p>{item.body}</p>
                    {item.link && <p className="ss-changelog__link">{link(item.link.href, item.link.label)}</p>}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}
