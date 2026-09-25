import { Link } from 'react-router-dom';
import { MULTILINGUAL, useLanguage, useT } from '../i18n/LanguageContext';
import type { Lang } from '../i18n/LanguageContext';
import { useColorMode } from '../theme/ColorModeContext';
import { useSettings } from '../lib/settings';
import { savePreferredLanguage } from '../lib/languagePref';
import { useBilling } from '../lib/billing';

export default function BrandFooter() {
  const t = useT();
  const { lang, setLang } = useLanguage();
  const { mode, toggle } = useColorMode();
  const [settings, updateSettings] = useSettings();
  // The public cancellation page is a legal link (§ 312k BGB): always one
  // click away wherever a subscription can exist.
  const billing = useBilling();

  // The footer carries the legal links and the appearance and sound controls.
  // devShark promotes no other product here.
  return (
    <footer className="ss-brand-footer" aria-label={t('footer.ariaUtility')}>
      <div className="ss-brand-footer__meta">
        <nav aria-label={t('footer.legal')}>
          {/* The plans and prices; /support redirects here since #222. */}
          <Link to="/premium">{t('nav.premium')}</Link>
          <Link to="/curation">{t('footer.curation')}</Link>
          <Link to="/privacy">{t('footer.privacy')}</Link>
          <Link to="/terms">{t('footer.terms')}</Link>
          {billing.known && billing.cancellable && <Link to="/premium/cancel">{t('footer.cancelPremium')}</Link>}
        </nav>
        {/* The full versions of these live in Profile → Preferences. A visitor
            who has not signed in still needs to read the site in their own
            language and in a comfortable contrast, so the same three settings
            stay reachable here. */}
        <div className="ss-footer-settings" role="group" aria-label={t('profile.preferences')}>
          {MULTILINGUAL && (
            <button
              type="button"
              onClick={() => {
                const next: Lang = lang === 'en' ? 'cs' : 'en';
                setLang(next);
                void savePreferredLanguage(next);
              }}
              aria-label={t(lang === 'en' ? 'lang.switchToCzech' : 'lang.switchToEnglish')}
            >
              {lang === 'en' ? 'CS' : 'EN'}
            </button>
          )}
          <button type="button" onClick={toggle} aria-label={mode === 'light' ? t('common.darkMode') : t('common.lightMode')}>
            {mode === 'light' ? t('common.darkMode') : t('common.lightMode')}
          </button>
          <button
            type="button"
            onClick={() => updateSettings({ soundEffects: !settings.soundEffects })}
            aria-label={settings.soundEffects ? t('common.soundOff') : t('common.soundOn')}
          >
            {settings.soundEffects ? t('common.soundOff') : t('common.soundOn')}
          </button>
        </div>
      </div>
    </footer>
  );
}
