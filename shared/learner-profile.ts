/** The learner profile that personalises devShark.
 *
 * One versioned record decides which learning paths a learner sees, what
 * Today plans and how long a practice session runs. It is deliberately small:
 * a base track, two optional enrolments, why they are here, how much they
 * already know and how long they want to study. Nothing here is an unlock —
 * `experience` is advisory, and every gate is derived from verified
 * completions in `shared/progression.ts`.
 *
 * The same validator runs in the browser (to disable a submit button) and on
 * the server (to refuse a forged body), so the two can never disagree. */

export const LEARNER_PROFILE_VERSION = 1;

/** Base tracks, in the order the picker presents them (issue #151). */
export type BaseTrack = 'fullstack' | 'frontend' | 'backend';
export const BASE_TRACKS: readonly BaseTrack[] = ['fullstack', 'frontend', 'backend'];
export const isBaseTrack = (value: unknown): value is BaseTrack =>
  typeof value === 'string' && (BASE_TRACKS as readonly string[]).includes(value);

/** How much programming the learner has done. Advisory only: it changes the
 * suggested starting point and the wording, never what is reachable. */
export type LearnerExperience = 'new' | 'some' | 'working';
export const LEARNER_EXPERIENCES: readonly LearnerExperience[] = ['new', 'some', 'working'];
export const isLearnerExperience = (value: unknown): value is LearnerExperience =>
  typeof value === 'string' && (LEARNER_EXPERIENCES as readonly string[]).includes(value);

/** Why the learner is here. Drives the ordering of the Today plan. */
export type LearnerGoal = 'first-job' | 'change-role' | 'level-up' | 'interview' | 'curiosity';
export const LEARNER_GOALS: readonly LearnerGoal[] = ['first-job', 'change-role', 'level-up', 'interview', 'curiosity'];
export const isLearnerGoal = (value: unknown): value is LearnerGoal =>
  typeof value === 'string' && (LEARNER_GOALS as readonly string[]).includes(value);
export const MAX_LEARNER_GOALS = 3;

/** Minutes the learner wants a single sitting to take. Also the default
 * length offered by a practice session (issue #159). */
export type StudyMinutes = 5 | 10 | 20 | 40;
export const STUDY_MINUTES: readonly StudyMinutes[] = [5, 10, 20, 40];
export const isStudyMinutes = (value: unknown): value is StudyMinutes =>
  value === 5 || value === 10 || value === 20 || value === 40;

export interface LearnerProfile {
  /** Bumped when the meaning of a field changes; older rows are re-asked. */
  version: number;
  baseTrack: BaseTrack;
  /** Optional Forward-Deployed Engineer specialisation, above the base track. */
  fde: boolean;
  /** Independent DSA Foundations enrolment; never implied by the base track. */
  dsa: boolean;
  goals: LearnerGoal[];
  experience: LearnerExperience;
  studyMinutes: StudyMinutes;
  /** ISO timestamp of the last accepted write. Server-owned. */
  updatedAt: string;
}

/** The fields a learner must answer before personalised practice starts. The
 * two enrolments are opt-in, so an untouched `false` is a complete answer. */
export type RequiredProfileField = 'baseTrack' | 'goals' | 'experience' | 'studyMinutes';
export const REQUIRED_PROFILE_FIELDS: readonly RequiredProfileField[] = [
  'baseTrack', 'goals', 'experience', 'studyMinutes',
];

/** A partial answer set: what an interrupted registration leaves behind. */
export type LearnerProfileDraft = Partial<Omit<LearnerProfile, 'version' | 'updatedAt'>>;

export interface LearnerProfileState {
  /** The stored profile, or null when nothing usable is saved yet. */
  profile: LearnerProfile | null;
  /** Answers kept from an interrupted registration. */
  draft: LearnerProfileDraft;
  /** Required fields still unanswered, in asking order. */
  missing: RequiredProfileField[];
  complete: boolean;
  /** The contract version the client should be asking for. */
  version: number;
}

/** GET/PUT /api/user/[op]?op=learner-profile */
export type LearnerProfileResponse = LearnerProfileState;

export interface LearnerProfileWriteRequest {
  /** Whole or partial answers. A partial write keeps a draft. */
  profile: LearnerProfileDraft;
  /** The version the client believes it is answering. */
  version?: number;
}

/** A field-level rejection, for the form to render next to the control. */
export interface LearnerProfileFieldError {
  field: keyof LearnerProfileDraft;
  code: 'invalid' | 'too_many' | 'empty';
}

export interface LearnerProfileValidation {
  draft: LearnerProfileDraft;
  errors: LearnerProfileFieldError[];
  missing: RequiredProfileField[];
  complete: boolean;
}

