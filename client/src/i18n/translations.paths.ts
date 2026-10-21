// English-only path overview copy, loaded by the existing lazy path screens.
// Follows translations.drafts.ts and translations.privacy.ts so route-only
// words do not add to every visitor’s initial download.
export const pathsEn = {
  'paths.diagnosticTitle': 'Diagnostic overview',
  'paths.diagnosticNote': 'Your latest diagnostic attempt, area by area. These results do not unlock or complete any part of the path.',
  'paths.competency.demonstrated': 'Demonstrated in this check',
  'paths.competency.gap': 'Worth practising',
  'paths.competency.not_assessed': 'Not assessed',
  'paths.diagnosticItems': '{percent}% · Items assessed: {count}',
  'paths.diagnosticRetakeNote': 'Results without per-question evidence are not assessed. You can take the diagnostic again; areas it does not cover remain unassessed.',
  'paths.openDiagnostic': 'Open the diagnostic',
} as const;
