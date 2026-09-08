// How we curate content — the one place the methodology is written down.
//
// The page is optional to read: nothing links to it as a gate, nothing asks
// the learner to acknowledge it, and every screen that mentions curation
// points here rather than repeating a shortened version of it.
//
// The order is deliberate: plain language first, numbers second. A learner who
// wants to know whether the questions are any good gets an answer in the first
// two paragraphs; a learner who wants to check the method finds the scoring
// underneath it.
//
// The coverage sentence comes from the server. When nothing has been reviewed
// yet — which is the case today — the page says so in those words. It does not
// have a fallback that sounds better.

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { apiFetch } from '../lib/api';
import { capture } from '../lib/analytics';
import { CURRENT_PRODUCT } from '../lib/products';
import { SwimmingFin } from './SharkFin';
import {
  MARKER_COPY,
  QUALITY_COPY,
  RELEVANCE_MARKERS,
  QUALITY_CRITERIA,
  RELEVANCE_MAX,
  RELEVANCE_MIN,
  QUALITY_MAX,
  QUALITY_MIN,
  MARKER_MAX,
  coverageText,
  COVERAGE_PENDING,
  type CoverageReport,
} from '../lib/curation';

const COPY = {
  en: {
    kicker: 'Content methodology',
    title: 'How we curate content.',
    lead: 'Every question and coding task has to earn its place twice: once for being worth your time, and once for being correct. This page is what those two gates actually are.',
    relevanceHeading: 'Is it worth learning?',
    relevanceLead: 'Five things we look for. Each is scored 0, 1 or 2, so an item can score at most 10. Below 4 it leaves the active pool.',
    qualityHeading: 'Is it right?',
    qualityLead: `Five separate checks, one point each. Below ${QUALITY_MIN} out of ${QUALITY_MAX} the item leaves the active pool, whatever its relevance score. A question can be completely current and still have two defensible answers — the gates do not stand in for each other.`,
    kindsHeading: 'Three different kinds of checking',
    kinds: [
      ['A person reads it', 'Someone applies the criteria above to the item as written, including the hint and the explanation. This is what "reviewed" means on this site, and it is the only thing that word is used for.'],
      ['A script checks it', 'Automated contracts run on every change: that a coding task has a solution that passes its own tests, that no answer key reaches the browser before you submit, that translations exist for every string, that the level structure is intact. These catch a specific class of mistake very reliably and cannot tell you whether a question is worth asking.'],
      ['A solution is executed', 'Every coding task is run against its grader with a known-good solution. That is evidence the task is solvable exactly as specified. It is not evidence that the task has no defects.'],
    ],
    honestHeading: 'What we will not tell you',
    honest: [
      'That content is guaranteed correct. It is checked, corrected when someone finds a problem, and retired when it stops passing.',
      'That an item was reviewed several times, unless there is more than one recorded review of it.',
      'That an automated check was an expert review. They are different things and are labelled differently.',
      'That the whole bank has been reviewed, unless every place a question can come from has been counted. One source we cannot count means no bank-wide claim at all.',
      'Anything at all, when we cannot read the record. A missing record shows as missing, not as reviewed.',
    ],
    editHeading: 'Editing invalidates the approval',
    editBody: 'Approval is recorded against one exact version of an item. Change the wording, an option, the explanation or the correct answer and the version changes with it — so the approval no longer applies, and the item shows as unreviewed until someone looks again. The item id under "Why this question?" is that version.',
    reportHeading: 'Found something wrong?',
    reportBody: 'Open "Why this question?" beside any question and use Report a problem. The report carries the item id and the exact version you saw, so a fix can be matched to the wording in front of you. You do not need an account.',
    freeNote: 'None of this is affected by support, shop items or anything you own. Curation decides what is taught; nothing you can buy changes it.',
    back: 'Back to learning',
  },
  cs: {
    kicker: 'Metodika obsahu',
    title: 'Jak vybíráme obsah.',
    lead: 'Každá otázka i programovací úloha si své místo musí zasloužit dvakrát: jednou tím, že stojí za tvůj čas, a jednou tím, že je správně. Tahle stránka popisuje, co ty dvě podmínky doopravdy jsou.',
    relevanceHeading: 'Stojí to za naučení?',
    relevanceLead: 'Pět věcí, které hledáme. Každá se hodnotí 0, 1 nebo 2 body, dohromady nejvýš 10. Pod 4 body položka z aktivní nabídky mizí.',
    qualityHeading: 'Je to správně?',
    qualityLead: `Pět samostatných kontrol, každá za bod. Pod ${QUALITY_MIN} z ${QUALITY_MAX} položka z aktivní nabídky mizí bez ohledu na relevanci. Otázka může být naprosto aktuální a přitom mít dvě obhajitelné odpovědi — jedna podmínka nenahrazuje druhou.`,
    kindsHeading: 'Tři různé druhy kontroly',
    kinds: [
      ['Přečte to člověk', 'Někdo použije kritéria výše na položku tak, jak je napsaná — včetně nápovědy a vysvětlení. Tohle na tomhle webu znamená „zkontrolováno“ a pro nic jiného se to slovo nepoužívá.'],
      ['Zkontroluje to skript', 'Automatické kontroly běží při každé změně: že programovací úloha má řešení, které projde jejími testy, že se do prohlížeče před odevzdáním nedostane správná odpověď, že existují překlady všech textů, že struktura úrovní sedí. Ty chytají určitou třídu chyb velmi spolehlivě a vůbec nepoznají, jestli má smysl se na to ptát.'],
      ['Spustí se řešení', 'Každá programovací úloha se spouští proti svému hodnotiteli se známým správným řešením. To je důkaz, že úloha je řešitelná přesně tak, jak je zadaná. Není to důkaz, že v ní není chyba.'],
    ],
    honestHeading: 'Co ti neřekneme',
    honest: [
      'Že je obsah zaručeně správný. Kontrolujeme ho, opravujeme, když někdo najde problém, a vyřazujeme, když přestane vyhovovat.',
      'Že položka prošla kontrolou několikrát, pokud o ní není zaznamenaná víc než jedna kontrola.',
      'Že automatická kontrola byla odborná revize. Jsou to různé věci a označujeme je různě.',
      'Že prošla kontrolou celá databáze otázek, dokud nespočítáme každé místo, odkud může otázka přijít. Jediný zdroj, který spočítat neumíme, znamená žádné tvrzení o celku.',
      'Cokoli, když záznam nepřečteme. Chybějící záznam se ukáže jako chybějící, ne jako zkontrolováno.',
    ],
    editHeading: 'Úprava ruší schválení',
    editBody: 'Schválení se zapisuje ke konkrétní verzi položky. Změň znění, možnost, vysvětlení nebo správnou odpověď a změní se i verze — schválení tím přestává platit a položka se ukazuje jako nezkontrolovaná, dokud se na ni někdo znovu nepodívá. Kód položky pod „Proč zrovna tahle otázka?“ je právě ta verze.',
    reportHeading: 'Našel jsi chybu?',
    reportBody: 'U každé otázky otevři „Proč zrovna tahle otázka?“ a použij Nahlásit problém. Hlášení nese kód položky i přesnou verzi, kterou jsi viděl, takže se oprava dá spojit se zněním, které máš před sebou. Účet k tomu nepotřebuješ.',
    freeNote: 'Nic z tohohle neovlivňuje podpora, věci z obchodu ani cokoli, co vlastníš. Kurátorství rozhoduje o tom, co se učí; koupit to nejde.',
    back: 'Zpět k učení',
  },
} as const;

