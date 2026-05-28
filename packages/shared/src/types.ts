// ─────────────────────────────────────────────
// DB 인퍼드 타입 재내보내기
// packages/db/src/schema.ts 의 inferSelect / inferInsert 타입을
// 프론트엔드와 API 양쪽에서 공유하기 위해 re-export 합니다.
// ─────────────────────────────────────────────
export type {
  Source, NewSource,
  Category, NewCategory,
  Vocab, NewVocab,
  Grammar, NewGrammar,
  Kanji, NewKanji,
  Sentence, NewSentence,
  SysProgTerm, NewSysProgTerm,
  CurriculumWeek, NewCurriculumWeek,
  HomophonePair, NewHomophonePair,
  User, NewUser,
  SrsCard, NewSrsCard,
  ReviewLog, NewReviewLog,
  DailyLog, NewDailyLog,
  QuizAttempt, NewQuizAttempt,
  SelfCheck, NewSelfCheck,
} from '@nihongo-n3/db';

// ─────────────────────────────────────────────
// API 라우트 계약 (type-safe endpoint map)
// Workers(Hono)와 Web(TanStack Query) 양쪽에서 공유합니다.
// ─────────────────────────────────────────────

export type ApiRoutes = {
  'GET /health': {
    response: { status: 'ok'; environment: string; timestamp: string };
  };
  'GET /api/v1/ping': {
    response: { message: 'pong'; version: string };
  };
};

// 요청/응답 타입 헬퍼
export type RouteResponse<T extends keyof ApiRoutes> =
  ApiRoutes[T]['response'];
