#!/usr/bin/env node
import { Command } from 'commander';
import { loadConfig, saveConfig, clearToken, configPath } from './config.js';
import { TrybiutClient } from './client.js';
import { supabaseLogin, supabaseLogout } from './supabase.js';
import { prompt, promptHidden } from './prompt.js';

const program = new Command();
program.name('trybiut').description('TryBiut CLI — taxes, invoices, movements and reports').version('0.1.0');

function printJson(data: unknown) { console.log(JSON.stringify(data, null, 2)); }
function die(msg: string, code = 1): never { console.error(msg); process.exit(code); }

program.command('login').description('Log in and store a local session token (password is never saved)').action(async () => {
  const cfg = loadConfig();
  const email = await prompt('Email: ');
  if (!email || !email.includes('@')) die('Invalid email.');
  const password = await promptHidden('Password: ');
  if (!password) die('Password required.');
  console.log('Authenticating...');
  const res = await supabaseLogin(email, password, cfg);
  saveConfig({ token: res.access_token, tokenType: res.token_type, expiresAt: res.expires_in ? Date.now() + res.expires_in * 1000 : undefined });
  console.log(`Logged in. Token saved to ${configPath()} (mode 600).`);
  console.log(`Token: ${res.access_token.slice(0, 8)}*** (use --show-token with 'config' to display)`);
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
