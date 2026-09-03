import { Link } from 'react-router-dom';
import { useLanguage, useT } from '../i18n/LanguageContext';
import type { Lang } from '../i18n/LanguageContext';
import { CURRENT_PRODUCT, PRODUCTS, SHARK_BRANDS, productUrl } from '../lib/products';
import { capture } from '../lib/analytics';
import { useSubject } from '../lib/subjects';
import { useColorMode } from '../theme/ColorModeContext';
import { useSettings } from '../lib/settings';
import { savePreferredLanguage } from '../lib/languagePref';

export default function BrandFooter() {
  const t = useT();
  const { lang, setLang } = useLanguage();
  const { mode, toggle } = useColorMode();
  const [settings, updateSettings] = useSettings();
  const [activeSubject] = useSubject();
  const studySharkUrl = productUrl(PRODUCTS.studyshark);

  return (
    <footer className="ss-brand-footer" aria-label={t('footer.aria')}>
      <div className="ss-brand-footer__heading">
        <span>{t('footer.family')}</span>
        {CURRENT_PRODUCT.id === 'studyshark' ? (
          <strong aria-current="page">StudyShark</strong>
        ) : studySharkUrl ? (
          <a href={studySharkUrl} onClick={() => capture('sibling_brand_visited', { product: 'studyshark' })}>StudyShark</a>
        ) : (
          <span>StudyShark</span>
        )}
      </div>
      <ul className="ss-brand-footer__brands">
        {SHARK_BRANDS.map((product) => {
          const subjectBrand = product.relationship === 'studyshark-subject' ? product.subjectId : null;
          const active = product.id === CURRENT_PRODUCT.id ||
            (CURRENT_PRODUCT.id === 'studyshark' && subjectBrand === activeSubject);
          const url = productUrl(product);
          const subjectPath = subjectBrand ? `/subjects?subject=${subjectBrand}` : '';
          const remoteSubjectUrl = subjectBrand && studySharkUrl
            ? `${studySharkUrl}${subjectPath}`
            : '';
          return (
            <li key={product.id}>
              {active ? (
                <strong aria-current="page" style={{ color: product.accent }}>{product.brand}</strong>
              ) : subjectBrand && CURRENT_PRODUCT.id === 'studyshark' ? (
                <Link
                  to={subjectPath}
                  onClick={() => capture('subject_brand_visited', { product: product.id, subject: subjectBrand })}
                  style={{ ['--footer-brand-accent' as string]: product.accent }}
                >
                  {product.brand}
                </Link>
              ) : remoteSubjectUrl ? (
                <a
                  href={remoteSubjectUrl}
                  onClick={() => capture('subject_brand_visited', { product: product.id, subject: subjectBrand })}
                  style={{ ['--footer-brand-accent' as string]: product.accent }}
                >
                  {product.brand}
                </a>
              ) : url ? (
                <a href={url} onClick={() => capture('sibling_brand_visited', { product: product.id })} style={{ ['--footer-brand-accent' as string]: product.accent }}>{product.brand}</a>
              ) : (
                <span className="ss-brand-footer__pending">
                  {product.brand}<small>{t('footer.comingSoon')}</small>
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <div className="ss-brand-footer__meta">
        <span>{t('footer.free')}</span>
        <nav aria-label={t('footer.legal')}>
          <Link to="/support">{t('footer.support')}</Link>
          <Link to="/privacy">{t('footer.privacy')}</Link>
          <Link to="/terms">{t('footer.terms')}</Link>
        </nav>
        {/* The full versions of these live in Profile → Preferences. A visitor
            who has not signed in still needs to read the site in their own
            language and in a comfortable contrast, so the same three settings
            stay reachable here. */}
        <div className="ss-footer-settings" role="group" aria-label={t('profile.preferences')}>
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
