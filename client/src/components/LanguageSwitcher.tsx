import { ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';
import { useLanguage } from '../i18n/LanguageContext';
import type { Lang } from '../i18n/LanguageContext';

// Compact EN / CS toggle for the app bar. Persists the choice (handled by the
// language context) so the selection survives reloads and applies app-wide.
export default function LanguageSwitcher() {
  const { lang, setLang, t } = useLanguage();

  const handleChange = (_: React.MouseEvent<HTMLElement>, next: Lang | null) => {
    if (next) setLang(next);
  };

  return (
    <Tooltip title={t('lang.label')}>
      <ToggleButtonGroup
        value={lang}
        exclusive
        onChange={handleChange}
        size="small"
        aria-label={t('lang.label')}
        sx={{
          '& .MuiToggleButton-root': {
            px: 1,
            py: 0.25,
            fontSize: '0.72rem',
            fontWeight: 700,
            textTransform: 'none',
            border: '1px solid',
            borderColor: 'divider',
          },
        }}
      >
        <ToggleButton value="en" aria-label={t('lang.switchToEnglish')}>
          EN
        </ToggleButton>
        <ToggleButton value="cs" aria-label={t('lang.switchToCzech')}>
          CS
        </ToggleButton>
      </ToggleButtonGroup>
    </Tooltip>
  );
}
