import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

export interface CliConfig {
  baseUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  token?: string;
  tokenType?: string;
  expiresAt?: number;
}

const DEFAULTS = {
  baseUrl: 'https://trybiut.com',
  supabaseUrl: 'https://npsighwmwacergabszsf.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wc2lnaHdtd2FjZXJnYWJzenNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE0MzM1NDIsImV4cCI6MjA1NzAwOTU0Mn0.980fqtMUCHqSKagG5oLgYiYJ4cccEacf030yzq3IFMk',
};

export function configDir(): string {
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA ?? path.join(os.homedir(), 'AppData', 'Roaming'), 'trybiut');
  }
  return path.join(os.homedir(), '.config', 'trybiut');
}

export function configPath(): string {
  return path.join(configDir(), 'config.json');
}

export function loadConfig(): CliConfig {
  const baseUrl = (process.env.TRYBIUT_BASE_URL ?? DEFAULTS.baseUrl).replace(/\/+$/, '');
  const supabaseUrl = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_API_URL ?? DEFAULTS.supabaseUrl).replace(/\/+$/, '');
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_API_KEY ?? DEFAULTS.supabaseAnonKey;

  let file: Partial<CliConfig> = {};
  try {
    file = JSON.parse(fs.readFileSync(configPath(), 'utf8')) as Partial<CliConfig>;
  } catch { /* no config yet */ }

  const envToken = (process.env.TRYBIUT_API_TOKEN ?? '').trim();

  return {
    baseUrl: (file.baseUrl ?? baseUrl).replace(/\/+$/, ''),
    supabaseUrl: file.supabaseUrl ?? supabaseUrl,
    supabaseAnonKey: file.supabaseAnonKey ?? supabaseAnonKey,
    token: envToken || file.token,
    tokenType: file.tokenType,
    expiresAt: file.expiresAt,
  };
}

export function saveConfig(patch: Partial<CliConfig>): void {
  const dir = configDir();
  fs.mkdirSync(dir, { recursive: true });
  let current: Partial<CliConfig> = {};
  try { current = JSON.parse(fs.readFileSync(configPath(), 'utf8')); } catch {}
  const next = { ...current, ...patch };
  // Never persist env-provided token implicitly — only explicit saves.
  fs.writeFileSync(configPath(), JSON.stringify(next, null, 2), { mode: 0o600 });
  try { fs.chmodSync(configPath(), 0o600); } catch {}
}

export function clearToken(): void {
  const p = configPath();
  try {
    const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as Partial<CliConfig>;
    delete raw.token; delete raw.tokenType; delete raw.expiresAt;
    fs.writeFileSync(p, JSON.stringify(raw, null, 2), { mode: 0o600 });
  } catch { /* no config */ }
}
