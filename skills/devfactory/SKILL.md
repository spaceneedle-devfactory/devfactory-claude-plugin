---
name: devfactory
description: Operational knowledge of the Dev Factory platform (the org's internal BaaS). ALWAYS read this before any Dev Factory work - connecting to a project, data plane (documents, relational, tables, files, secrets, queue, messages), AI/Bedrock, observability, building applications, requesting releases, admin requests. Triggers - devfactory, dev factory, project key, connection kit, connection.md, data plane, console, /apis.
---

# Dev Factory — mental model and operating rules

The Dev Factory is a BaaS (backend-as-a-service): each **project** gets ready-to-use services
(document store, SQL, key-value tables, files, secrets, queue, e-mail, AI) reachable over HTTP
with a **project key**, plus the full **application** flow (repo → build → release → public URL).

**Division of roles in a session:** the USER is a developer working with you. YOU (Claude) write
code, call the data plane, run git and validate with real evidence. The dev has **limited
Console access: publishing/promoting/rolling back releases in dev and qa** (you dictate the
clicks on the Releases screen). Everything else Entra-gated — creating
projects/applications/resources, issuing project keys, enabling AI, **prod releases** — is done
by a **platform admin**. Your job at those gates: draft a precise, copy-paste **admin request**
(templates in [references/admin-requests.md](references/admin-requests.md)), let the user send
it, and resume when the admin delivers. Nobody on the dev side has AWS, kubectl or platform
internals.

The developer's world is the **connection kit** (`connection.md`): it lists the pre-provisioned
resources, the repositories to clone, the data-plane URLs and the config bundle. Work on top of
what the kit says exists; anything missing is an admin request, never an assumption.

**Language:** write all code, identifiers and commits in English. Talk to the user in the user's
own language (pt-BR for most Dev Factory devs), without unnecessary jargon.

## The two planes

| Plane | What | Auth | Who uses it |
| --- | --- | --- | --- |
| **Control plane** | management: projects, resources, keys, releases, AI settings, panels | Entra login (Console) | the **admin**; the **dev** only for releases in dev/qa (Releases screen) |
| **Data plane** | runtime: `documents`, `relational`, `tables`, `files`, `secrets`, `queue`, `messages` + AI gateway | header `x-project-key: pk_...` | you and the dev, via scripts/code |

Single data-plane grammar (the service segment is required at the edge):

```text
{dataPlaneBaseUrl}/{service}/{collection}[/{id}][:{verb}]
```

Exception: **AI** is not under the data-plane grammar above — it is
`{apiBaseUrl}/ai/model/{modelId}/converse` (native Bedrock proxy). Observability:
`{apiBaseUrl}/projects/{id}/observability/signals`.

## Session bootstrap

1. Look for `devfactory-df.config.json` in the working directory. Missing → run the `/devfactory:connect`
   flow (the kit link `{apiBaseUrl}/projects/{id}/connection.md` is public — the admin sends it;
   no token needed to read it).
2. Project key: `DEVFACTORY_PROJECT_KEY` in `.env` (**ensure `.env` is gitignored BEFORE writing it**).
   Missing → the user asks the **admin** for a project key (the admin issues it in the Console
   and hands it over once); paste it here and store it in `.env` only.
3. Validate with the read-only smoke: `node "${CLAUDE_PLUGIN_ROOT}/scripts/devfactory-smoke.mjs"`.

## Plugin tooling (use it — do not hand-craft curl)

- `node "${CLAUDE_PLUGIN_ROOT}/scripts/devfactory-call.mjs" <METHOD> <path> [--body '<json>'] [--base dataplane|api|ai] [--env dev]`
  — any authenticated call. `__PROJECT__` in the path (base `api`) resolves to the projectId.
- `node "${CLAUDE_PLUGIN_ROOT}/scripts/devfactory-smoke.mjs" [--json]` — per-service health, zero writes.

## Non-negotiable rules

1. **The project key NEVER reaches a browser, a repository or a log.** Frontends do not call the
   data plane directly: they call the project's backend (BFF), which injects the key server-side.
   Persist the key only in a gitignored `.env` or a deploy secret (set by the admin).
2. **No unnecessary writes.** Validate with reads; to exercise a write, create a disposable
   record and tell the user. `messages:send` sends a REAL e-mail — only with a recipient the user
   confirmed. `queue:purge` and `DELETE` are destructive: ask first.
3. **Prove with real numbers.** Every "it works" comes from an actual HTTP status/body
   (devfactory-call prints both). On failure → [references/troubleshooting.md](references/troubleshooting.md)
   and root-cause it; never retry the same call expecting a different result.
4. **Envelopes and wire format:** success `{"data": ...}` (lists carry `"pagination"`); errors are
   RFC 9457 `problem+json` (`title` = code: `missing_key`, `invalid_key`, `project_mismatch`,
   `ai_disabled`...). Wire is `snake_case`; YOUR payload (document/item) is preserved verbatim.
5. **Safe ids:** in any data-plane `{id}` use only `[a-z0-9-]` (`:` is the verb separator and `/`
   is a path segment — both break the route). Exception: `files` accepts `/` in ids (subfolders).
6. **Verify by API first.** Every verification you report comes from data-plane reads, public
   app URLs (`/health`, `/api/version`) or CI status in the git repo — independent of anyone's
   Console role. The dev's Console access is scoped to the Releases screen (dev/qa); do not
   assume other panels are visible to them.

## Reference map (read the right file before acting)

| Task | Reference |
| --- | --- |
| CRUD/queries on documents, relational, tables, files, secrets, queue, messages | [references/data-plane.md](references/data-plane.md) |
| Anything Entra-gated: what only the admin can do + ready-to-send request templates | [references/admin-requests.md](references/admin-requests.md) |
| Building applications, scaffold contracts (backend/frontend/worker), deploy envs, BASE_PATH, versioning and release requests | [references/apps-and-deploy.md](references/apps-and-deploy.md) |
| AI: converse/invoke/streaming, models, AI enablement, Knowledge Base (RAG) | [references/ai.md](references/ai.md) |
| Telemetry: emitting signals, instrumenting an app | [references/observability.md](references/observability.md) |
| Errors/odd behavior (symptom → cause → action table) | [references/troubleshooting.md](references/troubleshooting.md) |

## Standard flow for a user request

1. Translate the request into project/service terms ("store records" → documents; "report
   crossing data" → relational; "upload a file" → files; "process later" → queue+worker;
   "send e-mail" → messages; "summarize/generate text" → ai).
2. Confirm connectivity (config + key + smoke) — silently when already fine.
3. Execute it yourself with devfactory-call/code, **within what the kit provides**. Releases to
   dev/qa: dictate the Releases-screen clicks to the dev. On an admin gate (new app, prod
   release, enable AI, new key, extra resource), draft the request from admin-requests.md, hand
   it to the user and pause that thread until the admin delivers.
4. Report the outcome in plain language + evidence (status, counts, URL) — all verified by API
   or public URLs, never "check the panel".
