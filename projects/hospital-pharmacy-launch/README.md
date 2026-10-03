# 💊 A new revenue line, built inside other people's hospitals

**▶ [Open the interactive page](https://jackzorola10.github.io/projects/hospital-pharmacy-launch/)**

How I took a business model in its infancy (pharmacies we operated inside partner hospitals) and turned it into a standalone revenue line: five hospital partners, up to four sites at once, each opened in about 30 days.

![Status](https://img.shields.io/badge/status-completed-7777ff) ![Tests](https://img.shields.io/badge/tests-8%20passing-2ea043) ![Dependencies](https://img.shields.io/badge/dependencies-0-blue)

## Results

- **30 days** from a forgotten room to a selling pharmacy.
- First site: **16.9% average monthly growth**, reaching **8×** the results the hospital achieved running it itself.
- Four more clinics averaging **~$200K MXN a month each** from zero sales (best: $300K+). Average order value **×1.7**.
- A hybrid team of **4 in-house + 8 embedded operators**; a point-of-sale product co-designed with engineering.

## The model

Sell to everyone in the building. Most sales come off the pharmacy's own shelf (stock we owned at every site but one); if an item isn't there, the sale closes anyway from central inventory, delivered to the branch. Every sale pays the hospital a **revenue share**, so the partner wants the pharmacy to sell.

## What I learned the hard way

A pharmacy inside a hospital doesn't sell itself. Without active selling and rotating promotions, sales collapse. Without traffic and visibility, it ends up in a corner gathering dust. That's why visibility, a promotion calendar and operators trained to sell are part of the go-live gate.

## In this folder

| Path | What it is |
|---|---|
| [`src/launch.js`](src/launch.js) | Ramp curve, months to target, deal split and break-even, the 30-day plan and the go-live gate |
| [`demo.js`](demo.js) | Plan + gate, ramp simulator, deal calculator |
| [`tests/`](tests) | `node --test tests/*.test.js` |

Calculator defaults are illustrative, not the real deal terms.

---
Part of [Jack Zorola's portfolio](https://jackzorola10.github.io). Rewritten from a real business line; hospitals and the company are unnamed.
