// Writes a few synthetic CFDI XML files to samples/ (fictional data).
const fs = require('node:fs');
const path = require('node:path');
const S = require('../src/synthetic.js');
const data = S.generate({ seed: 7, count: 120 });
const want = { 'Northwind Pharma': 'northwind', 'Globex Supply': 'globex', 'Umbrella Distribution': 'umbrella' };
const byRfc = Object.fromEntries(Object.entries(S.SUPPLIERS).map(([k, v]) => [v.rfc, k]));
const done = new Set();
for (const inv of data.invoices) {
  const name = byRfc[inv.issuerRfc];
  if (!want[name] || done.has(name) || inv.items.length < 2) continue;
  fs.writeFileSync(path.join(__dirname, '../samples', `invoice-${want[name]}.xml`), S.toXml(inv));
  done.add(name);
}
console.log('wrote', [...done]);
