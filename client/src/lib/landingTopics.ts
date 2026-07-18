// Featured-topic data for the editorial landing (Home.tsx). Each subject
// surfaces a handful of "featured" topics on the landing's topic picker; the
// rest live behind the "And N more →" card that leads to /learn.
//
// Every entry carries REAL data pulled from the question bank + roadmap:
//   · `levels`   — the topic's first five level names (from the
//                  `// ── Level N — <Name> ──` markers in
//                  `lib/roadmap-questions-<topic>.ts`), shortened where the
//                  design shortens them (e.g. "Arrays: Basics" → "Arrays").
//   · `question` — the topic's real Level-1 sample question (first seed in
//                  the same file), shown in the "try one, no signup" card.
//
// The card logo is a bundled devicon (`CategoryGlyph`) for Web Dev tech, and a
// per-topic emoji for every other subject. Fin choreography is assigned per
// card so no two cards surface the same school (see FIN_SCHOOLS).

import type { SubjectId } from './subjects';

/** A single fin in a card's hover "school". */
export interface FinSpec {
  /** Glyph size in px. */
  size: number;
  /** Horizontal start (CSS left, e.g. '82%'). */
  left: string;
  /** Swim direction: 1 = left→right, -1 = right→left. */
  dir: 1 | -1;
  /** Crossing duration in seconds. */
  dur: number;
  /** Stagger delay in seconds. */
  delay: number;
  /** Add a slight roll while crossing. */
  rock?: boolean;
}

export interface LandingQuestion {
  text: string;
  /** Optional fenced code snippet shown above the options. */
  code?: string;
  opts: string[];
  /** Index of the correct option. */
  a: number;
  /** One-line explanation shown after answering. */
  e: string;
}

export interface LandingTopic {
  /** Topic id (also the quiz category). */
  id: string;
  name: string;
  blurb: string;
  /** Web Dev topics render a bundled devicon via CategoryGlyph; others an emoji. */
  emoji?: string;
  /** First five level names. */
  levels: string[];
  question: LandingQuestion;
  /** Per-card fin school (varies card to card). */
  fins: FinSpec[];
}

// A rotation of distinct fin schools, so successive cards never surface the
// same way. Web Dev uses the hand-authored schools below; other subjects draw
// from this palette by card index.
const SCHOOLS: FinSpec[][] = [
  [{ size: 42, left: '82%', dir: -1, dur: 2.0, delay: 0 }],
  [
    { size: 13, left: '6%', dir: 1, dur: 2.2, delay: 0 },
    { size: 10, left: '-2%', dir: 1, dur: 2.2, delay: 0.18 },
  ],
  [
    { size: 36, left: '86%', dir: -1, dur: 2.1, delay: 0 },
    { size: 14, left: '96%', dir: -1, dur: 2.1, delay: 0.15 },
    { size: 8, left: '101%', dir: -1, dur: 2.1, delay: 0.3 },
  ],
  [{ size: 56, left: '0%', dir: 1, dur: 2.8, delay: 0, rock: true }],
  [
    { size: 34, left: '84%', dir: -1, dur: 2.1, delay: 0 },
    { size: 10, left: '96%', dir: -1, dur: 2.1, delay: 0.3 },
  ],
  [
    { size: 12, left: '44%', dir: 1, dur: 1.8, delay: 0 },
    { size: 12, left: '50%', dir: -1, dur: 1.8, delay: 0 },
  ],
  [
    { size: 30, left: '78%', dir: -1, dur: 2.4, delay: 0, rock: true },
    { size: 11, left: '8%', dir: 1, dur: 2.4, delay: 0.2, rock: true },
  ],
];

/** Assign a distinct fin school to the card at position `i`. */
const school = (i: number): FinSpec[] => SCHOOLS[i % SCHOOLS.length];

