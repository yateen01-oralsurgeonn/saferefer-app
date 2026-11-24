# SafeRefer

**Referral letters and case briefs without sending the client's identity to the cloud.** A dentist, a chartered accountant or an advocate types a note. The browser hides the names, phone numbers, IDs and dates on the user's own computer. Only the hidden text goes to the cloud AI, which writes the letter. The browser puts the names back.

> **Hackathon prototype for #BuildHybridAI 2026. Synthetic data only.** Do not type real patient or client data into it. It gives no medical, tax or legal advice, and it makes no compliance claim (no DPDP, HIPAA, ICAI or Bar Council claim). The free Gemini Developer API is used, where Google may keep prompts.

## Judge quickstart (about 60 seconds)

Open https://saferefer-d5175.web.app in **desktop Chrome**. Everything below uses a made-up note; do not type a real one.

1. **Pick a profession** (top left: Dentist, Chartered Accountant, Advocate). Paste this note into the left box:
   `Patient: Meghnad Sathaye, 52 years. Phone: 00000 61234. Seen on 14/11/2026. His wife Vasanti Sathaye came with him. Referred for endodontic retreatment of tooth 46: dull ache on biting for two weeks, root filling done elsewhere. Tender to percussion. Please evaluate and manage.`
2. **Look at the right panel, "What the cloud will see".** With Gemini Nano the phone, date, name and wife's name all become labels such as `[PHONE]` and `[RELATIVE_1]`. Tooth 46 and the clinical words stay.
3. **No Gemini Nano in your browser** (most browsers): the code rules still hide the phone, date and IDs, and the app says "The on-device model is not available. Hide every name by hand, then tick the box." Select a name in the right panel, press **Hide selected words**, tick the box. That is the designed fallback, not a bug, and in this mode nothing about the note is ever sent to a model for redaction.
4. **Approve**, then **Send.** The letter comes back from the cloud model with the names put back. Under the letter, open **"What was sent to the cloud"**: it shows the exact hidden text that left the browser, its size in bytes and its SHA-256. No name should be in it.
5. **Try breaking it.** Edit the left note after approving (the approval cancels), hide a word by hand and press **Remember** (My terms), turn Wi-Fi off and press Send (the letter queues and sends itself when you are back online).

What to expect honestly: on notes written in a realistic style the redactor leaves a share of identifiers (see the results tables below). The user's check before Approve is the real control.

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

**My terms (this device only).** When the user hides a word by hand, the app can offer to remember it as a place, a lab or organisation, or an ID format ("OP" hides OP-12, op 4471, op/9). Next time the code redactor hides it before the model runs. Never a person's name; stored in plain text in this browser, with Delete and Forget all; never sent anywhere.

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

- Live app: https://saferefer-d5175.web.app · Video: https://youtu.be/cta1eScR0R4
- Use **Chrome 139 or newer on a computer.** For automatic name hiding the on-device model must be present: if `await LanguageModel.availability()` in the console does not say `available`, enable `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input`, restart, and give Chrome a few minutes to download the model once.
- Without Nano (a phone, Edge, Firefox): **manual mode.** You select the words to hide, tick a box, then approve. The app says so in plain words. The tooth list falls back to the cloud, with the hidden text only.
- Use only the example notes in `data/` or your own made-up notes.

## Run it yourself

```bash
git clone https://github.com/yateen01-oralsurgeonn/saferefer-app.git && cd saferefer-app/app
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
The leak-test page runs the notes through the same redaction path as the app and shows "Identifiers leaked: X of Y" and, on the tuning sets, every miss. On the locked and hand sets only the totals are shown, so nobody can tune on them. It is only in the development build.

## Leak-test results (full tables, dates and caveats: [LEAK-RESULTS.md](LEAK-RESULTS.md))

Measured on a real Chrome with Gemini Nano on 20 Nov 2026. "Fresh" notes were written with an AI assistant and checked by Dr. Yatin, after the rules were built.

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

### Locked and realistic-style sets (21 Nov 2026, code + Gemini Nano, his Chrome)
| Set | Notes | Identifiers left |
|---|---|---|
| Dentist, **locked**, generated | 100 | 7 of 412 (1.7%) |
| CA, locked, generated | 100 | 10 to 16 of 536 (1.9% to 3.0%, two runs) |
| Advocate, locked, generated | 100 | 16 of 558 (2.9%) |
| Dentist, written with an AI assistant, batch 1 | 10 | 7 of 34 (20.6%) |
| Dentist, written with an AI assistant, batch 2 | 10 | 10 of 33 (30.3%) |
| CA, written with an AI assistant | 10 | 7 of 33 (21.2%) |
| Advocate, written with an AI assistant | 10 | 15 of 32 (46.9%) |

- The locked sets come from the same generator that tuned the rules, so they flatter the code. The four small sets were written with an AI assistant in a more realistic style (nicknames, Marathi and Hindi words in Roman script, landmark addresses), sealed in git before any run and never used to change a rule. **Our 3% target is met on the generated sets and not met on any realistic-style set.** The advocate set is the weakest: every address, record id and relative was left.
- These notes are not real notes and were not written by a dentist, CA or advocate working from real cases. A test with real, anonymised notes from working professionals has not been done.
- A background App Check token call can land during a run and trip the request counter; the page now counts it apart. The model itself made 0 requests in every run.

## Limitations (please read)

- **The redactor misses things.** The dentist's check before Approve is the real control, not the model. Weak spots we know: a street address typed all in lower case, a nickname with no clue around it, a name glued into a longer word (the send guard stops it, the redactor does not hide it, and the user hides it by hand).
- **Without Gemini Nano (manual mode) the user's tick is the only control for names.** The code rules still hide phones, emails, IDs, dates and addresses, and the app underlines words that look like names, but an underline is advice, not a block: a user who ticks "I hid every name by hand" without hiding a name will send it. The "What was sent to the cloud" receipt under the letter shows exactly what left the browser, so the mistake is visible afterwards, not prevented. We chose not to add a second blocking tick for underlined words in this version.
- **"My terms" learns per device, not across users, and only places, labs and ID formats** (never names). Anyone using the same browser profile can see the list in the panel.
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
