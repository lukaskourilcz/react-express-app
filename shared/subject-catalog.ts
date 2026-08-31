/** Pure subject ownership data shared by browser and server code. Keep visual,
 * localized, and persistence concerns out of this module. */
export const SUBJECT_SCOPE_CATALOG = {
  webdev: {
    questionCount: 3409,
    topics: ['javascript', 'typescript', 'react', 'nextjs', 'nodejs', 'html', 'css', 'git', 'dsa', 'algorithms', 'abbreviations', 'general', 'ai', 'databases', 'system-design', 'testing', 'devops', 'security'],
    categories: ['html', 'css', 'javascript', 'typescript', 'react', 'nextjs', 'nodejs', 'git', 'dsa', 'algorithms', 'abbreviations', 'general', 'ai', 'cool-stuff', 'databases', 'system-design', 'testing', 'devops', 'security', 'dev-world', 'code-snippets'],
  },
  geography: {
    questionCount: 1000,
    topics: ['continents', 'capitals', 'flags', 'landforms', 'climate', 'population', 'political', 'economic', 'cartography', 'earth', 'geomorphology', 'oceanography', 'biogeography', 'geopolitics', 'gis'],
    categories: ['continents', 'capitals', 'flags', 'landforms', 'climate', 'population', 'political', 'economic', 'cartography', 'earth', 'geomorphology', 'oceanography', 'biogeography', 'geopolitics', 'gis'],
  },
  math: {
    questionCount: 1000,
    topics: ['arithmetic', 'fractions', 'prealgebra', 'algebra', 'geometry', 'trigonometry', 'statistics', 'precalculus', 'calculus', 'linear-algebra', 'discrete-math', 'number-theory', 'multivariable-calculus', 'differential-equations', 'real-analysis'],
    categories: ['arithmetic', 'fractions', 'prealgebra', 'algebra', 'geometry', 'trigonometry', 'statistics', 'precalculus', 'calculus', 'linear-algebra', 'discrete-math', 'number-theory', 'multivariable-calculus', 'differential-equations', 'real-analysis'],
  },
  history: {
    questionCount: 1000,
    topics: ['prehistory', 'ancient', 'classical', 'medieval', 'renaissance', 'earlymodern', 'industrial', 'worldwars', 'coldwar', 'modern', 'historiography', 'history-of-science', 'economic-history', 'intellectual-history', 'military-history'],
    categories: ['prehistory', 'ancient', 'classical', 'medieval', 'renaissance', 'earlymodern', 'industrial', 'worldwars', 'coldwar', 'modern', 'historiography', 'history-of-science', 'economic-history', 'intellectual-history', 'military-history'],
  },
  chess: {
    questionCount: 600,
    topics: ['openings', 'tactics', 'strategy', 'endgames', 'combinations', 'opening-theory', 'middlegame', 'pawn-structures', 'endgame-technique', 'chess-history'],
    categories: ['openings', 'tactics', 'strategy', 'endgames', 'combinations', 'opening-theory', 'middlegame', 'pawn-structures', 'endgame-technique', 'chess-history'],
  },
  biology: {
    questionCount: 400,
    topics: ['cell-biology', 'skeletal-system', 'muscular-system', 'nervous-system', 'endocrine-system', 'cardiovascular-system', 'respiratory-system', 'digestive-system', 'immune-system', 'reproductive-system'],
    categories: ['cell-biology', 'skeletal-system', 'muscular-system', 'nervous-system', 'endocrine-system', 'cardiovascular-system', 'respiratory-system', 'digestive-system', 'immune-system', 'reproductive-system'],
  },
  poker: {
    questionCount: 320,
    topics: ['positions', 'starting-hands', 'pot-odds', 'betting-strategy', 'postflop', 'tournament-play', 'psychology', 'gto-advanced'],
    categories: ['positions', 'starting-hands', 'pot-odds', 'betting-strategy', 'postflop', 'tournament-play', 'psychology', 'gto-advanced'],
  },
} as const;

export type ScopeSubjectId = keyof typeof SUBJECT_SCOPE_CATALOG;
export const SCOPE_SUBJECT_ORDER = Object.keys(SUBJECT_SCOPE_CATALOG) as ScopeSubjectId[];
export const STUDYSHARK_SCOPE_SUBJECTS = SCOPE_SUBJECT_ORDER.filter((id) => id !== 'webdev');

const CATEGORY_OWNER = new Map<string, ScopeSubjectId>();
const TOPIC_OWNER = new Map<string, ScopeSubjectId>();
for (const subject of SCOPE_SUBJECT_ORDER) {
  for (const category of SUBJECT_SCOPE_CATALOG[subject].categories) CATEGORY_OWNER.set(category, subject);
  for (const topic of SUBJECT_SCOPE_CATALOG[subject].topics) TOPIC_OWNER.set(topic, subject);
}

export const subjectForCategory = (category: string): ScopeSubjectId | undefined => CATEGORY_OWNER.get(category);
export const subjectForTopic = (topic: string): ScopeSubjectId | undefined => TOPIC_OWNER.get(topic);
export const isScopeSubject = (value: unknown): value is ScopeSubjectId =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(SUBJECT_SCOPE_CATALOG, value);

/** Server deployment guard. Only devShark may be a locked single-subject
 * deployment. General subjects always stay together on StudyShark, even if a
 * stale deployment still carries one of the old per-subject lock values. */
export function allowedDeploymentSubjects(env: Record<string, string | undefined>): ScopeSubjectId[] {
  const lock = env.PRODUCT_SUBJECT || env.VITE_LOCK_SUBJECT;
  const product = env.PRODUCT_ID || env.VITE_PRODUCT;
  if (lock?.toLowerCase() === 'webdev' || product?.toLowerCase() === 'devshark') return ['webdev'];
  return STUDYSHARK_SCOPE_SUBJECTS;
}

export function allowedDeploymentCategories(env: Record<string, string | undefined>): Set<string> {
  return new Set(allowedDeploymentSubjects(env).flatMap((id) => [...SUBJECT_SCOPE_CATALOG[id].categories]));
}