// ─────────────────────────── Web Dev (devShark) ───────────────────────────
// Full real data (real level names + real Level-1 questions), matching the
// devShark landing reference. Logos come from CategoryGlyph (bundled devicon).
const WEBDEV: LandingTopic[] = [
  {
    id: 'javascript', name: 'JavaScript',
    blurb: 'The language of the web: syntax, functions, closures, async and the event loop.',
    levels: ['Values & Math', 'Strings', 'Booleans & Comparison', 'Arrays', 'Objects'],
    question: { text: 'What does this return?', code: '2 ** 3;', opts: ['6', '8', '9', '5'], a: 1, e: 'The ** operator is exponentiation: 2 to the power of 3 is 8.' },
    fins: SCHOOLS[0],
  },
  {
    id: 'typescript', name: 'TypeScript',
    blurb: 'Typed JavaScript: interfaces, generics, narrowing and safer refactors.',
    levels: ['Basic Types', 'Type Inference', 'Function Types', 'Arrays & Tuples', 'Object Types'],
    question: { text: 'What is the type of x?', code: 'let x: number = 5;', opts: ['number', 'string', 'any', '5'], a: 0, e: 'The annotation : number declares x as the number type.' },
    fins: SCHOOLS[1],
  },
  {
    id: 'react', name: 'React',
    blurb: 'Components, hooks, state and rendering — the modern frontend workhorse.',
    levels: ['JSX Basics', 'Components', 'Props', 'Rendering Lists', 'Conditional Rendering'],
    question: { text: 'What is rendered?', code: '<div>{2 + 2}</div>;', opts: ['"2 + 2"', '4', '{4}', 'an error'], a: 1, e: 'The expression inside braces is evaluated, so the div shows 4.' },
    fins: SCHOOLS[2],
  },
  {
    id: 'nextjs', name: 'Next.js',
    blurb: 'The React framework: routing, server components, rendering strategies.',
    levels: ['Next.js Basics', 'Routing (App Router)', 'Pages & Layouts', 'Navigation & Links', 'Server & Client Components'],
    question: { text: 'What is Next.js?', opts: ['A CSS framework', 'A React framework for production web apps', 'A database', 'A testing library'], a: 1, e: 'Next.js is a React framework that adds routing, rendering (SSR/SSG), and tooling for production apps.' },
    fins: SCHOOLS[3],
  },
  {
    id: 'nodejs', name: 'Node.js',
    blurb: 'JavaScript on the server: the runtime, modules, streams and APIs.',
    levels: ['Node Basics', 'Modules (CommonJS)', 'ES Modules', 'Globals & process', 'The Event Loop'],
    question: { text: 'Which JavaScript engine powers Node.js?', opts: ['SpiderMonkey', 'Chakra', 'V8', 'JavaScriptCore'], a: 2, e: "Node.js embeds Google's V8 engine, the same one used by Chrome." },
    fins: SCHOOLS[4],
  },
  {
    id: 'html', name: 'HTML',
    blurb: 'The structure of every page: semantics, forms, media and accessibility.',
    levels: ['HTML Basics', 'Document Structure', 'Text Elements', 'Links & Images', 'Lists'],
    question: { text: 'What does HTML stand for?', opts: ['HyperText Markup Language', 'Hyperlink Text Mode Language', 'High-level Text Markup', 'Home Tool Markup Language'], a: 0, e: 'HTML is HyperText Markup Language — the markup that structures web pages.' },
    fins: SCHOOLS[5],
  },
  {
    id: 'css', name: 'CSS',
    blurb: 'Layout, flexbox, grid, cascade and responsive design.',
    levels: ['How CSS Works', 'Selectors & Applying Classes', 'The Box Model & Spacing', 'Layout with Flexbox', 'Layout with Grid & Responsive Design'],
    question: { text: 'What is the main job of CSS?', opts: ['Structuring content', 'Controlling how content looks and is laid out', 'Adding interactivity', 'Storing data'], a: 1, e: 'HTML is structure, JavaScript is behaviour, and CSS is presentation — colours, spacing, and layout.' },
    fins: SCHOOLS[6],
  },
];

