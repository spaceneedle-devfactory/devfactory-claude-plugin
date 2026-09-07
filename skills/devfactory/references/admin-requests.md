# Admin requests — everything the dev cannot do, and how to ask for it

Developers using this plugin have **limited Console access: the Releases screen, for dev and qa
only** (publish/promote/rollback there is the dev's own click — see apps-and-deploy.md). Every
other Entra-gated action belongs to a **platform admin**. When you hit one of these gates, draft
the request below (fill the placeholders with real values), hand it to the user to send to their
admin, and pause that work stream until the admin delivers. Never block the whole session — keep
working on what the kit already provides.

## What only the admin can do

| Action | You receive back |
| --- | --- |
| Create a project | the `connection.md` kit link |
| Issue/revoke a project key | the `pk_...` (delivered once, out-of-band) |
| Create an application (repo + ACR + CI) | the repository URL |
| Provision extra resources (dedicated s3/dynamodb/etc.) | updated kit (`connection.md`) |
| **Prod** release (publish / promote / rollback) | the app live on the prod URL |
| Set/change deploy environment variables and secrets | confirmation |
| Enable AI / adjust allowed models | `ai` calls stop returning 403 |
| Read Observability, Data Explorer, Usage panels | screenshots/answers, when needed |
| Manage members | access for colleagues |

(dev/qa releases are NOT here — the dev does those on the Releases screen.)

## Request templates (fill and hand to the user)

**New project**

```text
[DevFactory request] New project
Name (slug): {kebab-case-name}
Description: {one line}
Deliver back: the connection.md link and a project key for the dev team.
```

**Project key (new or rotation)**

```text
[DevFactory request] Project key for "{projectId}"
Reason: {first key | rotation | previous key revoked}
Deliver the pk_... once, through a secure channel. It will be stored only in the dev's local .env.
```

**New application**

```text
[DevFactory request] New application in project "{projectId}"
Type: {backend|frontend|worker|service} · Stack (Console template): {frontend-vanilla|frontend-vuejs-cdn|frontend-vuejs|frontend-react|frontend-react-cdn|backend-aspnet|backend-nodejs|backend-python|service-*|worker-*} · Slug: {short-slug}
Purpose: {one line}
Deploy env vars (set at deploy): {e.g. API_BASE_URL=/{projectId}-{backend-slug} for frontends; none for defaults}
Deliver back: the repository URL.
```

**Prod release** (publish, promote or rollback — dev/qa the dev does himself)

```text
[DevFactory request] Prod release — project "{projectId}", app "{app-slug}"
Action: {publish version {semver} | promote {semver} from qa | rollback to {semver}}
Validated in qa: {yes — evidence: /api/version on the qa host responded {semver} at {time}}
Changes: {one-line summary}
Deploy env changes needed: {none | list}
```

**Enable AI**

```text
[DevFactory request] Enable AI for project "{projectId}"
Reason: {what the AI will do}
Models needed: {default allow-list is fine | list specific model ids}
```

**Extra resource**

```text
[DevFactory request] Provision resource in project "{projectId}"
Type: {s3|dynamodb|...} · Name: {name}
Why the shared data-plane services are not enough: {one line}
```

**Panel check** (when only a panel can answer)

```text
[DevFactory request] Panel check — project "{projectId}"
Please look at {Observability|Data Explorer|Usage} and answer: {specific question}
Context: {what the dev observed via API, with timestamps}
```

## Rules for drafting requests

- One request = one deliverable. Batch only what the admin can approve in a single gesture.
- Always include the `projectId` and, for releases, the exact `semver` — the admin should not
  have to guess anything.
- After the admin delivers, **verify by API** (smoke, `/health`, `/api/version`, a data-plane
  read) and report the evidence; never assume the action landed.
- The kit (`connection.md`) is the contract of what exists: after provisioning requests, re-fetch
  it to refresh `devfactory-df.config.json`.
