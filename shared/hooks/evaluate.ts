import {
  HookLibraryError,
  QUIZ_PREDICATE_ARITY,
  TIER_B_PREDICATES,
  type Hook,
  type HookEvalContext,
  type HookPredicate,
  type HookVariant,
  type HookVertical,
} from './types';

/**
 * "difficultyAtLeast:3" → { kind: 'difficultyAtLeast', level: 3 }.
 *
 * Everything this rejects, it rejects loudly. An unknown predicate cannot fall through to "no
 * condition" — that promotes a typo into a hook allowed to front any question, which is the one
 * direction this must never fail in — and it cannot fall through to "never eligible" either,
 * because a hook that silently stops rendering is a bug nobody sees until the pool starves.
 */
export function parsePredicate(hookId: string, raw: string): HookPredicate {
  const separator = raw.indexOf(':');
  const name = separator < 0 ? raw : raw.slice(0, separator);
  const argument = separator < 0 ? null : raw.slice(separator + 1);
  const arity = QUIZ_PREDICATE_ARITY[name];

  if (!arity) {
    throw new HookLibraryError(
      TIER_B_PREDICATES.includes(name)
        ? `Hook "${hookId}" is gated on "${name}", a Tier B predicate this app has not built yet. `
          + 'It must not be delivered until the selector can evaluate it.'
        : `Hook "${hookId}" is gated on "${name}", which is not in the quiz predicate vocabulary `
          + `(${Object.keys(QUIZ_PREDICATE_ARITY).sort().join(', ')}).`,
    );
  }

  if (arity === 'none') {
    if (argument !== null) {
      throw new HookLibraryError(`Hook "${hookId}": "${name}" takes no argument, received "${argument}".`);
    }
    return { kind: name } as HookPredicate;
  }

  if (argument === null || argument.length === 0) {
    throw new HookLibraryError(`Hook "${hookId}": "${name}" needs an argument, written "${name}:<value>".`);
  }

  if (arity === 'number') {
    // Checked as a shape before conversion: Number('') is 0 and Number(' 3 ') is 3, so a
    // post-hoc isNaN test would let both through.
    if (!/^\d+$/.test(argument)) {
      throw new HookLibraryError(`Hook "${hookId}": "${name}" needs a whole number, received "${argument}".`);
    }
    return name === 'optionsAtLeast'
      ? { kind: 'optionsAtLeast', count: Number(argument) }
      : { kind: 'difficultyAtLeast', level: Number(argument) };
  }

  return name === 'categoryIn'
    ? { kind: 'categoryIn', list: argument }
    : { kind: 'questionStartsWith', prefix: argument };
}

export function evaluatePredicate(predicate: HookPredicate, context: HookEvalContext): boolean {
  const { subject, categoryLists } = context;
  switch (predicate.kind) {
    case 'always':
      return true;
    case 'hasCode':
      return subject.hasCode;
    case 'optionsAtLeast':
      return subject.optionCount >= predicate.count;
    case 'difficultyAtLeast':
      return subject.difficulty >= predicate.level;
    case 'categoryIn':
      return (categoryLists[predicate.list] ?? []).includes(subject.category);
    case 'questionStartsWith':
      // Canonical English, case-insensitive, leading whitespace ignored. Pinned by the vectors.
      return subject.canonicalEnglishQuestion
        .trimStart()
        .toLowerCase()
        .startsWith(predicate.prefix.toLowerCase());
    default: {
      // Exhaustiveness: a new predicate kind added to the union without a branch here is a
      // compile error rather than a silent false.
      const unreachable: never = predicate;
      throw new HookLibraryError(`Unhandled predicate ${JSON.stringify(unreachable)}`);
    }
  }
}

/** `truthRequires` is a conjunction: every gate must hold. */
export function hookIsEligible(hook: Hook, context: HookEvalContext): boolean {
  return hook.truthRequires.every((predicate) => evaluatePredicate(predicate, context));
}

/** Eligible hooks, in library order. Order matters: it is what the vectors assert. */
export function eligibleHooks(hooks: readonly Hook[], context: HookEvalContext): Hook[] {
  return hooks.filter((hook) => hookIsEligible(hook, context));
}

/**
 * The line for one vertical and language, with `{topic}` filled.
 *
 * A token that survives to the card is the library leaking its own template into the product, so
 * an unfilled one throws rather than rendering. `{topic}` values are nominative and Czech frames
 * are declension-safe by construction — the upstream lint enforces that, this only fills.
 */
export function renderHookText(input: {
  readonly hook: Hook;
  readonly vertical: HookVertical;
  readonly lang: 'en' | 'cs';
  readonly topic: string;
}): string {
  const variant: HookVariant | undefined = input.hook.variants[input.vertical];
  if (!variant) {
    throw new HookLibraryError(`Hook "${input.hook.id}" has no ${input.vertical} variant.`);
  }
  const filled = variant[input.lang].split('{topic}').join(input.topic);
  const unfilled = filled.match(/\{[a-z]+\}/gi);
  if (unfilled) {
    throw new HookLibraryError(`Hook "${input.hook.id}" still contains ${unfilled.join(', ')} after rendering.`);
  }
  return filled;
}
