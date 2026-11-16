# SafeRefer: rules for the builder (Sonnet)

Hackathon app. A dentist's note is anonymised in Chrome, the cloud drafts a referral letter from the anonymous text, the browser puts the names back. Deadline 1 Dec 2026, 3:30 AM IST.

## Privacy rules: never break these
1. Redaction never calls the cloud. It uses `ONLY_ON_DEVICE`, and the redaction module must not import the cloud model. If Nano fails, go to manual mode. Never fall back to cloud, never treat a failed run as "nothing found".
2. Only the frozen, approved anonymous string leaves the browser: cloud call, Firestore write and retry alike. Each one passes the send guard first. Any edit clears approval.
3. The token map, the original note and the restored letter live in React ref or state only. Never in localStorage, sessionStorage, Firestore, logs, error text, URLs or on `window`.
4. No `console.log` of a note, prompt or map. Errors show fixed messages. No analytics, crash or performance SDK.
5. Every model reply is untrusted: parse, validate against the schema, run the code checks. Render as text, never `dangerouslySetInnerHTML`.
6. Synthetic patients only, in the app, tests, screenshots and video. No diagnosis or advice, no patient-facing text, no DPDP or HIPAA claims.
7. Never put real patient data, API keys, service-account JSON or App Check debug tokens in the repo. Config goes in `app/.env.local` (gitignored). The debug token is set only under `import.meta.env.DEV`. If a secret was ever committed, stop and tell Dr. Yatin: it must be deleted in the console, not just in git.

## SDK and model names (DOCS-CHECK.md, checked 16 Nov 2026; live docs win)
- `firebase` npm v13.0.0 or higher. Import from `firebase/ai`: `getAI`, `getGenerativeModel`, `GoogleAIBackend`, `InferenceMode`.
- `getAI(app, { backend: new GoogleAIBackend(), useLimitedUseAppCheckTokens: true })`
- Modes: `ONLY_ON_DEVICE` (redaction), `ONLY_IN_CLOUD` (letter), `PREFER_ON_DEVICE` (tooth lines).
- Cloud model: `gemini-3.5-flash-lite`, always named in `inCloudParams.model`. Stronger option: `gemini-3.8-flash`.
- Which model answered: `result.response.inferenceSource` (`ON_DEVICE` or `IN_CLOUD`).
- JSON output: `onDeviceParams.promptOptions.responseConstraint` on-device; `inCloudParams.generationConfig.responseSchema` with `responseMimeType: "application/json"` in cloud.
- App Check: reCAPTCHA Enterprise on the hosted site, debug token locally, enforcement on. Start it before any AI call.
- Chrome desktop 139 or higher, flag `prompt-api-for-gemini-nano-multimodal-input` enabled.

## What to read for each task
- Always: `NEXT.md` (the current task and its prompt), then that task's row in `PLAN.md` section 3 and section 7 (what not to build).
- `PROMPTS.md`: T3 section 2; T4 sections 1, 2, 6; T5 section 2 (send guard); T6 sections 3, 6; T7 sections 2, 4; T9 sections 5, 6. Implement as written.
- `SECURITY.md`: every row tagged with your task number. T13 also runs its checklist.
- `ACCEPTANCE.md`: the done-check and the test you must run yourself, for your task.
- `DOCS-CHECK.md`: SDK facts and the T1 test results. `SUBMISSION.md`: T13 to T15 only. Test notes: `data/notes.json`.
- On a clash: `RULES.md` beats `PLAN.md`; `SECURITY.md` beats `PROMPTS.md`; live Firebase docs beat all of them (tell Dr. Yatin what changed).

## How to work
- One task per session. Do the task in `NEXT.md` and nothing else. No extra features.
- Run the app and check your work in the browser before you say it works. Report failed tests as failed.
- Branch per task from the newest task branch: `t<number>-<short-name>`, for example `t3-code-redactor`.
- Commit messages: short, imperative, no prefix ("Add code redactor"). Commit `package-lock.json`. Do not push or merge unless asked.
- Before each commit: `git status` shows no `.env*` file, and the diff has no real names, keys or tokens.
- When the done-check passes: commit, rewrite `NEXT.md` for the next task with its prompt, then stop.
- Write for Dr. Yatin in plain, simple English. He is a dentist, not a programmer.
