import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { DEMO_PASSWORD, UserRole, users } from '@/data/dummyData';
import { env } from '@/lib/env';
import {
  AUTH_SESSION_EXPIRED_EVENT,
  apiRequest,
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  persistAuthTokens,
  refreshAccessToken,
} from '@/lib/api/client';

interface AuthUserLocal {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  mustResetPassword?: boolean;
}

interface AuthState {
  isAuthenticated: boolean;
  user: AuthUserLocal | null;
  login: (identifier: string, password: string) => boolean;
  loginAsync: (identifier: string, password: string) => Promise<{
    ok: boolean;
    mustResetPassword?: boolean;
    role?: UserRole;
  }>;
  register: (name: string, email: string, role: UserRole, password: string) => boolean;
  logout: () => void;
  clearMustResetPassword: () => void;
}

type ApiAuthUser = {
  id: number;
  email: string;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  roles?: string[];
  mustResetPassword?: boolean;
};

type AuthTokensResponse = {
  data?: {
    accessToken?: string;
    refreshToken?: string;
    expiresIn?: number;
    user?: ApiAuthUser;
    mustResetPassword?: boolean;
  };
};

const AuthContext = createContext<AuthState | undefined>(undefined);

function mapRoleFromApi(roles: string[] | undefined, email: string, guessRole: (email: string) => UserRole): UserRole {
  const r = (roles?.[0] || '').toUpperCase().replace(/\s+/g, '_');
  if (!r) return guessRole(email);
  if (r.includes('SUPER') || r.includes('ROOT')) return 'superadmin';
  if (r.includes('BOARD')) return 'board';
  if (r.includes('CMD')) return 'cmd';
  if (r.includes('FINANCE')) return 'finance';
  if (r.includes('HR')) return 'hr';
  if (r.includes('EYE') || r.includes('OPHTHAL') || r.includes('OPTOM')) return 'eye';
  if (r.includes('PAEDS') || r.includes('PAEDIAT') || r.includes('PEDIAT')) return 'paeds';
  if (r.includes('DENTAL') || r.includes('DENTIST')) return 'dental';
  if (r.includes('DOCTOR') || r.includes('CONSULTANT') || r.includes('PHYSICIAN')) return 'doctor';
  if (r.includes('IT') || r.includes('SYSTEM')) return 'it';
  if (r.includes('NURSE')) return 'nurse';
  if (r.includes('PHARM')) return 'pharmacist';
  if (r.includes('RADIO') || r.includes('IMAGING')) return 'radiology';
  if (r.includes('LAB')) return 'lab';
  if (r.includes('CASHIER')) return 'cashier';
  if (r.includes('RECORD')) return 'records';
  if (r.includes('ADMIN')) return 'admin';
  if (r.includes('ICU')) return 'icu';
  if (r.includes('PSYCHOPC') || r === 'OPC') return 'psychopc';
  if (r.includes('PSYCHOLOGY') || r.includes('PSYCH')) return 'psychology';
  return guessRole(email);
}

function mapApiUser(apiUser: ApiAuthUser, guessRole: (email: string) => UserRole): AuthUserLocal {
  const email = apiUser.email || '';
  const name =
    [apiUser.firstName, apiUser.lastName].filter(Boolean).join(' ') ||
    email ||
    apiUser.phone ||
    'Staff';
  return {
    id: String(apiUser.id),
    name,
    email,
    phone: apiUser.phone ?? null,
    role: mapRoleFromApi(apiUser.roles, email, guessRole),
    mustResetPassword: Boolean(apiUser.mustResetPassword),
  };
}

function looksLikePhone(identifier: string): boolean {
  const digits = identifier.replace(/\D/g, '');
  return digits.length >= 7 && !identifier.includes('@');
}

