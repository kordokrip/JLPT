# 프로젝트 전체 파일 인벤토리 (2026-09-11)

자동 수집 기준: `rg --files` 전체 추적 대상(숨김·빌드산출물 제외), 기능별 1차 분류

작성자: Sungho / 일자: 2026-09-11

목적: 현재 세션의 릴리스 준비 상태에서 전체 폴더를 기능/역할 기준으로 정리하고, 삭제·보존 판단의 기반 자료를 제공합니다.

## 분류별 건수

- API bootstrap: 4
- API job: 2
- API lib: 24
- API middleware: 6
- API route: 40
- API workflow: 1
- DB content artifact: 12
- DB core: 1
- DB migration snapshot: 8
- DB migration: 29
- DB ops/quality: 92
- DB seed: 49
- DB 설정: 3
- E2E test: 89
- Ops scripts: 17
- Shared lib: 19
- UI component feature: 12
- UI component layout: 3
- UI component: 7
- Web asset: 12
- Web bootstrap: 16
- Web feature browse: 6
- Web feature quiz: 5
- Web feature review: 5
- Web feature self-check: 6
- Web feature stats: 6
- Web feature study: 4
- Web feature topik: 22
- Web feature: 13
- Web hook: 11
- Web lib: 20
- Web page: 32
- Web store: 3
- Web 설정: 8
- 기타: 10
- 루트 필수 파일: 9
- 운영 문서: 21
- 콘텐츠 문서: 37
- 테스트: 37

## 상세 파일 지도(주요 카테고리 우선)

### 루트 필수 파일

- .env.example
- AGENTS.md
- LICENSE
- PROJECT_CODEBASE_ANALYSIS.md
- README.md
- package.json
- pnpm-workspace.yaml
- tsconfig.base.json
- wrangler.jsonc

### 운영 문서

- docs/00_overview/00_source_map.md
- docs/00_overview/01_learning_strategy.md
- docs/00_overview/ADR-001-jlpt-manifest-label.md
- docs/00_overview/CHANGELOG_TIMELINE_2026-09-11.md
- docs/00_overview/CONTENT_AUDIT.md
- docs/00_overview/CONTENT_SOURCE_REGISTRY.md
- docs/00_overview/CURRENT_STATE.md
- docs/00_overview/CURRICULUM_BLUEPRINT.md
- docs/00_overview/ERROR_LEDGER.md
- docs/00_overview/LEARNING_EXPERIENCE_PLAN.md
- docs/00_overview/LOCAL_CICD_MANAGEMENT.md
- docs/00_overview/LOCAL_CICD_OPERATIONS.md
- docs/00_overview/LOCAL_RELEASE_LEDGER.md
- docs/00_overview/NEXT_CONTENT_EXPANSION_RELEASE_2026-08-23.md
- docs/00_overview/OPERATIONS_MANAGEMENT_RUNBOOK.md
- docs/00_overview/PROJECT_FILE_CATALOG_2026-09-11.md
- docs/00_overview/PROJECT_INVENTORY_2026-09-11.md
- docs/00_overview/QUESTION_BANK_QUALITY_PIPELINE.md
- docs/00_overview/REPOSITORY_MAINTENANCE_2026-08-30.md
- docs/00_overview/SUB_AGENT_HANDOFF.md
- docs/00_overview/TOPIK_GOOGLE_SPEECH_INCIDENT_2026-08-23.md

### 콘텐츠 문서

- docs/01_n5/03_kanji.md
- docs/01_n5/04_vocab.md
- docs/01_n5/05_grammar.md
- docs/02_n4/06_kanji.md
- docs/02_n4/07_vocab.md
- docs/02_n4/08_grammar.md
- docs/03_n3/09_kanji.md
- docs/03_n3/10A_vocab_part1.md
- docs/03_n3/10B_vocab_part2.md
- docs/03_n3/11_grammar.md
- docs/04_supplement/02_pronunciation_kana.md
- docs/04_supplement/12_example_sentences.md
- docs/04_supplement/A_sysprog_vocab_500.md
- docs/04_supplement/C_self_check_16weeks.md
- docs/05_n2/01_self_authored_local_fixture.md
- docs/05_n2/02_self_authored_batch_1.md
- docs/05_n2/03_self_authored_batch_2.md
- docs/05_n2/04_self_authored_batch_3.md
- docs/05_n2/05_self_authored_batch_4.md
- docs/05_n2/06_self_authored_batch_5.md
- docs/06_n1/01_self_authored_batch_1.md
- docs/06_n1/02_self_authored_batch_2.md
- docs/06_n1/03_self_authored_batch_3.md
- docs/06_n1/04_self_authored_batch_4.md
- docs/07_topik/01_owner_authored_grade1_local_fixture.md
- docs/07_topik/02_owner_authored_grades_1_6_batch_1.md
- docs/07_topik/03_owner_authored_grades_1_6_batch_2.md
- docs/07_topik/04_owner_authored_grades_1_6_batch_3.md
- docs/07_topik/05_owner_authored_grades_1_6_batch_4.md
- docs/07_topik/T10_topik_i_ii_practice_bank_v2.md
- docs/07_topik/T3_placement_bank_v1.md
- docs/07_topik/T4_placement_bank_v2.md
- docs/07_topik/T7_topik_i_ii_practice_bank_v1.md
- docs/07_topik/data/topik-applicants-country-age-20231231.csv
- docs/ATTRIBUTIONS.md
- docs/README.md
- docs/ROADMAP.md

