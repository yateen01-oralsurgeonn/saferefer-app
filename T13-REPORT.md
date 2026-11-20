# T13 REPORT: deploy readiness, secrets and PII audit (20 Nov 2026)

Branch `t13-deploy` (from `t12c-gaps`). Nothing was deployed or pushed by the builder. No secret or token value appears in this report: only file names, counts and PASS/FAIL.

## Audit results (FINISH.md section 3)

| Box | Result | Evidence |
|---|---|---|
| 3.1 files never tracked: now | **PASS** | only `app/.env.example` (names, no values) |
| 3.1 files never tracked: ever, any branch | **PASS** | same single file |
| 3.1 ignore rules | **PASS** | `app/.env.local` is ignored by `app/.gitignore:13` (`*.local`) |
| 3.2 secrets in the full history (21,144 lines) | **PASS** | 0 Firebase keys, 0 private-key blocks, 0 debug-token assignments, 0 UUID-shaped strings. The 3 hits for `"private_key"` / `client_email` are the instructions inside `FINISH.md` quoting the search patterns. `gitleaks` is not installed on this machine (not run) |
| 3.3 debug token in the built site | **PASS** | token (36 chars) not found in `dist/` |
| 3.3 web API key in the built site | present, **expected**: Firebase web keys are public by design. Must be restricted in the console (3.6) |
| 3.3 `npm audit --audit-level=high` | **PASS after a fix** | was 4 high (`@grpc/grpc-js` <= 1.13.5, pulled in by Firestore code SafeRefer never uses: 0 `grpc` strings in `dist/`, no Firestore import in `src/`). Fixed with `"overrides": {"@grpc/grpc-js": "^1.14.7"}` in `app/package.json`: now 0 vulnerabilities; 552 tests, build and lint unchanged |
| 3.4 storage APIs | **PASS** | only `app/src/queueStore.ts` (the other hit is a test asserting the service worker has none) |
| 3.4 console.*, dangerouslySetInnerHTML, `window.x =` | **PASS** | 0 hits in source |
| 3.4 analytics / crash / performance SDKs | **PASS** | 0 hits |
| 3.4 redaction importing the cloud model | **PASS** | no cloud-mode word in any redaction file (hits are in the letter and tooth adapters, the dev setup page and tests only) |
| Development pages out of the built site | **PASS** | no "Setup check", "Run the test", "Identifiers leaked", "set=fresh" or test-note text in `dist/` |
| 3.5 PII scan of files | **PASS, with notes** | every phone, email, PAN-like and Aadhaar-like hit is a placeholder: `example.com/.org/.net` emails, `ZZZZZ…`, `AAAPT…`, `ABCDE1234F`, `0000 0000 0012`, the new `0123 4567 8901` (starts 0: never a real number), `1234 5678 9012` (starts 1), and the dummy phone `98765 43210` in tests |
| 3.5 history scan | **2 DECISIONS NEEDED** | see below |
| 3.5 images and PDFs | **PASS, with a note** | only `review/CA-review-packet.pdf` and `review/LAW-review-packet.pdf`: made-up notes, each page set says everything is made up. They are text documents, not screenshots, so the banner is not "in shot" |

### Decisions needed from Dr. Yatin (3.5)
1. **Author line.** All 60 commits are authored `[real name and personal email: removed]`. That real name and personal Gmail address become public with the repo. Options: (a) accept it; (b) from now on commit with a GitHub no-reply address (`git config user.email "<id>+<username>@users.noreply.github.com"`), which does not change the 60 existing commits; (c) rewrite history (force-push, only on his word, not recommended this close to the deadline).
2. **The old Aadhaar sample** (a made-up 12-digit number starting 2345 that passes the real check digit, so it could in theory belong to someone) is still in git history (commits 8fdb69a and e5dae38, pushed to the private repo). It is no longer written in any current file (this report deliberately does not repeat it). Recommended: leave it (low risk, a made-up string) and keep the new sample. Rewriting history is the only way to remove it.

## Deploy readiness

