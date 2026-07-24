// The honest "pricing page": everything StudyShark gives away free, next to
// what the same things typically cost in paid learning apps. No competitor
// names and no invented prices — only qualitative "often paid / usually
// limited" language, all sourced from the landing.compare.* translation keys.
//
// Deep End v2: an editorial section (kicker-less h2 + subtitle), one .ss-panel
// wrapping a real <table> that scrolls sideways INSIDE its own container on
// narrow widths so the page body never scrolls horizontally. Status is a
// ✓ / – / ✗ glyph PLUS a word, so it never relies on colour alone.

import { useId } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../../i18n/LanguageContext';
import type { TranslationKey } from '../../i18n/translations';
import { Kicker } from './LandingKit';
import './landingSections.css';

/** Tiny inline status marks (feather geometry, currentColor). Decorative — the
 *  neighbouring word is the accessible text. */
function Mark({ kind }: { kind: 'yes' | 'partial' | 'no' }) {
  const common = {
    width: 14,
    height: 14,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 3,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: false,
  };
  if (kind === 'yes') return (<svg {...common}><polyline points="20 6 9 17 4 12" /></svg>);
  if (kind === 'no') return (<svg {...common}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>);
  return (<svg {...common}><line x1="5" y1="12" x2="19" y2="12" /></svg>); // partial: a minus
}

interface CompareRow {
  labelKey: TranslationKey;
  descKey: TranslationKey;
  ss: 'included' | 'yes';
  other: 'paid' | 'limited' | 'no';
}

// StudyShark is a full column of ✓s; the right column qualifies each with the
// exact honest phrasing from the dictionary. Order runs access → extras → the
// two "we simply don't do this" rows (no ads, no card) that get a hard ✗.
const ROWS: CompareRow[] = [
  { labelKey: 'landing.compare.rowLessons', descKey: 'landing.compare.othersLessons', ss: 'included', other: 'paid' },
  { labelKey: 'landing.compare.rowQuizzes', descKey: 'landing.compare.othersQuizzes', ss: 'included', other: 'limited' },
  { labelKey: 'landing.compare.rowStreaks', descKey: 'landing.compare.othersStreaks', ss: 'included', other: 'paid' },
  { labelKey: 'landing.compare.rowLeaderboards', descKey: 'landing.compare.othersLeaderboards', ss: 'included', other: 'paid' },
  { labelKey: 'landing.compare.rowAi', descKey: 'landing.compare.othersAi', ss: 'included', other: 'limited' },
  { labelKey: 'landing.compare.rowBilingual', descKey: 'landing.compare.othersBilingual', ss: 'included', other: 'limited' },
  { labelKey: 'landing.compare.rowCards', descKey: 'landing.compare.othersCards', ss: 'included', other: 'paid' },
  { labelKey: 'landing.compare.rowNoAds', descKey: 'landing.compare.othersNoAds', ss: 'yes', other: 'no' },
  { labelKey: 'landing.compare.rowNoCard', descKey: 'landing.compare.othersNoCard', ss: 'yes', other: 'no' },
];

export interface ComparisonTableProps {
  /** Where the "Start learning free" CTA navigates. Defaults to /learn. */
  startHref?: string;
  /** If provided, the CTA becomes a button calling this instead of a link
   *  (e.g. to scroll to the topic picker on the same page). */
  onStart?: () => void;
}

export default function ComparisonTable({ startHref = '/learn', onStart }: ComparisonTableProps) {
  const t = useT();
  const headingId = useId();

  const otherTag = (other: CompareRow['other']): string =>
    other === 'paid'
      ? t('landing.compare.oftenPaid')
      : other === 'limited'
        ? t('landing.compare.usuallyLimited')
        : t('landing.compare.no');

  return (
    <section aria-labelledby={headingId} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Kicker>{t('landing.compare.freeLabel')}</Kicker>
        <h2
          id={headingId}
          style={{ margin: '4px 0 0', fontFamily: 'var(--font-family-heading)', fontWeight: 800, fontSize: '1.75rem', letterSpacing: '-0.015em' }}
        >
          {t('landing.compare.title')}
        </h2>
        <p style={{ margin: 0, fontSize: '1rem', color: 'var(--color-text-secondary)', maxWidth: '70ch' }}>
          {t('landing.compare.subtitle')}
        </p>
      </div>

      <div className="ss-panel" style={{ overflow: 'hidden' }}>
        <div
          className="ss-compare-scroll"
          role="region"
          aria-label={t('landing.compare.title')}
          tabIndex={0}
        >
          <table className="ss-compare">
            <thead>
              <tr>
                <th scope="col">{t('landing.compare.colFeature')}</th>
                <th scope="col" className="ss-compare__herocell">
                  {t('landing.compare.colStudyShark')}
                  <span className="ss-compare-free">{t('landing.compare.freeLabel')}</span>
                </th>
                <th scope="col">{t('landing.compare.colOthers')}</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.labelKey}>
                  <th scope="row">{t(row.labelKey)}</th>
                  <td className="ss-compare__herocell">
                    <span className="ss-compare-mark ss-compare-mark--yes">
                      <Mark kind="yes" />
                      {row.ss === 'included' ? t('landing.compare.includedLabel') : t('landing.compare.yes')}
                    </span>
                  </td>
                  <td>
                    <span className={`ss-compare-mark ss-compare-mark--${row.other === 'no' ? 'no' : 'partial'}`}>
                      <Mark kind={row.other === 'no' ? 'no' : 'partial'} />
                      {otherTag(row.other)}
                    </span>
                    <p className="ss-compare-desc">{t(row.descKey)}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)', maxWidth: '70ch' }}>
        {t('landing.compare.footnote')}
      </p>

      <div>
        {onStart ? (
          <button type="button" className="ss-link-button ss-cta" onClick={onStart}>
            {t('landing.compare.cta')}
          </button>
        ) : (
          <Link to={startHref} className="ss-link-button ss-cta">
            {t('landing.compare.cta')}
          </Link>
        )}
      </div>
    </section>
  );
}
