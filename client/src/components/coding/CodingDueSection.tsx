import { Link } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import type { TranslationKey } from '../../i18n/translations';
import { useCodingProgress } from '../../coding/api';
import { CODING_INDEX } from '../../../../shared/coding-index';

const SHOWN = 3;

const CodeGlyph = ({ size = 20 }: { size?: number }) => (
  <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);
const ArrowGlyph = ({ size = 16 }: { size?: number }) => (
  <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

/**
 * Coding tasks whose review is due, as Today cards. Renders nothing while the
 * progress loads, when the learner is signed out, or when nothing is due, so
 * the Learn plan above keeps its shape.
 */
export function CodingDueSection() {
  const { t, lang } = useLanguage();
  const query = useCodingProgress(true);
  const due = query.data?.due ?? [];
  const rows = due
    .map((id) => CODING_INDEX.find((row) => row.id === id))
    .filter((row): row is (typeof CODING_INDEX)[number] => Boolean(row))
    .slice(0, SHOWN);
  if (rows.length === 0) return null;
  const actionLabel = t('today.review');

  return (
    <section className="today-section" aria-label={t('today.codingSection')}>
      <h2 className="today-section__title">{t('today.codingSection')}</h2>
      <ul className="today-list">
        {rows.map((task) => {
          const title = (lang === 'cs' && task.title.cs) || task.title.en;
          const meta = `${t(`coding.track.${task.track}` as TranslationKey)} · ${title}`;
          return (
            <li key={task.id}>
              <Link to={`/coding/${task.track}/${task.id}`} className="today-card ss-panel ss-lift" aria-label={`${actionLabel}: ${meta}`}>
                <span className="today-card__glyph" aria-hidden="true" style={{ color: 'var(--brand-accent)' }}>
                  <CodeGlyph size={22} />
                </span>
                <span className="today-card__body">
                  <span className="today-card__meta">{meta}</span>
                  <span className="today-card__reason">{t('today.codingReason')}</span>
                </span>
                <span className="today-card__action" aria-hidden="true">
                  <span className="today-card__action-label">{actionLabel}</span>
                  <ArrowGlyph />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {due.length > SHOWN && (
        <p className="today-summary">
          <Link to="/coding/review">{t('today.codingMore', { n: due.length })}</Link>
        </p>
      )}
    </section>
  );
}

export default CodingDueSection;
