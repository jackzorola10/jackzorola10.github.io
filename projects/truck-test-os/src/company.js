/**
 * A fictional ~40-person distributor documented with the truck-test OS.
 * Every person and process is invented. The problems are planted on purpose: they are the
 * kinds of drift the judge finds in real documentation within weeks.
 */
const DemoOrg = (() => {
  const full = why => ({ whyItMatters: why, ifNobodyRunsIt: 'Described in the doc.', whoElseCould: 'Named in the doc.', unwrittenKnowledge: 'Captured in the steps section.' });
  return {
    today: '2026-10-01',
    people: [
      { id: 'morgan', name: 'Morgan Lee', role: 'CEO', active: true },
      { id: 'sam', name: 'Sam Ortiz', role: 'Chief of Staff', active: true },
      { id: 'riley', name: 'Riley Chen', role: 'Finance lead', active: true },
      { id: 'alex', name: 'Alex Romero', role: 'Finance analyst', active: true },
      { id: 'jordan', name: 'Jordan Park', role: 'Operations lead', active: true },
      { id: 'taylor', name: 'Taylor Brooks', role: 'Warehouse coordinator', active: true },
      { id: 'casey', name: 'Casey Diaz', role: 'Purchasing lead', active: true },
      { id: 'quinn', name: 'Quinn Patel', role: 'Customer care lead', active: true },
      { id: 'avery', name: 'Avery Kim', role: 'Customer care agent', active: true },
      { id: 'drew', name: 'Drew Silva', role: 'Online sales (left)', active: false },
    ],
    tools: [
      { name: 'Back office', connected: true }, { name: 'Spreadsheet DB', connected: true }, { name: 'Chat', connected: true },
      { name: 'Gov portal', connected: true }, { name: 'CRM', connected: true }, { name: 'Supplier portal', connected: false },
    ],
    areas: [
      { code: 'LEAD', name: 'Leadership', lead: 'morgan', listedProcesses: ['LEAD-01', 'LEAD-02'], interfaces: ['FIN', 'PPL'] },
      { code: 'PPL', name: 'People', lead: 'sam', listedProcesses: ['PPL-01', 'PPL-02', 'PPL-03'], interfaces: ['LEAD'] },
      { code: 'FIN', name: 'Finance', lead: 'riley', listedProcesses: ['FIN-01', 'FIN-02'], interfaces: ['LEAD', 'PUR', 'CARE'] },
      { code: 'OPS', name: 'Operations', lead: 'jordan', listedProcesses: ['OPS-01', 'OPS-02'], interfaces: ['PUR'] },
      { code: 'PUR', name: 'Purchasing', lead: 'casey', listedProcesses: ['PUR-01', 'PUR-02'], interfaces: ['FIN', 'OPS'] },
      { code: 'CARE', name: 'Customer Care', lead: 'quinn', listedProcesses: ['CARE-01', 'CARE-02'], interfaces: ['FIN'] },
      { code: 'WEB', name: 'Online Sales', lead: 'drew', listedProcesses: ['WEB-01'], interfaces: [] },
    ],
    processes: [
      { code: 'LEAD-01', area: 'LEAD', name: 'Quarterly OKR review', status: 'Live', updated: '2026-09-15', runBy: ['morgan', 'sam'], impacts: ['FIN'], tools: ['Spreadsheet DB'], continuity: full('Sets every team\'s priorities for the quarter.') },
      { code: 'LEAD-02', area: 'LEAD', name: 'Regulatory filings', status: 'Live', updated: '2026-09-02', runBy: ['sam'], impacts: [], tools: ['Gov portal'], continuity: { whyItMatters: 'Late filings can suspend the licence.', ifNobodyRunsIt: 'Fines within 30 days.', whoElseCould: 'Nobody yet.', unwrittenKnowledge: '' } },
      { code: 'PPL-01', area: 'PPL', name: 'Recruiting', status: 'Live', updated: '2026-08-20', runBy: ['sam'], impacts: ['OPS'], tools: ['Chat'], continuity: full('Every open role waits on it.') },
      { code: 'PPL-02', area: 'PPL', name: 'Onboarding', status: 'Live', updated: '2026-09-10', runBy: ['sam', 'quinn'], impacts: [], tools: ['Chat'], notes: 'Step 6, payroll setup, is pending until the new payroll tool arrives.', continuity: full('New hires productive from day one.') },
      { code: 'PPL-03', area: 'PPL', name: 'Birthday celebrations', status: 'Live', updated: '2026-09-28', runBy: ['sam'], impacts: [], tools: ['Chat'], continuity: full('Culture.') },
      { code: 'FIN-01', area: 'FIN', name: 'Invoice reconciliation', status: 'Live', updated: '2026-09-25', runBy: ['riley', 'alex'], impacts: ['PUR'], tools: ['Spreadsheet DB', 'Back office'], continuity: full('Inventory can only be booked against a matched invoice.') },
      { code: 'FIN-02', area: 'FIN', name: 'Supplier payments', status: 'Live', updated: '2026-05-30', runBy: ['riley'], impacts: ['PUR'], tools: ['Spreadsheet DB'], continuity: full('Late payments freeze supplier accounts.') },
      { code: 'FIN-03', area: 'FIN', name: 'Month-end close', status: 'Draft', updated: '2026-07-20', runBy: ['riley', 'alex'], impacts: [], tools: ['Spreadsheet DB'], continuity: full('Numbers for the board.') },
      { code: 'OPS-01', area: 'OPS', name: 'Stock receiving', status: 'Live', updated: '2026-09-18', runBy: ['jordan', 'taylor'], impacts: ['FIN'], tools: ['Back office'], continuity: full('No receipt, no sale.') },
      { code: 'OPS-02', area: 'OPS', name: 'Risk management', status: 'Live', updated: '2026-09-01', runBy: ['jordan'], impacts: [], tools: [], continuity: { whyItMatters: 'Required by the regulator.', ifNobodyRunsIt: '', whoElseCould: 'TBD', unwrittenKnowledge: '' } },
      { code: 'PUR-01', area: 'PUR', name: 'Purchase orders', status: 'Live', updated: '2026-09-12', runBy: ['casey'], impacts: ['FIN', 'OPS'], tools: ['Supplier portal'], continuity: full('No order, no stock.') },
      { code: 'CARE-01', area: 'CARE', name: 'Recurring-customer follow-up', status: 'Live', updated: '2026-09-22', runBy: ['quinn', 'avery'], impacts: [], tools: ['CRM'], continuity: full('Repeat purchases are most of the revenue.') },
      { code: 'CARE-02', area: 'CARE', name: 'Refunds', status: 'Live', updated: '2026-09-05', runBy: ['avery'], impacts: ['FIN'], tools: ['Back office'], continuity: full('Customers get their money back on time.') },
      { code: 'WEB-01', area: 'WEB', name: 'Marketplace listings', status: 'Live', updated: '2026-06-15', runBy: ['drew'], impacts: ['OPS'], tools: ['Marketplace API'], continuity: full('Online channel revenue.') },
    ],
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = DemoOrg;