### DB migration

- packages/db/drizzle-v2/0000_schema_convergence.sql
- packages/db/drizzle-v2/0001_fts.sql
- packages/db/drizzle-v2/0002_app_defaults.sql
- packages/db/drizzle-v2/0003_self_check_templates.sql
- packages/db/drizzle-v2/0004_jlpt_n3_practice_content.sql
- packages/db/drizzle-v2/0005_learning_track.sql
- packages/db/drizzle-v2/0006_oauth_learning_track.sql
- packages/db/drizzle-v2/0007_content_provenance_homophones.sql
- packages/db/drizzle-v2/0008_topik_track_content_and_learning_keys.sql
- packages/db/drizzle-v2/0009_topik_placement_v2.sql
- packages/db/drizzle-v2/0010_topik_official_reference_data.sql
- packages/db/drizzle-v2/0011_topik_japanese_placement_and_practice.sql
- packages/db/drizzle-v2/0012_content_release_contract.sql
- packages/db/drizzle-v2/0013_content_release_control_plane.sql
- packages/db/drizzle-v2/0014_content_release_review_signoffs.sql
- packages/db/drizzle-v2/0015_ai_learning_assistance_foundation.sql
- packages/db/drizzle-v2/0016_topik_owner_private_publication.sql
- packages/db/drizzle-v2/0017_content_source_audio_and_owner_curriculum.sql
- packages/db/drizzle-v2/0018_preserve_existing_jlpt_levels.sql
- packages/db/drizzle-v2/0019_topik_owner_curriculum_audio_text.sql
- packages/db/drizzle-v2/0020_content_audio_binding_activations.sql
- packages/db/drizzle-v2/0021_topik_owner_curriculum_progress_fsrs.sql
- packages/db/drizzle-v2/0022_question_bank_quality_ledger.sql
- packages/db/drizzle-v2/0023_rebalance_jlpt_n3_reading_answers.sql
- packages/db/drizzle-v2/0024_learning_activity_events.sql
- packages/db/drizzle-v2/0025_jlpt_practice_questions.sql
- packages/db/drizzle-v2/0026_release_quality_links.sql
- packages/db/drizzle-v2/0027_google_speech_contract.sql
- packages/db/drizzle-v2/0028_learning_experience.sql

### DB migration snapshot

- packages/db/drizzle-v2/meta/0000_snapshot.json
- packages/db/drizzle-v2/meta/0001_snapshot.json
- packages/db/drizzle-v2/meta/0002_snapshot.json
- packages/db/drizzle-v2/meta/0003_snapshot.json
- packages/db/drizzle-v2/meta/0004_snapshot.json
- packages/db/drizzle-v2/meta/0005_snapshot.json
- packages/db/drizzle-v2/meta/0006_snapshot.json
- packages/db/drizzle-v2/meta/_journal.json

### DB core

- packages/db/src/schema.ts

### DB ops/quality

