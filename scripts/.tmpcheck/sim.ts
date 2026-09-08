import { decideStep, EMPTY_COMPLETIONS } from '../../shared/progression';
import { completeProfile } from '../../shared/learner-profile';
import { topicLevelCounts } from '../../lib/progression';
const counts = topicLevelCounts();
console.log('level counts: abbreviations =', counts['abbreviations'], ', ai =', counts['ai'], ', security =', counts['security']);
const profile = completeProfile({ baseTrack: 'fullstack', goals: ['first-job'], experience: 'new', studyMinutes: 10, fde: true, dsa: true }, '2026-01-01T00:00:00.000Z')!;
for (const topic of ['abbreviations', 'ai', 'html']) {
  console.log(topic, '->', JSON.stringify(decideStep({ profile, completions: EMPTY_COMPLETIONS, levelCounts: counts }, { topic, kind: 'level', ref: 1 })));
}
// A frontend learner who already passed security levels under an older plan:
const fe = completeProfile({ baseTrack: 'frontend', goals: ['first-job'], experience: 'new', studyMinutes: 10, fde: false, dsa: false }, '2026-01-01T00:00:00.000Z')!;
const done = { levels: { security: [1, 2, 3] }, checkpoints: {}, visibleTopics: [] };
console.log('frontend replay security L2 ->', JSON.stringify(decideStep({ profile: fe, completions: done, levelCounts: counts }, { topic: 'security', kind: 'level', ref: 2 })));
