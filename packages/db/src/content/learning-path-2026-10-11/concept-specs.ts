// 강성호 2026-10-11: 공개 canonical 학습 원본을 가리키는 신규 학습 경로 초안이다.
export type Localized = { ko: string; ja: string; en: string };

export type ConceptSpec = {
  key: string;
  track: 'jlpt-ja' | 'topik-ko';
  level: string;
  section: string;
  lookup: { type: 'vocab' | 'grammar' | 'kanji' | 'sentence' | 'topik-owner-item'; value: string };
  title: Localized;
  cue: Localized;
};

type JlptRow = readonly [value: string, ko: string, ja: string, en: string];

const JLPT: Record<string, Record<'vocab' | 'grammar' | 'kanji' | 'listening', readonly JlptRow[]>> = {
  N5: {
    vocab: [['学校','학교','学校','school'],['先生','선생님','先生','teacher'],['電車','전철','電車','train'],['友達','친구','友達','friend'],['朝ご飯','아침 식사','朝ご飯','breakfast']],
    grammar: [['は','화제 조사 は','助詞「は」','topic marker'],['を','목적격 조사 を','助詞「を」','object marker'],['に','시간·도착점의 に','助詞「に」','time/destination marker'],['で','행동 장소의 で','助詞「で」','action-location marker'],['ません','정중 부정 ません','丁寧な否定「ません」','polite negative']],
    kanji: [['日','날 일','日','day/sun'],['月','달 월','月','month/moon'],['人','사람 인','人','person'],['山','메 산','山','mountain'],['川','내 천','川','river']],
    listening: [['おはようございます。','아침 인사','朝のあいさつ','morning greeting'],['私はシステムエンジニアです。','직업 소개','職業の紹介','job introduction'],['毎朝6時に起きます。','기상 시간','起床時間','wake-up time'],['電車で会社へ行きます。','통근 수단','通勤手段','commuting method'],['寝る前に本を読みます。','취침 전 습관','就寝前の習慣','bedtime habit']],
  },
  N4: {
    vocab: [['予定','예정','予定','schedule'],['連絡','연락','連絡','contact'],['準備','준비','準備','preparation'],['必要','필요','必要','necessary'],['約束','약속','約束','appointment']],
    grammar: [['ながら','~하면서','〜ながら','while doing'],['てしまう','~해 버리다','〜てしまう','finish/regret'],['なければならない','~해야 한다','〜なければならない','must'],['ようになる','~하게 되다','〜ようになる','come to'],['かもしれない','~일지도 모른다','〜かもしれない','might']],
    kanji: [['会','모일 회','会','meet'],['社','모일 사','社','company/shrine'],['駅','역 역','駅','station'],['時','때 시','時','time'],['間','사이 간','間','interval']],
    listening: [['3時に駅で待ち合わせしよう。','세 시 역 약속','三時の駅での待ち合わせ','three o’clock station meeting'],['チケットは私が予約しておくね。','표 예약','チケットの予約','ticket reservation'],['いいね。何時に会う?','만날 시각 질문','会う時刻の質問','asking when to meet'],['何の映画が見たい?','영화 취향 질문','映画の希望を聞く','asking about a movie preference'],['アクション映画がいいかな。','액션 영화 선택','アクション映画の選択','choosing an action movie']],
  },
  N3: {
    vocab: [['確認','확인','確認','confirmation'],['変更','변경','変更','change'],['影響','영향','影響','influence'],['対応','대응','対応','response'],['状況','상황','状況','situation']],
    grammar: [['わけではない','~인 것은 아니다','〜わけではない','not necessarily'],['ことになっている','~하기로 되어 있다','〜ことになっている','be arranged to'],['おかげで','~덕분에','〜おかげで','thanks to'],['ようにする','~하도록 하다','〜ようにする','make an effort to'],['に対して','~에 대하여','〜に対して','toward/regarding']],
    kanji: [['確','확실할 확','確','certain'],['変','변할 변','変','change'],['議','의논할 의','議','deliberation'],['調','고를 조','調','investigate/tune'],['連','잇닿을 련','連','connect']],
    listening: [['この問題、難しそうだけど、解けないわけじゃない。','해결 가능성','解決の可能性','possibility of solving'],['雨が降りそうだから、傘を持っていったほうがいいよ。','우산 조언','傘についての助言','umbrella advice'],['天気予報によると、明日は晴れるそうだ。','내일 날씨','明日の天気','tomorrow’s weather'],['彼はもう来ているはずだよ。約束したから。','약속에 근거한 추측','約束に基づく推測','inference from a promise'],['これは本物に違いない。値段が高いから。','진품 판단','本物という判断','judging authenticity']],
  },
  N2: {
    vocab: [['方針','방침','方針','policy'],['手順','절차','手順','procedure'],['判断','판단','判断','judgment'],['効率','효율','効率','efficiency'],['課題','과제','課題','issue']],
    grammar: [['わけではない','~인 것은 아니다','〜わけではない','not necessarily'],['ことになっている','~하기로 되어 있다','〜ことになっている','be arranged to'],['に伴って','~에 따라','〜に伴って','along with'],['かねない','~할 수도 있다','〜かねない','may well'],['つつある','~해 가고 있다','〜つつある','be in progress']],
    kanji: [['対','대할 대','対','opposition'],['効','본받을 효','効','effect'],['判','판단할 판','判','judge'],['課','매길 과','課','section/task'],['議','의논할 의','議','deliberation']],
    listening: [['可能性を比較してから、最も効率のよい方法を選んだ。','가능성과 효율','可能性と効率','possibility and efficiency'],['資料の数字だけでなく、利用者の声も判断の根拠にした。','판단 근거','判断の根拠','basis for judgment'],['利用者が多い時間帯は、予備の窓口を開くことにした。','혼잡 시간 대응','混雑時間の対応','busy-hour response'],['変更の理由を省略すると、かえって誤解を招きかねない。','설명 누락 위험','説明不足の危険','risk of omitted explanation'],['作業の進み方は安定しつつあるが、確認は続ける。','진행 안정과 확인','進行の安定と確認','stable progress and checking']],
  },
  N1: {
    vocab: [['論拠','논거','論拠','grounds'],['脈絡','맥락','脈絡','context'],['妥当性','타당성','妥当性','validity'],['乖離','괴리','乖離','divergence'],['是正','시정','是正','correction']],
    grammar: [['いかんだ','~에 달려 있다','〜いかんだ','depend on'],['を余儀なくされる','~을 강요받다','〜を余儀なくされる','be forced to'],['ならでは','~만의','〜ならでは','unique to'],['ないまでも','~까지는 아니더라도','〜ないまでも','if not quite'],['を皮切りに','~을 시작으로','〜を皮切りに','starting with']],
    kanji: [['顕','나타날 현','顕','manifest'],['乖','어그러질 괴','乖','diverge'],['遂','이룰 수','遂','accomplish'],['衡','저울대 형','衡','balance'],['緩','느릴 완','緩','relax']],
    listening: [['結論だけでなく、その論拠と脈絡を順に確認する。','논거와 맥락 확인','論拠と脈絡の確認','checking grounds and context'],['数字の変化が顕著でも、原因が一つとは限らない。','수치와 원인','数値と原因','figures and causes'],['提案の妥当性は、利用者の見解も含めて検証する。','제안 검증','提案の検証','proposal validation'],['現場の実感と報告書の内容に乖離がないか調べた。','현장과 보고서의 괴리','現場と報告書の乖離','field-report divergence'],['小さな誤りでも早期に是正すれば、大きな懸念を防げる。','조기 시정','早期是正','early correction']],
  },
};

