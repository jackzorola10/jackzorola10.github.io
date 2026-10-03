# Setup guide (about 30 minutes)

You need: an Airtable base where your people already live, and admin rights to install an app in your Slack workspace.

## 1. Airtable tables

**People** (you probably have it already; field names must match or be renamed in the script):

| Field | Type | Notes |
|---|---|---|
| Name | Single line text | Shown when there's no Slack ID |
| Work email | Email | Used for previews |
| Slack user ID | Single line text | `U…` — Slack profile → ⋮ → *Copy member ID* |
| Birth date | Date | Year can be anything; only month/day matter |
| Status | Single select | `Active` / `Inactive` |

**Birthday · Messages** — import [`data/messages.csv`](../data/messages.csv): `Code` (text), `Type` (single select: `Main`, `Weekend suffix`, `Late suffix`, `Closing`), `Says today` (checkbox), `Text` (long text), `Active` (checkbox).
Use `{tag}` where the mention should go and `{date}` in weekend suffixes.

**Birthday · GIFs** — `Code`, `Type` (`General` / `Belated`), `Description` (used as alt text), `URL` (must return `image/gif`), `Active`.

**Birthday · Log** — `Entry` (primary), `Person ID`, `Name`, `Birthday year` (number), `Celebrated on` (date), `Actual birthday` (date), `Message code`, `GIF code`, `Mode` (single select `Live` / `Test`), `Late` (checkbox), `Slack permalink` (URL).

## 2. Slack app

1. <https://api.slack.com/apps> → **Create New App** → *From a manifest* → paste [`slack-app-manifest.json`](../slack-app-manifest.json).
2. **Install to Workspace**, then copy the **Bot User OAuth Token** (`xoxb-…`).
3. `chat:write.public` lets it post in public channels without being invited. To preview in your own DM, keep *Messages Tab* enabled (the manifest already does).

## 3. Airtable automation

1. Trigger: **At a scheduled time** → daily, 8:00 AM, your time zone.
2. Action: **Run script** → paste [`src/airtable-automation.js`](../src/airtable-automation.js).
3. Secrets → `SLACK_BOT_TOKEN` = the `xoxb-…` token.
4. Input variables:

| Variable | Example |
|---|---|
| `MODE` | `TEST` first, `LIVE` when happy |
| `TIME_ZONE` | `America/Chicago` |
| `UTC_OFFSET` | `-6` (only used if the time zone database is missing) |
| `LIVE_CHANNEL` | `C0123456789` (#general) |
| `TEST_CHANNEL` | your own user ID, `U…` |
| `ACTIVE_FROM` | the go-live date, so nothing older is "recovered" |
| `WINDOW_DAYS` | `4` |
| `PREVIEW_EMAIL`, `PREVIEW_STYLE`, `SIMULATE_DATE` | `-` unless you are previewing |
| `TBL_PEOPLE`, `TBL_MESSAGES`, `TBL_GIFS`, `TBL_LOG` | table IDs (`tbl…`) |

## 4. Test before going live

- `MODE=TEST` + `PREVIEW_EMAIL=you@company.com` → **Run test**: one preview lands in your DM.
- Add `PREVIEW_STYLE=WEEKEND` or `LATE` to see the other variants.
- `MODE=TEST` + `SIMULATE_DATE=2026-12-18` shows who would be celebrated that day.
- Never press *Run test* with `MODE=LIVE`: it posts for real.

## 5. Go live

Set `MODE=LIVE`, set `ACTIVE_FROM`, turn the automation on, and switch off any other birthday bot the same day so nobody gets celebrated twice.

## Operating notes

- Failures email whoever turned the automation on. The error text says what to fix.
- A broken token is caught on the next weekday by `auth.test`, not on a birthday.
- New hire? Add their Slack user ID when you create their People record.
- Airtable script limits: 120 s per run and 50 `fetch` calls; the 4-posts-per-run brake keeps it far below both.
