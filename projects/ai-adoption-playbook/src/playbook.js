/**
 * AI adoption playbook — scoring model.
 *
 * v1 is what I actually used: rank work by how much time it eats, how much it matters,
 * and how automatable it is. It picked the right processes and still missed the one
 * department that never adopted anything.
 *
 * v2 adds the factor I didn't measure: the readiness of the team that has to adopt it.
 * Every readiness signal below is something that was visible *before* that department
 * stalled. Pure functions, no network; runs in Node and in the browser.
 */
const Playbook = (() => {
  /** Readiness signals, with weights summing to 100. `ask` is how you check it in week one. */
  const SIGNALS = [
    { key: 'onTime', weight: 15, label: 'Returned the activity inventory on time', ask: 'Did the team hand in its list of activities by the date agreed?' },
    { key: 'quantified', weight: 20, label: 'Inventory came with numbers', ask: 'Does each activity have hours per week and a frequency, or just names?' },
    { key: 'inPerson', weight: 15, label: 'Lead joined the sessions in person', ask: 'Did the lead sit in the room, or join remotely with the camera off?' },
    { key: 'leadUses', weight: 25, label: 'Lead uses the tools weekly after week 1', ask: 'Is there usage from the lead in week two, without being reminded?' },
    { key: 'champion', weight: 15, label: 'A hands-on champion besides the lead', ask: 'Is there someone on the team who tries things and shows the others?' },
    { key: 'healthy', weight: 10, label: 'No known team friction', ask: 'Is this team free of open conflict, high turnover or a pending reorganisation?' },
  ];

  /** Weekly hours that automation could realistically take off a team's plate, weighted by impact. */
  function activityValue(a) {
    const impact = Math.min(5, Math.max(1, a.impact || 1));
    const auto = Math.min(1, Math.max(0, a.automatable || 0));
    return (a.hoursPerWeek || 0) * auto * (impact / 3);
  }

  function readiness(signals = {}) {
    return SIGNALS.reduce((s, x) => s + (signals[x.key] ? x.weight : 0), 0);
  }

  const READY = 60; // at or above: the team can carry it
  const VALUABLE = 8; // weighted hours/week: worth a dedicated push

  function quadrant(value, ready) {
    const hiV = value >= VALUABLE;
    const hiR = ready >= READY;
    if (hiV && hiR) return 'go';
    if (hiV && !hiR) return 'prepare';
    if (!hiV && hiR) return 'quick';
    return 'park';
  }

  const QUADRANTS = {
    go: { label: 'Go now', advice: 'High value, team ready. Start here and let them show the others.' },
    prepare: { label: 'Fix readiness first', advice: 'High value, team not ready. Automating now will stall: work on the team before the tool.' },
    quick: { label: 'Quick wins', advice: 'Ready team, modest value. Light-touch help, let them self-serve.' },
    park: { label: 'Park', advice: 'Low value and low readiness. Revisit next quarter.' },
  };

  /**
   * Score every department.
   * departments: [{ id, name, people, signals: {…}, activities: [{ name, hoursPerWeek, impact 1-5, automatable 0-1 }] }]
   * model: 'v1' ranks by value only; 'v2' discounts value by readiness and classifies.
   */
  function scoreDepartments(departments, model = 'v2') {
    const rows = departments.map(d => {
      const value = d.activities.reduce((s, a) => s + activityValue(a), 0);
      const hours = d.activities.reduce((s, a) => s + (a.hoursPerWeek || 0), 0);
      const ready = readiness(d.signals);
      const priority = model === 'v1' ? value : value * (ready / 100);
      return { id: d.id, name: d.name, people: d.people, hours, value, readiness: ready, priority, quadrant: quadrant(value, ready), missing: SIGNALS.filter(s => !(d.signals || {})[s.key]).map(s => s.label) };
    });
    rows.sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name));
    rows.forEach((r, i) => { r.rank = i + 1; });
    return rows;
  }

  /** Activities ranked inside one department (what to automate first). */
  function rankActivities(activities) {
    return activities.map(a => ({ ...a, value: activityValue(a) })).sort((a, b) => b.value - a.value);
  }

  /**
   * A one-page session brief, in the format used for every 1:1:
   * what the message history shows → patterns → use cases → follow-up.
   * Use cases are ordered easiest first, then by estimated minutes saved.
   */
  function buildBrief(profile) {
    const order = { Easy: 0, Medium: 1, Hard: 2 };
    const useCases = profile.useCases.slice().sort((a, b) => order[a.difficulty] - order[b.difficulty] || (b.minutesPerWeek || 0) - (a.minutesPerWeek || 0));
    const totalMinutes = useCases.reduce((s, u) => s + (u.minutesPerWeek || 0), 0);
    return { ...profile, useCases, estimatedHoursPerWeek: Math.round(totalMinutes / 6) / 10 };
  }

  function briefToMarkdown(b) {
    const lines = [
      `# Session brief · ${b.role}`, '',
      `**Goal:** ${b.goal}  `, `**Length:** 60 min · **Follow-up:** check-in two weeks later`, '',
      '## What the message history shows', '', ...b.channels.map(c => `- \`${c.name}\`: ${c.what}`), '',
      '## Patterns', '', ...b.patterns.map(p => `- ${p}`), '',
      '## Use cases (easiest first)', '',
      ...b.useCases.flatMap((u, i) => [`### ${i + 1}. ${u.title} · ${u.difficulty}`, `- **Pain today:** ${u.pain}`, `- **What the assistant does:** ${u.does}`, `- **Estimated impact:** ${u.impact}`, '']),
      `_Estimated total: ~${b.estimatedHoursPerWeek} h/week. Estimates are hypotheses to test in the session, not promises._`,
    ];
    return lines.join('\n');
  }

  return { SIGNALS, QUADRANTS, READY, VALUABLE, activityValue, readiness, quadrant, scoreDepartments, rankActivities, buildBrief, briefToMarkdown };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Playbook;
