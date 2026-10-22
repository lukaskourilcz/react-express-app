/** Ordered delivery phases; labels stay in the lazy path dictionary. */
export const DELIVERY_PHASES = ['discover-scope', 'integrate', 'build-models', 'harden-ship', 'enable-codify'] as const;
export type DeliveryPhase = (typeof DELIVERY_PHASES)[number];
