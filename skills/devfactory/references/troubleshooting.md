# Troubleshooting — symptom → cause → action

First step for ANY problem: `node "${CLAUDE_PLUGIN_ROOT}/scripts/devfactory-smoke.mjs"` —
isolates connectivity vs credential vs a single service vs your call.

Action owners: **[DEV]** = you/Claude fix it here · **[ADMIN]** = draft the matching request from
admin-requests.md · **[PLATFORM]** = assemble the evidence and the user forwards it to the Dev
Factory team (via the admin).

## Data-plane HTTP errors

| Status · `title` | Cause | Action |
| --- | --- | --- |
| network/timeout (status 0) | outside the Dev Factory network/VPN, or wrong host | [DEV] confirm network; compare `dataPlaneBaseUrl` in the config vs the current kit |
| 401 `missing_key` | `x-project-key` header missing | [DEV] use devfactory-call (always sends it); check `.env` |
| 401 `invalid_key` | wrong/revoked key | [ADMIN] request a new project key; update `.env` |
| 403 `project_mismatch` | path points to a project ≠ the key's | [DEV] regenerate `devfactory-df.config.json` from the right project's kit |
| 403 `environment_not_allowed` / `service_not_allowed` | key restricted by env/service | [ADMIN] request a key without the restriction (or with the right scope) |
| 403 `ai_disabled` | AI not enabled on the project | [ADMIN] "Enable AI" request |
| 403 `model_not_allowed` | model outside the allow-list | [DEV] switch models, or [ADMIN] request the model |
| 404 on a route that "should exist" | grammar mistake | [DEV] check: service segment present? verb prefixed with `:`? stray `:` or `/` in the id? |
| 400 with a SQL message | T-SQL error | [DEV] read `detail` (the database message); remember: no `IF NOT EXISTS`, use `IF OBJECT_ID(...)` |
| 400 "does not support verb" | nonexistent custom verb | [DEV] see the service table in data-plane.md |
| 405 | CRUD on a verb-only service (queue/messages) | [DEV] use the `:send`/`:receive`/... verbs |
| 500 on the 1st `queue:send` of a new queue | lazy queue creation | [DEV] retry once after ~5s; persisting → [PLATFORM] |
| 500 on `messages:send` | unverified recipient (SES sandbox) | [ADMIN/PLATFORM] verify the recipient or enable production sending |
| persistent 500 on one service | platform backend/permission | [PLATFORM] record service+operation+timestamp+detail |

## Published app misbehaving

| Symptom | Likely cause | Action |
| --- | --- | --- |
| Frontend loads but every data call 404s | `API_BASE_URL` env missing (template default is legacy) | [ADMIN] request setting `API_BASE_URL=/{project}-{backend}` on the frontend deploy |
| Published frontend does not open (dead route) | react template nginx on :80 vs platform on :8080 | [DEV] fix `listen 8080`+`EXPOSE 8080`, new version, republish on the Releases screen (dev/qa) |
| Backend live but cannot reach the data plane | data-plane envs missing (`DEVFACTORY_DATA_PLANE_URL`/`DEVFACTORY_HOST_HEADER`/`DEVFACTORY_PROJECT_KEY`) | the platform injects them on current deploys — [ADMIN] verify/fix the deploy envs (older deploys may predate auto-injection) |
| Published but runs old code | `version.json` not bumped (CI no-op) | [DEV] bump + push; confirm the new tag on the repo; republish on the Releases screen (dev/qa; prod → [ADMIN]) |
| CI green but no version to publish | did the build notify the platform? | [DEV] check the repo's Actions log; pipeline fine but the Releases screen lists no version → [PLATFORM] |
| `/health` 200 but the app breaks under the public URL | app not mounted under `BASE_PATH` | [DEV] scaffolds mount root + BASE_PATH — restore that wiring |

## Method

1. Reproduce with the SMALLEST possible call (devfactory-call) and capture status+body.
2. Classify: local config (.env/config.json) → credential → grammar → service → deploy → platform.
3. Fix the cause, not the symptom; re-run the same call and show before/after.
4. [ADMIN] gates: draft the request, keep working on everything else meanwhile.
5. [PLATFORM] layer (persistent 500, stuck provisioning, release not moving): neither you nor the
   dev has internal access — assemble an objective report (call, response, time, project) for the
   user to forward.
