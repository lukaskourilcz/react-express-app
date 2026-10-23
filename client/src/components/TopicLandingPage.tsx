import type { MouseEvent } from 'react';
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
  const { t } = useLanguage();
  const navigate = useNavigate();
  const resolved = topicFromPath(pathname);
  const topic = resolved?.topic;
  if (!topic) return <div className="ss-info-page"><Heading level={1}>{t('topicLanding.notFound')}</Heading><Button variant="primary" label={t('topicLanding.goHome')} onClick={() => navigate('/')} /></div>;
  // The guide's links are plain anchors so the build-time HTML works without
  // the app. Here a plain left click stays in the app instead of reloading
  // it; a modified click still opens a tab or window as usual.
  const follow = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(event.currentTarget.getAttribute('href') ?? '/');
  };
  return <TopicArticle topic={topic} brand={CURRENT_PRODUCT.brand} related={TOPIC_LANDINGS} onNavigate={follow} onPractice={event => {
    captureActivation('learning_cta_clicked', { product: CURRENT_PRODUCT.id, locale: 'en', source: 'topic_guide', category: topic.category });
    follow(event);
  }} />;
}
