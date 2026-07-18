/**
 * packages/db/src/seed/parse-curriculum.ts
 *
 * 커리큘럼 주차 데이터 생성 (프로그래밍 방식, 별도 파일 없음)
 *
 * 기본 52주 플랜 — 문자/N5 기반부터 N3 실전까지 단계별 목표를 생성한다.
 * 16주 집중과정은 진단·학습시간·시험일 조건을 통과한 사용자에게만
 * 애플리케이션 정책으로 추천하며 기본 seed로 강제하지 않는다.
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

const PHASES = [
  { start: 1, end: 8, title: '문자·N5 입문', vocab: 40, grammar: 5, kanji: 12, sentence: 20 },
  { start: 9, end: 16, title: 'N5 기반 완성', vocab: 45, grammar: 7, kanji: 10, sentence: 20 },
  { start: 17, end: 28, title: 'N4 전환과 확장', vocab: 60, grammar: 8, kanji: 14, sentence: 25 },
  { start: 29, end: 44, title: 'N3 핵심 습득', vocab: 85, grammar: 10, kanji: 18, sentence: 30 },
  { start: 45, end: 48, title: 'N3 독해·청해 통합', vocab: 45, grammar: 5, kanji: 8, sentence: 60 },
  { start: 49, end: 52, title: 'N3 실전과 회복', vocab: 20, grammar: 3, kanji: 5, sentence: 40 },
] as const;

const MILESTONES: Record<number, string> = {
  8: '가나 정확도 90% 진단',
  16: 'N5 종합 진단',
  28: 'N4 종합 진단',
  40: 'N3 영역별 중간 진단',
  48: 'N3 시간 제한 모의시험',
  52: 'N3 종합 모의시험 및 다음 계획',
};

const CURRICULUM: WeekDef[] = Array.from({ length: 52 }, (_, index) => {
  const weekNo = index + 1;
  const phase = PHASES.find((item) => weekNo >= item.start && weekNo <= item.end)!;
  const phaseWeek = weekNo - phase.start + 1;
  return {
    weekNo,
    theme: `${phase.title} ${phaseWeek}주차`,
    vocabTarget: phase.vocab,
    grammarTarget: phase.grammar,
    kanjiTarget: phase.kanji,
    sentenceTarget: phase.sentence,
    milestoneTest: MILESTONES[weekNo] ?? null,
  };
});

export function parseCurriculum(): string[] {
  return CURRICULUM.map((w) =>
    [
      `INSERT INTO \`curriculum_weeks\``,
      `  (\`week_no\`, \`theme\`, \`vocab_target\`, \`grammar_target\`,`,
      `   \`kanji_target\`, \`sentence_target\`, \`milestone_test\`)`,
      `VALUES (`,
      `  ${w.weekNo}, ${esc(w.theme)},`,
      `  ${w.vocabTarget}, ${w.grammarTarget},`,
      `  ${w.kanjiTarget}, ${w.sentenceTarget},`,
      `  ${w.milestoneTest ? esc(w.milestoneTest) : 'NULL'}`,
      `) ON CONFLICT(\`week_no\`) DO UPDATE SET`,
      `  \`theme\` = excluded.\`theme\`,`,
      `  \`vocab_target\` = excluded.\`vocab_target\`,`,
      `  \`grammar_target\` = excluded.\`grammar_target\`,`,
      `  \`kanji_target\` = excluded.\`kanji_target\`,`,
      `  \`sentence_target\` = excluded.\`sentence_target\`,`,
      `  \`milestone_test\` = excluded.\`milestone_test\`;`,
    ].join('\n'),
  );
}
