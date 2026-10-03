// Interactive page: v1/v2 prioritization model, readiness checklist, session brief generator.
(() => {
  const P = Playbook;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const departments = JSON.parse(JSON.stringify(DemoCompany.departments)); // editable copy
  const state = { model: 'v2', selected: 'log', role: DemoCompany.profiles[0].id };
  const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const QCOLOR = { go: '--lilac', prepare: '--pink', quick: '--lime', park: '--muted' };

  const NOTES = {
    v1: 'v1 ranks departments by weighted hours that could be automated. It\'s what I used. Notice who comes out on top.',
    v2: 'v2 discounts that value by the readiness of the team that has to adopt it, and sorts departments into four quadrants. Same data, different first move.',
  };

  function renderModel() {
    document.querySelectorAll('#model .toggle-model button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.m === state.model)));
    $('model-note').textContent = NOTES[state.model];
    const rows = P.scoreDepartments(departments, state.model);
    if (state.model === 'v1') {
      const max = Math.max(...rows.map(r => r.priority));
      $('viz').innerHTML = `<h3 style="margin-bottom:10px">Priority by value</h3>` + rows.map(r => `
        <div class="rank-row${r.id === state.selected ? ' sel' : ''}" data-id="${r.id}">
          <span class="n">#${r.rank}</span><span>${esc(r.name)}</span>
          <div class="track"><div class="fill" style="width:${(r.priority / max) * 100}%"></div></div>
          <span class="v">${r.priority.toFixed(1)}</span>
        </div>`).join('') + '<p class="muted small" style="margin:12px 0 0">Weighted hours per week that could be automated. Readiness isn\'t part of this model.</p>';
    } else {
      renderMatrix(rows);
    }
    $('viz').querySelectorAll('[data-id]').forEach(el => el.addEventListener('click', () => { state.selected = el.dataset.id; renderModel(); }));
    renderPanel(rows.find(r => r.id === state.selected));
  }

  function renderMatrix(rows) {
    const W = 560, H = 380, L = 44, R = 16, T = 18, B = 40;
    const maxV = Math.max(20, ...rows.map(r => r.value));
    const PAD = 42; // keep bubbles and labels at 0 or 100 readiness inside the frame
    const x = r => L + PAD + (r / 100) * (W - L - R - 2 * PAD);
    const y = v => H - B - (v / maxV) * (H - T - B);
    const xm = x(P.READY), ym = y(P.VALUABLE);
    const ink = css('--ink'), line = css('--line-2'), muted = css('--muted');
    const bubbles = rows.map(r => {
      const rad = 10 + r.hours * 0.9;
      const fill = css(QCOLOR[r.quadrant]);
      const sel = r.id === state.selected;
      return `<g data-id="${r.id}" class="bubble-g" style="cursor:pointer">
        <circle class="bubble" cx="${x(r.readiness)}" cy="${y(r.value)}" r="${rad}" fill="${fill}" fill-opacity="${r.quadrant === 'park' ? .35 : .85}" stroke="${ink}" stroke-width="${sel ? 2.5 : 1}"/>
        <text class="lbl" x="${x(r.readiness)}" y="${y(r.value) - rad - 6}" text-anchor="middle" style="fill:${ink}">${esc(r.name)}</text></g>`;
    }).join('');
    $('viz').innerHTML = `<h3 style="margin-bottom:6px">Value × readiness</h3>
      <svg class="matrix" viewBox="0 0 ${W} ${H}" role="img" aria-label="Departments plotted by team readiness (x) and automation value (y)">
        <rect x="${xm}" y="${T}" width="${W - R - xm}" height="${ym - T}" fill="${css('--lilac')}" fill-opacity=".08"/>
        <rect x="${L}" y="${T}" width="${xm - L}" height="${ym - T}" fill="${css('--pink')}" fill-opacity=".1"/>
        <line x1="${xm}" y1="${T}" x2="${xm}" y2="${H - B}" stroke="${line}" stroke-dasharray="4 4"/>
        <line x1="${L}" y1="${ym}" x2="${W - R}" y2="${ym}" stroke="${line}" stroke-dasharray="4 4"/>
        <line x1="${L}" y1="${H - B}" x2="${W - R}" y2="${H - B}" stroke="${line}"/>
        <line x1="${L}" y1="${T}" x2="${L}" y2="${H - B}" stroke="${line}"/>
        <text class="q" x="${W - R - 6}" y="${T + 14}" text-anchor="end" style="fill:${muted}">Go now</text>
        <text class="q" x="${L + 6}" y="${T + 14}" style="fill:${muted}">Fix readiness first</text>
        <text class="q" x="${W - R - 6}" y="${H - B - 8}" text-anchor="end" style="fill:${muted}">Quick wins</text>
        <text class="q" x="${L + 6}" y="${H - B - 8}" style="fill:${muted}">Park</text>
        <text class="q" x="${(L + W - R) / 2}" y="${H - 10}" text-anchor="middle" style="fill:${muted}">Team readiness →</text>
        <text class="q" x="14" y="${(T + H - B) / 2}" text-anchor="middle" transform="rotate(-90 14 ${(T + H - B) / 2})" style="fill:${muted}">Value →</text>
        ${bubbles}
      </svg><p class="muted small" style="margin:6px 0 0">Bubble size = hours per week. Click a bubble.</p>`;
  }

  function renderPanel(r) {
    const d = departments.find(x => x.id === r.id);
    const q = P.QUADRANTS[r.quadrant];
    const acts = P.rankActivities(d.activities);
    $('panel').innerHTML = `
      <div class="eyebrow">${d.people} people · rank #${r.rank} in ${state.model}</div>
      <h3>${esc(d.name)}</h3>
      <div class="muted small">Readiness ${r.readiness}/100</div>
      <div class="meter"><span style="width:${r.readiness}%"></span></div>
      ${state.model === 'v2' ? `<p class="advice ${r.quadrant}"><b>${q.label}.</b> ${q.advice}</p>` : `<p class="advice">v1 doesn't look at readiness. Switch to v2 to see what it hides.</p>`}
      <h4 style="margin:18px 0 4px;font:700 11.5px var(--mono);text-transform:uppercase;letter-spacing:.08em;color:var(--muted)">Readiness signals · click to change</h4>
      ${P.SIGNALS.map(s => `<label class="signal"><input type="checkbox" data-k="${s.key}" ${d.signals[s.key] ? 'checked' : ''}><span>${esc(s.label)}<small>${esc(s.ask)}</small></span><span class="w">+${s.weight}</span></label>`).join('')}
      <h4 style="margin:18px 0 0;font:700 11.5px var(--mono);text-transform:uppercase;letter-spacing:.08em;color:var(--muted)">What to automate first</h4>
      <ul class="acts">${acts.map(a => `<li><span>${esc(a.name)}</span><span>${a.hoursPerWeek} h/wk · ${Math.round(a.automatable * 100)}%</span></li>`).join('')}</ul>`;
    $('panel').querySelectorAll('input[data-k]').forEach(inp => inp.addEventListener('change', () => { d.signals[inp.dataset.k] = inp.checked; renderModel(); }));
  }

  function renderChecklist() {
    $('checklist').innerHTML = P.SIGNALS.map(s => `<div class="card check"><div class="w">+${s.weight} readiness</div><h3>${esc(s.label)}</h3><p>${esc(s.ask)}</p></div>`).join('');
  }

  function renderBrief() {
    $('roles').innerHTML = DemoCompany.profiles.map(p => `<button type="button" data-r="${p.id}" aria-pressed="${p.id === state.role}">${esc(p.role)}</button>`).join('');
    $('roles').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { state.role = b.dataset.r; renderBrief(); }));
    const b = P.buildBrief(DemoCompany.profiles.find(p => p.id === state.role));
    const diff = { Easy: 'ok', Medium: 'warn', Hard: 'bad' };
    $('brief-card').innerHTML = `
      <div class="eyebrow">Session brief · 60 min · check-in at 2 weeks</div>
      <h3 style="margin-top:10px">${esc(b.role)}</h3>
      <p class="muted" style="margin:4px 0 0">${esc(b.goal)}</p>
      <h4>What the message history shows</h4>
      <ul>${b.channels.map(c => `<li><code>${esc(c.name)}</code> ${esc(c.what)}</li>`).join('')}</ul>
      <h4>Patterns</h4>
      <ul>${b.patterns.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
      <h4>Use cases, easiest first</h4>
      ${b.useCases.map((u, i) => `<div class="uc"><div class="uc-head"><b>${i + 1}. ${esc(u.title)}</b><span class="chip ${diff[u.difficulty]}">${u.difficulty}</span></div>
        <div><span class="k">Pain</span>${esc(u.pain)}</div><div><span class="k">Assistant</span>${esc(u.does)}</div><div><span class="k">Impact</span>${esc(u.impact)}</div></div>`).join('')}
      <p class="muted small" style="margin:14px 0 0">Estimated total ~${b.estimatedHoursPerWeek} h/week. Estimates are hypotheses to test in the session, not promises.</p>`;
    state.markdown = P.briefToMarkdown(b);
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('#model .toggle-model button').forEach(b => b.addEventListener('click', () => { state.model = b.dataset.m; renderModel(); }));
    $('copy-md').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(state.markdown); $('copied').textContent = 'Copied.'; } catch (e) { $('copied').textContent = 'Copy failed: your browser blocked the clipboard.'; }
    });
    renderModel(); renderChecklist(); renderBrief();
    document.addEventListener('themechange', renderModel); // matrix colors come from CSS tokens
  });
})();
