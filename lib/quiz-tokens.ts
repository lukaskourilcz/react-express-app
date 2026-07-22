import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'node:crypto';
import { isScopeSubject, type ScopeSubjectId } from '../shared/subject-catalog';

const SECRET = process.env.SESSION_SECRET;
const IS_PROD = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
if (IS_PROD && (!SECRET || SECRET.length < 32)) {
  throw new Error('SESSION_SECRET must be at least 32 characters in production');
}

const TOKEN_TTL_MS = 60 * 60 * 1000;
const CHALLENGE_TTL_MS = 3 * 60 * 60 * 1000;
const TOKEN_AAD = Buffer.from('shark-quiz-token:v2');
const TOKEN_KEY = createHash('sha256').update(SECRET || 'dev-only-not-for-production', 'utf8').digest();

const b64url = (buffer: Buffer): string => buffer.toString('base64url');
const fromB64url = (value: string): Buffer => Buffer.from(value, 'base64url');

interface SessionPayload {
  kind: 'quiz-session';
  questions: { questionId: string; correctAnswer: number }[];
  scope?: 'challenge' | 'daily' | 'roadmap' | 'assessment';
  runId?: string;
  subject?: ScopeSubjectId;
  date?: string;
  topic?: string;
  roadmapKind?: 'level' | 'checkpoint';
  ref?: number;
  attemptId?: string;
  requiredLevelStart?: number;
  requiredLevelEnd?: number;
  iat: number;
  exp: number;
}

interface ChallengeRunPayload {
  kind: 'challenge-run';
  runId: string;
  ranked: boolean;
  subject: ScopeSubjectId;
  iat: number;
  exp: number;
}

interface ScoreProofPayload {
  kind: 'score-proof';
  runId: string;
  questionId: string;
  subject: ScopeSubjectId;
  isCorrect: boolean;
  iat: number;
  exp: number;
}

interface QuizResultReceiptPayload {
  kind: 'quiz-result';
  attemptId: string;
  userId: string;
  correct: number;
  total: number;
  breakdown: Record<string, { correct: number; total: number }>;
  outcomes: { questionId: string; category: string; isCorrect: boolean }[];
  subject: ScopeSubjectId;
  questXp: number;
  daily?: { date: string; durationMs: number };
  purpose: 'quiz' | 'challenge' | 'daily' | 'assessment';
  iat: number;
  exp: number;
}

interface AnswerProofPayload {
  kind: 'answer-proof';
  questionId: string;
  subject: ScopeSubjectId;
  isCorrect: boolean;
  iat: number;
  exp: number;
}

type TokenPayload = SessionPayload | ChallengeRunPayload | ScoreProofPayload | QuizResultReceiptPayload | AnswerProofPayload;

function sealToken(payload: TokenPayload): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', TOKEN_KEY, iv);
  cipher.setAAD(TOKEN_AAD);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  return `v2.${b64url(iv)}.${b64url(ciphertext)}.${b64url(cipher.getAuthTag())}`;
}

