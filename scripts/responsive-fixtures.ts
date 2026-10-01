// Response bodies for the responsive sweep (scripts/check-responsive.mjs),
// built from the same modules the handlers read, so a fixture cannot drift
// from what production sends. The sweep bundles this file with esbuild when
// it starts; nothing here touches a database or the network.
import { ROADMAP_TOPICS, topicCheckpoints, topicLevels } from '../lib/roadmap';
import { CODING_TASKS, playable } from '../lib/coding/catalog';
import { LEARNING_PATHS, availabilityFor, inventoryFor, publicManifest } from '../lib/learning-paths/catalog';

/** GET /api/quiz/roadmap: every topic's levels and checkpoints, all open. */
export function roadmapStructure() {
  return {
    topics: ROADMAP_TOPICS,
    structure: Object.fromEntries(ROADMAP_TOPICS.map((topic) => [topic, { levels: topicLevels(topic), checkpoints: topicCheckpoints(topic) }])),
  };
}

/** GET /api/quiz/roadmap?resource=learning-path-catalog, for a deployment
 * whose paths are switched off, as the launched settings say. */
export function pathCatalog() {
  return {
    paths: LEARNING_PATHS.map((path) => {
      const manifest = publicManifest(path);
      return { manifest, availability: availabilityFor({ path, enabled: false, storageInstalled: true }), inventory: inventoryFor(path.id) };
    }),
    versions: Object.fromEntries(LEARNING_PATHS.map((path) => [path.id, path.version])),
  };
}

/** GET /api/quiz/roadmap?resource=coding-task&id=<id>, to a visitor who is
 * not signed in; null for an id the catalog does not hold. */
export function codingTask(id: string) {
  const task = CODING_TASKS.find((one) => one.id === id);
  if (!task) return null;
  return { task: playable(task), session: task.id, locked: null, progress: null, draft: null, signedIn: false };
}
