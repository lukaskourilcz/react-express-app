/**
 * The Sharkname generator: a random, silly, shark-shaped handle such as
 * `thirsty-sharkie`, `el-tiburon-loco` or `shark-so-fat-it-cant-swim`.
 *
 * Pure and deterministic for a given random source, so the Profile rolls names
 * with `Math.random` and a test (or migration 055's seed friends) replays the
 * same names from a seeded source.
 *
 * Every name is lower-case kebab-case, passes the handle rule in
 * `shared/handles.ts` (3–32 characters, not reserved) and has at least one
 * segment from SHARK_WORDS. The tone is cartoon shark: the jokes are about
 * the shark (a shark so fat it cannot swim), never about a person, and the
 * word lists hold no slurs, nothing sexual, no drugs or drink, and no
 * violence past a chomp. Spanish words are ones most English speakers know,
 * written without accents because a handle is ASCII (tiburón → tiburon).
 */

import { HANDLE_MAX_LENGTH, isValidHandle } from './handles';

/** A source of numbers in [0, 1), like Math.random. */
export type RandomSource = () => number;

/** The segments that make a name a shark name. Every generated name has one. */
export const SHARK_WORDS: ReadonlySet<string> = new Set([
  'shark', 'sharkie', 'sharky', 'tiburon', 'fin', 'jaws', 'chomp', 'chompy', 'chomper',
]);

/** What a name ends in when the template wants "a shark". */
const SHARK_NOUNS = ['shark', 'sharkie', 'sharky', 'tiburon', 'chomper', 'fin', 'jaws'] as const;

/** English adjectives for a shark. Silly, kind or developer-flavoured. */
const ADJECTIVES = [
  'thirsty', 'sleepy', 'hungry', 'sneaky', 'grumpy', 'salty', 'soggy', 'wobbly', 'zippy',
  'snappy', 'bubbly', 'cheeky', 'dizzy', 'fancy', 'fearless', 'fuzzy', 'giggly', 'goofy',
  'jazzy', 'jolly', 'lazy', 'lucky', 'mighty', 'nervous', 'peckish', 'polite', 'sassy',
  'shy', 'speedy', 'spicy', 'sunny', 'tiny', 'turbo', 'wiggly', 'chill', 'cosmic',
  'crispy', 'curious', 'dapper', 'dramatic', 'humble', 'majestic', 'moody', 'nifty',
  'noble', 'plucky', 'quirky', 'rowdy', 'rusty', 'sparkly', 'stealthy', 'swift', 'toasty',
  'wavy', 'zesty', 'caffeinated', 'confused', 'fluffy', 'gentle', 'glitchy', 'sleepless',
  'snacky', 'async', 'recursive', 'deployed', 'compiled', 'cached', 'buggy', 'clumsy',
  'cozy', 'cranky', 'cuddly', 'epic', 'extra', 'fabulous', 'fizzy', 'frosty', 'funky',
  'gallant', 'groovy', 'hasty', 'hyper', 'legendary', 'mellow', 'mysterious', 'nautical',
  'nosy', 'perky', 'punctual', 'retro', 'royal', 'sleek', 'snazzy', 'spooky', 'sporty',
  'squeaky', 'sturdy', 'tidy', 'wise', 'witty', 'yawning', 'zany',
] as const;

/** Real sharks. Always followed by "shark". */
const SPECIES = [
  'hammerhead', 'mako', 'tiger', 'bull', 'nurse', 'whale', 'lemon', 'goblin', 'megamouth',
  'wobbegong', 'basking', 'thresher', 'blacktip', 'whitetip', 'reef', 'angel', 'zebra',
  'cookiecutter', 'epaulette', 'porbeagle', 'greenland', 'frilled', 'lantern', 'swell',
  'sixgill', 'leopard', 'silky', 'spinner', 'dusky', 'horn', 'carpet', 'saw', 'bamboo',
  'blue', 'sand', 'bonnethead', 'cat',
] as const;

/** Spanish adjectives, for el-tiburon-loco and sharkie-grande. "gordo" stays
 * about the shark: the templates never point it at anybody else. */
const SPANISH_ADJECTIVES = [
  'loco', 'grande', 'rapido', 'feliz', 'tranquilo', 'valiente', 'guapo', 'chido', 'dormido',
  'hambriento', 'elegante', 'famoso', 'picante', 'fuerte', 'magnifico', 'misterioso',
  'pequeno', 'simpatico', 'contento', 'perezoso', 'gordo', 'bonito', 'fantastico',
  'tremendo', 'salado', 'veloz', 'listo', 'genial',
] as const;

/** Spanish food everybody knows. */
const FOODS = [
  'taco', 'nacho', 'churro', 'burrito', 'salsa', 'queso', 'tortilla', 'guacamole',
  'quesadilla', 'empanada', 'paella', 'tamale', 'gazpacho', 'flan', 'tapas',
] as const;

/** Other Spanish words everybody knows, worn in front of a shark. */
const SPANISH_WORDS = [
  'fiesta', 'siesta', 'fuego', 'playa', 'ola', 'amigo', 'hola', 'vamos', 'gracias',
  'adios', 'mucho', 'grande', 'loco', 'ole', 'arriba',
] as const;

