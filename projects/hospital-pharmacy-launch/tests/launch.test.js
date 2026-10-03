// Run with: node --test tests/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../src/launch.js');

test('ramp compounds monthly growth', () => {
  const c = L.ramp({ start: 1000, growth: 0.1, months: 3 });
  assert.deepEqual(c, [1000, 1100, 1210]);
});

test('16.9% monthly growth is roughly 6.5× in a year', () => {
  const c = L.ramp({ start: 100, growth: 0.169, months: 13 });
  assert.ok(c[12] / c[0] > 6.4 && c[12] / c[0] < 6.6, String(c[12] / c[0]));
});

test('stopping active selling turns growth into decay', () => {
  const c = L.ramp({ start: 1000, growth: 0.169, months: 8, stopSellingAt: 4, decay: -0.1 });
  assert.ok(c[3] > c[2], 'still growing while sold');
  assert.ok(c[4] < c[3] && c[7] < c[4], 'drifts down once nobody sells it');
});

test('months to target, or null when never reached', () => {
  const c = L.ramp({ start: 40000, growth: 0.169, months: 24 });
  assert.equal(L.monthsToTarget(c, 200000), 12);
  assert.equal(L.monthsToTarget(L.ramp({ start: 40000, growth: 0, months: 24 }), 200000), null);
});

test('deal split adds up', () => {
  const d = L.dealSplit({ ticket: 600, ordersPerDay: 10, days: 30, shelfShare: 0.8, shelfMargin: 0.25, aisleMargin: 0.15, revenueShare: 0.1, monthlyCosts: 20000 });
  assert.equal(d.revenue, 180000);
  assert.equal(d.shelf + d.aisle, d.revenue);
  assert.equal(d.hospital, 18000);
  assert.equal(d.grossProfit, 180000 * 0.8 * 0.25 + 180000 * 0.2 * 0.15);
  assert.equal(d.operator, d.grossProfit - d.hospital - 20000);
  // at break-even volume, operator profit is ~0
  const be = L.dealSplit({ ticket: 600, ordersPerDay: d.breakEvenOrdersPerDay, days: 30, shelfShare: 0.8, shelfMargin: 0.25, aisleMargin: 0.15, revenueShare: 0.1, monthlyCosts: 20000 });
  assert.ok(Math.abs(be.operator) < 200, String(be.operator));
});

test('no break-even when the revenue share eats the whole margin', () => {
  const d = L.dealSplit({ ticket: 500, ordersPerDay: 10, shelfMargin: 0.1, aisleMargin: 0.1, revenueShare: 0.12, monthlyCosts: 1000 });
  assert.equal(d.breakEvenOrdersPerDay, null);
  assert.ok(d.operator < 0);
});

test('the gate opens only when every item is done', () => {
  assert.equal(L.gate({}).ready, false);
  assert.equal(L.gate({}).missing.length, L.GATE.length);
  const all = Object.fromEntries(L.GATE.map(g => [g.key, true]));
  assert.deepEqual(L.gate(all), { ready: true, missing: [], done: L.GATE.length, total: L.GATE.length });
  assert.equal(L.gate({ ...all, visible: false }).missing[0], 'Visible from the main patient flow, with signage');
});

test('the plan fits in four weeks', () => {
  const weeks = L.PLAN.flatMap(s => s.tasks.map(t => t.week));
  assert.ok(Math.min(...weeks) >= 1 && Math.max(...weeks) <= 4);
});
