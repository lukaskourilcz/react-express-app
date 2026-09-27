import { PRODUCT_CATALOG } from '../../product-catalog';

const BRAND = PRODUCT_CATALOG.devshark.brand;

/**
 * Renders `text` with every occurrence of the product name wrapped in
 * `.ss-brand-name`, so an uppercase label (a kicker) still shows devShark
 * instead of DEVSHARK. Safe in the build-time HTML: it reads the catalog, not
 * the Vite environment.
 */
export default function BrandCase({ text }: { text: string }) {
  const parts = text.split(BRAND);
  return (
    <>
      {parts.map((part, index) => (
        <span key={index}>
          {index > 0 && <span className="ss-brand-name">{BRAND}</span>}
          {part}
        </span>
      ))}
    </>
  );
}
