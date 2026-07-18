export function validateBackupParams(payload: unknown): { date?: string } {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Backup parameters are required');
  }
  const candidate = payload as { confirmation?: unknown; date?: unknown };
  if (candidate.confirmation !== 'BACKUP') {
    throw new Error('confirmation must be BACKUP');
  }
  if (candidate.date !== undefined &&
      (typeof candidate.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(candidate.date))) {
    throw new Error('date must use YYYY-MM-DD');
  }
  return candidate.date ? { date: candidate.date } : {};
}

export function createBackupId(date: string, isoTimestamp: string): string {
  const suffix = isoTimestamp.replace(/[:.]/g, '-');
  return `${date}/${suffix}`;
}

export async function sha256Hex(data: ArrayBuffer | Uint8Array | string): Promise<string> {
  const bytes = typeof data === 'string'
    ? new TextEncoder().encode(data)
    : data instanceof Uint8Array
      ? data
      : new Uint8Array(data);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((part) => part.toString(16).padStart(2, '0')).join('');
}

export function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export function toSqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Non-finite numbers cannot be backed up');
    return String(value);
  }
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (typeof value === 'string') return `'${value.replaceAll("'", "''")}'`;
  if (value instanceof ArrayBuffer) return `X'${bytesToHex(new Uint8Array(value))}'`;
  if (ArrayBuffer.isView(value)) {
    return `X'${bytesToHex(new Uint8Array(value.buffer, value.byteOffset, value.byteLength))}'`;
  }
  throw new Error(`Unsupported D1 value type: ${typeof value}`);
}

export function rowsToInsertSql(table: string, rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return '';
  const columns = Object.keys(rows[0] ?? {});
  if (columns.length === 0) throw new Error(`Table ${table} returned rows without columns`);
  const expected = JSON.stringify(columns);
  const header = `INSERT INTO ${quoteIdentifier(table)} (${columns.map(quoteIdentifier).join(', ')}) VALUES `;
  return rows.map((row) => {
    if (JSON.stringify(Object.keys(row)) !== expected) {
      throw new Error(`Table ${table} returned inconsistent columns`);
    }
    return `${header}(${columns.map((column) => toSqlLiteral(row[column])).join(', ')});\n`;
  }).join('');
}

function bytesToHex(value: Uint8Array): string {
  return [...value].map((part) => part.toString(16).padStart(2, '0')).join('');
}
