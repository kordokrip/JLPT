export function normalizeApiList(value) {
  if (Array.isArray(value)) return value;
  for (const key of ['items', 'result', 'queries', 'schedules', 'secrets']) {
    if (Array.isArray(value?.[key])) return value[key];
  }
  return [];
}
