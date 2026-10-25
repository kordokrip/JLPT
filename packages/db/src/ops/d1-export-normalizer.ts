import fs from 'node:fs';

function splitSqlValues(input: string): string[] {
  const values: string[] = [];
  let current = '';
  let quote: "'" | '"' | null = null;
  let depth = 0;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]!;
    const next = input[index + 1];
    current += char;

    if (quote) {
      if (char === quote && next === quote) {
        current += next;
        index += 1;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === "'" || char === '"') quote = char;
    else if (char === '(') depth += 1;
    else if (char === ')') depth -= 1;
    else if (char === ',' && depth === 0) {
      values.push(current.slice(0, -1).trim());
      current = '';
    }
  }

  if (current.trim()) values.push(current.trim());
  return values;
}

function canonicalInsert(line: string, ignoredColumns: ReadonlySet<string>): string {
  const match = /^INSERT INTO\s+"?([A-Za-z0-9_]+)"?\s*\((.*?)\)\s+VALUES\((.*)\);$/.exec(line);
  if (!match) return line;

  const table = match[1]!;
  const rawColumns = match[2]!;
  const rawValues = match[3]!;
  const columns = [...rawColumns.matchAll(/"([^"]+)"/g)].map((entry) => entry[1]!);
  const values = splitSqlValues(rawValues);
  if (columns.length !== values.length) {
    throw new Error(`Cannot normalize D1 export for ${table}: ${columns.length} columns, ${values.length} values`);
  }

  const pairs = columns
    .map((column, index) => [column, values[index]!] as const)
    .filter(([column]) => !ignoredColumns.has(column))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([column, value]) => `${column}=${value}`);

  return `${table}:${pairs.join('|')}`;
}

export function normalizedD1Export(file: string, ignoredColumns: readonly string[] = []): string {
  const ignored = new Set(ignoredColumns);
  return fs.readFileSync(file, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('INSERT INTO'))
    .map((line) => canonicalInsert(line, ignored))
    .sort()
    .join('\n');
}
