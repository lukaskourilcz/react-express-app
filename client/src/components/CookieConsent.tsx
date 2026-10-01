// The cookie banner and the host of the cookie settings dialog (owner
// decision 2).
//
// The banner asks once per browser (and again when the wording's version
// changes, lib/consent.ts). It does not block the page: it sits in the
// shell's column under <main>, which gives up the height, so it covers no
// content and no fixed control. Its place in the document is right after the
// skip link, so keyboard and screen-reader users meet it early; CSS puts it
// at the bottom of the screen. "Accept all", "Reject all" and "Choose" have
// the same size and style, so saying no is as easy as saying yes.
//
// "Choose" and the footer's "Cookie settings" open one dialog
// (CookieConsentDialog.tsx). Its code is a chunk of its own, loaded the first
// time something asks for it and fetched in the background while the banner
// shows, so the shell carries only the banner. A dialog whose code cannot
// load closes with a toast, and the next request asks the network again; the
// banner's Accept all and Reject all never depend on it.

import { useEffect, useId, useLayoutEffect, useRef, useState, type ComponentType } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@astryxdesign/core/Button';
import { useT } from '../i18n/LanguageContext';
import type { TranslationKey } from '../i18n/translations';
import {
  acceptAllConsent,
  closeConsentSettings,
  openConsentSettings,
  rejectAllConsent,
  useConsent,
  useConsentSettingsOpen,
  type ConsentRecord,
} from '../lib/consent';
import { isChunkLoadError } from '../lib/routeRecovery';
import type { CookieConsentDialogProps } from './CookieConsentDialog';
import { AppToast } from './ui/AppToast';
import './CookieConsent.css';

const LEGAL_PATHS = ['/privacy', '/terms'];

type DialogModule = { default: ComponentType<CookieConsentDialogProps> };
let dialogCode: Promise<DialogModule> | null = null;
/** The dialog's chunk, once. A failed load is forgotten, so the next request
 * asks again. */
function loadDialog(): Promise<DialogModule> {
  dialogCode ??= import('./CookieConsentDialog').catch((error: unknown) => {
    dialogCode = null;
    throw error;
  });
  return dialogCode;
}

/** Nothing the visitor can see holds focus: it fell to <body>, or stayed on
 * a control that left the page or sits in a dialog that has closed. */
function focusIsLost(): boolean {
  const active = document.activeElement;
  return !active || active === document.body || !active.isConnected || active.closest('dialog:not([open])') !== null;
}

/** Silent focus on the page, as a route change does (App.tsx). */
function focusMain(): void {
  const main = document.getElementById('main-content');
  main?.removeAttribute('data-skip-target');
  main?.focus({ preventScroll: true });
}

/** The banner's height, as `--ss-consent-dock` on <html>, so the toasts that
 * float at the bottom of the screen rise above it instead of covering it. */
function useDockHeight(ref: React.RefObject<HTMLElement | null>): void {
  useLayoutEffect(() => {
    const el = ref.current;
    const root = document.documentElement;
    if (!el) return;
    const set = () => root.style.setProperty('--ss-consent-dock', `${Math.ceil(el.getBoundingClientRect().height) + 30}px`);
    set();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(set);
    observer?.observe(el);
    return () => {
      observer?.disconnect();
      root.style.removeProperty('--ss-consent-dock');
    };
  }, [ref]);
}

function ConsentBanner({ onDecided }: { onDecided: (record: ConsentRecord) => void }) {
  const t = useT();
  const { pathname } = useLocation();
  const titleId = useId();
  const bodyId = useId();
  const ref = useRef<HTMLElement | null>(null);
  useDockHeight(ref);
  // Fetch the dialog's code in the background, so Choose opens at once.
  useEffect(() => {
    const id = window.setTimeout(() => void loadDialog().catch(() => {}), 1500);
    return () => window.clearTimeout(id);
  }, []);
  // On the Terms and the privacy policy the page itself explains; the banner
  // keeps its title and actions and leaves the reading space to the page.
  const compact = LEGAL_PATHS.includes(pathname);
  return (
    <section ref={ref} className={compact ? 'ss-consent ss-consent--compact' : 'ss-consent'} aria-labelledby={titleId} aria-describedby={compact ? undefined : bodyId}>
      <div className="ss-consent__inner">
        <div className="ss-consent__copy">
          <h2 id={titleId} className="ss-consent__title">{t('consent.banner.title')}</h2>
          {!compact && (
            <p id={bodyId} className="ss-consent__body">
              {t('consent.banner.body')}{' '}
              <Link to="/privacy#cookies">{t('consent.banner.policy')}</Link>
            </p>
          )}
        </div>
        <div className="ss-consent__actions">
          <Button variant="secondary" label={t('consent.acceptAll')} onClick={() => onDecided(acceptAllConsent())} />
          <Button variant="secondary" label={t('consent.rejectAll')} onClick={() => onDecided(rejectAllConsent())} />
          <Button variant="secondary" label={t('consent.choose')} onClick={openConsentSettings} aria-haspopup="dialog" />
        </div>
      </div>
    </section>
  );
}

/**
 * The shell's consent surface: the banner while the visitor has not decided,
 * the settings dialog when the banner, the footer or the privacy policy asks
 * for it, and a short confirmation once a choice is saved. `showBanner` is
 * false where the shell hides its chrome (the /dev console, a running quiz).
 */
export default function CookieConsent({ showBanner = true }: { showBanner?: boolean }) {
  const t = useT();
  const consent = useConsent();
  const open = useConsentSettingsOpen();
  const [saved, setSaved] = useState<ConsentRecord | null>(null);
  const [failure, setFailure] = useState<TranslationKey | null>(null);
  const [SettingsDialog, setSettingsDialog] = useState<DialogModule['default'] | null>(null);
  const bannerShown = showBanner && consent === null;

  useEffect(() => {
    if (!open || SettingsDialog) return;
    let live = true;
    loadDialog()
      .then((module) => {
        if (live) setSettingsDialog(() => module.default);
      })
      .catch((error: unknown) => {
        if (!live) return;
        closeConsentSettings();
        setFailure(isChunkLoadError(error) ? 'error.network' : 'error.generic');
      });
    return () => {
      live = false;
    };
  }, [open, SettingsDialog]);

  // Focus that went nowhere comes back to the page: the banner's pressed
  // button leaves with the banner, and the dialog's opener may have left
  // with it too. The dialog gives focus back to its opener first.
  const wasShown = useRef({ banner: bannerShown, dialog: open });
  useEffect(() => {
    const before = wasShown.current;
    if ((before.banner && !bannerShown) || (before.dialog && !open)) {
      if (focusIsLost()) focusMain();
    }
    wasShown.current = { banner: bannerShown, dialog: open };
  }, [bannerShown, open]);

  return (
    <>
      {bannerShown && <ConsentBanner onDecided={setSaved} />}
      {SettingsDialog && <SettingsDialog open={open} onClose={closeConsentSettings} onDecided={setSaved} />}
      <AppToast
        open={saved !== null}
        onClose={() => setSaved(null)}
        severity="info"
        autoHideDuration={saved?.stored === false ? 8000 : 4000}
        message={saved ? t(saved.stored ? 'consent.saved' : 'consent.notStored') : null}
      />
      <AppToast open={failure !== null} onClose={() => setFailure(null)} severity="error" autoHideDuration={8000} message={failure ? t(failure) : null} />
    </>
  );
}
