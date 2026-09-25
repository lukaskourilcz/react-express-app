// Technique coverage of the Easy band (#226, step 1).
//
// The goal the Easy-authoring waves work towards: a learner who passes every
// Easy challenge in a track has met every technique that track's Medium
// challenges combine. Measured per section track over standalone challenges
// (project stages and path levels are left out, the same way the track page
// lists them): each `focus` tag that appears on a Medium challenge should
// appear on at least COVERAGE_MIN_EASY Easy challenges of the same track.
//
// `npm run test:coding` prints the matrix on every run so the gaps are visible
// before anyone authors against them, and fails on a gap while
// COVERAGE_ENFORCED is true. The last Easy wave of #226 (Algorithms A) closed
// the last five gaps and switched it on. From then on a new Medium challenge
// whose tag has fewer than three Easy challenges in its track fails the run,
// and so does an Easy challenge taken away from under a tag.
import { CODING_SECTION_TRACKS, difficultyOf, type CodingTaskSummary, type CodingTrack } from '../shared/coding-catalog';
import { evolvingStage } from '../shared/evolving';

/** On since the last Easy-authoring wave of #226 closed every gap. */
export const COVERAGE_ENFORCED = true;
export const COVERAGE_MIN_EASY = 3;

type CoverageTask = Pick<CodingTaskSummary, 'id' | 'track' | 'tier' | 'focus'> & Partial<Pick<CodingTaskSummary, 'difficulty'>>;

export interface CoverageRow {
  track: CodingTrack;
  tag: string;
  /** Medium challenges in the track that carry the tag. */
  medium: number;
  /** Easy challenges in the track that carry the tag. */
  easy: number;
}

export interface TrackCoverage {
  track: CodingTrack;
  mediumTasks: number;
  easyTasks: number;
  rows: CoverageRow[];
}

/** One entry per section track: every tag used on its Medium challenges, with
 * how many Easy challenges carry it, fewest first. */
export function techniqueCoverage(tasks: readonly CoverageTask[], tracks: readonly CodingTrack[] = CODING_SECTION_TRACKS): TrackCoverage[] {
  const standalone = tasks.filter((task) => !evolvingStage(task.id));
  return tracks.map((track) => {
    const inTrack = standalone.filter((task) => task.track === track);
    const medium = inTrack.filter((task) => difficultyOf(task) === 'medium');
    const easy = inTrack.filter((task) => difficultyOf(task) === 'easy');
    const tags = [...new Set(medium.flatMap((task) => task.focus))];
    const rows = tags
      .map((tag) => ({
        track,
        tag,
        medium: medium.filter((task) => task.focus.includes(tag)).length,
        easy: easy.filter((task) => task.focus.includes(tag)).length,
      }))
      .sort((a, b) => a.easy - b.easy || b.medium - a.medium || a.tag.localeCompare(b.tag));
    return { track, mediumTasks: medium.length, easyTasks: easy.length, rows };
  });
}

/** Tags with fewer than COVERAGE_MIN_EASY Easy challenges. */
export const coverageGaps = (coverage: readonly TrackCoverage[]): CoverageRow[] =>
  coverage.flatMap((track) => track.rows.filter((row) => row.easy < COVERAGE_MIN_EASY));

/** The matrix as plain text for the test log: one block per track. */
export function renderCoverage(coverage: readonly TrackCoverage[], enforced: boolean): string {
  const gaps = coverageGaps(coverage);
  const lines = [
    `Technique coverage: every focus tag on a Medium challenge needs ${COVERAGE_MIN_EASY} Easy challenges in the same track (${enforced ? 'enforced' : 'reported only'}).`,
  ];
  for (const track of coverage) {
    const short = track.rows.filter((row) => row.easy < COVERAGE_MIN_EASY).length;
    lines.push(`  ${track.track}: ${track.easyTasks} Easy, ${track.mediumTasks} Medium, ${track.rows.length} tags on Medium, ${short} short`);
    const width = Math.max(4, ...track.rows.map((row) => row.tag.length));
    lines.push(`    ${'tag'.padEnd(width)}  medium  easy`);
    for (const row of track.rows) {
      const missing = COVERAGE_MIN_EASY - row.easy;
      lines.push(`    ${row.tag.padEnd(width)}  ${String(row.medium).padStart(6)}  ${String(row.easy).padStart(4)}${missing > 0 ? `  needs ${missing} more` : ''}`);
    }
  }
  lines.push(`  ${gaps.length} tag(s) short across ${coverage.length} tracks.`);
  return lines.join('\n');
}
