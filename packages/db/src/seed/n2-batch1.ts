import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { REPO_ROOT } from './constants.js';
import { parseGrammar } from './parse-grammar.js';
import { parseKanji } from './parse-kanji.js';
import { parseVocab } from './parse-vocab.js';
import { esc, escJson } from './utils.js';

/**
 * First operating, self-authored N2 content batch.  This is intentionally
 * separate from the small N2 local fixture: the fixture remains a contract
 * test and cannot overwrite this batch's source rows or stable references.
 */
export const N2_BATCH_1_SOURCE_CODE = 'N2-A1';
export const N2_BATCH_1_SOURCE_ASSET_ID = 'source-asset:jlpt-n2-self-authored-batch-1-2026-07-29';
export const N2_BATCH_1_PATH = path.join(REPO_ROOT, 'docs/05_n2/02_self_authored_batch_1.md');
export const N2_BATCH_1_LICENSE_ID = 'LicenseRef-nihongo-n3-self-authored';
export const N2_BATCH_1_REPOSITORY_URL = 'https://github.com/kordokrip/JLPT/blob/main/docs/05_n2/02_self_authored_batch_1.md';
export const N2_BATCH_1_LICENSE_URL = 'https://github.com/kordokrip/JLPT/blob/main/docs/ATTRIBUTIONS.md#학습-콘텐츠와-provenance';
export const N2_BATCH_1_KANJI = [
  '並', '層', '幅', '割', '供', '含', '扱', '率', '測', '著', '刊', '裁',
  '略', '査', '統', '省', '構', '限', '編', '輸', '拠', '展', '処', '基',
  '準', '源', '件', '設', '障', '築',
] as const;

const AUDIO_PREPARING_REASON = 'No licensed human recording or validated TTS pilot exists yet for this self-authored N2 Batch 1 item.';

interface SentenceSeed {
  seqNo: number;
  ja: string;
  kana?: string;
  ko: string;
}

interface ReadingQuestionSeed {
  questionJa: string;
  questionKo: string;
  choices: readonly string[];
  answerIndex: number;
  explanationKo: string;
}

interface ReadingSeed {
  titleJa: string;
  genre: string;
  bodyJa: string;
  bodyKo: string;
  wordCount: number;
  questions: readonly ReadingQuestionSeed[];
}