interface CoverageResponse {
  coverage: CoverageReport;
}

export function CurationPage() {
  const { lang } = useLanguage();
  const c = COPY[lang];

  // A failed or slow fetch means no coverage sentence, never a default one, so
  // there is no retry affordance and no error banner: the page is complete
  // without it.
  const { data } = useQuery<CoverageResponse>({
    queryKey: ['curation-coverage'],
    queryFn: () => apiFetch<CoverageResponse>('/api/quiz/questions?resource=curation'),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const coverage = coverageText(data?.coverage, lang);

  useEffect(() => capture('curation_page_viewed', { product: CURRENT_PRODUCT.id }), []);

  return (
    <article className="ss-info-page">
      <header className="ss-info-page__header">
        <SwimmingFin size={26} />
        <span className="ss-info-page__kicker">{c.kicker}</span>
        <h1>{c.title}</h1>
        <p>{c.lead}</p>
      </header>

      <div className="ss-info-sections">
        <section className="ss-info-card">
          <h2>{c.relevanceHeading}</h2>
          <p>{c.relevanceLead}</p>
          <dl className="ss-curation-markers">
            {RELEVANCE_MARKERS.map((marker) => (
              <div key={marker}>
                <dt>{MARKER_COPY[marker].name[lang]}</dt>
                <dd>{MARKER_COPY[marker].meaning[lang]}</dd>
              </div>
            ))}
          </dl>
          <p className="ss-info-note">
            {lang === 'cs'
              ? `${RELEVANCE_MARKERS.length} znaků × ${MARKER_MAX} body = ${RELEVANCE_MAX}. Hranice pro zařazení: ${RELEVANCE_MIN}.`
              : `${RELEVANCE_MARKERS.length} markers × ${MARKER_MAX} points = ${RELEVANCE_MAX}. The cut-off is ${RELEVANCE_MIN}.`}
          </p>
        </section>

        <section className="ss-info-card">
          <h2>{c.qualityHeading}</h2>
          <p>{c.qualityLead}</p>
          <ul className="ss-curation-list">
            {QUALITY_CRITERIA.map((criterion) => (
              <li key={criterion}>{QUALITY_COPY[criterion][lang]}</li>
            ))}
          </ul>
        </section>

        <section className="ss-info-card">
          <h2>{c.kindsHeading}</h2>
          {c.kinds.map(([heading, body]) => (
            <div key={heading} className="ss-curation-kind">
              <h3>{heading}</h3>
              <p>{body}</p>
            </div>
          ))}
          <p className="ss-info-note">{coverage ?? COVERAGE_PENDING[lang]}</p>
        </section>

        <section className="ss-info-card">
          <h2>{c.honestHeading}</h2>
          <ul className="ss-curation-list">
            {c.honest.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>

        <section className="ss-info-card">
          <h2>{c.editHeading}</h2>
          <p>{c.editBody}</p>
        </section>

        <section className="ss-info-card">
          <h2>{c.reportHeading}</h2>
          <p>{c.reportBody}</p>
          <p className="ss-info-note">{c.freeNote}</p>
          <div className="ss-info-actions">
            <Link className="ss-link-button" to="/learn">
              {c.back}
            </Link>
          </div>
        </section>
      </div>
    </article>
  );
}
