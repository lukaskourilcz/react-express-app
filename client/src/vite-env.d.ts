/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  /** Standalone devShark mode. The only supported lock value is "webdev". */
  readonly VITE_LOCK_SUBJECT?: string;
  /** Explicit product identity; normally inferred from VITE_LOCK_SUBJECT. */
  readonly VITE_PRODUCT?: string;
  /** URL of the umbrella StudyShark site, linked from a locked deploy's Profile. */
  readonly VITE_SIBLING_URL?: string;
  readonly VITE_STUDYSHARK_URL?: string;
  readonly VITE_DEVSHARK_URL?: string;
  /**
   * Cloudflare Turnstile site key. Unset by default: without it no script is
   * fetched, no widget is rendered and every submission goes out unattested,
   * which is exactly how the product behaved before attestation existed. Its
   * server-side pair is TURNSTILE_SECRET_KEY.
   */
  readonly VITE_TURNSTILE_SITE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
