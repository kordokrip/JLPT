import { createHash } from 'node:crypto';

export const CONTENT_RELEASE_STATES = [
  'draft',
  'automated_checked',
  'human_reviewed',
  'preview',
  'approved',
  'published',
  'withdrawn',
] as const;

export type ContentReleaseState = (typeof CONTENT_RELEASE_STATES)[number];

export const CONTENT_REVIEW_SIGNOFF_STATES = ['pending', 'signed'] as const;
export type ContentReviewSignoffState = (typeof CONTENT_REVIEW_SIGNOFF_STATES)[number];

export interface ContentReleaseProvenance {
  sourceCode: string;
  sourceType: 'self-authored' | 'licensed-external' | 'official-reference' | 'fixture';
  sourceUrl: string;
  retrievedAt: string;
  sourceSha256: string;
  licenseId: string;
  licenseUrl: string;
  allowedUse: string;
  attributionText: string;
  author: string;
  firstReviewer: string;
  secondReviewer: string;
  firstReviewStatus: ContentReviewSignoffState;
  firstReviewedAt: string | null;
  secondReviewStatus: ContentReviewSignoffState;
  secondReviewedAt: string | null;
  reviewedAt: string;
}

export interface TopikContractItem {
  id: string;
  stableRef: string;
  examLevel: 'TOPIK-I' | 'TOPIK-II';
  examBand: 'beginner' | 'intermediate' | 'advanced';
  section: 'listening' | 'writing' | 'reading';
  itemKind: 'lesson' | 'vocab' | 'grammar' | 'character' | 'listening' | 'reading' | 'writing' | 'practice';
  skill: string;
  difficulty: number;
  promptKo: string;
  promptJa: string;
  promptEn: string;
  answerPayloadJson: string;
  explanationKo: string;
  explanationJa: string;
  explanationEn: string;
}

