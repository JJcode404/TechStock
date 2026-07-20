import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, getData, tokenStore } from './api';
import type { ApiEnvelope, LoginResult, PublicUser } from '../types';

interface AuthContextValue {
  user: PublicUser | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
  /** True when the current user holds the given permission (e.g. 'product:update'). */
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session on load: if we have a token, fetch the current user.
  useEffect(() => {
    let active = true;
    (async () => {
      if (!tokenStore.access) {
        setLoading(false);
        return;
      }
      try {
        const me = await getData<PublicUser>('/auth/me');
        if (active) setUser(me);
      } catch {
        tokenStore.clear();
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const login = async (identifier: string, password: string) => {
    const res = await api.post<ApiEnvelope<LoginResult>>('/auth/login', { identifier, password });
    const { user: u, tokens } = res.data.data;
    tokenStore.set(tokens.accessToken, tokens.refreshToken);
    setUser(u);
  };

  const logout = () => {
    tokenStore.clear();
    setUser(null);
  };

  const hasPermission = (permission: string) => user?.permissions?.includes(permission) ?? false;

  const value = useMemo(
    () => ({ user, loading, login, logout, hasPermission }),
    [user, loading],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
