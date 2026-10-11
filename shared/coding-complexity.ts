/** Advisory metadata. Complexity never decides correctness, access or rewards. */
export interface ComplexityGuidance {
  targetTime: string | null;
  targetSpace: string | null;
  note: string;
}

export interface ComplexityReport {
  time: string | null;
  assessment: 'within-target' | 'above-target' | 'estimated' | 'unknown';
  explanation: string;
  assumptions: string;
  guidance: ComplexityGuidance;
}

/** Only explicitly authored targets are presented as targets. */
export function complexityGuidance(task: { track: string; prompt: { en: string }; tests?: unknown[] }): ComplexityGuidance {
  const text = task.prompt.en;
  const target = text.match(/Target:\s*(O\([^)]+\))\s*time/i);
  const space = target ? text.slice(target.index).match(/(O\([^)]+\))\s*(?:extra\s+)?space/i) : null;
  return {
    targetTime: target?.[1] ?? null,
    targetSpace: space?.[1] ?? null,
    note: task.track === 'react'
      ? 'Consider the data processed on each render, repeated work and extra allocations. UI and asynchronous behaviour need a manual complexity review.'
      : !task.tests?.length
        ? 'Big O describes runtime growth. Type-only and design tasks need a manual review; compiler work is not the runtime complexity of your solution.'
        : 'n is the size of the input. Prefer fewer repeated scans and avoid growing work inside another scan. Submit to see a code-structure estimate; correctness is checked separately.',
  };
}
