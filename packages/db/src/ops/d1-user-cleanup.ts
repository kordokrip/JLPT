import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

import { D1_TRANSFER_TABLES } from "./d1-tables.js";
import {
  TEST_EMAIL_DOMAINS,
  buildUserCleanupPlan,
  userFingerprint,
  verifyUserCleanupPlanHash,
  type CleanupUserRow,
  type UserCleanupCount,
  type UserCleanupPlan,
} from "./user-cleanup-plan.js";

type BackupManifest = {
  generatedAt: string;
  database: string;
  files: Array<{
    table: string;
    file: string;
    rowCount: number;
    sha256: string;
  }>;
};

type KeepFile = { keepUserIds: string[] };

type Options = {
  database: string;
  backupDir: string | undefined;
  keepFile: string | undefined;
  planFile: string | undefined;
  backupManifest: string | undefined;
  output: string;
  config: string;
  execute: boolean;
};

export type QuerySource = {
  query(sql: string): Record<string, unknown>[];
  close(): void;
};

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const BACKUP_TABLES = [
  "users",
  "auth_sessions",
  "login_events",
  "srs_cards",
  "review_logs",
  "topik_owner_curriculum_progress",
  "topik_owner_srs_cards",
  "topik_owner_review_logs",
  "daily_logs",
  "quiz_attempts",
  "self_check",
  "push_subscriptions",
] as const;

function argument(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv
    .slice(2)
    .find((value) => value.startsWith(prefix))
    ?.slice(prefix.length);
}

function resolveFromRoot(value: string): string {
  return path.isAbsolute(value) ? value : path.resolve(root, value);
}

export function requireExplicitDatabase(value: string | undefined): string {
  if (!value) throw new Error("--database=<explicit D1 name> is required");
  if (!/^[a-z0-9][a-z0-9_-]{0,62}$/i.test(value)) {
    throw new Error("invalid D1 database name");
  }
  return value;
}

function parseOptions(): Options {
  const execute = process.argv.includes("--execute");
  const database = requireExplicitDatabase(argument("database"));

  const credentialsFile = argument("credentials-file");
  if (credentialsFile) {
    const loaded = loadEnv({
      path: resolveFromRoot(credentialsFile),
      override: false,
    });
    if (loaded.error) throw loaded.error;
  }

  const backup = argument("backup");
  const keepFile = argument("keep-file");
  const planFile = argument("plan");
  const backupManifest = argument("backup-manifest");
  if (execute) {
    if (!planFile || !backupManifest) {
      throw new Error(
        "--execute requires --plan=<remote plan> and --backup-manifest=<fresh manifest>",
      );
    }
  } else {
    if (!keepFile)
      throw new Error("dry-run requires --keep-file=<JSON allowlist>");
  }

  return {
    database,
    backupDir: backup ? resolveFromRoot(backup) : undefined,
    keepFile: keepFile ? resolveFromRoot(keepFile) : undefined,
    planFile: planFile ? resolveFromRoot(planFile) : undefined,
    backupManifest: backupManifest
      ? resolveFromRoot(backupManifest)
      : undefined,
    output: resolveFromRoot(
      argument("out") ??
        `.artifacts/user-cleanup/${execute ? "execution" : "dry-run"}-${Date.now()}.json`,
    ),
    config: resolveFromRoot(argument("config") ?? "apps/api/wrangler.toml"),
    execute,
  };
}

function parseWranglerResults(raw: string): Record<string, unknown>[] {
  const parsed = JSON.parse(raw) as Array<{
    results?: Record<string, unknown>[];
  }>;
  return parsed[0]?.results ?? [];
}

export function safeWranglerFailure(error: unknown): Error {
  const stdout =
    typeof error === "object" && error !== null && "stdout" in error
      ? String(error.stdout ?? "")
      : "";
  let code = "unknown";
  try {
    const parsed = JSON.parse(stdout.trim()) as {
      error?: { code?: string | number };
    };
    if (parsed.error?.code != null) code = String(parsed.error.code);
  } catch {
    // Wrangler may fail before Cloudflare returns a JSON response.
  }
  return new Error(`Remote D1 operation failed (Cloudflare code ${code})`);
}

