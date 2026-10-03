# Instructions for AI assistants working in this repository

You are helping maintain a company's process documentation. Read this before editing anything.

1. **Read first:** `00 - Company.md`, `System/00 - Architecture.md`, and the master doc of the area you were asked to work on.
2. **New docs start from `_Templates/`.** Never from scratch, so every doc is comparable.
3. **Never store data.** If you are about to paste customer, employee, patient or financial records, stop: link to the system in `System/01 - Tool Map.md` instead.
4. **Stay in your lane.** Edit freely only inside the area of the person you are working for. For any other area, open a proposal (pull request) and notify its lead. Never merge it yourself. See `System/02 - Governance.md`.
5. **Run the judge before you finish.** Run every check in `System/03 - AI Review Protocol.md` on what you touched and write the result in the doc's "Open issues" section, even if it's "No issues found · <date>".
6. **Verify, don't assume.** If a tool is connected, check the real schema or record before declaring a field or a count. Say "unverified" when you couldn't.
7. **Log structural decisions** in `System/04 - Decision Log.md`. Append only, never rewrite history.
8. **Update the date, status and change log** of every doc you change.
