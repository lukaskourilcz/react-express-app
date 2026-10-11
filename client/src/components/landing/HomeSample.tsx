import { useCallback, useId, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@astryxdesign/core/Button';
import { Link } from 'react-router-dom';
import { useMediaQuery } from '../../lib/useMediaQuery';
import { useAuth } from '../../lib/auth';
import { codingKeys, fetchCodingTask } from '../../coding/api';
import { useWorkbench } from '../../coding/loadWorkbench';
import { friendlyError } from '../../lib/api';

const TASK_ID = 'js-double-numbers';

/** Reuses the real task API, sealed session, editor, runner and server grader.
 * Mobile never mounts this branch or downloads the workbench. */
function CodingSample({ initialCode, onEdit }: { initialCode: string | null; onEdit: (code: string) => void }) {
  const { user } = useAuth();
  const [attempt, setAttempt] = useState(0);
  const task = useQuery({ queryKey: [...codingKeys.task(TASK_ID), 'home', user?.id ?? 'guest'], queryFn: ({ signal }) => fetchCodingTask(TASK_ID, signal), staleTime: 60 * 60_000, refetchOnWindowFocus: false, retry: false });
  const workbench = useWorkbench(true, attempt);
  if (task.isError || workbench.failed) return (
    <div className="ss-home-sample__state" role="alert">
      <h2>Double numbers</h2>
      <p>{task.isError ? friendlyError(task.error) : 'The editor could not load.'}</p>
      <Button variant="secondary" label="Try again" isDisabled={workbench.reloading || task.isFetching} onClick={() => { setAttempt((value) => value + 1); void task.refetch(); }} />
      <Link to="/coding/javascript/js-double-numbers">Open coding challenge</Link>
    </div>
  );
  if (!task.data || !workbench.View) return <div className="ss-home-sample__state" role="status">Loading coding challenge…</div>;
  const View = workbench.View;
  return <View key={`${user?.id ?? 'guest'}-${task.data.session}`} task={task.data.task} session={task.data.session} locked={task.data.locked} signedIn={task.data.signedIn} initialCode={initialCode} onEdit={onEdit} mode="landing" />;
}

export function HomeSample({ quiz }: { quiz: ReactNode }) {
  const tabletOrDesktop = useMediaQuery('(min-width: 600px)');
  // Random first card per visit; edits never change it. The dots then give
  // the learner control, with both samples retaining their state.
  const [slide, setSlide] = useState<'quiz' | 'coding'>(() => Math.random() < 0.5 ? 'quiz' : 'coding');
  const [codingVisited, setCodingVisited] = useState(slide === 'coding');
  const id = useId();
  const { user } = useAuth();
  const owner = user?.id ?? 'guest';
  const [draft, setDraft] = useState<{ owner: string; code: string } | null>(null);
  const onEdit = useCallback((code: string) => setDraft({ owner, code }), [owner]);
  // Phones always mount only the quiz, even when this visit picked coding.
  // Keep the coding draft here so resizing to a phone and back preserves it.
  if (!tabletOrDesktop) return <>{quiz}</>;
  return (
    <section className="ss-home-sample" aria-label="Try devShark" aria-roledescription="carousel">
      <div className="ss-home-sample__stack">
        <div className="ss-home-sample__behind" aria-hidden="true"><span>{slide === 'quiz' ? 'Double numbers · Coding challenge' : 'What does this return? · Quiz'}</span></div>
        <div id={`${id}-quiz`} className="ss-home-sample__slide" hidden={slide !== 'quiz'} aria-label="Quiz sample">{quiz}</div>
        <div id={`${id}-coding`} className="ss-home-sample__slide ss-home-sample__coding ss-panel" hidden={slide !== 'coding'} aria-label="Coding sample">
          {codingVisited && <CodingSample initialCode={draft?.owner === owner ? draft.code : null} onEdit={onEdit} />}
        </div>
      </div>
      <div className="ss-home-sample__dots" aria-label="Choose a sample">
        <Button variant="ghost" isIconOnly icon={<span className="ss-home-sample__dot" aria-hidden="true" />} label="Show quiz sample" aria-pressed={slide === 'quiz'} aria-controls={`${id}-quiz`} onClick={() => setSlide('quiz')} />
        <Button variant="ghost" isIconOnly icon={<span className="ss-home-sample__dot" aria-hidden="true" />} label="Show coding sample" aria-pressed={slide === 'coding'} aria-controls={`${id}-coding`} onClick={() => { setCodingVisited(true); setSlide('coding'); }} />
      </div>
    </section>
  );
}