export interface TopikContentContractFixture {
  release: {
    id: string;
    learningTrack: 'topik-ko';
    contentVersion: string;
    releaseState: 'draft';
    manifestSha256: string;
    parserVersion: string;
  };
  provenance: ContentReleaseProvenance;
  unit: {
    id: string;
    stableRef: string;
    examLevel: 'TOPIK-I' | 'TOPIK-II';
    examBand: 'beginner' | 'intermediate' | 'advanced';
    section: 'listening' | 'writing' | 'reading';
    titleKo: string;
    titleJa: string;
    titleEn: string;
    instructionLanguages: readonly ['ko', 'ja', 'en'];
  };
  item: TopikContractItem;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const SHA256 = /^[a-f0-9]{64}$/i;

function checksum(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function sql(value: string | number | null): string {
  if (value === null) return 'NULL';
  return typeof value === 'number' ? String(value) : `'${value.replace(/'/g, "''")}'`;
}

function required(errors: string[], name: string, value: string): void {
  if (!value.trim()) errors.push(`${name} is required`);
}

function https(errors: string[], name: string, value: string): void {
  try {
    if (new URL(value).protocol !== 'https:') errors.push(`${name} must use https`);
  } catch {
    errors.push(`${name} must use https`);
  }
}

export function validateContentReleaseProvenance(value: ContentReleaseProvenance): string[] {
  const errors: string[] = [];
  required(errors, 'sourceCode', value.sourceCode);
  https(errors, 'sourceUrl', value.sourceUrl);
  if (!ISO_DATE.test(value.retrievedAt)) errors.push('retrievedAt must be YYYY-MM-DD');
  if (!SHA256.test(value.sourceSha256)) errors.push('sourceSha256 must be SHA-256');
  required(errors, 'licenseId', value.licenseId);
  https(errors, 'licenseUrl', value.licenseUrl);
  required(errors, 'allowedUse', value.allowedUse);
  required(errors, 'attributionText', value.attributionText);
  required(errors, 'author', value.author);
  required(errors, 'firstReviewer', value.firstReviewer);
  required(errors, 'secondReviewer', value.secondReviewer);
  if (value.firstReviewer.trim() && value.firstReviewer === value.secondReviewer) {
    errors.push('reviewers must be distinct');
  }
  for (const [name, status, signedAt] of [
    ['first', value.firstReviewStatus, value.firstReviewedAt],
    ['second', value.secondReviewStatus, value.secondReviewedAt],
  ] as const) {
    if (!CONTENT_REVIEW_SIGNOFF_STATES.includes(status)) {
      errors.push(`${name}ReviewStatus must be pending or signed`);
    }
    if (status === 'signed' && (!signedAt || !ISO_DATE.test(signedAt))) {
      errors.push(`${name} signed review requires YYYY-MM-DD`);
    }
    if (status === 'pending' && signedAt !== null) {
      errors.push(`${name} pending review cannot have a sign-off date`);
    }
  }
  if (!ISO_DATE.test(value.reviewedAt)) errors.push('reviewedAt must be YYYY-MM-DD');
  return errors;
}

export function hasTwoSignedContentReviews(value: ContentReleaseProvenance): boolean {
  return value.firstReviewStatus === 'signed'
    && value.secondReviewStatus === 'signed'
    && Boolean(value.firstReviewedAt)
    && Boolean(value.secondReviewedAt)
    && value.firstReviewer.trim() !== value.secondReviewer.trim();
}

export function canTransitionContentRelease(
  from: ContentReleaseState,
  to: ContentReleaseState,
): boolean {
  return (
    (from === 'draft' && to === 'automated_checked') ||
    (from === 'automated_checked' && to === 'human_reviewed') ||
    (from === 'human_reviewed' && to === 'preview') ||
    (from === 'preview' && to === 'approved') ||
    (from === 'approved' && to === 'published') ||
    (from === 'published' && to === 'withdrawn')
  );
}

export function assertTopikContentContractFixture(value: TopikContentContractFixture): void {
  const provenanceErrors = validateContentReleaseProvenance(value.provenance);
  if (provenanceErrors.length > 0) throw new Error(`Incomplete provenance: ${provenanceErrors.join(', ')}`);
  if (!SHA256.test(value.release.manifestSha256)) throw new Error('manifestSha256 must be SHA-256');
  if (!value.release.parserVersion.trim()) throw new Error('parserVersion is required');
  if (value.release.releaseState !== 'draft') throw new Error('fixtures must start in draft state');
  if (value.unit.instructionLanguages.join(',') !== 'ko,ja,en') throw new Error('fixture must include ko/ja/en instruction variants');
  const item = value.item;
  if (!item.id || !item.stableRef || !item.skill) throw new Error('item identity is incomplete');
  if (item.difficulty < 1 || item.difficulty > 5) throw new Error('item difficulty must be 1..5');
  for (const [name, field] of Object.entries({
    promptKo: item.promptKo,
    promptJa: item.promptJa,
    promptEn: item.promptEn,
    answerPayloadJson: item.answerPayloadJson,
    explanationKo: item.explanationKo,
    explanationJa: item.explanationJa,
    explanationEn: item.explanationEn,
  })) {
    if (!field.trim()) throw new Error(`${name} is required`);
  }
  try {
    JSON.parse(item.answerPayloadJson);
  } catch {
    throw new Error('answerPayloadJson must be valid JSON');
  }
}

const fixtureSource = 'self-authored local fixture; no external source material is included';

/**
 * This fixture proves the release contract only. It is draft-only and must
 * never be registered in CONTENT_PATHS, content-manifest, or a remote seed.
 */
export const TOPIK_CONTENT_CONTRACT_FIXTURE: TopikContentContractFixture = {
  release: {
    id: 'topik-contract-fixture-v1',
    learningTrack: 'topik-ko',
    contentVersion: 'topik-contract-fixture-v1',
    releaseState: 'draft',
    manifestSha256: checksum('topik-contract-fixture-v1'),
    parserVersion: 'topik-content-contract-v1',
  },
  provenance: {
    sourceCode: 'TOPIK-CONTRACT-FIXTURE',
    sourceType: 'fixture',
    sourceUrl: 'https://example.invalid/nihongo-n3/topik-contract-fixture',
    retrievedAt: '2026-07-27',
    sourceSha256: checksum(fixtureSource),
    licenseId: 'LicenseRef-local-test-fixture',
    licenseUrl: 'https://example.invalid/licenses/local-test-fixture',
    allowedUse: 'test-fixture-only',
    attributionText: 'Self-authored local contract fixture. Not for publication or learner delivery.',
    author: 'content-contract-fixture-author',
    firstReviewer: 'content-contract-fixture-reviewer-a',
    secondReviewer: 'content-contract-fixture-reviewer-b',
    firstReviewStatus: 'signed',
    firstReviewedAt: '2026-07-27',
    secondReviewStatus: 'signed',
    secondReviewedAt: '2026-07-27',
    reviewedAt: '2026-07-27',
  },
  unit: {
    id: 'topik-contract-fixture-unit-1',
    stableRef: 'topik.unit.fixture.beginner.listening.001',
    examLevel: 'TOPIK-I',
    examBand: 'beginner',
    section: 'listening',
    titleKo: '계약 검증 단원',
    titleJa: '契約検証ユニット',
    titleEn: 'Contract verification unit',
    instructionLanguages: ['ko', 'ja', 'en'],
  },
  item: {
    id: 'topik-contract-fixture-item-1',
    stableRef: 'topik.item.fixture.beginner.listening.001',
    examLevel: 'TOPIK-I',
    examBand: 'beginner',
    section: 'listening',
    itemKind: 'practice',
    skill: 'fixture-contract',
    difficulty: 1,
    promptKo: '이 문장은 계약 검증용 자체 저작 fixture입니다.',
    promptJa: 'この文は契約検証用の自作fixtureです。',
    promptEn: 'This sentence is a self-authored contract verification fixture.',
    answerPayloadJson: JSON.stringify({ answer: 'fixture-private' }),
    explanationKo: '공개 목록에는 포함되지 않는 검증용 해설입니다.',
    explanationJa: '公開一覧には含めない検証用の解説です。',
    explanationEn: 'This explanation is private to the contract fixture.',
  },
};

export function buildTopikContentContractFixtureSql(): string[] {
  const fixture = TOPIK_CONTENT_CONTRACT_FIXTURE;
  assertTopikContentContractFixture(fixture);
  const { release, provenance, unit, item } = fixture;
  return [
    `INSERT INTO content_releases (id, learning_track, content_version, release_state, manifest_sha256, parser_version)
     VALUES (${sql(release.id)}, ${sql(release.learningTrack)}, ${sql(release.contentVersion)}, ${sql(release.releaseState)}, ${sql(release.manifestSha256)}, ${sql(release.parserVersion)});`,
    `INSERT INTO content_release_sources (release_id, source_code, source_type, source_url, retrieved_at, source_sha256, license_id, license_url, allowed_use, attribution_text, author, first_reviewer, second_reviewer, reviewed_at, first_review_status, first_reviewed_at, second_review_status, second_reviewed_at)
     VALUES (${sql(release.id)}, ${sql(provenance.sourceCode)}, ${sql(provenance.sourceType)}, ${sql(provenance.sourceUrl)}, ${sql(provenance.retrievedAt)}, ${sql(provenance.sourceSha256)}, ${sql(provenance.licenseId)}, ${sql(provenance.licenseUrl)}, ${sql(provenance.allowedUse)}, ${sql(provenance.attributionText)}, ${sql(provenance.author)}, ${sql(provenance.firstReviewer)}, ${sql(provenance.secondReviewer)}, ${sql(provenance.reviewedAt)}, ${sql(provenance.firstReviewStatus)}, ${sql(provenance.firstReviewedAt)}, ${sql(provenance.secondReviewStatus)}, ${sql(provenance.secondReviewedAt)});`,
    `INSERT INTO topik_curriculum_units (id, release_id, learning_track, stable_ref, exam_level, exam_band, section, title_ko, title_ja, title_en, instruction_languages_json)
     VALUES (${sql(unit.id)}, ${sql(release.id)}, 'topik-ko', ${sql(unit.stableRef)}, ${sql(unit.examLevel)}, ${sql(unit.examBand)}, ${sql(unit.section)}, ${sql(unit.titleKo)}, ${sql(unit.titleJa)}, ${sql(unit.titleEn)}, ${sql(JSON.stringify(unit.instructionLanguages))});`,
    `INSERT INTO topik_content_items (id, release_id, unit_id, learning_track, stable_ref, exam_level, exam_band, section, item_kind, skill, difficulty, prompt_ko, prompt_ja, prompt_en, answer_payload_json, explanation_ko, explanation_ja, explanation_en, source_code)
     VALUES (${sql(item.id)}, ${sql(release.id)}, ${sql(unit.id)}, 'topik-ko', ${sql(item.stableRef)}, ${sql(item.examLevel)}, ${sql(item.examBand)}, ${sql(item.section)}, ${sql(item.itemKind)}, ${sql(item.skill)}, ${sql(item.difficulty)}, ${sql(item.promptKo)}, ${sql(item.promptJa)}, ${sql(item.promptEn)}, ${sql(item.answerPayloadJson)}, ${sql(item.explanationKo)}, ${sql(item.explanationJa)}, ${sql(item.explanationEn)}, ${sql(provenance.sourceCode)});`,
  ];
}