const SENTENCES: readonly SentenceSeed[] = [
  { seqNo: 1, ja: '会議の前に、参加者へ変更した手順を連絡した。', kana: 'かいぎのまえに、さんかしゃへへんこうしたてじゅんをれんらくした。', ko: '회의 전에 참가자에게 변경한 절차를 연락했다.' },
  { seqNo: 2, ja: '締め切りまでに必要な書類をそろえて、受付へ提出してください。', kana: 'しめきりまでにひつようなしょるいをそろえて、うけつけへていしゅつしてください。', ko: '마감까지 필요한 서류를 갖추어 접수처에 제출해 주세요.' },
  { seqNo: 3, ja: '利用者の意見をもとに、案内の表現を改善した。', kana: 'りようしゃのいけんをもとに、あんないのひょうげんをかいぜんした。', ko: '이용자의 의견을 바탕으로 안내 표현을 개선했다.' },
  { seqNo: 4, ja: '予定が重なったため、担当者どうしで時間を調整した。', kana: 'よていがかさなったため、たんとうしゃどうしでじかんをちょうせいした。', ko: '일정이 겹쳐서 담당자끼리 시간을 조정했다.' },
  { seqNo: 5, ja: '新しい方針が決まるまで、現在の方法を継続する。', kana: 'あたらしいほうしんがきまるまで、げんざいのほうほうをけいぞくする。', ko: '새 방침이 정해질 때까지 현재 방법을 계속한다.' },
  { seqNo: 6, ja: '混雑を避けるため、午後の予約を午前に変更した。', kana: 'こんざつをさけるため、ごごのよやくをごぜんにへんこうした。', ko: '혼잡을 피하기 위해 오후 예약을 오전으로 변경했다.' },
  { seqNo: 7, ja: '報告の内容に誤解がないか、もう一度確認しよう。', kana: 'ほうこくのないようにごかいがないか、もういちどかくにんしよう。', ko: '보고 내용에 오해가 없는지 한 번 더 확인하자.' },
  { seqNo: 8, ja: '予算の減少は、サービスの利用時間に影響する。', kana: 'よさんのげんしょうは、さーびすのりようじかんにえいきょうする。', ko: '예산 감소는 서비스 이용 시간에 영향을 준다.' },
  { seqNo: 9, ja: '提案の目的と期待される結果を説明してください。', kana: 'ていあんのもくてきときたいされるけっかをせつめいしてください。', ko: '제안의 목적과 기대되는 결과를 설명해 주세요.' },
  { seqNo: 10, ja: '相談したおかげで、課題の優先順位がはっきりした。', kana: 'そうだんしたおかげで、かだいのゆうせんじゅんいがはっきりした。', ko: '상의한 덕분에 과제의 우선순위가 분명해졌다.' },
  { seqNo: 11, ja: '大雨のため、屋外の案内会は中止になった。', kana: 'おおあめのため、おくがいのあんないかいはちゅうしになった。', ko: '폭우 때문에 야외 안내회는 중지되었다.' },
  { seqNo: 12, ja: '可能性を比較してから、最も効率のよい方法を選んだ。', kana: 'かのうせいをひかくしてから、もっともこうりつのよいほうほうをえらんだ。', ko: '가능성을 비교한 뒤 가장 효율적인 방법을 골랐다.' },
  { seqNo: 13, ja: '調査の対象を決める前に、必要な条件を整理した。', ko: '조사 대상을 정하기 전에 필요한 조건을 정리했다.' },
  { seqNo: 14, ja: '資料の数字だけでなく、利用者の声も判断の根拠にした。', ko: '자료의 숫자뿐 아니라 이용자의 의견도 판단의 근거로 삼았다.' },
  { seqNo: 15, ja: '設備の点検は、営業時間が終わってから行う予定だ。', ko: '설비 점검은 영업 시간이 끝난 뒤에 할 예정이다.' },
  { seqNo: 16, ja: '限られた予算の中で、優先する作業を協議した。', ko: '한정된 예산 안에서 우선할 작업을 협의했다.' },
  { seqNo: 17, ja: '小さな故障でも、記録を残して担当者に通知する。', ko: '작은 고장이라도 기록을 남겨 담당자에게 통지한다.' },
  { seqNo: 18, ja: '避難の案内は、経験の長さにかかわらず全員に伝える。', ko: '피난 안내는 경험 기간과 관계없이 모두에게 전달한다.' },
  { seqNo: 19, ja: '利用者が多い時間帯は、予備の窓口を開くことにした。', ko: '이용자가 많은 시간대에는 예비 창구를 열기로 했다.' },
  { seqNo: 20, ja: '変更の理由を省略すると、かえって誤解を招きかねない。', ko: '변경 이유를 생략하면 오히려 오해를 불러일으킬 수 있다.' },
  { seqNo: 21, ja: '新しい制度の説明は、地域の住民にも分かる言葉で書く。', ko: '새 제도의 설명은 지역 주민도 알 수 있는 말로 쓴다.' },
  { seqNo: 22, ja: '分析の結果、予約の方法を見直す必要があると分かった。', ko: '분석 결과 예약 방식을 재검토할 필요가 있다고 알게 되었다.' },
  { seqNo: 23, ja: '公平な基準を作るため、複数の意見を比較した。', ko: '공평한 기준을 만들기 위해 여러 의견을 비교했다.' },
  { seqNo: 24, ja: '作業の進み方は安定しつつあるが、確認は続ける。', ko: '작업 진행은 안정되어 가고 있지만 확인은 계속한다.' },
  { seqNo: 25, ja: '担当を交代する場合は、記録を次の人へ共有してください。', ko: '담당을 교체하는 경우에는 기록을 다음 사람에게 공유해 주세요.' },
  { seqNo: 26, ja: '受付の表示を大きくしただけに、質問の数が減った。', ko: '접수 표시를 크게 했기 때문에 질문 수가 줄었다.' },
  { seqNo: 27, ja: '十分な根拠がないまま、結論を急ぐことはない。', ko: '충분한 근거 없이 결론을 서두를 필요는 없다.' },
  { seqNo: 28, ja: 'この費用は、来月の運営に必要な一部にすぎない。', ko: '이 비용은 다음 달 운영에 필요한 일부에 지나지 않는다.' },
  { seqNo: 29, ja: '利用時間を延長すれば、すべての問題が解決するとは限らない。', ko: '이용 시간을 연장한다고 해서 모든 문제가 해결되는 것은 아니다.' },
  { seqNo: 30, ja: '案内の順番を変えたものだから、最初は戸惑う人もいた。', ko: '안내 순서를 바꿨기 때문에 처음에는 당황하는 사람도 있었다.' },
  { seqNo: 31, ja: '専門的な資料は、要点を編集してから公開する。', ko: '전문적인 자료는 요점을 편집한 뒤 공개한다.' },
  { seqNo: 32, ja: '地域ごとの違いを考慮して、支援の範囲を決めた。', ko: '지역별 차이를 고려하여 지원 범위를 정했다.' },
  { seqNo: 33, ja: '利用者の安全を守るため、必要な対策を選んだ。', ko: '이용자의 안전을 지키기 위해 필요한 대책을 골랐다.' },
  { seqNo: 34, ja: '被害が広がる前に、緊急の連絡網を確認した。', ko: '피해가 커지기 전에 긴급 연락망을 확인했다.' },
  { seqNo: 35, ja: '資料を発行する日までに、表現の正確さを確かめる。', ko: '자료를 발행하는 날까지 표현의 정확성을 확인한다.' },
  { seqNo: 36, ja: '住民からの提案を受けて、歩道の案内を改善した。', ko: '주민의 제안을 받아 보도의 안내를 개선했다.' },
  { seqNo: 37, ja: '資源を無駄にしないよう、印刷の部数を減らした。', ko: '자원을 낭비하지 않도록 인쇄 부수를 줄였다.' },
  { seqNo: 38, ja: 'この記載だけでは、申請の条件を判断できない。', ko: '이 기재만으로는 신청 조건을 판단할 수 없다.' },
  { seqNo: 39, ja: '輸送が遅れた場合の対応策も、あらかじめ準備しておく。', ko: '운송이 지연된 경우의 대응책도 미리 준비해 둔다.' },
  { seqNo: 40, ja: '会議では、費用と効果の両方を評価することになっている。', ko: '회의에서는 비용과 효과 양쪽을 평가하기로 되어 있다.' },
  { seqNo: 41, ja: '新しい手順を採用するかどうかは、来週までに決定する。', ko: '새 절차를 채택할지 여부는 다음 주까지 결정한다.' },
  { seqNo: 42, ja: '障害の原因を調査したところ、設定の一部に誤りがあった。', ko: '장애 원인을 조사한 결과 설정 일부에 오류가 있었다.' },
  { seqNo: 43, ja: '複数の案を検討した結果、利用しやすい形に絞り込んだ。', ko: '여러 안을 검토한 결과 이용하기 쉬운 형태로 압축했다.' },
  { seqNo: 44, ja: '情報を共有していれば、同じ作業を繰り返すわけがない。', ko: '정보를 공유하고 있다면 같은 작업을 반복할 리가 없다.' },
  { seqNo: 45, ja: '一度の測定だけで、長期の傾向を決めつけてはいけない。', ko: '한 번의 측정만으로 장기 경향을 단정해서는 안 된다.' },
  { seqNo: 46, ja: '説明会の参加者には、資料を事前に提供する。', ko: '설명회 참가자에게는 자료를 사전에 제공한다.' },
  { seqNo: 47, ja: '利用者の依頼を受けたら、処理の期限を最初に伝える。', ko: '이용자의 의뢰를 받으면 처리 기한을 먼저 알린다.' },
  { seqNo: 48, ja: '環境が変化しても、基本的な安全基準は維持する。', ko: '환경이 변해도 기본적인 안전 기준은 유지한다.' },
  { seqNo: 49, ja: 'この案内は、初めて利用する人を対象に編集した。', ko: '이 안내는 처음 이용하는 사람을 대상으로 편집했다.' },
  { seqNo: 50, ja: '制度を拡大する前に、小さな地域で効果を測定する。', ko: '제도를 확대하기 전에 작은 지역에서 효과를 측정한다.' },
  { seqNo: 51, ja: '予算を縮小しても、必要な支援まで減らすわけではない。', ko: '예산을 축소해도 필요한 지원까지 줄이는 것은 아니다.' },
  { seqNo: 52, ja: '新しい設備を設けるには、管理する人材も必要になる。', ko: '새 설비를 마련하려면 관리할 인력도 필요하게 된다.' },
  { seqNo: 53, ja: '記録の形式を統一すると、後から比較しやすくなる。', ko: '기록 형식을 통일하면 나중에 비교하기 쉬워진다.' },
  { seqNo: 54, ja: '問題の範囲が広いだけに、すぐに結論は出せない。', ko: '문제 범위가 넓기 때문에 곧바로 결론을 낼 수 없다.' },
  { seqNo: 55, ja: '丁寧に説明したおかげで、利用者の不安が和らいだ。', ko: '정중하게 설명한 덕분에 이용자의 불안이 누그러졌다.' },
  { seqNo: 56, ja: '判断に迷ったときは、過去の記録を根拠として参照する。', ko: '판단에 망설일 때는 과거 기록을 근거로 참고한다.' },
  { seqNo: 57, ja: '大きな変更に伴って、案内板の位置も見直した。', ko: '큰 변경에 따라 안내판 위치도 재검토했다.' },
  { seqNo: 58, ja: '提出された資料に不足があれば、追加の説明を依頼する。', ko: '제출된 자료에 부족한 점이 있으면 추가 설명을 의뢰한다.' },
  { seqNo: 59, ja: '複雑な条件は、図を使って分かりやすく伝達した。', ko: '복잡한 조건은 그림을 사용해 알기 쉽게 전달했다.' },
  { seqNo: 60, ja: '一部の意見だけで、全体の傾向を推測してはいけない。', ko: '일부 의견만으로 전체 경향을 추측해서는 안 된다.' },
  { seqNo: 61, ja: '利用方法を掲載したページは、毎月内容を確認する。', ko: '이용 방법을 게재한 페이지는 매달 내용을 확인한다.' },
  { seqNo: 62, ja: '急な変更でも、理由を知らせれば納得してもらいやすい。', ko: '갑작스러운 변경이라도 이유를 알리면 납득을 얻기 쉽다.' },
  { seqNo: 63, ja: '回復に時間がかかるものの、サービスは少しずつ再開している。', ko: '회복에 시간이 걸리기는 하지만 서비스는 조금씩 재개하고 있다.' },
  { seqNo: 64, ja: '担当者が不在の場合は、別の窓口が対応することになっている。', ko: '담당자가 부재인 경우에는 다른 창구가 대응하기로 되어 있다.' },
  { seqNo: 65, ja: '地域の事情に基づいて、支援の内容を選択した。', ko: '지역 사정에 근거하여 지원 내용을 선택했다.' },
  { seqNo: 66, ja: '作業を始める前に、必要な資源がそろっているか確認する。', ko: '작업을 시작하기 전에 필요한 자원이 갖추어져 있는지 확인한다.' },
  { seqNo: 67, ja: '利用者の年齢にかかわらず、同じ案内を受け取れる。', ko: '이용자의 나이와 관계없이 같은 안내를 받을 수 있다.' },
  { seqNo: 68, ja: 'この数字は将来の結果を示すものではなく、現在の記録にすぎない。', ko: '이 숫자는 미래 결과를 나타내는 것이 아니라 현재 기록에 지나지 않는다.' },
  { seqNo: 69, ja: '説明が不足していたせいで、手続きを途中でやめた人がいた。', ko: '설명이 부족했던 탓에 절차를 중간에 그만둔 사람이 있었다.' },
  { seqNo: 70, ja: '変更点を通知したとたんに、問い合わせが増えた。', ko: '변경점을 통지하자마자 문의가 늘었다.' },
  { seqNo: 71, ja: '混雑が落ち着いているうちに、受付の配置を調整した。', ko: '혼잡이 가라앉아 있는 동안 접수 배치를 조정했다.' },
  { seqNo: 72, ja: '作業の順番を構成し直すことで、待ち時間を短くした。', ko: '작업 순서를 다시 구성하여 대기 시간을 줄였다.' },
  { seqNo: 73, ja: '評価の基準を公開すれば、判断の過程も理解されやすい。', ko: '평가 기준을 공개하면 판단 과정도 이해받기 쉽다.' },
  { seqNo: 74, ja: '支援の効果は、短い期間だけでは測れないことがある。', ko: '지원 효과는 짧은 기간만으로는 측정할 수 없는 경우가 있다.' },
  { seqNo: 75, ja: 'この手順を守らなければ、安全な運営はできない。', ko: '이 절차를 지키지 않으면 안전한 운영은 할 수 없다.' },
  { seqNo: 76, ja: '資料の一部を省略したため、補足の説明を加えた。', ko: '자료 일부를 생략했기 때문에 보충 설명을 덧붙였다.' },
  { seqNo: 77, ja: '新しい案内は、利用者の行動を観察してから改善する。', ko: '새 안내는 이용자의 행동을 관찰한 뒤 개선한다.' },
  { seqNo: 78, ja: '意見が分かれたので、結論を出す前にもう一度協議した。', ko: '의견이 갈렸기 때문에 결론을 내기 전에 한 번 더 협의했다.' },
  { seqNo: 79, ja: '必要な承認を得てから、計画を次の段階へ進める。', ko: '필요한 승인을 얻은 뒤 계획을 다음 단계로 진행한다.' },
  { seqNo: 80, ja: '利用者にとって負担が少ない方法を、最後まで検討した。', ko: '이용자에게 부담이 적은 방법을 끝까지 검토했다.' },
];

