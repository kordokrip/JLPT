/**
 * packages/db/src/seed/parse-curriculum.ts
 *
 * 커리큘럼 주차 데이터 생성 (프로그래밍 방식, 별도 파일 없음)
 *
 * 16주 플랜 — 각 주차별 학습 목표와 테마 정의.
 * 실제 파일(C — 자가진단)은 주간 자가진단 체크시트이므로
 * 여기서는 정적 데이터로 curriculum_weeks를 채운다.
 */
import { esc } from './utils.js';

interface WeekDef {
  weekNo: number;
  theme: string;
  vocabTarget: number;
  grammarTarget: number;
  kanjiTarget: number;
  sentenceTarget: number;
  milestoneTest: string | null;
}

const CURRICULUM: WeekDef[] = [
  // ── N5 기반 (1-4주) ──
  { weekNo: 1,  theme: 'N5 어휘 핵심 + 히라가나/가타카나 완성',     vocabTarget: 100, grammarTarget: 15, kanjiTarget: 30,  sentenceTarget: 50,  milestoneTest: null },
  { weekNo: 2,  theme: 'N5 문법 기초 (は・が・を・に・で・へ)',       vocabTarget: 100, grammarTarget: 20, kanjiTarget: 30,  sentenceTarget: 50,  milestoneTest: null },
  { weekNo: 3,  theme: 'N5 한자 80자 완성 + 기초 어휘 복습',         vocabTarget: 80,  grammarTarget: 15, kanjiTarget: 40,  sentenceTarget: 40,  milestoneTest: null },
  { weekNo: 4,  theme: 'N5 종합 + 자가진단 1차',                     vocabTarget: 50,  grammarTarget: 10, kanjiTarget: 20,  sentenceTarget: 80,  milestoneTest: 'N5 모의 미니테스트' },
  // ── N4 전환 (5-8주) ──
  { weekNo: 5,  theme: 'N4 어휘 전반 (명사·동사 집중)',               vocabTarget: 150, grammarTarget: 20, kanjiTarget: 50,  sentenceTarget: 60,  milestoneTest: null },
  { weekNo: 6,  theme: 'N4 문법 (て형·ている·てみる·てしまう)',       vocabTarget: 150, grammarTarget: 25, kanjiTarget: 50,  sentenceTarget: 60,  milestoneTest: null },
  { weekNo: 7,  theme: 'N4 한자 160자 달성 + 형용사·부사 집중',       vocabTarget: 100, grammarTarget: 20, kanjiTarget: 60,  sentenceTarget: 50,  milestoneTest: null },
  { weekNo: 8,  theme: 'N4 종합 + 자가진단 2차',                     vocabTarget: 80,  grammarTarget: 15, kanjiTarget: 30,  sentenceTarget: 100, milestoneTest: 'N4 모의 미니테스트' },
  // ── N3 입문 (9-12주) ──
  { weekNo: 9,  theme: 'N3 어휘 전반 파트1 (어휘 대량 습득)',         vocabTarget: 200, grammarTarget: 25, kanjiTarget: 60,  sentenceTarget: 70,  milestoneTest: null },
  { weekNo: 10, theme: 'N3 어휘 후반 파트2 + 동음이의어 집중',        vocabTarget: 200, grammarTarget: 25, kanjiTarget: 60,  sentenceTarget: 70,  milestoneTest: null },
  { weekNo: 11, theme: 'N3 문법 전반 (복합조사·접속·경어)',           vocabTarget: 150, grammarTarget: 40, kanjiTarget: 70,  sentenceTarget: 80,  milestoneTest: null },
  { weekNo: 12, theme: 'N3 문법 후반 + 예문 코퍼스 집중 독해',        vocabTarget: 100, grammarTarget: 40, kanjiTarget: 70,  sentenceTarget: 150, milestoneTest: 'N3 모의 문법 테스트' },
  // ── 직무·응용 (13-15주) ──
  { weekNo: 13, theme: '직무 어휘 SP-A~E (프로그래밍·아키텍처·ML)',   vocabTarget: 100, grammarTarget: 10, kanjiTarget: 30,  sentenceTarget: 50,  milestoneTest: null },
  { weekNo: 14, theme: '직무 어휘 SP-F~J (반도체·제조·PM·비즈니스)', vocabTarget: 100, grammarTarget: 10, kanjiTarget: 30,  sentenceTarget: 50,  milestoneTest: null },
  { weekNo: 15, theme: 'N3 신문·비즈니스 예문 + 읽기 스피드 트레이닝', vocabTarget: 80,  grammarTarget: 20, kanjiTarget: 30,  sentenceTarget: 200, milestoneTest: null },
  // ── 최종 (16주) ──
  { weekNo: 16, theme: '전체 복습 + 최종 자가진단 + N3 모의 시험',    vocabTarget: 50,  grammarTarget: 15, kanjiTarget: 20,  sentenceTarget: 100, milestoneTest: 'N3 종합 모의시험' },
];

export function parseCurriculum(): string[] {
  return CURRICULUM.map((w) =>
    [
      `INSERT OR IGNORE INTO \`curriculum_weeks\``,
      `  (\`week_no\`, \`theme\`, \`vocab_target\`, \`grammar_target\`,`,
      `   \`kanji_target\`, \`sentence_target\`, \`milestone_test\`)`,
      `VALUES (`,
      `  ${w.weekNo}, ${esc(w.theme)},`,
      `  ${w.vocabTarget}, ${w.grammarTarget},`,
      `  ${w.kanjiTarget}, ${w.sentenceTarget},`,
      `  ${w.milestoneTest ? esc(w.milestoneTest) : 'NULL'}`,
      `);`,
    ].join('\n'),
  );
}
