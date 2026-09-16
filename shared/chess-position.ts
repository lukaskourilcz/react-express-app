/** A small, dependency-free chess position model: FEN in, legal moves out.
 *
 * It exists for one job — verifying and rendering imported puzzles. The
 * Lichess puzzle database gives a FEN plus a UCI move list, and the position
 * the learner must solve is the one *after* the opponent's first move, so an
 * importer cannot build a puzzle question without being able to apply a move
 * and to name the reply in algebraic notation. Generating legal moves also
 * gives distractors that are real moves in the real position rather than
 * plausible-looking strings.
 *
 * Board indexing: 0 = a8, 7 = h8, 56 = a1, 63 = h1 — the order FEN itself
 * writes the ranks in, so parsing is a straight walk. Pieces are the FEN
 * letters: uppercase White, lowercase Black.
 *
 * Scope: everything a legal-move generator needs (castling rights and the
 * squares they cross, en passant including the discovered-check case,
 * promotion, and king safety) and nothing else. No search, no evaluation, no
 * clock, no PGN, no repetition or fifty-move claim.
 */

export type Color = 'w' | 'b';
export type PieceSymbol = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export interface Position {
  /** 64 squares, index 0 = a8 … 63 = h1. A FEN letter, or null when empty. */
  board: (string | null)[];
  turn: Color;
  /** Castling rights as a subset of "KQkq", or "" for none. */
  castling: string;
  /** En-passant target square index, or null. */
  ep: number | null;
  halfmove: number;
  fullmove: number;
}

export interface Move {
  from: number;
  to: number;
  piece: PieceSymbol;
  color: Color;
  captured: PieceSymbol | null;
  promotion: PieceSymbol | null;
  enPassant: boolean;
  castle: 'k' | 'q' | null;
  doublePush: boolean;
}

const FILES = 'abcdefgh';
const PIECE_LETTERS = 'pnbrqk';
const PROMOTION_PIECES: PieceSymbol[] = ['q', 'r', 'b', 'n'];

export const fileOf = (square: number): number => square % 8;
export const rankIndexOf = (square: number): number => Math.floor(square / 8);
const squareAt = (file: number, rankIndex: number): number => rankIndex * 8 + file;
const onBoard = (file: number, rankIndex: number): boolean => file >= 0 && file < 8 && rankIndex >= 0 && rankIndex < 8;

/** "e4" for the index of e4. */
export function squareName(square: number): string {
  return `${FILES[fileOf(square)]}${8 - rankIndexOf(square)}`;
}

/** The index for "e4", or null when the text is not a square. */
export function squareIndex(name: string): number | null {
  if (name.length !== 2) return null;
  const file = FILES.indexOf(name[0]!);
  const rank = Number(name[1]);
  if (file < 0 || !Number.isInteger(rank) || rank < 1 || rank > 8) return null;
  return squareAt(file, 8 - rank);
}

const colorOf = (piece: string): Color => (piece === piece.toUpperCase() ? 'w' : 'b');
const symbolOf = (piece: string): PieceSymbol => piece.toLowerCase() as PieceSymbol;
const opposite = (color: Color): Color => (color === 'w' ? 'b' : 'w');

/** Parse a FEN. Returns null for anything malformed — never throws, never
 * guesses a missing field except the two optional clocks. */
