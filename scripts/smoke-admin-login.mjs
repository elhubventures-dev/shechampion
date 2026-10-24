import { existsSync, readFileSync } from 'node:fs';

function load(p) {
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#') || !t.includes('=')) continue;
    const i = t.indexOf('=');
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (process.env[k] === undefined || process.env[k] === '') process.env[k] = v;
  }
}

load('.env.local');
const pass = readFileSync('.admin-password.local.txt', 'utf8').match(
  /^Password:\s*(.+)$/m
)[1].trim();

const res = await fetch('http://127.0.0.1:3001/api/admin/session', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Origin: 'http://localhost:5173',
    Accept: 'application/json',
  },
  body: JSON.stringify({
    email: 'info@shechampion-bbf.org',
    password: pass,
  }),
});

const data = await res.json();
console.log(
  JSON.stringify(
    {
      status: res.status,
      ok: Boolean(data.ok),
      errorCode: data?.error?.code || null,
      hasEmail: Boolean(data.email),
    },
    null,
    2
  )
);
process.exit(data.ok ? 0 : 1);
