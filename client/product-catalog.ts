/** Build- and runtime-safe product identity registry. Keep public names,
 * relationships and metadata here so Vite, the PWA manifest and React all use
 * the same source of truth. Environment-specific URLs are attached at runtime. */
export const PRODUCT_CATALOG = {
  studyshark: {
    brand: 'StudyShark', subjectId: null, relationship: 'umbrella', supportVariant: 'studyshark',
    title: { en: 'StudyShark — learn something new every day', cs: 'StudyShark — každý den se nauč něco nového' },
    description: { en: 'Explore geography, history, mathematics, biology, chess and poker through short challenges and guided learning.', cs: 'Objevuj zeměpis, dějepis, matematiku, biologii, šachy a poker v krátkých výzvách a vedeném studiu.' },
  },
  devshark: {
    brand: 'devShark', subjectId: 'webdev', relationship: 'developer-platform', supportVariant: 'devshark',
    title: { en: 'devShark — developer learning and practice', cs: 'devShark — učení a procvičování pro vývojáře' },
    description: { en: 'Build durable developer knowledge across frontend, backend, databases, DevOps, testing, security, system design and AI.', cs: 'Buduj pevné vývojářské znalosti od frontendu a backendu po databáze, DevOps, testování, bezpečnost, návrh systémů a AI.' },
  },
  geoshark: { brand: 'geoShark', subjectId: 'geography', relationship: 'studyshark-subject', supportVariant: 'studyshark', title: { en: 'geoShark — guided geography learning', cs: 'geoShark — vedené učení zeměpisu' }, description: { en: 'Master the world through guided geography practice.', cs: 'Poznávej svět díky vedenému procvičování zeměpisu.' } },
  mathshark: { brand: 'mathShark', subjectId: 'math', relationship: 'studyshark-subject', supportVariant: 'studyshark', title: { en: 'mathShark — guided mathematics learning', cs: 'mathShark — vedené učení matematiky' }, description: { en: 'Build mathematical fluency one level at a time.', cs: 'Buduj matematickou jistotu úroveň po úrovni.' } },
  historyshark: { brand: 'historyShark', subjectId: 'history', relationship: 'studyshark-subject', supportVariant: 'studyshark', title: { en: 'historyShark — guided history learning', cs: 'historyShark — vedené učení dějepisu' }, description: { en: 'Explore the human story era by era.', cs: 'Poznávej lidský příběh epochu po epoše.' } },
  bioshark: { brand: 'bioShark', subjectId: 'biology', relationship: 'studyshark-subject', supportVariant: 'studyshark', title: { en: 'bioShark — guided biology learning', cs: 'bioShark — vedené učení biologie' }, description: { en: 'Understand the human body system by system.', cs: 'Poznávej lidské tělo soustavu po soustavě.' } },
  chessshark: { brand: 'chessShark', subjectId: 'chess', relationship: 'studyshark-subject', supportVariant: 'studyshark', title: { en: 'chessShark — guided chess learning', cs: 'chessShark — vedené učení šachu' }, description: { en: 'Develop stronger chess understanding from openings to endgames.', cs: 'Rozvíjej šachové znalosti od zahájení po koncovky.' } },
  pokershark: { brand: 'pokerShark', subjectId: 'poker', relationship: 'studyshark-subject', supportVariant: 'studyshark', title: { en: 'pokerShark — guided poker learning', cs: 'pokerShark — vedené učení pokeru' }, description: { en: 'Study sound poker decisions from fundamentals to advanced play.', cs: 'Studuj správná pokerová rozhodnutí od základů po pokročilou hru.' } },
} as const;

export type CatalogProductId = keyof typeof PRODUCT_CATALOG;
export const SHARK_BRAND_ORDER: CatalogProductId[] = ['devshark', 'geoshark', 'mathshark', 'historyshark', 'bioshark', 'chessshark', 'pokershark'];

export function resolveCatalogProductId(input: { lockSubject?: string | null; product?: string | null }): CatalogProductId {
  const explicit = input.product?.trim().toLowerCase() as CatalogProductId | undefined;
  if (explicit && Object.prototype.hasOwnProperty.call(PRODUCT_CATALOG, explicit)) return explicit;
  const lock = input.lockSubject?.trim().toLowerCase();
  const match = Object.entries(PRODUCT_CATALOG).find(([, value]) => value.subjectId === lock);
  return (match?.[0] as CatalogProductId | undefined) ?? 'studyshark';
}
