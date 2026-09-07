# Observability — application telemetry

100% app-driven: the platform only shows what the app emits. Endpoint (base `api` in devfactory-call):

```text
POST projects/__PROJECT__/observability/signals    (x-project-key)
```

Body — batch of up to **200 signals**, ≤30 `attributes` per signal, `message` ≤4096 chars:

```json
{ "env": "dev", "signals": [
  { "kind": "event",  "name": "order_created", "level": "info", "attributes": { "order_id": "123" } },
  { "kind": "log",    "name": "integration_failure", "level": "error", "message": "error detail" },
  { "kind": "metric", "name": "checkout.latency", "value": 812.5, "unit": "Milliseconds" }
] }
```

`kind` ∈ `event | log | metric | trace`. Response: 202 `{"data":{"accepted":N,"cloud_watch":true}}`.

**Who sees it:** the Observability panel is Entra-gated — the **admin** and the platform team
read it; the dev does not. Emitting is still entirely worth it: it is how the platform team
diagnoses your app in production, and the 202 `accepted` is your proof of delivery. When the dev
needs to see the panel content, use a "Panel check" admin request (admin-requests.md).

## Minimal instrumentation for any app (golden pattern)

Templates ship `telemetry.js` (no-op without `TELEMETRY_URL`+`DEVFACTORY_PROJECT_KEY`; fire-and-forget,
never crashes the app). Ensure in the app:

1. `app_start` at boot; `uncaught_exception`/`unhandled_rejection` with `level:"error"`
   (the template already does this).
2. **`level:"error"` on every integration failure** (any data-plane call that is not 2xx) — the
   single most useful signal for later diagnosis. Centralize it in the call wrapper.
3. Business lifecycle events (created/completed/failed X) with ids in `attributes`.
4. 1–2 metrics that matter (latency, count, processing duration) with a `unit`.

For state the dev needs to consult himself, don't rely on the panel: also persist app status
into the data plane (e.g. a `tables/app_health` heartbeat, error counters in `tables`), which
you can read back via API anytime.

## Golden rule

The project key **never reaches the browser** → frontends do NOT emit telemetry directly; they
emit via an endpoint on their own backend, which validates the user and forwards server-side.

## Caveats

- Short retention and a per-project buffer cap; history resets on maintenance — it is an
  operations/diagnosis tool, not a data lake. Long series? Persist to `relational`/`documents`.