/** For sharky-mc-tacoface. */
const MC_SHARKS = ['sharky', 'sharkie', 'chompy'] as const;
const MC_FACES = [
  'taco', 'nacho', 'churro', 'burrito', 'queso', 'bubble', 'splash', 'snack', 'wave',
  'noodle', 'waffle', 'pickle', 'pancake', 'biscuit', 'muffin', 'flan', 'sushi', 'pretzel',
] as const;

/** For mucho-chomp-shark. */
const MUCHO = [
  'chomp', 'splash', 'snack', 'swim', 'nap', 'fiesta', 'siesta', 'drama', 'bubble',
  'crunch', 'sass', 'fuego', 'gusto', 'salsa',
] as const;

/** For fin-de-fiesta: "fin de" is Spanish for "end of", and a fin is a fin. */
const FIN_DE = ['fiesta', 'siesta', 'semana', 'playa', 'mes', 'juego', 'temporada', 'curso'] as const;

/** For shark-so-fat-it-cant-swim: the shark is the joke, every time. */
const SO_SUBJECTS = ['shark', 'sharkie', 'tiburon'] as const;
const SO_JOKES: readonly (readonly [string, string])[] = [
  ['fat', 'cant-swim'], ['fat', 'has-a-tide'], ['fast', 'lapped-itself'],
  ['slow', 'lost-to-a-snail'], ['lazy', 'naps-mid-chomp'], ['sleepy', 'snores-bubbles'],
  ['hungry', 'ate-the-menu'], ['polite', 'says-gracias'], ['smart', 'knows-regex'],
  ['smart', 'writes-css'], ['salty', 'needs-water'], ['tiny', 'rides-a-shrimp'],
  ['shy', 'hides-in-kelp'], ['loud', 'scares-whales'], ['fancy', 'wears-a-bowtie'],
  ['cool', 'surfs-backwards'], ['confused', 'swims-sideways'], ['happy', 'hugs-dolphins'],
  ['spicy', 'eats-salsa'], ['buggy', 'swims-in-loops'], ['grumpy', 'bites-mondays'],
  ['chill', 'never-bites'], ['extra', 'has-three-fins'], ['old', 'knows-jaws'],
  ['dramatic', 'sighs'], ['lost', 'asked-a-map'], ['tidy', 'flosses'],
];

/** For blood-no-bueno-shark: things a shark is not into. */
const NO_BUENO = [
  'blood', 'sangre', 'mondays', 'lunes', 'homework', 'kale', 'cardio', 'sunburn', 'seaweed',
  'plankton', 'sand', 'bugs', 'typos', 'deadlines', 'semicolons', 'jellyfish', 'decaf',
  'alarms', 'spoilers', 'merge-conflicts',
] as const;

const pick = <T,>(random: RandomSource, list: readonly T[]): T =>
  list[Math.min(list.length - 1, Math.floor(random() * list.length))];

const join = (...parts: string[]): string => parts.join('-');

/** One template per joke shape. Each returns a name with a shark word in it. */
const TEMPLATES: readonly ((random: RandomSource) => string)[] = [
  (r) => join(pick(r, ADJECTIVES), pick(r, SHARK_NOUNS)),
  (r) => join(pick(r, ADJECTIVES), pick(r, SPECIES), 'shark'),
  (r) => join('el-tiburon', pick(r, SPANISH_ADJECTIVES)),
  (r) => join(pick(r, FOODS), pick(r, SHARK_NOUNS)),
  (r) => join(pick(r, MC_SHARKS), 'mc', `${pick(r, MC_FACES)}face`),
  (r) => join('mucho', pick(r, MUCHO), pick(r, SHARK_NOUNS)),
  (r) => join('muy', pick(r, ADJECTIVES), pick(r, SHARK_NOUNS)),
  (r) => (r() < 0.25 ? join('fin-de', pick(r, FIN_DE)) : join(pick(r, ADJECTIVES), 'fin-de', pick(r, FIN_DE))),
  (r) => {
    const [adjective, tail] = pick(r, SO_JOKES);
    return join(pick(r, SO_SUBJECTS), 'so', adjective, 'it', tail);
  },
  (r) => join(pick(r, NO_BUENO), 'no-bueno', pick(r, SHARK_NOUNS)),
  (r) => join(pick(r, SPANISH_WORDS), pick(r, SHARK_NOUNS)),
  (r) => join(pick(r, SHARK_NOUNS), pick(r, SPANISH_ADJECTIVES)),
];

/** True when `name` has a segment from SHARK_WORDS. */
export const hasSharkWord = (name: string): boolean =>
  name.toLowerCase().split(/[-_]/).some((segment) => SHARK_WORDS.has(segment));

/**
 * A random sharkname. `avoid` lists names not to return (the learner's current
 * one, or one the server just said is taken). Deterministic for a seeded
 * `random`. A draw too long for a handle is drawn again; the fallback is
 * never reached with these lists but keeps the result a valid handle.
 */
export function generateSharkname(random: RandomSource = Math.random, avoid: Iterable<string> = []): string {
  const skip = new Set(Array.from(avoid, (name) => name.toLowerCase()));
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const name = pick(random, TEMPLATES)(random);
    if (name.length <= HANDLE_MAX_LENGTH && isValidHandle(name) && hasSharkWord(name) && !skip.has(name)) return name;
  }
  return skip.has('thirsty-sharkie') ? 'sleepy-sharkie' : 'thirsty-sharkie';
}

/** A seeded RandomSource (mulberry32): the same seed gives the same names. */
export function seededRandom(seed: number): RandomSource {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
