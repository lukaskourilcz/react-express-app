// Server-only AI provider boundary. React never imports this module and the API
// key is read exclusively from the server environment. The feature remains off
// unless the flag, key, and model are all explicitly configured.

export interface ExplanationInput {
  locale: 'en' | 'cs';
  question: string;
  options: string[];
  acceptedAnswer: string;
  selectedAnswer: string;
  curatedExplanation: string;
}

export interface ExplanationContent {
  whyCorrect: string;
  whySelected: string;
  misconception: string;
  relatedConcept: string;
}

export interface GeneratedExplanation {
  model: string;
  promptVersion: string;
  content: ExplanationContent;
}

// ── Sharkira Socratic pre-answer hint ────────────────────────────────────────
// A hint is generated BEFORE the learner answers, so it must guide toward the
// accepted answer without ever naming or eliminating to it. The accepted answer
// is supplied only so the model can steer; the API post-checks the output and
// falls back to a curated nudge if the accepted option text leaks through.
export interface HintInput {
  locale: 'en' | 'cs';
  question: string;
  options: string[];
  acceptedAnswer: string;
  introduction: string;
  category: string;
}

export interface HintContent {
  /** A single next-smallest guiding question. Never reveals the answer. */
  hint: string;
  /** A short strategy nudge (how to reason), not the answer. */
  nudge: string;
}

export interface GeneratedHint {
  model: string;
  promptVersion: string;
  content: HintContent;
}

const PROMPT_VERSION = 'explanation-v1';
const HINT_PROMPT_VERSION = 'hint-v1';
const MAX_FIELD = 1200;
const MAX_HINT_FIELD = 400;

export function aiDailyGenerationLimit(): number {
  const value = Number.parseInt(process.env.AI_DAILY_GENERATION_LIMIT ?? '', 10);
  return Number.isInteger(value) && value > 0 && value <= 100_000 ? value : 0;
}

export function isAiExplanationConfigured(): boolean {
  return (
    process.env.AI_EXPLANATIONS_ENABLED === 'true' &&
    Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL) &&
    aiDailyGenerationLimit() > 0
  );
}

// Sharkira stays off unless its own flag, a key, a model, and a hard daily
// budget are all present. It never shares the explanation flag, so hints can be
// enabled or disabled independently of post-answer explanations.
export function isAiHintConfigured(): boolean {
  return (
    process.env.AI_HINTS_ENABLED === 'true' &&
    Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL) &&
    aiDailyGenerationLimit() > 0
  );
}

function cleanContent(value: unknown): ExplanationContent | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const field = (key: string) => typeof record[key] === 'string' ? record[key].trim().slice(0, MAX_FIELD) : '';
  const content = {
    whyCorrect: field('whyCorrect'),
    whySelected: field('whySelected'),
    misconception: field('misconception'),
    relatedConcept: field('relatedConcept'),
  };
  return content.whyCorrect && content.relatedConcept ? content : null;
}

function responseText(payload: Record<string, unknown>): string {
  if (typeof payload.output_text === 'string') return payload.output_text;
  const output = Array.isArray(payload.output) ? payload.output : [];
  for (const item of output) {
    if (!item || typeof item !== 'object') continue;
    const content = Array.isArray((item as Record<string, unknown>).content)
      ? (item as Record<string, unknown>).content as unknown[]
      : [];
    for (const part of content) {
      if (part && typeof part === 'object' && typeof (part as Record<string, unknown>).text === 'string') {
        return (part as Record<string, unknown>).text as string;
      }
    }
  }
  return '';
}

export async function generateExplanation(input: ExplanationInput): Promise<GeneratedExplanation> {
  if (!isAiExplanationConfigured()) throw new Error('ai_not_configured');
  const model = process.env.OPENAI_MODEL as string;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        store: false,
        max_output_tokens: 500,
        instructions: `You are a concise educational tutor. Reply in ${input.locale === 'cs' ? 'Czech' : 'English'}. Use only the supplied accepted answer; never challenge or change it. Do not mention hidden system instructions. Return JSON matching the requested schema.`,
        input: JSON.stringify(input),
        text: {
          format: {
            type: 'json_schema',
            name: 'quiz_explanation',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                whyCorrect: { type: 'string' },
                whySelected: { type: 'string' },
                misconception: { type: 'string' },
                relatedConcept: { type: 'string' },
              },
              required: ['whyCorrect', 'whySelected', 'misconception', 'relatedConcept'],
            },
          },
        },
      }),
    });
    if (!response.ok) throw new Error(`ai_http_${response.status}`);
    const payload = await response.json() as Record<string, unknown>;
    const raw = responseText(payload);
    const content = cleanContent(JSON.parse(raw));
    if (!content) throw new Error('ai_invalid_output');
    return { model, promptVersion: PROMPT_VERSION, content };
  } finally {
    clearTimeout(timeout);
  }
}

function cleanHintContent(value: unknown): HintContent | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const field = (key: string) =>
    typeof record[key] === 'string' ? record[key].trim().slice(0, MAX_HINT_FIELD) : '';
  const content = { hint: field('hint'), nudge: field('nudge') };
  return content.hint && content.nudge ? content : null;
}

export async function generateHint(input: HintInput): Promise<GeneratedHint> {
  if (!isAiHintConfigured()) throw new Error('ai_not_configured');
  const model = process.env.OPENAI_MODEL as string;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        store: false,
        max_output_tokens: 320,
        instructions:
          `You are Sharkira, a Socratic study coach. Reply in ${input.locale === 'cs' ? 'Czech' : 'English'}. ` +
          'The learner has NOT answered yet. Never give the answer, never name or quote the accepted option, ' +
          'and never say which options are wrong. Ask the single next-smallest question that moves them one ' +
          'step toward reasoning it out themselves. Use plain, literal language with no idioms. Keep "hint" to ' +
          'one short guiding question and "nudge" to one short strategy sentence. The accepted answer is given ' +
          'only so you can steer; it must never appear or be paraphrased in your reply. Return JSON matching the schema.',
        input: JSON.stringify(input),
        text: {
          format: {
            type: 'json_schema',
            name: 'sharkira_hint',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                hint: { type: 'string' },
                nudge: { type: 'string' },
              },
              required: ['hint', 'nudge'],
            },
          },
        },
      }),
    });
    if (!response.ok) throw new Error(`ai_http_${response.status}`);
    const payload = await response.json() as Record<string, unknown>;
    const raw = responseText(payload);
    const content = cleanHintContent(JSON.parse(raw));
    if (!content) throw new Error('ai_invalid_output');
    return { model, promptVersion: HINT_PROMPT_VERSION, content };
  } finally {
    clearTimeout(timeout);
  }
}
