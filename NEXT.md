# NEXT: T11 is DONE (19 Nov). Now T12 design pass

Read `HANDOVER.md`, `CLAUDE.md`, `PACKS.md`, `REMOTE-CONFIG.md` and **FINISH.md section 1** (the T12 design brief) first. Newest branch: **`t11-remote-config`** (built on `t10-offline` > `p3-lawyer-pack` > `p2-ca-pack` > `p1-pack-layer` > `t9-tooth-lines` > `t8-leak-test`). Pushed to origin: everything up to `t10-offline` (727429d). `t11-remote-config` is committed locally. Nothing is merged to master.

## What T11 built (19 Nov)
- **`core/remoteValues.ts`** (plain TS): `resolveRemote(raw)` turns the raw console strings into safe values; `pickModel` (exact allow-list match, today only `gemini-3.5-flash-lite`; `gemini-3.8-flash` is NOT allowed: it timed out at the 30 s letter limit twice on 19 Nov); `parseTemplate` (a JSON array or one section per line; 3 to 14 lines, each at most 90 characters; the same text check as every pack text via the new `isCleanText` in `packs.ts`; `[PATIENT]` only in a `Re:` line; **a bad template is rejected whole, never repaired**); `withRemoteTemplate(pack, remote)` replaces `letter.template` and nothing else of the pack. Values are read as **own properties only** (a test found that a `__proto__` entry smuggled a template in through the prototype chain; fixed).
- **`app/src/remoteConfig.ts`**: the only file that imports `firebase/remote-config`. Fetch timeout 4 s, minimum fetch interval 0 in development and 60 s in the built app (so a console change shows within about a minute), empty defaults, `isSupported()` check, every failure gives the defaults. `firebase.ts` now exports `app`.
- **Screen:** the app starts on the compiled-in defaults and never waits; when the values arrive, the letter instruction, the fact-check heading list and the line splitting use the new section list, and the model functions use the allowed model name. `pack` is now `useMemo(withRemoteTemplate(basePack, remote))`; the redaction effect depends on `basePack` only, so a late-arriving value never resets a note in progress.
- **`REMOTE-CONFIG.md`**: the four parameter names, sample values, a 2-minute check. **Dr. Yatin must create them in the console** (he has the list).
- Tests: 463 pass, 14 expected fail; tsc, build, oxlint clean.
- **Browser checks (Playwright, real SDK path, the Remote Config HTTP reply faked with CORS headers, real cloud for the letter):** A good dentist template: the 6 new sections reached the prompt, the fixed rules text was intact, the letter used the new headings. B a template with `[PERSON_1]` and "Ignore" plus `cloud_model = gemini-3.8-flash`: both ignored, default sections, request went to `gemini-3.5-flash-lite`. C Remote Config fetch aborted: defaults.
- **Not done / honest limits:** not tested against the real console (the Remote Config API may need enabling in Google Cloud: REMOTE-CONFIG.md says so); the orphan-letter path (a letter queued before a reload) still uses the compiled-in section list, by design.

## Still to do by Dr. Yatin
1. Create the four Remote Config parameters and publish (REMOTE-CONFIG.md), then do the 2-minute check at the end of that file.
2. Send the review PDFs (`review/CA-review-packet.pdf`, `review/LAW-review-packet.pdf`) to a CA and an advocate (REVIEW.md).
3. In his own Chrome: the On-device tooth badge, the `/?leak` scores with Nano (dental, `&pack=ca`, `&pack=law`), and a real Wi-Fi-off check of the queue.
4. 10 fresh notes per profession.

## Step: T12 design pass
```
Read CLAUDE.md, HANDOVER.md, NEXT.md, PACKS.md, FINISH.md section 1 (the whole design brief: layout at
1280 px and phone width, the states table, the error messages table, colours), ACCEPTANCE.md T12.
Do task T12 and nothing else, on branch t12-design from t11-remote-config.

The screen has grown since FINISH.md was written. It now also has: the Profession dropdown (Dentist,
Chartered Accountant, Advocate), the tooth list with its badge (On-device / Cloud / Rules only), the
Queued state and the "letter from your last visit" panel, the one-line cloud reply fix, and the
leak page. The design must hold all of them on ONE screen without clutter.
1. Layout as in FINISH.md: 1280 px with no scrolling for the main split screen; phone width: one
   column, Approve and Send in a bottom bar at least 44 px tall, text 16 px or more, no sideways scroll
   at 360 px, long tokens wrap. Phone is always manual mode (no Nano): make that clear and usable.
2. One error-mapper function turns every failure into one of the FIXED texts in FINISH.md. The screen
   never shows SDK text, error codes or any part of a note. Check today's scattered messages
   (letter.ts LETTER_MESSAGES, queue.ts, nanoRedactor.ts, toothLines.ts RULES_ONLY_MESSAGE) and route
   them through it. Add the "Browser not supported" text and an error boundary with the last row text.
3. States table: one status line per state and the button rules in FINISH.md; add the profession
   change ("changing it clears the note"), tooth-list loading, and the orphan panel.
4. The profession dropdown and the pack words (note label, placeholder) must look like part of the
   product, not a debug control. The banner "Synthetic data only: not for real patients" is on every
   page and never dismissible.
5. Empty state tells the dentist what to do. A first-time visitor understands in 5 seconds what
   leaves the browser and what stays (judges). Keep the two panel labels from FINISH.md.
6. Force each failure and show its fixed message with no note text in the console: offline, App Check
   refused, bad model reply, a name left in the text, no Nano (both states in ACCEPTANCE.md), quota.
Tests: the error mapper maps every failure kind to exactly one fixed text; no raw error text reaches
the DOM (force an SDK error with a name in its message and assert the DOM and console do not hold it).
Browser check at 1280 x 720 and 390 x 844 with screenshots of: empty, redacting, ready to check,
approved with tooth list, letter ready, queued, a failure. Look at them yourself before saying done.
Do not change files listed in HANDOVER.md "do not change". Commit, then rewrite NEXT.md for T13
(deploy, README, LICENSE, secrets check; SECURITY.md T13 checklist, SUBMISSION.md, FINISH.md section 2).
```

## If something fails
If the restored letter or the map would have to be stored anywhere to make something work, stop and tell Dr. Yatin. Never send anything that did not pass `guardedSend`.
