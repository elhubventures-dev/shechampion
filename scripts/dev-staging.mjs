#!/usr/bin/env node
/**
 * Staging local stack: API on :3001 + Vite on :5173 (proxies /api).
 * Does not require `vercel link`.
 */
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function run(command, args, useShell = false) {
  const child = spawn(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: useShell,
    env: process.env,
  });
  child.on('exit', (code) => {
    if (code && code !== 0) process.exitCode = code;
  });
  return child;
}

const api = run(process.execPath, [join(root, 'scripts/local-api-server.mjs')]);
const web = run(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['vite', '--port', '5173', '--strictPort'],
  true
);

function shutdown() {
  api.kill('SIGTERM');
  web.kill('SIGTERM');
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
