// The plan table: what every account gets next to what Premium opens. It sits
// on the landing and on /premium. The free column mirrors `shared/tiers.ts`
// (the three free topics, React up to FREE_LEARN_LEVELS.react, a starter set
// of challenges and stage one of every project); the counts come from the
// registries, and every word from the landing.compare.* keys.
//
// Deep End v2: an editorial section (kicker, h2, subtitle), one .ss-panel
// wrapping a real <table> that scrolls sideways INSIDE its own container on
// narrow widths so the page body never scrolls horizontally. Status is a
// ✓ / – / ✗ glyph PLUS a word, so it never relies on colour alone.

import { useId } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../../i18n/LanguageContext';
import type { TranslationKey } from '../../i18n/translations';
import { FREE_LEARN_LEVELS, PREMIUM_PRICE } from '../../../../shared/tiers';
import { SUBJECT_SCOPE_CATALOG } from '../../../../shared/subject-catalog';
import { Button } from '@astryxdesign/core/Button';
import { Kicker, SwimCta } from './LandingKit';
import { anyLearningPathOpen, redemptionOpen, useGameConfig } from '../../lib/gameConfig';
import './landingSections.css';

type MarkKind = 'yes' | 'partial' | 'no';

/** Tiny inline status marks (feather geometry, currentColor). Decorative — the
 *  neighbouring word is the accessible text. */
function Mark({ kind }: { kind: MarkKind }) {
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

interface Cell { mark: MarkKind; key: TranslationKey }
/** A row that describes something not open yet names the switch that opens
 * it, and renders only while that switch is on (design audit P0.1). */
interface PlanRow { labelKey: TranslationKey; free: Cell; premium: Cell; when?: 'paths' | 'redemption' }

const YES: Cell = { mark: 'yes', key: 'landing.compare.yes' };
const NO: Cell = { mark: 'no', key: 'landing.compare.no' };

// Access first, then what both plans share, then the two rows about money.
// The FDE and DSA paths and coins are Premium; the AI and bilingual rows of
// the old table are gone, because devShark ships neither.
export const PLAN_ROWS: readonly PlanRow[] = [
  { labelKey: 'landing.compare.rowLessons', free: { mark: 'partial', key: 'landing.compare.othersLessons' }, premium: { mark: 'yes', key: 'landing.compare.premiumLessons' } },
  { labelKey: 'landing.compare.rowReact', free: { mark: 'partial', key: 'landing.compare.freeReact' }, premium: { mark: 'yes', key: 'landing.compare.premiumReact' } },
  { labelKey: 'landing.compare.rowCoding', free: { mark: 'partial', key: 'landing.compare.freeCoding' }, premium: { mark: 'yes', key: 'landing.compare.premiumCoding' } },
  { labelKey: 'landing.compare.rowPaths', free: NO, premium: { mark: 'yes', key: 'landing.compare.premiumPaths' }, when: 'paths' },
  { labelKey: 'landing.compare.rowQuizzes', free: YES, premium: YES },
  { labelKey: 'landing.compare.rowLeaderboards', free: YES, premium: YES },
  // Redemption ships closed until the owner opens it, so the claim says so,
  // as the paths row does (review finding product-6).
  { labelKey: 'landing.compare.rowCoins', free: NO, premium: { mark: 'yes', key: 'landing.compare.premiumCoins' }, when: 'redemption' },
  { labelKey: 'landing.compare.rowNoCard', free: { mark: 'yes', key: 'landing.compare.othersNoCard' }, premium: { mark: 'partial', key: 'landing.compare.premiumNoCard' } },
];

export interface ComparisonTableProps {
  /** Where the "Start free" CTA navigates. Defaults to /learn. */
  startHref?: string;
  /** If provided, the CTA becomes a button calling this instead of a link
   *  (e.g. to scroll to the topic picker on the same page). */
  onStart?: () => void;
  /** /premium has its own plan actions, so it leaves the CTA out. */
  showCta?: boolean;
}

export default function ComparisonTable({ startHref = '/learn', onStart, showCta = true }: ComparisonTableProps) {
  const t = useT();
  const headingId = useId();
  const config = useGameConfig();
  const open = { paths: anyLearningPathOpen(config), redemption: redemptionOpen(config) };
  const rows = PLAN_ROWS.filter((row) => !row.when || open[row.when]);
  const vars = {
    topics: SUBJECT_SCOPE_CATALOG.webdev.topics.length,
    level: FREE_LEARN_LEVELS.react ?? 0,
    symbol: PREMIUM_PRICE.symbol,
    monthly: PREMIUM_PRICE.monthly,
    annual: PREMIUM_PRICE.annual,
  };

  const cell = ({ mark, key }: Cell) => (
    <span className={`ss-compare-mark ss-compare-mark--${mark}`}>
      <Mark kind={mark} />
      {t(key, vars)}
    </span>
  );

  return (
    <section aria-labelledby={headingId} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Kicker>{t('landing.compare.kicker')}</Kicker>
        <h2
          id={headingId}
          style={{ margin: '4px 0 0', fontFamily: 'var(--font-family-heading)', fontWeight: 800, fontSize: '1.75rem', letterSpacing: '-0.015em' }}
        >
          {t('landing.compare.title')}
        </h2>
        <p style={{ margin: 0, fontSize: '1rem', color: 'var(--color-text-secondary)', maxWidth: '70ch' }}>
          {t('landing.compare.subtitle', vars)}
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
                <th scope="col">
                  {t('landing.compare.colBrand')}
                  <span className="ss-compare-caption">{t('landing.compare.freeCaption')}</span>
                </th>
                <th scope="col" className="ss-compare__herocell">
                  {t('landing.compare.colOthers')}
                  <span className="ss-compare-caption">{t('landing.compare.premiumCaption', vars)}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.labelKey}>
                  <th scope="row">{t(row.labelKey)}</th>
                  <td>{cell(row.free)}</td>
                  <td className="ss-compare__herocell">{cell(row.premium)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)', maxWidth: '70ch' }}>
        {t('landing.compare.footnote')}
      </p>

      {showCta && (
        <div>
          {onStart ? (
            <SwimCta label={t('landing.compare.cta')} onClick={onStart} dir={1} />
          ) : (
            <Button variant="primary" size="lg" as={Link} href={startHref} label={t('landing.compare.cta')} />
          )}
        </div>
      )}
    </section>
  );
}
