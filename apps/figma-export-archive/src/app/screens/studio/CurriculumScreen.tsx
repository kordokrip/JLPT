import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface CurriculumScreenProps {
  onNavigate: (screen: string, data?: any) => void;
}

interface WeekData {
  week: number;
  status: 'done' | 'current' | 'upcoming';
  title: string;
  vocabCount: number;
  grammarCount: number;
  listeningMinutes: number;
  topics: string[];
  vocabSamples: string[];
  grammarSamples: string[];
}

const curriculumData: WeekData[] = [
  {
    week: 1,
    status: 'done',
    title: '自己紹介と日常会話',
    vocabCount: 45,
    grammarCount: 3,
    listeningMinutes: 30,
    topics: ['挨拶', '自己紹介', '趣味'],
    vocabSamples: ['趣味 (しゅみ)', '最近 (さいきん)', '予定 (よてい)'],
    grammarSamples: ['〜ています (継続)', '〜たことがある (経験)', '〜そうです (様態)'],
  },
  {
    week: 2,
    status: 'done',
    title: '買い物と食事',
    vocabCount: 52,
    grammarCount: 4,
    listeningMinutes: 35,
    topics: ['レストラン', 'スーパー', '値段交渉'],
    vocabSamples: ['注文 (ちゅうもん)', '支払い (しはらい)', '領収書 (りょうしゅうしょ)'],
    grammarSamples: ['〜てください (依頼)', '〜ましょうか (提案)', '〜ほうがいい (助言)', '〜すぎる (過度)'],
  },
  {
    week: 3,
    status: 'done',
    title: '交通と道案内',
    vocabCount: 48,
    grammarCount: 3,
    listeningMinutes: 40,
    topics: ['電車', 'バス', '道順'],
    vocabSamples: ['乗り換え (のりかえ)', '改札口 (かいさつぐち)', '運賃 (うんちん)'],
    grammarSamples: ['〜たら (条件)', '〜ば (仮定)', '〜まで (期限)'],
  },
  {
    week: 4,
    status: 'done',
    title: '健康と病院',
    vocabCount: 43,
    grammarCount: 4,
    listeningMinutes: 30,
    topics: ['症状', '診察', '薬'],
    vocabSamples: ['頭痛 (ずつう)', '診察 (しんさつ)', '処方箋 (しょほうせん)'],
    grammarSamples: ['〜そうです (伝聞)', '〜ようです (推量)', '〜みたいです (比況)', '〜らしい (推定)'],
  },
  {
    week: 5,
    status: 'done',
    title: '仕事と職場',
    vocabCount: 55,
    grammarCount: 3,
    listeningMinutes: 45,
    topics: ['会議', 'メール', '電話応対'],
    vocabSamples: ['会議室 (かいぎしつ)', '資料 (しりょう)', '担当者 (たんとうしゃ)'],
    grammarSamples: ['〜ていただく (謙譲)', '〜てくださる (尊敬)', '〜させていただく (謙譲表現)'],
  },
  {
    week: 6,
    status: 'done',
    title: '天気と季節',
    vocabCount: 40,
    grammarCount: 4,
    listeningMinutes: 35,
    topics: ['天気予報', '気温', '季節行事'],
    vocabSamples: ['梅雨 (つゆ)', '台風 (たいふう)', '降水確率 (こうすいかくりつ)'],
    grammarSamples: ['〜によって (手段)', '〜について (関して)', '〜に対して (対比)', '〜にとって (立場)'],
  },
  {
    week: 7,
    status: 'current',
    title: '趣味と娯楽',
    vocabCount: 60,
    grammarCount: 5,
    listeningMinutes: 40,
    topics: ['映画', '音楽', 'スポーツ'],
    vocabSamples: ['映画館 (えいがかん)', '演奏 (えんそう)', '試合 (しあい)'],
    grammarSamples: ['〜ながら (同時)', '〜たり〜たりする (列挙)', '〜てばかりいる (反復)', '〜ことにする (決定)', '〜ことになる (状況)'],
  },
  {
    week: 8,
    status: 'upcoming',
    title: '旅行と観光',
    vocabCount: 50,
    grammarCount: 4,
    listeningMinutes: 40,
    topics: ['予約', '観光地', 'ホテル'],
    vocabSamples: ['宿泊 (しゅくはく)', '観光案内所 (かんこうあんないじょ)', 'お土産 (おみやげ)'],
    grammarSamples: ['〜つもりです (意図)', '〜予定です (計画)', '〜ために (目的)', '〜ように (目標)'],
  },
  {
    week: 9,
    status: 'upcoming',
    title: '家族と人間関係',
    vocabCount: 45,
    grammarCount: 3,
    listeningMinutes: 35,
    topics: ['家族構成', '親戚', '友人'],
    vocabSamples: ['親戚 (しんせき)', '近所 (きんじょ)', '先輩 (せんぱい)'],
    grammarSamples: ['〜ようになる (変化)', '〜なくなる (消失)', '〜始める (開始)'],
  },
  {
    week: 10,
    status: 'upcoming',
    title: '教育と学習',
    vocabCount: 48,
    grammarCount: 4,
    listeningMinutes: 40,
    topics: ['学校', '試験', '勉強法'],
    vocabSamples: ['入学 (にゅうがく)', '成績 (せいせき)', '卒業 (そつぎょう)'],
    grammarSamples: ['〜ばかりです (直後)', '〜ところです (時点)', '〜たばかりです (完了直後)', '〜つづける (継続)'],
  },
  {
    week: 11,
    status: 'upcoming',
    title: '住まいと生活',
    vocabCount: 42,
    grammarCount: 3,
    listeningMinutes: 30,
    topics: ['アパート', '引越し', '家事'],
    vocabSamples: ['家賃 (やちん)', '敷金 (しききん)', '契約 (けいやく)'],
    grammarSamples: ['〜おかげで (恩恵)', '〜せいで (原因)', '〜ため (理由)'],
  },
  {
    week: 12,
    status: 'upcoming',
    title: '文化と習慣',
    vocabCount: 47,
    grammarCount: 4,
    listeningMinutes: 40,
    topics: ['祭り', '伝統', 'マナー'],
    vocabSamples: ['祭り (まつり)', '神社 (じんじゃ)', '礼儀 (れいぎ)'],
    grammarSamples: ['〜べきです (義務)', '〜はずです (当然)', '〜わけです (道理)', '〜ものです (常識)'],
  },
  {
    week: 13,
    status: 'upcoming',
    title: 'メディアとニュース',
    vocabCount: 53,
    grammarCount: 4,
    listeningMinutes: 45,
    topics: ['新聞', 'テレビ', 'SNS'],
    vocabSamples: ['記事 (きじ)', '番組 (ばんぐみ)', '投稿 (とうこう)'],
    grammarSamples: ['〜によると (情報源)', '〜とのことです (伝聞)', '〜そうです (様子)', '〜ようです (推測)'],
  },
  {
    week: 14,
    status: 'upcoming',
    title: '自然と環境',
    vocabCount: 44,
    grammarCount: 3,
    listeningMinutes: 35,
    topics: ['自然', '環境問題', 'リサイクル'],
    vocabSamples: ['環境 (かんきょう)', '温暖化 (おんだんか)', '資源 (しげん)'],
    grammarSamples: ['〜ために (原因)', '〜せいで (責任)', '〜おかげで (恩恵)'],
  },
  {
    week: 15,
    status: 'upcoming',
    title: '感情と表現',
    vocabCount: 50,
    grammarCount: 5,
    listeningMinutes: 40,
    topics: ['気持ち', '意見', '感想'],
    vocabSamples: ['驚く (おどろく)', '残念 (ざんねん)', '嬉しい (うれしい)'],
    grammarSamples: ['〜がる (第三者の感情)', '〜てたまらない (耐えられない)', '〜てしょうがない (抑えられない)', '〜ずにはいられない (衝動)', '〜ないではいられない (抑制不能)'],
  },
  {
    week: 16,
    status: 'upcoming',
    title: '総復習と模擬試験',
    vocabCount: 80,
    grammarCount: 8,
    listeningMinutes: 60,
    topics: ['総復習', '弱点克服', '試験対策'],
    vocabSamples: ['復習 (ふくしゅう)', '弱点 (じゃくてん)', '対策 (たいさく)'],
    grammarSamples: ['全文法の総復習', '模擬試験', '実戦演習'],
  },
];

