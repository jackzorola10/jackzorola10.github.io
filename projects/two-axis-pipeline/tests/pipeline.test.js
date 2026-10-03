// Run with: node --test tests/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../src/pipeline.js');
const D = require('../src/creators.js');

const fresh = () => ({ id: 'x', handle: '@x', dataState: 'Not captured', relationState: 'Not contacted', excluded: false });
const run = (creator, steps) => steps.reduce((c, [e, a]) => { const r = P.apply(c, e, a); assert.ok(r.ok, `${e}: ${r.reason}`); return r.creator; }, creator);

test('the full journey moves each axis independently', () => {
  const c = run(fresh(), [['capture', 'robot'], ['measure', 'robot'], ['message', 'human'], ['reply', 'human'], ['send', 'human'], ['sign', 'human']]);
  assert.equal(c.dataState, 'Measured');
  assert.equal(c.relationState, 'Active');
});

test('the nightly refresh never touches the relationship', () => {
  const c = run(fresh(), [['capture', 'robot'], ['measure', 'robot'], ['message', 'human'], ['reply', 'human']]);
  const after = P.apply(c, 'nightly', 'robot').creator;
  assert.equal(after.relationState, 'In conversation');
});

test('in the single-field model, the same refresh erases human progress', () => {
  let s = 'Not captured';
  for (const e of ['capture', 'measure', 'message', 'reply']) s = P.applyLegacy(s, e).status;
  const r = P.applyLegacy(s, 'nightly');
  assert.equal(r.status, 'Measured');
  assert.equal(r.lostProgress, 'In conversation');
});

test('scripts cannot write the relationship; people cannot write the data state', () => {
  const c = run(fresh(), [['capture', 'robot']]);
  assert.match(P.apply(c, 'message', 'robot').reason, /Scripts never write/);
  assert.match(P.apply(c, 'measure', 'human').reason, /People never write/);
});

test('invalid transitions are refused', () => {
  assert.equal(P.apply(fresh(), 'sign', 'human').ok, false);
  assert.equal(P.apply(fresh(), 'measure', 'robot').ok, false);
});

test('a creator who went down but signed stays Active: call them, don\'t delete them', () => {
  const c12 = D.creators.find(c => c.id === 'c12');
  assert.equal(c12.dataState, 'Down');
  assert.equal(c12.relationState, 'Active');
  assert.ok(!P.gate(D.creators, 'sellable').includes('c12'), 'not offered to businesses while down');
});

test('gates are filters with exact answers', () => {
  assert.deepEqual(P.gate(D.creators, 'outreach'), ['c1', 'c10']);
  assert.deepEqual(P.gate(D.creators, 'sellable'), ['c2', 'c11'], 'c6 is stale, c12 is down');
});

test('a privacy request removes the person from every gate and blocks re-adding them', () => {
  const list = D.creators.map(c => (c.id === 'c2' ? P.exclude(c) : c));
  assert.ok(!P.gate(list, 'sellable').includes('c2'));
  const ex = list.find(c => c.id === 'c2');
  assert.equal(P.apply(ex, 'nightly', 'robot').ok, false);
  assert.equal(P.canAdd('RING.SIDE.MX', list).ok, false);
  assert.match(P.canAdd('@ring.side.mx', list).reason, /asked to be removed/);
  assert.equal(P.canAdd('@brand.new', list).ok, true);
});

test('reach uses the median of non-pinned videos, not the mean', () => {
  const r = P.reach(D.viral.videos, D.viral.followers);
  assert.equal(r.sample, 11, 'pinned video excluded');
  assert.equal(r.median, 4900);
  assert.ok(r.mean > 4 * r.median, 'one viral video inflates the mean');
  assert.equal(r.reachPct, 15.6);
});

test('applying events never mutates the input', () => {
  const c = fresh();
  const snap = JSON.stringify(c);
  P.apply(c, 'capture', 'robot'); P.exclude(c);
  assert.equal(JSON.stringify(c), snap);
});
