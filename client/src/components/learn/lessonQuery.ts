// The read of a Learn reading (a DSA level's lesson), shared by the reader
// (LearnLesson.tsx) and the places that open it (the Learn map, the Big O
// introduction). The opener starts it with the press, beside the reader's
// code, so the lesson does not wait for that code to arrive before it is asked
// for (perf baseline #587 C19 follow-up). The reader takes the same cache
// entry: one request per opening, as before.
import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { fetchLearnLesson } from '../../lib/roadmap';

export const learnLessonQuery = (lessonId: string) => queryOptions({
  queryKey: ['learn-lesson', lessonId],
  queryFn: ({ signal }) => fetchLearnLesson(lessonId, signal),
  staleTime: 5 * 60_000,
  retry: false,
});

/** Starts the lesson's read now. A lesson read in the last five minutes is
 * not asked for again (the reader's staleTime). A read that fails before the
 * reader has drawn is asked once more when it draws (TanStack's retryOnMount,
 * as on any reopening after a failure); the reader then shows the error. */
export function prefetchLearnLesson(queryClient: QueryClient, lessonId: string): void {
  void queryClient.prefetchQuery(learnLessonQuery(lessonId));
}
