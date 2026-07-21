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
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
