import { PRODUCT_CATALOG, SHARK_BRAND_ORDER, resolveCatalogProductId, type CatalogProductId } from '../../product-catalog';
import type { SubjectId } from './subjects';
import { LOCKED_SUBJECT, SUBJECTS } from './subjects';

export type Locale = 'en' | 'cs';
export type ProductId = CatalogProductId;
export type LocalizedText = { en: string; cs: string };

export interface ProductDefinition {
  id: ProductId;
  brand: string;
  subjectId: SubjectId | null;
  relationship: 'umbrella' | 'developer-platform' | 'studyshark-subject';
  accent: string;
  url: string;
  title: LocalizedText;
  description: LocalizedText;
  supportVariant: 'devshark' | 'studyshark';
}

const cleanUrl = (value: unknown): string => (typeof value === 'string' ? value.trim().replace(/\/$/, '') : '');
const URLS: Record<ProductId, string> = {
  studyshark: cleanUrl(import.meta.env.VITE_STUDYSHARK_URL || import.meta.env.VITE_SIBLING_URL),
  devshark: cleanUrl(import.meta.env.VITE_DEVSHARK_URL),
  // General subject brands are contexts inside StudyShark, never separate
  // deployments or domains. BrandFooter builds their internal subject links.
  geoshark: '',
  mathshark: '',
  historyshark: '',
  bioshark: '',
  chessshark: '',
  pokershark: '',
};

export const PRODUCTS = Object.fromEntries(
  Object.entries(PRODUCT_CATALOG).map(([id, base]) => {
    const subjectId = base.subjectId as SubjectId | null;
    return [id, {
      ...base,
      id: id as ProductId,
      subjectId,
      accent: subjectId ? SUBJECTS[subjectId].accent : '#2d7a2d',
      url: URLS[id as ProductId],
    } satisfies ProductDefinition];
  }),
) as Record<ProductId, ProductDefinition>;

export const SUBJECT_PRODUCT_IDS = Object.fromEntries(
  Object.values(PRODUCTS).filter((product) => product.subjectId).map((product) => [product.subjectId, product.id]),
) as Record<SubjectId, Exclude<ProductId, 'studyshark'>>;

export const SHARK_BRANDS = SHARK_BRAND_ORDER.map((id) => PRODUCTS[id]);
export const isProductId = (value: unknown): value is ProductId =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(PRODUCTS, value.toLowerCase());

export function resolveCurrentProduct(input: { lockSubject?: string | null; deploymentMode?: string | null }): ProductDefinition {
  return PRODUCTS[resolveCatalogProductId({ lockSubject: input.lockSubject, product: input.deploymentMode })];
}

export const CURRENT_PRODUCT = resolveCurrentProduct({ lockSubject: LOCKED_SUBJECT, deploymentMode: import.meta.env.VITE_PRODUCT });
export const productText = (text: LocalizedText, locale: Locale): string => text[locale];
export function productUrl(product: ProductDefinition): string {
  if (product.id === CURRENT_PRODUCT.id && typeof window !== 'undefined') return window.location.origin;
  return product.url;
}
