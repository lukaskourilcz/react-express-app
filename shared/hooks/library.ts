import { parsePredicate } from './evaluate';
import { HookLibraryError, type Hook, type HookVariant, type HookVertical } from './types';

/**
 * The library version stamped on every impression event.
 *
 * Bump it when a delivery lands, never rename a hook id. Thirteen ids survived the 16 → 49
 * rebuild with new strings, so historical analytics rows carry the same ids as new ones and only
 * this field tells them apart. Renaming would have orphaned the history instead.
 */
export const HOOK_LIBRARY_VERSION = 2;

/** Where the `hook-library/1` delivery lands. Nothing else may write here. */
export const HOOK_LIBRARY_PATH = 'lib/hooks/quiz.hooks.json';

const VERTICALS: readonly HookVertical[] = ['dev', 'geo'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseVariant(hookId: string, vertical: string, raw: unknown): HookVariant {
  if (!isRecord(raw)) throw new HookLibraryError(`Hook "${hookId}": ${vertical} variant is not an object.`);
  const { en, cs } = raw;
  if (typeof en !== 'string' || en.length === 0) {
    throw new HookLibraryError(`Hook "${hookId}": ${vertical}.en is missing or empty.`);
  }
  if (typeof cs !== 'string' || cs.length === 0) {
    throw new HookLibraryError(`Hook "${hookId}": ${vertical}.cs is missing or empty.`);
  }
  return { en, cs };
}

/**
 * Validate the delivered payload into typed hooks.
 *
 * A malformed delivery fails here, at module load, rather than at render time on one unlucky
 * question. The whole point of the delivery being bounded and hash-receipted upstream is that a
 * bad one is loud: a silent skip would leave the card hookless for a subset of questions with
 * nothing in the logs to explain it.
 */
export function parseHookLibrary(raw: unknown): Hook[] {
  if (!Array.isArray(raw)) {
    throw new HookLibraryError(`${HOOK_LIBRARY_PATH} must be a JSON array of hooks.`);
  }
  if (raw.length === 0) {
    throw new HookLibraryError(`${HOOK_LIBRARY_PATH} is empty; the app cannot render a hook from nothing.`);
  }

  const seen = new Set<string>();
  return raw.map((entry, index) => {
    if (!isRecord(entry)) throw new HookLibraryError(`${HOOK_LIBRARY_PATH}[${index}] is not an object.`);

    const { id, cooldownDays, truthRequires, variants } = entry;
    if (typeof id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
      throw new HookLibraryError(`${HOOK_LIBRARY_PATH}[${index}] has an invalid id: ${JSON.stringify(id)}.`);
    }
    if (seen.has(id)) throw new HookLibraryError(`Duplicate hook id "${id}" in the delivered library.`);
    seen.add(id);

    if (typeof cooldownDays !== 'number' || !Number.isInteger(cooldownDays) || cooldownDays < 1) {
      throw new HookLibraryError(`Hook "${id}": cooldownDays must be a positive integer.`);
    }
    if (!Array.isArray(truthRequires) || truthRequires.length === 0) {
      throw new HookLibraryError(`Hook "${id}": truthRequires must be a non-empty array.`);
    }
    if (!isRecord(variants)) throw new HookLibraryError(`Hook "${id}": variants is missing.`);

    const rawRequires = truthRequires.map((requirement, position) => {
      if (typeof requirement !== 'string' || requirement.length === 0) {
        throw new HookLibraryError(`Hook "${id}": truthRequires[${position}] is not a string.`);
      }
      return requirement;
    });

    const parsedVariants: Partial<Record<HookVertical, HookVariant>> = {};
    for (const vertical of VERTICALS) {
      if (variants[vertical] !== undefined) {
        parsedVariants[vertical] = parseVariant(id, vertical, variants[vertical]);
      }
    }
    if (Object.keys(parsedVariants).length === 0) {
      throw new HookLibraryError(`Hook "${id}": no dev or geo variant.`);
    }

    return {
      id,
      cooldownDays,
      truthRequires: rawRequires.map((requirement) => parsePredicate(id, requirement)),
      rawRequires,
      variants: parsedVariants,
    } satisfies Hook;
  });
}

/**
 * The JSON itself is read at each edge rather than imported here.
 *
 * `shared/` is compiled by both the CommonJS API config and the ESM client config, and a JSON
 * default import needs interop flags that differ between them. The client imports the file
 * directly (vite bundles it); the contract test reads it from disk. Both hand the parsed value to
 * `parseHookLibrary`, so there is still exactly one validator.
 */
export function hookById(hooks: readonly Hook[], id: string): Hook | undefined {
  return hooks.find((hook) => hook.id === id);
}