// Helper to keep the per-subject tables terse: real data, emoji icon, and a
// fin school assigned by position.
const t = (
  i: number,
  id: string,
  name: string,
  emoji: string,
  blurb: string,
  levels: string[],
  question: LandingQuestion,
): LandingTopic => ({ id, name, emoji, blurb, levels, question, fins: school(i) });

// ─────────────────────────── Geography (geoShark) ─────────────────────────
const GEOGRAPHY: LandingTopic[] = [
  t(0, 'continents', 'Continents', '🗺️', 'The seven continents and five oceans, and where they meet.',
    ['The Seven Continents', 'The Five Oceans', 'Continent Sizes & Shapes', 'Where Continents Meet', 'Islands & Archipelagos'],
    { text: 'How many continents are there on Earth?', opts: ['Five', 'Six', 'Seven', 'Eight'], a: 2, e: 'Most geographers recognize seven continents: Asia, Africa, North America, South America, Antarctica, Europe, and Australia.' }),
  t(1, 'capitals', 'Capitals', '🏛️', 'Countries and their capital cities, region by region.',
    ['European Capitals', 'Asian Capitals', 'African Capitals', 'Americas Capitals', 'Oceania & Island Capitals'],
    { text: 'What is the capital of France?', opts: ['Paris', 'Lyon', 'Marseille', 'Nice'], a: 0, e: 'Paris has been the capital of France since the Middle Ages and is its largest city.' }),
  t(2, 'flags', 'Flags', '🚩', 'National flags, their colors, and what they symbolize.',
    ['Flag Basics', 'Colors & Meanings', 'European Flags', 'Asian & African Flags', 'Americas & Oceania Flags'],
    { text: "What does a country's national flag mainly represent?", opts: ['The nation and its people', 'A local sports club', 'A private company', 'A single small town'], a: 0, e: 'A national flag is a symbol of an entire country and the people who live in it.' }),
  t(3, 'landforms', 'Landforms', '⛰️', 'Mountains, rivers, deserts, valleys and coasts.',
    ['Mountains & Ranges', 'Rivers', 'Lakes & Inland Seas', 'Deserts', 'Valleys & Canyons'],
    { text: 'Which is the highest mountain above sea level on Earth?', opts: ['Mount Everest', 'K2', 'Kangchenjunga', 'Denali'], a: 0, e: 'Mount Everest, in the Himalayas, is the highest mountain above sea level at about 8,849 m.' }),
  t(4, 'climate', 'Climate', '🌦️', 'Climate zones, biomes, and the water cycle.',
    ['Weather vs Climate', 'Climate Zones', 'The Water Cycle', 'Rainforests & Jungles', 'Deserts & Drylands'],
    { text: 'Over roughly how long is climate usually averaged?', opts: ['The 30-year average of conditions', 'The short-term state of the atmosphere at a place', 'The permanent vegetation of a region', "The tilt of Earth's axis"], a: 1, e: 'Climate is the long-term pattern of weather — the average conditions of a place measured over decades.' }),
  t(5, 'population', 'Population', '👥', 'People, cities, density and migration.',
    ['World Population Basics', 'Most Populous Countries', 'Megacities', 'Population Density', 'Urban vs Rural'],
    { text: 'Roughly how many people live on Earth today?', opts: ['About 1 billion', 'About 4 billion', 'About 6 billion', 'About 8 billion'], a: 3, e: 'The world population passed 8 billion in late 2022 and continues to grow slowly.' }),
];

