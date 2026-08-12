import {
  ApiValidationError,
  isApiValidationError,
  isMessageError,
  LoginResponse,
  MeResponse,
  MessageResponse,
} from '@/types/api';
import { clearSession, getTenantId, getToken } from '@/auth/storage';

const BASE = '/api/v1';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get validation(): ApiValidationError | null {
    return isApiValidationError(this.body) ? this.body : null;
  }

  get serverMessage(): string | null {
    if (isMessageError(this.body)) return this.body.message;
    if (isApiValidationError(this.body)) return this.body.message;
    return null;
  }

  /** Safe message for UI — never exposes SQL/stack traces from 500 responses */
  userMessage(fallback: string, serverErrorFallback: string): string {
    if (this.status >= 500) {
      return serverErrorFallback;
    }
    return this.serverMessage ?? fallback;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Skip attaching Authorization (login) */
  anonymous?: boolean;
  /** Override tenant header (rare) */
  tenantId?: number | null;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');

  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  if (!options.anonymous) {
    const token = getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const tenantId = options.tenantId !== undefined ? options.tenantId : getTenantId();
    if (tenantId !== null && tenantId !== undefined) {
      headers.set('X-Tenant-ID', String(tenantId));
    }
  }

  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { message: text };
    }
  }

  if (!response.ok) {
    let message: string;
    if (response.status >= 500) {
      message = 'Request failed';
    } else {
      message =
        (isMessageError(body) && body.message) ||
        (isApiValidationError(body) && body.message) ||
        response.statusText ||
        'Request failed';
    }
    throw new ApiError(message, response.status, body);
  }

  return body as T;
}

export function login(email: string, password: string) {
  return apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
    anonymous: true,
  });
}

export function fetchMe() {
  return apiRequest<MeResponse>('/auth/me');
}

export async function logout(): Promise<MessageResponse> {
  try {
    return await apiRequest<MessageResponse>('/auth/logout', { method: 'POST' });
  } finally {
    clearSession();
  }
}
