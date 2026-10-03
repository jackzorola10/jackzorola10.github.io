// Copies the CORE block of src/core.js into src/airtable-automation.js.
// Airtable scripts cannot import modules, so the pure logic is embedded verbatim;
// tests/sync.test.js fails if the two copies ever drift apart.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = p => fileURLToPath(new URL(p, import.meta.url));
const block = src => {
  const m = /\/\/ CORE:START\n[\s\S]*?\/\/ CORE:END/.exec(src);
  if (!m) throw new Error('CORE markers not found');
  return m[0];
};

export const coreBlock = () => block(readFileSync(here('../src/core.js'), 'utf8'));
export const embeddedBlock = () => block(readFileSync(here('../src/airtable-automation.js'), 'utf8'));

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const target = here('../src/airtable-automation.js');
  const src = readFileSync(target, 'utf8');
  writeFileSync(target, src.replace(/\/\/ CORE:START\n[\s\S]*?\/\/ CORE:END/, () => coreBlock()));
  console.log('Synced core into airtable-automation.js');
}
