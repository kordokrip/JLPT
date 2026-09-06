import path from 'node:path';

import { detectD1BackupSchemaProfile, tablesForPhase, type D1BackupSchemaProfile } from './d1-tables.js';

export interface D1BackupFile {
  table: string;
  file: string;
  rowCount: number;
  sha256: string;
}

export interface ValidatedD1BackupManifest {
  schemaProfile: D1BackupSchemaProfile;
  legacyProfileInferred: boolean;
  files: D1BackupFile[];
}

export function validateD1BackupManifest(value: unknown): ValidatedD1BackupManifest {
  if (!value || typeof value !== 'object' || !('files' in value) || !Array.isArray(value.files)) {
    throw new Error('Invalid backup manifest');
  }
  const declared = 'schemaProfile' in value ? value.schemaProfile : undefined;
  if (declared !== undefined && declared !== '0027' && declared !== '0028') {
    throw new Error('Unknown backup manifest schema profile');
  }
  // Historical manifests predate profile metadata. Only the exact old 65-table
  // set may infer 0027; an unversioned 70-table file is not trusted as 0028.
  const schemaProfile = declared ?? '0027';
  const files = value.files.map((entry: unknown): D1BackupFile => {
    if (!entry || typeof entry !== 'object') throw new Error('Invalid backup manifest file');
    const file = entry as Partial<D1BackupFile>;
    if (typeof file.table !== 'string' || typeof file.file !== 'string' ||
        path.basename(file.file) !== file.file || file.file.includes('\\') || !file.file.endsWith('.sql') ||
        typeof file.rowCount !== 'number' || !Number.isSafeInteger(file.rowCount) || file.rowCount < 0 ||
        typeof file.sha256 !== 'string' || !/^[0-9a-f]{64}$/u.test(file.sha256)) {
      throw new Error('Invalid backup manifest file metadata');
    }
    return { table: file.table, file: file.file, rowCount: file.rowCount, sha256: file.sha256 };
  });
  const names = files.map((entry) => entry.table);
  const expected = tablesForPhase('all', schemaProfile).map((table) => table.name).sort();
  if (new Set(names).size !== names.length || new Set(files.map((entry) => entry.file)).size !== files.length ||
      JSON.stringify([...names].sort()) !== JSON.stringify(expected)) {
    throw new Error('Backup manifest table allowlist does not match its schema profile');
  }
  return { schemaProfile, legacyProfileInferred: declared === undefined, files };
}

export function validateD1BackupManifestForSchema(value: unknown, tableNames: readonly string[]): ValidatedD1BackupManifest {
  const manifest = validateD1BackupManifest(value);
  if (manifest.schemaProfile !== detectD1BackupSchemaProfile(tableNames)) {
    throw new Error('Backup manifest schema profile does not cover the observed D1 schema');
  }
  return manifest;
}
