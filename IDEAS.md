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
