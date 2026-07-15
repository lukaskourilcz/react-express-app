// The roadmap "track" the learner is following — Frontend, Backend or
// Fullstack. This is the single source of truth shared by the roadmap map
// (RoadmapTree) and the pillar breakdown (CareerRoadmap), so one choice drives
// the whole /roadmap page. The selection is persisted to localStorage and
// exposed through a tiny observable store so both surfaces re-render together.

import type { RoadmapTopic } from '../types/quiz';
import type { Specialization, CareerRank } from './leveling';
import { displayTitle, subjectRankLabel, RANK_TITLES } from './leveling';
import { readJSON, writeJSON } from './storage';
import { createStore, useStore } from './store';
import type { SubjectId } from './subjects';
import { getSubject, useSubject } from './subjects';

export type Track = 'frontend' | 'backend' | 'fullstack';
export const TRACK_ORDER: Track[] = ['frontend', 'backend', 'fullstack'];

export interface Stage {
  title: string;
  topics: RoadmapTopic[];
}
export interface TrackDef {
  label: string;
  blurb: string;
  stages: Stage[];
}

// A one-line "what you'll learn" detail shown on each topic node / pillar row.
export const TOPIC_DETAIL: Partial<Record<RoadmapTopic, string>> = {
  html: 'Semantic markup, forms, accessibility.',
  css: 'Layout, flexbox & grid, responsive design.',
  javascript: 'Closures, async, and the event loop.',
  typescript: 'Types, generics, and safer refactors.',
  git: 'Branches, merges, pull requests, history.',
  react: 'Components, hooks, state, rendering.',
  nextjs: 'Routing, server components, data fetching.',
  'rhf-zod': 'Forms & validation with React Hook Form + Zod.',
  nodejs: 'Modules, async, HTTP, Express, streams.',
  general: 'How the web works: HTTP, caching, auth.',
  internet: 'How the internet works: IP, DNS, TCP/IP.',
  databases: 'SQL, schema design, indexing, transactions.',
  dsa: 'Complexity, arrays, trees, graphs, sorting.',
  algorithms: 'Problem-solving: recursion, combinatorics, math.',
  testing: 'Unit, integration, and end-to-end testing.',
  'system-design': 'Caching, queues, sharding, trade-offs.',
  devops: 'CI/CD, containers, observability, the cloud.',
  security: 'Auth, the OWASP Top 10, secure defaults.',
  // Geography
  continents: 'The seven continents and five oceans.',
  capitals: 'Countries and their capital cities.',
  flags: 'National flags, colors, and symbols.',
  landforms: 'Mountains, rivers, deserts, and coasts.',
  climate: 'Climate zones, biomes, and weather.',
  population: 'People, cities, and migration.',
  political: 'Borders, countries, and territories.',
  economic: 'Resources, trade, and industry.',
  cartography: 'Maps, projections, and coordinates.',
  earth: 'Plate tectonics, rocks, and Earth systems.',
  // Math
  arithmetic: 'Whole numbers, the four operations, order of operations.',
  fractions: 'Fractions, decimals, percentages, and ratios.',
  prealgebra: 'Integers, exponents, variables, and first equations.',
  algebra: 'Equations, lines, factoring, quadratics, functions.',
  geometry: 'Angles, shapes, area, volume, the Pythagorean theorem.',
  trigonometry: 'Sine, cosine, tangent, the unit circle, identities.',
  statistics: 'Averages, spread, probability, and counting.',
  precalculus: 'Functions, logarithms, sequences, complex numbers.',
  calculus: 'Limits, derivatives, integrals, the fundamental theorem.',
  'linear-algebra': 'Vectors, matrices, determinants, eigenvalues.',
  // History
  prehistory: 'Human origins, the Stone Age, and the first farmers.',
  ancient: 'Mesopotamia, Egypt, the Indus, and early China.',
  classical: 'Greece, Rome, and the Hellenistic world.',
  medieval: 'Byzantium, Islam, feudalism, and the Crusades.',
  renaissance: 'Humanism, the Reformation, and global exploration.',
  earlymodern: 'The Enlightenment and the age of revolutions.',
  industrial: 'Steam, factories, empire, and mass society.',
  worldwars: 'WWI, WWII, and the upheavals between them.',
  coldwar: 'Superpower rivalry, proxy wars, and decolonization.',
  modern: 'Globalization, the digital age, and the world today.',
  // Chess
  rules: 'The board, setup, turns, and how a game is won.',
  pieces: 'How every piece moves, captures, and its value.',
  specialmoves: 'Castling, promotion, and en passant.',
  checkmate: 'Check, checkmate, stalemate, and draws.',
  notation: 'Read & write games in algebraic notation.',
  openings: 'Center, development, and safe kings.',
  tactics: 'Forks, pins, skewers, and discovered attacks.',
  strategy: 'Pawn structure, outposts, files, and plans.',
  endgames: 'King & pawn, the opposition, basic mates.',
  combinations: 'Sacrifices, deflection, decoys, and calculation.',
  'discrete-math': 'Logic, sets, combinatorics, graphs, and recurrences.',
  'number-theory': 'Divisibility, primes, modular arithmetic, and the theorems of Fermat and Euler.',
  'multivariable-calculus': 'Partial derivatives, gradients, multiple integrals, and vector calculus.',
  'differential-equations': 'Solving ODEs: separable, linear, second-order, and Laplace transforms.',
  'real-analysis': 'Rigorous limits, sequences, series, continuity, and integration.',
  'geomorphology': 'How weathering, rivers, ice, wind and tectonics shape the land.',
  'oceanography': 'Ocean basins, currents, tides, and how the sea shapes climate.',
  'biogeography': 'Biomes, ecosystems, and how life is distributed across the planet.',
  'geopolitics': 'States, alliances, geostrategy, and the geography of global power.',
  'gis': 'Coordinate systems, projections, remote sensing, and spatial analysis.',
  'historiography': 'How historians use sources, methods and theory to reconstruct the past.',
  'history-of-science': 'From Greek natural philosophy to the Scientific Revolution and modern physics.',
  'economic-history': 'From coinage and trade to industrial capitalism and modern finance.',
  'intellectual-history': 'The big ideas that shaped history, from Greek philosophy to modern ideologies.',
  'military-history': 'How warfare, strategy and technology evolved from the phalanx to the nuclear age.',
  'cell-biology': 'Core cell biology from organelles to genetics.',
  'skeletal-system': 'How the skeleton is built, joined and remodeled.',
  'muscular-system': 'Muscle types, contraction, and the movements they drive.',
  'nervous-system': 'Neurons, the brain and spinal cord, and the senses.',
  'endocrine-system': 'Hormones and glands that regulate the body.',
  'cardiovascular-system': 'Blood, the heart, vessels and circulation.',
  'respiratory-system': 'The lungs, breathing and gas exchange.',
  'digestive-system': 'How food is digested and nutrients absorbed.',
  'immune-system': 'How the body defends itself against disease.',
  'reproductive-system': 'The kidneys, reproduction and human genetics.',
};

