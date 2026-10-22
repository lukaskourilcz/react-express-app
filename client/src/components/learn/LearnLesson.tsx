// Optional reading before Learn starts an attempt. Only the questions write progress.
import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@astryxdesign/core/Button';
import { fetchLearnLesson } from '../../lib/roadmap';
import { learnText } from '../../i18n/translations.learn';
import { useT } from '../../i18n/LanguageContext';
import { LessonView } from './LessonBody';
import LoadingScreen from '../LoadingScreen';
import ErrorRetry from '../ErrorRetry';
import '../paths/LearningPaths.css';

export function LearnLesson({ lessonId, onStart, onBack }: { lessonId: string; onStart: () => void; onBack: () => void }) {
  const t = useT();
  const root = useRef<HTMLDivElement>(null);
  const query = useQuery({ queryKey: ['learn-lesson', lessonId], queryFn: ({ signal }) => fetchLearnLesson(lessonId, signal), staleTime: 5 * 60_000, retry: false });
  useEffect(() => { root.current?.focus(); }, [lessonId]);
  return (
    <div ref={root} tabIndex={-1} className="de-page lp-page" style={{ maxWidth: 800 }}>
      <Button variant="ghost" label={t('common.back')} onClick={onBack} />
      {query.data ? <LessonView lesson={query.data.lesson} headingLevel={1} />
        : query.isPending ? <LoadingScreen label={t('common.loading')} />
          : <ErrorRetry message={learnText('learn.lesson.error')} onRetry={() => void query.refetch()} />}
      <p className="lp-note">{learnText('learn.lesson.readingOnly')}</p>
      <Button variant="primary" label={learnText('learn.lesson.startQuestions')} onClick={onStart} />
    </div>
  );
}
