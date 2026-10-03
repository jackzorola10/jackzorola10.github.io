/**
 * Truck-test operating system — the "judge" and the truck test, as pure functions.
 *
 * A company's processes are documented as plain files: one master doc per area and one
 * doc per process. This module audits that documentation the way the AI review protocol
 * does (checks A–G), and answers the question the whole system exists for:
 *   "If this person disappeared tomorrow, which processes would nobody else be able to run?"
 *
 * No network, no dependencies. Runs in Node and in the browser.
 */
const TruckOS = (() => {
  const DAY = 86400000;
  const days = (from, to) => Math.round((Date.parse(to) - Date.parse(from)) / DAY);
  const blank = v => v === undefined || v === null || /^\s*(|tbd|todo|-|n\/a|to be documented)\s*$/i.test(String(v));
  const CONTINUITY = ['whyItMatters', 'ifNobodyRunsIt', 'whoElseCould', 'unwrittenKnowledge'];

  const CHECKS = {
    A: { name: 'Freshness', question: 'Is the date and status still true?' },
    B: { name: 'Coherence', question: 'Does the doc describe as pending something already marked live?' },
    C: { name: 'Reciprocity', question: 'If a process impacts another area, does that area reference it back?' },
    D: { name: 'Tools', question: 'Does every tool the process needs exist and is it connected?' },
    E: { name: 'Ownership', question: 'Is every lead and runner a real, active person?' },
    F: { name: 'Coverage', question: 'Is every process listed in its area master, and every listed process real?' },
    G: { name: 'Continuity', question: 'Could someone else take it over tomorrow?' },
  };

  /**
   * company: {
   *   today: 'YYYY-MM-DD',
   *   people: [{ id, name, role, active }],
   *   tools: [{ name, connected }],
   *   areas: [{ code, name, lead, listedProcesses: [codes], interfaces: [areaCodes] }],
   *   processes: [{ code, area, name, status, updated, runBy: [ids], impacts: [areaCodes],
   *                 tools: [names], notes, continuity: { whyItMatters, ifNobodyRunsIt, whoElseCould, unwrittenKnowledge } }]
   * }
   * Returns findings: [{ check, severity, doc, area, message, fix, approver }]
   * `approver` is the lead whose area owns the doc: the judge reports, it never fixes another area's doc silently.
   */
  function judge(company, opts = {}) {
    const staleDays = opts.staleDays || 90;
    const draftDays = opts.draftDays || 45;
    const people = new Map(company.people.map(p => [p.id, p]));
    const areas = new Map(company.areas.map(a => [a.code, a]));
    const tools = new Map(company.tools.map(t => [t.name, t]));
    const procs = new Map(company.processes.map(p => [p.code, p]));
    const leadOf = code => (areas.get(code) || {}).lead;
    const out = [];
    const add = (check, severity, doc, area, message, fix) => out.push({ check, severity, doc, area, message, fix, approver: leadOf(area) || null });

    for (const p of company.processes) {
      const age = days(p.updated, company.today);
      // A · Freshness
      if (p.status === 'Live' && age > staleDays) add('A', 'medium', p.code, p.area, `Not reviewed in ${age} days.`, 'Review with the area lead and update the date, or mark it Deprecated.');
      if (p.status === 'Draft' && age > draftDays) add('A', 'low', p.code, p.area, `Draft for ${age} days, never validated.`, 'Validate with the area lead or archive it.');
      // B · Coherence
      if (p.status === 'Live' && /\b(pending|not built|to be built|todo|coming soon)\b/i.test(p.notes || '')) add('B', 'medium', p.code, p.area, 'Marked Live, but the text still describes work as pending.', 'Rewrite the section to describe what exists today.');
      // C · Reciprocity
      for (const target of p.impacts || []) {
        const t = areas.get(target);
        if (!t) add('C', 'medium', p.code, p.area, `Impacts "${target}", which isn't an area.`, 'Fix the area code.');
        else if (!(t.interfaces || []).includes(p.area)) add('C', 'low', `${target} master`, target, `${t.name} doesn't reference ${p.code}, which impacts it.`, `Propose adding the interface to the ${t.name} master. Its lead approves.`);
      }
      // D · Tools
      for (const name of p.tools || []) {
        const t = tools.get(name);
        if (!t) add('D', 'medium', p.code, p.area, `Needs "${name}", which isn't in the tool map.`, 'Add it to the tool map, or fix the name.');
        else if (!t.connected) add('D', 'high', p.code, p.area, `Needs "${name}", which is disconnected. The process can't run as written.`, 'Reconnect the tool or document the manual fallback.');
      }
      // E · Ownership
      if (!(p.runBy || []).length) add('E', 'high', p.code, p.area, 'Nobody is listed as running it.', 'Name who runs it day to day.');
      for (const id of p.runBy || []) {
        const person = people.get(id);
        if (!person) add('E', 'high', p.code, p.area, `Runner "${id}" doesn't exist.`, 'Fix the runner.');
        else if (!person.active) add('E', 'high', p.code, p.area, `Run by ${person.name}, who has left.`, 'Reassign it, and use the continuity section to hand it over.');
      }
      // F · Coverage (orphans)
      const master = areas.get(p.area);
      if (!master) add('F', 'high', p.code, p.area, `Belongs to unknown area "${p.area}".`, 'Fix the area.');
      else if (!(master.listedProcesses || []).includes(p.code)) add('F', 'medium', p.code, p.area, `Orphan: not listed in the ${master.name} master.`, 'List it in the area map of processes.');
      // G · Continuity
      const missing = CONTINUITY.filter(k => blank((p.continuity || {})[k]));
      if (missing.length) add('G', missing.length >= 3 ? 'high' : 'medium', p.code, p.area, `Continuity section incomplete (${missing.length} of 4 answers missing).`, 'Answer it honestly. "Nobody else could" is a useful answer.');
      const active = (p.runBy || []).filter(id => people.get(id) && people.get(id).active);
      if (p.status === 'Live' && active.length === 1) add('G', 'medium', p.code, p.area, `Single point of failure: only ${people.get(active[0]).name} can run it.`, 'Pair someone on the next run and record what they learn.');
    }
    // F · Coverage (ghosts) and E · area leads
    for (const a of company.areas) {
      for (const code of a.listedProcesses || []) if (!procs.has(code)) add('F', 'low', `${a.code} master`, a.code, `Lists ${code}, which doesn't exist.`, 'Remove it, or mark it "To be documented".');
      const lead = people.get(a.lead);
      if (!lead) add('E', 'high', `${a.code} master`, a.code, 'The area has no valid lead.', 'Name the lead.');
      else if (!lead.active) add('E', 'high', `${a.code} master`, a.code, `The lead, ${lead.name}, has left.`, 'Name a new lead.');
    }
    const order = { high: 0, medium: 1, low: 2 };
    return out.sort((x, y) => order[x.severity] - order[y.severity] || x.check.localeCompare(y.check) || x.doc.localeCompare(y.doc));
  }

  /** Remove people (as if hit by a truck). Which live processes and areas would nobody else be able to run? */
  function truckTest(company, removedIds) {
    const gone = new Set([].concat(removedIds));
    const people = new Map(company.people.map(p => [p.id, p]));
    const canRun = id => people.get(id) && people.get(id).active && !gone.has(id);
    const strandedProcesses = company.processes.filter(p => p.status !== 'Deprecated' && (p.runBy || []).some(id => gone.has(id)) && !(p.runBy || []).some(canRun)).map(p => p.code);
    const atRisk = company.processes.filter(p => p.status !== 'Deprecated' && (p.runBy || []).filter(canRun).length === 1).map(p => p.code);
    const leaderless = company.areas.filter(a => gone.has(a.lead)).map(a => a.code);
    return { strandedProcesses, atRisk, leaderless };
  }

  /** Bus factor per person: how many processes become impossible if only this person leaves. */
  function busFactor(company) {
    return company.people.filter(p => p.active).map(p => ({ id: p.id, name: p.name, stranded: truckTest(company, [p.id]).strandedProcesses.length }))
      .sort((a, b) => b.stranded - a.stranded || a.name.localeCompare(b.name));
  }

  /** 0–100. Penalises findings by severity; 100 means the judge found nothing. */
  function healthScore(findings, processCount) {
    const weight = { high: 6, medium: 3, low: 1 };
    const penalty = findings.reduce((s, f) => s + weight[f.severity], 0);
    return Math.max(0, Math.round(100 - (penalty / Math.max(1, processCount * 6)) * 100));
  }

  /** Apply the judge's fix to the docs a given area owns, and route everything else as a proposal. */
  function routeFixes(findings, myArea) {
    return findings.map(f => ({ ...f, route: f.area === myArea ? 'fix-now' : 'ask-owner' }));
  }

  return { CHECKS, CONTINUITY, judge, truckTest, busFactor, healthScore, routeFixes };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = TruckOS;