function wranglerRaw(
  database: string,
  sql: string,
  config: string,
): string {
  if (!process.env["CLOUDFLARE_API_TOKEN"]) {
    throw new Error("CLOUDFLARE_API_TOKEN is required for remote D1 access");
  }
  try {
    return execFileSync(
      "pnpm",
      [
        "exec",
        "wrangler",
        "d1",
        "execute",
        database,
        "--remote",
        "--json",
        `--command=${sql}`,
        `--config=${config}`,
      ],
      {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, CI: "true", WRANGLER_WRITE_LOGS: "0" },
      },
    );
  } catch (error) {
    throw safeWranglerFailure(error);
  }
}

function remoteSource(database: string, config: string): QuerySource {
  return {
    query: (sql) => parseWranglerResults(wranglerRaw(database, sql, config)),
    close: () => undefined,
  };
}

function readManifest(file: string): BackupManifest {
  const manifest = JSON.parse(fs.readFileSync(file, "utf8")) as BackupManifest;
  if (
    !manifest.database ||
    !manifest.generatedAt ||
    !Array.isArray(manifest.files)
  ) {
    throw new Error(`invalid backup manifest: ${file}`);
  }
  return manifest;
}

function validateBackupDirectory(directory: string): BackupManifest {
  const manifestPath = path.join(directory, "manifest.json");
  const manifest = readManifest(manifestPath);
  const expectedTables = D1_TRANSFER_TABLES.map((table) => table.name).sort();
  const manifestTables = manifest.files.map((entry) => entry.table).sort();
  if (
    new Set(manifestTables).size !== manifestTables.length ||
    JSON.stringify(manifestTables) !== JSON.stringify(expectedTables)
  ) {
    throw new Error(
      "backup manifest table allowlist does not match the canonical transfer table list",
    );
  }

  for (const entry of manifest.files) {
    if (path.basename(entry.file) !== entry.file) {
      throw new Error(
        `backup manifest contains an unsafe file path: ${entry.table}`,
      );
    }
    const file = path.join(directory, entry.file);
    if (!fs.existsSync(file))
      throw new Error(`backup file is missing: ${file}`);
    const hash = createHash("sha256")
      .update(fs.readFileSync(file))
      .digest("hex");
    if (hash !== entry.sha256)
      throw new Error(`backup checksum mismatch: ${entry.table}`);
  }

  for (const table of BACKUP_TABLES) {
    if (!manifest.files.some((file) => file.table === table)) {
      throw new Error(`backup manifest is missing user data table ${table}`);
    }
  }
  return manifest;
}

function sqliteReadCommand(file: string): string {
  return `.read "${file.replaceAll('"', '""')}"`;
}

function backupSource(directory: string): {
  source: QuerySource;
  manifest: BackupManifest;
} {
  const manifest = validateBackupDirectory(directory);
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "nihongo-n3-user-cleanup-"),
  );
  const database = path.join(tempDir, "backup.sqlite");
  const sqlite = (args: string[]): string =>
    execFileSync("sqlite3", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });

  sqlite([
    database,
    sqliteReadCommand(
      path.join(root, "packages/db/drizzle-v2/0000_schema_convergence.sql"),
    ),
  ]);
  for (const table of BACKUP_TABLES) {
    const entry = manifest.files.find((file) => file.table === table)!;
    sqlite([database, sqliteReadCommand(path.join(directory, entry.file))]);
  }

  return {
    manifest,
    source: {
      query(sql: string): Record<string, unknown>[] {
        const raw = sqlite(["-json", database, sql]).trim();
        return raw ? (JSON.parse(raw) as Record<string, unknown>[]) : [];
      },
      close(): void {
        fs.rmSync(tempDir, { recursive: true, force: true });
      },
    },
  };
}

function sqlLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function sqlList(values: string[]): string {
  if (values.length === 0) throw new Error("SQL list must not be empty");
  return values.map(sqlLiteral).join(",");
}

function testDomainPredicate(column: string): string {
  return `lower(substr(${column}, instr(${column}, '@') + 1)) IN (${sqlList([...TEST_EMAIL_DOMAINS])})`;
}

