import path from 'node:path';

import { REPO_ROOT } from './constants.js';
import {
  buildSelfAuthoredJlptBatchPlan,
  selfAuthoredJlptBatchContentRowsSql,
  type SelfAuthoredJlptBatchConfig,
} from './self-authored-jlpt-batch.js';

export const N1_BATCH_4_SOURCE_CODE = 'N1-A4';
export const N1_BATCH_4_SOURCE_ASSET_ID = 'source-asset:jlpt-n1-self-authored-batch-4-2026-08-09';
export const N1_BATCH_4_PATH = path.join(REPO_ROOT, 'docs/06_n1/04_self_authored_batch_4.md');
export const N1_BATCH_4_KANJI = ['斟', '酌', '醸', '擁', '諭', '漸', '斂', '遡', '衷', '涵'] as const;

const config: SelfAuthoredJlptBatchConfig = {
  sourceCode: N1_BATCH_4_SOURCE_CODE,
  sourceAssetId: N1_BATCH_4_SOURCE_ASSET_ID,
  title: 'JLPT N1 자체 저작 Batch 4',
  level: 'N1',
  sourcePath: N1_BATCH_4_PATH,
  repositoryUrl: 'https://github.com/kordokrip/JLPT/blob/main/docs/06_n1/04_self_authored_batch_4.md',
  licenseUrl: 'https://github.com/kordokrip/JLPT/blob/main/docs/ATTRIBUTIONS.md#학습-콘텐츠와-provenance',
  referencePrefix: 'jlpt:n1:batch4',
  kanji: N1_BATCH_4_KANJI,
  categories: 4,
  generatedAt: 1786233600,
  sentences: [
    { seqNo: 1, ja: '命題を論証するときは、結論より先に前提の範囲を明らかにする。', kana: 'めいだいをろんしょうするときは、けつろんよりさきにぜんていのはんいをあきらかにする。', ko: '명제를 논증할 때는 결론보다 먼저 전제의 범위를 밝힌다.' },
    { seqNo: 2, ja: '批判は相手を退けるためでなく、見落とした視座を見つけるために行う。', kana: 'ひはんはあいてをしりぞけるためでなく、みおとしたしざをみつけるためにおこなう。', ko: '비평은 상대를 물리치기 위해서가 아니라 놓친 관점을 찾기 위해 한다.' },
    { seqNo: 3, ja: '複数の根拠を斟酌しても、その説明が唯一だとは限らない。', ko: '여러 근거를 참작해도 그 설명이 유일하다고 할 수는 없다.' },
    { seqNo: 4, ja: '世論の変化は、一つの出来事だけでなく長期的な連関の中で読む必要がある。', ko: '여론의 변화는 한 사건뿐 아니라 장기적 연관 속에서 읽을 필요가 있다.' },
    { seqNo: 5, ja: '公共性に照らして、少数の意見を記録に残す方法を検討した。', ko: '공공성에 비추어 소수 의견을 기록에 남기는 방법을 검토했다.' },
    { seqNo: 6, ja: '包摂を掲げる制度でも、実際の手続きが排他性を生むことがある。', ko: '포용을 내세운 제도라도 실제 절차가 배타성을 낳는 경우가 있다.' },
    { seqNo: 7, ja: '対立した提案は、討議を経て一つの方向へ収斂し始めた。', ko: '대립한 제안은 토의를 거쳐 하나의 방향으로 수렴하기 시작했다.' },
    { seqNo: 8, ja: '急な改革には及ばないとしても、漸進的な改善には意味がある。', ko: '급격한 개혁에는 미치지 못하더라도 점진적 개선에는 의미가 있다.' },
    { seqNo: 9, ja: '新しい基準を過去に遡及させる場合は、影響を丁寧に説明しなければならない。', ko: '새 기준을 과거에 소급 적용할 경우 영향도 정성껏 설명해야 한다.' },
    { seqNo: 10, ja: '知識を涵養するには、結論だけでなく反駁の過程も読むことが重要だ。', ko: '지식을 함양하려면 결론뿐 아니라 반박 과정도 읽는 것이 중요하다.' },
    { seqNo: 11, ja: '政策の帰趨は、財源と合意形成の両方に左右される。', ko: '정책의 귀추는 재원과 합의 형성 모두에 좌우된다.' },
    { seqNo: 12, ja: '衷心からの謝意は、形式的な言葉だけでは伝わりにくい。', ko: '진심에서 나온 감사는 형식적인 말만으로는 전해지기 어렵다.' },
  ],
  readings: [
    {
      titleJa: '政策評価における視座',
      genre: 'essay',
      bodyJa: '政策を評価する際、あらかじめ定めた数値だけで結論を出すと、制度が誰にどのような影響を与えたかを見失うことがある。数値は重要な手がかりだが、評価の視座そのものを代えるものではない。利用者の記録や少数意見も斟酌し、公共性に照らして何を成果とみなすかを説明する必要がある。異なる結論が出た場合も、直ちに一方を退けるのでなく、前提の違いを確かめることが議論を深める。',
      bodyKo: '정책을 평가할 때 미리 정한 수치만으로 결론을 내리면 제도가 누구에게 어떤 영향을 주었는지 놓칠 수 있다. 수치는 중요한 단서지만 평가 관점 자체를 대신하지는 않는다. 이용자 기록과 소수 의견도 참작하고 공공성에 비추어 무엇을 성과로 볼지 설명해야 한다. 다른 결론이 나와도 곧바로 한쪽을 물리치지 말고 전제의 차이를 확인하는 것이 논의를 깊게 한다.',
      wordCount: 131,
      questions: [
        { questionJa: '筆者が数値だけで結論を出すことの問題として述べているのは何ですか。', questionKo: '글쓴이가 수치만으로 결론을 내리는 문제로 말한 것은 무엇입니까?', choices: ['제도가 누구에게 미친 영향을 놓칠 수 있다', '수치는 기록할 수 없다', '소수 의견은 항상 틀리다', '평가에는 전제가 필요 없다'], answerIndex: 0, explanationKo: '수치만 보면 제도가 누구에게 어떤 영향을 주었는지 놓칠 수 있다고 했습니다.' },
        { questionJa: '異なる結論が出たとき、筆者は何を勧めていますか。', questionKo: '다른 결론이 나왔을 때 글쓴이는 무엇을 권합니까?', choices: ['전제의 차이를 확인한다', '즉시 한쪽을 없앤다', '수치를 모두 버린다', '기록을 공개하지 않는다'], answerIndex: 0, explanationKo: '서로 다른 결론의 전제가 어떻게 다른지 확인해야 한다고 설명합니다.' },
      ],
    },
    {
      titleJa: '合意形成と少数意見',
      genre: 'report',
      bodyJa: '地域の移動支援を見直す会議では、多数の参加者が運行回数を増やす案を支持した。しかし、利用者が少ない地域からは、回数よりも予約方法を分かりやすくしてほしいという意見が出た。担当者は、多数決だけで案を決めず、両方の要望がどの条件に関わるかを整理した。その結果、まず予約の案内を改善し、利用状況を見ながら運行回数を漸進的に調整する方針になった。少数意見を記録したことが、具体的な代替案を作る手がかりになったのである。',
      bodyKo: '지역 이동 지원을 재검토하는 회의에서 다수 참가자는 운행 횟수를 늘리는 안을 지지했다. 그러나 이용자가 적은 지역에서는 횟수보다 예약 방법을 알기 쉽게 해 달라는 의견이 나왔다. 담당자는 다수결만으로 안을 정하지 않고 두 요구가 어떤 조건과 관계되는지 정리했다. 그 결과 먼저 예약 안내를 개선하고 이용 현황을 보면서 운행 횟수를 점진적으로 조정하기로 했다. 소수 의견을 기록한 것이 구체적 대안을 만드는 단서가 되었다.',
      wordCount: 139,
      questions: [
        { questionJa: '担当者が多数決だけで案を決めなかった理由は何ですか。', questionKo: '담당자가 다수결만으로 안을 정하지 않은 이유는 무엇입니까?', choices: ['두 요구의 조건을 함께 정리할 필요가 있었기 때문', '운행을 바로 중지하기 위해서', '소수 의견을 기록하지 않기 위해서', '회의 참석자를 줄이기 위해서'], answerIndex: 0, explanationKo: '다수와 소수의 요구가 어떤 조건에 관계되는지 함께 정리하려고 했습니다.' },
        { questionJa: '最終的に決まった方針は何ですか。', questionKo: '최종적으로 정한 방침은 무엇입니까?', choices: ['예약 안내를 먼저 개선하고 운행 횟수를 점진 조정한다', '운행 횟수만 즉시 늘린다', '예약 제도를 없앤다', '소수 지역 지원을 중지한다'], answerIndex: 0, explanationKo: '예약 안내를 먼저 고치고 이용 현황을 보며 운행 횟수를 점진적으로 조정합니다.' },
      ],
    },
    {
      titleJa: '学術批評の役割',
      genre: 'commentary',
      bodyJa: '学術的な批評は、ある研究の価値を単純に肯定または否定する作業ではない。命題がどの資料に基づき、どこまで論証されているかをたどり、別の解釈が可能かを検討する営みである。反駁が示されたとしても、それは研究全体が無意味になったことを直ちに意味しない。むしろ、主張の適用範囲を限定したり、新たな調査課題を見いだしたりする契機になり得る。批評を通じて論点が明確になれば、知見は相互に連関しながら深められる。',
      bodyKo: '학술 비평은 어떤 연구의 가치를 단순히 긍정하거나 부정하는 작업이 아니다. 명제가 어떤 자료에 근거하고 어디까지 논증되었는지 따라가며 다른 해석이 가능한지 검토하는 활동이다. 반박이 제시되었다고 해서 연구 전체가 곧 무의미해졌다는 뜻은 아니다. 오히려 주장의 적용 범위를 한정하거나 새 조사 과제를 찾는 계기가 될 수 있다. 비평을 통해 논점이 분명해지면 지식은 서로 연관되며 깊어진다.',
      wordCount: 137,
      questions: [
        { questionJa: '筆者によれば、学術的な批評はどのような営みですか。', questionKo: '글쓴이에 따르면 학술 비평은 어떤 활동입니까?', choices: ['근거와 논증 범위를 따라 다른 해석을 검토하는 활동', '연구를 단순히 부정하는 활동', '자료 없이 결론을 정하는 활동', '반박을 숨기는 활동'], answerIndex: 0, explanationKo: '명제의 자료와 논증 범위를 살피고 다른 해석 가능성을 검토하는 일이라고 했습니다.' },
        { questionJa: '反駁が示されたとき、何が起こり得ると述べていますか。', questionKo: '반박이 제시되었을 때 무엇이 일어날 수 있다고 말합니까?', choices: ['주장 범위를 한정하거나 새 조사 과제를 찾는 계기가 된다', '연구가 반드시 무의미해진다', '논점을 기록할 필요가 없어진다', '다른 해석이 불가능해진다'], answerIndex: 0, explanationKo: '반박은 적용 범위를 한정하고 새 조사 과제를 찾는 계기가 될 수 있습니다.' },
      ],
    },
  ],
};

export function buildN1Batch4Plan() {
  return buildSelfAuthoredJlptBatchPlan(config);
}

export function n1Batch4ContentRowsSql(): string {
  return selfAuthoredJlptBatchContentRowsSql(config);
}
