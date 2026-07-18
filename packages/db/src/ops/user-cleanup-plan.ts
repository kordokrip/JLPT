import { createHash } from "node:crypto";

export const USER_CLEANUP_PLAN_VERSION = 1 as const;
export const TEST_EMAIL_DOMAINS = [
  "example.com",
  "example.invalid",
  "nihongo-n3.local",
] as const;

export type CleanupUserRow = {
  id: string;
  email: string;
  role: string;
  auth_provider: string;
  created_at: number;
  last_login_at: number | null;
};

export type UserCleanupCount = {
  table: string;
  total: number;
  keepRows: number;
  deleteRows: number;
  unmatchedRows: number;
};

export type UserCleanupIdentity = {
  id: string;
  emailHint: string;
  emailDomain: string;
  role: string;
  authProvider: string;
  createdAt: number;
  lastLoginAt: number | null;
  fingerprint: string;
};

export type UserCleanupPlan = {
  version: typeof USER_CLEANUP_PLAN_VERSION;
  generatedAt: string;
  source: "backup" | "remote";
  database: string;
  keepUsers: UserCleanupIdentity[];
  deleteCandidates: UserCleanupIdentity[];
  relatedCounts: UserCleanupCount[];
  testEmailDomains: readonly string[];
  summary: {
    totalUsers: number;
    keepUsers: number;
    deleteCandidates: number;
    deleteRelatedRows: number;
  };
  planHash: string;
};

function normalizedEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function emailDomain(email: string): string {
  const normalized = normalizedEmail(email);
  const at = normalized.lastIndexOf("@");
  return at >= 0 ? normalized.slice(at + 1) : "";
}

export function maskEmail(email: string): string {
  const normalized = normalizedEmail(email);
  const at = normalized.lastIndexOf("@");
  if (at <= 0) return "***";
  const local = normalized.slice(0, at);
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${normalized.slice(at + 1)}`;
}

export function userFingerprint(user: CleanupUserRow): string {
  return createHash("sha256")
    .update(
      JSON.stringify([
        user.id,
        normalizedEmail(user.email),
        user.created_at,
        user.role,
        user.auth_provider,
      ]),
    )
    .digest("hex");
}

function identity(user: CleanupUserRow): UserCleanupIdentity {
  return {
    id: user.id,
    emailHint: maskEmail(user.email),
    emailDomain: emailDomain(user.email),
    role: user.role,
    authProvider: user.auth_provider,
    createdAt: user.created_at,
    lastLoginAt: user.last_login_at,
    fingerprint: userFingerprint(user),
  };
}

function hashPlan(plan: Omit<UserCleanupPlan, "planHash">): string {
  return createHash("sha256").update(JSON.stringify(plan)).digest("hex");
}

export function verifyUserCleanupPlanHash(plan: UserCleanupPlan): boolean {
  const unsigned: Omit<UserCleanupPlan, "planHash"> = {
    version: plan.version,
    generatedAt: plan.generatedAt,
    source: plan.source,
    database: plan.database,
    keepUsers: plan.keepUsers,
    deleteCandidates: plan.deleteCandidates,
    relatedCounts: plan.relatedCounts,
    testEmailDomains: plan.testEmailDomains,
    summary: plan.summary,
  };
  return plan.planHash === hashPlan(unsigned);
}

export function buildUserCleanupPlan(input: {
  users: CleanupUserRow[];
  keepUserIds: string[];
  relatedCounts: UserCleanupCount[];
  source: "backup" | "remote";
  database: string;
  generatedAt?: string;
}): UserCleanupPlan {
  const keepIds = [...new Set(input.keepUserIds)];
  if (keepIds.length !== 2) {
    throw new Error(
      `exactly two unique keep user IDs are required; received ${keepIds.length}`,
    );
  }

  const userIds = new Set<string>();
  const emails = new Set<string>();
  for (const user of input.users) {
    if (!user.id || !user.email)
      throw new Error("user rows must include id and email");
    if (userIds.has(user.id)) throw new Error("duplicate user ID in inventory");
    const email = normalizedEmail(user.email);
    if (emails.has(email))
      throw new Error(`duplicate user email: ${maskEmail(email)}`);
    userIds.add(user.id);
    emails.add(email);
  }

  const keepSet = new Set(keepIds);
  const keepUsers = input.users.filter((user) => keepSet.has(user.id));
  if (keepUsers.length !== keepIds.length) {
    const missing = keepIds.filter((id) => !userIds.has(id)).length;
    throw new Error(`${missing} keep user ID(s) are missing from inventory`);
  }

  const unsafeKeep = keepUsers.filter((user) =>
    TEST_EMAIL_DOMAINS.includes(
      emailDomain(user.email) as (typeof TEST_EMAIL_DOMAINS)[number],
    ),
  );
  if (unsafeKeep.length > 0) {
    throw new Error(
      `keep allowlist contains recognized test accounts: ${unsafeKeep.map((user) => maskEmail(user.email)).join(", ")}`,
    );
  }

  const candidates = input.users.filter((user) => !keepSet.has(user.id));
  if (candidates.length === 0)
    throw new Error("cleanup plan has no delete candidates");

  const unrecognized = candidates.filter(
    (user) =>
      !TEST_EMAIL_DOMAINS.includes(
        emailDomain(user.email) as (typeof TEST_EMAIL_DOMAINS)[number],
      ),
  );
  if (unrecognized.length > 0) {
    throw new Error(
      `refusing to classify non-test domains as delete candidates: ${unrecognized.map((user) => maskEmail(user.email)).join(", ")}`,
    );
  }

  const generatedAt = input.generatedAt ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(generatedAt)))
    throw new Error("generatedAt must be an ISO timestamp");

  const unsigned: Omit<UserCleanupPlan, "planHash"> = {
    version: USER_CLEANUP_PLAN_VERSION,
    generatedAt,
    source: input.source,
    database: input.database,
    keepUsers: keepUsers.map(identity).sort((a, b) => a.id.localeCompare(b.id)),
    deleteCandidates: candidates
      .map(identity)
      .sort((a, b) => a.id.localeCompare(b.id)),
    relatedCounts: [...input.relatedCounts].sort((a, b) =>
      a.table.localeCompare(b.table),
    ),
    testEmailDomains: TEST_EMAIL_DOMAINS,
    summary: {
      totalUsers: input.users.length,
      keepUsers: keepUsers.length,
      deleteCandidates: candidates.length,
      deleteRelatedRows: input.relatedCounts.reduce(
        (sum, row) => sum + row.deleteRows,
        0,
      ),
    },
  };

  return { ...unsigned, planHash: hashPlan(unsigned) };
}
