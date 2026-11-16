# DOCS-CHECK: is PLAN.md possible today? (checked 16 Nov 2026)

**Verdict: yes.** Every piece PLAN.md needs exists in the current Firebase AI Logic web docs.
Three things could not be confirmed from docs and must be tested in T1 (see "Not verified").

## 1. SDK, modes, cloud model
```js
import { initializeApp } from "firebase/app";
import { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode } from "firebase/ai";
const ai = getAI(app, { backend: new GoogleAIBackend(), useLimitedUseAppCheckTokens: true });
const model = getGenerativeModel(ai, {
  mode: InferenceMode.PREFER_ON_DEVICE,
  inCloudParams: { model: "gemini-3.5-flash-lite" },
});
```
- `firebase` npm package **v13.0.0 or higher** (hybrid needs 12.5.0, limited-use App Check tokens 12.14.0, current default model 13.0.0).
- Modes: `ONLY_ON_DEVICE`, `ONLY_IN_CLOUD`, `PREFER_ON_DEVICE`, `PREFER_IN_CLOUD`.
- Cloud model: `gemini-3.5-flash-lite` (the default; stable; no billing needed). `gemini-3.8-flash` is the stronger no-billing option if letters read poorly. Always name the model explicitly.
- Which model answered: `result.response.inferenceSource` is `ON_DEVICE` or `IN_CLOUD`.
- App Check: web production provider is **reCAPTCHA Enterprise** only. Local: `self.FIREBASE_APPCHECK_DEBUG_TOKEN = true` before App Check starts, then register the printed token in the console. Enforcement is mandatory for AI Logic since 2 Nov 2026.

## 2. Chrome and Gemini Nano
- Chrome desktop 139 or higher (Firebase docs). Chrome's own docs list the Prompt API as stable for web pages from Chrome 148.
- Flag (Firebase docs): `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input` = Enabled, restart.
- Hardware (Chrome docs): Windows 10/11, macOS 13+, Linux or Chromebook Plus; 22 GB free on the Chrome profile drive; GPU with more than 4 GB VRAM, **or** 16 GB RAM and 4 CPU cores.
- Model languages: en, ja, es, de, fr. English-only plan is fine.
- What the page can detect: `await LanguageModel.availability()` returns `available`, `downloadable`, `downloading` or `unavailable`. `ONLY_ON_DEVICE` throws if Nano is not available. While the model is downloading, the request waits instead of failing.
- Start the download with `model.initializeDeviceModel(...)` after a user click, before the first prompt.

## 3. The three modes in PLAN.md section 2: all exist as described

| PLAN.md | Use | Behaviour |
|---|---|---|
| on-device only (redaction) | `ONLY_ON_DEVICE` | throws without Nano; never calls cloud. Matches the privacy lock. |
| cloud only (letter) | `ONLY_IN_CLOUD` | throws when offline; app must catch and queue. |
| prefer on-device (tooth lines) | `PREFER_ON_DEVICE` | falls back to cloud when Nano is missing. |

On-device limits: single-turn text only (no chat), about 9,216 tokens, no function calling, no token counting. Notes are short, so this fits.

## 4. On-device structured output
Supported. JSON schema goes in two places in one `getGenerativeModel` call:
- on-device: `onDeviceParams.promptOptions.responseConstraint` (plain JSON schema or `Schema` helper)
- cloud: `inCloudParams.generationConfig.responseMimeType = "application/json"` and `.responseSchema`

## 5. Corrections (applied; line numbers are from before the edits)
- PLAN.md line 31 -> name the exact modes: `ONLY_ON_DEVICE`, `ONLY_IN_CLOUD`, `PREFER_ON_DEVICE`.
- PLAN.md line 32 -> "reCAPTCHA" becomes "reCAPTCHA Enterprise"; add enforcement and limited-use tokens.
- PLAN.md line 38 -> add `firebase` v13.0.0+ and cloud model `gemini-3.5-flash-lite`.
- NEXT.md line 7 -> add Chrome 139+, the flag, hardware needs, and the `LanguageModel.availability()` check.
- NEXT.md line 16 -> Sonnet also reads DOCS-CHECK.md.
- NEXT.md line 27 -> App Check step: reCAPTCHA Enterprise, enforcement on, debug token.
- NEXT.md lines 31-32 -> badge reads `result.response.inferenceSource`; name `PREFER_ON_DEVICE`.
- NEXT.md lines 36-37 -> docs give no "Nano off" switch; turn the flag off and restart, then confirm `unavailable`.

## Not verified (test in T1)
1. **Does this laptop meet the hardware needs?** If `availability()` says `unavailable`, the idea cannot be demoed on it.
2. **Free-plan limits.** Gemini Developer API works on the Spark plan with no card. Per-model numbers for `gemini-3.5-flash-lite` are not in the docs; view them at aistudio.google.com/rate-limit. Firebase adds 100 requests/minute per user.
3. **Offline tooth lines (step 6).** Docs do not say whether an on-device call still needs an App Check token from the network. Also unknown: whether reCAPTCHA Enterprise works without a billing account, and whether turning the flag off really disables Nano on Chrome 148+.

Sources: firebase.google.com/docs/ai-logic/hybrid/web/get-started, /configuration-options, /generate-structured-output; /docs/ai-logic/app-check, /models, /pricing, /quotas; developer.chrome.com/docs/ai/prompt-api
