import { useLayoutEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { useT } from '../i18n/LanguageContext';

/** Lokální porovnání vzhledů. Do produkčního buildu se ovládání nedostane. */
export default function DesignPreview() {
  const t = useT();
  const location = useLocation();
  const [design, setDesign] = useState(() => document.documentElement.dataset.design ?? 'apple');
  useLayoutEffect(() => {
    document.documentElement.dataset.design = design;
    const url = new URL(window.location.href);
    url.searchParams.set('design', design);
    window.history.replaceState(window.history.state, '', url);
  }, [design, location.pathname, location.search]);
  return (
    <aside className="ss-design-preview" aria-label={t('designPreview.label')}>
      <span className="ss-design-preview__label">{t('designPreview.local')}</span>
      <SegmentedControl value={design} label={t('designPreview.label')} size="sm" onChange={setDesign}>
        <SegmentedControlItem value="original" label={t('designPreview.original')} />
        <SegmentedControlItem value="apple" label={t('designPreview.apple')} />
      </SegmentedControl>
    </aside>
  );
}
