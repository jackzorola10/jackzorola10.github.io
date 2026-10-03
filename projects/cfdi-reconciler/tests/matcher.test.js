// Run with: node --test tests/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const M = require('../src/matcher.js');
const CFDI = require('../src/cfdi.js');
const S = require('../src/synthetic.js');

test('folio rules generate the variants each supplier needs', () => {
  assert.ok(M.candidates('1234', [{ type: 'addPrefix', value: 'M' }]).includes('M1234'));
  assert.ok(M.candidates('A-1234', [{ type: 'stripPrefix', value: 'A-' }]).includes('1234'));
  assert.deepEqual(M.candidates('f1234', [{ type: 'optionalPrefix', value: 'F' }]).sort(), ['1234', 'F1234']);
  assert.ok(M.candidates('1234', [{ type: 'tryPrefixes', values: ['AA', 'EE'] }]).includes('EE1234'));
  const z = M.candidates('MF1234', [{ type: 'zeroTolerant' }]);
  assert.ok(z.includes('MF10234') && z.includes('MF01234'));
  assert.ok(M.candidates('MF01234', [{ type: 'zeroTolerant' }]).includes('MF1234'));
  assert.ok(M.candidates('FT1234', [{ type: 'swapPrefix', pairs: [['MF', 'FT']] }]).includes('MF1234'));
});

test('an ID match alone never reaches auto: something must corroborate it', () => {
  const suppliers = { Acme: { rfc: 'AAA010101AAA', rules: [] } };
  const invoices = [{ uuid: 'U1', id: '555', issuerRfc: 'AAA010101AAA', date: '2026-01-01', total: 9999, qty: 99 }];
  const receipts = [{ id: 'R1', supplier: 'Acme', folio: '555', date: '2026-03-01', total: 10, qty: 1 }];
  const { results } = M.reconcile({ receipts, invoices, suppliers, today: '2026-03-02' });
  assert.equal(results[0].status, 'review');
  assert.equal(results[0].best.score, 120);
});

test('id + supplier + date + total + qty is an automatic link', () => {
  const suppliers = { Acme: { rfc: 'AAA010101AAA', rules: [{ type: 'addPrefix', value: 'M' }] } };
  const invoices = [{ uuid: 'U1', id: 'M555', issuerRfc: 'AAA010101AAA', date: '2026-03-01', total: 100, qty: 3 }];
  const receipts = [{ id: 'R1', supplier: 'Acme', folio: '555', date: '2026-03-01', total: 100, qty: 3 }];
  const { results } = M.reconcile({ receipts, invoices, suppliers, today: '2026-03-02' });
  assert.equal(results[0].status, 'auto');
  assert.equal(results[0].best.score, 220);
  assert.match(results[0].best.reasons[0], /rule → M555/);
});

test('no match: recent receipts wait, old ones are missing, unknown suppliers are unmapped', () => {
  const suppliers = { Acme: { rfc: 'AAA010101AAA', rules: [] } };
  const receipts = [
    { id: 'R1', supplier: 'Acme', folio: '1', date: '2026-03-25', total: 1, qty: 1 },
    { id: 'R2', supplier: 'Acme', folio: '2', date: '2026-02-01', total: 1, qty: 1 },
    { id: 'R3', supplier: 'Nobody', folio: '3', date: '2026-03-25', total: 1, qty: 1 },
  ];
  const { results } = M.reconcile({ receipts, invoices: [], suppliers, today: '2026-03-30' });
  assert.deepEqual(results.map(r => r.status), ['waiting', 'missing', 'unmapped']);
});

test('human decisions and delivery notes are never touched', () => {
  const receipts = [
    { id: 'R1', supplier: 'Acme', folio: '1', date: '2026-03-25', humanDecision: 'rejected' },
    { id: 'R2', supplier: 'Acme', folio: 'REM-9', date: '2026-03-25' },
  ];
  const { results } = M.reconcile({ receipts, invoices: [], suppliers: {}, today: '2026-03-30' });
  assert.deepEqual(results.map(r => r.status), ['human', 'skipped']);
});

test('one invoice is never auto-linked to two receipts', () => {
  const suppliers = { Acme: { rfc: 'AAA010101AAA', rules: [] } };
  const invoices = [{ uuid: 'U1', id: '7', issuerRfc: 'AAA010101AAA', date: '2026-03-01', total: 50, qty: 2 }];
  const r = { supplier: 'Acme', folio: '7', date: '2026-03-01', total: 50, qty: 2 };
  const { results } = M.reconcile({ receipts: [{ id: 'A', ...r }, { id: 'B', ...r }], invoices, suppliers, today: '2026-03-02' });
  assert.deepEqual(results.map(x => x.status), ['auto', 'review']);
});

test('on synthetic data: automatic links are never wrong, and rules unlock most matches', () => {
  const data = S.generate({ seed: 11, count: 400 });
  const run = suppliers => M.reconcile({ ...data, suppliers });
  const withRules = run(data.suppliers);
  const autos = withRules.results.filter(r => r.status === 'auto');
  const wrong = autos.filter(r => r.best.invoice.uuid !== r.receipt.truth);
  assert.equal(wrong.length, 0, 'an auto-link must never point to the wrong invoice');
  const linkable = data.receipts.filter(r => r.truth && data.suppliers[r.supplier]).length;
  assert.ok(autos.length / linkable > 0.8, `auto rate ${autos.length}/${linkable}`);

  const noRules = run(Object.fromEntries(Object.entries(data.suppliers).map(([k, v]) => [k, { ...v, rules: [] }])));
  assert.ok(withRules.counts.auto > noRules.counts.auto * 1.5, 'supplier rules should multiply automatic links');
});

test('CFDI parser reads the fields that matter', () => {
  const xml = fs.readFileSync(path.join(__dirname, '../samples/invoice-northwind.xml'), 'utf8');
  const c = CFDI.parse(xml);
  assert.equal(c.version, '4.0');
  assert.equal(c.type, 'I');
  assert.match(c.uuid, /^[0-9A-F-]{36}$/);
  assert.equal(c.issuer.rfc, 'NPH900101AB1');
  assert.ok(c.items.length >= 1);
  assert.equal(c.itemCount, c.items.reduce((s, x) => s + x.quantity, 0));
  assert.ok(Math.abs(c.subtotal + c.taxesTransferred - c.total) < 0.02);
});

test('CFDI parser round-trips every synthetic invoice', () => {
  const data = S.generate({ seed: 3, count: 60 });
  for (const inv of data.invoices) {
    const c = CFDI.parse(S.toXml(inv));
    assert.equal(c.id, inv.id);
    assert.equal(c.uuid, inv.uuid);
    assert.equal(c.issuer.rfc, inv.issuerRfc);
    assert.equal(c.itemCount, inv.items.reduce((s, x) => s + x.qty, 0));
  }
});

test('CFDI parser rejects non-CFDI XML and decodes entities', () => {
  assert.throws(() => CFDI.parse('<note/>'), /Not a CFDI/);
  const c = CFDI.parse('<cfdi:Comprobante Version="4.0" Total="1"><cfdi:Emisor Nombre="A &amp; B" Rfc="X"/></cfdi:Comprobante>');
  assert.equal(c.issuer.name, 'A & B');
});
