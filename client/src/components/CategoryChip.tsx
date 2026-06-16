import { Chip, type ChipProps, type SxProps, type Theme } from '@mui/material';
import { getCategoryHexColor, getCategoryLabel, onCategoryColorText, type CategoryOption } from '../lib/categories';
import type { CategoryType } from '../types/quiz';

interface CategoryChipProps {
  category: string;
  size?: ChipProps['size'];
  sx?: SxProps<Theme>;
}

// Solid category chip painted in the category's brand color (with the right
// text contrast). Used to tag a question's category.
export function CategoryChip({ category, size = 'small', sx }: CategoryChipProps) {
  return (
    <Chip
      label={getCategoryLabel(category)}
      size={size}
      sx={{
        backgroundColor: getCategoryHexColor(category),
        color: onCategoryColorText(category),
        fontWeight: 600,
        ...sx,
      }}
    />
  );
}

interface CategoryToggleChipProps {
  option: CategoryOption;
  selected: boolean;
  onToggle: (value: CategoryType) => void;
  size?: ChipProps['size'];
  sx?: SxProps<Theme>;
}

// Multi-select category chip with checkbox semantics and keyboard support.
// Shared by the solo-quiz settings and the Play landing category pickers.
export function CategoryToggleChip({ option, selected, onToggle, size, sx }: CategoryToggleChipProps) {
  return (
    <Chip
      label={option.label}
      onClick={() => onToggle(option.value)}
      role="checkbox"
      aria-checked={selected}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle(option.value);
        }
      }}
      size={size}
      sx={{
        cursor: 'pointer',
        backgroundColor: 'background.paper',
        color: selected ? option.color : 'text.secondary',
        border: selected ? `2px solid ${option.color}` : '1px solid',
        borderColor: selected ? option.color : 'divider',
        borderLeft: `4px solid ${option.color}`,
        borderRadius: 1,
        fontWeight: selected ? 600 : 500,
        '&:hover': { backgroundColor: 'action.hover' },
        ...sx,
      }}
    />
  );
}
