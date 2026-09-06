import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { REPO_ROOT } from './constants.js';
import { esc, escJson } from './utils.js';

/**
 * First operating, self-authored TOPIK 1–6 curriculum set.  It is deliberately
 * independent from the reviewed practice bank and is seeded by the normal
 * content manifest, not by the small local-only fixture.
 */
export const TOPIK_OWNER_BATCH_1_SOURCE_CODE = 'TOPIK-A1';
export const TOPIK_OWNER_BATCH_1_SOURCE_ASSET_ID = 'source-asset:topik-owner-authored-grades-1-6-batch-1-2026-07-30';
export const TOPIK_OWNER_BATCH_1_PATH = path.join(REPO_ROOT, 'docs/07_topik/02_owner_authored_grades_1_6_batch_1.md');
const REPOSITORY_URL = 'https://github.com/kordokrip/JLPT/blob/main/docs/07_topik/02_owner_authored_grades_1_6_batch_1.md';
const LICENSE_URL = 'https://github.com/kordokrip/JLPT/blob/main/docs/ATTRIBUTIONS.md#학습-콘텐츠와-provenance';

type Section = 'vocab' | 'grammar' | 'reading' | 'listening' | 'writing';

interface ItemSeed {
  grade: number;
  section: Section;
  titleKo: string;
  titleJa: string;
  titleEn: string;
  promptKo: string;
  promptJa: string;
  promptEn: string;
  choices?: readonly string[];
  answerIndex?: number;
  explanationKo: string;
  explanationJa: string;
  explanationEn: string;
  audioTextKo: string;
}

