import { PRODUCT_CATALOG, resolveCatalogProductId, type CatalogProductId } from '../../product-catalog';
import { SUBJECTS, type SubjectId } from './subjects';

export type Locale = 'en' | 'cs';
export type ProductId = CatalogProductId;
export type LocalizedText = { en: string; cs: string };

export interface ProductDefinition {
  id: ProductId;
  brand: string;
  subjectId: SubjectId;
  accent: string;
  title: LocalizedText;
  description: LocalizedText;
}

const id = resolveCatalogProductId({
  lockSubject: import.meta.env.VITE_LOCK_SUBJECT as string | undefined,
  product: import.meta.env.VITE_PRODUCT as string | undefined,
});

/** The product this build serves. Resolving it refuses anything but devShark. */
export const CURRENT_PRODUCT: ProductDefinition = { ...PRODUCT_CATALOG[id], id, accent: SUBJECTS.webdev.accent };
export const productText = (text: LocalizedText, locale: Locale): string => text[locale];
