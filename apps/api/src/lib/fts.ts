export function ftsLiteralQuery(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}