// ───────────────────────────── Math (mathShark) ───────────────────────────
const MATH: LandingTopic[] = [
  t(0, 'arithmetic', 'Arithmetic', '🔢', 'Whole numbers and the four operations, from the ground up.',
    ['Place Value & Counting', 'Addition', 'Subtraction', 'Multiplication', 'Division'],
    { text: 'What is the value of the digit 7 in the number 372?', opts: ['7', '70', '700', '7000'], a: 1, e: 'The 7 sits in the tens place, so its value is 7 × 10 = 70.' }),
  t(1, 'fractions', 'Fractions', '➗', 'Fractions, decimals, percentages, and ratios.',
    ['Understanding Fractions', 'Equivalent Fractions', 'Adding & Subtracting Fractions', 'Multiplying & Dividing Fractions', 'Mixed Numbers'],
    { text: 'In the fraction 3/4, what is the numerator?', opts: ['4', '7', '3', '1'], a: 2, e: 'The numerator is the top number of a fraction, which is 3.' }),
  t(2, 'prealgebra', 'Pre-Algebra', '🧮', 'Integers, exponents, roots, and first expressions.',
    ['Integers', 'Exponents & Powers', 'Square Roots', 'Order of Operations', 'Variables & Expressions'],
    { text: 'What is -7 + 3?', opts: ['-4', '-10', '4', '10'], a: 0, e: 'Adding a positive to a negative moves toward zero: -7 + 3 = -4.' }),
  t(3, 'algebra', 'Algebra', '📈', 'Equations, lines, systems, polynomials and factoring.',
    ['Linear Equations', 'Slope & Lines', 'Systems of Equations', 'Polynomials', 'Factoring'],
    { text: 'Solve for x: x + 5 = 12', opts: ['5', '7', '17', '6'], a: 1, e: 'Subtract 5 from both sides: x = 12 - 5 = 7.' }),
  t(4, 'geometry', 'Geometry', '📐', 'Angles, shapes, area, and the Pythagorean theorem.',
    ['Points, Lines & Angles', 'Triangles', 'Quadrilaterals & Polygons', 'Circles', 'Perimeter'],
    { text: 'How many degrees are there in a right angle?', opts: ['45°', '90°', '180°', '360°'], a: 1, e: 'A right angle measures exactly 90°.' }),
  t(5, 'trigonometry', 'Trigonometry', '🔺', 'Sine, cosine, tangent, and the unit circle.',
    ['Angles & Radians', 'Right-Triangle Ratios', 'Sine, Cosine & Tangent', 'The Unit Circle', 'Trig of Any Angle'],
    { text: 'How many degrees are in a full circle?', opts: ['180°', '270°', '90°', '360°'], a: 3, e: 'A full rotation around a circle measures 360°.' }),
];

