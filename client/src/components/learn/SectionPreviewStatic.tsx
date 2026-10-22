/** Build-time fallback for each Learn section. All topics and inventory are
 * supplied by the same registries the live page reads; no graded items. */
import { learnText } from '../../i18n/translations.learn';
import type { PathInventory } from '../../../../shared/learning-paths';

export function SectionPreviewStatic({ name, description, topics, paths }: {
  name: string;
  description: string;
  topics: { name: string; href: string }[];
  paths: { title: string; summary: string; href: string; inventory: PathInventory }[];
}) {
  return <article>
    <h1>{name}</h1>
    <p>{description}</p>
    <p>{learnText('learn.preview.access')}</p>
    <h2>{learnText('learn.preview.topics')}</h2>
    <ul>{topics.map(topic => <li key={topic.href}><div className="ss-text-links"><a href={topic.href}>{topic.name}</a></div></li>)}</ul>
    {paths.map(path => <section key={path.href}>
      <h2 className="ss-text-links"><a href={path.href}>{path.title}</a></h2>
      <p>{path.summary}</p>
      <p>{learnText('learn.preview.inventory', { modules: path.inventory.modules, lessons: path.inventory.lessons, checks: path.inventory.moduleChecks, exercises: path.inventory.moduleCodeExercises + path.inventory.finalCodeExercises })}</p>
      <p>{learnText('learn.preview.availability')}</p>
    </section>)}
  </article>;
}