const loc = (ko: string, ja: string, en: string): Localized => ({ ko, ja, en });

export const JLPT_CONCEPTS: ConceptSpec[] = Object.entries(JLPT).flatMap(([level, groups]) =>
  (Object.entries(groups) as [keyof typeof groups, readonly JlptRow[]][]).flatMap(([section, rows]) =>
    rows.map(([value, ko, ja, en], index) => ({
      key: `jlpt-${level.toLowerCase()}-${section}-${index + 1}`,
      track: 'jlpt-ja' as const,
      level,
      section,
      lookup: { type: section === 'listening' ? 'sentence' as const : section, value },
      title: loc(ko, ja, en),
      cue: loc(`${ko}를 상황 속에서 구별한다.`, `${ja}を文脈で区別する。`, `Distinguish ${en} in context.`),
    })),
  ),
);

const TOPIK_TITLES: Record<number, readonly (readonly [string, string, string, string, string])[]> = {
  1: [['인사와 소개','이에요와 예요','교실 안내','짧은 자기소개 듣기','나를 소개하기'],['가족','에 있어요','가게 시간','카페 주문 듣기','오늘 일정'],['학교 물건','에서','교실 안내','도서관 안내 듣기','좋아하는 수업'],['시장 물건','으세요','분실물 안내','시장 방송','가게에서 묻기']],
  2: [['하루 일과','고 싶어요','약속 시간','전화 약속 듣기','간단한 약속 메시지'],['날씨와 계획','았어요와 었어요','초대 메시지','버스 안내 듣기','주말 기록'],['취미와 약속','고 싶어요','동아리 모집','약속 변경 듣기','친구 초대'],['대중교통','으려고 하다','버스 안내','환승 약속','주말 계획']],
  3: [['예약과 변경','기 때문에','도서관 공지','병원 예약 듣기','변경 요청하기'],['신청과 문의','는데','시설 이용 안내','회사 일정 듣기','정중한 이메일'],['건강과 습관','아/어야 하다','병원 예약','건강 상담 듣기','생활 조언'],['직장 전화','아/어서','회의 일정','업무 요청','정중한 부탁']],
  4: [['공공 서비스','는 바람에','신청 서류 안내','분실물 안내 듣기','공식 문의 쓰기'],['환경과 분리배출','도록','재활용 공지','기차 안내 듣기','제안서 문장'],['지역과 문화','는 반면에','전시 관람 안내','행사 변경 듣기','문화 소개'],['지역 정책','는 대신에','주민 설명회','행사 조정','제안 이메일']],
  5: [['의견과 근거','기는커녕','지역 교통 의견','회의 의견 듣기','의견을 근거와 함께 쓰기'],['비교와 평가','기는 하지만','지역 행사 평가','회의 보고 듣기','근거 있는 의견'],['사회 문제','기 마련이다','조사 결과','토론 요약 듣기','의견문'],['디지털 접근성','을 뿐만 아니라','이용자 조사','토론 요약','근거 있는 의견']],
  6: [['사회 현상 분석','는 한이 있더라도','정책 평가의 관점','토론의 결론 듣기','균형 잡힌 주장 쓰기'],['연구와 해석','기에','자료 공개 원칙','발표 결론 듣기','균형 있는 비평'],['연구와 비평','는 셈이다','정책 평가','전문가 설명 듣기','비판적 제안'],['자료 해석','에 비추어','조사 결과 해석','공청회 발언','비판적 논평']],
};
const TOPIK_SECTIONS = ['vocab','grammar','reading','listening','writing'] as const;

export const TOPIK_CONCEPTS: ConceptSpec[] = Object.entries(TOPIK_TITLES).flatMap(([gradeText, batches]) => {
  const grade = Number(gradeText);
  return batches.flatMap((titles, batchIndex) => titles.map((title, sectionIndex) => {
    const section = TOPIK_SECTIONS[sectionIndex]!;
    const batch = batchIndex + 1;
    return {
      key: `topik-${grade}-${section}-b${batch}`,
      track: 'topik-ko' as const,
      level: String(grade),
      section,
      lookup: { type: 'topik-owner-item' as const, value: `topik-owner-batch${batch}-item-${grade}-${section}` },
      title: loc(title, `${title}（韓国語）`, `${title} (Korean)`),
      cue: loc(`${title}의 핵심 표현을 실제 상황과 연결한다.`, `${title}の要点を実際の場面と結び付ける。`, `Connect the key language of ${title} to a real situation.`),
    };
  }));
});

export const CONCEPTS: ConceptSpec[] = [...JLPT_CONCEPTS, ...TOPIK_CONCEPTS];
