// Run with: node --test tests/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../src/credit.js');

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ''} ${a} vs ${b}`);

test('EAR compounds the per-period rate', () => {
  near(C.ear(0.01, 12) * 100, 12.68, 0.01);
  assert.equal(C.ear(0, 12), 0);
});

test('a 3% fee every two weeks is far more than 3% a year', () => {
  const r = C.payrollAdvance({ amount: 10000, fee: 300, cyclesPerYear: 24 });
  assert.equal(r.perPeriod, 3);
  near(r.ear, 103.3, 0.1, 'EAR');
  assert.equal(r.costPerYear, 7200);
});

test('terminal roll: fee + VAT measured on the cash you receive', () => {
  const r = C.terminalRoll({ needed: 10000, feeRate: 0.036, tax: 0.16 });
  near(r.toProcess, 10435.8, 0.01, 'to process');
  near(r.perPeriod, 4.358, 0.001, 'per month');
  near(r.ear, 66.8, 0.1, 'EAR');
});

test('revolving balance adds VAT to interest', () => {
  const r = C.revolving({ monthlyRate: 0.05, tax: 0.16, balance: 20000 });
  assert.equal(r.perPeriod, 5.8);
  assert.equal(r.costPerMonth, 1160);
  near(r.ear, 96.8, 0.1);
});

test('IRR recovers a known loan rate', () => {
  // 100,000 at 1% a month for 48 months → payment ≈ 2,633.84
  const pay = 100000 * 0.01 / (1 - Math.pow(1.01, -48));
  near(C.irr(100000, Array(48).fill(pay)), 0.01, 1e-7);
  const loan = C.installmentLoan({ price: 100000, payment: pay, n: 48 });
  near(loan.ear, 12.7, 0.1);
  near(loan.multiple, 1.26, 0.01);
});

test('upfront fees raise the real rate of a loan', () => {
  const base = C.installmentLoan({ price: 300000, down: 60000, payment: 6000, n: 60 });
  const withFees = C.installmentLoan({ price: 300000, down: 60000, payment: 6000, n: 60, fees: 10000 });
  assert.ok(withFees.ear > base.ear);
});

test('interest-free is free only when no discount was given up', () => {
  assert.equal(C.interestFree({ cashPrice: 12000, installment: 1000, n: 12 }).ear, 0);
  const r = C.interestFree({ cashPrice: 10800, installment: 1000, n: 12 });
  assert.equal(r.forgone, 1200);
  assert.ok(r.ear > 15 && r.ear < 25, String(r.ear));
});

test('a fixed line fee is expensive on a small balance', () => {
  const small = C.lineFee({ feePerMonth: 100, averageBalance: 1000 });
  const big = C.lineFee({ feePerMonth: 100, averageBalance: 20000 });
  assert.ok(small.ear > big.ear * 5);
});

test('breaking the cycle pays back in lump / monthly saving', () => {
  assert.deepEqual(C.breakTheCycle({ lumpSum: 12000, savedPerMonth: 600 }), { months: 20, savedPerYear: 7200 });
  assert.equal(C.breakTheCycle({ lumpSum: 1000, savedPerMonth: 0 }).months, null);
});

test('the ladder ranks the most expensive first', () => {
  const l = C.ladder([{ label: 'car', ear: 34 }, { label: 'advance', ear: 103 }, { label: 'card', ear: 96 }, { label: 'bad', ear: NaN }]);
  assert.deepEqual(l.map(x => x.label), ['advance', 'card', 'car']);
  assert.equal(l[0].rank, 1);
});
