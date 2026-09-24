/** Build- and runtime-safe product identity. Vite, the PWA manifest and React
 * all read this one entry. This repository builds devShark only; StudyShark
 * was split into its own repository on 2026-09-24. */
export const PRODUCT_CATALOG = {
  devshark: {
    brand: 'devShark', subjectId: 'webdev',
    title: { en: 'devShark — developer learning and practice', cs: 'devShark — učení a procvičování pro vývojáře' },
    description: { en: 'Build durable developer knowledge across frontend, backend, databases, DevOps, testing, security, system design and AI.', cs: 'Buduj pevné vývojářské znalosti od frontendu a backendu po databáze, DevOps, testování, bezpečnost, návrh systémů a AI.' },
  },
} as const;

export type CatalogProductId = keyof typeof PRODUCT_CATALOG;

/** Resolve the product a build asks for. Only devShark resolves: a build or
 * deployment still configured for another product fails here instead of
 * shipping devShark under that product's name. */
export function resolveCatalogProductId(input: { lockSubject?: string | null; product?: string | null }): CatalogProductId {
  const product = input.product?.trim().toLowerCase();
  const lock = input.lockSubject?.trim().toLowerCase();
  if ((product && product !== 'devshark') || (lock && lock !== 'webdev')) {
    throw new Error(
      `This repository builds devShark only, but the environment asks for product "${input.product ?? ''}" `
      + `and subject lock "${input.lockSubject ?? ''}". StudyShark lives in lukaskourilcz/studyshark.`,
    );
  }
  return 'devshark';
}
