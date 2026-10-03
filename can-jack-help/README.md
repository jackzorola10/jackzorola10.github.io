# Can Jack help me with…?

A skill file you give to your own AI assistant so it can answer one question honestly: **can Jack help with my problem?**

It contains his experience, cases with real numbers, skills with honest levels (including what is *not* his area), and rules that stop the AI from overselling.

## Use it in 30 seconds

**Any chatbot (ChatGPT, Gemini, Claude…):** paste this prompt:

```
Read https://raw.githubusercontent.com/jackzorola10/jackzorola10.github.io/main/can-jack-help/SKILL.md
and follow its instructions to answer: Can Jack help me with <your problem>?
```

If your assistant can't open links, copy the contents of [`SKILL.md`](SKILL.md) into the chat instead.

**Claude (claude.ai):** download [`can-jack-help.zip`](can-jack-help.zip) → *Settings → Capabilities → Skills → Upload skill*. Then just ask: *"Can Jack help me with…?"*

**Claude Code:**

```bash
mkdir -p ~/.claude/skills/can-jack-help && curl -fsSL https://raw.githubusercontent.com/jackzorola10/jackzorola10.github.io/main/can-jack-help/SKILL.md -o ~/.claude/skills/can-jack-help/SKILL.md
```

## What you'll get

A verdict (✅ done it · 🟡 adjacent · 🟠 stretch · ❌ not his area), the evidence behind it, the honest gaps, and a next step.
