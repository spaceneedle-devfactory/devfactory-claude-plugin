# Data plane — service-by-service contract

Base: `{dataPlaneBaseUrl}` from `devfactory-df.config.json` (already carries `/v1/projects/{p}/environments/{e}`).
Every call: `x-project-key` header. Use `devfactory-call.mjs` (base `dataplane` is the default).

Envelopes: item `{"data":{...}}` · list `{"data":[...],"pagination":{"has_more","next_cursor","total_count"}}` ·
error `problem+json` `{type,title,status,detail}`. Pagination is a placeholder on most services
(`has_more=false` always) — paginate with `$top`/`$skip`. Your payload is stored/returned
**verbatim** (you choose the key casing; prefer `snake_case` to match the platform).

## documents (document store — MongoDB/DocumentDB)

For flexible business data (registrations, orders, records with varying fields).

| Operation | Call |
|---|---|
| Create | `POST documents/{collection}` body = the document (id generated if absent; custom `id` accepted) |
| Read | `GET documents/{collection}/{id}` |
| List/filter | `GET documents/{collection}?$filter=...&$orderby=...&$top=50&$skip=0&$select=a,b` |
| Partial update | `PATCH documents/{collection}/{id}` body = only the fields to change (shallow merge) |
| Replace | `PUT documents/{collection}/{id}` body = whole document |
| Delete | `DELETE documents/{collection}/{id}` → 204 |
| Raw aggregation | `POST documents/{collection}:query` body = Mongo stage array (`[{"$match":...},{"$group":...}]`) |
| By label | `GET documents/{collection}/{label}:by-label` |
| Discover collections | `GET documents/` (root) |

OData in `$filter`: `eq ne gt gte lt lte`, `and or`, `contains/startswith/endswith`
(accent-insensitive), `includes` for arrays. `$expand=field on other._id as alias` joins.
E.g. `$filter=status eq 'open' and value gt 100`. URL-encode the querystring (`%20`, `%27`).

## relational (SQL — SQL Server, isolated database per project)

For tabular data, joins and reports. Dialect: **T-SQL**.

| Operation | Call |
|---|---|
| SELECT (rows) | `POST relational/sql:query` body `{"sql":"SELECT ... WHERE x=@p","params":{"p":1}}` |
| Single value | `POST relational/sql:scalar` body `{"sql":"SELECT COUNT(*) FROM t"}` → `{"data":{"value":N}}` |
| DDL/INSERT/UPDATE/DELETE | `POST relational/sql:nonquery` → `{"data":{"rows_affected":N}}` |
| CRUD by table | `GET/POST/PUT/PATCH/DELETE relational/{table}[/{id}]` (`id` column is the key) |
| List tables | `GET relational/` |

Rules: **always parameterize** (`@name` + `params`) — never interpolate values into SQL. T-SQL has
**no** `CREATE TABLE IF NOT EXISTS`: use `IF OBJECT_ID('dbo.table','U') IS NULL CREATE TABLE ...`.
SQL errors come back as **400 with the database message** (not 500). List: `?top=` (≤200, default 50).

## tables (fast key-value — DynamoDB)

For lookups by id, counters, live state, idempotency keys. **No custom verbs, no $filter**
(only `$top` works) — model for access by `{id}`.

| Operation | Call |
|---|---|
| Write (upsert by id) | `POST tables/{collection}` body `{"id":"...", ...}` (no id → generates `row_...`) |
| Read | `GET tables/{collection}/{id}` |
| Partial update | `PATCH tables/{collection}/{id}` |
| List | `GET tables/{collection}?$top=50` |
| Delete | `DELETE tables/{collection}/{id}` |

⚠️ `{id}` only with `[a-z0-9-_.]` — `:` and `/` break the route. Sanitize keys derived from text:
`text.toLowerCase().replace(/[^a-z0-9]+/g,'-')`.

## files (file storage — S3 via presigned URLs)

The service **never carries bytes** — it issues signed URLs; upload/download goes straight to S3.

| Operation | Call |
|---|---|
| Upload URL | `GET files/{folder}/{path/file.ext}:upload-url` → `data.uri` (PUT, expires in 10min) |
| Upload | `PUT {data.uri}` with the binary body and the right `content-type` (outside devfactory-call; use curl/fetch) |
| Download URL | `GET files/{folder}/{file}:download-url` → `data.uri` (GET, expires in 60min) |
| Exists? | `GET files/{folder}/{file}:exists` → `{"data":true|false}` |
| Metadata/list | `GET files/{folder}` · `GET files/{folder}/{file}` |
| Delete | `DELETE files/{folder}/{file}` |

The `{id}` (file name) **may contain `/`** (subfolders) — encode each segment, keep the slashes.

## secrets (secrets and sensitive config — Secrets Manager)

For third-party API keys, tokens, config that must not live in code. Good pattern: dynamic app
config (e.g. a notification recipient) lives here and the app reads it at boot.

| Operation | Call |
|---|---|
| Create | `POST secrets/{group}` body `{"id":"name","value":"...", ...}` |
| Read (with value) | `GET secrets/{group}/{id}` |
| List (NO values) | `GET secrets/{group}` |
| Replace/merge | `PUT` / `PATCH secrets/{group}/{id}` |
| Rotate | `POST secrets/{group}/{id}:rotate` (generates a new token, or `{"value":"..."}`) |
| Delete | `DELETE secrets/{group}/{id}` (immediate, no recovery) |

⚠️ The deploy bootstrap trio (`DEVFACTORY_DATA_PLANE_URL`/`DEVFACTORY_HOST_HEADER`/`DEVFACTORY_PROJECT_KEY`)
**cannot** come from secrets — it is what enables reaching secrets (a cycle). It lives in the
deploy env (the platform injects it — see apps-and-deploy.md).

## queue (queue — SQS, verb-only)

For asynchronous processing. A producer sends, a consumer (worker) receives and acknowledges.
**At-least-once** semantics: a received-but-unacked message REAPPEARS — consumers must be
idempotent (dedup by key in `tables`).

| Operation | Call |
|---|---|
| Enqueue | `POST queue/{name}:send` body = free payload → `{"data":{"message_id","status":"queued"}}` |
| Receive | `POST queue/{name}:receive` body `{"max":10}` (1–10) → `{"data":[{message_id,receipt_handle,body}]}` |
| Acknowledge | `POST queue/{name}:ack` body `{"receipt_handle":"..."}` |
| Purge | `POST queue/{name}:purge` (DESTRUCTIVE; SQS limits to 1×/60s) — only with user confirmation |

⚠️ The **first** `:send` on a brand-new queue may 500 once (lazy creation + propagation);
retry once before diagnosing. CRUD without a verb → 405.

## messages (e-mail — SES, verb-only)

| Operation | Call |
|---|---|
| Send | `POST messages/email:send` body `{"to":"a@b.com","subject":"...","body":"text"}` (or `"html":"<b>..</b>"`) |

⚠️ Sends a **real** e-mail. Under SES sandbox only verified recipients/domains receive —
an unverified recipient returns **500** (`Email address is not verified`); the fix is the
platform team verifying the address or enabling production. Confirm the recipient with the user
before any test send.

## Verifying data (no panel access)

The dev has no Console/Data Explorer — every verification is by API: read back what you wrote
(`GET` by id, a filtered list, a `COUNT(*)` scalar) and show the result. Whenever you
create/change data, close with that read-back as the evidence. If a human really needs a visual
check, that is a "Panel check" admin request (admin-requests.md).
