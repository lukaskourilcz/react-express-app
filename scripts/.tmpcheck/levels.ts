import { levelCodingTasks, tasksForLevel } from '../../lib/coding/catalog';
for (const level of [3, 4, 5, 8]) {
  console.log(`js level ${level}: all=`, tasksForLevel('javascript', level).map((t) => t.id).join(', '));
  console.log(`   chosen=`, levelCodingTasks('javascript', level).map((t) => t.id).join(', '));
}
