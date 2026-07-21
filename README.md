# Daily1600 — Adaptive Digital SAT Prep

> OpenAI Build Week 2026 Submission — Education Track

![Built with Codex](https://img.shields.io/badge/Built%20with-Codex-111111?style=flat-square)
![React + Vite + Tailwind CSS](https://img.shields.io/badge/React%20%2B%20Vite%20%2B%20Tailwind%20CSS-61DAFB?style=flat-square)
![Offline-First](https://img.shields.io/badge/Offline--First-4B4B4B?style=flat-square)

**Publication status:** live and public. GitHub repository: [github.com/klee718/Daily1600](https://github.com/klee718/Daily1600) · Live demo: [daily1600.vercel.app](https://daily1600.vercel.app)

## The problem

SAT preparation can be hard to sustain: students need short, useful practice that reacts to what they miss, while parents need a clear view of progress without turning every study session into a stressful check-in.

## The solution

Daily1600 turns Digital SAT practice into a focused daily loop. A student chooses Math or English, completes targeted multiple-choice questions, receives hints and explanations, and keeps progress through XP, streaks, hearts, gems, quests, badges, a skill roadmap, and a parent-facing progress report.

The experience was co-designed and tested with a 15-year-old student so that the pace, feedback, and controls stay practical for a real Digital SAT test-taker.

## What to try

- Choose **Math** or **English** from the student dashboard and start a subject-specific session.
- Use a hint before answering, then review the explanation after each answer.
- Open the **Border Collie Tutor** after an answer for a guided, multi-turn prompt that helps the student reason through the question.
- Refresh the browser: progress, active sessions, gems, hearts, streaks, quests, and profile settings persist locally.
- Open **Parent View** for XP history, category performance, and deterministic, data-based next-step recommendations.

## Active architecture

Daily1600 is a browser-first React single-page app. The active product path is deterministic and does not depend on a server, a model API, or an API key.

| Layer | Active implementation |
| --- | --- |
| UI | React, TypeScript, Vite, Tailwind CSS v4, Motion, Recharts, and an emoji-based icon system |
| Questions | Authored static SAT-style question bank with subject/category filtering |
| Student state | One `UserProfile` JSON record in browser `localStorage` |
| Practice loop | Persisted active sessions, answer feedback, hints, XP, performance telemetry, and subject-specific question selection |
| Habit loop | Streaks, freezes, hearts, gems, wagers, quests, badges, roadmap levels, and checkpoints |
| Parent reporting | Local telemetry calculations, rolling XP trend data, and deterministic learning narratives |

The interface uses an academic crimson-and-gold palette on a light parchment surface. It is not affiliated with or endorsed by any university.

## Border Collie Tutor

The Border Collie Tutor is an authored, deterministic Socratic coaching engine in `src/components/PracticeSession.tsx`. It uses the question, the student's selected answer, and a short reply to give a guiding clue and follow-up question before revealing a full explanation. This is an intentional product decision: the tutor is instant, reliable offline, has no API cost, and avoids spoiling the answer in its first response.

## AI Architecture & Dual-Engine Fallback Strategy

Daily1600 defaults to a deterministic local study experience. If a deployment enables `VITE_ENABLE_LIVE_TUTOR=true` and supplies a server-side `OPENAI_API_KEY`, the Border Collie Tutor streams a GPT-5.6 response from `/api/tutor` with the question, selected answer, and conversation history. The browser never receives the API key.

If the flag is off, the key is missing, or the live request fails, the tutor immediately keeps the authored local Socratic response already shown in the panel. This keyless uptime path avoids raw network errors and keeps the practice session usable on static or public hosting. It is designed to meet the hackathon's viability and technical-implementation expectations without making the demo depend on a network service.

## Optional hosted API routes

The `api/` directory provides optional hosted integrations. The local app does not call them unless the public live-tutor feature switch is explicitly enabled.

| Route | Designed responsibility | Current status |
| --- | --- | --- |
| `api/generate-questions.ts` | Creates bounded batches of SAT questions and validates the required question shape before returning them | Dormant |
| `api/tutor.ts` | Streams tutor output with Server-Sent Events and carries prior conversation context | Optional live engine |
| `api/insight.ts` | Returns structured student/parent learning insights from supplied telemetry | Optional hosted route |

These routes expect a server environment and an `OPENAI_API_KEY`. `.env.example` documents the server-only key and a non-secret public feature switch; no key is needed for normal local use.

`vercel.json` is included for a future Vercel deployment: it serves the SPA entry point for browser routes while keeping `/api/*` available for the dormant server-route designs.

## How Codex contributed

Codex accelerated the implementation of the local profile/session state machine, gamification mechanics, Tailwind v4 component styling, and the parent-reporting experience. Two design-review passes also led to concrete fixes:

- Removed a root `font-size` override that inflated every rem-based layout value.
- Replaced a raw Markdown report rendered in a `<pre>` block with the structured `DetailedProgressReport` component.

The result is an offline-first study experience that remains functional during a demo even without network access.

## Run locally

```bash
git clone https://github.com/klee718/Daily1600
cd Daily1600
npm install
npm run dev
```

Open the localhost URL printed by Vite. No environment variables or API key are required.

To create a production build locally:

```bash
npm run build
npm run preview
```

On Windows PowerShell, use `npm.cmd` if PowerShell's execution policy prevents `npm` from running:

```powershell
npm.cmd run dev
```

## Project map

```text
src/
  App.tsx                         Application state and view switching
  components/PracticeSession.tsx  Practice flow and Border Collie Tutor
  components/StudentDashboard.tsx Student dashboard
  components/ParentPortal.tsx     Lazy-loaded parent view
  components/DetailedProgressReport.tsx
                                  Structured parent progress report
  data/questions.ts               Static SAT-style question bank
  lib/storage.ts                  localStorage profile persistence
  lib/learningNarrative.ts        Deterministic parent narratives
  lib/xpTrend.ts                  Rolling seven-day XP data
api/                              Dormant future server-route designs
```

## Submission details
- **Youtube Video:** [youtube](https://youtu.be/MBnbT7vDm6I)
- **GitHub repository:** [github.com/klee718/Daily1600](https://github.com/klee718/Daily1600)
- **Live demo:** [daily1600.vercel.app](https://daily1600.vercel.app)
- **Codex Session ID:** `019f62bf-fd51-7873-9786-12462f4e32e6`
