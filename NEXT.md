# NEXT: Task T1 (Tue 17 Nov)

**Goal:** a page that makes one Firebase AI Logic call and shows whether the answer came from the on-device model or the cloud.

## Before you start (you, about 20 minutes)

1. Use Chrome desktop, latest version. Open `chrome://on-device-internals` and check that Gemini Nano is downloaded. If not, let it download.
2. At console.firebase.google.com, create a project called `saferefer`. Stay on the free plan.
3. Check `node -v` prints version 20 or higher.

## Prompt to give Sonnet 5.5

Open Claude Code in `C:\Users\Dr Yatin\Desktop\BuildHybridAI`, switch to Sonnet 5.5, and paste:

```
Read RULES.md, IDEA-DECISION.md and PLAN.md in full. Do task T1 from PLAN.md and nothing else.

T1: set up the project and prove one hybrid call works.

1. Before writing code, read the current Firebase AI Logic web docs for hybrid
   on-device inference and for App Check. Use the SDK names, inference modes and
   cloud model name the docs give today. Do not rely on memory.
2. Scaffold Vite + React + TypeScript in an `app/` folder. Add LICENSE (Apache-2.0)
   and a .gitignore that excludes .env files and node_modules.
3. I have created a Firebase project called `saferefer`. Walk me through the console
   steps one at a time: register a web app, enable Firebase AI Logic with the Gemini
   Developer API, enable App Check, register a debug token. Wait for me after each step.
4. Put the Firebase web config in `app/.env.local` and add `app/.env.example` with
   empty values. Never commit the debug token.
5. Build one page: a text box, a "Ask" button, the model's reply, and a badge that
   says "on-device" or "cloud" depending on which model answered. Use the
   prefer-on-device mode. Initialise App Check before the AI call.
6. Run it and check it yourself in the browser before telling me it works.

Done-check I will verify by eye: I type "Say hello", click Ask, and see a reply
with an "on-device" badge. Then I turn Nano off (you tell me how) and see the
same page answer with a "cloud" badge.

Rules: synthetic data only, no real patient details anywhere. No extra features.
If a doc contradicts PLAN.md, follow the doc and tell me what changed.
When the done-check passes, commit on a new branch `t1-setup`, then rewrite
NEXT.md with task T2 and the prompt for it, and stop.
```

## If T1 fails

If the on-device call does not work by the end of Tue 17 Nov, do not move on. The whole idea depends on it. Ask Sonnet for the exact error and the Chrome version, and fix that first on Wed 18 Nov; T2 and T3 are small and can share Thu 19 Nov with T4.
