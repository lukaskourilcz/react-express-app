import { LESSON_FIGURES } from '../shared/lesson-figures';
import { levelQuestionIds, type RoadmapTopic } from '../lib/roadmap';
import { questions } from '../lib/quiz-data';

const byId = new Map(questions.map((q: any) => [q.id, q]));
for (const f of LESSON_FIGURES) {
  const ids = levelQuestionIds(f.topic as RoadmapTopic, f.level);
  console.log('\n=== ' + f.id + ' (' + f.topic + ' L' + f.level + ') ===');
  for (const id of ids) {
    const q: any = byId.get(id);
    if (!q) { console.log('  [missing]', id); continue; }
    console.log('  Q:', String(q.question).replace(/\n/g, ' ').slice(0, 170));
    console.log('     A:', q.options[q.correctAnswer]);
  }
}
