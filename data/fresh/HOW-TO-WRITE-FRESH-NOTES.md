# Fresh notes: how to write them (for Dr. Yatin)

Goal: 10 notes per profession that **nobody has seen and the code rules were never tuned on**. They give the honest leak score.
Rule for the builder (Claude): the FIRST measured score on these notes is recorded as it comes out. No rule is changed before that run.

## What to write
- Dentist: 10 referral-style or clinical notes. CA: 10 client notes. Advocate: 10 case notes. One short paragraph each (2 to 5 sentences).
- **Everything made up.** Invent every name, phone, address and ID. Never copy a real patient, client or case.
- **Phone numbers: start every one with five zeros** (00000 55123, 00000-55123, +91 00000 55123, "zero zero zero zero zero five five one two three"). Vary how you write them.
- Be realistic and a bit messy, the way you really type: nicknames ("Bunty", "Pinky"), only a first name, lower case, initials ("R. K. Mehta"), Marathi/Hindi words in English letters ("aai", "kaka", "bhau", "mavshi"), short forms, relatives, employers, schools, addresses with a landmark ("near Ganesh mandir"), dates written in different ways ("3/11", "third Nov", "last Tuesday", "05-11-2026").
- Mix: some notes with lots of identifiers, some with few, one or two with none.

## How to mark what must be hidden
Wrap every identifier like this: `[[type:text exactly as written]]`. The brackets are removed before the test; they only tell the scorer what to look for.

Types: `name`, `relative`, `phone`, `email`, `date`, `dob`, `address`, `organization`, `record_id`, `amount` (only for a settlement sum), `id` (PAN, GSTIN, case number).

Example (made up, not part of any test):
```
1. [[name:Mrs Savita Kolhe]] ([[phone:00000 55123]]) came with her son [[relative:Omkar]] on [[date:third Nov]]. Pain in 47 since 4 days. Works at [[organization:Sai Medical Stores]], [[address:near Ganesh mandir, Baramati]]. Please see for RCT.
```
Tooth numbers, ages, drug names, amounts of money (except a settlement sum), sections, Act names and court names are NOT marked: they must stay.

## How to send
Paste the numbered notes in the chat, or save them in a file in this folder (for example `dental-fresh.md`) and tell me. Do one profession at a time: dentist first.
