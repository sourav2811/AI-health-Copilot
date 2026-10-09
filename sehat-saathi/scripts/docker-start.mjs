import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { createGateway } from './docker-gateway.mjs';

const data = path.resolve(process.env.DATA_DIR || '/data');
mkdirSync(data, { recursive: true });
const configPath = path.resolve('dist/server/wrangler.json');
const config = JSON.parse(readFileSync(configPath, 'utf8'));
for (const db of config.d1_databases) db.migrations_dir = path.resolve('drizzle');
writeFileSync(configPath, JSON.stringify(config));
// Runtime-only credentials are never copied into the image or passed in argv.
const vars = Object.fromEntries(['OPENAI_API_KEY', 'OPENAI_MODEL'].filter(k => process.env[k]).map(k => [k, process.env[k]]));
writeFileSync(path.resolve('dist/server/.dev.vars'), Object.entries(vars).map(([k,v]) => `${k}=${JSON.stringify(v)}`).join('\n'), { mode: 0o600 });
const cli = path.resolve('node_modules/wrangler/bin/wrangler.js');
const base = ['--config', configPath, '--local', '--persist-to', data];
const migration = spawnSync(process.execPath, [cli, 'd1', 'migrations', 'apply', 'DB', ...base], { stdio: ['ignore', 'inherit', 'inherit'], env: { ...process.env, CI: 'true' } });
if (migration.error || migration.status !== 0) throw new Error('Database migration failed; server was not started.');
const worker = spawn(process.execPath, [cli, 'dev', ...base, '--ip', '127.0.0.1', '--port', '8787', '--inspector-port', '0'], { stdio: 'inherit' });
const gateway = createGateway();
gateway.listen(3000, '0.0.0.0', () => console.log('Local Docker demo: http://localhost:3000 (single shared demo profile)'));
function stop() { gateway.close(); worker.kill('SIGTERM'); }
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
worker.on('error', () => { gateway.close(); process.exitCode = 1; });
worker.on('exit', code => { gateway.close(); process.exitCode = code ?? 1; });
