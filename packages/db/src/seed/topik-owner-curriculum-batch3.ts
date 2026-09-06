import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { REPO_ROOT } from './constants.js';
import { esc } from './utils.js';

export const TOPIK_OWNER_BATCH_3_SOURCE_CODE = 'TOPIK-A3';
export const TOPIK_OWNER_BATCH_3_SOURCE_ASSET_ID = 'source-asset:topik-owner-authored-grades-1-6-batch-3-2026-08-03';
export const TOPIK_OWNER_BATCH_3_PATH = path.join(REPO_ROOT, 'docs/07_topik/04_owner_authored_grades_1_6_batch_3.md');

const REPOSITORY_URL = 'https://github.com/kordokrip/JLPT/blob/main/docs/07_topik/04_owner_authored_grades_1_6_batch_3.md';
const LICENSE_URL = 'https://github.com/kordokrip/JLPT/blob/main/docs/ATTRIBUTIONS.md#학습-콘텐츠와-provenance';

type Section = 'vocab' | 'grammar' | 'reading' | 'listening' | 'writing';
type ItemSeed = {
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
};

const ITEMS: readonly ItemSeed[] = [
  { grade: 1, section: 'vocab', titleKo: '학교 물건', titleJa: '学校の物', titleEn: 'School items', promptKo: '글을 쓰는 데 사용하는 것은 무엇입니까?', promptJa: '文字を書くのに使うものは何ですか。', promptEn: 'What do you use to write?', choices: ['공책', '우산', '신발', '창문'], answerIndex: 0, explanationKo: '공책은 글을 쓰거나 기록하는 데 쓰는 책입니다.', explanationJa: 'ノートは文字を書いたり記録したりする本です。', explanationEn: 'A notebook is used for writing and taking notes.', audioTextKo: '공책' },
  { grade: 1, section: 'grammar', titleKo: '에서', titleJa: '〜で', titleEn: 'At/in', promptKo: '저는 학교___ 한국어를 공부해요.', promptJa: '私は学校___韓国語を勉強します。', promptEn: 'I study Korean at school.', choices: ['에서', '에게', '부터', '하고'], answerIndex: 0, explanationKo: '행동이 일어나는 장소에는 에서를 씁니다.', explanationJa: '行動が起こる場所には「에서」を使います。', explanationEn: 'Use 에서 for the place where an action happens.', audioTextKo: '저는 학교에서 한국어를 공부해요.' },
  { grade: 1, section: 'reading', titleKo: '교실 안내', titleJa: '教室案内', titleEn: 'Classroom notice', promptKo: '지문: 한국어 수업은 삼 층 이백오 호에서 시작합니다. 수업 전에 이름을 적어 주세요.\n질문: 수업은 어디에서 시작합니까?', promptJa: '本文：韓国語の授業は三階二百五号室で始まります。授業の前に名前を書いてください。\n質問：授業はどこで始まりますか。', promptEn: 'Text: Korean class starts in room 205 on the third floor. Where does it start?', choices: ['삼 층 이백오 호', '도서관', '식당', '운동장'], answerIndex: 0, explanationKo: '수업 장소는 삼 층 이백오 호입니다.', explanationJa: '授業の場所は三階二百五号室です。', explanationEn: 'The class is in room 205 on the third floor.', audioTextKo: '한국어 수업은 삼 층 이백오 호에서 시작합니다.' },
  { grade: 1, section: 'listening', titleKo: '도서관 안내 듣기', titleJa: '図書館案内を聞く', titleEn: 'Listening to a library notice', promptKo: '도서관은 몇 시에 문을 엽니까?', promptJa: '図書館は何時に開きますか。', promptEn: 'What time does the library open?', choices: ['아홉 시', '일곱 시', '열두 시', '다섯 시'], answerIndex: 0, explanationKo: '안내에서 도서관은 아홉 시에 문을 연다고 합니다.', explanationJa: '案内では図書館は九時に開くと言っています。', explanationEn: 'The notice says the library opens at nine.', audioTextKo: '도서관은 아침 아홉 시에 문을 엽니다. 책을 빌리려면 학생증을 보여 주세요.' },
  { grade: 1, section: 'writing', titleKo: '좋아하는 수업', titleJa: '好きな授業', titleEn: 'Favourite class', promptKo: '좋아하는 수업과 이유를 한 문장으로 써 보세요.', promptJa: '好きな授業と理由を一文で書いてみましょう。', promptEn: 'Write one sentence about your favourite class and why.', explanationKo: '예: 저는 한국어 수업을 좋아해요. 친구와 이야기할 수 있어요.', explanationJa: '例：私は韓国語の授業が好きです。友だちと話せます。', explanationEn: 'Example: I like Korean class because I can talk with friends.', audioTextKo: '저는 한국어 수업을 좋아해요. 친구와 이야기할 수 있어요.' },

  { grade: 2, section: 'vocab', titleKo: '취미와 약속', titleJa: '趣味と約束', titleEn: 'Hobbies and plans', promptKo: '친구와 만나기로 한 시간을 무엇이라고 합니까?', promptJa: '友だちと会うことにした時間を何といいますか。', promptEn: 'What do you call a time arranged to meet a friend?', choices: ['약속', '시험', '주소', '사진'], answerIndex: 0, explanationKo: '약속은 만나거나 어떤 일을 하기로 정한 일입니다.', explanationJa: '約束は会ったり何かをしたりすると決めたことです。', explanationEn: 'An appointment is an arrangement to meet or do something.', audioTextKo: '약속' },
  { grade: 2, section: 'grammar', titleKo: '고 싶어요', titleJa: '〜したいです', titleEn: 'Want to', promptKo: '저는 주말에 영화를 보___ .', promptJa: '私は週末に映画を見___。', promptEn: 'I want to watch a movie this weekend.', choices: ['고 싶어요', '고 있어요', '면 안 돼요', '기 전에'], answerIndex: 0, explanationKo: '하고 싶은 일을 말할 때 고 싶어요를 씁니다.', explanationJa: 'したいことを言うときに「고 싶어요」を使います。', explanationEn: 'Use 고 싶어요 to say what you want to do.', audioTextKo: '저는 주말에 영화를 보고 싶어요.' },
  { grade: 2, section: 'reading', titleKo: '동아리 모집', titleJa: 'サークル募集', titleEn: 'Club recruitment', promptKo: '지문: 사진 동아리는 매주 토요일 오후에 모입니다. 카메라가 없어도 휴대전화로 참여할 수 있습니다.\n질문: 카메라가 없으면 어떻게 할 수 있습니까?', promptJa: '本文：写真サークルは毎週土曜日の午後に集まります。カメラがなくても携帯電話で参加できます。\n質問：カメラがない場合、どう参加できますか。', promptEn: 'Text: The photo club meets Saturday afternoons. How can you join without a camera?', choices: ['휴대전화로 참여한다', '참여할 수 없다', '새 카메라를 산다', '일요일에 간다'], answerIndex: 0, explanationKo: '카메라가 없어도 휴대전화로 참여할 수 있다고 했습니다.', explanationJa: 'カメラがなくても携帯電話で参加できるとあります。', explanationEn: 'You can join using a phone.', audioTextKo: '카메라가 없어도 휴대전화로 참여할 수 있습니다.' },
  { grade: 2, section: 'listening', titleKo: '약속 변경 듣기', titleJa: '約束変更を聞く', titleEn: 'Listening to a changed plan', promptKo: '두 사람은 언제 만나기로 합니까?', promptJa: '二人はいつ会うことにしますか。', promptEn: 'When do they decide to meet?', choices: ['토요일 오후', '금요일 아침', '월요일 밤', '오늘 점심'], answerIndex: 0, explanationKo: '원래 금요일 약속을 토요일 오후로 바꿉니다.', explanationJa: 'もとの金曜日の約束を土曜日の午後に変えます。', explanationEn: 'They change the plan to Saturday afternoon.', audioTextKo: '금요일에는 일이 있어서 어려워요. 그럼 토요일 오후에 만날까요? 네, 좋아요.' },
  { grade: 2, section: 'writing', titleKo: '친구 초대', titleJa: '友だちを招待する', titleEn: 'Inviting a friend', promptKo: '친구를 주말 활동에 초대하는 두 문장을 써 보세요.', promptJa: '友だちを週末の活動に招待する二文を書いてみましょう。', promptEn: 'Write two sentences inviting a friend to a weekend activity.', explanationKo: '예: 이번 토요일에 같이 전시회에 갈래요? 오후 두 시에 역 앞에서 만나요.', explanationJa: '例：今週の土曜日に一緒に展示会へ行きませんか。午後二時に駅の前で会いましょう。', explanationEn: 'Example: Would you like to go to an exhibition this Saturday? Let’s meet at two in front of the station.', audioTextKo: '이번 토요일에 같이 전시회에 갈래요? 오후 두 시에 역 앞에서 만나요.' },

  { grade: 3, section: 'vocab', titleKo: '건강과 습관', titleJa: '健康と習慣', titleEn: 'Health and habits', promptKo: '매일 반복해서 하는 생활 방식은 무엇입니까?', promptJa: '毎日繰り返して行う生活の仕方は何ですか。', promptEn: 'What is a way of living that you do repeatedly every day?', choices: ['습관', '교통', '표정', '가격'], answerIndex: 0, explanationKo: '습관은 자주 반복되어 자연스럽게 하게 되는 행동입니다.', explanationJa: '習慣はよく繰り返され自然にするようになる行動です。', explanationEn: 'A habit is an action repeated regularly.', audioTextKo: '습관' },
  { grade: 3, section: 'grammar', titleKo: '아/어야 하다', titleJa: '〜しなければならない', titleEn: 'Must', promptKo: '약을 먹기 전에 의사에게 물어보___ 해요.', promptJa: '薬を飲む前に医者に聞か___なりません。', promptEn: 'You must ask a doctor before taking medicine.', choices: ['아/어야', '고 싶어', '는 동안', '기 때문에'], answerIndex: 0, explanationKo: '필요하거나 의무인 일을 말할 때 아/어야 하다를 씁니다.', explanationJa: '必要なことや義務を言うときに「아/어야 하다」を使います。', explanationEn: 'Use 아/어야 하다 for something necessary or required.', audioTextKo: '약을 먹기 전에 의사에게 물어봐야 해요.' },
  { grade: 3, section: 'reading', titleKo: '병원 예약', titleJa: '病院予約', titleEn: 'Hospital appointment', promptKo: '지문: 진료를 받으려면 하루 전에 예약해야 합니다. 열이 높으면 예약 시간보다 일찍 병원에 오세요.\n질문: 열이 높으면 어떻게 해야 합니까?', promptJa: '本文：診療を受けるには一日前に予約しなければなりません。熱が高い場合は予約時間より早く病院に来てください。\n質問：熱が高い場合どうすべきですか。', promptEn: 'Text: If you have a high fever, what should you do?', choices: ['예약 시간보다 일찍 병원에 간다', '예약을 취소한다', '다음 달에 간다', '약속을 잊는다'], answerIndex: 0, explanationKo: '열이 높으면 예약 시간보다 일찍 오라고 안내합니다.', explanationJa: '熱が高い場合は予約時間より早く来るよう案内しています。', explanationEn: 'You should come to the hospital earlier than your appointment time.', audioTextKo: '열이 높으면 예약 시간보다 일찍 병원에 오세요.' },
  { grade: 3, section: 'listening', titleKo: '건강 상담 듣기', titleJa: '健康相談を聞く', titleEn: 'Listening to health advice', promptKo: '상담사는 먼저 무엇을 하라고 말합니까?', promptJa: '相談員はまず何をするように言いますか。', promptEn: 'What does the adviser say to do first?', choices: ['물을 충분히 마신다', '운동을 그만둔다', '밤새 일한다', '약을 나눈다'], answerIndex: 0, explanationKo: '상담사는 먼저 물을 충분히 마시고 쉬라고 말합니다.', explanationJa: '相談員はまず十分に水を飲んで休むよう言っています。', explanationEn: 'The adviser says to drink plenty of water and rest.', audioTextKo: '피곤할 때에는 먼저 물을 충분히 마시고 쉬세요. 증상이 계속되면 병원에 가야 합니다.' },
  { grade: 3, section: 'writing', titleKo: '생활 조언', titleJa: '生活の助言', titleEn: 'Lifestyle advice', promptKo: '친구에게 건강한 습관을 권하는 두 문장을 써 보세요.', promptJa: '友だちに健康的な習慣を勧める二文を書いてみましょう。', promptEn: 'Write two sentences recommending a healthy habit.', explanationKo: '예: 매일 같은 시간에 자는 것이 좋아요. 아침에 조금 걸어 보세요.', explanationJa: '例：毎日同じ時間に寝るといいです。朝に少し歩いてみてください。', explanationEn: 'Example: It is good to sleep at the same time every day. Try walking a little in the morning.', audioTextKo: '매일 같은 시간에 자는 것이 좋아요. 아침에 조금 걸어 보세요.' },

  { grade: 4, section: 'vocab', titleKo: '지역과 문화', titleJa: '地域と文化', titleEn: 'Local culture', promptKo: '한 지역에서 오래 이어져 온 생활 방식이나 예술은 무엇입니까?', promptJa: 'ある地域で長く続いてきた生活様式や芸術は何ですか。', promptEn: 'What is a way of life or art that has continued in a region for a long time?', choices: ['문화', '고장', '표', '운동'], answerIndex: 0, explanationKo: '문화는 한 사회나 지역의 생활 방식과 가치, 예술 등을 말합니다.', explanationJa: '文化は社会や地域の生活様式・価値・芸術などをいいます。', explanationEn: 'Culture includes a society’s or region’s ways of life, values, and arts.', audioTextKo: '문화' },
  { grade: 4, section: 'grammar', titleKo: '는 반면에', titleJa: '〜する一方で', titleEn: 'Whereas', promptKo: '이 전시회는 입장료가 싼 반면에 설명이 자세___ .', promptJa: 'この展示会は入場料が安い一方で説明が詳し___。', promptEn: 'This exhibition is inexpensive whereas its explanations are detailed.', choices: ['는 반면에', '고 싶어서', '아야 해서', '기로 하고'], answerIndex: 0, explanationKo: '두 가지 특징을 대비할 때 는 반면에를 씁니다.', explanationJa: '二つの特徴を対比するときに「는 반면에」を使います。', explanationEn: 'Use 는 반면에 to contrast two characteristics.', audioTextKo: '이 전시회는 입장료가 싼 반면에 설명이 자세해요.' },
  { grade: 4, section: 'reading', titleKo: '전시 관람 안내', titleJa: '展示観覧案内', titleEn: 'Exhibition notice', promptKo: '지문: 전시실 안에서는 사진을 찍을 수 있지만 플래시는 사용할 수 없습니다. 작품 가까이에서 음식물을 먹지 마세요.\n질문: 전시실에서 할 수 없는 것은 무엇입니까?', promptJa: '本文：展示室内では写真を撮れますが、フラッシュは使えません。作品の近くで飲食しないでください。\n質問：展示室でできないことは何ですか。', promptEn: 'Text: What can you not do in the exhibition room?', choices: ['플래시를 사용한다', '사진을 찍는다', '작품을 본다', '안내를 읽는다'], answerIndex: 0, explanationKo: '사진은 가능하지만 플래시 사용은 안 된다고 했습니다.', explanationJa: '写真は可能ですがフラッシュの使用はできないとあります。', explanationEn: 'Photography is allowed but flash is not.', audioTextKo: '전시실 안에서는 사진을 찍을 수 있지만 플래시는 사용할 수 없습니다.' },
  { grade: 4, section: 'listening', titleKo: '행사 변경 듣기', titleJa: '行事変更を聞く', titleEn: 'Listening to an event change', promptKo: '행사는 왜 실내에서 열립니까?', promptJa: '行事はなぜ室内で開かれますか。', promptEn: 'Why is the event held indoors?', choices: ['비가 올 가능성이 있어서', '표가 없어서', '음식이 없어서', '사람이 적어서'], answerIndex: 0, explanationKo: '비가 올 가능성 때문에 장소를 실내로 바꿨다고 합니다.', explanationJa: '雨の可能性のため会場を室内に変えたと言っています。', explanationEn: 'The venue changes indoors because rain is possible.', audioTextKo: '내일 비가 올 가능성이 있어서 행사는 문화관 안에서 열립니다. 시작 시간은 같습니다.' },
  { grade: 4, section: 'writing', titleKo: '문화 소개', titleJa: '文化紹介', titleEn: 'Introducing culture', promptKo: '다른 나라 친구에게 지역 문화를 소개하는 두 문장을 써 보세요.', promptJa: '他の国の友だちに地域の文化を紹介する二文を書いてみましょう。', promptEn: 'Write two sentences introducing local culture to an international friend.', explanationKo: '예: 우리 지역에서는 봄에 음악 축제를 엽니다. 많은 사람이 함께 노래를 듣고 음식을 나눕니다.', explanationJa: '例：私たちの地域では春に音楽祭を開きます。多くの人が一緒に音楽を聴き食べ物を分けます。', explanationEn: 'Example: Our region holds a music festival in spring. Many people listen to music and share food.', audioTextKo: '우리 지역에서는 봄에 음악 축제를 엽니다. 많은 사람이 함께 노래를 듣고 음식을 나눕니다.' },

  { grade: 5, section: 'vocab', titleKo: '사회 문제', titleJa: '社会問題', titleEn: 'Social issues', promptKo: '많은 사람이 함께 해결해야 하는 어려운 문제를 무엇이라고 합니까?', promptJa: '多くの人が一緒に解決すべき難しい問題を何といいますか。', promptEn: 'What do you call a difficult problem many people need to solve together?', choices: ['사회 문제', '인사말', '계절', '주소'], answerIndex: 0, explanationKo: '사회 문제는 사회 구성원에게 넓게 영향을 주어 함께 해결해야 하는 문제입니다.', explanationJa: '社会問題は社会の構成員に広く影響し、一緒に解決すべき問題です。', explanationEn: 'A social issue affects many people and needs collective solutions.', audioTextKo: '사회 문제' },
  { grade: 5, section: 'grammar', titleKo: '기 마련이다', titleJa: '〜するものだ', titleEn: 'Naturally tends to', promptKo: '새로운 제도에는 처음에 불편한 점이 생기___ .', promptJa: '新しい制度には最初不便な点が生じ___。', promptEn: 'New systems naturally tend to have inconvenient points at first.', choices: ['기 마련이다', '고 싶다', '면 된다', '는 중이다'], answerIndex: 0, explanationKo: '어떤 일이 당연히 그렇게 되기 쉽다는 뜻으로 기 마련이다를 씁니다.', explanationJa: 'あることが当然そうなりやすいという意味で「기 마련이다」を使います。', explanationEn: 'Use 기 마련이다 for something that naturally tends to happen.', audioTextKo: '새로운 제도에는 처음에 불편한 점이 생기기 마련이다.' },
  { grade: 5, section: 'reading', titleKo: '조사 결과', titleJa: '調査結果', titleEn: 'Survey results', promptKo: '지문: 조사에서는 버스 이용자가 늘었지만 저녁 시간에는 배차 간격이 길다는 의견이 많았다. 시는 이용자 수뿐 아니라 기다리는 시간도 함께 살펴보겠다고 했다.\n질문: 시가 함께 살펴보겠다고 한 것은 무엇입니까?', promptJa: '本文：調査ではバス利用者は増えたが、夜は運行間隔が長いという意見が多かった。市は利用者数だけでなく待つ時間も一緒に調べるとした。\n質問：市が一緒に調べるとしたものは何ですか。', promptEn: 'Text: What will the city examine along with passenger numbers?', choices: ['기다리는 시간', '버스 색', '운전사 이름', '표 가격만'], answerIndex: 0, explanationKo: '이용자 수뿐 아니라 기다리는 시간도 살펴보겠다고 했습니다.', explanationJa: '利用者数だけでなく待つ時間も調べるとあります。', explanationEn: 'The city will also examine waiting time.', audioTextKo: '시는 이용자 수뿐 아니라 기다리는 시간도 함께 살펴보겠다고 했다.' },
  { grade: 5, section: 'listening', titleKo: '토론 요약 듣기', titleJa: '討論要約を聞く', titleEn: 'Listening to a debate summary', promptKo: '화자는 토론 뒤에 무엇이 필요하다고 말합니까?', promptJa: '話者は討論の後に何が必要だと言っていますか。', promptEn: 'What does the speaker say is needed after the debate?', choices: ['의견을 정리할 시간', '즉시 투표', '자료 삭제', '회의 취소'], answerIndex: 0, explanationKo: '서로 다른 의견을 정리하고 추가 자료를 확인할 시간이 필요하다고 말합니다.', explanationJa: '異なる意見を整理し追加資料を確認する時間が必要だと言っています。', explanationEn: 'Time is needed to organise opinions and check additional material.', audioTextKo: '오늘은 여러 의견을 들었습니다. 바로 결론을 내리기보다 의견을 정리하고 자료를 더 확인할 시간이 필요합니다.' },
  { grade: 5, section: 'writing', titleKo: '의견문', titleJa: '意見文', titleEn: 'Opinion statement', promptKo: '한 사회 문제에 대한 의견과 이유를 두 문장으로 써 보세요.', promptJa: '一つの社会問題について意見と理由を二文で書いてみましょう。', promptEn: 'Write two sentences stating an opinion and reason about a social issue.', explanationKo: '예: 대중교통 정보를 더 쉽게 볼 수 있어야 합니다. 늦은 시간에 이동하는 사람에게 도움이 되기 때문입니다.', explanationJa: '例：公共交通の情報をもっと見やすくすべきです。遅い時間に移動する人の助けになるからです。', explanationEn: 'Example: Public transport information should be easier to see because it helps people travelling late.', audioTextKo: '대중교통 정보를 더 쉽게 볼 수 있어야 합니다. 늦은 시간에 이동하는 사람에게 도움이 되기 때문입니다.' },

  { grade: 6, section: 'vocab', titleKo: '연구와 비평', titleJa: '研究と批評', titleEn: 'Research and critique', promptKo: '주장이나 작품의 장점과 한계를 근거를 들어 평가하는 것은 무엇입니까?', promptJa: '主張や作品の長所と限界を根拠を挙げて評価することは何ですか。', promptEn: 'What is evaluating a claim or work’s strengths and limits with reasons?', choices: ['비평', '예약', '등록', '운동'], answerIndex: 0, explanationKo: '비평은 근거를 바탕으로 대상의 가치와 한계를 평가하는 일입니다.', explanationJa: '批評は根拠に基づいて対象の価値と限界を評価することです。', explanationEn: 'Critique evaluates value and limits based on reasons.', audioTextKo: '비평' },
  { grade: 6, section: 'grammar', titleKo: '는 셈이다', titleJa: '〜することになる', titleEn: 'In effect', promptKo: '이 방법을 선택하면 비용을 두 번 내___ .', promptJa: 'この方法を選ぶと費用を二度払うことにな___。', promptEn: 'Choosing this method means paying the cost twice.', choices: ['는 셈이다', '고 싶다', '기 전에', '는 동안'], answerIndex: 0, explanationKo: '결과적으로 어떤 의미가 된다고 설명할 때 는 셈이다를 씁니다.', explanationJa: '結果としてある意味になると説明するときに「는 셈이다」を使います。', explanationEn: 'Use 는 셈이다 to explain what something means in effect.', audioTextKo: '이 방법을 선택하면 비용을 두 번 내는 셈이다.' },
  { grade: 6, section: 'reading', titleKo: '정책 평가', titleJa: '政策評価', titleEn: 'Policy evaluation', promptKo: '지문: 정책 효과를 평가할 때 평균 수치만 보면 지역별 차이를 놓칠 수 있다. 특히 지원을 받기 어려운 집단의 경험을 함께 조사해야 정책의 한계를 알 수 있다.\n질문: 글쓴이가 함께 조사해야 한다고 한 것은 무엇입니까?', promptJa: '本文：政策効果を評価するとき平均値だけを見ると地域別の違いを見落とすことがある。特に支援を受けにくい集団の経験も一緒に調べてこそ政策の限界が分かる。\n質問：筆者が一緒に調べるべきだと述べたものは何ですか。', promptEn: 'Text: What should be studied together to understand policy limits?', choices: ['지원받기 어려운 집단의 경험', '평균 수치만', '정책 이름만', '발표 날짜만'], answerIndex: 0, explanationKo: '지원받기 어려운 집단의 경험을 함께 조사해야 한다고 했습니다.', explanationJa: '支援を受けにくい集団の経験も一緒に調べるべきだと述べています。', explanationEn: 'The experiences of groups with difficulty receiving support should also be studied.', audioTextKo: '평균 수치만 보면 지역별 차이를 놓칠 수 있다. 지원을 받기 어려운 집단의 경험도 함께 조사해야 한다.' },
  { grade: 6, section: 'listening', titleKo: '전문가 설명 듣기', titleJa: '専門家の説明を聞く', titleEn: 'Listening to an expert explanation', promptKo: '전문가는 결과를 어떻게 사용해야 한다고 말합니까?', promptJa: '専門家は結果をどのように使うべきだと言っていますか。', promptEn: 'How does the expert say results should be used?', choices: ['한계와 함께 해석한다', '즉시 일반화한다', '숨긴다', '무시한다'], answerIndex: 0, explanationKo: '결과를 바로 일반화하지 말고 자료의 한계와 함께 해석해야 한다고 말합니다.', explanationJa: '結果をすぐ一般化せず、資料の限界と一緒に解釈すべきだと言っています。', explanationEn: 'Results should be interpreted with their limitations, not immediately generalised.', audioTextKo: '이 결과는 중요한 자료입니다. 그러나 모든 상황에 바로 적용하기보다 자료의 한계와 함께 해석해야 합니다.' },
  { grade: 6, section: 'writing', titleKo: '비판적 제안', titleJa: '批判的提案', titleEn: 'Critical proposal', promptKo: '한 제도의 장점과 보완할 점을 각각 한 문장으로 써 보세요.', promptJa: '一つの制度の長所と補う点をそれぞれ一文で書いてみましょう。', promptEn: 'Write one sentence each about a system’s strength and what should improve.', explanationKo: '예: 이 제도는 필요한 정보를 빨리 제공한다는 장점이 있습니다. 다만 이용하기 어려운 사람을 위한 안내도 보완해야 합니다.', explanationJa: '例：この制度は必要な情報を早く提供する長所があります。ただし利用しにくい人のための案内も補うべきです。', explanationEn: 'Example: This system quickly provides needed information, but guidance for people who find it difficult to use should improve.', audioTextKo: '이 제도는 필요한 정보를 빨리 제공한다는 장점이 있습니다. 다만 이용하기 어려운 사람을 위한 안내도 보완해야 합니다.' },
];

