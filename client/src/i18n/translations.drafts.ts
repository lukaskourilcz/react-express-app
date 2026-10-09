// What a coding task says when the copies of its code part ways
// (coding/DraftNote.tsx): the account's draft changed on another device since
// the page opened, a copy on this device was set aside, or the code was kept
// for an account the session signed out. English only, like translations.ts.
// They live in their own dictionary because only the coding chunk reads them,
// and the app shell has no budget to spare for them
// (docs/quality/bundle-budget.json), as the privacy policy's words live in
// translations.privacy.ts. No entry takes {placeholders}.

export const draftsEn = {
  'coding.draft.aside': 'Other code for this task is kept on this device until you Run or Submit.',
  'coding.draft.conflict': 'Your account’s draft of this task changed on another device since this page opened, so this code was not saved to your account. It is kept on this device.',
  'coding.draft.keepMine': 'Save this code instead',
  'coding.draft.openOther': 'Open the other draft',
  'coding.draft.otherFailed': 'The other draft did not load. Try again.',
  'coding.draft.kept': 'You were signed out, so the code for this task is kept for your account. Sign in to open it.',
} as const;
