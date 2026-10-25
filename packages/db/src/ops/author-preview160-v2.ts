import { createHash } from 'node:crypto';
import { mkdir, open, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import {
  JLPT_N1_PRACTICE_BANK_V1,
  JLPT_N2_PRACTICE_BANK_V1,
} from '../seed/jlpt-n2-n1-practice-banks-v1.js';
import { TOPIK_OWNER_BATCH_6 } from '../seed/topik-owner-curriculum-batch6.js';

const OUTPUT_DIR = resolve(dirname(new URL(import.meta.url).pathname), '../content/preview160-v2-2026-10-12');
const OLD_INTAKE_FULL_BYTES_SHA256 = 'ed890daa0e099642a62540cd49fe5803723b755adf066c5486158dd476786201';
const PARENT_REVIEW_SHA256 = {
  a: '3e5cd4765c24c5197e7a1603f62321d267307a7dcb50d89eaa3b267e308b730e',
  b: '94b50cdc1992ab5bf3204b828140f8f1a3d506e3b6cdc72a7c0d5d68311b7d78',
} as const;

type JsonObject = Record<string, unknown>;
type Localized = { ko: string; ja: string; en: string };

const localized = (ko: string, ja: string, en: string): Localized => ({ ko, ja, en });
const sha256 = (bytes: string | Buffer): string => createHash('sha256').update(bytes).digest('hex');
const serialize = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;
const clone = <T>(value: T): T => structuredClone(value);

async function writeExclusive(path: string, bytes: string): Promise<void> {
  const handle = await open(path, 'wx');
  try {
    await handle.writeFile(bytes, 'utf8');
  } finally {
    await handle.close();
  }
}

function patchItem(item: JsonObject): JsonObject {
  const originId = String(item.id);
  const next = clone(item);
  next.origin_id = originId;
  next.id = `preview160-v2-2026-10-12:${originId}`;
  next.bank_version = 'preview160-v2-2026-10-12';
  next.publication = 'draft-unpublished';
  next.approvals = [];
  next.reviews = [];
  next.is_published = 0;
  if ('release_state' in next) next.release_state = 'draft';

  switch (originId) {
    case 'jlpt-n1-practice-v1:grammar_fill:04':
      next.explanation = localized(
        '지금 재계획해도 결과가 바뀌지 않는다는 가정적 양보입니다.',
        '今立て直しても結果は変わらないという仮定的な譲歩です。',
        'Ta tokoro de indicates that even taking the action would not change the result.',
      );
      break;
    case 'jlpt-n1-practice-v1:listening:10':
      next.explanation = localized(
        '평균 처리 시간은 20% 줄었지만 오류 건수의 유의한 변화는 확인되지 않았습니다.',
        '平均処理時間は二割短くなりましたが、誤り件数の有意な変化は確認されませんでした。',
        'Average processing time fell by 20%, while no statistically significant change in errors was established.',
      );
      break;
    case 'topik-owner-batch6-grade3-reading-2': {
      const prompt = next.prompt as Localized;
      next.prompt = { ...prompt, en: 'Notice: The underground bicycle parking area will be closed Monday through Friday next week for ventilation work. During construction, use the temporary bicycle parking area behind the building. Where should users leave their bicycles during construction?' };
      break;
    }
    case 'topik-owner-batch6-grade3-listening-2':
      next.explanation = localized(
        '수정된 수치가 맞는지 한 번 더 확인한 뒤 보고서를 보내야 합니다.',
        '修正した数値が正しいかもう一度確認してから、報告書を送る必要があります。',
        'The employee must check the revised figures once more before sending the report.',
      );
      break;
    case 'topik-owner-batch6-grade3-writing-1':
      next.rubric = localized(
        '이용 가능 시간과 준비물을 각각 묻고, 세 문장과 정중한 이메일 말투를 지킵니다.',
        '利用可能な時間と持ち物をそれぞれ尋ね、三文と丁寧なメール表現を守ります。',
        'Ask about both available hours and required items, using three sentences and polite email language.',
      );
      break;
    case 'topik-owner-batch6-grade3-writing-2':
      next.rubric = localized(
        '생활 습관을 바꾸는 구체적인 방법과 그 이유를 세 문장으로 연결하고 친구에게 알맞은 말투를 사용합니다.',
        '生活習慣を変える具体的な方法とその理由を三文でつなぎ、友達に合う話し方を使います。',
        'Give a specific method for changing the habit and its reason in three sentences, using an appropriate friendly tone.',
      );
      break;
    case 'topik-owner-batch6-grade4-grammar-2': {
      const prompt = next.prompt as Localized;
      next.prompt = {
        ...prompt,
        ko: '두 측면을 대조하도록 고르세요. 온라인 회의는 이동 시간이 줄어드는 ___ 집중하기 어렵다는 의견도 있습니다.',
        ja: '二つの側面を対照するよう選んでください。온라인 회의는 이동 시간이 줄어드는 ___ 집중하기 어렵다는 의견도 있습니다.',
      };
      break;
    }
    case 'topik-owner-batch6-grade4-reading-1': {
      const prompt = next.prompt as Localized;
      next.prompt = { ...prompt, en: 'The city increased shared bicycles near subway stations after complaints about shortages during commuting hours. Bicycles then accumulated in certain areas after work, so the city decided to redistribute them every night using usage records. What will the city newly do?' };
      break;
    }
    case 'topik-owner-batch6-grade4-writing-1':
      next.rubric = localized(
        '공공 앱의 불편한 점 하나와 구체적인 개선 방법 두 가지를 네 문장으로 제안합니다.',
        '公共アプリの不便な点一つと具体的な改善方法二つを四文で提案します。',
        'In four sentences, describe one inconvenience in a public app and propose two specific improvements.',
      );
      break;
    case 'topik-owner-batch6-grade4-writing-2': {
      const prompt = next.prompt as Localized;
      next.prompt = { ...prompt, en: 'In four sentences, compare the advantages and disadvantages of remote and in-person work and state which mode you prefer.' };
      next.rubric = localized(
        '재택근무와 출근 근무의 장점과 단점을 비교하고 선호하는 방식을 네 문장으로 밝힙니다.',
        '在宅勤務と出勤勤務の長所と短所を比較し、好む方式を四文で示します。',
        'In four sentences, compare the advantages and disadvantages of remote and in-person work and state the preferred mode.',
      );
      break;
    }
    case 'topik-owner-batch6-grade5-grammar-2': {
      const prompt = next.prompt as Localized;
      next.prompt = {
        ko: prompt.ko.replace('매일 한 시간씩 이동하면 일주일에 다섯 시간을 길에서 보내___입니다.', '평일마다 한 시간씩 이동하면 일주일에 다섯 시간을 길에서 보내___입니다.'),
        ja: prompt.ja.replace('매일 한 시간씩 이동하면 일주일에 다섯 시간을 길에서 보내___입니다.', '평일마다 한 시간씩 이동하면 일주일에 다섯 시간을 길에서 보내___입니다.'),
        en: prompt.en.replace('매일 한 시간씩 이동하면 일주일에 다섯 시간을 길에서 보내___입니다.', '평일마다 한 시간씩 이동하면 일주일에 다섯 시간을 길에서 보내___입니다.'),
      };
      break;
    }
    case 'topik-owner-batch6-grade5-reading-2': {
      const prompt = next.prompt as Localized;
      next.prompt = { ...prompt, en: 'An organization added detailed procedures to reduce errors, but staff stayed silent when unsure because they feared appearing incapable. Small misunderstandings therefore recurred. The expert says that, rather than adding more procedures, the organization needs a climate that welcomes questions and encourages early sharing of problems. What does the expert emphasize?' };
      break;
    }
    case 'topik-owner-batch6-grade5-writing-1':
      next.rubric = localized(
        '정책을 평가할 지표 두 가지를 제시하고 각 지표가 필요한 이유를 다섯 문장으로 설명합니다.',
        '政策を評価する指標二つを示し、それぞれが必要な理由を五文で説明します。',
        'In five sentences, provide two indicators for evaluating the policy and explain why each matters.',
      );
      break;
    case 'topik-owner-batch6-grade5-writing-2':
      next.rubric = localized(
        '교통 감축과 상점 접근성 양쪽을 고려하여 실행 가능한 해결책을 다섯 문장으로 제안합니다.',
        '交通削減と店舗アクセスの双方を考慮し、実行可能な解決策を五文で提案します。',
        'In five sentences, propose an actionable solution that considers both traffic reduction and merchant access.',
      );
      break;
    case 'topik-owner-batch6-grade6-grammar-2': {
      const prompt = next.prompt as Localized;
      const sentence = '자료를 미리 복사해 두었___ 서버 장애로 회의가 중단될 뻔했습니다.';
      next.prompt = {
        ko: `다행인 조건이 없었다면 나쁜 결과가 생겼을 것이라는 뜻이 되도록 고르세요. ${sentence}`,
        ja: `幸いな条件がなければ悪い結果になった意味になるよう選んでください。${sentence}`,
        en: `Choose the expression meaning a fortunate condition prevented a bad result: ${sentence}`,
      };
      break;
    }
    case 'topik-owner-batch6-grade6-writing-1':
      next.rubric = localized(
        '효율성과 접근성에 관한 근거를 모두 종합하여 온라인 공공서비스의 기본 전환 주장을 여섯 문장으로 평가합니다.',
        '効率性とアクセシビリティに関する根拠をともに統合し、オンライン公共サービスを基本とする主張を六文で評価します。',
        'In six sentences, evaluate the proposed online default by synthesizing evidence about both efficiency and accessibility.',
      );
      break;
    case 'topik-owner-batch6-grade6-writing-2':
      next.rubric = localized(
        '가능한 원인 두 가지, 두 원인을 구분할 자료, 원인에 대응하는 방안을 여섯 문장으로 제시합니다.',
        '考えられる原因二つ、両者を区別する資料、原因に対応する方策を六文で示します。',
        'In six sentences, present two possible causes, data that distinguishes them, and responses matched to the causes.',
      );
      break;
  }
  return next;
}

const CORRECTED_IDS = [
  'jlpt-n1-practice-v1:grammar_fill:04',
  'jlpt-n1-practice-v1:listening:10',
  'topik-owner-batch6-grade3-reading-2',
  'topik-owner-batch6-grade3-listening-2',
  'topik-owner-batch6-grade3-writing-1',
  'topik-owner-batch6-grade3-writing-2',
  'topik-owner-batch6-grade4-grammar-2',
  'topik-owner-batch6-grade4-reading-1',
  'topik-owner-batch6-grade4-writing-1',
  'topik-owner-batch6-grade4-writing-2',
  'topik-owner-batch6-grade5-grammar-2',
  'topik-owner-batch6-grade5-reading-2',
  'topik-owner-batch6-grade5-writing-1',
  'topik-owner-batch6-grade5-writing-2',
  'topik-owner-batch6-grade6-grammar-2',
  'topik-owner-batch6-grade6-writing-1',
  'topik-owner-batch6-grade6-writing-2',
] as const;

async function main(): Promise<void> {
  const originals = [...JLPT_N2_PRACTICE_BANK_V1, ...JLPT_N1_PRACTICE_BANK_V1, ...TOPIK_OWNER_BATCH_6] as unknown as JsonObject[];
  if (originals.length !== 160 || new Set(originals.map((item) => item.id)).size !== 160) throw new Error('Expected 160 unique source items');

  const sourceDerivative = {
    schema_version: 'preview160-source-derivative-v1',
    version: 'preview160-v2-2026-10-12',
    derivation: 'reuse-of-existing-intake-facts',
    reused: true,
    new_http_acquisition: false,
    old_intake_full_bytes_sha256: OLD_INTAKE_FULL_BYTES_SHA256,
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

  const jlpt = originals.slice(0, 120).map(patchItem);
  const topik = originals.slice(120).map(patchItem);
  for (const item of [...jlpt, ...topik]) item.source_evidence_hash = sourceSha;

  const draft = {
    schema_version: 'generic-question-bank-v2',
    version: 'preview160-v2-2026-10-12',
    bank_id: 'preview160-v2-2026-10-12',
    bank_version: 'preview160-v2-2026-10-12',
    publication: 'draft-unpublished',
    approvals: [],
    source_derivative_sha256: sourceSha,
    jlpt,
    topik,
  };
  const draftBytes = serialize(draft);
  const corrected = originals.filter((item) => CORRECTED_IDS.includes(String(item.id) as typeof CORRECTED_IDS[number]));
  if (corrected.length !== 17) throw new Error(`Expected 17 corrected source items, got ${corrected.length}`);

  const correctionLedger = {
    schema_version: 'preview160-correction-ledger-v1',
    version: 'preview160-v2-2026-10-12',
    union_count: CORRECTED_IDS.length,
    corrected_origin_ids: CORRECTED_IDS,
    preserved: ['answer_index', 'choices', 'difficulty', 'non-defective content'],
    approvals: [],
  };
  const ledgerBytes = serialize(correctionLedger);
  const manifest = {
    schema_version: 'immutable-preview160-manifest-v1',
    version: 'preview160-v2-2026-10-12',
    publication: 'draft-unpublished',
    parent_review_raw_sha256: PARENT_REVIEW_SHA256,
    counts: { total: 160, jlpt_n2: 60, jlpt_n1: 60, topik: 40, corrected_union: 17 },
    approvals: [],
    files: {
      'source-derivative.json': { bytes: Buffer.byteLength(sourceBytes), sha256: sourceSha },
      'draft.json': { bytes: Buffer.byteLength(draftBytes), sha256: sha256(draftBytes) },
      'correction-ledger.json': { bytes: Buffer.byteLength(ledgerBytes), sha256: sha256(ledgerBytes) },
    },
  };
  const manifestBytes = serialize(manifest);

  await mkdir(OUTPUT_DIR, { recursive: false });
  await writeExclusive(resolve(OUTPUT_DIR, 'source-derivative.json'), sourceBytes);
  await writeExclusive(resolve(OUTPUT_DIR, 'draft.json'), draftBytes);
  await writeExclusive(resolve(OUTPUT_DIR, 'correction-ledger.json'), ledgerBytes);
  await writeExclusive(resolve(OUTPUT_DIR, 'manifest.json'), manifestBytes);

  for (const [name, expected] of Object.entries(manifest.files)) {
    const bytes = await readFile(resolve(OUTPUT_DIR, name));
    if (bytes.byteLength !== expected.bytes || sha256(bytes) !== expected.sha256) throw new Error(`Frozen file mismatch: ${name}`);
  }
  process.stdout.write(`${serialize({ output_dir: OUTPUT_DIR, ...manifest, manifest: { bytes: Buffer.byteLength(manifestBytes), sha256: sha256(manifestBytes) } })}`);
}

await main();
