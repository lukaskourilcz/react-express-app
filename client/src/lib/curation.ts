// Learner-facing wording for the curation criteria, and the assembly of the
// "Why this question?" note from metadata that already exists.
//
// Two rules shape everything here.
//
// Nothing is invented. The objective is the level's own title, the topic is
// the question's own category, the competencies are its own tags and the plan
// membership is the same check the progression graph uses to decide what to
// unlock. If a piece is missing, that line is omitted — a plausible sentence
// assembled to fill the space would be exactly the kind of claim this feature
// exists to avoid.
//
// Nothing is upgraded. The claim about review comes from the server's record
// for the exact version on screen, and each claim has its own sentence:
// reviewed by a person more than once, reviewed once, checked by our automated
// contracts, or not yet reviewed. There is no sentence that covers two of
// those, because a sentence that covers two is how "checked by a script"
// becomes "expert-reviewed".

import {
  RELEVANCE_MARKERS,
  QUALITY_CRITERIA,
  RELEVANCE_MAX,
  RELEVANCE_MIN,
  QUALITY_MAX,
  QUALITY_MIN,
  MARKER_MAX,
  itemClaim,
  coverageClaim,
  type ItemClaim,
  type CoverageReport,
  type PublicItemReview,
  type RelevanceMarker,
  type QualityCriterion,
} from '../../../shared/curation';
import type { Lang } from '../i18n/LanguageContext';

export {
  RELEVANCE_MARKERS,
  QUALITY_CRITERIA,
  RELEVANCE_MAX,
  RELEVANCE_MIN,
  QUALITY_MAX,
  QUALITY_MIN,
  MARKER_MAX,
  itemClaim,
  coverageClaim,
};
export type { ItemClaim, CoverageReport, PublicItemReview };

type Bilingual = { en: string; cs: string };

/* ── the five relevance markers, in plain language ─────────────────────── */

export const MARKER_COPY: Record<RelevanceMarker, { name: Bilingual; meaning: Bilingual }> = {
  'present-day-applicability': {
    name: { en: 'Present-day applicability', cs: 'Platnost dnes' },
    meaning: {
      en: 'It describes current practice, or a foundation that has not changed.',
      cs: 'Popisuje dnešní praxi, nebo základ, který se nemění.',
    },
  },
  'practical-utility': {
    name: { en: 'Practical utility', cs: 'Praktická užitečnost' },
    meaning: {
      en: 'It helps with work you would actually be asked to do.',
      cs: 'Pomůže s prací, kterou po tobě někdo skutečně bude chtít.',
    },
  },
  'transferable-understanding': {
    name: { en: 'Transferable understanding', cs: 'Přenositelné pochopení' },
    meaning: {
      en: 'What you learn applies again somewhere else, not only here.',
      cs: 'To, co se naučíš, použiješ i jinde, nejen tady.',
    },
  },
  'audience-and-level-fit': {
    name: { en: 'Audience and level fit', cs: 'Vhodnost pro úroveň' },
    meaning: {
      en: 'It suits the learner it is placed in front of, and their prerequisites.',
      cs: 'Sedí tomu, komu ji ukazujeme, i tomu, co už umí.',
    },
  },
  'risk-or-outcome-value': {
    name: { en: 'Risk or outcome value', cs: 'Vliv na výsledek' },
    meaning: {
      en: 'Knowing it prevents a failure, or makes the result better.',
      cs: 'Když to víš, něco se nerozbije, nebo dopadne líp.',
    },
  },
};

export const QUALITY_COPY: Record<QualityCriterion, Bilingual> = {
  correctness: { en: 'The answer is right.', cs: 'Odpověď je správná.' },
  clarity: { en: 'The question asks one clear thing.', cs: 'Otázka se ptá na jednu jasnou věc.' },
  'answer-choices': {
    en: 'The wrong options are wrong, and plausibly wrong.',
    cs: 'Špatné možnosti jsou špatně — a věrohodně špatně.',
  },
  hint: { en: 'The hint helps without answering.', cs: 'Nápověda pomůže, ale neprozradí odpověď.' },
  explanation: {
    en: 'The explanation says why, not just what.',
    cs: 'Vysvětlení říká proč, ne jen co.',
  },
};

/* ── what may be said about the whole bank ─────────────────────────────── */

/**
 * The coverage sentence, or null when there is no coverage claim to make.
 *
 * `partial` is the only case with a number in it, and the number is the real
 * one. `none` covers both "nothing reviewed yet" and "a source we cannot
 * count", because in both cases the honest thing to say is the criteria
 * themselves, which the page says anyway.
 */
export function coverageText(
  report: CoverageReport | undefined,
  lang: Lang,
): string | null {
  if (!report) return null;
  const claim = coverageClaim(report);
  if (claim === 'complete') {
    const copy = {
      en: `Every one of the ${report.items} questions we can serve has been reviewed against the published criteria.`,
      cs: `Všech ${report.items} otázek, které umíme nabídnout, prošlo kontrolou podle zveřejněných kritérií.`,
    };
    return copy[lang] ?? copy.en;
  }
  if (claim === 'partial') {
    const copy = {
      en: `We are reviewing the question bank against the published criteria: ${report.reviewed} of ${report.items} questions so far.`,
      cs: `Databázi otázek kontrolujeme podle zveřejněných kritérií: zatím ${report.reviewed} z ${report.items}.`,
    };
    return copy[lang] ?? copy.en;
  }
  return null;
}

/** The sentence shown when there is no coverage to report: the criteria, and
 * the fact that the review has not produced results yet. Never a badge. */
export const COVERAGE_PENDING: Bilingual = {
  en: 'The item-by-item review has not started yet. Until it has, this page describes the criteria we will apply — not a result we can already show you.',
  cs: 'Kontrola jednotlivých položek zatím nezačala. Než začne, tahle stránka popisuje kritéria, která použijeme — ne výsledek, který bychom už mohli ukázat.',
};