- **`firebase.json`** (repo root): hosting `public: app/dist`; headers on every page: a Content-Security-Policy limited to `self` plus the Google endpoints the app calls (`firebasevertexai`, `firebaseappcheck` and `content-firebaseappcheck`, `firebaseinstallations`, `firebaseremoteconfig`, and reCAPTCHA on `www.google.com` / `www.gstatic.com`), `X-Content-Type-Options`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`; `no-cache` for `/sw.js` and `/index.html`; long cache for `/assets/**`. **`.firebaserc`** names the project `saferefer-d5175` (public information).
- **Tested** by serving `app/dist` with exactly those headers and opening it in a fresh browser profile: **0 CSP violations**, no CSP message in the console; the page, the service worker and the offline path work; `?leak` and `?setup` show the normal app (the development pages are not in the build); 13 POST requests went to Google hosts during a full run and **none contained the name or the phone**; the console never printed the note; hosts contacted were all in the allow-list (a `kaspersky-labs.com` request seen on this laptop is the antivirus injecting a script, not the app).
- **Nano off, hosted build, fresh profile:** with `LanguageModel` present but unavailable the app showed "The on-device model is not available…"; with `LanguageModel` undefined it showed the "Chrome 139 or newer" text; both made **0 requests** during redaction and 0 model requests ever.
- **Not testable before deploy:** the cloud call on the real hosting domain (the reCAPTCHA Enterprise key must allow the hosting domain first), App Check enforcement, console settings (3.6).

### Commands Dr. Yatin runs (PowerShell). The builder does not deploy and never asks for credentials.
```powershell
npm install -g firebase-tools          # once; the Firebase CLI is not installed on this laptop
firebase login                         # opens the browser; sign in with the account that owns saferefer-d5175
cd "C:\Users\Dr Yatin\Desktop\BuildHybridAI\app"
npm install
npm run build                          # reads app\.env.local (all six values are set); the debug token is not put in the build
cd ..
firebase deploy --only hosting         # prints the live URL, usually https://saferefer-d5175.web.app
```

### Console steps (3.6), Dr. Yatin with the builder's help
1. **reCAPTCHA Enterprise**: add `saferefer-d5175.web.app` and `saferefer-d5175.firebaseapp.com` to the allowed domains of the site key, otherwise App Check fails on the hosted site and no letter can be written.
2. **App Check**: enforce it for AI Logic (and for Remote Config if offered); delete unused debug tokens; keep the localhost one.
3. **Analytics and AI monitoring**: confirm both are off.
4. **Web API key** (Google Cloud > APIs and Services > Credentials): restrict to the hosting domains and `localhost`; set the per-user rate limit in AI Logic.
5. **Remote Config** (optional): the four parameters in `REMOTE-CONFIG.md`, publish.
6. **Hosted-site check, fresh Chrome profile**: open the live URL, run a made-up note with the Network panel open, search every request body for the name and the phone: zero hits. Then the same with Nano off.
7. Tell the builder the live URL so `README.md` and `SUBMISSION.md` can be filled.

## Documents changed in T13
`README.md` (new), `SUBMISSION.md` (rewritten for three professions, the local queue and the real numbers), `firebase.json` and `.firebaserc` (new), `app/package.json` and `app/package-lock.json` (the gRPC override), `NEXT.md` (T14), this report.

## Open items for the deadline
- `[FILL]` in README and SUBMISSION: repo URL, live URL, video URL, and "Enamel already wired in or after the hackathon".
- The repo must be **public** with its licence visible before submitting; hosting must stay live until 21 Dec.
- The Devpost description is about 890 words: check the Devpost length limit in T15.
- A real CA and a real advocate have not reviewed the letters; the README says "reviewed by the builder only".

## Decisions and deployment (21 Nov 2026)
- **Decision 1 (author on the 60 commits): A, accepted.** `[real name and personal email: removed]` stays on every commit and goes public with the repo. No history rewrite.
- **Decision 2 (old made-up Aadhaar sample in 8fdb69a and e5dae38): left in history.** The current code uses `0123 4567 8901`, which is never a real number.
- **Deployed:** Firebase Hosting, https://saferefer-d5175.web.app (project `saferefer-d5175`).
- **Console:** reCAPTCHA Enterprise key allows both hosting domains; App Check **enforced** for Firebase AI Logic (66 of 66 requests verified, 0 unverified); web API key restricted to the two hosting domains plus `localhost` and `localhost:5199`, and to the 25 Firebase APIs; Google Analytics not connected; AI monitoring off; template-only mode unenforced.
- **Live check (headless Chromium, clean profile, made-up note N01, Nano unavailable so manual mode):** the letter was written with the Cloud badge; the 2 cloud calls (tooth lines, letter) carried only the anonymous note (`[PATIENT]`, `[PHONE]`, `[DATE_1]`); the name, phone and date were found in 0 requests; hosts were all on the allow-list; typing a note made 0 requests. Repeated after App Check enforcement and after the key restriction: same result. A request using the key from `evil.example.com` gets PERMISSION_DENIED.
- **Not tested on the live domain:** the Gemini Nano (On-device badge) path, phone width.