// Curated tracks. Each is a top-to-bottom story: foundations → specialise →
// production. Fullstack is the union; Frontend and Backend share the core
// (JS/TS/Git/Testing) and branch into their own concerns. Non-essential topics
// (Cool Stuff, AI, Abbreviations) are intentionally left off.
const WEBDEV_TRACKS: Record<Track, TrackDef> = {
  frontend: {
    label: 'Frontend',
    blurb: 'Build the interfaces people actually touch: markup, styling, and the React stack.',
    stages: [
      { title: 'Foundations', topics: ['html', 'css', 'javascript'] },
      { title: 'Level up the language', topics: ['typescript', 'git'] },
      { title: 'The React stack', topics: ['react', 'nextjs', 'rhf-zod'] },
      { title: 'Ship with confidence', topics: ['testing', 'dsa'] },
    ],
  },
  backend: {
    label: 'Backend',
    blurb: 'Build and run the server: APIs, data, and systems that hold up under load.',
    stages: [
      { title: 'Foundations', topics: ['javascript', 'typescript', 'git'] },
      { title: 'The server & the web', topics: ['nodejs', 'general', 'internet'] },
      { title: 'Data & computer science', topics: ['databases', 'dsa', 'algorithms'] },
      { title: 'Production & scale', topics: ['testing', 'system-design', 'devops', 'security'] },
    ],
  },
  fullstack: {
    label: 'Fullstack',
    blurb: 'The whole picture: frontend, backend, and everything that ties them together.',
    stages: [
      { title: 'Foundations', topics: ['html', 'css', 'javascript'] },
      { title: 'Level up the language', topics: ['typescript', 'git'] },
      { title: 'Frontend', topics: ['react', 'nextjs', 'rhf-zod'] },
      { title: 'Backend', topics: ['nodejs', 'general', 'internet', 'databases'] },
      { title: 'Computer science', topics: ['dsa', 'algorithms'] },
      { title: 'Production & scale', topics: ['testing', 'system-design', 'devops', 'security'] },
    ],
  },
};

