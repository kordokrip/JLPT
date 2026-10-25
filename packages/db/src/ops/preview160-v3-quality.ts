import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { REPO_ROOT } from '../seed/constants.js';

export const PREVIEW160_V3_VERSION = 'preview160-v3-2026-10-12';
export const PREVIEW160_V3_DRAFT_SHA256 = '4934aa390878bd6ac2becd9ec4e930eafb7e72423b98b492430a83b1747ffd6f';
export const PREVIEW160_V3_SOURCE_SHA256 = 'c5e2548381420c785909d787e9a316a1cc6057e0fc777702aa4ebfe33db73c66';
export const PREVIEW160_V3_MANIFEST_SHA256 = 'de8b459e06474fc1454b46139e4ab3a65c9692a8ee54a23ea26e702e87b61a9b';
export const PREVIEW160_V3_REVIEW_A_SHA256 = '6fc06d143e2d87f65813550ca8b3ffa5a1ed44038faf0f72f8ef662928e705e1';
export const PREVIEW160_V3_REVIEW_B_SHA256 = '57246e3ce6feec1873f9bbd42652b00b4dc41ab76dc29f9a60a782c443acfd6f';
export const PREVIEW160_V3_VALIDATOR_VERSION = 'preview160-v3-quality-v1';

export type Preview160Paths = Readonly<{ draft: string; source: string; manifest: string; reviewA: string; reviewB: string }>;
type Localized = { ko: string; ja: string; en: string };
export type Preview160V3Item = Record<string, unknown> & { id: string; origin_id: string; source_evidence_hash: string; prompt: Localized; explanation: Localized; title?: Localized; choices?: Localized[]; rubric?: Localized; audio_text_ko?: string | null };
type Item = Preview160V3Item;
type ReviewItem = { id: string; status: string; answer_index: number | null; explanation_consistent: unknown; reason: unknown };

export type Preview160QualityResult = Readonly<{
  passed: boolean;
  validator_version: string;
  hashes: Readonly<Record<'draft' | 'source' | 'manifest' | 'review_a' | 'review_b', string>>;
  counts: Readonly<Record<string, number>>;
  errors: readonly string[];
  draft: { jlpt: Item[]; topik: Item[] };
  reviews: readonly [Record<string, unknown>, Record<string, unknown>];
}>;

const sha256 = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('hex');
const norm = (value: string): string => value.normalize('NFKC').toLowerCase().replace(/\s+/gu, ' ').trim();
const isLocalized = (value: unknown): value is Localized => !!value && typeof value === 'object' && ['ko', 'ja', 'en'].every((key) => typeof (value as Record<string, unknown>)[key] === 'string' && String((value as Record<string, unknown>)[key]).trim() !== '');

export function defaultPreview160V3Paths(): Preview160Paths {
  const base = path.resolve(REPO_ROOT, 'packages/db/src/content');
  return {
    draft: path.join(base, 'preview160-v3-2026-10-12/draft.json'),
    source: path.join(base, 'preview160-v3-2026-10-12/source-derivative.json'),
    manifest: path.join(base, 'preview160-v3-2026-10-12/manifest.json'),
    reviewA: path.join(base, 'reviews/preview160-v3-review-a-2026-10-12.json'),
    reviewB: path.join(base, 'reviews/preview160-v3-review-b-2026-10-12.json'),
  };
}

