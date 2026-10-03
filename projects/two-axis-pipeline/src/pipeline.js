/**
 * Two-axis pipeline — the state model behind Rafónica's creator marketplace.
 *
 * Every creator has two independent states:
 *   - data state:         how complete and fresh the data is. Moved only by automation.
 *   - relationship state: where the human relationship stands. Moved only by a person.
 * A single "pipeline status" field mixes both, so a nightly refresh can overwrite weeks of
 * sales work. This module encodes the two axes, who may write each one, the gates between
 * processes (as filters, not opinions), the privacy exclusion that every write checks first,
 * and the reach metric. Pure functions; runs in Node and in the browser.
 */
const Pipeline = (() => {
  const DATA = ['Not captured', 'Captured', 'Measured', 'Down'];
  const RELATION = ['Not contacted', 'In outreach', 'In conversation', 'Agreement sent', 'Active', 'Paused', 'Declined', 'Do not contact'];

  /** Events, who may fire them, and what they change. */
  const EVENTS = {
    capture: { actor: 'robot', axis: 'data', label: 'Capture profile', to: 'Captured', from: ['Not captured'] },
    measure: { actor: 'robot', axis: 'data', label: 'Measure videos', to: 'Measured', from: ['Captured', 'Measured'] },
    nightly: { actor: 'robot', axis: 'data', label: 'Nightly refresh', to: 'Measured', from: ['Captured', 'Measured'] },
    vanish: { actor: 'robot', axis: 'data', label: 'Account gone (3 failed runs)', to: 'Down', from: ['Captured', 'Measured'] },
    message: { actor: 'human', axis: 'relation', label: 'Send first message', to: 'In outreach', from: ['Not contacted'] },
    reply: { actor: 'human', axis: 'relation', label: 'Creator replies', to: 'In conversation', from: ['In outreach'] },
    send: { actor: 'human', axis: 'relation', label: 'Send agreement', to: 'Agreement sent', from: ['In conversation'] },
    sign: { actor: 'human', axis: 'relation', label: 'Creator signs', to: 'Active', from: ['Agreement sent'] },
    pause: { actor: 'human', axis: 'relation', label: 'Pause', to: 'Paused', from: ['Active'] },
    decline: { actor: 'human', axis: 'relation', label: 'Creator declines', to: 'Declined', from: RELATION.filter(r => r !== 'Do not contact') },
  };

  /**
   * Apply an event to a creator under the two-axis model.
   * Returns { creator, ok, reason }. Never mutates the input.
   * Rule 1: scripts never write the relationship. Rule 2: people never write the data state.
   * Rule 3: an excluded person is never written to again.
   */
  function apply(creator, eventKey, actor) {
    const e = EVENTS[eventKey];
    if (!e) return { creator, ok: false, reason: `Unknown event "${eventKey}"` };
    if (creator.excluded) return { creator, ok: false, reason: 'Excluded by a privacy request: nothing writes to this record again.' };
    if (actor !== e.actor) return { creator, ok: false, reason: e.axis === 'relation' ? 'Scripts never write the relationship state.' : 'People never write the data state: fix the script instead.' };
    const field = e.axis === 'data' ? 'dataState' : 'relationState';
    if (!e.from.includes(creator[field])) return { creator, ok: false, reason: `"${e.label}" isn't valid from "${creator[field]}".` };
    return { creator: { ...creator, [field]: e.to }, ok: true, reason: `${field === 'dataState' ? 'Data' : 'Relationship'}: ${creator[field]} → ${e.to}` };
  }

  /**
   * The legacy model: one "pipeline status" field that every process writes.
   * Shows the failure mode the two axes exist to prevent.
   */
  const LEGACY_FROM_EVENT = { capture: 'Captured', measure: 'Measured', nightly: 'Measured', vanish: 'Down', message: 'Contacted', reply: 'In conversation', send: 'Agreement sent', sign: 'Signed', pause: 'Paused', decline: 'Declined' };
  function applyLegacy(status, eventKey) {
    const next = LEGACY_FROM_EVENT[eventKey];
    const humanProgress = ['Contacted', 'In conversation', 'Agreement sent', 'Signed', 'Paused'];
    const lost = EVENTS[eventKey] && EVENTS[eventKey].actor === 'robot' && humanProgress.includes(status);
    return { status: next || status, lostProgress: lost ? status : null };
  }

  /** Reach uses the median of non-pinned videos: one viral video shouldn't define a creator. */
  function median(xs) {
    const s = xs.slice().sort((a, b) => a - b);
    if (!s.length) return 0;
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }
  function reach(videos, followers) {
    const counted = videos.filter(v => !v.pinned).map(v => v.views);
    const med = median(counted);
    const mean = counted.length ? counted.reduce((a, b) => a + b, 0) / counted.length : 0;
    return { median: med, mean: Math.round(mean), reachPct: followers ? Math.round((med / followers) * 1000) / 10 : 0, meanReachPct: followers ? Math.round((mean / followers) * 1000) / 10 : 0, sample: counted.length };
  }

  /** Gates between processes. If it can't be written as a filter, it isn't a gate. */
  const GATES = [
    {
      key: 'outreach', label: 'Ready for outreach',
      rule: 'Measured · has a contact channel · posted in the last 30 days · no quality flag · not contacted · not excluded',
      test: c => !c.excluded && c.dataState === 'Measured' && c.contactScore > 0 && c.daysSincePost < 30 && c.qualityFlag === 'OK' && c.relationState === 'Not contacted',
    },
    {
      key: 'sellable', label: 'Sellable inventory',
      rule: 'Relationship = Active (signed agreement) · account not down · data refreshed in the last 30 days · not excluded',
      test: c => !c.excluded && c.relationState === 'Active' && c.dataState !== 'Down' && c.daysSinceRefresh <= 30,
    },
  ];
  function gate(creators, key) {
    const g = GATES.find(x => x.key === key);
    return creators.filter(g.test).map(c => c.id);
  }

  /** Privacy request: mark excluded and stop. The record stays, so the exclusion is remembered. */
  function exclude(creator) {
    return { ...creator, excluded: true, relationState: 'Do not contact' };
  }
  /** Intake checks the exclusion list before creating anything. */
  function canAdd(handle, existing) {
    const norm = h => String(h || '').trim().toLowerCase().replace(/^@/, '');
    const hit = existing.find(c => norm(c.handle) === norm(handle));
    if (!hit) return { ok: true, reason: 'New candidate.' };
    if (hit.excluded) return { ok: false, reason: 'Blocked: this person asked to be removed. The exclusion list is checked before every write.' };
    return { ok: false, reason: 'Duplicate: already in the directory.' };
  }

  return { DATA, RELATION, EVENTS, apply, applyLegacy, median, reach, GATES, gate, exclude, canAdd };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Pipeline;
