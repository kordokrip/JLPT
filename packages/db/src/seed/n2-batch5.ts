import path from 'node:path';

import { REPO_ROOT } from './constants.js';
import {
  buildSelfAuthoredJlptBatchPlan,
  selfAuthoredJlptBatchContentRowsSql,
  type SelfAuthoredJlptBatchConfig,
} from './self-authored-jlpt-batch.js';

export const N2_BATCH_5_SOURCE_CODE = 'N2-A5';
export const N2_BATCH_5_SOURCE_ASSET_ID = 'source-asset:jlpt-n2-self-authored-batch-5-2026-08-09';
export const N2_BATCH_5_PATH = path.join(REPO_ROOT, 'docs/05_n2/06_self_authored_batch_5.md');
export const N2_BATCH_5_KANJI = ['届', '請', '聴', '妥', '協', '替', '渉', '措', '旨', '免'] as const;

const config: SelfAuthoredJlptBatchConfig = {
  sourceCode: N2_BATCH_5_SOURCE_CODE,
  sourceAssetId: N2_BATCH_5_SOURCE_ASSET_ID,
  title: 'JLPT N2 자체 저작 Batch 5',
  level: 'N2',
  sourcePath: N2_BATCH_5_PATH,
  repositoryUrl: 'https://github.com/kordokrip/JLPT/blob/main/docs/05_n2/06_self_authored_batch_5.md',
  licenseUrl: 'https://github.com/kordokrip/JLPT/blob/main/docs/ATTRIBUTIONS.md#학습-콘텐츠와-provenance',
  referencePrefix: 'jlpt:n2:batch5',
  kanji: N2_BATCH_5_KANJI,
  categories: 5,
  generatedAt: 1786233600,
  sentences: [
    { seqNo: 1, ja: '自治体の窓口で、届出に必要な書式を受け取った。', kana: 'じちたいのまどぐちで、とどけでにひつようなしょしきをうけとった。', ko: '지방자치단체 창구에서 신고에 필요한 서식을 받았다.' },
    { seqNo: 2, ja: '証明書の交付には、本人確認の書類が必要です。', kana: 'しょうめいしょのこうふには、ほんにんかくにんのしょるいがひつようです。', ko: '증명서 발급에는 본인 확인 서류가 필요합니다.' },
    { seqNo: 3, ja: '手数料の免除に該当するか、事前に確認してください。', ko: '수수료 면제에 해당하는지 미리 확인해 주세요.' },
    { seqNo: 4, ja: '公聴会では、賛成と反対の両方の発言を聞いた。', ko: '공청회에서는 찬성과 반대 양쪽의 발언을 들었다.' },
    { seqNo: 5, ja: '多数の意見だけでなく、少数の要望も記録する。', ko: '다수의 의견뿐 아니라 소수의 요구도 기록한다.' },
    { seqNo: 6, ja: '署名を集める前に、提案の趣旨を分かりやすく説明した。', ko: '서명을 모으기 전에 제안의 취지를 알기 쉽게 설명했다.' },
    { seqNo: 7, ja: '二つの案の相違を観点ごとに整理して、結論を急がない。', ko: '두 안의 차이를 관점별로 정리하고 결론을 서두르지 않는다.' },
    { seqNo: 8, ja: '論争を避けるためではなく、理由を確かめるために話し合った。', ko: '논쟁을 피하기 위해서가 아니라 이유를 확인하기 위해 대화했다.' },
    { seqNo: 9, ja: '交渉では、負担の配分と代替案を同時に検討した。', ko: '교섭에서는 부담의 배분과 대안을 동시에 검토했다.' },
    { seqNo: 10, ja: '妥協した内容を、次の会議までに取りまとめる。', ko: '타협한 내용을 다음 회의까지 취합한다.' },
    { seqNo: 11, ja: '混雑を減らす措置として、予約の時間を分けた。', ko: '혼잡을 줄이는 조치로 예약 시간을 나누었다.' },
    { seqNo: 12, ja: '参加者の状況次第で、説明の順番を変えることがある。', ko: '참가자 상황에 따라 설명 순서를 바꾸는 경우가 있다.' },
  ],
  readings: [
    {
      titleJa: '証明書の交付を申し込む',
      genre: 'instruction',
      bodyJa: '自治体の窓口で証明書の交付を申し込む場合は、指定された書式に氏名と住所を記入します。本人以外が手続きをする場合は、委任を受けたことが分かる書類も必要です。手数料の免除に該当する人は、申込みの前に窓口へ相談してください。書類に不足があると、その日のうちに交付できないことがあります。',
      bodyKo: '지방자치단체 창구에서 증명서 발급을 신청할 경우에는 지정된 서식에 이름과 주소를 적습니다. 본인 이외의 사람이 절차를 할 경우에는 위임받았음을 알 수 있는 서류도 필요합니다. 수수료 면제에 해당하는 사람은 신청 전에 창구에 상담해 주세요. 서류가 부족하면 그날 안에 발급하지 못할 수 있습니다.',
      wordCount: 111,
      questions: [
        { questionJa: '本人以外が手続きをする場合、何が必要ですか。', questionKo: '본인 이외의 사람이 절차를 하는 경우 무엇이 필요합니까?', choices: ['위임받았음을 알 수 있는 서류', '새로운 주소', '공청회 참가증', '반대 의견서'], answerIndex: 0, explanationKo: '본문은 본인 외의 사람이 절차를 할 때 위임받았음을 알 수 있는 서류가 필요하다고 합니다.' },
        { questionJa: 'その日のうちに交付できないことがあるのは、どんな場合ですか。', questionKo: '그날 안에 발급하지 못할 수 있는 경우는 언제입니까?', choices: ['서류가 부족할 때', '수수료가 면제될 때', '주소를 적을 때', '본인이 신청할 때'], answerIndex: 0, explanationKo: '서류에 부족한 점이 있으면 그날 안에 발급하지 못할 수 있다고 안내합니다.' },
      ],
    },
    {
      titleJa: '公聴会の意見をまとめる',
      genre: 'report',
      bodyJa: '新しい施設の計画をめぐる公聴会では、賛成する人と反対する人がそれぞれ理由を述べた。多数の意見だけで結論を出さず、少数の要望も観点別に整理することになった。会議の担当者は、集めた発言をもとに二つの代替案を作り、費用と利用しやすさを比べる予定である。',
      bodyKo: '새 시설 계획을 둘러싼 공청회에서는 찬성하는 사람과 반대하는 사람이 각각 이유를 말했다. 다수의 의견만으로 결론을 내리지 않고 소수의 요구도 관점별로 정리하기로 했다. 회의 담당자는 모은 발언을 바탕으로 두 가지 대안을 만들고 비용과 이용하기 쉬운 정도를 비교할 예정이다.',
      wordCount: 108,
      questions: [
        { questionJa: '会議では、なぜ少数の要望も整理することになりましたか。', questionKo: '회의에서는 왜 소수의 요구도 정리하기로 했습니까?', choices: ['다수 의견만으로 결론을 내리지 않기 위해', '시설을 바로 닫기 위해', '수수료를 없애기 위해', '서명만 모으기 위해'], answerIndex: 0, explanationKo: '본문은 다수 의견만으로 결론을 내리지 않기 위해 소수의 요구도 정리한다고 설명합니다.' },
        { questionJa: '担当者は次に何をする予定ですか。', questionKo: '담당자는 다음에 무엇을 할 예정입니까?', choices: ['두 가지 대안을 만들어 비교한다', '공청회를 취소한다', '서류를 발급한다', '의견을 삭제한다'], answerIndex: 0, explanationKo: '담당자는 발언을 바탕으로 두 대안을 만들고 비용과 이용 편의성을 비교할 예정입니다.' },
      ],
    },
    {
      titleJa: '窓口の待ち時間を減らす措置',
      genre: 'notice',
      bodyJa: '窓口の待ち時間を減らすため、来月から予約の時間帯を細かく分けます。この措置は、予約した人だけでなく、当日に相談する人にも利用しやすい環境を作ることが目的です。急な届出や書類の確認が必要な場合は、予約がなくても受付で事情を伝えてください。混雑の状況次第で、案内の順番を変更することがあります。',
      bodyKo: '창구 대기 시간을 줄이기 위해 다음 달부터 예약 시간대를 세분화합니다. 이 조치는 예약한 사람뿐 아니라 당일 상담하는 사람도 이용하기 쉬운 환경을 만드는 것이 목적입니다. 급한 신고나 서류 확인이 필요한 경우에는 예약이 없어도 접수처에 사정을 알려 주세요. 혼잡 상황에 따라 안내 순서를 바꾸는 경우가 있습니다.',
      wordCount: 113,
      questions: [
        { questionJa: '時間帯を細かく分ける目的は何ですか。', questionKo: '시간대를 세분화하는 목적은 무엇입니까?', choices: ['더 이용하기 쉬운 환경을 만들기 위해', '예약을 없애기 위해', '수수료를 올리기 위해', '공청회를 열기 위해'], answerIndex: 0, explanationKo: '시간대를 나누는 목적은 예약자와 당일 상담자 모두가 이용하기 쉬운 환경을 만드는 것입니다.' },
        { questionJa: '予約がなくても受付で事情を伝えられるのは、どんな場合ですか。', questionKo: '예약이 없어도 접수처에 사정을 알릴 수 있는 경우는 언제입니까?', choices: ['급한 신고나 서류 확인이 필요할 때', '반대 의견이 있을 때', '서명만 할 때', '공청회가 끝난 뒤'], answerIndex: 0, explanationKo: '급한 신고나 서류 확인이 필요한 경우에는 예약이 없어도 접수처에 사정을 알리라고 합니다.' },
      ],
    },
  ],
};

export function buildN2Batch5Plan() {
  return buildSelfAuthoredJlptBatchPlan(config);
}

export function n2Batch5ContentRowsSql(): string {
  return selfAuthoredJlptBatchContentRowsSql(config);
}
