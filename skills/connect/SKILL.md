---
name: connect
description: Connect the current folder to a Dev Factory project from its connection kit link (connection.md). Sets up devfactory-df.config.json + the project key in .env and validates the services. Use when the user wants to "connect", "set up the project", "start using the dev factory", or pastes a connection.md link.
argument-hint: "[connection.md-url, local kit file, or project-id]"
---

# Connect to a Dev Factory project

Read the mental model first: `${CLAUDE_PLUGIN_ROOT}/skills/devfactory/SKILL.md`.

Input: `$ARGUMENTS` (the `connection.md` URL, a local kit file path, or empty).

On an internet-facing host (e.g. `https://preview.devfactory.spaceneedle.tech`) the control plane
requires a signed-in Console session — the kit endpoint is **not public**. The only thing a
developer's machine has is the **project key**, so the key comes first, before the kit fetch.

## Steps

1. **No link or file?** Ask the user for one: either the kit **link** from the admin (ends in
   `.../apis/projects/{id}/connection.md`) or a downloaded kit **file** (e.g. `connection.md`
   saved from the Console). If the user only has the project id and host, build the link:
   `{host}/apis/projects/{id}/connection.md`. No project at all → run the
   `/devfactory:new-project` flow (an admin request).
2. **Project key:** check `.env` for `DEVFACTORY_PROJECT_KEY`. Already there → skip to step 4.
   Otherwise ask the user for it: it is minted in **Console → Connect → Project API keys**
   (`"Project API keys"` on the project's Connect screen), by anyone with Console access to the
   project — not only the admin.
3. **Store it safely, before fetching anything:**
   - ensure `.env` is in `.gitignore` (create/append BEFORE writing the key);
   - write `DEVFACTORY_PROJECT_KEY=pk_...` into `.env`. Never echo the key back, never print it,
     and never put it directly on a command line (shell history / logs) — read it from the
     environment (`-H "x-project-key: $DEVFACTORY_PROJECT_KEY"`) or from a header file
     (`curl -H @headers.txt`), not `-H "x-project-key: pk_..."` typed literally.
4. **Fetch the kit** — a local file is just read; a link is fetched **with the key**:
   `curl -s -H "x-project-key: $DEVFACTORY_PROJECT_KEY" <url>`. Interpret the result:
   - **200** → proceed.
   - **401** → one of three causes: no key was sent (check step 3 actually ran), the key is
     wrong/mistyped, or it belongs to **another** project (a key only unlocks its own project's
     kit). Ask the user to re-check the key on the Connect screen (right project!) and retry;
     never guess a key.
   - network failure → the user must be on the Dev Factory network/VPN; stop and explain.
5. **Extract the config bundle** (the kit's "## 8. Config bundle" JSON block) and write it
   **verbatim** as `devfactory-df.config.json` at the root of the current folder — do not add,
   rename or drop fields. Also save the whole kit as a local `connection.md` (offline reference).
   The kit's resource and repository lists are the **contract of what the dev can use** —
   summarize them for the user.
6. **Validate:** `node "${CLAUDE_PLUGIN_ROOT}/scripts/devfactory-smoke.mjs"`. Interpret with
   `references/troubleshooting.md` (e.g. `ai_disabled` = an admin request, not your bug; a bare
   `401` on a published host = missing/invalid project key, see step 4).
7. **Report** in plain language: project, environment, service→ok/pending table, the
   repositories available in the kit, and what needs an admin request to unblock. Offer next
   steps: `/devfactory:data`, `/devfactory:new-app`, `/devfactory:status`.

## Rules

- Never commit `.env` or print the key — not even partially, not in a curl command, not in a log.
- If an `devfactory-df.config.json` for ANOTHER project already exists in the folder, confirm before
  overwriting.
- After something new is provisioned, re-fetch the kit (with the key) to refresh the local config.