- packages/db/src/ops/apply-migrations.ts
- packages/db/src/ops/audit-question-bank-quality.ts
- packages/db/src/ops/backfill-topik-practice-v2-release.test.ts
- packages/db/src/ops/backfill-topik-practice-v2-release.ts
- packages/db/src/ops/content-expansion-draft.test.ts
- packages/db/src/ops/content-expansion-independent-reviews.test.ts
- packages/db/src/ops/content-expansion-review-1.test.ts
- packages/db/src/ops/content-expansion-review-2.test.ts
- packages/db/src/ops/content-expansion-reviewed-release.test.ts
- packages/db/src/ops/content-manifest.test.ts
- packages/db/src/ops/content-release-contract.test.ts
- packages/db/src/ops/content-release-control-plane.test.ts
- packages/db/src/ops/create-release-evidence.test.ts
- packages/db/src/ops/create-release-evidence.ts
- packages/db/src/ops/d1-backup-manifest.test.ts
- packages/db/src/ops/d1-backup-manifest.ts
- packages/db/src/ops/d1-backup-paths.test.ts
- packages/db/src/ops/d1-backup-paths.ts
- packages/db/src/ops/d1-backup.ts
- packages/db/src/ops/d1-blue-green.ts
- packages/db/src/ops/d1-cli.test.ts
- packages/db/src/ops/d1-export-normalizer.test.ts
- packages/db/src/ops/d1-export-normalizer.ts
- packages/db/src/ops/d1-restore-drill.ts
- packages/db/src/ops/d1-tables.test.ts
- packages/db/src/ops/d1-tables.ts
- packages/db/src/ops/d1-user-cleanup.ts
- packages/db/src/ops/google-only-audio-migration.test.ts
- packages/db/src/ops/growth-readiness.test.ts
- packages/db/src/ops/growth-readiness.ts
- packages/db/src/ops/jlpt-n2-n1-practice-banks-v1.test.ts
- packages/db/src/ops/jlpt-reading-balance.test.ts
- packages/db/src/ops/learning-experience-migration.test.ts
- packages/db/src/ops/learning-foundation-migrations.test.ts
- packages/db/src/ops/migration-entrypoint.test.ts
- packages/db/src/ops/n1-batch1.test.ts
- packages/db/src/ops/n1-batch2.test.ts
- packages/db/src/ops/n1-batch3.test.ts
- packages/db/src/ops/n1-batch4.test.ts
- packages/db/src/ops/n2-batch1.test.ts
- packages/db/src/ops/n2-batch2.test.ts
- packages/db/src/ops/n2-batch3.test.ts
- packages/db/src/ops/n2-batch4.test.ts
- packages/db/src/ops/n2-batch5.test.ts
- packages/db/src/ops/n2-local-fixture.test.ts
- packages/db/src/ops/next-content-expansion-adversarial-review-a.test.ts
- packages/db/src/ops/next-content-expansion-adversarial-review-b.test.ts
- packages/db/src/ops/next-content-expansion-independent-reviews.test.ts
- packages/db/src/ops/next-content-expansion-quality.test.ts
- packages/db/src/ops/next-content-expansion-quality.ts
- packages/db/src/ops/next-content-expansion-reviewed-release.test.ts
- packages/db/src/ops/next-content-expansion-source.test.ts
- packages/db/src/ops/parse-sentences.test.ts
- packages/db/src/ops/question-bank-quality.test.ts
- packages/db/src/ops/question-bank-quality.ts
- packages/db/src/ops/report-growth-readiness.ts
- packages/db/src/ops/report-next-content-expansion-quality.ts
- packages/db/src/ops/seed-content-expansion-reviewed.ts
- packages/db/src/ops/seed-next-content-expansion-reviewed.ts
- packages/db/src/ops/seed-topik-official-reference.ts
- packages/db/src/ops/seed-topik-placement.ts
- packages/db/src/ops/seed-topik-practice.ts
- packages/db/src/ops/seed-topik-preview.ts
- packages/db/src/ops/topik-grade1-local-fixture.test.ts
- packages/db/src/ops/topik-official-reference.test.ts
- packages/db/src/ops/topik-owner-curriculum-batch1.test.ts
- packages/db/src/ops/topik-owner-curriculum-batch2.test.ts
- packages/db/src/ops/topik-owner-curriculum-batch3.test.ts
- packages/db/src/ops/topik-owner-curriculum-batch4.test.ts
- packages/db/src/ops/topik-owner-curriculum-batch6.test.ts
- packages/db/src/ops/topik-placement-manifest.test.ts
- packages/db/src/ops/user-cleanup-plan.test.ts
- packages/db/src/ops/user-cleanup-plan.ts
- packages/db/src/ops/verify-audio-r2.test.ts
- packages/db/src/ops/verify-audio-r2.ts
- packages/db/src/ops/verify-content-expansion-draft.ts
- packages/db/src/ops/verify-content-release-contract.ts
- packages/db/src/ops/verify-content-release-control-plane.ts
- packages/db/src/ops/verify-fresh.ts
- packages/db/src/ops/verify-learning-audio-provenance.ts
- packages/db/src/ops/verify-migration-ledger.ts
- packages/db/src/ops/verify-n2-batch1.ts
- packages/db/src/ops/verify-n2-local-fixture.ts
- packages/db/src/ops/verify-topik-grade1-local-fixture.ts
- packages/db/src/ops/verify-topik-official-reference.ts
- packages/db/src/ops/verify-topik-owner-curriculum-batch1.ts
- packages/db/src/ops/verify-topik-placement.ts
- packages/db/src/ops/verify-topik-practice.ts
- packages/db/src/ops/write-content-expansion-independent-reviews.ts
- packages/db/src/ops/write-content-expansion-review-1.ts
- packages/db/src/ops/write-content-expansion-review-2.ts
- packages/db/src/ops/write-next-content-expansion-independent-reviews.ts

### DB seed

