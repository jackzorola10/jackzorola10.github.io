# System · 00 · Architecture and conventions

Read this before creating or moving any file.

## What this is, and what it is not
- **It is** the description of how every process works: who runs it, what triggers it, what goes in and out, where the information lives, which tools it needs and which areas it affects.
- **It is not** a database. Real records live in the systems listed in `01 - Tool Map.md`. These docs point to them.

## Naming
- Area folders: full name, Title Case (`People`, not `HR/`).
- Area codes: 2–4 capital letters, fixed forever (changing them breaks references).
- Process docs: `P-<AREA>-<NN> - <Name>.md`, numbered per area.
- Area master: always `00 - <Area> Master.md`, first file in the folder.
- Folders starting with `_` are cross-cutting, not areas.

## Statuses
| Status | Meaning |
|---|---|
| `To be documented` | The process runs today but has no doc yet. It still appears in the area master. |
| `To be built` | A decision exists, but the process doesn't run yet. |
| `Draft` | The doc exists but the area lead hasn't validated it. |
| `Live` | Validated by the lead; describes reality. |
| `In review` | A change is proposed and waiting for approval. |
| `Deprecated` | Kept for history; don't follow it. |

## The truck test
Every area master and every process doc must answer: **if the person who does this today disappeared tomorrow, could someone else understand what they did and why it mattered?** If the honest answer is "nobody could", write that. It is the most useful sentence in the doc.

## Golden rule for AI
A doc is never finished. After any session that creates or edits one, run `03 - AI Review Protocol.md` and record the result.
