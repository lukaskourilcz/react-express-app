import { LESSON_FIGURES } from '../shared/lesson-figures';
import { topicLevels, isRoadmapTopic, type RoadmapTopic } from '../lib/roadmap';
for (const f of LESSON_FIGURES) {
  if (!isRoadmapTopic(f.topic)) { console.log(f.id, 'NOT A TOPIC'); continue; }
  const levels = topicLevels(f.topic as RoadmapTopic);
  const lv: any = levels.find((l: any) => l.level === f.level || l.ref === f.level || l.n === f.level);
  console.log(f.id.padEnd(20), '| lvl', String(f.level).padStart(2), '|', lv ? JSON.stringify(lv).slice(0, 200) : 'NOT FOUND');
}
