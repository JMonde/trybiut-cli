import type { CliConfig } from './config.js';

export async function supabaseLogin(
  email: string,
  password: string,
  cfg: Pick<CliConfig, 'supabaseUrl' | 'supabaseAnonKey'>
): Promise<{ access_token: string; token_type: string; expires_in: number; refresh_token?: string }> {
  const url = `${cfg.supabaseUrl.replace(/\/+$/, '')}/auth/v1/token?grant_type=password`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: cfg.supabaseAnonKey,
      Authorization: `Bearer ${cfg.supabaseAnonKey}`,
    },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 400 || res.status === 401) throw new Error(`Login failed: ${text.slice(0, 400)}`);
    throw new Error(`Supabase auth ${res.status}: ${text.slice(0, 400)}`);
  }
  return (await res.json()) as any;
}

export async function supabaseLogout(token: string, cfg: Pick<CliConfig, 'supabaseUrl' | 'supabaseAnonKey'>): Promise<void> {
  const url = `${cfg.supabaseUrl.replace(/\/+$/, '')}/auth/v1/logout`;
  await fetch(url, {
    method: 'POST',
    headers: { apikey: cfg.supabaseAnonKey, Authorization: `Bearer ${token}` },
  }).catch(() => {});
}
