# AI — Bedrock gateway and Knowledge Base

## Address and auth

AI lives OUTSIDE the `/v1/projects/.../environments/...` data-plane grammar: base = `{apiBaseUrl}/ai`
(devfactory-call: `--base ai`). It is a transparent Amazon Bedrock proxy — the grammar is Bedrock's
native one. Auth: `x-project-key` + `x-project-env` (devfactory-call sends both).

## Prerequisite: AI enabled on the project

Every call returns `403 ai_disabled` until the **admin** enables AI for the project — draft the
"Enable AI" request from admin-requests.md. `403 model_not_allowed` = the model is not on the
project's allow-list (also an admin request).

## Calls

**Converse (chat — the default path):**

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/devfactory-call.mjs" POST 'model/amazon.nova-lite-v1:0/converse' --base ai \
  --body '{"messages":[{"role":"user","content":[{"text":"Summarize: ..."}]}],"inferenceConfig":{"maxTokens":512,"temperature":0.3}}'
```

Response: text at `output.message.content[0].text`; usage at `usage.{inputTokens,outputTokens}`.
Multi-turn: resend the whole history in `messages` (the gateway is stateless).
System prompt: top-level `"system":[{"text":"..."}]`.

**Streaming:** same routes with the `-stream` suffix (`converse-stream`); the response is an
event-stream — for apps with chat UIs, not for script calls.

**Models** (any `modelId` enabled on the account works; Playground curation):

| Model | Use |
|---|---|
| `amazon.nova-lite-v1:0` | default — fast/cheap: classify, extract, summarize |
| `amazon.nova-micro-v1:0` | cheapest, trivial tasks |
| `amazon.nova-pro-v1:0` | higher quality |
| `anthropic.claude-3-5-sonnet-*` | long-form writing/reasoning (confirm the enabled id on the account) |

Pick the smallest model that solves the task; per-project consumption is metered by the platform
(the `usage` block in every response tells you the token cost of each call).

## Patterns that work well

- **Constrained-output classification**: ask "Answer ONLY one of: a, b, c" with `temperature: 0`
  and a small `maxTokens`; validate with a regex and keep a deterministic fallback.
- **Document generation** (summary, postmortem, e-mail): build the context from data-plane data,
  generate with `temperature ~0.3`, persist the result to `documents`/`files`.
- **Always have a fallback**: AI may be disabled or the model unavailable — the user's flow must
  not require a 200 from AI to complete.

## Knowledge Base (RAG)

When the project has a provisioned KB (created alongside AI enablement), the gateway exposes
`/kb/**` (Bedrock Agent Runtime): `POST kb/knowledgebases/{kbId}/retrieve-and-generate` answers
questions grounded in the indexed documents. KB document upload/sync are Entra-gated — an
**admin request** (what to index, from where). If `kb` returns 403/404 the project's KB may not
be active yet; treat it as unavailable and report, without breaking the flow.

## AI Playground (panel — admin only)

The Console ships a visual chat (AI Playground), but it requires Entra login — the dev does not
have it. Prompt experimentation happens right here: iterate with devfactory-call `converse` calls,
show the outputs to the user, and fix the approved prompt in code.
