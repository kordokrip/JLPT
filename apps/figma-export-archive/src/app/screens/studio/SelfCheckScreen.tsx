import { useState } from 'react';
import { Check } from 'lucide-react';

interface SelfCheckScreenProps {
  onNavigate: (screen: string, data?: any) => void;
}

const skillAreas = [
  { id: 'vocab', label: '語彙', labelKr: '어휘', score: 75, maxScore: 100 },
  { id: 'grammar', label: '文法', labelKr: '문법', score: 68, maxScore: 100 },
  { id: 'reading', label: '読解', labelKr: '독해', score: 82, maxScore: 100 },
  { id: 'listening', label: '聴解', labelKr: '청해', score: 60, maxScore: 100 },
  { id: 'speaking', label: '会話', labelKr: '회화', score: 55, maxScore: 100 },
  { id: 'writing', label: '作文', labelKr: '작문', score: 70, maxScore: 100 },
];

const checklistSections = [
  {
    title: '基礎スキル',
    titleKr: '기초 스킬',
    items: [
      { id: 1, text: 'ひらがな・カタカナを読める', checked: true },
      { id: 2, text: '基本的な挨拶ができる', checked: true },
      { id: 3, text: '数字・日付が言える', checked: true },
      { id: 4, text: '自己紹介ができる', checked: true },
      { id: 5, text: '簡単な質問に答えられる', checked: true },
    ],
  },
  {
    title: 'N3 文法',
    titleKr: 'N3 문법',
    items: [
      { id: 6, text: '〜ながら (同時動作)', checked: true },
      { id: 7, text: '〜たり〜たりする (列挙)', checked: true },
      { id: 8, text: '〜ば / 〜たら (条件)', checked: true },
      { id: 9, text: '〜そうです (様態・伝聞)', checked: false },
      { id: 10, text: '〜ようです (推量)', checked: false },
    ],
  },
  {
    title: 'N3 語彙',
    titleKr: 'N3 어휘',
    items: [
      { id: 11, text: '日常会話 300語', checked: true },
      { id: 12, text: '仕事関連 200語', checked: true },
      { id: 13, text: '旅行・交通 150語', checked: false },
      { id: 14, text: '健康・医療 100語', checked: false },
      { id: 15, text: '文化・習慣 80語', checked: false },
    ],
  },
  {
    title: '実践スキル',
    titleKr: '실전 스킬',
    items: [
      { id: 16, text: 'レストランで注文できる', checked: true },
      { id: 17, text: '道を尋ねられる', checked: true },
      { id: 18, text: '電話で予約ができる', checked: false },
      { id: 19, text: '簡単なメールが書ける', checked: false },
      { id: 20, text: 'ニュースが理解できる', checked: false },
    ],
  },
  {
    title: '試験対策',
    titleKr: '시험 대비',
    items: [
      { id: 21, text: '模擬試験を1回受けた', checked: true },
      { id: 22, text: '弱点を把握している', checked: true },
      { id: 23, text: '時間配分を練習した', checked: false },
      { id: 24, text: '過去問を3回解いた', checked: false },
      { id: 25, text: '本番の形式に慣れた', checked: false },
    ],
  },
  {
    title: '学習習慣',
    titleKr: '학습 습관',
    items: [
      { id: 26, text: '毎日30分以上勉強', checked: true },
      { id: 27, text: 'SRS復習を継続', checked: true },
      { id: 28, text: '週1回模擬試験', checked: true },
      { id: 29, text: 'ネイティブと会話練習', checked: false },
      { id: 30, text: '日本語のコンテンツを楽しむ', checked: false },
    ],
  },
  {
    title: 'リスニング',
    titleKr: '듣기',
    items: [
      { id: 31, text: 'ゆっくりした会話が分かる', checked: true },
      { id: 32, text: '日常的な話題が聞き取れる', checked: true },
      { id: 33, text: '要点を掴める', checked: false },
      { id: 34, text: 'ニュースの概要が分かる', checked: false },
      { id: 35, text: '自然な速度でも理解できる', checked: false },
    ],
  },
];

