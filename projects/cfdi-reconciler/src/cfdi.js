/**
 * CFDI parser — reads a Mexican electronic invoice (CFDI 3.3 / 4.0 XML) into a plain object.
 *
 * Every invoice issued in Mexico is stamped by the tax authority (SAT) and exists as a
 * structured XML file. That makes "reading" an invoice a parsing problem, not an AI
 * problem: no OCR, no model, no per-document cost. Zero dependencies; runs in Node and
 * in the browser.
 */
const CFDI = (() => {
  const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" };
  const decode = s => s.replace(/&(amp|lt|gt|quot|apos);|&#(\d+);|&#x([0-9a-f]+);/gi, (m, _n, dec, hex) =>
    ENTITIES[m] || String.fromCodePoint(dec ? Number(dec) : parseInt(hex, 16)));

  function attrs(attrText) {
    const out = {};
    const re = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
    let m;
    while ((m = re.exec(attrText))) out[m[1].replace(/^.*:/, '')] = decode(m[2] !== undefined ? m[2] : m[3]);
    return out;
  }
  // All opening tags whose local name matches (any namespace prefix), as attribute maps.
  function tags(xml, localName) {
    const re = new RegExp(`<(?:[\\w-]+:)?${localName}\\b([^>]*?)\\/?>`, 'g');
    const found = [];
    let m;
    while ((m = re.exec(xml))) found.push(attrs(m[1]));
    return found;
  }
  const num = v => (v === undefined || v === '' ? null : Number(v));
  const TYPES = { I: 'Income', E: 'Credit note', P: 'Payment', T: 'Transfer', N: 'Payroll' };

  function parse(xml) {
    if (typeof xml !== 'string' || !/<(?:[\w-]+:)?Comprobante\b/.test(xml)) throw new Error('Not a CFDI: no <Comprobante> element found');
    const c = tags(xml, 'Comprobante')[0];
    const issuer = tags(xml, 'Emisor')[0] || {};
    const receiver = tags(xml, 'Receptor')[0] || {};
    const stamp = tags(xml, 'TimbreFiscalDigital')[0] || {};
    // Only the item-level <Concepto>, not the tax nodes nested inside it.
    const items = tags(xml, 'Concepto').map(x => ({
      productCode: x.ClaveProdServ || '', quantity: num(x.Cantidad) || 0, unit: x.ClaveUnidad || x.Unidad || '',
      description: x.Descripcion || '', unitPrice: num(x.ValorUnitario), amount: num(x.Importe),
    }));
    // The document-level <Impuestos> is the one carrying TotalImpuestosTrasladados.
    const taxes = tags(xml, 'Impuestos').find(t => t.TotalImpuestosTrasladados !== undefined) || {};
    const series = c.Serie || '';
    const folio = c.Folio || '';
    return {
      version: c.Version || c.version || '',
      uuid: (stamp.UUID || '').toUpperCase(),
      series, folio, id: `${series}${folio}`,
      issuedAt: c.Fecha || '', date: (c.Fecha || '').slice(0, 10), stampedAt: stamp.FechaTimbrado || '',
      type: c.TipoDeComprobante || '', typeLabel: TYPES[c.TipoDeComprobante] || 'Unknown',
      currency: c.Moneda || '', exchangeRate: num(c.TipoCambio),
      paymentMethod: c.MetodoPago || '', paymentForm: c.FormaPago || '',
      subtotal: num(c.SubTotal), discount: num(c.Descuento), total: num(c.Total),
      taxesTransferred: num(taxes.TotalImpuestosTrasladados), taxesWithheld: num(taxes.TotalImpuestosRetenidos),
      issuer: { rfc: issuer.Rfc || '', name: issuer.Nombre || '', regime: issuer.RegimenFiscal || '' },
      receiver: { rfc: receiver.Rfc || '', name: receiver.Nombre || '', use: receiver.UsoCFDI || '' },
      items, itemCount: items.reduce((s, x) => s + x.quantity, 0),
    };
  }

  return { parse, TYPES };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = CFDI;
