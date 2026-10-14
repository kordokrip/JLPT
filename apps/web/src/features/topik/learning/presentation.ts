const FOUNDATION_JA: Record<string, { title: string; objective: string; meanings: string[] }> = {
  'identity-greetings': { title: 'あいさつと自己紹介', objective: '自己紹介をし、基本的なあいさつを聞き取ります。', meanings: ['こんにちは。', '私はミンジです。', 'お会いできてうれしいです。'] },
  'places-movement': { title: '場所と移動', objective: '行き先と行動する場所を伝えます。', meanings: ['学校へ行きます。', '図書館で勉強します。', '家に帰ってきました。'] },
  'time-schedule': { title: '時間と予定', objective: '基本的な日付、時刻、約束を理解します。', meanings: ['今は2時です。', '金曜日に会いましょう。', '授業は9時に始まります。'] },
  'shopping-food': { title: '買い物と食事', objective: '食べ物を注文し、価格と数量を尋ねます。', meanings: ['コーヒーを一杯ください。', 'これはいくらですか。', 'キンパを二つ買いました。'] },
  'reasons-conditions': { title: '理由と条件', objective: '簡単な理由と条件付きの予定をつなげます。', meanings: ['雨が降ったので家にいました。', '時間があれば一緒に行きましょう。', '疲れていましたが運動しました。'] },
  'notices-sequence': { title: '案内と順序', objective: '短い案内と順番どおりの指示に従います。', meanings: ['先に番号札を取ってください。', '次に申込書を書いてください。', '今日は閉店します。'] },
};

export function foundationJa(id: string) { return FOUNDATION_JA[id] ?? { title: id, objective: '', meanings: [] }; }