const READINGS: readonly ReadingSeed[] = [
  {
    titleJa: '窓口の利用時間',
    genre: 'notice',
    bodyJa: '市民センターの窓口は、来月から平日の利用時間を一時間延長します。ただし、申請の受付は午後六時までです。書類に不足がある場合は、その日のうちに手続きが終わらないことがあります。事前に必要な書類を案内で確認してから来てください。',
    bodyKo: '시민센터 창구는 다음 달부터 평일 이용 시간을 한 시간 연장합니다. 단, 신청 접수는 오후 6시까지입니다. 서류가 부족한 경우에는 그날 절차가 끝나지 않을 수 있습니다. 미리 필요한 서류를 안내에서 확인한 뒤 와 주세요.',
    wordCount: 71,
    questions: [
      { questionJa: '申請の受付は何時までですか。', questionKo: '신청 접수는 몇 시까지입니까?', choices: ['오후 다섯 시', '오후 여섯 시', '오후 일곱 시', '평일 자정'], answerIndex: 1, explanationKo: '지문에서 신청 접수는 오후 6시까지라고 안내합니다.' },
      { questionJa: '手続きがその日に終わらない可能性があるのはどんな場合ですか。', questionKo: '절차가 그날 끝나지 않을 가능성이 있는 것은 어떤 경우입니까?', choices: ['창구가 너무 한가한 경우', '서류에 부족한 것이 있는 경우', '이용 시간이 연장된 경우', '평일에 방문한 경우'], answerIndex: 1, explanationKo: '서류에 부족한 것이 있으면 그날 안에 절차가 끝나지 않을 수 있다고 했습니다.' },
    ],
  },
  {
    titleJa: '研修資料の準備',
    genre: 'workplace',
    bodyJa: '来週の研修では、新しい受付手順を説明します。担当者は金曜日までに資料を確認し、分かりにくい表現があれば提案してください。資料の内容を一度に大きく変更するわけではありません。利用者から多い質問を優先して、少しずつ改善する方針です。',
    bodyKo: '다음 주 연수에서는 새로운 접수 절차를 설명합니다. 담당자는 금요일까지 자료를 확인하고, 이해하기 어려운 표현이 있으면 제안해 주세요. 자료 내용을 한 번에 크게 변경하는 것은 아닙니다. 이용자에게서 많이 나오는 질문을 우선하여 조금씩 개선하는 방침입니다.',
    wordCount: 74,
    questions: [
      { questionJa: '担当者は金曜日までに何をしますか。', questionKo: '담당자는 금요일까지 무엇을 합니까?', choices: ['새 창구를 만든다', '자료를 확인하고 제안한다', '연수를 중지한다', '이용 시간을 연장한다'], answerIndex: 1, explanationKo: '담당자는 자료를 확인하고 어려운 표현이 있으면 제안해야 합니다.' },
      { questionJa: '資料を改善する方針として正しいものはどれですか。', questionKo: '자료를 개선하는 방침으로 옳은 것은 무엇입니까?', choices: ['모든 내용을 즉시 크게 바꾼다', '질문이 적은 부분부터 바꾼다', '많이 묻는 질문을 우선해 조금씩 개선한다', '자료를 더 이상 사용하지 않는다'], answerIndex: 2, explanationKo: '지문은 많이 나오는 질문을 우선하여 조금씩 개선한다고 설명합니다.' },
    ],
  },
  {
    titleJa: '図書館の予約変更',
    genre: 'email',
    bodyJa: '予約していた学習室の時間を変更したい場合は、利用日の前日までに連絡してください。当日の変更は、ほかの利用者の予定に影響するため、受け付けられないことがあります。急な事情で来られなくなったときも、できるだけ早く連絡をお願いします。',
    bodyKo: '예약한 학습실 시간을 변경하고 싶은 경우에는 이용일 전날까지 연락해 주세요. 당일 변경은 다른 이용자의 일정에 영향을 주므로 접수하지 못할 수 있습니다. 급한 사정으로 올 수 없게 된 경우에도 가능한 한 빨리 연락해 주세요.',
    wordCount: 68,
    questions: [
      { questionJa: '学習室の時間を変更したい人は、いつまでに連絡しますか。', questionKo: '학습실 시간을 변경하려는 사람은 언제까지 연락합니까?', choices: ['이용일 전날까지', '이용 당일 저녁까지', '다음 주까지', '예약 직후에만'], answerIndex: 0, explanationKo: '시간 변경은 이용일 전날까지 연락해야 한다고 했습니다.' },
      { questionJa: '当日の変更が受け付けられないことがある理由は何ですか。', questionKo: '당일 변경을 접수하지 못할 수 있는 이유는 무엇입니까?', choices: ['학습실이 너무 넓어서', '직원이 없어서', '다른 이용자의 일정에 영향을 주어서', '예약이 무료여서'], answerIndex: 2, explanationKo: '당일 변경은 다른 이용자의 예정에 영향을 준다고 설명합니다.' },
    ],
  },
  {
    titleJa: '小さな改善提案',
    genre: 'opinion',
    bodyJa: '駅の案内表示について、利用者から「出口の番号が見つけにくい」という意見が出ている。表示を全部作り直すには時間と費用がかかるものの、混雑する時間帯だけでも大きな文字の案内を追加することはできる。この方法なら、まず効果を確認してから次の変更を判断できる。',
    bodyKo: '역 안내 표시에 대해 이용자로부터 "출구 번호를 찾기 어렵다"는 의견이 나오고 있다. 표시를 전부 새로 만들려면 시간과 비용이 들지만, 혼잡한 시간대만이라도 큰 글자의 안내를 추가할 수는 있다. 이 방법이라면 먼저 효과를 확인한 뒤 다음 변경을 판단할 수 있다.',
    wordCount: 75,
    questions: [
      { questionJa: '利用者の意見は何についてですか。', questionKo: '이용자의 의견은 무엇에 관한 것입니까?', choices: ['출구 번호를 찾기 어렵다', '역 이용 시간이 너무 짧다', '직원이 너무 많다', '예약 방법이 복잡하다'], answerIndex: 0, explanationKo: '이용자는 출구 번호를 찾기 어렵다고 말했습니다.' },
      { questionJa: '筆者が提案している最初の改善は何ですか。', questionKo: '필자가 제안하는 첫 개선은 무엇입니까?', choices: ['모든 표시를 즉시 새로 만든다', '큰 글자의 안내를 혼잡 시간대에 추가한다', '역을 닫는다', '출구 번호를 없앤다'], answerIndex: 1, explanationKo: '전면 교체 전에 혼잡 시간대에 큰 글자 안내를 추가하자는 제안입니다.' },
    ],
  },
  {
    titleJa: '地域調査のお知らせ',
    genre: 'notice',
    bodyJa: '市では、公共施設の利用方法について短い調査を行います。対象は今月施設を利用した人で、回答は五分ほどで終わります。個人の名前を集めることはありません。集まった意見は、来年度の案内を改善するための参考として使います。回答の期限は今月二十五日です。',
    bodyKo: '시에서는 공공시설 이용 방법에 관해 짧은 조사를 실시합니다. 대상은 이번 달 시설을 이용한 사람이며 답변은 약 5분이면 끝납니다. 개인 이름을 수집하지는 않습니다. 모인 의견은 다음 연도 안내를 개선하기 위한 참고로 사용합니다. 답변 기한은 이번 달 25일입니다.',
    wordCount: 82,
    questions: [
      { questionJa: '調査の対象は誰ですか。', questionKo: '조사의 대상은 누구입니까?', choices: ['이번 달 시설을 이용한 사람', '시설 직원만', '모든 학생', '다음 달 방문 예정자'], answerIndex: 0, explanationKo: '지문은 이번 달에 시설을 이용한 사람을 대상으로 한다고 설명합니다.' },
      { questionJa: '集まった意見は何のために使われますか。', questionKo: '모인 의견은 무엇을 위해 사용됩니까?', choices: ['개인 이름을 공개하기 위해', '다음 연도 안내를 개선하기 위해', '시설 이용료를 올리기 위해', '조사를 즉시 끝내기 위해'], answerIndex: 1, explanationKo: '의견은 다음 연도 안내를 개선하기 위한 참고로 쓰입니다.' },
    ],
  },
  {
    titleJa: '共有資料の扱い',
    genre: 'instruction',
    bodyJa: '研修で使う資料は、参加者だけが見られる場所に置きます。資料には利用者から寄せられた意見をまとめていますが、個人が分かる情報は掲載しません。内容を外部へ送る必要がある場合は、担当者に理由と範囲を伝えて承認を受けてください。古い資料は、新しい版が発行された後に取り下げます。',
    bodyKo: '연수에 사용할 자료는 참가자만 볼 수 있는 곳에 둡니다. 자료에는 이용자가 보낸 의견을 정리하고 있지만 개인을 알 수 있는 정보는 게재하지 않습니다. 내용을 외부에 보낼 필요가 있는 경우에는 담당자에게 이유와 범위를 알리고 승인을 받아 주세요. 오래된 자료는 새 판이 발행된 뒤에 내립니다.',
    wordCount: 87,
    questions: [
      { questionJa: '資料に掲載しないものは何ですか。', questionKo: '자료에 게재하지 않는 것은 무엇입니까?', choices: ['이용자의 의견 요약', '개인을 알 수 있는 정보', '연수에 필요한 안내', '새 판의 발행일'], answerIndex: 1, explanationKo: '자료에는 개인을 알 수 있는 정보를 게재하지 않는다고 했습니다.' },
      { questionJa: '資料を外部へ送る前に何をしますか。', questionKo: '자료를 외부에 보내기 전에 무엇을 합니까?', choices: ['바로 공개한다', '오래된 자료를 다시 쓴다', '이유와 범위를 알리고 승인을 받는다', '개인 정보를 추가한다'], answerIndex: 2, explanationKo: '외부 전송이 필요할 때는 담당자에게 이유와 범위를 알리고 승인을 받아야 합니다.' },
    ],
  },
  {
    titleJa: '備品の予約方法',
    genre: 'email',
    bodyJa: '会議用の機器を予約する人へ。利用したい日の三日前までに、必要な機器の種類と利用時間を入力してください。同じ時間に希望が重なった場合は、研修や地域行事など、多くの人が参加する予定を優先します。急な変更で使わなくなったときは、ほかの人が利用できるよう早めに連絡してください。',
    bodyKo: '회의용 기기를 예약하는 분께. 이용하려는 날의 3일 전까지 필요한 기기 종류와 이용 시간을 입력해 주세요. 같은 시간에 희망이 겹친 경우에는 연수나 지역 행사처럼 많은 사람이 참여하는 일정을 우선합니다. 갑작스러운 변경으로 사용하지 않게 된 때에는 다른 사람이 이용할 수 있도록 빨리 연락해 주세요.',
    wordCount: 90,
    questions: [
      { questionJa: '予約する人はいつまでに入力しますか。', questionKo: '예약하는 사람은 언제까지 입력합니까?', choices: ['이용 당일 아침까지', '이용일 3일 전까지', '다음 달까지', '행사가 끝난 뒤에'], answerIndex: 1, explanationKo: '필요한 기기와 이용 시간은 이용일 3일 전까지 입력해야 합니다.' },
      { questionJa: '希望が重なった場合、何が優先されますか。', questionKo: '희망이 겹친 경우 무엇이 우선됩니까?', choices: ['먼저 연락한 개인 일정', '비용이 적은 예약', '많은 사람이 참여하는 일정', '기기 종류가 적은 예약'], answerIndex: 2, explanationKo: '연수나 지역 행사처럼 많은 사람이 참여하는 예정이 우선됩니다.' },
    ],
  },
  {
    titleJa: '案内表示を評価する',
    genre: 'report',
    bodyJa: '駅の案内表示を変えた後、利用者が出口を探す時間を二週間測定した。以前より短くなった時間帯もあったが、雨の日は大きな差が見られなかった。このため、表示を増やすだけでは十分ではないと考え、雨の日にも見やすい場所へ案内を追加することにした。次の月にも同じ方法で結果を確認する。',
    bodyKo: '역 안내 표시를 바꾼 뒤 이용자가 출구를 찾는 시간을 2주 동안 측정했다. 이전보다 짧아진 시간대도 있었지만 비 오는 날에는 큰 차이가 보이지 않았다. 따라서 표시를 늘리는 것만으로는 충분하지 않다고 보고 비 오는 날에도 보기 쉬운 장소에 안내를 추가하기로 했다. 다음 달에도 같은 방법으로 결과를 확인한다.',
    wordCount: 92,
    questions: [
      { questionJa: '雨の日に見られなかったものは何ですか。', questionKo: '비 오는 날에 보이지 않았던 것은 무엇입니까?', choices: ['출구를 찾는 시간의 큰 차이', '안내 표시 자체', '이용자의 존재', '다음 달 계획'], answerIndex: 0, explanationKo: '비 오는 날에는 출구를 찾는 시간에서 큰 차이가 보이지 않았다고 했습니다.' },
      { questionJa: '筆者は次に何をすることにしましたか。', questionKo: '필자는 다음에 무엇을 하기로 했습니까?', choices: ['측정을 중단한다', '비 오는 날에도 보기 쉬운 곳에 안내를 추가한다', '모든 출구를 닫는다', '이용자 조사를 없앤다'], answerIndex: 1, explanationKo: '비 오는 날에도 보기 쉬운 장소에 안내를 추가하기로 했습니다.' },
    ],
  },
];

