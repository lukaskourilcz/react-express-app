/** Import chess puzzles from the Lichess puzzle database into chessShark.
 *
 *   npm run import:chess-puzzles -- --csv ~/lichess_db_puzzle.csv
 *   npm run import:chess-puzzles -- --csv ~/lichess_db_puzzle.csv --write
 *
 * Without `--write` it reads the file and prints what it would keep. Nothing
 * on disk changes, which is the mode to run first: the report is how you find
 * out that a theme name has been renamed upstream, because the topic it feeds
 * comes back with zero puzzles.
 *
 * Getting the file (about 6.1 million puzzles, a few hundred MB compressed):
 *
 *   curl -O https://database.lichess.org/lichess_db_puzzle.csv.zst
 *   zstd -d lichess_db_puzzle.csv.zst
 *
 * The database is published under CC0, so it may be used commercially and
 * redistributed without permission. It is deliberately not committed here: it
 * is far too large for the repository, and the generated bank is the only part
 * this product needs. `shared/chess-puzzles.ts` holds every rule about which
 * rows survive and what they become; this file only streams and writes.
 *
 * Flags:
 *   --csv <path>     the decompressed CSV. Also read from LICHESS_PUZZLE_CSV.
 *   --per-tier <n>   puzzles kept per topic per rating tier (default 12).
 *   --limit <n>      stop after n data rows. For a quick smoke run.
 *   --out <path>     generated bank (default lib/chess-puzzle-bank.ts).
 *   --write          actually write it.
 */

