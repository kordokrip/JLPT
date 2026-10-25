// 강성호 2026-10-11: TOPIK 1 공개 개념20개에만 연결한 자체 저작 초안이다. 독립 의미 검수와 승인을 상속하지 않는다.
import type { DraftItem } from '../learning-path-2026-10-11/data.js';

type Localized = { ko: string; ja: string; en: string };
type L3 = readonly [ko: string, ja: string, en: string];
type Level = '1';
type ChoiceSection = 'vocab' | 'grammar' | 'reading' | 'listening';
type Case = { tag: string; stimulus: string; options: readonly [string,string,string,string]; correct: string; why: L3; audio?: string };
type ChoiceConcept = { key: string; level: Level; section: ChoiceSection; cue: L3; cases: readonly [Case,Case] };
type WritingCase = { tag: string; task: string; sample: L3; focus: L3 };
type WritingConcept = { key: string; level: Level; cue: L3; instruction: L3; cases: readonly [WritingCase,WritingCase] };

const l = ([ko,ja,en]: L3): Localized => ({ko,ja,en});
const same = (value: string): Localized => ({ko:value,ja:value,en:value});
const instructions: Record<ChoiceSection,L3> = {
  vocab:['다음 상황에 알맞은 한국어 표현을 고르십시오.','次の状況に合う韓国語表現を選んでください。','Choose the Korean expression that best fits the situation.'],
  grammar:['( )에 들어갈 가장 알맞은 표현을 고르십시오.','（ ）に入る最も適切な韓国語表現を選んでください。','Choose the most appropriate Korean expression for the blank.'],
  reading:['다음 글을 읽고 질문에 답하십시오.','次の韓国語の文章を読んで質問に答えてください。','Read the Korean passage and answer the question.'],
  listening:['음성을 듣고 질문에 답하십시오.','韓国語の音声を聞いて質問に答えてください。','Listen to the Korean audio and answer the question.'],
};

