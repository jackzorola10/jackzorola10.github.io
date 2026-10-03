// Interactive page: claim map, independence trap, claim-type quiz.
(() => {
  const L = Library;
  const D = DemoLibrary;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const byId = new Map(D.sources.map(s => [s.id, s]));
  const claimOf = ref => { const p = L.parseRef(ref); const s = byId.get(p.source); return { source: s, claim: s.claims.find(c => c.id === p.claim) }; };
  const KIND_COLOR = { validation: '--ok', contradiction: '--pink', nuance: '--lilac', clash: '--warn' };
  const state = { selected: { type: 'source', id: 'SRC-001' }, picked: new Set(D.supporting), quiz: 0, score: 0, answered: false };

  function renderTypes() {
    $('types').innerHTML = Object.entries(L.TYPES).map(([, t]) => `<div class="card type"><div class="ico">${t.icon}</div><h3>${t.label}</h3><p>${esc(t.rule)}</p></div>`).join('');
  }

  // --- claim map ---
  function renderGraph() {
    const W = 520, H = 420, cx = W / 2, cy = H / 2, R = 150;
    const pos = new Map(D.sources.map((s, i) => { const t = -Math.PI / 2 + (i / D.sources.length) * Math.PI * 2; return [s.id, { x: cx + R * Math.cos(t), y: cy + R * Math.sin(t) }]; }));
    const ink = css('--ink');
    const edges = D.relations.map(r => {
      const a = pos.get(L.parseRef(r.a).source), b = pos.get(L.parseRef(r.b).source);
      const sel = state.selected.type === 'relation' && state.selected.id === r.id;
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      return `<g class="edge" data-r="${r.id}"><line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${css(KIND_COLOR[r.kind])}" stroke-width="${sel ? 6 : 3.5}" stroke-linecap="round" ${r.kind === 'nuance' ? 'stroke-dasharray="8 6"' : ''}/>
        <line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="transparent" stroke-width="18"/>
        <circle cx="${mx}" cy="${my}" r="13" fill="${css('--surface')}" stroke="${css(KIND_COLOR[r.kind])}" stroke-width="2"/><text x="${mx}" y="${my + 4}" text-anchor="middle" style="font:700 10px 'Space Mono',monospace;fill:${ink}">${r.id.slice(2)}</text></g>`;
    }).join('');
    const nodes = D.sources.map(s => {
      const p = pos.get(s.id); const sel = state.selected.type === 'source' && state.selected.id === s.id;
      const stage = L.stage(s);
      return `<g class="node" data-s="${s.id}"><circle cx="${p.x}" cy="${p.y}" r="34" fill="${stage === 'Verified' ? css('--lime') : css('--surface-2')}" stroke="${ink}" stroke-width="${sel ? 3 : 1}"/>
        <text x="${p.x}" y="${p.y - 2}" text-anchor="middle" style="font:700 11px 'Space Mono',monospace;fill:${stage === 'Verified' ? '#1a1a19' : ink}">${s.id}</text>
        <text x="${p.x}" y="${p.y + 13}" text-anchor="middle" style="font:500 10px 'Schibsted Grotesk',sans-serif;fill:${stage === 'Verified' ? '#1a1a19' : css('--muted')}">${s.claims.length} claims</text></g>`;
    }).join('');
    $('graph').innerHTML = `<svg class="graph" viewBox="0 0 ${W} ${H}" role="img" aria-label="Sources and the relations between their claims">${edges}${nodes}</svg>`;
    $('graph').querySelectorAll('.node').forEach(n => n.addEventListener('click', () => { state.selected = { type: 'source', id: n.dataset.s }; renderGraph(); renderDetail(); }));
    $('graph').querySelectorAll('.edge').forEach(e => e.addEventListener('click', () => { state.selected = { type: 'relation', id: e.dataset.r }; renderGraph(); renderDetail(); }));
    $('legend').innerHTML = Object.entries(L.RELATIONS).filter(([k]) => k !== 'clash').map(([k, r]) => `<span class="chip" style="border-color:${css(KIND_COLOR[k])}">${r.icon} ${r.label}</span>`).join('') + '<span class="chip accent">lime = verified source</span>';
  }

  function renderDetail() {
    if (state.selected.type === 'source') {
      const s = byId.get(state.selected.id);
      $('detail').innerHTML = `<div class="eyebrow">${esc(s.id)} · ${esc(s.author)}</div><h3 style="margin:10px 0 2px">${esc(s.title)}</h3>
        <div class="chips" style="margin:8px 0 4px"><span class="chip">${L.stage(s)}</span>${(s.primary || []).map(p => `<span class="chip">relies on: ${esc(p)}</span>`).join('') || '<span class="chip">no primary source</span>'}</div>
        ${s.claims.map(c => { const t = L.TYPES[c.type]; const v = c.type === 'data' ? `<span class="chip ${c.verified ? 'ok' : 'bad'}">${c.verified ? 'verified' : 'refuted'}</span>` : ''; return `<div class="claim"><div class="top"><span class="ref">${L.claimRef(s.id, c.id)}</span><span class="chip">${t.icon} ${t.label}</span>${v}</div><p>${esc(c.text)}</p>${c.check ? `<small>Check: ${esc(c.check)}</small>` : ''}</div>`; }).join('')}`;
    } else {
      const r = D.relations.find(x => x.id === state.selected.id);
      const a = claimOf(r.a), b = claimOf(r.b);
      const k = L.RELATIONS[r.kind];
      $('detail').innerHTML = `<div class="eyebrow">${esc(r.id)} · ${k.icon} ${k.label} · ${esc(r.status)}</div>
        <div class="vs"><blockquote><b>${esc(r.a)} · ${L.TYPES[a.claim.type].icon}</b>${esc(a.claim.text)}</blockquote><blockquote><b>${esc(r.b)} · ${L.TYPES[b.claim.type].icon}</b>${esc(b.claim.text)}</blockquote></div>
        ${r.suspect ? `<p style="margin:0 0 6px"><span class="chip warn">Usual suspect: ${esc(L.SUSPECTS[r.suspect])}</span></p>` : ''}
        <p style="margin:6px 0 0"><b style="color:var(--ink)">Hypothesis:</b> ${esc(r.hypothesis)}</p>
        <p class="muted small" style="margin:10px 0 0">${esc(k.note)}</p>`;
    }
  }

  // --- independence trap ---
  function renderTrap() {
    $('pick').innerHTML = D.sources.map(s => `<label class="${state.picked.has(s.id) ? 'on' : ''}"><input type="checkbox" data-s="${s.id}" ${state.picked.has(s.id) ? 'checked' : ''}><span><b class="mono">${s.id}</b> ${esc(s.title)}<br><span class="prim">${(s.primary || []).length ? 'relies on ' + s.primary.join(', ') : 'no primary source'}</span></span><span class="chip">${esc(s.format)}</span></label>`).join('');
    $('pick').querySelectorAll('input').forEach(i => i.addEventListener('change', () => { i.checked ? state.picked.add(i.dataset.s) : state.picked.delete(i.dataset.s); renderTrap(); }));
    const r = L.canSynthesize([...state.picked], D.sources);
    $('counters').innerHTML = `<div><b>${r.total}</b><span>sources picked</span></div><div><b style="color:${r.total !== r.independent ? 'var(--bad)' : 'var(--ink)'}">${r.independent}</b><span>independent</span></div>`;
    $('clusters').innerHTML = r.clusters.map(c => `<span class="cluster ${c.length > 1 ? 'shared' : ''}">${c.map(id => `<span class="chip">${id}</span>`).join('')}</span>`).join('');
    $('gate').className = `gate ${r.ok ? 'ok' : 'no'}`;
    $('gate').innerHTML = r.ok
      ? `<b style="color:var(--ink)">A synthesis can be written.</b> ${r.shared.length ? `Note: ${r.shared.map(c => c.join(' and ')).join('; ')} share a primary source, so they count once.` : ''}`
      : `<b style="color:var(--ink)">Not enough for a synthesis yet.</b> ${r.missing} more independent source${r.missing > 1 ? 's' : ''} needed.${r.shared.length ? ` ${r.shared.map(c => c.join(' and ')).join('; ')} rely on the same study.` : ''}`;
  }

  // --- quiz ---
  function renderQuiz() {
    const item = D.quiz[state.quiz];
    $('q-count').textContent = `Sentence ${state.quiz + 1} of ${D.quiz.length} · score ${state.score}`;
    $('q-text').textContent = item.text;
    $('answers').innerHTML = Object.entries(L.TYPES).map(([k, t]) => `<button type="button" class="btn ghost" data-a="${k}" ${state.answered ? 'disabled' : ''}>${t.icon} ${t.label}</button>`).join('');
    $('answers').querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      const g = L.grade(item, b.dataset.a); state.answered = true; if (g.correct) state.score++;
      renderQuiz();
      $('feedback').innerHTML = `<b style="color:${g.correct ? 'var(--ok)' : 'var(--bad)'}">${g.correct ? 'Right.' : `It's ${L.TYPES[g.expected].label.toLowerCase()}.`}</b> ${esc(g.why)} <button type="button" class="btn ghost" id="next" style="margin-left:6px">${state.quiz < D.quiz.length - 1 ? 'Next →' : 'Start over'}</button>`;
      $('next').addEventListener('click', () => { if (state.quiz < D.quiz.length - 1) state.quiz++; else { state.quiz = 0; state.score = 0; } state.answered = false; $('feedback').innerHTML = ''; renderQuiz(); });
    }));
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('question').textContent = `"${D.question}"`;
    renderTypes(); renderGraph(); renderDetail(); renderTrap(); renderQuiz();
    document.addEventListener('themechange', renderGraph);
  });
})();
