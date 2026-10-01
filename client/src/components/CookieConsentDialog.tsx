// The cookie settings dialog (owner decision 2): a switch per category, each
// with its purpose and a link to its section of the privacy policy.
//
// An Astryx Dialog, modal: the browser keeps the page inert, Astryx's
// useFocusTrap wraps Tab inside it, Escape closes it, and the Dialog gives
// focus back to the control that opened it. Nothing optional is switched on
// until the visitor switches it on. CookieConsent.tsx loads this file the
// first time something asks for the dialog, so the shell carries only the
// banner.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@astryxdesign/core/Button';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Switch } from '@astryxdesign/core/Switch';
import { useFocusTrap } from '@astryxdesign/core/hooks';
import { useT } from '../i18n/LanguageContext';
import { acceptAllConsent, getConsent, rejectAllConsent, saveConsent, type ConsentRecord } from '../lib/consent';
import './CookieConsentDialog.css';

type Choices = { analytics: boolean; marketing: boolean };
const fromRecord = (record: ConsentRecord | null): Choices => ({ analytics: record?.analytics === true, marketing: record?.marketing === true });

const ROWS = [
  { id: 'necessary', anchor: 'cookies' },
  { id: 'analytics', anchor: 'analytics' },
  { id: 'marketing', anchor: 'marketing' },
] as const;

export interface CookieConsentDialogProps {
  open: boolean;
  onClose: () => void;
  onDecided: (record: ConsentRecord) => void;
}

export default function CookieConsentDialog({ open: requested, onClose, onDecided }: CookieConsentDialogProps) {
  const t = useT();
  // The Dialog records the element that opened it when it opens, and gives
  // focus back to it on close. This component mounts when its code arrives,
  // usually with the dialog already asked for, and Astryx's DialogHeader
  // focuses its title as it mounts. So the dialog mounts closed, focus goes
  // back to the opener if the title took it, and the dialog opens on the
  // next render with the right element recorded.
  const [opener] = useState(() => document.activeElement);
  const [mounted, setMounted] = useState(false);
  const box = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (opener instanceof HTMLElement && opener.isConnected && box.current?.contains(document.activeElement)) opener.focus();
    setMounted(true);
  }, [opener]);
  const open = requested && mounted;
  const [choices, setChoices] = useState<Choices>(() => fromRecord(getConsent()));
  useEffect(() => {
    if (open) setChoices(fromRecord(getConsent()));
  }, [open]);
  const { containerRef } = useFocusTrap<HTMLDivElement>({ isActive: open });
  const setBox = useCallback((el: HTMLDivElement | null) => {
    box.current = el;
    containerRef.current = el;
  }, [containerRef]);
  // The Dialog focuses `[data-autofocus]` once it is shown: the first switch
  // the visitor can change.
  const autofocus = useCallback((el: HTMLInputElement | null) => el?.setAttribute('data-autofocus', ''), []);
  const decide = (record: ConsentRecord) => {
    onDecided(record);
    onClose();
  };

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
      <div ref={setBox} className="ss-consent-dialog">
        <DialogHeader title={t('consent.dialog.title')} subtitle={t('consent.dialog.lead')} onOpenChange={(next) => { if (!next) onClose(); }} />
        <ul className="ss-consent-dialog__list">
          {ROWS.map(({ id, anchor }) => (
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
