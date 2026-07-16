import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CONFIG = path.resolve(
  __dirname,
  "../../../../apps/api/wrangler.toml",
);

export interface D1TargetOptions {
  remote: boolean;
  database: string;
  config: string;
  persistTo?: string;
}

function optionValue(args: string[], name: string): string | undefined {
  const prefix = `${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

export function parseD1Target(args = process.argv.slice(2)): D1TargetOptions {
  const remote = args.includes("--remote");
  if (remote && args.includes("--local")) {
    throw new Error("--local and --remote cannot be used together");
  }

  const persistTo = optionValue(args, "--persist-to");
  return {
    remote,
    database: optionValue(args, "--database") ?? "DB",
    config: path.resolve(optionValue(args, "--config") ?? DEFAULT_CONFIG),
    ...(persistTo ? { persistTo: path.resolve(persistTo) } : {}),
  };
}

export function requireRemoteChange(kind: "seed" | "verify"): void {
  if (kind === "seed" && process.env.ALLOW_PRODUCTION_CHANGE !== "seed") {
    throw new Error(
      "Remote seed is blocked. Run only from an approved production environment with ALLOW_PRODUCTION_CHANGE=seed.",
    );
  }
}

function targetArgs(options: D1TargetOptions): string[] {
  const args = [
    "exec",
    "wrangler",
    "d1",
    "execute",
    options.database,
    options.remote ? "--remote" : "--local",
    "--config",
    options.config,
    "--yes",
  ];
  if (!options.remote && options.persistTo) {
    args.push("--persist-to", options.persistTo);
  }
  return args;
}

export function executeSqlFile(
  options: D1TargetOptions,
  filePath: string,
): void {
  execFileSync("pnpm", [...targetArgs(options), "--file", filePath], {
    cwd: path.dirname(options.config),
    stdio: "pipe",
  });
}

interface WranglerD1Result<T extends Record<string, unknown>> {
  results?: T[];
  success?: boolean;
}

/**
 * Parse Wrangler's `--json` response while preserving one result set per SQL
 * statement. Keeping the statement count strict prevents a partial D1
 * response from being mistaken for a successful verifier run.
 */
export function parseWranglerD1Json<T extends Record<string, unknown>>(
  raw: string,
  expectedStatements: number,
): T[][] {
  const parsed = JSON.parse(raw) as Array<WranglerD1Result<T>>;
  if (!Array.isArray(parsed) || parsed.length !== expectedStatements) {
    throw new Error(
      `D1 query returned ${Array.isArray(parsed) ? parsed.length : "an invalid number of"} result set(s); expected ${expectedStatements}.`,
    );
  }

  return parsed.map((result, index) => {
    if (!result?.success && !result?.results) {
      throw new Error(
        `D1 query ${index + 1} did not return a successful result.`,
      );
    }
    return result.results ?? [];
  });
}

export function querySqlBatch<T extends Record<string, unknown>>(
  options: D1TargetOptions,
  statements: readonly string[],
): T[][] {
  if (statements.length === 0) return [];
  const raw = execFileSync(
    "pnpm",
    [...targetArgs(options), "--command", statements.join(";\n"), "--json"],
    {
      cwd: path.dirname(options.config),
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  return parseWranglerD1Json<T>(raw, statements.length);
}

export function querySql<T extends Record<string, unknown>>(
  options: D1TargetOptions,
  sql: string,
): T[] {
  return querySqlBatch<T>(options, [sql])[0] ?? [];
}

export function countSqlBatch(
  options: D1TargetOptions,
  statements: readonly string[],
): number[] {
  return querySqlBatch<Record<string, unknown>>(options, statements).map(
    (rows, index) => {
      const row = rows[0];
      const value = row ? Object.values(row)[0] : undefined;
      if (typeof value !== "number") {
        throw new Error(
          `D1 count query ${index + 1} returned an invalid value: ${statements[index]}`,
        );
      }
      return value;
    },
  );
}

export function countSql(options: D1TargetOptions, sql: string): number {
  return countSqlBatch(options, [sql])[0] ?? 0;
}

export function argValue(
  name: string,
  args = process.argv.slice(2),
): string | undefined {
  return optionValue(args, name);
}