const GEOGRAPHY_TRACKS: Record<Track, TrackDef> = {
  frontend: {
    label: 'World Basics',
    blurb: 'Get your bearings: the continents, oceans, countries, and how to read a map.',
    stages: [
      { title: 'The map of the world', topics: ['continents', 'capitals'] },
      { title: 'Reading the world', topics: ['flags', 'cartography'] },
      { title: 'The physical world', topics: ['landforms', 'climate'] },
      { title: 'Going deeper', topics: ['earth'] },
    ],
  },
  backend: {
    label: 'Human Geography',
    blurb: 'How people shape the world: countries, borders, cities, and economies.',
    stages: [
      { title: 'Countries & capitals', topics: ['capitals', 'flags'] },
      { title: 'People & borders', topics: ['population', 'political'] },
      { title: 'How the world works', topics: ['economic', 'cartography'] },
    ],
  },
  fullstack: {
    label: 'The Full Atlas',
    blurb: 'The whole picture: physical geography, human geography, and everything between.',
    stages: [
      { title: 'Foundations', topics: ['continents', 'capitals', 'flags'] },
      { title: 'The physical world', topics: ['landforms', 'climate', 'earth'] },
      { title: 'The human world', topics: ['population', 'political', 'economic'] },
      { title: 'Master the map', topics: ['cartography'] },
      { title: 'Advanced geography', topics: ['geomorphology', 'oceanography', 'biogeography', 'geopolitics', 'gis'] },
    ],
  },
};

const MATH_TRACKS: Record<Track, TrackDef> = {
  frontend: {
    label: 'School Math',
    blurb: 'Where it all begins: numbers, fractions, and your very first algebra and shapes.',
    stages: [
      { title: 'Number foundations', topics: ['arithmetic', 'fractions'] },
      { title: 'Building blocks', topics: ['prealgebra', 'geometry'] },
      { title: 'Into algebra', topics: ['algebra'] },
    ],
  },
  backend: {
    label: 'High School Math',
    blurb: 'The high-school core: algebra and geometry, then trigonometry, statistics, and pre-calculus.',
    stages: [
      { title: 'Core algebra & geometry', topics: ['algebra', 'geometry'] },
      { title: 'Trig & data', topics: ['trigonometry', 'statistics'] },
      { title: 'Toward calculus', topics: ['precalculus'] },
    ],
  },
  fullstack: {
    label: 'The Full Journey',
    blurb: 'Zero to hero: from counting all the way up through university mathematics — calculus, analysis, and beyond.',
    stages: [
      { title: 'Foundations', topics: ['arithmetic', 'fractions', 'prealgebra'] },
      { title: 'Core', topics: ['algebra', 'geometry'] },
      { title: 'Advanced high school', topics: ['trigonometry', 'statistics', 'precalculus'] },
      { title: 'Higher math', topics: ['calculus', 'linear-algebra'] },
      { title: 'University mathematics', topics: ['discrete-math', 'number-theory', 'multivariable-calculus', 'differential-equations', 'real-analysis'] },
    ],
  },
};

const HISTORY_TRACKS: Record<Track, TrackDef> = {
  frontend: {
    label: 'The Ancient World',
    blurb: 'Journey from human origins through the great early civilizations to the medieval age.',
    stages: [
      { title: 'Foundations', topics: ['prehistory', 'ancient'] },
      { title: 'The Classical Age', topics: ['classical'] },
      { title: 'The Middle Ages', topics: ['medieval'] },
      { title: 'A World Reborn', topics: ['renaissance'] },
    ],
  },
  backend: {
    label: 'The Modern Era',
    blurb: 'Trace the modern world from the age of revolutions through the World Wars to today.',
    stages: [
      { title: 'Revolutions', topics: ['renaissance', 'earlymodern'] },
      { title: 'Industry & Empire', topics: ['industrial'] },
      { title: 'The World at War', topics: ['worldwars', 'coldwar'] },
      { title: 'The World Today', topics: ['modern'] },
    ],
  },
  fullstack: {
    label: 'The Full Timeline',
    blurb: 'The whole story of humanity, from the Stone Age to the twenty-first century.',
    stages: [
      { title: 'The Ancient World', topics: ['prehistory', 'ancient', 'classical'] },
      { title: 'The Middle Ages', topics: ['medieval'] },
      { title: 'Rebirth & Revolution', topics: ['renaissance', 'earlymodern'] },
      { title: 'Industry & Empire', topics: ['industrial'] },
      { title: 'The Modern World', topics: ['worldwars', 'coldwar', 'modern'] },
      { title: 'Thematic history', topics: ['historiography', 'history-of-science', 'economic-history', 'intellectual-history', 'military-history'] },
    ],
  },
};

