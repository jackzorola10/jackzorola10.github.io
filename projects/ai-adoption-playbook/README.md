# 🧭 AI adoption that showed up in the hiring plan

**▶ [Open the interactive page](https://jackzorola10.github.io/projects/ai-adoption-playbook/)**

A company-wide AI adoption program for a ~30-person regulated distributor, run as a quarterly company objective. This folder has the playbook, the case (including the department where it failed), and the prioritization model I built from that failure.

![Status](https://img.shields.io/badge/status-completed-7777ff) ![Tests](https://img.shields.io/badge/tests-8%20passing-2ea043) ![Dependencies](https://img.shields.io/badge/dependencies-0-blue)

## Why it existed

The CEO made AI adoption a quarterly objective and assigned it to me. 95% of the company had never used these tools. The baseline I chose wasn't usage: it was **three open hiring requests** in three departments. If the program worked, it should show up there.

## Results

- **200+ labor hours saved** across 30 people, measured against each team's own activity baseline.
- Two departments became self-sufficient. **Their hiring requests were withdrawn without anyone raising it.**
- One department never adopted it. A three-month external engagement produced nothing implemented, and I ended it.

## The playbook

1. **Inventory:** each team lists recurring activities and weekly hours.
2. **Score:** impact × automatability, giving a project list per department.
3. **Read the room:** analyze the team's message history (who asks whom for what, how long it takes) and prepare a one-page brief per person.
4. **Familiarity, not automation:** 1:1 sessions designed so people invent their own uses, two days working alongside each team, and a check-in at two weeks.
5. **Monitor and rebalance:** track usage; when a team hits usage limits, make the workflow efficient.

## The failure, and the model it produced

> I assessed how automatable each process was. I never assessed whether the team that had to adopt it was ready.

Every warning sign was visible in the first month: a late inventory with no numbers, a lead who joined remotely, no usage in week two. [`src/playbook.js`](src/playbook.js) turns those into six weighted **readiness signals** and compares two models:

| Model | Ranks by | On the demo company |
|---|---|---|
| **v1** (what I used) | weighted automatable hours | The team that will stall ranks **#1** |
| **v2** (what I'd use now) | value × readiness, in 4 quadrants | The same team drops to **#5**: *fix readiness first* |

## Files

| Path | What it is |
|---|---|
| [`src/playbook.js`](src/playbook.js) | Value and readiness scoring, quadrants, session-brief builder (Markdown export) |
| [`src/company.js`](src/company.js) | Fictional 6-department company and three fictional role profiles |
| [`demo.js`](demo.js) | Interactive matrix, editable readiness signals, brief generator |
| [`tests/`](tests) | `node --test tests/*.test.js`, including the v1 vs v2 lesson as a test |

## Lessons learned

- **Pick the metric before the tool.** Hiring requests were a better baseline than any usage dashboard.
- **Prepare with their work, not a demo.** Every session opened with a pain the person recognized.
- **Score the team, not just the task.** Automatability says what's possible; readiness says what will happen.
- **A failed rollout can still be a good diagnostic.** The resistance pointed to a team problem that already existed.

---
Part of [Jack Zorola's portfolio](https://jackzorola10.github.io). Rewritten from a real program; the company is unnamed and all departments, people and briefs here are fictional.
