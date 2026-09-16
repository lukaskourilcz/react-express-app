/** The Lichess puzzle import contract for chessShark.
 *
 * Lichess publishes its puzzle database as a CSV under CC0, which makes it
 * usable commercially and redistributable without permission. This module is
 * the pure half of the import: it knows the CSV's shape, which Lichess themes
 * belong to which chessShark topic, which rating band becomes which authored
 * difficulty tier, and how one row becomes one question. `scripts/import-
 * lichess-puzzles.ts` is the impure half — it streams the file and writes the
 * generated bank.
 *
 * Three things the rest of the codebase depends on:
 *
 * 1. **The position is not the FEN.** A Lichess row's FEN is the position
 *    *before* the opponent's move, and the first entry in `Moves` is that
 *    move. The puzzle the learner sees is the position after it. Every row
 *    whose first move is not legal in its own FEN is dropped rather than
 *    guessed at, which is also a cheap integrity check on the file.
 * 2. **The solution never reaches the client.** `ImportedPuzzle` carries
 *    `solutionUci` and the full solution line; `puzzleQuestion` projects it
 *    into the plain `Question` the delivery pipeline already serves, where the
 *    correct option's *index* lives only in the signed session token. The
 *    generated bank is a server module and is never imported by the client.
 * 3. **Nothing here is authored prose about a specific position.** The stem is
 *    the position read out in coordinates, the options are legal moves in the
 *    position, and the explanation is the solution line rendered from the
 *    moves Lichess recorded. No claim is made that a model or a human has
 *    looked at the puzzle, because neither has.
 *
 * What this cannot promise: that no distractor is also strong. Uniqueness of
 * the solution is Lichess's, not ours. The one case we can check we do check —
 * when the solution is mate in one, no other mate in one is offered beside it.
 */

import {
  applyMove,
  generateMoves,
  moveFromUci,
  parseFen,
  positionIsPlayable,
  toFen,
  toSan,
  toUci,
  describePieces,
  type Move,
  type Position,
} from './chess-position';

/* ── the file ──────────────────────────────────────────────────────────── */

/** The header row of the published database, in order. The importer refuses a
 * file whose header is not this, because a silently reordered column would
 * import ratings as popularity and nobody would notice. */
export const LICHESS_CSV_COLUMNS = [
  'PuzzleId',
  'FEN',
  'Moves',
  'Rating',
  'RatingDeviation',
  'Popularity',
  'NbPlays',
  'Themes',
  'GameUrl',
  'OpeningTags',
] as const;

export interface LichessPuzzleRow {
  puzzleId: string;
  fen: string;
  moves: string[];
  rating: number;
  ratingDeviation: number;
  popularity: number;
  nbPlays: number;
  themes: string[];
  gameUrl: string;
  openingTags: string[];
}

/** Split one CSV line. Handles quoted fields and doubled quotes so a future
 * column containing a comma cannot shift every field after it. */
export function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i]!;
    if (quoted) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"' && field === '') quoted = true;
    else if (char === ',') {
      fields.push(field);
      field = '';
    } else field += char;
  }
  fields.push(field);
  return fields;
}

/** Turn one CSV line into a row, or null when any field is unusable. Never
 * throws: a 6-million-line file will contain surprises, and one bad line must
 * cost one puzzle rather than the import. */
export function parseLichessRow(line: string): LichessPuzzleRow | null {
  const fields = parseCsvLine(line);
  if (fields.length < LICHESS_CSV_COLUMNS.length - 1) return null;
  const [puzzleId, fen, movesRaw, ratingRaw, deviationRaw, popularityRaw, playsRaw, themesRaw, gameUrl] = fields as string[];
  const openingTagsRaw = fields[9] ?? '';
  if (!puzzleId || !/^[A-Za-z0-9]{4,12}$/.test(puzzleId)) return null;
  if (!fen || !movesRaw) return null;

  const moves = movesRaw.trim().split(/\s+/).filter(Boolean);
  if (moves.length < 2) return null;
  if (!moves.every((move) => /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move))) return null;

  const rating = Number(ratingRaw);
  const ratingDeviation = Number(deviationRaw);
  const popularity = Number(popularityRaw);
  const nbPlays = Number(playsRaw);
  if (![rating, ratingDeviation, popularity, nbPlays].every((value) => Number.isFinite(value))) return null;

  if (gameUrl && !/^https:\/\/lichess\.org\//.test(gameUrl)) return null;

  return {
    puzzleId,
    fen: fen.trim(),
    moves,
    rating,
    ratingDeviation,
    popularity,
    nbPlays,
    themes: (themesRaw ?? '').trim().split(/\s+/).filter(Boolean),
    gameUrl: gameUrl ?? '',
    openingTags: openingTagsRaw.trim().split(/\s+/).filter(Boolean),
  };
}

