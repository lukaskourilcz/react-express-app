// Optional reading before Learn starts an attempt. Only the questions write progress.
import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@astryxdesign/core/Button';
import { fetchLearnLesson } from '../../lib/roadmap';
import { learnText } from '../../i18n/translations.learn';
import { useT } from '../../i18n/LanguageContext';
import { LessonView } from './LessonBody';
import { SwimCta } from '../landing/LandingKit';
import LoadingScreen from '../LoadingScreen';
import ErrorRetry from '../ErrorRetry';
import '../paths/LearningPaths.css';

// The route shell sets the page width (narrow, 800px); the article caps itself
// at 72ch. Back sits at the top-left at its own width and names where it goes
// (the caller passes the place: the topic's map, the Big O introduction). The
// note and the one primary share a row at the end of the article's column
// (UX audit learn-05), so neither stretches across the page.
export function LearnLesson({ lessonId, backLabel, onStart, onBack }: { lessonId: string; backLabel: string; onStart: () => void; onBack: () => void }) {
  const t = useT();
  const root = useRef<HTMLDivElement>(null);
  const query = useQuery({ queryKey: ['learn-lesson', lessonId], queryFn: ({ signal }) => fetchLearnLesson(lessonId, signal), staleTime: 5 * 60_000, retry: false });
  useEffect(() => { root.current?.focus(); }, [lessonId]);
  return (
    <div ref={root} tabIndex={-1} className="de-page lp-page">
      <Button
        className="lp-lesson-back"
        variant="ghost"
        icon={<span aria-hidden="true">←</span>}
        label={backLabel}
        onClick={onBack}
      />
      {query.data ? <LessonView lesson={query.data.lesson} headingLevel={1} />
        : query.isPending ? <LoadingScreen label={t('common.loading')} />
          : <ErrorRetry message={learnText('learn.lesson.error')} onRetry={() => void query.refetch()} />}
      <div className="lp-lesson-start">
        <p className="lp-note">{learnText('learn.lesson.readingOnly')}</p>
        <SwimCta label={learnText('learn.lesson.startQuestions')} onClick={onStart} />
      </div>
    </div>
  );
}