- packages/db/src/seed/constants.ts
- packages/db/src/seed/content-expansion-quality.ts
- packages/db/src/seed/content-expansion-reviewed-release.ts
- packages/db/src/seed/content-manifest.ts
- packages/db/src/seed/content-release-contract.ts
- packages/db/src/seed/d1-cli.ts
- packages/db/src/seed/homophone-pairs.ts
- packages/db/src/seed/jlpt-n2-n1-practice-banks-v1.ts
- packages/db/src/seed/jlpt-n2-n1-practice-content-v1.ts
- packages/db/src/seed/jlpt-n3-practice-bank-v1.ts
- packages/db/src/seed/jlpt-reading-balance.ts
- packages/db/src/seed/n1-batch1.ts
- packages/db/src/seed/n1-batch2.ts
- packages/db/src/seed/n1-batch3.ts
- packages/db/src/seed/n1-batch4.ts
- packages/db/src/seed/n2-batch1.ts
- packages/db/src/seed/n2-batch2.ts
- packages/db/src/seed/n2-batch3.ts
- packages/db/src/seed/n2-batch4.ts
- packages/db/src/seed/n2-batch5.ts
- packages/db/src/seed/n2-local-fixture.ts
- packages/db/src/seed/n2-n1-source-intake-template.ts
- packages/db/src/seed/next-content-expansion-reviewed-release.ts
- packages/db/src/seed/next-content-expansion-source.ts
- packages/db/src/seed/parse-curriculum.ts
- packages/db/src/seed/parse-grammar.ts
- packages/db/src/seed/parse-kanji.ts
- packages/db/src/seed/parse-sentences.ts
- packages/db/src/seed/parse-sysprog.ts
- packages/db/src/seed/parse-vocab.ts
- packages/db/src/seed/seed-diff.ts
- packages/db/src/seed/seed-n2-local-fixture.ts
- packages/db/src/seed/seed-topik-grade1-local-fixture.ts
- packages/db/src/seed/seed.ts
- packages/db/src/seed/self-authored-jlpt-batch.ts
- packages/db/src/seed/topik-grade1-local-fixture.ts
- packages/db/src/seed/topik-official-reference.ts
- packages/db/src/seed/topik-owner-curriculum-batch1.ts
- packages/db/src/seed/topik-owner-curriculum-batch2.ts
- packages/db/src/seed/topik-owner-curriculum-batch3.ts
- packages/db/src/seed/topik-owner-curriculum-batch4.ts
- packages/db/src/seed/topik-owner-curriculum-batch5.ts
- packages/db/src/seed/topik-owner-curriculum-batch6.ts
- packages/db/src/seed/topik-placement-bank-v2.ts
- packages/db/src/seed/topik-placement-bank.ts
- packages/db/src/seed/topik-practice-bank-v2.ts
- packages/db/src/seed/topik-practice-bank.ts
- packages/db/src/seed/utils.ts
- packages/db/src/seed/verify.ts

### DB content artifact

- packages/db/src/content/jlpt-n3-topik-owner-expansion-intake-input.json
- packages/db/src/content/jlpt-n3-topik-owner-expansion-intake.json
- packages/db/src/content/jlpt-n3-topik-owner-expansion-source.md
- packages/db/src/content/next-content-expansion-intake-input.json
- packages/db/src/content/next-content-expansion-intake.json
- packages/db/src/content/next-content-expansion-source.md
- packages/db/src/content/reviews/content-expansion-adversarial-review-1.ts
- packages/db/src/content/reviews/content-expansion-adversarial-review-2.ts
- packages/db/src/content/reviews/content-expansion-independent-reviews.ts
- packages/db/src/content/reviews/next-content-expansion-adversarial-review-a.ts
- packages/db/src/content/reviews/next-content-expansion-adversarial-review-b.ts
- packages/db/src/content/reviews/next-content-expansion-independent-reviews.ts

### API route

- apps/api/src/routes/activity-oa.ts
- apps/api/src/routes/activity.ts
- apps/api/src/routes/admin-oa.ts
- apps/api/src/routes/admin.ts
- apps/api/src/routes/ai-learning-oa.ts
- apps/api/src/routes/ai-oa.ts
- apps/api/src/routes/audio-oa.ts
- apps/api/src/routes/audio.ts
- apps/api/src/routes/auth-oa.ts
- apps/api/src/routes/auth.ts
- apps/api/src/routes/grammar-oa.ts
- apps/api/src/routes/homophones-oa.ts
- apps/api/src/routes/kanji-oa.ts
- apps/api/src/routes/learning-experience.ts
- apps/api/src/routes/logs-oa.ts
- apps/api/src/routes/logs.ts
- apps/api/src/routes/notifications-oa.ts
- apps/api/src/routes/notifications.ts
- apps/api/src/routes/observability-ops.ts
- apps/api/src/routes/openapi-docs.ts
- apps/api/src/routes/quiz-oa.ts
- apps/api/src/routes/quiz.ts
- apps/api/src/routes/reading-oa.ts
- apps/api/src/routes/reading.ts
- apps/api/src/routes/self-check-oa.ts
- apps/api/src/routes/self-check.ts
- apps/api/src/routes/sentences-oa.ts
- apps/api/src/routes/sources-oa.ts
- apps/api/src/routes/srs-oa.ts
- apps/api/src/routes/srs.ts
- apps/api/src/routes/sync-oa.ts
- apps/api/src/routes/sync.ts
- apps/api/src/routes/sysprog-oa.ts
- apps/api/src/routes/sysprog.ts
- apps/api/src/routes/topik-owner-curriculum.ts
- apps/api/src/routes/topik-owner-private.ts
- apps/api/src/routes/topik-placement.ts
- apps/api/src/routes/topik-practice.ts
- apps/api/src/routes/tracks.ts
- apps/api/src/routes/vocab-oa.ts

### API lib