export function parseFen(fen: string): Position | null {
  const parts = fen.trim().split(/\s+/);
  if (parts.length < 4) return null;
  const [placement, turn, castling, ep] = parts as [string, string, string, string];
  const halfmoveRaw = parts[4] ?? '0';
  const fullmoveRaw = parts[5] ?? '1';

  const ranks = placement.split('/');
  if (ranks.length !== 8) return null;
  const board: (string | null)[] = new Array(64).fill(null);
  for (let rankIndex = 0; rankIndex < 8; rankIndex++) {
    const row = ranks[rankIndex]!;
    let file = 0;
    for (const char of row) {
      if (char >= '1' && char <= '8') {
        file += Number(char);
        continue;
      }
      if (!PIECE_LETTERS.includes(char.toLowerCase())) return null;
      if (file > 7) return null;
      board[squareAt(file, rankIndex)] = char;
      file += 1;
    }
    if (file !== 8) return null;
  }

  if (turn !== 'w' && turn !== 'b') return null;
  if (castling !== '-' && !/^K?Q?k?q?$/.test(castling)) return null;
  if (castling === '') return null;

  let epSquare: number | null = null;
  if (ep !== '-') {
    epSquare = squareIndex(ep);
    if (epSquare === null) return null;
    // The target square always sits on the third or sixth rank.
    const rankIndex = rankIndexOf(epSquare);
    if (rankIndex !== 2 && rankIndex !== 5) return null;
  }

  const halfmove = Number(halfmoveRaw);
  const fullmove = Number(fullmoveRaw);
  if (!Number.isInteger(halfmove) || halfmove < 0) return null;
  if (!Number.isInteger(fullmove) || fullmove < 1) return null;

  return {
    board,
    turn,
    castling: castling === '-' ? '' : castling,
    ep: epSquare,
    halfmove,
    fullmove,
  };
}

/** Serialize back to FEN. `parseFen(toFen(p))` round-trips. */
export function toFen(position: Position): string {
  const rows: string[] = [];
  for (let rankIndex = 0; rankIndex < 8; rankIndex++) {
    let row = '';
    let empty = 0;
    for (let file = 0; file < 8; file++) {
      const piece = position.board[squareAt(file, rankIndex)];
      if (piece) {
        if (empty) row += String(empty);
        empty = 0;
        row += piece;
      } else {
        empty += 1;
      }
    }
    if (empty) row += String(empty);
    rows.push(row);
  }
  return [
    rows.join('/'),
    position.turn,
    position.castling || '-',
    position.ep === null ? '-' : squareName(position.ep),
    String(position.halfmove),
    String(position.fullmove),
  ].join(' ');
}

/** Where the given colour's king stands, or -1 when it has none. */
export function kingSquare(board: (string | null)[], color: Color): number {
  const king = color === 'w' ? 'K' : 'k';
  return board.indexOf(king);
}

const KNIGHT_STEPS: [number, number][] = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
const KING_STEPS: [number, number][] = [[0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1]];
const ROOK_RAYS: [number, number][] = [[0, 1], [1, 0], [0, -1], [-1, 0]];
const BISHOP_RAYS: [number, number][] = [[1, 1], [1, -1], [-1, -1], [-1, 1]];

/** Is `square` attacked by any piece of `byColor`? Used for check detection,
 * castling legality and the legal-move filter. */
export function isSquareAttacked(board: (string | null)[], square: number, byColor: Color): boolean {
  const targetFile = fileOf(square);
  const targetRank = rankIndexOf(square);

  // Pawns. A white pawn sits one rank "below" (higher rank index) the square
  // it attacks, so we look the other way from the square under test.
  const pawnRank = byColor === 'w' ? targetRank + 1 : targetRank - 1;
  const pawn = byColor === 'w' ? 'P' : 'p';
  for (const df of [-1, 1]) {
    const file = targetFile + df;
    if (onBoard(file, pawnRank) && board[squareAt(file, pawnRank)] === pawn) return true;
  }

  const knight = byColor === 'w' ? 'N' : 'n';
  for (const [df, dr] of KNIGHT_STEPS) {
    const file = targetFile + df;
    const rank = targetRank + dr;
    if (onBoard(file, rank) && board[squareAt(file, rank)] === knight) return true;
  }

  const king = byColor === 'w' ? 'K' : 'k';
  for (const [df, dr] of KING_STEPS) {
    const file = targetFile + df;
    const rank = targetRank + dr;
    if (onBoard(file, rank) && board[squareAt(file, rank)] === king) return true;
  }

  const slide = (rays: [number, number][], symbols: string[]): boolean => {
    for (const [df, dr] of rays) {
      let file = targetFile + df;
      let rank = targetRank + dr;
      while (onBoard(file, rank)) {
        const piece = board[squareAt(file, rank)];
        if (piece) {
          if (colorOf(piece) === byColor && symbols.includes(symbolOf(piece))) return true;
          break;
        }
        file += df;
        rank += dr;
      }
    }
    return false;
  };
  if (slide(ROOK_RAYS, ['r', 'q'])) return true;
  if (slide(BISHOP_RAYS, ['b', 'q'])) return true;
  return false;
}

