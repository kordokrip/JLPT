// 강성호 2026-10-11: 실제 두 승인 콘텐츠를 폐기 가능한 로컬 Worker 테스트 DB에 연결한다. 이 공개 상태 fixture는 릴리스/G0–G4 증거가 아니다.
import { DatabaseSync } from "node:sqlite";
import { existsSync, readFileSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
import { basename, isAbsolute, join, relative, resolve } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { learningPathV4Readiness } from "./learning-path-v4-readiness.js";
import { resolveLearningPathV4SourceBinding } from "./learning-path-v4-source-binding.js";
import { buildLearningPathV4DraftPlan, buildLearningPathV4LessonPlan, type Db } from "../seed/learning-path-v4-draft.js";
import type { FrozenLearningPathV4 } from "./learning-path-v4-freeze.js";
import type { IndependentReview } from "./learning-path-evidence.js";

export function preflightReviewedLearningE2E(cohort: string, reviewA: string, reviewB: string) {
  // 모든 증적은 DB를 열기 전에 검증한다. 합성 승인/자동 공개로 우회하지 않는다.
  const publicSelectionBytes = readFileSync(new URL("../content/learning-path-v4-2026-10-11/selected-concepts.json", import.meta.url));
  const input = {
    bundle: JSON.parse(readFileSync(join(cohort, "bundle.json"), "utf8")) as FrozenLearningPathV4,
    sourceBytes: readFileSync(join(cohort, "source.json")),
    inventoryBytes: readFileSync(join(cohort, "concepts.json")),
    publicSelectionBytes,
    trustedSourceBinding: resolveLearningPathV4SourceBinding(publicSelectionBytes),
    reviews: [reviewA, reviewB].map(path => JSON.parse(readFileSync(path, "utf8")) as IndependentReview),
  };
  const readiness = learningPathV4Readiness(input);
  if (!readiness.full_bank_ready) throw new Error("reviewed E2E fixture requires actual two full-bank approvals");
  if (process.env.E2E_BASE_URL || process.env.E2E_SKIP_DB_BOOTSTRAP === "1" || process.env.E2E_REUSE_EXISTING_SERVER === "1") throw new Error("reviewed fixture refuses external or reused runtime");
  return input;
}

// 강성호 2026-10-11: Miniflare의 metadata.sqlite는 사용자 D1이 아니다. 해시 이름의 데이터 파일 한 개만 명시적으로 선택한다.
export function reviewedD1DatabaseName(names: string[]) {
  const sqlite = names.filter(name => name.endsWith(".sqlite"));
  const data = sqlite.filter(name => /^[a-f0-9]{64}\.sqlite$/u.test(name));
  if (data.length !== 1 || sqlite.some(name => name !== "metadata.sqlite" && !data.includes(name)))
    throw new Error("reviewed fixture requires exactly one isolated Worker D1 data database");
  return data[0]!;
}

// 강성호 2026-10-11: 0002의 자격 증명 없는 기본 owner는 학습 기록이 아니다. 정확한 기본 행만 보존 허용하고 실제 계정·활동은 계속 거부한다.
export function assertReviewedBootstrapUsers(db: DatabaseSync) {
  const users = db.prepare("SELECT id,email,display_name,role,auth_provider,password_hash,google_sub,last_login_at,fsrs_options,fsrs_weights,srs_settings,learning_track FROM users").all();
  if (users.length === 0) return;
  const expected = { id: "owner", email: "owner@nihongo-n3.local", display_name: "Owner", role: "admin", auth_provider: "password", password_hash: null, google_sub: null, last_login_at: null, fsrs_options: null, fsrs_weights: null, srs_settings: null, learning_track: "jlpt-ja" };
  if (users.length !== 1 || Object.entries(expected).some(([key, value]) => users[0]![key] !== value))
    throw new Error("reviewed E2E refuses existing learner accounts");
}

export function assertReviewedBootstrapRecords(db: DatabaseSync) {
  // 모든 user_id 표를 발견해 인증·진단·퀴즈·프로필까지 검사한다. 사용자 ID가 없는 종속 기록/인증 상태도 명시적으로 포함한다.
  const names = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(row => String(row.name));
  for (const name of names) {
    const quoted = `"${name.replaceAll('"', '""')}"`;
    if (name === "track_srs_settings") {
      // 0008은 기본 owner의 빈 JLPT 설정을 복사한다. 이 초기 설정 하나만 값까지 검증해 보존한다.
      const rows = db.prepare("SELECT user_id,learning_track,fsrs_options,fsrs_weights,srs_settings FROM track_srs_settings").all();
      const baseline = { user_id: "owner", learning_track: "jlpt-ja", fsrs_options: null, fsrs_weights: null, srs_settings: null };
      if (rows.length === 0) continue;
      if (rows.length === 1 && Object.entries(baseline).every(([key, value]) => rows[0]![key] === value) &&
          Number(db.prepare("SELECT count(*) n FROM users WHERE id='owner'").get()!.n) === 1) continue;
      throw new Error("reviewed E2E refuses existing learner settings");
    }
    const owned = db.prepare(`PRAGMA table_info(${quoted})`).all().some(column => column.name === "user_id");
    if ((owned || ["study_steps", "review_logs", "topik_owner_review_logs", "oauth_states"].includes(name)) &&
        Number(db.prepare(`SELECT count(*) n FROM ${quoted}`).get()!.n) !== 0)
      throw new Error(`reviewed E2E refuses existing learner records: ${name}`);
  }
}

export function seedReviewedLearningE2EFixture(persistTo: string, cohort: string, reviewA: string, reviewB: string) {
  const input = preflightReviewedLearningE2E(cohort, reviewA, reviewB);
  const root = realpathSync(persistTo), withinTemp = relative(realpathSync(tmpdir()), root);
  if (withinTemp.startsWith("..") || isAbsolute(withinTemp) || !basename(root).startsWith("nihongo-n3-reviewed-e2e-")) throw new Error("reviewed E2E requires a dedicated new system-temporary persistence root");
  const d1 = join(root, "v3", "d1", "miniflare-D1DatabaseObject");
  const dataFile = reviewedD1DatabaseName(readdirSync(d1));
  const sqlite = realpathSync(join(d1, dataFile));
  const inside = relative(root, sqlite);
  if (inside.startsWith("..") || isAbsolute(inside)) throw new Error("D1 database escapes dedicated persistence");
  const db = new DatabaseSync(sqlite);
  try {
    db.exec("PRAGMA foreign_keys=ON; BEGIN IMMEDIATE");
    assertReviewedBootstrapUsers(db);
    assertReviewedBootstrapRecords(db);
    if (Number((db.prepare("SELECT count(*) n FROM content_releases WHERE content_version=?").get(input.bundle.version) as { n: number }).n)) throw new Error("reviewed E2E fixture is bootstrap-only, not a reseed/publication command");
    const draft = buildLearningPathV4DraftPlan(db, input);
    // 런타임 경로 검사를 위한 최초 상태 fixture다. 실제 release의 draft→published 전환/G0–G4 승인으로 기록하지 않는다.
    const statements = draft.statements.map(sql => sql.startsWith("INSERT OR IGNORE INTO content_releases ") ? sql.replace(",'draft',", ",'published',") : sql);
    if (statements.filter(sql => sql.startsWith("INSERT OR IGNORE INTO content_releases ") && sql.includes(",'published',")).length !== 2) throw new Error("test-only visibility fixture contract mismatch");
    db.exec(statements.join("\n"));
    // 강성호 2026-10-12: test-only INITIAL release 상태만 정규화한다. 실제 출판 API/G0–G4를 우회한 승인 증거로 사용하지 않는다.
    const fixturePlanningDb: Db = { exec() { throw new Error("Planning view is read-only"); }, prepare(sql) { return {
      all(...values) { return db.prepare(sql).all(...values as (string|number|null)[]).map(row =>
        sql.startsWith("SELECT * FROM content_releases WHERE") ? {...row,release_state:"draft"} : row); },
    }; } };
    const lessons = buildLearningPathV4LessonPlan(fixturePlanningDb, input);
    db.exec(lessons.statements.join("\n"));
    db.prepare("UPDATE content_quality_audits SET release_state='published' WHERE content_version=?").run(input.bundle.version);
    db.prepare("UPDATE jlpt_practice_questions SET is_published=1 WHERE bank_version=?").run(input.bundle.version);
    db.prepare("UPDATE learning_lessons SET is_published=1 WHERE version=?").run(input.bundle.version);
    if (db.prepare("PRAGMA foreign_key_check").all().length) throw new Error("reviewed E2E fixture FK failure");
    db.exec("COMMIT");
    return { scope: "isolated-actual-content-runtime-test-only", publication_gate_evidence: false, draft_sha256: input.bundle.draft_sha256, source_evidence_sha256: input.bundle.source_evidence_sha256, concept_inventory_sha256: input.bundle.concept_inventory_sha256, counts: { ...draft.counts, ...lessons.counts }, resolved_concepts: Object.fromEntries(draft.resolved), remote_writes: 0 };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  } finally { db.close(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const allowed = ["persist-to", "cohort", "review-a", "review-b"];
  const args = process.argv.slice(2);
  if (args.includes("--preflight")) {
    const rest = args.filter(arg => arg !== "--preflight");
    if (rest.length !== 3 || rest.some(arg => !allowed.slice(1).some(name => arg.startsWith(`--${name}=`)))) throw new Error("preflight requires only cohort and two actual reviews");
    const paths = allowed.slice(1).map(name => rest.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3));
    if (paths.some(path => !path)) throw new Error("preflight requires all three evidence inputs");
    const input = preflightReviewedLearningE2E(...paths.map(path => resolve(path!)) as [string, string, string]);
    console.log(JSON.stringify({ full_bank_ready: true, draft_sha256: input.bundle.draft_sha256, sqlite_files_opened: 0, remote_writes: 0 }));
    process.exit(0);
  }
  if (args.length !== 4 || args.some(arg => !allowed.some(name => arg.startsWith(`--${name}=`)))) throw new Error("only explicit local persistence/cohort/review flags accepted");
  const option = (name: string) => args.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
  if (allowed.some(name => !option(name))) throw new Error("all four local fixture flags are required");
  // 강성호 2026-10-11: 환경별 정수 ID를 운영 ID로 가정하지 않고 실제 격리 DB의 해석 결과를 테스트와 대조한다.
  const reportPath = process.env.E2E_REVIEWED_FIXTURE_REPORT;
  if (!reportPath || existsSync(reportPath)) throw new Error("reviewed fixture requires a new evidence report path");
  const result = seedReviewedLearningE2EFixture(...allowed.map(name => resolve(option(name)!)) as [string, string, string, string]);
  writeFileSync(reportPath, `${JSON.stringify(result, null, 2)}\n`, { flag: "wx" });
  const { resolved_concepts, ...summary } = result;
  console.log(JSON.stringify(summary));
}
