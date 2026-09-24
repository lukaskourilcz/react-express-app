/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  /** Product identity: "devshark" or unset. Anything else fails the build. */
  readonly VITE_PRODUCT?: string;
  /** Subject lock: "webdev" or unset. Anything else fails the build. */
  readonly VITE_LOCK_SUBJECT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