const CHESS_TRACKS: Record<Track, TrackDef> = {
  frontend: {
    label: 'Beginner (Learn the Rules)',
    blurb: 'Everything you need to sit down and play a legal game with confidence.',
    stages: [
      { title: 'The basics', topics: ['rules', 'pieces'] },
      { title: 'Moves & mate', topics: ['specialmoves', 'checkmate'] },
      { title: 'Read the game', topics: ['notation'] },
    ],
  },
  backend: {
    label: 'Club Player',
    blurb: 'Start winning games: open well, spot tactics, and convert the endgame.',
    stages: [
      { title: 'Start strong', topics: ['openings'] },
      { title: 'Win material', topics: ['tactics', 'combinations'] },
      { title: 'Outplay them', topics: ['strategy', 'endgames'] },
    ],
  },
  fullstack: {
    label: 'The Full Path',
    blurb: 'The whole journey: from the rules of the board to advanced combinations.',
    stages: [
      { title: 'Learn the rules', topics: ['rules', 'pieces', 'specialmoves'] },
      { title: 'Checkmate & notation', topics: ['checkmate', 'notation'] },
      { title: 'Openings & tactics', topics: ['openings', 'tactics'] },
      { title: 'Strategy & endgames', topics: ['strategy', 'endgames'] },
      { title: 'Master combinations', topics: ['combinations'] },
    ],
  },
};

// All subjects' tracks, keyed by subject. The active subject selects which
// map drives the roadmap/track pickers.
const BIOLOGY_TRACKS: Record<Track, TrackDef> = {
  frontend: {
    label: 'Body Basics',
    blurb: 'Start with the building blocks: cells, bones and muscles.',
    stages: [
      { title: 'The cell', topics: ['cell-biology'] },
      { title: 'Structure & movement', topics: ['skeletal-system', 'muscular-system'] },
    ],
  },
  backend: {
    label: 'Systems & Control',
    blurb: 'How the body senses, regulates, and keeps itself supplied.',
    stages: [
      { title: 'Control & sensing', topics: ['nervous-system', 'endocrine-system'] },
      { title: 'Transport & exchange', topics: ['cardiovascular-system', 'respiratory-system'] },
    ],
  },
  fullstack: {
    label: 'The Whole Body',
    blurb: 'The complete tour: every system, from a single cell to a whole human being.',
    stages: [
      { title: 'Foundations', topics: ['cell-biology'] },
      { title: 'Structure & movement', topics: ['skeletal-system', 'muscular-system'] },
      { title: 'Control & sensing', topics: ['nervous-system', 'endocrine-system'] },
      { title: 'Transport & exchange', topics: ['cardiovascular-system', 'respiratory-system'] },
      { title: 'Processing & defense', topics: ['digestive-system', 'immune-system'] },
      { title: 'Balance & continuity', topics: ['reproductive-system'] },
    ],
  },
};

export const TRACKS_BY_SUBJECT: Record<SubjectId, Record<Track, TrackDef>> = {
  webdev: WEBDEV_TRACKS,
  geography: GEOGRAPHY_TRACKS,
  math: MATH_TRACKS,
  history: HISTORY_TRACKS,
  chess: CHESS_TRACKS,
  biology: BIOLOGY_TRACKS,
};

/** The track map for a given subject. */
export const tracksForSubject = (id: SubjectId): Record<Track, TrackDef> => TRACKS_BY_SUBJECT[id];
/** The track map for the active subject (imperative). */
export const tracksForActiveSubject = (): Record<Track, TrackDef> => TRACKS_BY_SUBJECT[getSubject()];
/** Live track map for the active subject — re-renders when the subject changes. */
export function useActiveTracks(): Record<Track, TrackDef> {
  const [subject] = useSubject();
  return TRACKS_BY_SUBJECT[subject];
}