function redirectToLogin() {
  try {
    if (typeof window === 'undefined') return;
    if (window.location.pathname === '/login') return;
    window.location.assign('/login');
  } catch {
    // ignore
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthState['user']>(null);
  const [bootstrapped, setBootstrapped] = useState(!(env.useApi && env.apiBaseUrl));

  const guessRole = (email: string): UserRole => {
    const e = email.toLowerCase();
    if (e.includes('super') || e.includes('root')) return 'superadmin';
    if (e.includes('board')) return 'board';
    if (e.includes('cmd')) return 'cmd';
    if (e.includes('finance')) return 'finance';
    if (e.includes('hr')) return 'hr';
    if (e.includes('eye') || e.includes('ophthal') || e.includes('optom')) return 'eye';
    if (e.includes('paeds') || e.includes('paediatr') || e.includes('pediatr')) return 'paeds';
    if (e.includes('dental') || e.includes('dentist')) return 'dental';
    if (e.includes('doctor')) return 'doctor';
    if (e.includes('it')) return 'it';
    if (e.includes('nurse')) return 'nurse';
    if (e.includes('pharm')) return 'pharmacist';
    if (e.includes('radiology') || e.includes('radio') || e.includes('imaging')) return 'radiology';
    if (e.includes('cap') || e.includes('child') || e.includes('adolescent') || e.includes('paedpsych')) return 'cap';
    if (e.includes('addiction') || e.includes('rehab') || e.includes('detox') || e.includes('substance')) return 'addiction';
    if (e.includes('psychogeriatric') || e.includes('geriatric') || e.includes('elderly') || e.includes('dementia')) return 'psychogeriatrics';
    if (e.includes('speech') || e.includes('slt') || e.includes('swallow') || e.includes('dysphagia') || e.includes('language')) return 'speech';
    if (e.includes('physio') || e.includes('physiotherapy') || e.includes('rehab-physio') || e.includes('mobility')) return 'physiotherapy';
    if (e.includes('nutrition') || e.includes('dietetic') || e.includes('dietitian') || e.includes('diet') || e.includes('kitchen') || e.includes('catering')) return 'nutrition';
    if (e.includes('socialwork') || e.includes('social-work') || e.includes('social') || e.includes('welfare') || e.includes('community-support')) return 'socialwork';
    if (e.includes('icu') || e.includes('critical') || e.includes('hdu') || e.includes('ventilator') || e.includes('codeblue') || e.includes('code-blue')) return 'icu';
    if (e.includes('psychopc') || e.includes('opc') || e.includes('outpatient')) return 'psychopc';
    if (e.includes('psychology') || e.includes('psych')) return 'psychology';
    if (e.includes('lab')) return 'lab';
    if (e.includes('cashier')) return 'cashier';
    if (e.includes('records')) return 'records';
    if (e.includes('admin')) return 'admin';
    if (e.includes('staff')) return 'staff';
    if (e.includes('student')) return 'student';
    return 'patient';
  };

  const applyLocalUser = (email: string) => {
    const normalized = email.trim().toLowerCase();
    const found = users.find(u => u.email.toLowerCase() === normalized);
    if (found) {
      setUser(found);
      return true;
    }
    const role = guessRole(normalized);
    setUser({ id: 'custom', name: normalized.split('@')[0], email: normalized, role });
    return true;
  };

  const logout = useCallback(() => {
    const refreshToken = getRefreshToken();
    if (env.useApi && env.apiBaseUrl && refreshToken) {
      void apiRequest('/api/auth/logout', {
        method: 'POST',
        auth: false,
        skipAuthRefresh: true,
        body: { refreshToken },
      }).catch(() => undefined);
    }
    clearAuthTokens();
    setUser(null);
  }, []);

  const clearMustResetPassword = useCallback(() => {
    setUser((prev) => (prev ? { ...prev, mustResetPassword: false } : prev));
  }, []);

  // API client fires this when {"message":"Unauthorized","statusCode":401} cannot be recovered.
  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      clearAuthTokens();
      redirectToLogin();
    };
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  const restoreSession = useCallback(async () => {
    if (!(env.useApi && env.apiBaseUrl)) {
      setBootstrapped(true);
      return;
    }

    const access = getAccessToken();
    const refresh = getRefreshToken();
    if (!access && !refresh) {
      setBootstrapped(true);
      return;
    }

    try {
      if (!access && refresh) {
        const ok = await refreshAccessToken();
        if (!ok) {
          clearAuthTokens();
          setBootstrapped(true);
          return;
        }
      }

      const body = await apiRequest<{ data: ApiAuthUser }>('/api/auth/me');
      if (body.data) {
        setUser(mapApiUser(body.data, guessRole));
      }
    } catch {
      clearAuthTokens();
      setUser(null);
    } finally {
      setBootstrapped(true);
    }
  }, []);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  const login = (identifier: string, password: string) => {
    if (password !== DEMO_PASSWORD) {
      return false;
    }
    clearAuthTokens();
    return applyLocalUser(identifier);
  };

  const loginAsync = async (identifier: string, password: string) => {
    const trimmed = identifier.trim();
    if (env.useApi && env.apiBaseUrl) {
      try {
        const bodyPayload = looksLikePhone(trimmed)
          ? { phone: trimmed, password }
          : { email: trimmed, password };

        const body = await apiRequest<AuthTokensResponse>('/api/auth/login', {
          method: 'POST',
          auth: false,
          body: bodyPayload,
        });

        const accessToken = body.data?.accessToken;
        const refreshToken = body.data?.refreshToken;
        const expiresIn = body.data?.expiresIn;
        const apiUser = body.data?.user;

        if (accessToken && refreshToken && expiresIn && apiUser) {
          persistAuthTokens({ accessToken, refreshToken, expiresIn });
          const mapped = mapApiUser(
            {
              ...apiUser,
              mustResetPassword:
                apiUser.mustResetPassword ?? body.data?.mustResetPassword ?? false,
            },
            guessRole,
          );
          setUser(mapped);
          return {
            ok: true,
            mustResetPassword: Boolean(mapped.mustResetPassword),
            role: mapped.role,
          };
        }
      } catch {
        // Fall through to local demo login so Records UI still works offline.
      }
    }

    if (password !== DEMO_PASSWORD) return { ok: false };
    clearAuthTokens();
    const ok = applyLocalUser(trimmed);
    return {
      ok,
      mustResetPassword: false,
      role: guessRole(trimmed),
    };
  };

  const register = (name: string, email: string, role: UserRole, password: string) => {
    if (!password.trim()) return false;
    setUser({ id: 'new-' + Date.now(), name, email, role });
    return true;
  };

  // Avoid flashing protected routes before session restore finishes.
  if (!bootstrapped) {
    return null;
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!user,
        user,
        login,
        loginAsync,
        register,
        logout,
        clearMustResetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
