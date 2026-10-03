# 📚 A video proves someone said it. It doesn't prove it's true.

**▶ [Open the interactive page](https://jackzorola10.github.io/projects/annotated-research-library/)** · **[Download the starter kit](https://jackzorola10.github.io/projects/annotated-research-library/annotated-research-library-kit.zip)**

A method to keep what you read, watch and listen to from evaporating, and to always know whether an idea is a fact, a model, an opinion or a story. I use it to make decisions in my own projects.

![Tests](https://img.shields.io/badge/tests-10%20passing-2ea043) ![Dependencies](https://img.shields.io/badge/dependencies-0-blue)

## The method

- **The original is never edited.** Annotations live in a separate file.
- **Every claim gets an ID** (`SRC-003·A7`) and a type: 📊 data · 🧩 model · 🧭 thesis · 📎 anecdote.
- **Lifecycle:** captured → annotated → verified → applied, derived from content, not typed by hand.
- **Critical reading and verification are separate steps.** You need both.
- **Tensions log:** validations, contradictions, nuances and clashes with decisions, each with a hypothesis. Most contradictions are different years, markets, definitions or incentives.
- **Source → synthesis → application.** A synthesis needs **3+ independent sources**: two sources citing the same study count once.
- **The library informs, it doesn't decide.**

## In this folder

| Path | What it is |
|---|---|
| [`kit/`](kit) | The starter kit: protocol, source and synthesis templates, tensions log, index |
| [`src/library.js`](src/library.js) | Claim IDs, independence (shared primaries collapse), synthesis gate, lifecycle, audit |
| [`src/demo-library.js`](src/demo-library.js) | A fictional six-source library on one question |
| [`tests/`](tests) | `node --test tests/*.test.js` |

---
Part of [Jack Zorola's portfolio](https://jackzorola10.github.io). Every source, author, study and number in the demo is fictional.
