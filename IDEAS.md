# BuildHybridAI: Candidate Ideas

Not yet scored against RULES.md.

## 1. Marathi offline post-op instructions

**Problem:** After an extraction, root canal or scaling, patients forget the instructions. Many read Marathi more easily than English. Connectivity in towns like Indapur is patchy.

**What it does:** The dentist picks a procedure and the app gives clear Marathi aftercare. The patient can ask follow-ups ("can I eat tonight?") and get a Marathi answer.

**Hybrid angle:** An on-device model handles templates and simple Q&A offline. A cloud model is the fallback for unusual questions, with generic text only.

**Guardrails:**
- Dentist-approved templates are the source of truth
- No diagnosis or prescribing
- No patient identifiers leave the device

**Risk:** Marathi quality of small on-device models. Needs a native-speaker check.

## 2. Offline bill reader for AushadhiOS / Kanya

**Problem:** Stock entry from supplier bills is typed by hand. Errors in batch, expiry, MRP and GST cause stock and billing mistakes.

**What it does:** Photograph a bill. The app extracts line items (drug, batch, expiry, quantity, MRP, GST). The user checks them, then they go into AushadhiOS or the Kanya Medical bot.

**Hybrid angle:** On-device extraction works with weak signal. Low-confidence lines go to the cloud for a second read.

**Guardrails:**
- Human confirms every line
- Supplier data only, no patient data

**Risk:** Bill layouts vary, and handwritten or stamped bills read badly. Needs real samples from Kanya.

## Open question
Which fits the required technology and judging criteria better?

## Router ideas for SafeRefer (A, C, D): NOT YET, build only after T7

Source: an Instagram reel by robin.singh.ai (seen 18 Nov 2026), an "LLM router" that keeps patient data on a local model, sends simple questions to cheap models and hard ones to strong models, and escalates weak answers. SafeRefer already follows the same pattern (on-device redaction, send guard, cloud letter, fact check). These three ideas make that visible. **Do not start any of them before the 22 Nov checkpoint (T7 done). PLAN.md section 3 says where each one goes.**

**A. Router view strip (goes into T12, design pass).** One line of text under the letter showing where each step ran: "Redaction: on-device. Letter: cloud (anonymous text only). Tooth lines: on-device / cloud". Read it from `result.response.inferenceSource`. Shows lane names only: never a note, prompt or token map (CLAUDE.md rule 4).

**C. Difficulty picks the cloud model (goes into T11, Remote Config).** Remote Config holds two cloud model names: a light one (`gemini-3.5-flash-lite`) and a strong one (`gemini-3.8-flash`). Plain code in `core/` decides which, from the anonymous note only: length, number of teeth, medical-history flags. No AI decides the route. The screen shows which model was picked and why.

**D. Weak letter escalates once (after T11, only if time is left before T13).** If `checkFacts` shows a red warning, retry the letter once on the strong model with the **same frozen, approved string** through `guardedSend`. Never re-redact, never send anything new. Show "Escalated to stronger model". If the second letter is also red, keep the red warnings and stop; no loop.

**Not taken from the reel:** role picker (login screens are banned), cost and budget rules, emergency check (that is diagnosis, banned by rule 6), and the routing log (only lane names in memory, if any). No "full privacy" or DPDP/HIPAA claims.

**After the hackathon (Enamel, not this repo):** a fully local lane. Enamel passes its own local model into `core/` for redaction and letters, so a clinic that refuses all cloud gets the same tool, with the cloud as an optional stronger lane.
