import { BASE_PATH_STAGES, fdePathFor, ALL_PROGRESSION_TOPICS } from '../../shared/progression';
import { BASE_TRACKS } from '../../shared/learner-profile';
import { SUBJECT_SCOPE_CATALOG } from '../../shared/subject-catalog';
const webdev = [...SUBJECT_SCOPE_CATALOG.webdev.topics];
console.log('webdev topics:', webdev.length, webdev.join(', '));
console.log('\nALL_PROGRESSION_TOPICS:', ALL_PROGRESSION_TOPICS.length, ALL_PROGRESSION_TOPICS.join(', '));
const graph = new Set(ALL_PROGRESSION_TOPICS);
console.log('\nwebdev topics NOT in graph:', webdev.filter((t) => !graph.has(t)).join(', ') || '(none)');
for (const track of BASE_TRACKS) {
  const set = new Set(BASE_PATH_STAGES[track].flatMap((s) => [...s.topics]));
  console.log(`\n${track}: ${[...set].join(', ')}`);
  console.log(`  webdev topics missing from ${track}: ${webdev.filter((t) => !set.has(t)).join(', ')}`);
}
console.log('\nfde(frontend) stages:', fdePathFor('frontend').stages.map((s)=>`${s.key}[${[...s.topics].join('|')}]`).join(' '));
