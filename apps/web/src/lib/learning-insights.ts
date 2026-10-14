import { api } from './api';
import { useAuthStore } from '../stores/auth-store';
import { useSettingsStore } from '../stores/settings-store';
import { localUserIdFor } from './db';
export type InsightDay = { date: string; studied: boolean; guided: { learned: number; reviews: number; answers: number; correct: number; retries: number }; saved: { daily_log: boolean; quiz_attempts: number; owner_completions: number; reviews: number } };
export type CompletedLesson = { session_id: string; lesson_id: string; lesson_version: string; title: { ko: string; ja: string; en: string }; level: string; completed_at: number; date: string; answers: number; correct: number };
type CommonInsights = { learning_track: string; timezone: string; today: string; completed_lessons: CompletedLesson[]; completed_lessons_truncated: boolean };
export type AnnualInsights = CommonInsights & { year: number; total_study_days: number; months: { month: number; study_days: number }[]; days: InsightDay[] };
export type DayInsights = CommonInsights & { date: string; day: InsightDay };
export function accuracyLabel(correct: number, answers: number): string | null { return answers > 0 ? `${Math.round(correct / answers * 100)}%` : null; }
export async function getLearningInsights<T extends CommonInsights>(scope: string, track: string, query: { year: number } | { date: string }): Promise<T> {
  const current = () => scope === localUserIdFor(useAuthStore.getState().user?.id, useSettingsStore.getState().learningTrack) && track === useSettingsStore.getState().learningTrack;
  if (!current()) throw new Error('Learning scope changed');
  const params = new URLSearchParams({ expected_track: track, ...('year' in query ? { year: String(query.year) } : { date: query.date }) });
  const result = await api.get<T>(`/learning/insights${'date' in query ? '/day' : ''}?${params}`);
  if (!current()) throw new Error('Learning scope changed');
  if (!result.ok) throw Object.assign(new Error(result.message), { status: result.status });
  if (result.data.learning_track !== track) throw new Error('Learning scope mismatch');
  return result.data;
}
export const recordsCopy = {
  ko: { year: '연도', annual: '한 해의 학습', days: '학습일', month: '월', monthly: '월별 학습일', calendar: '학습 달력', selected: '선택한 날짜', history: '완료한 레슨', empty: '저장된 학습 기록이 없습니다.', noLessons: '완료한 레슨이 없습니다.', unavailable: '기록을 불러오지 못했습니다.', retry: '다시 시도', loading: '기록을 불러오는 중…', guided: '안내 학습', learned: '익힌 항목', reviews: '복습', answers: '첫 응답', accuracy: '정답률', noAnswers: '응답 없음', retries: '재시도', saved: '저장 원천 (자유 학습 포함)', quiz: '완료 퀴즈', owner: '완료 항목', daily: '과거 일지', yes: '있음', no: '없음', authority: '확정 저장된 날짜를 한 번씩 셉니다. 열람·음성·클라이언트 활동 이벤트는 포함하지 않습니다.', overlap: '안내 학습이 같은 복습·완료 기록을 만들 수 있어 원천별 수치를 합산하지 않습니다.', summary: '월별 텍스트 요약', heatmap: '연간 학습일 지도', previous: '이전 달', next: '다음 달', truncated: '최근 200개만 표시합니다. 날짜를 선택해 해당 일의 기록을 확인하세요.', overdue: '복습 예정 시각이 지났습니다.', savedNote: '일지의 기존 날짜는 유지하고 다른 기록은 프로필 시간대로 표시합니다.' },
  ja: { year: '年', annual: '一年の学習', days: '学習日', month: '月', monthly: '月別の学習日数', calendar: '学習カレンダー', selected: '選択した日', history: '完了したレッスン', empty: '保存された学習記録はありません。', noLessons: '完了したレッスンはありません。', unavailable: '記録を読み込めませんでした。', retry: '再試行', loading: '記録を読み込み中…', guided: 'ガイド学習', learned: '学んだ項目', reviews: '復習', answers: '初回の回答', accuracy: '正答率', noAnswers: '回答なし', retries: '再挑戦', saved: '保存元（自由学習を含む）', quiz: '完了したクイズ', owner: '完了した項目', daily: '過去の日誌', yes: 'あり', no: 'なし', authority: '確定保存された日を一度だけ数えます。閲覧・音声・クライアントの活動イベントは含みません。', overlap: 'ガイド学習から同じ復習・完了記録が作られるため、保存元の数値は合算しません。', summary: '月別のテキスト集計', heatmap: '年間学習マップ', previous: '前の月', next: '次の月', truncated: '直近200件を表示しています。日付を選ぶとその日の記録を確認できます。', overdue: '復習の予定時刻を過ぎています。', savedNote: '日誌は元の日付を保持し、他の記録はプロフィールのタイムゾーンで表示します。' },
  en: { year: 'Year', annual: 'Your year in learning', days: 'Study days', month: 'Month', monthly: 'Monthly study days', calendar: 'Learning calendar', selected: 'Selected day', history: 'Completed lessons', empty: 'No saved learning records yet.', noLessons: 'No completed lessons.', unavailable: 'Could not load records.', retry: 'Try again', loading: 'Loading records…', guided: 'Guided learning', learned: 'Items learned', reviews: 'Reviews', answers: 'First answers', accuracy: 'Accuracy', noAnswers: 'No answers', retries: 'Retries', saved: 'Saved sources (includes free practice)', quiz: 'Finished quizzes', owner: 'Completed items', daily: 'Legacy daily log', yes: 'Yes', no: 'No', authority: 'Each confirmed saved date counts once. Views, speech, and client activity events do not count.', overlap: 'Guided learning can also create review and completion records. Source counts are not added together.', summary: 'Monthly text summary', heatmap: 'Annual study-day map', previous: 'Previous month', next: 'Next month', truncated: 'Showing the latest 200. Select a date to see records for that day.', overdue: 'The scheduled review time has passed.', savedNote: 'Daily logs retain their original dates; other records use your profile time zone.' },
} as const;
export function recordsLanguage(language: string): keyof typeof recordsCopy { return language.startsWith('ja') ? 'ja' : language.startsWith('en') ? 'en' : 'ko'; }
