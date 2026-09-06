import path from 'node:path';

export const D1_BACKUP_ARTIFACT_ROOT = '.artifacts/d1-backup';

/**
 * A backup must have an immutable release/window directory. Writing directly
 * to the shared artifact root lets an empty shell variable mix two production
 * snapshots and their user/session rows.
 */
export function resolveD1BackupOutputDirectory(repoRoot: string, outputArgument: string | undefined): string {
  const backupRoot = path.resolve(repoRoot, D1_BACKUP_ARTIFACT_ROOT);
  const outputDirectory = path.resolve(repoRoot, outputArgument || D1_BACKUP_ARTIFACT_ROOT);
  if (outputDirectory === backupRoot) {
    throw new Error(
      `--out must name a release/window directory below ${D1_BACKUP_ARTIFACT_ROOT}; refusing the shared backup root`,
    );
  }
  return outputDirectory;
}