export interface TopikOwnerBatch3Manifest {
  sourceCode: string;
  sourceAssetId: string;
  sourcePath: string;
  sourceSha256: string;
  counts: { units: number; items: number; stableRefs: number; audioBindings: number; contentRows: number };
}

function slug(item: Pick<ItemSeed, 'grade' | 'section'>): string { return `${item.grade}-${item.section}`; }
function unitId(item: ItemSeed): string { return `topik-owner-batch3-unit-${slug(item)}`; }
function itemId(item: ItemSeed): string { return `topik-owner-batch3-item-${slug(item)}`; }
function stableRef(item: ItemSeed): string { return `topik:owner:batch3:grade${item.grade}:${item.section}`; }
function answerJson(item: ItemSeed): string { return JSON.stringify(item.choices ? { choices: item.choices, answer_index: item.answerIndex } : { sample_answer_ko: item.explanationKo.replace(/^예: /, '') }); }

function unitStatement(item: ItemSeed): string {
  return ['INSERT OR IGNORE INTO `topik_owner_authored_curriculum_units`', '  (`id`, `target_grade`, `stable_ref`, `section`, `title_ko`, `title_ja`, `title_en`, `source_asset_id`)', `VALUES (${esc(unitId(item))}, ${item.grade}, ${esc(`topik:owner:batch3:grade${item.grade}:unit:${item.section}`)}, ${esc(item.section)}, ${esc(item.titleKo)}, ${esc(item.titleJa)}, ${esc(item.titleEn)}, ${esc(TOPIK_OWNER_BATCH_3_SOURCE_ASSET_ID)});`].join('\n');
}

