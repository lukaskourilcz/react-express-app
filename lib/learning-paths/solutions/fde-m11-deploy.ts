/** Server-only reference solution and hidden assertions for FDE M11 (the
 * temporary module id `fde-v1-m11-deploy`). Never imported from client code,
 * and never from `../catalog`.
 *
 * The visible tests show each gate holding on its own. The hidden ones aim at
 * what a learner can pass without having understood the point: a status
 * nobody listed, a `null` report read as "nothing to check", a blank restore
 * point, a key the release does not require, a duplicate reason, a rollout
 * left out of the log, and a candidate the gate writes into. Every criterion
 * is critical, so a release that rolls out over failed migration evidence
 * fails the activity whatever the other gates scored. */

import type { PathCodeSolution } from '../types';

const GATE_RELEASE = `interface HealthProbe {
  instance: string;
  status: string;
}

interface ConfigProbe {
  key: string;
  state: string;
  value?: string;
}

interface MigrationReport {
  id: string;
  status: string;
  reversible: boolean;
}

interface ReleaseCandidate {
  release: string;
  checkedAt: string;
  requiredConfig: string[];
  health: HealthProbe[] | null;
  config: ConfigProbe[] | null;
  migrations: MigrationReport[] | null;
  restorePoint: string | null;
}

type Decision = 'rollout' | 'hold';

interface GateDecision {
  decision: Decision;
  release: string;
  reasons: string[];
}

interface DecisionRecord {
  release: string;
  decision: Decision;
  reasons: string[];
  checkedAt: string;
}

interface DecisionLog {
  record(entry: DecisionRecord): void;
}

const healthReasons = (probes: HealthProbe[] | null): string[] => {
  if (!Array.isArray(probes) || probes.length === 0) return ['health:no-probes'];
  return probes
    .filter((probe) => probe.status !== 'ready')
    .map((probe) => \`health:\${probe.instance}:\${probe.status}\`);
};

const configReasons = (required: string[], probes: ConfigProbe[] | null): string[] => {
  if (!Array.isArray(probes)) return ['config:no-report'];
  const byKey = new Map<string, ConfigProbe>();
  for (const probe of probes) byKey.set(probe.key, probe);
  const reasons: string[] = [];
  for (const key of required) {
    const probe = byKey.get(key);
    if (probe === undefined) reasons.push(\`config:\${key}:missing\`);
    else if (probe.state !== 'ok') reasons.push(\`config:\${key}:\${probe.state}\`);
  }
  return reasons;
};

const migrationReasons = (migrations: MigrationReport[] | null, restorePoint: string | null): string[] => {
  if (!Array.isArray(migrations)) return ['migration:no-report'];
  const hasRestorePoint = typeof restorePoint === 'string' && restorePoint.trim() !== '';
  const reasons: string[] = [];
  for (const migration of migrations) {
    if (migration.status !== 'applied') reasons.push(\`migration:\${migration.id}:\${migration.status}\`);
    if (migration.reversible !== true && !hasRestorePoint) {
      reasons.push(\`migration:\${migration.id}:irreversible-without-restore-point\`);
    }
  }
  return reasons;
};

const gateRelease = (candidate: ReleaseCandidate, log: DecisionLog): GateDecision => {
  const found = [
    ...healthReasons(candidate.health),
    ...configReasons(candidate.requiredConfig, candidate.config),
    ...migrationReasons(candidate.migrations, candidate.restorePoint),
  ];
  const reasons = [...new Set(found)].sort();
  const decision: Decision = reasons.length === 0 ? 'rollout' : 'hold';
  log.record({ release: candidate.release, decision, reasons: [...reasons], checkedAt: candidate.checkedAt });
  return { decision, release: candidate.release, reasons };
};`;

