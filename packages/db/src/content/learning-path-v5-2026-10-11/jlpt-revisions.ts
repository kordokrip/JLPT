// 강성호 2026-10-11: 동결 v4의 JLPT 의미 검수 결함만 별도 v5에서 수정한다. 작성 패치는 공개 승인이 아니다.
import type { DraftItem } from '../learning-path-2026-10-11/data.js';

// New authored corrections only. Frozen v4 inputs and failed reviews remain immutable.
// These patches are not reviewer approvals; all v5 items require fresh independent review.
const L = (ko: string, ja: string, en: string) => ({ ko, ja, en });
const Q = (text: string) => L(`문맥에 맞는 답을 고르세요.\n${text}`, `文脈に合う答えを選んでください。\n${text}`, `Choose the answer that fits the context.\n${text}`);
const R = (text: string) => L(`「 」 안의 읽기를 고르세요.\n${text}`, `「 」の中の読みを選んでください。\n${text}`, `Choose the reading of the text in 「 」.\n${text}`);
const A = (text: string) => L(`음성을 듣고 답하세요.\n${text}`, `音声を聞いて答えてください。\n${text}`, `Listen and answer.\n${text}`);
const C = (...values: string[]) => values.map((value) => L(value, value, value));

export const JLPT_V5_ITEM_PATCHES: Record<string, Partial<DraftItem>> = {
  'lp4-n5-vocab_mc-3': {
    question: Q('田中さんは学校で日本語を教えています。分からない漢字を、この（　）に聞きました。'),
    choices: C('先生', '学生', '医者', '店員'),
    explanation: L('학교에서 일본어를 가르치는 다나카 씨의 직업은 先生(선생님)입니다.', '学校で日本語を教えている田中さんの職業は「先生」です。', '先生 is the occupation of Tanaka, who teaches Japanese at a school.'),
  },
  'lp4-n5-vocab_mc-4': {
    question: Q('学生はみんな席に座っています。（　）が教室に入って、「今日の授業を始めます」と言いました。'),
    choices: C('駅員', '店員', '先生', '医者'),
    explanation: L('학생들에게 수업 시작을 알리는 사람은 先生입니다.', '学生に授業の開始を告げる人は「先生」です。', '先生 is the person announcing the start of the lesson to the students.'),
  },
  'lp4-n5-vocab_mc-8': {
    question: Q('同じクラスの山田さんとは、いつも一緒に遊びます。私の誕生日に、この（　）から電話が来ました。'),
    explanation: L('같은 반에서 늘 함께 노는 야마다 씨는 友達(친구)입니다.', '同じクラスでいつも一緒に遊ぶ山田さんは「友達」です。', '友達 describes Yamada, a classmate the speaker regularly plays with.'),
  },
  'lp4-n5-grammar_fill-3': { choices: C('に', 'で', 'を', 'へ') },
  'lp4-n5-grammar_fill-5': { choices: C('に', 'を', 'で', 'が') },
  'lp4-n5-grammar_fill-9': {
    question: Q('夜にコーヒーを飲むと、眠れなくなります。だから、夜はコーヒーを飲み（　）。'),
    explanation: L('커피를 마시면 잠들 수 없으므로 밤에는 마시지 않습니다. 정중한 부정은 飲みません입니다.', '飲むと眠れなくなるので、夜は飲まないという意味です。丁寧な否定は「飲みません」です。', 'Coffee prevents sleep, so the speaker does not drink it at night. 飲みません is the polite negative form.'),
  },
  'lp4-n5-grammar_fill-10': {
    question: Q('日曜日は会社が休みです。私は毎週、家でゆっくり休みます。日曜日は会社へ行き（　）。'),
    explanation: L('일요일마다 회사는 쉬고 집에서 쉬므로 회사에 가지 않는다는 行きません이 맞습니다.', '毎週日曜日は会社が休みで、家で休むので、「行きません」が合います。', 'The office is closed and the speaker rests at home every Sunday, so 行きません fits.'),
  },
  'lp4-n5-kanji_reading-10': {
    question: R('この「川」で魚を見ました。'), choices: C('やま', 'かわ', 'うみ', 'いけ'),
    explanation: L('川는 かわ로 읽고 강을 뜻합니다. 강에서 물고기를 본 상황입니다.', '「川」は「かわ」と読みます。川で魚を見た場面です。', '川 is read かわ and means river. The speaker saw fish in the river.'),
  },
  'lp4-n5-listening-4': {
    question: A('女の人は、パソコンについてだれに聞きますか。'),
    choices: C('山田さん', '佐藤さん', '鈴木さん', '田中さん'),
    audio_script: '女：パソコンが動きません。山田さん、分かりますか。男：私は分かりません。田中さんに聞いてください。田中さんはシステムエンジニアです。女：そうですか。ありがとうございます。田中さんのところへ行きます。',
    explanation: L('여자는 컴퓨터 문제로 야마다 씨에게 물었지만, 시스템 엔지니어인 다나카 씨에게 가기로 합니다. 따라서 田中さん입니다.', '山田さんは分からないので、女性はシステムエンジニアの田中さんに聞きに行きます。答えは「田中さん」です。', 'Yamada cannot help, so the woman will go to Tanaka, a systems engineer, about the computer problem. The answer is 田中さん.'),
  },
  'lp4-n4-vocab_mc-1': {
    question: Q('土曜日は一人で掃除をして、本を読むつもりです。この週末の（　）を手帳に書きました。'),
    choices: C('予定', '連絡', '必要', '経験'),
    explanation: L('주말에 앞으로 하려는 일을 적었으므로 予定(예정·계획)가 맞습니다.', '週末にこれからするつもりのことなので、「予定」が合います。', '予定 fits because the speaker writes down things planned for the coming weekend.'),
  },
  'lp4-n4-grammar_fill-2': {
    question: Q('道を間違えないように、歩いている間もずっと手元の地図を見（　）、駅まで歩きました。'),
  },
  'lp4-n4-grammar_fill-3': {
    question: Q('昨日、電車に財布を忘れ（　）。すぐ駅に電話しましたが、まだ見つかりません。困っています。'),
    choices: C('てあります', 'るつもりです', 'てしまいました', 'ておきました'),
    explanation: L('지갑을 두고 내려 곤란해진 과거의 실수이므로 忘れてしまいました가 맞습니다. 일부러 둔 준비나 앞으로의 의도가 아닙니다.', '財布を忘れて困っているので、過去の残念な失敗を表す「忘れてしまいました」が合います。準備や今後の予定ではありません。', '忘れてしまいました expresses the regrettable past mistake. This was neither deliberate preparation nor a future intention.'),
  },
  'lp4-n4-grammar_fill-4': {
    question: Q('宿題は昨日、全部終わっ（　）。今日は何も残っていないので、遊びに行けます。'),
    choices: C('てはいけません', 'てみます', 'ておきます', 'てしまいました'),
    explanation: L('어제 숙제가 완전히 끝나 오늘 남은 것이 없다는 완료를 終わってしまいました로 나타냅니다.', '昨日すべて終わり、今日は残っていないという完了を「終わってしまいました」で表します。', '終わってしまいました expresses complete finishing: all homework was finished yesterday, leaving none today.'),
  },
  'lp4-n4-grammar_fill-5': {
    question: Q('参加する人は全員、申込書の提出が必要です。私は参加するので、明日の締め切りまでに出さ（　）。'),
  },
  'lp4-n4-grammar_fill-6': {
    question: Q('入り口に「土足禁止」と書いてあります。この部屋に入る人は、靴を脱が（　）。'),
    explanation: L('土足禁止는 신발을 신고 들어갈 수 없다는 규칙입니다. 따라서 脱がなければなりません으로 벗을 의무를 나타냅니다.', '「土足禁止」という規則があるので、「脱がなければなりません」で靴を脱ぐ義務を表します。', 'The no-outdoor-shoes rule creates an obligation, expressed by 脱がなければなりません.'),
  },
  'lp4-n4-grammar_fill-8': {
    question: Q('前は毎日バスで通っていました。引っ越してからは、バスを使わず毎日自転車で通う（　）。'),
    choices: C('ところでした', 'ようになりました', 'ためでした', 'つもりでした'),
    explanation: L('이사 전에는 버스, 이사 후에는 매일 자전거를 이용하는 실제 습관 변화이므로 通うようになりました입니다. 계획이나 막 하려던 일이 아닙니다.', 'バス通勤から毎日の自転車通勤へ実際に習慣が変わったので、「通うようになりました」です。予定や直前の状況ではありません。', '通うようになりました describes an actual change in habit from taking the bus to cycling daily, not an intention or an imminent action.'),
  },
  'lp4-n4-grammar_fill-7': {
    question: Q('前は漢字が読めませんでした。毎日練習したので、今は一人で本が読めます。漢字が読める（　）。'),
    choices: C('ようになりました', 'ことにしました', 'ためになりました', 'ところでした'),
    explanation: L('전에는 못 읽었지만 지금은 읽을 수 있다는 실제 능력의 변화를 読めるようになりました로 나타냅니다.', '以前は読めず、今は読めるという実際の能力の変化なので、「読めるようになりました」です。', '読めるようになりました expresses an actual gain in ability: the speaker could not read kanji before but can now.'),
  },
  'lp4-n4-kanji_reading-2': {
    question: R('あたたかい「春」に、家族と花を見に行きます。'), choices: C('なつ', 'はる', 'あき', 'ふゆ'),
    explanation: L('春는 はる(봄)입니다. 가족과 꽃을 보러 가는 계절입니다.', '「春」は「はる」です。家族と花を見に行く季節です。', '春 is read はる, spring, when this family goes to see flowers.'),
  },
  'lp4-n4-kanji_reading-4': {
    question: R('暑い「夏」には、よく海で泳ぎます。'), choices: C('はる', 'あき', 'なつ', 'ふゆ'),
    explanation: L('夏는 なつ(여름)입니다. 더운 여름에 바다에서 수영하는 상황입니다.', '「夏」は「なつ」です。暑い季節に海で泳ぐ場面です。', '夏 is read なつ, summer. The sentence describes swimming in the sea in hot weather.'),
  },
  'lp4-n4-kanji_reading-5': {
    question: R('「秋」には、赤い葉を見に山へ行きます。'), choices: C('はる', 'あき', 'なつ', 'ふゆ'),
    explanation: L('秋는 あき(가을)입니다. 붉은 잎을 보러 산에 가는 상황입니다.', '「秋」は「あき」です。赤い葉を見に山へ行く場面です。', '秋 is read あき, autumn. The speaker goes to the mountains to see red leaves.'),
  },
  'lp4-n4-kanji_reading-6': {
    question: R('学校の運動会は「秋」にあります。'), choices: C('あつ', 'あけ', 'あく', 'あき'),
    explanation: L('秋는 あき입니다. 이 문장에서는 학교 운동회가 열리는 계절을 말합니다.', '「秋」は「あき」です。学校の運動会が開かれる季節を示しています。', '秋 is read あき. Here it identifies the season of the school sports day.'),
  },
  'lp4-n4-kanji_reading-8': {
    question: R('この町は「冬」に雪がたくさん降ります。'), choices: C('はる', 'ふゆ', 'あき', 'なつ'),
    explanation: L('冬는 ふゆ(겨울)입니다. 이 마을에 눈이 많이 내리는 계절을 말합니다.', '「冬」は「ふゆ」です。この町で雪がたくさん降る季節です。', '冬 is read ふゆ, winter, the season when this town receives a lot of snow.'),
  },
  'lp4-n3-vocab_mc-03': {
    question: Q('出張が一日延びたので、帰りの新幹線の予約を金曜日から土曜日に（　）しました。'),
  },
  'lp4-n3-vocab_mc-07': {
    question: Q('進学先を自分だけでは決められません。担任の先生に（　）して、どの学校が合うか助言をもらうことにしました。'),
  },
  'lp4-n3-vocab_mc-08': {
    question: Q('天井の水漏れをどう直せばよいか分からず、解決方法について管理会社に（　）しました。'),
    choices: C('変更', '相談', '準備', '影響'),
    explanation: L('해결 방법에 관해 조언을 구했으므로 相談입니다. 変更은 변경, 準備는 준비, 影響은 영향을 뜻합니다.', '解決方法について助言を求めたので「相談」です。「変更」は変えること、「準備」は用意、「影響」は他への作用です。', '相談 means seeking advice on a solution. 変更 means change, 準備 preparation, and 影響 an effect.'),
  },
  'lp4-n3-vocab_mc-09': {
    question: Q('事故がどこでどのように起きたのか、詳しい（　）がまだ分からないため、警察が現場を調べています。'),
  },
  'lp4-n3-vocab_mc-10': {
    question: Q('会議の最初に、各チームが、どこまで終わって何が残っているかという作業の進行（　）を説明しました。'),
  },
  'lp4-n3-grammar_fill-07': {
    question: Q('会社にそうした決まりはありませんが、私は誤解を防ぐため、自分で気をつけて送信前にメールを読み直す（　）。'),
  },
  'lp4-n3-grammar_fill-08': {
    question: Q('家族との決まりではなく、自分の睡眠のために続けている工夫です。私は寝る一時間前から携帯電話を見ない（　）。'),
  },
  'lp4-n3-kanji_reading-09': {
    explanation: L('連絡는 れんらく로 읽으며 연락을 뜻합니다. 連의 음독은 れん입니다.', '「連絡」は「れんらく」と読み、知らせを伝えることです。「連」の音読みは「れん」です。', '連絡 is read れんらく and means contacting someone. The on-reading of 連 is れん.'),
  },
  'lp4-n2-vocab_mc-01': {
    question: Q('細かい申請手続きは各学部に任せる一方、大学は研究費を若手の育成に優先配分するという基本（　）を示した。'),
  },
  'lp4-n2-vocab_mc-03': {
    question: Q('停電時には、まず電源を切り、次に装置を固定し、最後に退出します。この作業（　）を確認してから、実験を始めてください。'),
  },
  'lp4-n2-vocab_mc-02': {
    question: Q('修復作業の順序ではなく、作品を選ぶ基準を話し合った。美術館は、古い作品を優先して保存するという基本（　）を決めた。'),
    explanation: L('작업 단계가 아니라 어떤 작품을 우선할지 정한 기본 방향이므로 方針입니다. 방침이 반드시 장기적인 것은 아닙니다.', '作業の段階ではなく、どの作品を優先するかという基本的な方向なので「方針」です。方針は長期のものに限りません。', '方針 is the guiding direction for choosing which works to prioritize, not the sequence of restoration steps. A policy need not be long-term.'),
  },
  'lp4-n2-grammar_fill-03': {
    question: Q('この資料室の利用規則には、身分証を受付に預けてから入室すると明記されている。利用者は全員、入室前に身分証を預ける（　）。'),
  },
  'lp4-n2-grammar_fill-04': {
    question: Q('年間の保守日程が正式に決まった。それによると、サーバーは毎月第一日曜日に点検する（　）。'),
  },
  'lp4-n2-grammar_fill-10': {
    question: Q('以前はほとんど採用されなかった若手の案が、今では各部署で少しずつ実現している。若い社員の提案を受け入れる文化が、着実に社内に広がり（　）。'),
    explanation: L('이전에는 거의 채택되지 않던 제안이 지금 여러 부서에서 점차 실현되는 실제 변화이므로 広がりつつある입니다. 장래의 우려만 말하는 かねない와 다릅니다.', '以前は採用されなかった案が現在は徐々に実現しているという変化なので、「広がりつつある」です。将来の懸念を表す「かねない」とは異なります。', '広がりつつある describes an observed ongoing change: proposals once rarely accepted are now gradually being implemented. It is not merely a feared future possibility expressed by かねない.'),
  },
  'lp4-n2-listening-05': {
    question: A('来週から実施する混雑対策はどれですか。'),
    choices: C('朝の混雑する時間帯だけ窓口を増やす', '窓口を増やさず営業時間を早める', '午後だけ窓口の係員を増やす', '朝の窓口を減らして券売機に誘導する'),
    audio_script: '女：朝の切符売り場ですが、営業開始を三十分早める案はどうなりましたか。男：早朝より七時半から九時に利用が集中するので、開始時刻は変えません。その時間帯に限って、普段使っていない窓口を一つ開けます。女：券売機だけで対応するのではないんですね。男：はい。窓口での案内が必要な方もいるので。来週から始め、午後はこれまでの体制に戻します。',
    explanation: L('영업 시작은 바꾸지 않고 7시 반~9시에만 평소 쓰지 않는 창구를 엽니다. 오후에는 기존 체제로 돌아갑니다.', '開始時刻は変えず、七時半から九時だけ予備の窓口を開け、午後は従来の体制に戻します。', 'Opening time stays unchanged; an additional counter operates only from 7:30 to 9:00, with the usual arrangement restored in the afternoon.'),
  },
  'lp4-n2-listening-06': {
    question: A('診療所がまず変更することは何ですか。'),
    choices: C('月曜午前の診察時間を延長する', '月曜午前だけ受付を一人体制から二人体制にする', '毎日、受付の人数を一人増やす', '月曜午前の予約枠を減らす'),
    audio_script: '男：月曜の午前は受付で待つ患者さんが多いですね。診察時間を延ばしましょうか。女：診察自体は予定どおり進んでいます。問題は受付が一人で、書類の確認に時間がかかることです。男：では受付を増員しますか。女：ええ。ただ、午後やほかの曜日は混まないので、月曜の午前だけ一人追加しましょう。予約枠は今までどおりにします。',
    explanation: L('병목은 진료가 아닌 서류 접수입니다. 월요일 오전에만 접수 인원을 한 명에서 두 명으로 늘리고 진료 시간·예약 수는 유지합니다.', '混雑の原因は診察ではなく書類の受付です。月曜午前だけ受付を一人から二人にし、診察時間と予約枠は変えません。', 'Paperwork at reception, not consultations, causes the queue. Only Monday-morning reception increases from one person to two; consultation hours and appointment slots stay unchanged.'),
  },
  'lp4-n1-grammar_fill-02': {
    question: Q('交渉の成否は、双方の譲歩の程度（　）。'),
  },
  'lp4-n1-grammar_fill-01': {
    explanation: L('いかんだ는 명사 뒤에 붙어 그것에 달렸음을 격식 있게 나타냅니다. 다음 연도에도 재정 지원을 계속할 수 있는지는 올해 성과에 달렸습니다.', '「いかんだ」は名詞に続き、それによって決まることを改まって表します。翌年度も助成を継続できるかは、今年度の成果に左右されます。', 'いかんだ follows a noun and formally states that something depends on it. Continued financial support next year depends on this year’s results.'),
  },
  'lp4-n1-kanji_reading-08': {
    explanation: L('遵法은 じゅんぽう입니다. 遵은 ジュン, 法은 이 단어에서 반탁음 ポウ로 읽습니다.', '「遵法」は「じゅんぽう」です。遵はジュン、法はこの語では半濁音のポウと読みます。', '遵法 is read じゅんぽう. 遵 is ジュン, and 法 has the semi-voiced reading ポウ in this compound.'),
  },
  'lp4-n1-listening-02': {
    question: A('委員長が次回までの課題として挙げたことは何ですか。'),
    choices: C('数値の転記ミスを訂正し、集計をやり直す', '結論を撤回して、代わりの提案を作る', '賛成者の人数を増やし、採決を早める', '数値が根拠として十分か、提案への論理が通るか確かめる'),
    audio_script: '男：数値の転記に誤りがないことは確認済みですし、採決を急ぐ必要もありません。結論の方向性には私も賛成です。ただ、数字が正確であることと、それが提案を支持するのに十分であることは別です。次回までに、この資料で主張を裏づけられるか、また、資料から提案に至る議論に飛躍がないかを検討してください。結論そのものを撤回するよう求めているわけではありません。',
    explanation: L('전사 오류는 이미 점검했고 결론 철회나 조기 표결은 요구하지 않습니다. 자료의 논거로서의 충분성과 제안까지의 논리적 연결이 남은 과제입니다.', '転記ミスの確認は済み、結論の撤回や早期採決も求めていません。残る課題は論拠の十分さと提案に至る論理の検討です。', 'Transcription has been checked, and neither withdrawal nor an early vote is requested. The remaining task is to assess evidential sufficiency and the reasoning leading to the proposal.'),
  },
  'lp4-n1-listening-05': {
    question: A('提案の妥当性を判断するため、次に追加する調査はどれですか。'),
    choices: C('利用者に操作上の困難を聞き取る調査', '同じ条件で待ち時間を再計算する調査', '職員だけを対象に画面の好みを尋ねる調査', '既存機器の処理速度だけを測り直す調査'),
    audio_script: '男：待ち時間の試算は条件を変えてもほぼ同じで、機器の処理速度も確認済みです。この案は妥当と言えますね。女：計算上の短縮だけでは判断できません。利用者が操作に迷えば、そこで時間がかかります。職員の好みを聞くのではなく、実際に使う方に試してもらい、どこで困るのか来週聞き取りましょう。男：分かりました。再計算より先に、利用者の経験を確かめるわけですね。',
    explanation: L('계산과 처리 속도는 이미 확인했습니다. 추가하는 것은 실제 이용자가 조작 중 겪는 어려움에 관한 듣기 조사입니다.', '試算と処理速度の確認は済んでいます。追加するのは実際の利用者が操作中に困る点の聞き取りです。', 'Calculations and processing speed have already been checked. The additional investigation asks actual users about difficulties encountered during operation.'),
  },
  'lp4-n1-listening-06': {
    question: A('委員会が公園の案を再評価する際、重点を置くのは何ですか。'),
    choices: C('工事費が当初の予算に収まるか', '車いすやベビーカーで無理なく移動できるか', '外観が周辺の景観と調和しているか', '完成時期が予定から遅れないか'),
    audio_script: '女：工事費と完成時期については、すでに条件を満たすと確認しました。外観も周囲の景観に合っています。ただ、その三点を満たすだけで、この案を妥当と判断してよいでしょうか。男：園路の図面が気になるということですか。女：はい。坂や狭い曲がり角が多いので、車いすやベビーカーで通る方には負担が残るかもしれません。男：では、その移動のしやすさを中心に再評価しましょう。',
    explanation: L('예산·완공 시기·경관은 이미 검토했습니다. 새 평가의 중심은 경사와 좁은 모퉁이가 휠체어·유모차 이동에 주는 부담입니다.', '予算・完成時期・景観は確認済みです。再評価の重点は、坂や狭い角が車いす・ベビーカーの移動に与える負担です。', 'Budget, timing, and appearance have been checked. Reassessment focuses on whether slopes and narrow corners hinder wheelchair and stroller mobility.'),
  },
  'lp4-n1-listening-07': {
    question: A('調査班がまず検証しようとしていることは何ですか。'),
    choices: C('窓口の苦情件数を数え直せば満足度が上がるか', '報告書の公表を早めれば不満が減るか', '回答者の構成が現場の声と集計のずれを生んでいないか', '同じ回答者に同じ質問をすれば集計ミスが見つかるか'),
    audio_script: '男：満足度は八割ですが、窓口では不満が絶えません。集計ミスでしょうか。女：計算は再確認済みです。むしろ、回答した人の多くがオンライン利用者で、窓口しか使わない人の意見が十分に入っていない可能性があります。男：では同じ人にもう一度尋ねますか。女：その前に、回答者が利用者全体をどこまで代表しているかを調べましょう。報告書の公表時期を変えても、この乖離の原因は分かりませんから。',
    explanation: L('집계 계산은 재확인했습니다. 온라인 이용자 중심의 응답자 구성이 창구 이용자의 불만을 제대로 반영하지 못했는지 먼저 검증합니다.', '計算は再確認済みです。オンライン利用者に偏った回答者構成が、窓口の不満との乖離を生んでいないかを先に検証します。', 'Calculations were rechecked. The team first examines whether an online-user-heavy sample underrepresents counter users and explains the gap.'),
  },
  'lp4-n1-listening-09': {
    question: A('責任者が求めている対応はどれですか。'),
    choices: C('誤った請求書を直ちに直し、確認手順も見直す', '請求書だけ直し、確認手順は現状を維持する', '全件の調査が終わってから請求書をまとめて直す', '確認手順を先に変え、発行済みの請求書はそのままにする'),
    audio_script: '男：同じ入力ミスが三件ありました。影響は小額ですが、ほかの請求書も全件調査してから訂正した方がよいでしょうか。女：判明している三件の訂正を調査終了まで待たせる必要はありません。すぐ対応してください。男：請求書を直せばよいですね。女：それだけではまた起こります。金額の大小にかかわらず、見逃した確認手順も見直してください。発行済みだからといって、そのままにするわけにはいきません。',
    explanation: L('확인된 세 건은 전수 조사 완료를 기다리지 않고 즉시 정정하며, 재발을 막기 위해 확인 절차도 함께 검토합니다.', '判明した三件は全件調査を待たずに訂正し、再発防止のため確認手順も見直します。', 'The three known errors must be corrected without waiting for the full audit, and the checking process must also be revised to prevent recurrence.'),
  },
};