/** Does this file start with the database we think it does? */
export function headerMatches(line: string): boolean {
  const fields = parseCsvLine(line.replace(/^﻿/, '')).map((field) => field.trim());
  return LICHESS_CSV_COLUMNS.every((column, index) => fields[index] === column);
}

/* ── authored tiers and topics ─────────────────────────────────────────── */

export interface PuzzleTier {
  tier: 1 | 2 | 3 | 4 | 5;
  difficulty: 1 | 2 | 3 | 4 | 5;
  minRating: number;
  maxRating: number;
}

/** Rating bands are Lichess's; the tiers over them are ours. The bottom cut at
 * 600 and the top cut at 2400 are editorial: below the first the puzzle pool
 * is thin and noisy, above the second the puzzles stop being a learning tool
 * for the reader this product is for. */
export const PUZZLE_TIERS: PuzzleTier[] = [
  { tier: 1, difficulty: 1, minRating: 600, maxRating: 1099 },
  { tier: 2, difficulty: 2, minRating: 1100, maxRating: 1399 },
  { tier: 3, difficulty: 3, minRating: 1400, maxRating: 1699 },
  { tier: 4, difficulty: 4, minRating: 1700, maxRating: 1999 },
  { tier: 5, difficulty: 5, minRating: 2000, maxRating: 2400 },
];

export function tierForRating(rating: number): PuzzleTier | null {
  return PUZZLE_TIERS.find((band) => rating >= band.minRating && rating <= band.maxRating) ?? null;
}

/** Which chessShark topic a Lichess theme feeds, in resolution order. A puzzle
 * carries several themes; the first topic in this list that claims one of them
 * owns the puzzle, so no puzzle can be imported twice.
 *
 * Motifs resolve before phases on purpose. `endgame` and `middlegame` sit on a
 * large share of the database, so a phase-first order would file a knight fork
 * under Endgames merely because it happened on move 50 — and a learner who
 * picks Tactics wants the fork.
 *
 * Only topics that puzzles can honestly teach appear here. `strategy`,
 * `pawn-structures` and `chess-history` are deliberately absent: a tactical
 * puzzle is not a lesson in any of them, and mapping a theme onto them to fill
 * the topic would be padding. An unrecognised theme selects nothing, so a
 * misspelling here shows up as a topic with zero imported puzzles in the
 * import report rather than as wrong content. */
export const PUZZLE_TOPIC_THEMES: { topic: string; themes: string[] }[] = [
  {
    topic: 'tactics',
    themes: ['fork', 'pin', 'skewer', 'discoveredAttack', 'doubleCheck', 'hangingPiece', 'trappedPiece', 'capturingDefender', 'xRayAttack'],
  },
  {
    topic: 'combinations',
    themes: ['sacrifice', 'deflection', 'attraction', 'clearance', 'interference', 'intermezzo', 'backRankMate', 'smotheredMate', 'doubleBishopMate', 'hookMate', 'arabianMate', 'anastasiaMate', 'bodenMate', 'dovetailMate'],
  },
  {
    topic: 'endgame-technique',
    themes: ['advancedPawn', 'promotion', 'underPromotion', 'zugzwang'],
  },
  {
    topic: 'middlegame',
    themes: ['kingsideAttack', 'queensideAttack', 'exposedKing', 'attackingF2F7'],
  },
  {
    topic: 'endgames',
    themes: ['endgame', 'rookEndgame', 'pawnEndgame', 'queenEndgame', 'bishopEndgame', 'knightEndgame', 'queenRookEndgame'],
  },
  {
    topic: 'opening-theory',
    themes: ['opening'],
  },
];

export const PUZZLE_TOPICS = PUZZLE_TOPIC_THEMES.map((entry) => entry.topic);

export function topicForThemes(themes: string[]): string | null {
  const set = new Set(themes);
  for (const entry of PUZZLE_TOPIC_THEMES) {
    if (entry.themes.some((theme) => set.has(theme))) return entry.topic;
  }
  return null;
}

