// Roadmap ("Learn") structure — the single source of truth for the Duolingo-style
// learning path. Each topic has a series of ordered levels (easiest → hardest)
// with 8 questions each, plus a checkpoint after every 5 levels. A checkpoint is
// a big 40-question exam over those 5 levels; the learner must score
// CHECKPOINT_PASS% to unlock the next segment of levels.
//
// Topics can have different lengths: JS/TS/React run 25 levels (5 checkpoints),
// while Git runs 15 levels (3 checkpoints). Everything below derives per-topic
// counts from the level-title arrays, so adding a topic only means adding titles
// and its question seeds.
//
// The /api/quiz/roadmap endpoint reads this to build the level map and serve a
// level's or checkpoint's questions; the client renders the path from the same
// structure (fetched at runtime) so titles never drift out of sync.

import { QUESTIONS_PER_LEVEL, ROADMAP_LEVELS, difficultyForLevel } from './roadmap-build';

export type RoadmapTopic =
  | 'javascript' | 'typescript' | 'react' | 'nextjs' | 'nodejs'
  | 'html' | 'css' | 'git' | 'dsa' | 'algorithms'
  | 'abbreviations' | 'general' | 'internet' | 'ai' | 'rhf-zod' | 'cool-stuff'
  | 'databases' | 'system-design' | 'testing' | 'devops' | 'security'
  // Geography
  | 'continents' | 'capitals' | 'flags' | 'landforms' | 'climate' | 'population' | 'political' | 'economic' | 'cartography' | 'earth'
  // Math
  | 'arithmetic' | 'fractions' | 'prealgebra' | 'algebra' | 'geometry' | 'trigonometry' | 'statistics' | 'precalculus' | 'calculus' | 'linear-algebra'
  // History
  | 'prehistory' | 'ancient' | 'classical' | 'medieval' | 'renaissance' | 'earlymodern' | 'industrial' | 'worldwars' | 'coldwar' | 'modern'
  // Chess
  | 'openings' | 'tactics' | 'strategy' | 'endgames' | 'combinations'
  // Math (advanced)
  | 'discrete-math' | 'number-theory' | 'multivariable-calculus' | 'differential-equations' | 'real-analysis'
  // Geography (advanced)
  | 'geomorphology' | 'oceanography' | 'biogeography' | 'geopolitics' | 'gis'
  // History (thematic)
  | 'historiography' | 'history-of-science' | 'economic-history' | 'intellectual-history' | 'military-history'
  // Human Biology
  | 'cell-biology' | 'skeletal-system' | 'muscular-system' | 'nervous-system' | 'endocrine-system' | 'cardiovascular-system' | 'respiratory-system' | 'digestive-system' | 'immune-system' | 'reproductive-system'
  // Chess (advanced)
  | 'opening-theory' | 'middlegame' | 'pawn-structures' | 'endgame-technique' | 'chess-history'
  // Poker
  | 'positions' | 'starting-hands' | 'pot-odds' | 'betting-strategy' | 'postflop' | 'tournament-play' | 'psychology' | 'gto-advanced';

export const ROADMAP_TOPICS: RoadmapTopic[] = [
  'javascript', 'typescript', 'react', 'nextjs', 'nodejs',
  'html', 'css', 'git', 'dsa', 'algorithms',
  'abbreviations', 'general', 'internet', 'ai', 'rhf-zod', 'cool-stuff',
  'databases', 'system-design', 'testing', 'devops', 'security',
  // Geography
  'continents', 'capitals', 'flags', 'landforms', 'climate', 'population', 'political', 'economic', 'cartography', 'earth',
  // Math
  'arithmetic', 'fractions', 'prealgebra', 'algebra', 'geometry', 'trigonometry', 'statistics', 'precalculus', 'calculus', 'linear-algebra',
  // History
  'prehistory', 'ancient', 'classical', 'medieval', 'renaissance', 'earlymodern', 'industrial', 'worldwars', 'coldwar', 'modern',
  // Chess
  'openings', 'tactics', 'strategy', 'endgames', 'combinations',
  // Math (advanced)
  'discrete-math', 'number-theory', 'multivariable-calculus', 'differential-equations', 'real-analysis',
  // Geography (advanced)
  'geomorphology', 'oceanography', 'biogeography', 'geopolitics', 'gis',
  // History (thematic)
  'historiography', 'history-of-science', 'economic-history', 'intellectual-history', 'military-history',
  // Human Biology
  'cell-biology', 'skeletal-system', 'muscular-system', 'nervous-system', 'endocrine-system', 'cardiovascular-system', 'respiratory-system', 'digestive-system', 'immune-system', 'reproductive-system',
  // Chess (advanced)
  'opening-theory', 'middlegame', 'pawn-structures', 'endgame-technique', 'chess-history',
  // Poker
  'positions', 'starting-hands', 'pot-odds', 'betting-strategy', 'postflop', 'tournament-play', 'psychology', 'gto-advanced',
];

// Pass thresholds (percent). Levels are gentle; checkpoints are the real gate.
export const LEVEL_PASS = 75;
export const CHECKPOINT_PASS = 85;

// A checkpoint sits after every Nth level.
export const LEVELS_PER_CHECKPOINT = 5;
// Upper bound on checkpoints across all topics (the longest topic is 25 levels).
// Used as a permissive validation bound; per-topic counts come from the helpers.
export const CHECKPOINT_COUNT = ROADMAP_LEVELS / LEVELS_PER_CHECKPOINT; // 5

