const SAFE_ERROR_NAME = /^[A-Za-z][A-Za-z0-9_.:-]{0,63}$/;

export function safeErrorName(error: unknown): string {
  if (!(error instanceof Error)) return 'UnknownError';
  return SAFE_ERROR_NAME.test(error.name) ? error.name : 'Error';
}
