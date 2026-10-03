// Interactive page: 30-day plan + go-live gate, ramp simulator, deal calculator.
(() => {
  const L = Launch;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const mxn = n => '$' + Math.round(n).toLocaleString('en-US');
  const gateState = {};

  // --- 30-day plan ---
  function renderGantt() {
    const head = ['', 'Week 1', 'Week 2', 'Week 3', 'Week 4'].map(h => `<div class="h">${h}</div>`).join('');
    const rows = L.PLAN.map(s => `<div class="s">${esc(s.stream)}</div>` + [1, 2, 3, 4].map(w => {
      const t = s.tasks.filter(x => x.week === w);
      return `<div class="c${t.length ? ' on' : ''}">${t.map(x => esc(x.task)).join('<br>')}</div>`;
    }).join('')).join('');
    $('gantt').innerHTML = head + rows;
  }

  function renderGate() {
    $('gate').innerHTML = L.GATE.map(g => `<label class="gate-item"><input type="checkbox" data-k="${g.key}" ${gateState[g.key] ? 'checked' : ''}><span>${esc(g.label)}</span></label>`).join('');
    $('gate').querySelectorAll('input').forEach(i => i.addEventListener('change', () => { gateState[i.dataset.k] = i.checked; renderDoor(); }));
    renderDoor();
  }
  function renderDoor() {
    const g = L.gate(gateState);
    const door = $('door');
    door.classList.toggle('open', g.ready);
    door.innerHTML = g.ready
      ? '<div class="big">💊</div><h3>Open for business</h3><p class="muted small" style="margin:0">Every gate item is true. Day 30: the pharmacy sells.</p>'
      : `<div class="big">🚪</div><h3>${g.done} of ${g.total} ready</h3><p class="muted small" style="margin:0">Still missing: ${esc(g.missing[0])}${g.missing.length > 1 ? ` (+${g.missing.length - 1} more)` : ''}.</p><button class="btn ghost" type="button" id="tick-all" style="margin-top:6px">Tick everything</button>`;
    const t = $('tick-all');
    if (t) t.addEventListener('click', () => { L.GATE.forEach(x => { gateState[x.key] = true; }); renderGate(); });
  }

  // --- ramp simulator ---
  function renderRamp() {
    const start = Number($('start').value), growth = Number($('growth').value) / 100, stop = Number($('stop').value), target = Number($('target').value);
    $('v-start').textContent = mxn(start); $('v-growth').textContent = (growth * 100).toFixed(1) + '%';
    $('v-stop').textContent = stop ? `month ${stop}` : 'never'; $('v-target').textContent = mxn(target);
    const months = 18;
    const curve = L.ramp({ start, growth, months, stopSellingAt: stop || null, decay: -0.08 });
    const sold = stop ? L.ramp({ start, growth, months }) : null;
    const W = 560, H = 300, Lp = 56, R = 12, T = 14, B = 30;
    const max = Math.max(target * 1.15, ...curve, ...(sold || []));
    const x = i => Lp + (i / (months - 1)) * (W - Lp - R);
    const y = v => H - B - (v / max) * (H - T - B);
    const path = arr => arr.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    const ink = css('--ink'), muted = css('--muted'), line = css('--line-2');
    const ticks = [0, .25, .5, .75, 1].map(f => { const v = max * f; return `<line x1="${Lp}" y1="${y(v)}" x2="${W - R}" y2="${y(v)}" stroke="${line}" stroke-width=".6"/><text x="${Lp - 6}" y="${y(v) + 4}" text-anchor="end" style="font:10px 'Space Mono',monospace;fill:${muted}">${v >= 1000 ? Math.round(v / 1000) + 'k' : Math.round(v)}</text>`; }).join('');
    const xt = [1, 6, 12, 18].map(m => `<text x="${x(m - 1)}" y="${H - 10}" text-anchor="middle" style="font:10px 'Space Mono',monospace;fill:${muted}">m${m}</text>`).join('');
    const hit = L.monthsToTarget(curve, target);
    $('chart').innerHTML = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Monthly sales curve against the target">
      ${ticks}${xt}
      <line x1="${Lp}" y1="${y(target)}" x2="${W - R}" y2="${y(target)}" stroke="${css('--pink')}" stroke-width="2" stroke-dasharray="6 5"/>
      <text x="${W - R}" y="${y(target) - 6}" text-anchor="end" style="font:700 10.5px 'Space Mono',monospace;fill:${css('--pink')}">target ${mxn(target)}</text>
      ${sold ? `<path d="${path(sold)}" fill="none" stroke="${muted}" stroke-width="1.5" stroke-dasharray="3 4"/>` : ''}
      <path d="${path(curve)}" fill="none" stroke="${css('--lilac')}" stroke-width="3"/>
      ${curve.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="${hit === i + 1 ? 6 : 2.5}" fill="${hit === i + 1 ? css('--lime') : css('--lilac')}" stroke="${ink}" stroke-width="${hit === i + 1 ? 1.5 : 0}"/>`).join('')}
    </svg>`;
    const peak = Math.max(...curve);
    $('readout').innerHTML = `<div><b>${hit ? 'Month ' + hit : 'Never'}</b><span>reaches the target</span></div><div><b>${mxn(curve[11])}</b><span>sales in month 12</span></div><div><b>${mxn(curve[months - 1])}</b><span>month 18${stop ? ` (peak ${mxn(peak)})` : ''}</span></div>`;
  }

  // --- deal calculator ---
  const FIELDS = [
    { k: 'ticket', label: 'Average ticket (MXN)', v: 600, step: 50 },
    { k: 'ordersPerDay', label: 'Orders per day', v: 12, step: 1 },
    { k: 'shelfShare', label: 'Sales from the shelf (%)', v: 80, step: 5, pct: true },
    { k: 'shelfMargin', label: 'Shelf gross margin (%)', v: 25, step: 1, pct: true },
    { k: 'aisleMargin', label: 'Endless-aisle margin (%)', v: 15, step: 1, pct: true },
    { k: 'revenueShare', label: 'Revenue share to hospital (%)', v: 8, step: 1, pct: true },
    { k: 'monthlyCosts', label: 'Site costs per month (MXN)', v: 25000, step: 1000 },
  ];
  function renderInputs() {
    $('inputs').innerHTML = FIELDS.map(f => `<label>${esc(f.label)}<input type="number" min="0" step="${f.step}" value="${f.v}" data-k="${f.k}"></label>`).join('');
    $('inputs').querySelectorAll('input').forEach(i => i.addEventListener('input', renderDeal));
  }
  function renderDeal() {
    const p = {};
    $('inputs').querySelectorAll('input').forEach(i => { const f = FIELDS.find(x => x.k === i.dataset.k); const n = Number(i.value) || 0; p[f.k] = f.pct ? n / 100 : n; });
    const d = L.dealSplit(p);
    const rows = [['Sales', d.revenue, css('--ink')], ['From the shelf', d.shelf, css('--lilac')], ['Endless aisle', d.aisle, css('--pink')], ['Gross profit', d.grossProfit, css('--lime')], ['Hospital share', d.hospital, css('--warn')], ['Operator profit', d.operator, d.operator >= 0 ? css('--ok') : css('--bad')]];
    const max = Math.max(1, d.revenue);
    $('money').innerHTML = rows.map(([l, v, c]) => `<div class="mrow"><span>${l}</span><div class="track"><div class="fill" style="width:${Math.max(0, v) / max * 100}%;background:${c}"></div></div><b>${mxn(v)}</b></div>`).join('');
    $('deal-readout').innerHTML = `<div><b>${d.breakEvenOrdersPerDay === null ? 'No break-even' : d.breakEvenOrdersPerDay + ' / day'}</b><span>orders to break even</span></div><div><b>${mxn(d.hospital)}</b><span>to the hospital this month</span></div>`;
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderGantt(); renderGate();
    ['start', 'growth', 'stop', 'target'].forEach(id => $(id).addEventListener('input', renderRamp));
    document.querySelectorAll('.presets button').forEach(b => b.addEventListener('click', () => { $('growth').value = b.dataset.g; renderRamp(); }));
    renderRamp(); renderInputs(); renderDeal();
    document.addEventListener('themechange', () => { renderRamp(); renderDeal(); });
  });
})();
