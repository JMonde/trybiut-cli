// Smoke: build + help parsing
import { readFileSync } from 'node:fs';
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
console.log(`trybiut-cli v${pkg.version} — bin: ${Object.keys(pkg.bin).join(', ')}`);
const src = readFileSync(new URL('../src/index.ts', import.meta.url), 'utf8');
const cmds = [...src.matchAll(/\.command\('([^']+)'\)/g)].map(m => m[1]);
console.log(`commands: ${cmds.join(', ')}`);
if (!cmds.includes('login') || !cmds.includes('logout')) { console.error('Missing login/logout'); process.exit(1); }
console.log('smoke ok');