/** Is the side to move (or the named colour) in check? */
export function inCheck(position: Position, color: Color = position.turn): boolean {
  const king = kingSquare(position.board, color);
  if (king < 0) return false;
  return isSquareAttacked(position.board, king, opposite(color));
}

function pushMove(list: Move[], move: Move): void {
  if (move.piece === 'p' && (rankIndexOf(move.to) === 0 || rankIndexOf(move.to) === 7)) {
    for (const promotion of PROMOTION_PIECES) list.push({ ...move, promotion });
    return;
  }
  list.push(move);
}

/** Every pseudo-legal move for the side to move: correct in every rule except
 * that it may leave its own king in check. `generateMoves` filters those out. */
export function generatePseudoMoves(position: Position): Move[] {
  const { board, turn } = position;
  const moves: Move[] = [];
  const them = opposite(turn);

  for (let from = 0; from < 64; from++) {
    const piece = board[from];
    if (!piece || colorOf(piece) !== turn) continue;
    const symbol = symbolOf(piece);
    const file = fileOf(from);
    const rank = rankIndexOf(from);

    const base = (to: number, captured: PieceSymbol | null): Move => ({
      from,
      to,
      piece: symbol,
      color: turn,
      captured,
      promotion: null,
      enPassant: false,
      castle: null,
      doublePush: false,
    });

    if (symbol === 'p') {
      const forward = turn === 'w' ? -1 : 1;
      const startRank = turn === 'w' ? 6 : 1;
      const oneRank = rank + forward;
      if (onBoard(file, oneRank) && !board[squareAt(file, oneRank)]) {
        pushMove(moves, base(squareAt(file, oneRank), null));
        const twoRank = rank + forward * 2;
        if (rank === startRank && onBoard(file, twoRank) && !board[squareAt(file, twoRank)]) {
          moves.push({ ...base(squareAt(file, twoRank), null), doublePush: true });
        }
      }
      for (const df of [-1, 1]) {
        const captureFile = file + df;
        if (!onBoard(captureFile, oneRank)) continue;
        const to = squareAt(captureFile, oneRank);
        const target = board[to];
        if (target && colorOf(target) === them) {
          pushMove(moves, base(to, symbolOf(target)));
        } else if (!target && position.ep === to) {
          moves.push({ ...base(to, 'p'), enPassant: true });
        }
      }
      continue;
    }

    if (symbol === 'n' || symbol === 'k') {
      const steps = symbol === 'n' ? KNIGHT_STEPS : KING_STEPS;
      for (const [df, dr] of steps) {
        const toFile = file + df;
        const toRank = rank + dr;
        if (!onBoard(toFile, toRank)) continue;
        const to = squareAt(toFile, toRank);
        const target = board[to];
        if (target && colorOf(target) === turn) continue;
        moves.push(base(to, target ? symbolOf(target) : null));
      }
      if (symbol === 'k') {
        const homeRank = turn === 'w' ? 7 : 0;
        const rights = turn === 'w' ? { king: 'K', queen: 'Q' } : { king: 'k', queen: 'q' };
        if (from === squareAt(4, homeRank) && !isSquareAttacked(board, from, them)) {
          if (
            position.castling.includes(rights.king)
            && !board[squareAt(5, homeRank)]
            && !board[squareAt(6, homeRank)]
            && symbolOf(board[squareAt(7, homeRank)] ?? '') === 'r'
            && !isSquareAttacked(board, squareAt(5, homeRank), them)
          ) {
            moves.push({ ...base(squareAt(6, homeRank), null), castle: 'k' });
          }
          if (
            position.castling.includes(rights.queen)
            && !board[squareAt(3, homeRank)]
            && !board[squareAt(2, homeRank)]
            && !board[squareAt(1, homeRank)]
            && symbolOf(board[squareAt(0, homeRank)] ?? '') === 'r'
            && !isSquareAttacked(board, squareAt(3, homeRank), them)
          ) {
            moves.push({ ...base(squareAt(2, homeRank), null), castle: 'q' });
          }
        }
      }
      continue;
    }

    const rays = symbol === 'r' ? ROOK_RAYS : symbol === 'b' ? BISHOP_RAYS : [...ROOK_RAYS, ...BISHOP_RAYS];
    for (const [df, dr] of rays) {
      let toFile = file + df;
      let toRank = rank + dr;
      while (onBoard(toFile, toRank)) {
        const to = squareAt(toFile, toRank);
        const target = board[to];
        if (!target) {
          moves.push(base(to, null));
        } else {
          if (colorOf(target) !== turn) moves.push(base(to, symbolOf(target)));
          break;
        }
        toFile += df;
        toRank += dr;
      }
    }
  }

  return moves;
}

