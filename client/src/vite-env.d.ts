/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  /** Public Stripe key; never place a Stripe secret key in a VITE_ variable. */
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
  /** Product identity: "devshark" or unset. Anything else fails the build. */
  readonly VITE_PRODUCT?: string;
  /** Subject lock: "webdev" or unset. Anything else fails the build. */
  readonly VITE_LOCK_SUBJECT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Merchandise mockups found under public/merch at build time, by SKU
 * (vite.config.ts). Undefined outside a Vite build, e.g. in unit tests. */
declare const __MERCH_IMAGES__: Readonly<Record<string, string>> | undefined;
