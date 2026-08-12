/** Laravel application origin (no trailing slash). Used for /storage file URLs. */
export function getApiOrigin(): string {
  const fromEnv = import.meta.env.VITE_API_URL?.replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  if (import.meta.env.DEV) return 'http://127.0.0.1:8000';
  return window.location.origin;
}

/** Absolute URL to a file under Laravel's public storage disk. */
export function storageFileUrl(filePath: string): string {
  const normalized = filePath.replace(/^\/+/, '');
  return `${getApiOrigin()}/storage/${normalized}`;
}