const ITEMS: readonly ItemSeed[] = [
  { grade: 1, section: 'vocab', titleKo: '인사와 소개', titleJa: 'あいさつと紹介', titleEn: 'Greetings and introductions', promptKo: '처음 만난 선생님께 가장 자연스럽게 인사하는 말은 무엇입니까?', promptJa: '初めて会う先生への最も自然なあいさつはどれですか。', promptEn: 'Which greeting is most natural for a teacher you meet for the first time?', choices: ['안녕하세요.', '미안합니다.', '잘 자요.', '맛있어요.'], answerIndex: 0, explanationKo: '안녕하세요는 처음 만나거나 정중하게 인사할 때 쓰는 기본 표현입니다.', explanationJa: '「안녕하세요」は初対面や丁寧なあいさつで使う基本表現です。', explanationEn: '안녕하세요 is a basic greeting for first meetings and polite situations.', audioTextKo: '안녕하세요.' },
  { grade: 1, section: 'grammar', titleKo: '이에요와 예요', titleJa: '이에요・예요', titleEn: '이에요 and 예요', promptKo: '빈칸에 알맞은 말을 고르세요. 저는 학생___ .', promptJa: '空欄に入る最も自然な表現を選んでください。私は学生___。', promptEn: 'Choose the most natural expression: 저는 학생___ .', choices: ['이에요', '예요', '에서', '하고'], answerIndex: 0, explanationKo: '받침이 있는 명사 학생 뒤에는 이에요를 씁니다.', explanationJa: 'パッチムのある名詞「학생」の後には「이에요」を使います。', explanationEn: 'Use 이에요 after the noun 학생, which ends in a final consonant.', audioTextKo: '저는 학생이에요.' },
  { grade: 1, section: 'reading', titleKo: '교실 안내', titleJa: '教室の案内', titleEn: 'Classroom notice', promptKo: '지문: 한국어 수업은 월요일과 수요일 오후 두 시에 시작합니다. 책은 교실에 가져오세요.\n질문: 수업은 언제 시작합니까?', promptJa: '本文：韓国語の授業は月曜日と水曜日の午後二時に始まります。本を教室に持ってきてください。\n質問：授業はいつ始まりますか。', promptEn: 'Text: Korean class starts at 2 p.m. on Monday and Wednesday. Bring your book to the classroom. When does class start?', choices: ['월요일과 수요일 오후 두 시', '매일 아침 아홉 시', '금요일 저녁', '토요일 오후'], answerIndex: 0, explanationKo: '지문에 수업 시작 시간이 월요일과 수요일 오후 두 시라고 나옵니다.', explanationJa: '本文に月曜日と水曜日の午後二時に始まるとあります。', explanationEn: 'The text states that class starts at 2 p.m. on Monday and Wednesday.', audioTextKo: '한국어 수업은 월요일과 수요일 오후 두 시에 시작합니다. 책은 교실에 가져오세요.' },
  { grade: 1, section: 'listening', titleKo: '짧은 자기소개 듣기', titleJa: '短い自己紹介を聞く', titleEn: 'Listening to a short introduction', promptKo: '말하는 사람은 무엇을 하고 있습니까?', promptJa: '話している人は何をしていますか。', promptEn: 'What is the speaker doing?', choices: ['자기소개를 하고 있다', '음식을 주문하고 있다', '길을 묻고 있다', '수업을 끝내고 있다'], answerIndex: 0, explanationKo: '이름과 공부하는 내용을 말하고 있으므로 자기소개입니다.', explanationJa: '名前と勉強している内容を話しているため、自己紹介です。', explanationEn: 'The speaker gives a name and says what they study, so it is an introduction.', audioTextKo: '안녕하세요. 저는 민지예요. 한국어를 공부해요.' },
  { grade: 1, section: 'writing', titleKo: '나를 소개하기', titleJa: '自分を紹介する', titleEn: 'Introducing yourself', promptKo: '이름과 국적을 넣어 한 문장으로 자신을 소개해 보세요.', promptJa: '名前と国籍を入れて、一文で自分を紹介してください。', promptEn: 'Introduce yourself in one sentence using your name and nationality.', explanationKo: '예: 저는 유키예요. 일본 사람이에요.', explanationJa: '例：私はユキです。日本人です。', explanationEn: 'Example: 저는 유키예요. 일본 사람이에요.', audioTextKo: '저는 유키예요. 일본 사람이에요.' },

  { grade: 2, section: 'vocab', titleKo: '하루 일과', titleJa: '一日の生活', titleEn: 'Daily routine', promptKo: '아침에 회사에 가기 전에 먹는 것은 무엇입니까?', promptJa: '朝、会社へ行く前に食べるものは何ですか。', promptEn: 'What do you eat before going to work in the morning?', choices: ['아침', '약속', '계절', '공원'], answerIndex: 0, explanationKo: '아침은 하루의 첫 끼 또는 그 시간대를 뜻합니다.', explanationJa: '「아침」は一日の最初の食事、またはその時間帯を表します。', explanationEn: '아침 means breakfast or the morning time period.', audioTextKo: '아침' },
  { grade: 2, section: 'grammar', titleKo: '고 싶어요', titleJa: '〜したいです', titleEn: 'Want to', promptKo: '주말에 영화를 보고 싶습니다. 알맞은 문장은 무엇입니까?', promptJa: '週末に映画を見たいです。最も自然な文はどれですか。', promptEn: 'Which sentence naturally says that you want to watch a movie this weekend?', choices: ['주말에 영화를 보고 싶어요.', '주말에 영화를 봐요 싶어요.', '주말에 영화를 보고 있어요.', '주말에 영화에서 가요.'], answerIndex: 0, explanationKo: '동사 어간 뒤에 고 싶어요를 붙여 바람을 말합니다.', explanationJa: '動詞の語幹の後に「고 싶어요」を付けて希望を表します。', explanationEn: 'Attach 고 싶어요 to a verb stem to express a desire.', audioTextKo: '주말에 영화를 보고 싶어요.' },
  { grade: 2, section: 'reading', titleKo: '약속 시간', titleJa: '約束の時間', titleEn: 'Meeting time', promptKo: '지문: 내일 친구와 세 시에 역 앞에서 만나요. 비가 오면 카페에서 기다릴게요.\n질문: 비가 오면 어디에서 기다립니까?', promptJa: '本文：明日、友達と三時に駅前で会います。雨が降ったらカフェで待ちます。\n質問：雨が降ったらどこで待ちますか。', promptEn: 'Text: I will meet a friend in front of the station at three tomorrow. If it rains, I will wait at a cafe. Where will the speaker wait if it rains?', choices: ['카페', '학교', '집', '공원'], answerIndex: 0, explanationKo: '비가 오면 카페에서 기다린다고 했습니다.', explanationJa: '雨が降ったらカフェで待つと書かれています。', explanationEn: 'The text says the speaker will wait at a cafe if it rains.', audioTextKo: '내일 친구와 세 시에 역 앞에서 만나요. 비가 오면 카페에서 기다릴게요.' },
  { grade: 2, section: 'listening', titleKo: '전화 약속 듣기', titleJa: '電話の約束を聞く', titleEn: 'Listening to a phone arrangement', promptKo: '여자는 왜 전화를 했습니까?', promptJa: '女性はなぜ電話をしましたか。', promptEn: 'Why did the woman call?', choices: ['약속 시간을 바꾸려고', '음식을 주문하려고', '숙제를 내려고', '표를 사려고'], answerIndex: 0, explanationKo: '원래 시간에 갈 수 없어서 약속 시간을 바꾸자고 말합니다.', explanationJa: '元の時間に行けないため、約束の時間を変えようと言っています。', explanationEn: 'She cannot make the original time and asks to change it.', audioTextKo: '미안해요. 두 시에는 못 가요. 세 시에 만나도 돼요?' },
  { grade: 2, section: 'writing', titleKo: '간단한 약속 메시지', titleJa: '簡単な約束メッセージ', titleEn: 'A simple meeting message', promptKo: '친구에게 늦을 때 쓸 짧은 메시지를 써 보세요.', promptJa: '友達に遅れるときに使う短いメッセージを書いてください。', promptEn: 'Write a short message to a friend when you will be late.', explanationKo: '예: 미안해. 길이 막혀서 십 분 늦을 것 같아.', explanationJa: '例：ごめん。道が混んでいて十分くらい遅れそう。', explanationEn: 'Example: 미안해. 길이 막혀서 십 분 늦을 것 같아.', audioTextKo: '미안해. 길이 막혀서 십 분 늦을 것 같아.' },

  { grade: 3, section: 'vocab', titleKo: '예약과 변경', titleJa: '予約と変更', titleEn: 'Reservations and changes', promptKo: '예약한 시간을 다른 시간으로 바꾸는 것은 무엇입니까?', promptJa: '予約した時間を別の時間に変えることは何ですか。', promptEn: 'What is changing a reserved time to another time?', choices: ['변경', '출발', '도착', '준비'], answerIndex: 0, explanationKo: '변경은 기존 내용이나 시간을 다른 것으로 바꾸는 일입니다.', explanationJa: '「변경」は既存の内容や時間を別のものに変えることです。', explanationEn: '변경 means changing existing details or a scheduled time.', audioTextKo: '변경' },
  { grade: 3, section: 'grammar', titleKo: '기 때문에', titleJa: '〜なので', titleEn: 'Because', promptKo: '길이 많이 막히___ 지하철을 탔어요.', promptJa: '道がとても混む___地下鉄に乗りました。', promptEn: 'The roads were very congested, ___ I took the subway.', choices: ['기 때문에', '거나', '면서', '까지'], answerIndex: 0, explanationKo: '이유를 설명할 때 기 때문에를 씁니다.', explanationJa: '理由を説明するときに「기 때문에」を使います。', explanationEn: 'Use 기 때문에 to explain a reason.', audioTextKo: '길이 많이 막히기 때문에 지하철을 탔어요.' },
  { grade: 3, section: 'reading', titleKo: '도서관 공지', titleJa: '図書館のお知らせ', titleEn: 'Library notice', promptKo: '지문: 도서관은 다음 주 월요일에 내부 정리로 쉽니다. 빌린 책은 휴관일 다음 날까지 반납할 수 있습니다.\n질문: 책은 언제까지 반납할 수 있습니까?', promptJa: '本文：図書館は来週月曜日、内部整理のため休館します。借りた本は休館日の翌日まで返却できます。\n質問：本はいつまで返却できますか。', promptEn: 'Text: The library is closed next Monday for internal organization. Borrowed books may be returned until the day after the closure. Until when may books be returned?', choices: ['휴관일 다음 날까지', '오늘 오후까지', '다음 달까지', '월요일 아침까지'], answerIndex: 0, explanationKo: '지문은 휴관일 다음 날까지 반납할 수 있다고 안내합니다.', explanationJa: '本文には休館日の翌日まで返却できるとあります。', explanationEn: 'The notice says books may be returned until the day after the closure.', audioTextKo: '도서관은 다음 주 월요일에 내부 정리로 쉽니다. 빌린 책은 휴관일 다음 날까지 반납할 수 있습니다.' },
  { grade: 3, section: 'listening', titleKo: '병원 예약 듣기', titleJa: '病院の予約を聞く', titleEn: 'Listening to a clinic booking', promptKo: '남자는 언제 병원에 가기로 했습니까?', promptJa: '男性はいつ病院へ行くことにしましたか。', promptEn: 'When did the man decide to go to the clinic?', choices: ['금요일 오전', '목요일 저녁', '토요일 오후', '월요일 아침'], answerIndex: 0, explanationKo: '목요일은 어렵고 금요일 오전으로 예약을 잡았습니다.', explanationJa: '木曜日は難しく、金曜日の午前に予約を取りました。', explanationEn: 'Thursday does not work, so the appointment is set for Friday morning.', audioTextKo: '목요일 저녁은 어려워요. 그러면 금요일 오전 열 시로 예약해 주세요.' },
  { grade: 3, section: 'writing', titleKo: '변경 요청하기', titleJa: '変更を依頼する', titleEn: 'Requesting a change', promptKo: '예약 변경을 정중하게 요청하는 두 문장을 써 보세요.', promptJa: '予約変更を丁寧に依頼する二文を書いてください。', promptEn: 'Write two polite sentences requesting a reservation change.', explanationKo: '예: 죄송하지만 예약 시간을 변경할 수 있을까요? 가능하면 금요일 오전으로 부탁드립니다.', explanationJa: '例：申し訳ありませんが、予約時間を変更できますか。可能でしたら金曜日の午前でお願いします。', explanationEn: 'Example: 죄송하지만 예약 시간을 변경할 수 있을까요? 가능하면 금요일 오전으로 부탁드립니다.', audioTextKo: '죄송하지만 예약 시간을 변경할 수 있을까요? 가능하면 금요일 오전으로 부탁드립니다.' },

  { grade: 4, section: 'vocab', titleKo: '공공 서비스', titleJa: '公共サービス', titleEn: 'Public services', promptKo: '시청이나 주민센터에서 어떤 일을 처리하는 창구를 무엇이라고 합니까?', promptJa: '市役所や住民センターで手続きをする窓口を何といいますか。', promptEn: 'What do you call a counter where procedures are handled at city hall or a community center?', choices: ['민원실', '운동장', '주차장', '식당'], answerIndex: 0, explanationKo: '민원실은 주민의 신청·문의 등을 처리하는 곳입니다.', explanationJa: '「민원실」は住民の申請や問い合わせなどを扱う場所です。', explanationEn: '민원실 is where residents handle applications and inquiries.', audioTextKo: '민원실' },
  { grade: 4, section: 'grammar', titleKo: '는 바람에', titleJa: '〜したせいで', titleEn: 'As a result of', promptKo: '갑자기 비가 많이 오___ 행사가 취소되었습니다.', promptJa: '急に大雨が降っ___イベントは中止になりました。', promptEn: 'Because it suddenly rained heavily, the event was cancelled.', choices: ['는 바람에', '더라도', '도록', '거나'], answerIndex: 0, explanationKo: '예상하지 못한 원인 때문에 좋지 않은 결과가 생겼을 때 는 바람에를 씁니다.', explanationJa: '予想しなかった原因でよくない結果が生じたときに「는 바람에」を使います。', explanationEn: 'Use 는 바람에 for an unexpected cause that produces an undesirable result.', audioTextKo: '갑자기 비가 많이 오는 바람에 행사가 취소되었습니다.' },
  { grade: 4, section: 'reading', titleKo: '신청 서류 안내', titleJa: '申請書類の案内', titleEn: 'Application documents', promptKo: '지문: 지원금을 신청하려면 신분증과 통장 사본을 함께 제출해야 합니다. 서류가 빠지면 접수가 늦어질 수 있으니 방문 전에 확인해 주세요.\n질문: 접수가 늦어질 수 있는 경우는 언제입니까?', promptJa: '本文：支援金を申請するには身分証と通帳の写しを一緒に提出する必要があります。書類が足りないと受付が遅れることがあるため、訪問前に確認してください。\n質問：受付が遅れる可能性があるのはいつですか。', promptEn: 'Text: To apply for assistance, submit identification and a bankbook copy together. If documents are missing, processing may be delayed. When can processing be delayed?', choices: ['서류가 빠졌을 때', '신분증을 냈을 때', '방문 전에 확인했을 때', '통장 사본을 냈을 때'], answerIndex: 0, explanationKo: '필요한 서류가 빠지면 접수가 늦어질 수 있습니다.', explanationJa: '必要な書類が不足すると受付が遅れることがあります。', explanationEn: 'Processing can be delayed when required documents are missing.', audioTextKo: '지원금을 신청하려면 신분증과 통장 사본을 함께 제출해야 합니다. 서류가 빠지면 접수가 늦어질 수 있으니 방문 전에 확인해 주세요.' },
  { grade: 4, section: 'listening', titleKo: '분실물 안내 듣기', titleJa: '落とし物の案内を聞く', titleEn: 'Listening to a lost-property notice', promptKo: '안내에 따르면 지갑을 찾으려면 어디로 가야 합니까?', promptJa: '案内によると、財布を探すにはどこへ行く必要がありますか。', promptEn: 'According to the announcement, where should one go to find a wallet?', choices: ['안내 데스크', '버스 정류장', '주차장', '도서관'], answerIndex: 0, explanationKo: '분실물은 일층 안내 데스크에서 보관한다고 했습니다.', explanationJa: '落とし物は一階の案内デスクで保管していると言っています。', explanationEn: 'The announcement says lost items are held at the first-floor information desk.', audioTextKo: '지갑을 잃어버리신 분은 일층 안내 데스크로 오세요. 신분증을 보여 주시면 확인해 드립니다.' },
  { grade: 4, section: 'writing', titleKo: '공식 문의 쓰기', titleJa: '公式の問い合わせを書く', titleEn: 'Writing a formal inquiry', promptKo: '필요한 서류를 묻는 정중한 문의를 써 보세요.', promptJa: '必要な書類を尋ねる丁寧な問い合わせを書いてください。', promptEn: 'Write a polite inquiry asking which documents are required.', explanationKo: '예: 안녕하세요. 신청할 때 필요한 서류를 알려 주시면 감사하겠습니다.', explanationJa: '例：こんにちは。申請時に必要な書類を教えていただけますと幸いです。', explanationEn: 'Example: 안녕하세요. 신청할 때 필요한 서류를 알려 주시면 감사하겠습니다.', audioTextKo: '안녕하세요. 신청할 때 필요한 서류를 알려 주시면 감사하겠습니다.' },

  { grade: 5, section: 'vocab', titleKo: '의견과 근거', titleJa: '意見と根拠', titleEn: 'Opinions and evidence', promptKo: '주장을 뒷받침하는 이유나 자료를 무엇이라고 합니까?', promptJa: '主張を支える理由や資料を何といいますか。', promptEn: 'What do you call reasons or materials that support a claim?', choices: ['근거', '결과', '순서', '연습'], answerIndex: 0, explanationKo: '근거는 판단이나 주장을 뒷받침하는 이유 또는 자료입니다.', explanationJa: '「근거」は判断や主張を支える理由や資料です。', explanationEn: '근거 is evidence or a reason supporting a judgment or claim.', audioTextKo: '근거' },
  { grade: 5, section: 'grammar', titleKo: '기는커녕', titleJa: '〜どころか', titleEn: 'Far from', promptKo: '시간이 줄어들___ 오히려 업무가 더 늘었습니다.', promptJa: '時間が減る___、むしろ仕事がさらに増えました。', promptEn: 'Far from decreasing, the work actually increased.', choices: ['기는커녕', '는 대신에', '는 데다가', '는 척하다'], answerIndex: 0, explanationKo: '기대했던 내용과 반대되는 결과를 강조할 때 기는커녕을 씁니다.', explanationJa: '期待した内容と反対の結果を強調するときに「기는커녕」を使います。', explanationEn: 'Use 기는커녕 to emphasize a result opposite to what was expected.', audioTextKo: '시간이 줄어들기는커녕 오히려 업무가 더 늘었습니다.' },
  { grade: 5, section: 'reading', titleKo: '지역 교통 의견', titleJa: '地域交通への意見', titleEn: 'Opinion on local transit', promptKo: '지문: 주민들은 버스 노선을 늘리는 것만으로는 불편이 해결되지 않는다고 말했다. 배차 간격과 환승 정보를 함께 개선해야 실제 이용이 쉬워진다는 의견이 많았다.\n질문: 주민들이 함께 개선해야 한다고 본 것은 무엇입니까?', promptJa: '本文：住民はバス路線を増やすだけでは不便は解決しないと述べた。運行間隔と乗り換え情報も一緒に改善してこそ実際に利用しやすくなるという意見が多かった。\n質問：住民が一緒に改善すべきだと考えたものは何ですか。', promptEn: 'Text: Residents said expanding bus routes alone would not solve the inconvenience. Many felt that service intervals and transfer information should also improve. What did they think should be improved together?', choices: ['배차 간격과 환승 정보', '버스 색깔만', '주민 이름', '주차장 요금만'], answerIndex: 0, explanationKo: '지문은 배차 간격과 환승 정보를 함께 개선해야 한다고 설명합니다.', explanationJa: '本文は運行間隔と乗り換え情報を一緒に改善すべきだと説明しています。', explanationEn: 'The text says service intervals and transfer information should be improved together.', audioTextKo: '주민들은 버스 노선을 늘리는 것만으로는 불편이 해결되지 않는다고 말했다. 배차 간격과 환승 정보를 함께 개선해야 실제 이용이 쉬워진다는 의견이 많았다.' },
  { grade: 5, section: 'listening', titleKo: '회의 의견 듣기', titleJa: '会議での意見を聞く', titleEn: 'Listening to a meeting opinion', promptKo: '화자는 무엇을 먼저 하자고 제안합니까?', promptJa: '話者は何を先にしようと提案していますか。', promptEn: 'What does the speaker propose doing first?', choices: ['작은 지역에서 시험해 본다', '모든 제도를 없앤다', '의견을 받지 않는다', '예산을 바로 두 배로 한다'], answerIndex: 0, explanationKo: '전체 확대 전에 작은 지역에서 효과를 확인하자고 했습니다.', explanationJa: '全体へ拡大する前に、小さな地域で効果を確認しようと言っています。', explanationEn: 'The speaker proposes checking the effect in a small area before a full rollout.', audioTextKo: '이 제도를 모든 지역에 바로 적용하기보다, 먼저 작은 지역에서 시험해 보면 어떨까요? 결과를 확인한 뒤에 확대해도 늦지 않습니다.' },
  { grade: 5, section: 'writing', titleKo: '의견을 근거와 함께 쓰기', titleJa: '根拠とともに意見を書く', titleEn: 'Writing an evidence-based opinion', promptKo: '한 가지 개선안을 제시하고 이유를 두 문장으로 써 보세요.', promptJa: '一つの改善案を示し、理由を二文で書いてください。', promptEn: 'Propose one improvement and explain the reason in two sentences.', explanationKo: '예: 안내문에 쉬운 표현을 늘려야 한다고 생각합니다. 처음 이용하는 사람도 절차를 이해하기 쉬워지기 때문입니다.', explanationJa: '例：案内文にわかりやすい表現を増やすべきだと思います。初めて利用する人も手続きを理解しやすくなるからです。', explanationEn: 'Example: 안내문에 쉬운 표현을 늘려야 한다고 생각합니다. 처음 이용하는 사람도 절차를 이해하기 쉬워지기 때문입니다.', audioTextKo: '안내문에 쉬운 표현을 늘려야 한다고 생각합니다. 처음 이용하는 사람도 절차를 이해하기 쉬워지기 때문입니다.' },

  { grade: 6, section: 'vocab', titleKo: '사회 현상 분석', titleJa: '社会現象の分析', titleEn: 'Analyzing social phenomena', promptKo: '어떤 현상이 생긴 배경이나 원인을 자세히 살피는 것을 무엇이라고 합니까?', promptJa: 'ある現象が生じた背景や原因を詳しく調べることを何といいますか。', promptEn: 'What is closely examining the background and causes of a phenomenon?', choices: ['분석', '소개', '초대', '반복'], answerIndex: 0, explanationKo: '분석은 대상을 나누어 구조·원인·의미를 살피는 일입니다.', explanationJa: '「분석」は対象を分け、構造・原因・意味を調べることです。', explanationEn: '분석 is examining a subject’s structure, causes, and meaning.', audioTextKo: '분석' },
  { grade: 6, section: 'grammar', titleKo: '는 한이 있더라도', titleJa: '〜することになっても', titleEn: 'Even if it means', promptKo: '시간이 조금 더 걸리___ 정확한 자료를 확인해야 합니다.', promptJa: '時間がもう少しかかる___、正確な資料を確認する必要があります。', promptEn: 'Even if it takes a little longer, we need to verify accurate materials.', choices: ['는 한이 있더라도', '는 데 비해', '는 나머지', '는 셈이다'], answerIndex: 0, explanationKo: '어려움이나 손해가 있어도 어떤 일을 꼭 하겠다는 뜻에 는 한이 있더라도를 씁니다.', explanationJa: '困難や損失があっても、あることを必ずするという意味で「는 한이 있더라도」を使います。', explanationEn: 'Use 는 한이 있더라도 to say something must be done despite difficulty or cost.', audioTextKo: '시간이 조금 더 걸리는 한이 있더라도 정확한 자료를 확인해야 합니다.' },
  { grade: 6, section: 'reading', titleKo: '정책 평가의 관점', titleJa: '政策評価の観点', titleEn: 'Perspectives on policy evaluation', promptKo: '지문: 한 정책의 성과를 평가할 때 단기간의 수치만 보면 예상하지 못한 부작용을 놓칠 수 있다. 따라서 이용자의 경험, 지역별 차이, 장기적인 변화까지 함께 살펴야 한다.\n질문: 글쓴이가 강조하는 평가 방법은 무엇입니까?', promptJa: '本文：一つの政策の成果を評価するとき、短期間の数値だけを見ると予想しなかった副作用を見落とすことがある。したがって利用者の経験、地域別の違い、長期的な変化まで一緒に見るべきである。\n質問：筆者が強調する評価方法は何ですか。', promptEn: 'Text: Evaluating a policy by short-term figures alone can miss unintended effects. User experience, regional differences, and long-term change should also be considered. What approach does the writer emphasize?', choices: ['여러 관점과 장기 변화를 함께 본다', '짧은 기간의 수치만 본다', '이용자 경험을 제외한다', '지역 차이를 무시한다'], answerIndex: 0, explanationKo: '단기 수치뿐 아니라 이용자 경험·지역 차이·장기 변화를 함께 보아야 한다고 했습니다.', explanationJa: '短期の数値だけでなく、利用者の経験・地域差・長期変化を一緒に見るべきだと述べています。', explanationEn: 'The writer says to consider user experience, regional differences, and long-term change along with figures.', audioTextKo: '한 정책의 성과를 평가할 때 단기간의 수치만 보면 예상하지 못한 부작용을 놓칠 수 있다. 따라서 이용자의 경험, 지역별 차이, 장기적인 변화까지 함께 살펴야 한다.' },
  { grade: 6, section: 'listening', titleKo: '토론의 결론 듣기', titleJa: '討論の結論を聞く', titleEn: 'Listening to a discussion conclusion', promptKo: '화자가 결론을 내리기 전에 필요하다고 한 것은 무엇입니까?', promptJa: '話者が結論を出す前に必要だと言ったことは何ですか。', promptEn: 'What does the speaker say is needed before reaching a conclusion?', choices: ['추가 자료와 다른 의견을 검토한다', '바로 결정을 발표한다', '조사를 중단한다', '한 사람의 의견만 따른다'], answerIndex: 0, explanationKo: '자료가 충분하지 않으므로 다른 의견과 추가 자료를 더 검토해야 한다고 했습니다.', explanationJa: '資料が十分でないため、他の意見と追加資料をさらに検討すべきだと言っています。', explanationEn: 'The speaker says more materials and other views must be examined because the evidence is insufficient.', audioTextKo: '현재 자료만으로 결론을 내리기에는 근거가 충분하지 않습니다. 다른 지역의 사례와 반대 의견도 검토한 뒤에 판단하는 것이 좋겠습니다.' },
  { grade: 6, section: 'writing', titleKo: '균형 잡힌 주장 쓰기', titleJa: 'バランスの取れた主張を書く', titleEn: 'Writing a balanced claim', promptKo: '한 정책의 장점과 한계를 함께 언급하는 세 문장을 써 보세요.', promptJa: '一つの政策の長所と限界をともに述べる三文を書いてください。', promptEn: 'Write three sentences that mention both an advantage and a limitation of one policy.', explanationKo: '예: 이 정책은 이용 절차를 단순하게 만든다는 장점이 있습니다. 그러나 모든 지역에 같은 방식으로 적용하기에는 한계가 있습니다. 지역 상황을 확인하면서 보완해야 합니다.', explanationJa: '例：この政策には利用手続きを簡単にする長所があります。しかしすべての地域に同じ方法で適用するには限界があります。地域の状況を確認しながら補う必要があります。', explanationEn: 'Example: 이 정책은 이용 절차를 단순하게 만든다는 장점이 있습니다. 그러나 모든 지역에 같은 방식으로 적용하기에는 한계가 있습니다. 지역 상황을 확인하면서 보완해야 합니다.', audioTextKo: '이 정책은 이용 절차를 단순하게 만든다는 장점이 있습니다. 그러나 모든 지역에 같은 방식으로 적용하기에는 한계가 있습니다. 지역 상황을 확인하면서 보완해야 합니다.' },
];

