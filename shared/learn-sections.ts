/** The three Learn sections: Web Developer, Software Engineer and Forward
 * Deployed Engineer (docs/learn-sections-fde-flagship-plan.md, section 5).
 *
 * A section groups existing Learn topics and learning paths; it owns no
 * content and copies nothing from `shared/subject-catalog.ts`. A shared topic
 * keeps one id, one set of levels and one progress record wherever it is
 * listed. The section only decides where the topic is listed and, for an
 * opt-in section, whether it joins the learner's plan (`planTopics` in
 * `shared/progression.ts`). A section never changes a tier.
 *
 * Keep this module pure: browser and server both read it. */

import type { LearningPathId } from './learning-paths';

export const LEARN_SECTION_IDS = ['web-developer', 'software-engineer', 'forward-deployed-engineer'] as const;
export type LearnSectionId = (typeof LEARN_SECTION_IDS)[number];

export const isLearnSectionId = (value: unknown): value is LearnSectionId =>
  typeof value === 'string' && (LEARN_SECTION_IDS as readonly string[]).includes(value);

export interface LearnSection {
  id: LearnSectionId;
  /** Learn topics in the order the section rail shows them. */
  topics: readonly string[];
  /** Learning paths that live in this section. Only FDE, in its own section. */
  paths: readonly LearningPathId[];
  /** How a learner joins: the base track implies Web Developer; Software
   * Engineer is an explicit opt-in; FDE is the role specialization. */
  membership: 'base-track' | 'opt-in' | 'specialization';
}

/** The membership matrix the owner approved on 21 October 2026 (plan
 * section 5.1, decision D2): Databases is shared into Software Engineer; AI &
 * LLMs belongs to FDE; Node.js, Databases, General, DevOps & Cloud and
 * Security are FDE foundations; Git and General are shared by Web Developer and
 * Software Engineer. DSA Advanced joins Software Engineer with epic E. */
const WEB_DEVELOPER: LearnSection = {
  id: 'web-developer',
  topics: ['html', 'css', 'javascript', 'typescript', 'react', 'nextjs', 'nodejs', 'databases', 'git', 'general'],
  paths: [],
  membership: 'base-track',
};
const SOFTWARE_ENGINEER: LearnSection = {
  id: 'software-engineer',
  topics: ['dsa', 'algorithms', 'system-design', 'devops', 'security', 'databases', 'git', 'general'],
  paths: [],
  membership: 'opt-in',
};
const FORWARD_DEPLOYED_ENGINEER: LearnSection = {
  id: 'forward-deployed-engineer',
  topics: ['ai', 'nodejs', 'databases', 'general', 'devops', 'security'],
  paths: ['fde'],
  membership: 'specialization',
};

export const LEARN_SECTIONS: readonly LearnSection[] = [WEB_DEVELOPER, SOFTWARE_ENGINEER, FORWARD_DEPLOYED_ENGINEER];

/** The sections a learner joins by choice, in section order: the only ones
 * `planTopics` appends. Kept apart from `LEARN_SECTIONS` so the browser's
 * initial bundle, which plans but does not render sections, carries only
 * these. The launch contracts check it equals the opt-in subset. */
export const OPT_IN_SECTIONS: readonly LearnSection[] = [SOFTWARE_ENGINEER];

/** Sections that list `topic`, in section order. A topic in more than one is
 * shared: the rail shows it in each, with the same progress. */
export const sectionsForTopic = (topic: string): LearnSectionId[] =>
  LEARN_SECTIONS.filter((section) => section.topics.includes(topic)).map((section) => section.id);

/** The sections a learner belongs to. Web Developer comes with every base
 * track; Forward Deployed Engineer comes with the `fde` specialization, which
 * stays the one switch for it; Software Engineer comes only from an explicit
 * opt-in saved in `sections`. A profile without `sections` therefore means Web
 * Developer, plus FDE when the specialization is `fde`. */
export function learnerSections(profile: { specialization: string | null; sections?: readonly LearnSectionId[] } | null): LearnSectionId[] {
  if (!profile) return [];
  const chosen = new Set(profile.sections ?? []);
  return LEARN_SECTIONS.filter((section) => {
    if (section.membership === 'base-track') return true;
    if (section.membership === 'specialization') return profile.specialization === 'fde';
    return chosen.has(section.id);
  }).map((section) => section.id);
}
