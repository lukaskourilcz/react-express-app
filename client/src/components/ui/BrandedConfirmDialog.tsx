import { useState } from 'react';
import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { useT } from '../../i18n/LanguageContext';

export interface ConfirmRequest {
  title: string;
  description: string;
  actionLabel: string;
  onConfirm: () => void | Promise<void>;
  destructive?: boolean;
}

/** Shared confirmation behavior; visual identity comes from the global Deep End dialog surface. */
export function BrandedConfirmDialog({ request, onClose }: { request: ConfirmRequest | null; onClose: () => void }) {
  const t = useT();
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    if (!request || busy) return;
    setBusy(true);
    try {
      await request.onConfirm();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog
      className="ss-alert-dialog"
      isOpen={!!request}
      onOpenChange={(open) => { if (!open && !busy) onClose(); }}
      title={request?.title ?? ''}
      description={request?.description ?? ''}
      cancelLabel={t('common.cancel')}
      actionLabel={request?.actionLabel ?? ''}
      actionVariant={request?.destructive === false ? 'primary' : 'destructive'}
      isActionLoading={busy}
      onAction={confirm}
      width="min(460px, calc(100vw - 32px))"
    />
  );
}
