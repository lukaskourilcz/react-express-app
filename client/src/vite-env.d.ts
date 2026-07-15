/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  /** Standalone mode: lock the whole app to one subject id (e.g. "webdev"). */
  readonly VITE_LOCK_SUBJECT?: string;
  /** URL of the umbrella StudyShark site, linked from a locked deploy's Profile. */
  readonly VITE_SIBLING_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
