import { useLayoutEffect, useRef, type MouseEventHandler } from 'react';
import type { TopicLandingDefinition } from '../../lib/topicCatalog';
import { takePublicGuide } from '../../lib/publicGuideHandoff';
export const topicLabels = { home: 'Home', kicker: 'Quick guide', example: 'How it works', misconception: 'Common misconception', practice: 'Quick practice', cta: 'Practice in a quiz', reference: 'Read the documentation', related: 'More guides' };
export function topicPath(slug: string) { return `/topics/${slug}`; }
/** Identical, escaped React markup for build-time HTML and the live route.
 * Only the public teaching catalogue enters this view; never scored answers. */
export function TopicArticle({ topic, brand, related, onPractice }: {
  topic: TopicLandingDefinition; brand: string;
  related: TopicLandingDefinition[]; onPractice?: MouseEventHandler<HTMLAnchorElement>;
}) {
  const copy = topicLabels;
  const articleRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const previous = takePublicGuide(), article = articleRef.current;
    if (!previous || !article || previous.pathname !== location.pathname || previous.historyKey !== history.state?.key ||
        previous.article.dataset.topicGuide !== topic.slug || previous.article.lang !== 'en') return;
    const before = previous.article.querySelectorAll<HTMLDetailsElement>('details.topic-practice');
    article.querySelectorAll<HTMLDetailsElement>('details.topic-practice').forEach((detail, index) => {
      const old = before[index], summary = detail.querySelector<HTMLElement>('summary');
      if (!old || old.querySelector('summary')?.textContent !== summary?.textContent) return;
      detail.open = old.open;
      if (previous.focus === old.querySelector('summary') && document.activeElement === document.body) summary?.focus({ preventScroll: true });
    });
  }, [topic.slug]);
  return <article ref={articleRef} data-topic-guide={topic.slug} className="ss-info-page ss-topic-article" lang="en">
    <nav className="ss-topic-nav" aria-label={copy.home}>
      <a href="/">{brand} · {copy.home}</a>
    </nav>
    <header className="ss-info-page__header"><span className="ss-info-page__kicker"><span className="ss-brand-name">{brand}</span> · {copy.kicker}</span><h1>{topic.title}</h1><p>{topic.description}</p></header>
    {topic.explanation && <section><h2>{copy.example}</h2><p>{topic.explanation}</p>{topic.example && <pre tabIndex={0} aria-label={copy.example}><code>{topic.example}</code></pre>}{topic.reference && <a href={topic.reference}>{copy.reference}</a>}</section>}
    <section><h2>{copy.misconception}</h2><p>{topic.misconception}</p></section>
    <section><h2>{copy.practice}</h2>{topic.practice.map(([question, answer], index) => <details key={question} className="topic-practice"><summary>{index + 1}. {question}</summary><p>{answer}</p></details>)}</section>
    <div><a className="ss-topic-cta" href={`/quiz?category=${encodeURIComponent(topic.category)}`} onClick={onPractice}>{copy.cta}</a></div>
    <section><h2>{copy.related}</h2><ul className="ss-topic-links">{related.filter(item => item.slug !== topic.slug).map(item => <li key={item.slug}><a href={topicPath(item.slug)}>{item.title}</a></li>)}</ul></section>
  </article>;
}
