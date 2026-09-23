import {
  ApiResponse,
  PaginationMeta,
  AnimeRelease,
  AnimeDubber,
  AnimeEpisodesResponse,
  StreamSource,
} from '../types';

export class ApiError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code: string = 'UNKNOWN_ERROR',
    public details: Record<string, string[]> = {}
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T; meta?: PaginationMeta }> {
  const token = localStorage.getItem('cinema_token');

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (options.body && typeof options.body === 'string') {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const isJson = res.headers.get('content-type')?.includes('application/json');
    const json = isJson ? await res.json() : null;

    if (!res.ok) {
      if (res.status === 401) {
        localStorage.removeItem('cinema_token');
        window.dispatchEvent(new Event('auth:unauthorized'));
      }

      const errorData = json?.error || {};
      throw new ApiError(
        errorData.message || `Ошибка сервера (${res.status})`,
        res.status,
        errorData.code || 'API_ERROR',
        errorData.details || {}
      );
    }

    const payload: ApiResponse<T> = json;
    return { data: payload.data, meta: payload.meta };
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError((err as Error).message || 'Сетевая ошибка', 0, 'NETWORK_ERROR');
  }
}

export const api = {
  get: <T>(endpoint: string, query?: Record<string, string | number | boolean | undefined | null>) => {
    let url = endpoint;
    if (query) {
      const cleanParams: Record<string, string> = {};
      Object.entries(query).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          cleanParams[k] = String(v);
        }
      });
      const qs = new URLSearchParams(cleanParams).toString();
      if (qs) {
        url += (url.includes('?') ? '&' : '?') + qs;
      }
    }
    return request<T>(url, { method: 'GET' });
  },

  post: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string) =>
    request<T>(endpoint, {
      method: 'DELETE',
    }),
};

export const animeApi = {
  search: (query: string, page = 0) =>
    api.get<{ data: AnimeRelease[]; meta: PaginationMeta }>('/anime/search', { q: query, page }),

  popular: (page = 0) =>
    api.get<{ data: AnimeRelease[]; meta: PaginationMeta }>('/anime/popular', { page }),

  getById: (id: number) =>
    api.get<AnimeRelease>(`/anime/${id}`),

  getDubbers: (id: number) =>
    api.get<AnimeDubber[]>(`/anime/${id}/dubbers`),

  getEpisodes: (id: number, dubberId?: number, sourceId?: number) =>
    api.get<AnimeEpisodesResponse>(`/anime/${id}/episodes`, {
      dubber_id: dubberId,
      source_id: sourceId,
    }),

  getStreams: (id: number, position = 1, dubberId?: number, sourceId?: number) =>
    api.get<StreamSource[]>(`/anime/${id}/streams`, {
      position,
      dubber_id: dubberId,
      source_id: sourceId,
    }),
};
