/**
 * True cost of credit — every mechanism turned into one comparable number:
 * the effective annual rate (EAR), i.e. what it costs per year if you keep doing it.
 *
 *   EAR = (1 + cost per period) ^ (periods per year) − 1
 *
 * The trick is always the same: express the cost as a rate on the money you actually get,
 * per period, then compound it. Mexico-ready: VAT (IVA) on fees and interest, CAT disclosures,
 * "interest-free months" (MSI). Pure functions; runs in Node and in the browser.
 */
const Credit = (() => {
  const round = (n, d = 2) => (Number.isFinite(n) ? Math.round(n * 10 ** d) / 10 ** d : n);
  const ear = (r, n) => Math.pow(1 + r, n) - 1;

  /** Internal rate per period that makes the payments worth `pv` today (bisection, robust). */
  function irr(pv, payments) {
    const npv = r => payments.reduce((s, p, i) => s + p / Math.pow(1 + r, i + 1), 0) - pv;
    if (npv(0) <= 0) return 0; // you pay back no more than you got: no interest
    let lo = 0, hi = 1;
    while (npv(hi) > 0 && hi < 1e6) hi *= 2;
    for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; if (npv(mid) > 0) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  }

  /** Salary/payroll advance repaid from the next paycheck, with a fee each cycle. */
  function payrollAdvance({ amount, fee, cyclesPerYear = 24 }) {
    const r = fee / amount;
    return { name: 'Payroll advance', perPeriod: round(r * 100, 3), periodLabel: 'per pay cycle', ear: round(ear(r, cyclesPerYear) * 100, 1), costPerYear: round(fee * cyclesPerYear), formula: `(1 + ${round(fee, 2)} / ${round(amount, 2)}) ^ ${cyclesPerYear} − 1` };
  }

  /**
   * Paying a card with your own card through a payment terminal, to push the debt a month.
   * The fee is charged on what you process, but what matters is the cash you receive.
   */
  function terminalRoll({ needed, feeRate = 0.035, tax = 0.16 }) {
    const effFee = feeRate * (1 + tax);
    const toProcess = needed / (1 - effFee);
    const cost = toProcess - needed;
    const r = cost / needed;
    return { name: 'Rolling a card through a terminal', toProcess: round(toProcess), cost: round(cost), perPeriod: round(r * 100, 3), periodLabel: 'per month rolled', ear: round(ear(r, 12) * 100, 1), formula: `(1 + ${round(effFee * 100, 3)}% / (1 − ${round(effFee * 100, 3)}%)) ^ 12 − 1` };
  }

  /** Revolving card balance: monthly interest plus VAT on the interest. */
  function revolving({ monthlyRate, tax = 0.16, balance = 0 }) {
    const r = monthlyRate * (1 + tax);
    return { name: 'Revolving card balance', perPeriod: round(r * 100, 3), periodLabel: 'per month, with VAT', ear: round(ear(r, 12) * 100, 1), costPerMonth: round(balance * r), formula: `(1 + ${round(monthlyRate * 100, 2)}% × ${1 + tax}) ^ 12 − 1` };
  }

  /** Installment loan (e.g. a car): solve the rate from price, down payment, payment and term. */
  function installmentLoan({ price, down = 0, payment, n, periodsPerYear = 12, fees = 0 }) {
    const financed = price - down - fees; // upfront fees reduce what you actually receive
    const r = irr(financed, Array(n).fill(payment));
    const totalPaid = down + fees + payment * n;
    return { name: 'Installment loan', perPeriod: round(r * 100, 3), periodLabel: 'per month', ear: round(ear(r, periodsPerYear) * 100, 1), totalPaid: round(totalPaid), multiple: round(totalPaid / price, 2), interestPaid: round(totalPaid - price), formula: 'IRR of the payment schedule, compounded' };
  }

  /**
   * "Interest-free" installments when paying cash would have earned a discount.
   * The discount you give up is the interest.
   */
  function interestFree({ cashPrice, installment, n }) {
    const r = irr(cashPrice, Array(n).fill(installment));
    return { name: '"Interest-free" installments', perPeriod: round(r * 100, 3), periodLabel: 'per month', ear: round(ear(r, 12) * 100, 1), forgone: round(installment * n - cashPrice), formula: 'IRR of paying in installments vs. the cash price' };
  }

  /** A fixed fee for keeping a credit line, measured against the balance you actually use. */
  function lineFee({ feePerMonth, averageBalance, monthlyRate = 0, tax = 0.16 }) {
    const r = (feePerMonth * (1 + tax)) / averageBalance + monthlyRate * (1 + tax);
    return { name: 'Credit line with a fixed fee', perPeriod: round(r * 100, 3), periodLabel: 'per month', ear: round(ear(r, 12) * 100, 1), formula: '(1 + (fee + interest, with VAT) / balance used) ^ 12 − 1' };
  }

  /** Breaking a rolling advance: absorb it once, stop paying the fee forever. */
  function breakTheCycle({ lumpSum, savedPerMonth }) {
    if (!(savedPerMonth > 0)) return { months: null, savedPerYear: 0 };
    return { months: round(lumpSum / savedPerMonth, 1), savedPerYear: round(savedPerMonth * 12) };
  }

  /** Order instruments from most to least expensive: pay down the top first. */
  function ladder(items) {
    return items.filter(x => Number.isFinite(x.ear)).slice().sort((a, b) => b.ear - a.ear).map((x, i) => ({ ...x, rank: i + 1 }));
  }

  return { ear, irr, payrollAdvance, terminalRoll, revolving, installmentLoan, interestFree, lineFee, breakTheCycle, ladder };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Credit;
