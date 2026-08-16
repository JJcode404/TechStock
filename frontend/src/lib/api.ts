import axios, { type AxiosError } from 'axios';
import type { ApiEnvelope } from '../types';

const TOKEN_KEY = 'techstock.accessToken';
const REFRESH_KEY = 'techstock.refreshToken';

export const tokenStore = {
  get access(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },
  get refresh(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  },
  set(access: string, refresh: string) {
    localStorage.setItem(TOKEN_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

/**
 * Backend origin, from VITE_API_URL (see .env.example).
 *
 * Empty is the same-origin deploy: requests stay relative (/api/v1, /uploads)
 * and in dev the Vite proxy forwards them. Set it to an absolute origin when
 * the frontend is hosted apart from the backend — then CORS applies, so the
 * backend's CORS_ORIGINS must list the frontend.
 */
export const apiOrigin = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');

/**
 * Free ngrok tunnels answer browser GETs with an HTML interstitial
 * (ERR_NGROK_6024) that carries no CORS headers, so the browser reports it as a
 * CORS failure. This header skips it. Harmless elsewhere, but kept conditional
 * so real deployments don't carry a tunnel-specific quirk.
 */
const viaNgrok = /\bngrok[\w-]*\.(app|io|dev)$/.test(
  apiOrigin.replace(/^https?:\/\//, '').split('/')[0] ?? '',
);

export const api = axios.create({
  baseURL: `${apiOrigin}/api/v1`,
  headers: viaNgrok ? { 'ngrok-skip-browser-warning': 'true' } : undefined,
});

/**
 * Absolute URL for a server-hosted asset. Image records store paths like
 * `/uploads/foo.jpg`, which only resolve on their own when same-origin.
 */
export const assetUrl = (path: string): string =>
  /^https?:\/\//.test(path) ? path : `${apiOrigin}${path}`;

api.interceptors.request.use((config) => {
  const token = tokenStore.access;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, clear the session and bounce to login (simple, no silent refresh yet).
api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (error.response?.status === 401 && tokenStore.access) {
      tokenStore.clear();
      if (!location.pathname.startsWith('/login')) location.assign('/login');
    }
    return Promise.reject(error);
  },
);

/** Unwrap the `{ success, data }` envelope and return `data`. */
export async function getData<T>(url: string): Promise<T> {
  const res = await api.get<ApiEnvelope<T>>(url);
  return res.data.data;
}

/** Like getData but also returns the pagination `meta` for list endpoints. */
export async function getList<T>(
  url: string,
): Promise<{ data: T[]; meta?: ApiEnvelope<T[]>['meta'] }> {
  const res = await api.get<ApiEnvelope<T[]>>(url);
  return { data: res.data.data, meta: res.data.meta };
}

/** Extract a human-readable message from an Axios error. */
export function apiErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  const ax = err as AxiosError<{ message?: string }>;
  return ax.response?.data?.message ?? ax.message ?? fallback;
}
