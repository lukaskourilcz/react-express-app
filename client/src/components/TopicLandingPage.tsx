import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { useLanguage } from '../i18n/LanguageContext';
import { CURRENT_PRODUCT } from '../lib/products';
import { setSubjectValue } from '../lib/subjects';
import { publicTopics, topicFromPath } from '../lib/publicMetadata';
import { TopicArticle } from './topics/TopicArticle';
import { captureActivation } from '../lib/analytics';
export default function TopicLandingPage() {
  const { pathname } = useLocation();
  const { t, setLang } = useLanguage();
  const navigate = useNavigate();
  const resolved = topicFromPath(pathname, CURRENT_PRODUCT.id);
  const topic = resolved?.topic; const locale = resolved?.locale;
  useEffect(() => {
    if (!topic || !locale) return;
    setLang(locale);
    if (CURRENT_PRODUCT.id === 'studyshark') setSubjectValue(topic.subject);
  }, [topic, locale, setLang]);
  if (!topic || !locale) return <div className="ss-info-page"><Heading level={1}>{t('topicLanding.notFound')}</Heading><Button variant="primary" label={t('topicLanding.goHome')} onClick={() => navigate('/')} /></div>;
  return <TopicArticle topic={topic} locale={locale} brand={CURRENT_PRODUCT.brand} related={publicTopics(CURRENT_PRODUCT.id)} onPractice={event => {
    captureActivation('learning_cta_clicked', { product: CURRENT_PRODUCT.id, locale, source: 'topic_guide', category: topic.category });
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(`/quiz?category=${encodeURIComponent(topic.category)}`);
  }} />;
}
