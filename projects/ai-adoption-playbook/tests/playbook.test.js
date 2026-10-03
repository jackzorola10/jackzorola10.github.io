// Run with: node --test tests/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../src/playbook.js');
const Co = require('../src/company.js');

test('readiness weights add up to 100', () => {
  assert.equal(P.SIGNALS.reduce((s, x) => s + x.weight, 0), 100);
  const all = Object.fromEntries(P.SIGNALS.map(s => [s.key, true]));
  assert.equal(P.readiness(all), 100);
  assert.equal(P.readiness({}), 0);
});

test('activity value scales with hours, automatability and impact, and is clamped', () => {
  assert.equal(P.activityValue({ hoursPerWeek: 9, impact: 3, automatable: 1 }), 9);
  assert.equal(P.activityValue({ hoursPerWeek: 9, impact: 3, automatable: 0 }), 0);
  assert.equal(P.activityValue({ hoursPerWeek: 3, impact: 99, automatable: 2 }), 5);
});

test('quadrants follow the two thresholds', () => {
  assert.equal(P.quadrant(P.VALUABLE, P.READY), 'go');
  assert.equal(P.quadrant(P.VALUABLE, P.READY - 1), 'prepare');
  assert.equal(P.quadrant(P.VALUABLE - 0.1, P.READY), 'quick');
  assert.equal(P.quadrant(0, 0), 'park');
});

test('the lesson: v1 ranks the team that will stall at the top, v2 flags it before starting', () => {
  const v1 = P.scoreDepartments(Co.departments, 'v1');
  const v2 = P.scoreDepartments(Co.departments, 'v2');
  const logV1 = v1.find(r => r.id === 'log');
  const logV2 = v2.find(r => r.id === 'log');
  assert.equal(logV1.rank, 1, 'on value alone it looks like the best opportunity');
  assert.ok(logV2.rank >= 5, `with readiness it drops (rank ${logV2.rank})`);
  assert.equal(logV2.quadrant, 'prepare');
  assert.ok(logV2.missing.includes('Lead uses the tools weekly after week 1'));
});

test('the teams that adopted are "go" in v2', () => {
  const v2 = P.scoreDepartments(Co.departments, 'v2');
  for (const id of ['fin', 'ops']) assert.equal(v2.find(r => r.id === id).quadrant, 'go');
  assert.equal(v2[0].id, 'fin');
});

test('activities inside a department are ranked by value', () => {
  const ranked = P.rankActivities(Co.departments[0].activities);
  assert.ok(ranked.every((a, i) => i === 0 || ranked[i - 1].value >= a.value));
});

test('briefs put easy use cases first and render every section', () => {
  for (const profile of Co.profiles) {
    const b = P.buildBrief(profile);
    const order = { Easy: 0, Medium: 1, Hard: 2 };
    assert.ok(b.useCases.every((u, i) => i === 0 || order[b.useCases[i - 1].difficulty] <= order[u.difficulty]));
    const md = P.briefToMarkdown(b);
    for (const h of ['# Session brief', '## What the message history shows', '## Patterns', '## Use cases']) assert.ok(md.includes(h));
    assert.ok(b.estimatedHoursPerWeek > 0);
  }
});

test('scoring does not mutate the input', () => {
  const before = JSON.stringify(Co.departments);
  P.scoreDepartments(Co.departments, 'v2');
  P.rankActivities(Co.departments[1].activities);
  assert.equal(JSON.stringify(Co.departments), before);
});
