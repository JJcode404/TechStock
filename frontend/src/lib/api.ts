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

// Base URL is relative; the Vite dev server proxies /api to the backend.
export const api = axios.create({ baseURL: '/api/v1' });

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
