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
    <div className="ss-home-carousel__state" role="alert">
      <h2>Double numbers</h2>
      <p>{task.isError ? friendlyError(task.error) : 'The editor could not load.'}</p>
      <Button variant="secondary" label="Try again" isDisabled={workbench.reloading || task.isFetching} onClick={() => { setAttempt((value) => value + 1); void task.refetch(); }} />
      <Link to="/coding/javascript/js-double-numbers">Open coding challenge</Link>
    </div>
  );
  if (!task.data || !workbench.View) return <div className="ss-home-carousel__state" role="status">Loading coding challenge…</div>;
  const View = workbench.View;
  return <View key={`${user?.id ?? 'guest'}-${task.data.session}`} task={task.data.task} session={task.data.session} locked={task.data.locked} signedIn={task.data.signedIn} initialCode={initialCode} onEdit={onEdit} mode="landing" />;
}

export function HomeSampleCarousel({ quiz }: { quiz: ReactNode }) {
  const tabletOrDesktop = useMediaQuery('(min-width: 600px)');
  const [slide, setSlide] = useState<'quiz' | 'coding'>('quiz');
  const id = useId();
  const [codingVisited, setCodingVisited] = useState(false);
  const { user } = useAuth();
  const owner = user?.id ?? 'guest';
  const [draft, setDraft] = useState<{ owner: string; code: string } | null>(null);
  const onEdit = useCallback((code: string) => setDraft({ owner, code }), [owner]);
  // The viewport governs mounting, not just CSS visibility: no hidden editor
  // or worker on phones. The quiz keeps its answer when switching slides.
  if (!tabletOrDesktop) return <>{quiz}</>;
  return (
    <section className="ss-home-carousel" aria-label="Try devShark" aria-roledescription="carousel">
      <div className="ss-home-carousel__controls" aria-label="Choose a sample">
        <Button variant={slide === 'quiz' ? 'primary' : 'ghost'} label="Quiz" aria-pressed={slide === 'quiz'} aria-controls={`${id}-quiz`} onClick={() => setSlide('quiz')} />
        <Button variant={slide === 'coding' ? 'primary' : 'ghost'} label="Coding" aria-pressed={slide === 'coding'} aria-controls={`${id}-coding`} onClick={() => { setCodingVisited(true); setSlide('coding'); }} />
        <span className="ss-home-carousel__count" aria-live="polite">{slide === 'quiz' ? '1' : '2'} / 2</span>
      </div>
      <div className="ss-home-carousel__stack">
        <div className="ss-home-carousel__behind" aria-hidden="true"><span>{slide === 'quiz' ? 'Double numbers · Coding challenge' : 'What does this return? · Quiz'}</span></div>
        <div id={`${id}-quiz`} className="ss-home-carousel__slide" hidden={slide !== 'quiz'} aria-label="Quiz sample">{quiz}</div>
        <div id={`${id}-coding`} className="ss-home-carousel__slide ss-panel" hidden={slide !== 'coding'} aria-label="Coding sample">
          {codingVisited && <CodingSample initialCode={draft?.owner === owner ? draft.code : null} onEdit={onEdit} />}
        </div>
      </div>
    </section>
  );
}
