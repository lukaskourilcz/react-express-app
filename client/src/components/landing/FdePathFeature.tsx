/** Public outline, using the same fetched manifest as Learn. No answer material. */
import { useEffect, useRef, useState, type RefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import { useT } from '../../i18n/LanguageContext';
import { entryFor, FDE_PATH_ROUTE, usePathCatalog } from '../../lib/learningPaths';
import { pathInventory } from '../../../../shared/learning-paths';
import { FadeFinCta, Kicker } from './LandingKit';

/** True once `ref` is within about a screen of the visible part of the page.
 * The app scrolls inside <main>, so that is the root the margin applies to.
 * Without IntersectionObserver it is true at once. */
function useNearView(ref: RefObject<HTMLElement | null>): boolean {
  const [near, setNear] = useState(() => typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    const node = ref.current;
    if (near || !node) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        setNear(true);
      }
    }, { root: node.closest('main'), rootMargin: '800px 0px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [near, ref]);
  return near;
}

export function FdePathFeature() {
  const t = useT();
  const navigate = useNavigate();
  const sectionRef = useRef<HTMLElement>(null);
  // The catalog is the whole public FDE manifest (about 30 kB gzipped) and the
  // section sits far below the fold, so a first visit fetches it only when
  // the section comes near rather than beside the hero.
  const catalog = usePathCatalog(useNearView(sectionRef));
  const entry = entryFor(catalog.data, 'fde');
  const inventory = entry ? pathInventory(entry.manifest) : null;
  return <section ref={sectionRef} className="ss-fde-feature" aria-labelledby="home-fde-title">
    <Kicker>{t('home.fde.kicker')}</Kicker>
    <h2 id="home-fde-title" className="ss-section-title">{t('home.fde.title')}</h2>
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
