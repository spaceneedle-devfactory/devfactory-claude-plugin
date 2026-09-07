#!/usr/bin/env node
// Dev Factory — command-line client for the data plane / AI / observability.
//
// Usage:
//   node devfactory-call.mjs <METHOD> <path> [--body '<json>'] [--base dataplane|api|ai] [--env <env>]
//
// Examples:
//   node devfactory-call.mjs GET  documents/incidents
//   node devfactory-call.mjs POST documents/incidents --body '{"title":"x"}'
//   node devfactory-call.mjs POST relational/sql:query --body '{"sql":"SELECT 1"}'
//   node devfactory-call.mjs GET  files/attachments/report.pdf:download-url
//   node devfactory-call.mjs POST model/amazon.nova-lite-v1:0/converse --base ai --body '{"messages":[{"role":"user","content":[{"text":"hi"}]}]}'
//   node devfactory-call.mjs POST projects/__PROJECT__/observability/signals --base api --body '{"env":"dev","signals":[{"kind":"event","name":"ping"}]}'
//
// Config: reads devfactory-df.config.json (CWD or DEVFACTORY_CONFIG) — the connection-kit bundle.
// Credential: DEVFACTORY_PROJECT_KEY from the environment or .env (never printed).
// Uses native http/https (not fetch): fetch drops the Host header, which is needed when the
// platform is reached by IP/port-forward (optional DEVFACTORY_HOST_HEADER).
'use strict';

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import http from 'node:http';
import https from 'node:https';

function fail(msg) {
  console.error(`[devfactory-call] ${msg}`);
  process.exit(2);
}

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

function loadConfig() {
  const p = process.env.DEVFACTORY_CONFIG || resolve(process.cwd(), 'devfactory-df.config.json');
  if (!existsSync(p)) fail(`config not found: ${p} — run /devfactory:connect first (it writes devfactory-df.config.json from the connection kit)`);
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch (e) {
    fail(`invalid config at ${p}: ${e.message}`);
  }
}

const args = process.argv.slice(2);
if (args.length < 2) fail('usage: devfactory-call.mjs <METHOD> <path> [--body <json>] [--base dataplane|api|ai] [--env <env>]');

const method = args[0].toUpperCase();
const path = args[1].replace(/^\/+/, '');
let body;
let base = 'dataplane';
let envId;
for (let i = 2; i < args.length; i++) {
  if (args[i] === '--body') body = args[++i];
  else if (args[i] === '--base') base = args[++i];
  else if (args[i] === '--env') envId = args[++i];
}

const cfg = loadConfig();
const dotenv = loadEnvFile();
const key = process.env.DEVFACTORY_PROJECT_KEY || dotenv.DEVFACTORY_PROJECT_KEY || '';
if (!key) fail('DEVFACTORY_PROJECT_KEY missing — get the project key in the Console (Connect → Project API keys) and store it in .env');

const apiBaseUrl = (cfg.apiBaseUrl || '').replace(/\/+$/, '');
let dataPlaneBaseUrl = (cfg.dataPlaneBaseUrl || '').replace(/\/+$/, '');
if (envId && cfg.environmentId && envId !== cfg.environmentId) {
  dataPlaneBaseUrl = dataPlaneBaseUrl.replace(`/environments/${cfg.environmentId}`, `/environments/${envId}`);
}
const aiBaseUrl = `${apiBaseUrl}/ai`;

let url;
if (base === 'dataplane') url = `${dataPlaneBaseUrl}/${path}`;
else if (base === 'api') url = `${apiBaseUrl}/${path.replace('__PROJECT__', cfg.projectId)}`;
else if (base === 'ai') url = `${aiBaseUrl}/${path}`;
else fail(`invalid --base: ${base} (use dataplane | api | ai)`);

const u = new URL(url);
const mod = u.protocol === 'https:' ? https : http;
const headers = {
  'content-type': 'application/json',
  'x-project-key': key,
  'x-project-env': envId || cfg.environmentId || 'dev',
};
const hostHeader = process.env.DEVFACTORY_HOST_HEADER || dotenv.DEVFACTORY_HOST_HEADER;
if (hostHeader) headers.host = hostHeader;
if (body !== undefined) headers['content-length'] = Buffer.byteLength(body);

const req = mod.request(
  {
    method,
    hostname: u.hostname,
    port: u.port || (u.protocol === 'https:' ? 443 : 80),
    path: u.pathname + u.search,
    headers,
    timeout: Number(process.env.DEVFACTORY_TIMEOUT_MS || 30000),
  },
  (res) => {
    const chunks = [];
    res.on('data', (c) => chunks.push(c));
    res.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8');
      console.error(`[${res.statusCode}] ${method} ${u.pathname}`);
      try {
        console.log(JSON.stringify(JSON.parse(text), null, 2));
      } catch {
        if (text) console.log(text);
      }
      process.exit(res.statusCode >= 200 && res.statusCode < 300 ? 0 : 1);
    });
  },
);
req.on('error', (err) => fail(`network failure: ${err.message} — are you on the Dev Factory network/VPN?`));
req.on('timeout', () => { req.destroy(); fail('timeout'); });
if (body !== undefined) req.write(body);
req.end();
