'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { LE } = require('./helpers');
const U = LE.units;

test('sayı ayrıştırma: virgül/nokta ondalık, bilimsel gösterim', () => {
  const ok = { '1,5': 1.5, '1.5': 1.5, '1e-9': 1e-9, '1,5e-3': 1.5e-3, '2x10^-4': 2e-4, '3·10⁻⁵': 3e-5, '.5': 0.5, '1E3': 1000, ' 7 ': 7, '−2': -2, '10^6': 1e6 };
  for (const [s, v] of Object.entries(ok)) {
    const r = U.parseNumber(s);
    assert.equal(r.ok, true, s);
    assert.ok(Math.abs(r.value - v) <= 1e-15 * Math.abs(v), s + ' → ' + r.value);
  }
});

test('sayı ayrıştırma: hatalı ve belirsiz girişler', () => {
  for (const s of ['', 'abc', '1.000,5', '1,2,3', '1..2', 'e5', '--1']) {
    assert.equal(U.parseNumber(s).ok, false, s);
  }
  const amb = U.parseNumber('1.000');
  assert.equal(amb.ok, true);
  assert.equal(amb.value, 1);
  assert.ok(amb.warning, 'binlik ayırıcıya benzeyen giriş uyarı vermeli');
});

test('birim dönüştürme', () => {
  assert.equal(U.toSI(5, 'power', 'mW'), 5e-3);
  assert.equal(U.toSI(10, 'time', 'ns'), 1e-8);
  assert.equal(U.toSI(1.064, 'wavelength', 'µm'), 1064);
  assert.equal(U.toSI(2, 'diameter', 'mm'), 2e-3);
  assert.equal(U.toSI(1, 'atten', '1/km'), 1e-3);
  assert.throws(() => U.toSI(1, 'power', 'hp'));
});

test('Türkçe biçimlendirme', () => {
  assert.equal(U.fmt(0.25), '0,25');
  assert.equal(U.fmt(2.5e-7), '2,50×10⁻⁷');
  assert.equal(U.fmt(3.8e8), '3,80×10⁸');
  assert.equal(U.fmt(Infinity), '∞');
  assert.equal(U.fmtPrefixed(2.5e-3, 'J'), '2,5 mJ');
  assert.equal(U.fmtDist(1504.46), '1,5 km');
  assert.equal(U.fmtDist(0.5), '50 cm');
  assert.equal(U.fmtOD(5.3178), '5,32');
});
