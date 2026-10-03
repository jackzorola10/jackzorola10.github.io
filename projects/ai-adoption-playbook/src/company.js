/**
 * A fictional ~30-person regulated distributor, used by the demo and the tests.
 * Departments, activities, hours and readiness signals are invented. The *shape* is real:
 * one department looks like the best opportunity on paper and is the one that will stall.
 */
const DemoCompany = (() => {
  const all = { onTime: true, quantified: true, inPerson: true, leadUses: true, champion: true, healthy: true };
  const departments = [
    { id: 'fin', name: 'Finance', people: 4, signals: { ...all }, activities: [
      { name: 'Match supplier invoices to stock received', hoursPerWeek: 10, impact: 4, automatable: 0.8 },
      { name: 'Schedule payments against credit terms', hoursPerWeek: 4, impact: 4, automatable: 0.6 },
      { name: 'Monthly management report', hoursPerWeek: 3, impact: 3, automatable: 0.7 },
    ] },
    { id: 'ops', name: 'Operations', people: 6, signals: { ...all, champion: false }, activities: [
      { name: 'Chase delayed orders every morning', hoursPerWeek: 8, impact: 4, automatable: 0.6 },
      { name: 'Daily stock-alert digest', hoursPerWeek: 4, impact: 3, automatable: 0.7 },
      { name: 'Answer supplier emails', hoursPerWeek: 5, impact: 3, automatable: 0.5 },
    ] },
    { id: 'log', name: 'Logistics', people: 4, signals: { onTime: false, quantified: false, inPerson: false, leadUses: false, champion: true, healthy: false }, activities: [
      { name: 'Quote routes and shipments', hoursPerWeek: 9, impact: 4, automatable: 0.7 },
      { name: 'File carrier claims', hoursPerWeek: 5, impact: 3, automatable: 0.6 },
      { name: 'Send tracking updates', hoursPerWeek: 6, impact: 3, automatable: 0.8 },
    ] },
    { id: 'cs', name: 'Customer Support', people: 5, signals: { ...all, quantified: false }, activities: [
      { name: 'Write cancellation and refund messages', hoursPerWeek: 6, impact: 3, automatable: 0.7 },
      { name: 'Coordinate refunds with finance', hoursPerWeek: 4, impact: 3, automatable: 0.5 },
      { name: 'Analyse satisfaction survey comments', hoursPerWeek: 2, impact: 4, automatable: 0.8 },
    ] },
    { id: 'web', name: 'Online Sales', people: 4, signals: { onTime: true, quantified: true, inPerson: false, leadUses: false, champion: true, healthy: true }, activities: [
      { name: 'Morning operations briefing', hoursPerWeek: 3, impact: 3, automatable: 0.8 },
      { name: 'Validate catalog listings', hoursPerWeek: 4, impact: 3, automatable: 0.5 },
      { name: 'Write listing copy', hoursPerWeek: 2, impact: 2, automatable: 0.7 },
    ] },
    { id: 'ka', name: 'Key Accounts', people: 3, signals: { onTime: true, quantified: false, inPerson: true, leadUses: false, champion: false, healthy: true }, activities: [
      { name: 'Formal emails to institutional clients', hoursPerWeek: 3, impact: 3, automatable: 0.6 },
      { name: 'Account status reports for leadership', hoursPerWeek: 2, impact: 4, automatable: 0.7 },
      { name: 'Tender documentation', hoursPerWeek: 2, impact: 5, automatable: 0.4 },
    ] },
  ];

  const profiles = [
    {
      id: 'marketplace', role: 'Online marketplace lead', goal: 'Introduce the assistant and agree on 3 use cases the team will try this week',
      channels: [
        { name: '#marketplace-ops', what: 'daily operations, a delayed-orders report every morning' },
        { name: '#marketplace-help', what: 'cancellations, refunds, platform errors' },
        { name: '#stock-alerts', what: 'availability coordination with purchasing' },
        { name: '#catalog', what: 'product validation, prices, new listings' },
      ],
      patterns: [
        'Very reactive mornings: delayed orders are triaged live',
        'High volume of near-identical messages (cancellations, refunds, label errors)',
        'The lead is the decision bottleneck: the team asks her about almost every case',
        'Catalog checks are manual: is it listed, does it have a barcode, does the price win the buy box',
        'Regulatory know-how (what can and cannot be sold online) lives only in her head',
      ],
      useCases: [
        { title: 'Daily operations briefing', difficulty: 'Easy', minutesPerWeek: 125, pain: 'Reading several threads every morning to know what is delayed, pending or done.', does: 'Summarises the channel each morning: delayed orders with days late, open actions, what closed.', impact: '20–30 min a day of context reading' },
        { title: 'Standard case responses', difficulty: 'Easy', minutesPerWeek: 120, pain: 'Every cancellation or refund is written from scratch, or escalated to the lead.', does: 'Drafts the request with the right protocol from an order number and a case type.', impact: 'About half the handling time; fewer questions to the lead' },
        { title: 'Team rulebook for regulated products', difficulty: 'Medium', minutesPerWeek: 60, pain: 'Which products need a prescription or cannot be listed is unwritten.', does: 'Turns her answers into a searchable rulebook the team asks first.', impact: 'The lead stops being the only source of truth' },
        { title: 'Catalog check assistant', difficulty: 'Medium', minutesPerWeek: 90, pain: 'Validating listings one by one.', does: 'Checks a pasted list against the catalog export and flags gaps.', impact: 'Batch checks instead of one-by-one' },
      ],
    },
    {
      id: 'support', role: 'Customer support lead', goal: 'Hands-on session: leave with templates and one analysis done live',
      channels: [
        { name: '#customer-support', what: 'team coordination, payment confirmations' },
        { name: '#billing-alerts', what: 'invoice errors and tax-data corrections' },
        { name: '#marketplace-help', what: 'cancellations requested by support' },
      ],
      patterns: [
        'Several prescription reviews a day, each answered in free text',
        'Cancellation requests follow a fixed format but are typed by hand',
        'Satisfaction survey comments are collected but rarely analysed',
        'Processes live in people\'s heads: onboarding a new agent takes weeks',
      ],
      useCases: [
        { title: 'Prescription review replies', difficulty: 'Easy', minutesPerWeek: 90, pain: 'Each accept/reject message is written from scratch.', does: 'Checks the requirements and drafts the accept or reject text, ready to paste.', impact: 'Consistent answers, less time per order' },
        { title: 'Survey comment analysis', difficulty: 'Easy', minutesPerWeek: 60, pain: 'Comments pile up unread.', does: 'Clusters detractor themes and drafts personalised follow-ups.', impact: 'Insights in minutes instead of hours' },
        { title: 'Cancellation messages', difficulty: 'Easy', minutesPerWeek: 45, pain: 'Manual copy-paste of order data into a fixed format.', does: 'Generates the standard message from the order data.', impact: 'No copy-paste errors' },
        { title: 'Write the team\'s SOPs', difficulty: 'Medium', minutesPerWeek: 30, pain: 'New agents learn by asking.', does: 'Turns a spoken walkthrough into a structured procedure.', impact: 'Faster onboarding' },
      ],
    },
    {
      id: 'accounts', role: 'Key accounts manager', goal: 'Show how to prepare visits and reports in a fraction of the time',
      channels: [
        { name: '#key-accounts', what: 'orders for institutional clients, 3–8 open at once' },
        { name: '#ops-handoffs', what: 'coordination with warehouse, purchasing and support' },
      ],
      patterns: [
        'Each order is coordinated across 4–5 channels by hand',
        'No templates: every client message starts blank',
        'Often in the field: little time at a desk to write',
        'Formal tenders arrive with tight deadlines and penalties',
      ],
      useCases: [
        { title: 'Formal client communications', difficulty: 'Easy', minutesPerWeek: 90, pain: 'Institutional clients expect formal writing; every email starts blank.', does: 'Turns a voice note of context into a polished email in the right tone.', impact: 'Time back and a consistent professional image' },
        { title: 'Visit preparation', difficulty: 'Easy', minutesPerWeek: 60, pain: 'Arriving at a client without the full picture of open orders.', does: 'Builds a one-page briefing: open orders, issues, talking points.', impact: 'Better-prepared visits' },
        { title: 'Account report for leadership', difficulty: 'Easy', minutesPerWeek: 45, pain: 'Status updates are improvised.', does: 'Structures pasted notes into a short account report.', impact: 'Visibility upwards with no extra work' },
        { title: 'Tender documents', difficulty: 'Hard', minutesPerWeek: 60, pain: 'Formal proposals under deadline.', does: 'Organises requirements and drafts the supporting documents.', impact: 'Fewer misses on formal requirements' },
      ],
    },
  ];

  return { departments, profiles };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = DemoCompany;
