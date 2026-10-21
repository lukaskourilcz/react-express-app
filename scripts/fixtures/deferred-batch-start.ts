/** Captures membership during the call, but starts workers after an initial
 * microtask. The task permits this; fixtures must not assume registration
 * already happened when the wrapper returned. */
export const DEFERRED_BATCH_START = "const inBatches = async (items, size, worker) => {\n  const input = items.slice();\n  await Promise.resolve();\n  const results = [];\n  for (let start = 0; start < input.length; start += size) {\n    const batch = input.slice(start, start + size);\n    const done = await Promise.all(batch.map(item => worker(item)));\n    results.push(...done);\n  }\n  return results;\n};";
