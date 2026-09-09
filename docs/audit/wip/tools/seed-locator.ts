// Maps a served devShark question id to the seed (file, export, index) that
// produced it, replicating lib/roadmap-questions.ts exactly.
export interface SeedLocation { file: string; exportName: string; index: number; shape: 'seed' | 'question' | 'term' }

const HALF = 4;
function interleaved(n: number, fileA: string, exportA: string, fileB: string, exportB: string): SeedLocation {
  const level = Math.floor((n - 1) / 8);
  const pos = (n - 1) % 8;
  return pos < HALF
    ? { file: fileA, exportName: exportA, index: level * HALF + pos, shape: 'seed' }
    : { file: fileB, exportName: exportB, index: level * HALF + (pos - HALF), shape: 'seed' };
}

const DIRECT: Record<string, [string, string]> = {
  'rm-next': ['lib/roadmap-questions-next.ts', 'nextSeeds'],
  'rm-node': ['lib/roadmap-questions-node.ts', 'nodeSeeds'],
  'rm-git': ['lib/roadmap-questions-git.ts', 'gitSeeds'],
  'rm-html': ['lib/roadmap-questions-html-core.ts', 'htmlCoreSeeds'],
  'rm-css': ['lib/roadmap-questions-css-core.ts', 'cssCoreSeeds'],
  'rm-dsa': ['lib/roadmap-questions-dsa.ts', 'dsaSeeds'],
  'rm-algorithms': ['lib/roadmap-questions-algorithms.ts', 'algorithmsSeeds'],
  'rm-ai': ['lib/roadmap-questions-ai.ts', 'aiSeeds'],
  'rm-db': ['lib/roadmap-questions-databases.ts', 'databasesSeeds'],
  'rm-sysdesign': ['lib/roadmap-questions-system-design.ts', 'systemDesignSeeds'],
  'rm-testing': ['lib/roadmap-questions-testing.ts', 'testingSeeds'],
  'rm-devops': ['lib/roadmap-questions-devops.ts', 'devopsSeeds'],
  'rm-security': ['lib/roadmap-questions-security.ts', 'securitySeeds'],
};

export function locate(id: string): SeedLocation | null {
  const m = /^(rm-[a-z]+)-(\d+)$/.exec(id);
  if (m) {
    const prefix = m[1];
    const n = Number(m[2]);
    if (prefix === 'rm-js') return interleaved(n, 'lib/roadmap-questions-js.ts', 'jsSeedsA', 'lib/roadmap-questions-js-b.ts', 'jsSeedsB');
    if (prefix === 'rm-ts') return interleaved(n, 'lib/roadmap-questions-ts.ts', 'tsSeedsA', 'lib/roadmap-questions-ts-b.ts', 'tsSeedsB');
    if (prefix === 'rm-react') return interleaved(n, 'lib/roadmap-questions-react.ts', 'reactSeedsA', 'lib/roadmap-questions-react-b.ts', 'reactSeedsB');
    if (prefix === 'rm-general') {
      return n <= 120
        ? { file: 'lib/roadmap-questions-general.ts', exportName: 'generalSeeds', index: n - 1, shape: 'seed' }
        : { file: 'lib/roadmap-questions-testing-foundations.ts', exportName: 'testingFoundationsSeeds', index: n - 121, shape: 'seed' };
    }
    if (prefix === 'rm-abbr') return { file: 'lib/roadmap-questions-abbreviations.ts', exportName: 'abbreviationsSeeds', index: n - 1, shape: 'term' };
    const direct = DIRECT[prefix];
    if (direct) return { file: direct[0], exportName: direct[1], index: n - 1, shape: 'seed' };
    return null;
  }
  if (/^testfix-\d+$/.test(id)) return { file: 'lib/roadmap-questions-fix-the-test.ts', exportName: 'fixTheTestQuestions', index: -1, shape: 'question' };
  if (/^\d+$/.test(id)) return { file: 'lib/quiz-data.ts', exportName: 'coreQuestions', index: -1, shape: 'question' };
  return null;
}