// ─────────────────────────── History (historyShark) ───────────────────────
const HISTORY: LandingTopic[] = [
  t(0, 'prehistory', 'Prehistory', '🦴', 'Human origins, the Stone Age, and the first farmers.',
    ['Human Origins & Evolution', 'The Stone Age', 'The Agricultural Revolution', 'The First Villages', 'Bronze & Early Metals'],
    { text: 'On which continent did the earliest human ancestors evolve?', opts: ['Europe', 'Asia', 'Africa', 'Australia'], a: 2, e: 'The fossil and genetic evidence overwhelmingly points to Africa as the birthplace of the human lineage.' }),
  t(1, 'ancient', 'Ancient', '🏺', 'Mesopotamia, Egypt, the Indus, and early China.',
    ['The Fertile Crescent', 'Ancient Egypt', 'The Indus Valley', 'Ancient China', 'Early Empires'],
    { text: 'The Fertile Crescent gets its name partly from its curved shape and its what?', opts: ['Rich, fertile soil', 'Snowy mountains', 'Vast deserts', 'Dense jungles'], a: 0, e: 'The region was called "fertile" because its rich soil, watered by rivers, supported early farming.' }),
  t(2, 'classical', 'Classical', '🏛️', 'Greece, Rome, and the Hellenistic world.',
    ['Ancient Greece', 'Greek Thought & Culture', 'Alexander & the Hellenistic World', 'The Roman Republic', 'The Roman Empire'],
    { text: 'On which peninsula did the earliest Greek civilizations mainly develop?', opts: ['The Iberian Peninsula', 'The Balkan (Greek) Peninsula', 'The Italian Peninsula', 'The Arabian Peninsula'], a: 1, e: 'Ancient Greek civilization developed on the mountainous Balkan Peninsula and the surrounding Aegean islands.' }),
  t(3, 'medieval', 'Medieval', '🏰', 'Byzantium, Islam, feudalism, and the Crusades.',
    ['The Fall of Rome', 'The Byzantine Empire', 'The Rise of Islam', 'Feudal Europe', 'The Crusades'],
    { text: 'In what year is the Western Roman Empire traditionally said to have fallen?', opts: ['476 AD', '527 AD', '313 AD', '410 AD'], a: 0, e: 'In 476 AD the Germanic leader Odoacer deposed the last Western Roman emperor, Romulus Augustulus.' }),
  t(4, 'renaissance', 'Renaissance', '🎨', 'Humanism, the Reformation, and global exploration.',
    ['The Italian Renaissance', 'Renaissance Art & Science', 'The Age of Exploration', 'The Reformation', 'The Scientific Revolution'],
    { text: 'In which country did the Renaissance first begin?', opts: ['France', 'Italy', 'England', 'Spain'], a: 1, e: 'The Renaissance began in Italy in the 14th century, centered on wealthy city-states such as Florence.' }),
  t(5, 'earlymodern', 'Early Modern', '👑', 'The Enlightenment and the age of revolutions.',
    ['Absolute Monarchs', 'The Enlightenment', 'The American Revolution', 'The French Revolution', 'The Age of Napoleon'],
    { text: 'Which French king is famous for the phrase "I am the state"?', opts: ['Louis XIV', 'Louis XVI', 'Charles V', 'Henry IV'], a: 0, e: 'Louis XIV, the "Sun King," ruled France from 1643 to 1715 and became the model of an absolute monarch.' }),
];

// ────────────────────────────── Chess (chessShark) ────────────────────────
const CHESS: LandingTopic[] = [
  t(0, 'openings', 'Openings', '♙', 'Center, development, and safe kings.',
    ['Control the Center', 'Develop Your Pieces', 'King Safety & Castling', "Don't Move the Same Piece Twice", 'Common First Moves'],
    { text: 'Which part of the board do the opening principles tell you to control first?', opts: ['The center', 'The corners', 'The edges', 'The back rank'], a: 0, e: 'Controlling the center gives your pieces the most influence and mobility.' }),
  t(1, 'tactics', 'Tactics', '⚔️', 'Forks, pins, skewers, and discovered attacks.',
    ['What Is a Tactic?', 'The Fork', 'The Pin', 'The Skewer', 'Discovered Attacks'],
    { text: 'In chess, what is a "tactic"?', opts: ['A short forcing sequence that wins material or delivers mate', 'A long-term plan spanning the whole game', 'A way to arrange pawns for defense', 'An opening you memorize move by move'], a: 0, e: 'A tactic is a short forcing sequence that wins material or delivers checkmate.' }),
  t(2, 'strategy', 'Strategy', '🧠', 'Pawn structure, outposts, files, and plans.',
    ['Pawn Structure Basics', 'Weak & Isolated Pawns', 'Open & Half-Open Files', 'Outposts & Strong Squares', 'Good vs Bad Bishops'],
    { text: 'What does "strategy" mean in chess?', opts: ['Long-term positional planning based on the pawn structure and pieces', 'Memorizing the first ten opening moves', 'Always trading queens early', 'A single forcing checkmate sequence'], a: 0, e: 'Strategy is long-term positional play — plans and structure — as opposed to short forcing tactics.' }),
  t(3, 'endgames', 'Endgames', '♚', 'King & pawn, the opposition, basic mates.',
    ['King & Pawn vs King', 'The Opposition', 'Promoting a Pawn', 'King & Queen vs King', 'King & Rook vs King'],
    { text: 'What is the "endgame" in chess?', opts: ['The final phase with few pieces left', 'The opening moves', 'The middle of the game', 'The first capture'], a: 0, e: 'The endgame is the last phase of the game, when only a few pieces remain on the board.' }),
  t(4, 'combinations', 'Combinations', '✨', 'Sacrifices, deflection, decoys, and calculation.',
    ['What Is a Combination?', 'Sacrifices', 'Deflection', 'Decoy & Attraction', 'Interference & Clearance'],
    { text: 'What is a "combination" in chess?', opts: ['A forced sequence of moves, usually with a sacrifice, that wins material or mates', 'A slow plan built over many quiet moves', 'Any opening played with both knights', 'A draw offer made mid-game'], a: 0, e: 'A combination is a forced sequence, typically involving a sacrifice, that achieves a concrete gain such as mate or winning material.' }),
];

