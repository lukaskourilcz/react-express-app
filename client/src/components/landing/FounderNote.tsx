// A short "why I built this" note for the public landing: why devShark has a
// Premium tier and what Premium never buys. Deliberately generic — the signoff
// is "the devShark maker", never an invented real person, photo or brand. All
// copy comes from the landing.founder.* keys; the price comes from
// shared/tiers.ts, and the link goes to /premium.

import { useId } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../../i18n/LanguageContext';
import { PREMIUM_PRICE } from '../../../../shared/tiers';
import { SharkFin } from '../SharkFin';
import { Kicker } from './LandingKit';
import './landingSections.css';

export interface FounderNoteProps {
  /** Where the "See what Premium includes" link points. Defaults to /premium. */
  supportHref?: string;
}

export default function FounderNote({ supportHref = '/premium' }: FounderNoteProps) {
  const t = useT();
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className="ss-panel ss-founder"
      style={{ padding: 'clamp(20px, 4vw, 32px)', borderRadius: 'var(--radius-page)' }}
    >
      {/* A quiet dorsal-fin watermark — brand mark, not a face. */}
      <div className="ss-founder__fin" aria-hidden>
        <SharkFin size={240} color="currentColor" />
      </div>

      <div className="ss-founder__body">
        <Kicker>{t('landing.founder.kicker')}</Kicker>
        <h2
          id={headingId}
          style={{ margin: 0, fontFamily: 'var(--font-family-heading)', fontWeight: 800, fontSize: '1.6rem', letterSpacing: '-0.015em' }}
        >
          {t('landing.founder.title')}
        </h2>
        <p className="ss-founder__prose">{t('landing.founder.body', { symbol: PREMIUM_PRICE.symbol, monthly: PREMIUM_PRICE.monthly })}</p>
        <p className="ss-founder__sign">
          <SharkFin size={18} />
          {t('landing.founder.signoff')}
        </p>
        <div className="ss-founder__support">
          <span>{t('landing.founder.supportNote')}</span>
          <Link to={supportHref} className="ss-link-button ss-link-button--secondary ss-cta">
            {t('landing.founder.supportCta')}
          </Link>
        </div>
      </div>
    </section>
  );
}
