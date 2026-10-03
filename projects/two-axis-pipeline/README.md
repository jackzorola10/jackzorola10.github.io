# 🎙️ The nightly job that could erase weeks of sales work

**▶ [Open the interactive page](https://jackzorola10.github.io/projects/two-axis-pipeline/)** · built for **[Rafónica](https://rafonica.com)**, my creator-marketplace startup

Rafónica connects nano and micro content creators with local businesses that have never done influencer marketing. Robots measure creators on a schedule; a person builds every relationship. Store both in one "status" field and the robot overwrites the person. This is the data model that prevents it.

![Tests](https://img.shields.io/badge/tests-10%20passing-2ea043) ![Dependencies](https://img.shields.io/badge/dependencies-0-blue)

## The model

| Axis | Values | Who writes it |
|---|---|---|
| **Data state** | Not captured → Captured → Measured · Down | Automation only |
| **Relationship state** | Not contacted → In outreach → In conversation → Agreement sent → **Active** · Paused · Declined · Do not contact | People only |

A creator can be *Measured + Active* (ideal), *Down + Active* (signed, then deleted the account: call them, don't delete them) or *Measured + Do not contact* (perfect data you can't use). One field can't represent that.

## Gates are filters

| Gate | Exact rule |
|---|---|
| Ready for outreach | Measured · has a contact channel · posted in the last 30 days · no quality flag · not contacted · not excluded |
| Sellable inventory | Active (signed agreement) · account not down · refreshed in the last 30 days · not excluded |

If it can't be written as a filter, it isn't a gate. It's an opinion.

## Rules between processes

1. Scripts never write a relationship. 2. People never write the data state. 3. Enrichment never overwrites. 4. Every write checks the privacy exclusion list first. 5. If that list can't be read, nothing runs (fail closed). 6. Nobody is offered to a business without a signed agreement.

Reach is the **median** of non-pinned videos: one viral video shouldn't define a creator.

## Files

| Path | What it is |
|---|---|
| [`src/pipeline.js`](src/pipeline.js) | Both axes, events and who may fire them, the legacy one-field model, gates, exclusion, reach |
| [`src/creators.js`](src/creators.js) | Fictional creators |
| [`tests/`](tests) | `node --test tests/*.test.js` |

---
Part of [Jack Zorola's portfolio](https://jackzorola10.github.io). The architecture is Rafónica's; creators and numbers in the demo are fictional.
