import { createHash } from 'node:crypto';
import { mkdir, open, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const CONTENT_DIR = resolve(dirname(new URL(import.meta.url).pathname), '../content');
const V2_DIR = resolve(CONTENT_DIR, 'preview160-v2-2026-10-12');
const OUTPUT_DIR = resolve(CONTENT_DIR, 'preview160-v3-2026-10-12');
const V2_DRAFT_SHA256 = '22f2850223026427682b3afa53fbaf4410b35b2b421d013f1db453e805af6711';
const V2_SOURCE_SHA256 = '7df63f52d3ab3387eea65f23cf46fc6b007100716afe42172a25fa916d41142a';
const V2_REVIEW_SHA256 = {
  a: '291476b5b84dfdbb030b78e8ecd86af27006b92f8ac0b8fd5a9c49ffa05ed7c7',
  b: '47da0ec86c940839d7d84491325e6c59165aafc8dde85ca55815793c87f78dc4',
} as const;
const OLD_INTAKE_FULL_BYTES_SHA256 = 'ed890daa0e099642a62540cd49fe5803723b755adf066c5486158dd476786201';

type Localized = { ko: string; ja: string; en: string };
type Item = Record<string, unknown> & {
  id: string;
  origin_id: string;
  prompt: Localized;
  rubric?: Localized;
};

const sha256 = (bytes: string | Buffer): string => createHash('sha256').update(bytes).digest('hex');
const serialize = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

async function writeExclusive(path: string, bytes: string): Promise<void> {
  const handle = await open(path, 'wx');
  try {
    await handle.writeFile(bytes, 'utf8');
  } finally {
    await handle.close();
  }
}

function assertExact(actual: unknown, expected: unknown, label: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Unexpected frozen v2 field bytes: ${label}`);
}

function updateIdentity(item: Item): Item {
  return {
    ...structuredClone(item),
    id: `preview160-v3-2026-10-12:${item.origin_id}`,
    origin_id: item.origin_id,
    bank_version: 'preview160-v3-2026-10-12',
    publication: 'draft-unpublished',
    approvals: [],
    reviews: [],
    is_published: 0,
    ...('release_state' in item ? { release_state: 'draft' } : {}),
  };
}

async function main(): Promise<void> {
  const v2Bytes = await readFile(resolve(V2_DIR, 'draft.json'));
  const v2SourceBytes = await readFile(resolve(V2_DIR, 'source-derivative.json'));
  if (sha256(v2Bytes) !== V2_DRAFT_SHA256) throw new Error('Frozen v2 draft hash mismatch');
  if (sha256(v2SourceBytes) !== V2_SOURCE_SHA256) throw new Error('Frozen v2 source derivative hash mismatch');

  const v2 = JSON.parse(v2Bytes.toString('utf8')) as { jlpt: Item[]; topik: Item[] };
  if (v2.jlpt.length !== 120 || v2.topik.length !== 40) throw new Error('Expected frozen v2 counts 120/40');

  const writingOrigin = 'topik-owner-batch6-grade4-writing-2';
  const grammarOrigin = 'topik-owner-batch6-grade5-grammar-2';
  const writingV2 = v2.topik.find((item) => item.origin_id === writingOrigin);
  const grammarV2 = v2.topik.find((item) => item.origin_id === grammarOrigin);
  if (!writingV2?.rubric || !grammarV2) throw new Error('Missing either frozen v2 correction target');

  const expectedWritingPrompt = {
    ko: '온라인 수업과 교실 수업의 장점과 단점을 비교하고 자신이 선호하는 방식을 네 문장으로 쓰세요.',
    ja: 'オンライン授業と教室授業の長所と短所を比較し、自分が好む方式を四文で書いてください。',
    en: 'In four sentences, compare the advantages and disadvantages of remote and in-person work and state which mode you prefer.',
  };
  const expectedWritingRubric = {
    ko: '재택근무와 출근 근무의 장점과 단점을 비교하고 선호하는 방식을 네 문장으로 밝힙니다.',
    ja: '在宅勤務と出勤勤務の長所と短所を比較し、好む方式を四文で示します。',
    en: 'In four sentences, compare the advantages and disadvantages of remote and in-person work and state the preferred mode.',
  };
  const expectedGrammarPrompt = {
    ko: '상황을 계산해 해석한 결론이 되도록 고르세요. 하루에 한 시간씩 이동한다면 일주일에 다섯 시간을 길에서 보내___ .',
    ja: '状況を計算して解釈した結論になるよう選んでください。하루에 한 시간씩 이동한다면 일주일에 다섯 시간을 길에서 보내___ .',
    en: 'Choose the expression presenting the calculated interpretation: 하루에 한 시간씩 이동한다면 일주일에 다섯 시간을 길에서 보내___ .',
  };
  assertExact(writingV2.prompt, expectedWritingPrompt, `${writingOrigin}.prompt`);
  assertExact(writingV2.rubric, expectedWritingRubric, `${writingOrigin}.rubric`);
  assertExact(grammarV2.prompt, expectedGrammarPrompt, `${grammarOrigin}.prompt`);

  const writingPromptV3 = {
    ...expectedWritingPrompt,
    en: 'In four sentences, compare the advantages and disadvantages of online and classroom lessons and state which mode you prefer.',
  };
  const writingRubricV3 = {
    ko: '온라인 수업과 교실 수업의 장점과 단점을 비교하고 선호하는 방식을 네 문장으로 밝힙니다.',
    ja: 'オンライン授業と教室授業の長所と短所を比較し、好む方式を四文で示します。',
    en: 'In four sentences, compare the advantages and disadvantages of online and classroom lessons and state the preferred mode.',
  };
  const grammarPromptV3 = {
    ko: '상황을 계산해 해석한 결론이 되도록 고르세요. 월요일부터 금요일까지 주 5일 동안 하루에 한 시간씩 이동한다면 일주일에 다섯 시간을 길에서 보내___ .',
    ja: '状況を計算して解釈した結論になるよう選んでください。月曜日から金曜日まで週五日、一日に一時間ずつ移動するなら、一週間に五時間を移動に使うことになるという文の空欄「길에서 보내___」に最も適切な表現を選んでください。',
    en: 'Choose the expression presenting the calculated interpretation: if someone travels for one hour a day, five days a week from Monday through Friday, they spend five hours a week traveling; complete 길에서 보내___ .',
  };
  if (JSON.stringify(writingPromptV3) === JSON.stringify(writingV2.prompt)) throw new Error('Writing prompt did not change');
  if (JSON.stringify(writingRubricV3) === JSON.stringify(writingV2.rubric)) throw new Error('Writing rubric did not change');
  if (JSON.stringify(grammarPromptV3) === JSON.stringify(grammarV2.prompt)) throw new Error('Grammar prompt did not change');

  const sourceDerivative = {
    schema_version: 'preview160-source-derivative-v1',
    version: 'preview160-v3-2026-10-12',
    derivation: 'reuse-of-existing-intake-facts',
    reused: true,
    new_http_acquisition: false,
    new_license_research: false,
    old_intake_full_bytes_sha256: OLD_INTAKE_FULL_BYTES_SHA256,
    parent_source_derivative_sha256: V2_SOURCE_SHA256,
    audio_policy: {
      preferred: 'same-language Google browser voice',
      fallback: 'same-language installed browser/device voice',
      allowed_languages: ['ja-*', 'ko-*'],
      r2_pronunciation: 'prohibited',
      actual_playback_validated: false,
    },
  };
  const sourceBytes = serialize(sourceDerivative);
  const sourceSha = sha256(sourceBytes);

  const jlpt = v2.jlpt.map(updateIdentity);
  const topik = v2.topik.map((original) => {
    const item = updateIdentity(original);
    if (item.origin_id === writingOrigin) {
      item.prompt = writingPromptV3;
      item.rubric = writingRubricV3;
    }
    if (item.origin_id === grammarOrigin) item.prompt = grammarPromptV3;
    return item;
  });
  for (const item of [...jlpt, ...topik]) item.source_evidence_hash = sourceSha;

  const draft = {
    schema_version: 'generic-question-bank-v2',
    version: 'preview160-v3-2026-10-12',
    bank_id: 'preview160-v3-2026-10-12',
    bank_version: 'preview160-v3-2026-10-12',
    publication: 'draft-unpublished',
    approvals: [],
    parent_draft_sha256: V2_DRAFT_SHA256,
    source_derivative_sha256: sourceSha,
    jlpt,
    topik,
  };
  const draftBytes = serialize(draft);

  const decisionData = {
    schema_version: 'preview160-v3-correction-decisions-v1',
    version: 'preview160-v3-2026-10-12',
    parent_review_raw_sha256: V2_REVIEW_SHA256,
    parent_review_outcome: { reviewer_a: { approved: 158, rejected: 2, passed: false }, reviewer_b: { approved: 158, rejected: 2, passed: false } },
    corrected_origin_ids: [writingOrigin, grammarOrigin],
    decisions: [
      { origin_id: writingOrigin, defect: 'multilingual-writing-task-rubric-mismatch', resolution: 'align en prompt and ko/ja/en rubric to online versus classroom lessons; no added scoring condition' },
      { origin_id: grammarOrigin, defect: 'unsupported-arithmetic-premise', resolution: 'state Monday through Friday, five days per week, one hour per day in ko/ja/en prompt' },
    ],
    field_change_assertions: { writing_prompt_changed: true, writing_rubric_changed: true, grammar_prompt_changed: true },
    approvals: [],
  };
  const decisionBytes = serialize(decisionData);

  const manifest = {
    schema_version: 'immutable-preview160-manifest-v1',
    version: 'preview160-v3-2026-10-12',
    publication: 'draft-unpublished',
    parent: { draft_sha256: V2_DRAFT_SHA256, source_derivative_sha256: V2_SOURCE_SHA256, review_raw_sha256: V2_REVIEW_SHA256 },
    counts: { total: 160, jlpt_n2: 60, jlpt_n1: 60, topik: 40, corrected: 2 },
    approvals: [],
    files: {
      'source-derivative.json': { bytes: Buffer.byteLength(sourceBytes), sha256: sourceSha },
      'draft.json': { bytes: Buffer.byteLength(draftBytes), sha256: sha256(draftBytes) },
      'correction-decisions.json': { bytes: Buffer.byteLength(decisionBytes), sha256: sha256(decisionBytes) },
    },
  };
  const manifestBytes = serialize(manifest);

  await mkdir(OUTPUT_DIR, { recursive: false });
  await writeExclusive(resolve(OUTPUT_DIR, 'source-derivative.json'), sourceBytes);
  await writeExclusive(resolve(OUTPUT_DIR, 'draft.json'), draftBytes);
  await writeExclusive(resolve(OUTPUT_DIR, 'correction-decisions.json'), decisionBytes);
  await writeExclusive(resolve(OUTPUT_DIR, 'manifest.json'), manifestBytes);
  for (const [name, expected] of Object.entries(manifest.files)) {
    const bytes = await readFile(resolve(OUTPUT_DIR, name));
    if (bytes.byteLength !== expected.bytes || sha256(bytes) !== expected.sha256) throw new Error(`Frozen file mismatch: ${name}`);
  }
  process.stdout.write(serialize({ output_dir: OUTPUT_DIR, ...manifest, manifest: { bytes: Buffer.byteLength(manifestBytes), sha256: sha256(manifestBytes) } }));
}

await main();