export interface TopikOwnerBatch1Manifest {
  sourceCode: string;
  sourceAssetId: string;
  sourcePath: string;
  sourceSha256: string;
  counts: { units: number; items: number; stableRefs: number; audioBindings: number; contentRows: number };
}

export interface TopikOwnerBatch1Plan { statements: string[]; manifest: TopikOwnerBatch1Manifest; }

function slug(item: Pick<ItemSeed, 'grade' | 'section'>): string { return `${item.grade}-${item.section}`; }

function unitId(item: ItemSeed): string { return `topik-owner-batch1-unit-${slug(item)}`; }
function itemId(item: ItemSeed): string { return `topik-owner-batch1-item-${slug(item)}`; }
function stableRef(item: ItemSeed): string { return `topik:owner:batch1:grade${item.grade}:${item.section}`; }

function answerJson(item: ItemSeed): string {
  return JSON.stringify(item.choices
    ? { choices: item.choices, answer_index: item.answerIndex }
    : { sample_answer_ko: item.explanationKo.replace(/^예: /, '') });
}

function unitStatement(item: ItemSeed): string {
  return [
    'INSERT OR IGNORE INTO `topik_owner_authored_curriculum_units`',
    '  (`id`, `target_grade`, `stable_ref`, `section`, `title_ko`, `title_ja`, `title_en`, `source_asset_id`)',
    `VALUES (${esc(unitId(item))}, ${item.grade}, ${esc(`topik:owner:batch1:grade${item.grade}:unit:${item.section}`)}, ${esc(item.section)}, ${esc(item.titleKo)}, ${esc(item.titleJa)}, ${esc(item.titleEn)}, ${esc(TOPIK_OWNER_BATCH_1_SOURCE_ASSET_ID)});`,
  ].join('\n');
}

