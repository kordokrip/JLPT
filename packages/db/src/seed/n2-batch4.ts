import path from 'node:path';

import { REPO_ROOT } from './constants.js';
import {
  buildSelfAuthoredJlptBatchPlan,
  selfAuthoredJlptBatchContentRowsSql,
  type SelfAuthoredJlptBatchConfig,
} from './self-authored-jlpt-batch.js';

export const N2_BATCH_4_SOURCE_CODE = 'N2-A4';
export const N2_BATCH_4_SOURCE_ASSET_ID = 'source-asset:jlpt-n2-self-authored-batch-4-2026-08-03';
export const N2_BATCH_4_PATH = path.join(REPO_ROOT, 'docs/05_n2/05_self_authored_batch_4.md');
export const N2_BATCH_4_KANJI = ['専', '装', '置', '掲', '載', '操', '索', '署', '許'] as const;

const config: SelfAuthoredJlptBatchConfig = {
  sourceCode: N2_BATCH_4_SOURCE_CODE,
  sourceAssetId: N2_BATCH_4_SOURCE_ASSET_ID,
  title: 'JLPT N2 자체 저작 Batch 4',
  level: 'N2',
  sourcePath: N2_BATCH_4_PATH,
  repositoryUrl: 'https://github.com/kordokrip/JLPT/blob/main/docs/05_n2/05_self_authored_batch_4.md',
  licenseUrl: 'https://github.com/kordokrip/JLPT/blob/main/docs/ATTRIBUTIONS.md#학습-콘텐츠와-provenance',
  referencePrefix: 'jlpt:n2:batch4',
  kanji: N2_BATCH_4_KANJI,
  categories: 4,
  generatedAt: 1785715200,
  sentences: [
    { seqNo: 1, ja: '登録を終えたら、利用者に確認のメールが届く。', kana: 'とうろくをおえたら、りようしゃにかくにんのめーるがとどく。', ko: '등록을 마치면 이용자에게 확인 메일이 도착한다.' },
    { seqNo: 2, ja: '端末の設定を更新してから、もう一度接続を試した。', kana: 'たんまつのせっていをこうしんしてから、もういちどせつぞくをためした。', ko: '단말기 설정을 업데이트한 뒤 다시 접속을 시도했다.' },
    { seqNo: 3, ja: '在宅勤務の日は、担当者どうしで予定を共有している。', ko: '재택근무 날에는 담당자끼리 일정을 공유하고 있다.' },
    { seqNo: 4, ja: '締切に応じて、確認の手順を短くした。', ko: '마감에 따라 확인 절차를 짧게 했다.' },
    { seqNo: 5, ja: '利用者が増えるにつれて、問い合わせへの対応も変えた。', ko: '이용자가 늘어남에 따라 문의 대응도 바꾸었다.' },
    { seqNo: 6, ja: '重要なデータは、毎日保存するようにしている。', ko: '중요한 데이터는 매일 저장하도록 하고 있다.' },
    { seqNo: 7, ja: '障害が起きた場合の連絡先は、最初に確認しておく。', ko: '장애가 생긴 경우의 연락처는 처음에 확인해 둔다.' },
    { seqNo: 8, ja: '改善を継続するには、利用者の意見を記録する必要がある。', ko: '개선을 계속하려면 이용자 의견을 기록할 필요가 있다.' },
  ],
  readings: [
    {
      titleJa: 'オンライン申請の手順',
      genre: 'instruction',
      bodyJa: 'オンライン申請を利用する前に、登録したメールアドレスが使えるか確認してください。申請内容は途中で保存できますが、締切時刻を過ぎると更新できません。接続が不安定な場合は、入力した内容を端末に保存してから時間をおいて再開してください。提出後には確認メールが届きます。届かないときは、迷惑メールの設定と登録番号を確認した上で窓口へ連絡します。',
      bodyKo: '온라인 신청을 이용하기 전에 등록한 이메일 주소를 사용할 수 있는지 확인해 주세요. 신청 내용은 중간에 저장할 수 있지만 마감 시각이 지나면 업데이트할 수 없습니다. 접속이 불안정한 경우에는 입력한 내용을 단말기에 저장한 뒤 시간을 두고 다시 시작해 주세요. 제출 후에는 확인 메일이 도착합니다. 도착하지 않으면 스팸 메일 설정과 등록 번호를 확인한 뒤 창구에 연락합니다.',
      wordCount: 116,
      questions: [
        { questionJa: '接続が不安定な場合、最初に何をしますか。', questionKo: '접속이 불안정한 경우 처음에 무엇을 합니까?', choices: ['입력 내용을 단말기에 저장한다', '등록을 삭제한다', '마감을 연장한다', '바로 창구에 간다'], answerIndex: 0, explanationKo: '접속이 불안정하면 먼저 입력한 내용을 단말기에 저장하라고 안내합니다.' },
      ],
    },
    {
      titleJa: '業務改善の提案',
      genre: 'report',
      bodyJa: 'チームでは、問い合わせへの対応に時間がかかることから、手順を見直すことにした。以前は担当者だけが過去の記録を見られたが、必要な範囲で共有する仕組みに変える。すべてを同じ方法で処理するのではなく、利用者の状況に応じて案内を選ぶ方が効率的だと考えたためだ。変更後も毎週課題を確認し、改善を継続する予定である。',
      bodyKo: '팀에서는 문의 대응에 시간이 걸린다는 점에서 절차를 재검토하기로 했다. 이전에는 담당자만 과거 기록을 볼 수 있었지만 필요한 범위에서 공유하는 구조로 바꾼다. 모든 것을 같은 방법으로 처리하는 것이 아니라 이용자 상황에 따라 안내를 고르는 편이 효율적이라고 생각했기 때문이다. 변경 후에도 매주 과제를 확인하고 개선을 계속할 예정이다.',
      wordCount: 110,
      questions: [
        { questionJa: 'チームが手順を見直す理由は何ですか。', questionKo: '팀이 절차를 재검토하는 이유는 무엇입니까?', choices: ['문의 대응에 시간이 걸려서', '이용자가 줄어서', '단말기를 삭제해서', '마감이 없어서'], answerIndex: 0, explanationKo: '문의 대응에 시간이 걸리는 것이 절차 재검토의 근거라고 했습니다.' },
      ],
    },
  ],
};

export function buildN2Batch4Plan() {
  return buildSelfAuthoredJlptBatchPlan(config);
}

export function n2Batch4ContentRowsSql(): string {
  return selfAuthoredJlptBatchContentRowsSql(config);
}
