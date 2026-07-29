import { audioQaSampleSet, audioQaSamples, type AudioQaLanguage } from '@nihongo-n3/shared';

/** QA may compare only R2 objects with recorded provider provenance. */
export const AUDIO_QA_PROVIDERS = ['cloudflare', 'google', 'voicevox'] as const;
export type AudioQaProvider = (typeof AUDIO_QA_PROVIDERS)[number];

export function audioQaProvidersForLanguage(language: AudioQaLanguage): readonly AudioQaProvider[] {
  return language === 'ko'
    ? ['cloudflare', 'google']
    : AUDIO_QA_PROVIDERS;
}

export const AUDIO_QA_CRITERIA = [
  { id: 'naturalness', label: '자연스러움' },
  { id: 'pitchAccent', label: '피치 악센트' },
  { id: 'mora', label: '장음·촉음·모라' },
  { id: 'intonation', label: '문장 억양' },
  { id: 'noiseSpeed', label: '잡음·속도' },
] as const;
export type AudioQaCriterion = (typeof AUDIO_QA_CRITERIA)[number]['id'];

export interface AudioQaCandidate {
  provider: AudioQaProvider;
  model: string;
  voice: string;
  version: string;
}

export interface AudioQaRating {
  candidate: AudioQaCandidate | null;
  scores: Partial<Record<AudioQaCriterion, number>>;
  notes: string;
  playedAt: string | null;
}

export interface AudioQaScorecard {
  schemaVersion: 2;
  language: AudioQaLanguage;
  sampleSet: string;
  evaluator: string;
  device: string;
  browser: string;
  evaluatedOn: string;
  approval: 'pending' | 'approved' | 'rejected';
  approvedProvider: AudioQaProvider | null;
  approvalNotes: string;
  ratings: Record<string, AudioQaRating>;
}

export function audioQaRatingKey(provider: AudioQaProvider, sampleIndex: number): string {
  return `${provider}:${sampleIndex}`;
}

export function createAudioQaScorecard(options: {
  language?: AudioQaLanguage;
  browser?: string;
  evaluatedOn?: string;
} = {}): AudioQaScorecard {
  return {
    schemaVersion: 2,
    language: options.language ?? 'ja',
    sampleSet: audioQaSampleSet(options.language ?? 'ja'),
    evaluator: '',
    device: '',
    browser: options.browser ?? '',
    evaluatedOn: options.evaluatedOn ?? new Date().toISOString().slice(0, 10),
    approval: 'pending',
    approvedProvider: null,
    approvalNotes: '',
    ratings: {},
  };
}

export function isAudioQaScorecardComplete(scorecard: AudioQaScorecard): boolean {
  if (!scorecard.evaluator.trim() || !scorecard.device.trim() || !scorecard.browser.trim() || !scorecard.evaluatedOn) {
    return false;
  }

  return audioQaProvidersForLanguage(scorecard.language).every((provider) =>
    audioQaSamples(scorecard.language).every((_, sampleIndex) => {
      const rating = scorecard.ratings[audioQaRatingKey(provider, sampleIndex)];
      if (!rating?.candidate || rating.candidate.provider !== provider || !rating.playedAt) return false;
      if (!rating.candidate.model.trim() || !rating.candidate.voice.trim() || !rating.candidate.version.trim()) return false;
      return AUDIO_QA_CRITERIA.every(({ id }) => isValidScore(rating.scores[id]));
    }),
  );
}

export function isAudioQaApproved(scorecard: AudioQaScorecard): boolean {
  return isAudioQaScorecardComplete(scorecard) &&
    scorecard.approval === 'approved' &&
    scorecard.approvedProvider !== null &&
    scorecard.approvalNotes.trim().length > 0;
}

export function audioQaProviderSummary(scorecard: AudioQaScorecard, provider: AudioQaProvider): {
  completedSamples: number;
  average: number;
} {
  const values: number[] = [];
  let completedSamples = 0;

  audioQaSamples(scorecard.language).forEach((_, sampleIndex) => {
    const rating = scorecard.ratings[audioQaRatingKey(provider, sampleIndex)];
    const scores = AUDIO_QA_CRITERIA.map(({ id }) => rating?.scores[id]).filter(isValidScore);
    if (scores.length === AUDIO_QA_CRITERIA.length && rating?.candidate) completedSamples += 1;
    values.push(...scores);
  });

  return {
    completedSamples,
    average: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0,
  };
}

