# SafeRefer

**Referral letters and case briefs without sending the client's identity to the cloud.** A dentist, a chartered accountant or an advocate types a note. The browser hides the names, phone numbers, IDs and dates on the user's own computer. Only the hidden text goes to the cloud AI, which writes the letter. The browser puts the names back.

> **Hackathon prototype for #BuildHybridAI 2026. Synthetic data only.** Do not type real patient or client data into it. It gives no medical, tax or legal advice, and it makes no compliance claim (no DPDP, HIPAA, ICAI or Bar Council claim). The free Gemini Developer API is used, where Google may keep prompts.

## What it does

1. **Hide.** The note is cleaned inside the browser: code rules find phones, emails, IDs, dates and addresses; Gemini Nano (Chrome's on-device model) finds names, relatives, employers and places. Everything found becomes a label such as `[PATIENT]`, `[PHONE]`, `[ID]`.
2. **Approve.** The user sees "Your note" and "What the cloud will see" side by side and approves. Any edit cancels the approval. A send guard checks the approved text once more.
3. **Write.** The cloud model writes a letter from the hidden text only. The browser puts the names back, then checks the letter against the original note and warns about any figure, date or term that was not in it.

One engine, three **profession packs** (a pack changes only words, never a safety check):

| Pack | Letter | Also hidden | Deliberately left visible |
|---|---|---|---|
| Dentist | referral to an endodontist, plus a tooth list | names, phones, emails, dates, addresses, record IDs | tooth numbers, ages, drugs |
| Chartered Accountant | case summary for a specialist CA | PAN, GSTIN, TAN, Aadhaar, bank account, IFSC, CIN, UDIN | amounts, sections, forms, assessment years |
| Advocate | brief to senior counsel | case, FIR, CNR, cheque and enrolment numbers, police stations, **settlement sums**; the other side is a separate person, never the client | Acts, sections, court names, claim amounts |

It also works offline: redaction and the tooth list run on the device; Send then **queues** the (already hidden) letter request in the browser and sends it when the connection returns.

## How Firebase AI Logic is used

Every model call goes through the Firebase AI Logic web SDK (`firebase/ai`) at runtime.

| Step | Mode | Receives |
|---|---|---|
| Hide names (free text) | `ONLY_ON_DEVICE`, behind an app-side check | the note after the code rules; **never leaves the device** |
| Tooth list (dentist) | `PREFER_ON_DEVICE` | the approved hidden text only; a badge says "On-device", "Cloud" or "Rules only" |
| Write the letter | `ONLY_IN_CLOUD` | the approved hidden text only |

- **`ONLY_ON_DEVICE` is not a lock by itself.** We tested (firebase 13.4.0): in a browser with no `window.LanguageModel`, the SDK sends an `ONLY_ON_DEVICE` call to the cloud. So the app checks that Nano is really available before every redaction call and otherwise falls back to manual mode (the user hides names by hand), with no network call. A test proves zero requests.
- **App Check** (reCAPTCHA Enterprise on the hosted site, a debug token on localhost only) protects the cloud calls.
- **Remote Config** can change the section list of each letter and the cloud model name, nothing else. Values are checked: a bad template is rejected whole, and the model name must be on an allow-list in code.
- **Not used:** Firestore, Anonymous Auth, Analytics, Crashlytics, Performance. The offline queue is in the browser only (IndexedDB), holding the approved hidden text and the profession, never a name.

```
IN THE BROWSER (works offline)                    CLOUD (Firebase AI Logic)
------------------------------                    -------------------------
typed note
 1 code rules: phones, emails, IDs, dates, places
 2 Gemini Nano: names, relatives, employers
 3 split view: user approves        names stay in memory only
 4 send guard  ---- hidden text only ----------->  5 Gemini writes the letter
 6 restore names, check against the note  <------- letter with labels
 offline: step 4 waits in a browser queue, sent when the connection returns
```

## Try it

- Live app: `[FILL live URL]` · Video: `[FILL video URL]`
- Use **Chrome 139 or newer on a computer.** For automatic name hiding the on-device model must be present: if `await LanguageModel.availability()` in the console does not say `available`, enable `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input`, restart, and give Chrome a few minutes to download the model once.
- Without Nano (a phone, Edge, Firefox): **manual mode.** You select the words to hide, tick a box, then approve. The app says so in plain words. The tooth list falls back to the cloud, with the hidden text only.
- Use only the example notes in `data/` or your own made-up notes.

## Run it yourself

```bash
git clone [FILL repo URL] && cd [FILL repo name]/app
npm install
cp .env.example .env.local      # then fill in your own Firebase values
npm run dev                     # http://localhost:5173
```

Firebase setup (your own project):
1. Create a project and turn on **AI Logic** with the **Gemini Developer API**.
2. Register a web app and copy its config into `.env.local`.
3. Turn on **App Check**. Add a debug token for localhost (`VITE_APPCHECK_DEBUG_TOKEN`, registered under App Check > Apps > Manage debug tokens) and a **reCAPTCHA Enterprise** site key for the hosted site (`VITE_RECAPTCHA_ENTERPRISE_SITE_KEY`); enforce App Check for AI Logic.
4. Optional: **Remote Config** with the four parameters in [REMOTE-CONFIG.md](REMOTE-CONFIG.md). The app works without it.
5. Restrict the web API key to your hosting domain and localhost, and set a per-user rate limit.
6. Deploy: `npm run build`, then from the repo root `firebase deploy --only hosting` (`firebase.json` sets the CSP and the cache rules).

`.env.local` is ignored by git. Nothing secret is in this repository.

## Tests and the leak test

```bash
cd app && npm test          # 552 tests pass; 13 "known gap" tests are expected to fail and are listed
npm run dev                 # then open /?leak   (dentist, 30 notes)
                            #      /?leak&pack=ca    /?leak&pack=law
                            #      add &set=fresh for the fresh notes
```
The leak-test page runs the notes through the same redaction path as the app and shows "Identifiers leaked: X of Y" with **every miss listed**. It is only in the development build.

## Leak-test results (full tables, dates and caveats: [LEAK-RESULTS.md](LEAK-RESULTS.md))

Measured on a real Chrome with Gemini Nano on 20 Nov 2026. "Fresh" notes were written by a dentist and a helper after the rules were built.

| Set | Notes | Identifiers left |
|---|---|---|
| Dentist, builder's notes | 30 | 1 of 124 (0.8%): **flattered**, the builder wrote the rules while reading these notes |
| Dentist, **fresh** notes, before two rule fixes | 10 | 8 of 46 (17.4%) |
| CA, fresh, before the fixes | 10 | 7 of 56 (12.5%) |
| Advocate, fresh, before the fixes | 10 | 11 of 69 (15.9%) |
| Dentist, fresh, after the fixes | 10 | 1 of 46 (2.2%): flattered, the fixes were written after seeing these notes |
| CA, fresh, after the fixes | 10 | 2 of 56 (3.6%): flattered |
| **Advocate, fresh, after the fixes** | 10 | **0 of 69 (0.0%)**: no rule was written for this set |

What the numbers say, and do not say:
- The builder's own notes flattered the code by a wide margin (code-only 3.2% on the builder's notes, 43.5% on fresh ones). The fresh sets are the honest ones. Two gaps showed up (dates written as "3/11" or "Monday", and the words that start an address such as "behind bus stand"); both were fixed, the same fixes were then tested on the advocate set, which had not been used to design them.
- After the fixes, the 3 identifiers left across 171 were generic words (for example "College:" after the college's name was hidden), not names, numbers or places.
- **Ten notes per profession is a small set. "0 of 69" does not mean "never leaks".** Notes were typed by one dentist and helpers, in English with Marathi and Hindi words in Roman script.

## Limitations (please read)

- **The redactor misses things.** The dentist's check before Approve is the real control, not the model. Weak spots we know: a street address typed all in lower case, a nickname with no clue around it, a name glued into a longer word (the send guard stops it, the redactor does not hide it, and the user hides it by hand).
- **Hiding names is not the same as anonymous.** A rare condition, an exact figure or a job title can still point to one person. Clinical, tax and legal details are sent to the cloud on purpose.
- **Synthetic data only.** This build uses the free Gemini Developer API, where Google may keep and review prompts. No privacy claim is made for real patients or clients.
- **Automatic hiding needs desktop Chrome 139+** with the on-device model downloaded. On phones and other browsers it is manual mode.
- **A letter queued while offline is sent only while the page is open** (it retries every 10 seconds). If the page is closed and reopened, the letter is sent with labels instead of names, because the names are never stored; the app says so.
- **Copy puts the full letter, with names, on the clipboard.** Clipboard history or sync may keep it.
- **The letter is a draft.** The model can be wrong; the professional must read it. The app gives no diagnosis, tax opinion or legal opinion and must not cite case law.
- **Reviewed by the builder only.** Written answers about the CA and advocate letters that came back were not treated as a professional review (see [REVIEW.md](REVIEW.md)).
- **Free-tier limits.** The live demo can stop working if the quota runs out.

## Security notes

- The token map, the original note and the restored letter live in memory only. Nothing is written to storage except the offline queue (hidden text + profession).
- The only text that leaves the browser is the approved hidden text, and each send passes the send guard first. No analytics or crash SDK; React's error logging is silenced; every message the user reads comes from one fixed table (`app/src/core/messages.ts`), never from an error or a note.
- A Content-Security-Policy and cache rules are in `firebase.json`. The service worker caches only the app's own files, never a POST and never a Google call.
- Threat list and tests: [SECURITY.md](SECURITY.md).

## Code layout

`app/src/core/` is plain TypeScript with no React and no Firebase import (redaction, send guard, name restore, fact check, leak scorer, packs, queue logic, messages): model calls are passed in as functions. `app/src/*Adapter.ts` are the only files that call a model; `app/src/queueStore.ts` is the only file that touches IndexedDB.

## Pre-existing code and AI help

Nothing in this repository existed before the hackathon. The author builds a separate, closed clinic-software product, Enamel, which is not part of this entry; this module is meant to be reused there later. The code was written with the help of Claude (Anthropic) through Claude Code, reviewed and tested by the author.

## Licence

Apache-2.0 (see `LICENSE`).
