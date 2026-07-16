import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import { m, AnimatePresence } from '../../lib/motion';

/**
 * Lightweight toast — a MUI-free replacement for the app's `<Snackbar><Alert>`
 * pattern. Controlled via `open`/`onClose`, fixed bottom-centre, auto-hides,
 * and colour-codes by severity using the Astryx design tokens (success uses the
 * active subject accent). Renders through a portal so it floats above the app.
 */
export type ToastSeverity = 'success' | 'error' | 'info';

const STYLES: Record<ToastSeverity, { bg: string; fg: string }> = {
  success: { bg: 'var(--brand-accent, #2d7a2d)', fg: '#ffffff' },
  error: { bg: '#dc2626', fg: '#ffffff' },
  info: { bg: 'var(--color-background-surface)', fg: 'var(--color-text-primary)' },
};

export function AppToast({
  open,
  onClose,
  message,
  severity = 'info',
  autoHideDuration = 5000,
}: {
  open: boolean;
  onClose: () => void;
  message: React.ReactNode;
  severity?: ToastSeverity;
  autoHideDuration?: number | null;
}) {
  useEffect(() => {
    if (!open || autoHideDuration == null) return;
    const id = window.setTimeout(onClose, autoHideDuration);
    return () => window.clearTimeout(id);
  }, [open, autoHideDuration, onClose]);

  if (typeof document === 'undefined') return null;
  const s = STYLES[severity];

  return createPortal(
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 'max(1rem, env(safe-area-inset-bottom))',
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 1400,
        padding: '0 1rem',
      }}
    >
      <AnimatePresence>
        {open && (
          <m.div
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{
              pointerEvents: 'auto',
              maxWidth: 'min(92vw, 460px)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              borderRadius: 'var(--radius-element, 0.9rem)',
              background: s.bg,
              color: s.fg,
              fontFamily: 'var(--font-family-body)',
              fontWeight: 700,
              fontSize: '0.9rem',
              boxShadow: 'var(--shadow-high)',
              border: severity === 'info' ? '1px solid var(--color-border)' : 'none',
            }}
          >
            <span style={{ flex: 1 }}>{message}</span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Dismiss"
              style={{
                appearance: 'none',
                border: 'none',
                background: 'transparent',
                color: 'inherit',
                cursor: 'pointer',
                opacity: 0.85,
                fontSize: '1.1rem',
                lineHeight: 1,
                padding: 2,
              }}
            >
              ×
            </button>
          </m.div>
        )}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
