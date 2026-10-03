# 💸 The most expensive debt is often a mechanism, not a loan

**▶ [Open the calculator](https://jackzorola10.github.io/projects/true-cost-of-credit/)** · runs entirely in your browser

A "small" fee every payday, paying one card with another, "interest-free" months that cost you a discount: none of them feel like debt, and none advertise an annual rate. This tool turns each into its **effective annual rate (EAR)**, the cost if you keep doing it, so they can be compared and ranked.

![Tests](https://img.shields.io/badge/tests-10%20passing-2ea043) ![Dependencies](https://img.shields.io/badge/dependencies-0-blue)

## The one formula

```
EAR = (1 + cost per period) ^ (periods per year) − 1
```

The skill is in getting the *cost per period* right: measured on the cash you actually receive, with VAT on fees and interest, and with upfront fees subtracted from what you got.

## Mechanisms covered

| Mechanism | How the rate is found |
|---|---|
| Payroll advance | fee ÷ amount, compounded over pay cycles |
| Card rolled through a payment terminal | (fee + VAT) ÷ cash received, compounded monthly |
| Revolving card balance | monthly rate × (1 + VAT), compounded |
| Installment loan | internal rate of return of the payment schedule (upfront fees included) |
| "Interest-free" months | IRR of installments vs. the discounted cash price you gave up |
| Credit line with a fixed fee | (fee + interest, with VAT) ÷ balance actually used |

Plus a **debt ladder** (most expensive first) and a **break-the-cycle** payback: how many months until absorbing a rolling advance once pays for itself.

## Files

| Path | What it is |
|---|---|
| [`src/credit.js`](src/credit.js) | EAR, a robust IRR (bisection), the six mechanisms, ladder and payback |
| [`tests/`](tests) | `node --test tests/*.test.js`, checked against known loan math |

Educational tool, not financial advice. For loans, compare with the CAT the lender discloses.

---
Part of [Jack Zorola's portfolio](https://jackzorola10.github.io).