function read(pathname: string, expected: string, label: string): { bytes: Buffer; value: Record<string, unknown> } {
  const bytes = fs.readFileSync(pathname);
  if (sha256(bytes) !== expected) throw new Error(`${label} raw SHA-256 mismatch`);
  const value = JSON.parse(bytes.toString('utf8')) as unknown;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be a JSON object`);
  return { bytes, value: value as Record<string, unknown> };
}

function exactCounts(values: number[], expected: number[], label: string, errors: string[]): void {
  if (JSON.stringify(values) !== JSON.stringify(expected)) errors.push(`${label}: expected ${expected.join('/')}, got ${values.join('/')}`);
}

export function validatePreview160V3(paths: Preview160Paths = defaultPreview160V3Paths()): Preview160QualityResult {
  const draftRecord = read(paths.draft, PREVIEW160_V3_DRAFT_SHA256, 'draft').value;
  const source = read(paths.source, PREVIEW160_V3_SOURCE_SHA256, 'source').value;
  const manifest = read(paths.manifest, PREVIEW160_V3_MANIFEST_SHA256, 'manifest').value;
  const reviewA = read(paths.reviewA, PREVIEW160_V3_REVIEW_A_SHA256, 'review A').value;
  const reviewB = read(paths.reviewB, PREVIEW160_V3_REVIEW_B_SHA256, 'review B').value;
  const errors: string[] = [];

  if (source.reused !== true || source.new_http_acquisition !== false || source.new_license_research !== false) errors.push('source must reuse existing facts without new HTTP or license research');
  if (draftRecord.version !== PREVIEW160_V3_VERSION || draftRecord.publication !== 'draft-unpublished') errors.push('draft version/publication mismatch');
  const parent = manifest.parent as Record<string, unknown> | undefined;
  const files = manifest.files as Record<string, Record<string, unknown>> | undefined;
  if (manifest.version !== PREVIEW160_V3_VERSION || files?.['draft.json']?.sha256 !== PREVIEW160_V3_DRAFT_SHA256 || files?.['source-derivative.json']?.sha256 !== PREVIEW160_V3_SOURCE_SHA256 || parent?.draft_sha256 !== '22f2850223026427682b3afa53fbaf4410b35b2b421d013f1db453e805af6711') errors.push('manifest binding mismatch');

  const jlpt = Array.isArray(draftRecord.jlpt) ? draftRecord.jlpt as Item[] : [];
  const topik = Array.isArray(draftRecord.topik) ? draftRecord.topik as Item[] : [];
  const all = [...jlpt, ...topik];
  if (all.length !== 160 || new Set(all.map((item) => item.id)).size !== 160 || new Set(all.map((item) => item.origin_id)).size !== 160) errors.push('draft must contain 160 unique IDs and origins');
  if (all.some((item) => item.source_evidence_hash !== PREVIEW160_V3_SOURCE_SHA256)) errors.push('item source binding mismatch');
  if (all.some((item) => !isLocalized(item.prompt) || !isLocalized(item.explanation))) errors.push('prompt/explanation must be non-empty in ko/ja/en');
  if (all.some((item) => /audio_r2_key|r2:\/\/|r2-ready|immutable_r2_key/iu.test(JSON.stringify(item)))) errors.push('R2 audio reference found');
  if (new Set(all.map((item) => norm(item.prompt.ja))).size !== 160) errors.push('duplicate Japanese prompt fingerprint');

  const n2 = jlpt.filter((item) => item.level === 'N2');
  const n1 = jlpt.filter((item) => item.level === 'N1');
  for (const [label, items] of [['N2', n2], ['N1', n1]] as const) {
    if (items.length !== 60) errors.push(`${label} count must be 60`);
    exactCounts(['vocab_mc', 'grammar_fill', 'kanji_reading', 'listening'].map((mode) => items.filter((item) => item.mode === mode).length), [15, 15, 15, 15], `${label} modes`, errors);
    for (const mode of ['vocab_mc', 'grammar_fill', 'kanji_reading', 'listening']) exactCounts([1, 2, 3, 4, 5].map((difficulty) => items.filter((item) => item.mode === mode && item.difficulty === difficulty).length), [3, 3, 3, 3, 3], `${label} ${mode} difficulty`, errors);
    exactCounts([1, 2, 3, 4, 5].map((difficulty) => items.filter((item) => item.difficulty === difficulty).length), [12, 12, 12, 12, 12], `${label} difficulty`, errors);
    exactCounts([0, 1, 2, 3].map((answer) => items.filter((item) => item.answer_index === answer).length), [15, 15, 15, 15], `${label} answers`, errors);
  }
  for (const grade of [3, 4, 5, 6]) {
    const items = topik.filter((item) => item.grade === grade);
    if (items.length !== 10) errors.push(`TOPIK grade ${grade} count must be 10`);
    exactCounts(['vocab', 'grammar', 'reading', 'listening', 'writing'].map((section) => items.filter((item) => item.section === section).length), [2, 2, 2, 2, 2], `TOPIK grade ${grade} sections`, errors);
    exactCounts([0, 1, 2, 3].map((answer) => items.filter((item) => item.answer_index === answer).length), [2, 2, 2, 2], `TOPIK grade ${grade} choice answers`, errors);
  }

  const choice = all.filter((item) => Array.isArray(item.choices));
  const writing = all.filter((item) => item.section === 'writing');
  const audio = all.filter((item) => typeof item.audio_script_ja === 'string' || typeof item.audio_text_ko === 'string');
  if (choice.length !== 152 || writing.length !== 8 || audio.length !== 38) errors.push('choice/writing/audio counts must be 152/8/38');
  for (const item of choice) {
    const choices = item.choices as unknown[];
    if (choices.length !== 4 || choices.some((candidate) => !isLocalized(candidate)) || new Set(choices.map((candidate) => norm((candidate as Localized).ja))).size !== 4 || ![0, 1, 2, 3].includes(Number(item.answer_index))) errors.push(`invalid choice contract: ${item.id}`);
  }
  for (const item of writing) if (!isLocalized(item.rubric) || 'answer_index' in item) errors.push(`invalid writing contract: ${item.id}`);

  const reviewers = [reviewA, reviewB] as const;
  const reviewerIds = reviewers.map((review) => String(review.reviewer_id ?? ''));
  if (!reviewerIds[0] || !reviewerIds[1] || reviewerIds[0] === reviewerIds[1]) errors.push('reviewer identities must be distinct');
  for (const [index, review] of reviewers.entries()) {
    const expectedSource = index === 0 ? review.source_evidence_sha256 : review.source_sha256;
    if (review.scope !== 'preview160-v3-semantic-only' || review.passed !== true || review.full_bank_approval !== true || review.draft_sha256 !== PREVIEW160_V3_DRAFT_SHA256 || review.manifest_sha256 !== PREVIEW160_V3_MANIFEST_SHA256 || expectedSource !== PREVIEW160_V3_SOURCE_SHA256) errors.push(`review ${index === 0 ? 'A' : 'B'} scope/hash/literal pass mismatch`);
    const decisions = Array.isArray(review.items) ? review.items as ReviewItem[] : [];
    if (decisions.length !== 160 || new Set(decisions.map((decision) => decision.id)).size !== 160) errors.push(`review ${index === 0 ? 'A' : 'B'} must cover 160 unique IDs`);
    const decisionMap = new Map(decisions.map((decision) => [decision.id, decision]));
    for (const item of all) {
      const decision = decisionMap.get(item.id);
      const expected = Array.isArray(item.choices) ? Number(item.answer_index) : null;
      if (!decision || decision.status !== 'approved' || decision.answer_index !== expected || decision.explanation_consistent !== true || typeof decision.reason !== 'string' || decision.reason.trim() === '') errors.push(`review ${index === 0 ? 'A' : 'B'} invalid decision: ${item.id}`);
    }
  }

  return {
    passed: errors.length === 0,
    validator_version: PREVIEW160_V3_VALIDATOR_VERSION,
    hashes: { draft: PREVIEW160_V3_DRAFT_SHA256, source: PREVIEW160_V3_SOURCE_SHA256, manifest: PREVIEW160_V3_MANIFEST_SHA256, review_a: PREVIEW160_V3_REVIEW_A_SHA256, review_b: PREVIEW160_V3_REVIEW_B_SHA256 },
    counts: { total: all.length, jlpt_n2: n2.length, jlpt_n1: n1.length, topik: topik.length, choice: choice.length, writing: writing.length, audio: audio.length, r2_references: 0 },
    errors,
    draft: { jlpt, topik },
    reviews: [reviewA, reviewB],
  };
}

export function toGenericQuestionBank(result: Preview160QualityResult): Record<string, unknown> {
  if (!result.passed) throw new Error(`Cannot export failed Preview160 v3 quality: ${result.errors.join('; ')}`);
  const reviewIds = result.reviews.map((review) => String(review.reviewer_id));
  const decisions = result.reviews.map((review) => new Map((review.items as ReviewItem[]).map((item) => [item.id, item])));
  const items = [...result.draft.jlpt, ...result.draft.topik].map((item) => {
    const isChoice = Array.isArray(item.choices);
    const exam = item.level ? 'JLPT' : 'TOPIK';
    const level = String(item.level ?? `grade-${item.grade}`);
    return {
      id: item.id,
      section: String(item.level ? `${item.level}-${item.mode}` : `TOPIK-${item.grade}-${item.section}`),
      question_type: isChoice ? 'choice' : 'constructed-response',
      authorship: 'self-authored',
      source_evidence_hash: PREVIEW160_V3_SOURCE_SHA256,
      difficulty: { exam, level },
      question: item.prompt,
      ...(isChoice ? { choices: item.choices, answer_index: item.answer_index } : { rubric: item.rubric }),
      explanation: item.explanation,
      reviewers: reviewIds.map((reviewer_id, index) => ({ reviewer_id, verdict: 'approved', ...(isChoice ? { answer_index: item.answer_index } : {}), explanation_consistent: decisions[index]?.get(item.id)?.explanation_consistent === true })),
    };
  });
  return { bank_id: PREVIEW160_V3_VERSION, bank_version: PREVIEW160_V3_VERSION, items };
}