const C: ChoiceConcept[] = [
  {key:'lp4-topik-1-vocab-b1',level:'1',section:'vocab',cue:['처음 만날 때 쓰는 안녕하세요, 이름을 밝히는 저는 ~예요/이에요, 헤어질 때의 안녕히 가세요를 상황과 함께 구별합니다.','初対面の「안녕하세요」、名前を述べる「저는 ～예요/이에요」、別れ際の「안녕히 가세요」を場面と結び付けて区別します。','Distinguish 안녕하세요 for a first meeting, 저는 ~예요/이에요 for giving a name, and 안녕히 가세요 when someone leaves.'],cases:[
    {tag:'first-class-greeting',stimulus:'한국어 수업 첫날, 처음 만난 친구에게 먼저 무엇이라고 말합니까?',options:['안녕하세요','안녕히 가세요','미안합니다','잘 먹겠습니다'],correct:'안녕하세요',why:['처음 만난 사람에게 하는 인사입니다.','初めて会う人へのあいさつです。','It is the greeting used when meeting someone for the first time.']},
    {tag:'name-introduction',stimulus:'처음 만난 사람에게 자기 이름이 수진이라고 소개합니다. 알맞은 말은 무엇입니까?',options:['저는 수진이에요','수진 씨가 없어요','수진 씨를 만나요','수진 씨에게 가요'],correct:'저는 수진이에요',why:['자기 이름을 정중하게 밝히는 문장입니다.','自分の名前を丁寧に述べる文です。','It politely states the speaker’s own name.']}]},
  {key:'lp4-topik-1-grammar-b1',level:'1',section:'grammar',cue:['명사 받침이 있으면 이에요, 받침이 없으면 예요를 붙여 정중하게 동일성을 말하며, 학생이에요와 의사예요처럼 소리 내어 구별합니다.','名詞にパッチムがあれば「이에요」、なければ「예요」を付け、丁寧に同一性を述べます。「학생이에요」と「의사예요」を声に出して区別します。','Use 이에요 after a noun with a final consonant and 예요 after one without it, recalling 학생이에요 versus 의사예요 aloud.'],cases:[
    {tag:'student-final-consonant',stimulus:'저는 학생( ).',options:['이에요','예요','에서','하고'],correct:'이에요',why:['학생은 받침 ㅇ으로 끝나는 명사이므로 이에요가 붙습니다.','「학생」はパッチムㅇで終わる名詞なので「이에요」が付きます。','학생 ends in the final consonant ㅇ, so it takes 이에요.']},
    {tag:'doctor-no-final-consonant',stimulus:'제 언니는 의사( ).',options:['이에요','예요','으로','까지'],correct:'예요',why:['의사는 받침 없이 끝나는 명사이므로 예요가 붙습니다.','「의사」はパッチムなしで終わる名詞なので「예요」が付きます。','의사 ends without a final consonant, so it takes 예요.']}]},
  {key:'lp4-topik-1-reading-b1',level:'1',section:'reading',cue:['교실 안내에서 교실 번호, 수업 시각, 준비물을 찾아 숫자와 물건을 실제 행동으로 연결합니다.','教室案内から教室番号・授業時刻・持ち物を探し、数字と物を実際の行動に結び付けます。','Find room numbers, class times, and required materials in classroom notices and connect them to actions.'],cases:[
    {tag:'room-change-notice',stimulus:'[수업 안내] 오늘 한국어 수업은 201호가 아니라 305호에서 합니다. 수업은 오전 10시에 시작합니다.\n학생은 어디로 가야 합니까?',options:['201호','305호','도서관','식당'],correct:'305호',why:['오늘 수업 장소가 305호로 바뀌었다고 했습니다.','今日の授業場所は305号室に変わったと書かれています。','The notice says today’s class moved to room 305.']},
    {tag:'class-material-notice',stimulus:'[미술 수업] 내일은 색종이와 가위를 사용합니다. 공책은 가져오지 않아도 됩니다.\n학생이 가져올 것은 무엇입니까?',options:['공책과 연필','색종이와 가위','책과 우산','컵과 접시'],correct:'색종이와 가위',why:['안내에 내일 사용할 준비물로 색종이와 가위가 적혀 있습니다.','案内には明日の持ち物として色紙とはさみが書かれています。','The notice lists colored paper and scissors for tomorrow.']}]},
  {key:'lp4-topik-1-listening-b1',level:'1',section:'listening',cue:['짧은 자기소개에서 이름, 나라, 직업이나 신분을 한 항목씩 메모하고 비슷한 정보를 섞지 않습니다.','短い自己紹介では、名前・国・職業や身分を一項目ずつメモし、似た情報を混同しないようにします。','In a short introduction, note name, country, and occupation or status separately without mixing them.'],cases:[
    {tag:'student-from-japan',stimulus:'여자는 어느 나라에서 왔습니까?',options:['한국','일본','중국','미국'],correct:'일본',audio:'안녕하세요. 저는 유키예요. 일본에서 왔어요. 지금 한국어를 공부하는 학생이에요.',why:['여자가 일본에서 왔다고 직접 말했습니다.','女性は日本から来たと直接述べています。','The woman directly says she came from Japan.']},
    {tag:'cook-introduction',stimulus:'남자의 직업은 무엇입니까?',options:['학생','회사원','요리사','의사'],correct:'요리사',audio:'반갑습니다. 제 이름은 민호예요. 부산에 살고 식당에서 일하는 요리사예요.',why:['남자가 식당에서 일하는 요리사라고 소개했습니다.','男性は食堂で働く料理人だと自己紹介しました。','The man introduces himself as a cook working in a restaurant.']}]},
  {key:'lp4-topik-1-vocab-b2',level:'1',section:'vocab',cue:['부모, 형제자매, 할머니·할아버지 같은 가족 호칭을 화자와의 관계 그림이나 소개 문장에 연결해 떠올립니다.','父母・兄弟姉妹・祖父母などの家族呼称を、話者との関係図や紹介文に結び付けて思い出します。','Recall family terms such as parents, siblings, and grandparents by linking them to relationship diagrams or introductions.'],cases:[
    {tag:'mother-relation',stimulus:'“이분은 저를 낳아 주신 어머니입니다.”에서 이분은 누구입니까?',options:['어머니','누나','딸','할머니'],correct:'어머니',why:['화자가 자신을 낳아 준 여성 부모를 어머니라고 부릅니다.','話者を産んだ女性の親を「어머니」と呼びます。','The female parent who gave birth to the speaker is 어머니.']},
    {tag:'younger-brother-relation',stimulus:'민수는 남자이고 저보다 세 살 어립니다. 민수는 제 ( )입니다.',options:['형','아버지','남동생','할아버지'],correct:'남동생',why:['화자보다 어린 남자 형제이므로 남동생입니다.','話者より年下の男性のきょうだいなので「남동생」です。','A male sibling younger than the speaker is 남동생.']}]},
  {key:'lp4-topik-1-grammar-b2',level:'1',section:'grammar',cue:['사람·물건이 존재하는 장소에는 장소+에 있어요를 쓰며, 행동 장소를 나타내는 에서와 구별합니다.','人や物が存在する場所には「場所＋에 있어요」を使い、動作場所を表す「에서」と区別します。','Use place+에 있어요 for where a person or object exists, contrasting it with 에서 for an action location.'],cases:[
    {tag:'book-in-bag',stimulus:'책이 가방 안( ).',options:['에 있어요','에서 읽어요','을 있어요','와 있어요'],correct:'에 있어요',why:['책이 존재하는 장소가 가방 안이므로 에 있어요를 씁니다.','本が存在する場所がかばんの中なので「에 있어요」を使います。','The bag is the book’s location, so 에 있어요 is used.']},
    {tag:'bank-near-station',stimulus:'은행은 지하철역 앞( ).',options:['에서 만나요','에 있어요','를 있어요','에게 있어요'],correct:'에 있어요',why:['은행의 위치를 말하므로 장소 뒤에 에 있어요가 옵니다.','銀行の位置を述べるので、場所の後に「에 있어요」が来ます。','The sentence states the bank’s location, so 에 있어요 follows the place.']}]},
  {key:'lp4-topik-1-reading-b2',level:'1',section:'reading',cue:['가게 안내에서 여는 시각, 닫는 시각, 쉬는 요일을 달력과 시계에 표시해 방문 가능 여부를 판단합니다.','店の案内で開店時刻・閉店時刻・定休日をカレンダーと時計に印を付け、訪問可能か判断します。','Mark opening time, closing time, and closed days on a calendar and clock to decide whether a shop can be visited.'],cases:[
    {tag:'bakery-hours',stimulus:'[빵집] 오전 8시 문을 엽니다. 오후 7시 문을 닫습니다. 일요일은 쉽니다.\n빵집은 언제 쉽니까?',options:['월요일','금요일','토요일','일요일'],correct:'일요일',why:['가게 안내에 일요일은 쉰다고 적혀 있습니다.','店の案内に日曜日は休みだと書かれています。','The shop notice says it is closed on Sunday.']},
    {tag:'bookstore-closing',stimulus:'[책방] 월요일~토요일 10:00~20:00 / 일요일 12:00~18:00\n토요일에는 몇 시에 문을 닫습니까?',options:['오후 6시','오후 8시','오전 10시','낮 12시'],correct:'오후 8시',why:['토요일은 월요일~토요일 시간에 포함되어 20시에 닫습니다.','土曜日は月～土曜日の時間に含まれ、20時に閉店します。','Saturday follows the Monday–Saturday schedule and closes at 20:00.']}]},
  {key:'lp4-topik-1-listening-b2',level:'1',section:'listening',cue:['카페 주문에서 음료 종류, 온도, 개수, 추가 음식과 결제 요청을 따로 듣고 주문표처럼 정리합니다.','カフェの注文では、飲み物の種類・温度・数・追加の食べ物・会計依頼を分けて聞き、注文票のように整理します。','Separate drink type, temperature, quantity, added food, and payment request in a cafe order.'],cases:[
    {tag:'hot-coffee-order',stimulus:'손님은 무엇을 주문합니까?',options:['차가운 우유 한 잔','뜨거운 커피 한 잔','주스 두 잔','커피와 케이크'],correct:'뜨거운 커피 한 잔',audio:'직원: 무엇을 드릴까요? 손님: 뜨거운 커피 한 잔 주세요. 설탕은 넣지 마세요.',why:['손님이 뜨거운 커피 한 잔을 주문했습니다.','客は温かいコーヒーを一杯注文しました。','The customer orders one hot coffee.']},
    {tag:'tea-cake-order',stimulus:'손님이 함께 주문한 음식은 무엇입니까?',options:['샌드위치','과일','치즈 케이크','아이스크림'],correct:'치즈 케이크',audio:'손님: 레몬차 한 잔하고 치즈 케이크 하나 주세요. 직원: 여기에서 드세요? 손님: 네, 여기에서 먹을게요.',why:['레몬차와 함께 치즈 케이크를 주문했습니다.','レモンティーと一緒にチーズケーキを注文しました。','The customer orders cheesecake with the lemon tea.']}]},
  {key:'lp4-topik-1-vocab-b3',level:'1',section:'vocab',cue:['공책, 연필, 지우개, 교과서, 가위 같은 학교 물건을 쓰는 동작과 모양에 연결해 구별합니다.','ノート・鉛筆・消しゴム・教科書・はさみなどの学校用品を、使う動作や形に結び付けて区別します。','Distinguish school items such as notebooks, pencils, erasers, textbooks, and scissors by their use and shape.'],cases:[
    {tag:'erase-pencil-mark',stimulus:'연필로 잘못 쓴 글자를 지울 때 무엇을 사용합니까?',options:['지우개','공책','책상','가방'],correct:'지우개',why:['연필 자국을 지우는 학교 물건은 지우개입니다.','鉛筆の跡を消す学校用品は「지우개」です。','지우개 is the school item used to erase pencil marks.']},
    {tag:'write-class-notes',stimulus:'수업 내용을 적기 위해 책상 위에 펼치는 것은 무엇입니까?',options:['가위','필통','공책','칠판'],correct:'공책',why:['수업 내용을 직접 적는 종이 묶음은 공책입니다.','授業内容を直接書く紙の冊子は「공책」です。','A bound set of paper used for class notes is 공책.']}]},
  {key:'lp4-topik-1-grammar-b3',level:'1',section:'grammar',cue:['행동이 일어나는 장소에는 에서를 붙여 도서관에서 읽어요처럼 쓰고, 존재 위치의 에와 구별합니다.','動作が行われる場所には「에서」を付け、「도서관에서 읽어요」のように使い、存在場所の「에」と区別します。','Use 에서 for the place where an action occurs, as in 도서관에서 읽어요, contrasting it with 에 for existence.'],cases:[
    {tag:'study-at-library',stimulus:'저는 도서관( ) 공부해요.',options:['에','에서','을','하고'],correct:'에서',why:['공부하는 행동이 일어나는 장소이므로 에서를 씁니다.','勉強という動作が行われる場所なので「에서」を使います。','에서 marks the location where the action of studying occurs.']},
    {tag:'eat-at-cafeteria',stimulus:'학생들이 학교 식당( ) 점심을 먹어요.',options:['에서','에 있어요','에게','까지를'],correct:'에서',why:['점심을 먹는 행동 장소가 학교 식당이므로 에서가 맞습니다.','昼食を食べる動作場所が学校食堂なので「에서」が正解です。','에서 is correct because the cafeteria is where the eating action occurs.']}]},
  {key:'lp4-topik-1-reading-b3',level:'1',section:'reading',cue:['교실 규칙에서 해야 하는 행동, 하지 말아야 하는 행동, 물건을 두는 위치를 짧은 명령문으로 확인합니다.','教室の規則から、すること・してはいけないこと・物を置く場所を短い命令文で確認します。','Identify required actions, prohibited actions, and storage locations from short classroom rules.'],cases:[
    {tag:'phone-rule',stimulus:'[교실 약속] 수업 전에 휴대전화를 꺼 주세요. 물은 마셔도 됩니다. 음식은 교실 밖에서 먹으세요.\n수업 전에 무엇을 해야 합니까?',options:['물을 버립니다','음식을 먹습니다','휴대전화를 끕니다','교실을 나갑니다'],correct:'휴대전화를 끕니다',why:['교실 약속에 수업 전에 휴대전화를 끄라고 했습니다.','教室の約束に授業前に携帯電話を切るよう書かれています。','The classroom rule says to turn off phones before class.']},
    {tag:'umbrella-location',stimulus:'[비 오는 날] 젖은 우산은 교실 안에 가져오지 마세요. 문 옆 우산꽂이에 놓으세요.\n우산은 어디에 놓습니까?',options:['책상 위','가방 안','창문 앞','문 옆 우산꽂이'],correct:'문 옆 우산꽂이',why:['안내가 젖은 우산을 문 옆 우산꽂이에 놓으라고 합니다.','案内は濡れた傘をドア横の傘立てに置くよう指示しています。','The notice directs wet umbrellas to the stand beside the door.']}]},
  {key:'lp4-topik-1-listening-b3',level:'1',section:'listening',cue:['도서관 안내에서 층수, 대출 가능 수, 반납 장소, 조용히 해야 하는 구역을 숫자와 위치 중심으로 듣습니다.','図書館案内では、階・貸出冊数・返却場所・静かにする区域を、数字と位置を中心に聞き取ります。','Listen for floor numbers, borrowing limits, return locations, and quiet areas in a library notice.'],cases:[
    {tag:'children-room-floor',stimulus:'어린이 자료실은 몇 층에 있습니까?',options:['1층','2층','3층','4층'],correct:'2층',audio:'도서관을 이용해 주셔서 감사합니다. 어린이 자료실은 이층이고 일반 열람실은 삼층입니다. 엘리베이터는 입구 오른쪽에 있습니다.',why:['안내에서 어린이 자료실은 2층이라고 했습니다.','案内では児童資料室は2階だと言っています。','The announcement says the children’s room is on the second floor.']},
    {tag:'return-desk-time',stimulus:'문을 닫은 뒤 책을 어디에 반납합니까?',options:['안내 데스크','입구 반납함','어린이실','엘리베이터'],correct:'입구 반납함',audio:'책은 한 사람당 다섯 권까지 빌릴 수 있습니다. 도서관 문을 닫은 뒤에는 입구 왼쪽 반납함에 책을 넣어 주세요.',why:['폐관 뒤에는 입구 왼쪽 반납함에 넣으라고 했습니다.','閉館後は入口左側の返却箱に入れるよう案内しています。','After closing, books go in the return box to the left of the entrance.']}]},
  {key:'lp4-topik-1-vocab-b4',level:'1',section:'vocab',cue:['시장 품목인 채소, 과일, 생선, 고기와 세는 단위 개·마리·근을 실제 구매 장면에서 구별합니다.','市場の品物である野菜・果物・魚・肉と、数え方「개・마리・근」を実際の買い物場面で区別します。','Distinguish market goods—vegetables, fruit, fish, and meat—and counters such as 개, 마리, and 근 in shopping scenes.'],cases:[
    {tag:'fruit-purchase',stimulus:'과일 가게에서 빨간 사과 다섯 개를 샀습니다. 무엇을 샀습니까?',options:['사과','고등어','배추','돼지고기'],correct:'사과',why:['빨간 과일을 다섯 개 샀다고 했으므로 사과입니다.','赤い果物を五個買ったとあるので「사과」です。','The item is 사과 because five red fruits were purchased.']},
    {tag:'fish-counter',stimulus:'생선 가게에서 고등어 두 ( )를 주세요.',options:['권','잔','마리','장'],correct:'마리',why:['동물인 생선을 세는 단위는 마리입니다.','動物である魚を数える単位は「마리」です。','마리 is the counter used for animals, including fish.']}]},
  {key:'lp4-topik-1-grammar-b4',level:'1',section:'grammar',cue:['동사 어간 뒤의 -(으)세요로 정중한 명령이나 권유를 만들며, 받침 뒤 으세요와 모음 뒤 세요를 앉으세요·가세요로 구별합니다.','動詞語幹の後の「-(으)세요」で丁寧な命令・勧誘を作り、パッチム後の「으세요」と母音後の「세요」を「앉으세요・가세요」で区別します。','Form polite commands or invitations with -(으)세요, distinguishing 앉으세요 after a final consonant from 가세요 after a vowel.'],cases:[
    {tag:'seat-request',stimulus:'여기에 앉( ).',options:['으세요','았어요','으려고','을까요'],correct:'으세요',why:['앉다의 어간 앉-은 받침으로 끝나므로 으세요가 붙습니다.','「앉다」の語幹「앉-」はパッチムで終わるので「으세요」が付きます。','The stem 앉- ends in a final consonant, so it takes 으세요.']},
    {tag:'entrance-direction',stimulus:'이쪽으로 오( ).',options:['으세요','세요','고 싶어요','았어요'],correct:'세요',why:['오다의 어간 오-는 모음으로 끝나므로 세요가 붙어 오세요가 됩니다.','「오다」の語幹「오-」は母音で終わるので「세요」が付き「오세요」となります。','The stem 오- ends in a vowel, so it takes 세요, forming 오세요.']}]},
  {key:'lp4-topik-1-reading-b4',level:'1',section:'reading',cue:['분실물 안내에서 물건 이름, 색, 발견 장소, 찾는 곳과 시간을 표시해 자기 물건인지 판단합니다.','忘れ物案内で品名・色・発見場所・受取場所と時間に印を付け、自分の物か判断します。','Mark the item, color, found location, collection place, and time in lost-property notices.'],cases:[
    {tag:'blue-bag-notice',stimulus:'[분실물] 파란 가방을 운동장에서 찾았습니다. 주인은 교무실로 오세요.\n가방은 어디에서 발견되었습니까?',options:['교무실','운동장','도서관','식당'],correct:'운동장',why:['안내에 파란 가방을 운동장에서 찾았다고 적혀 있습니다.','案内に青いかばんを運動場で見つけたと書かれています。','The notice says the blue bag was found on the playground.']},
    {tag:'glasses-collection',stimulus:'[안경을 찾습니다] 오늘 오전 9시 교실에서 검은 안경을 찾았습니다. 오후 5시까지 1층 안내실에서 보관합니다.\n안경을 찾으려면 어디로 가야 합니까?',options:['교실','운동장','1층 안내실','안경점'],correct:'1층 안내실',why:['안경을 오후 5시까지 1층 안내실에서 보관한다고 했습니다.','眼鏡は午後5時まで1階案内室で保管すると書かれています。','The glasses are kept at the first-floor information office until 5 p.m.']}]},
  {key:'lp4-topik-1-listening-b4',level:'1',section:'listening',cue:['시장 방송에서 할인 품목, 판매 위치, 시작·종료 시각, 수량 제한을 따로 메모해 구매 행동을 정합니다.','市場放送では、割引品・売場・開始終了時刻・数量制限を別々にメモし、買い物行動を決めます。','Note sale items, location, start/end time, and quantity limits separately in market announcements.'],cases:[
    {tag:'apple-sale-location',stimulus:'사과는 어디에서 할인합니까?',options:['1번 가게','2번 가게','3번 가게','시장 입구'],correct:'2번 가게',audio:'시장 안내입니다. 오늘 오후 세 시까지 이 번 가게에서 사과를 한 봉지에 오천 원에 팝니다.',why:['방송에서 2번 가게가 사과를 할인한다고 했습니다.','放送では2番店でりんごを割引販売すると言っています。','The announcement says shop number 2 has the apple sale.']},
    {tag:'fish-sale-time',stimulus:'고등어 할인은 언제 시작합니까?',options:['오전 9시','오전 11시','오후 1시','오후 5시'],correct:'오전 11시',audio:'잠시 후 오전 열한 시부터 생선 코너에서 고등어를 할인합니다. 한 사람은 두 마리까지 살 수 있습니다.',why:['고등어 할인은 오전 11시부터 시작한다고 했습니다.','さばの割引は午前11時から始まると言っています。','The mackerel sale begins at 11 a.m.']}]},

];

