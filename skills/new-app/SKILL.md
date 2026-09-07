---
name: new-app
description: Create an application on the Dev Factory project (backend, frontend or worker) - shapes the admin request, takes over the repository once delivered and implements it following the platform contracts. Use when the user wants to "create an app/system/screen/API/queue robot" on the dev factory.
argument-hint: "[what-the-app-does]"
---

# New application

Read `${CLAUDE_PLUGIN_ROOT}/skills/devfactory/references/apps-and-deploy.md` (contracts)
first, and have the connection active (config + key). Check the kit first — the repository may
already exist (pre-provisioned).

## 1. Design with the user (no jargon)

Translate the request into apps: a system with a screen = **frontend + backend** (2 apps; the
key lives in the backend); API/integration only = **backend**; queue processing = **worker**
(+ a backend that enqueues). One responsibility per app; short slugs (`api`, `panel`, `worker`).

## 2. Request the application(s) from the admin

Applications are created in the Console at `{apiBaseUrl minus /apis}/console/` (projects →
Applications), admin-only — draft one "New application" request per app
(`references/admin-requests.md`) with type + stack + slug + the deploy envs already known
(e.g. the frontend's `API_BASE_URL=/{project}-{backend-slug}`). Stack is one of the platform's
templates: `frontend-vanilla`, `frontend-vuejs-cdn`, `frontend-vuejs`, `frontend-react`,
`frontend-react-cdn`, `backend-aspnet`, `backend-nodejs`, `backend-python`, `service-*`,
`worker-*` (default **backend-nodejs**/**worker-nodejs** for backend/worker, **frontend-react**
for frontend, unless the user wants a different stack). The admin creates the repo (on GitHub,
org `spaceneedle-devfactory-projects`) + the ACR repository + CI wiring, and returns the
**repository URL**.

## 3. You take over the repo

1. `git clone`; read the local `docs/SCAFFOLDING.md`.
2. React frontend → fix the nginx port NOW (`listen 8080` + `EXPOSE 8080`).
3. Implement honoring the contracts: the backend is the BFF (data plane with the key
   server-side, HTTP client on native `http/https` honoring `DEVFACTORY_HOST_HEADER`); the frontend
   calls the backend via `window.__ENV__.apiBaseUrl`; the worker drains the queue with an
   idempotent consumer.
4. Ship from the first commit: `GET /api/version` (`{version, started_at}`) on the backend and
   telemetry on errors (see `references/observability.md`).
5. Test locally against the real data plane (the same key from `.env`) and show evidence
   (HTTP statuses, created data) before requesting a release.

## 4. Ship

Follow `/devfactory:publish` (bump `version.json` → push → CI green → the **dev publishes on the
Releases screen** (dev/qa) → validate the public URL; prod goes through an admin request).
