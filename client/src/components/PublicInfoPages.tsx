import { Button } from '@astryxdesign/core/Button';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { useGameConfig } from '../lib/gameConfig';
import { CURRENT_PRODUCT } from '../lib/products';
import { SwimmingFin } from './SharkFin';
import { capture } from '../lib/analytics';

const COPY = {
  en: {
    supportKicker: 'Optional support',
    supportTitle: 'Keep learning free and independent.',
    supportDev: 'Support helps maintain the developer question bank, keep technical content current, cover infrastructure, and improve accessibility and localization.',
    supportStudy: 'Support helps create and fact-check educational content, add subjects and translations, improve classroom tools, and cover infrastructure.',
    fairness: 'Every lesson, quiz, learning path, explanation, challenge and multiplayer feature remains free. Support never changes access, XP, streaks, scores or rankings.',
    disabled: 'Financial support is not enabled on this deployment. The platform remains fully available for free.',
    costs: 'Monthly running costs', target: 'Target', covered: 'Net amount covered', carry: 'Carried forward', updated: 'Last updated',
    kofi: 'Support via Ko-fi', github: 'Support via GitHub Sponsors', thanks: 'Thank you to everyone helping keep the platform available.',
    privacyTitle: 'Privacy policy', privacyLead: 'This page explains the data the web application actually uses and why.',
    privacySections: [
      ['Account and learning data', 'If you sign in, Supabase Auth processes your account identifier and provider profile. The app stores progress, statistics, flashcards, preferences and multiplayer records so features can work across devices. Anonymous use may still store preferences and progress in your browser.'],
      ['Service providers', 'Supabase provides authentication and database services. Vercel hosts the web application and API. PostHog analytics and Sentry error monitoring run only when their deployment keys are configured. External support providers receive data only when you choose to follow their links and use their services.'],
      ['Analytics and local storage', 'The app uses local storage for settings, subject choice, progress fallbacks and prompt suppression. Privacy-minimal product events may be collected when analytics is configured. The current application does not add advertising trackers.'],
      ['AI processing', 'AI features are disabled unless explicitly configured. When enabled, only the learning content and answer context needed for a post-submission explanation is sent; authentication tokens, email addresses and real names are not sent to the model provider.'],
      ['Deletion and retention', 'Authenticated users can request permanent account deletion from Profile. Operational records are retained only where required for security, dispute handling or legal obligations. Backup retention may delay final erasure for a limited period.'],
      ['Contact and review', 'Privacy, deletion and support questions should use the owner contact configured for the deployment. Retention periods, Czech legal wording and controller contact details require owner review before public launch.'],
    ],
    termsTitle: 'Terms of use', termsLead: 'Use the platform fairly, respect other learners, and do not try to compromise the service or its question bank.',
    termsSections: [
      ['Free learning', 'The learning service is provided without a paywall. Voluntary support does not purchase access, entitlement, ranking advantages or preferential treatment.'],
      ['Acceptable use', 'Do not automate abusive traffic, manipulate scores, disrupt multiplayer sessions, access private answers before submission, or attempt to enter administrative systems without authorization.'],
      ['Educational content', 'Content is provided for learning and may contain errors. Report questionable items through the in-app reporting tools. The service is not professional medical, legal, tax or financial advice.'],
      ['Voluntary support', 'Contributions are not represented as charitable or tax-deductible donations. Provider fees may apply. Refund handling depends on the selected payment channel; contact that provider and the deployment owner for help. Public acknowledgment is opt-in.'],
      ['Availability and accounts', 'The service may change or experience downtime. Accounts used for abuse may be restricted. You may request deletion of your account and associated user-facing data.'],
      ['Legal review', 'These general terms require Czech legal and accounting review before production activation of financial-support links.'],
    ],
    classroomTitle: 'Run a focused classroom challenge.', classroomLead: 'Create a host-led room, share one link or QR code, and let learners join the same subject session.', classroomCta: 'Create a classroom', classroomJoin: 'Join with a room code',
    notFoundTitle: 'That page is out of the water.', notFoundLead: 'The address may be old or incomplete. Your learning progress is safe.', home: 'Go home', back: 'Go back',
  },
  cs: {
    supportKicker: 'Dobrovolná podpora', supportTitle: 'Pomoz udržet učení zdarma a nezávislé.',
    supportDev: 'Podpora pomáhá udržovat vývojářskou databázi otázek, aktualizovat technický obsah, hradit infrastrukturu a zlepšovat přístupnost i překlady.',
    supportStudy: 'Podpora pomáhá vytvářet a ověřovat vzdělávací obsah, přidávat předměty a překlady, zlepšovat nástroje pro třídy a hradit infrastrukturu.',
    fairness: 'Každá lekce, kvíz, studijní cesta, vysvětlení, výzva i hra více hráčů zůstává zdarma. Podpora nikdy nemění přístup, XP, série, skóre ani pořadí.',
    disabled: 'Finanční podpora na tomto nasazení není zapnutá. Celá platforma zůstává dostupná zdarma.',
    costs: 'Měsíční provozní náklady', target: 'Cíl', covered: 'Čistá pokrytá částka', carry: 'Převod do dalšího období', updated: 'Poslední aktualizace',
    kofi: 'Podpořit přes Ko-fi', github: 'Podpořit přes GitHub Sponsors', thanks: 'Děkujeme všem, kdo pomáhají udržet platformu dostupnou.',
    privacyTitle: 'Zásady ochrany soukromí', privacyLead: 'Tato stránka vysvětluje, jaká data webová aplikace skutečně používá a proč.',
    privacySections: [
      ['Účet a studijní data', 'Při přihlášení zpracovává Supabase Auth identifikátor účtu a profil poskytovatele. Aplikace ukládá postup, statistiky, kartičky, nastavení a záznamy her, aby funkce pracovaly napříč zařízeními. Anonymní používání může ukládat nastavení a postup do prohlížeče.'],
      ['Poskytovatelé služeb', 'Supabase zajišťuje přihlášení a databázi. Vercel hostuje web a API. Analytika PostHog a monitoring chyb Sentry běží jen při nakonfigurovaných klíčích. Externí poskytovatelé podpory získají data pouze tehdy, když otevřete jejich odkaz a použijete jejich službu.'],
      ['Analytika a místní úložiště', 'Aplikace používá místní úložiště pro nastavení, volbu předmětu, záložní postup a potlačení výzev. Při zapnuté analytice se mohou sbírat minimální produktové události. Aplikace nepřidává reklamní sledování.'],
      ['Zpracování AI', 'Funkce AI jsou bez výslovné konfigurace vypnuté. Po zapnutí se odesílá jen obsah potřebný pro vysvětlení po odevzdání odpovědi; poskytovateli modelu se neposílají přihlašovací tokeny, e-mail ani skutečné jméno.'],
      ['Smazání a uchování', 'Přihlášení uživatelé mohou z Profilu požádat o trvalé smazání účtu. Provozní záznamy se uchovávají jen kvůli bezpečnosti, sporům nebo právním povinnostem. Zálohy mohou konečné smazání omezenou dobu zpozdit.'],
      ['Kontakt a kontrola', 'Dotazy k soukromí, smazání a podpoře směřujte na kontakt vlastníka daného nasazení. Doby uchování, české právní znění a údaje správce vyžadují kontrolu vlastníka před spuštěním.'],
    ],
    termsTitle: 'Podmínky použití', termsLead: 'Používejte platformu férově, respektujte ostatní a nepokoušejte se narušit službu ani databázi otázek.',
    termsSections: [
      ['Učení zdarma', 'Výuková služba nemá placenou zeď. Dobrovolná podpora nekupuje přístup, výhody v pořadí ani přednostní zacházení.'],
      ['Přijatelné použití', 'Neautomatizujte škodlivý provoz, nemanipulujte skóre, nenarušujte hry, nezískávejte skryté odpovědi před odevzdáním ani nevstupujte bez oprávnění do administrace.'],
      ['Vzdělávací obsah', 'Obsah slouží k učení a může obsahovat chyby. Sporné položky hlaste nástroji v aplikaci. Služba není odbornou lékařskou, právní, daňovou ani finanční radou.'],
      ['Dobrovolná podpora', 'Příspěvky nejsou prezentovány jako charitativní nebo daňově odpočitatelné dary. Mohou se účtovat poplatky poskytovatele. Vrácení řeší zvolený platební kanál; obraťte se na poskytovatele a vlastníka nasazení. Veřejné poděkování je dobrovolné.'],
      ['Dostupnost a účty', 'Služba se může měnit nebo mít výpadky. Účty zneužívající službu mohou být omezeny. Můžete požádat o smazání účtu a souvisejících uživatelských dat.'],
      ['Právní kontrola', 'Tyto obecné podmínky vyžadují českou právní a účetní kontrolu před zapnutím finanční podpory v produkci.'],
    ],
    classroomTitle: 'Uspořádej soustředěnou výzvu pro třídu.', classroomLead: 'Vytvoř místnost vedenou hostitelem, sdílej jeden odkaz nebo QR kód a nech studenty připojit se ke stejnému předmětu.', classroomCta: 'Vytvořit třídu', classroomJoin: 'Připojit se kódem',
    notFoundTitle: 'Tahle stránka odplavala.', notFoundLead: 'Adresa může být stará nebo neúplná. Tvůj studijní postup je v bezpečí.', home: 'Domů', back: 'Zpět',
  },
} as const;

