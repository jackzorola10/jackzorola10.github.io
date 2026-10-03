// Interactive page: case charts, live matcher on synthetic data, CFDI inspector.
(() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const money = n => (n == null ? '—' : '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  const STATUS = {
    auto: { label: 'Auto-linked', cls: 'ok', bar: 's-auto' },
    review: { label: 'Needs review', cls: 'info', bar: 's-review' },
    waiting: { label: 'Waiting for invoice', cls: 'warn', bar: 's-waiting' },
    missing: { label: 'Missing invoice', cls: 'bad', bar: 's-missing' },
    unmapped: { label: 'Unmapped supplier', cls: 'accent', bar: 's-unmapped' },
    skipped: { label: 'Delivery note (skipped)', cls: '', bar: 's-skipped' },
  };

  // --- case charts ---
  function bars(el, rows, max, unit) {
    $(el).innerHTML = rows.map(r => `<div class="bar"><span>${r[0]}</span><div class="track"><div class="fill${r[2] ? ' alt' : ''}" style="width:0" data-w="${Math.max(1.5, (r[1] / max) * 100)}"></div></div><span class="v">${r[3] || r[1] + unit}</span></div>`).join('');
    requestAnimationFrame(() => $(el).querySelectorAll('.fill').forEach(f => { f.style.width = f.dataset.w + '%'; }));
  }

  // --- matcher ---
  let state = { filter: 'all', open: null, run: null, data: null };
  function run() {
    const seed = Number($('seed').value);
    const count = seed === 99 ? 400 : 120;
    const data = Synthetic.generate({ seed, count });
    const suppliers = $('rules').checked ? data.suppliers : Object.fromEntries(Object.entries(data.suppliers).map(([k, v]) => [k, { ...v, rules: [] }]));
    state.data = data;
    state.run = Matcher.reconcile({ ...data, suppliers });
    state.open = null;
    render();
  }

  function render() {
    const { results, counts } = state.run;
    const total = results.length;
    $('stack').innerHTML = Object.keys(STATUS).filter(k => counts[k]).map(k => `<div class="${STATUS[k].bar}" style="flex-grow:${counts[k]}" title="${STATUS[k].label}: ${counts[k]}">${counts[k] / total > 0.06 ? counts[k] : ''}</div>`).join('');
    $('legend').innerHTML = Object.keys(STATUS).filter(k => counts[k]).map(k => `<span class="chip ${STATUS[k].cls}">${STATUS[k].label} · ${counts[k]}</span>`).join('');
    const autos = results.filter(r => r.status === 'auto');
    const wrong = autos.filter(r => r.best.invoice.uuid !== r.receipt.truth).length;
    $('accuracy').className = `chip ${wrong ? 'bad' : 'ok'}`;
    $('accuracy').textContent = `${autos.length} auto-links · ${wrong} wrong`;

    $('filters').innerHTML = ['all', ...Object.keys(STATUS).filter(k => counts[k])].map(k => `<button type="button" class="chip ${k === 'all' ? '' : STATUS[k].cls}" data-f="${k}" aria-pressed="${state.filter === k}">${k === 'all' ? `All · ${total}` : `${STATUS[k].label} · ${counts[k]}`}</button>`).join('');
    $('filters').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { state.filter = b.dataset.f; state.open = null; render(); }));

    const shown = results.filter(r => state.filter === 'all' || r.status === state.filter);
    const LIMIT = 40;
    $('rows').innerHTML = shown.slice(0, LIMIT).map(r => {
      const b = r.best;
      const row = `<tr class="row" data-id="${r.receipt.id}"><td class="mono">${r.receipt.id}<br><span class="muted">${r.receipt.date}</span></td><td>${esc(r.receipt.supplier)}</td><td class="mono">${esc(r.receipt.folio)}</td><td class="mono">${b ? esc(b.invoice.id) : '<span class="muted">—</span>'}</td><td class="score">${b ? b.score : ''}</td><td><span class="chip ${STATUS[r.status].cls}">${STATUS[r.status].label}</span></td></tr>`;
      if (state.open !== r.receipt.id) return row;
      const sug = r.suggestions.length
        ? r.suggestions.map(s => `<div style="margin:6px 0"><b class="mono">${esc(s.invoice.id)}</b> · <span class="score">${s.score}</span> · ${s.invoice.date} · ${money(s.invoice.total)} · qty ${s.invoice.qty}<div class="reasons" style="margin-top:4px">${s.reasons.map(x => `<span class="chip">${esc(x)}</span>`).join('')}</div></div>`).join('')
        : '<span class="muted">No candidate invoice found.</span>';
      const truth = r.receipt.truth ? (b && b.invoice.uuid === r.receipt.truth ? '✓ matches the known answer' : r.status === 'auto' ? '✗ wrong link' : 'the right invoice exists') : 'no invoice exists for this receipt';
      return row + `<tr class="detail"><td colspan="6"><div class="muted" style="margin-bottom:6px">Receipt: ${r.receipt.date} · ${money(r.receipt.total)} · qty ${r.receipt.qty} · <i>${truth}</i></div>${sug}</td></tr>`;
    }).join('');
    $('rows').querySelectorAll('tr.row').forEach(tr => tr.addEventListener('click', () => { state.open = state.open === tr.dataset.id ? null : tr.dataset.id; render(); }));
    $('more').textContent = shown.length > LIMIT ? `Showing ${LIMIT} of ${shown.length}. Filter by status to see the rest.` : 'Click a row to see why it was classified that way.';
  }

  function rulebook() {
    const describe = r => ({
      addPrefix: `add "${r.value}"`, stripPrefix: `strip "${r.value}"`, optionalPrefix: `"${r.value}" optional`,
      tryPrefixes: `try ${(r.values || []).join(' / ')}`, zeroTolerant: 'tolerate a missing/extra zero', swapPrefix: (r.pairs || []).map(p => p.join('↔')).join(', '),
    }[r.type]);
    $('rulebook').innerHTML = Object.entries(Synthetic.SUPPLIERS).map(([name, s]) => `<tr><td>${name}</td><td>${esc(s.quirk)}</td><td class="mono">${s.rules.length ? s.rules.map(describe).join(' + ') : '—'}</td></tr>`).join('')
      + `<tr><td>${Synthetic.UNMAPPED}</td><td>New supplier, nobody has looked at it yet</td><td class="mono muted">no rules → exact folio only</td></tr>`;
  }

  // --- CFDI inspector ---
  function showXml(text) {
    $('xmltext').textContent = text.length > 20000 ? text.slice(0, 20000) + '\n…' : text;
    try {
      const c = CFDI.parse(text);
      const rows = [['Type', `${c.type} · ${c.typeLabel}`], ['Version', c.version], ['UUID', c.uuid], ['Invoice no.', c.id || '—'], ['Issued', c.issuedAt], ['Issuer', `${c.issuer.name} · ${c.issuer.rfc}`], ['Receiver', `${c.receiver.name} · ${c.receiver.rfc}`], ['Subtotal', money(c.subtotal)], ['Tax (transferred)', money(c.taxesTransferred)], ['Total', `${money(c.total)} ${c.currency}`], ['Pieces', c.itemCount]];
      $('parsed').innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('');
      $('items').innerHTML = c.items.map(x => `<tr><td>${esc(x.description)}<br><span class="muted mono small">${esc(x.productCode)}</span></td><td>${x.quantity}</td><td>${money(x.amount)}</td></tr>`).join('');
    } catch (e) {
      $('parsed').innerHTML = `<dt>Error</dt><dd>${esc(e.message)}</dd>`;
      $('items').innerHTML = '';
    }
  }
  async function loadSample() {
    const name = $('sample').value;
    try {
      const r = await fetch(`samples/${name}`);
      if (!r.ok) throw new Error(r.status);
      showXml(await r.text());
    } catch (e) {
      // Offline fallback: build the same kind of document from the generator.
      const inv = Synthetic.generate({ seed: 7, count: 30 }).invoices[0];
      showXml(Synthetic.toXml(inv));
    }
  }
  function readFile(file) { if (!file) return; const fr = new FileReader(); fr.onload = () => showXml(String(fr.result)); fr.readAsText(file); }

  document.addEventListener('DOMContentLoaded', () => {
    bars('hours', [['Before', 20], ['Phase 1', 2.5], ['Phase 3', 0.25, false, '0.25h']], 20, 'h');
    bars('cost', [['Phase 1', 0, true, 'Zapier + seats'], ['Phase 2 (peak)', 216, true, '~$216'], ['Phase 3', 24, false, '$24']], 216, '');
    rulebook();
    $('seed').addEventListener('change', run);
    $('rules').addEventListener('change', run);
    run();
    $('sample').addEventListener('change', loadSample);
    $('file').addEventListener('change', e => readFile(e.target.files[0]));
    const drop = $('drop');
    ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', e => readFile(e.dataTransfer.files[0]));
    loadSample();
  });
})();