function readUsers(source: QuerySource): CleanupUserRow[] {
  return source
    .query(
      `SELECT id, email, COALESCE(role, 'user') AS role,
            auth_provider, created_at, last_login_at
       FROM users
      ORDER BY id`,
    )
    .map((row) => ({
      id: String(row["id"] ?? ""),
      email: String(row["email"] ?? ""),
      role: String(row["role"] ?? "user"),
      auth_provider: String(row["auth_provider"] ?? "password"),
      created_at: Number(row["created_at"] ?? 0),
      last_login_at:
        row["last_login_at"] == null ? null : Number(row["last_login_at"]),
    }));
}

export function collectRelatedCounts(
  source: QuerySource,
  keepUserIds: string[],
  candidateUserIds: string[],
): UserCleanupCount[] {
  const keep = sqlList(keepUserIds);
  const remove = sqlList(candidateUserIds);
  const queries = [
    `SELECT 'users' AS table_name, COUNT(*) AS total,
           SUM(CASE WHEN id IN (${keep}) THEN 1 ELSE 0 END) AS keep_rows,
           SUM(CASE WHEN id IN (${remove}) THEN 1 ELSE 0 END) AS delete_rows
      FROM users`,
    `SELECT 'auth_sessions' AS table_name, COUNT(*) AS total,
           SUM(CASE WHEN user_id IN (${keep}) THEN 1 ELSE 0 END) AS keep_rows,
           SUM(CASE WHEN user_id IN (${remove}) THEN 1 ELSE 0 END) AS delete_rows
      FROM auth_sessions`,
    `SELECT 'login_events' AS table_name, COUNT(*) AS total,
           SUM(CASE WHEN user_id IN (${keep}) THEN 1 ELSE 0 END) AS keep_rows,
           SUM(CASE WHEN user_id IN (${remove}) OR (user_id IS NULL AND ${testDomainPredicate("email")}) THEN 1 ELSE 0 END) AS delete_rows
      FROM login_events`,
    `SELECT 'srs_cards' AS table_name, COUNT(*) AS total,
           SUM(CASE WHEN user_id IN (${keep}) THEN 1 ELSE 0 END) AS keep_rows,
           SUM(CASE WHEN user_id IN (${remove}) THEN 1 ELSE 0 END) AS delete_rows
      FROM srs_cards`,
    `SELECT 'review_logs' AS table_name, COUNT(*) AS total,
           SUM(CASE WHEN card_id IN (SELECT id FROM srs_cards WHERE user_id IN (${keep})) THEN 1 ELSE 0 END) AS keep_rows,
           SUM(CASE WHEN card_id IN (SELECT id FROM srs_cards WHERE user_id IN (${remove})) THEN 1 ELSE 0 END) AS delete_rows
      FROM review_logs`,
    `SELECT 'topik_owner_curriculum_progress' AS table_name, COUNT(*) AS total,
           SUM(CASE WHEN user_id IN (${keep}) THEN 1 ELSE 0 END) AS keep_rows,
           SUM(CASE WHEN user_id IN (${remove}) THEN 1 ELSE 0 END) AS delete_rows
      FROM topik_owner_curriculum_progress`,
    `SELECT 'topik_owner_srs_cards' AS table_name, COUNT(*) AS total,
           SUM(CASE WHEN user_id IN (${keep}) THEN 1 ELSE 0 END) AS keep_rows,
           SUM(CASE WHEN user_id IN (${remove}) THEN 1 ELSE 0 END) AS delete_rows
      FROM topik_owner_srs_cards`,
    `SELECT 'topik_owner_review_logs' AS table_name, COUNT(*) AS total,
           SUM(CASE WHEN card_id IN (SELECT id FROM topik_owner_srs_cards WHERE user_id IN (${keep})) THEN 1 ELSE 0 END) AS keep_rows,
           SUM(CASE WHEN card_id IN (SELECT id FROM topik_owner_srs_cards WHERE user_id IN (${remove})) THEN 1 ELSE 0 END) AS delete_rows
      FROM topik_owner_review_logs`,
    `SELECT 'daily_logs' AS table_name, COUNT(*) AS total,
           SUM(CASE WHEN user_id IN (${keep}) THEN 1 ELSE 0 END) AS keep_rows,
           SUM(CASE WHEN user_id IN (${remove}) THEN 1 ELSE 0 END) AS delete_rows
      FROM daily_logs`,
    `SELECT 'quiz_attempts' AS table_name, COUNT(*) AS total,
           SUM(CASE WHEN user_id IN (${keep}) THEN 1 ELSE 0 END) AS keep_rows,
           SUM(CASE WHEN user_id IN (${remove}) THEN 1 ELSE 0 END) AS delete_rows
      FROM quiz_attempts`,
    `SELECT 'self_check' AS table_name, COUNT(*) AS total,
           SUM(CASE WHEN user_id IN (${keep}) THEN 1 ELSE 0 END) AS keep_rows,
           SUM(CASE WHEN user_id IN (${remove}) THEN 1 ELSE 0 END) AS delete_rows
      FROM self_check`,
    `SELECT 'push_subscriptions' AS table_name, COUNT(*) AS total,
           SUM(CASE WHEN user_id IN (${keep}) THEN 1 ELSE 0 END) AS keep_rows,
           SUM(CASE WHEN user_id IN (${remove}) THEN 1 ELSE 0 END) AS delete_rows
      FROM push_subscriptions`,
    `SELECT 'oauth_login_tokens' AS table_name, COUNT(*) AS total,
           SUM(CASE WHEN user_id IN (${keep}) THEN 1 ELSE 0 END) AS keep_rows,
           SUM(CASE WHEN user_id IN (${remove}) THEN 1 ELSE 0 END) AS delete_rows
      FROM oauth_login_tokens`,
  ];
  const rows = queries.flatMap((query) => source.query(query));

  return rows.map((row) => {
    const total = Number(row["total"] ?? 0);
    const keepRows = Number(row["keep_rows"] ?? 0);
    const deleteRows = Number(row["delete_rows"] ?? 0);
    return {
      table: String(row["table_name"] ?? ""),
      total,
      keepRows,
      deleteRows,
      unmatchedRows: total - keepRows - deleteRows,
    };
  });
}

