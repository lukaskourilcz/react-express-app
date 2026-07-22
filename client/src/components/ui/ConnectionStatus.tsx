import { useEffect, useRef, useState } from 'react';
import { useT } from '../../i18n/LanguageContext';
import { AppToast } from './AppToast';

/** Global browser connectivity state; routes still own data recovery. */
export default function ConnectionStatus() {
  const t = useT();
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);
  const [recovered, setRecovered] = useState(false);
  const wasOffline = useRef(!online);
  useEffect(() => {
    const onOffline = () => { wasOffline.current = true; setRecovered(false); setOnline(false); };
    const onOnline = () => { setOnline(true); if (wasOffline.current) setRecovered(true); wasOffline.current = false; };
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => { window.removeEventListener('offline', onOffline); window.removeEventListener('online', onOnline); };
  }, []);
  return <>
    <AppToast open={!online} onClose={() => {}} severity="error" autoHideDuration={null} message={t('common.offline')} />
    <AppToast open={online && recovered} onClose={() => setRecovered(false)} severity="info" autoHideDuration={4000} message={t('common.backOnline')} />
  </>;
}
