// Category metadata is shared with the web client — see ../../shared/categories.ts.
// Mobile only surfaces the public categories (no owner-private ones).
export {
  PUBLIC_CATEGORY_OPTIONS as CATEGORY_OPTIONS,
  getCategoryColor,
  getCategoryLabel,
} from '@shared/categories';
export type { CategoryOption } from '@shared/categories';
