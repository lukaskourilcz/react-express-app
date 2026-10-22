/** Public outline, using the same fetched manifest as Learn. No answer material. */
import { useNavigate } from 'react-router-dom';
import { useT } from '../../i18n/LanguageContext';
import { entryFor, FDE_PATH_ROUTE, usePathCatalog } from '../../lib/learningPaths';
import { pathInventory } from '../../../../shared/learning-paths';
import { FadeFinCta, Kicker } from './LandingKit';

export function FdePathFeature() {
  const t = useT();
  const navigate = useNavigate();
  const catalog = usePathCatalog();
  const entry = entryFor(catalog.data, 'fde');
  const inventory = entry ? pathInventory(entry.manifest) : null;
  return <section className="ss-fde-feature" aria-labelledby="home-fde-title">
    <Kicker>{t('home.fde.kicker')}</Kicker>
    <h2 id="home-fde-title">{t('home.fde.title')}</h2>
    <p>{t('home.fde.body')}</p>
    {inventory && <p className="ss-fde-feature__inventory">{t('home.fde.inventory', {
      modules: inventory.modules, lessons: inventory.lessons,
      questions: inventory.moduleChecks + inventory.finalChecks,
      exercises: inventory.moduleCodeExercises + inventory.finalCodeExercises,
    })}</p>}
    <p>{t('home.fde.access')}</p>
    {!entry && <p role="status">{t(catalog.isPending ? 'home.fde.loading' : 'home.fde.unavailable')}</p>}
    {entry && entry.availability !== 'available' && <p>{t('home.fde.preview')}</p>}
    <div><FadeFinCta label={t('home.fde.cta')} onClick={() => navigate(FDE_PATH_ROUTE)} finLeft="-12px" finSize={60} accent="var(--brand-accent)" /></div>
  </section>;
}
