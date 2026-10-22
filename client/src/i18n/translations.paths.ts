// English-only path screen copy, loaded by the lazy path screens and their
// activity views (LearningPathScreens.tsx, ActivityViews.tsx).
// Follows translations.drafts.ts and translations.privacy.ts so route-only
// words do not add to every visitor’s initial download.
export const pathsEn = {
  'paths.export.note': 'Export your latest writing saved online, including drafts. Saved text may differ from your last submission. Writing quality is self-reviewed.',
  'paths.export.markdown': 'Export writing as Markdown',
  'paths.export.json': 'Export writing as JSON',
  'paths.export.busy': 'Preparing your saved writing…',
  'paths.export.ready': 'Your export file is ready.',
  'paths.diagnosticTitle': 'Diagnostic overview',
  'paths.diagnosticNote': 'Your latest diagnostic attempt, area by area. These results do not unlock or complete any part of the path.',
  'paths.competency.demonstrated': 'Demonstrated in this check',
  'paths.competency.gap': 'Worth practising',
  'paths.competency.not_assessed': 'Not assessed',
  'paths.diagnosticItems': '{percent}% · Items assessed: {count}',
  'paths.diagnosticRetakeNote': 'Results without per-question evidence are not assessed. You can take the diagnostic again; areas it does not cover remain unassessed.',
  'paths.openDiagnostic': 'Open the diagnostic',
  'paths.activityKinds': 'Lessons explain the idea, concept checks confirm you followed it, code-reading questions test that you can follow someone else’s work, and the exercises are where you produce your own. Later modules bring earlier material back on purpose — a check you have seen before is the plan working, not the plan slipping.',
  'paths.optionalTitle': 'Optional: placement and bridges',
  'paths.optionalNote': 'Skippable. These recommend reading and never gate anything.',
  'paths.shelf.interviewPrep.title': 'Interview prep',
  'paths.shelf.interviewPrep.note': 'Optional practice for interview rounds. It does not count toward completing the path.',
  'paths.check.scenarioTitle': 'The scenario',
  'paths.code.fixtureNoteTitle': 'Before you start',
} as const;