// Id prefix used by each topic's question seeds (see lib/roadmap-questions-*.ts).
const ID_PREFIX: Record<RoadmapTopic, string> = {
  javascript: 'rm-js',
  typescript: 'rm-ts',
  react: 'rm-react',
  nextjs: 'rm-next',
  nodejs: 'rm-node',
  html: 'rm-html',
  css: 'rm-css',
  git: 'rm-git',
  dsa: 'rm-dsa',
  algorithms: 'rm-algorithms',
  abbreviations: 'rm-abbr',
  general: 'rm-general',
  internet: 'rm-internet',
  ai: 'rm-ai',
  'rhf-zod': 'rm-rhf',
  'cool-stuff': 'rm-cool',
  databases: 'rm-db',
  'system-design': 'rm-sysdesign',
  testing: 'rm-testing',
  devops: 'rm-devops',
  security: 'rm-security',
  // Geography
  continents: 'rm-cont',
  capitals: 'rm-cap',
  flags: 'rm-flag',
  landforms: 'rm-land',
  climate: 'rm-clim',
  population: 'rm-pop',
  political: 'rm-pol',
  economic: 'rm-econ',
  cartography: 'rm-carto',
  earth: 'rm-earth',
  // Math
  arithmetic: 'rm-arith',
  fractions: 'rm-frac',
  prealgebra: 'rm-prealg',
  algebra: 'rm-alg',
  geometry: 'rm-geo',
  trigonometry: 'rm-trig',
  statistics: 'rm-stat',
  precalculus: 'rm-precalc',
  calculus: 'rm-calc',
  'linear-algebra': 'rm-linalg',
  // History
  prehistory: 'rm-prehist',
  ancient: 'rm-ancient',
  classical: 'rm-classic',
  medieval: 'rm-medieval',
  renaissance: 'rm-renais',
  earlymodern: 'rm-earlymod',
  industrial: 'rm-indust',
  worldwars: 'rm-wwars',
  coldwar: 'rm-coldwar',
  modern: 'rm-modern',
  // Chess
  openings: 'rm-open',
  tactics: 'rm-tac',
  strategy: 'rm-strat',
  endgames: 'rm-end',
  combinations: 'rm-combo',
  'discrete-math': 'rm-discrete',
  'number-theory': 'rm-numthy',
  'multivariable-calculus': 'rm-mvcalc',
  'differential-equations': 'rm-ode',
  'real-analysis': 'rm-analysis',
  'geomorphology': 'rm-geomorph',
  'oceanography': 'rm-ocean',
  'biogeography': 'rm-biogeo',
  'geopolitics': 'rm-geopol',
  'gis': 'rm-gis',
  'historiography': 'rm-histiog',
  'history-of-science': 'rm-histsci',
  'economic-history': 'rm-econhist',
  'intellectual-history': 'rm-intelhist',
  'military-history': 'rm-milhist',
  'cell-biology': 'rm-cellbio',
  'skeletal-system': 'rm-skel',
  'muscular-system': 'rm-musc',
  'nervous-system': 'rm-nervous',
  'endocrine-system': 'rm-endo',
  'cardiovascular-system': 'rm-cardio',
  'respiratory-system': 'rm-resp',
  'digestive-system': 'rm-digest',
  'immune-system': 'rm-immune',
  'reproductive-system': 'rm-repro',
  'opening-theory': 'rm-openthy',
  'middlegame': 'rm-middle',
  'pawn-structures': 'rm-pawns',
  'endgame-technique': 'rm-endgtech',
  'chess-history': 'rm-chesshist',
  'positions': 'rm-pkpos',
  'starting-hands': 'rm-pkstart',
  'pot-odds': 'rm-pkodds',
  'betting-strategy': 'rm-pkbet',
  'postflop': 'rm-pkpost',
  'tournament-play': 'rm-pktourn',
  'psychology': 'rm-pkpsych',
  'gto-advanced': 'rm-pkgto',
};

