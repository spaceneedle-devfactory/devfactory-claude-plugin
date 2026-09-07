# Getting started — your first complete flow, step by step

Follow this once, top to bottom, and you will have gone from zero to a live application with
data, AI and telemetry. You are a **developer with limited Console access**: you can
publish/promote/rollback releases in **dev and qa** on the Releases screen — everything else
(provisioning, keys, AI, **prod**) goes through your **platform admin**, and Claude drafts every
admin request for you, ready to send. You work on top of the **connection kit**
(`connection.md`) the admin hands you.

Legend: 🧑 = you · 👷 = admin (you send the request, they deliver) · 🤖 = Claude (automatic) ·
✅ = how to verify

## 0. Prerequisites (once per machine)

1. 🧑 Be on the Dev Factory network/VPN (the platform is internal).
2. 🧑 Have Node.js 18+ installed (`node --version`).
3. 🧑 Install the plugin in Claude Code:

   `/plugin marketplace add spaceneedle-devfactory/devfactory-claude-plugin`

   then install `devfactory` from the plugins tab.
4. ✅ Typing `/devfactory:` in Claude Code autocompletes the commands.

## 1. Get your kit

You need two things from the admin (Claude drafts the request if you don't have them yet —
just run `/devfactory:new-project` for a brand-new project):

1. 👷 The **connection kit link** (ends in `connection.md`) — lists your pre-provisioned
   resources, repositories and URLs.
2. 👷 A **project key** (`pk_...`) — delivered once, through a secure channel.

## 2. Connect Claude to the project

1. 🧑 In Claude Code, inside an empty working folder, run:

   `/devfactory:connect <paste the kit link>`

2. 🤖 Claude downloads the kit, writes the local config, summarizes what the kit gives you
   (services, repositories) and asks for the project key.
3. 🧑 Paste the `pk_...` you received from the admin.
4. 🤖 Claude stores it safely (local `.env`, out of git) and runs a read-only health check on
   every service.
5. ✅ Claude shows a table with the services (documents, relational, tables, files, secrets,
   queue, messages, ai) mostly **OK**. If `ai` shows disabled, that becomes an admin request in
   step 5 — keep going.

> From now on, any new Claude session in this folder auto-detects the project — no need to
> reconnect or remember commands.

## 3. Put data in and get answers out

1. 🧑 Ask in plain language, e.g.:
   - "Store these customers: Ana (ana@x.com), Bruno (bruno@x.com)."
   - "How many customers do we have? List them."
   - "Upload this spreadsheet and import the rows as orders."
2. 🤖 Claude picks the right service, writes/queries the data and proves it by reading it back.
3. ✅ Every write comes back with its evidence (the stored record, the count) — no panel needed.

## 4. Build and ship your first application

1. 🧑 Describe what you want: "I want a page where the team registers occurrences and sees them
   in a list." Claude proposes the shape (usually a backend + a frontend).
2. 🤖 Claude checks the kit — the app repositories may already be provisioned. If not, it
   drafts a **"New application" request** per app (type, stack, slug, deploy envs).
3. 👷 Send it; the admin returns the **repository URL(s)** — paste them in the chat.
4. 🤖 Claude clones, implements, tests against your real data, pushes and waits for CI green.
5. 🧑 Claude dictates the click: Console → **Releases** → *dev* card → publish the version he
   names. (qa works the same way; **prod** is an admin request.)
6. ✅ Claude validates the public URL (`/health`, `/api/version`) and hands it to you — open it
   in the browser: your app, live.

## 5. Turn on AI

1. 🤖 If AI is disabled, Claude drafts the **"Enable AI" request**.
2. 👷 Send it; once enabled, Claude confirms with a live test call.
3. 🧑 Ask things like "Summarize today's occurrences" or "Classify new records by urgency
   automatically" — Claude runs it, and can embed the same intelligence into your app.
4. ✅ AI answers come with the model's token usage — cost is visible per call.

## 6. Telemetry (so the platform team can see your app)

1. 🧑 Ask: "Instrument the app so errors are reported."
2. 🤖 Claude adds telemetry (errors, lifecycle events, key metrics) and prepares a new version —
   you publish it on the Releases screen. For anything you need to consult yourself, Claude also
   persists app health into the data plane — readable by API anytime.
3. ✅ Signals answer `202 accepted` — delivery proven. The admin/platform team sees them in the
   Observability panel.

## 7. Day-2 routine (what you will actually use)

| You want | Say / run |
| --- | --- |
| Is everything ok? | `/devfactory:status` |
| Work with data | just ask, or `/devfactory:data ...` |
| Change the app | describe the change; Claude codes, tests and tells you when to publish |
| New version live / undo | `/devfactory:publish` (you publish dev/qa in Releases; prod via admin request) |
| Something is broken | `/devfactory:diagnose what you saw` |
| AI on your data | `/devfactory:ai your task` |
| Anything the platform must provide | Claude drafts the admin request — you just send it |

## If something fails on the way

- **Step 2 network error** → you are not on the Dev Factory network/VPN.
- **A service shows ERR** → ask `/devfactory:diagnose`; Claude isolates it and labels the fix:
  [DEV] he fixes it, [ADMIN] you send the drafted request, [PLATFORM] you forward the evidence.
- **Published app looks old** → tell Claude; the usual cause is a missing version bump, which he
  fixes before drafting a new release request.