function readKeepFile(file: string): string[] {
  const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as KeepFile;
  if (
    !Array.isArray(parsed.keepUserIds) ||
    parsed.keepUserIds.some((id) => typeof id !== "string")
  ) {
    throw new Error('keep file must contain { "keepUserIds": ["...", "..."] }');
  }
  return parsed.keepUserIds;
}

function writeJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, {
    mode: 0o600,
  });
  fs.chmodSync(file, 0o600);
}

function buildPlan(
  source: QuerySource,
  keepUserIds: string[],
  mode: "backup" | "remote",
  database: string,
): UserCleanupPlan {
  const users = readUsers(source);
  const candidateIds = users
    .filter((user) => !keepUserIds.includes(user.id))
    .map((user) => user.id);
  const counts = collectRelatedCounts(source, keepUserIds, candidateIds);
  return buildUserCleanupPlan({
    users,
    keepUserIds,
    relatedCounts: counts,
    source: mode,
    database,
  });
}

function assertFreshBackup(
  manifestFile: string,
  database: string,
  expectedUsers: number,
): BackupManifest {
  const expectedManifest = path.join(
    path.dirname(manifestFile),
    "manifest.json",
  );
  if (path.resolve(manifestFile) !== path.resolve(expectedManifest)) {
    throw new Error(
      "--backup-manifest must point to the backup directory manifest.json",
    );
  }
  const manifest = validateBackupDirectory(path.dirname(manifestFile));
  if (manifest.database !== database)
    throw new Error("backup manifest database does not match cleanup database");
  const generatedAt = Date.parse(manifest.generatedAt);
  if (
    !Number.isFinite(generatedAt) ||
    Date.now() - generatedAt > 24 * 60 * 60 * 1000
  ) {
    throw new Error("backup manifest must be valid and less than 24 hours old");
  }
  const users = manifest.files.find((entry) => entry.table === "users");
  if (!users || users.rowCount !== expectedUsers) {
    throw new Error(
      "backup user row count does not match the approved cleanup plan",
    );
  }
  return manifest;
}

