// A compact category tag that keeps each subject's brand/logo colour (Astryx
// Badge only exposes a fixed palette, so it renders the exact hex tint here).
// Shared by the quiz and the Biggest Shark Challenge.
import { useT } from '../../i18n/LanguageContext';
import { categoryLabelKey, getCategoryHexColor, onCategoryColorText } from '../../lib/categories';
import type { CategoryType } from '../../types/quiz';

export function CategoryTag({ category }: { category: CategoryType }) {
  const t = useT();
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: 26,
        padding: '0 10px',
        borderRadius: 'var(--radius-inner)',
        fontSize: 'var(--ss-type-meta)',
        fontWeight: 600,
        lineHeight: 1,
        backgroundColor: getCategoryHexColor(category),
        color: onCategoryColorText(category),
      }}
    >
      {t(categoryLabelKey(category))}
    </span>
  );
}
