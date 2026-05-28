import { useState } from 'react';
import { ChevronRight, Moon, Sun } from 'lucide-react';

interface SettingsScreenProps {
  onNavigate: (screen: string, data?: any) => void;
}

export function SettingsScreen({ onNavigate }: SettingsScreenProps) {
  const [darkMode, setDarkMode] = useState(false);
  const [furiganaEnabled, setFuriganaEnabled] = useState(true);
  const [autoPlayAudio, setAutoPlayAudio] = useState(false);
  const [dailyGoal, setDailyGoal] = useState(30);
  const [reviewNotifications, setReviewNotifications] = useState(true);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <div className="max-w-[880px] mx-auto px-8 lg:px-20 py-12 pb-24">
      {/* Header */}
      <div className="mb-16">
        <h1 className="font-serif-jp text-[48px] font-normal text-foreground leading-none mb-3">
          設定
        </h1>
        <p className="text-[13px] text-muted font-pretendard">
          앱 설정 및 환경설정
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-12">
        {/* Appearance */}
        <section>
          <h2 className="mb-6">
            <span className="font-sans-jp text-[18px] font-medium">外観</span>
            <span className="font-pretendard text-[15px] text-muted ml-2">· 외관</span>
          </h2>

          <div className="card-hairline rounded-lg divide-y divide-border">
            {/* Dark Mode Toggle */}
            <div className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                {darkMode ? (
                  <Moon className="w-5 h-5 text-muted" strokeWidth={1.5} />
                ) : (
                  <Sun className="w-5 h-5 text-muted" strokeWidth={1.5} />
                )}
                <div>
                  <div className="font-sans-jp text-[14px] text-foreground">
                    ダークモード
                  </div>
                  <div className="font-pretendard text-[12px] text-muted">
                    다크 테마 사용
                  </div>
                </div>
              </div>

              <button
                onClick={toggleDarkMode}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  darkMode ? 'bg-accent' : 'bg-muted/40 border border-border'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-card shadow-sm transition-transform ${
                    darkMode ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Furigana Toggle */}
            <div className="p-6 flex items-center justify-between">
              <div>
                <div className="font-sans-jp text-[14px] text-foreground">
                  ふりがな表示
                </div>
                <div className="font-pretendard text-[12px] text-muted">
                  한자 위에 읽기 표시
                </div>
              </div>

              <button
                onClick={() => setFuriganaEnabled(!furiganaEnabled)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  furiganaEnabled ? 'bg-accent' : 'bg-muted/40 border border-border'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-card shadow-sm transition-transform ${
                    furiganaEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Learning */}
        <section>
          <h2 className="mb-6">
            <span className="font-sans-jp text-[18px] font-medium">学習設定</span>
            <span className="font-pretendard text-[15px] text-muted ml-2">· 학습 설정</span>
          </h2>

          <div className="card-hairline rounded-lg divide-y divide-border">
            {/* Daily Goal */}
            <div className="p-6">
              <div className="mb-4">
                <div className="font-sans-jp text-[14px] text-foreground mb-1">
                  一日の目標時間
                </div>
                <div className="font-pretendard text-[12px] text-muted">
                  하루 학습 목표: {dailyGoal}분
                </div>
              </div>

              <input
                type="range"
                min="10"
                max="120"
                step="10"
                value={dailyGoal}
                onChange={(e) => setDailyGoal(Number(e.target.value))}
                className="w-full h-1 bg-border rounded-full appearance-none cursor-pointer accent-accent"
              />

              <div className="flex justify-between mt-2">
                <span className="text-[11px] text-muted">10分</span>
                <span className="text-[11px] text-muted">120分</span>
              </div>
            </div>

            {/* Auto-play Audio */}
            <div className="p-6 flex items-center justify-between">
              <div>
                <div className="font-sans-jp text-[14px] text-foreground">
                  音声自動再生
                </div>
                <div className="font-pretendard text-[12px] text-muted">
                  카드 표시 시 자동 재생
                </div>
              </div>

              <button
                onClick={() => setAutoPlayAudio(!autoPlayAudio)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  autoPlayAudio ? 'bg-accent' : 'bg-muted/40 border border-border'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-card shadow-sm transition-transform ${
                    autoPlayAudio ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Review Notifications */}
            <div className="p-6 flex items-center justify-between">
              <div>
                <div className="font-sans-jp text-[14px] text-foreground">
                  復習の通知
                </div>
                <div className="font-pretendard text-[12px] text-muted">
                  복습 알림 받기
                </div>
              </div>

              <button
                onClick={() => setReviewNotifications(!reviewNotifications)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  reviewNotifications ? 'bg-accent' : 'bg-muted/40 border border-border'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-card shadow-sm transition-transform ${
                    reviewNotifications ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Account */}
        <section>
          <h2 className="mb-6">
            <span className="font-sans-jp text-[18px] font-medium">アカウント</span>
            <span className="font-pretendard text-[15px] text-muted ml-2">· 계정</span>
          </h2>

          <div className="card-hairline rounded-lg divide-y divide-border">
            <button className="w-full p-6 flex items-center justify-between hover:bg-accent-soft/20 transition-colors">
              <div className="text-left">
                <div className="font-sans-jp text-[14px] text-foreground">
                  プロフィール編集
                </div>
                <div className="font-pretendard text-[12px] text-muted">
                  이름, 목표, 레벨 설정
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted" strokeWidth={1.5} />
            </button>

            <button className="w-full p-6 flex items-center justify-between hover:bg-accent-soft/20 transition-colors">
              <div className="text-left">
                <div className="font-sans-jp text-[14px] text-foreground">
                  学習データ
                </div>
                <div className="font-pretendard text-[12px] text-muted">
                  통계 및 진행 상황
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted" strokeWidth={1.5} />
            </button>

            <button className="w-full p-6 flex items-center justify-between hover:bg-accent-soft/20 transition-colors">
              <div className="text-left">
                <div className="font-sans-jp text-[14px] text-foreground">
                  データのバックアップ
                </div>
                <div className="font-pretendard text-[12px] text-muted">
                  클라우드 백업
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted" strokeWidth={1.5} />
            </button>
          </div>
        </section>

        {/* About */}
        <section>
          <h2 className="mb-6">
            <span className="font-sans-jp text-[18px] font-medium">その他</span>
            <span className="font-pretendard text-[15px] text-muted ml-2">· 기타</span>
          </h2>

          <div className="card-hairline rounded-lg divide-y divide-border">
            <button className="w-full p-6 flex items-center justify-between hover:bg-accent-soft/20 transition-colors">
              <div className="text-left">
                <div className="font-sans-jp text-[14px] text-foreground">
                  使い方ガイド
                </div>
                <div className="font-pretendard text-[12px] text-muted">
                  사용 방법 안내
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted" strokeWidth={1.5} />
            </button>

            <button className="w-full p-6 flex items-center justify-between hover:bg-accent-soft/20 transition-colors">
              <div className="text-left">
                <div className="font-sans-jp text-[14px] text-foreground">
                  フィードバック
                </div>
                <div className="font-pretendard text-[12px] text-muted">
                  피드백 보내기
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted" strokeWidth={1.5} />
            </button>

            <div className="p-6">
              <div className="font-sans-jp text-[14px] text-foreground mb-1">
                バージョン
              </div>
              <div className="font-pretendard text-[12px] text-muted">
                v1.0.0 (Build 2024.05)
              </div>
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section>
          <h2 className="mb-6">
            <span className="font-sans-jp text-[18px] font-medium text-accent">データ管理</span>
            <span className="font-pretendard text-[15px] text-accent/70 ml-2">· 데이터 관리</span>
          </h2>

          <div className="card-hairline rounded-lg divide-y divide-border">
            <button className="w-full p-6 flex items-center justify-between hover:bg-accent-soft/20 transition-colors">
              <div className="text-left">
                <div className="font-sans-jp text-[14px] text-foreground">
                  学習データをリセット
                </div>
                <div className="font-pretendard text-[12px] text-muted">
                  모든 학습 기록 초기화
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted" strokeWidth={1.5} />
            </button>

            <button className="w-full p-6 text-left hover:bg-accent-soft/20 transition-colors">
              <div className="font-sans-jp text-[14px] text-accent">
                アカウント削除
              </div>
              <div className="font-pretendard text-[12px] text-muted">
                계정 및 모든 데이터 삭제
              </div>
            </button>
          </div>
        </section>
      </div>

      {/* Bottom Spacer */}
      <div className="h-16" />
    </div>
  );
}