export interface N2Batch1Manifest {
  sourceCode: string;
  sourceAssetId: string;
  sourcePath: string;
  sourceSha256: string;
  parserVersion: string;
  counts: {
    categories: number;
    vocab: number;
    grammar: number;
    kanji: number;
    sentences: number;
    reading: number;
    readingQuestions: number;
    stableRefs: number;
    audioBindings: number;
    contentRows: number;
  };
}

export interface N2Batch1Plan {
  statements: string[];
  manifest: N2Batch1Manifest;
}

function sha256(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function insertCount(statements: readonly string[], table: string): number {
  const pattern = new RegExp('^INSERT(?: OR IGNORE)? INTO `?' + table + '`?', 'm');
  return statements.filter((statement) => pattern.test(statement)).length;
}

function assertParsedCount(name: string, actual: number, expected: number): void {
  if (actual !== expected) {
    throw new Error(`N2 Batch 1 ${name} count changed: expected ${expected}, received ${actual}. Update the manifest and verifier deliberately.`);
  }
}

function sourceInsertStatement(sourceSha256: string): string {
  return [
    'INSERT INTO `sources` (`code`, `title`, `file_path`, `version`)',
    `VALUES (${esc(N2_BATCH_1_SOURCE_CODE)}, 'JLPT N2 자체 저작 Batch 1', 'docs/05_n2/02_self_authored_batch_1.md', ${esc(`source-v3-${sourceSha256.slice(0, 16)}`)})`,
    'ON CONFLICT(`code`) DO UPDATE SET',
    '  `title` = excluded.`title`,',
    '  `file_path` = excluded.`file_path`,',
    '  `version` = excluded.`version`,',
    '  `updated_at` = unixepoch();',
  ].join('\n');
}

function sourceAssetStatement(sourceSha256: string): string {
  return [
    'INSERT OR IGNORE INTO `content_source_assets`',
    '  (`id`, `asset_kind`, `source_url`, `license_id`, `license_url`, `attribution_text`, `allowed_use`, `source_sha256`, `generated_at`, `selection_reason`)',
    `VALUES (${esc(N2_BATCH_1_SOURCE_ASSET_ID)}, 'self-authored-fixture', ${esc(N2_BATCH_1_REPOSITORY_URL)},`,
    `  ${esc(N2_BATCH_1_LICENSE_ID)}, ${esc(N2_BATCH_1_LICENSE_URL)},`,
    "  '© Nihongo N3 contributors; self-authored Japanese-learning content.',",
    "  'Personal learning content; self-authored explanations, examples, readings, questions, and listening scripts; not official JLPT material.',",
    `  ${esc(sourceSha256)}, 1785283200, 'First operating N2 content batch with no external audio asset.');`,
  ].join('\n');
}

function sentenceStatement(sentence: SentenceSeed): string {
  return [
    'INSERT INTO `sentences` (`source_id`, `level`, `register`, `seq_no`, `ja`, `kana`, `ko`, `vocab_ids`, `grammar_ids`)',
    `VALUES ((SELECT id FROM sources WHERE code = ${esc(N2_BATCH_1_SOURCE_CODE)}), 'N2', 'listening', ${sentence.seqNo},`,
    `  ${esc(sentence.ja)}, ${sentence.kana ? esc(sentence.kana) : 'NULL'}, ${esc(sentence.ko)}, '[]', '[]')`,
    'ON CONFLICT(`source_id`, `level`, `register`, `seq_no`) DO UPDATE SET',
    '  `ja` = excluded.`ja`, `kana` = excluded.`kana`, `ko` = excluded.`ko`, `updated_at` = unixepoch();',
  ].join('\n');
}

function sourceAttribution(): string {
  return `self-authored N2 Batch 1; source asset ${N2_BATCH_1_SOURCE_ASSET_ID}`;
}

function readingStatement(reading: ReadingSeed): string {
  const attribution = sourceAttribution();
  return [
    'INSERT INTO `reading_passages` (`level`, `genre`, `title_ja`, `body_ja`, `body_ko`, `word_count`, `vocab_ids`, `grammar_ids`, `source_attribution`)',
    `SELECT 'N2', ${esc(reading.genre)}, ${esc(reading.titleJa)}, ${esc(reading.bodyJa)}, ${esc(reading.bodyKo)}, ${reading.wordCount}, '[]', '[]', ${esc(attribution)}`,
    'WHERE NOT EXISTS (',
    '  SELECT 1 FROM `reading_passages`',
    `  WHERE level = 'N2' AND title_ja = ${esc(reading.titleJa)} AND source_attribution = ${esc(attribution)}`,
    ');',
  ].join('\n');
}

function readingQuestionStatement(reading: ReadingSeed, question: ReadingQuestionSeed): string {
  const attribution = sourceAttribution();
  return [
    'INSERT INTO `reading_questions` (`passage_id`, `question_ja`, `question_ko`, `choices_json`, `answer_index`, `explanation_ko`)',
    `SELECT id, ${esc(question.questionJa)}, ${esc(question.questionKo)}, ${escJson([...question.choices])}, ${question.answerIndex}, ${esc(question.explanationKo)}`,
    'FROM `reading_passages`',
    `WHERE level = 'N2' AND title_ja = ${esc(reading.titleJa)} AND source_attribution = ${esc(attribution)}`,
    '  AND NOT EXISTS (',
    '    SELECT 1 FROM `reading_questions` q',
    '    WHERE q.passage_id = `reading_passages`.id',
    `      AND q.question_ja = ${esc(question.questionJa)}`,
    '  );',
  ].join('\n');
}

function stableRefStatements(): string[] {
  const source = esc(N2_BATCH_1_SOURCE_CODE);
  const asset = esc(N2_BATCH_1_SOURCE_ASSET_ID);
  const attribution = esc(sourceAttribution());
  const chars = N2_BATCH_1_KANJI.map(esc).join(', ');
  return [
    [
      'INSERT OR IGNORE INTO `learning_content_stable_refs` (`stable_ref`, `learning_track`, `item_type`, `item_id`, `level_tag`, `source_asset_id`)',
      "SELECT 'jlpt:n2:batch1:vocab:' || ja || ':' || kana, 'jlpt-ja', 'jlpt-vocab', CAST(id AS TEXT), 'N2', " + asset,
      `FROM vocab WHERE source_id = (SELECT id FROM sources WHERE code = ${source}) AND level = 'N2';`,
    ].join('\n'),
    [
      'INSERT OR IGNORE INTO `learning_content_stable_refs` (`stable_ref`, `learning_track`, `item_type`, `item_id`, `level_tag`, `source_asset_id`)',
      "SELECT 'jlpt:n2:batch1:grammar:' || pattern, 'jlpt-ja', 'jlpt-grammar', CAST(id AS TEXT), 'N2', " + asset,
      `FROM grammar WHERE source_id = (SELECT id FROM sources WHERE code = ${source}) AND level = 'N2';`,
    ].join('\n'),
    [
      'INSERT OR IGNORE INTO `learning_content_stable_refs` (`stable_ref`, `learning_track`, `item_type`, `item_id`, `level_tag`, `source_asset_id`)',
      "SELECT 'jlpt:n2:batch1:kanji:' || char, 'jlpt-ja', 'jlpt-kanji', CAST(id AS TEXT), 'N2', " + asset,
      `FROM kanji WHERE jlpt_level = 'N2' AND char IN (${chars});`,
    ].join('\n'),
    [
      'INSERT OR IGNORE INTO `learning_content_stable_refs` (`stable_ref`, `learning_track`, `item_type`, `item_id`, `level_tag`, `source_asset_id`)',
      "SELECT 'jlpt:n2:batch1:listening:' || seq_no, 'jlpt-ja', 'jlpt-sentence', CAST(id AS TEXT), 'N2', " + asset,
      `FROM sentences WHERE source_id = (SELECT id FROM sources WHERE code = ${source}) AND level = 'N2' AND register = 'listening';`,
    ].join('\n'),
    [
      'INSERT OR IGNORE INTO `learning_content_stable_refs` (`stable_ref`, `learning_track`, `item_type`, `item_id`, `level_tag`, `source_asset_id`)',
      "SELECT 'jlpt:n2:batch1:reading:' || title_ja, 'jlpt-ja', 'jlpt-reading', CAST(id AS TEXT), 'N2', " + asset,
      `FROM reading_passages WHERE level = 'N2' AND source_attribution = ${attribution};`,
    ].join('\n'),
  ];
}

function prerequisiteStatement(): string {
  return [
    'INSERT OR IGNORE INTO `learning_content_level_references`',
    '  (`id`, `learning_track`, `curriculum_level`, `item_type`, `item_id`, `reference_kind`, `source_asset_id`)',
    "VALUES ('curriculum-reference:jlpt:n2:batch1:kanji:対', 'jlpt-ja', 'N2', 'jlpt-kanji',",
    "  (SELECT CAST(id AS TEXT) FROM kanji WHERE char = '対' AND jlpt_level = 'N3'), 'prerequisite',",
    `  ${esc(N2_BATCH_1_SOURCE_ASSET_ID)});`,
  ].join('\n');
}

function audioBindingStatement(itemType: 'jlpt-vocab' | 'jlpt-kanji' | 'jlpt-sentence' | 'jlpt-reading', role: 'pronunciation' | 'listening'): string {
  return [
    'INSERT OR IGNORE INTO `content_audio_bindings` (`id`, `stable_ref`, `item_type`, `item_id`, `language`, `audio_role`, `binding_state`, `asset_id`, `unavailable_reason`)',
    `SELECT 'audio-binding:' || stable_ref, stable_ref, ${esc(itemType)}, item_id, 'ja', ${esc(role)}, 'preparing', NULL, ${esc(AUDIO_PREPARING_REASON)}`,
    'FROM `learning_content_stable_refs`',
    `WHERE learning_track = 'jlpt-ja' AND level_tag = 'N2' AND source_asset_id = ${esc(N2_BATCH_1_SOURCE_ASSET_ID)} AND item_type = ${esc(itemType)};`,
  ].join('\n');
}

export function n2Batch1ContentRowsSql(): string {
  const source = esc(N2_BATCH_1_SOURCE_CODE);
  const attribution = esc(sourceAttribution());
  const chars = N2_BATCH_1_KANJI.map(esc).join(', ');
  return [
    'SELECT',
    `  (SELECT count(*) FROM vocab WHERE source_id = (SELECT id FROM sources WHERE code = ${source}) AND level = 'N2') +`,
    `  (SELECT count(*) FROM grammar WHERE source_id = (SELECT id FROM sources WHERE code = ${source}) AND level = 'N2') +`,
    `  (SELECT count(*) FROM kanji WHERE jlpt_level = 'N2' AND char IN (${chars})) +`,
    `  (SELECT count(*) FROM sentences WHERE source_id = (SELECT id FROM sources WHERE code = ${source}) AND level = 'N2' AND register = 'listening') +`,
    `  (SELECT count(*) FROM reading_passages WHERE level = 'N2' AND source_attribution = ${attribution}) +`,
    `  (SELECT count(*) FROM reading_questions q JOIN reading_passages p ON p.id = q.passage_id WHERE p.level = 'N2' AND p.source_attribution = ${attribution}) AS count;`,
  ].join('\n');
}

export function buildN2Batch1Plan(): N2Batch1Plan {
  const sourceSha256 = sha256(fs.readFileSync(N2_BATCH_1_PATH));
  const vocab = parseVocab({ sourceCode: N2_BATCH_1_SOURCE_CODE, level: 'N2', filePath: N2_BATCH_1_PATH });
  const grammar = parseGrammar({ sourceCode: N2_BATCH_1_SOURCE_CODE, level: 'N2', filePath: N2_BATCH_1_PATH });
  const kanji = parseKanji({ sourceCode: N2_BATCH_1_SOURCE_CODE, level: 'N2', filePath: N2_BATCH_1_PATH });
  assertParsedCount('vocab', insertCount(vocab, 'vocab'), 104);
  assertParsedCount('grammar', insertCount(grammar, 'grammar'), 20);
  assertParsedCount('kanji', insertCount(kanji, 'kanji'), 30);

  const statements = [
    sourceInsertStatement(sourceSha256),
    sourceAssetStatement(sourceSha256),
    ...vocab,
    ...grammar,
    ...kanji,
    ...SENTENCES.map(sentenceStatement),
    ...READINGS.map(readingStatement),
    ...READINGS.flatMap((reading) => reading.questions.map((question) => readingQuestionStatement(reading, question))),
    ...stableRefStatements(),
    prerequisiteStatement(),
    audioBindingStatement('jlpt-vocab', 'pronunciation'),
    audioBindingStatement('jlpt-kanji', 'pronunciation'),
    audioBindingStatement('jlpt-sentence', 'listening'),
    audioBindingStatement('jlpt-reading', 'listening'),
  ];

  const counts = {
    categories: 14,
    vocab: 104,
    grammar: 20,
    kanji: 30,
    sentences: SENTENCES.length,
    reading: READINGS.length,
    readingQuestions: READINGS.reduce((total, reading) => total + reading.questions.length, 0),
    stableRefs: 242,
    audioBindings: 222,
    contentRows: 258,
  } as const;
  if (counts.contentRows !== counts.vocab + counts.grammar + counts.kanji + counts.sentences + counts.reading + counts.readingQuestions) {
    throw new Error('N2 Batch 1 content row manifest is internally inconsistent.');
  }

  return {
    statements,
    manifest: {
      sourceCode: N2_BATCH_1_SOURCE_CODE,
      sourceAssetId: N2_BATCH_1_SOURCE_ASSET_ID,
      sourcePath: path.relative(REPO_ROOT, N2_BATCH_1_PATH).split(path.sep).join('/'),
      sourceSha256,
      parserVersion: 'n2-batch-1-parser-v1',
      counts,
    },
  };
}
