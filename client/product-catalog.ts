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

/** The trader who sells devShark Premium, as the Terms identify them under
 * "Who runs devShark" and the model withdrawal form addresses them. */
export interface TraderIdentity {
  /** Full legal name of the trader (a sole trader's own name). */
  name: string | null;
  /** Czech company identification number (IČO). */
  companyId: string | null;
  /** Registered address (sídlo), one line. */
  registeredAddress: string | null;
  /** The contact and complaints email. */
  email: string | null;
}

/** Each field renders only when it is set. The owner fills them in before
 * Premium goes on sale (NEEDED.md, #222). Never guess a value: an empty field
 * reads as missing on the Terms page, and a wrong one would be a false legal
 * statement. */
export const TRADER: TraderIdentity = {
  name: null,
  companyId: null,
  registeredAddress: null,
  email: null,
};

/** devShark's own profiles (the handoff's `socialProfiles`), linked from
 * "Find devShark elsewhere" on the Profile and the Rewards screen. Each stays
 * null until the owner creates the profile (NEEDED.md), and a null profile is
 * not shown. Opening one earns nothing unless the owner sets
 * `socialVisitGrant` in /dev (shared/rewards.ts has the policy note). No other
 * file defines these URLs. */
export const SOCIAL_PROFILES: Readonly<Record<'linkedin' | 'instagram' | 'threads', string | null>> = {
  linkedin: null,
  instagram: null,
  threads: null,
};

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