/* ── quality floor ─────────────────────────────────────────────────────── */

export interface PuzzleQualityFloor {
  /** Glicko deviation ceiling: a wide deviation means the rating, and so the
   * tier the puzzle lands in, is not yet settled. */
  maxRatingDeviation: number;
  /** How often the puzzle has been played, as a proxy for how settled it is. */
  minNbPlays: number;
  /** Lichess's own up/down score, which runs from -100 to 100. */
  minPopularity: number;
}

/** Our floor, not a Lichess recommendation. */
export const DEFAULT_QUALITY_FLOOR: PuzzleQualityFloor = {
  maxRatingDeviation: 90,
  minNbPlays: 500,
  minPopularity: 80,
};

export function meetsQualityFloor(row: LichessPuzzleRow, floor: PuzzleQualityFloor = DEFAULT_QUALITY_FLOOR): boolean {
  return (
    row.ratingDeviation <= floor.maxRatingDeviation
    && row.nbPlays >= floor.minNbPlays
    && row.popularity >= floor.minPopularity
  );
}

/* ── one row → one puzzle ──────────────────────────────────────────────── */

export interface ImportedPuzzle {
  /** `cp-<puzzleId>`; stable, because the Lichess id is stable. */
  id: string;
  topic: string;
  tier: 1 | 2 | 3 | 4 | 5;
  difficulty: 1 | 2 | 3 | 4 | 5;
  /** The position the learner is shown: after the opponent's first move. */
  fen: string;
  /** Whose move it is in that position. */
  sideToMove: 'w' | 'b';
  /** The opponent's move that created the position, in algebraic notation. */
  setupSan: string;
  /** SERVER ONLY. Never projected into a `Question`. */
  solutionUci: string;
  /** SERVER ONLY. The solution move in algebraic notation. */
  solutionSan: string;
  /** SERVER ONLY. The whole recorded line, in algebraic notation. */
  solutionLine: string[];
  /** The options in algebraic notation, with no check or mate suffix.
   * `correctAnswer` is the index of the solution among them. The delivery
   * pipeline shuffles them again per request. */
  optionsSan: string[];
  /** Index of the solution in `optionsSan`. */
  correctAnswer: number;
  optionsSanCs: string[];
  themes: string[];
  rating: number;
  puzzleId: string;
  gameUrl: string;
}

const FNV_OFFSET = 2166136261;

/** A stable 32-bit hash. Selection and distractor order must not move between
 * two runs over the same file, or every re-import would rewrite the bank. */
