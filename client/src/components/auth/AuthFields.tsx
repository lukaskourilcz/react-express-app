// The pieces the sign-in dialog and the two email-link pages share: the
// email and password fields, the sentence for each thing that can go wrong,
// and a resend button that waits out Supabase's one-email-a-minute limit.
//
// The fields are the app's own native inputs (`.ss-input`, 44px tall) rather
// than Astryx's TextInput, which cannot carry `autocomplete`,
// `autocapitalize` or `spellcheck`. Password managers find the right field by
// the first, and a phone keyboard that capitalises an address breaks it.
import { useId, useState, type ReactNode, type Ref } from 'react';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { useT } from '../../i18n/LanguageContext';
import type { TranslationKey } from '../../i18n/translations';
import {
  PASSWORD_MAX_BYTES,
  PASSWORD_MIN_LENGTH,
  useCooldown,
  type AuthFailure,
  type EmailProblem,
  type PasswordProblem,
} from '../../lib/emailAuth';
import { EyeIcon, EyeOffIcon } from '../ui/icons';
import './Auth.css';

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  /** Shown under the field, read with it, and marks it invalid. */
  error?: string | null;
  /** A standing hint, such as the password rule; an error replaces it. */
  hint?: string;
  disabled?: boolean;
  inputRef?: Ref<HTMLInputElement>;
}

function describedBy(...ids: (string | false | null | undefined)[]): string | undefined {
  const list = ids.filter(Boolean).join(' ');
  return list || undefined;
}

export function EmailField({ label, value, onChange, onBlur, error, hint, disabled, inputRef }: FieldProps) {
  const id = useId();
  return (
    <div className="ss-auth-field">
      <label className="ss-field-label" htmlFor={id}>{label}</label>
      <input
        ref={inputRef}
        id={id}
        className="ss-input"
        type="email"
        name="email"
        autoComplete="email"
        inputMode="email"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        maxLength={254}
        required
        value={value}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(hint && !error && `${id}-hint`, error && `${id}-error`)}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
      />
      {/* The error takes the hint's place: "Use at least 8 characters."
          under "At least 8 characters." says the same thing twice. */}
      {hint && !error && <p id={`${id}-hint`} className="ss-auth-field__hint">{hint}</p>}
      {error && <p id={`${id}-error`} className="ss-auth-field__error">{error}</p>}
    </div>
  );
}

export function PasswordField({
  label,
  value,
  onChange,
  onBlur,
  error,
  hint,
  disabled,
  inputRef,
  autoComplete,
}: FieldProps & { autoComplete: 'current-password' | 'new-password' }) {
  const t = useT();
  const id = useId();
  const [shown, setShown] = useState(false);
  return (
    <div className="ss-auth-field">
      <label className="ss-field-label" htmlFor={id}>{label}</label>
      <div className="ss-auth-field__box">
        <input
          ref={inputRef}
          id={id}
          className="ss-input"
          type={shown ? 'text' : 'password'}
          name={autoComplete === 'new-password' ? 'new-password' : 'password'}
          autoComplete={autoComplete}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          value={value}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(hint && !error && `${id}-hint`, error && `${id}-error`)}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
        />
        {/* One label, pressed or not: the state is aria-pressed, the icon
            shows it, and the label stays what the button does. */}
        <button
          type="button"
          className="ss-auth-field__toggle"
          aria-label={t('auth.password.show')}
          aria-pressed={shown}
          aria-controls={id}
          disabled={disabled}
          onClick={() => setShown((now) => !now)}
        >
          {shown ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
        </button>
      </div>
      {/* The error takes the hint's place: "Use at least 8 characters."
          under "At least 8 characters." says the same thing twice. */}
      {hint && !error && <p id={`${id}-hint`} className="ss-auth-field__hint">{hint}</p>}
      {error && <p id={`${id}-error`} className="ss-auth-field__error">{error}</p>}
    </div>
  );
}

const FIELD_MESSAGES: Record<EmailProblem | PasswordProblem | 'passwordMismatch', TranslationKey> = {
  emailRequired: 'auth.error.emailRequired',
  emailInvalid: 'auth.error.emailInvalid',
  passwordRequired: 'auth.error.passwordRequired',
  passwordShort: 'auth.error.passwordShort',
  passwordLong: 'auth.error.passwordLong',
  passwordMismatch: 'auth.error.passwordMismatch',
};

/** The sentence under a field for what is wrong with it. */
export function useFieldMessage() {
  const t = useT();
  return (problem: EmailProblem | PasswordProblem | 'passwordMismatch' | null | undefined): string | null =>
    problem ? t(FIELD_MESSAGES[problem], { min: PASSWORD_MIN_LENGTH, max: PASSWORD_MAX_BYTES }) : null;
}

const FAILURE_MESSAGES: Record<AuthFailure, TranslationKey> = {
  invalidCredentials: 'auth.failure.invalidCredentials',
  emailNotConfirmed: 'auth.failure.emailNotConfirmed',
  userExists: 'auth.failure.userExists',
  weakPassword: 'auth.failure.weakPassword',
  pwnedPassword: 'auth.failure.pwnedPassword',
  samePassword: 'auth.failure.samePassword',
  reauthenticate: 'auth.failure.reauthenticate',
  rateLimited: 'auth.failure.rateLimited',
  emailRateLimited: 'auth.failure.emailRateLimited',
  emailDisabled: 'auth.failure.emailDisabled',
  emailInvalid: 'auth.failure.emailInvalid',
  linkExpired: 'auth.failure.linkExpired',
  sessionMissing: 'auth.failure.sessionMissing',
  network: 'auth.failure.network',
  serviceError: 'auth.failure.serviceError',
  unavailable: 'auth.failure.unavailable',
  unknown: 'auth.failure.unknown',
};

/** What went wrong, as a banner the screen reader reads out (role="alert"),
 * with the actions that fix it underneath. */
export function FailureBanner({ failure, children }: { failure: AuthFailure; children?: ReactNode }) {
  const t = useT();
  return (
    <div className="ss-auth__failure">
      <Banner status="error" title={t(FAILURE_MESSAGES[failure], { min: PASSWORD_MIN_LENGTH })} />
      {children && <div className="ss-auth__actions">{children}</div>}
    </div>
  );
}

/**
 * Sends an email again, once the minute since the last one has passed. The
 * label counts the seconds down; the count is not announced every second,
 * only the button's state when it is pressed.
 */
export function ResendButton({
  purpose,
  email,
  version,
  busy,
  onResend,
}: {
  purpose: 'confirm' | 'reset';
  email: string;
  /** Changes when an email goes out, so the countdown starts again. */
  version: number;
  busy: boolean;
  onResend: () => void;
}) {
  const t = useT();
  const left = useCooldown(purpose, email, version);
  return (
    <Button
      variant="secondary"
      label={left > 0 ? t('auth.sent.resendIn', { seconds: left }) : t('auth.sent.resend')}
      isDisabled={busy || left > 0}
      isLoading={busy}
      onClick={onResend}
    />
  );
}

/** A sentence with `{email}` in it, the address set in bold. */
export function withEmail(sentence: string, email: string): ReactNode {
  return sentence.split('{email}').map((part, index) => (
    <span key={index}>
      {index > 0 && <span className="ss-auth__email">{email}</span>}
      {part}
    </span>
  ));
}
