// The Airtable script embeds src/core.js verbatim. This test fails if they drift.
const test = require('node:test');
const assert = require('node:assert/strict');

test('airtable-automation.js embeds the current core', async () => {
  const { coreBlock, embeddedBlock } = await import('../tools/sync-core.mjs');
  assert.equal(embeddedBlock(), coreBlock(), 'Run `node tools/sync-core.mjs` after editing src/core.js');
});
