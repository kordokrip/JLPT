import { describe, expect, it } from 'vitest';
import { AUDIO_QA_SAMPLES } from '@nihongo-n3/shared';
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
  it('requires evaluator, device, exact candidate metadata, and five scores for all 120 comparisons', () => {
    const scorecard = createAudioQaScorecard({ browser: 'WebKit / iOS', evaluatedOn: '2026-07-15' });
    scorecard.evaluator = 'QA evaluator';
    scorecard.device = 'iPhone 15 Plus';

    expect(isAudioQaScorecardComplete(scorecard)).toBe(false);

    for (const provider of AUDIO_QA_PROVIDERS) {
      AUDIO_QA_SAMPLES.forEach((_, sampleIndex) => {
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
});