const W: WritingConcept[] = [
  {key:'lp4-topik-1-writing-b1',level:'1',cue:['자기소개에서 이름, 나라나 사는 곳, 하는 일, 좋아하는 것을 짧고 자연스러운 문장 순서로 말합니다.','自己紹介で、名前・国や居住地・仕事や身分・好きなことを短く自然な文の順序で述べます。','In a self-introduction, state name, country or home, role, and a preference in a short natural order.'],instruction:['다음 상황에 맞게 자신을 소개하는 한국어 3문장을 쓰십시오.','次の状況に合う韓国語の自己紹介を3文書いてください。','Write a three-sentence self-introduction in Korean for the situation.'],cases:[
    {tag:'language-class-introduction',task:'한국어 수업 첫날입니다. 이름, 온 나라, 좋아하는 활동을 말하십시오.',sample:['안녕하세요. 저는 유키이고 일본에서 왔어요. 저는 주말에 사진 찍는 것을 좋아해요.','こんにちは。私はユキで、日本から来ました。週末に写真を撮るのが好きです。','Hello. I am Yuki and I came from Japan. I like taking photos on weekends.'],focus:['인사, 이름과 출신, 실제 좋아하는 활동이 서로 다른 세 문장에 드러나는지 평가합니다.','あいさつ・名前と出身・実際に好きな活動が別々の三文に示されているか評価します。','Evaluate whether the greeting, name and origin, and a real preferred activity appear across three distinct sentences.']},
    {tag:'new-neighbor-introduction',task:'새 이웃을 처음 만났습니다. 이름, 사는 층, 직업을 말하십시오.',sample:['안녕하세요. 저는 김소라예요. 5층에 살고 병원에서 간호사로 일해요.','こんにちは。私はキム・ソラです。5階に住み、病院で看護師として働いています。','Hello. I am Kim Sora. I live on the fifth floor and work as a nurse at a hospital.'],focus:['첫인사, 이름, 사는 층과 직업이 상황에 맞는 정중한 문장으로 제시되는지 평가합니다.','初対面のあいさつ・名前・住む階と職業が、場面に合う丁寧な文で示されているか評価します。','Evaluate whether the greeting, name, floor, and occupation are stated politely for a first meeting.']}]},
  {key:'lp4-topik-1-writing-b2',level:'1',cue:['오늘 일정은 아침·오후·저녁 시간과 장소, 행동을 순서대로 연결하고 현재 계획을 간단한 해요체로 씁니다.','今日の予定は朝・午後・夕方の時刻、場所、行動を順に結び、現在の計画を簡単なヘヨ体で書きます。','Write today’s schedule in simple polite style, linking morning, afternoon, and evening times with places and actions in order.'],instruction:['주어진 상황에 맞는 오늘 일정을 한국어 3문장으로 쓰십시오.','与えられた状況に合う今日の予定を韓国語3文で書いてください。','Write a three-sentence Korean schedule for today.'],cases:[
    {tag:'student-day-schedule',task:'오전 9시 수업, 오후 1시 친구와 점심, 저녁 7시 도서관 공부를 순서대로 쓰십시오.',sample:['오전 9시에 한국어 수업이 있어요. 오후 1시에 친구와 식당에서 점심을 먹어요. 저녁 7시에는 도서관에서 공부해요.','午前9時に韓国語の授業があります。午後1時に友だちと食堂で昼食を食べます。午後7時には図書館で勉強します。','I have Korean class at 9 a.m. At 1 p.m., I eat lunch with a friend at a restaurant. At 7 p.m., I study at the library.'],focus:['세 시각, 수업·점심·공부 행동, 필요한 장소가 시간 순서로 정확히 연결되는지 평가합니다.','三つの時刻・授業、昼食、勉強の行動・必要な場所が時系列で正確につながるか評価します。','Evaluate whether all three times, actions, and needed places are connected in chronological order.']},
    {tag:'worker-day-schedule',task:'오전 8시 출근, 오후 6시 퇴근, 저녁 8시 집에서 운동하는 일정을 쓰십시오.',sample:['오전 8시에 회사에 출근해요. 오후 6시에 일을 끝내고 퇴근해요. 저녁 8시에는 집에서 운동해요.','午前8時に会社へ出勤します。午後6時に仕事を終えて退勤します。午後8時には家で運動します。','I go to work at 8 a.m. I finish work and leave at 6 p.m. At 8 p.m., I exercise at home.'],focus:['출근·퇴근·운동이 각각 맞는 시각 및 장소와 결합되고 순서가 자연스러운지 평가합니다.','出勤・退勤・運動がそれぞれ正しい時刻と場所に結び付き、順序が自然か評価します。','Evaluate whether commuting, leaving work, and exercise match the correct times and places in a natural order.']}]},
  {key:'lp4-topik-1-writing-b3',level:'1',cue:['좋아하는 수업을 과목 이름, 좋아하는 이유, 수업에서 하는 구체적 활동으로 소개합니다.','好きな授業を、科目名・好きな理由・授業で行う具体的活動で紹介します。','Describe a favorite class using the subject name, a reason for liking it, and a concrete class activity.'],instruction:['좋아하는 수업에 대해 한국어 3문장을 쓰십시오.','好きな授業について韓国語3文を書いてください。','Write three Korean sentences about a favorite class.'],cases:[
    {tag:'art-class-preference',task:'미술 수업을 좋아합니다. 좋아하는 이유와 수업에서 하는 일을 포함하십시오.',sample:['저는 미술 수업을 좋아해요. 여러 색으로 그림을 그리는 것이 재미있어요. 금요일에는 친구와 큰 포스터를 만들어요.','私は美術の授業が好きです。いろいろな色で絵を描くのが楽しいです。金曜日には友だちと大きなポスターを作ります。','I like art class. Drawing with many colors is fun. On Friday, I make a large poster with a friend.'],focus:['미술이라는 과목, 재미있다는 구체적 이유, 포스터 만들기 활동이 완전한 문장으로 표현되는지 평가합니다.','美術という科目・楽しいという具体的理由・ポスター作りの活動が完全な文で表されているか評価します。','Evaluate whether the art subject, a specific enjoyment reason, and the poster activity are expressed in complete sentences.']},
    {tag:'music-class-preference',task:'음악 수업을 좋아합니다. 좋아하는 이유와 수업에서 배우는 것을 포함하십시오.',sample:['제가 좋아하는 수업은 음악이에요. 노래를 함께 부르면 기분이 좋아요. 수업에서는 피아노와 한국 노래를 배워요.','私の好きな授業は音楽です。一緒に歌うと気分がよくなります。授業ではピアノと韓国の歌を学びます。','My favorite class is music. Singing together makes me feel good. In class, I learn piano and Korean songs.'],focus:['음악 과목, 함께 노래하는 이유, 피아노와 한국 노래라는 학습 활동이 구분되어 있는지 평가합니다.','音楽科目・一緒に歌う理由・ピアノと韓国の歌という学習活動が区別されているか評価します。','Evaluate whether the music subject, reason involving group singing, and learning activities are distinct.']}]},
  {key:'lp4-topik-1-writing-b4',level:'1',cue:['가게에서 물건 이름과 가격, 색·크기·수량을 묻거나 요청할 때 얼마예요, 있어요, 주세요를 목적에 맞게 씁니다.','店で品名・値段・色・大きさ・数量を尋ねたり頼んだりする時、「얼마예요・있어요・주세요」を目的に合わせて使います。','Use 얼마예요, 있어요, and 주세요 appropriately to ask about an item’s price, color, size, or quantity in a shop.'],instruction:['가게 상황에 맞는 한국어 대화 3문장을 쓰십시오.','店の状況に合う韓国語の会話を3文書いてください。','Write a three-sentence Korean dialogue for the shop situation.'],cases:[
    {tag:'shirt-size-question',task:'옷 가게에서 파란 셔츠의 큰 사이즈가 있는지 묻고 가격도 물으십시오.',sample:['손님: 이 파란 셔츠, 큰 사이즈도 있어요? 직원: 네, 여기 있습니다. 손님: 이 셔츠는 얼마예요?','客：この青いシャツ、大きいサイズもありますか。店員：はい、こちらにあります。客：このシャツはいくらですか。','Customer: Is this blue shirt available in a large size? Clerk: Yes, here it is. Customer: How much is this shirt?'],focus:['파란 셔츠와 큰 사이즈, 재고 질문, 가격 질문이 대화 역할에 맞게 포함되는지 평가합니다.','青いシャツと大きいサイズ・在庫質問・価格質問が会話の役割に合って含まれるか評価します。','Evaluate whether the blue shirt, large size, availability question, and price question fit the dialogue roles.']},
    {tag:'market-fruit-purchase',task:'시장에서 사과 가격을 묻고 사과 세 개를 달라고 하십시오.',sample:['손님: 사과 한 개에 얼마예요? 상인: 한 개에 천 원이에요. 손님: 그러면 사과 세 개 주세요.','客：りんごは一個いくらですか。店員：一個千ウォンです。客：では、りんごを三個ください。','Customer: How much is one apple? Vendor: It is 1,000 won each. Customer: Then please give me three apples.'],focus:['사과 한 개의 가격 질문, 가격 답변, 세 개라는 정확한 수량 요청이 자연스럽게 이어지는지 평가합니다.','りんご一個の価格質問・価格回答・三個という正確な数量依頼が自然につながるか評価します。','Evaluate whether the unit-price question, price answer, and request for exactly three apples form a natural exchange.']}]},
];