function itemStatement(item: ItemSeed): string {
  return [
    'INSERT OR IGNORE INTO `topik_owner_authored_curriculum_items`',
    '  (`id`, `unit_id`, `target_grade`, `stable_ref`, `item_type`, `prompt_ko`, `prompt_ja`, `prompt_en`, `answer_json`, `explanation_ko`, `explanation_ja`, `explanation_en`, `audio_required`, `audio_text_ko`, `source_asset_id`)',
    `VALUES (${esc(itemId(item))}, ${esc(unitId(item))}, ${item.grade}, ${esc(stableRef(item))}, ${esc(item.section)}, ${esc(item.promptKo)}, ${esc(item.promptJa)}, ${esc(item.promptEn)}, ${esc(answerJson(item))}, ${esc(item.explanationKo)}, ${esc(item.explanationJa)}, ${esc(item.explanationEn)}, 1, ${esc(item.audioTextKo)}, ${esc(TOPIK_OWNER_BATCH_1_SOURCE_ASSET_ID)});`,
  ].join('\n');
}

function stableRefStatement(item: ItemSeed): string {
  return [
    'INSERT OR IGNORE INTO `learning_content_stable_refs`',
    '  (`stable_ref`, `learning_track`, `item_type`, `item_id`, `level_tag`, `source_asset_id`)',
    `VALUES (${esc(stableRef(item))}, 'topik-ko', 'topik-owner-item', ${esc(itemId(item))}, ${esc(`TOPIK-${item.grade}`)}, ${esc(TOPIK_OWNER_BATCH_1_SOURCE_ASSET_ID)});`,
  ].join('\n');
}

