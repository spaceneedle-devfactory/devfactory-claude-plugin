---
name: ai
description: Use the project's AI (Bedrock) on the Dev Factory - summarize, classify, extract, generate text over project data, request AI enablement and embed AI into applications. Use when the user mentions "AI", "summarize", "classify automatically", "generate text", "chatbot".
argument-hint: "[ai-task]"
---

# Project AI

Gateway contract in `${CLAUDE_PLUGIN_ROOT}/skills/devfactory/references/ai.md`.

1. Connection active; test the gateway with a minimal converse via devfactory-call (`--base ai`).
2. `403 ai_disabled` → draft the "Enable AI" **admin request**
   (`references/admin-requests.md`); the user sends it. When the admin confirms, repeat the
   test and show the 200.
3. Execute the task:
   - **Ad-hoc** (summarize/classify/extract something now): build the prompt with real data
     (fetch from the data plane), call `converse` and deliver the result. Persist to
     `documents`/`files` when it should stay.
   - **Recurring** (whenever X happens, produce Y): propose embedding it in the project's
     backend/worker with a deterministic fallback — follow `/devfactory:new-app` or edit the existing
     app.
4. Model: start with `amazon.nova-lite-v1:0`; move up only if quality demands it
   (each response's `usage` block shows the token cost).
5. Prompt experimentation happens here, iterating converse calls with the user — there is no
   Playground access for devs; whatever the user approves, you fix in code.

Never put secrets or the project key inside prompts. Personal data: use the minimum necessary.