import { createReadStream, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { basename, resolve } from 'node:path';
import {
  headerMatches,
  parseLichessRow,
  selectPuzzles,
  PUZZLE_TIERS,
  PUZZLE_TOPICS,
  type ImportedPuzzle,
  type LichessPuzzleRow,
} from '../shared/chess-puzzles';

const DEFAULT_OUT = 'lib/chess-puzzle-bank.ts';
const DEFAULT_PER_TIER = 12;

function flag(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
const has = (name: string): boolean => process.argv.includes(`--${name}`);

function fail(message: string): never {
  console.error(`import:chess-puzzles: ${message}`);
  process.exit(1);
}

/** Serialize one puzzle with a fixed key order, so re-importing the same file
 * produces a byte-identical bank and an unchanged diff. */
function serializePuzzle(puzzle: ImportedPuzzle): string {
  const ordered = {
    id: puzzle.id,
    topic: puzzle.topic,
    tier: puzzle.tier,
    difficulty: puzzle.difficulty,
    fen: puzzle.fen,
    sideToMove: puzzle.sideToMove,
    setupSan: puzzle.setupSan,
    solutionUci: puzzle.solutionUci,
    solutionSan: puzzle.solutionSan,
    solutionLine: puzzle.solutionLine,
    correctAnswer: puzzle.correctAnswer,
    optionsSan: puzzle.optionsSan,
    optionsSanCs: puzzle.optionsSanCs,
    themes: puzzle.themes,
    rating: puzzle.rating,
    puzzleId: puzzle.puzzleId,
    gameUrl: puzzle.gameUrl,
  };
  return `  ${JSON.stringify(ordered)},`;
}

export function renderBank(
  puzzles: ImportedPuzzle[],
  meta: { generatedAt: string; source: string; perTier: number },
): string {
  return `/* GENERATED FILE — written by \`npm run import:chess-puzzles -- --csv <file> --write\`.
 * Do not edit by hand; the next import overwrites it.
 *
 * Source: the Lichess puzzle database (https://database.lichess.org/),
 * published under CC0. Each entry keeps its puzzle id and the game it came
 * from as its source reference.
 *
 * This module is server-side only. It carries each puzzle's solution, and the
 * client never imports it — \`lib/chess-puzzle-questions.ts\` is the projection
 * that reaches the delivery pipeline, and it drops every solution field.
 */
import type { ImportedPuzzle } from '../shared/chess-puzzles';

export interface ChessPuzzleImportMeta {
  /** ISO date of the last import, or null when it has never been run. */
  generatedAt: string | null;
  /** The database file the bank came from, by name only. */
  source: string | null;
  /** How many puzzles were kept per topic per tier. */
  perTier: number;
}

export const CHESS_PUZZLE_IMPORT: ChessPuzzleImportMeta = {
  generatedAt: ${JSON.stringify(meta.generatedAt)},
  source: ${JSON.stringify(meta.source)},
  perTier: ${meta.perTier},
};

export const IMPORTED_CHESS_PUZZLES: ImportedPuzzle[] = [
${puzzles.map(serializePuzzle).join('\n')}
];
`;
}

async function main(): Promise<void> {
  const csvPath = flag('csv') ?? process.env.LICHESS_PUZZLE_CSV;
  if (!csvPath) {
    fail(
      'no database file. Pass --csv <path> or set LICHESS_PUZZLE_CSV.\n'
      + '  curl -O https://database.lichess.org/lichess_db_puzzle.csv.zst\n'
      + '  zstd -d lichess_db_puzzle.csv.zst',
    );
  }
  const perTier = Number(flag('per-tier') ?? DEFAULT_PER_TIER);
  if (!Number.isInteger(perTier) || perTier < 1) fail('--per-tier must be a positive integer');
  const limitRaw = flag('limit');
  const limit = limitRaw === undefined ? Infinity : Number(limitRaw);
  if (!(limit > 0)) fail('--limit must be a positive integer');
  const outPath = flag('out') ?? DEFAULT_OUT;
  const write = has('write');

  const absolute = resolve(csvPath);
  const stream = createReadStream(absolute, { encoding: 'utf8' });
  stream.on('error', (error: NodeJS.ErrnoException) => {
    fail(error.code === 'ENOENT' ? `no such file: ${absolute}` : `could not read ${absolute}: ${error.message}`);
  });

  const lines = createInterface({ input: stream, crlfDelay: Infinity });
  const rows: LichessPuzzleRow[] = [];
  let seenHeader = false;
  let read = 0;
  let malformed = 0;

  for await (const line of lines) {
    if (!line.trim()) continue;
    if (!seenHeader) {
      seenHeader = true;
      if (!headerMatches(line)) {
        fail(`unexpected header. Expected the published lichess_db_puzzle.csv columns, got:\n  ${line.slice(0, 200)}`);
      }
      continue;
    }
    if (read >= limit) break;
    read += 1;
    const row = parseLichessRow(line);
    if (!row) {
      malformed += 1;
      continue;
    }
    rows.push(row);
  }
  lines.close();

  if (!seenHeader) fail(`${absolute} is empty`);

  const result = selectPuzzles(rows, { perTier });

  console.log(`read ${read} rows from ${basename(absolute)} (${malformed} malformed)`);
  console.log(`kept ${result.puzzles.length} puzzles, ${perTier} per topic per tier\n`);
  const header = ['topic', ...PUZZLE_TIERS.map((band) => `T${band.tier}`), 'total'];
  console.log(header.join('\t'));
  for (const topic of PUZZLE_TOPICS) {
    const byTier = PUZZLE_TIERS.map((band) => result.counts[topic]?.[band.tier] ?? 0);
    const total = byTier.reduce((sum, value) => sum + value, 0);
    console.log([topic, ...byTier, total].join('\t'));
  }
  console.log('\nrejected:');
  for (const [reason, count] of Object.entries(result.rejected).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${reason}\t${count}`);
  }

  const thin = PUZZLE_TOPICS.filter((topic) =>
    PUZZLE_TIERS.some((band) => (result.counts[topic]?.[band.tier] ?? 0) === 0));
  if (thin.length) {
    console.log(`\nempty tiers in: ${thin.join(', ')}.`);
    console.log('A topic with an empty tier either has no puzzles in that rating band in the');
    console.log('rows read, or its theme names in PUZZLE_TOPIC_THEMES no longer match the database.');
  }

  if (!write) {
    console.log(`\nnothing written. Re-run with --write to generate ${outPath}.`);
    return;
  }
  const contents = renderBank(result.puzzles, {
    generatedAt: new Date().toISOString().slice(0, 10),
    source: basename(absolute),
    perTier,
  });
  writeFileSync(resolve(outPath), contents, 'utf8');
  console.log(`\nwrote ${outPath} (${result.puzzles.length} puzzles)`);
}

// Run only when this file is the program. The launch contract imports
// `renderBank` from here to check that a re-import of the same rows produces
// the same bank, and importing a module must not start streaming a file.
const invokedDirectly = process.argv.some((arg) => arg.includes('import-lichess-puzzles'));
if (invokedDirectly) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
