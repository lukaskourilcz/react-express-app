/** Export saved writing as data, without turning a draft into a reviewed submission. */
import type { PathDraft } from '../../../shared/learning-path-api';
import type { EvidenceState, LearningPathManifest } from '../../../shared/learning-paths';

export interface PortfolioEntry {
  module: string;
  activityId: string;
  title: string;
  recordedState: EvidenceState;
  saved: PathDraft | null;
}
export const PORTFOLIO_NOTE = 'Latest writing saved online. Saved text may differ from the last submission. Writing quality is self-reviewed; this export is not an independent assessment.';

export function portfolioDocument(manifest: LearningPathManifest, entries: PortfolioEntry[]) {
  return { format: 'devshark-path-writing-v1', path: manifest.id, curriculumVersion: manifest.version,
    title: manifest.title, note: PORTFOLIO_NOTE, entries };
}

/** Fences prevent saved Markdown/HTML from becoming embedded links or images. */
function literal(value: string): string {
  const longest = Math.max(0, ...Array.from(value.matchAll(/`+/g), match => match[0].length));
  const fence = '`'.repeat(Math.max(3, longest + 1));
  return `${fence}text\n${value}\n${fence}`;
}
/** Draft field keys are caller-authored too; keep them on one escaped heading line. */
function fieldLabel(id: string): string {
  return id.replace(/-/g, ' ').replace(/[\r\n]/g, ' ').replace(/[\\`*_{}\[\]<>#+.!|]/g, '\\$&');
}
export function portfolioMarkdown(manifest: LearningPathManifest, entries: PortfolioEntry[]): string {
  return [`# ${manifest.title} — saved writing`, '', PORTFOLIO_NOTE, '', `Curriculum version: ${manifest.version}`, '',
    ...entries.flatMap(entry => [
      `## ${entry.title}`, '', `Module: ${entry.module}`, `Activity: ${entry.activityId}`,
      `Recorded state: ${entry.recordedState}`, `Saved revision: ${entry.saved?.revision ?? 'none'}`,
      `Saved at: ${entry.saved?.updatedAt ?? 'not saved'}`, '',
      ...(entry.saved?.content.artifact ? Object.entries(entry.saved.content.artifact).flatMap(([id, value]) => [
        `### ${fieldLabel(id)}`, '', literal(Array.isArray(value) ? value.join('\n') : value), '',
      ]) : ['No writing saved online for this activity.', '']),
    ]),
  ].join('\n');
}
