import { PRODUCT_CATALOG, resolveCatalogProductId, type CatalogProductId } from '../../product-catalog';
import { SUBJECTS, type SubjectId } from './subjects';

export type ProductId = CatalogProductId;

export interface ProductDefinition {
  id: ProductId;
  brand: string;
  subjectId: SubjectId;
  accent: string;
  title: string;
  description: string;
}

const id = resolveCatalogProductId({
  lockSubject: import.meta.env.VITE_LOCK_SUBJECT as string | undefined,
  product: import.meta.env.VITE_PRODUCT as string | undefined,
});

/** The product this build serves. Resolving it refuses anything but devShark. */
export const CURRENT_PRODUCT: ProductDefinition = { ...PRODUCT_CATALOG[id], id, accent: SUBJECTS.webdev.accent };