// Level titles per topic, in increasing difficulty. Index 0 is level 1. The
// length of each array defines how many levels the topic has.
const LEVEL_TITLES: Record<RoadmapTopic, string[]> = {
  javascript: [
    'Values & Math', 'Strings', 'Booleans & Comparison', 'Arrays: Basics', 'Objects: Basics',
    'Array Iteration', 'Filter & Find', 'Reduce', 'Destructuring', 'Spread & Rest',
    'Functions & Scope', 'Closures', 'Hoisting & let/const', 'this & Context', 'Callbacks & HOFs',
    'Ternary & Short-circuit', 'Type Coercion', 'Truthy / Falsy', 'JSON & Objects', 'Optional & Nullish',
    'Promises', 'Async / Await', 'Sets & Maps', 'Edge Cases & Gotchas', 'Mixed Mastery',
  ],
  typescript: [
    'Basic Types', 'Type Inference', 'Function Types', 'Arrays & Tuples', 'Object Types',
    'Interfaces', 'Union Types', 'Literal Types', 'Optional & Readonly', 'Type Aliases',
    'Type Narrowing', 'Type Guards', 'Enums', 'Generics: Basics', 'Generic Constraints',
    'keyof & typeof', 'Indexed Access', 'Partial & Required', 'Pick & Omit', 'Record',
    'Mapped Types', 'Conditional Types', 'infer', 'Template Literals', 'Mixed Mastery',
  ],
  react: [
    'JSX Basics', 'Components', 'Props', 'Rendering Lists', 'Conditional Rendering',
    'useState: Basics', 'Event Handling', 'Updating State', 'State: Objects & Arrays', 'Derived State',
    'useEffect: Basics', 'Effect Dependencies', 'Cleanup Functions', 'useRef', 'Forms & Inputs',
    'Lifting State Up', 'useMemo', 'useCallback', 'useReducer', 'useContext',
    'Custom Hooks', 'Keys & Reconciliation', 'Performance Patterns', 'Common Pitfalls', 'Mixed Mastery',
  ],
  nextjs: [
    'Next.js Basics', 'Routing (App Router)', 'Pages & Layouts', 'Navigation & Links', 'Server & Client Components',
    'Data Fetching', 'Dynamic Routes', 'Rendering Strategies', 'Route Handlers', 'Server Actions',
    'Metadata & SEO', 'Styling', 'Images & Fonts', 'Loading & Errors', 'Middleware & Config',
  ],
  nodejs: [
    'Node Basics', 'Modules (CommonJS)', 'ES Modules', 'Globals & process', 'The Event Loop',
    'Path', 'File System', 'OS & Util', 'Events', 'Streams',
    'Buffers', 'HTTP Server', 'Callbacks & Promisify', 'Async / Await', 'Environment & CLI',
    'npm & package.json', 'Error Handling', 'Timers & Scheduling', 'Child Processes', 'Crypto',
    'Express: Basics', 'Express: Req & Res', 'Concurrency', 'Testing & Debugging', 'Mixed Mastery',
  ],
  git: [
    'Version Control Basics', 'Repositories', 'Staging & Status', 'Committing', 'History & Diffs',
    'Branches', 'Merging', 'Remotes', 'Push & Pull', 'Undoing Changes',
    'Stashing', 'Rebasing', 'Tags & .gitignore', 'Collaboration & PRs', 'Advanced Git',
  ],
  html: [
    'HTML Basics', 'Document Structure', 'Text Elements', 'Links & Images', 'Lists',
    'Attributes', 'Forms: Inputs', 'Forms: Controls', 'Tables', 'Semantic HTML',
    'Media', 'Metadata & Head', 'Accessibility', 'Entities & Special Characters', 'Advanced HTML',
  ],
  css: [
    'How CSS Works', 'Selectors & Classes', 'The Box Model',
    'Layout: Flexbox', 'Layout: Grid & Responsive', 'Custom Properties (--var)',
    'Tailwind: Utility-First', 'Tailwind: Responsive & Custom', 'Tailwind vs CSS-in-JS',
  ],
  dsa: [
    'Complexity Basics', 'Big-O Notation', 'Arrays', 'Strings', 'Hash Tables',
    'Stacks', 'Queues', 'Linked Lists', 'Recursion', 'Sorting Algorithms',
    'Searching Algorithms', 'Trees', 'Binary Search Trees', 'Heaps & Priority Queues', 'Graphs',
  ],
  algorithms: [
    'Ratios & Proportions', 'Modular Arithmetic', 'Combinatorics', 'Probability', 'Prime Numbers & Divisibility',
    'Algebraic Thinking', 'Bitwise Logic', 'Logic Puzzles', 'Recurrences & Growth', 'Problem Solving',
  ],
  abbreviations: [
    'Languages & Runtimes', 'Web Standards', 'APIs & Data Formats', 'Frontend Rendering', 'Build & Tooling',
    'Version Control & Workflow', 'Auth & Security', 'Networking', 'Databases & Storage', 'Cloud & Infra',
    'Architecture Patterns', 'Performance Metrics', 'Testing & Quality', 'DevOps & Containers', 'Acronym Mastery',
  ],
  general: [
    'How the Web Works', 'Clients & Servers', 'HTTP Methods', 'HTTP Status Codes', 'URLs & Routing',
    'How Browsers Render', 'How Code Runs', 'How Frameworks Work', 'Frontend vs Backend', 'APIs & Communication',
    'Caching & CDNs', 'Authentication Basics', 'Databases Overview', 'Deployment & Hosting', 'Performance & Optimization',
  ],
  internet: [
    'What is the Internet?', 'IP Addresses', 'DNS — The Internet’s Phonebook', 'Packets & Routing', 'TCP & UDP',
    'The Protocol Stack (TCP/IP)', 'The Web over HTTP', 'Ports, NAT & Firewalls', 'ISPs & Physical Connections', 'Security, HTTPS & Encryption',
  ],
  ai: [
    'What is AI?', 'Machine Learning Basics', 'Neural Networks', 'What is an LLM?', 'Tokens & Tokenization',
    'Training Data & Datasets', 'Transformers & Attention', 'Prompting Basics', 'Context Windows', 'Embeddings & Vectors',
    'Sampling & Temperature', 'Hallucinations & Limitations', 'Fine-tuning & RAG', 'Using AI APIs', 'Chat Assistants & System Prompts',
    'Multimodal Models', 'AI Safety & Alignment', 'Bias & Ethics', 'AI Agents & Tool Use', 'The Modern AI Landscape',
  ],
  'rhf-zod': [
    'Forms in React', 'useForm & register', 'handleSubmit & onSubmit', 'formState & Errors', 'Built-in Validation Rules',
    'Zod: Primitives & parse', 'Zod: Objects & infer', 'Zod: safeParse & Errors', 'Zod: Refinements & Coercion', 'Connecting Zod (zodResolver)',
    'Controller & Controlled Inputs', 'watch, setValue & reset', 'useFieldArray', 'Zod: Refine, Unions & Transform', 'Integration & Mastery',
  ],
  'cool-stuff': [
    'JavaScript: Birth & Names', 'JavaScript: Weird Parts', 'Birth of the Web', 'Internet Firsts', 'Famous Software Disasters',
    'The Original Bug', 'Worms, Viruses & Spam', 'Programming Pioneers', 'Language Naming & Lore', 'Esoteric Languages',
    'Mascots, Logos & Symbols', 'Hardware Marvels & Oddities', 'Gaming & Easter Eggs', 'Bizarre Tech Tales', 'Tech Trivia Mastery',
  ],
  databases: [
    'What is a Database?', 'Relational Basics', 'SQL SELECT Basics', 'Filtering & Sorting', 'Aggregations & GROUP BY',
    'Joins', 'Schema Design & Normalization', 'Keys & Constraints', 'Data Types & NULL', 'Indexing',
    'Transactions & ACID', 'Isolation & Locking', 'The N+1 Problem', 'NoSQL & When to Use It', 'Performance & Scaling',
  ],
  'system-design': [
    'System Design Basics', 'Client–Server & APIs', 'Scaling: Vertical vs Horizontal', 'Load Balancing', 'Caching',
    'Databases at Scale', 'Sharding & Partitioning', 'Message Queues & Async', 'Consistency & CAP', 'Rate Limiting',
    'CDNs & Edge', 'Failure Modes & Resilience', 'Observability & Monitoring', 'Trade-offs & Estimation', 'Designing Real Systems',
  ],
  testing: [
    'Why Test?', 'The Testing Pyramid', 'Unit Tests', 'Assertions & Matchers', 'Test Structure (AAA)',
    'Mocks, Stubs & Spies', 'Integration Tests', 'End-to-End Tests', 'Testing Async Code', 'Test Doubles & Fakes',
    'Coverage & What to Test', 'TDD', 'Flaky Tests & Isolation', 'Testing in CI', 'Testing Best Practices',
  ],
  devops: [
    'What is DevOps?', 'Version Control & Git Flow', 'CI Basics', 'CD & Deployment', 'Build Pipelines',
    'Containers & Docker', 'Container Orchestration', 'Infrastructure as Code', 'Cloud Fundamentals', 'Deploying to the Cloud',
    'Environments & Config', 'Observability & Logging', 'Monitoring & Alerting', 'Secrets & Security in CI', 'Reliability & SRE',
  ],
  security: [
    'Security Fundamentals', 'Authentication', 'Authorization', 'Passwords & Hashing', 'Sessions & Tokens (JWT)',
    'HTTPS & TLS', 'Injection (SQLi)', 'XSS', 'CSRF', 'OWASP Top 10',
    'Secrets Management', 'Secure Defaults & Headers', 'Dependency & Supply Chain', 'Data Protection & Privacy', 'Secure Design & Threat Modeling',
  ],
  // Geography
  continents: [
    'The Seven Continents', 'The Five Oceans', 'Continent Sizes & Shapes', 'Where Continents Meet', 'Islands & Archipelagos',
    'Seas, Gulfs & Bays', 'Hemispheres & the Equator', 'Continental Extremes', 'Ocean Depths & Features', 'Continents & Oceans Mastery',
  ],
  capitals: [
    'European Capitals', 'Asian Capitals', 'African Capitals', 'Americas Capitals', 'Oceania & Island Capitals',
    'Capitals of Large Countries', 'Tricky Capitals', 'Multiple & Former Capitals', 'Capital Cities Deep Dive', 'Capitals Mastery',
  ],
  flags: [
    'Flag Basics', 'Colors & Meanings', 'European Flags', 'Asian & African Flags', 'Americas & Oceania Flags',
    'Stars, Crosses & Crescents', 'National Symbols & Emblems', 'Similar-Looking Flags', 'Flag History & Change', 'Flags Mastery',
  ],
  landforms: [
    'Mountains & Ranges', 'Rivers', 'Lakes & Inland Seas', 'Deserts', 'Valleys & Canyons',
    'Plateaus & Plains', 'Coasts & Peninsulas', 'Volcanoes', 'Glaciers & Ice', 'Landforms Mastery',
  ],
  climate: [
    'Weather vs Climate', 'Climate Zones', 'The Water Cycle', 'Rainforests & Jungles', 'Deserts & Drylands',
    'Grasslands & Savannas', 'Temperate & Boreal Forests', 'Tundra & Polar', 'Extreme Weather & Climate Change', 'Climate & Biomes Mastery',
  ],
  population: [
    'World Population Basics', 'Most Populous Countries', 'Megacities', 'Population Density', 'Urban vs Rural',
    'Migration & Movement', 'Languages & Peoples', 'Population Growth & Decline', 'Cities of the World', 'Population Mastery',
  ],
  political: [
    'Countries & Sovereignty', 'Borders & Boundaries', 'Landlocked & Coastal States', 'Territories & Dependencies', 'International Organizations',
    'Capitals & Government Seats', 'Disputed Regions', 'Historical Borders & Change', 'Enclaves & Exclaves', 'Political Geography Mastery',
  ],
  economic: [
    'Natural Resources', 'Agriculture & Farming', 'Energy & Fuels', 'Trade & Shipping', 'Industry & Manufacturing',
    'Currencies & Economies', 'Tourism & Services', 'Development & Inequality', 'Global Supply Chains', 'Economic Geography Mastery',
  ],
  cartography: [
    'Reading Maps', 'Latitude & Longitude', 'Map Scale & Distance', 'Map Projections', 'Compass & Direction',
    'Contour Lines & Relief', 'Symbols, Keys & Legends', 'Time Zones', 'GPS & Modern Mapping', 'Cartography Mastery',
  ],
  earth: [
    'Structure of the Earth', 'Plate Tectonics', 'Rocks & Minerals', 'Earthquakes', 'Volcanism',
    'The Rock Cycle', 'Erosion & Weathering', "Earth's Atmosphere", 'Oceans & the Water System', 'Earth Systems Mastery',
  ],
  // Math
  arithmetic: [
    'Place Value & Counting', 'Addition', 'Subtraction', 'Multiplication', 'Division',
    'Order of Operations', 'Factors & Multiples', 'Rounding & Estimation', 'Negative Numbers', 'Word Problems',
  ],
  fractions: [
    'Understanding Fractions', 'Equivalent Fractions', 'Adding & Subtracting Fractions', 'Multiplying & Dividing Fractions', 'Mixed Numbers',
    'Decimal Basics', 'Decimal Operations', 'Fractions & Decimals', 'Percentages', 'Ratios & Proportions',
  ],
  prealgebra: [
    'Integers', 'Exponents & Powers', 'Square Roots', 'Order of Operations', 'Variables & Expressions',
    'Simplifying Expressions', 'One-Step Equations', 'Two-Step Equations', 'Inequalities', 'The Coordinate Plane',
  ],
  algebra: [
    'Linear Equations', 'Slope & Lines', 'Systems of Equations', 'Polynomials', 'Factoring',
    'Quadratic Equations', 'The Quadratic Formula', 'Functions', 'Exponents & Radicals', 'Rational Expressions',
  ],
  geometry: [
    'Points, Lines & Angles', 'Triangles', 'Quadrilaterals & Polygons', 'Circles', 'Perimeter',
    'Area', 'Volume & Surface Area', 'The Pythagorean Theorem', 'Similarity & Congruence', 'Transformations',
  ],
  trigonometry: [
    'Angles & Radians', 'Right-Triangle Ratios', 'Sine, Cosine & Tangent', 'The Unit Circle', 'Trig of Any Angle',
    'Graphs of Trig Functions', 'Trig Identities', 'Law of Sines', 'Law of Cosines', 'Solving Trig Equations',
  ],
  statistics: [
    'Data & Its Types', 'Mean, Median & Mode', 'Range & Spread', 'Standard Deviation', 'Data Displays',
    'Basic Probability', 'Compound Probability', 'Permutations & Combinations', 'Distributions', 'Correlation & Inference',
  ],
  precalculus: [
    'Function Notation', 'Domain & Range', 'Transformations of Functions', 'Composite & Inverse Functions', 'Polynomial & Rational Functions',
    'Logarithms', 'Exponential & Log Equations', 'Sequences & Series', 'Complex Numbers', 'Introduction to Limits',
  ],
  calculus: [
    'Limits', 'Continuity', 'The Derivative', 'Derivative Rules', 'The Chain Rule',
    'Applications of Derivatives', 'Optimization', 'The Integral', 'Integration Techniques', 'The Fundamental Theorem',
  ],
  'linear-algebra': [
    'Vectors', 'Vector Operations', 'The Dot Product', 'Matrices', 'Matrix Multiplication',
    'Determinants', 'Matrix Inverses', 'Systems as Matrices', 'Linear Transformations', 'Eigenvalues & Eigenvectors',
  ],
  // History
  prehistory: [
    'Human Origins & Evolution', 'The Stone Age (Paleolithic)', 'Fire, Tools & Survival', 'Ice Age & Migration', 'Cave Art & Symbolism',
    'The Neolithic Revolution', 'Early Agriculture & Domestication', 'First Settlements', 'Megaliths & Monuments', 'The Dawn of Metals',
  ],
  ancient: [
    'The Fertile Crescent', 'Mesopotamia & Sumer', 'Ancient Egypt: Kingdoms', 'Egyptian Society & Religion', 'The Indus Valley',
    'Ancient China: Early Dynasties', 'Writing & Law Codes', 'Trade & Cities', 'Empires of the Near East', 'Legacy of the Ancients',
  ],
  classical: [
    'Early Greece & the Aegean', 'Greek City-States', 'Athens & Democracy', 'Greek Philosophy & Culture', 'Alexander & the Hellenistic World',
    'The Roman Republic', 'Roman Expansion & the Punic Wars', 'The Roman Empire', 'Roman Society & Engineering', 'Decline of Rome',
  ],
  medieval: [
    'Fall of Rome & the Early Middle Ages', 'The Byzantine Empire', 'The Rise of Islam', 'Feudalism & Manorialism', 'The Medieval Church',
    'Charlemagne & the Franks', 'The Crusades', 'Medieval Life & Towns', 'Mongols & Asia', 'Plague & the Late Middle Ages',
  ],
  renaissance: [
    'The Italian Renaissance', 'Renaissance Art & Humanism', 'The Printing Revolution', 'The Reformation', 'The Counter-Reformation',
    'Age of Exploration Begins', 'New World Encounters', 'Trade Empires & the Columbian Exchange', 'The Scientific Revolution', 'A Changing Worldview',
  ],
  earlymodern: [
    'Absolutism & Monarchy', 'The Enlightenment', 'Rise of Global Empires', 'The English Civil War & Glorious Revolution', 'The American Revolution (1776)',
    'The French Revolution (1789)', 'Napoleon & His Wars', 'Revolutions in the Americas', 'Nationalism & Reform', 'A New Political Order',
  ],
  industrial: [
    'The Agricultural Revolution', 'Origins of Industrialization', 'Steam, Coal & Iron', 'Factories & Labor', 'Transport & Railways',
    'Urbanization & Society', 'Capitalism & Socialism', 'The Second Industrial Revolution', 'Imperialism & Colonization', 'Science & Invention',
  ],
  worldwars: [
    'The Road to WWI', 'World War I: The Great War', 'Trench Warfare & Technology', 'The Russian Revolution', 'Treaty of Versailles & Aftermath',
    'The Interwar Years', 'Rise of Fascism', 'World War II: Outbreak', 'WWII: Global Conflict & the Holocaust', 'The End of WWII',
  ],
  coldwar: [
    'Origins of the Cold War', 'A Divided Europe', 'The Nuclear Arms Race', 'Korea & Proxy Wars', 'Decolonization in Asia & Africa',
    'The Cuban Missile Crisis', 'The Space Race', 'Vietnam & Détente', 'Upheavals of the 1960s–70s', 'The Fall of the Berlin Wall',
  ],
  modern: [
    'A New World Order', 'Globalization', 'The Digital Revolution', 'Conflict in the Middle East', 'Terrorism & 9/11',
    'The Rise of China & Asia', 'The European Union', 'Financial Crises', 'Technology & Society', 'The 21st Century World',
  ],
  // Chess
  openings: [
    'Control the Center', 'Develop Your Pieces', 'King Safety & Castling', 'Don’t Move the Same Piece Twice', 'Common First Moves',
    'Open, Closed & Semi-Open', 'Famous Openings', 'Opening Traps & Blunders', 'Tempo & Development', 'Opening Mastery',
  ],
  tactics: [
    'What Is a Tactic?', 'The Fork', 'The Pin', 'The Skewer', 'Discovered Attacks',
    'Double Attacks', 'Removing the Defender', 'Trapped Pieces', 'Spotting Tactics', 'Tactics Mastery',
  ],
  strategy: [
    'Pawn Structure Basics', 'Weak & Isolated Pawns', 'Open & Half-Open Files', 'Outposts & Strong Squares', 'Good vs Bad Bishops',
    'Space & the Center', 'The Two Bishops', 'Weak Squares & Color Complexes', 'Planning & Piece Placement', 'Strategy Mastery',
  ],
  endgames: [
    'King & Pawn vs King', 'The Opposition', 'Promoting a Pawn', 'King & Queen vs King', 'King & Rook vs King',
    'Rook Endgames Basics', 'The Lucena & Philidor', 'Minor-Piece Endgames', 'King Activity', 'Endgame Mastery',
  ],
  combinations: [
    'What Is a Combination?', 'Sacrifices', 'Deflection', 'Decoy & Attraction', 'Interference & Clearance',
    'Zwischenzug (In-Between Moves)', 'Mating Combinations', 'Overloading', 'Calculating Combinations', 'Combinations Mastery',
  ],
  'discrete-math': [
    'Propositional Logic & Truth Tables', 'Sets, Relations, Functions & Cardinality', 'Combinatorics', 'Graph Theory', 'Recurrences, Induction & Number-Theoretic Counting',
  ],
  'number-theory': [
    'Divisibility & Primes', 'Modular Arithmetic & Congruences', 'Fermat, Euler & Totient', 'Diophantine Equations & CRT', 'Quadratic Residues & Primitive Roots',
  ],
  'multivariable-calculus': [
    'Functions of Several Variables & Partial Derivatives', 'Gradient, Directional Derivatives & Chain Rule', 'Double & Triple Integrals', 'Vector Fields, Line Integrals, Divergence & Curl', 'Integral Theorems & Lagrange Multipliers',
  ],
  'differential-equations': [
    'First-Order Separable & Linear', 'Exact Equations, Integrating Factors & Applications', 'Second-Order Linear Homogeneous (Constant Coefficients)', 'Nonhomogeneous Equations (Undetermined Coefficients & Variation of Parameters)', 'Systems, Laplace Transforms & Series Solutions',
  ],
  'real-analysis': [
    'The Real Numbers', 'Sequences and Limits', 'Infinite Series', 'Continuity', 'Differentiation and Integration',
  ],
  'geomorphology': [
    'Weathering & Erosion', 'Fluvial Landforms', 'Glacial & Periglacial', 'Coastal & Aeolian', 'Tectonic & Landscape Evolution',
  ],
  'oceanography': [
    'Ocean Basins & Seafloor', 'Seawater Properties', 'Currents & Circulation', 'Waves, Tides & Coasts', 'Marine Ecosystems & Ocean-Climate',
  ],
  'biogeography': [
    'Biomes & Global Distribution', 'Ecosystems & Energy Flow', 'Species Distribution & Barriers', 'Island Biogeography & Endemism', 'Biodiversity, Realms & Human Impact',
  ],
  'geopolitics': [
    'States, Sovereignty & Borders', 'International Organizations & Alliances', 'Classical Geostrategy', 'Resource & Economic Geopolitics', 'Contemporary Flashpoints & Disputed Territories',
  ],
  'gis': [
    'Coordinate Systems', 'Map Projections & Distortion', 'Spatial Data Models', 'Remote Sensing & Satellite Imagery', 'Spatial Analysis & GIS Applications',
  ],
  'historiography': [
    'Sources & Evidence', 'Historical Method', 'Schools of Thought', 'Interpretation & Causation', 'Memory, Revisionism & Public History',
  ],
  'history-of-science': [
    'Ancient & Medieval Science', 'The Scientific Revolution', 'Enlightenment & 19th-Century Science', 'The Modern Physics Revolution', '20th-Century Biology, Medicine & Computing',
  ],
  'economic-history': [
    'Early Economies', 'Medieval & Mercantile Economies', 'Industrial Revolution & Rise of Capitalism', 'Money, Banking & Financial Systems', '20th-Century Economic History',
  ],
  'intellectual-history': [
    'Ancient Philosophy', 'Religious & Medieval Thought', 'Renaissance Humanism & the Enlightenment', 'Modern Political Ideologies', 'Modern Thought',
  ],
  'military-history': [
    'Ancient Warfare', 'Medieval Warfare', 'Gunpowder & Early-Modern Warfare', 'Industrial-Age Warfare & World War I', 'World War II & Modern Warfare',
  ],
  'cell-biology': [
    'Cell structure & organelles', 'The cell membrane & transport', 'Biomolecules', 'Cellular respiration & metabolism', 'DNA, genes & protein synthesis',
  ],
  'skeletal-system': [
    'Bone structure & types', 'The axial skeleton', 'The appendicular skeleton', 'Joints & articulations', 'Bone growth, remodeling & disorders',
  ],
  'muscular-system': [
    'Muscle types & properties', 'Skeletal muscle structure', 'Sliding filament theory', 'Major muscles & movements', 'Energy, fatigue & physiology',
  ],
  'nervous-system': [
    'Neurons & glial cells', 'Nerve impulses & synapses', 'The central nervous system', 'Peripheral & autonomic systems', 'The senses',
  ],
  'endocrine-system': [
    'Hormones & glands overview', 'Hypothalamus & pituitary', 'Thyroid, parathyroid & adrenal', 'Pancreas & blood-sugar regulation', 'Reproductive hormones & feedback',
  ],
  'cardiovascular-system': [
    'Blood: composition & functions', 'The heart: structure & chambers', 'The cardiac cycle & conduction', 'Blood vessels & circulation', 'Blood pressure & regulation',
  ],
  'respiratory-system': [
    'Respiratory system anatomy', 'Mechanics of breathing', 'Gas exchange & transport', 'Control of respiration', 'Respiratory health & altitude',
  ],
  'digestive-system': [
    'The digestive tract & path of food', 'Mechanical & chemical digestion', 'Enzymes & accessory organs', 'Absorption & the small intestine', 'Nutrition & metabolism',
  ],
  'immune-system': [
    'Innate immunity & barriers', 'The lymphatic system', 'Adaptive immunity: B & T cells', 'Antibodies & memory', 'Vaccines, allergies & disorders',
  ],
  'reproductive-system': [
    'The urinary system & kidneys', 'The male reproductive system', 'The female reproductive system', 'Menstrual cycle & fertilization', 'Development, pregnancy & genetics',
  ],
  'opening-theory': [
    'Opening principles & mistakes', 'Open games: Italian, Ruy Lopez, Scotch', 'Semi-open: Sicilian, French, Caro-Kann', 'Closed & queen\'s-pawn openings', 'Gambits & modern systems',
  ],
  'middlegame': [
    'Making a plan', 'Piece activity & the bishop pair', 'Attacking the king', 'Prophylaxis, defense & improvement', 'Imbalances, initiative & converting',
  ],
  'pawn-structures': [
    'Pawn weaknesses', 'Pawn chains & breaks', 'Passed pawns', 'Classic structures (IQP, Carlsbad)', 'Minority attack & majorities',
  ],
  'endgame-technique': [
    'King & pawn endings', 'Rook endings', 'Minor-piece endings', 'Queen & complex endings', 'Practical technique',
  ],
  'chess-history': [
    'Origins & early history', 'Romantic era & first champions', 'Classical & Soviet school', 'Famous champions & rivalries', 'Modern era & computer chess',
  ],
  'positions': [
    'The positions at the table', 'Why position matters', 'Opening ranges by position', 'In and out of position postflop', 'Table dynamics & seat selection',
  ],
  'starting-hands': [
    'Premium hands & hand notation', 'Hand categories', 'Preflop selection by position', 'Ranges & 3-betting', 'Adjusting ranges',
  ],
  'pot-odds': [
    'Counting outs', 'The rule of 2 and 4', 'Pot odds vs equity', 'Implied & reverse implied odds', 'Expected value & fold equity',
  ],
  'betting-strategy': [
    'Why we bet (value vs bluff)', 'Bet sizing fundamentals', 'Continuation bets', 'Bluffing & fold equity', 'Multi-street planning & ranges',
  ],
  'postflop': [
    'Board texture', 'Made hands vs draws', 'Playing the turn and river', 'Check-raising, floating, bluff-catching', 'Hand reading & ranges',
  ],
  'tournament-play': [
    'How tournaments work', 'Stack sizes & stages', 'Short-stack, push/fold & M-ratio', 'The bubble, ICM & pay-jumps', 'Final-table & heads-up',
  ],
  'psychology': [
    'Tilt & emotional control', 'Table image', 'Reading opponents & tells', 'Player types & exploiting them', 'Bankroll & responsible play',
  ],
  'gto-advanced': [
    'GTO vs exploitative play', 'Balanced ranges, MDF & ratios', 'Combinatorics & blockers', 'Range construction & bet-sizing', 'Equilibrium, solvers & simplifications',
  ],
};

