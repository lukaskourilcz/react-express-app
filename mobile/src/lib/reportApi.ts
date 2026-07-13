// Report / flag a question — same endpoint the web client uses
// (POST /api/quiz/submit?resource=report), feeding the /dev Flags + Triage queues.
import { apiFetch } from './api';

export type ReportReason =
  | 'incorrect-answer'
  | 'unclear'
  | 'typo'
  | 'outdated'
  | 'duplicate'
  | 'other'
  | 'needs-review';

export async function reportQuestion(input: {
  questionId: string;
  reason: ReportReason;
  detail?: string;
}): Promise<void> {
  await apiFetch('/api/quiz/submit?resource=report', {
    method: 'POST',
    body: JSON.stringify({
      question_id: input.questionId,
      reason: input.reason,
      detail: input.detail,
    }),
  });
}
