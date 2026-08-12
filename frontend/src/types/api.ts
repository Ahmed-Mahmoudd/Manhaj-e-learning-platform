/** Roles returned by POST /api/v1/auth/login and GET /api/v1/auth/me */
export type UserRole =
  | 'platform_admin'
  | 'university_admin'
  | 'faculty_admin'
  | 'instructor'
  | 'teaching_assistant'
  | 'student'
  | 'guest';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  tenant_id: number | null;
}

export interface LoginResponse {
  token: string;
  token_type: 'Bearer';
  user: AuthUser;
}

export interface MeResponse {
  user: AuthUser;
}

export interface MessageResponse {
  message: string;
}

/** Laravel validation error envelope (422, and 401 cred failure uses errors.email) */
export interface ApiValidationError {
  message: string;
  errors: Record<string, string[]>;
}

export function isApiValidationError(body: unknown): body is ApiValidationError {
  return (
    typeof body === 'object' &&
    body !== null &&
    'errors' in body &&
    typeof (body as ApiValidationError).errors === 'object'
  );
}

export function isMessageError(body: unknown): body is MessageResponse {
  return (
    typeof body === 'object' &&
    body !== null &&
    'message' in body &&
    typeof (body as MessageResponse).message === 'string'
  );
}
