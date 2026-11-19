# NEXT: T10 is DONE (19 Nov). Now T11 Remote Config

Read `HANDOVER.md`, `CLAUDE.md`, `PACKS.md` and `REVIEW.md` first. Newest branch: **`t10-offline`** (built on `p3-lawyer-pack` > `p2-ca-pack` > `p1-pack-layer` > `t9-tooth-lines` > `t8-leak-test`). Pushed to origin: everything up to `p3-lawyer-pack` (0412f4f). `t10-offline` is committed locally. Nothing is merged to master.

## What T10 built (19 Nov)
- **Decision (told to Dr. Yatin): the queue is local-only.** IndexedDB in the browser, not Firestore: there is no cloud copy, no rules to deploy, no console setup. PLAN.md, SECURITY.md A7, ACCEPTANCE.md T10 and SUBMISSION.md were changed to say so (SUBMISSION no longer claims Firestore or Anonymous Auth). If Firestore is ever added, SECURITY A7 applies again in full.
- **`core/queue.ts`** (plain TS, no storage API): `enqueue` (through `guardedSend`, so a name, phone or email left in the text is never stored), `readQueued`, `clearQueue`, `sendQueued` (sends the item's own frozen string with its profession's letter words, through the guard again; removed only when a letter came back, or when the guard blocks it), `asQueuedItem` (storage is untrusted: exact four keys, known profession, size cap), `createMemoryStore`. One slot. **Stored record = exactly `{id, packId, approved, savedAt}`.**
- **`queueStore.ts`**: the ONLY file that touches IndexedDB (a test greps `src/` and fails if `indexedDB`, `localStorage`, `sessionStorage`, `caches.` or `document.cookie` appears anywhere else). Falls back to memory if IndexedDB is missing.
- **Service worker** (`app/sw-template.js`, built into `dist/sw.js` by a small plugin in `vite.config.ts`, registered in production only): precaches the 5 shell files and nothing else. No `.put(` anywhere; a POST, a Google/Firebase/reCAPTCHA call and any same-site file outside the list are never touched; pages are network-first, cached shell offline; `ignoreVary` is needed (module scripts send an Origin header, found by testing).
- **Screen:** Send offline (or when the network fails) shows "You are offline. The letter is queued and will be sent when you are back online." and the button reads "Queued". The `online` event sends it by itself (guard again). Any edit clears the queued copy. After a reload, a queued letter shows in a "A letter from your last visit" panel and is sent with labels (the token map is never stored); it says so with a fixed sentence (`ORPHAN_NOTE`).
- **Production bundle:** the leak page and its notes stay out (0 hits for any test name). `LETTER_MESSAGES.offline` is unchanged ("Nothing was sent") because the screen now queues instead of showing it; it appears only if the queue itself fails.
- Tests: 426 pass, 14 expected fail; tsc, build and oxlint clean (0 warnings).
- **Browser checks (Playwright, real cloud):** (1) offline: redaction works with 0 Google requests from it, tooth badge "Rules only", Send -> "Queued", record in IndexedDB = the 4 keys with the anonymous text, back online -> the letter arrived by itself with names restored and the record was gone. (2) queued, cloud blocked, reload -> orphan panel, "Send now" -> letter with `[PATIENT]` plus the fixed sentence, record gone. (3) production build via `vite preview`: SW active, cache = exactly the 5 shell files, offline reload shows the app and redaction works, cache unchanged after use.
- **Not done / honest limits:** offline queueing was tested in Playwright's offline mode, not on a real phone or with a real Wi-Fi switch; Nano was absent in the test browser, so the offline on-device tooth list was only seen as "Rules only". The online-event-sends-by-itself path needs the tab open; a closed tab sends nothing (no background sync, on purpose).

## Still to do by Dr. Yatin
1. Send the review PDFs (`review/CA-review-packet.pdf`, `review/LAW-review-packet.pdf`) to a CA and an advocate (REVIEW.md).
2. Nano On-device badge and `/?leak` scores in his own Chrome (dental, `&pack=ca`, `&pack=law`).
3. A real Wi-Fi-off check in his Chrome: turn Wi-Fi off, type a note, Approve, Send: "Queued"; Wi-Fi on: the letter arrives.
4. 10 fresh notes per profession.

## Step: T11 Remote Config
```
Read CLAUDE.md, HANDOVER.md, NEXT.md, PACKS.md, PLAN.md row T11, SECURITY.md row A11, ACCEPTANCE.md T11.
Do task T11 and nothing else, on branch t11-remote-config from t10-offline.

Goal: the letter wording (the section list) and the cloud model name can be changed in the Firebase
console without a new build. Rename one section in the console, reload, send a note: the new wording
shows in the letter.
1. Remote Config values (read once at load, with the defaults compiled in so the app works with no
   network and no console setup): `cloud_model` (string) and a section list per profession
   (`template_dental`, `template_ca`, `template_law`, each a JSON array of strings or lines).
2. A11 is the rule: the template fills the SECTION LIST ONLY (the `template` of the pack's letter
   text), never any other part of the prompt. Cap the number of lines (2 to 14) and each line's length;
   strip brackets, braces, angle brackets and backticks; reject override words (reuse `cleanText` in
   core/packs.ts or its validator); keep "[PATIENT]" only in the "Re:" line if the default has it.
   The model name must be on an ALLOW-LIST in code (today: gemini-3.5-flash-lite). `gemini-3.8-flash`
   timed out twice at the 30 s limit in the 19 Nov test, so it may be added only with a longer letter
   timeout and a test. Any bad value: fall back to the default silently. Plain logic in
   core/remoteValues.ts (no Firebase import); the Firebase call in app/src/remoteConfig.ts only.
3. The Firebase web SDK `firebase/remote-config`: fetch with a short minimum interval and a timeout so
   it never delays the screen; if it fails, use defaults. No analytics.
4. Dr. Yatin must create the parameters in the Firebase console (Remote Config) and publish: give him
   the exact parameter names and a sample value for each in one short list in chat. Do not ask for
   console access.
Tests: values with brackets, too many lines, long lines, override words, a non-allow-listed model name,
non-JSON, and an empty value all fall back to the defaults; a good template changes only the section
list (the fixed rules text is byte-identical). Browser check with a temporary override (no console
needed): show that a good template changes the letter and a bad one does not.
Do not change files listed in HANDOVER.md "do not change". Commit, then rewrite NEXT.md for T12
(design pass, FINISH.md section 1).
```

## If something fails
If the restored letter or the map would have to be stored anywhere to make something work, stop and tell Dr. Yatin. Never send anything that did not pass `guardedSend`.