// The set of topics a track covers = the union of its stages. Used to filter
// the pillar breakdown so it shows exactly what the map shows.
const topicsOf = (tracks: Record<Track, TrackDef>, track: Track): Set<RoadmapTopic> =>
  new Set(tracks[track].stages.flatMap((s) => s.topics));

/** The topics a track covers, within the active subject. */
export const trackTopics = (track: Track): Set<RoadmapTopic> =>
  topicsOf(tracksForActiveSubject(), track);

export const isTopicInTrack = (track: Track, topic: RoadmapTopic): boolean =>
  trackTopics(track).has(topic);

/**
 * The learning sections unlocked when a learner commits to a track in their
 * profile: the track's first two stages (its foundations plus the first
 * specialise tier). Enough to dive straight in on the chosen path; the rest of
 * the path keeps unlocking through the normal prerequisite progression.
 */
export function trackStarterTopics(track: Track): RoadmapTopic[] {
  const stages = tracksForActiveSubject()[track].stages.slice(0, 2);
  return Array.from(new Set(stages.flatMap((s) => s.topics)));
}

// The career-title flavor each track maps to (drives "Junior Frontend
// Developer", "Senior Backend Engineer", etc.).
const TRACK_SPECIALIZATION: Record<Track, Specialization> = {
  frontend: 'Frontend',
  backend: 'Backend',
  fullstack: 'Full-Stack',
};

/** The career-rank specialization label for a track. */
export const specializationForTrack = (track: Track): Specialization => TRACK_SPECIALIZATION[track];

/**
 * The learner-rank label ({title, emoji}) for the ACTIVE subject. Web Dev keeps
 * the developer ladder with the track specialization composed in ("Junior
 * Full-Stack Developer"); every other subject uses its own ladder ("Junior
 * Explorer", "Club Player", …). Shared by the profile, avatar menu and toaster.
 */
export function rankLabelFor(rank: CareerRank, track: Track): { title: string; emoji: string } {
  const subject = getSubject();
  if (subject === 'webdev') {
    return { title: displayTitle(rank.title, specializationForTrack(track)), emoji: rank.emoji };
  }
  const idx = RANK_TITLES.indexOf(rank.title);
  return subjectRankLabel(subject, idx >= 0 ? idx : 0);
}

/* ──── Persisted, shared selection ──────────────────────────────────────── */

const TRACK_KEY = 'devquiz:roadmap:track';
// Whether the learner has explicitly committed to a track, as opposed to just
// getting the 'fullstack' default. Drives the landing page: show the picker
// until a path is chosen, then reflect it and nudge the learner to start.
const TRACK_CHOSEN_KEY = 'devquiz:roadmap:track:chosen';
const isTrack = (v: unknown): v is Track =>
  v === 'frontend' || v === 'backend' || v === 'fullstack';

const readTrack = (): Track => {
  const saved = readJSON<string>(TRACK_KEY, 'fullstack');
  return isTrack(saved) ? saved : 'fullstack';
};
const readChosen = (): boolean => readJSON<boolean>(TRACK_CHOSEN_KEY, false) === true;

const trackStore = createStore<Track>(readTrack);
const chosenStore = createStore<boolean>(readChosen);

/** Imperative snapshot of the current track (for non-React callers, e.g. the toaster). */
export const getTrack = (): Track => trackStore.get();

/** Imperative snapshot of whether a track has been explicitly chosen. */
export const getHasChosenTrack = (): boolean => chosenStore.get();

/**
 * Set the roadmap track and (by default) mark it as explicitly chosen. Shared
 * by the hook, the profile/roadmap pickers, and cross-device sign-in sync.
 * Writes localStorage and notifies both stores so every surface re-renders.
 */
export function setTrackValue(next: Track, opts?: { markChosen?: boolean }): void {
  writeJSON(TRACK_KEY, next);
  trackStore.emit();
  if (opts?.markChosen !== false) {
    writeJSON(TRACK_CHOSEN_KEY, true);
    chosenStore.emit();
  }
}

/** Live, persisted roadmap track plus a setter. Shared across the page. */
export function useTrack(): [Track, (next: Track) => void] {
  const track = useStore(trackStore);
  return [track, (next: Track) => setTrackValue(next)];
}

/** Live flag: has the learner explicitly picked a track yet? */
export function useHasChosenTrack(): boolean {
  return useStore(chosenStore);
}