function assertSameIdentities(
  label: string,
  expected: UserCleanupPlan["keepUsers"],
  actualUsers: CleanupUserRow[],
): void {
  const actual = new Map(
    actualUsers.map((user) => [user.id, userFingerprint(user)]),
  );
  const mismatches = expected.filter(
    (entry) => actual.get(entry.id) !== entry.fingerprint,
  );
  if (mismatches.length > 0 || actual.size !== expected.length) {
    throw new Error(
      `${label} changed after approval; generate a new remote dry-run plan`,
    );
  }
}

function cleanupSql(candidateIds: string[]): string {
  const candidates = sqlList(candidateIds);
  return `
    PRAGMA defer_foreign_keys = true;
    DELETE FROM review_logs
     WHERE card_id IN (SELECT id FROM srs_cards WHERE user_id IN (${candidates}));
    DELETE FROM topik_owner_review_logs
     WHERE card_id IN (SELECT id FROM topik_owner_srs_cards WHERE user_id IN (${candidates}));
    DELETE FROM auth_sessions WHERE user_id IN (${candidates});
    DELETE FROM oauth_login_tokens WHERE user_id IN (${candidates});
    DELETE FROM push_subscriptions WHERE user_id IN (${candidates});
    DELETE FROM daily_logs WHERE user_id IN (${candidates});
    DELETE FROM quiz_attempts WHERE user_id IN (${candidates});
    DELETE FROM self_check WHERE user_id IN (${candidates});
    DELETE FROM srs_cards WHERE user_id IN (${candidates});
    DELETE FROM topik_owner_srs_cards WHERE user_id IN (${candidates});
    DELETE FROM topik_owner_curriculum_progress WHERE user_id IN (${candidates});
    DELETE FROM login_events
     WHERE user_id IN (${candidates})
        OR (user_id IS NULL AND ${testDomainPredicate("email")});
    DELETE FROM users WHERE id IN (${candidates});
  `;
}

