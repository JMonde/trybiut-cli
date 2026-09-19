import { loadConfig } from './config.js';

export class AuthRequiredError extends Error {
  constructor() {
    super('Not logged in. Run: trybiut login');
    this.name = 'AuthRequiredError';
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  public?: boolean;
  query?: Record<string, string | number | boolean | undefined>;
}

function buildUrl(base: string, path: string, query?: RequestOptions['query']): string {
  const url = new URL(path, base.endsWith('/') ? base : base + '/');
  if (query) for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
  return url.toString();
}

export class TrybiutClient {
  baseUrl: string;
  token?: string;
  constructor(baseUrl?: string, token?: string) {
    const cfg = loadConfig();
    this.baseUrl = (baseUrl ?? cfg.baseUrl).replace(/\/+$/, '');
    this.token = token ?? cfg.token;
  }

  requireAuth(): string {
    if (!this.token) throw new AuthRequiredError();
    return this.token;
  }

  async request<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (!opts.public && this.token) headers.Authorization = `Bearer ${this.token}`;
    const res = await fetch(buildUrl(this.baseUrl, path, opts.query), {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
    if (res.status === 401) throw new AuthRequiredError();
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`TryBiut API ${res.status} on ${path}: ${text.slice(0, 600)}`);
    }
    return (await res.json()) as T;
  }

  static redactToken(t: string): string {
    if (t.length <= 8) return '***';
    return t.slice(0, 4) + '***' + t.slice(-4);
  }
}
