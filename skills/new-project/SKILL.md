---
name: new-project
description: Request a new Dev Factory project from the platform admin and leave the local folder connected once it is delivered. Use when the user wants to "create a project", "start a new system on the dev factory".
argument-hint: "[project-name]"
---

# New project (admin request)

Creating projects is admin-only, done in the Console at `{apiBaseUrl minus /apis}/console/`
(projects screen). Your role: shape the request, then connect and validate when it is delivered.

1. **Name it with the user**: a short kebab-case slug (e.g. `fleet-management`). Explain it
   becomes the project's permanent id (URLs, repos).
2. **Draft the request** using the "New project" template in
   `${CLAUDE_PLUGIN_ROOT}/skills/devfactory/references/admin-requests.md`, filled with the
   real name and a one-line description. The admin returns the `connection.md` link and issues a
   project key.
3. **When the user pastes the kit link**, run the **/devfactory:connect** flow (config + key in .env +
   smoke).
4. Explain what they got, one line per service (documents = record store, relational =
   tables/reports, files = file storage, tables = fast key lookups, secrets = vault, queue =
   task queue, messages = e-mail, ai = artificial intelligence) and ask what they want to build
   first — then continue with `/devfactory:new-app` or `/devfactory:data`.
