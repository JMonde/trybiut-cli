<p align="center"><img src="assets/logo-trybiut.png" alt="TryBiut logo" width="120" /></p>

<h1 align="center">TryBiut CLI</h1>

<p align="center">Manage TryBiut from the terminal — taxes, invoices, movements, reports. Secure token storage, no password ever saved.</p>

<p align="center">
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg" /></a>
  <img alt="Node >= 18" src="https://img.shields.io/badge/node-%3E%3D18-green.svg" />
</p>

## Install in one command

No npm publish needed:

```bash
npx -y github:JMonde/trybiut-cli --help
# or install globally
npm i -g github:JMonde/trybiut-cli
trybiut --help
```

After `npm publish`, this becomes `npx -y trybiut-cli` / `npm i -g trybiut-cli`.

## Quick start

```bash
# 1. Create your account
open https://trybiut.com/get-started

# 2. Log in (stores a local token, password is not saved)
npx -y github:JMonde/trybiut-cli login

# 3. Verify
npx -y github:JMonde/trybiut-cli me
npx -y github:JMonde/trybiut-cli dashboard

# No login needed
npx -y github:JMonde/trybiut-cli status
npx -y github:JMonde/trybiut-cli tax-preview --income 35000 --country ES
npx -y github:JMonde/trybiut-cli calendar --year 2026
```

## Commands

| Command | Auth | Description |
|---|---|---|
| `login` | no | Authenticate and save token |
| `logout` | — | Clear local token |
| `config [--show-token] [--set-base-url URL]` | — | Show or set config |
| `status` | no | API health check |
| `me` | yes | Logged-in profile |
| `tax-preview --income N [--country ES] [--legal-form autonomo]` | no | Saving estimate |
| `tax-calc --amount N [--region España] [--business-type autonomo] [--period annual] [--social]` | no | Tax breakdown |
| `calendar [--year 2026]` | no | Fiscal calendar |
| `pricing` | no | Pricing coverage |
| `dashboard` | yes | Tax dashboard |
| `invoices [--limit 20]` | yes | List invoices |
| `movements [--limit 20]` | yes | List movements |
| `history` | yes | Filed forms |
| `report` | yes | Full tax report |
| `subscription` | yes | Plan status |

## Security

- Password is used once to obtain a Supabase session token, then discarded.
- Token is stored at `~/.config/trybiut/config.json` (Windows: `%APPDATA%/trybiut/config.json`) with mode `600`.
- Private commands refuse to run without a token and never send data anonymously.
- Use `TRYBIUT_API_TOKEN` env var to override the stored token (useful for CI).
- `config` redacts the token by default.
- The MCP server (`github:JMonde/trybiut-mcp`) reuses the same token via `TRYBIUT_API_TOKEN`.

## Config

Env overrides:

- `TRYBIUT_BASE_URL` (default `https://trybiut.com`)
- `TRYBIUT_API_TOKEN` (overrides stored token)
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` (rarely needed)

## Development

```bash
npm install
npm run build
npm run smoke
node dist/index.js --help
```

Publishing (optional):

```bash
npm login
npm publish --access public
```

## License

MIT © 2026 TryBiut — see [LICENSE](LICENSE).
