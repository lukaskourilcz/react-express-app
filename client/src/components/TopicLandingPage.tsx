import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { useLanguage } from '../i18n/LanguageContext';
import { TOPIC_BY_SLUG } from '../lib/topicCatalog';
import { CURRENT_PRODUCT } from '../lib/products';
import { getSubject, setSubjectValue } from '../lib/subjects';

export default function TopicLandingPage() {
  const { slug = '' } = useParams();
  const { lang, t } = useLanguage();
  const navigate = useNavigate();
  const topic = TOPIC_BY_SLUG.get(slug);
  const allowed = topic && (
    CURRENT_PRODUCT.id === 'studyshark'
      ? topic.subject !== 'webdev'
      : topic.subject === 'webdev' && topic.subject === getSubject()
  );

  useEffect(() => {
    if (!allowed || !topic) return;
    if (CURRENT_PRODUCT.id === 'studyshark') setSubjectValue(topic.subject);
    document.title = `${topic.title[lang]} · ${CURRENT_PRODUCT.brand}`;
    document.querySelector('meta[name="description"]')?.setAttribute('content', topic.description[lang]);
  }, [allowed, topic, lang]);

  if (!allowed || !topic) {
    return (
      <div className="ss-info-page">
        <Heading level={1}>{t('topicLanding.notFound')}</Heading>
        <Button variant="primary" label={t('topicLanding.goHome')} onClick={() => navigate('/')} />
      </div>
    );
  }

  return (
    <article className="ss-info-page topic-landing">
      <header className="ss-info-page__header">
        <span className="ss-info-page__kicker">{t('topicLanding.kicker', { brand: CURRENT_PRODUCT.brand })}</span>
        <h1>{topic.title[lang]}</h1>
        <p>{topic.description[lang]}</p>
      </header>

      <Card variant="muted" padding={3} width="100%">
        <VStack gap={1}>
          <Heading level={2}>{t('topicLanding.misconception')}</Heading>
          <Text>{topic.misconception[lang]}</Text>
        </VStack>
      </Card>

      <VStack gap={1.5} width="100%">
        <Heading level={2}>{t('topicLanding.practice')}</Heading>
        {topic.practice[lang].map(([question, answer], index) => (
          <details key={question} className="topic-practice">
            <summary>{index + 1}. {question}</summary>
            <p>{answer}</p>
          </details>
        ))}
      </VStack>

      <Button
        variant="primary"
        size="lg"
        label={t('topicLanding.quizCta')}
        onClick={() => {
          if (CURRENT_PRODUCT.id === 'studyshark') setSubjectValue(topic.subject);
          navigate(`/quiz?category=${encodeURIComponent(topic.category)}`);
        }}
      />
    </article>
  );
}
