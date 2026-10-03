/**
 * Goods-received ↔ supplier-invoice matcher.
 *
 * The problem: every time stock arrives, someone types the supplier's invoice number
 * into the warehouse system by hand. Later, the real invoices arrive from the tax
 * authority. Linking the two is a daily, error-prone chore, because each supplier's
 * folio gets typed differently ("F1234" vs "1234", a series prefix dropped, a zero
 * missing...). This module does the linking and is honest about its confidence:
 *
 *   score ≥ 160  → auto     linked automatically
 *   60 – 159     → review   a suggestion a person approves or rejects
 *   no match     → waiting  (received ≤ N days ago: the invoice may not exist yet)
 *                → missing  (older: chase the supplier)
 *                → unmapped (supplier has no rules yet: teach it one)
 *
 * By design an ID match alone (100–120 points) can never reach "auto": something else
 * (date, total, quantity) must corroborate it. Decisions a human already made
 * ("rejected", "discarded") are never touched.
 */
const Matcher = (() => {
  const DEFAULTS = { autoThreshold: 160, reviewThreshold: 60, waitDays: 10, maxSuggestions: 5 };
  const DAY_MS = 86400000;
  const daysBetween = (a, b) => {
    const t1 = Date.parse(a); const t2 = Date.parse(b);
    return Number.isFinite(t1) && Number.isFinite(t2) ? Math.round(Math.abs(t1 - t2) / DAY_MS) : 999;
  };
  const norm = s => String(s || '').trim().toUpperCase();

  /**
   * Supplier folio rules. Each rule turns the folio as typed at the warehouse into
   * extra candidates for the folio as it appears on the real invoice.
   *   { type: 'addPrefix', value: 'M' }            "1234"   → "M1234"
   *   { type: 'stripPrefix', value: 'A-' }         "A-1234" → "1234"
   *   { type: 'optionalPrefix', value: 'F' }       both directions
   *   { type: 'tryPrefixes', values: ['AA','EE'] } "1234"   → "AA1234", "EE1234"
   *   { type: 'zeroTolerant' }                     "MF01234" ↔ "MF1234" (one zero added/removed)
   *   { type: 'swapPrefix', pairs: [['MF','FT']] } "MF1234" ↔ "FT1234"
   */
  function candidates(typed, rules = []) {
    const id = norm(typed);
    if (!id) return [];
    const out = new Set([id]);
    for (const r of rules) {
      const v = norm(r.value);
      if (r.type === 'addPrefix' && !id.startsWith(v)) out.add(v + id);
      if (r.type === 'stripPrefix' && id.startsWith(v)) out.add(id.slice(v.length));
      if (r.type === 'optionalPrefix') out.add(id.startsWith(v) ? id.slice(v.length) : v + id);
      if (r.type === 'tryPrefixes' && /^\d+$/.test(id)) r.values.forEach(p => out.add(norm(p) + id));
      if (r.type === 'zeroTolerant') {
        const m = /^([A-Z]*)(\d+)$/.exec(id);
        if (m) {
          const [, prefix, digits] = m;
          for (let i = 0; i <= digits.length; i++) out.add(prefix + digits.slice(0, i) + '0' + digits.slice(i));
          for (let i = 0; i < digits.length; i++) if (digits[i] === '0') out.add(prefix + digits.slice(0, i) + digits.slice(i + 1));
        }
      }
      if (r.type === 'swapPrefix') {
        for (const [a, b] of r.pairs) {
          if (id.startsWith(norm(a))) out.add(norm(b) + id.slice(a.length));
          if (id.startsWith(norm(b))) out.add(norm(a) + id.slice(b.length));
        }
      }
    }
    return [...out];
  }

  /** Corroboration points from date, total and quantity. */
  function corroborate(receipt, invoice) {
    let score = 0;
    const reasons = [];
    const dd = daysBetween(receipt.date, invoice.date);
    if (dd === 0) { score += 40; reasons.push('same date'); }
    else if (dd <= 4) { score += 30 - dd * 5; reasons.push(`date ±${dd}d`); }
    else if (dd <= 14) { score += 10 - dd; reasons.push(`date ±${dd}d`); }

    if (receipt.total && invoice.total) {
      const pct = Math.abs(receipt.total - invoice.total) / Math.max(receipt.total, invoice.total) * 100;
      if (pct < 1) { score += 40; reasons.push('same total'); }
      else if (pct < 5) { score += 20; reasons.push(`total ±${pct.toFixed(1)}%`); }
      else if (pct < 15) { score += 10; reasons.push(`total ±${pct.toFixed(1)}%`); }
    }
    if (receipt.qty && invoice.qty) {
      if (receipt.qty === invoice.qty) { score += 20; reasons.push('same qty'); }
      else if (Math.abs(receipt.qty - invoice.qty) <= 2) { score += 10; reasons.push(`qty ±${Math.abs(receipt.qty - invoice.qty)}`); }
    }
    return { score, reasons };
  }

  function index(invoices) {
    const byId = new Map();
    const byIssuer = new Map();
    for (const inv of invoices) {
      const id = norm(inv.id);
      if (id) (byId.get(id) || byId.set(id, []).get(id)).push(inv);
      const issuer = norm(inv.issuerRfc);
      if (issuer) (byIssuer.get(issuer) || byIssuer.set(issuer, []).get(issuer)).push(inv);
    }
    return { byId, byIssuer };
  }

  /** Ranked invoice suggestions for one receipt. */
  function suggest(receipt, supplier, idx, opts = DEFAULTS) {
    const rules = supplier ? supplier.rules : [];
    const rfc = supplier ? norm(supplier.rfc) : '';
    const seen = new Set();
    const out = [];
    for (const cand of candidates(receipt.folio, rules)) {
      for (const inv of idx.byId.get(cand) || []) {
        if (seen.has(inv.uuid)) continue;
        seen.add(inv.uuid);
        const c = corroborate(receipt, inv);
        const sameIssuer = rfc && norm(inv.issuerRfc) === rfc;
        const via = cand === norm(receipt.folio) ? 'exact folio' : `rule → ${cand}`;
        out.push({ invoice: inv, score: 100 + (sameIssuer ? 20 : 0) + c.score, reasons: [via, ...(sameIssuer ? ['same supplier'] : []), ...c.reasons] });
      }
    }
    // Last resort: same supplier, no folio match, data only. Can never reach "auto".
    if (!out.length && rfc) {
      for (const inv of idx.byIssuer.get(rfc) || []) {
        const c = corroborate(receipt, inv);
        if (c.score >= opts.reviewThreshold) out.push({ invoice: inv, score: Math.min(c.score, opts.autoThreshold - 1), reasons: ['no folio match', ...c.reasons] });
      }
    }
    return out.sort((a, b) => b.score - a.score).slice(0, opts.maxSuggestions);
  }

  /**
   * Classify every open receipt.
   * receipts:  [{ id, supplier, folio, date, total, qty, kind?, humanDecision? }]
   * invoices:  [{ uuid, id, issuerRfc, date, total, qty }]
   * suppliers: { [supplierName]: { rfc, rules: [] } }
   * today:     'YYYY-MM-DD'
   */
  function reconcile({ receipts, invoices, suppliers, today, options = {} }) {
    const opts = { ...DEFAULTS, ...options };
    const idx = index(invoices);
    const claimed = new Set();
    const results = [];
    for (const r of receipts) {
      if (r.humanDecision === 'rejected' || r.humanDecision === 'discarded') { results.push({ receipt: r, status: 'human', suggestions: [] }); continue; }
      if (r.kind === 'delivery-note' || /^REM/i.test(r.folio || '')) { results.push({ receipt: r, status: 'skipped', suggestions: [] }); continue; }
      const supplier = suppliers[r.supplier];
      const suggestions = suggest(r, supplier, idx, opts);
      const best = suggestions[0];
      let status;
      if (best && best.score >= opts.autoThreshold && !claimed.has(best.invoice.uuid)) { status = 'auto'; claimed.add(best.invoice.uuid); }
      else if (best && best.score >= opts.reviewThreshold) status = 'review';
      else if (!supplier) status = 'unmapped';
      else status = daysBetween(r.date, today) <= opts.waitDays ? 'waiting' : 'missing';
      results.push({ receipt: r, status, best: best || null, suggestions });
    }
    const counts = results.reduce((acc, x) => ({ ...acc, [x.status]: (acc[x.status] || 0) + 1 }), {});
    return { results, counts };
  }

  return { DEFAULTS, candidates, corroborate, suggest, reconcile };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Matcher;