function itemStatement(item: ItemSeed): string {
  return ['INSERT OR IGNORE INTO `topik_owner_authored_curriculum_items`', '  (`id`, `unit_id`, `target_grade`, `stable_ref`, `item_type`, `prompt_ko`, `prompt_ja`, `prompt_en`, `answer_json`, `explanation_ko`, `explanation_ja`, `explanation_en`, `audio_required`, `audio_text_ko`, `source_asset_id`)', `VALUES (${esc(itemId(item))}, ${esc(unitId(item))}, ${item.grade}, ${esc(stableRef(item))}, ${esc(item.section)}, ${esc(item.promptKo)}, ${esc(item.promptJa)}, ${esc(item.promptEn)}, ${esc(answerJson(item))}, ${esc(item.explanationKo)}, ${esc(item.explanationJa)}, ${esc(item.explanationEn)}, 1, ${esc(item.audioTextKo)}, ${esc(TOPIK_OWNER_BATCH_3_SOURCE_ASSET_ID)});`].join('\n');
}

function stableRefStatement(item: ItemSeed): string {
  return ['INSERT OR IGNORE INTO `learning_content_stable_refs`', '  (`stable_ref`, `learning_track`, `item_type`, `item_id`, `level_tag`, `source_asset_id`)', `VALUES (${esc(stableRef(item))}, 'topik-ko', 'topik-owner-item', ${esc(itemId(item))}, ${esc(`TOPIK-${item.grade}`)}, ${esc(TOPIK_OWNER_BATCH_3_SOURCE_ASSET_ID)});`].join('\n');
}

