// The FDE path's share of its section's progress figure (sections.ts,
// `pathSteps`), read by the Learn switcher and the Career page's FDE group so
// both show one figure.
//
// The path counts only while it is open for enrollment: a switched-off path,
// or a catalogue that did not load, leaves the figure to the Learn topics, as
// it was before #489. `pending` is true while an answer that would change the
// figure is still on its way, so a caller can hold the figure back instead of
// showing one number and then another.

import { useAuth } from '../../lib/auth';
import { entryFor, isOpen, useEnrollments, usePathCatalog, usePathProgress } from '../../lib/learningPaths';
import { pathSteps, type PathSteps } from './sections';

export function useFdePathSteps(): { steps: PathSteps | null; pending: boolean } {
  const { user, isAuthenticated } = useAuth();
  const userId = isAuthenticated ? user?.id : undefined;
  const catalog = usePathCatalog();
  const enrollments = useEnrollments(userId);
  const entry = entryFor(catalog.data, 'fde');
  const enrollment = enrollments.data?.enrollments.find(
    (one) => one.pathId === 'fde' && one.curriculumVersion === entry?.manifest.version,
  );
  const progress = usePathProgress(userId, enrollment?.enrollmentId, enrollment?.curriculumVersion);

  // Offline a read pauses; the figure then keeps to the topics instead of
  // waiting for a connection.
  const waiting = (query: { isPending: boolean; fetchStatus: string }) => query.isPending && query.fetchStatus === 'fetching';
  if (waiting(catalog)) return { steps: null, pending: true };
  if (!entry || !isOpen(entry.availability)) return { steps: null, pending: false };
  if (userId && waiting(enrollments)) return { steps: null, pending: true };
  if (enrollment && waiting(progress)) return { steps: null, pending: true };
  // An account whose enrollments or progress did not arrive: the figure keeps
  // to the topics rather than counting recorded work as not done.
  if ((userId && !enrollments.data) || (enrollment && !progress.data)) return { steps: null, pending: false };
  return { steps: pathSteps(entry.manifest.modules, progress.data), pending: false };
}
