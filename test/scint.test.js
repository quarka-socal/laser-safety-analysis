'use strict';
/*
 * Atmosferik türbülans (sintilasyon) payı: mesafeye bağlı ışın içi maruziyet ×F
 * (varsayılan F = 10, +1 OD); "tüm güç ölçüm açıklığında" üst sınırıyla kırpılır.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { LE, near, gauss } = require('./helpers');
const A = LE.analysis;

const S2 = Math.SQRT2;
const withS = (inp) => Object.assign({}, inp, { scint: { on: true, factor: 10 } });
const co2 = { limits: 'icnirp', lambda: 10600, mode: 'cw', P: 2000, T: 10, beam: gauss(18e-3 / S2, 1.5e-3 / S2), range: 500 };
const vis = { lambda: 532, mode: 'cw', P: 1, T: 0.25, beam: gauss(1.414e-3, 0.707e-3), range: 100, oav: { on: true } };

test('standart (paysız) sonuçlar türbülans seçeneğinden etkilenmez', () => {
  for (const inp of [co2, vis]) {
    const a = A.analyze(inp);
    const b = A.analyze(withS(inp));
    assert.equal(a.eye.scint, null);
    assert.equal(b.eye.nohd, a.eye.nohd);
    assert.equal(b.eye.odWorst, a.eye.odWorst);
    assert.equal(b.eye.odAtRange, a.eye.odAtRange);
    assert.equal(b.eyewear.marking, a.eyewear.marking);
  }
});

test('uzak alanda NOHD √10 katı, mesafedeki OD +1', () => {
  const b = A.analyze(withS(co2));
  near(b.eye.scint.nohd / b.eye.nohd, Math.sqrt(10), 2e-3);
  near(b.eye.scint.odAtRange - b.eye.odAtRange, 1, 1e-6);
  const v = A.analyze(withS(vis));
  near(v.eye.scint.nohd / v.eye.nohd, Math.sqrt(10), 2e-3);
  assert.ok(v.eye.scint.enohd > v.eye.enohd, 'dürbünle de artar');
});

test('üst sınır: açıklığa giren enerji ışının tamamını aşamaz', () => {
  // 1 mW He-Ne: çıkışta tüm güç 7 mm içinde (oran ≈ 1,02); payla da bu sınır aşılmaz
  const h = { limits: 'icnirp', lambda: 632.8, mode: 'cw', P: 1e-3, T: 0.25, beam: gauss(0.8e-3 / S2, 1e-3 / S2), range: 3 };
  const b = A.analyze(withS(h));
  assert.ok(b.eye.scint.odAtRange <= b.eye.odWorst + 1e-9);
  // rastgele girişlerde mesafedeki OD hiçbir zaman en kötü durumu aşmaz ve paysızdan küçük olmaz
  let seed = 4242;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const lu = (a, z) => Math.pow(10, Math.log10(a) + rnd() * (Math.log10(z) - Math.log10(a)));
  for (let i = 0; i < 150; i++) {
    const inp = { lambda: [355, 532, 1064, 1550, 10600][Math.floor(rnd() * 5)], mode: 'cw', P: lu(1e-4, 1e3), T: 10, beam: gauss(lu(3e-4, 2e-2), lu(1e-4, 1e-2)), range: lu(0.5, 1e4) };
    const r = A.analyze(withS(inp));
    assert.ok(r.eye.scint.odAtRange <= r.eye.odWorst + 1e-9, JSON.stringify(inp));
    assert.ok(r.eye.scint.odAtRange >= r.eye.odAtRange - 1e-12, JSON.stringify(inp));
    assert.ok(r.eye.scint.odAtRange <= r.eye.odAtRange + 1 + 1e-9, JSON.stringify(inp));
    assert.ok(r.eye.scint.nohd >= r.eye.nohd * (1 - 1e-9), JSON.stringify(inp));
  }
});

test('çıkışta (r = 0) türbülans yolu yok: OD değişmez', () => {
  const b = A.analyze(withS(Object.assign({}, co2, { range: 0 })));
  assert.equal(b.eye.scint.odAtRange, b.eye.odAtRange);
});

test('önerilen OD +1, EN 207 her seviye +1; tehlike yoksa öneri yok', () => {
  const b = A.analyze(withS(co2));
  assert.equal(b.eye.scint.recOD, Math.ceil(b.eye.odWorst) + 1);
  assert.equal(b.eyewear.markingScint, 'D 10600 LB6');
  const safe = A.analyze(withS({ lambda: 532, mode: 'cw', P: 1e-4, T: 0.25, beam: gauss(2e-3, 1e-3), range: 10 }));
  assert.equal(safe.eye.odWorst, 0);
  assert.equal(safe.eye.scint.recOD, 0);
});
