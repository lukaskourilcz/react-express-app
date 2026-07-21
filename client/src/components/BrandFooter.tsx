import { Link } from 'react-router-dom';
import { useT } from '../i18n/LanguageContext';
import { CURRENT_PRODUCT, PRODUCTS, SHARK_BRANDS, productUrl } from '../lib/products';
import { capture } from '../lib/analytics';

export default function BrandFooter() {
  const t = useT();
  const studySharkUrl = productUrl(PRODUCTS.studyshark);

  return (
    <footer className="ss-brand-footer" aria-label={t('footer.aria')}>
      <div className="ss-brand-footer__heading">
        <span>{t('footer.family')}</span>
        {CURRENT_PRODUCT.id === 'studyshark' ? (
          <strong aria-current="page">StudyShark</strong>
        ) : studySharkUrl ? (
          <a href={studySharkUrl} onClick={() => capture('sibling_brand_visited', { product: 'studyshark' })}>StudyShark</a>
        ) : (
          <span>StudyShark</span>
        )}
      </div>
      <ul className="ss-brand-footer__brands">
        {SHARK_BRANDS.map((product) => {
          const active = product.id === CURRENT_PRODUCT.id;
          const url = productUrl(product);
          return (
            <li key={product.id}>
              {active ? (
                <strong aria-current="page" style={{ color: product.accent }}>{product.brand}</strong>
              ) : url ? (
                <a href={url} onClick={() => capture('sibling_brand_visited', { product: product.id })} style={{ ['--footer-brand-accent' as string]: product.accent }}>{product.brand}</a>
              ) : (
                <span className="ss-brand-footer__pending">
                  {product.brand}<small>{t('footer.comingSoon')}</small>
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <div className="ss-brand-footer__meta">
        <span>{t('footer.free')}</span>
        <nav aria-label={t('footer.legal')}>
          <Link to="/support">{t('footer.support')}</Link>
          <Link to="/privacy">{t('footer.privacy')}</Link>
          <Link to="/terms">{t('footer.terms')}</Link>
        </nav>
      </div>
    </footer>
  );
}
