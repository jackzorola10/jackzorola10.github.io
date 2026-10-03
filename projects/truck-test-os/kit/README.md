# Truck-test OS · starter kit

A documentation system that lets a company keep running when anyone disappears, and lets AI agents work inside it without breaking it.

Copy this folder into a Git repo (or an Obsidian vault synced to Git) and follow the steps below. In this kit, `system/` becomes `System/`, `templates/` becomes `_Templates/`, and `.github/CODEOWNERS.example` becomes `.github/CODEOWNERS`.

```
company-os/
├── 00 - Company.md              ← entry point: what this is, areas, leads
├── AGENTS.md                    ← rules any AI assistant must follow here
├── System/
│   ├── 00 - Architecture.md     ← structure, naming, statuses, the truck test
│   ├── 01 - Tool Map.md         ← where the real data lives (docs never store it)
│   ├── 02 - Governance.md       ← who owns what, how changes get approved
│   ├── 03 - AI Review Protocol.md  ← "the judge": checks A–G
│   ├── 04 - Decision Log.md     ← append-only
│   └── 05 - Backlog.md          ← what's documented, what's missing
├── _Templates/
│   ├── Area Master.md
│   └── Process.md
├── .github/CODEOWNERS
└── <Area name>/                 ← one folder per area
    ├── 00 - <Area> Master.md
    └── P-<AREA>-01 - <Process>.md
```

## Start in 30 minutes

1. List your areas and their leads in `00 - Company.md`. Give each area a 2–4 letter code and never change it.
2. Create one folder per area with its master doc from `_Templates/Area Master.md`.
3. Fill `System/01 - Tool Map.md`: every system where real data lives.
4. Document the **one** process that would hurt most if its owner left tomorrow. Use `_Templates/Process.md` and don't skip the Continuity section.
5. Ask your AI assistant to run `System/03 - AI Review Protocol.md` on it. Fix what it finds.
6. Repeat one process at a time. Log structural decisions in `04 - Decision Log.md`.

## The rules that make it work

- **Docs describe, systems store.** No customer, employee or financial data in these files. Point to where it lives.
- **The truck test.** Every doc must answer: if the person who runs this disappears tomorrow, can someone else take it over?
- **Owners edit their area. Everyone reads everything.** Changes to someone else's area are proposals until they approve.
- **The judge reports, it doesn't fix silently.** AI agents flag inconsistencies to the owner instead of rewriting other people's docs.
- **Nothing is ever finished.** Every doc carries a status, a date and a change log.