function Page({ kicker, title, lead, children }: { kicker?: string; title: string; lead: string; children: React.ReactNode }) {
  return <article className="ss-info-page">
    <header className="ss-info-page__header">
      <SwimmingFin size={26} />
      {kicker && <span className="ss-info-page__kicker">{kicker}</span>}
      <h1>{title}</h1>
      <p>{lead}</p>
    </header>
    {children}
  </article>;
}

export function SupportPage() {
  const { lang } = useLanguage();
  const c = COPY[lang];
  const { support } = useGameConfig();
  const target = support.monthlyTarget;
  const covered = support.amountCovered;
  const percentage = target > 0 ? Math.min(100, Math.round((covered / target) * 100)) : 0;
  const carry = Math.max(0, covered - target);
  const explanation = CURRENT_PRODUCT.supportVariant === 'devshark' ? c.supportDev : c.supportStudy;
  const formatter = new Intl.NumberFormat(lang === 'cs' ? 'cs-CZ' : 'en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  useEffect(() => capture('support_page_viewed', { product: CURRENT_PRODUCT.id }), []);
  return <Page kicker={c.supportKicker} title={c.supportTitle} lead={explanation}>
    <section className="ss-info-card"><h2>{c.costs}</h2><p>{c.fairness}</p>
      {support.enabled ? <>
        <div className="ss-cost-meter" aria-label={`${percentage}%`}><span style={{ width: `${percentage}%` }} /></div>
        <dl className="ss-cost-grid"><div><dt>{c.target}</dt><dd>{formatter.format(target)}</dd></div><div><dt>{c.covered}</dt><dd>{formatter.format(Math.min(covered, target || covered))}</dd></div><div><dt>{c.carry}</dt><dd>{formatter.format(carry)}</dd></div><div><dt>{c.updated}</dt><dd>{support.lastUpdatedAt || '—'}</dd></div></dl>
        {support.costBreakdown.length > 0 && <ul className="ss-cost-list">{support.costBreakdown.map((row) => <li key={row.label}><span>{row.label}</span><strong>{formatter.format(row.amount)}</strong></li>)}</ul>}
        <div className="ss-info-actions">{support.kofiUrl && <a className="ss-link-button" href={support.kofiUrl} target="_blank" rel="noopener noreferrer" onClick={() => capture('support_provider_opened', { provider: 'kofi', product: CURRENT_PRODUCT.id })}>{c.kofi}</a>}{support.githubSponsorsUrl && <a className="ss-link-button ss-link-button--secondary" href={support.githubSponsorsUrl} target="_blank" rel="noopener noreferrer" onClick={() => capture('support_provider_opened', { provider: 'github', product: CURRENT_PRODUCT.id })}>{c.github}</a>}</div>
        {support.publicThanksEnabled && <p className="ss-thanks">{c.thanks}</p>}
      </> : <p className="ss-info-note">{c.disabled}</p>}
    </section>
  </Page>;
}

function LegalPage({ kind }: { kind: 'privacy' | 'terms' }) {
  const { lang } = useLanguage(); const c = COPY[lang];
  const title = kind === 'privacy' ? c.privacyTitle : c.termsTitle;
  const lead = kind === 'privacy' ? c.privacyLead : c.termsLead;
  const sections = kind === 'privacy' ? c.privacySections : c.termsSections;
  return <Page title={title} lead={lead}><div className="ss-info-sections">{sections.map(([heading, body]) => <section className="ss-info-card" key={heading}><h2>{heading}</h2><p>{body}</p></section>)}</div></Page>;
}
export const PrivacyPage = () => <LegalPage kind="privacy" />;
export const TermsPage = () => <LegalPage kind="terms" />;

export function ClassroomPage() {
  const { lang } = useLanguage(); const c = COPY[lang]; const navigate = useNavigate();
  return <Page title={c.classroomTitle} lead={c.classroomLead}><section className="ss-info-card"><div className="ss-info-actions"><Button variant="primary" label={c.classroomCta} onClick={() => navigate('/play?mode=classroom')} /><Button variant="secondary" label={c.classroomJoin} onClick={() => navigate('/play')} /></div><p>{CURRENT_PRODUCT.brand} keeps classroom joining lightweight; participants use the room link and the host controls question progress.</p></section></Page>;
}

export function NotFoundPage() {
  const { lang } = useLanguage(); const c = COPY[lang]; const navigate = useNavigate();
  return <Page title={c.notFoundTitle} lead={c.notFoundLead}><div className="ss-info-actions"><Button variant="primary" label={c.home} onClick={() => navigate('/')} /><Button variant="secondary" label={c.back} onClick={() => navigate(-1)} /></div></Page>;
}
