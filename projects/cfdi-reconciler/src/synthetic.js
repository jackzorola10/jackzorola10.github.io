/**
 * Synthetic data for the demo and the tests. Every supplier, RFC, product and amount here
 * is invented. The *kinds* of mess are real: each supplier's folio gets typed at the
 * warehouse in its own inconsistent way, invoices arrive late, some never arrive, and
 * delivery notes look like receipts but have no invoice at all.
 */
const Synthetic = (() => {
  const SUPPLIERS = {
    'Northwind Pharma': { rfc: 'NPH900101AB1', legalName: 'NORTHWIND PHARMA SA DE CV', rules: [{ type: 'addPrefix', value: 'M' }], quirk: 'Invoice series "M" is never typed' },
    'Acme Medical': { rfc: 'AME050315K22', legalName: 'ACME MEDICAL SUPPLY SA DE CV', rules: [{ type: 'optionalPrefix', value: 'F' }], quirk: 'Sometimes "F1234", sometimes "1234"' },
    'Globex Supply': { rfc: 'GSU110422B93', legalName: 'GLOBEX SUPPLY SA DE CV', rules: [{ type: 'tryPrefixes', values: ['AA', 'EE', 'NC'] }], quirk: 'Three invoice series; the series is never typed' },
    'Initech Labs': { rfc: 'ILA080711C45', legalName: 'INITECH LABORATORIOS SA DE CV', rules: [{ type: 'stripPrefix', value: 'A-' }], quirk: 'Typed as "A-1234", invoiced as "1234"' },
    'Umbrella Distribution': { rfc: 'UDI951201Q78', legalName: 'UMBRELLA DISTRIBUCION SA DE CV', rules: [{ type: 'zeroTolerant' }, { type: 'swapPrefix', pairs: [['MF', 'FT']] }], quirk: 'Zeros dropped, and MF/FT mixed up' },
    'Stark Health': { rfc: 'SHE130930M12', legalName: 'STARK HEALTH SA DE CV', rules: [], quirk: 'Typed correctly (rare!)' },
  };
  const UNMAPPED = 'Wayne Biotech';
  const BUYER = { rfc: 'DEM190101XX1', name: 'DEMO DISTRIBUIDORA SA DE CV' };
  const PRODUCTS = [
    ['51101500', 'Amoxicillin 500 mg, 12 caps', 84.5], ['51142100', 'Ibuprofen 400 mg, 24 tabs', 46.2], ['42142600', 'Sterile syringe 5 ml, box of 100', 312],
    ['51191900', 'Omeprazole 20 mg, 14 caps', 61.9], ['42132200', 'Nitrile gloves M, box of 100', 189], ['51161800', 'Salbutamol inhaler 100 mcg', 138.4],
    ['42311500', 'Gauze pads 10x10, pack of 100', 97], ['51211800', 'Metformin 850 mg, 30 tabs', 52.8],
  ];

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const iso = t => new Date(t).toISOString().slice(0, 10);
  const addDays = (d, n) => iso(Date.parse(d) + n * 86400000);
  const round2 = n => Math.round(n * 100) / 100;

  /** Folio as it appears on the real invoice, and as someone types it at the warehouse. */
  function folios(name, r) {
    const n = String(10000 + Math.floor(r() * 89999));
    switch (name) {
      case 'Northwind Pharma': return { invoice: 'M' + n, typed: n };
      case 'Acme Medical': return { invoice: 'F' + n, typed: r() < 0.5 ? 'F' + n : n };
      case 'Globex Supply': { const s = ['AA', 'EE', 'NC'][Math.floor(r() * 3)]; return { invoice: s + n, typed: n }; }
      case 'Initech Labs': return { invoice: n, typed: 'A-' + n };
      case 'Umbrella Distribution': {
        const digits = n.slice(0, 2) + '0' + n.slice(2);
        const roll = r();
        return { invoice: 'MF' + digits, typed: roll < 0.45 ? 'MF' + n : roll < 0.8 ? 'FT' + digits : 'MF' + digits };
      }
      default: return { invoice: n, typed: n };
    }
  }

  /**
   * receipts: what the warehouse recorded. invoices: what the tax authority has.
   * Each receipt carries `truth` (the uuid it should link to, or null) so the demo
   * and tests can measure accuracy.
   */
  function generate({ seed = 7, count = 120, today = '2026-09-30' } = {}) {
    const r = rng(seed);
    const pick = arr => arr[Math.floor(r() * arr.length)];
    const names = Object.keys(SUPPLIERS);
    const receipts = [];
    const invoices = [];
    let uuidN = 0;
    const uuid = () => {
      uuidN++;
      const h = (uuidN * 2654435761 + seed * 40503).toString(16).padStart(8, '0').slice(-8).toUpperCase();
      return `${h}-${h.slice(0, 4)}-4${h.slice(1, 4)}-A${h.slice(5, 8)}-${String(uuidN).padStart(12, '0')}`;
    };
    for (let i = 0; i < count; i++) {
      const roll = r();
      const supplier = roll < 0.05 ? UNMAPPED : pick(names);
      const date = addDays(today, -Math.floor(r() * 45));
      const lines = 1 + Math.floor(r() * 3);
      const items = Array.from({ length: lines }, () => { const [code, desc, price] = pick(PRODUCTS); return { code, desc, price, qty: 1 + Math.floor(r() * 24) }; });
      const qty = items.reduce((s, x) => s + x.qty, 0);
      const total = round2(items.reduce((s, x) => s + x.qty * x.price, 0) * 1.16);
      const id = `GR-${String(i + 1).padStart(4, '0')}`;

      const scenario = r();
      if (scenario < 0.03) { receipts.push({ id, supplier, folio: 'REM-' + (500 + i), date, total, qty, kind: 'delivery-note', truth: null }); continue; }
      const f = folios(supplier, r);
      const receipt = { id, supplier, folio: f.typed, date, total, qty, truth: null };
      receipts.push(receipt);
      if (scenario < 0.13) continue; // invoice never arrived (yet)

      const inv = {
        uuid: uuid(), id: f.invoice, series: f.invoice.replace(/\d.*$/, ''), folio: f.invoice.replace(/^\D+/, ''),
        issuerRfc: SUPPLIERS[supplier] ? SUPPLIERS[supplier].rfc : 'WBI000101ZZ9', issuerName: SUPPLIERS[supplier] ? SUPPLIERS[supplier].legalName : 'WAYNE BIOTECH SA DE CV',
        date: addDays(date, -Math.floor(r() * 4)), total, qty, items,
      };
      if (scenario > 0.92) { inv.total = round2(total * (1 + (r() < 0.5 ? -1 : 1) * (0.03 + r() * 0.08))); } // price changed or a line was short-shipped
      if (scenario > 0.97) { inv.qty = qty + 1; }
      invoices.push(inv);
      receipt.truth = inv.uuid;
    }
    // Invoices with no receipt (services, or stock not yet received) add realistic noise.
    for (let k = 0; k < Math.round(count * 0.1); k++) {
      const supplier = pick(names);
      const f = folios(supplier, r);
      const [code, desc, price] = pick(PRODUCTS);
      const q = 1 + Math.floor(r() * 10);
      invoices.push({ uuid: uuid(), id: f.invoice, series: f.invoice.replace(/\d.*$/, ''), folio: f.invoice.replace(/^\D+/, ''), issuerRfc: SUPPLIERS[supplier].rfc, issuerName: SUPPLIERS[supplier].legalName, date: addDays(today, -Math.floor(r() * 30)), total: round2(q * price * 1.16), qty: q, items: [{ code, desc, price, qty: q }] });
    }
    return { receipts, invoices, suppliers: SUPPLIERS, today };
  }

  const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  /** Build a CFDI 4.0-shaped XML for a synthetic invoice (fictional data, not a valid stamped document). */
  function toXml(inv) {
    const subtotal = round2(inv.items.reduce((s, x) => s + x.qty * x.price, 0));
    const tax = round2(subtotal * 0.16);
    const concepts = inv.items.map(x => `    <cfdi:Concepto ClaveProdServ="${x.code}" Cantidad="${x.qty}" ClaveUnidad="H87" Descripcion="${esc(x.desc)}" ValorUnitario="${x.price.toFixed(2)}" Importe="${round2(x.qty * x.price).toFixed(2)}" ObjetoImp="02">
      <cfdi:Impuestos><cfdi:Traslados><cfdi:Traslado Base="${round2(x.qty * x.price).toFixed(2)}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="${round2(x.qty * x.price * 0.16).toFixed(2)}"/></cfdi:Traslados></cfdi:Impuestos>
    </cfdi:Concepto>`).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>
<!-- Synthetic example for a portfolio demo. Fictional issuer, receiver and amounts. -->
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital" Version="4.0" Serie="${esc(inv.series)}" Folio="${esc(inv.folio)}" Fecha="${inv.date}T10:15:00" FormaPago="99" MetodoPago="PPD" SubTotal="${subtotal.toFixed(2)}" Moneda="MXN" Total="${round2(subtotal + tax).toFixed(2)}" TipoDeComprobante="I" Exportacion="01" LugarExpedicion="64000">
  <cfdi:Emisor Rfc="${inv.issuerRfc}" Nombre="${esc(inv.issuerName)}" RegimenFiscal="601"/>
  <cfdi:Receptor Rfc="${BUYER.rfc}" Nombre="${BUYER.name}" DomicilioFiscalReceptor="64000" RegimenFiscalReceptor="601" UsoCFDI="G01"/>
  <cfdi:Conceptos>
${concepts}
  </cfdi:Conceptos>
  <cfdi:Impuestos TotalImpuestosTrasladados="${tax.toFixed(2)}"><cfdi:Traslados><cfdi:Traslado Base="${subtotal.toFixed(2)}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="${tax.toFixed(2)}"/></cfdi:Traslados></cfdi:Impuestos>
  <cfdi:Complemento><tfd:TimbreFiscalDigital Version="1.1" UUID="${inv.uuid}" FechaTimbrado="${inv.date}T10:16:02" RfcProvCertif="SPR190613I52" NoCertificadoSAT="00001000000000000000"/></cfdi:Complemento>
</cfdi:Comprobante>
`;
  }

  return { SUPPLIERS, UNMAPPED, generate, toXml };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Synthetic;
