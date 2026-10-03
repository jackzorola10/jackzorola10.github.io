// Run with: node --test tests/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../src/library.js');
const D = require('../src/demo-library.js');

test('claim references round-trip', () => {
  assert.equal(L.claimRef('SRC-003', 'A7'), 'SRC-003·A7');
  assert.deepEqual(L.parseRef('SRC-003·A7'), { source: 'SRC-003', claim: 'A7' });
  assert.equal(L.parseRef('SRC-3·A7'), null);
});

test('two sources citing the same study count as one', () => {
  const r = L.independence(['SRC-001', 'SRC-003'], D.sources);
  assert.equal(r.total, 2);
  assert.equal(r.independent, 1);
  assert.deepEqual(r.shared, [['SRC-001', 'SRC-003']]);
});

test('the independence trap: four supporting sources are only three', () => {
  const r = L.independence(D.supporting, D.sources);
  assert.equal(r.total, 4);
  assert.equal(r.independent, 3);
});

test('synthesis needs three independent sources', () => {
  assert.equal(L.canSynthesize(['SRC-001', 'SRC-003', 'SRC-002'], D.sources).ok, false);
  assert.equal(L.canSynthesize(['SRC-001', 'SRC-003', 'SRC-002'], D.sources).missing, 1);
  assert.equal(L.canSynthesize(D.supporting, D.sources).ok, true);
});

test('shared primaries chain: A~B and B~C make one cluster', () => {
  const s = [{ id: 'SRC-101', primary: ['x'] }, { id: 'SRC-102', primary: ['x', 'y'] }, { id: 'SRC-103', primary: ['y'] }];
  assert.equal(L.independence(['SRC-101', 'SRC-102', 'SRC-103'], s).independent, 1);
});

test('lifecycle is derived from content', () => {
  assert.equal(L.stage({ id: 'SRC-900', claims: [] }), 'Captured');
  assert.equal(L.stage({ id: 'SRC-900', claims: [{ id: 'A1', type: 'data' }] }), 'Annotated');
  assert.equal(L.stage(D.sources[0]), 'Verified');
  assert.equal(L.stage(D.sources[0], ['SRC-001']), 'Applied');
  assert.equal(L.stage(D.sources[1]), 'Annotated', 'no data claims to verify');
});

test('the demo library passes its own audit', () => {
  assert.deepEqual(L.audit(D), []);
});

test('the audit catches the classic mistakes', () => {
  const bad = JSON.parse(JSON.stringify(D));
  bad.sources[1].claims[1].id = 'A5';
  bad.sources[3].claims[2].verified = undefined;
  bad.relations.push({ id: 'T-099', kind: 'validation', a: 'SRC-001·A1', b: 'SRC-003·A1' });
  bad.relations.push({ id: 'T-100', kind: 'contradiction', a: 'SRC-001·A9', b: 'SRC-002·A1', hypothesis: 'x' });
  bad.relations.push({ id: 'T-101', kind: 'nuance', a: 'SRC-001·A1', b: 'SRC-006·A1' });
  const issues = L.audit(bad).join('\n');
  assert.match(issues, /out of order/);
  assert.match(issues, /hasn't been verified/);
  assert.match(issues, /share a primary source/);
  assert.match(issues, /doesn't exist/);
  assert.match(issues, /no hypothesis/);
});

test('every relation has a suspect when it is a contradiction or nuance', () => {
  for (const r of D.relations.filter(x => x.kind !== 'validation')) assert.ok(L.SUSPECTS[r.suspect], r.id);
});

test('quiz grading', () => {
  const q = D.quiz[1];
  assert.equal(L.grade(q, 'model').correct, true);
  assert.equal(L.grade(q, 'data').correct, false);
  assert.ok(D.quiz.every(x => L.TYPES[x.type]));
});