function openToken(token: string): unknown | null {
  if (typeof token !== 'string' || token.length > 16_384) return null;
  const parts = token.split('.');
  if (parts.length !== 4 || parts[0] !== 'v2') return null;
  try {
    const iv = fromB64url(parts[1]);
    const ciphertext = fromB64url(parts[2]);
    const tag = fromB64url(parts[3]);
    if (iv.length !== 12 || tag.length !== 16 || ciphertext.length === 0) return null;
    const decipher = createDecipheriv('aes-256-gcm', TOKEN_KEY, iv);
    decipher.setAAD(TOKEN_AAD);
    decipher.setAuthTag(tag);
    return JSON.parse(Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')) as unknown;
  } catch {
    return null;
  }
}

function validLifetime(payload: { iat?: unknown; exp?: unknown }, maxTtl: number): boolean {
  const now = Date.now();
  return typeof payload.iat === 'number' && typeof payload.exp === 'number' &&
    payload.iat <= now + 60_000 && payload.exp >= now && payload.exp > payload.iat &&
    payload.exp - payload.iat <= maxTtl;
}

type SessionContext =
  | { subject: ScopeSubjectId }
  | { scope: 'challenge'; runId: string; subject: ScopeSubjectId; attemptId?: string }
  | { scope: 'daily'; date: string; subject: ScopeSubjectId; attemptId?: string }
  | { scope: 'assessment'; subject: ScopeSubjectId }
  | {
      scope: 'roadmap';
      subject: ScopeSubjectId;
      topic: string;
      roadmapKind: 'level' | 'checkpoint';
      ref: number;
      attemptId?: string;
      requiredLevelStart?: number;
      requiredLevelEnd?: number;
    };

export interface DecodedQuizSession {
  questions: { questionId: string; correctAnswer: number }[];
  scope?: 'challenge' | 'daily' | 'roadmap' | 'assessment';
  runId?: string;
  subject?: ScopeSubjectId;
  date?: string;
  topic?: string;
  roadmapKind?: 'level' | 'checkpoint';
  ref?: number;
  attemptId?: string;
  requiredLevelStart?: number;
  requiredLevelEnd?: number;
  issuedAt: number;
}

export function encodeSession(data: SessionPayload['questions'], context?: SessionContext): string {
  const now = Date.now();
  const providedAttemptId = context && 'attemptId' in context ? context.attemptId : undefined;
  return sealToken({
    kind: 'quiz-session',
    questions: data,
    ...(context ?? {}),
    attemptId: providedAttemptId ?? b64url(randomBytes(18)),
    iat: now,
    exp: now + TOKEN_TTL_MS,
  });
}

export function decodeSessionEnvelope(token: string): DecodedQuizSession | null {
  const payload = openToken(token) as Partial<SessionPayload> | null;
  if (!payload || payload.kind !== 'quiz-session' || !validLifetime(payload, TOKEN_TTL_MS) || typeof payload.iat !== 'number') return null;
  if (!Array.isArray(payload.questions) || payload.questions.length === 0 || payload.questions.length > 50) return null;
  if (!payload.questions.every((question) => question && typeof question.questionId === 'string' && question.questionId.length > 0 && question.questionId.length <= 64 && Number.isInteger(question.correctAnswer) && question.correctAnswer >= 0 && question.correctAnswer <= 25)) return null;
  if (payload.subject !== undefined && !isScopeSubject(payload.subject)) return null;
  if (typeof payload.attemptId !== 'string' || !/^[A-Za-z0-9_-]{16,64}$/.test(payload.attemptId)) return null;
  const base: DecodedQuizSession = { questions: payload.questions, subject: payload.subject, attemptId: payload.attemptId, issuedAt: payload.iat };
  if (payload.scope === 'challenge') {
    if (typeof payload.runId !== 'string' || !/^[A-Za-z0-9_-]{16,64}$/.test(payload.runId) || !payload.subject) return null;
    return { ...base, scope: 'challenge', runId: payload.runId };
  }
  if (payload.scope === 'daily') {
    if (!payload.subject || typeof payload.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(payload.date)) return null;
    return { ...base, scope: 'daily', date: payload.date };
  }
  if (payload.scope === 'assessment') {
    if (!payload.subject) return null;
    return { ...base, scope: 'assessment' };
  }
  if (payload.scope === 'roadmap') {
    const requiredStart = payload.requiredLevelStart;
    const requiredEnd = payload.requiredLevelEnd;
    const hasRequiredRange = requiredStart !== undefined || requiredEnd !== undefined;
    if (!payload.subject || typeof payload.topic !== 'string' || (payload.roadmapKind !== 'level' && payload.roadmapKind !== 'checkpoint') || !Number.isInteger(payload.ref) || (payload.ref ?? 0) < 1 || (payload.attemptId !== undefined && !/^[A-Za-z0-9_-]{16,64}$/.test(payload.attemptId)) || (hasRequiredRange && (!Number.isInteger(requiredStart) || !Number.isInteger(requiredEnd) || requiredStart! < 1 || requiredEnd! < requiredStart! || requiredEnd! > 100))) return null;
    return {
      ...base,
      scope: 'roadmap',
      topic: payload.topic,
      roadmapKind: payload.roadmapKind,
      ref: payload.ref,
      attemptId: payload.attemptId,
      ...(hasRequiredRange ? { requiredLevelStart: requiredStart, requiredLevelEnd: requiredEnd } : {}),
    };
  }
  return base;
}

export const decodeSession = (token: string) => decodeSessionEnvelope(token)?.questions ?? null;

/** Stable opaque claim id for one server-defined attempt; never exposes the source identifiers. */
export function stableAttemptId(...parts: string[]): string {
  return createHmac('sha256', TOKEN_KEY).update(parts.join('\u001f'), 'utf8').digest('base64url').slice(0, 32);
}

export function createChallengeRun(ranked = true, subject: ScopeSubjectId = 'webdev') {
  const now = Date.now();
  const runId = b64url(randomBytes(18));
  return { runId, ranked, subject, runToken: sealToken({ kind: 'challenge-run', runId, ranked, subject, iat: now, exp: now + CHALLENGE_TTL_MS }) };
}

export function decodeChallengeRun(token: string): { runId: string; ranked: boolean; subject: ScopeSubjectId } | null {
  const payload = openToken(token) as Partial<ChallengeRunPayload> | null;
  if (!payload || payload.kind !== 'challenge-run' || !validLifetime(payload, CHALLENGE_TTL_MS) || typeof payload.runId !== 'string' || !/^[A-Za-z0-9_-]{16,64}$/.test(payload.runId) || typeof payload.ranked !== 'boolean' || !isScopeSubject(payload.subject)) return null;
  return { runId: payload.runId, ranked: payload.ranked, subject: payload.subject };
}

export function encodeScoreProof(runId: string, questionId: string, subject: ScopeSubjectId, isCorrect: boolean): string {
  const now = Date.now();
  return sealToken({ kind: 'score-proof', runId, questionId, subject, isCorrect, iat: now, exp: now + CHALLENGE_TTL_MS });
}

export function decodeScoreProof(token: string): { runId: string; questionId: string; subject: ScopeSubjectId; isCorrect: boolean } | null {
  const payload = openToken(token) as Partial<ScoreProofPayload> | null;
  if (!payload || payload.kind !== 'score-proof' || !validLifetime(payload, CHALLENGE_TTL_MS) || typeof payload.runId !== 'string' || !/^[A-Za-z0-9_-]{16,64}$/.test(payload.runId) || typeof payload.questionId !== 'string' || payload.questionId.length === 0 || payload.questionId.length > 64 || !isScopeSubject(payload.subject) || typeof payload.isCorrect !== 'boolean') return null;
  return { runId: payload.runId, questionId: payload.questionId, subject: payload.subject, isCorrect: payload.isCorrect };
}

export interface QuizResultReceipt {
  attemptId: string;
  userId: string;
  correct: number;
  total: number;
  breakdown: Record<string, { correct: number; total: number }>;
  outcomes: { questionId: string; category: string; isCorrect: boolean }[];
  subject: ScopeSubjectId;
  questXp: number;
  daily?: { date: string; durationMs: number };
  purpose: 'quiz' | 'challenge' | 'daily' | 'assessment';
}

export function encodeQuizResultReceipt(input: Omit<QuizResultReceipt, 'attemptId'> & { attemptId?: string }): string {
  const now = Date.now();
  const attemptId = input.attemptId ?? b64url(randomBytes(18));
  return sealToken({ kind: 'quiz-result', ...input, attemptId, iat: now, exp: now + TOKEN_TTL_MS });
}

export function decodeQuizResultReceipt(token: string): QuizResultReceipt | null {
  const payload = openToken(token) as Partial<QuizResultReceiptPayload> | null;
  if (!payload || payload.kind !== 'quiz-result' || !validLifetime(payload, TOKEN_TTL_MS)) return null;
  if (typeof payload.attemptId !== 'string' || !/^[A-Za-z0-9_-]{16,64}$/.test(payload.attemptId) || typeof payload.userId !== 'string' || payload.userId.length === 0 || payload.userId.length > 128) return null;
  if (!Number.isInteger(payload.correct) || !Number.isInteger(payload.total) || payload.total! <= 0 || payload.total! > 50 || payload.correct! < 0 || payload.correct! > payload.total!) return null;
  if (!payload.breakdown || typeof payload.breakdown !== 'object' || Array.isArray(payload.breakdown) || !Array.isArray(payload.outcomes) || payload.outcomes.length === 0 || payload.outcomes.length > 50 || !isScopeSubject(payload.subject) || !Number.isInteger(payload.questXp) || payload.questXp! < 0 || payload.questXp! > 10_000 || !['quiz', 'challenge', 'daily', 'assessment'].includes(payload.purpose ?? '')) return null;
  if (payload.daily !== undefined && (!payload.daily || typeof payload.daily.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(payload.daily.date) || !Number.isInteger(payload.daily.durationMs) || payload.daily.durationMs < 0 || payload.daily.durationMs > TOKEN_TTL_MS)) return null;
  const breakdown: QuizResultReceipt['breakdown'] = {};
  for (const [category, value] of Object.entries(payload.breakdown)) {
    const item = value as { correct?: unknown; total?: unknown };
    if (!/^[a-z0-9-]{1,50}$/.test(category) || !item || !Number.isInteger(item.correct) || !Number.isInteger(item.total) || (item.total as number) <= 0 || (item.total as number) > 50 || (item.correct as number) < 0 || (item.correct as number) > (item.total as number)) return null;
    breakdown[category] = { correct: item.correct as number, total: item.total as number };
  }
  const outcomes: QuizResultReceipt['outcomes'] = [];
  for (const value of payload.outcomes) {
    if (!value || typeof value.questionId !== 'string' || value.questionId.length === 0 || value.questionId.length > 64 || typeof value.category !== 'string' || !/^[a-z0-9-]{1,50}$/.test(value.category) || typeof value.isCorrect !== 'boolean') return null;
    outcomes.push({ questionId: value.questionId, category: value.category, isCorrect: value.isCorrect });
  }
  return { attemptId: payload.attemptId, userId: payload.userId, correct: payload.correct!, total: payload.total!, breakdown, outcomes, subject: payload.subject, questXp: payload.questXp!, purpose: payload.purpose!, ...(payload.daily ? { daily: payload.daily } : {}) };
}

export function encodeAnswerProof(questionId: string, subject: ScopeSubjectId, isCorrect: boolean): string {
  const now = Date.now();
  return sealToken({ kind: 'answer-proof', questionId, subject, isCorrect, iat: now, exp: now + TOKEN_TTL_MS });
}

export function decodeAnswerProof(token: string): { questionId: string; subject: ScopeSubjectId; isCorrect: boolean } | null {
  const payload = openToken(token) as Partial<AnswerProofPayload> | null;
  if (!payload || payload.kind !== 'answer-proof' || !validLifetime(payload, TOKEN_TTL_MS) || typeof payload.questionId !== 'string' || payload.questionId.length === 0 || payload.questionId.length > 64 || !isScopeSubject(payload.subject) || typeof payload.isCorrect !== 'boolean') return null;
  return { questionId: payload.questionId, subject: payload.subject, isCorrect: payload.isCorrect };
}
