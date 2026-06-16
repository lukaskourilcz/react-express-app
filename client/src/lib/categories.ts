// Category metadata is shared with the mobile app — see ../../../shared/categories.ts.
// This module re-exports it, keeping the web's historical `getCategoryHexColor`
// name as an alias for the shared `getCategoryColor`.
export {
  CATEGORY_OPTIONS,
  CATEGORY_LOOKUP,
  OWNER_EMAIL,
  PRIVATE_CATEGORIES,
  PUBLIC_CATEGORY_OPTIONS,
  onCategoryColorText,
  getCategoryColor as getCategoryHexColor,
  getCategoryLabel,
  visibleCategoryOptionsFor,
  categoryProgressBackground,
} from '@shared/categories';
export type { CategoryOption } from '@shared/categories';