// Names for the early checkpoints; the final checkpoint of any topic is always
// the "Final Mastery Exam".
const CHECKPOINT_TITLES = ['Foundations Exam', 'Core Skills Exam', 'Intermediate Exam', 'Advanced Exam'];
const FINAL_CHECKPOINT_TITLE = 'Final Mastery Exam';

export interface RoadmapLevelMeta {
  /** 1-based level number. */
  level: number;
  title: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  questionCount: number;
}

export interface RoadmapCheckpointMeta {
  /** 1-based checkpoint number. */
  checkpoint: number;
  title: string;
  /** The level this checkpoint sits after (5, 10, 15, …). */
  afterLevel: number;
  questionCount: number;
  passPct: number;
}

export interface RoadmapTopicStructure {
  levels: RoadmapLevelMeta[];
  checkpoints: RoadmapCheckpointMeta[];
}

/** How many levels a topic has. */
export function topicLevelCount(topic: RoadmapTopic): number {
  return LEVEL_TITLES[topic].length;
}

/** How many checkpoints a topic has (one per 5 levels). */
export function topicCheckpointCount(topic: RoadmapTopic): number {
  return Math.floor(topicLevelCount(topic) / LEVELS_PER_CHECKPOINT);
}

/** The question ids that make up a given topic/level (1-based level). */
export function levelQuestionIds(topic: RoadmapTopic, level: number): string[] {
  const start = (level - 1) * QUESTIONS_PER_LEVEL + 1;
  return Array.from({ length: QUESTIONS_PER_LEVEL }, (_, i) => `${ID_PREFIX[topic]}-${start + i}`);
}

