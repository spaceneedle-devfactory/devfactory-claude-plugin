---
name: diagnose
description: Diagnose problems on the Dev Factory project - failing calls, app down, release not moving, e-mail not arriving, AI refusing. Use when the user says "it doesn't work", "there's an error", "it stopped", "it never arrived", "it's down".
argument-hint: "[what-is-wrong]"
---

# Diagnose

Full playbook in
`${CLAUDE_PLUGIN_ROOT}/skills/devfactory/references/troubleshooting.md` — follow the
symptom → cause → action table (actions labeled [DEV] / [ADMIN] / [PLATFORM]).

1. **Collect the symptom** in the user's words ("the screen doesn't load data") and translate it
   to a layer: connectivity · credential · data plane · published app · release · platform.
2. **Smoke first**: `node "${CLAUDE_PLUGIN_ROOT}/scripts/devfactory-smoke.mjs"` — separates
   "everything is down" from "one service" from "just your call".
3. **Minimal reproduction** with devfactory-call, capturing status + the problem+json `detail`.
   That is your evidence; never conclude without it.
4. **Classify and act** using the table:
   - [DEV] → execute the fix (code, grammar, version bump) and re-run the reproduction showing
     before/after; republishing in dev/qa is the dev's own click on the Releases screen.
   - [ADMIN] → draft the exact request from `references/admin-requests.md` (new key, Enable AI,
     deploy env, prod release) for the user to send.
   - [PLATFORM] → assemble the report for the user to forward via the admin: project, exact
     call, response, time, what was already ruled out.

Never walk in circles: each attempt changes ONE variable and records the outcome.