export function CurriculumScreen({ onNavigate }: CurriculumScreenProps) {
  const [expandedWeek, setExpandedWeek] = useState<number | null>(7);

  const toggleWeek = (week: number) => {
    setExpandedWeek(expandedWeek === week ? null : week);
  };

  return (
    <div className="max-w-[880px] mx-auto px-8 lg:px-20 py-12 pb-24">
      {/* Header */}
      <div className="mb-16">
        <h1 className="font-serif-jp text-[48px] font-normal text-foreground leading-none mb-3">
          16週間の計画
        </h1>
        <p className="text-[13px] text-muted font-pretendard">
          N3合格までの学習ロードマップ
        </p>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical Line */}
        <div className="absolute left-[80px] top-0 bottom-0 w-[1px] bg-border" />

        {/* Week Rows */}
        <div className="space-y-0">
          {curriculumData.map((week) => {
            const isExpanded = expandedWeek === week.week;

            return (
              <div key={week.week} className="relative">
                {/* Week Row */}
                <div
                  onClick={() => toggleWeek(week.week)}
                  className={`flex items-center py-6 cursor-pointer hover:bg-accent-soft/20 transition-colors px-4 -mx-4 rounded-lg ${
                    week.status === 'done' ? 'opacity-60' : ''
                  }`}
                >
                  {/* Week Number + Node */}
                  <div className="flex items-center gap-4 w-[120px]">
                    <span className="font-sans-jp text-[13px] text-muted">Week {week.week}</span>

                    {/* Timeline Node */}
                    <div className="relative z-10">
                      {week.status === 'done' && (
                        <div className="w-3 h-3 rounded-full bg-accent" />
                      )}
                      {week.status === 'current' && (
                        <div className="w-4 h-4 rounded-full border-[2px] border-accent bg-background animate-pulse-ring" />
                      )}
                      {week.status === 'upcoming' && (
                        <div className="w-3 h-3 rounded-full border border-border bg-background" />
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <div className="flex-1">
                    <h3 className={`font-sans-jp text-[15px] ${
                      week.status === 'current' ? 'text-accent font-medium' : 'text-foreground'
                    }`}>
                      {week.title}
                    </h3>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-6 text-[13px] text-muted">
                    <span className="font-pretendard">어휘 {week.vocabCount}</span>
                    <span className="font-pretendard">문법 {week.grammarCount}</span>
                    <span className="font-pretendard">{week.listeningMinutes}분</span>
                  </div>

                  {/* Chevron */}
                  <ChevronDown
                    className={`w-5 h-5 text-muted ml-4 transition-transform ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                    strokeWidth={1.5}
                  />
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="ml-[120px] pb-8 pr-4 bg-background rounded-b-lg -mt-2">
                    <div className="space-y-6 pt-6">
                      {/* Topics */}
                      <div>
                        <h4 className="font-sans-jp text-[13px] text-muted mb-3">トピック</h4>
                        <div className="flex gap-2 flex-wrap">
                          {week.topics.map((topic, i) => (
                            <span
                              key={i}
                              className="px-3 py-1 bg-accent-soft text-[11px] text-accent rounded-full"
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Vocab Samples */}
                      <div>
                        <h4 className="font-sans-jp text-[13px] text-muted mb-3">語彙サンプル</h4>
                        <div className="flex gap-2 flex-wrap">
                          {week.vocabSamples.map((vocab, i) => (
                            <span
                              key={i}
                              className="px-3 py-1 bg-card border border-border text-[13px] font-sans-jp rounded"
                            >
                              {vocab}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Grammar Samples */}
                      <div>
                        <h4 className="font-sans-jp text-[13px] text-muted mb-3">文法サンプル</h4>
                        <div className="space-y-2">
                          {week.grammarSamples.map((grammar, i) => (
                            <div
                              key={i}
                              className="text-[13px] font-sans-jp text-foreground"
                            >
                              • {grammar}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Action Button - Right aligned */}
                      {week.status === 'current' && (
                        <div className="pt-4 flex justify-end">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigate('browse', { week: week.week });
                            }}
                            className="px-5 py-2.5 bg-accent text-accent-foreground rounded-lg text-[13px] font-medium hover:opacity-90 transition-opacity"
                          >
                            今週の学習を始める
                          </button>
                        </div>
                      )}

                      {week.status === 'done' && (
                        <div className="pt-4 flex justify-end">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigate('review', { week: week.week });
                            }}
                            className="text-[13px] text-accent hover:opacity-80 transition-opacity"
                          >
                            この週を復習する →
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Spacer */}
      <div className="h-16" />
    </div>
  );
}