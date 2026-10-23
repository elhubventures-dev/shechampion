#!/usr/bin/env node
/**
 * Local Node server that mounts /api/* handlers for staging without `vercel link`.
 * Loads gitignored .env files. Default port: 3001.
 */
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.LOCAL_API_PORT || 3001);

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const eq = trimmed.indexOf('=');
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined || process.env[key] === '') {
      process.env[key] = value;
    }
  }
}

loadEnvFile(join(root, '.env.staging.local'));
loadEnvFile(join(root, '.env.local'));

// Staging/dev must never load live Paystack credentials from a merged .env.local.
const appEnv = String(process.env.APP_ENV || '').toLowerCase();
const paystackKey = String(process.env.PAYSTACK_SECRET_KEY || '');
const paystackMode = String(process.env.PAYSTACK_MODE || '').toLowerCase();
if (
  (appEnv === 'staging' || appEnv === 'development') &&
  (paystackKey.startsWith('sk_live_') || paystackMode === 'live')
) {
  console.error(
    '[local-api] Refusing live Paystack credentials under APP_ENV=' +
      (appEnv || 'unknown') +
      '. Unset PAYSTACK_SECRET_KEY for this process; set sk_test_ in .env.staging.local.'
  );
  delete process.env.PAYSTACK_SECRET_KEY;
  process.env.PAYSTACK_MODE = 'test';
}

/** @type {Record<string, string>} */
const routes = {
  '/api/health': 'api/health.js',
  '/api/registration/status': 'api/registration/status.js',
  '/api/registration/create': 'api/registration/create.js',
  '/api/payment/verify': 'api/payment/verify.js',
  '/api/payment/webhook': 'api/payment/webhook.js',
  '/api/admin/login': 'api/admin/login.js',
  '/api/admin/logout': 'api/admin/logout.js',
  '/api/admin/me': 'api/admin/me.js',
  '/api/admin/registrations': 'api/admin/registrations.js',
  '/api/admin/registration': 'api/admin/registration.js',
  '/api/admin/export': 'api/admin/export.js',
  '/api/admin/retry-email': 'api/admin/retry-email.js',
};

function wrapRes(res) {
  const headers = new Map();
  return {
    statusCode: 200,
    setHeader(key, value) {
      headers.set(String(key).toLowerCase(), value);
      res.setHeader(key, value);
    },
    getHeader(key) {
      return headers.get(String(key).toLowerCase()) ?? res.getHeader(key);
    },
    end(body) {
      res.statusCode = this.statusCode;
      res.end(body);
    },
  };
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
    const routePath = url.pathname.replace(/\/$/, '') || '/';
    const relative = routes[routePath];
    if (!relative) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ ok: false, error: { code: 'NOT_FOUND', message: 'Not found.' } }));
      return;
    }

    const moduleUrl = pathToFileURL(join(root, relative)).href;
    const mod = await import(`${moduleUrl}?t=${Date.now()}`);
    const handler = mod.default;
    if (typeof handler !== 'function') {
      res.statusCode = 500;
      res.end(JSON.stringify({ ok: false, error: { message: 'Invalid handler.' } }));
      return;
    }

    // Preserve query string for handlers that parse req.url
    req.url = `${routePath}${url.search}`;
    await handler(req, wrapRes(res));
  } catch (error) {
    console.error('[local-api]', error?.code || error?.message || error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(
        JSON.stringify({
          ok: false,
          error: { code: 'LOCAL_API_ERROR', message: 'Local API error.' },
        })
      );
    }
  }
});

process.on('uncaughtException', (error) => {
  console.error('[local-api] uncaughtException', error?.code || error?.message || error);
});
process.on('unhandledRejection', (error) => {
  console.error('[local-api] unhandledRejection', error?.code || error?.message || error);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Local API listening on http://127.0.0.1:${port}`);
  console.log('Pair with: npm run dev  (Vite proxies /api → this server)');
});
