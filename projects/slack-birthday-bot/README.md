# 🎂 Slack Birthday Bot (Airtable + Slack)

**▶ [Try the interactive simulator](https://jackzorola10.github.io/projects/slack-birthday-bot/)**

A replacement for paid birthday bots, built from what the team already had: the People table in Airtable and a tiny Slack app. One scheduled Airtable script works out who to celebrate, posts a message with a GIF to `#general`, and logs it.

![Status](https://img.shields.io/badge/status-in%20production-2ea043) ![Tests](https://img.shields.io/badge/tests-16%20passing-2ea043) ![Dependencies](https://img.shields.io/badge/dependencies-0-blue)

## Why build it

The paid bot kept **its own copy of everyone's birthday**: a second source of truth that drifted every time someone joined or left. The data already lived in the HR table in Airtable, and the bot only spoke English to a Spanish-speaking team. So the job was not "find a better bot". It was: **stop keeping the same fact in two places.**

## What it does that most bots don't

| Rule | Why it matters |
|---|---|
| Weekend birthdays are celebrated on **Friday**, naming the real date | Nobody gets a party in an empty channel |
| **Fair rotation** of 30 messages and the GIFs: least used first | It never feels repetitive, even after a year |
| Messages that say "today" are **only used on the actual day** | No "Today is your birthday!" posted on a Friday for a Sunday birthday |
| A failed day is **recovered** the next weekday, with a "belated" note | One outage doesn't erase someone's birthday |
| The token is checked **every weekday** with `auth.test` | A broken setup fails on a quiet Tuesday, not on a birthday |
| **Post first, log second** | If Slack fails nothing is logged, so the next run retries; no duplicates |
| Safety brake: max 4 posts per run | A bad date import can't flood the channel |
| `TEST` mode with previews in your DM | You see the exact message before anyone else does |
| Errors explain the fix in plain words | Whoever gets the failure email can fix it without the author |

## How it works

```
 Airtable · daily 8:00 AM
 ┌───────────────────────────────────────────────────────────────┐
 │ 1. today (in your time zone) → weekend? stop                  │
 │ 2. auth.test → token still valid?                             │
 │ 3. People (Active) → who is celebrated today / recoverable?   │
 │ 4. Log → skip anyone already celebrated this year             │
 │ 5. pick least-used message + GIF (HEAD-check the GIF)         │
 │ 6. chat.postMessage (Block Kit: text · image · closing)       │
 │ 7. write the Log row with the permalink                       │
 └───────────────────────────────────────────────────────────────┘
```

The decision logic lives in [`src/core.js`](src/core.js): pure functions, no network, fully tested. Airtable scripts can't import modules, so the automation embeds that file verbatim; [a test](tests/sync.test.js) fails if the copies ever drift.

## Files

| Path | What it is |
|---|---|
| [`src/core.js`](src/core.js) | Date math, celebrant selection, rotation, message composition |
| [`src/airtable-automation.js`](src/airtable-automation.js) | The script you paste into Airtable (core embedded) |
| [`slack-app-manifest.json`](slack-app-manifest.json) | Creates the Slack app in one paste |
| [`data/messages.csv`](data/messages.csv) | 30 messages, weekend/late suffixes, closings |
| [`docs/setup.md`](docs/setup.md) | Step-by-step setup (~30 min) |
| [`tests/`](tests) | `node --test tests/*.test.js`, no dependencies |

## Lessons learned

- **The native integration wasn't enough.** Airtable's built-in Slack action would not render the GIF inline no matter the format. A Block Kit `image` block via `chat.postMessage` did. A tiny custom app beat an hour of workarounds.
- **Display names in a Slack manifest must be lowercase, with no spaces or accents**, and per-message `username`/`icon_emoji` overrides are ignored for this kind of app. Name and icon come from the app itself.
- **Design for whoever inherits it.** Every error message names the fix, the setup guide fits on one page, and test mode exists so the next person can try it without fear.

---
Part of [Jack Zorola's portfolio](https://jackzorola10.github.io). Rewritten from a production system; all names and data here are fictional.
