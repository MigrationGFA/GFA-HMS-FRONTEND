import { env } from '../env';
import { resolveOfflineApiResponse } from '../demo/offlineApi';

const ACCESS_TOKEN_KEY = 'gfa_access_token';
const REFRESH_TOKEN_KEY = 'gfa_refresh_token';
const EXPIRES_AT_KEY = 'gfa_access_expires_at';

/** Dispatched when the session is dead (401 Unauthorized and refresh failed/unavailable). */
export const AUTH_SESSION_EXPIRED_EVENT = 'gfa:auth-session-expired';

export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAccessToken(token: string | null) {
  try {
    if (token) localStorage.setItem(ACCESS_TOKEN_KEY, token);
    else localStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch {
    // ignore
  }
}

export function setRefreshToken(token: string | null) {
  try {
    if (token) localStorage.setItem(REFRESH_TOKEN_KEY, token);
    else localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    // ignore
  }
}

export function setAccessExpiresAt(expiresAtMs: number | null) {
  try {
    if (expiresAtMs != null) localStorage.setItem(EXPIRES_AT_KEY, String(expiresAtMs));
    else localStorage.removeItem(EXPIRES_AT_KEY);
  } catch {
    // ignore
  }
}

export function getAccessExpiresAt(): number | null {
  try {
    const raw = localStorage.getItem(EXPIRES_AT_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

/** Persist the full token pair returned by login / refresh. */
export function persistAuthTokens(tokens: {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}) {
  setAccessToken(tokens.accessToken);
  setRefreshToken(tokens.refreshToken);
  setAccessExpiresAt(Date.now() + tokens.expiresIn * 1000);
}

export function clearAuthTokens() {
  setAccessToken(null);
  setRefreshToken(null);
  setAccessExpiresAt(null);
}

/** Clear tokens and notify AuthProvider to log the user out + redirect. */
export function forceSessionExpired(reason = 'Unauthorized') {
  clearAuthTokens();
  try {
    window.dispatchEvent(
      new CustomEvent(AUTH_SESSION_EXPIRED_EVENT, { detail: { reason } }),
    );
  } catch {
    // ignore (SSR / non-browser)
  }
}

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  headers?: Record<string, string>;
  /** Internal: skip 401 → refresh retry (used by refresh itself). */
  skipAuthRefresh?: boolean;
};

type TokenPair = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

let refreshInFlight: Promise<boolean> | null = null;

function isUnauthorizedBody(parsed: unknown, status: number): boolean {
  if (status !== 401) return false;
  if (typeof parsed !== 'object' || !parsed) return true;
  const body = parsed as { message?: unknown; statusCode?: unknown };
  if (body.statusCode === 401) return true;
  const msg = body.message;
  if (typeof msg === 'string' && msg.toLowerCase() === 'unauthorized') return true;
  if (Array.isArray(msg) && msg.some((m) => String(m).toLowerCase() === 'unauthorized')) {
    return true;
  }
  return true; // any 401 on an authenticated call is treated as unauthorized
}

function parseErrorMessage(parsed: unknown, status: number): string {
  if (
    typeof parsed === 'object' &&
    parsed &&
    'message' in parsed &&
    (parsed as { message?: string | string[] }).message
  ) {
    const msg = (parsed as { message: string | string[] }).message;
    return Array.isArray(msg) ? msg.join(', ') : String(msg);
  }
  return `Request failed (${status})`;
}

async function parseJsonResponse(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Rotate access + refresh tokens via POST /api/auth/refresh.
 * Dedupes concurrent callers onto one in-flight request.
 */
export async function refreshAccessToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken || !env.apiBaseUrl) {
      return false;
    }

    const base = env.apiBaseUrl.replace(/\/$/, '');
    try {
      const res = await fetch(`${base}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });
      const parsed = await parseJsonResponse(res);
      if (!res.ok) {
        return false;
      }

      const data =
        typeof parsed === 'object' && parsed && 'data' in parsed
          ? (parsed as { data: Partial<TokenPair> }).data
          : null;

      if (!data?.accessToken || !data?.refreshToken || data.expiresIn == null) {
        return false;
      }

      persistAuthTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresIn: Number(data.expiresIn),
      });
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

/**
 * Proactively refresh when access token is within `skewMs` of expiry.
 * Safe to call often; no-ops when a refresh is not needed.
 */
export async function ensureFreshAccessToken(skewMs = 60_000): Promise<void> {
  const expiresAt = getAccessExpiresAt();
  if (expiresAt == null) return;
  if (Date.now() + skewMs < expiresAt) return;
  if (!getRefreshToken()) return;
  const ok = await refreshAccessToken();
  if (!ok) {
    forceSessionExpired('Refresh token expired');
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  // GFA Health HMS offline demo — never hit the network.
  if (env.offlineDemo || !env.useApi) {
    await new Promise((r) => setTimeout(r, 120));
    return resolveOfflineApiResponse(path, options.method ?? 'GET', options.body) as T;
  }

  const base = env.apiBaseUrl.replace(/\/$/, '');
  if (!base) {
    throw new ApiError('API base URL is not configured (VITE_API_BASE_URL)', 0);
  }

  if (options.auth !== false && !options.skipAuthRefresh) {
    await ensureFreshAccessToken();
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...options.headers,
  };

  if (options.auth !== false) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${base}${path.startsWith('/') ? path : `/${path}`}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body != null ? JSON.stringify(options.body) : undefined,
  });

  const parsed = await parseJsonResponse(res);

  if (!res.ok) {
    const isAuthCall = options.auth !== false;
    const unauthorized = isUnauthorizedBody(parsed, res.status);

    // Authenticated request got 401 → try refresh once, then retry.
    if (unauthorized && isAuthCall && !options.skipAuthRefresh && getRefreshToken()) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return apiRequest<T>(path, { ...options, skipAuthRefresh: true });
      }
      forceSessionExpired('Unauthorized');
      throw new ApiError('Unauthorized', 401, parsed);
    }

    // 401 with no usable refresh (or after failed retry) → log user out.
    if (unauthorized && isAuthCall) {
      forceSessionExpired('Unauthorized');
    }

    throw new ApiError(parseErrorMessage(parsed, res.status), res.status, parsed);
  }

  return parsed as T;
}
