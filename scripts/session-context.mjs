#!/usr/bin/env node
// SessionStart hook — auto-loads Dev Factory context when the working folder is connected
// (devfactory-df.config.json present). Prints nothing otherwise, so non-DevFactory projects stay clean.
// Stdout is injected into Claude's context at session start.
'use strict';

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const cfgPath = resolve(projectDir, 'devfactory-df.config.json');
if (!existsSync(cfgPath)) process.exit(0);

let cfg = {};
try {
  cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
} catch {
  console.log('[devfactory] devfactory-df.config.json exists but is invalid JSON — re-run /devfactory:connect before any Dev Factory work.');
  process.exit(0);
}

const envFile = resolve(projectDir, '.env');
let hasKey = Boolean(process.env.DEVFACTORY_PROJECT_KEY);
if (!hasKey && existsSync(envFile)) {
  hasKey = /^\s*DEVFACTORY_PROJECT_KEY\s*=\s*\S/m.test(readFileSync(envFile, 'utf8'));
}

console.log(`[devfactory] This folder is connected to Dev Factory project "${cfg.projectId}" (env: ${cfg.environmentId || 'dev'}).
Before ANY Dev Factory work, read the devfactory skill (platform rules, data-plane grammar, admin requests).
Project key in .env: ${hasKey ? 'present' : 'MISSING — the platform admin issues it; ask the user to request one before data-plane calls'}.
Tooling: node "\${CLAUDE_PLUGIN_ROOT}/scripts/devfactory-call.mjs" (calls) · devfactory-smoke.mjs (read-only health).
User-facing commands: /devfactory:connect /devfactory:status /devfactory:data /devfactory:ai /devfactory:new-app /devfactory:publish /devfactory:observability /devfactory:diagnose.
The user is a dev with NO AWS/kubectl and Console access LIMITED to the Releases screen (publish/promote/rollback in dev and qa — dictate the clicks). Everything else Entra-gated (provisioning, keys, AI enable, PROD releases, panels) belongs to the platform ADMIN: draft admin requests for them; you do everything else and prove it by API with real responses.`);
