// Interactive page: six calculators, a debt ladder, and the break-the-cycle payback.
(() => {
  const C = Credit;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const money = n => '$' + Math.round(n).toLocaleString('en-US');
  const pct = n => (n >= 1000 ? Math.round(n).toLocaleString('en-US') : n.toLocaleString('en-US', { maximumFractionDigits: 1 })) + '%';

  // Each mechanism: inputs (pct = typed as %), the calculator, and extra facts to show.
  const MECH = {
    advance: {
      tab: 'Payroll advance', hint: 'An advance on your salary, repaid from the next paycheck, with a fee each time.',
      fields: [{ k: 'amount', l: 'Amount advanced', v: 10000 }, { k: 'fee', l: 'Fee per advance', v: 300 }, { k: 'cyclesPerYear', l: 'Pay cycles per year', v: 24, s: '52 weekly · 26 biweekly · 24 twice a month · 12 monthly' }],
      run: p => C.payrollAdvance(p), facts: r => [[money(r.costPerYear), 'paid in fees per year if you keep rolling it']],
    },
    terminal: {
      tab: 'Card via terminal', hint: 'Charging your own card through a payment terminal to get cash and pay another card.',
      fields: [{ k: 'needed', l: 'Cash you need', v: 10000 }, { k: 'feeRate', l: 'Terminal fee (%)', v: 3.5, pct: true }, { k: 'tax', l: 'VAT on the fee (%)', v: 16, pct: true }],
      run: p => C.terminalRoll(p), facts: r => [[money(r.toProcess), 'to process'], [money(r.cost), 'cost each time']],
    },
    revolving: {
      tab: 'Revolving balance', hint: 'Leaving part of a credit card balance unpaid from one month to the next.',
      fields: [{ k: 'monthlyRate', l: 'Monthly interest rate (%)', v: 4.5, pct: true, s: 'Annual rate ÷ 12, as shown on your statement' }, { k: 'tax', l: 'VAT on interest (%)', v: 16, pct: true }, { k: 'balance', l: 'Balance you carry', v: 15000 }],
      run: p => C.revolving(p), facts: r => [[money(r.costPerMonth), 'interest + VAT per month']],
    },
    loan: {
      tab: 'Installment loan', hint: 'A car, appliance or personal loan with fixed monthly payments.',
      fields: [{ k: 'price', l: 'Cash price', v: 300000 }, { k: 'down', l: 'Down payment', v: 60000 }, { k: 'payment', l: 'Monthly payment', v: 7000 }, { k: 'n', l: 'Number of payments', v: 60 }, { k: 'fees', l: 'Upfront fees (opening, insurance paid upfront)', v: 0 }],
      run: p => C.installmentLoan(p), facts: r => [[money(r.totalPaid), 'total you pay'], [r.multiple + '×', 'the cash price'], [money(r.interestPaid), 'above the price']],
    },
    msi: {
      tab: '"Interest-free" months', hint: 'Paying in "interest-free" installments when paying cash would have earned a discount.',
      fields: [{ k: 'cashPrice', l: 'Price if you pay cash today (with discount)', v: 10800 }, { k: 'installment', l: 'Monthly installment', v: 1000 }, { k: 'n', l: 'Number of installments', v: 12 }],
      run: p => C.interestFree(p), facts: r => [[money(r.forgone), 'discount you give up']],
    },
    line: {
      tab: 'Line with a fee', hint: 'A credit line that charges a fixed monthly fee, measured against what you actually use.',
      fields: [{ k: 'feePerMonth', l: 'Fixed fee per month', v: 99 }, { k: 'averageBalance', l: 'Average balance used', v: 2000 }, { k: 'monthlyRate', l: 'Monthly interest on top (%)', v: 0, pct: true }, { k: 'tax', l: 'VAT (%)', v: 16, pct: true }],
      run: p => C.lineFee(p), facts: () => [],
    },
  };
  let current = 'advance';
  let last = null;
  const ladder = [];

  function readParams(m) {
    const p = {};
    $('fields').querySelectorAll('input[data-k]').forEach(i => { const f = m.fields.find(x => x.k === i.dataset.k); const n = Number(i.value); p[f.k] = f.pct ? n / 100 : n; });
    return p;
  }

  function renderTabs() {
    $('tabs').innerHTML = Object.entries(MECH).map(([k, m]) => `<button type="button" data-m="${k}" aria-pressed="${k === current}">${esc(m.tab)}</button>`).join('');
    $('tabs').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { current = b.dataset.m; renderTabs(); renderFields(); }));
  }
  function renderFields() {
    const m = MECH[current];
    $('fields').innerHTML = `<p class="muted" style="margin:0">${esc(m.hint)}</p>` + m.fields.map(f => `<label>${esc(f.l)}<input type="number" min="0" step="any" value="${f.v}" data-k="${f.k}">${f.s ? `<small>${esc(f.s)}</small>` : ''}</label>`).join('');
    $('fields').querySelectorAll('input').forEach(i => i.addEventListener('input', compute));
    compute();
  }
  function compute() {
    const m = MECH[current];
    const r = m.run(readParams(m));
    last = { label: m.tab, ear: r.ear };
    const ok = Number.isFinite(r.ear);
    const pos = ok ? Math.min(100, (Math.log10(1 + Math.max(0, r.ear)) / Math.log10(1001)) * 100) : 0;
    $('result').innerHTML = ok ? `
      <div class="eyebrow">Effective annual rate</div>
      <div class="big">${pct(r.ear)} <span>a year</span></div>
      <p class="sub">${pct(r.perPeriod)} ${esc(r.periodLabel)}, compounded.</p>
      <div class="heat"><i style="left:calc(${pos}% - 2px)"></i></div><div class="heat-labels"><span>0%</span><span>10%</span><span>100%</span><span>1,000%</span></div>
      <div class="facts">${m.facts(r).map(([b, s]) => `<div><b>${esc(b)}</b><span>${esc(s)}</span></div>`).join('')}</div>
      <div class="formula">${esc(r.formula)}</div>
      <div class="add"><input id="label" value="${esc(m.tab)}" aria-label="Name for your ladder"><button class="btn" type="button" id="add">Add to my ladder</button></div><p class="small" id="added" aria-live="polite" style="margin:8px 0 0"></p>`
      : '<p class="muted">Check the numbers: some value is missing or zero.</p>';
    const add = $('add');
    if (add) add.addEventListener('click', () => {
      const label = $('label').value || m.tab;
      ladder.push({ label, ear: r.ear }); renderLadder();
      const rank = C.ladder(ladder).findIndex(x => x.label === label && x.ear === r.ear) + 1;
      $('added').innerHTML = `Added: #${rank} of ${ladder.length} in <a href="#ladder">your ladder ↓</a>`;
    });
  }

  function renderLadder() {
    if (!ladder.length) { $('ladder-list').innerHTML = '<p class="muted" style="margin:0">Empty. Use "Add to my ladder" on any calculator above.</p>'; return; }
    const sorted = C.ladder(ladder.map((x, i) => ({ ...x, i })));
    const max = Math.max(...sorted.map(x => x.ear), 1);
    $('ladder-list').innerHTML = sorted.map(x => `<div class="ladder-row"><span class="n">#${x.rank}</span><span>${esc(x.label)}</span><div class="track"><div class="fill" style="width:${(x.ear / max) * 100}%"></div></div><b>${pct(x.ear)}</b><button type="button" data-i="${x.i}" aria-label="Remove ${esc(x.label)}">×</button></div>`).join('')
      + `<p class="muted small" style="margin:12px 0 0">Pay the minimum everywhere and send every extra peso to <b style="color:var(--ink)">${esc(sorted[0].label)}</b>.</p>`;
    $('ladder-list').querySelectorAll('button[data-i]').forEach(b => b.addEventListener('click', () => { ladder.splice(Number(b.dataset.i), 1); renderLadder(); }));
  }

  function renderBreak() {
    const r = C.breakTheCycle({ lumpSum: Number($('lump').value), savedPerMonth: Number($('saved').value) });
    $('break-out').innerHTML = r.months === null ? '<p class="muted">Enter the monthly fees you\'d stop paying.</p>' : `
      <div class="eyebrow">Pays for itself in</div>
      <div class="big">${r.months} <span>months</span></div>
      <p class="sub">After that, ${money(r.savedPerYear)} a year stays with you instead of the lender, every year.</p>`;
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderTabs(); renderFields(); renderLadder();
    ['lump', 'saved'].forEach(id => $(id).addEventListener('input', renderBreak));
    renderBreak();
  });
})();