/** Apply a move and return the new position. The move must come from
 * `generateMoves`/`generatePseudoMoves` for this position. */
export function applyMove(position: Position, move: Move): Position {
  const board = position.board.slice();
  const moving = board[move.from]!;
  board[move.from] = null;

  if (move.enPassant) {
    const captureRank = rankIndexOf(move.to) + (move.color === 'w' ? 1 : -1);
    board[squareAt(fileOf(move.to), captureRank)] = null;
  }

  if (move.promotion) {
    board[move.to] = move.color === 'w' ? move.promotion.toUpperCase() : move.promotion;
  } else {
    board[move.to] = moving;
  }

  if (move.castle) {
    const homeRank = move.color === 'w' ? 7 : 0;
    const rookFrom = squareAt(move.castle === 'k' ? 7 : 0, homeRank);
    const rookTo = squareAt(move.castle === 'k' ? 5 : 3, homeRank);
    board[rookTo] = board[rookFrom];
    board[rookFrom] = null;
  }

  // Castling rights fall away when a king or a rook leaves home, and when a
  // rook is captured on its home square.
  let castling = position.castling;
  const drop = (letters: string) => {
    for (const letter of letters) castling = castling.replace(letter, '');
  };
  if (move.piece === 'k') drop(move.color === 'w' ? 'KQ' : 'kq');
  if (move.from === 63 || move.to === 63) drop('K');
  if (move.from === 56 || move.to === 56) drop('Q');
  if (move.from === 7 || move.to === 7) drop('k');
  if (move.from === 0 || move.to === 0) drop('q');

  const ep = move.doublePush
    ? squareAt(fileOf(move.from), (rankIndexOf(move.from) + rankIndexOf(move.to)) / 2)
    : null;

  return {
    board,
    turn: opposite(position.turn),
    castling,
    ep,
    halfmove: move.piece === 'p' || move.captured ? 0 : position.halfmove + 1,
    fullmove: position.turn === 'b' ? position.fullmove + 1 : position.fullmove,
  };
}

/** Every legal move for the side to move. */
export function generateMoves(position: Position): Move[] {
  const color = position.turn;
  return generatePseudoMoves(position).filter((move) => {
    const next = applyMove(position, move);
    const king = kingSquare(next.board, color);
    return king >= 0 && !isSquareAttacked(next.board, king, opposite(color));
  });
}

/** "e2e4", "e7e8q" — the notation the Lichess puzzle database uses. */
export function toUci(move: Move): string {
  return `${squareName(move.from)}${squareName(move.to)}${move.promotion ?? ''}`;
}

/** Resolve a UCI string against a position, or null when it is not legal there. */
export function moveFromUci(position: Position, uci: string): Move | null {
  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) return null;
  const from = squareIndex(uci.slice(0, 2));
  const to = squareIndex(uci.slice(2, 4));
  if (from === null || to === null) return null;
  const promotion = uci.length === 5 ? (uci[4] as PieceSymbol) : null;
  return generateMoves(position).find(
    (move) => move.from === from && move.to === to && (move.promotion ?? null) === promotion,
  ) ?? null;
}

