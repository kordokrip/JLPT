const configuredApiBase = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export function apiBase(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === 'nihongo-n3.pages.dev' ||
      host.endsWith('.nihongo-n3.pages.dev')
    ) {
      return '';
    }
  }
  return configuredApiBase;
}

export function apiUrl(path: string): string {
  return `${apiBase()}/api/v1${path}`;
}
