#!/usr/bin/env node
import { Command } from 'commander';
import { exec } from 'node:child_process';
import { loadConfig, saveConfig, clearToken, configPath } from './config.js';
import { TrybiutClient } from './client.js';
import { supabaseLogout } from './supabase.js';
import { promptHidden } from './prompt.js';

const program = new Command();
program.name('trybiut').description('TryBiut CLI — taxes, invoices, movements and reports').version('0.2.0');

function printJson(data: unknown) { console.log(JSON.stringify(data, null, 2)); }
function die(msg: string, code = 1): never { console.error(msg); process.exit(code); }

function tryOpenUrl(url: string): void {
  const cmd = process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
  exec(cmd, () => {});
}

program.command('login').description('Log in with a browser link (paste token, no password)').option('--token <token>', 'Token (non-interactive, useful for CI)').option('--no-open', 'Do not try to open the browser automatically').action(async (opts) => {
  const cfg = loadConfig();
  const integrationsUrl = `${cfg.baseUrl.replace(/\/+$/, '')}/dashboard/integrations`;
  let token = String(opts.token ?? '').trim();
  if (!token) {
    console.log('1. Create your account (if needed): https://trybiut.com/onboarding/chat');
    console.log(`2. Open this link and copy your token:\n   ${integrationsUrl}`);
    if (opts.open) tryOpenUrl(integrationsUrl);
    token = (await promptHidden('Paste token: ')).trim().replace(/^Bearer\s+/i, '');
  }
  if (!token || token.length < 20) die('Invalid token. Copy the full token from the link above.');
  console.log('Verifying...');
  const client = new TrybiutClient(cfg.baseUrl, token);
  try {
    await client.request('/api/user/debug');
  } catch (err) {
    die(`Token rejected: ${err instanceof Error ? err.message : String(err)}`);
  }
  saveConfig({ token, tokenType: 'Bearer', expiresAt: undefined });
  console.log(`Logged in. Token saved to ${configPath()} (mode 600).`);
  console.log('Next: trybiut me');
});

program.command('logout').description('Clear the local session token').action(async () => {
  const cfg = loadConfig();
  if (cfg.token) await supabaseLogout(cfg.token, cfg).catch(() => {});
  clearToken();
  console.log('Logged out. Token cleared.');
});

program.command('config').description('Show current config (token redacted by default)').option('--show-token', 'Print full token').option('--set-base-url <url>', 'Set base URL').action(async (opts) => {
  if (opts.setBaseUrl) { saveConfig({ baseUrl: String(opts.setBaseUrl).replace(/\/+$/, '') }); console.log(`baseUrl set to ${String(opts.setBaseUrl).replace(/\/+$/, '')}`); return; }
  const cfg = loadConfig();
  const out: Record<string, unknown> = { baseUrl: cfg.baseUrl, supabaseUrl: cfg.supabaseUrl, configPath: configPath(), token: cfg.token ? (opts.showToken ? cfg.token : TrybiutClient.redactToken(cfg.token)) : '(none)', expiresAt: cfg.expiresAt ? new Date(cfg.expiresAt).toISOString() : undefined };
  printJson(out);
});

program.command('status').description('Check that the TryBiut API is reachable (no login needed)').action(async () => {
  const cfg = loadConfig();
  const client = new TrybiutClient(cfg.baseUrl, undefined);
  const started = Date.now();
  const health = await client.request('/api/taxes/health', { public: true });
  printJson({ service: 'trybiut', reachable: true, latencyMs: Date.now() - started, health });
});

program.command('me').description('Show the logged-in user profile').action(async () => {
  const client = new TrybiutClient();
  client.requireAuth();
  printJson(await client.request('/api/user/debug'));
});

program.command('tax-preview').description('Yearly saving estimate (no login)').requiredOption('--income <n>', 'Yearly income').option('--country <code>', 'ISO country code', 'ES').option('--legal-form <form>', 'autonomo | sl | freelance | employee', 'autonomo').action(async (opts) => {
  const client = new TrybiutClient(loadConfig().baseUrl, undefined);
  printJson(await client.request('/api/taxes/calculate-preview', { method: 'POST', public: true, body: { income: Number(opts.income), country: opts.country, legalForm: opts.legalForm } }));
});

program.command('tax-calc').description('Tax breakdown (no login)').requiredOption('--amount <n>', 'Amount').option('--region <name>', 'Region', 'España').option('--business-type <t>', 'Business type', 'autonomo').option('--period <p>', 'monthly | quarterly | annual', 'annual').option('--social', 'Include social security').action(async (opts) => {
  const client = new TrybiutClient(loadConfig().baseUrl, undefined);
  printJson(await client.request('/api/tax/calculate', { public: true, query: { amount: opts.amount, region: opts.region, businessType: opts.businessType, period: opts.period, includeSocialSecurity: String(Boolean(opts.social)) } }));
});

program.command('calendar').description('Fiscal obligations calendar (no login)').option('--year <y>', 'Year', String(new Date().getFullYear())).action(async (opts) => {
  const client = new TrybiutClient(loadConfig().baseUrl, undefined);
  printJson(await client.request(`/api/taxes/calendar/${opts.year}`, { public: true }));
});

program.command('pricing').description('Pricing coverage countries (no login)').action(async () => {
  const client = new TrybiutClient(loadConfig().baseUrl, undefined);
  printJson(await client.request('/api/pricing/countries', { public: true }));
});

program.command('dashboard').description('Tax dashboard (requires login)').action(async () => {
  const client = new TrybiutClient();
  client.requireAuth();
  printJson(await client.request('/api/taxes/dashboard'));
});

program.command('invoices').description('List invoices (requires login)').option('--limit <n>', 'Max results', '20').action(async (opts) => {
  const client = new TrybiutClient();
  client.requireAuth();
  const data: any = await client.request('/api/invoices');
  const list = Array.isArray(data) ? data : Array.isArray(data?.invoices) ? data.invoices : data;
  const limit = Math.min(100, Math.max(1, Number(opts.limit) || 20));
  printJson(Array.isArray(list) ? list.slice(0, limit) : list);
});

program.command('movements').description('List movements (requires login)').option('--limit <n>', 'Max results', '20').action(async (opts) => {
  const client = new TrybiutClient();
  client.requireAuth();
  const data: any = await client.request('/api/movements');
  const list = Array.isArray(data?.movements) ? data.movements : Array.isArray(data) ? data : data;
  const limit = Math.min(100, Math.max(1, Number(opts.limit) || 20));
  printJson(Array.isArray(list) ? list.slice(0, limit) : list);
});

program.command('history').description('Filed tax forms history (requires login)').action(async () => {
  const client = new TrybiutClient();
  client.requireAuth();
  printJson(await client.request('/api/tax/history'));
});

program.command('report').description('Full tax report (requires login)').action(async () => {
  const client = new TrybiutClient();
  client.requireAuth();
  printJson(await client.request('/api/reports/taxes'));
});

program.command('subscription').description('Subscription status (requires login)').action(async () => {
  const client = new TrybiutClient();
  client.requireAuth();
  try { printJson(await client.request('/api/stripe/create-portal-session', { method: 'POST', body: {} })); } catch { printJson({ subscribed: 'unknown', detail: 'Could not confirm subscription', pricing: 'https://trybiut.com/pricing' }); }
});

program.parseAsync(process.argv).catch((err: unknown) => die(err instanceof Error ? err.message : String(err)));
