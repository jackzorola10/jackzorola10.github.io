/**
 * Hospital pharmacy launch — the math and the go-live gate, as pure functions.
 *
 * The model: an operator runs a pharmacy inside a partner hospital and sells to anyone
 * who walks in. Each sale pays the hospital a revenue share. If an item isn't on the shelf,
 * the sale is still closed from the operator's central inventory ("endless aisle") instead of
 * sending the customer away. No network, no dependencies; runs in Node and in the browser.
 */
const Launch = (() => {
  const round = (n, d = 0) => Math.round(n * 10 ** d) / 10 ** d;

  /**
   * Monthly revenue curve.
   * growth: monthly growth while the site is actively sold (0.169 = 16.9%).
   * stopSellingAt: month after which active selling and promotions stop (null = never).
   * decay: monthly change after that (negative). Illustrative: a site nobody promotes drifts down.
   */
  function ramp({ start, growth, months = 12, stopSellingAt = null, decay = -0.08 }) {
    const out = [];
    let v = start;
    for (let m = 1; m <= months; m++) {
      if (m > 1) v *= 1 + (stopSellingAt !== null && m > stopSellingAt ? decay : growth);
      out.push(round(v));
    }
    return out;
  }

  /** First month (1-based) the curve reaches the target, or null if it never does. */
  function monthsToTarget(curve, target) {
    const i = curve.findIndex(v => v >= target);
    return i === -1 ? null : i + 1;
  }

  /**
   * Where each month's sales go.
   * All inputs are the reader's own assumptions; the defaults in the demo are illustrative.
   */
  function dealSplit({ ticket, ordersPerDay, days = 30, shelfShare = 0.8, shelfMargin = 0.25, aisleMargin = 0.15, revenueShare = 0.1, monthlyCosts = 0 }) {
    const revenue = ticket * ordersPerDay * days;
    const shelf = revenue * shelfShare;
    const aisle = revenue - shelf;
    const grossProfit = shelf * shelfMargin + aisle * aisleMargin;
    const hospital = revenue * revenueShare;
    const operator = grossProfit - hospital - monthlyCosts;
    const unitContribution = ticket * (shelfShare * shelfMargin + (1 - shelfShare) * aisleMargin - revenueShare);
    const breakEvenOrdersPerDay = unitContribution > 0 ? monthlyCosts / (unitContribution * days) : null;
    return {
      revenue: round(revenue), shelf: round(shelf), aisle: round(aisle), grossProfit: round(grossProfit),
      hospital: round(hospital), operator: round(operator),
      breakEvenOrdersPerDay: breakEvenOrdersPerDay === null ? null : round(breakEvenOrdersPerDay, 1),
    };
  }

  /** The 30-day plan: workstreams in parallel, by week. */
  const PLAN = [
    { stream: 'Regulatory', tasks: [
      { week: 1, task: 'Confirm the site\'s licence or notice of operation and the responsible pharmacist' },
      { week: 2, task: 'File what\'s missing; register the pharmacist for the site' },
      { week: 3, task: 'Controlled-medicine permissions, on their own track' },
    ] },
    { stream: 'Space', tasks: [
      { week: 1, task: 'Turn a forgotten room into a measured floor plan' },
      { week: 2, task: 'Furniture, shelving, storage that meets temperature rules' },
      { week: 3, task: 'Signage inside the hospital and at the entrance: visible from the main flow' },
    ] },
    { stream: 'Team', tasks: [
      { week: 1, task: 'Hire or second embedded operators' },
      { week: 3, task: 'Train on the point of sale, stock counts and selling, not just dispensing' },
    ] },
    { stream: 'Systems', tasks: [
      { week: 2, task: 'Load the catalogue, prices and opening stock for the site' },
      { week: 3, task: 'Point of sale live: split payments, cash closing, stock by location' },
      { week: 4, task: 'Endless aisle: order from central inventory to this branch, not to a home' },
    ] },
    { stream: 'Commercial', tasks: [
      { week: 2, task: 'Agree the revenue share and reporting with the hospital' },
      { week: 4, task: 'Launch promotions and tell doctors, nurses and admissions the pharmacy exists' },
    ] },
  ];

  /** Go-live gate: the site opens only when every item is true. */
  const GATE = [
    { key: 'licence', label: 'Licence or notice of operation valid for this address' },
    { key: 'pharmacist', label: 'Responsible pharmacist registered for the site' },
    { key: 'space', label: 'Space finished, clean and compliant (storage, temperature)' },
    { key: 'visible', label: 'Visible from the main patient flow, with signage' },
    { key: 'team', label: 'Operators trained on the point of sale and on selling' },
    { key: 'pos', label: 'Point of sale live with prices, stock and payment methods' },
    { key: 'aisle', label: 'Endless aisle tested: an out-of-stock item ordered to the branch' },
    { key: 'promo', label: 'First promotion calendar agreed with the hospital' },
  ];

  function gate(state = {}) {
    const missing = GATE.filter(g => !state[g.key]).map(g => g.label);
    return { ready: missing.length === 0, missing, done: GATE.length - missing.length, total: GATE.length };
  }

  return { ramp, monthsToTarget, dealSplit, PLAN, GATE, gate };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Launch;
