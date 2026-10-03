/**
 * Annotated research library — the rules as pure functions.
 *
 * A source proves that someone said something, not that it is true. So every source is
 * broken into numbered claims (SRC-003·A7), each typed as data, model, thesis or anecdote;
 * relations between claims are logged (validation, contradiction, nuance, clash with a
 * decision); and no synthesis is written until at least three *independent* sources agree.
 * Two sources that cite the same study are one source. No dependencies; Node and browser.
 */
const Library = (() => {
  const TYPES = {
    data: { icon: '📊', label: 'Data', rule: 'A figure or fact checkable against a primary source. Verify before using it in a decision.' },
    model: { icon: '🧩', label: 'Model', rule: 'An illustrative calculation or framework. Useful to reason with; never quote it as a statistic.' },
    thesis: { icon: '🧭', label: 'Thesis', rule: 'An interpretation or argument. Weigh it, compare it, don\'t verify it.' },
    anecdote: { icon: '📎', label: 'Anecdote', rule: 'One case. It shows something is possible, not that it is typical.' },
  };
  const RELATIONS = {
    validation: { icon: '✅', label: 'Validation', note: 'Independent sources agree. Confidence goes up.' },
    contradiction: { icon: '⚔️', label: 'Contradiction', note: 'They can\'t both be right. The most valuable thing a library can find.' },
    nuance: { icon: '🔀', label: 'Nuance', note: 'Not a contradiction: one narrows the other (different year, market or scale).' },
    clash: { icon: '🚩', label: 'Clash with a decision', note: 'A source contradicts something already decided. Reported to the owner, not reopened here.' },
  };
  const SUSPECTS = {
    year: 'Different years', market: 'Different markets', definition: 'Different definitions of the same word', incentive: 'Different incentives of the author',
  };
  const SYNTHESIS_MIN = 3;

  const claimRef = (sourceId, claimId) => `${sourceId}·${claimId}`;
  function parseRef(ref) {
    const m = /^([A-Z]+-\d{3})·(A\d+)$/.exec(String(ref || ''));
    return m ? { source: m[1], claim: m[2] } : null;
  }

  /**
   * How many independent sources are in a set? Sources that share any primary source
   * (the study, dataset or book they rely on) collapse into one.
   */
  function independence(sourceIds, sources) {
    const byId = new Map(sources.map(s => [s.id, s]));
    const picked = sourceIds.map(id => byId.get(id)).filter(Boolean);
    const parent = new Map(picked.map(s => [s.id, s.id]));
    const find = x => (parent.get(x) === x ? x : (parent.set(x, find(parent.get(x))), parent.get(x)));
    const owner = new Map();
    for (const s of picked) {
      for (const p of s.primary || []) {
        if (owner.has(p)) parent.set(find(s.id), find(owner.get(p)));
        else owner.set(p, s.id);
      }
    }
    const groups = new Map();
    for (const s of picked) { const r = find(s.id); (groups.get(r) || groups.set(r, []).get(r)).push(s.id); }
    const clusters = [...groups.values()];
    return { total: picked.length, independent: clusters.length, clusters, shared: clusters.filter(c => c.length > 1) };
  }

  function canSynthesize(sourceIds, sources) {
    const ind = independence(sourceIds, sources);
    return { ok: ind.independent >= SYNTHESIS_MIN, missing: Math.max(0, SYNTHESIS_MIN - ind.independent), ...ind };
  }

  /** Lifecycle of a source, derived from its content (never typed by hand). */
  function stage(source, appliedSourceIds = []) {
    if (!source.claims || !source.claims.length) return 'Captured';
    const data = source.claims.filter(c => c.type === 'data');
    const allVerified = data.every(c => c.verified === true || c.verified === false);
    if (appliedSourceIds.includes(source.id) && allVerified) return 'Applied';
    if (allVerified && data.length) return 'Verified';
    return 'Annotated';
  }

  /** Checks a library for the mistakes that make it untrustworthy. */
  function audit({ sources, relations }) {
    const issues = [];
    const ids = new Set();
    const refs = new Set();
    for (const s of sources) {
      if (ids.has(s.id)) issues.push(`${s.id} is used twice. IDs are never reused.`);
      ids.add(s.id);
      s.claims.forEach((c, i) => {
        if (c.id !== `A${i + 1}`) issues.push(`${s.id}: claim ${c.id} is out of order. Claims are numbered in order and never renumbered.`);
        if (!TYPES[c.type]) issues.push(`${claimRef(s.id, c.id)} has no valid type.`);
        if (c.type === 'data' && c.verified === undefined) issues.push(`${claimRef(s.id, c.id)} is data and hasn't been verified.`);
        refs.add(claimRef(s.id, c.id));
      });
    }
    for (const r of relations) {
      for (const ref of [r.a, r.b]) if (!refs.has(ref)) issues.push(`${r.id} points to ${ref}, which doesn't exist.`);
      if (!RELATIONS[r.kind]) issues.push(`${r.id} has an unknown relation type.`);
      if ((r.kind === 'contradiction' || r.kind === 'nuance') && !r.hypothesis) issues.push(`${r.id} has no hypothesis for why the sources differ.`);
      if (r.kind === 'validation') {
        const a = parseRef(r.a), b = parseRef(r.b);
        if (a && b && independence([a.source, b.source], sources).independent < 2) issues.push(`${r.id} counts ${a.source} and ${b.source} as validation, but they share a primary source.`);
      }
    }
    return issues;
  }

  /** Quiz: is this sentence data, a model, a thesis or an anecdote? */
  function grade(item, answer) {
    return { correct: item.type === answer, expected: item.type, why: item.why };
  }

  return { TYPES, RELATIONS, SUSPECTS, SYNTHESIS_MIN, claimRef, parseRef, independence, canSynthesize, stage, audit, grade };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Library;
