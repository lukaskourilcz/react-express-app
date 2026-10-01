// The cookie banner and the cookie settings dialog (owner decision 2).
//
// The banner asks once per browser (and again when the wording's version
// changes, lib/consent.ts). It does not block the page: it sits in the
// shell's column under <main>, which gives up the height, so it covers no
// content and no fixed control. Its place in the document is right after the
// skip link, so keyboard and screen-reader users meet it early; CSS puts it
// at the bottom of the screen. "Accept all", "Reject all" and "Choose" have
// the same size and style, so saying no is as easy as saying yes.
//
// "Choose" and the footer's "Cookie settings" open one Astryx dialog with a
// switch per category. The dialog is modal: the browser keeps the page inert,
// Tab wraps inside it (Astryx's useFocusTrap), Escape closes it, and focus
// returns to the control that opened it, or to <main> when the banner that
// held that control has gone with the decision.
//
// The banner and the dialog ship with the shell rather than as a lazy chunk:
// the choice has to be reachable offline and after a deploy, when a chunk can
// fail to load.

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@astryxdesign/core/Button';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Switch } from '@astryxdesign/core/Switch';
import { useFocusTrap } from '@astryxdesign/core/hooks';
import { useT } from '../i18n/LanguageContext';
import {
  acceptAllConsent,
  closeConsentSettings,
  getConsent,
  openConsentSettings,
  rejectAllConsent,
  saveConsent,
  useConsent,
  useConsentSettingsOpen,
  type ConsentRecord,
} from '../lib/consent';
import { AppToast } from './ui/AppToast';
import './CookieConsent.css';

const LEGAL_PATHS = ['/privacy', '/terms'];

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

function ConsentBanner({ onDecided, onChoose }: { onDecided: (record: ConsentRecord) => void; onChoose: () => void }) {
  const t = useT();
  const { pathname } = useLocation();
  const titleId = useId();
  const bodyId = useId();
  const ref = useRef<HTMLElement | null>(null);
  useDockHeight(ref);
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
          <Button variant="secondary" label={t('consent.choose')} onClick={onChoose} aria-haspopup="dialog" />
        </div>
      </div>
    </section>
  );
}

type Choices = { analytics: boolean; marketing: boolean };
const fromRecord = (record: ConsentRecord | null): Choices => ({ analytics: record?.analytics === true, marketing: record?.marketing === true });

function ConsentDialog({ open, onClose, onDecided }: { open: boolean; onClose: () => void; onDecided: (record: ConsentRecord) => void }) {
  const t = useT();
  // Nothing is switched on until the visitor switches it on.
  const [choices, setChoices] = useState<Choices>(() => fromRecord(getConsent()));
  useEffect(() => {
    if (open) setChoices(fromRecord(getConsent()));
  }, [open]);
  const { containerRef } = useFocusTrap<HTMLDivElement>({ isActive: open });
  // The Dialog focuses `[data-autofocus]` once it is shown: the first switch
  // the visitor can change.
  const autofocus = useCallback((el: HTMLInputElement | null) => el?.setAttribute('data-autofocus', ''), []);
  const decide = (record: ConsentRecord) => {
    onDecided(record);
    onClose();
  };
  const rows = [
    { id: 'necessary', anchor: 'cookies' },
    { id: 'analytics', anchor: 'analytics' },
    { id: 'marketing', anchor: 'marketing' },
  ] as const;

  return (
    <Dialog
      isOpen={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      purpose="form"
      width="min(560px, 94vw)"
      maxHeight="min(88dvh, 720px)"
      aria-label={t('consent.dialog.title')}
    >
      <div ref={containerRef} className="ss-consent-dialog">
        <DialogHeader title={t('consent.dialog.title')} subtitle={t('consent.dialog.lead')} onOpenChange={(next) => { if (!next) onClose(); }} />
        <ul className="ss-consent-dialog__list">
          {rows.map(({ id, anchor }) => (
            <li key={id} className="ss-consent-dialog__row">
              {id === 'necessary' ? (
                <Switch
                  label={t('consent.necessary.label')}
                  description={t('consent.necessary.purpose')}
                  value
                  isDisabled
                  disabledMessage={t('consent.necessary.locked')}
                />
              ) : (
                <Switch
                  ref={id === 'analytics' ? autofocus : undefined}
                  label={t(`consent.${id}.label`)}
                  description={t(`consent.${id}.purpose`)}
                  value={choices[id]}
                  onChange={(checked) => setChoices((prev) => ({ ...prev, [id]: checked }))}
                />
              )}
              <p className="ss-text-links ss-consent-dialog__link">
                <Link to={`/privacy#${anchor}`} onClick={onClose}>{t(`consent.${id}.link`)}</Link>
              </p>
            </li>
          ))}
        </ul>
        <div className="ss-consent-dialog__actions">
          <Button variant="secondary" label={t('consent.rejectAll')} onClick={() => decide(rejectAllConsent())} />
          <Button variant="secondary" label={t('consent.acceptAll')} onClick={() => decide(acceptAllConsent())} />
          <Button variant="primary" label={t('consent.save')} onClick={() => decide(saveConsent(choices))} />
        </div>
      </div>
    </Dialog>
  );
}

/**
 * The shell's consent surface: the banner while the visitor has not decided,
 * the settings dialog when the banner or the footer asks for it, and a short
 * confirmation once a choice is saved. `showBanner` is false where the shell
 * hides its chrome (the /dev console, a running quiz).
 */
export default function CookieConsent({ showBanner = true }: { showBanner?: boolean }) {
  const t = useT();
  const consent = useConsent();
  const open = useConsentSettingsOpen();
  const [saved, setSaved] = useState<ConsentRecord | null>(null);
  const bannerShown = showBanner && consent === null;

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
      {bannerShown && <ConsentBanner onDecided={setSaved} onChoose={openConsentSettings} />}
      <ConsentDialog open={open} onClose={closeConsentSettings} onDecided={setSaved} />
      <AppToast
        open={saved !== null}
        onClose={() => setSaved(null)}
        severity="info"
        autoHideDuration={saved?.stored === false ? 8000 : 4000}
        message={saved ? t(saved.stored ? 'consent.saved' : 'consent.notStored') : null}
      />
    </>
  );
}
