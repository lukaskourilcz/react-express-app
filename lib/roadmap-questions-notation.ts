// Reading & Writing Chess (notation) roadmap questions (80): 10 levels × 8,
// easiest → hardest. Covers algebraic notation: squares, piece letters, moves,
// captures, castling, check/mate symbols, disambiguation, game scores and FEN.

import type { Seed } from './roadmap-build';

export const notationSeeds: Seed[] = [
  // ── Level 1 — Naming the Squares ──────────────────────────────────────
  { q: 'How is a square named in algebraic notation?', opts: ['Rank number, then file letter', 'File letter, then rank number', 'File letter only', 'Rank number only'], a: 1, e: 'A square is named by its file letter (a–h) followed by its rank number (1–8), e.g. e4.', tags: ['Chess', 'Notation'] },
  { q: 'In the square name "e4", what does the "e" refer to?', opts: ['The file (column)', 'The rank (row)', 'The piece', 'The player'], a: 0, e: 'The letter is the file (column); the number is the rank (row).', tags: ['Chess', 'Notation'] },
  { q: 'How many files (columns) does a chessboard have?', opts: ['6', '7', '8', '16'], a: 2, e: 'There are eight files, labelled a through h.', tags: ['Chess', 'Notation'] },
  { q: 'Which letters label the files of the board?', opts: ['a through h', 'a through g', 'p through w', '1 through 8'], a: 0, e: 'Files run a, b, c, d, e, f, g, h from White’s left to right.', tags: ['Chess', 'Notation'] },
  { q: 'From White’s point of view, which square sits in the bottom-left corner?', opts: ['h1', 'h8', 'a8', 'a1'], a: 3, e: 'a1 is the bottom-left square from White’s side, and it is a dark square.', tags: ['Chess', 'Notation'] },
  { q: 'How are the ranks (rows) of the board labelled?', opts: ['With letters a–h', 'With numbers 1–8', 'With numbers 0–7', 'With Roman numerals'], a: 1, e: 'Ranks are numbered 1 to 8, with rank 1 nearest White.', tags: ['Chess', 'Notation'] },
  { q: 'What colour is the a1 square?', opts: ['Dark', 'Light', 'It depends on the set', 'Neither'], a: 0, e: 'a1 is a dark square; the well-known reminder is that h1 (bottom-right for White) is light.', tags: ['Chess', 'Notation'] },
  { q: 'When reading a square name, which part comes first?', opts: ['The rank number', 'The colour', 'The file letter', 'The piece letter'], a: 2, e: 'The file letter always comes first, then the rank number — file then rank.', tags: ['Chess', 'Notation'] },

  // ── Level 2 — Piece Letters ───────────────────────────────────────────
  { q: 'Which letter stands for the king?', opts: ['G', 'K', 'Kg', 'Ki'], a: 1, e: 'K = king in English algebraic notation.', tags: ['Chess', 'Notation'] },
  { q: 'Which letter stands for the queen?', opts: ['Q', 'R', 'K', 'Qn'], a: 0, e: 'Q = queen.', tags: ['Chess', 'Notation'] },
  { q: 'Which letter stands for the knight?', opts: ['K', 'H', 'N', 'Kn'], a: 2, e: 'The knight is written N, because K is already taken by the king.', tags: ['Chess', 'Notation'] },
  { q: 'Which letter stands for the rook?', opts: ['C', 'Ro', 'Ck', 'R'], a: 3, e: 'R = rook.', tags: ['Chess', 'Notation'] },
  { q: 'Which letter stands for the bishop?', opts: ['B', 'Bi', 'S', 'P'], a: 0, e: 'B = bishop.', tags: ['Chess', 'Notation'] },
  { q: 'Why is the knight written "N" rather than "K"?', opts: ['Knights move in an N shape', 'Because K already stands for the king', 'It comes from French', 'It was chosen at random'], a: 1, e: 'K is reserved for the king, so the knight uses N.', tags: ['Chess', 'Notation'] },
  { q: 'Which piece has NO letter of its own in algebraic notation?', opts: ['The pawn', 'The king', 'The queen', 'The bishop'], a: 0, e: 'Pawns have no piece letter; a pawn move is written as just the destination square.', tags: ['Chess', 'Notation'] },
  { q: 'A pawn moving to e4 is written as:', opts: ['Pe4', 'P-e4', 'e4', 'pawn-e4'], a: 2, e: 'Because pawns have no letter, the move is simply the destination square, e4.', tags: ['Chess', 'Notation'] },

  // ── Level 3 — Writing a Move ──────────────────────────────────────────
  { q: 'A knight moving to f3 is written as:', opts: ['Kf3', 'KNf3', 'Nf3', 'nf3'], a: 2, e: 'Piece letter + destination: the knight to f3 is Nf3.', tags: ['Chess', 'Notation'] },
  { q: 'A bishop moving to e5 is written as:', opts: ['Be5', 'Bie5', 'e5B', 'eB5'], a: 0, e: 'Piece letter then square gives Be5.', tags: ['Chess', 'Notation'] },
  { q: 'A normal (non-capturing) piece move is made up of:', opts: ['Destination square only', 'Starting square only', 'Piece letter + destination square', 'Piece letter + starting square'], a: 2, e: 'A piece move names the piece and where it lands, e.g. Nf3 or Be5.', tags: ['Chess', 'Notation'] },
  { q: 'The queen moving to d2 is written as:', opts: ['Q2d', 'Qd2', 'Kd2', 'Dd2'], a: 1, e: 'Q for queen plus the square d2 gives Qd2.', tags: ['Chess', 'Notation'] },
  { q: 'White pushes a pawn to d4. How is it written?', opts: ['Pd4', 'P-d4', 'Dd4', 'd4'], a: 3, e: 'A pawn move is just the destination square: d4.', tags: ['Chess', 'Notation'] },
  { q: 'A rook moving to e1 is written as:', opts: ['1Re', 'Ke1', 'Re1', 're1'], a: 2, e: 'R plus the square e1 gives Re1.', tags: ['Chess', 'Notation'] },
  { q: 'The king moving to g1 (not castling) is written as:', opts: ['Gg1', 'Kig1', 'g1K', 'Kg1'], a: 3, e: 'K plus the square g1 gives Kg1.', tags: ['Chess', 'Notation'] },
  { q: 'What does a basic (non-capture) move record?', opts: ['Only the colour', 'Which piece moved and where it landed', 'Only which piece moved', 'How long the move took'], a: 1, e: 'It records the moving piece (letter, or nothing for a pawn) and its destination square.', tags: ['Chess', 'Notation'] },

  // ── Level 4 — Captures in Notation ────────────────────────────────────
  { q: 'Which symbol marks a capture?', opts: ['-', '/', '!', 'x'], a: 3, e: 'The letter x indicates a capture, e.g. Nxe5.', tags: ['Chess', 'Notation'] },
  { q: 'A knight capturing on e5 is written as:', opts: ['Nxe5', 'Nex5', 'xNe5', 'Ne5'], a: 0, e: 'Piece letter, x, then square: Nxe5.', tags: ['Chess', 'Notation'] },
  { q: 'A pawn on the e-file captures on d5. It is written as:', opts: ['xd5', 'exd5', 'ed5', 'Pxd5'], a: 1, e: 'A pawn capture names the pawn’s starting file first: exd5.', tags: ['Chess', 'Notation'] },
  { q: 'In "exd5", what does the leading "e" tell you?', opts: ['It is check', 'The queen moved', 'The capturing pawn came from the e-file', 'The rank number'], a: 2, e: 'For pawn captures the origin file replaces a piece letter, so "e" marks the e-file pawn.', tags: ['Chess', 'Notation'] },
  { q: 'A bishop capturing on f7 is written as:', opts: ['Bf7x', 'xBf7', 'B:f7', 'Bxf7'], a: 3, e: 'Piece, x, destination gives Bxf7.', tags: ['Chess', 'Notation'] },
  { q: 'How does a pawn capture differ from a piece capture in notation?', opts: ['A pawn capture begins with the capturing pawn’s file letter', 'Pawns cannot capture', 'A pawn capture uses the letter P', 'There is no difference'], a: 0, e: 'A pawn has no letter, so its capture starts with its origin file, e.g. exd5.', tags: ['Chess', 'Notation'] },
  { q: 'A rook capturing on a8 is written as:', opts: ['Rax8', 'Rxa8', 'xRa8', 'Ra8'], a: 1, e: 'R, x, then a8 gives Rxa8.', tags: ['Chess', 'Notation'] },
  { q: 'Besides "x", which symbol is sometimes used for a capture in older notation?', opts: ['+', '=', 'the colon ":"', '#'], a: 2, e: 'A colon (e.g. Ne5: or e:d5) has historically been used to mark captures.', tags: ['Chess', 'Notation'] },

  // ── Level 5 — Castling & Special Notation ─────────────────────────────
  { q: 'Which of these is kingside castling?', opts: ['0-0-0', 'K-O', 'O-O', 'castle-K'], a: 2, e: 'Kingside castling is written O-O (two O’s).', tags: ['Chess', 'Notation'] },
  { q: 'Which of these is queenside castling?', opts: ['O-O', 'C-Q', '0-0', 'O-O-O'], a: 3, e: 'Queenside castling is written O-O-O (three O’s).', tags: ['Chess', 'Notation'] },
  { q: 'A pawn promoting to a queen on e8 is written as:', opts: ['e8Q', 'e8=Q', 'Qe8', 'e8(Q)'], a: 1, e: 'Promotion uses "=": e8=Q means the pawn reaches e8 and becomes a queen.', tags: ['Chess', 'Notation'] },
  { q: 'What does the "=" mean in "e8=Q"?', opts: ['The pawn promotes (here to a queen)', 'Check', 'A capture', 'Castling'], a: 0, e: 'The "=" marks promotion, and the letter after it is the new piece.', tags: ['Chess', 'Notation'] },
  { q: 'An en passant capture is sometimes marked with:', opts: ['ep.', 'pp', 'e.p.', 'x.p.'], a: 2, e: 'The tag "e.p." is sometimes appended to an en passant capture.', tags: ['Chess', 'Notation'] },
  { q: 'Castling notation is built from which character?', opts: ['The letter C', 'The letter K', 'A slash', 'The letter O (or the digit 0)'], a: 3, e: 'Castling uses the letter O — O-O and O-O-O — though the digit 0 is sometimes seen.', tags: ['Chess', 'Notation'] },
  { q: 'Kingside castling uses two O’s; queenside castling uses how many?', opts: ['Three', 'One', 'Two', 'Four'], a: 0, e: 'Queenside is O-O-O — three O’s — because the king travels further.', tags: ['Chess', 'Notation'] },
  { q: 'A pawn promoting to a knight on b1 is written as:', opts: ['b1=K', 'b1=N', 'Nb1', 'b1N'], a: 1, e: 'The square, then "=", then the new piece letter: b1=N.', tags: ['Chess', 'Notation'] },

  // ── Level 6 — Check & Checkmate Symbols ───────────────────────────────
  { q: 'Which symbol means check?', opts: ['#', '+', '!', '='], a: 1, e: 'A "+" after a move means it gives check.', tags: ['Chess', 'Notation'] },
  { q: 'Which symbol means checkmate?', opts: ['+', '!', 'x', '#'], a: 3, e: 'Checkmate is written "#" (or sometimes "++").', tags: ['Chess', 'Notation'] },
  { q: 'What does "Qh5+" mean?', opts: ['Queen moves to h5 and gives check', 'Checkmate', 'A capture on h5', 'A blunder'], a: 0, e: 'The "+" shows the queen’s move to h5 delivers check.', tags: ['Chess', 'Notation'] },
  { q: 'What does "Rd8#" mean?', opts: ['Check only', 'A draw', 'Checkmate delivered on d8', 'Castling'], a: 2, e: 'The "#" marks checkmate — the rook to d8 ends the game.', tags: ['Chess', 'Notation'] },
  { q: 'Besides "#", checkmate is sometimes written as:', opts: ['**', '++', '--', '//'], a: 1, e: '"++" is an alternative symbol for checkmate.', tags: ['Chess', 'Notation'] },
  { q: 'Does a check symbol change the piece/destination part of the move?', opts: ['Yes, it replaces the destination', 'Yes, it changes the file', 'Only for pawns', 'No, it is simply appended after the move'], a: 3, e: 'The "+" (or "#") is added at the end; the move itself is written as usual.', tags: ['Chess', 'Notation'] },
  { q: 'What does "e8=Q+" mean?', opts: ['A pawn promotes to a queen, giving check', 'An ordinary queen move', 'An en passant capture', 'Checkmate'], a: 0, e: 'The pawn reaches e8, promotes to a queen (=Q), and the new queen gives check (+).', tags: ['Chess', 'Notation'] },
  { q: 'Where does the "+" belong within a move?', opts: ['At the very start', 'Between the piece and the square', 'At the end of the move', 'It replaces the "x"'], a: 2, e: 'Check and mate symbols come last, after the piece, capture and destination.', tags: ['Chess', 'Notation'] },

  // ── Level 7 — Disambiguation ──────────────────────────────────────────
  { q: 'When two identical pieces can reach the same square, notation adds:', opts: ['nothing', 'the colour', 'the origin file or rank', 'a plus sign'], a: 2, e: 'You add the starting file or rank (or full square) to show which piece moved.', tags: ['Chess', 'Notation'] },
  { q: 'What does "Rad1" mean?', opts: ['The rook on the a-file moves to d1', 'The rook moves to a square called a-d1', 'Either rook moves to d1', 'A rook captures on d1'], a: 0, e: 'The extra "a" disambiguates: it is the a-file rook that goes to d1.', tags: ['Chess', 'Notation'] },
  { q: 'In "R1d1", the "1" disambiguates by:', opts: ['file', 'rank (the rook on the 1st rank)', 'colour', 'the clock'], a: 1, e: 'When the file cannot tell them apart, the rank is used: R1d1 is the rook on rank 1.', tags: ['Chess', 'Notation'] },
  { q: 'If neither the file nor the rank alone is enough, you write:', opts: ['just the piece letter', 'two piece letters', 'a hyphen', 'the full origin square, e.g. Qh4e1'], a: 3, e: 'When needed, the complete starting square is given, e.g. Qh4e1.', tags: ['Chess', 'Notation'] },
  { q: 'Knights sit on c3 and g3; both can reach e4. The c3 knight moving there is:', opts: ['Nce4', 'Nge4', 'Ne4', 'N3e4'], a: 0, e: 'Adding the origin file "c" gives Nce4 for the knight from c3.', tags: ['Chess', 'Notation'] },
  { q: 'Why is disambiguation needed?', opts: ['To look tidy', 'So the move is unambiguous when two like pieces can reach the square', 'To indicate check', 'To show castling'], a: 1, e: 'It ensures the reader knows exactly which of two identical pieces moved.', tags: ['Chess', 'Notation'] },
  { q: 'What is the preferred order for disambiguation?', opts: ['Rank first, then file', 'Colour first', 'Always the full square', 'File first, then rank only if the file is not enough'], a: 3, e: 'You use the file first; if that still does not distinguish, you use the rank; then the full square.', tags: ['Chess', 'Notation'] },
  { q: 'What does "Qh4e1" specify?', opts: ['File only', 'Rank only', 'The full origin square h4', 'Nothing extra'], a: 2, e: 'Both file and rank are given, naming the exact starting square h4.', tags: ['Chess', 'Notation'] },

  // ── Level 8 — Reading a Game Score ────────────────────────────────────
  { q: 'A game score is written as:', opts: ['a single number', 'numbered move pairs, White’s move then Black’s', 'only White’s moves', 'moves in random order'], a: 1, e: 'Scores use numbered pairs: "1. e4 e5 2. Nf3 Nc6", White then Black.', tags: ['Chess', 'Notation'] },
  { q: 'In "1. e4 e5", what is Black’s move?', opts: ['1', 'Nf3', 'e4', 'e5'], a: 3, e: 'Within a pair the second move is Black’s: here e5.', tags: ['Chess', 'Notation'] },
  { q: 'In "2. Nf3 Nc6", whose move is "Nf3"?', opts: ['White', 'Black', 'Both', 'Neither'], a: 0, e: 'The first move of each numbered pair is White’s.', tags: ['Chess', 'Notation'] },
  { q: 'The result "1-0" means:', opts: ['Black wins', 'A draw', 'White wins', 'The game is ongoing'], a: 2, e: '1-0 records a win for White.', tags: ['Chess', 'Notation'] },
  { q: 'The result "0-1" means:', opts: ['White wins', 'Black wins', 'A draw', 'Stalemate'], a: 1, e: '0-1 records a win for Black.', tags: ['Chess', 'Notation'] },
  { q: 'A drawn game is recorded as:', opts: ['1-0', '0-1', '½-½', '1-1'], a: 2, e: 'A draw is written ½-½ (half a point each).', tags: ['Chess', 'Notation'] },
  { q: 'In "3. Bb5 a6", how many moves are shown?', opts: ['One', 'Three', 'Four', 'Two — White’s Bb5 and Black’s a6'], a: 3, e: 'The pair holds White’s move (Bb5) and Black’s reply (a6).', tags: ['Chess', 'Notation'] },
  { q: 'In "4. O-O", what does the number before the dot mean?', opts: ['The move number', 'The rank', 'The piece', 'The score'], a: 0, e: 'The number is the move number; the dot separates it from the moves.', tags: ['Chess', 'Notation'] },

  // ── Level 9 — FEN & Setup Notation ────────────────────────────────────
  { q: 'What does a FEN string describe?', opts: ['A single move', 'A whole game', 'A complete board position at one moment', 'An opening name'], a: 2, e: 'FEN (Forsyth–Edwards Notation) records one exact position, not a sequence of moves.', tags: ['Chess', 'Notation'] },
  { q: 'In FEN, uppercase letters represent:', opts: ['White pieces', 'Black pieces', 'Empty squares', 'Ranks'], a: 0, e: 'Uppercase letters are White’s pieces (e.g. R, N, B, Q, K, P).', tags: ['Chess', 'Notation'] },
  { q: 'In FEN, lowercase letters represent:', opts: ['White pieces', 'Castling rights', 'The halfmove clock', 'Black pieces'], a: 3, e: 'Lowercase letters are Black’s pieces (e.g. r, n, b, q, k, p).', tags: ['Chess', 'Notation'] },
  { q: 'In FEN, a digit such as "8" within a rank means:', opts: ['Eight pieces in a row', 'Eight empty squares in a row', 'Rank number 8', 'Eight moves played'], a: 1, e: 'Digits count consecutive empty squares, so "8" is a completely empty rank.', tags: ['Chess', 'Notation'] },
  { q: 'The FEN field that is "w" or "b" indicates:', opts: ['Who has won', 'The board width', 'Whose turn it is to move', 'A bishop’s position'], a: 2, e: 'That field is the side to move: w = White to move, b = Black to move.', tags: ['Chess', 'Notation'] },
  { q: 'What does "KQkq" record in a FEN string?', opts: ['The positions of the kings', 'Captured pieces', 'A check warning', 'The castling rights still available'], a: 3, e: 'KQkq lists castling rights: uppercase for White, lowercase for Black, K kingside and Q queenside.', tags: ['Chess', 'Notation'] },
  { q: 'The standard starting position FEN begins with:', opts: ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', '8/8/8/8/8/8/8/8 w - - 0 1', 'pppppppp/rnbqkbnr/8/8/8/8/RNBQKBNR/PPPPPPPP w', 'RNBQKBNR/PPPPPPPP/8/8/8/8/pppppppp/rnbqkbnr b'], a: 0, e: 'The start position is rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1.', tags: ['Chess', 'Notation'] },
  { q: 'In the piece-placement part of a FEN, ranks are separated by:', opts: ['Spaces', 'Commas', 'The "/" character', 'Dashes'], a: 2, e: 'A forward slash "/" separates each of the eight ranks.', tags: ['Chess', 'Notation'] },

  // ── Level 10 — Notation Mastery ───────────────────────────────────────
  { q: 'What does "O-O-O+" mean?', opts: ['Kingside castling', 'Checkmate', 'A blunder', 'Queenside castling that gives check'], a: 3, e: 'O-O-O is queenside castling and the "+" shows it delivers check.', tags: ['Chess', 'Notation'] },
  { q: 'What does "exd8=Q#" mean?', opts: ['A pawn from the e-file captures on d8, promotes to a queen, and it is checkmate', 'A quiet pawn push to d8', 'Queenside castling', 'En passant with no promotion'], a: 0, e: 'exd8 is a pawn capture to d8, =Q promotes it to a queen, and # marks checkmate.', tags: ['Chess', 'Notation'] },
  { q: 'The annotation "!!" means:', opts: ['A blunder', 'A mistake', 'A brilliant move', 'A routine move'], a: 2, e: '"!!" marks a brilliant move; "!" is a good move.', tags: ['Chess', 'Notation'] },
  { q: 'The annotation "??" means:', opts: ['A good move', 'A blunder', 'A brilliant move', 'Check'], a: 1, e: '"??" marks a blunder; "?" is a lesser mistake.', tags: ['Chess', 'Notation'] },
  { q: 'In the FEN ending "... w KQkq - 0 1", what is the final "1"?', opts: ['The halfmove clock', 'The en passant square', 'The fullmove number', 'Castling rights'], a: 2, e: 'The last field is the fullmove number; the "0" before it is the halfmove clock.', tags: ['Chess', 'Notation'] },
  { q: 'What does "Nbd7" tell you?', opts: ['The knight on the b-file moves to d7', 'A knight moves to a square called b-d7', 'Two knights move at once', 'A knight captures on d7'], a: 0, e: 'The "b" disambiguates: the knight from the b-file moves to d7.', tags: ['Chess', 'Notation'] },
  { q: 'What does "1... c5" (with three dots) indicate?', opts: ['White’s first move', 'Move number 111', 'A capture', 'Black’s first move, shown on its own'], a: 3, e: 'Three dots show a Black move written without the preceding White move.', tags: ['Chess', 'Notation'] },
  { q: 'What elements does "Rxe8+" combine?', opts: ['Only a capture', 'A rook captures on e8 with check — piece, capture, destination and check', 'Castling and check', 'A promotion'], a: 1, e: 'R is the rook, x is a capture, e8 is the destination, and + shows it gives check.', tags: ['Chess', 'Notation'] },
];