// ──────────────────────────── Biology (bioShark) ──────────────────────────
const BIOLOGY: LandingTopic[] = [
  t(0, 'cell-biology', 'Cell Biology', '🧫', 'Core cell biology from organelles to genetics.',
    ['Cell structure & organelles', 'The cell membrane & transport', 'Biomolecules', 'Cellular respiration & metabolism', 'DNA, genes & protein synthesis'],
    { text: 'Which organelle is known as the "control centre" of the cell, holding its DNA?', opts: ['Nucleus', 'Ribosome', 'Lysosome', 'Golgi apparatus'], a: 0, e: "The nucleus stores the cell's genetic material (DNA) and directs cell activities." }),
  t(1, 'skeletal-system', 'Skeletal', '🦴', 'How the skeleton is built, joined and remodeled.',
    ['Bone structure, composition & types', 'The axial skeleton (skull, spine, ribs)', 'The appendicular skeleton (limbs, girdles)', 'Joints & articulations', 'Bone growth & remodeling'],
    { text: 'How many bones are in the typical adult human skeleton?', opts: ['106', '206', '306', '406'], a: 1, e: 'The adult skeleton has 206 bones; infants are born with about 270, many of which fuse during growth.' }),
  t(2, 'muscular-system', 'Muscular', '💪', 'Muscle types, contraction, and the movements they drive.',
    ['Muscle types & properties', 'Skeletal muscle structure', 'Sliding filament theory', 'Major muscles & movements', 'Energy, fatigue & physiology'],
    { text: 'How many main types of muscle tissue does the human body have?', opts: ['Two', 'Three', 'Four', 'Five'], a: 1, e: 'The body has three muscle types: skeletal, smooth, and cardiac.' }),
  t(3, 'nervous-system', 'Nervous', '🧠', 'Neurons, the brain and spinal cord, and the senses.',
    ['Neurons & glial cells', 'Nerve impulses & synapses', 'The central nervous system', 'The peripheral & autonomic systems', 'The senses'],
    { text: 'What is a neuron?', opts: ['A cell that stores fat', 'A nerve cell specialized to transmit electrical signals', 'A type of red blood cell', 'A muscle fiber'], a: 1, e: 'A neuron is a nerve cell built to receive, process, and pass on electrical and chemical signals.' }),
  t(4, 'endocrine-system', 'Endocrine', '⚗️', 'Hormones and glands that regulate the body.',
    ['Hormones & endocrine glands', 'The hypothalamus & pituitary', 'Thyroid, parathyroid & adrenal glands', 'The pancreas & blood sugar', 'Reproductive hormones & feedback'],
    { text: 'What is a hormone?', opts: ['A muscle that contracts', 'A chemical messenger carried in the blood', 'A type of nerve cell', 'A digestive enzyme'], a: 1, e: 'Hormones are chemical messengers secreted by endocrine glands and carried in the blood to target cells.' }),
  t(5, 'cardiovascular-system', 'Cardiovascular', '❤️', 'Blood, the heart, vessels and circulation.',
    ['Blood: composition & functions', 'The heart: structure & chambers', 'The cardiac cycle & conduction', 'Blood vessels & circulation', 'Blood pressure & its regulation'],
    { text: 'What is the main function of red blood cells?', opts: ['Fighting infection', 'Carrying oxygen', 'Clotting blood', 'Producing antibodies'], a: 1, e: 'Red blood cells (erythrocytes) contain haemoglobin, which binds and transports oxygen from the lungs to the tissues.' }),
];

