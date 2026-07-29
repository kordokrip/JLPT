import { describe, expect, it } from 'vitest';
import { audioQaSamples } from '@nihongo-n3/shared';
import {
  AUDIO_QA_CRITERIA,
  AUDIO_QA_PROVIDERS,
  audioQaRatingKey,
  audioQaScorecardMarkdown,
  createAudioQaScorecard,
  isAudioQaApproved,
  isAudioQaScorecardComplete,
} from './scorecard';

describe('audio QA scorecard', () => {
  it('requires evaluator, device, exact R2 candidate metadata, and five scores for all provider comparisons', () => {
    const scorecard = createAudioQaScorecard({ browser: 'WebKit / iOS', evaluatedOn: '2026-07-15' });
    scorecard.evaluator = 'QA evaluator';
    scorecard.device = 'iPhone 15 Plus';

    expect(isAudioQaScorecardComplete(scorecard)).toBe(false);

    for (const provider of AUDIO_QA_PROVIDERS) {
      audioQaSamples('ja').forEach((_, sampleIndex) => {
        scorecard.ratings[audioQaRatingKey(provider, sampleIndex)] = {
          candidate: { provider, model: `${provider}-model`, voice: `${provider}-voice`, version: 'v1' },
          scores: Object.fromEntries(AUDIO_QA_CRITERIA.map(({ id }) => [id, 4])),
          notes: '',
          playedAt: '2026-07-15T00:00:00.000Z',
        };
      });
    }

    expect(isAudioQaScorecardComplete(scorecard)).toBe(true);
    expect(isAudioQaApproved(scorecard)).toBe(false);

    scorecard.approval = 'approved';
    scorecard.approvedProvider = 'google';
    scorecard.approvalNotes = '30개 동일 문장 비교 후 억양과 모라가 가장 안정적임';
    expect(isAudioQaApproved(scorecard)).toBe(true);

    const markdown = audioQaScorecardMarkdown(scorecard);
    expect(markdown).toContain('완료 문장 | 평균 | Model | Voice | Version');
    expect(markdown).toContain('| google | 30/30 | 4.00 |');
    expect(markdown).toContain('배치 승인: 승인 (google)');
  });

  it('escapes existing backslashes before Markdown table separators', () => {
    const scorecard = createAudioQaScorecard();
    scorecard.evaluator = String.raw`QA\Lead | reviewer`;
    scorecard.device = 'desktop\nWebKit';

    const markdown = audioQaScorecardMarkdown(scorecard);

    expect(markdown).toContain(String.raw`QA\\Lead \| reviewer`);
    expect(markdown).toContain('desktop<br>WebKit');
  });

  it('uses a separate 30-sample provider matrix for Korean QA', () => {
    const scorecard = createAudioQaScorecard({ language: 'ko', browser: 'Chrome', evaluatedOn: '2026-07-20' });
    scorecard.evaluator = 'QA evaluator';
    scorecard.device = 'Android';
    for (const provider of ['cloudflare', 'google'] as const) {
      audioQaSamples('ko').forEach((_, sampleIndex) => {
        scorecard.ratings[audioQaRatingKey(provider, sampleIndex)] = {
          candidate: { provider, model: `${provider}-model`, voice: `${provider}-voice`, version: 'v1' },
          scores: Object.fromEntries(AUDIO_QA_CRITERIA.map(({ id }) => [id, 4])), notes: '', playedAt: '2026-07-20T00:00:00.000Z',
        };
      });
    }
    expect(isAudioQaScorecardComplete(scorecard)).toBe(true);
    expect(audioQaScorecardMarkdown(scorecard)).toContain('한국어 오디오 30문장 청감표');
  });
});
