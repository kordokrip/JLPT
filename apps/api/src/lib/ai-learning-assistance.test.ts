import { describe, expect, it } from 'vitest';

import {
  approvedExplanationFallback,
  AiAssistanceFault,
  buildGatewayPrivacyHeaders,
  detectSensitiveWritingInput,
  lintTopikContentDraft,
  parseGroundedExplanation,
  parseWritingFeedback,
  pseudonymousAiUserBucket,
  safeWritingFeedbackFallback,
  shouldRecordAiCircuitFailure,
} from './ai-learning-assistance.js';

const lintInput = {
  learning_track: 'topik-ko' as const,
  release_id: 'topik-ai-lint-test',
  source: {
    source_type: 'official-reference' as const,
    source_url: 'https://example.invalid/reference',
    license_id: '',
    allowed_use: '',
  },
  items: [{
    stable_ref: 'topik.item.ai-lint-001',
    prompt_ko: '한국어 문항',
    prompt_ja: '',
    prompt_en: 'English prompt',
    explanation_ko: '짧음',
    explanation_ja: '日本語の解説ではありません',
    explanation_en: 'English explanation',
    distractors: ['가', '가'],
  }],
};

describe('AI learning-assistance policy', () => {
  it('finds provenance, translation, language, length, and duplicate distractor issues without calling a provider', () => {
    const issues = lintTopikContentDraft(lintInput);
    expect(issues.map((entry) => entry.code)).toEqual(expect.arrayContaining([
      'prohibited_source',
      'translation_missing',
      'explanation_length',
      'distractor_duplicate',
    ]));
  });

  it('derives stable pseudonymous buckets without retaining the user identifier', async () => {
    const first = await pseudonymousAiUserBucket('user-123', 'test-secret');
    const second = await pseudonymousAiUserBucket('user-123', 'test-secret');
    expect(first).toHaveLength(64);
    expect(first).toBe(second);
    expect(first).not.toContain('user-123');
  });

  it('uses only privacy-safe Gateway metadata and disables request cache and logs', () => {
    const headers = buildGatewayPrivacyHeaders({
      requestId: 'req-123',
      promptVersion: 'p5-foundation-v1',
      releaseId: 'topik-preview-v1',
      userBucket: 'a'.repeat(64),
      feature: 'topik_writing_feedback',
    }, 12_000);
    const metadata = JSON.parse(headers['cf-aig-metadata']!);
    expect(Object.keys(metadata)).toEqual(['request_id', 'prompt_version', 'release_id', 'user_bucket', 'feature']);
    expect(JSON.stringify(metadata)).not.toMatch(/email|response_text|raw|source_url/iu);
    expect(headers).toMatchObject({
      'cf-aig-collect-log': 'false',
      'cf-aig-collect-log-payload': 'false',
      'cf-aig-skip-cache': 'true',
      'cf-aig-max-attempts': '1',
      'cf-aig-request-timeout': '12000',
    });
  });

  it('does not open the provider circuit for a deliberate quota refusal', () => {
    expect(shouldRecordAiCircuitFailure(new Error('network'))).toBe(true);
    expect(shouldRecordAiCircuitFailure(new AiAssistanceFault('rate_limited', 429, 'quota'))).toBe(false);
    expect(shouldRecordAiCircuitFailure(new AiAssistanceFault('budget_exhausted', 429, 'budget'))).toBe(false);
    expect(shouldRecordAiCircuitFailure(new AiAssistanceFault('invalid_output', 502, 'schema'))).toBe(true);
  });

  it('blocks direct PII from the writing feature before an AI request', () => {
    expect(detectSensitiveWritingInput('email me at learner@example.com')).toContain('email');
    expect(detectSensitiveWritingInput('전화번호는 010-1234-5678입니다.')).toContain('phone');
    expect(detectSensitiveWritingInput('개인정보 없는 한국어 문장입니다.')).toEqual([]);
  });

  it('rejects model output that predicts an official result or echoes a learner response', () => {
    expect(() => parseWritingFeedback({
      response: JSON.stringify({
        rubric: { task_response: 4, organization: 4, grammar: 4, vocabulary: 4 },
        strengths: ['좋습니다'],
        next_steps: ['합격을 보장합니다'],
        requires_human_review: false,
      }),
    }, '저는 오늘 도서관에서 한국어를 공부했습니다.')).toThrow(/공식 결과/u);

    const answer = '저는 오늘 도서관에서 한국어를 공부했습니다. 내일도 계속 연습하겠습니다.';
    expect(() => parseWritingFeedback({
      response: JSON.stringify({
        rubric: { task_response: 3, organization: 3, grammar: 3, vocabulary: 3 },
        strengths: [answer],
        next_steps: ['연결 표현을 점검하세요'],
        requires_human_review: false,
      }),
    }, answer)).toThrow(/그대로 되풀이/u);

    const shortAnswer = '저는 매일 한국어 문장을 읽습니다.';
    expect(() => parseWritingFeedback({
      response: JSON.stringify({
        rubric: { task_response: 3, organization: 3, grammar: 3, vocabulary: 3 },
        strengths: ['저는 매일 한국어 문장을 읽습니다'],
        next_steps: ['조사 사용을 확인하세요'],
        requires_human_review: false,
      }),
    }, shortAnswer)).toThrow(/그대로 되풀이/u);
  });

  it('returns approved and formative safe fallbacks with no raw learner text', () => {
    const explanation = approvedExplanationFallback({
      explanation: '승인된 해설입니다.',
      stableRef: 'topik.item.safe-001',
      instructionLanguage: 'ja',
    });
    const feedback = safeWritingFeedbackFallback();
    expect(explanation.mode).toBe('approved_fallback');
    expect(feedback.mode).toBe('safe_fallback');
    expect(JSON.stringify(feedback)).not.toContain('learner@example.com');
  });

  it('accepts only grounded JSON with a fixed server citation', () => {
    const response = parseGroundedExplanation({
      response: JSON.stringify({ summary: '표현의 쓰임을 살펴보세요.', study_points: ['조사를 함께 확인하세요.'] }),
    }, { stableRef: 'topik.item.grounded-001', sourceText: '승인된 문항' });
    expect(response.citation_stable_ref).toBe('topik.item.grounded-001');
    expect(response.mode).toBe('ai_grounded');
  });
});