function audioBindingStatement(item: ItemSeed): string {
  const role = item.section === 'listening' ? 'listening' : 'pronunciation';
  return [
    'INSERT OR IGNORE INTO `content_speech_bindings`',
    '  (`id`, `stable_ref`, `item_type`, `item_id`, `language`, `speech_role`, `provider`, `binding_state`, `text_source`, `unavailable_reason`)',
    `VALUES (${esc(`speech-binding:${stableRef(item)}`)}, ${esc(stableRef(item))}, 'topik-owner-item', ${esc(itemId(item))}, 'ko', ${esc(role)}, 'google-browser', 'ready', 'audio-script', NULL);`,
  ].join('\n');
}

export function topikOwnerBatch1ContentRowsSql(): string {
  return `SELECT (SELECT count(*) FROM topik_owner_authored_curriculum_units WHERE source_asset_id = ${esc(TOPIK_OWNER_BATCH_1_SOURCE_ASSET_ID)}) + (SELECT count(*) FROM topik_owner_authored_curriculum_items WHERE source_asset_id = ${esc(TOPIK_OWNER_BATCH_1_SOURCE_ASSET_ID)}) AS count;`;
}

export function buildTopikOwnerBatch1Plan(): TopikOwnerBatch1Plan {
  const sourceSha256 = createHash('sha256').update(fs.readFileSync(TOPIK_OWNER_BATCH_1_PATH)).digest('hex');
  const statements = [
    [
      'INSERT INTO `sources` (`code`, `title`, `file_path`, `version`)',
      `VALUES (${esc(TOPIK_OWNER_BATCH_1_SOURCE_CODE)}, 'TOPIK 1~6급 자체 저작 Batch 1', 'docs/07_topik/02_owner_authored_grades_1_6_batch_1.md', ${esc(`source-v3-${sourceSha256.slice(0, 16)}`)})`,
      'ON CONFLICT(`code`) DO UPDATE SET `title` = excluded.`title`, `file_path` = excluded.`file_path`, `version` = excluded.`version`, `updated_at` = unixepoch();',
    ].join('\n'),
    [
      'INSERT OR IGNORE INTO `content_source_assets`',
      '  (`id`, `asset_kind`, `source_url`, `license_id`, `license_url`, `attribution_text`, `allowed_use`, `source_sha256`, `generated_at`, `selection_reason`)',
      `VALUES (${esc(TOPIK_OWNER_BATCH_1_SOURCE_ASSET_ID)}, 'self-authored-fixture', ${esc(REPOSITORY_URL)}, 'LicenseRef-nihongo-n3-self-authored', ${esc(LICENSE_URL)},`,
      "  '© Nihongo N3 contributors; self-authored TOPIK learning content.',",
      "  'Personal learning content; self-authored Korean prompts, scripts, questions, answers, and explanations; not official TOPIK material.',",
      `  ${esc(sourceSha256)}, 1785369600, 'First operating TOPIK 1–6 self-authored curriculum batch using Google Korean browser speech only; R2 pronunciation is disabled.');`,
    ].join('\n'),
    ...ITEMS.map(unitStatement),
    ...ITEMS.map(itemStatement),
    ...ITEMS.map(stableRefStatement),
    ...ITEMS.map(audioBindingStatement),
  ];
  const counts = { units: ITEMS.length, items: ITEMS.length, stableRefs: ITEMS.length, audioBindings: ITEMS.length, contentRows: ITEMS.length * 2 } as const;
  return {
    statements,
    manifest: {
      sourceCode: TOPIK_OWNER_BATCH_1_SOURCE_CODE,
      sourceAssetId: TOPIK_OWNER_BATCH_1_SOURCE_ASSET_ID,
      sourcePath: path.relative(REPO_ROOT, TOPIK_OWNER_BATCH_1_PATH).split(path.sep).join('/'),
      sourceSha256,
      counts,
    },
  };
}
