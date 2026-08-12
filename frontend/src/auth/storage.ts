const STORAGE_KEY = 'manhaj.auth';

export interface StoredSession {
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    tenant_id: number | null;
  };
}

export function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

export function saveSession(session: StoredSession): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function getToken(): string | null {
  return loadSession()?.token ?? null;
}

export function getTenantId(): number | null {
  return loadSession()?.user.tenant_id ?? null;
}
