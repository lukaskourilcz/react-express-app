import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { useLanguage } from '../i18n/LanguageContext';
import { CURRENT_PRODUCT } from '../lib/products';
import { topicFromPath } from '../lib/publicMetadata';
import { TOPIC_LANDINGS } from '../lib/topicCatalog';
import { TopicArticle } from './topics/TopicArticle';
import { captureActivation } from '../lib/analytics';
export default function TopicLandingPage() {
  const { pathname } = useLocation();
  const { t, setLang } = useLanguage();
  const navigate = useNavigate();
  const resolved = topicFromPath(pathname);
  const topic = resolved?.topic; const locale = resolved?.locale;
  useEffect(() => {
    if (!topic || !locale) return;
    setLang(locale);
  }, [topic, locale, setLang]);
  if (!topic || !locale) return <div className="ss-info-page"><Heading level={1}>{t('topicLanding.notFound')}</Heading><Button variant="primary" label={t('topicLanding.goHome')} onClick={() => navigate('/')} /></div>;
  return <TopicArticle topic={topic} locale={locale} brand={CURRENT_PRODUCT.brand} related={TOPIC_LANDINGS} onPractice={event => {
    captureActivation('learning_cta_clicked', { product: CURRENT_PRODUCT.id, locale, source: 'topic_guide', category: topic.category });
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(`/quiz?category=${encodeURIComponent(topic.category)}`);
  }} />;
}