/** The 40 question ids for a checkpoint: every question in its 5 levels. */
export function checkpointQuestionIds(topic: RoadmapTopic, checkpoint: number): string[] {
  const firstLevel = (checkpoint - 1) * LEVELS_PER_CHECKPOINT + 1;
  const ids: string[] = [];
  for (let lvl = firstLevel; lvl < firstLevel + LEVELS_PER_CHECKPOINT; lvl++) {
    ids.push(...levelQuestionIds(topic, lvl));
  }
  return ids;
}

/** Level metadata for one topic (titles, difficulty, count) — the path to render. */
export function topicLevels(topic: RoadmapTopic): RoadmapLevelMeta[] {
  return LEVEL_TITLES[topic].map((title, i) => ({
    level: i + 1,
    title,
    difficulty: difficultyForLevel(i + 1),
    questionCount: QUESTIONS_PER_LEVEL,
  }));
}

/** Checkpoint metadata for one topic. */
export function topicCheckpoints(topic: RoadmapTopic): RoadmapCheckpointMeta[] {
  const count = topicCheckpointCount(topic);
  return Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    return {
      checkpoint: n,
      title: n === count ? FINAL_CHECKPOINT_TITLE : CHECKPOINT_TITLES[i] ?? `Checkpoint ${n}`,
      afterLevel: n * LEVELS_PER_CHECKPOINT,
      questionCount: QUESTIONS_PER_LEVEL * LEVELS_PER_CHECKPOINT, // 40
      passPct: CHECKPOINT_PASS,
    };
  });
}

