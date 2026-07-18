import { D1_TRANSFER_TABLES, EXCLUDED_TRANSIENT_TABLES, REBUILT_VIRTUAL_TABLES } from '@nihongo-n3/db/d1-tables';
import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
  type WorkflowStepConfig,
} from 'cloudflare:workers';

import {
  createBackupId,
  quoteIdentifier,
  rowsToInsertSql,
  sha256Hex,
  validateBackupParams,
} from './backup-core.js';

type BackupParams = {
  confirmation: 'BACKUP';
  date?: string;
};

type Env = {
  DATABASE_ID: string;
  DATABASE_NAME: string;
  BACKUP_PREFIX: string;
  RELEASE_SHA: string;
  DB: D1Database;
  BACKUP_BUCKET: R2Bucket;
  BACKUP_WORKFLOW: Workflow;
};

type BackupFile = {
  table: string;
  file: string;
  key: string;
  rowCount: number;
  bytes: number;
  sha256: string;
};

const TABLE_RETRY = {
  retries: { limit: 5, delay: 5_000, backoff: 'exponential' },
  timeout: 120_000,
} satisfies WorkflowStepConfig;

const PAGE_SIZE = 500;

export default {
  fetch() {
    return new Response('Not Found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;

export class D1BackupWorkflow extends WorkflowEntrypoint<Env, BackupParams> {
  async run(event: WorkflowEvent<BackupParams>, step: WorkflowStep) {
    const params = validateBackupParams(event.payload);
    const initialized = await step.do('Initialize approved backup', async () => {
      const generatedAt = new Date().toISOString();
      const date = params.date ?? generatedAt.slice(0, 10);
      return { generatedAt, backupId: createBackupId(date, generatedAt) };
    });
    const rootKey = `${this.env.BACKUP_PREFIX}/${initialized.backupId}`;
    const files: BackupFile[] = [];

    for (const table of D1_TRANSFER_TABLES) {
      const file = await step.do(`Export ${table.name}`, TABLE_RETRY, async () => {
        const session = this.env.DB.withSession('first-primary');
        const before = await countRows(session, table.name);
        let sql = '';
        let exportedRows = 0;
        let lastPrimaryKey: unknown;

        while (true) {
          const where = lastPrimaryKey === undefined
            ? ''
            : ` WHERE ${quoteIdentifier(table.primaryKey)} > ?1`;
          const query = `SELECT * FROM ${quoteIdentifier(table.name)}${where} ORDER BY ${quoteIdentifier(table.primaryKey)} LIMIT ${PAGE_SIZE}`;
          const statement = session.prepare(query);
          const page = lastPrimaryKey === undefined
            ? await statement.all<Record<string, unknown>>()
            : await statement.bind(lastPrimaryKey).all<Record<string, unknown>>();
          const rows = page.results ?? [];
          if (rows.length === 0) break;
          sql += rowsToInsertSql(table.name, rows);
          exportedRows += rows.length;
          lastPrimaryKey = rows.at(-1)?.[table.primaryKey];
          if (lastPrimaryKey === null || lastPrimaryKey === undefined) {
            throw new Error(`Primary key ${table.primaryKey} is null in ${table.name}`);
          }
          if (rows.length < PAGE_SIZE) break;
        }

        const after = await countRows(session, table.name);
        if (before !== after || exportedRows !== after) {
          throw new Error(`${table.name} changed during backup: before=${before} exported=${exportedRows} after=${after}`);
        }

        const contents = new TextEncoder().encode(sql);
        const sha256 = await sha256Hex(contents);
        const key = `${rootKey}/${table.name}.sql`;
        await this.env.BACKUP_BUCKET.put(key, contents, {
          httpMetadata: { contentType: 'application/sql' },
          customMetadata: {
            database: this.env.DATABASE_NAME,
            table: table.name,
            rowCount: String(exportedRows),
            sha256,
            releaseSha: this.env.RELEASE_SHA,
          },
        });
        return {
          table: table.name,
          file: `${table.name}.sql`,
          key,
          rowCount: exportedRows,
          bytes: contents.byteLength,
          sha256,
        };
      });
      files.push(file);
    }

    return step.do('Write backup manifest', async () => {
      const manifest = {
        version: 1,
        generatedAt: initialized.generatedAt,
        database: this.env.DATABASE_NAME,
        databaseId: this.env.DATABASE_ID,
        releaseSha: this.env.RELEASE_SHA,
        files,
        excludedTransientTables: EXCLUDED_TRANSIENT_TABLES,
        rebuiltVirtualTables: REBUILT_VIRTUAL_TABLES,
      };
      const body = `${JSON.stringify(manifest, null, 2)}\n`;
      const sha256 = await sha256Hex(body);
      await this.env.BACKUP_BUCKET.put(`${rootKey}/manifest.json`, body, {
        httpMetadata: { contentType: 'application/json' },
        customMetadata: { sha256, releaseSha: this.env.RELEASE_SHA },
      });
      await this.env.BACKUP_BUCKET.put(`${rootKey}/manifest.sha256`, `${sha256}  manifest.json\n`, {
        httpMetadata: { contentType: 'text/plain' },
      });
      return { rootKey, files: files.length, manifestSha256: sha256 };
    });
  }
}

async function countRows(session: D1DatabaseSession, table: string): Promise<number> {
  const row = await session.prepare(`SELECT count(*) AS count FROM ${quoteIdentifier(table)}`)
    .first<{ count: number }>();
  if (typeof row?.count !== 'number') throw new Error(`Could not count ${table}`);
  return row.count;
}
