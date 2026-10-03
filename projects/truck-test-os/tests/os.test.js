// Run with: node --test tests/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const OS = require('../src/os.js');
const Org = require('../src/company.js');

const clone = o => JSON.parse(JSON.stringify(o));
const findings = OS.judge(Org);
const has = (check, doc, re) => findings.some(f => f.check === check && f.doc === doc && (!re || re.test(f.message)));

test('the judge finds every planted problem', () => {
  assert.ok(has('A', 'FIN-02', /Not reviewed/), 'stale live doc');
  assert.ok(has('A', 'FIN-03', /Draft/), 'stuck draft');
  assert.ok(has('B', 'PPL-02'), 'live doc still describing pending work');
  assert.ok(has('C', 'OPS master', /PPL-01/), 'non-reciprocal impact');
  assert.ok(has('D', 'PUR-01', /disconnected/), 'disconnected tool');
  assert.ok(has('D', 'WEB-01', /tool map/), 'unknown tool');
  assert.ok(has('E', 'WEB-01', /left/), 'runner who left');
  assert.ok(has('E', 'WEB master', /lead/), 'lead who left');
  assert.ok(has('F', 'FIN-03', /Orphan/), 'orphan process');
  assert.ok(has('F', 'PUR master', /PUR-02/), 'ghost process');
  assert.ok(has('G', 'OPS-02', /incomplete/), 'empty continuity');
  assert.ok(has('G', 'LEAD-02', /Single point/), 'single point of failure');
});

test('a clean doc produces no findings', () => {
  for (const code of ['LEAD-01', 'FIN-01', 'OPS-01', 'CARE-01']) assert.equal(findings.filter(f => f.doc === code).length, 0, code);
});

test('every finding names the area lead who must approve the fix', () => {
  assert.ok(findings.every(f => f.approver));
  const routed = OS.routeFixes(findings, 'PPL');
  assert.ok(routed.filter(f => f.area === 'PPL').every(f => f.route === 'fix-now'));
  assert.ok(routed.filter(f => f.area !== 'PPL').every(f => f.route === 'ask-owner'));
});

test('findings are ordered high → low severity', () => {
  const order = { high: 0, medium: 1, low: 2 };
  assert.ok(findings.every((f, i) => i === 0 || order[findings[i - 1].severity] <= order[f.severity]));
});

test('truck test: removing one person strands exactly the processes only they run', () => {
  const r = OS.truckTest(Org, ['sam']);
  assert.deepEqual(r.strandedProcesses.sort(), ['LEAD-02', 'PPL-01', 'PPL-03']);
  assert.deepEqual(r.leaderless, ['PPL']);
  assert.equal(OS.truckTest(Org, ['taylor']).strandedProcesses.length, 0, 'a shared process survives');
  assert.ok(OS.truckTest(Org, ['riley', 'alex']).strandedProcesses.includes('FIN-01'), 'two people out strands a shared process');
});

test('bus factor ranks the most irreplaceable person first', () => {
  const bf = OS.busFactor(Org);
  assert.equal(bf[0].id, 'sam');
  assert.ok(bf.every((x, i) => i === 0 || bf[i - 1].stranded >= x.stranded));
});

test('fixing the findings raises the health score to 100', () => {
  const org = clone(Org);
  const before = OS.healthScore(OS.judge(org), org.processes.length);
  // Resolve everything the way an owner would.
  org.people.find(p => p.id === 'drew').active = true;
  org.tools.find(t => t.name === 'Supplier portal').connected = true;
  org.tools.push({ name: 'Marketplace API', connected: true });
  org.areas.find(a => a.code === 'OPS').interfaces.push('PPL', 'FIN', 'WEB');
  org.areas.find(a => a.code === 'FIN').interfaces.push('OPS');
  org.areas.find(a => a.code === 'PUR').listedProcesses = ['PUR-01'];
  org.areas.find(a => a.code === 'FIN').listedProcesses.push('FIN-03');
  for (const p of org.processes) {
    p.updated = '2026-09-30'; p.notes = ''; p.status = 'Live';
    p.continuity = { whyItMatters: 'x', ifNobodyRunsIt: 'x', whoElseCould: 'x', unwrittenKnowledge: 'x' };
    if (p.runBy.length === 1) p.runBy.push('morgan');
  }
  const after = OS.judge(org);
  assert.equal(after.length, 0, JSON.stringify(after.slice(0, 3)));
  assert.equal(OS.healthScore(after, org.processes.length), 100);
  assert.ok(before < 100);
});

test('the judge does not mutate the documentation it reads', () => {
  const org = clone(Org);
  const snapshot = JSON.stringify(org);
  OS.judge(org); OS.truckTest(org, ['sam']); OS.busFactor(org);
  assert.equal(JSON.stringify(org), snapshot);
});