/** Full structure (every topic → its levels + checkpoints), sent to the client. */
export function roadmapStructure(): Record<RoadmapTopic, RoadmapTopicStructure> {
  const out = {} as Record<RoadmapTopic, RoadmapTopicStructure>;
  for (const topic of ROADMAP_TOPICS) {
    out[topic] = { levels: topicLevels(topic), checkpoints: topicCheckpoints(topic) };
  }
  return out;
}

/* ──── dynamic ("live") structure ───────────────────────────────────────────
 * The functions above describe the *authored* path (a fixed N levels × 8). The
 * live quiz, however, lets the owner hide questions from /dev, and the path must
 * re-sync: with fewer surviving questions a topic has fewer levels, and those
 * levels get repacked and re-graded by position. The builders below take a
 * predicate for which question ids still exist (i.e. aren't soft-deleted) and
 * recompute everything from the surviving set, so deleting a question in /dev
 * automatically shrinks/relevels the learning path. The static functions are
 * kept for the build scripts (mobile offline snapshot, integrity checks), which
 * always want the full authored set.
 * ─────────────────────────────────────────────────────────────────────────── */

/** All authored question ids for a topic, in canonical order (ignoring deletes). */
export function topicAllQuestionIds(topic: RoadmapTopic): string[] {
  const max = topicLevelCount(topic) * QUESTIONS_PER_LEVEL;
  const prefix = ID_PREFIX[topic];
  return Array.from({ length: max }, (_, i) => `${prefix}-${i + 1}`);
}