export function audioQaScorecardMarkdown(scorecard: AudioQaScorecard): string {
  const complete = isAudioQaScorecardComplete(scorecard);
  const approved = isAudioQaApproved(scorecard);
  const lines = [
    `# ${scorecard.language === 'ko' ? '한국어' : '일본어'} 오디오 30문장 청감표`,
    '',
    `- 표본 세트: \`${scorecard.sampleSet}\``,
    `- 학습 언어: ${scorecard.language === 'ko' ? '한국어' : '일본어'}`,
    `- 평가자: ${escapeCell(scorecard.evaluator) || '미입력'}`,
    `- 기기: ${escapeCell(scorecard.device) || '미입력'}`,
    `- 브라우저/OS: ${escapeCell(scorecard.browser) || '미입력'}`,
    `- 평가일: ${scorecard.evaluatedOn || '미입력'}`,
    `- 청감 완료: ${complete ? '예' : '아니요'}`,
    `- 배치 승인: ${approved ? `승인 (${scorecard.approvedProvider})` : scorecard.approval}`,
    `- 승인 근거: ${escapeCell(scorecard.approvalNotes) || '미입력'}`,
    '',
    '## Provider 요약',
    '',
    '| Provider | 완료 문장 | 평균 | Model | Voice | Version |',
    '| --- | ---: | ---: | --- | --- | --- |',
  ];

  for (const provider of audioQaProvidersForLanguage(scorecard.language)) {
    const summary = audioQaProviderSummary(scorecard, provider);
    const candidate = firstCandidate(scorecard, provider);
    lines.push(
      `| ${provider} | ${summary.completedSamples}/30 | ${summary.average.toFixed(2)} | ${escapeCell(candidate?.model ?? '')} | ${escapeCell(candidate?.voice ?? '')} | ${escapeCell(candidate?.version ?? '')} |`,
    );
  }

  lines.push(
    '',
    '## 문장별 평가',
    '',
    '| # | Provider | 자연스러움 | 피치 | 모라 | 억양 | 잡음·속도 | 메모 |',
    '| ---: | --- | ---: | ---: | ---: | ---: | ---: | --- |',
  );

  audioQaSamples(scorecard.language).forEach((_, sampleIndex) => {
    for (const provider of audioQaProvidersForLanguage(scorecard.language)) {
      const rating = scorecard.ratings[audioQaRatingKey(provider, sampleIndex)];
      lines.push(
        `| ${sampleIndex + 1} | ${provider} | ${scoreValue(rating, 'naturalness')} | ${scoreValue(rating, 'pitchAccent')} | ${scoreValue(rating, 'mora')} | ${scoreValue(rating, 'intonation')} | ${scoreValue(rating, 'noiseSpeed')} | ${escapeCell(rating?.notes ?? '')} |`,
      );
    }
  });

  lines.push('', '## 표본 문장', '');
  audioQaSamples(scorecard.language).forEach((sample, index) => lines.push(`${index + 1}. ${sample}`));
  lines.push('');
  return lines.join('\n');
}

function firstCandidate(scorecard: AudioQaScorecard, provider: AudioQaProvider): AudioQaCandidate | null {
  for (let sampleIndex = 0; sampleIndex < audioQaSamples(scorecard.language).length; sampleIndex += 1) {
    const candidate = scorecard.ratings[audioQaRatingKey(provider, sampleIndex)]?.candidate;
    if (candidate) return candidate;
  }
  return null;
}

function scoreValue(rating: AudioQaRating | undefined, criterion: AudioQaCriterion): string {
  const value = rating?.scores[criterion];
  return isValidScore(value) ? String(value) : '';
}

function isValidScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5;
}

function escapeCell(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, '<br>')
    .trim();
}