export const FDE_M11_DEPLOY_SOLUTIONS: Record<string, PathCodeSolution> = {
  'fde-v1-m11-deploy-release-gate': {
    solution: GATE_RELEASE,
    hiddenTests: [
      {
        call: "__gate({ health: [{ instance: 'web-1', status: 'ready' }, { instance: 'web-2', status: 'starting' }] }).out.reasons",
        expected: ['health:web-2:starting'],
        criterion: 'health-gate',
      },
      {
        call: '__gate({ health: null }).out',
        expected: { decision: 'hold', release: 'R-2026.10.3', reasons: ['health:no-probes'] },
        edge: true,
        criterion: 'health-gate',
      },
      {
        call: "__gate({ health: [{ instance: 'web-1', status: 'Ready' }, { instance: 'web-2', status: 'ready' }, { instance: 'web-3', status: 'ready' }] }).out.reasons",
        expected: ['health:web-1:Ready'],
        criterion: 'health-gate',
      },
      {
        call: '__gate({ config: null }).out',
        expected: { decision: 'hold', release: 'R-2026.10.3', reasons: ['config:no-report'] },
        edge: true,
        criterion: 'config-gate',
      },
      {
        call: "__gate({ config: [{ key: 'DATABASE_URL', state: 'ok' }, { key: 'QUEUE_URL', state: 'pending' }, { key: 'SIGNING_KEY', state: 'ok' }] }).out.reasons",
        expected: ['config:QUEUE_URL:pending'],
        criterion: 'config-gate',
      },
      {
        call: "__gate({ config: [{ key: 'DATABASE_URL', state: 'ok' }, { key: 'QUEUE_URL', state: 'ok' }, { key: 'SIGNING_KEY', state: 'ok' }, { key: 'DEBUG_PANEL', state: 'invalid', value: 'FIXTURE-SECRET-7731' }] }).out",
        expected: { decision: 'rollout', release: 'R-2026.10.3', reasons: [] },
        criterion: 'config-gate',
      },
      {
        call: "[[], [{ key: 'DATABASE_URL', state: 'OK' }, { key: 'QUEUE_URL', state: 'ok' }, { key: 'SIGNING_KEY', state: 'ok' }]].map(function (config) { return __gate({ config: config }).out.reasons; })",
        expected: [
          ['config:DATABASE_URL:missing', 'config:QUEUE_URL:missing', 'config:SIGNING_KEY:missing'],
          ['config:DATABASE_URL:OK'],
        ],
        edge: true,
        criterion: 'config-gate',
      },
      {
        call: "(function () { var r = __gate({ requiredConfig: ['SIGNING_KEY', 'WEBHOOK_SECRET'], config: [{ key: 'SIGNING_KEY', state: 'expired', value: 'FIXTURE-SECRET-7731' }] }); return { reasons: r.out.reasons, leaked: JSON.stringify(r).indexOf('FIXTURE-SECRET') !== -1 }; })()",
        expected: { reasons: ['config:SIGNING_KEY:expired', 'config:WEBHOOK_SECRET:missing'], leaked: false },
        criterion: 'config-gate',
      },
      {
        call: '__gate({ migrations: null }).out',
        expected: { decision: 'hold', release: 'R-2026.10.3', reasons: ['migration:no-report'] },
        edge: true,
        criterion: 'migration-gate',
      },
      {
        call: "['pending', 'running', 'Applied'].map(function (status) { return __gate({ migrations: [{ id: '0042_add_case_priority', status: status, reversible: true }] }).out.reasons; })",
        expected: [
          ['migration:0042_add_case_priority:pending'],
          ['migration:0042_add_case_priority:running'],
          ['migration:0042_add_case_priority:Applied'],
        ],
        criterion: 'migration-gate',
      },
      {
        call: "['', '   '].map(function (point) { return __gate({ migrations: [{ id: '0043_drop_legacy_priority', status: 'applied', reversible: false }], restorePoint: point }).out.decision; })",
        expected: ['hold', 'hold'],
        edge: true,
        criterion: 'migration-gate',
      },
      {
        call: "__gate({ migrations: [{ id: '0043_drop_legacy_priority', status: 'failed', reversible: false }] }).out.reasons",
        expected: [
          'migration:0043_drop_legacy_priority:failed',
          'migration:0043_drop_legacy_priority:irreversible-without-restore-point',
        ],
        criterion: 'migration-gate',
      },
      {
        call: '__gate({ migrations: [] }).out',
        expected: { decision: 'rollout', release: 'R-2026.10.3', reasons: [] },
        edge: true,
      },
      {
        call: "__gate({ health: [{ instance: 'web-2', status: 'timeout' }, { instance: 'web-2', status: 'timeout' }] }).out.reasons",
        expected: ['health:web-2:timeout'],
      },
      {
        call: "(function () { var c = __candidate({ health: [{ instance: 'web-1', status: 'timeout' }] }); var before = JSON.stringify(c); Object.freeze(c); c.health.forEach(Object.freeze); Object.freeze(c.health); Object.freeze(c.config); Object.freeze(c.migrations); Object.freeze(c.requiredConfig); var out = gateRelease(c, __log()); return { decision: out.decision, unchanged: JSON.stringify(c) === before }; })()",
        expected: { decision: 'hold', unchanged: true },
      },
      {
        call: "(function () { var log = __log(); gateRelease(__candidate({}), log); gateRelease(__candidate({ health: [] }), log); return log.entries.map(function (entry) { return entry.decision + ' ' + entry.reasons.length + ' ' + entry.checkedAt; }); })()",
        expected: ['rollout 0 2026-10-21T09:30:00Z', 'hold 1 2026-10-21T09:30:00Z'],
        criterion: 'records-why',
      },
      {
        call: "(function () { var r = __gate({ release: 'R-2026.10.9', checkedAt: '2026-10-23T07:15:00Z', health: [{ instance: 'web-3', status: 'not_ready' }, { instance: 'web-1', status: 'timeout' }] }); return { out: r.out.reasons, log: r.log }; })()",
        expected: {
          out: ['health:web-1:timeout', 'health:web-3:not_ready'],
          log: [{
            release: 'R-2026.10.9',
            decision: 'hold',
            reasons: ['health:web-1:timeout', 'health:web-3:not_ready'],
            checkedAt: '2026-10-23T07:15:00Z',
          }],
        },
        criterion: 'records-why',
      },
    ],
    hiddenTypeTests: [
      {
        code: "const __reasons: string[] = gateRelease({ release: 'R-1', checkedAt: '2026-10-21T00:00:00Z', requiredConfig: ['A'], health: null, config: null, migrations: null, restorePoint: null }, { record: () => {} }).reasons;",
        label: 'every report may be null, and the reasons are a list of strings',
      },
      {
        code: "const __record: DecisionRecord = { release: 'R-1', decision: 'paused', reasons: [], checkedAt: '2026-10-21T00:00:00Z' };",
        label: 'a record carries one of the two decisions',
        rejects: true,
      },
    ],
  },
};
