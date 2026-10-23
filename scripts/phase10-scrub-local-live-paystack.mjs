#!/usr/bin/env node
/**
 * Phase 10 — remove live Paystack credentials from local staging env files.
 * Never prints secret values. Does not touch Vercel production env.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const targets = ['.env.local', '.env.staging.local'];
const report = { files: {}, secretsPrinted: false };

function scrubFile(rel) {
  const path = join(root, rel);
  if (!existsSync(path)) {
    report.files[rel] = { exists: false };
    return;
  }
  const original = readFileSync(path, 'utf8');
  const lines = original.split(/\r?\n/);
  let changed = false;
  let clearedSecret = false;
  let clearedPublic = false;
  let modeForcedTest = false;
  let clearedStartAt = false;

  const out = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) return line;
    const eq = trimmed.indexOf('=');
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key === 'PAYSTACK_SECRET_KEY' && value.toLowerCase().startsWith('sk_live_')) {
      changed = true;
      clearedSecret = true;
      return 'PAYSTACK_SECRET_KEY=';
    }
    if (key === 'PAYSTACK_PUBLIC_KEY' && value.toLowerCase().startsWith('pk_live_')) {
      changed = true;
      clearedPublic = true;
      return 'PAYSTACK_PUBLIC_KEY=';
    }
    if (key === 'PAYSTACK_MODE' && value.toLowerCase() === 'live') {
      changed = true;
      modeForcedTest = true;
      return 'PAYSTACK_MODE=test';
    }
    // Do not treat the unconfirmed 15 Dec staging timestamp as official.
    if (
      key === 'EVENT_START_AT' &&
      value.startsWith('2026-12-15')
    ) {
      changed = true;
      clearedStartAt = true;
      return 'EVENT_START_AT=';
    }
    return line;
  });

  if (changed) {
    writeFileSync(path, out.join('\n'), 'utf8');
  }
  report.files[rel] = {
    exists: true,
    changed,
    clearedLiveSecret: clearedSecret,
    clearedLivePublic: clearedPublic,
    modeForcedTest,
    clearedUnconfirmedEventStartAt: clearedStartAt,
  };
}

for (const t of targets) scrubFile(t);
report.ok = true;
console.log(JSON.stringify(report, null, 2));
