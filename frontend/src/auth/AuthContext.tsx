import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, fetchMe, login as apiLogin, logout as apiLogout } from '@/api/client';
import { AuthUser } from '@/types/api';
import { clearSession, loadSession, saveSession } from '@/auth/storage';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [bootstrapped, setBootstrapped] = useState(false);
  const [token, setToken] = useState<string | null>(() => loadSession()?.token ?? null);

  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchMe,
    enabled: !!token,
    retry: false,
  });

  useEffect(() => {
    if (!token) {
      setBootstrapped(true);
      return;
    }
    if (meQuery.isFetched) setBootstrapped(true);
  }, [token, meQuery.isFetched]);

  useEffect(() => {
    if (meQuery.error instanceof ApiError && meQuery.error.status === 401) {
      clearSession();
      setToken(null);
      queryClient.removeQueries({ queryKey: ['auth'] });
    }
  }, [meQuery.error, queryClient]);

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      apiLogin(email, password),
    onSuccess: (data) => {
      saveSession({ token: data.token, user: data.user });
      setToken(data.token);
      queryClient.setQueryData(['auth', 'me'], { user: data.user });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: apiLogout,
    onSettled: () => {
      clearSession();
      setToken(null);
      queryClient.removeQueries({ queryKey: ['auth'] });
    },
  });

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await loginMutation.mutateAsync({ email, password });
      return result.user;
    },
    [loginMutation],
  );

  const logout = useCallback(async () => {
    await logoutMutation.mutateAsync();
  }, [logoutMutation]);

  const user = meQuery.data?.user ?? (token ? loadSession()?.user ?? null : null);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: user as AuthUser | null,
      token,
      isLoading: !bootstrapped || (!!token && meQuery.isLoading),
      isAuthenticated: !!token && !!user,
      login,
      logout,
    }),
    [user, token, bootstrapped, meQuery.isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
