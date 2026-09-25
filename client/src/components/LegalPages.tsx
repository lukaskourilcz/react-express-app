// The Terms of use and the privacy policy (#222, section 4.3 of the second
// handoff). Both read their words from the legal.* keys, the price and the free
// plan from shared/tiers.ts, the trader from TRADER in client/product-catalog.ts
// and the seller of record from the public billing settings, so no fact lives
// in two places.
//
// The trader fields render only when the owner has set them; until then the
// page says they are missing rather than guessing. The owner's lawyer reviews
// the wording (NEEDED.md). The EU online dispute platform closed on 20 July
// 2025, so the page names the Czech out-of-court body and no ODR link.
import { useEffect, useId, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import type { TranslationKey } from '../i18n/translations';
import { useBilling } from '../lib/billing';
import { TRADER } from '../../product-catalog';
import { FREE_LEARN_LEVELS, PREMIUM_PRICE } from '../../../shared/tiers';
import { Page } from './PublicInfoPages';
import './LegalPages.css';

/** The date of the current wording. Change it with the words. */
export const LEGAL_UPDATED = '2026-09-25';

const ADR_URL = 'https://coi.gov.cz/en/information-about-adr/';
const STRIPE_PRIVACY_URL = 'https://stripe.com/privacy';
const LINK_PRIVACY_URL = 'https://link.com/privacy';

type Seller = 'link' | 'trader' | null;
interface LinkSpec { to: string; label: TranslationKey; external?: boolean; when?: (seller: Seller) => boolean }
type Block =
  | { kind: 'p'; key: TranslationKey }
  | { kind: 'seller'; link: TranslationKey; trader: TranslationKey; unknown: TranslationKey }
  | { kind: 'waiver' }
  | { kind: 'links'; links: LinkSpec[] }
  | { kind: 'trader' }
  | { kind: 'form' };
interface Section { id: string; title: TranslationKey; blocks: Block[] }

const p = (key: TranslationKey): Block => ({ kind: 'p', key });

const TERMS: Section[] = [
  { id: 'trader', title: 'legal.terms.trader.title', blocks: [p('legal.terms.trader.body'), { kind: 'trader' }] },
  { id: 'plans', title: 'legal.terms.plans.title', blocks: [p('legal.terms.plans.free'), p('legal.terms.plans.premium'), p('legal.terms.plans.fair')] },
  {
    id: 'price',
    title: 'legal.terms.price.title',
    blocks: [
      p('legal.terms.price.body'),
      { kind: 'seller', link: 'legal.terms.price.sellerLink', trader: 'legal.terms.price.sellerTrader', unknown: 'legal.terms.price.sellerUnknown' },
    ],
  },
  {
    id: 'renewal',
    title: 'legal.terms.renewal.title',
    blocks: [
      p('legal.terms.renewal.body'),
      p('legal.terms.renewal.cancel'),
      { kind: 'links', links: [{ to: '/premium/cancel', label: 'legal.link.cancel' }, { to: '/profile', label: 'legal.link.profile' }] },
      p('legal.terms.renewal.failed'),
    ],
  },
  { id: 'withdrawal', title: 'legal.terms.withdrawal.title', blocks: [p('legal.terms.withdrawal.body'), { kind: 'waiver' }, p('legal.terms.withdrawal.consequence')] },
  {
    id: 'refund',
    title: 'legal.terms.refund.title',
    blocks: [p('legal.terms.refund.body'), { kind: 'links', links: [{ to: '/premium/cancel?action=withdraw', label: 'legal.link.cancel' }] }],
  },
  { id: 'how-to-withdraw', title: 'legal.terms.howTo.title', blocks: [p('legal.terms.howTo.body'), { kind: 'form' }] },
  { id: 'grants', title: 'legal.terms.grants.title', blocks: [p('legal.terms.grants.body')] },
  { id: 'fair-use', title: 'legal.terms.fairUse.title', blocks: [p('legal.terms.fairUse.body')] },
  { id: 'content', title: 'legal.terms.content.title', blocks: [p('legal.terms.content.body')] },
  { id: 'account', title: 'legal.terms.account.title', blocks: [p('legal.terms.account.body')] },
  { id: 'changes', title: 'legal.terms.changes.title', blocks: [p('legal.terms.changes.body')] },
  {
    id: 'law',
    title: 'legal.terms.law.title',
    blocks: [p('legal.terms.law.body'), p('legal.terms.law.adr'), { kind: 'links', links: [{ to: ADR_URL, label: 'legal.link.adr', external: true }] }],
  },
  { id: 'complaints', title: 'legal.terms.complaints.title', blocks: [p('legal.terms.complaints.body')] },
];

const PRIVACY: Section[] = [
  {
    id: 'controller',
    title: 'legal.privacy.controller.title',
    blocks: [p('legal.privacy.controller.body'), { kind: 'links', links: [{ to: '/terms#trader', label: 'legal.link.terms' }] }],
  },
  { id: 'account', title: 'legal.privacy.account.title', blocks: [p('legal.privacy.account.body')] },
  {
    id: 'payments',
    title: 'legal.privacy.payments.title',
    blocks: [
      p('legal.privacy.payments.body'),
      { kind: 'seller', link: 'legal.privacy.payments.sellerLink', trader: 'legal.privacy.payments.sellerTrader', unknown: 'legal.privacy.payments.sellerUnknown' },
      {
        kind: 'links',
        links: [
          { to: STRIPE_PRIVACY_URL, label: 'legal.link.stripePrivacy', external: true },
          { to: LINK_PRIVACY_URL, label: 'legal.link.linkPrivacy', external: true, when: (seller) => seller === 'link' },
        ],
      },
    ],
  },
  { id: 'merchandise', title: 'legal.privacy.merch.title', blocks: [p('legal.privacy.merch.shop'), p('legal.privacy.merch.redeem')] },
  { id: 'email', title: 'legal.privacy.email.title', blocks: [p('legal.privacy.email.body')] },
  { id: 'providers', title: 'legal.privacy.providers.title', blocks: [p('legal.privacy.providers.body')] },
  { id: 'analytics', title: 'legal.privacy.analytics.title', blocks: [p('legal.privacy.analytics.body')] },
  { id: 'ai', title: 'legal.privacy.ai.title', blocks: [p('legal.privacy.ai.body')] },
  { id: 'github', title: 'legal.privacy.github.title', blocks: [p('legal.privacy.github.body')] },
  { id: 'deletion', title: 'legal.privacy.deletion.title', blocks: [p('legal.privacy.deletion.body')] },
  { id: 'rights', title: 'legal.privacy.rights.title', blocks: [p('legal.privacy.rights.body')] },
  {
    id: 'contact',
    title: 'legal.privacy.contact.title',
    blocks: [p('legal.privacy.contact.body'), { kind: 'links', links: [{ to: '/terms#trader', label: 'legal.link.terms' }] }],
  },
];

const TRADER_ROWS = [
  ['legal.trader.name', 'name'],
  ['legal.trader.companyId', 'companyId'],
  ['legal.trader.address', 'registeredAddress'],
  ['legal.trader.email', 'email'],
] as const satisfies readonly (readonly [TranslationKey, keyof typeof TRADER])[];

/** The trader's details that are set, in order. */
export function traderRows(trader = TRADER): { label: TranslationKey; field: keyof typeof TRADER; value: string }[] {
  return TRADER_ROWS.flatMap(([label, field]) => {
    const value = trader[field]?.trim();
    return value ? [{ label, field, value }] : [];
  });
}

function TraderDetails() {
  const { t } = useLanguage();
  const rows = traderRows();
  return (
    <>
      {rows.length > 0 && (
        <dl className="ss-legal-trader">
          {rows.map((row) => (
            <div key={row.field}>
              <dt>{t(row.label)}</dt>
              <dd>{row.field === 'email' ? <a href={`mailto:${row.value}`}>{row.value}</a> : row.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {rows.length < TRADER_ROWS.length && (
        <p className="ss-info-note">{t(rows.length === 0 ? 'legal.trader.none' : 'legal.trader.partial')}</p>
      )}
    </>
  );
}

function WithdrawalForm() {
  const { t } = useLanguage();
  const headingId = useId();
  const set = traderRows().filter((row) => row.field !== 'companyId').map((row) => row.value);
  const to = set.length > 0 ? set.join(', ') : t('legal.terms.form.toFallback');
  const lines: TranslationKey[] = [
    'legal.terms.form.notice',
    'legal.terms.form.ordered',
    'legal.terms.form.name',
    'legal.terms.form.address',
    'legal.terms.form.signature',
    'legal.terms.form.date',
  ];
  return (
    <div className="ss-legal-form" role="group" aria-labelledby={headingId}>
      <h3 id={headingId}>{t('legal.terms.form.title')}</h3>
      <p className="ss-legal-form__intro">{t('legal.terms.form.intro')}</p>
      <p>{t('legal.terms.form.to', { trader: to })}</p>
      {lines.map((key) => <p key={key}>{t(key)}</p>)}
    </div>
  );
}

function LinkRow({ links, seller }: { links: LinkSpec[]; seller: Seller }) {
  const { t } = useLanguage();
  const shown = links.filter((link) => !link.when || link.when(seller));
  return (
    <p className="ss-text-links">
      {shown.map((link) => (link.external
        ? <a key={link.to} href={link.to} rel="noopener noreferrer">{t(link.label)}</a>
        : <Link key={link.to} to={link.to}>{t(link.label)}</Link>))}
    </p>
  );
}

function LegalDocument({ title, lead, sections }: { title: TranslationKey; lead: TranslationKey; sections: Section[] }) {
  const { t } = useLanguage();
  const billing = useBilling();
  const { hash } = useLocation();
  // Until the settings arrive, the seller sentence stays neutral.
  const seller: Seller = billing.known ? billing.seller : null;
  const vars = {
    level: FREE_LEARN_LEVELS.react ?? 0,
    symbol: PREMIUM_PRICE.symbol,
    monthly: PREMIUM_PRICE.monthly,
    annual: PREMIUM_PRICE.annual,
  };
  const updated = new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${LEGAL_UPDATED}T00:00:00Z`));

  // Another page links to a section (/terms#trader); the app scrolls inside
  // <main>, so the browser's own jump does not happen on a client navigation.
  useEffect(() => {
    if (!hash) return;
    document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ block: 'start' });
  }, [hash]);

  const render = (block: Block, index: number): ReactNode => {
    switch (block.kind) {
      case 'p': return <p key={index}>{t(block.key, vars)}</p>;
      case 'seller': return <p key={index}>{t(seller === 'link' ? block.link : seller === 'trader' ? block.trader : block.unknown)}</p>;
      case 'waiver': return <blockquote key={index} className="ss-legal-quote"><p>{t('premium.page.waiver')}</p></blockquote>;
      case 'links': return <LinkRow key={index} links={block.links} seller={seller} />;
      case 'trader': return <TraderDetails key={index} />;
      case 'form': return <WithdrawalForm key={index} />;
    }
  };

  return (
    <Page title={t(title)} lead={t(lead)}>
      <p className="ss-legal-updated">{t('legal.updated', { date: updated })}</p>
      <div className="ss-legal">
        {sections.map((section) => (
          <section key={section.id} id={section.id} className="ss-legal-section" aria-labelledby={`${section.id}-title`}>
            <h2 id={`${section.id}-title`}>{t(section.title)}</h2>
            {section.blocks.map(render)}
          </section>
        ))}
      </div>
    </Page>
  );
}

export const TermsPage = () => <LegalDocument title="legal.terms.title" lead="legal.terms.lead" sections={TERMS} />;
export const PrivacyPage = () => <LegalDocument title="legal.privacy.title" lead="legal.privacy.lead" sections={PRIVACY} />;
