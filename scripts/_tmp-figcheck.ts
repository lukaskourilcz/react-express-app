import { LESSON_FIGURES, validateFigures, figuresFor } from '../shared/lesson-figures';
import { isRoadmapTopic, topicLevelCount } from '../lib/roadmap';

const problems = validateFigures((topic) => (isRoadmapTopic(topic) ? topicLevelCount(topic) : 0));
console.log('validateFigures problems:', problems);
for (const f of LESSON_FIGURES) {
  const levels = isRoadmapTopic(f.topic) ? topicLevelCount(f.topic) : 0;
  console.log(f.id, '| topic', f.topic, '| level', f.level, '| topic levels', levels,
    '| returned', figuresFor(f.topic, f.level, 'before').length);
}