- apps/api/src/lib/ai-learning-assistance.eval.test.ts
- apps/api/src/lib/ai-learning-assistance.test.ts
- apps/api/src/lib/ai-learning-assistance.ts
- apps/api/src/lib/audio-qa-samples.ts
- apps/api/src/lib/auth-session.ts
- apps/api/src/lib/content-release-control-plane.test.ts
- apps/api/src/lib/content-release-control-plane.ts
- apps/api/src/lib/cursor.ts
- apps/api/src/lib/db.ts
- apps/api/src/lib/fsrs.ts
- apps/api/src/lib/fts.ts
- apps/api/src/lib/learning-effects.ts
- apps/api/src/lib/owner-publication.ts
- apps/api/src/lib/pronunciation-policy.ts
- apps/api/src/lib/push.ts
- apps/api/src/lib/quiz-choice-order.test.ts
- apps/api/src/lib/quiz-choice-order.ts
- apps/api/src/lib/quiz-questions.ts
- apps/api/src/lib/release-operations.test.ts
- apps/api/src/lib/response.ts
- apps/api/src/lib/safe-log.ts
- apps/api/src/lib/secret.ts
- apps/api/src/lib/study-content.ts
- apps/api/src/lib/tagger.ts

### API middleware

- apps/api/src/middleware/auth.ts
- apps/api/src/middleware/cache.ts
- apps/api/src/middleware/maintenance.ts
- apps/api/src/middleware/observability.ts
- apps/api/src/middleware/rate-limit.ts
- apps/api/src/middleware/security.ts

### API job

- apps/api/src/jobs/observability-alerts.ts
- apps/api/src/jobs/optimize-fsrs.ts

### API workflow

- apps/api/src/workflows/content-release-workflow.ts

### API bootstrap

- apps/api/src/app.ts
- apps/api/src/index.ts
- apps/api/src/observability-receiver.ts
- apps/api/src/types.ts

### Web bootstrap

- apps/web/src/App.tsx
- apps/web/src/components/IosInstallHint.tsx
- apps/web/src/i18n/en.ts
- apps/web/src/i18n/index.ts
- apps/web/src/i18n/ja.ts
- apps/web/src/i18n/ko.ts
- apps/web/src/i18n/study.ts
- apps/web/src/index.css
- apps/web/src/main.tsx
- apps/web/src/styles/tokens.css
- apps/web/src/sw-push.ts
- apps/web/src/sw.ts
- apps/web/src/test/setup.ts
- apps/web/src/types/admin-api.d.ts
- apps/web/src/types/api.d.ts
- apps/web/src/vite-env.d.ts

### Web page

- apps/web/src/pages/AddWord.tsx
- apps/web/src/pages/AdminUsers.tsx
- apps/web/src/pages/AudioQa.tsx
- apps/web/src/pages/Browse.tsx
- apps/web/src/pages/BrowseDetail.tsx
- apps/web/src/pages/CharacterTrainer.tsx
- apps/web/src/pages/Curriculum.tsx
- apps/web/src/pages/Home.tsx
- apps/web/src/pages/LearnHub.tsx
- apps/web/src/pages/LearningRecords.tsx
- apps/web/src/pages/Login.tsx
- apps/web/src/pages/NotFound.tsx
- apps/web/src/pages/QuestionsHub.tsx
- apps/web/src/pages/Quiz.tsx
- apps/web/src/pages/QuizListening.tsx
- apps/web/src/pages/QuizResult.tsx
- apps/web/src/pages/Reading.tsx
- apps/web/src/pages/ReadingDetail.tsx
- apps/web/src/pages/Register.tsx
- apps/web/src/pages/Review.tsx
- apps/web/src/pages/SelfCheck.tsx
- apps/web/src/pages/Settings.tsx
- apps/web/src/pages/Stats.tsx
- apps/web/src/pages/StudySession.tsx
- apps/web/src/pages/Today.tsx
- apps/web/src/pages/TopikCharacterTrainer.tsx
- apps/web/src/pages/TopikDashboard.tsx
- apps/web/src/pages/TopikLearn.tsx
- apps/web/src/pages/TopikPlacement.tsx
- apps/web/src/pages/TopikProgress.tsx
- apps/web/src/pages/TopikReview.tsx
- apps/web/src/pages/Welcome.tsx

### Web feature quiz

- apps/web/src/features/quiz/QuizView.tsx
- apps/web/src/features/quiz/logic.test.ts
- apps/web/src/features/quiz/logic.ts
- apps/web/src/features/quiz/types.ts
- apps/web/src/features/quiz/useQuiz.ts

### Web feature review

- apps/web/src/features/review/ReviewView.tsx
- apps/web/src/features/review/logic.test.ts
- apps/web/src/features/review/logic.ts
- apps/web/src/features/review/types.ts
- apps/web/src/features/review/useReview.ts

### Web feature topik

- apps/web/src/features/topik/OwnerPrivateTopikPanel.tsx
- apps/web/src/features/topik/character-trainer/HangulTrainerView.tsx
- apps/web/src/features/topik/character-trainer/data.test.ts
- apps/web/src/features/topik/character-trainer/data.ts
- apps/web/src/features/topik/character-trainer/logic.ts
- apps/web/src/features/topik/character-trainer/types.ts
- apps/web/src/features/topik/character-trainer/useHangulTrainer.ts
- apps/web/src/features/topik/curriculum/TopikOwnerAuthoredCurriculum.tsx
- apps/web/src/features/topik/curriculum/useTopikOwnerCurriculum.ts
- apps/web/src/features/topik/curriculum/useTopikOwnerCurriculumProgress.ts
- apps/web/src/features/topik/learning/content.test.ts
- apps/web/src/features/topik/learning/content.ts
- apps/web/src/features/topik/learning/useTopikLearningProgress.ts
- apps/web/src/features/topik/owner-private-content.test.ts
- apps/web/src/features/topik/owner-private-content.ts
- apps/web/src/features/topik/placement/TopikPlacementView.tsx
- apps/web/src/features/topik/placement/types.ts
- apps/web/src/features/topik/placement/useTopikPlacement.ts
- apps/web/src/features/topik/practice-cache.ts
- apps/web/src/features/topik/useKoreanAudio.test.tsx
- apps/web/src/features/topik/useKoreanAudio.ts
- apps/web/src/features/topik/useTopikPractice.ts

