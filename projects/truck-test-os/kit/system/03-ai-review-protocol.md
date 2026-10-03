# System · 03 · AI review protocol ("the judge")

Any AI assistant runs this checklist:
1. after creating or editing a doc, before ending the session;
2. when asked to audit an area or the whole system;
3. **the first time it visits an area:** list the specific questions the docs themselves reveal are unanswered (blurry boundaries with another area, unconfirmed tools, empty continuity). Not generic questions: concrete gaps.

The judge **reports and proposes**. It never silently fixes a doc that belongs to another area.

## Checklist
| | Check | Question |
|---|---|---|
| A | Freshness | Do the date and status still match reality? Is a Live doc unreviewed for 90+ days, or a Draft stuck for 45+? |
| B | Coherence | Does a Live doc still describe something as "pending" or "to be built"? |
| C | Reciprocity | If a process says it affects another area, does that area's master reference it back? |
| D | Tools | Does every tool it needs exist in the tool map, and is it connected? Verify against the real system when possible. |
| E | Ownership | Is the lead or runner a real, active person? |
| F | Coverage | Is every process listed in its area master (no orphans), and every listed process real (no ghosts)? |
| G | Continuity | Is the continuity section answered honestly? Is the process run by a single person? |

## Reporting
Write findings in the doc's **Open issues** section. If there are none, write `No issues found · last review: <date>`: a doc without a review date is indistinguishable from one never reviewed. Findings that touch another area go to its owner, never into their doc directly.
