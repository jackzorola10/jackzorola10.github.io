# Jack Zorola · Operations portfolio

**▶ Visit the site: [jackzorola10.github.io](https://jackzorola10.github.io)**

Chief of Staff and operations leader. I build the internal machinery of growing companies (new divisions from zero, processes that survive the founder, AI that actually lands in regulated operations) and then leave it running without me.

Everything here comes from real work. Company details are removed, the code is rewritten from scratch, and all data is fictional.

## 🤖 Can Jack help me with…?

Give [`can-jack-help/SKILL.md`](can-jack-help/SKILL.md) to your own AI assistant and ask. It answers with an honest verdict (✅ done it · 🟡 adjacent · 🟠 stretch · ❌ not his area), the evidence, and the gaps. [How to use it →](can-jack-help/)

## Projects

| | Project | What it shows | Try it |
|---|---|---|---|
| 🚚 | [A company that survives losing anyone](projects/truck-test-os/) | A documentation OS with an AI judge and a truck test; downloadable starter kit | [Interactive](https://jackzorola10.github.io/projects/truck-test-os/) |
| 🧭 | [AI adoption that showed up in the hiring plan](projects/ai-adoption-playbook/) | A 30-person AI program, a diagnosed failure, and a value × readiness model you can play with | [Interactive](https://jackzorola10.github.io/projects/ai-adoption-playbook/) |
| 🧾 | [Invoice reconciliation, without the hire](projects/cfdi-reconciler/) | A 4 h/day chore brought down to minutes; CFDI parser + matcher with confidence scoring | [Live demo](https://jackzorola10.github.io/projects/cfdi-reconciler/) |
| 🎂 | [Slack birthday bot on Airtable](projects/slack-birthday-bot/) | Replacing a paid tool with the data you already own; resilient scheduled automation | [Simulator](https://jackzorola10.github.io/projects/slack-birthday-bot/) |

## Ventures

| | Venture | Role |
|---|---|---|
| 🎙️ | [Rafónica](https://rafonica.com): creators ↔ local businesses, consent first | Founder |
| 🏛️ | [La Consultoría](https://laconsultoriaregsan.com): health-regulatory consulting, COFEPRIS and ISO 9001 | Partner |
| 🌙 | [LunaSurfer](https://luna-surfer.com): ticketing for independent bands | Founder and builder |

[LinkedIn](https://www.linkedin.com/in/jackzorola/) · [jackzorola10@gmail.com](mailto:jackzorola10@gmail.com)

## How this repo is organized

```
index.html · projects.json   the gallery (cards are generated from projects.json)
can-jack-help/               the AI skill + its page
projects/<slug>/             one folder per project: README, page, code, tests
assets/                      shared design system
_template/                   starting point for a new project
tools/check.sh               tests + catalog validation + skill zip, run before publishing
```

No build step, no dependencies: plain HTML, CSS and JavaScript, served by GitHub Pages. Tests run with `node --test`.

## License

Code: MIT. Writing and case studies: © Jack Zorola, shared for reading and reference.
