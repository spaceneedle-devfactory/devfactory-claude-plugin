# Dev Factory — Claude Code plugin

Build on the [Dev Factory](https://github.com/spaceneedle-devfactory) through Claude Code:
you receive a **connection kit** (`connection.md`) and a **project key** from your platform
admin, and work on top of the pre-provisioned resources. Your Console access is limited to the
**Releases screen (dev/qa)** — no provisioning, no AWS, no kubectl. Claude writes the code,
calls the services, validates everything by API, tells you exactly when/what to publish, and
drafts a ready-to-send **admin request** whenever something needs provisioning or approval
(new apps, prod releases, AI enablement, keys).

## Installation

```bash
claude plugin marketplace add spaceneedle-devfactory/devfactory-claude-plugin
claude plugin install devfactory@devfactory
```

(or inside Claude Code: `/plugin marketplace add spaceneedle-devfactory/devfactory-claude-plugin`
and install `devfactory` from the plugins tab.)

Requirements: being on the Dev Factory network/VPN (the platform is internal) and Node 18+.

## Getting started

First time? Follow **[GETTING-STARTED.md](GETTING-STARTED.md)** — a single step-by-step that
takes you from the kit link to a live app with data, AI and telemetry.

The short version:

1. Get from your admin: the project's **`connection.md` link** and a **project key**.
2. In Claude Code, inside a working folder: `/devfactory:connect <link>` — paste the key when asked
   (it lives only in the local `.env`, outside git).
3. Done: ask in natural language ("store these records", "build a screen to register
   occurrences", "summarize these documents with AI") or use the commands below.

Everything is auto-loaded: once a folder is connected, every new Claude session detects the
project by itself (SessionStart hook) and the skills/agents activate on demand — you never need
to remember commands; plain language is enough.

## Commands

| Command | Does |
| --- | --- |
| `/devfactory:connect [link]` | connects the folder to a project (kit + key + validation) |
| `/devfactory:status` | health of the services and published apps |
| `/devfactory:new-project [name]` | drafts the admin request for a new project |
| `/devfactory:new-app [description]` | designs the app, drafts the request, implements the delivered repo |
| `/devfactory:data [request]` | records, tables/reports, files, secrets, queue, e-mail |
| `/devfactory:ai [task]` | summarize/classify/generate with the project's AI (Bedrock) |
| `/devfactory:observability` | instrument telemetry (and dev-readable health state) |
| `/devfactory:publish [app] [env]` | version bump + CI; you publish dev/qa in Releases, prod via admin request |
| `/devfactory:diagnose [symptom]` | investigate "it doesn't work" with cause and action owner |

Agents (for long tasks): `devfactory-app-builder` (builds apps end to end) and
`devfactory-diagnostics` (read-only investigation).

## Division of roles

| Admin (Console) | You + Claude (here) |
| --- | --- |
| creates projects, applications and resources | design apps and draft the requests |
| issues the project key (once) | code, test and call the data/AI services with the key |
| **prod** releases (publish/promote/rollback) | prepare versions (bump + push + CI) and **publish dev/qa in Releases** |
| enables AI, manages members | prompt engineering, instrumentation, diagnosis |
| reads Observability/Data Explorer panels | verify everything by API and public URLs |

## Security

- The project key lives **only** in the local `.env` (gitignored) and in deploy secrets — never
  in code, browser or chat.
- The plugin performs nothing destructive (deleting data, purging queues, sending e-mail)
  without confirming with you first.

## Structure

```text
.claude-plugin/          manifest + marketplace
hooks/                   SessionStart auto-context for connected folders
skills/devfactory/       platform knowledge (auto-loaded) + references/
skills/<verb>/           the commands above
agents/                  subagents (builder and diagnostics)
scripts/                 devfactory-call.mjs (data-plane client) · devfactory-smoke.mjs (read-only health) · session-context.mjs (hook)
```
