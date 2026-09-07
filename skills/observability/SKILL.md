---
name: observability
description: Application telemetry on the Dev Factory - emit events/logs/metrics and instrument an app so the platform team can see its errors. Use when the user wants to "monitor", "report errors", "know if the system is healthy", "track usage".
argument-hint: "[what-to-monitor]"
---

# Observability

Contract and instrumentation pattern in
`${CLAUDE_PLUGIN_ROOT}/skills/devfactory/references/observability.md`.

1. **Emit a one-off signal** (mark an event, test the pipeline):
   `devfactory-call POST projects/__PROJECT__/observability/signals --base api --body '{...}'` —
   batch `{"env":"dev","signals":[...]}`. A 202 `accepted:N` is the proof of delivery.
2. **Instrument an app** (the valuable work): in the app repo, ensure the golden pattern —
   `app_start` + exceptions with `level:error` (the template ships it), `level:error` on EVERY
   integration failure (centralized in the call wrapper), business lifecycle events with ids in
   `attributes`, and 1–2 metrics with a `unit`. Then ship via `/devfactory:publish`.
3. **Who reads it:** the Observability panel is admin/platform-team territory (Entra) — the dev
   emits, they see. When the dev needs panel content, draft a "Panel check" admin request.
4. **Dev-readable state**: for anything the dev must consult himself, also persist it to the
   data plane (e.g. a `tables/app_health` heartbeat, error counters) — readable by API anytime,
   no panel needed. Offer this whenever you instrument an app.

Rule: frontends never emit telemetry directly (the key does not reach the browser) — always via
the backend.