export const TOPIK1_CONCEPT_CUES: Record<string,Localized> = Object.fromEntries(
  [...C,...W].map((concept) => [concept.key,l(concept.cue)]),
);

const choiceItems: Array<DraftItem & {context_tag:string}> = C.flatMap((concept) =>
  concept.cases.map((item,variant) => {
    const sectionOffset = ({vocab:0,grammar:1,reading:2,listening:3} as const)[concept.section];
    const conceptIndex = C.filter((candidate) => candidate.section === concept.section).findIndex((candidate) => candidate.key === concept.key);
    const answer = ((conceptIndex * 2 + variant + sectionOffset) % 4) as 0|1|2|3;
    const options = item.options.filter((option) => option !== item.correct);
    options.splice(answer,0,item.correct);
    return {
      id:`${concept.key}-authored-${variant+1}`,concept_key:concept.key,track:'topik-ko' as const,level:'1',
      section:concept.section,difficulty:1 as const,context_tag:item.tag,
      question:l([`${instructions[concept.section][0]}\n${item.stimulus}`,`${instructions[concept.section][1]}\n${item.stimulus}`,`${instructions[concept.section][2]}\n${item.stimulus}`]),
      choices:options.map(same),answer_index:answer,
      explanation:l([`정답은 “${item.correct}”입니다. ${item.why[0]}`,`正解は韓国語の「${item.correct}」です。${item.why[1]}`,`The correct Korean answer is “${item.correct}.” ${item.why[2]}`]),
      ...(item.audio?{audio_script:item.audio}:{}),
    };
  }),
);

const writingItems: Array<DraftItem & {context_tag:string}> = W.flatMap((concept) =>
  concept.cases.map((item,variant) => ({
    id:`${concept.key}-authored-${variant+1}`,concept_key:concept.key,track:'topik-ko',level:'1',section:'writing',difficulty:1,
    context_tag:item.tag,
    question:l([`${concept.instruction[0]}\n${item.task}`,`${concept.instruction[1]}\n${item.task}`,`${concept.instruction[2]}\n${item.task}`]),
    explanation:l(['상황에 필요한 정보를 빠뜨리지 않고 초급 수준의 자연스러운 한국어로 씁니다.','場面に必要な情報を漏らさず、初級レベルの自然な韓国語で書きます。','Write all information required by the situation in natural beginner-level Korean.']),
    sample:l(item.sample),rubric:l(item.focus),
  })),
);

export const TOPIK1_ITEMS: Array<DraftItem & {context_tag:string}> = [...choiceItems,...writingItems];
