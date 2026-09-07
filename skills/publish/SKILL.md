---
name: publish
description: Ship a new version of a Dev Factory application - version bump, push, CI build, then the dev publishes in dev/qa on the Releases screen (prod goes through the admin). Also promote and rollback. Use when the user wants to "publish", "put it live", "update the system", "go back to the previous version".
argument-hint: "[app] [dev|qa|prod]"
---

# Publish / promote / rollback

Model (details in `${CLAUDE_PLUGIN_ROOT}/skills/devfactory/references/apps-and-deploy.md`):
you build the version; the **dev publishes dev/qa** on the Console's Releases screen; **prod is
an admin request**.

## Ship to dev or qa

1. Confirm a clean working tree and passing local validation — only ship what was proven.
2. **Bump** `version.json` (semver: fix +patch, feature +minor). Without the bump the CI cuts no
   version — the #1 cause of "we published but nothing changed".
3. Commit + push to `main`. Watch the repo CI (Actions) until green: it validates the build,
   creates the `v{semver}` tag and notifies the platform, which builds the immutable image.
4. **Dictate the click**: Console → project → **Releases** → card of the target environment
   (*dev* or *qa*) → publish version `{semver}`. The card shows the pipeline live.
5. **Validate once published** (never declare success without this):
   `GET {env-host}/{project}-{app}/health` and `GET .../api/version` → the responded version
   must be the new one. Frontend: open the URL and check the new behavior. Report with the URL.

## Promote

Same image, no rebuild:

- **dev → qa**: the dev's own click (Releases → *qa* card → promote). Validate on the qa
  environment's host (from the connection kit).
- **qa → prod**: draft the **"Prod release" admin request**
  (`references/admin-requests.md`) — include the qa validation evidence (version + timestamp).

## Rollback

- **dev/qa**: the dev's click (Releases → environment card → rollback to the older version).
- **prod**: "Prod release" admin request with action = rollback.

Then validate `/api/version` — it must respond with the expected version. No git revert needed.

## When stuck

CI red → read the Actions log and fix (your code). CI green but the version missing on the
Releases screen, or publishing changes nothing → platform issue: assemble the evidence
(repo, tag, time) for the user to forward via the admin.
