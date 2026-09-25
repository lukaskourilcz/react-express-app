// The merchandise mockups the build found under client/public/merch (#229).
// A SKU without a file has no entry, so its tile renders without an image and
// the browser never asks for one.
import type { MerchSku } from '../../../shared/rewards';

export const MERCH_IMAGES: Readonly<Partial<Record<MerchSku, string>>> =
  typeof __MERCH_IMAGES__ !== 'undefined' ? __MERCH_IMAGES__ : {};