function audioBindingStatement(item: ItemSeed): string {
  return ['INSERT OR IGNORE INTO `content_speech_bindings`', '  (`id`, `stable_ref`, `item_type`, `item_id`, `language`, `speech_role`, `provider`, `binding_state`, `text_source`, `unavailable_reason`)', `VALUES (${esc(`speech-binding:${stableRef(item)}`)}, ${esc(stableRef(item))}, 'topik-owner-item', ${esc(itemId(item))}, 'ko', ${esc(item.section === 'listening' ? 'listening' : 'pronunciation')}, 'google-browser', 'ready', 'audio-script', NULL);`].join('\n');
}

export function topikOwnerBatch3ContentRowsSql(): string {
  return `SELECT (SELECT count(*) FROM topik_owner_authored_curriculum_units WHERE source_asset_id = ${esc(TOPIK_OWNER_BATCH_3_SOURCE_ASSET_ID)}) + (SELECT count(*) FROM topik_owner_authored_curriculum_items WHERE source_asset_id = ${esc(TOPIK_OWNER_BATCH_3_SOURCE_ASSET_ID)}) AS count;`;
}

export function buildTopikOwnerBatch3Plan() {
  const sourceSha256 = createHash('sha256').update(fs.readFileSync(TOPIK_OWNER_BATCH_3_PATH)).digest('hex');
  const statements = [
    ['INSERT INTO `sources` (`code`, `title`, `file_path`, `version`)', `VALUES (${esc(TOPIK_OWNER_BATCH_3_SOURCE_CODE)}, 'TOPIK 1~6급 자체 저작 Batch 3', 'docs/07_topik/04_owner_authored_grades_1_6_batch_3.md', ${esc(`source-v3-${sourceSha256.slice(0, 16)}`)})`, 'ON CONFLICT(`code`) DO UPDATE SET `title` = excluded.`title`, `file_path` = excluded.`file_path`, `version` = excluded.`version`, `updated_at` = unixepoch();'].join('\n'),
    ['INSERT OR IGNORE INTO `content_source_assets`', '  (`id`, `asset_kind`, `source_url`, `license_id`, `license_url`, `attribution_text`, `allowed_use`, `source_sha256`, `generated_at`, `selection_reason`)', `VALUES (${esc(TOPIK_OWNER_BATCH_3_SOURCE_ASSET_ID)}, 'self-authored-fixture', ${esc(REPOSITORY_URL)}, 'LicenseRef-nihongo-n3-self-authored', ${esc(LICENSE_URL)},`, "  '© Nihongo N3 contributors; self-authored TOPIK learning content.',", "  'Personal learning content; self-authored Korean prompts, scripts, questions, answers, and explanations; not official TOPIK material.',", `  ${esc(sourceSha256)}, 1785715200, 'Third operating TOPIK 1–6 self-authored curriculum batch with Google browser speech only; R2 pronunciation storage and fallback are disabled.');`].join('\n'),
    ...ITEMS.map(unitStatement), ...ITEMS.map(itemStatement), ...ITEMS.map(stableRefStatement), ...ITEMS.map(audioBindingStatement),
  ];
  const counts = { units: ITEMS.length, items: ITEMS.length, stableRefs: ITEMS.length, audioBindings: ITEMS.length, contentRows: ITEMS.length * 2 } as const;
  return {
    statements,
    manifest: {
      sourceCode: TOPIK_OWNER_BATCH_3_SOURCE_CODE,
      sourceAssetId: TOPIK_OWNER_BATCH_3_SOURCE_ASSET_ID,
      sourcePath: path.relative(REPO_ROOT, TOPIK_OWNER_BATCH_3_PATH).split(path.sep).join('/'),
      sourceSha256,
      counts,
    } satisfies TopikOwnerBatch3Manifest,
  };
}
