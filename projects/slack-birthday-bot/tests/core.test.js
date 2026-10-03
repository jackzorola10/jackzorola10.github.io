// Run with: node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../src/core.js');

const d = s => C.parseIso(s);
const person = (id, birthDate, extra = {}) => ({ id, name: id, slackId: 'U0123ABCDE', birthDate, active: true, ...extra });
const catalog = {
  main: [
    { code: 'M1', text: 'Happy birthday {tag}!', saysToday: false },
    { code: 'M2', text: 'Today is all about {tag}', saysToday: true },
    { code: 'M3', text: 'Cake time for', saysToday: false },
  ],
  weekendSuffix: [{ code: 'W1', text: '(The real day is {date}.)' }],
  lateSuffix: [{ code: 'L1', text: '(A little late, still heartfelt.)' }],
  closing: [{ code: 'K1', text: 'Drop your wishes in the thread' }],
};
const fixedRandom = () => 0;

test('weekday birthdays are celebrated on the day', () => {
  const c = C.celebrationFor(10, 14, 2026); // Wednesday
  assert.equal(C.isoDate(c.celebrated), '2026-10-14');
  assert.equal(c.movedToFriday, false);
});

test('Saturday and Sunday birthdays move to the Friday before', () => {
  assert.equal(C.isoDate(C.celebrationFor(10, 17, 2026).celebrated), '2026-10-16'); // Sat
  assert.equal(C.isoDate(C.celebrationFor(10, 18, 2026).celebrated), '2026-10-16'); // Sun
  assert.equal(C.celebrationFor(10, 18, 2026).movedToFriday, true);
});

test('Feb 29 is celebrated on Feb 28 in non-leap years', () => {
  assert.equal(C.isoDate(C.celebrationFor(2, 29, 2027).actual), '2027-02-28');
  assert.equal(C.isoDate(C.celebrationFor(2, 29, 2028).actual), '2028-02-29');
});

test('nobody is found on weekends because celebrations land on weekdays', () => {
  const people = [person('ana', '1990-10-17'), person('bo', '1990-10-18')];
  assert.equal(C.findCelebrants({ people, today: d('2026-10-17'), windowDays: 0 }).length, 0);
  assert.equal(C.findCelebrants({ people, today: d('2026-10-16'), windowDays: 0 }).length, 2);
});

test('inactive people and missing birth dates are skipped', () => {
  const people = [person('ana', '1990-10-14', { active: false }), person('bo', null), person('cy', '1990-10-14')];
  const found = C.findCelebrants({ people, today: d('2026-10-14') });
  assert.deepEqual(found.map(f => f.person.id), ['cy']);
});

test('a missed day is recovered within the window and flagged late', () => {
  const people = [person('ana', '1990-10-14')];
  const found = C.findCelebrants({ people, today: d('2026-10-15'), windowDays: 4 });
  assert.equal(found.length, 1);
  assert.equal(found[0].late, true);
  assert.equal(C.findCelebrants({ people, today: d('2026-10-20'), windowDays: 4 }).length, 0);
});

test('already-sent celebrations are never repeated', () => {
  const people = [person('ana', '1990-10-14')];
  const found = C.findCelebrants({ people, today: d('2026-10-14'), alreadySent: new Set(['ana|2026']) });
  assert.equal(found.length, 0);
});

test('nothing before go-live is celebrated', () => {
  const people = [person('ana', '1990-10-14')];
  assert.equal(C.findCelebrants({ people, today: d('2026-10-15'), activeFrom: d('2026-10-15') }).length, 0);
});

test('recovery window crosses New Year', () => {
  const people = [person('ana', '1990-12-31')]; // Thursday in 2026
  const found = C.findCelebrants({ people, today: d('2027-01-04'), windowDays: 4 });
  assert.equal(found.length, 1);
  assert.equal(found[0].year, 2026);
});

test('rotation prefers the least used item and avoids repeats in one run', () => {
  const pool = [{ code: 'A' }, { code: 'B' }, { code: 'C' }];
  const usage = new Map([['A', 3], ['B', 1], ['C', 1]]);
  assert.equal(C.pickLeastUsed(pool, usage, new Set(), fixedRandom).code, 'B');
  assert.equal(C.pickLeastUsed(pool, usage, new Set(['B']), fixedRandom).code, 'C');
  assert.equal(C.pickLeastUsed(pool, usage, new Set(['A', 'B', 'C']), fixedRandom).code, 'B');
});

test('"today" messages are only used on the actual day', () => {
  const late = { person: person('ana', '1990-10-14'), actual: d('2026-10-14'), celebrated: d('2026-10-14'), late: true, movedToFriday: false };
  const usage = new Map([['M1', 5], ['M3', 5]]); // M2 is least used but says "today"
  const msg = C.composeMessage(late, catalog, usage, new Set(), fixedRandom);
  assert.notEqual(msg.messageCode, 'M2');
  assert.match(msg.body, /A little late/);
});

test('weekend celebrations name the real date', () => {
  const c = { person: person('ana', '1990-10-17'), ...C.celebrationFor(10, 17, 2026), late: false };
  const msg = C.composeMessage(c, catalog, new Map(), new Set(), fixedRandom);
  assert.match(msg.body, /Saturday, October 17/);
});

test('mentions use the Slack ID when valid, the bold name otherwise, and escape mrkdwn', () => {
  const c = { person: person('Ana <script>', '1990-10-14', { slackId: '' }), actual: 0, celebrated: 0, late: false, movedToFriday: false };
  const msg = C.composeMessage(c, catalog, new Map([['M2', 9], ['M3', 9]]), new Set(), fixedRandom);
  assert.equal(msg.mentionedById, false);
  assert.match(msg.body, /\*Ana &lt;script&gt;\*/);
  const withId = C.composeMessage({ ...c, person: person('bo', '1990-10-14') }, catalog, new Map(), new Set(), fixedRandom);
  assert.match(withId.body, /<@U0123ABCDE>/);
});

test('Slack payload puts the GIF between the message and the closing', () => {
  const composed = { body: 'Hi', closing: 'Bye', plainText: 'Hi\nBye' };
  const p = C.slackPayload('C123', composed, { url: 'https://example.com/a.gif', alt: 'cake' });
  assert.deepEqual(p.blocks.map(b => b.type), ['section', 'image', 'section']);
  assert.equal(p.unfurl_links, false);
});

test('time zone decides what "today" is', () => {
  const now = new Date('2026-10-15T03:00:00Z'); // still Oct 14 in Chicago
  assert.equal(C.isoDate(C.todayIn('America/Chicago', now)), '2026-10-14');
  assert.equal(C.isoDate(C.todayIn('Europe/Madrid', now)), '2026-10-15');
});
