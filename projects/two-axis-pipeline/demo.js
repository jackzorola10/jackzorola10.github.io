// Interactive page: one-field vs two-axis simulator, gates + privacy, median vs mean.
(() => {
  const P = Pipeline;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const fmt = n => Math.round(n).toLocaleString('en-US');

  // --- side by side ---
  const LEGACY_STATES = ['Not captured', 'Captured', 'Measured', 'Contacted', 'In conversation', 'Agreement sent', 'Signed'];
  const ORDER = ['capture', 'measure', 'message', 'reply', 'send', 'sign', 'nightly'];
  let sim;
  const resetSim = () => {
    sim = { legacy: 'Not captured', two: { id: 'demo', handle: '@weekend.brunch', dataState: 'Not captured', relationState: 'Not contacted', excluded: false }, logL: [], logT: [] };
    renderSim();
  };

  function fire(key) {
    const e = P.EVENTS[key];
    const L = P.applyLegacy(sim.legacy, key);
    if (L.lostProgress) {
      sim.logL.push(`<span class="bad">✗ ${esc(e.label)} overwrote "${esc(L.lostProgress)}" with "${esc(L.status)}". The conversation is gone from the pipeline.</span>`);
      flash('legacy');
    } else sim.logL.push(`<span class="ok">✓ ${esc(e.label)} → ${esc(L.status)}</span>`);
    sim.legacy = L.status;
    const r = P.apply(sim.two, key, e.actor);
    if (r.ok) { sim.two = r.creator; sim.logT.push(`<span class="ok">✓ ${esc(r.reason)}</span>${key === 'nightly' && sim.two.relationState !== 'Not contacted' ? ` <span class="ok">· relationship untouched: ${esc(sim.two.relationState)}</span>` : ''}`); }
    else sim.logT.push(`<span class="no">· ${esc(e.label)}: ${esc(r.reason)}</span>`);
    renderSim();
  }
  function flash(id) { const el = $(id); el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }

  const track = (states, current, cls = '') => `<div class="track-states ${cls}">${states.map(s => `<span class="${s === current ? 'on' : ''}">${esc(s)}</span>`).join('')}</div>`;
  function renderSim() {
    $('legacy').innerHTML = `<span class="chip bad">Before</span><h3 style="margin-top:10px">One "pipeline status" field</h3><p class="muted small" style="margin:0">Every process, human or robot, writes the same field.</p>
      <div class="field"><span class="lbl">Pipeline status</span>${track(LEGACY_STATES, sim.legacy)}</div>
      <div class="log">${sim.logL.slice(-8).join('<br>') || '<span class="muted">No events yet.</span>'}</div>`;
    $('twoaxis').innerHTML = `<span class="chip ok">After</span><h3 style="margin-top:10px">Two axes, two owners</h3><p class="muted small" style="margin:0">Robots write the data state. People write the relationship.</p>
      <div class="field"><span class="lbl">Data state · robots only</span>${track(P.DATA, sim.two.dataState)}</div>
      <div class="field"><span class="lbl">Relationship · people only</span>${track(P.RELATION.slice(0, 5), sim.two.relationState, 'rel')}</div>
      <div class="log">${sim.logT.slice(-8).join('<br>') || '<span class="muted">No events yet.</span>'}</div>`;
  }
  function renderEvents() {
    $('events').innerHTML = ORDER.map(k => { const e = P.EVENTS[k]; return `<button type="button" class="btn ghost ${e.actor}" data-e="${k}"><span class="who">${e.actor === 'robot' ? 'robot' : 'person'}</span>${esc(e.label)}</button>`; }).join('');
    $('events').querySelectorAll('button').forEach(b => b.addEventListener('click', () => fire(b.dataset.e)));
  }

  // --- gates and privacy ---
  let creators = JSON.parse(JSON.stringify(DemoCreators.creators));
  function renderGates() {
    const sets = Object.fromEntries(P.GATES.map(g => [g.key, new Set(P.gate(creators, g.key))]));
    $('gate-cards').innerHTML = P.GATES.map(g => `<div class="card gate-card"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px"><b>${esc(g.label)}</b><span class="count">${sets[g.key].size}</span></div><p>${esc(g.rule)}</p></div>`).join('');
    $('rows').innerHTML = creators.map(c => `<tr class="${c.excluded ? 'excluded' : ''}">
      <td class="mono">${esc(c.handle)}<br><span class="muted small">${esc(c.niche)}</span></td>
      <td>${esc(c.dataState)}</td><td>${esc(c.relationState)}</td>
      <td>${c.contactScore ? 'yes' : '<span class="nope">none</span>'}</td>
      <td>${c.daysSincePost}d</td>
      <td>${c.qualityFlag === 'OK' ? 'OK' : `<span class="chip warn">${esc(c.qualityFlag)}</span>`}</td>
      <td>${sets.outreach.has(c.id) ? '<span class="yes">✓</span>' : '<span class="nope">–</span>'}</td>
      <td>${sets.sellable.has(c.id) ? '<span class="yes">✓</span>' : '<span class="nope">–</span>'}</td>
      <td>${c.excluded ? '<span class="chip bad">excluded</span>' : `<button type="button" class="chip" data-x="${c.id}" style="cursor:pointer">Privacy request</button>`}</td></tr>`).join('');
    $('rows').querySelectorAll('[data-x]').forEach(b => b.addEventListener('click', () => { creators = creators.map(c => (c.id === b.dataset.x ? P.exclude(c) : c)); renderGates(); }));
  }
  function tryAdd() {
    const h = $('add-handle').value.trim();
    if (!h) return;
    const r = P.canAdd(h, creators);
    $('add-msg').innerHTML = `<span class="${r.ok ? 'yes' : ''}" style="color:${r.ok ? '' : 'var(--bad)'}">${esc(r.reason)}</span>`;
  }

  // --- median vs mean ---
  function renderReach() {
    const v = DemoCreators.viral;
    const r = P.reach(v.videos, v.followers);
    const max = Math.max(...v.videos.map(x => x.views));
    const counted = v.videos.filter(x => !x.pinned).map(x => x.views);
    const maxCounted = Math.max(...counted);
    const y = n => `${(n / max) * 100}%`;
    $('vbars').innerHTML = v.videos.map(x => `<div class="b ${x.pinned ? 'pinned' : x.views === maxCounted ? 'viral' : ''}" style="height:${y(x.views)}" title="${fmt(x.views)} views${x.pinned ? ' · pinned, excluded' : ''}"></div>`).join('')
      + `<div class="line" style="bottom:${y(r.mean)};border-color:var(--pink)"><span style="color:var(--pink)">mean ${fmt(r.mean)}</span></div>`
      + `<div class="line" style="bottom:${y(r.median)};border-color:var(--ok)"><span style="color:var(--ok)">median ${fmt(r.median)}</span></div>`;
    $('reach-out').innerHTML = `<div><b style="display:block;font:800 26px var(--sans);color:var(--ink)">${r.reachPct}%</b><span class="muted small">reach with the median: what a business can expect</span></div>
      <div><b style="display:block;font:800 26px var(--sans);color:var(--pink)">${r.meanReachPct}%</b><span class="muted small">reach with the mean: inflated ${Math.round(r.mean / r.median * 10) / 10}× by one viral video</span></div>
      <div><b style="display:block;font:800 26px var(--sans);color:var(--ink)">${r.sample} of ${v.videos.length}</b><span class="muted small">videos counted (pinned excluded)</span></div>`;
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderEvents(); resetSim();
    $('reset-sim').addEventListener('click', resetSim);
    $('story').addEventListener('click', async () => {
      resetSim(); $('story').disabled = true;
      for (const k of ['capture', 'measure', 'message', 'reply', 'send', 'nightly']) { fire(k); await new Promise(r => setTimeout(r, 650)); }
      $('story').disabled = false;
    });
    renderGates();
    $('add').addEventListener('click', tryAdd);
    $('add-handle').addEventListener('keydown', e => { if (e.key === 'Enter') tryAdd(); });
    renderReach();
  });
})();
