import path from 'node:path';

import { REPO_ROOT } from './constants.js';
import {
  buildSelfAuthoredJlptBatchPlan,
  selfAuthoredJlptBatchContentRowsSql,
  type SelfAuthoredJlptBatchConfig,
} from './self-authored-jlpt-batch.js';

export const N1_BATCH_3_SOURCE_CODE = 'N1-A3';
export const N1_BATCH_3_SOURCE_ASSET_ID = 'source-asset:jlpt-n1-self-authored-batch-3-2026-08-03';
export const N1_BATCH_3_PATH = path.join(REPO_ROOT, 'docs/06_n1/03_self_authored_batch_3.md');
export const N1_BATCH_3_KANJI = ['枠', '概', '随', '伴', '幣', '赴', '隷', '繕', '該'] as const;

const config: SelfAuthoredJlptBatchConfig = {
  sourceCode: N1_BATCH_3_SOURCE_CODE,
  sourceAssetId: N1_BATCH_3_SOURCE_ASSET_ID,
  title: 'JLPT N1 자체 저작 Batch 3',
  level: 'N1',
  sourcePath: N1_BATCH_3_PATH,
  repositoryUrl: 'https://github.com/kordokrip/JLPT/blob/main/docs/06_n1/03_self_authored_batch_3.md',
  licenseUrl: 'https://github.com/kordokrip/JLPT/blob/main/docs/ATTRIBUTIONS.md#학습-콘텐츠와-provenance',
  referencePrefix: 'jlpt:n1:batch3',
  kanji: N1_BATCH_3_KANJI,
  categories: 4,
  generatedAt: 1785715200,
  sentences: [
    { seqNo: 1, ja: '議論の論点と前提を分けて整理する必要がある。', kana: 'ぎろんのろんてんとぜんていをわけてせいりするひつようがある。', ko: '논의의 논점과 전제를 나누어 정리할 필요가 있다.' },
    { seqNo: 2, ja: '根拠の乏しい見解をそのまま施策に反映するわけにはいかない。', kana: 'こんきょのとぼしいけんかいをそのまましさくにはんえいするわけにはいかない。', ko: '근거가 빈약한 견해를 그대로 시책에 반영할 수는 없다.' },
    { seqNo: 3, ja: '反論を踏まえても、結論の妥当性は検証し続けるべきだ。', ko: '반론을 바탕으로 해도 결론의 타당성은 계속 검증해야 한다.' },
    { seqNo: 4, ja: '制度の慣行と実際の利用者の状況には乖離がある。', ko: '제도의 관행과 실제 이용자 상황에는 괴리가 있다.' },
    { seqNo: 5, ja: '規制の施行は、格差を広げないよう配慮して進められた。', ko: '규제 시행은 격차를 넓히지 않도록 배려하여 진행되었다.' },
    { seqNo: 6, ja: '緻密な記録の蓄積が、顕著な変化を見つける手がかりになる。', ko: '치밀한 기록의 축적이 현저한 변화를 찾는 단서가 된다.' },
    { seqNo: 7, ja: '一つの判断が別の問題を誘発することも想定しておく。', ko: '하나의 판단이 다른 문제를 유발하는 경우도 예상해 둔다.' },
    { seqNo: 8, ja: '混乱の収拾を余儀なくされても、論旨を見失ってはならない。', ko: '혼란 수습을 부득이하게 하게 되어도 논지를 잃어서는 안 된다.' },
  ],
  readings: [
    {
      titleJa: '制度評価の前提',
      genre: 'essay',
      bodyJa: '制度を評価するとき、数字が改善したかどうかだけを見ればよいわけではない。どの利用者を対象にし、何を成果とみなすかという前提によって、同じ記録でも見解は異なる。したがって、結論を急ぐ前に、論点と根拠の脈絡を明らかにする必要がある。反論が出たことは失敗の証拠ではなく、検証すべき条件が見えたことを意味する場合もある。',
      bodyKo: '제도를 평가할 때 수치가 개선되었는지만 보면 되는 것은 아니다. 어떤 이용자를 대상으로 하고 무엇을 성과로 볼 것인가 하는 전제에 따라 같은 기록도 견해가 달라진다. 따라서 결론을 서두르기 전에 논점과 근거의 맥락을 밝혀야 한다. 반론이 나온 것은 실패 증거가 아니라 검증해야 할 조건이 보였다는 뜻일 수도 있다.',
      wordCount: 121,
      questions: [
        { questionJa: '筆者が結論を急ぐ前に必要だと述べていることは何ですか。', questionKo: '글쓴이가 결론을 서두르기 전에 필요하다고 말한 것은 무엇입니까?', choices: ['논점과 근거의 맥락을 밝히는 것', '반론을 없애는 것', '숫자만 보는 것', '기록을 삭제하는 것'], answerIndex: 0, explanationKo: '결론 전 논점과 근거의 맥락을 명확히 해야 한다고 했습니다.' },
      ],
    },
    {
      titleJa: '地域差への配慮',
      genre: 'report',
      bodyJa: '全国共通の基準を施行した後、一部の地域で利用が大きく減った。調査の結果、手続きが複雑なことに加え、案内が地域の慣行に合っていないことが分かった。担当者は、基準そのものを否定するのではなく、地域ごとの事情を踏まえて説明方法を変える提案をした。画一的な運用を抑制しながら、公平さを保つことが狙いである。',
      bodyKo: '전국 공통 기준을 시행한 뒤 일부 지역에서 이용이 크게 줄었다. 조사 결과 절차가 복잡한 데 더해 안내가 지역 관행에 맞지 않는 것으로 밝혀졌다. 담당자는 기준 자체를 부정하는 것이 아니라 지역별 사정을 바탕으로 설명 방식을 바꾸는 제안을 했다. 획일적인 운영을 억제하면서 공정성을 지키는 것이 목적이다.',
      wordCount: 117,
      questions: [
        { questionJa: '担当者の提案の狙いは何ですか。', questionKo: '담당자의 제안 목적은 무엇입니까?', choices: ['획일성을 줄이며 공정성을 지키는 것', '기준을 모두 없애는 것', '조사를 중지하는 것', '이용을 줄이는 것'], answerIndex: 0, explanationKo: '지역별 설명 방식으로 획일성을 억제하면서 공정성을 지키려는 제안입니다.' },
      ],
    },
  ],
};

export function buildN1Batch3Plan() {
  return buildSelfAuthoredJlptBatchPlan(config);
}

export function n1Batch3ContentRowsSql(): string {
  return selfAuthoredJlptBatchContentRowsSql(config);
}
