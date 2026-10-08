import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { generateSharkname, hasSharkWord, seededRandom, SHARK_WORDS } from '../../shared/sharkname';
import { HANDLE_PATTERN, RESERVED_HANDLES, isValidHandle } from '../../shared/handles';

// The Sharkname generator (shared/sharkname.ts): every name it rolls must be
// a handle the database accepts, a shark name, and in good taste. These run
// over many thousands of seeded draws, so a word added to a list that breaks
// a rule fails here rather than on somebody's profile.

const DRAWS = 60_000;

function draw(seed: number, count: number): string[] {
  const random = seededRandom(seed);
  return Array.from({ length: count }, () => generateSharkname(random));
}

const names = draw(55, DRAWS);
const unique = new Set(names);

// Whole segments that must never appear. Separately, fragments that must not
// appear anywhere in the name with its hyphens taken out, so a join of two
// innocent words cannot spell one either.
const BLOCKED_SEGMENTS = [
  'ass', 'sex', 'sexy', 'kill', 'killer', 'die', 'dead', 'death', 'murder', 'gun', 'drug', 'drugs',
  'weed', 'coke', 'beer', 'vodka', 'tequila', 'drunk', 'borracho', 'nude', 'naked', 'hate', 'slave',
  'idiot', 'stupid', 'dumb', 'ugly', 'loser', 'fatty', 'culo', 'ano', 'pene', 'teta', 'tetas', 'coger',
  'polla', 'huevos', 'caliente', 'concha', 'papaya', 'bicho', 'cachondo', 'pinche', 'chingon',
];
const BLOCKED_FRAGMENTS = [
  'fuck', 'shit', 'bitch', 'cunt', 'dick', 'cock', 'porn', 'nazi', 'puta', 'mierda', 'pendej',
  'cabron', 'verga', 'chinga', 'nigg', 'fag', 'retard', 'rape', 'murder', 'cocaine', 'heroin',
  'vagin', 'penis', 'whore', 'slut',
];

describe('the sharkname generator', () => {
  it('always rolls a handle the database accepts: 3–32 characters, lower-case kebab-case, not reserved', () => {
    const bad = names.filter((name) =>
      !HANDLE_PATTERN.test(name) || !isValidHandle(name) || name.length > 32
      || !/^[a-z]+(-[a-z]+)+$/.test(name) || RESERVED_HANDLES.has(name));
    expect(bad).toEqual([]);
  });

  it('always has a shark word in it', () => {
    expect(names.filter((name) => !hasSharkWord(name))).toEqual([]);
    // A segment, not a substring: "finally" is not a fin.
    expect(hasSharkWord('finally-done')).toBe(false);
    expect(hasSharkWord('fin-de-fiesta')).toBe(true);
    for (const word of ['shark', 'sharkie', 'sharky', 'tiburon', 'fin', 'jaws', 'chomp']) expect(SHARK_WORDS.has(word)).toBe(true);
  });

  it('rolls the same names from the same seed, and different ones from another', () => {
    expect(draw(7, 50)).toEqual(draw(7, 50));
    expect(draw(8, 50)).not.toEqual(draw(7, 50));
  });

  it('has thousands of different names, not a handful on repeat', () => {
    expect(unique.size).toBeGreaterThanOrEqual(5_000);
  });

  it('mixes its joke shapes, the owner’s examples among them', () => {
    const shapes = {
      plain: /^[a-z]+-(shark|sharkie|sharky|tiburon|chomper|fin|jaws)$/,
      species: /^[a-z]+-[a-z]+-shark$/,
      elTiburon: /^el-tiburon-[a-z]+$/,
      mc: /^(sharky|sharkie|chompy)-mc-[a-z]+face$/,
      mucho: /^mucho-[a-z]+-[a-z]+$/,
      finDe: /(^|-)fin-de-[a-z]+$/,
      so: /^(shark|sharkie|tiburon)-so-[a-z]+-it-[a-z-]+$/,
      noBueno: /-no-bueno-/,
    };
    for (const [shape, pattern] of Object.entries(shapes)) {
      expect(names.some((name) => pattern.test(name)), shape).toBe(true);
    }
    for (const example of ['thirsty-sharkie', 'shark-so-fat-it-cant-swim', 'blood-no-bueno-shark', 'el-tiburon-loco', 'fin-de-fiesta', 'sharky-mc-tacoface', 'mucho-chomp-shark']) {
      expect(unique.has(example), example).toBe(true);
    }
  });

  it('never rolls a blocked word', () => {
    const blocked = names.filter((name) => {
      const segments = name.split('-');
      const squashed = segments.join('');
      return segments.some((segment) => BLOCKED_SEGMENTS.includes(segment))
        || BLOCKED_FRAGMENTS.some((fragment) => squashed.includes(fragment));
    });
    expect([...new Set(blocked)]).toEqual([]);
  });

  it('rolls something other than the names it is told to avoid', () => {
    const random = seededRandom(3);
    const first = generateSharkname(random);
    for (let i = 0; i < 200; i += 1) {
      expect(generateSharkname(seededRandom(3), [first])).not.toBe(first);
    }
    // A name the server said is taken, in any case, is not offered back.
    expect(generateSharkname(seededRandom(3), [first.toUpperCase()])).not.toBe(first);
  });

  it('uses Math.random when no source is given', () => {
    expect(isValidHandle(generateSharkname())).toBe(true);
  });
});

