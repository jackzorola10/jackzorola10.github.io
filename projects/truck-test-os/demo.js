// Interactive page: company map, the judge (checks A–G), the truck test and bus factor.
(() => {
  const OS = TruckOS;
  const org = DemoOrg;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const people = new Map(org.people.map(p => [p.id, p]));
  const areaBy = new Map(org.areas.map(a => [a.code, a]));
  const all = OS.judge(org);
  const state = { revealed: new Set(), running: false, asArea: 'PPL', selected: 'PPL', removed: new Set() };
  const SEV = { high: 'bad', medium: 'warn', low: '' };

  const shown = () => all.filter(f => state.revealed.has(f.check));

  function areaStatus(code) {
    const fs = shown().filter(f => f.area === code);
    if (!state.revealed.size) return 'idle';
    if (fs.some(f => f.severity === 'high')) return 'high';
    return fs.length ? 'some' : 'clean';
  }

  function renderMap() {
    const W = 520, H = 400, cx = W / 2, cy = H / 2 + 6, R = 150;
    const pos = new Map(org.areas.map((a, i) => { const t = -Math.PI / 2 + (i / org.areas.length) * Math.PI * 2; return [a.code, { x: cx + R * Math.cos(t), y: cy + R * Math.sin(t) }]; }));
    const edges = new Map();
    for (const p of org.processes) for (const t of p.impacts || []) { if (!pos.has(t) || t === p.area) continue; const k = [p.area, t].sort().join('-'); edges.set(k, (edges.get(k) || 0) + 1); }
    const truck = OS.truckTest(org, [...state.removed]);
    const strandedAreas = new Set(truck.strandedProcesses.map(c => org.processes.find(p => p.code === c).area));
    const ink = css('--ink'), line = css('--line-2'), surface = css('--surface');
    const fill = { idle: surface, clean: css('--lime'), some: css('--lilac'), high: css('--pink') };
    const lines = [...edges].map(([k, n]) => { const [a, b] = k.split('-'); const p1 = pos.get(a), p2 = pos.get(b); return `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${line}" stroke-width="${1 + n}"/>`; }).join('');
    const nodes = org.areas.map(a => {
      const p = pos.get(a.code); const st = areaStatus(a.code); const n = org.processes.filter(x => x.area === a.code).length;
      const sel = a.code === state.selected; const hit = strandedAreas.has(a.code) || truck.leaderless.includes(a.code);
      const textFill = st === 'idle' ? ink : '#1a1a19';
      return `<g class="node" data-a="${a.code}">
        ${hit ? `<circle cx="${p.x}" cy="${p.y}" r="44" fill="none" stroke="${css('--pink')}" stroke-width="3" stroke-dasharray="5 4"/>` : ''}
        <circle cx="${p.x}" cy="${p.y}" r="36" fill="${fill[st]}" stroke="${ink}" stroke-width="${sel ? 2.5 : 1}"/>
        <text x="${p.x}" y="${p.y - 2}" text-anchor="middle" style="font:700 12px 'Space Mono',monospace;fill:${textFill}">${a.code}</text>
        <text x="${p.x}" y="${p.y + 14}" text-anchor="middle" style="font:500 11px 'Schibsted Grotesk',sans-serif;fill:${textFill}">${n} proc.</text>
        <text x="${p.x}" y="${p.y + 56}" text-anchor="middle" style="font:600 12px 'Schibsted Grotesk',sans-serif;fill:${ink}">${esc(a.name)}</text></g>`;
    }).join('');
    const legend = state.revealed.size ? `<text x="12" y="${H + 44}" style="font:400 10.5px 'Space Mono',monospace;fill:${css('--muted')}">lime = clean · lilac = findings · pink = high severity</text>` : '';
    $('map').innerHTML = `<svg class="org" viewBox="0 0 ${W} ${H + 52}" role="img" aria-label="Company areas and the processes that connect them">${lines}${nodes}${legend}</svg>`;
    $('map').querySelectorAll('.node').forEach(n => n.addEventListener('click', () => { state.selected = n.dataset.a; renderMap(); }));
    renderArea();
  }

  function renderArea() {
    const a = areaBy.get(state.selected);
    const lead = people.get(a.lead);
    const procs = org.processes.filter(p => p.area === a.code);
    $('area-detail').innerHTML = `<div style="border-top:1px solid var(--line);margin-top:8px;padding-top:12px">
      <b style="color:var(--ink)">${esc(a.name)}</b> <span class="muted small">· lead: ${esc(lead.name)}${lead.active ? '' : ' (left)'}</span>
      <ul class="stranded">${procs.map(p => { const n = shown().filter(f => f.doc === p.code).length; return `<li><span><span class="mono">${p.code}</span> ${esc(p.name)} <span class="muted small">· ${p.runBy.map(id => esc((people.get(id) || {}).name || id)).join(', ')}</span></span><span class="chips"><span class="chip">${p.status}</span>${state.revealed.size ? `<span class="chip ${n ? 'warn' : 'ok'}">${n ? n + ' finding' + (n > 1 ? 's' : '') : 'clean'}</span>` : ''}</span></li>`; }).join('')}</ul></div>`;
  }

  function renderChecks() {
    $('checks').innerHTML = Object.entries(OS.CHECKS).map(([k, c]) => `<span class="chip${state.revealed.has(k) ? ' on' : ''}" title="${esc(c.question)}">${k} · ${c.name}</span>`).join('');
  }

  function renderFindings() {
    const fs = OS.routeFixes(shown(), state.asArea);
    if (!state.revealed.size) { $('findings').innerHTML = '<p class="muted small">Press <b>Run the judge</b>.</p>'; $('health').textContent = '–'; $('health-bar').style.width = '0'; return; }
    $('findings').innerHTML = `<p class="muted small" style="margin:0 0 4px">${fs.length} finding${fs.length === 1 ? '' : 's'} · ${fs.filter(f => f.route === 'fix-now').length} you can fix now, the rest go to their owners.</p>` + fs.map(f => {
      const owner = people.get(f.approver);
      const route = f.route === 'fix-now' ? '<span class="chip accent">Your area · fix now</span>' : `<span class="chip">Ask ${esc(owner ? owner.name : 'owner')}</span>`;
      return `<div class="finding"><div class="top"><span class="chip ${SEV[f.severity]}">${f.check} · ${f.severity}</span><span class="doc">${esc(f.doc)}</span>${route}</div><p>${esc(f.message)}</p><p class="small"><b style="color:var(--ink)">Fix:</b> ${esc(f.fix)}</p></div>`;
    }).join('');
    const done = state.revealed.size === 7;
    const score = OS.healthScore(done ? all : shown(), org.processes.length);
    $('health').textContent = done ? score : '…';
    $('health-bar').style.width = (done ? score : 0) + '%';
  }

  async function runJudge() {
    if (state.running) return;
    state.running = true; state.revealed.clear(); $('run-judge').disabled = true;
    for (const k of Object.keys(OS.CHECKS)) {
      state.revealed.add(k); renderChecks(); renderFindings(); renderMap();
      await new Promise(r => setTimeout(r, 380));
    }
    state.running = false; $('run-judge').disabled = false; $('run-judge').textContent = '⚖ Run again';
  }

  function renderPeople() {
    $('people').innerHTML = org.people.map(p => `<button type="button" class="person" data-p="${p.id}" aria-pressed="${state.removed.has(p.id)}" ${p.active ? '' : 'disabled'}><i>${p.name.split(' ').map(w => w[0]).join('')}</i><span>${esc(p.name)}<br><small>${esc(p.role)}</small></span></button>`).join('');
    $('people').querySelectorAll('.person').forEach(b => b.addEventListener('click', () => { const id = b.dataset.p; state.removed.has(id) ? state.removed.delete(id) : state.removed.add(id); renderPeople(); renderTruck(); renderMap(); }));
  }

  function renderTruck() {
    if (!state.removed.size) { $('stranded').innerHTML = '<li class="muted">Nobody removed yet. Try the Chief of Staff, then a finance pair.</li>'; return; }
    const t = OS.truckTest(org, [...state.removed]);
    const rows = t.strandedProcesses.map(c => { const p = org.processes.find(x => x.code === c); return `<li><span><span class="mono">${c}</span> ${esc(p.name)}</span><span class="chip bad">${esc(areaBy.get(p.area).name)}</span></li>`; });
    const lead = t.leaderless.map(c => `<li><span>${esc(areaBy.get(c).name)} has no lead</span><span class="chip warn">area</span></li>`);
    $('stranded').innerHTML = (rows.concat(lead).join('') || '<li class="muted">Nothing stranded: someone else can run every process.</li>');
  }

  function renderBusFactor() {
    const bf = OS.busFactor(org); const max = Math.max(1, ...bf.map(x => x.stranded));
    $('busfactor').innerHTML = bf.map(x => `<div class="bf"><span>${esc(x.name)}</span><div class="track"><div class="fill" style="width:${(x.stranded / max) * 100}%"></div></div><b>${x.stranded}</b></div>`).join('');
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('as-area').innerHTML = org.areas.map(a => `<option value="${a.code}" ${a.code === state.asArea ? 'selected' : ''}>${esc(a.name)}</option>`).join('');
    $('as-area').addEventListener('change', e => { state.asArea = e.target.value; renderFindings(); });
    $('run-judge').addEventListener('click', runJudge);
    $('reset-judge').addEventListener('click', () => { state.revealed.clear(); $('run-judge').textContent = '⚖ Run the judge'; renderChecks(); renderFindings(); renderMap(); });
    renderChecks(); renderFindings(); renderMap(); renderPeople(); renderTruck(); renderBusFactor();
    document.addEventListener('themechange', renderMap);
  });
})();