export interface LiveTopic {
  levels: RoadmapLevelMeta[];
  checkpoints: RoadmapCheckpointMeta[];
  /** levelIds[level - 1] = the surviving question ids packed into that level. */
  levelIds: string[][];
}

/** Recompute a topic's levels/checkpoints from the questions that still exist. */
export function buildLiveTopic(topic: RoadmapTopic, exists: (id: string) => boolean): LiveTopic {
  const surviving = topicAllQuestionIds(topic).filter(exists);
  const levelCount = Math.min(
    topicLevelCount(topic),
    Math.ceil(surviving.length / QUESTIONS_PER_LEVEL),
  );
  const titles = LEVEL_TITLES[topic];

  const levels: RoadmapLevelMeta[] = [];
  const levelIds: string[][] = [];
  for (let l = 1; l <= levelCount; l++) {
    const chunk = surviving.slice((l - 1) * QUESTIONS_PER_LEVEL, l * QUESTIONS_PER_LEVEL);
    levelIds.push(chunk);
    levels.push({
      level: l,
      title: titles[l - 1],
      difficulty: difficultyForLevel(l),
      questionCount: chunk.length,
    });
  }

  const checkpointCount = Math.floor(levelCount / LEVELS_PER_CHECKPOINT);
  const checkpoints: RoadmapCheckpointMeta[] = [];
  for (let n = 1; n <= checkpointCount; n++) {
    const afterLevel = n * LEVELS_PER_CHECKPOINT;
    let questionCount = 0;
    for (let l = afterLevel - LEVELS_PER_CHECKPOINT + 1; l <= afterLevel; l++) {
      questionCount += levelIds[l - 1].length;
    }
    checkpoints.push({
      checkpoint: n,
      title: n === checkpointCount ? FINAL_CHECKPOINT_TITLE : CHECKPOINT_TITLES[n - 1] ?? `Checkpoint ${n}`,
      afterLevel,
      questionCount,
      passPct: CHECKPOINT_PASS,
    });
  }
  return { levels, checkpoints, levelIds };
}

