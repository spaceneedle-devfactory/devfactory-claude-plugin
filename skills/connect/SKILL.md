---
name: connect
description: Connect the current folder to a Dev Factory project from its connection kit link (connection.md). Sets up devfactory-df.config.json + the project key in .env and validates the services. Use when the user wants to "connect", "set up the project", "start using the dev factory", or pastes a connection.md link.
argument-hint: "[connection.md-url or project-id]"
---

# Connect to a Dev Factory project

Read the mental model first: `${CLAUDE_PLUGIN_ROOT}/skills/devfactory/SKILL.md`.

Input: `$ARGUMENTS` (the `connection.md` URL, or empty).

## Steps

1. **No URL?** The kit link comes from the **admin** who provisioned the project (it ends in
   `.../apis/projects/{id}/connection.md`). If the user only has the project id and host, build
   it: `{host}/apis/projects/{id}/connection.md`. No project at all → run the
   `/devfactory:new-project` flow (an admin request).
2. **Fetch the kit** (public, no token): `curl -s <url>`. Network failure → the user must be on
   the Dev Factory network/VPN; stop and explain.
3. **Extract the config bundle** (the kit's "Config bundle" JSON block) and write it as
   `devfactory-df.config.json` at the root of the current folder. Also save the whole kit as a local
   `connection.md` (offline reference). The kit's resource and repository lists are the
   **contract of what the dev can use** — summarize them for the user.
4. **Project key:** check `.env`. No `DEVFACTORY_PROJECT_KEY`:
   - ensure `.env` is in `.gitignore` (create/append BEFORE writing the key);
   - the key is issued by the **admin** — if the user does not have one, draft the "Project key"
     request (`references/admin-requests.md`) and wait;
   - when the user pastes the `pk_...`, write `DEVFACTORY_PROJECT_KEY=pk_...` into `.env`. Never echo
     the key back or store it elsewhere.
5. **Validate:** `node "${CLAUDE_PLUGIN_ROOT}/scripts/devfactory-smoke.mjs"`. Interpret with
   `references/troubleshooting.md` (e.g. `ai_disabled` = an admin request, not your bug).
6. **Report** in plain language: project, environment, service→ok/pending table, the
   repositories available in the kit, and what needs an admin request to unblock. Offer next
   steps: `/devfactory:data`, `/devfactory:new-app`, `/devfactory:status`.

## Rules

- Never commit `.env` or print the key.
- If an `devfactory-df.config.json` for ANOTHER project already exists in the folder, confirm before
  overwriting.
- After the admin provisions something new, re-fetch the kit to refresh the local config.
