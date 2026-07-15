// How the Pieces Move roadmap questions (80): 10 levels × 8, easiest → hardest.
// Covers how each piece moves and captures, relative piece values, attacks, and
// piece coordination.

import type { Seed } from './roadmap-build';

export const piecesSeeds: Seed[] = [
  // ── Level 1 — The Pawn ────────────────────────────────────────────────
  { q: 'Which direction does a pawn move?', opts: ['Backward','Forward','Sideways','Diagonally backward'], a: 1, e: 'Pawns only ever move forward, toward the opponent.', tags: ['Chess','Pieces'] },
  { q: 'How many squares may a pawn advance on its very first move?', opts: ['One only','One or two','Two only','Three'], a: 1, e: 'On its first move a pawn may advance either one or two squares.', tags: ['Chess','Pieces'] },
  { q: 'How does a pawn capture an enemy piece?', opts: ['Straight forward','One square diagonally forward','Sideways','Straight backward'], a: 1, e: 'A pawn captures one square diagonally forward, not straight ahead.', tags: ['Chess','Pieces'] },
  { q: 'Can a pawn ever move backward?', opts: ['Yes, one square','Yes, when capturing','No, never','Only from its start'], a: 2, e: 'A pawn can never move backward under any circumstance.', tags: ['Chess','Pieces'] },
  { q: 'After a pawn has already moved once, how far can it advance?', opts: ['One square','Two squares','Three squares','Any number'], a: 0, e: 'After its first move a pawn advances only one square at a time.', tags: ['Chess','Pieces'] },
  { q: 'A white pawn stands on e2. Which is a legal first move?', opts: ['e1','e5','e4','d3'], a: 2, e: 'From its start it may go to e3 or e4; e4 is the two-square advance.', tags: ['Chess','Pieces'] },
  { q: 'An enemy piece sits directly in front of a pawn. Can the pawn capture it?', opts: ['Yes, straight ahead','No, pawns capture diagonally','Yes, by jumping','Only on the first move'], a: 1, e: 'A pawn cannot capture straight ahead; it is blocked and captures only diagonally.', tags: ['Chess','Pieces'] },
  { q: 'How many squares diagonally forward can a pawn capture?', opts: ['One','Two','Any number','None'], a: 0, e: 'A pawn captures exactly one square diagonally forward.', tags: ['Chess','Pieces'] },

  // ── Level 2 — The Rook ────────────────────────────────────────────────
  { q: 'In which directions can a rook move?', opts: ['Diagonally only','Horizontally and vertically','In an L-shape','One square any way'], a: 1, e: 'The rook moves any number of squares horizontally or vertically.', tags: ['Chess','Pieces'] },
  { q: 'How many squares can a rook travel in a single move?', opts: ['One','Two','Any number, if the path is clear','Exactly three'], a: 2, e: 'A rook can move any number of squares along a rank or file if unobstructed.', tags: ['Chess','Pieces'] },
  { q: 'Can a rook move diagonally?', opts: ['Yes','No','Only when capturing','Only on the first move'], a: 1, e: 'A rook never moves diagonally; that is the bishop\'s domain.', tags: ['Chess','Pieces'] },
  { q: 'A rook on a1 wants to reach h1. What kind of move is that?', opts: ['Diagonal','Along a rank','Along a file','An L-shape'], a: 1, e: 'a1 to h1 travels along the first rank, a horizontal rook move.', tags: ['Chess','Pieces'] },
  { q: 'A rook on d1 moves to d8. This move is along a…', opts: ['Rank','File','Diagonal','Knight path'], a: 1, e: 'd1 to d8 runs up the d-file, a vertical rook move.', tags: ['Chess','Pieces'] },
  { q: 'A friendly pawn blocks the rook\'s path. What happens?', opts: ['The rook jumps it','The rook stops before it','The rook captures it','The rook still passes'], a: 1, e: 'A rook cannot jump; it must stop before a friendly piece.', tags: ['Chess','Pieces'] },
  { q: 'How does a rook capture an enemy piece?', opts: ['Diagonally','By landing on its square along a rank or file','By jumping over it','Only forward'], a: 1, e: 'A rook captures by moving onto the enemy piece\'s square along its line.', tags: ['Chess','Pieces'] },
  { q: 'On an empty board, how many squares does a rook attack from any square?', opts: ['8','14','21','27'], a: 1, e: 'A rook always covers 14 squares: 7 along its rank and 7 along its file.', tags: ['Chess','Pieces'] },

  // ── Level 3 — The Bishop ──────────────────────────────────────────────
  { q: 'In which direction does a bishop move?', opts: ['Horizontally','Vertically','Diagonally','In an L-shape'], a: 2, e: 'A bishop moves any number of squares diagonally.', tags: ['Chess','Pieces'] },
  { q: 'A bishop that starts on a light square can move to…', opts: ['Only light squares','Only dark squares','Any square','Both colors equally'], a: 0, e: 'A bishop stays on one color for the entire game.', tags: ['Chess','Pieces'] },
  { q: 'Can a bishop ever change the color of the squares it moves on?', opts: ['Yes, when capturing','Yes, on the first move','No, never','Only near the edge'], a: 2, e: 'Because it moves diagonally, a bishop can never switch square colors.', tags: ['Chess','Pieces'] },
  { q: 'How far can a bishop move along a clear diagonal?', opts: ['One square','Two squares','Any number of squares','Three squares'], a: 2, e: 'A bishop travels any number of unobstructed diagonal squares.', tags: ['Chess','Pieces'] },
  { q: 'A bishop on c1 moves to h6. This is a…', opts: ['Rank move','File move','Diagonal move','Knight move'], a: 2, e: 'c1 to h6 runs along a diagonal, the bishop\'s only kind of move.', tags: ['Chess','Pieces'] },
  { q: 'Why is a bishop sometimes called a "color-bound" piece?', opts: ['It can only capture its color','It stays on one color of square','It changes color when it moves','It only likes bright squares'], a: 1, e: 'A bishop is color-bound because it is confined to squares of a single color.', tags: ['Chess','Pieces'] },
  { q: 'How does a bishop capture?', opts: ['Straight ahead','By jumping a piece','By landing diagonally on the enemy square','Sideways'], a: 2, e: 'A bishop captures by moving diagonally onto the enemy piece\'s square.', tags: ['Chess','Pieces'] },
  { q: 'A player has both bishops. Together they can reach…', opts: ['Only light squares','Only dark squares','Squares of both colors','Only the center'], a: 2, e: 'One bishop covers light squares and the other dark, so the pair covers both colors.', tags: ['Chess','Pieces'] },

  // ── Level 4 — The Knight ──────────────────────────────────────────────
  { q: 'What shape describes the knight\'s move?', opts: ['A straight line','An L-shape','A diagonal','A circle'], a: 1, e: 'The knight moves in an L: two squares one way and one square perpendicular.', tags: ['Chess','Pieces'] },
  { q: 'Which piece is the only one that can jump over other pieces?', opts: ['The rook','The bishop','The knight','The queen'], a: 2, e: 'The knight is the only piece that leaps over intervening pieces.', tags: ['Chess','Pieces'] },
  { q: 'A knight is surrounded by friendly pawns. Can it still move out?', opts: ['No, it is trapped','Yes, it jumps over them','Only by capturing','Only forward'], a: 1, e: 'The knight jumps, so surrounding pieces do not block its move.', tags: ['Chess','Pieces'] },
  { q: 'How many squares does a knight land away from its start each move?', opts: ['Exactly one','Two along one axis, one along the other','Any number','Three in a line'], a: 1, e: 'A knight always moves two squares one direction and one square at a right angle.', tags: ['Chess','Pieces'] },
  { q: 'A knight on b1 can legally move to…', opts: ['b3','a3','c1','d1'], a: 1, e: 'From b1 the knight reaches a3, c3, or d2; a3 is one of them.', tags: ['Chess','Pieces'] },
  { q: 'What color square does a knight land on relative to its starting square?', opts: ['The same color','The opposite color','Always light','Always dark'], a: 1, e: 'Every knight move switches to a square of the opposite color.', tags: ['Chess','Pieces'] },
  { q: 'How does a knight capture an enemy piece?', opts: ['By sliding into it','By jumping onto its square at the end of the L','Diagonally only','It cannot capture'], a: 1, e: 'A knight captures whatever piece sits on the square where its L-move ends.', tags: ['Chess','Pieces'] },
  { q: 'Does a knight capture the pieces it jumps over?', opts: ['Yes, all of them','Only the last one','No, only the piece it lands on','Only enemy pawns'], a: 2, e: 'A knight captures only the piece on its landing square, not those it leaps over.', tags: ['Chess','Pieces'] },

  // ── Level 5 — The Queen ───────────────────────────────────────────────
  { q: 'The queen moves like which two pieces combined?', opts: ['Rook and knight','Bishop and knight','Rook and bishop','King and pawn'], a: 2, e: 'The queen combines the rook\'s straight lines and the bishop\'s diagonals.', tags: ['Chess','Pieces'] },
  { q: 'In how many directions can a queen move?', opts: ['Only straight','Only diagonal','Any straight line: horizontal, vertical, or diagonal','Only forward'], a: 2, e: 'A queen moves any number of squares horizontally, vertically, or diagonally.', tags: ['Chess','Pieces'] },
  { q: 'How far can a queen move on a clear line?', opts: ['One square','Two squares','Any number of squares','Exactly four'], a: 2, e: 'The queen can slide any number of unobstructed squares along a line.', tags: ['Chess','Pieces'] },
  { q: 'Can the queen jump over pieces like a knight?', opts: ['Yes','No','Only diagonally','Only her first move'], a: 1, e: 'The queen cannot jump; only the knight can leap over pieces.', tags: ['Chess','Pieces'] },
  { q: 'A queen on d1 can move to a4. What kind of line is that?', opts: ['A file','A rank','A diagonal','An L-shape'], a: 2, e: 'd1 to a4 is a diagonal, one of the queen\'s legal lines.', tags: ['Chess','Pieces'] },
  { q: 'Which move is NOT possible for a queen?', opts: ['d1 to d8','d1 to h5','d1 to a1','d1 to e3 in an L-jump'], a: 3, e: 'The queen never moves in a knight\'s L; the other moves are all legal.', tags: ['Chess','Pieces'] },
  { q: 'On an empty board, the queen on a central square attacks up to about how many squares?', opts: ['8','14','21','27'], a: 3, e: 'From the center a queen can reach up to 27 squares, more than any other piece.', tags: ['Chess','Pieces'] },
  { q: 'Why is the queen the most powerful piece?', opts: ['It can jump','It combines rook and bishop movement','It moves twice per turn','It can move backward only'], a: 1, e: 'Its combined rook-and-bishop range makes the queen the strongest piece.', tags: ['Chess','Pieces'] },

  // ── Level 6 — The King ────────────────────────────────────────────────
  { q: 'How far can a king move in one turn?', opts: ['Any number of squares','One square','Two squares','Three squares'], a: 1, e: 'The king moves exactly one square in any direction.', tags: ['Chess','Pieces'] },
  { q: 'In which directions can the king move?', opts: ['Only straight','Only diagonal','Any direction, one square','Only forward'], a: 2, e: 'The king moves one square horizontally, vertically, or diagonally.', tags: ['Chess','Pieces'] },
  { q: 'Can a king move into a square attacked by an enemy piece?', opts: ['Yes','No, that would be moving into check','Only to capture','Only on the first move'], a: 1, e: 'A king may never move into check, so attacked squares are off-limits.', tags: ['Chess','Pieces'] },
  { q: 'A king on e1 can legally move to…', opts: ['e3','g1','d2','a1'], a: 2, e: 'One square away, d2 is a legal king move (assuming it is safe).', tags: ['Chess','Pieces'] },
  { q: 'How does the king capture?', opts: ['From any distance','By moving one square onto an undefended enemy piece','By jumping','It cannot capture'], a: 1, e: 'The king captures a piece one square away, provided that square is not defended.', tags: ['Chess','Pieces'] },
  { q: 'Why can\'t a king capture a defended enemy piece?', opts: ['Kings never capture','It would land in check','It is too far','Only queens defend'], a: 1, e: 'Capturing a defended piece would leave the king in check, which is illegal.', tags: ['Chess','Pieces'] },
  { q: 'Can the two kings ever stand on adjacent squares?', opts: ['Yes','No, they must stay a square apart','Only in the endgame','Only when castling'], a: 1, e: 'Kings can never be adjacent because each would be attacking the other.', tags: ['Chess','Pieces'] },
  { q: 'What makes the king unique compared to other pieces?', opts: ['It is the fastest','It can never be captured and must be kept safe','It jumps','It moves twice'], a: 1, e: 'The king is never captured; the whole game revolves around protecting it.', tags: ['Chess','Pieces'] },

  // ── Level 7 — Piece Values ────────────────────────────────────────────
  { q: 'What is the standard relative value of a pawn?', opts: ['1','3','5','9'], a: 0, e: 'A pawn is worth 1 point, the baseline of the value scale.', tags: ['Chess','Pieces'] },
  { q: 'What is the standard value of a knight?', opts: ['1','3','5','9'], a: 1, e: 'A knight is worth about 3 points.', tags: ['Chess','Pieces'] },
  { q: 'What is the standard value of a rook?', opts: ['3','5','9','1'], a: 1, e: 'A rook is worth about 5 points.', tags: ['Chess','Pieces'] },
  { q: 'What is the standard value of the queen?', opts: ['5','7','9','3'], a: 2, e: 'The queen is worth about 9 points, the highest of the counted pieces.', tags: ['Chess','Pieces'] },
  { q: 'Which two pieces are the "minor pieces"?', opts: ['Rook and queen','Bishop and knight','Pawn and king','Queen and king'], a: 1, e: 'Bishops and knights, each worth about 3, are the minor pieces.', tags: ['Chess','Pieces'] },
  { q: 'Which pieces are the "major pieces"?', opts: ['Bishop and knight','Rook and queen','Pawn and bishop','King and pawn'], a: 1, e: 'Rooks and queens are the major pieces because of their long-range power.', tags: ['Chess','Pieces'] },
  { q: 'What is the value of the king?', opts: ['9','5','Invaluable (infinite)','3'], a: 2, e: 'The king is invaluable; losing it ends the game, so it has infinite worth.', tags: ['Chess','Pieces'] },
  { q: 'Roughly how many pawns equal one rook in value?', opts: ['One','Three','Five','Nine'], a: 2, e: 'A rook (5) is worth about five pawns.', tags: ['Chess','Pieces'] },

  // ── Level 8 — Captures & Attacks ──────────────────────────────────────
  { q: 'A piece "attacks" a square when it…', opts: ['Stands on it','Could legally capture there next move','Has moved past it','Defends its own king there'], a: 1, e: 'A piece attacks a square if it could capture an enemy piece landing there.', tags: ['Chess','Pieces'] },
  { q: 'A knight sits on e4 in the center of an open board. It attacks how many squares?', opts: ['2','4','6','8'], a: 3, e: 'A centralized knight on e4 attacks up to 8 squares.', tags: ['Chess','Pieces'] },
  { q: 'A knight sits in the corner on a1. How many squares does it attack?', opts: ['2','3','4','8'], a: 0, e: 'From the a1 corner a knight attacks only 2 squares (b3 and c2).', tags: ['Chess','Pieces'] },
  { q: 'When you capture, your piece…', opts: ['Sits next to the enemy piece','Takes the enemy piece\'s square and removes it','Jumps back home','Splits into two'], a: 1, e: 'A capturing piece moves onto the enemy square and removes that piece from the board.', tags: ['Chess','Pieces'] },
  { q: 'A piece is "defended" when…', opts: ['It has never moved','A friendly piece could recapture on its square','It is a queen','It sits on the back rank'], a: 1, e: 'A piece is defended if a friendly piece could recapture should it be taken.', tags: ['Chess','Pieces'] },
  { q: 'Your bishop can capture the enemy rook, but a pawn guards the rook. Is the trade good by value?', opts: ['No, bishop 3 for rook 5 favors you','Yes only if forced','No, it loses material','Bishops cannot capture rooks'], a: 0, e: 'Giving a 3-point bishop to win a 5-point rook is a favorable trade even after recapture.', tags: ['Chess','Pieces'] },
  { q: 'Which move lets a rook on a1 capture an enemy piece on a7?', opts: ['A diagonal move','A straight move up the a-file','A knight jump','It cannot reach a7'], a: 1, e: 'The rook slides up the a-file and captures on a7 if the path is clear.', tags: ['Chess','Pieces'] },
  { q: 'A pawn on e5 can capture an enemy piece on which square?', opts: ['e6','d6 or f6','e4','d4 or f4'], a: 1, e: 'A pawn captures diagonally forward, so from e5 it takes on d6 or f6.', tags: ['Chess','Pieces'] },

  // ── Level 9 — Piece Coordination ──────────────────────────────────────
  { q: 'Two rooks on the same open file are said to be…', opts: ['Pinned','Doubled','Forked','Castled'], a: 1, e: 'Rooks stacked on one file are "doubled," combining their force.', tags: ['Chess','Pieces'] },
  { q: 'A knight attacks the enemy king and queen at once. This double attack is a…', opts: ['Pin','Skewer','Fork','Discovery'], a: 2, e: 'A single piece attacking two targets at once is a fork.', tags: ['Chess','Pieces'] },
  { q: 'Why do the bishop and knight cooperate well?', opts: ['They move identically','The bishop covers long diagonals while the knight covers squares it cannot','They both jump','They share one color'], a: 1, e: 'Their different movement patterns cover complementary squares.', tags: ['Chess','Pieces'] },
  { q: 'A queen and bishop lined up on the same diagonal aiming at the king form a…', opts: ['Battery','Fortress','Fork','Zugzwang'], a: 0, e: 'Two pieces aimed along one line at a target form a battery.', tags: ['Chess','Pieces'] },
  { q: 'Why is a bishop pair often valuable?', opts: ['They jump together','Together they control both light and dark squares','They are worth 9 each','They move sideways'], a: 1, e: 'Two bishops between them cover squares of both colors, controlling the whole board.', tags: ['Chess','Pieces'] },
  { q: 'A rook supports a friendly pawn from behind on the same file. This helps because…', opts: ['The pawn can jump','The rook defends the pawn as it advances','It pins the pawn','It forks the king'], a: 1, e: 'A rook behind its pawn defends the pawn while it marches forward.', tags: ['Chess','Pieces'] },
  { q: 'Two pieces "defend" each other when…', opts: ['They stand on the same square','Each could recapture on the other\'s square','They are both pawns','They never move'], a: 1, e: 'Mutually defended pieces each guard the square of the other.', tags: ['Chess','Pieces'] },
  { q: 'A knight and queen team up well because the queen covers lines and the knight…', opts: ['Also covers lines','Reaches squares by jumping that the queen cannot','Is worth more','Only defends pawns'], a: 1, e: 'The knight\'s jump reaches squares no sliding queen line can, complementing her.', tags: ['Chess','Pieces'] },

  // ── Level 10 — Movement Mastery ───────────────────────────────────────
  { q: 'Which piece could move from a1 to h8 in a single move on an empty board?', opts: ['Rook','Knight','Bishop or queen','King'], a: 2, e: 'a1 to h8 is a long diagonal, reachable by a bishop or queen.', tags: ['Chess','Pieces'] },
  { q: 'A single piece attacks squares of only one color for the entire game. Which piece?', opts: ['Rook','Bishop','Knight','Queen'], a: 1, e: 'The bishop is color-bound, forever controlling squares of one color.', tags: ['Chess','Pieces'] },
  { q: 'Rank the value order from lowest to highest.', opts: ['Pawn, rook, knight, queen','Pawn, knight, rook, queen','Knight, pawn, queen, rook','Rook, pawn, knight, queen'], a: 1, e: 'The scale runs pawn 1, knight 3, rook 5, queen 9.', tags: ['Chess','Pieces'] },
  { q: 'Which move is impossible for the listed piece?', opts: ['Queen d1–h5','Rook a1–a8','Bishop c1–a3','Knight b1–b4'], a: 3, e: 'A knight moves in an L; b1 to b4 is a straight three-square hop it cannot make.', tags: ['Chess','Pieces'] },
  { q: 'A queen on d4 and a rook on d1 both aim up the d-file. What are they forming?', opts: ['A fork','A battery on the d-file','A pin','A skewer'], a: 1, e: 'Two pieces stacked on one file aiming at a target form a battery.', tags: ['Chess','Pieces'] },
  { q: 'You can win a rook (5) by giving up a knight (3). Is this a good trade?', opts: ['No, avoid it','Yes, you gain material','Only if forced','Knights cannot take rooks'], a: 1, e: 'Trading a 3-point knight for a 5-point rook wins you 2 points of material.', tags: ['Chess','Pieces'] },
  { q: 'Which single piece, from an open central square, controls the most squares?', opts: ['Rook','Bishop','Knight','Queen'], a: 3, e: 'A centralized queen controls up to 27 squares, the most of any piece.', tags: ['Chess','Pieces'] },
  { q: 'Only one type of piece can never lose a step of range by being surrounded by pieces. Which?', opts: ['Rook','Bishop','Knight','Queen'], a: 2, e: 'The knight jumps, so nearby pieces never block its moves.', tags: ['Chess','Pieces'] },
];