describe('the seed friends’ sharknames (migration 055)', () => {
  const migration = readFileSync(new URL('../../supabase/supabase-schema-055.sql', import.meta.url), 'utf8');
  const seedScript = readFileSync(new URL('../../scripts/seed-test-friends.ts', import.meta.url), 'utf8');
  const rows = [...migration.matchAll(/\('(seed-friend-[a-z-]+)',\s*'([a-z-]+)',\s*'([a-z-]+)'\)/g)]
    .map(([, id, oldHandle, newHandle]) => ({ id, oldHandle, newHandle }));
  const profiles = [...seedScript.matchAll(/slug: '([a-z-]+)', handle: '([a-z-]+)'/g)]
    .map(([, slug, handle]) => ({ slug, handle }));

  it('renames each of the ten accounts from its first handle, by its id', () => {
    expect(rows).toHaveLength(10);
    expect(profiles).toHaveLength(10);
    for (const row of rows) expect(row.id).toBe(`seed-friend-${row.oldHandle}`);
    expect(rows.map((row) => row.oldHandle).sort()).toEqual(
      ['amara-o', 'jonas-b', 'lena-k', 'mia-dev', 'nina-v', 'pablo-r', 'ravi-p', 'sofia-m', 'tomas-h', 'yuki-t']);
  });

  it('gives them distinct, valid sharknames short enough for the API still running when it is applied', () => {
    const fresh = rows.map((row) => row.newHandle);
    expect(new Set(fresh).size).toBe(10);
    for (const name of fresh) {
      expect(isValidHandle(name), name).toBe(true);
      expect(hasSharkWord(name), name).toBe(true);
      // The code in production before this deploy checks 3–24 characters.
      expect(name.length, name).toBeLessThanOrEqual(24);
    }
  });

  it('took them from the generator, and the seed script writes the same ones', () => {
    const random = seededRandom(2026);
    const rolled = new Set(Array.from({ length: 60 }, () => generateSharkname(random)));
    for (const row of rows) expect(rolled.has(row.newHandle), row.newHandle).toBe(true);
    expect(Object.fromEntries(profiles.map((one) => [one.slug, one.handle])))
      .toEqual(Object.fromEntries(rows.map((row) => [row.oldHandle, row.newHandle])));
  });

  it('renames only while the old handle is there and the new one is free, so a re-run changes nothing', () => {
    expect(migration).toMatch(/WHERE h\.user_id = v\.user_id\s+AND h\.handle = v\.old_handle\s+AND NOT EXISTS \(\s+SELECT 1 FROM public\.user_handles taken WHERE taken\.handle_key = lower\(v\.new_handle\)/);
  });
});
