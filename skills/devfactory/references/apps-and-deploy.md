# Applications and deploy — from template to public URL

## Model

**Application** = 1 typed repository (`backend`/`frontend`/`service`/`worker` × stack) + ACR
(Azure Container Registry) repository + CI wiring, created by the **admin** (see
admin-requests.md — "New application"). A project is born with only the `-docs` repo; every app
is explicit. The `{project}-iac` repo is platform-managed — nobody on the dev side touches it.
The repositories the dev can clone are listed in the **connection kit** (`connection.md`), hosted
on GitHub (org `spaceneedle-devfactory-projects` for project repos).

Build-once/deploy-many flow:

```text
you: code + bump version.json + push main
  → repo CI (GitHub Actions build.yml): validates docker build, creates tag v{semver}, notifies the platform
  → platform: builds the immutable :{semver} image in the project's Azure Container Registry (ACR) — you never touch the registry directly
dev (dev/qa) or admin (prod): publishes/promotes/rolls back in the Console → Releases
  → platform: retags the environment alias (dev=:latest, qa=:qa, prod=:prod) + rollout
```

**Shipping a version = bump `version.json` + push to `main` + publishing on the Releases
screen.** Without the bump the CI cuts no new version (tag exists → no-op). The dev publishes
**dev and qa** himself; **prod** is an admin request. Rollback = republishing an older semver
(same split: dev/qa by the dev, prod by the admin).

### Releases screen (the dev's one Console stop)

`{console-url}/projects/releases.html?id={projectId}` — one card per environment (dev/qa/prod)
showing the current version and the live CI status. Dictate to the dev:

1. Open **Releases** for the project → card of the target environment (*dev* or *qa*).
2. Publish/promote the exact version you name (`{semver}`); rollback = pick the older version.
3. The card shows the pipeline running; done → you validate `/health` + `/api/version` on the
   environment host and report.

The *prod* card is admin-gated — for prod, draft the "Prod release" request instead.

Public URL: `https://{host}/{project}-{slug}` path-routed on the front door — the environment
lives in the **host** (each of dev/qa/prod has its own), NOT in the path; a doc that appends an
env suffix to the path (`/{project}-{app}-{env}`) is stale. Never hardcode the host: read it from
the connection kit (e.g. the public preview host is `preview.devfactory.spaceneedle.tech`, but
every project/environment has its own). The prefix is **not stripped**: it reaches the container
and the app must mount itself under it (`BASE_PATH`, injected at deploy — see `DEVFACTORY_APP_URLS`
for how a frontend derives another app's path without hardcoding it).

## Contracts per app type (the scaffold ships correct — preserve it)

**backend (nodejs/aspnet/python)** — HTTP API on **port 8080**; `GET /health` → fast,
dependency-free 200; router mounted at the root AND under `BASE_PATH`; telemetry helper included.
It is the **BFF**: the only place holding the project key and talking to the data plane.

**frontend (react/vuejs/vanilla)** — static files served by nginx; runtime config via
`window.__ENV__` (`env.js` generated at container boot from envs). Vital rules:

- ⚠️ The react template ships nginx on `:80` but the platform provisions service/probe on
  `:8080` — **switch to `listen 8080` in nginx.conf and `EXPOSE 8080`** in the Dockerfile as
  soon as you take over the repo.
- ⚠️ The `apiBaseUrl` default in `env.js` is legacy and broken — the deploy env
  `API_BASE_URL=/{project}-{backend-app}` (path of the project's backend) must be set by the
  **admin**; include it in the "New application" or "Publish release" request, otherwise every
  fetch 404s.
- The SPA always calls the project's backend by host-relative path (`{apiBaseUrl}/api/...`),
  never the data plane directly (the key never reaches the browser).
- Vite: keep `base: './'` (relative) and the `<base href>` tag — the entrypoint rewrites it at boot.

**worker (nodejs/python)** — headless process draining a queue (`:receive` → process → `:ack`);
the only HTTP is `GET /health` on :8080 for probes; **no BASE_PATH/ingress**. Idempotent consumer
(dedup by a sanitized key in `tables`). Share the domain with the backend by copying the modules.

## Runtime envs (what a deployed app gets)

The platform injects automatically: `TELEMETRY_URL`, `DEVFACTORY_PROJECT_ID`, `BASE_PATH`, and the
data-plane wiring — `DEVFACTORY_DATA_PLANE_URL`, `DEVFACTORY_HOST_HEADER` and `DEVFACTORY_PROJECT_KEY` (as a
secret). Make the app verify their presence at boot and fail loud with a clear message when
missing (older deploys may predate the auto-injection — the fix is an admin request).

App-specific config still set at deploy time (goes in your **admin request**, with the exact
value):

| App | Env | Value |
| --- | --- | --- |
| frontend | `API_BASE_URL` | `/{project}-{backend-slug}` |

Dynamic business config (e-mail recipient, feature flags) does NOT need the admin: store it in
`secrets/{group}/{id}` via the data plane and read it at boot with a fallback — changes without
redeploy and without tickets.

## Checklist when taking over an app repo (URL from the admin / the kit)

1. `git clone` with your own GitHub credentials (the repo lives on GitHub, org
   `spaceneedle-devfactory-projects` — no separate git credential is issued); read the local
   `docs/SCAFFOLDING.md` (template contract).
2. React frontend? Fix the nginx port (above) in the very first commit.
3. Implement honoring the contracts: for data-plane calls use an HTTP client on native
   `http/https` honoring `DEVFACTORY_HOST_HEADER` (`fetch` drops the Host header — classic bug).
4. Run locally proving each integration with real statuses (same key from `.env`); then bump
   `version.json` + commit + push.
5. Watch the repo CI (Actions). Green → dictate the Releases-screen publish (dev/qa) to the
   dev, or draft the "Prod release" request (admin-requests.md) for prod.
6. After publishing, validate: `GET {public-url}/health` and a version endpoint — ship
   a `GET /api/version` returning `{version, started_at}` (proves which build is live).
7. Always version: never reuse a semver; images are immutable by convention.
