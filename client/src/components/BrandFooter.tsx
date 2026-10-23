import { Link } from 'react-router-dom';
import { useT } from '../i18n/LanguageContext';
import { useColorMode } from '../theme/ColorModeContext';
import { useSettings } from '../lib/settings';
import { useBilling } from '../lib/billing';
import { openConsentSettings } from '../lib/consent';
import type { TranslationKey } from '../i18n/translations';
import { InstagramIcon, LinkedInIcon, ThreadsIcon } from './ui/icons';
import { SOCIAL_PROFILES } from '../../product-catalog';
import { SOCIAL_PLATFORMS, type SocialPlatform } from '../../../shared/rewards';

const SOCIAL_ICON: Record<SocialPlatform, typeof InstagramIcon> = {
  linkedin: LinkedInIcon,
  instagram: InstagramIcon,
  threads: ThreadsIcon,
};

/** The appearance and sound toggles: short visible labels, the full action as
 * the accessible name (which contains the visible words). The footer shows
 * them from 1024px; below that the mobile drawer holds them (App.tsx, UX
 * audit shell-public-15), so they live in one place at every width. */
export function SettingsToggles({ className }: { className?: string }) {
  const t = useT();
  const { mode, toggle } = useColorMode();
  const [settings, updateSettings] = useSettings();
  return (
    <>
      <button type="button" className={className} onClick={toggle} aria-label={mode === 'light' ? t('common.darkMode') : t('common.lightMode')}>
        {mode === 'light' ? t('footer.darkMode') : t('footer.lightMode')}
      </button>
      <button
        type="button"
        className={className}
        onClick={() => updateSettings({ soundEffects: !settings.soundEffects })}
        aria-label={settings.soundEffects ? t('common.soundOff') : t('common.soundOn')}
      >
        {settings.soundEffects ? t('footer.soundOff') : t('footer.soundOn')}
      </button>
    </>
  );
}

export default function BrandFooter() {
  const t = useT();
  // The public cancellation page is a legal link (§ 312k BGB): always one
  // click away wherever a subscription can exist.
  const billing = useBilling();
  // devShark's own profiles, once, here (design audit P0.3). A profile the
  // owner has not created yet is not shown.
  const social = SOCIAL_PLATFORMS.flatMap((platform) => {
    const url = SOCIAL_PROFILES[platform];
    return url ? [{ platform, url }] : [];
  });

  // The footer carries the legal links, devShark's own social profiles and the
  // appearance and sound controls. devShark promotes no other product here.
  return (
    <footer className="ss-brand-footer" aria-label={t('footer.ariaUtility')}>
      <div className="ss-brand-footer__meta">
        <nav aria-label={t('footer.legal')}>
          {/* The plans and prices; /support redirects here since #222. */}
          <Link to="/premium">{t('nav.premium')}</Link>
          <Link to="/privacy">{t('footer.privacy')}</Link>
          <Link to="/terms">{t('footer.terms')}</Link>
          {/* Reopens the cookie choice (CookieConsent.tsx). A button: it
              opens a dialog and goes nowhere. */}
          <button type="button" className="ss-footer-link" onClick={openConsentSettings} aria-haspopup="dialog">
            {t('footer.cookieSettings')}
          </button>
          {billing.known && billing.cancellable && <Link to="/premium/cancel">{t('footer.cancelPremium')}</Link>}
        </nav>
        {social.length > 0 && (
          <nav className="ss-brand-footer__social" aria-label={t('rewards.social.title')}>
            <span>{t('rewards.social.body')}</span>
            {social.map(({ platform, url }) => {
              const Icon = SOCIAL_ICON[platform];
              const name = t(`rewards.social.${platform}` as TranslationKey);
              return (
                <a key={platform} href={url} target="_blank" rel="noopener noreferrer" aria-label={`${name} ${t('rewards.social.newTab')}`} title={name}>
                  <Icon size={18} />
                </a>
              );
            })}
          </nav>
        )}
        {/* The full versions of these live in Profile → Preferences. A visitor
            who has not signed in still needs a comfortable contrast and a
            choice about sound, so the same two settings stay reachable here. */}
        {/* Short visible labels, so the row fits one line even in an 800px
            column (UX audit shell-public-03); the full action stays the
            accessible name, which contains the visible words. */}
        <div className="ss-footer-settings" role="group" aria-label={t('profile.preferences')}>
          <SettingsToggles />
        </div>
      </div>
    </footer>
  );
}
