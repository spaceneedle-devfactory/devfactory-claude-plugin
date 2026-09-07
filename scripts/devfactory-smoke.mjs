#!/usr/bin/env node
// Dev Factory — READ-ONLY smoke test of the project's data-plane services.
// Zero side effects: no writes, no e-mails, no queues created.
//
// Usage: node devfactory-smoke.mjs            (per-service status table)
//        node devfactory-smoke.mjs --json     (JSON output for parsing)
//
// Same config as devfactory-call.mjs (devfactory-df.config.json + DEVFACTORY_PROJECT_KEY in .env/environment).
'use strict';

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import http from 'node:http';
import https from 'node:https';

function loadEnvFile() {
  const p = resolve(process.cwd(), '.env');
  if (!existsSync(p)) return {};
  const out = {};
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

const cfgPath = process.env.DEVFACTORY_CONFIG || resolve(process.cwd(), 'devfactory-df.config.json');
if (!existsSync(cfgPath)) {
  console.error(`[devfactory-smoke] config not found: ${cfgPath} — run /devfactory:connect first`);
  process.exit(2);
}
const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
const dotenv = loadEnvFile();
const key = process.env.DEVFACTORY_PROJECT_KEY || dotenv.DEVFACTORY_PROJECT_KEY || '';
const hostHeader = process.env.DEVFACTORY_HOST_HEADER || dotenv.DEVFACTORY_HOST_HEADER;

const dp = (cfg.dataPlaneBaseUrl || '').replace(/\/+$/, '');
const api = (cfg.apiBaseUrl || '').replace(/\/+$/, '');
const ai = `${api}/ai`;

function call(method, url, body) {
  return new Promise((resolveP) => {
    let u;
    try {
      u = new URL(url);
    } catch {
      resolveP({ ok: false, status: 0, error: `invalid url: ${url}` });
      return;
    }
    const mod = u.protocol === 'https:' ? https : http;
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const headers = { 'content-type': 'application/json' };
    if (key) headers['x-project-key'] = key;
    if (hostHeader) headers.host = hostHeader;
    if (payload !== undefined) headers['content-length'] = Buffer.byteLength(payload);
    const req = mod.request(
      { method, hostname: u.hostname, port: u.port || (u.protocol === 'https:' ? 443 : 80), path: u.pathname + u.search, headers, timeout: 15000 },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          let detail = null;
          try {
            const parsed = JSON.parse(text);
            detail = parsed.detail || parsed.title || null;
          } catch { /* non-JSON body */ }
          resolveP({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, error: detail });
        });
      },
    );
    req.on('error', (err) => resolveP({ ok: false, status: 0, error: err.message }));
    req.on('timeout', () => { req.destroy(); resolveP({ ok: false, status: 0, error: 'timeout' }); });
    if (payload !== undefined) req.write(payload);
    req.end();
  });
}

// Read-only probes: collection lists (empty counts as success), SELECT 1, health.
const probes = [
  ['documents', () => call('GET', `${dp}/documents/devfactory-smoke-probe?$top=1`)],
  ['relational', () => call('POST', `${dp}/relational/sql:scalar`, { sql: 'SELECT 1' })],
  ['tables', () => call('GET', `${dp}/tables/devfactory-smoke-probe?$top=1`)],
  ['files', () => call('GET', `${dp}/files/devfactory-smoke-probe`)],
  ['secrets', () => call('GET', `${dp}/secrets/app`)],
  ['queue (route)', () => call('GET', `${dp}/queue/devfactory-smoke-probe`)],
  ['messages (route)', () => call('GET', `${dp}/messages/`)],
  ['ai (gateway)', () => call('GET', `${ai}/health`)],
];

const results = {};
for (const [name, fn] of probes) {
  const r = await fn();
  results[name] = r;
}

const aiGate = await call('POST', `${ai}/model/amazon.nova-lite-v1:0/converse`, {
  messages: [{ role: 'user', content: [{ text: 'ping' }] }],
  inferenceConfig: { maxTokens: 8 },
});
results['ai (converse)'] = aiGate;

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ project: cfg.projectId, env: cfg.environmentId, results }, null, 2));
} else {
  console.log(`\nRead-only smoke — project ${cfg.projectId} · env ${cfg.environmentId}\n`);
  const pad = (s, n) => String(s).padEnd(n);
  for (const [name, r] of Object.entries(results)) {
    const mark = r.ok ? 'OK ' : 'ERR';
    const extra = r.ok ? '' : ` ${r.status || ''} ${r.error || ''}`.trimEnd();
    console.log(`  ${mark}  ${pad(name, 18)}${extra}`);
  }
  console.log('\nNotes: ERR on "ai (converse)" with ai_disabled = enable AI on the project (Console/AI Playground).');
  console.log('messages is not tested with a real send (avoids e-mail); the route answering already proves the service.\n');
}
const critical = ['documents', 'relational', 'tables', 'files'];
process.exit(critical.every((k) => results[k] && results[k].ok) ? 0 : 1);
