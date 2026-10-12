// 강성호 2026-10-11: 운영 N3 공개 개념 확인·ようにする에 연결한 자체 저작 대표와 서로 다른 재확인 상황이다.
import type { DraftItem } from "../learning-path-2026-10-11/data.js";
const L=(ko:string,ja:string,en:string)=>({ko,ja,en});
export const JLPT_REPRESENTATIVE_ITEMS: Array<DraftItem & {context_tag:string}> = [
  {id:"lp2-rep-n3-confirmation-a",concept_key:"lp2-jlpt-n3-vocab-1",track:"jlpt-ja",level:"N3",section:"vocab_mc",difficulty:3,context_tag:"travel-reservation-details",
    question:L("빈칸에 알맞은 말을 고르세요.\n予約票の名前と日付が正しいか、自分でもう一度（　）します。","空欄に合う言葉を選んでください。\n予約票の名前と日付が正しいか、自分でもう一度（　）します。","Choose the word that fits the blank.\n予約票の名前と日付が正しいか、自分でもう一度（　）します。"),
    choices:[L("確認","確認","確認"),L("延期","延期","延期"),L("招待","招待","招待"),L("返品","返品","返品")],answer_index:0,
    explanation:L("정답은 確認(かくにん, 확인)입니다. 예약표의 이름과 날짜가 맞는지 다시 살피는 행동입니다. 延期는 일정 미루기, 招待는 초대, 返品은 상품 반품으로 이 행동을 나타내지 않습니다.","正解は「確認（かくにん）」です。予約票の名前と日付が正しいか調べる行動を表します。「延期」は日程を延ばすこと、「招待」は人を招くこと、「返品」は商品を返すことです。","The answer is 確認 (かくにん), checking whether the name and date on a reservation are correct. 延期 means postponement, 招待 means invitation, and 返品 means returning goods; none describes this check.")},
  {id:"lp2-rep-n3-confirmation-b",concept_key:"lp2-jlpt-n3-vocab-1",track:"jlpt-ja",level:"N3",section:"vocab_mc",difficulty:3,context_tag:"shop-shipment-check",
    question:L("빈칸에 알맞은 말을 고르세요.\n発送する前に、注文内容と箱の中の商品が一致しているか（　）します。","空欄に合う言葉を選んでください。\n発送する前に、注文内容と箱の中の商品が一致しているか（　）します。","Choose the word that fits the blank.\n発送する前に、注文内容と箱の中の商品が一致しているか（　）します。"),
    choices:[L("交換","交換","交換"),L("確認","確認","確認"),L("転送","転送","転送"),L("登録","登録","登録")],answer_index:1,
    explanation:L("정답은 確認입니다. 주문 내용과 상품이 일치하는지 살피는 것입니다. 交換은 물건 바꾸기, 転送은 다른 곳으로 보내기, 登録은 정보 등록이므로 발송 전 대조하는 행동과 다릅니다.","正解は「確認」です。注文内容と商品が一致するかを調べます。「交換」は物を取り替えること、「転送」は別の場所に送ること、「登録」は情報を記録することなので、この照合とは異なります。","The answer is 確認: checking that the products match the order. 交換 is exchanging goods, 転送 is forwarding them, and 登録 is registering information, rather than checking a match before shipment.")},
  {id:"lp2-rep-n3-habit-a",concept_key:"lp2-jlpt-n3-grammar-4",track:"jlpt-ja",level:"N3",section:"grammar_fill",difficulty:3,context_tag:"personal-health-effort",
    question:L("스스로 의식적으로 계속 노력하는 습관을 나타내는 표현을 고르세요.\n健康のために、毎日階段を使う（　）。","自分で意識して続ける習慣を表す言い方を選んでください。\n健康のために、毎日階段を使う（　）。","Choose the expression for a habit you deliberately try to maintain.\n健康のために、毎日階段を使う（　）。"),
    choices:[L("予定でした","予定でした","予定でした"),L("ことができません","ことができません","ことができません"),L("ようにしています","ようにしています","ようにしています"),L("しかありません","しかありません","しかありません")],answer_index:2,
    explanation:L("정답은 ようにしています입니다. 건강을 위해 매일 계단을 이용하려고 의식적으로 노력한다는 뜻입니다. 予定でした는 과거 계획, ことができません은 불가능, しかありません은 다른 선택지가 없다는 뜻이므로 의식적으로 지속하는 습관과 다릅니다.","正解は「ようにしています」です。健康のため、毎日階段を使うことを意識して続けています。「予定でした」は過去の予定、「ことができません」は不可能、「しかありません」はほかに選択肢がないことを表し、意識して続ける習慣とは異なります。","The answer is ようにしています: deliberately trying to use the stairs every day for health. 予定でした describes a past plan, ことができません expresses inability, and しかありません means there is no other option, not a consciously maintained habit.")},
  {id:"lp2-rep-n3-habit-b",concept_key:"lp2-jlpt-n3-grammar-4",track:"jlpt-ja",level:"N3",section:"grammar_fill",difficulty:3,context_tag:"digital-privacy-effort",
    question:L("일상에서 스스로 주의하여 실천하는 노력을 나타내는 표현을 고르세요.\n個人情報を守るため、共有のパソコンではパスワードを保存しない（　）。","日常で自分から気をつけて実践する努力を表す言い方を選んでください。\n個人情報を守るため、共有のパソコンではパスワードを保存しない（　）。","Choose the expression for a precaution you consciously practise.\n個人情報を守るため、共有のパソコンではパスワードを保存しない（　）。"),
    choices:[L("ことがありました","ことがありました","ことがありました"),L("つもりでした","つもりでした","つもりでした"),L("はずがありません","はずがありません","はずがありません"),L("ようにしています","ようにしています","ようにしています")],answer_index:3,
    explanation:L("정답은 ようにしています입니다. 공유 컴퓨터에 비밀번호를 저장하지 않으려고 평소 주의하여 실천한다는 뜻입니다. ことがありました는 과거 경험, つもりでした는 과거 의도, はずがありません은 강한 부정을 나타내므로 현재의 의식적 노력과 다릅니다.","正解は「ようにしています」です。共有パソコンにパスワードを保存しないことを、普段から意識して実践しています。「ことがありました」は過去の経験、「つもりでした」は過去の意図、「はずがありません」は強い否定で、現在の努力とは異なります。","The answer is ようにしています: consciously avoiding password storage on shared computers. ことがありました is a past experience, つもりでした a past intention, and はずがありません a strong denial, not an ongoing deliberate precaution.")},
];