// ──────────────────────────── Poker (pokerShark) ──────────────────────────
const POKER: LandingTopic[] = [
  t(0, 'positions', 'Positions', '🪑', 'How seat position and table dynamics shape strategy.',
    ['The positions at the table', 'Why position matters', 'Opening ranges by position', 'Playing in & out of position', 'Table dynamics & stack sizes'],
    { text: "Which single seat is generally regarded as the most profitable position in Hold'em?", opts: ['The button', 'Under the gun', 'The small blind', 'The big blind'], a: 0, e: 'The button acts last on every postflop street, giving it the biggest informational edge and the highest win rate.' }),
  t(1, 'starting-hands', 'Starting Hands', '🃏', 'Choosing profitable hands and building preflop ranges.',
    ['Premium hands & hand notation', 'Hand categories', 'Selection by position', 'Ranges & 3-betting', 'Adjusting to opponents & format'],
    { text: 'In poker hand notation, what does "AKs" mean?', opts: ['Ace-King suited', 'Ace-King offsuit', 'Two aces and a king', 'Ace-King on the board'], a: 0, e: 'The lowercase "s" means suited, so "AKs" is an Ace and King of the same suit.' }),
  t(2, 'pot-odds', 'Pot Odds', '🎲', 'Outs, equity, and comparing it to the price of a call.',
    ['Counting outs', 'The rule of 2 and 4', 'Pot odds & comparing to equity', 'Implied & reverse implied odds', 'Expected value & fold equity'],
    { text: 'In poker, an "out" is best described as...', opts: ['A card that improves you to the likely best hand', 'A card your opponent needs', 'Any unseen card in the deck', 'A card already in your hand'], a: 0, e: 'Outs are the remaining unseen cards that would turn your hand into a probable winner.' }),
  t(3, 'betting-strategy', 'Betting', '💰', 'Why, when and how much to bet — value and bluffs.',
    ['Why we bet (value vs bluff)', 'Bet sizing fundamentals', 'Continuation bets', 'Bluffing & fold equity', 'Multi-street planning'],
    { text: 'What are the two fundamental reasons to bet in poker?', opts: ['For value and as a bluff', 'To fold and to check', 'To limp and to raise', 'For luck and for tells'], a: 0, e: 'Almost every bet is either a value bet (hoping worse hands call) or a bluff (hoping better hands fold).' }),
  t(4, 'postflop', 'Postflop', '🌊', 'Board texture, made hands and draws, and hand reading.',
    ['Board texture', 'Made hands vs draws', 'Playing the turn & river', 'Check-raising & bluff-catching', 'Hand reading & ranges'],
    { text: 'In poker, what does a "dry" board usually mean?', opts: ['Few draws are possible', 'Many flush draws', 'The board is paired', 'A straight is already made'], a: 0, e: 'A dry board (like K-7-2 rainbow) offers few draws, so equities tend to be more fixed.' }),
];

/** Featured topics per subject, in landing display order. */
export const LANDING_TOPICS: Record<SubjectId, LandingTopic[]> = {
  webdev: WEBDEV,
  geography: GEOGRAPHY,
  math: MATH,
  history: HISTORY,
  chess: CHESS,
  biology: BIOLOGY,
  poker: POKER,
};
