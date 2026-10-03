# System · 01 · Tool map

Where real information lives, and how an AI assistant reaches it. Process docs link here instead of re-describing tools.

**Confirmed** = at least one live process uses it. **Unverified** = available, but no process confirmed yet: ask before treating it as a source of truth.

| System | What lives there | Areas | Connector / access | Status |
|---|---|---|---|---|
| <Back office> | Orders, inventory, invoicing | All | <connector name> | Confirmed |
| <CRM> | Partners, pipeline, follow-ups | Sales | <connector name> | Unverified |
| <Chat> | Area channels, approvals | All | <connector name> | Confirmed |

## Maintenance
- When a lead confirms an unverified system, update the status and log it in `04 - Decision Log.md`.
- If a process needs a connector that isn't here, say so in that process's "Tools" section. It can't run with AI until it's installed.
