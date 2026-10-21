#!/usr/bin/env node
/**
 * Generate ADMIN_PASSWORD_HASH for .env (scrypt).
 * Usage (PowerShell):
 *   $env:ADMIN_PASSWORD="your-strong-password"; npm run hash-admin-password
 * Usage (bash):
 *   ADMIN_PASSWORD='your-strong-password' npm run hash-admin-password
 *
 * Does not echo the plaintext password. Does not write to disk.
 */
import { createInterface } from 'node:readline';
import { hashPassword } from '../api/_lib/crypto.js';

async function readPassword() {
  if (process.env.ADMIN_PASSWORD) {
    return process.env.ADMIN_PASSWORD;
  }
  if (!process.stdin.isTTY) {
    console.error('Set ADMIN_PASSWORD in the environment, or run in a TTY.');
    process.exit(1);
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const password = await new Promise((resolve) => {
    rl.question('Admin password (input hidden not guaranteed in all shells): ', resolve);
  });
  rl.close();
  return password;
}

const password = await readPassword();
if (!password || password.length < 12) {
  console.error('Password must be at least 12 characters.');
  process.exit(1);
}

const hash = hashPassword(password);
console.log('ADMIN_PASSWORD_HASH=');
console.log(hash);
console.error('Copy the hash into your server environment. Do not commit it.');