### Web feature study

- apps/web/src/features/study/StudyComponents.test.tsx
- apps/web/src/features/study/StudyComponents.tsx
- apps/web/src/features/study/StudyRequestError.tsx
- apps/web/src/features/study/study.css

### Web feature self-check

- apps/web/src/features/self-check/RadarChart.tsx
- apps/web/src/features/self-check/SelfCheckView.tsx
- apps/web/src/features/self-check/data.ts
- apps/web/src/features/self-check/logic.ts
- apps/web/src/features/self-check/types.ts
- apps/web/src/features/self-check/useSelfCheck.ts

### Web feature browse

- apps/web/src/features/browse/BrowseFilters.tsx
- apps/web/src/features/browse/BrowseList.tsx
- apps/web/src/features/browse/BrowseView.tsx
- apps/web/src/features/browse/types.test.ts
- apps/web/src/features/browse/types.ts
- apps/web/src/features/browse/useBrowse.ts

### Web feature stats

- apps/web/src/features/stats/StatsView.tsx
- apps/web/src/features/stats/logic.test.ts
- apps/web/src/features/stats/logic.ts
- apps/web/src/features/stats/types.ts
- apps/web/src/features/stats/useStats.test.tsx
- apps/web/src/features/stats/useStats.ts

### Web feature

- apps/web/src/features/character-trainer/CharacterTrainerView.tsx
- apps/web/src/features/character-trainer/DrawingPracticePad.tsx
- apps/web/src/features/character-trainer/data.ts
- apps/web/src/features/character-trainer/logic.ts
- apps/web/src/features/character-trainer/types.ts
- apps/web/src/features/character-trainer/useCharacterTrainer.ts
- apps/web/src/features/learning/next-action.test.ts
- apps/web/src/features/learning/next-action.ts
- apps/web/src/features/quiz-listening/ListeningAudioPlayer.tsx
- apps/web/src/features/quiz-listening/QuizListeningView.tsx
- apps/web/src/features/quiz-listening/logic.ts
- apps/web/src/features/quiz-listening/types.ts
- apps/web/src/features/quiz-listening/useListeningQuiz.ts

### UI component feature

- apps/web/src/components/feature/AiAssistanceNotice.test.tsx
- apps/web/src/components/feature/AiAssistanceNotice.tsx
- apps/web/src/components/feature/Heatmap.tsx
- apps/web/src/components/feature/LearningTrackSwitch.tsx
- apps/web/src/components/feature/NaturalJapaneseSearch.tsx
- apps/web/src/components/feature/PronunciationButton.tsx
- apps/web/src/components/feature/QuizQuestionMC.tsx
- apps/web/src/components/feature/QuizTimer.tsx
- apps/web/src/components/feature/SRSCard.test.tsx
- apps/web/src/components/feature/SRSCard.tsx
- apps/web/src/components/feature/StreakBadge.tsx
- apps/web/src/components/feature/VocabCard.tsx

### UI component layout

- apps/web/src/components/layout/BottomTabBar.tsx
- apps/web/src/components/layout/RootLayout.tsx
- apps/web/src/components/layout/SideNav.tsx

### UI component

- apps/web/src/components/ui/Badge.tsx
- apps/web/src/components/ui/Button.tsx
- apps/web/src/components/ui/Card.tsx
- apps/web/src/components/ui/Input.tsx
- apps/web/src/components/ui/Progress.tsx
- apps/web/src/components/ui/Ruby.tsx
- apps/web/src/components/ui/index.ts

### Web lib

- apps/web/src/lib/activity-events.ts
- apps/web/src/lib/api-base.ts
- apps/web/src/lib/api.ts
- apps/web/src/lib/audio.ts
- apps/web/src/lib/browser.ts
- apps/web/src/lib/cn.ts
- apps/web/src/lib/content-cache.ts
- apps/web/src/lib/db.ts
- apps/web/src/lib/device-profile.ts
- apps/web/src/lib/fsrs-client.ts
- apps/web/src/lib/google-browser-speech.ts
- apps/web/src/lib/learning-experience.test.ts
- apps/web/src/lib/learning-experience.ts
- apps/web/src/lib/learning-flag.ts
- apps/web/src/lib/push-subscribe.ts
- apps/web/src/lib/pwa-update.ts
- apps/web/src/lib/srs-due-snapshot.ts
- apps/web/src/lib/sync.ts
- apps/web/src/lib/track-registry.test.ts
- apps/web/src/lib/track-registry.ts