export function stableHash(value: string): number {
  let hash = FNV_OFFSET;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** English SAN → Czech notation: the piece letters differ, the squares do not.
 * K king, D dáma, V věž, S střelec, J jezdec. */
export function sanToCzech(san: string): string {
  const letters: Record<string, string> = { K: 'K', Q: 'D', R: 'V', B: 'S', N: 'J' };
  return san.replace(/^([KQRBN])/, (_, letter: string) => letters[letter] ?? letter)
    .replace(/=([QRBN])/, (_, letter: string) => `=${letters[letter] ?? letter}`);
}

/** "mateIn2" → "mate in 2". Lichess theme ids are camelCase; nothing is added
 * to them, so a theme we have never seen still reads as itself. */
export function readableTheme(theme: string): string {
  return theme
    .replace(/([a-z])([A-Z0-9])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .toLowerCase();
}

function scoreDistractor(position: Position, move: Move, solution: Move): number {
  let score = 0;
  if (move.captured) score += 3;
  if (move.piece === solution.piece) score += 2;
  if (move.promotion) score += 1;
  const next = applyMove(position, move);
  const theirKing = next.board.indexOf(next.turn === 'w' ? 'K' : 'k');
  if (theirKing >= 0 && generateMoves({ ...next, turn: position.turn }).some((reply) => reply.to === theirKing)) score += 2;
  return score;
}

export interface BuildPuzzleOptions {
  /** How many wrong options to offer beside the solution. */
  distractors?: number;
}

/** Build one puzzle from one row, or null when the row cannot support an
 * honest question. Every rejection is a rule, never a guess. */
export function buildPuzzle(row: LichessPuzzleRow, options: BuildPuzzleOptions = {}): ImportedPuzzle | null {
  const distractorCount = options.distractors ?? 3;
  const tier = tierForRating(row.rating);
  if (!tier) return null;
  const topic = topicForThemes(row.themes);
  if (!topic) return null;

  const start = parseFen(row.fen);
  if (!start || !positionIsPlayable(start)) return null;

  const setup = moveFromUci(start, row.moves[0]!);
  if (!setup) return null;
  const setupSan = toSan(start, setup);
  const position = applyMove(start, setup);

  const solution = moveFromUci(position, row.moves[1]!);
  if (!solution) return null;
  const solutionSan = toSan(position, solution);

  // The whole recorded line, so the explanation can show how it finishes.
  const solutionLine: string[] = [];
  let walk: Position = position;
  for (const uci of row.moves.slice(1)) {
    const move = moveFromUci(walk, uci);
    if (!move) break;
    solutionLine.push(toSan(walk, move));
    walk = applyMove(walk, move);
  }
  if (solutionLine.length === 0) return null;

  const solutionIsMate = solutionSan.endsWith('#');
  const candidates = generateMoves(position)
    .filter((move) => toUci(move) !== row.moves[1])
    .map((move) => ({ move, san: toSan(position, move) }))
    .filter((entry) => !(solutionIsMate && entry.san.endsWith('#')));
  if (candidates.length < distractorCount) return null;

  const distractors = candidates
    .map((entry) => ({ ...entry, score: scoreDistractor(position, entry.move, solution) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const left = stableHash(`${row.puzzleId}:${a.san}`);
      const right = stableHash(`${row.puzzleId}:${b.san}`);
      return left === right ? a.san.localeCompare(b.san) : left - right;
    })
    .slice(0, distractorCount);

  // Options never carry the "+"/"#" suffix. A lone "Ra8#" beside three quiet
  // rook moves is not a puzzle, it is a label: the notation would announce the
  // answer before the learner had looked at the board. The suffix stays in the
  // explanation, where the line is being shown anyway.
  const optionTexts = [solutionSan, ...distractors.map((entry) => entry.san)].map(withoutCheckSuffix);
  if (new Set(optionTexts).size !== optionTexts.length) return null;

  // Rotate the correct option deterministically. The delivery pipeline
  // shuffles per request, but the stored bank should not have its answer in
  // slot 0 several thousand times over — that is a pattern in the data, and
  // anything that reads the bank without shuffling would inherit it.
  const correctAnswer = stableHash(`answer:${row.puzzleId}`) % optionTexts.length;
  const optionsSan = optionTexts.slice();
  optionsSan[0] = optionTexts[correctAnswer]!;
  optionsSan[correctAnswer] = optionTexts[0]!;

  return {
    id: `cp-${row.puzzleId}`,
    topic,
    tier: tier.tier,
    difficulty: tier.difficulty,
    fen: toFen(position),
    sideToMove: position.turn,
    setupSan,
    solutionUci: row.moves[1]!,
    solutionSan,
    solutionLine,
    correctAnswer,
    optionsSan,
    optionsSanCs: optionsSan.map(sanToCzech),
    themes: row.themes,
    rating: row.rating,
    puzzleId: row.puzzleId,
    gameUrl: row.gameUrl,
  };
}

/** "Ra8#" → "Ra8". */
export function withoutCheckSuffix(san: string): string {
  return san.replace(/[+#]+$/, '');
}

/* ── one puzzle → the question the pipeline already serves ─────────────── */

export const LICHESS_PUZZLE_URL = 'https://lichess.org/training';
export const LICHESS_ATTRIBUTION_EN = 'Puzzle from the Lichess puzzle database, published under CC0.';
export const LICHESS_ATTRIBUTION_CS = 'Úloha z databáze šachových úloh Lichess, zveřejněné pod CC0.';

const TOPIC_TAG_EN: Record<string, string> = {
  tactics: 'Tactics',
  combinations: 'Combinations',
  endgames: 'Endgames',
  'endgame-technique': 'Endgame technique',
  middlegame: 'Middlegame',
  'opening-theory': 'Opening theory',
};

const TOPIC_TAG_CS: Record<string, string> = {
  tactics: 'Taktika',
  combinations: 'Kombinace',
  endgames: 'Koncovky',
  'endgame-technique': 'Technika koncovek',
  middlegame: 'Střední hra',
  'opening-theory': 'Teorie zahájení',
};

/** The position read out in coordinates. The stem has to be one flowing run of
 * text: the question renderer collapses whitespace, so a diagram laid out in
 * lines would arrive as one smeared row. Reading the pieces out is also what a
 * screen reader can actually convey, which a board graphic could not. */
export function puzzleStem(puzzle: ImportedPuzzle, lang: 'en' | 'cs'): string {
  const position = parseFen(puzzle.fen);
  if (!position) return '';
  const white = describePieces(position, 'w');
  const black = describePieces(position, 'b');
  const side = (entries: string[], lang2: 'en' | 'cs'): string => {
    const pieces = entries.filter((entry) => /^[A-Z]/.test(entry));
    const pawns = entries.filter((entry) => !/^[A-Z]/.test(entry));
    const named = lang2 === 'cs' ? pieces.map(sanToCzech) : pieces;
    const parts: string[] = [];
    if (named.length) parts.push(named.join(', '));
    if (pawns.length) parts.push(`${lang2 === 'cs' ? (pawns.length === 1 ? 'pěšec' : 'pěšci') : pawns.length === 1 ? 'pawn' : 'pawns'} ${pawns.join(', ')}`);
    return parts.length ? parts.join(', ') : lang2 === 'cs' ? 'nic' : 'nothing';
  };
  if (lang === 'cs') {
    return [
      puzzle.sideToMove === 'w' ? 'Na tahu je bílý.' : 'Na tahu je černý.',
      `Bílý: ${side(white, 'cs')}.`,
      `Černý: ${side(black, 'cs')}.`,
      `Pozice (FEN): \`${puzzle.fen}\`.`,
      'Který tah je nejlepší?',
    ].join(' ');
  }
  return [
    puzzle.sideToMove === 'w' ? 'White to move.' : 'Black to move.',
    `White: ${side(white, 'en')}.`,
    `Black: ${side(black, 'en')}.`,
    `Position (FEN): \`${puzzle.fen}\`.`,
    'Which move is best?',
  ].join(' ');
}

export function puzzleIntroduction(lang: 'en' | 'cs'): string {
  return lang === 'cs'
    ? 'Projdi nejdřív vynucené tahy: šachy, braní a hrozby. Teprve pak hledej tichý tah.'
    : 'Work through the forcing moves first: checks, captures and threats. Only then look for a quiet move.';
}

/** The explanation shown after the answer. Everything in it is derived: the
 * line is the moves Lichess recorded, rendered in algebraic notation, and the
 * source reference is the puzzle id and the game it came from. */
export function puzzleExplanation(puzzle: ImportedPuzzle, lang: 'en' | 'cs'): string {
  const line = (lang === 'cs' ? puzzle.solutionLine.map(sanToCzech) : puzzle.solutionLine).join(' ');
  const themes = puzzle.themes.map(readableTheme).join(', ');
  const puzzleUrl = `${LICHESS_PUZZLE_URL}/${puzzle.puzzleId}`;
  if (lang === 'cs') {
    return [
      `Vítězná varianta: ${line}.`,
      themes ? `Motivy podle Lichess: ${themes}.` : '',
      `Zdroj: úloha ${puzzle.puzzleId} (hodnocení ${puzzle.rating}), ${puzzleUrl}${puzzle.gameUrl ? `, z partie ${puzzle.gameUrl}` : ''}.`,
      LICHESS_ATTRIBUTION_CS,
    ].filter(Boolean).join(' ');
  }
  return [
    `The winning line is ${line}.`,
    themes ? `Themes recorded by Lichess: ${themes}.` : '',
    `Source: puzzle ${puzzle.puzzleId} (rating ${puzzle.rating}), ${puzzleUrl}${puzzle.gameUrl ? `, from the game ${puzzle.gameUrl}` : ''}.`,
    LICHESS_ATTRIBUTION_EN,
  ].filter(Boolean).join(' ');
}

/** Tags are sent to the client with the question, so they name the topic and
 * never the Lichess theme — the theme is the answer with the working removed. */
export function puzzleTags(puzzle: ImportedPuzzle, lang: 'en' | 'cs'): string[] {
  const table = lang === 'cs' ? TOPIC_TAG_CS : TOPIC_TAG_EN;
  const topic = table[puzzle.topic] ?? puzzle.topic;
  return lang === 'cs' ? ['Šachy', topic, 'Úloha'] : ['Chess', topic, 'Puzzle'];
}

/** The public shape: exactly the fields a `Question` has, with no solution
 * field of any kind. The correct option's index travels in the signed session
 * token, as it does for every other question in the product. */
export interface PuzzleQuestionShape {
  id: string;
  tags: string[];
  introduction: string;
  question: string;
  options: string[];
  correctAnswer: number;
  category: string;
  explanation: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
}

export function puzzleQuestion(puzzle: ImportedPuzzle): PuzzleQuestionShape {
  return {
    id: puzzle.id,
    tags: puzzleTags(puzzle, 'en'),
    introduction: puzzleIntroduction('en'),
    question: puzzleStem(puzzle, 'en'),
    options: puzzle.optionsSan,
    correctAnswer: puzzle.correctAnswer,
    category: puzzle.topic,
    explanation: puzzleExplanation(puzzle, 'en'),
    difficulty: puzzle.difficulty,
  };
}

export interface PuzzleTranslationShape {
  introduction: string;
  question: string;
  options: string[];
  explanation: string;
}

/** The Czech side. `options` stays parallel to the English array, in the same
 * order, so the stored correct index keeps its meaning after localization. */
export function puzzleTranslation(puzzle: ImportedPuzzle): PuzzleTranslationShape {
  return {
    introduction: puzzleIntroduction('cs'),
    question: puzzleStem(puzzle, 'cs'),
    options: puzzle.optionsSanCs,
    explanation: puzzleExplanation(puzzle, 'cs'),
  };
}

/* ── selection ─────────────────────────────────────────────────────────── */

export interface SelectionPlan {
  /** How many puzzles to keep per topic per tier. */
  perTier: number;
  quality?: PuzzleQualityFloor;
  distractors?: number;
}

export interface SelectionResult {
  puzzles: ImportedPuzzle[];
  /** Per topic, per tier: how many were kept. Zero is the honest report that a
   * theme mapping found nothing, and the importer prints it. */
  counts: Record<string, Record<number, number>>;
  /** Why rows were dropped, so a thin import can be explained. */
  rejected: Record<string, number>;
}

/** Deterministic: the same file and the same plan give the same bank, in the
 * same order, every time. Candidates are ordered by a hash of the puzzle id so
 * the kept set is not just the first N rows of the file, which would all come
 * from one corner of the database. */
export function selectPuzzles(rows: Iterable<LichessPuzzleRow>, plan: SelectionPlan): SelectionResult {
  const quality = plan.quality ?? DEFAULT_QUALITY_FLOOR;
  const rejected: Record<string, number> = {};
  const reject = (reason: string) => {
    rejected[reason] = (rejected[reason] ?? 0) + 1;
  };

  const buckets = new Map<string, { puzzle: ImportedPuzzle; order: number }[]>();
  const seen = new Set<string>();

  for (const row of rows) {
    if (seen.has(row.puzzleId)) {
      reject('duplicate_id');
      continue;
    }
    seen.add(row.puzzleId);
    if (!tierForRating(row.rating)) {
      reject('rating_out_of_band');
      continue;
    }
    if (!topicForThemes(row.themes)) {
      reject('no_mapped_theme');
      continue;
    }
    if (!meetsQualityFloor(row, quality)) {
      reject('below_quality_floor');
      continue;
    }
    const puzzle = buildPuzzle(row, { distractors: plan.distractors });
    if (!puzzle) {
      reject('unplayable_or_too_few_options');
      continue;
    }
    const key = `${puzzle.topic}:${puzzle.tier}`;
    const bucket = buckets.get(key) ?? [];
    bucket.push({ puzzle, order: stableHash(puzzle.puzzleId) });
    buckets.set(key, bucket);
  }

  const puzzles: ImportedPuzzle[] = [];
  const counts: Record<string, Record<number, number>> = {};
  for (const topic of PUZZLE_TOPICS) {
    counts[topic] = {};
    for (const band of PUZZLE_TIERS) {
      const bucket = buckets.get(`${topic}:${band.tier}`) ?? [];
      bucket.sort((a, b) => (a.order === b.order ? a.puzzle.id.localeCompare(b.puzzle.id) : a.order - b.order));
      const kept = bucket.slice(0, plan.perTier).map((entry) => entry.puzzle);
      counts[topic]![band.tier] = kept.length;
      puzzles.push(...kept);
    }
  }

  return { puzzles, counts, rejected };
}