const uniqueGoals = (raw: unknown): { goals: LearnerGoal[]; error: LearnerProfileFieldError | null } => {
  if (!Array.isArray(raw)) return { goals: [], error: { field: 'goals', code: 'invalid' } };
  const goals: LearnerGoal[] = [];
  for (const value of raw) {
    if (!isLearnerGoal(value)) return { goals: [], error: { field: 'goals', code: 'invalid' } };
    if (!goals.includes(value)) goals.push(value);
  }
  if (goals.length > MAX_LEARNER_GOALS) return { goals: [], error: { field: 'goals', code: 'too_many' } };
  if (goals.length === 0) return { goals: [], error: { field: 'goals', code: 'empty' } };
  return { goals, error: null };
};

/**
 * Rebuild a clean draft from untrusted input. Unknown keys are dropped, every
 * present field is validated, and absent fields simply stay unanswered — a
 * half-filled registration is a legitimate state, not an error.
 */
export function validateLearnerProfile(input: unknown): LearnerProfileValidation {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const draft: LearnerProfileDraft = {};
  const errors: LearnerProfileFieldError[] = [];

  if (raw.baseTrack !== undefined) {
    if (isBaseTrack(raw.baseTrack)) draft.baseTrack = raw.baseTrack;
    else errors.push({ field: 'baseTrack', code: 'invalid' });
  }
  if (raw.fde !== undefined) {
    if (typeof raw.fde === 'boolean') draft.fde = raw.fde;
    else errors.push({ field: 'fde', code: 'invalid' });
  }
  if (raw.dsa !== undefined) {
    if (typeof raw.dsa === 'boolean') draft.dsa = raw.dsa;
    else errors.push({ field: 'dsa', code: 'invalid' });
  }
  if (raw.goals !== undefined) {
    const { goals, error } = uniqueGoals(raw.goals);
    if (error) errors.push(error);
    else draft.goals = goals;
  }
  if (raw.experience !== undefined) {
    if (isLearnerExperience(raw.experience)) draft.experience = raw.experience;
    else errors.push({ field: 'experience', code: 'invalid' });
  }
  if (raw.studyMinutes !== undefined) {
    if (isStudyMinutes(raw.studyMinutes)) draft.studyMinutes = raw.studyMinutes;
    else errors.push({ field: 'studyMinutes', code: 'invalid' });
  }

  const missing = REQUIRED_PROFILE_FIELDS.filter((field) => draft[field] === undefined);
  return { draft, errors, missing, complete: errors.length === 0 && missing.length === 0 };
}

/** Promote a complete draft to a stored profile. Returns null when required
 * answers are missing, so a caller cannot accidentally store a half profile. */
export function completeProfile(draft: LearnerProfileDraft, updatedAt: string): LearnerProfile | null {
  if (
    draft.baseTrack === undefined || draft.goals === undefined || draft.goals.length === 0 ||
    draft.experience === undefined || draft.studyMinutes === undefined
  ) return null;
  return {
    version: LEARNER_PROFILE_VERSION,
    baseTrack: draft.baseTrack,
    fde: draft.fde === true,
    dsa: draft.dsa === true,
    goals: [...draft.goals],
    experience: draft.experience,
    studyMinutes: draft.studyMinutes,
    updatedAt,
  };
}

/** A stored profile written under an older contract has to be re-answered
 * before it personalises anything; its answers are kept as the draft. */
export const isCurrentProfileVersion = (profile: LearnerProfile | null): boolean =>
  profile !== null && profile.version === LEARNER_PROFILE_VERSION;

/**
 * Does this edit change which learning paths the learner is enrolled in?
 * Only a plan change needs a confirmation step and a query invalidation;
 * changing a goal or the sitting length does not.
 */
export function planChanged(before: LearnerProfile | null, after: LearnerProfile): boolean {
  if (!before) return true;
  return before.baseTrack !== after.baseTrack || before.fde !== after.fde || before.dsa !== after.dsa;
}

/** Build the state a surface renders from, given whatever is stored. */
export function learnerProfileState(
  profile: LearnerProfile | null,
  draft: LearnerProfileDraft = {},
): LearnerProfileState {
  const current = isCurrentProfileVersion(profile) ? profile : null;
  const merged: LearnerProfileDraft = current
    ? { baseTrack: current.baseTrack, fde: current.fde, dsa: current.dsa, goals: current.goals, experience: current.experience, studyMinutes: current.studyMinutes }
    : { ...(profile ? { baseTrack: profile.baseTrack, fde: profile.fde, dsa: profile.dsa, goals: profile.goals, experience: profile.experience, studyMinutes: profile.studyMinutes } : {}), ...draft };
  const missing = REQUIRED_PROFILE_FIELDS.filter((field) => merged[field] === undefined);
  return {
    profile: current,
    draft: merged,
    missing,
    complete: current !== null && missing.length === 0,
    version: LEARNER_PROFILE_VERSION,
  };
}
