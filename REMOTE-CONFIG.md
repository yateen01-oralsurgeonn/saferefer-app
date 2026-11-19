# REMOTE-CONFIG: what to create in the Firebase console (T11)

The app already works with no console setup: it starts on the wording and the model compiled into it. Remote Config only lets you **change the section list of a letter, or the cloud model, without a new build**. Nothing else can be changed from the console (the fixed rules, the name hiding and the send check are not reachable).

## Do this once
Firebase console, project `saferefer-d5175`, **Run > Remote Config**. Add these four parameters (type String). Leave any you do not want to change **empty or do not create it**.

| Parameter name | What it does | Sample value |
|---|---|---|
| `template_dental` | Section list of the dentist's referral letter | see below |
| `template_ca` | Section list of the CA case summary | see below |
| `template_law` | Section list of the advocate's brief | see below |
| `cloud_model` | Which cloud model writes letters | `gemini-3.5-flash-lite` (the only allowed value today) |

Then press **Publish changes**.

If Firebase asks you to enable the **Firebase Remote Config API** (Google Cloud), say yes. It is free.

## Template format
One section per line (or a JSON array). 3 to 14 lines, each at most 90 characters. The first line is the greeting, the last line is the closing sentence (written with no label).
- `[PATIENT]` is allowed only in a line that starts with `Re:`.
- No other square brackets, no `{ }`, no `< >`, no backticks, and no words like "ignore", "forget", "override" or "disregard". A template with any of these is **thrown away whole** and the built-in wording is used.

Sample for `template_dental` (this renames three sections; paste it as it is):
```
Dear Colleague,
Re: [PATIENT], with age only if recorded
Why I am referring
Presenting complaint and history
Clinical findings
Investigations
Treatment so far
Medical history and medication
What I ask
Thank you for seeing this patient.
```
Sample for `template_ca`:
```
Dear Colleague,
Re: [PATIENT], the client
Matter
Facts recorded
Documents on file
Figures recorded
Question for the specialist
Thank you for your help with this client.
```
Sample for `template_law`:
```
Dear Counsel,
Re: [PATIENT], the client
Forum and stage
Facts recorded
Documents on file
Issue for counsel
Thank you for your help with this matter.
```

## How to check it works (2 minutes)
1. Change one heading in `template_dental` (for example "Reason for referral" to "Why I am referring") and publish.
2. Wait one minute, reload the app (the built app re-reads at most once a minute; the dev server every reload).
3. Approve a dental note and Send: the letter uses the new heading.
4. Put a bad value in (for example add `[PERSON_1]` to a line) and publish: the letter goes back to the built-in wording. That is correct.

## Rules the code enforces (SECURITY A11)
- Only these four parameter names are read; any other parameter is ignored.
- The model name must be on an allow-list in code. `gemini-3.8-flash` is **not** on it: it timed out at the 30 second limit twice on 19 Nov.
- A bad template is rejected as a whole, not partly repaired.
- No network, no Remote Config, or a slow fetch (4 seconds): the built-in values are used and the screen is never delayed.
