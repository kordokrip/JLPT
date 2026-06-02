import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import type { AppEnv } from '../types.js';

const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const BASE = 'https://nihongo-n3.example.com/errors/';
const RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: {
    type: 'object',
    properties: {
      translatedText: { type: 'string' },
      readingHint: { type: 'string' },
      nuanceKo: { type: 'string' },
      alternatives: {
        type: 'array',
        items: { type: 'string' },
      },
    },
    required: ['translatedText', 'readingHint', 'nuanceKo', 'alternatives'],
  },
};

const naturalTranslateBody = z.object({
  text: z.string().trim().min(1).max(240).openapi({ example: '오늘은 일이 많아서 조금 피곤해요.' }),
  target: z.enum(['ja']).default('ja').openapi({ example: 'ja' }),
  tone: z.enum(['neutral', 'polite', 'casual', 'study']).default('polite').openapi({ example: 'polite' }),
});

const naturalTranslateResponse = z.object({
  data: z.object({
    sourceText: z.string(),
    translatedText: z.string(),
    readingHint: z.string().optional(),
    nuanceKo: z.string().optional(),
    alternatives: z.array(z.string()).optional(),
    model: z.string(),
  }),
}).openapi('NaturalTranslateResponse');

const problemSchema = z
  .object({ type: z.string(), title: z.string(), status: z.number().int(), detail: z.string() })
  .openapi('ProblemDetail');

const naturalTranslateRoute = createRoute({
  method: 'post',
  path: '/ai/translate',
  tags: ['AI'],
  summary: '한국어 입력을 자연스러운 일본어 표현으로 변환',
  request: {
    body: {
      content: {
        'application/json': { schema: naturalTranslateBody },
      },
    },
  },
  responses: {
    200: { content: { 'application/json': { schema: naturalTranslateResponse } }, description: '자연 일본어 변환 결과' },
    400: { content: { 'application/json': { schema: problemSchema } }, description: '잘못된 요청' },
    502: { content: { 'application/json': { schema: problemSchema } }, description: 'AI 변환 실패' },
  },
});

type AiMessage = { role: 'system' | 'user'; content: string };
type AiRunner = {
  run(model: string, input: Record<string, unknown>): Promise<unknown>;
};

const toneGuide: Record<string, string> = {
  neutral: '일상에서 어색하지 않은 중립적인 일본어',
  polite: 'JLPT 학습자가 바로 따라 말할 수 있는 자연스러운 丁寧語',
  casual: '친구에게 말하는 자연스러운 구어체',
  study: '어휘 검색과 학습 카드에 적합한 짧고 표준적인 일본어',
};

function buildMessages(text: string, tone: string): AiMessage[] {
  return [
    {
      role: 'system',
      content: [
        '너는 한국어 사용자를 위한 일본어 학습 코치다.',
        '직역이 아니라 실제 일본인이 자연스럽게 말하거나 쓰는 일본어로 바꾼다.',
        '출력은 JSON만 반환한다. 마크다운, 설명 문장, 코드블록은 금지한다.',
        'JSON schema: {"translatedText":"...","readingHint":"...","nuanceKo":"...","alternatives":["..."]}',
      ].join(' '),
    },
    {
      role: 'user',
      content: [
        `목표 스타일: ${toneGuide[tone] ?? toneGuide.polite}`,
        `한국어 입력: ${text}`,
        'translatedText는 일본어만, readingHint는 히라가나 중심, nuanceKo는 한국어로 1문장, alternatives는 1~2개만.',
      ].join('\n'),
    },
  ];
}

function extractText(value: unknown): string {
  if (typeof value === 'string') return value;
  const record = value as Record<string, unknown> | null;
  if (!record) return '';
  if (typeof record.response === 'string') return record.response;
  if (typeof record.result === 'string') return record.result;
  const choices = record.choices;
  if (Array.isArray(choices)) {
    const first = choices[0] as Record<string, unknown> | undefined;
    const message = first?.message as Record<string, unknown> | undefined;
    if (typeof message?.content === 'string') return message.content;
    if (typeof first?.text === 'string') return first.text;
  }
  return '';
}

function extractJsonObject(value: unknown): Record<string, unknown> | null {
  const record = value as Record<string, unknown> | null;
  if (!record) return null;
  if (record.response && typeof record.response === 'object' && !Array.isArray(record.response)) {
    return record.response as Record<string, unknown>;
  }
  if (record.result && typeof record.result === 'object' && !Array.isArray(record.result)) {
    return record.result as Record<string, unknown>;
  }
  return null;
}

function parseJsonObject(text: string): Record<string, unknown> {
  const trimmed = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as Record<string, unknown>;
    throw new Error('AI 응답 JSON 파싱 실패');
  }
}

function toStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  return items.length ? items.slice(0, 2) : undefined;
}

async function runNaturalTranslate(ai: AiRunner, text: string, tone: string) {
  const raw = await ai.run(MODEL, {
    messages: buildMessages(text, tone),
    response_format: RESPONSE_FORMAT,
    temperature: 0.35,
    top_p: 0.8,
    max_tokens: 220,
  });
  const content = extractText(raw);
  const parsed = extractJsonObject(raw) ?? parseJsonObject(content);
  const translatedText = typeof parsed.translatedText === 'string' ? parsed.translatedText.trim() : '';
  if (!translatedText) throw new Error('AI 응답에 translatedText 없음');
  return {
    translatedText,
    ...(typeof parsed.readingHint === 'string' && parsed.readingHint.trim() ? { readingHint: parsed.readingHint.trim() } : {}),
    ...(typeof parsed.nuanceKo === 'string' && parsed.nuanceKo.trim() ? { nuanceKo: parsed.nuanceKo.trim() } : {}),
    ...(toStringArray(parsed.alternatives) ? { alternatives: toStringArray(parsed.alternatives) } : {}),
  };
}

const aiOA = new OpenAPIHono<AppEnv>();

aiOA.openapi(naturalTranslateRoute, async (c) => {
  const { text, tone } = c.req.valid('json');

  if (c.env.ENVIRONMENT === 'test') {
    return c.json({
      data: {
        sourceText: text,
        translatedText: '今日は少し疲れています。',
        readingHint: 'きょうは すこし つかれています。',
        nuanceKo: '테스트 환경용 자연 일본어 예시입니다.',
        alternatives: ['今日はちょっと疲れています。'],
        model: MODEL,
      },
    }, 200);
  }

  try {
    const result = await runNaturalTranslate(c.env.AI as AiRunner, text, tone);
    return c.json({
      data: {
        sourceText: text,
        ...result,
        model: MODEL,
      },
    }, 200);
  } catch (err) {
    console.error('[ai.translate]', err);
    return c.json(
      {
        type: `${BASE}ai-translation-failed`,
        title: 'AI Translation Failed',
        status: 502,
        detail: '자연 일본어 변환을 완료하지 못했습니다. 잠시 후 다시 시도하세요.',
      },
      502,
    );
  }
});

export { aiOA };