export const JLPT_V5_CUE_PATCHES: Record<string, { ko: string; ja: string; en: string }> = {
  'lp4-jlpt-n5-listening-2': L('私は〜です는 자신을 소개하는 정중한 표현입니다. システムエンジニア는 시스템 엔지니어라는 직업입니다. 자기소개에서 직업을 알아듣고, 컴퓨터 문제를 누구에게 물을지 안내하는 대화에서는 사람 이름과 직업을 연결해 듣습니다.', '「私は〜です」は丁寧な自己紹介の形です。「システムエンジニア」は職業名です。自己紹介では仕事を聞き取り、パソコンの問題を誰に聞くかという会話では、名前と職業を結びつけます。', '私は〜です is a polite self-introduction. システムエンジニア names the occupation of systems engineer. Identify the job in an introduction, and connect the name and occupation when someone recommends whom to ask about a computer problem.'),
  'lp4-jlpt-n3-grammar-5': L('명사+に対して는 행동·감정의 대상이나 두 대상의 대비를 나타냅니다. 절을 대비할 때는 동사·い형용사의 보통형+のに対して, 명사·な형용사+なのに対して로 연결합니다. 兄は静かなのに対して、弟はよく話す는 형과 동생의 대비입니다. 대상·대비의 に対して와 단순 화제의 について를 구별합니다.', '名詞＋に対しては行為・感情の対象や二者の対比を表します。節を対比する場合は、動詞・イ形容詞の普通形＋のに対して、名詞・ナ形容詞＋なのに対してを使います。「兄は静かなのに対して、弟はよく話す」は二人の対比です。対象・対比の「に対して」と話題の「について」を区別します。', 'Noun + に対して marks an action or feeling’s target, or a contrast. To contrast clauses, use a plain-form verb/i-adjective + のに対して, or a noun/na-adjective + なのに対して. 兄は静かなのに対して、弟はよく話す contrasts two brothers. Distinguish target/contrast に対して from topic-marking について.'),
  'lp4-jlpt-n2-vocab-1': L('方針(ほうしん)은 판단·행동을 이끄는 기본 방향입니다. 手順은 일을 실행하는 단계의 순서입니다. 방침은 단기·장기 모두 가능하고 절차도 반복 사용할 수 있으므로 기간이나 일회성으로 구별하지 않습니다. 方針を定める는 방침을 정한다는 뜻입니다.', '方針（ほうしん）は判断・行動を導く基本的な方向で、手順は実行する段階の順序です。方針は短期・長期ともあり、手順も繰り返し使えるので、期間や一回性で区別しません。「方針を定める」と使います。', '方針 (ほうしん) is a guiding direction or policy; 手順 is the sequence of execution steps. Policies may be short- or long-term, and procedures may be repeated: duration or one-time use is not the distinction. 方針を定める means establishing a policy.'),
  'lp4-jlpt-n2-vocab-2': L('手順(てじゅん)은 작업을 진행하는 단계의 순서입니다. 方針은 기본 방향이고 手順은 그 일을 어떻게 순서대로 하는지입니다. 方針이 반드시 장기적인 것은 아니며 手順도 반복해서 쓸 수 있습니다. 手順を確認する는 절차를 확인한다는 뜻입니다.', '手順（てじゅん）は作業を進める段階の順序です。方針は基本的な方向、手順は具体的にどの順序で行うかです。方針は長期とは限らず、手順も繰り返し使えます。「手順を確認する」と使います。', '手順 (てじゅん) is the ordered sequence of a task. 方針 gives the basic direction; 手順 specifies how to proceed in order. A policy need not be long-term and a procedure may be reused. 手順を確認する means checking the procedure.'),
  'lp4-jlpt-n2-grammar-4': L('동사 ます형 어간+かねない는 바람직하지 않은 결과가 생길 우려를 나타냅니다. かねる는 상황·입장상 하기 어렵거나 할 수 없음을 나타내며 정중한 거절에도 쓰입니다. 단순한 능력 부족에 한정하지 않습니다. かもしれない는 좋고 나쁨을 정하지 않는 가능성입니다.', '動詞ます形の語幹＋かねないは、好ましくない結果が起こる恐れを表します。「かねる」は事情や立場から実行が難しい・できないことを表し、丁寧な断りにも使います。単なる能力不足に限りません。「かもしれない」は良し悪しを限定しない可能性です。', 'Verb stem + かねない warns of an undesirable possibility. かねる means an action is difficult or not possible given the circumstances or one’s position and can express a polite refusal; it is not limited to lack of ability. かもしれない expresses possibility without inherently marking it as good or bad.'),
  'lp4-jlpt-n5-vocab-1': L('学校(がっこう)는 학생들이 공부하는 학교입니다. 学校へ行きます는 학교에 갑니다, 学校で勉強します는 학교에서 공부합니다라는 뜻입니다.', '学校（がっこう）は児童・生徒が学ぶ場所です。「学校へ行きます」「学校で勉強します」のように使います。', '学校 (がっこう) is a school, a place where pupils study. 学校へ行きます means going to school; 学校で勉強します means studying at school.'),
  'lp4-jlpt-n4-grammar-4': L('ようになる는 이전과 달라진 상태·습관을 나타냅니다. 가능형+ようになる(読めるようになる)는 능력 습득, 사전형+ようになる(自転車で通うようになる)는 습관 변화를 나타냅니다. 스스로 하기로 결정한 ことにする와 구별합니다.', '「ようになる」は以前と異なる状態・習慣への変化を表します。可能形＋ようになる（読めるようになる）は能力の獲得、辞書形＋ようになる（自転車で通うようになる）は習慣の変化です。自分で決定する「ことにする」と区別します。', 'ようになる marks a change in state or habit. A potential form, as in 読めるようになる, marks acquired ability; a dictionary form, as in 自転車で通うようになる, marks a new habit. Distinguish this from deciding to do something with ことにする.'),
  'lp4-jlpt-n1-grammar-4': L('ないまでも는 높은 기준에는 미치지 못하더라도 낮은 기준은 충족함을 나타냅니다. 동사 ない형+までも(成功しないまでも), 명사·な형용사+でないまでも(完璧でないまでも)로 씁니다. わけではない는 전면 부정이 아니라 단정·일반화를 제한하는 표현이며, ないまでも의 양보와 구별합니다.', '「ないまでも」は高い基準には届かなくても、より低い基準は満たすという譲歩です。動詞のない形＋までも（成功しないまでも）、名詞・ナ形容詞＋でないまでも（完璧でないまでも）で使います。「わけではない」は全面否定ではなく、断定や一般化を限定する表現です。', 'ないまでも concedes that a higher standard may not be met while a lower one is. Use the verb negative form plus までも (成功しないまでも), or a noun/na-adjective plus でないまでも (完璧でないまでも). わけではない qualifies an assertion or generalization rather than expressing total negation; it differs from this concession.'),
  'lp4-jlpt-n1-vocab-4': L('乖離(かいり)는 기대·이론·보고와 실제 사이 등이 서로 동떨어진 상태입니다. 差는 일반적인 차이를 뜻하며 일시적인 차이로 한정되지 않습니다. 理想と現実の乖離처럼 무엇과 무엇이 벌어져 있는지 확인합니다.', '乖離（かいり）は、期待・理論・報告と実態などがかけ離れていることです。「差」は一般的な違いで、一時的なものに限りません。「理想と現実の乖離」のように比較する両者を確認します。', '乖離 (かいり) is a divergence, such as between expectations, theory or reports and reality. 差 is a general difference and is not restricted to temporary differences. Identify both sides in expressions such as 理想と現実の乖離.'),
};