### Web hook

- apps/web/src/hooks/useContent.ts
- apps/web/src/hooks/useContentVersionInvalidation.ts
- apps/web/src/hooks/useCurrentWeek.ts
- apps/web/src/hooks/useDataScope.ts
- apps/web/src/hooks/useLearningActivity.test.tsx
- apps/web/src/hooks/useLearningActivity.ts
- apps/web/src/hooks/useLearningProfile.ts
- apps/web/src/hooks/useSRS.test.tsx
- apps/web/src/hooks/useSRS.ts
- apps/web/src/hooks/useTrackStatus.ts
- apps/web/src/hooks/useVocab.ts

### Web store

- apps/web/src/stores/auth-store.ts
- apps/web/src/stores/settings-store.ts
- apps/web/src/stores/ui-store.ts

### Web asset

- apps/web/public/_redirects
- apps/web/public/apple-touch-icon.png
- apps/web/public/brand-hero-eastasia-v2.png
- apps/web/public/brand-mark.png
- apps/web/public/favicon-16.png
- apps/web/public/favicon-32.png
- apps/web/public/masked-icon.svg
- apps/web/public/page-bg-unified.png
- apps/web/public/pwa-192x192.png
- apps/web/public/pwa-512x512.png
- apps/web/public/screenshots/desktop.png
- apps/web/public/screenshots/mobile.png

### Ops scripts

- scripts/check-doc-lifecycle.mjs
- scripts/check-markdown-links.mjs
- scripts/check-openapi-generated.mjs
- scripts/deploy-worker-with-release.mjs
- scripts/e2e-api-dev.sh
- scripts/gen-vapid.mjs
- scripts/lib/cloudflare-response.mjs
- scripts/post-deploy-observe.mjs
- scripts/project-ops-status.mjs
- scripts/purge-r2-pronunciation.mjs
- scripts/r1-preview-smoke.mjs
- scripts/setup-alerts.mjs
- scripts/setup-logpush.mjs
- scripts/verify-actual-browser-audio-evidence.mjs
- scripts/verify-audio-production-predeploy.mjs
- scripts/verify-browser-audio-contract.mjs
- scripts/verify-pages-auth-proxy.mjs

### E2E test

