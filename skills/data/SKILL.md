---
name: data
description: Work with the project's data on the Dev Factory - create, query, update records (documents), tables and SQL reports (relational), key lookups (tables), file storage (files), secrets, queue and e-mail (messages). Use when the user wants to "store/query/import/export data", "upload a file", "build a report", "send e-mail", "create a queue".
argument-hint: "[what-to-do-with-the-data]"
---

# Project data

Full per-service contract in
`${CLAUDE_PLUGIN_ROOT}/skills/devfactory/references/data-plane.md` — read it before calling.
Tooling: `node "${CLAUDE_PLUGIN_ROOT}/scripts/devfactory-call.mjs" ...` (never hand-craft curl).

## Translate the request into a service

| User request | Service |
| --- | --- |
| store/query records with varying fields | `documents` |
| structured table, report, cross-referencing, sum/average | `relational` |
| instant lookup by code/key, counter, live state | `tables` |
| upload/download a file, photo, PDF, spreadsheet | `files` |
| password/token/sensitive config | `secrets` |
| "process later", batches, robots | `queue` (+ worker) |
| send e-mail | `messages` |

## How to act

1. Connection active (config + key; otherwise the `/devfactory:connect` flow).
2. Model with clear names (collection `customers`, table `invoices`) and `snake_case` fields.
3. Execute with devfactory-call and SHOW the evidence (status + created record/count).
4. Business questions ("how many X per Y?"): prefer `relational` (`sql:query` with
   JOIN/GROUP BY) or `documents/{col}:query` (aggregation). Present results as a readable table.
5. Imports (a CSV/spreadsheet from the user): parse locally, insert in parameterized batches,
   report inserted vs rejected with reasons.
6. Close every write with a **read-back via API** (GET by id, filtered list, COUNT) — that is
   the user's proof; there is no panel access on the dev side.

## Guard-rails

- `DELETE`, `queue:purge` and mass overwrites: list what will be affected and confirm first.
- `messages:send` fires a REAL e-mail — confirm the recipient; sandbox only delivers to
  verified addresses.
- Secrets: never print a `value` back into the chat; confirm only that it was written/read.
- Wrote something just to test? Delete it afterwards and say so.