export function SelfCheckScreen({ onNavigate }: SelfCheckScreenProps) {
  const [checkedItems, setCheckedItems] = useState<Set<number>>(
    new Set(checklistSections.flatMap(section =>
      section.items.filter(item => item.checked).map(item => item.id)
    ))
  );

  const toggleItem = (id: number) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(id)) {
      newChecked.delete(id);
    } else {
      newChecked.add(id);
    }
    setCheckedItems(newChecked);
  };

  const totalItems = checklistSections.reduce((sum, section) => sum + section.items.length, 0);
  const checkedCount = checkedItems.size;
  const completionRate = Math.round((checkedCount / totalItems) * 100);

  // Radar Chart - calculating polygon points
  const radarPoints = () => {
    const centerX = 140;
    const centerY = 140;
    const maxRadius = 120;
    const angleStep = (Math.PI * 2) / skillAreas.length;

    return skillAreas.map((area, i) => {
      const angle = angleStep * i - Math.PI / 2;
      const radius = (area.score / area.maxScore) * maxRadius;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      return `${x},${y}`;
    }).join(' ');
  };

  const radarAxes = () => {
    const centerX = 140;
    const centerY = 140;
    const maxRadius = 120;
    const angleStep = (Math.PI * 2) / skillAreas.length;

    return skillAreas.map((area, i) => {
      const angle = angleStep * i - Math.PI / 2;
      const x = centerX + maxRadius * Math.cos(angle);
      const y = centerY + maxRadius * Math.sin(angle);
      const labelX = centerX + (maxRadius + 30) * Math.cos(angle);
      const labelY = centerY + (maxRadius + 30) * Math.sin(angle);

      return (
        <g key={i}>
          <line
            x1={centerX}
            y1={centerY}
            x2={x}
            y2={y}
            stroke="var(--color-border)"
            strokeWidth="1"
          />
          <foreignObject
            x={labelX - 40}
            y={labelY - 20}
            width="80"
            height="40"
          >
            <div className="text-center">
              <div className="font-sans-jp text-[11px] text-foreground">{area.label}</div>
              <div className="font-pretendard text-[10px] text-muted">{area.score}%</div>
            </div>
          </foreignObject>
        </g>
      );
    });
  };

  return (
    <div className="max-w-[880px] mx-auto px-8 lg:px-20 py-12 pb-24">
      {/* Header */}
      <div className="mb-16">
        <h1 className="font-serif-jp text-[48px] font-normal text-foreground leading-none mb-3">
          自己診断
        </h1>
        <p className="text-[13px] text-muted font-pretendard">
          현재 실력 체크
        </p>
      </div>

      {/* Completion Rate */}
      <div className="card-hairline rounded-lg p-8 mb-12 bg-accent-soft/20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-sans-jp text-[18px] font-medium mb-2">完成度</h2>
            <p className="font-pretendard text-[13px] text-muted">
              {checkedCount} / {totalItems} 項目完了
            </p>
          </div>
          <div className="font-serif-jp text-[64px] text-accent">
            {completionRate}%
          </div>
        </div>
      </div>

      {/* Radar Chart */}
      <div className="mb-16">
        <h2 className="font-sans-jp text-[18px] font-medium mb-8">スキルバランス</h2>

        <div className="card-hairline rounded-lg p-12 flex justify-center">
          <svg width="280" height="280" viewBox="0 0 280 280">
            {/* Background circles */}
            <circle
              cx="140"
              cy="140"
              r="120"
              fill="none"
              stroke="var(--color-border)"
              strokeWidth="1"
              opacity="0.3"
            />
            <circle
              cx="140"
              cy="140"
              r="80"
              fill="none"
              stroke="var(--color-border)"
              strokeWidth="1"
              opacity="0.3"
            />
            <circle
              cx="140"
              cy="140"
              r="40"
              fill="none"
              stroke="var(--color-border)"
              strokeWidth="1"
              opacity="0.3"
            />

            {/* Axes */}
            {radarAxes()}

            {/* Data polygon */}
            <polygon
              points={radarPoints()}
              fill="var(--color-accent)"
              fillOpacity="0.2"
              stroke="var(--color-accent)"
              strokeWidth="2"
            />

            {/* Data points */}
            {skillAreas.map((area, i) => {
              const angleStep = (Math.PI * 2) / skillAreas.length;
              const angle = angleStep * i - Math.PI / 2;
              const radius = (area.score / area.maxScore) * 120;
              const x = 140 + radius * Math.cos(angle);
              const y = 140 + radius * Math.sin(angle);

              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r="4"
                  fill="var(--color-accent)"
                />
              );
            })}
          </svg>
        </div>
      </div>

      {/* Checklist */}
      <div>
        <h2 className="font-sans-jp text-[18px] font-medium mb-8">チェックリスト</h2>

        <div className="space-y-8">
          {checklistSections.map((section) => (
            <div key={section.title}>
              <h3 className="font-sans-jp text-[15px] font-medium mb-4 flex items-center gap-2">
                {section.title}
                <span className="font-pretendard text-[13px] text-muted">
                  ({section.titleKr})
                </span>
              </h3>

              <div className="space-y-2">
                {section.items.map((item) => {
                  const isChecked = checkedItems.has(item.id);

                  return (
                    <button
                      key={item.id}
                      onClick={() => toggleItem(item.id)}
                      className="w-full flex items-center gap-4 py-3 px-4 rounded-lg hover:bg-accent-soft/20 transition-colors text-left"
                    >
                      <div
                        className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                          isChecked
                            ? 'bg-accent border-accent'
                            : 'border-border bg-background'
                        }`}
                      >
                        {isChecked && (
                          <Check className="w-3 h-3 text-accent-foreground" strokeWidth={3} />
                        )}
                      </div>
                      <span
                        className={`font-sans-jp text-[14px] ${
                          isChecked ? 'text-muted line-through' : 'text-foreground'
                        }`}
                      >
                        {item.text}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Action */}
      <div className="mt-16 pt-8 border-t border-border">
        <button
          onClick={() => // TODO: 실제 기능 구현
          className="w-full py-4 bg-accent text-accent-foreground rounded-lg font-medium hover:opacity-90 transition-opacity press-feedback"
        >
          <span className="font-sans-jp text-[14px]">進捗を保存する</span>
        </button>
      </div>

      {/* Bottom Spacer */}
      <div className="h-16" />
    </div>
  );
}