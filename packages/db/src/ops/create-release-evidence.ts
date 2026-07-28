import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  releaseEvidenceRecordSchema,
  type ContentReleaseGate,
  type ReleaseArtifactRef,
  type ReleaseEvidenceRecord,
} from '@nihongo-n3/shared';

export type ReleaseEvidenceBuildInput = {
  releaseId: string;
  learningTrack: 'jlpt-ja' | 'topik-ko';
  contentRelease: string;
  lifecycleState: ReleaseEvidenceRecord['lifecycle_state'];
  sourceBranch: string;
  commitSha: string;
  pullRequestRef: string | null;
  manifestPath: string;
  verificationReportPath: string;
  migrations: string[];
  workerRelease: string | null;
  pagesDeployment: string | null;
  gateReportPaths: Record<ContentReleaseGate, { state: 'passed' | 'failed'; recordedBy: 'system' | 'operator'; path: string }>;
  generatedAt?: string;
};

function sha256(contents: Buffer): string {
  return createHash('sha256').update(contents).digest('hex');
}

function evidenceRef(kind: 'manifest' | 'report', releaseId: string, filePath: string): ReleaseArtifactRef {
  const contents = fs.readFileSync(filePath);
  const digest = sha256(contents);
  return {
    key: `evidence/${kind}/v1/${releaseId}/${digest}/artifact.json`,
    sha256: digest,
  };
}

/**
 * Builds a local, immutable evidence record. Uploading this report to R2 and
 * changing a release state remain explicit operator-only steps.
 */
export function buildReleaseEvidenceRecord(input: ReleaseEvidenceBuildInput): ReleaseEvidenceRecord {
  const record = {
    evidence_version: 1 as const,
    release_id: input.releaseId,
    learning_track: input.learningTrack,
    content_release: input.contentRelease,
    lifecycle_state: input.lifecycleState,
    source_branch: input.sourceBranch,
    commit_sha: input.commitSha,
    pull_request_ref: input.pullRequestRef,
    manifest: evidenceRef('manifest', input.releaseId, input.manifestPath),
    verification_report: evidenceRef('report', input.releaseId, input.verificationReportPath),
    migration_ids: [...input.migrations].sort(),
    deployments: {
      worker_release: input.workerRelease,
      pages_deployment: input.pagesDeployment,
    },
    gates: (['G0', 'G1', 'G2', 'G3', 'G4'] as const).map((gate) => {
      const gateInput = input.gateReportPaths[gate];
      if (!gateInput) throw new Error(`missing ${gate} evidence report`);
      return {
        gate,
        state: gateInput.state,
        report: evidenceRef('report', input.releaseId, gateInput.path),
        recorded_by: gateInput.recordedBy,
      };
    }),
    generated_at: input.generatedAt ?? new Date().toISOString(),
  };
  return releaseEvidenceRecordSchema.parse(record);
}

type CliArgs = Map<string, string[]>;

function parseArgs(argv: string[]): CliArgs {
  const args = new Map<string, string[]>();
  for (const argument of argv) {
    if (!argument.startsWith('--')) throw new Error(`unsupported argument: ${argument}`);
    const parts = argument.slice(2).split(/=(.*)/s, 2);
    const name = parts[0];
    const value = parts[1];
    if (!name || value === undefined || value.length === 0) throw new Error(`--${name ?? 'argument'}=<value> is required`);
    args.set(name, [...(args.get(name) ?? []), value]);
  }
  return args;
}

function required(args: CliArgs, name: string): string {
  const value = args.get(name)?.at(-1);
  if (!value) throw new Error(`--${name}=<value> is required`);
  return value;
}

function optional(args: CliArgs, name: string): string | null {
  return args.get(name)?.at(-1) ?? null;
}

function parseGateReports(args: CliArgs): ReleaseEvidenceBuildInput['gateReportPaths'] {
  const output = {} as ReleaseEvidenceBuildInput['gateReportPaths'];
  for (const value of args.get('gate-report') ?? []) {
    const [gate, state, recordedBy, reportPath] = value.split('|', 4);
    if (!gate || !state || !recordedBy || !reportPath || !['G0', 'G1', 'G2', 'G3', 'G4'].includes(gate)) {
      throw new Error('--gate-report must be G0|passed|system|<local-report.json>');
    }
    if (state !== 'passed' && state !== 'failed') throw new Error('gate report state must be passed or failed');
    if (recordedBy !== 'system' && recordedBy !== 'operator') throw new Error('gate report recordedBy must be system or operator');
    output[gate as ContentReleaseGate] = { state, recordedBy, path: reportPath };
  }
  return output;
}

function usage(): string {
  return [
    'Local-only release evidence builder. It never calls Cloudflare.',
    'Required: --release-id --track --content-release --state --branch --commit --manifest --verification-report --migration (repeat) --gate-report (repeat G0..G4)',
    'Optional: --pr=PR-123 --worker-release=<version> --pages-deployment=<id> --out=.artifacts/release-evidence/<release>.json',
    'Example gate: --gate-report=G0|passed|operator|.artifacts/reports/g0.json',
  ].join('\n');
}

export function runReleaseEvidenceCli(argv: string[]): string {
  if (argv.includes('--help')) return usage();
  if (argv.some((argument) => argument === '--remote' || argument === '--execute' || argument === '--deploy')) {
    throw new Error('release evidence builder is local-only; remote, execute, and deploy flags are prohibited');
  }
  const args = parseArgs(argv);
  const outputPath = path.resolve(optional(args, 'out') ?? `.artifacts/release-evidence/${required(args, 'release-id')}.json`);
  const record = buildReleaseEvidenceRecord({
    releaseId: required(args, 'release-id'),
    learningTrack: required(args, 'track') as ReleaseEvidenceBuildInput['learningTrack'],
    contentRelease: required(args, 'content-release'),
    lifecycleState: required(args, 'state') as ReleaseEvidenceBuildInput['lifecycleState'],
    sourceBranch: required(args, 'branch'),
    commitSha: required(args, 'commit'),
    pullRequestRef: optional(args, 'pr'),
    manifestPath: path.resolve(required(args, 'manifest')),
    verificationReportPath: path.resolve(required(args, 'verification-report')),
    migrations: args.get('migration') ?? [],
    workerRelease: optional(args, 'worker-release'),
    pagesDeployment: optional(args, 'pages-deployment'),
    gateReportPaths: parseGateReports(args),
  });
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
  return outputPath;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
const currentPath = fileURLToPath(import.meta.url);
if (invokedPath === currentPath) {
  try {
    const outputPath = runReleaseEvidenceCli(process.argv.slice(2));
    console.log(`Release evidence record: ${outputPath}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Release evidence builder failed');
    process.exitCode = 1;
  }
}
