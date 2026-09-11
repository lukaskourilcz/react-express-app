import type { MouseEventHandler } from 'react';
import type { TopicLandingDefinition } from '../../lib/topicCatalog';
export const topicLabels = {
  en: { home: 'Home', kicker: 'Quick guide', example: 'How it works', misconception: 'Common misconception', practice: 'Quick practice', cta: 'Practice in a quiz', reference: 'Read the documentation', related: 'More guides', language: 'Guide language' },
  cs: { home: 'Domů', kicker: 'Rychlé vysvětlení', example: 'Jak to funguje', misconception: 'Častý omyl', practice: 'Krátké procvičení', cta: 'Procvičit v kvízu', reference: 'Přečíst dokumentaci', related: 'Další témata', language: 'Jazyk průvodce' },
};
export function topicPath(slug: string, locale: 'en' | 'cs') { return `${locale === 'cs' ? '/cs' : ''}/topics/${slug}`; }
/** Identical, escaped React markup for build-time HTML and the live route.
 * Only the public teaching catalogue enters this view; never scored answers. */
export function TopicArticle({ topic, locale, brand, related, onPractice }: {
  topic: TopicLandingDefinition; locale: 'en' | 'cs'; brand: string;
  related: TopicLandingDefinition[]; onPractice?: MouseEventHandler<HTMLAnchorElement>;
}) {
  const copy = topicLabels[locale];
  return <article className="ss-info-page ss-topic-article">
    <nav className="ss-topic-nav" aria-label={copy.language}>
      <a href="/">{brand} · {copy.home}</a>
      <a href={topicPath(topic.slug, 'en')} hrefLang="en" lang="en" aria-current={locale === 'en' ? 'page' : undefined}>English</a>
      <a href={topicPath(topic.slug, 'cs')} hrefLang="cs" lang="cs" aria-current={locale === 'cs' ? 'page' : undefined}>Česky</a>
    </nav>
    <header className="ss-info-page__header"><span className="ss-info-page__kicker">{brand} · {copy.kicker}</span><h1>{topic.title[locale]}</h1><p>{topic.description[locale]}</p></header>
    {topic.explanation && <section><h2>{copy.example}</h2><p>{topic.explanation[locale]}</p>{topic.example && <pre tabIndex={0} aria-label={copy.example}><code>{topic.example}</code></pre>}{topic.reference && <a href={topic.reference}>{copy.reference}</a>}</section>}
    <section><h2>{copy.misconception}</h2><p>{topic.misconception[locale]}</p></section>
    <section><h2>{copy.practice}</h2>{topic.practice[locale].map(([question, answer], index) => <details key={question} className="topic-practice"><summary>{index + 1}. {question}</summary><p>{answer}</p></details>)}</section>
    <div><a className="ss-topic-cta" href={`/quiz?category=${encodeURIComponent(topic.category)}`} onClick={onPractice}>{copy.cta}</a></div>
    <section><h2>{copy.related}</h2><ul className="ss-topic-links">{related.filter(item => item.slug !== topic.slug).map(item => <li key={item.slug}><a href={topicPath(item.slug, locale)}>{item.title[locale]}</a></li>)}</ul></section>
  </article>;
}
