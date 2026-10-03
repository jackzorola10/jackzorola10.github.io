# 🚚 A company that survives losing anyone

**▶ [Open the interactive page](https://jackzorola10.github.io/projects/truck-test-os/)** · **[Download the starter kit](https://jackzorola10.github.io/projects/truck-test-os/truck-test-os-kit.zip)**

A documentation operating system I built for a regulated company: one master doc per area, one doc per process, folder ownership, an append-only decision log, and an AI "judge" that audits all of it. Every doc has to pass the **truck test**: if the person who runs this disappeared tomorrow, could someone else take it over?

![Status](https://img.shields.io/badge/status-in%20production-2ea043) ![Tests](https://img.shields.io/badge/tests-8%20passing-2ea043) ![Dependencies](https://img.shields.io/badge/dependencies-0-blue)

## Why it existed

- Most processes were run by one person who learned them by doing. Every absence became an outage.
- AI assistants can only run processes they can read: trigger, inputs, where the data lives, tools, approvals.
- Docs rot. Without something that checks them, nobody trusts them and nobody updates them.

In about seven weeks: **9 areas, 28 processes documented, 40 structural decisions logged.**

## The five rules

1. **Docs describe, systems store.** No records in the docs; each points to the system where the data lives.
2. **Every doc passes the truck test.** A mandatory continuity section.
3. **Owners edit their area; everyone reads everything.** Folder ownership via CODEOWNERS. Leads who don't use Git ask their AI assistant, which opens the pull request.
4. **The judge reports, it never fixes silently.** Findings in another area go to its owner.
5. **Decisions are written once.** Append-only log.

## The judge (checks A–G)

| | Check | Catches |
|---|---|---|
| A | Freshness | Live docs unreviewed for 90+ days, drafts stuck for 45+ |
| B | Coherence | Live docs that still describe work as "pending" |
| C | Reciprocity | A process affects an area that doesn't reference it back |
| D | Tools | Tools missing from the tool map, or disconnected |
| E | Ownership | Leads or runners who left |
| F | Coverage | Orphan processes (not in the master) and ghosts (listed, not real) |
| G | Continuity | Empty continuity sections, single points of failure |

[`src/os.js`](src/os.js) implements the judge, the truck test (`truckTest`), bus factor per person and a health score. [`tests/`](tests) plant every kind of problem in a fictional company and check the judge finds each one, and that fixing them brings the score to 100.

## What didn't work

- **Permissions on paper ≠ permissions in reality.** The first comparison of the governance doc with the real repository showed access that didn't match the roles. Now it's a quarterly check.
- **The plan couldn't enforce code owners.** CODEOWNERS stays anyway: it documents ownership and enforces the day the plan changes.
- **Docs said "pending" about finished work.** That's why check B exists.

## Files

| Path | What it is |
|---|---|
| [`kit/`](kit) | The starter kit: templates, six system docs, `AGENTS.md`, CODEOWNERS example |
| [`src/os.js`](src/os.js) | Judge, truck test, bus factor, health score, fix routing |
| [`src/company.js`](src/company.js) | Fictional 7-area company with planted drift |
| [`tests/`](tests) | `node --test tests/*.test.js` |

## Same system, my own startup

[Rafónica](https://rafonica.com) runs on the same pattern: a system folder (architecture, data model, infrastructure, contracts between processes, AI protocol, decision log) and one doc per flow.

---
Part of [Jack Zorola's portfolio](https://jackzorola10.github.io). Rewritten from a real company's documentation system; the demo company, people and processes are fictional.
