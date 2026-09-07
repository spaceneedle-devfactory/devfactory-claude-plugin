---
name: status
description: Check the health of the connected Dev Factory project - data-plane services, AI, published apps and their versions. Use when the user asks "is everything working?", "project status", "what is live?".
---

# Project status

1. Confirm connectivity (`devfactory-df.config.json` + key). Missing → run the `/devfactory:connect` flow.
2. `node "${CLAUDE_PLUGIN_ROOT}/scripts/devfactory-smoke.mjs" --json` → per-service table.
3. **Published apps** (when the project has them): for each known app, `curl -s -m 8`
   against `{host}/{project}-{app}/health` and, when available, `/api/version` (or
   `{BASE_PATH}/version.json` on frontends) — report the live version and since when.
4. Summarize for the user:
   - ✅ what is healthy (one line, no jargon)
   - ⚠️ what needs an **admin request** (with the ready-to-send draft — see
     `${CLAUDE_PLUGIN_ROOT}/skills/devfactory/references/admin-requests.md`)
   - ❌ what is a platform problem (with the evidence ready to forward via the admin)
5. Everything is verified by API/public URLs — no panel is needed for status.

Perform no writes during status — it is a read.