function executePlan(options: Options): void {
  const plan = JSON.parse(
    fs.readFileSync(options.planFile!, "utf8"),
  ) as UserCleanupPlan;
  if (!verifyUserCleanupPlanHash(plan))
    throw new Error("cleanup plan hash is invalid");
  if (plan.source !== "remote")
    throw new Error("execution requires a remote dry-run plan");
  if (plan.database !== options.database)
    throw new Error("cleanup plan database does not match --database");
  const generatedAt = Date.parse(plan.generatedAt);
  if (
    !Number.isFinite(generatedAt) ||
    Date.now() - generatedAt > 60 * 60 * 1000
  ) {
    throw new Error("remote cleanup plan is older than 60 minutes");
  }
  if (process.env["ALLOW_PRODUCTION_CHANGE"] !== "user-cleanup") {
    throw new Error(
      "set ALLOW_PRODUCTION_CHANGE=user-cleanup in the approved environment",
    );
  }
  const confirmation = `DELETE_${plan.deleteCandidates.length}_TEST_USERS`;
  if (process.env["USER_CLEANUP_CONFIRMATION"] !== confirmation) {
    throw new Error(
      `set USER_CLEANUP_CONFIRMATION=${confirmation} in the approved environment`,
    );
  }
  assertFreshBackup(
    options.backupManifest!,
    options.database,
    plan.summary.totalUsers,
  );

  const source = remoteSource(options.database, options.config);
  try {
    const currentUsers = readUsers(source);
    const keepIds = plan.keepUsers.map((user) => user.id);
    const candidateIds = plan.deleteCandidates.map((user) => user.id);
    assertSameIdentities(
      "keep users",
      plan.keepUsers,
      currentUsers.filter((user) => keepIds.includes(user.id)),
    );
    assertSameIdentities(
      "delete candidates",
      plan.deleteCandidates,
      currentUsers.filter((user) => candidateIds.includes(user.id)),
    );
    if (currentUsers.length !== plan.summary.totalUsers) {
      throw new Error(
        "user inventory changed after approval; generate a new remote dry-run plan",
      );
    }

    wranglerRaw(
      options.database,
      cleanupSql(candidateIds),
      options.config,
    );

    const remainingUsers = readUsers(source);
    assertSameIdentities(
      "remaining keep users",
      plan.keepUsers,
      remainingUsers,
    );
    const candidateList = sqlList(candidateIds);
    const checks =
      source.query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE id IN (${candidateList})) AS users,
        (SELECT COUNT(*) FROM auth_sessions WHERE user_id IN (${candidateList})) AS auth_sessions,
        (SELECT COUNT(*) FROM oauth_login_tokens WHERE user_id IN (${candidateList})) AS oauth_login_tokens,
        (SELECT COUNT(*) FROM srs_cards WHERE user_id IN (${candidateList})) AS srs_cards,
        (SELECT COUNT(*) FROM review_logs WHERE card_id IN (SELECT id FROM srs_cards WHERE user_id IN (${candidateList}))) AS review_logs,
        (SELECT COUNT(*) FROM topik_owner_curriculum_progress WHERE user_id IN (${candidateList})) AS topik_owner_curriculum_progress,
        (SELECT COUNT(*) FROM topik_owner_srs_cards WHERE user_id IN (${candidateList})) AS topik_owner_srs_cards,
        (SELECT COUNT(*) FROM topik_owner_review_logs WHERE card_id IN (SELECT id FROM topik_owner_srs_cards WHERE user_id IN (${candidateList}))) AS topik_owner_review_logs,
        (SELECT COUNT(*) FROM daily_logs WHERE user_id IN (${candidateList})) AS daily_logs,
        (SELECT COUNT(*) FROM quiz_attempts WHERE user_id IN (${candidateList})) AS quiz_attempts,
        (SELECT COUNT(*) FROM self_check WHERE user_id IN (${candidateList})) AS self_check,
        (SELECT COUNT(*) FROM push_subscriptions WHERE user_id IN (${candidateList})) AS push_subscriptions,
        (SELECT COUNT(*) FROM login_events WHERE user_id IN (${candidateList}) OR (user_id IS NULL AND ${testDomainPredicate("email")})) AS login_events
    `)[0] ?? {};
    const remainingReferences = Object.fromEntries(
      Object.entries(checks).map(([key, value]) => [key, Number(value ?? 0)]),
    );
    if (Object.values(remainingReferences).some((value) => value !== 0)) {
      throw new Error("post-cleanup reference verification failed");
    }
    const foreignKeyViolations = source.query("PRAGMA foreign_key_check");
    if (foreignKeyViolations.length > 0)
      throw new Error("post-cleanup foreign_key_check failed");

    writeJson(options.output, {
      version: 1,
      executedAt: new Date().toISOString(),
      database: options.database,
      approvedPlanHash: plan.planHash,
      deletedUsers: candidateIds.length,
      remainingUsers: remainingUsers.length,
      remainingReferences,
      foreignKeyViolations: 0,
      verified: true,
    });
    console.log(
      `User cleanup verified: deleted=${candidateIds.length} remaining=${remainingUsers.length}`,
    );
    console.log(`Execution report: ${options.output}`);
  } finally {
    source.close();
  }
}

function dryRun(options: Options): void {
  let source: QuerySource;
  let mode: "backup" | "remote";
  let manifest: BackupManifest | undefined;
  if (options.backupDir) {
    const backup = backupSource(options.backupDir);
    source = backup.source;
    manifest = backup.manifest;
    mode = "backup";
  } else {
    source = remoteSource(options.database, options.config);
    mode = "remote";
  }

  try {
    const plan = buildPlan(
      source,
      readKeepFile(options.keepFile!),
      mode,
      options.database,
    );
    writeJson(options.output, {
      ...plan,
      ...(manifest
        ? {
            backupEvidence: {
              generatedAt: manifest.generatedAt,
              users:
                manifest.files.find((entry) => entry.table === "users")
                  ?.rowCount ?? null,
              manifestSha256: createHash("sha256")
                .update(
                  fs.readFileSync(
                    path.join(options.backupDir!, "manifest.json"),
                  ),
                )
                .digest("hex"),
            },
          }
        : {}),
    });
    console.log(
      `User cleanup dry-run: total=${plan.summary.totalUsers} keep=${plan.summary.keepUsers} delete=${plan.summary.deleteCandidates}`,
    );
    console.log(`Dry-run report: ${options.output}`);
  } finally {
    source.close();
  }
}

const entry = process.argv[1];
if (entry && path.resolve(entry) === fileURLToPath(import.meta.url)) {
  const options = parseOptions();
  if (options.execute) executePlan(options);
  else dryRun(options);
}
