import { pathsForProfile } from '../../shared/progression';
import { BASE_TRACKS, completeProfile } from '../../shared/learner-profile';
import { SUBJECT_SCOPE_CATALOG } from '../../shared/subject-catalog';
const webdev = [...SUBJECT_SCOPE_CATALOG.webdev.topics];
const reachable = new Set<string>();
for (const baseTrack of BASE_TRACKS) for (const fde of [false, true]) for (const dsa of [false, true]) {
  const p = completeProfile({ baseTrack, goals: ['first-job'], experience: 'new', studyMinutes: 10, fde, dsa }, '2026-01-01T00:00:00.000Z')!;
  const topics = new Set(pathsForProfile(p).flatMap((path) => path.stages.flatMap((s) => [...s.topics])));
  console.log(`${baseTrack} fde=${fde} dsa=${dsa}: missing = ${webdev.filter((t) => !topics.has(t)).join(', ') || '(none)'}`);
  for (const t of topics) reachable.add(t);
}
console.log('\nwebdev topics reachable by NO profile at all:', webdev.filter((t) => !reachable.has(t)).join(', ') || '(none)');