/** Standard algebraic notation, with disambiguation and a check/mate suffix. */
export function toSan(position: Position, move: Move): string {
  if (move.castle) {
    return `${move.castle === 'k' ? 'O-O' : 'O-O-O'}${checkSuffix(position, move)}`;
  }

  let san: string;
  if (move.piece === 'p') {
    san = move.captured ? `${FILES[fileOf(move.from)]}x${squareName(move.to)}` : squareName(move.to);
    if (move.promotion) san += `=${move.promotion.toUpperCase()}`;
  } else {
    const rivals = generateMoves(position).filter(
      (other) =>
        other.piece === move.piece
        && other.to === move.to
        && other.from !== move.from,
    );
    let disambiguation = '';
    if (rivals.length > 0) {
      const sameFile = rivals.some((other) => fileOf(other.from) === fileOf(move.from));
      const sameRank = rivals.some((other) => rankIndexOf(other.from) === rankIndexOf(move.from));
      if (!sameFile) disambiguation = FILES[fileOf(move.from)]!;
      else if (!sameRank) disambiguation = String(8 - rankIndexOf(move.from));
      else disambiguation = squareName(move.from);
    }
    san = `${move.piece.toUpperCase()}${disambiguation}${move.captured ? 'x' : ''}${squareName(move.to)}`;
  }
  return `${san}${checkSuffix(position, move)}`;
}

function checkSuffix(position: Position, move: Move): string {
  const next = applyMove(position, move);
  if (!inCheck(next, next.turn)) return '';
  return generateMoves(next).length === 0 ? '#' : '+';
}

/** A position is playable when both kings are on the board and the side that
 * has just moved is not left in check. Import rejects anything else rather
 * than building a question around a position that cannot occur. */
export function positionIsPlayable(position: Position): boolean {
  const whiteKings = position.board.filter((piece) => piece === 'K').length;
  const blackKings = position.board.filter((piece) => piece === 'k').length;
  if (whiteKings !== 1 || blackKings !== 1) return false;
  if (inCheck(position, opposite(position.turn))) return false;
  // A pawn may never stand on the first or the last rank.
  for (let square = 0; square < 64; square++) {
    const piece = position.board[square];
    if (!piece || symbolOf(piece) !== 'p') continue;
    const rankIndex = rankIndexOf(square);
    if (rankIndex === 0 || rankIndex === 7) return false;
  }
  return true;
}

/** Node count at a fixed depth — the standard way to prove a move generator
 * is right, because published perft numbers for known positions leave no room
 * for a plausible-looking bug. */
export function perft(position: Position, depth: number): number {
  if (depth <= 0) return 1;
  const moves = generateMoves(position);
  if (depth === 1) return moves.length;
  let nodes = 0;
  for (const move of moves) nodes += perft(applyMove(position, move), depth - 1);
  return nodes;
}

/** Pieces of one colour, ordered king → queen → rook → bishop → knight → pawn
 * and then by square, as a chess player would read a position out loud. */
export function describePieces(position: Position, color: Color): string[] {
  const order: PieceSymbol[] = ['k', 'q', 'r', 'b', 'n', 'p'];
  const out: string[] = [];
  for (const symbol of order) {
    const squares: number[] = [];
    for (let square = 0; square < 64; square++) {
      const piece = position.board[square];
      if (piece && colorOf(piece) === color && symbolOf(piece) === symbol) squares.push(square);
    }
    squares.sort((a, b) => {
      const fileDiff = fileOf(a) - fileOf(b);
      return fileDiff !== 0 ? fileDiff : rankIndexOf(b) - rankIndexOf(a);
    });
    for (const square of squares) {
      out.push(symbol === 'p' ? squareName(square) : `${symbol.toUpperCase()}${squareName(square)}`);
    }
  }
  return out;
}

export const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
