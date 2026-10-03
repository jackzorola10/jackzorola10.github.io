# System · 02 · Governance

## Repository
One repository for the whole company (monorepo): everyone syncs one folder and can read everything.

## Roles
| Role | Who | Can |
|---|---|---|
| Global admin | 1–2 people | Merge anything, manage access and CODEOWNERS |
| Area owner | Each area lead | Edit their own folder freely; approve changes to it |
| Reader | Everyone else | Read and download everything |

## Folder ownership
`.github/CODEOWNERS` maps each folder to its owner. With branch protection ("Require review from Code Owners"), Git blocks any change to a folder until its owner approves.

> Check your plan: some Git hosting plans don't enforce code-owner reviews. If yours doesn't, keep the file anyway (it documents ownership and starts enforcing the day you upgrade) and rely on the pull-request discipline below.

## Leaders who don't use Git
They don't have to. Each lead talks to their own AI assistant in plain language ("update the onboarding process: we now also send the welcome kit"). The assistant edits the doc, runs the judge, creates a branch, commits and opens a pull request.
- **Change inside the lead's own area:** the assistant may merge it. The PR stays as history.
- **Change to another area:** the assistant never merges. See below.

## Cross-area approval
1. The assistant opens the pull request.
2. It posts a two-line summary and the link in the owning area's chat channel.
3. The owner approves, asks for changes or rejects, in chat or in the PR.
4. Only then is it merged. No answer in a reasonable time → escalate to the admins, never merge by default.

## Audit access regularly
Real permissions drift from the model on paper. Once a quarter, compare who actually has admin/write access with the roles table, and log the differences.
