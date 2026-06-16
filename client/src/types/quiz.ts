// Contract types are shared with the mobile app; see ../../../shared/types.ts.
export type { CategoryType, DifficultyMode, Question, QuizResult } from '@shared/types';

// Web-only: the solo-quiz screen's local state machine.
export type QuizState = 'loading' | 'ready' | 'in-progress' | 'submitted' | 'error';
