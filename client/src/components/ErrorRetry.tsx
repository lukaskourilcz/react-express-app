import { Button } from '@astryxdesign/core/Button';
import { useT } from '../i18n/LanguageContext';
import { sxToStyle, type SxLike } from '../lib/styleProps';

/**
 * Style object accepted by `ErrorRetry`. Real CSS properties plus the small set
 * of MUI `sx` spacing shorthands callers pass (`mx: 'auto'`), whose numeric
 * values are ×8px.
 */
const ErrorGlyph = () => (
  <svg aria-hidden="true" focusable="false" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
  </svg>
);

interface Props {
  /** Error message to display. */
  message: string;
  /** Called when the user clicks the retry action. */
  onRetry: () => void;
  /** Extra styles merged onto the alert. */
  sx?: SxLike;
}

/** Standard error alert with a "Retry" action, used by data-loading screens. */
export default function ErrorRetry({ message, onRetry, sx }: Props) {
  const t = useT();
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '6px 16px',
        borderRadius: 'var(--radius-element)',
        border: '1px solid color-mix(in srgb, var(--ss-error) 26%, transparent)',
        background: 'var(--ss-error-soft)',
        color: 'var(--ss-error)',
        fontSize: '0.875rem',
        lineHeight: 1.5,
        ...sxToStyle(sx),
      }}
    >
      <ErrorGlyph />
      <span style={{ flex: 1, padding: '8px 0' }}>{message}</span>
      <Button size="sm" variant="ghost" label={t('quiz.retry')} onClick={onRetry} />
    </div>
  );
}