- e2e/audio-qa.spec.ts
- e2e/auth-helper.ts
- e2e/auth.spec.ts
- e2e/character-trainer.spec.ts
- e2e/home.spec.ts
- e2e/learning-activity.spec.ts
- e2e/learning-experience.spec.ts
- e2e/learning-track-isolation.spec.ts
- e2e/menu-smoke.spec.ts
- e2e/mobile-touch-audit.spec.ts
- e2e/n2-release-browse.spec.ts
- e2e/natural-search.spec.ts
- e2e/offline.spec.ts
- e2e/package.json
- e2e/playwright.config.ts
- e2e/pwa.spec.ts
- e2e/quiz-modes.spec.ts
- e2e/responsive-ui.spec.ts
- e2e/self-check.spec.ts
- e2e/settings-preferences.spec.ts
- e2e/settings-theme.spec.ts
- e2e/srs-review.spec.ts
- e2e/stats.spec.ts
- e2e/topik-character-trainer.spec.ts
- e2e/topik-helper.ts
- e2e/topik-owner-curriculum.spec.ts
- e2e/topik-product.spec.ts
- e2e/visual-regression.spec.ts
- e2e/visual-regression.spec.ts-snapshots/desktop-browse-vocab-chromium-darwin.png
- e2e/visual-regression.spec.ts-snapshots/desktop-browse-vocab-chromium-linux.png
- e2e/visual-regression.spec.ts-snapshots/desktop-home-chromium-darwin.png
- e2e/visual-regression.spec.ts-snapshots/desktop-home-chromium-linux.png
- e2e/visual-regression.spec.ts-snapshots/desktop-review-chromium-darwin.png
- e2e/visual-regression.spec.ts-snapshots/desktop-review-chromium-linux.png
- e2e/visual-regression.spec.ts-snapshots/desktop-sidebar-collapsed-chromium-darwin.png
- e2e/visual-regression.spec.ts-snapshots/desktop-sidebar-collapsed-chromium-linux.png
- e2e/visual-regression.spec.ts-snapshots/desktop-topik-dashboard-chromium-darwin.png
- e2e/visual-regression.spec.ts-snapshots/desktop-topik-dashboard-chromium-linux.png
- e2e/visual-regression.spec.ts-snapshots/desktop-topik-learn-chromium-darwin.png
- e2e/visual-regression.spec.ts-snapshots/desktop-topik-learn-chromium-linux.png
- e2e/visual-regression.spec.ts-snapshots/desktop-topik-placement-chromium-darwin.png
- e2e/visual-regression.spec.ts-snapshots/desktop-topik-placement-chromium-linux.png
- e2e/visual-regression.spec.ts-snapshots/desktop-welcome-chromium-darwin.png
- e2e/visual-regression.spec.ts-snapshots/desktop-welcome-chromium-linux.png
- e2e/visual-regression.spec.ts-snapshots/mobile-390-browse-vocab-chromium-darwin.png
- e2e/visual-regression.spec.ts-snapshots/mobile-390-browse-vocab-chromium-linux.png
- e2e/visual-regression.spec.ts-snapshots/mobile-390-home-chromium-darwin.png
- e2e/visual-regression.spec.ts-snapshots/mobile-390-home-chromium-linux.png
- e2e/visual-regression.spec.ts-snapshots/mobile-390-more-sheet-chromium-darwin.png
- e2e/visual-regression.spec.ts-snapshots/mobile-390-more-sheet-chromium-linux.png
- e2e/visual-regression.spec.ts-snapshots/mobile-390-review-chromium-darwin.png
- e2e/visual-regression.spec.ts-snapshots/mobile-390-review-chromium-linux.png
- e2e/visual-regression.spec.ts-snapshots/mobile-390-topik-dashboard-chromium-darwin.png
- e2e/visual-regression.spec.ts-snapshots/mobile-390-topik-dashboard-chromium-linux.png
- e2e/visual-regression.spec.ts-snapshots/mobile-390-topik-learn-chromium-darwin.png
- e2e/visual-regression.spec.ts-snapshots/mobile-390-topik-learn-chromium-linux.png
- e2e/visual-regression.spec.ts-snapshots/mobile-390-topik-placement-chromium-darwin.png
- e2e/visual-regression.spec.ts-snapshots/mobile-390-topik-placement-chromium-linux.png
- e2e/visual-regression.spec.ts-snapshots/mobile-390-welcome-chromium-darwin.png
- e2e/visual-regression.spec.ts-snapshots/mobile-390-welcome-chromium-linux.png
- e2e/visual-regression.spec.ts-snapshots/mobile-430-browse-vocab-chromium-darwin.png
- e2e/visual-regression.spec.ts-snapshots/mobile-430-browse-vocab-chromium-linux.png
- e2e/visual-regression.spec.ts-snapshots/mobile-430-home-chromium-darwin.png
- e2e/visual-regression.spec.ts-snapshots/mobile-430-home-chromium-linux.png
- e2e/visual-regression.spec.ts-snapshots/mobile-430-review-chromium-darwin.png
- e2e/visual-regression.spec.ts-snapshots/mobile-430-review-chromium-linux.png
- e2e/visual-regression.spec.ts-snapshots/mobile-430-topik-dashboard-chromium-darwin.png
- e2e/visual-regression.spec.ts-snapshots/mobile-430-topik-dashboard-chromium-linux.png
- e2e/visual-regression.spec.ts-snapshots/mobile-430-topik-learn-chromium-darwin.png
- e2e/visual-regression.spec.ts-snapshots/mobile-430-topik-learn-chromium-linux.png
- e2e/visual-regression.spec.ts-snapshots/mobile-430-topik-placement-chromium-darwin.png
- e2e/visual-regression.spec.ts-snapshots/mobile-430-topik-placement-chromium-linux.png
- e2e/visual-regression.spec.ts-snapshots/mobile-430-welcome-chromium-darwin.png
- e2e/visual-regression.spec.ts-snapshots/mobile-430-welcome-chromium-linux.png
- e2e/visual-regression.spec.ts-snapshots/tablet-768-browse-vocab-chromium-darwin.png
- e2e/visual-regression.spec.ts-snapshots/tablet-768-browse-vocab-chromium-linux.png
- e2e/visual-regression.spec.ts-snapshots/tablet-768-home-chromium-darwin.png
- e2e/visual-regression.spec.ts-snapshots/tablet-768-home-chromium-linux.png
- e2e/visual-regression.spec.ts-snapshots/tablet-768-review-chromium-darwin.png
- e2e/visual-regression.spec.ts-snapshots/tablet-768-review-chromium-linux.png
- e2e/visual-regression.spec.ts-snapshots/tablet-768-topik-dashboard-chromium-darwin.png
- e2e/visual-regression.spec.ts-snapshots/tablet-768-topik-dashboard-chromium-linux.png
- e2e/visual-regression.spec.ts-snapshots/tablet-768-topik-learn-chromium-darwin.png
- e2e/visual-regression.spec.ts-snapshots/tablet-768-topik-learn-chromium-linux.png
- e2e/visual-regression.spec.ts-snapshots/tablet-768-topik-placement-chromium-darwin.png
- e2e/visual-regression.spec.ts-snapshots/tablet-768-topik-placement-chromium-linux.png
- e2e/visual-regression.spec.ts-snapshots/tablet-768-welcome-chromium-darwin.png
- e2e/visual-regression.spec.ts-snapshots/tablet-768-welcome-chromium-linux.png
- e2e/vocab-search.spec.ts

### DB 설정

- packages/db/drizzle.config.ts
- packages/db/package.json
- packages/db/tsconfig.json

### 기타

- apps/api/package.json
- apps/api/scripts/export-openapi.ts
- apps/api/tsconfig.json
- apps/api/vitest.config.ts
- apps/api/wrangler.observability-receiver.toml
- apps/api/wrangler.test.toml
- apps/api/wrangler.toml
- packages/shared/package.json
- packages/shared/tsconfig.json
- pnpm-lock.yaml