/** The full live structure for every topic, given the surviving-id predicate. */
export function liveRoadmapStructure(
  exists: (id: string) => boolean,
): Record<RoadmapTopic, RoadmapTopicStructure> {
  const out = {} as Record<RoadmapTopic, RoadmapTopicStructure>;
  for (const topic of ROADMAP_TOPICS) {
    const live = buildLiveTopic(topic, exists);
    out[topic] = { levels: live.levels, checkpoints: live.checkpoints };
  }
  return out;
}

export function isRoadmapTopic(value: unknown): value is RoadmapTopic {
  return typeof value === 'string' && (ROADMAP_TOPICS as string[]).includes(value);
}

export function isValidLevel(topic: RoadmapTopic, level: number): boolean {
  return Number.isInteger(level) && level >= 1 && level <= topicLevelCount(topic);
}

export function isValidCheckpoint(topic: RoadmapTopic, checkpoint: number): boolean {
  return Number.isInteger(checkpoint) && checkpoint >= 1 && checkpoint <= topicCheckpointCount(topic);
}

/* ──── parts ("learning paths" split) ──────────────────────────────────────
 * Each topic is presented to the learner as PARTS_PER_TOPIC shorter, sequential
 * "parts" instead of one long path — every part ends with its own test. A part
 * is a contiguous slice of the topic's levels; boundaries are derived from the
 * (live) level count so a topic re-splits gracefully if questions are hidden in
 * /dev. The level + question banks are unchanged: parts are a pure split layer,
 * and per-part progress reuses the existing global level / checkpoint maps.
 * ─────────────────────────────────────────────────────────────────────────── */

export const PARTS_PER_TOPIC = 3;
// A part's end-of-part test uses the same gate the old checkpoints did.
export const PART_TEST_PASS = CHECKPOINT_PASS;
// Max questions sampled into a part test. A part spans 3–9 levels (× 8), so the
// test is a focused exam over the part rather than its whole question pool.
export const PART_TEST_SIZE = 20;

/** Split a level count into PARTS_PER_TOPIC contiguous sizes (extra → earlier parts). */
export function partSizes(levelCount: number): number[] {
  const n = Math.max(0, Math.floor(levelCount));
  const base = Math.floor(n / PARTS_PER_TOPIC);
  const rem = n % PARTS_PER_TOPIC;
  return Array.from({ length: PARTS_PER_TOPIC }, (_, i) => base + (i < rem ? 1 : 0));
}

export interface PartRange {
  /** 1-based part number (1..PARTS_PER_TOPIC). */
  part: number;
  /** First / last GLOBAL level (1-based, inclusive) covered by this part. */
  startLevel: number;
  endLevel: number;
  size: number;
}

/** Contiguous global-level ranges for each part of a topic with `levelCount` levels. */
export function partRanges(levelCount: number): PartRange[] {
  const sizes = partSizes(levelCount);
  const ranges: PartRange[] = [];
  let start = 1;
  for (let i = 0; i < sizes.length; i++) {
    const size = sizes[i];
    ranges.push({ part: i + 1, startLevel: start, endLevel: start + size - 1, size });
    start += size;
  }
  return ranges;
}

export function isValidPart(part: number): boolean {
  return Number.isInteger(part) && part >= 1 && part <= PARTS_PER_TOPIC;
}

export { ROADMAP_LEVELS, QUESTIONS_PER_LEVEL };
